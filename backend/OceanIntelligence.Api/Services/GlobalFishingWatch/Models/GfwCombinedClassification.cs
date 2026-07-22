using System.Text.Json.Serialization;

namespace OceanIntelligence.Api.Services.GlobalFishingWatch.Models;

// The source describes whether a classification came from registry data, AIS inference, or a combination of available evidence.
internal sealed class GfwCombinedClassification
{
    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    [JsonPropertyName("source")]
    public string Source { get; init; } = string.Empty;

    [JsonPropertyName("yearFrom")]
    public int? YearFrom { get; init; }

    [JsonPropertyName("yearTo")]
    public int? YearTo { get; init; }
}