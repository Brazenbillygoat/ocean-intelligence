using System.Net;
using System.Text;
using Microsoft.Extensions.Options;
using OceanIntelligence.Api.Services.GlobalFishingWatch;

namespace OceanIntelligence.Api.Tests.Services.GlobalFishingWatch;

public sealed class GlobalFishingWatchClientTests
{
    [Fact]
    public async Task GetVesselDetailsAsync_WithValidResponse_RequestsAndDeserializesDetails()
    {
        // This fixture covers AIS identity, registry specifications, source attribution, and classifications combined by GFW.
        const string gfwJson = """
        {
          "dataset": "public-global-vessel-identity:v4.0",
          "registryInfoTotalRecords": 1,
          "registryInfo": [
            {
              "id": "registry-record-id",
              "recordId": "IMO-9876543",
              "sourceCode": ["IMO", "USA"],
              "ssvid": "123456789",
              "flag": "USA",
              "shipname": "TEST BOAT",
              "callsign": "TEST1",
              "imo": "9876543",
              "latestVesselInfo": true,
              "transmissionDateFrom": "2024-01-15T10:30:00Z",
              "transmissionDateTo": "2026-06-08T14:45:00Z",
              "geartype": ["OTHER"],
              "lengthM": 42.5,
              "tonnageGt": 650,
              "vesselInfoReference": "registry-reference-id",
              "extraFields": {
                "builtYear": 2008,
                "depthM": 4.6
              }
            }
          ],
          "combinedSourcesInfo": [
            {
              "vesselId": "test-vessel-id",
              "geartypes": [
                {
                  "name": "OTHER",
                  "source": "COMBINATION_OF_REGISTRY_AND_AIS_INFERRED_NN_INFO",
                  "yearFrom": 2024,
                  "yearTo": 2026
                }
              ],
              "shiptypes": [
                {
                  "name": "CARGO",
                  "source": "COMBINATION_OF_REGISTRY_AND_AIS_INFERRED_NN_INFO",
                  "yearFrom": 2024,
                  "yearTo": 2026
                }
              ]
            }
          ],
          "selfReportedInfo": [
            {
              "id": "test-vessel-id",
              "ssvid": "123456789",
              "shipname": "TEST BOAT",
              "flag": "USA",
              "callsign": "TEST1",
              "imo": "9876543",
              "geartype": "OTHER",
              "shiptype": "CARGO",
              "messagesCounter": 1200,
              "positionsCounter": 800,
              "shiptypesByYear": [
                {
                  "shiptype": "CARGO",
                  "years": [2024, 2025, 2026]
                }
              ],
              "sourceCode": ["AIS"],
              "transmissionDateFrom": "2024-01-15T10:30:00Z",
              "transmissionDateTo": "2026-06-08T14:45:00Z"
            }
          ]
        }
        """;

        var handler = new RecordingHandler(HttpStatusCode.OK, gfwJson);
        using var httpClient = new HttpClient(handler);

        var options = Options.Create(new GlobalFishingWatchOptions
        {
            BaseUrl = "https://example.test",
            AccessToken = "test-token"
        });

        var client = new GlobalFishingWatchClient(httpClient, options);

        var result = await client.GetVesselDetailsAsync(
            "test-vessel-id",
            CancellationToken.None);

        Assert.Equal(HttpMethod.Get, handler.RequestMethod);
        Assert.NotNull(handler.RequestUri);
        Assert.Equal(
            "/v3/vessels/test-vessel-id",
            handler.RequestUri.AbsolutePath);
        Assert.Equal(
            "?dataset=public-global-vessel-identity:latest&registries-info-data=ALL",
            handler.RequestUri.Query);

        Assert.Equal("public-global-vessel-identity:v4.0", result.Dataset);
        Assert.Equal(1, result.RegistryInfoTotalRecords);

        var registry = Assert.Single(result.RegistryInfo);

        Assert.Equal("registry-record-id", registry.Id);
        Assert.Equal("IMO-9876543", registry.RecordId);
        Assert.Equal(["IMO", "USA"], registry.SourceCodes);
        Assert.Equal("123456789", registry.Mmsi);
        Assert.Equal("USA", registry.Flag);
        Assert.Equal("TEST BOAT", registry.ShipName);
        Assert.Equal("TEST1", registry.Callsign);
        Assert.Equal("9876543", registry.Imo);
        Assert.True(registry.LatestVesselInfo);
        Assert.Equal(["OTHER"], registry.GearTypes);
        Assert.Equal(42.5m, registry.LengthMeters);
        Assert.Equal(650m, registry.GrossTonnage);
        Assert.Equal(
            "registry-reference-id",
            registry.VesselInfoReference);
        Assert.Equal(
            DateTimeOffset.Parse("2024-01-15T10:30:00Z"),
            registry.TransmissionDateFrom);
        Assert.Equal(
            DateTimeOffset.Parse("2026-06-08T14:45:00Z"),
            registry.TransmissionDateTo);

        Assert.NotNull(registry.ExtraFields);
        Assert.Equal(2008, registry.ExtraFields!.BuiltYear);
        Assert.Equal(4.6m, registry.ExtraFields.DepthMeters);

        // Combined classifications include both GFW's conclusion and the evidence category used to produce it.
        var combined = Assert.Single(result.CombinedSourcesInfo);

        Assert.Equal("test-vessel-id", combined.VesselId);

        var combinedGearType = Assert.Single(combined.GearTypes);

        Assert.Equal("OTHER", combinedGearType.Name);
        Assert.Equal(
            "COMBINATION_OF_REGISTRY_AND_AIS_INFERRED_NN_INFO",
            combinedGearType.Source);
        Assert.Equal(2024, combinedGearType.YearFrom);
        Assert.Equal(2026, combinedGearType.YearTo);

        var combinedShipType = Assert.Single(combined.ShipTypes);

        Assert.Equal("CARGO", combinedShipType.Name);
        Assert.Equal(
            "COMBINATION_OF_REGISTRY_AND_AIS_INFERRED_NN_INFO",
            combinedShipType.Source);
        Assert.Equal(2024, combinedShipType.YearFrom);
        Assert.Equal(2026, combinedShipType.YearTo);

        var identity = Assert.Single(result.SelfReportedInfo);

        Assert.Equal("test-vessel-id", identity.Id);
        Assert.Equal("123456789", identity.Mmsi);
        Assert.Equal("TEST BOAT", identity.ShipName);
        Assert.Equal("USA", identity.Flag);
        Assert.Equal("TEST1", identity.Callsign);
        Assert.Equal("9876543", identity.Imo);
        Assert.Equal("OTHER", identity.GearType);
        Assert.Equal("CARGO", identity.ShipType);
        Assert.Equal(1200, identity.MessagesCount);
        Assert.Equal(800, identity.PositionsCount);
        Assert.Equal(["AIS"], identity.SourceCodes);
        Assert.Equal(
            DateTimeOffset.Parse("2024-01-15T10:30:00Z"),
            identity.TransmissionDateFrom);
        Assert.Equal(
            DateTimeOffset.Parse("2026-06-08T14:45:00Z"),
            identity.TransmissionDateTo);

        var shipTypeHistory = Assert.Single(identity.ShipTypesByYear);

        Assert.Equal("CARGO", shipTypeHistory.ShipType);
        Assert.Equal([2024, 2025, 2026], shipTypeHistory.Years);
    }

