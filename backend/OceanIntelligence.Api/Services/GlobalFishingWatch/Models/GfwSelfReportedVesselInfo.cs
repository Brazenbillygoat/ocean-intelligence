using System.Text.Json.Serialization;

namespace OceanIntelligence.Api.Services.GlobalFishingWatch.Models;

// Represents identity information transmitted through AIS rather than independently verified registry information.
internal sealed class GfwSelfReportedVesselInfo
{
    [JsonPropertyName("id")]
    public string Id { get; init; } = string.Empty;

    // GFW uses ssvid for the identifier transmitted through AIS. For this dataset it generally corresponds to MMSI.
    [JsonPropertyName("ssvid")]
    public string Mmsi { get; init; } = string.Empty;

    [JsonPropertyName("shipname")]
    public string ShipName { get; init; } = string.Empty;

    [JsonPropertyName("flag")]
    public string Flag { get; init; } = string.Empty;

    [JsonPropertyName("callsign")]
    public string Callsign { get; init; } = string.Empty;

    [JsonPropertyName("imo")]
    public string? Imo { get; init; }

    [JsonPropertyName("geartype")]
    public string? GearType { get; init; }

    [JsonPropertyName("shiptype")]
    public string? ShipType { get; init; }

    [JsonPropertyName("messagesCounter")]
    public long MessagesCount { get; init; }

    [JsonPropertyName("positionsCounter")]
    public long PositionsCount { get; init; }

    [JsonPropertyName("shiptypesByYear")]
    public List<GfwShipTypeByYear> ShipTypesByYear { get; init; } = [];

    [JsonPropertyName("sourceCode")]
    public List<string> SourceCodes { get; init; } = [];

    // These dates describe the period during which GFW associated AIS transmissions with this identity. They are not vessel position timestamps.
    [JsonPropertyName("transmissionDateFrom")]
    public DateTimeOffset? TransmissionDateFrom { get; init; }

    [JsonPropertyName("transmissionDateTo")]
    public DateTimeOffset? TransmissionDateTo { get; init; }
}