using System.Text.Json.Serialization;

namespace OceanIntelligence.Api.Services.GlobalFishingWatch.Models;

// Preserves changes in GFW's vessel classification instead of pretending the current classification has always applied.
internal sealed class GfwShipTypeByYear
{
    [JsonPropertyName("shiptype")]
    public string ShipType { get; init; } = string.Empty;

    [JsonPropertyName("years")]
    public List<int> Years { get; init; } = [];
}