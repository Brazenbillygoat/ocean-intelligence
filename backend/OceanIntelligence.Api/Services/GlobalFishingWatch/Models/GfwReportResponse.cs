using System.Text.Json.Serialization;

namespace OceanIntelligence.Api.Services.GlobalFishingWatch.Models;

internal sealed class GfwReportResponse
{
    // The dictionary key is dynamic, e.g. "public-global-presence:v4.0".
    [JsonPropertyName("entries")]
    public List<Dictionary<string, List<GfwVesselPresence>?>> Entries
        { get; init; } = [];
}
