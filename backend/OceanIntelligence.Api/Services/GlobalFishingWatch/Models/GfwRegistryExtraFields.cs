using System.Text.Json.Serialization;

namespace OceanIntelligence.Api.Services.GlobalFishingWatch.Models;

// These fields are optional because their availability depends on the registry source and vessel record.
[JsonConverter(typeof(GfwRegistryExtraFieldsJsonConverter))]
internal sealed class GfwRegistryExtraFields
{
    [JsonPropertyName("builtYear")]
    public int? BuiltYear { get; init; }

    [JsonPropertyName("depthM")]
    public decimal? DepthMeters { get; init; }
}
