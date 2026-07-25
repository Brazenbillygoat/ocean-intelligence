using System.Collections.Concurrent;
using System.Net;
using System.Text;
using Microsoft.Extensions.Options;
using OceanIntelligence.Api.Services.GlobalFishingWatch;
using OceanIntelligence.Api.Services.GlobalFishingWatch.Models;
using OceanIntelligence.Api.Tests.TestSupport;

namespace OceanIntelligence.Api.Tests.Services.GlobalFishingWatch;

public sealed class GlobalFishingWatchDataServiceTests
{
    private const string AreaJson = """{"entries":[]}""";
    private const string VesselDetailsJson = """
        {
          "dataset": "public-global-vessel-identity:v4.0",
          "registryInfoTotalRecords": 0,
          "registryInfo": [],
          "combinedSourcesInfo": [],
          "selfReportedInfo": []
        }
        """;

    [Fact]
    public async Task RepeatedAreaSearches_CallUpstreamOnce()
    {
        var handler = new DelegateHandler(
            (_, _, _) => Task.FromResult(JsonResponse(AreaJson)));
        using var httpClient = new HttpClient(handler);
        using var harness = CreateHarness(httpClient);

        await SearchAsync(harness.Service, -71.2);
        await SearchAsync(harness.Service, -71.2);

        Assert.Equal(1, handler.RequestCount);
    }

    [Fact]
    public async Task RepeatedVesselDetails_CallUpstreamOnce()
    {
        var handler = new DelegateHandler(
            (_, _, _) => Task.FromResult(
                JsonResponse(VesselDetailsJson)));
        using var httpClient = new HttpClient(handler);
        using var harness = CreateHarness(httpClient);

        await harness.Service.GetVesselDetailsAsync(
            "vessel-one",
            CancellationToken.None);
        await harness.Service.GetVesselDetailsAsync(
            "vessel-one",
            CancellationToken.None);

        Assert.Equal(1, handler.RequestCount);
    }

    [Fact]
    public async Task ConcurrentIdenticalAreaSearches_CallUpstreamOnce()
    {
        var requestStarted = NewSignal();
        var releaseRequest = NewSignal();

        var handler = new DelegateHandler(
            async (_, _, cancellationToken) =>
            {
                requestStarted.TrySetResult();
                await releaseRequest.Task.WaitAsync(cancellationToken);

                return JsonResponse(AreaJson);
            });

        using var httpClient = new HttpClient(handler);
        using var harness = CreateHarness(httpClient);

        Task<IReadOnlyList<GfwVesselPresence>> first =
            SearchAsync(harness.Service, -71.2);

        await requestStarted.Task.WaitAsync(TimeSpan.FromSeconds(5));

        Task<IReadOnlyList<GfwVesselPresence>> second =
            SearchAsync(harness.Service, -71.2);

        releaseRequest.TrySetResult();

        await Task.WhenAll(first, second)
            .WaitAsync(TimeSpan.FromSeconds(5));

        Assert.Equal(1, handler.RequestCount);
    }

    [Fact]
    public async Task ConcurrentIdenticalVesselDetails_CallUpstreamOnce()
    {
        var requestStarted = NewSignal();
        var releaseRequest = NewSignal();

        var handler = new DelegateHandler(
            async (_, _, cancellationToken) =>
            {
                requestStarted.TrySetResult();
                await releaseRequest.Task.WaitAsync(cancellationToken);

                return JsonResponse(VesselDetailsJson);
            });

        using var httpClient = new HttpClient(handler);
        using var harness = CreateHarness(httpClient);

        Task<GfwVesselDetailsResponse> first =
            harness.Service.GetVesselDetailsAsync(
                "vessel-one",
                CancellationToken.None);

        await requestStarted.Task.WaitAsync(TimeSpan.FromSeconds(5));

        Task<GfwVesselDetailsResponse> second =
            harness.Service.GetVesselDetailsAsync(
                "vessel-one",
                CancellationToken.None);

        releaseRequest.TrySetResult();

        await Task.WhenAll(first, second)
            .WaitAsync(TimeSpan.FromSeconds(5));

        Assert.Equal(1, handler.RequestCount);
    }

