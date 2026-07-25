using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace OceanIntelligence.Api.Tests.Protection;

public sealed class ApiRateLimitingTests
{
    [Fact]
    public async Task EndpointPolicies_ReturnIndependentProblemDetailsResponses()
    {
        using WebApplicationFactory<Program> factory =
            new WebApplicationFactory<Program>()
                .WithWebHostBuilder(builder =>
                {
                    builder.ConfigureAppConfiguration(
                        (_, configuration) =>
                        {
                            configuration.AddInMemoryCollection(
                                new Dictionary<string, string?>
                                {
                                    ["GlobalFishingWatch:AccessToken"] =
                                        "test-token",
                                    ["ApiProtection:AreaSearchRateLimit:PermitLimit"] =
                                        "1",
                                    ["ApiProtection:AreaSearchRateLimit:Window"] =
                                        "00:01:00",
                                    ["ApiProtection:VesselDetailsRateLimit:PermitLimit"] =
                                        "2",
                                    ["ApiProtection:VesselDetailsRateLimit:Window"] =
                                        "00:01:00"
                                });
                        });
                });

        using HttpClient client = factory.CreateClient(
            new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost")
            });

        const string invalidAreaPath =
            "/api/vessel-traffic" +
            "?west=0&south=0&east=0&north=0" +
            "&startDate=2026-06-01&endDate=2026-06-08";

        using HttpResponseMessage firstArea =
            await client.GetAsync(invalidAreaPath);
        using HttpResponseMessage rejectedArea =
            await client.GetAsync(invalidAreaPath);

        Assert.Equal(HttpStatusCode.BadRequest, firstArea.StatusCode);
        await AssertRateLimitProblemAsync(rejectedArea);

        string invalidVesselPath =
            $"/api/vessels/{new string('a', 101)}";

        using HttpResponseMessage firstVessel =
            await client.GetAsync(invalidVesselPath);
        using HttpResponseMessage secondVessel =
            await client.GetAsync(invalidVesselPath);
        using HttpResponseMessage rejectedVessel =
            await client.GetAsync(invalidVesselPath);

        Assert.Equal(HttpStatusCode.BadRequest, firstVessel.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, secondVessel.StatusCode);
        await AssertRateLimitProblemAsync(rejectedVessel);
    }

    private static async Task AssertRateLimitProblemAsync(
        HttpResponseMessage response)
    {
        Assert.Equal(
            HttpStatusCode.TooManyRequests,
            response.StatusCode);
        Assert.Equal(
            "application/problem+json",
            response.Content.Headers.ContentType?.MediaType);
        Assert.NotNull(response.Headers.RetryAfter);

        ProblemDetails? problem =
            await response.Content.ReadFromJsonAsync<ProblemDetails>();

        Assert.NotNull(problem);
        Assert.Equal(
            "Request rate limit exceeded",
            problem.Title);
        Assert.Equal(429, problem.Status);
    }
}
