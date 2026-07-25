using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using OceanIntelligence.Api.Controllers;
using OceanIntelligence.Api.Models;
using OceanIntelligence.Api.Services.GlobalFishingWatch;
using OceanIntelligence.Api.Tests.TestSupport;

namespace OceanIntelligence.Api.Tests.Controllers;

public sealed class VesselTrafficControllerTests
{
    // Theory runs this test once for every InlineData row below.
    [Theory]
    // Bad longitude, bad latitude, reversed bounds, reversed dates, and an oversized range.
    [InlineData(-181, 42, -70, 43, "2026-06-01", "2026-06-08")]
    [InlineData(-71, -91, -70, 43, "2026-06-01", "2026-06-08")]
    [InlineData(-70, 42, -71, 43, "2026-06-01", "2026-06-08")]
    [InlineData(-71, 43, -70, 42, "2026-06-01", "2026-06-08")]
    [InlineData(-71, 42, -70, 43, "2026-06-08", "2026-06-01")]
    [InlineData(-71, 42, -70, 43, "2025-01-01", "2026-06-01")]
    public async Task Get_WithInvalidRequest_ReturnsBadRequest(
        double west,
        double south,
        double east,
        double north,
        string startDate,
        string endDate)
    {
        // Arrange: build the controller and the request it will receive.
        // The client is real, but validation should stop execution before any network call.
        using var httpClient = new HttpClient();

        // Options.Create supplies test configuration without appsettings or user secrets.
        var options = Options.Create(new GlobalFishingWatchOptions
        {
            BaseUrl = "https://example.test",
            AccessToken = "test-token"
        });

        var gfwClient = new GlobalFishingWatchClient(httpClient, options);
        using var harness =
            new GlobalFishingWatchDataServiceHarness(gfwClient);
        var controller = new VesselTrafficController(harness.Service);

        var request = new VesselTrafficRequest
        {
            West = west,
            South = south,
            East = east,
            North = north,
            // InlineData supports strings, so convert the ISO dates here.
            StartDate = DateOnly.Parse(startDate),
            EndDate = DateOnly.Parse(endDate)
        };

        // Act: call the controller action directly without starting a web server.
        ActionResult<VesselTrafficResponse> response =
            await controller.Get(request, CancellationToken.None);

        // Assert: invalid input belongs in the HTTP 400 family.
        Assert.IsType<BadRequestObjectResult>(response.Result);
    }

    [Fact]
    public async Task Get_WithNonFiniteCoordinate_ReturnsBadRequest()
    {
        using var httpClient = new HttpClient();

        var options = Options.Create(new GlobalFishingWatchOptions
        {
            BaseUrl = "https://example.test",
            AccessToken = "test-token"
        });

        var gfwClient = new GlobalFishingWatchClient(httpClient, options);
        using var harness =
            new GlobalFishingWatchDataServiceHarness(gfwClient);
        var controller = new VesselTrafficController(harness.Service);

        var request = new VesselTrafficRequest
        {
            West = double.NaN,
            South = 42,
            East = -70,
            North = 43,
            StartDate = new DateOnly(2026, 6, 1),
            EndDate = new DateOnly(2026, 6, 8)
        };

        ActionResult<VesselTrafficResponse> response =
            await controller.Get(request, CancellationToken.None);

        var badRequest =
            Assert.IsType<BadRequestObjectResult>(response.Result);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);

        Assert.Equal("Coordinates must be finite numbers.", problem.Detail);
    }
}
