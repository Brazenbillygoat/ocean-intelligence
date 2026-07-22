using System.Text.Json.Serialization;

namespace OceanIntelligence.Api.Services.GlobalFishingWatch.Models;

// GFW combines AIS, registry records, and model output to produce classifications that can differ across time.
internal sealed class GfwCombinedSourcesInfo
{
    [JsonPropertyName("vesselId")]
    public string VesselId { get; init; } = string.Empty;

    [JsonPropertyName("geartypes")]
    public List<GfwCombinedClassification> GearTypes { get; init; } = [];

    [JsonPropertyName("shiptypes")]
    public List<GfwCombinedClassification> ShipTypes { get; init; } = [];
}