    [Fact]
    public async Task GetVesselDetailsAsync_WithFailureStatus_ThrowsGfwException()
    {
        var handler = new RecordingHandler(HttpStatusCode.TooManyRequests);
        using var httpClient = new HttpClient(handler);

        var options = Options.Create(new GlobalFishingWatchOptions
        {
            BaseUrl = "https://example.test",
            AccessToken = "test-token"
        });

        var client = new GlobalFishingWatchClient(httpClient, options);

        var exception =
            await Assert.ThrowsAsync<GlobalFishingWatchException>(
                () => client.GetVesselDetailsAsync(
                    "test-vessel-id",
                    CancellationToken.None));

        Assert.Equal(HttpStatusCode.TooManyRequests, exception.StatusCode);
    }

    // Recording the request lets this test verify our integration contract without opening a network connection.
    private sealed class RecordingHandler(
        HttpStatusCode statusCode,
        string? json = null) : HttpMessageHandler
    {
        public HttpMethod? RequestMethod { get; private set; }
        public Uri? RequestUri { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            RequestMethod = request.Method;
            RequestUri = request.RequestUri;

            var response = new HttpResponseMessage(statusCode);

            if (json is not null)
            {
                response.Content = new StringContent(
                    json,
                    Encoding.UTF8,
                    "application/json");
            }

            return Task.FromResult(response);
        }
    }
}