    [Fact]
    public async Task DifferentCacheKeys_CallUpstreamIndependently()
    {
        var handler = new DelegateHandler(
            (request, _, _) => Task.FromResult(
                request.Method == HttpMethod.Post
                    ? JsonResponse(AreaJson)
                    : JsonResponse(VesselDetailsJson)));

        using var httpClient = new HttpClient(handler);
        using var harness = CreateHarness(httpClient);

        await SearchAsync(harness.Service, -71.2);
        await SearchAsync(harness.Service, -71.1);
        await harness.Service.GetVesselDetailsAsync(
            "vessel-one",
            CancellationToken.None);
        await harness.Service.GetVesselDetailsAsync(
            "vessel-two",
            CancellationToken.None);

        Assert.Equal(4, handler.RequestCount);
    }

    [Fact]
    public async Task FailedResponses_AreNotCached()
    {
        var attempts = new ConcurrentDictionary<HttpMethod, int>();

        var handler = new DelegateHandler(
            (request, _, _) =>
            {
                int attempt = attempts.AddOrUpdate(
                    request.Method,
                    1,
                    (_, current) => current + 1);

                if (attempt == 1)
                {
                    return Task.FromResult(
                        new HttpResponseMessage(
                            HttpStatusCode.BadGateway));
                }

                return Task.FromResult(
                    request.Method == HttpMethod.Post
                        ? JsonResponse(AreaJson)
                        : JsonResponse(VesselDetailsJson));
            });

        using var httpClient = new HttpClient(handler);
        using var harness = CreateHarness(httpClient);

        await Assert.ThrowsAsync<GlobalFishingWatchException>(
            () => SearchAsync(harness.Service, -71.2));
        await SearchAsync(harness.Service, -71.2);

        await Assert.ThrowsAsync<GlobalFishingWatchException>(
            () => harness.Service.GetVesselDetailsAsync(
                "vessel-one",
                CancellationToken.None));
        await harness.Service.GetVesselDetailsAsync(
            "vessel-one",
            CancellationToken.None);

        Assert.Equal(2, attempts[HttpMethod.Post]);
        Assert.Equal(2, attempts[HttpMethod.Get]);
    }

    [Fact]
    public async Task ConcurrentAreaReports_NeverExceedOneActiveRequest()
    {
        var firstRequestStarted = NewSignal();
        var releaseRequests = NewSignal();
        var sync = new object();
        int activeRequests = 0;
        int maximumActiveRequests = 0;

        var handler = new DelegateHandler(
            async (_, _, cancellationToken) =>
            {
                int active = Interlocked.Increment(
                    ref activeRequests);

                lock (sync)
                {
                    maximumActiveRequests = Math.Max(
                        maximumActiveRequests,
                        active);
                }

                firstRequestStarted.TrySetResult();

                try
                {
                    await releaseRequests.Task.WaitAsync(
                        cancellationToken);

                    return JsonResponse(AreaJson);
                }
                finally
                {
                    Interlocked.Decrement(ref activeRequests);
                }
            });

        using var httpClient = new HttpClient(handler);
        using var harness = CreateHarness(httpClient);

        Task<IReadOnlyList<GfwVesselPresence>> first =
            SearchAsync(harness.Service, -71.2);

        await firstRequestStarted.Task.WaitAsync(
            TimeSpan.FromSeconds(5));

        Task<IReadOnlyList<GfwVesselPresence>> second =
            SearchAsync(harness.Service, -71.1);

        Assert.False(second.IsCompleted);

        releaseRequests.TrySetResult();

        await Task.WhenAll(first, second)
            .WaitAsync(TimeSpan.FromSeconds(5));

        Assert.Equal(2, handler.RequestCount);
        Assert.Equal(1, maximumActiveRequests);
    }

