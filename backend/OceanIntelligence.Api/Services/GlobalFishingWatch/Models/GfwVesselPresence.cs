using System.Text.Json.Serialization;

namespace OceanIntelligence.Api.Services.GlobalFishingWatch.Models;

// Mirrors one vessel record from GFW; it is not our public API response model.
internal sealed class GfwVesselPresence
{
    // Explicit mappings protect us when C# and upstream JSON naming differ.
    [JsonPropertyName("vesselId")]
    public string VesselId { get; init; } = string.Empty;

    [JsonPropertyName("shipName")]
    public string ShipName { get; init; } = string.Empty;

    [JsonPropertyName("mmsi")]
    public string Mmsi { get; init; } = string.Empty;

    [JsonPropertyName("imo")]
    public string Imo { get; init; } = string.Empty;

    [JsonPropertyName("callsign")]
    public string Callsign { get; init; } = string.Empty;

    [JsonPropertyName("flag")]
    public string Flag { get; init; } = string.Empty;

    [JsonPropertyName("vesselType")]
    public string VesselType { get; init; } = string.Empty;

    [JsonPropertyName("geartype")]
    public string GearType { get; init; } = string.Empty;

    [JsonPropertyName("entryTimestamp")]
    // Nullable because upstream records may omit entry or exit timestamps.
    public DateTimeOffset? EntryTimestamp { get; init; }

    [JsonPropertyName("exitTimestamp")]
    public DateTimeOffset? ExitTimestamp { get; init; }

    [JsonPropertyName("hours")]
    public decimal Hours { get; init; }
}
