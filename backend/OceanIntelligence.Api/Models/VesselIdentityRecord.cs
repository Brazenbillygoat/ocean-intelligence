namespace OceanIntelligence.Api.Models;

// AIS identity values are self reported by the vessel and may be incomplete, outdated, or transmitted incorrectly.
public sealed class VesselIdentityRecord
{
    public required string VesselId { get; init; }
    public string Mmsi { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Flag { get; init; } = string.Empty;
    public string Callsign { get; init; } = string.Empty;
    public string Imo { get; init; } = string.Empty;
    public string GearType { get; init; } = string.Empty;
    public string VesselType { get; init; } = string.Empty;
    public long MessagesCount { get; init; }
    public long PositionsCount { get; init; }
    public IReadOnlyList<string> SourceCodes { get; init; } = [];
    public IReadOnlyList<VesselShipTypeHistory> ShipTypeHistory { get; init; } = [];

    // These timestamps describe when GFW associated AIS transmissions with this identity. They do not contain or prove a vessel position.
    public DateTimeOffset? IdentityObservedFrom { get; init; }
    public DateTimeOffset? IdentityObservedThrough { get; init; }
}