using System.Text.Json.Serialization;

namespace OceanIntelligence.Api.Services.GlobalFishingWatch.Models;

// Represents vessel information obtained from public registries rather than directly from AIS identity broadcasts.
internal sealed class GfwRegistryVesselInfo
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    [JsonPropertyName("recordId")]
    public string RecordId { get; init; } = string.Empty;

    [JsonPropertyName("sourceCode")]
    public List<string> SourceCodes { get; init; } = [];

    [JsonPropertyName("ssvid")]
    public string Mmsi { get; init; } = string.Empty;

    [JsonPropertyName("flag")]
    public string Flag { get; init; } = string.Empty;

    [JsonPropertyName("shipname")]
    public string ShipName { get; init; } = string.Empty;

    [JsonPropertyName("callsign")]
    public string Callsign { get; init; } = string.Empty;

    [JsonPropertyName("imo")]
    public string? Imo { get; init; }

    [JsonPropertyName("latestVesselInfo")]
    public bool LatestVesselInfo { get; init; }

    [JsonPropertyName("transmissionDateFrom")]
    public DateTimeOffset? TransmissionDateFrom { get; init; }

    [JsonPropertyName("transmissionDateTo")]
    public DateTimeOffset? TransmissionDateTo { get; init; }

    [JsonPropertyName("geartype")]
    public List<string> GearTypes { get; init; } = [];

    [JsonPropertyName("lengthM")]
    public decimal? LengthMeters { get; init; }

    [JsonPropertyName("tonnageGt")]
    public decimal? GrossTonnage { get; init; }

    [JsonPropertyName("vesselInfoReference")]
    public string VesselInfoReference { get; init; } = string.Empty;

    // Registry sources can contribute fields that are unavailable from other registries, so GFW groups those optional values under extraFields.
    [JsonPropertyName("extraFields")]
    public GfwRegistryExtraFields? ExtraFields { get; init; }
}