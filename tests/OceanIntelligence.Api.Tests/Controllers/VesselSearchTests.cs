using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using OceanIntelligence.Api.Controllers;
using OceanIntelligence.Api.Models;
using OceanIntelligence.Api.Protection;
using OceanIntelligence.Api.Services.GlobalFishingWatch;

namespace OceanIntelligence.Api.Tests.Controllers;

public sealed class VesselSearchTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    [InlineData(" ab ")]
    [InlineData("a\nb")]
    public async Task InvalidQueries_AreRejectedBeforeProviderCalls(string? query)
    {
        using var harness = new SearchHarness();
        var action = await harness.Controller.Search(query, null, CancellationToken.None);
        Assert.Equal(400, Assert.IsType<ProblemDetails>(
            Assert.IsType<BadRequestObjectResult>(action.Result).Value).Status);
        Assert.Equal(0, harness.Handler.Calls);
    }

    [Fact]
    public async Task QueryAndCursorLimits_AreEnforced()
    {
        using var harness = new SearchHarness();
        foreach (var input in new[] {
            (new string('a', 101), (string?)null), ("valid", new string('x', 2049)),
            ("valid", " "), ("valid", "x\ny") })
        {
            Assert.IsType<BadRequestObjectResult>(
                (await harness.Controller.Search(input.Item1, input.Item2, CancellationToken.None)).Result);
        }
        Assert.Equal(0, harness.Handler.Calls);
        Assert.IsType<OkObjectResult>((await harness.Controller.Search(
            new string('a', 100), new string('x', 2048), CancellationToken.None)).Result);
    }

    [Fact]
    public async Task Search_UsesTrimmedEncodedQueryAndEndpointSpecificCursor()
    {
        using var harness = new SearchHarness();
        harness.Handler.Respond = (request, _) =>
        {
            Assert.Equal("/v3/vessels/search", request.RequestUri!.AbsolutePath);
            var parameters = QueryHelpers.ParseQuery(request.RequestUri.Query);
            Assert.Equal("BOAT &?/#", parameters["query"].ToString());
            Assert.Equal("30", parameters["limit"].ToString());
            Assert.Equal("public-global-vessel-identity:latest", parameters["datasets[0]"].ToString());
            Assert.Equal("MATCH_CRITERIA", parameters["includes[0]"].ToString());
            Assert.Equal("opaque+/=token", parameters["since"].ToString());
            Assert.False(parameters.ContainsKey("offset"));
            return Task.FromResult(Json("""{"entries":[],"since":"next+/="}"""));
        };
        var action = await harness.Controller.Search("  BOAT &?/#  ", "opaque+/=token", CancellationToken.None);
        var page = Assert.IsType<VesselSearchResponse>(Assert.IsType<OkObjectResult>(action.Result).Value);
        Assert.Equal("BOAT &?/#", page.Query);
        Assert.Equal("next+/=", page.NextCursor);
        Assert.Empty(page.Matches);
        Assert.Contains("Global Fishing Watch", page.Attribution);
        Assert.Contains(page.Caveats, caveat => caveat.Contains("not a verified count"));
    }

    [Fact]
    public async Task Search_ExpandsDistinctIdentitiesAndRetainsEvidenceInProviderOrder()
    {
        using var harness = new SearchHarness();
        harness.Handler.Respond = (_, _) => Task.FromResult(Json("""
        {"entries":[
          {"selfReportedInfo":[
            {"id":"second","shipname":"SAME NAME","ssvid":"123456789","flag":"USA",
             "callsign":null,"transmissionDateFrom":"2020-01-01T00:00:00Z","matchFields":"SEVERAL_FIELDS"},
            {"id":"first","shipname":"SAME NAME","ssvid":"123456789","flag":"CAN"}],
           "matchCriteria":[{"reference":"registry-reference","source":"registryInfo",
             "period":{"dateFrom":"2020-01-01","dateTo":"2021-01-01"},"latestVesselInfo":false,
             "matches":[{"property":"registryInfo.imo","value":"9876543"}]}]},
          {"selfReportedInfo":[{"id":"second","shipname":"SAME NAME"}]},
          {"registryInfo":[{"id":"registry-only","shipname":"REGISTRY BOAT","imo":"9876543"}]},
          {"selfReportedInfo":[{"id":"","shipname":"MISSING ID"}]},
          {}
        ],"since":null}
        """));
        var action = await harness.Controller.Search("SAME NAME", null, CancellationToken.None);
        var page = Assert.IsType<VesselSearchResponse>(Assert.IsType<OkObjectResult>(action.Result).Value);
        Assert.Equal(new string?[] { "second", "first", null, null, null }, page.Matches.Select(x => x.VesselId));
        Assert.Equal(5, page.Matches.Select(x => x.MatchKey).Distinct().Count());
        Assert.Equal("SEVERAL_FIELDS", page.Matches[0].MatchFields);
        Assert.Equal("", page.Matches[0].Callsign);
        Assert.Equal("2020-01-01T00:00:00Z", page.Matches[0].ObservedFrom);
        var evidence = Assert.Single(page.Matches[0].MatchingEvidence);
        Assert.Equal("registry-reference", evidence.Reference);
        Assert.Equal("registryInfo.imo", evidence.Field);
        Assert.Equal("9876543", evidence.Value);
        Assert.Equal("2020-01-01", evidence.ObservedFrom);
        Assert.False(evidence.IsLatestRecord);
        Assert.Equal("Registry record", page.Matches[2].RecordSource);
        Assert.Equal("REGISTRY BOAT", page.Matches[2].Name);
        Assert.Null(page.NextCursor);
    }

    [Fact]
    public async Task SuccessfulPages_CacheForThirtyMinutesWithSeparateQueryDatasetAndCursorKeys()
    {
        using var harness = new SearchHarness();
        var first = await harness.Service.SearchVesselsAsync("boat", null, CancellationToken.None);
        Assert.Same(first, await harness.Service.SearchVesselsAsync("boat", null, CancellationToken.None));
        await harness.Service.SearchVesselsAsync("boat", "page2", CancellationToken.None);
        await harness.Service.SearchVesselsAsync("BOAT", null, CancellationToken.None);
        await harness.Service.SearchVesselsAsync("boat:page2", null, CancellationToken.None);
        Assert.Equal(4, harness.Handler.Calls);
        Assert.All(harness.Cache.Entries, entry =>
        {
            Assert.Equal(TimeSpan.FromMinutes(30), entry.AbsoluteExpirationRelativeToNow);
            var key = Assert.IsType<(string, string, string, string?)>(entry.Key);
            Assert.Equal("gfw:search:v1", key.Item1);
            Assert.Equal("public-global-vessel-identity:latest", key.Item3);
        });
    }

    [Fact]
    public async Task Failures_AreNotCachedAndRetryCanSucceed()
    {
        using var harness = new SearchHarness();
        harness.Handler.Respond = (_, _) => Task.FromResult(
            harness.Handler.Calls == 1 ? new HttpResponseMessage(HttpStatusCode.TooManyRequests) : Json("""{"entries":[]}"""));
        await Assert.ThrowsAsync<GlobalFishingWatchException>(
            () => harness.Service.SearchVesselsAsync("boat", null, CancellationToken.None));
        await harness.Service.SearchVesselsAsync("boat", null, CancellationToken.None);
        await harness.Service.SearchVesselsAsync("boat", null, CancellationToken.None);
        Assert.Equal(2, harness.Handler.Calls);
        Assert.Single(harness.Cache.Entries);
    }

    [Fact]
    public async Task CanceledRequests_DoNotCacheOrBecomeTimeouts()
    {
        using var harness = new SearchHarness();
        using var cancellation = new CancellationTokenSource();
        var started = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        harness.Handler.Respond = async (_, token) =>
        {
            started.SetResult();
            await Task.Delay(Timeout.Infinite, token);
            return Json("""{"entries":[]}""");
        };
        var search = harness.Service.SearchVesselsAsync("boat", null, cancellation.Token);
        await started.Task;
        cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => search);
        Assert.Empty(harness.Cache.Entries);
        harness.Handler.Respond = (_, _) => Task.FromResult(Json("""{"entries":[]}"""));
        await harness.Service.SearchVesselsAsync("boat", null, CancellationToken.None);
        Assert.Equal(2, harness.Handler.Calls);
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("null")]
    [InlineData("{invalid")]
    [InlineData("""{"entries":null}""")]
    [InlineData("""{"entries":[null]}""")]
    [InlineData("""{"entries":[{"selfReportedInfo":[null]}]}""")]
    [InlineData("""{"entries":[{"matchCriteria":[null]}]}""")]
    [InlineData("""{"entries":[],"since":"same"}""")]
    public async Task InvalidProviderPages_AreSafeRetryableFailures(string payload)
    {
        using var harness = new SearchHarness();
        harness.Handler.Respond = (_, _) => Task.FromResult(Json(payload));
        var failure = await Assert.ThrowsAsync<GlobalFishingWatchException>(
            () => harness.Service.SearchVesselsAsync("boat", "same", CancellationToken.None));
        Assert.Equal(HttpStatusCode.BadGateway, failure.StatusCode);
        Assert.Empty(harness.Cache.Entries);
    }

    [Theory]
    [InlineData("rate", 503)]
    [InlineData("timeout", 504)]
    [InlineData("network", 502)]
    [InlineData("json", 502)]
    [InlineData("provider", 502)]
    public async Task LookupFailures_ReturnProblemDetails(string kind, int expected)
    {
        using var handler = new SearchHandler
        {
            Respond = (_, _) => kind switch
            {
                "timeout" => Task.FromException<HttpResponseMessage>(new TaskCanceledException()),
                "network" => Task.FromException<HttpResponseMessage>(new HttpRequestException("Private upstream URI")),
                "json" => Task.FromResult(Json("broken")),
                _ => Task.FromResult(new HttpResponseMessage(
                    kind == "rate" ? HttpStatusCode.TooManyRequests : HttpStatusCode.InternalServerError))
            }
        };
        using var factory = CreateFactory(handler);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        using var response = await client.GetAsync("/api/vessels/search?query=PRIVATE-QUERY");
        Assert.Equal(expected, (int)response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal(expected, problem!.Status);
        Assert.Equal("Vessel data service unavailable", problem.Title);
        Assert.DoesNotContain("PRIVATE-QUERY", await response.Content.ReadAsStringAsync());
        Assert.DoesNotContain("Private upstream URI", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task SearchRoute_UsesNoStoreAndTheExistingDetailRateBudget()
    {
        using var handler = new SearchHandler();
        using var factory = CreateFactory(handler, permits: 2);
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        using var search = await client.GetAsync("/api/vessels/search?query=boat");
        Assert.Equal(HttpStatusCode.OK, search.StatusCode);
        Assert.True(search.Headers.CacheControl!.NoStore);
        using var invalidDetail = await client.GetAsync("/api/vessels/" + new string('a', 101));
        Assert.Equal(HttpStatusCode.BadRequest, invalidDetail.StatusCode);
        using var rejected = await client.GetAsync("/api/vessels/search?query=boat");
        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.Equal("application/problem+json", rejected.Content.Headers.ContentType!.MediaType);
        Assert.Equal(1, handler.Calls);
    }

    private static WebApplicationFactory<Program> CreateFactory(SearchHandler handler, int permits = 60) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["GlobalFishingWatch:AccessToken"] = "test-token",
                    ["GlobalFishingWatch:BaseUrl"] = "https://example.test",
                    ["ApiProtection:VesselDetailsRateLimit:PermitLimit"] = permits.ToString()
                }));
            builder.ConfigureServices(services => services.AddHttpClient<GlobalFishingWatchClient>()
                .ConfigurePrimaryHttpMessageHandler(() => handler));
        });

    private static HttpResponseMessage Json(string body) => new(HttpStatusCode.OK)
    {
        Content = new StringContent(body, Encoding.UTF8, "application/json")
    };

    private sealed class SearchHandler : HttpMessageHandler
    {
        internal int Calls { get; private set; }
        internal Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> Respond { get; set; } =
            (_, _) => Task.FromResult(Json("""{"entries":[],"since":null}"""));
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        {
            Calls++;
            return Respond(request, token);
        }
    }

    private sealed class TrackingCache : IMemoryCache
    {
        private readonly MemoryCache _inner = new(new MemoryCacheOptions());
        internal List<ICacheEntry> Entries { get; } = [];
        public ICacheEntry CreateEntry(object key)
        {
            var entry = _inner.CreateEntry(key);
            Entries.Add(entry);
            return entry;
        }
        public bool TryGetValue(object key, out object? value) => _inner.TryGetValue(key, out value);
        public void Remove(object key) => _inner.Remove(key);
        public void Dispose() => _inner.Dispose();
    }

    private sealed class SearchHarness : IDisposable
    {
        internal SearchHandler Handler { get; } = new();
        internal TrackingCache Cache { get; } = new();
        private readonly GlobalFishingWatchRequestCoordinator _coordinator = new();
        private readonly HttpClient _http;
        internal GlobalFishingWatchDataService Service { get; }
        internal VesselsController Controller { get; }
        internal SearchHarness()
        {
            _http = new HttpClient(Handler);
            Service = new GlobalFishingWatchDataService(
                new GlobalFishingWatchClient(_http, Options.Create(new GlobalFishingWatchOptions
                {
                    BaseUrl = "https://example.test",
                    AccessToken = "test-token"
                })), Cache, Options.Create(new ApiProtectionOptions()), _coordinator);
            Controller = new VesselsController(Service);
        }
        public void Dispose()
        {
            _http.Dispose();
            Cache.Dispose();
            _coordinator.Dispose();
        }
    }
}