    [Fact]
    public async Task CancellationWhileWaitingForReportGate_DoesNotCallUpstream()
    {
        var firstRequestStarted = NewSignal();
        var releaseFirstRequest = NewSignal();

        var handler = new DelegateHandler(
            async (_, _, cancellationToken) =>
            {
                firstRequestStarted.TrySetResult();
                await releaseFirstRequest.Task.WaitAsync(
                    cancellationToken);

                return JsonResponse(AreaJson);
            });

        using var httpClient = new HttpClient(handler);
        using var harness = CreateHarness(httpClient);

        Task<IReadOnlyList<GfwVesselPresence>> first =
            SearchAsync(harness.Service, -71.2);

        await firstRequestStarted.Task.WaitAsync(
            TimeSpan.FromSeconds(5));

        using var cancellation = new CancellationTokenSource();

        Task<IReadOnlyList<GfwVesselPresence>> second =
            SearchAsync(
                harness.Service,
                -71.1,
                cancellation.Token);

        cancellation.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(
            () => second);

        Assert.Equal(1, handler.RequestCount);

        releaseFirstRequest.TrySetResult();
        await first.WaitAsync(TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task VesselDetails_DoNotWaitForAreaReportGate()
    {
        var areaRequestStarted = NewSignal();
        var releaseAreaRequest = NewSignal();

        var handler = new DelegateHandler(
            async (request, _, cancellationToken) =>
            {
                if (request.Method == HttpMethod.Get)
                {
                    return JsonResponse(VesselDetailsJson);
                }

                areaRequestStarted.TrySetResult();
                await releaseAreaRequest.Task.WaitAsync(
                    cancellationToken);

                return JsonResponse(AreaJson);
            });

        using var httpClient = new HttpClient(handler);
        using var harness = CreateHarness(httpClient);

        Task<IReadOnlyList<GfwVesselPresence>> areaRequest =
            SearchAsync(harness.Service, -71.2);

        await areaRequestStarted.Task.WaitAsync(
            TimeSpan.FromSeconds(5));

        await harness.Service.GetVesselDetailsAsync(
                "vessel-one",
                CancellationToken.None)
            .WaitAsync(TimeSpan.FromSeconds(5));

        Assert.Equal(2, handler.RequestCount);

        releaseAreaRequest.TrySetResult();
        await areaRequest.WaitAsync(TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task DifferentVesselDetails_CanRunConcurrently()
    {
        var bothRequestsStarted = NewSignal();
        var releaseRequests = NewSignal();
        var sync = new object();
        int activeRequests = 0;
        int maximumActiveRequests = 0;

        var handler = new DelegateHandler(
            async (_, requestNumber, cancellationToken) =>
            {
                int active = Interlocked.Increment(
                    ref activeRequests);

                lock (sync)
                {
                    maximumActiveRequests = Math.Max(
                        maximumActiveRequests,
                        active);
                }

                if (requestNumber == 2)
                {
                    bothRequestsStarted.TrySetResult();
                }

                try
                {
                    await releaseRequests.Task.WaitAsync(
                        cancellationToken);

                    return JsonResponse(VesselDetailsJson);
                }
                finally
                {
                    Interlocked.Decrement(ref activeRequests);
                }
            });

        using var httpClient = new HttpClient(handler);
        using var harness = CreateHarness(httpClient);

        Task<GfwVesselDetailsResponse> first =
            harness.Service.GetVesselDetailsAsync(
                "vessel-one",
                CancellationToken.None);
        Task<GfwVesselDetailsResponse> second =
            harness.Service.GetVesselDetailsAsync(
                "vessel-two",
                CancellationToken.None);

        await bothRequestsStarted.Task.WaitAsync(
            TimeSpan.FromSeconds(5));

        releaseRequests.TrySetResult();

        await Task.WhenAll(first, second)
            .WaitAsync(TimeSpan.FromSeconds(5));

        Assert.Equal(2, handler.RequestCount);
        Assert.Equal(2, maximumActiveRequests);
    }

    private static GlobalFishingWatchDataServiceHarness CreateHarness(
        HttpClient httpClient)
    {
        var gfwOptions = Options.Create(
            new GlobalFishingWatchOptions
            {
                BaseUrl = "https://example.test",
                AccessToken = "test-token"
            });

        var client = new GlobalFishingWatchClient(
            httpClient,
            gfwOptions);

        return new GlobalFishingWatchDataServiceHarness(client);
    }

    private static Task<IReadOnlyList<GfwVesselPresence>> SearchAsync(
        GlobalFishingWatchDataService service,
        double west,
        CancellationToken cancellationToken = default)
    {
        return service.GetVesselPresenceAsync(
            west,
            42.2,
            -70.7,
            42.6,
            new DateOnly(2026, 6, 1),
            new DateOnly(2026, 6, 8),
            cancellationToken);
    }

    private static HttpResponseMessage JsonResponse(string json)
    {
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(
                json,
                Encoding.UTF8,
                "application/json")
        };
    }

    private static TaskCompletionSource NewSignal()
    {
        return new TaskCompletionSource(
            TaskCreationOptions.RunContinuationsAsynchronously);
    }

    private sealed class DelegateHandler(
        Func<
            HttpRequestMessage,
            int,
            CancellationToken,
            Task<HttpResponseMessage>> send) : HttpMessageHandler
    {
        private int _requestCount;

        internal int RequestCount => Volatile.Read(
            ref _requestCount);

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            int requestNumber = Interlocked.Increment(
                ref _requestCount);

            return send(request, requestNumber, cancellationToken);
        }
    }
}
