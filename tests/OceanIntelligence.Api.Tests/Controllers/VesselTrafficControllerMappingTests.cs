using System.Net;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using OceanIntelligence.Api.Controllers;
using OceanIntelligence.Api.Models;
using OceanIntelligence.Api.Services.GlobalFishingWatch;

namespace OceanIntelligence.Api.Tests.Controllers;

public sealed class VesselTrafficControllerMappingTests
{
    [Fact]
    public async Task Get_WithValidRequest_MapsGfwVesselToOurResponse()
    {
        // Arrange: this is the smallest realistic GFW report response we need.
        const string gfwJson = """
        {
          "entries": [
            {
              "public-global-presence:v4.0": [
                {
                  "vesselId": "test-vessel-id",
                  "shipName": "TEST BOAT",
                  "mmsi": "123456789",
                  "imo": "9876543",
                  "callsign": "TEST1",
                  "flag": "USA",
                  "vesselType": "CARGO",
                  "geartype": "OTHER",
                  "entryTimestamp": "2026-06-01T12:00:00Z",
                  "exitTimestamp": "2026-06-01T18:00:00Z",
                  "hours": 7
                }
              ]
            }
          ]
        }
        """;

        // The fake handler returns JSON immediately instead of opening a network connection.
        using var httpClient =
            new HttpClient(new FakeGfwHandler(gfwJson));

        var options = Options.Create(new GlobalFishingWatchOptions
        {
            BaseUrl = "https://example.test",
            AccessToken = "test-token"
        });

        var gfwClient = new GlobalFishingWatchClient(httpClient, options);
        var controller = new VesselTrafficController(gfwClient);

        var request = new VesselTrafficRequest
        {
            West = -71.20,
            South = 42.20,
            East = -70.70,
            North = 42.60,
            StartDate = new DateOnly(2026, 6, 1),
            EndDate = new DateOnly(2026, 6, 8)
        };

        // Act: this exercises the client, JSON deserialization, and controller mapping.
        ActionResult<VesselTrafficResponse> action =
            await controller.Get(request, CancellationToken.None);

        // Assert: unwrap the MVC result before checking our response model.
        var okResult = Assert.IsType<OkObjectResult>(action.Result);
        var response =
            Assert.IsType<VesselTrafficResponse>(okResult.Value);

        Assert.Equal(1, response.Count);
        Assert.Same(request, response.Query);

        VesselTrafficVessel vessel = Assert.Single(response.Vessels);

        Assert.Equal("test-vessel-id", vessel.VesselId);
        Assert.Equal("TEST BOAT", vessel.Name);
        Assert.Equal("123456789", vessel.Mmsi);
        Assert.Equal("9876543", vessel.Imo);
        Assert.Equal("TEST1", vessel.Callsign);
        Assert.Equal("USA", vessel.Flag);
        Assert.Equal("CARGO", vessel.VesselType);
        Assert.Equal("OTHER", vessel.GearType);
        Assert.Equal(7, vessel.PresenceHours);
        Assert.Equal(
            DateTimeOffset.Parse("2026-06-01T12:00:00Z"),
            vessel.EnteredAt);
        Assert.Equal(
            DateTimeOffset.Parse("2026-06-01T18:00:00Z"),
            vessel.ExitedAt);
    }

    // HttpClient delegates its actual send operation to an HttpMessageHandler.
    private sealed class FakeGfwHandler(string json) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    json,
                    Encoding.UTF8,
                    "application/json")
            };

            return Task.FromResult(response);
        }
    }
}