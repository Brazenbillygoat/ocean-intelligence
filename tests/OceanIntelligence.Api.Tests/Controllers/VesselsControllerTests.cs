using System.Net;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using OceanIntelligence.Api.Controllers;
using OceanIntelligence.Api.Models;
using OceanIntelligence.Api.Services.GlobalFishingWatch;

namespace OceanIntelligence.Api.Tests.Controllers;

public sealed class VesselsControllerTests
{
    [Fact]
    public async Task GetById_WithInvalidVesselId_ReturnsBadRequest()
    {
        using var httpClient = new HttpClient(
            new FakeGfwHandler(HttpStatusCode.OK, "{}"));

        var options = Options.Create(new GlobalFishingWatchOptions
        {
            BaseUrl = "https://example.test",
            AccessToken = "test-token"
        });

        var controller = new VesselsController(
            new GlobalFishingWatchClient(httpClient, options));

        ActionResult<VesselDetailsResponse> action =
            await controller.GetById(" ", CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(action.Result);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);

        Assert.Equal(400, problem.Status);
        Assert.Equal("Invalid vessel ID.", problem.Title);
    }

    [Fact]
    public async Task GetById_WithValidVessel_MapsAndOrdersVesselDetails()
    {
        // The fixture includes older and newer AIS identities plus registry and combined classification data.
        const string gfwJson = """
        {
          "dataset": "public-global-vessel-identity:v4.0",
          "registryInfoTotalRecords": 1,
          "registryInfo": [
            {
              "id": "registry-id",
              "recordId": "IMO-9876543",
              "sourceCode": ["IMO", "CAN"],
              "ssvid": "222222222",
              "flag": "CAN",
              "shipname": "NEW NAME",
              "callsign": "NEW2",
              "imo": "9876543",
              "latestVesselInfo": true,
              "transmissionDateFrom": "2025-01-01T00:00:00Z",
              "transmissionDateTo": "2026-06-08T12:00:00Z",
              "geartype": ["OTHER"],
              "lengthM": 42.5,
              "tonnageGt": 650,
              "vesselInfoReference": "registry-reference",
              "extraFields": {
                "builtYear": 2008,
                "depthM": 4.6
              }
            }
          ],
          "combinedSourcesInfo": [
            {
              "vesselId": "newer-identity",
              "geartypes": [
                {
                  "name": "OTHER",
                  "source": "COMBINATION_OF_REGISTRY_AND_AIS_INFERRED_NN_INFO",
                  "yearFrom": 2025,
                  "yearTo": 2026
                }
              ],
              "shiptypes": [
                {
                  "name": "CARGO",
                  "source": "COMBINATION_OF_REGISTRY_AND_AIS_INFERRED_NN_INFO",
                  "yearFrom": 2025,
                  "yearTo": 2026
                }
              ]
            }
          ],
          "selfReportedInfo": [
            {
              "id": "older-identity",
              "ssvid": "111111111",
              "shipname": "OLD NAME",
              "flag": "USA",
              "callsign": "OLD1",
              "imo": null,
              "geartype": null,
              "shiptype": "PASSENGER",
              "messagesCounter": 100,
              "positionsCounter": 80,
              "shiptypesByYear": [
                {
                  "shiptype": "PASSENGER",
                  "years": [2023, 2024]
                }
              ],
              "sourceCode": ["AIS"],
              "transmissionDateFrom": "2023-01-01T00:00:00Z",
              "transmissionDateTo": "2024-12-31T23:00:00Z"
            },
            {
              "id": "newer-identity",
              "ssvid": "222222222",
              "shipname": "NEW NAME",
              "flag": "CAN",
              "callsign": "NEW2",
              "imo": "9876543",
              "geartype": "OTHER",
              "shiptype": "CARGO",
              "messagesCounter": 500,
              "positionsCounter": 400,
              "shiptypesByYear": [
                {
                  "shiptype": "CARGO",
                  "years": [2025, 2026]
                }
              ],
              "sourceCode": ["AIS"],
              "transmissionDateFrom": "2025-01-01T00:00:00Z",
              "transmissionDateTo": "2026-06-08T12:00:00Z"
            }
          ]
        }
        """;

        using var httpClient = new HttpClient(
            new FakeGfwHandler(HttpStatusCode.OK, gfwJson));

        var options = Options.Create(new GlobalFishingWatchOptions
        {
            BaseUrl = "https://example.test",
            AccessToken = "test-token"
        });

        var controller = new VesselsController(
            new GlobalFishingWatchClient(httpClient, options));

        ActionResult<VesselDetailsResponse> action =
            await controller.GetById(
                "requested-vessel-id",
                CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(action.Result);
        var response = Assert.IsType<VesselDetailsResponse>(okResult.Value);

        Assert.Equal("requested-vessel-id", response.VesselId);
        Assert.Equal("public-global-vessel-identity:v4.0", response.Dataset);
        Assert.Equal("Global Fishing Watch", response.DataProvider);
        Assert.Equal(
            "Vessel data provided by Global Fishing Watch.",
            response.Attribution);
        Assert.Equal(1, response.RegistryRecordCount);
        Assert.Equal(3, response.Caveats.Count);

        Assert.Collection(
            response.AisIdentities,
            newer =>
            {
                Assert.Equal("newer-identity", newer.VesselId);
                Assert.Equal("NEW NAME", newer.Name);
                Assert.Equal("222222222", newer.Mmsi);
                Assert.Equal("9876543", newer.Imo);
                Assert.Equal("CARGO", newer.VesselType);
                Assert.Equal(500, newer.MessagesCount);
                Assert.Equal(400, newer.PositionsCount);

                var history = Assert.Single(newer.ShipTypeHistory);

                Assert.Equal("CARGO", history.VesselType);
                Assert.Equal([2025, 2026], history.Years);
            },
            older =>
            {
                Assert.Equal("older-identity", older.VesselId);
                Assert.Equal("OLD NAME", older.Name);

                // Nullable upstream values become empty strings so clients receive a consistent public type.
                Assert.Equal(string.Empty, older.Imo);
                Assert.Equal(string.Empty, older.GearType);
            });

        var registry = Assert.Single(response.RegistryRecords);

        Assert.Equal("IMO-9876543", registry.RecordId);
        Assert.Equal(["IMO", "CAN"], registry.SourceCodes);
        Assert.Equal("222222222", registry.Mmsi);
        Assert.Equal("NEW NAME", registry.Name);
        Assert.Equal("9876543", registry.Imo);
        Assert.True(registry.IsLatestRecord);
        Assert.Equal(["OTHER"], registry.GearTypes);
        Assert.Equal(42.5m, registry.LengthMeters);
        Assert.Equal(650m, registry.GrossTonnage);
        Assert.Equal(2008, registry.BuiltYear);
        Assert.Equal(4.6m, registry.DepthMeters);
        Assert.Equal(
            DateTimeOffset.Parse("2025-01-01T00:00:00Z"),
            registry.RecordObservedFrom);
        Assert.Equal(
            DateTimeOffset.Parse("2026-06-08T12:00:00Z"),
            registry.RecordObservedThrough);

        var vesselType = Assert.Single(response.CombinedVesselTypes);

        Assert.Equal("newer-identity", vesselType.VesselId);
        Assert.Equal("CARGO", vesselType.Name);
        Assert.Equal(
            "COMBINATION_OF_REGISTRY_AND_AIS_INFERRED_NN_INFO",
            vesselType.Source);
        Assert.Equal(2025, vesselType.YearFrom);
        Assert.Equal(2026, vesselType.YearTo);

        var gearType = Assert.Single(response.CombinedGearTypes);

        Assert.Equal("newer-identity", gearType.VesselId);
        Assert.Equal("OTHER", gearType.Name);
        Assert.Equal(
            "COMBINATION_OF_REGISTRY_AND_AIS_INFERRED_NN_INFO",
            gearType.Source);
        Assert.Equal(2025, gearType.YearFrom);
        Assert.Equal(2026, gearType.YearTo);
    }

    private sealed class FakeGfwHandler(
        HttpStatusCode statusCode,
        string json) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var response = new HttpResponseMessage(statusCode)
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