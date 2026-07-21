namespace OceanIntelligence.Api.Models;

// Our public vessel shape, kept separate from GFW's response model.
public sealed class VesselTrafficVessel
{
    // GFW's vessel identity. MMSI alone is not reliable enough to identify a vessel.
    public string VesselId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Mmsi { get; init; } = string.Empty;
    // IMO is generally more permanent, but smaller vessels often do not have one.
    public string Imo { get; init; } = string.Empty;
    public string Callsign { get; init; } = string.Empty;
    public string Flag { get; init; } = string.Empty;
    public string VesselType { get; init; } = string.Empty;
    public string GearType { get; init; } = string.Empty;
    // Based on hourly AIS samples, so these are not exact border-crossing times.
    public DateTimeOffset? EnteredAt { get; init; }
    public DateTimeOffset? ExitedAt { get; init; }
    // Sampled AIS presence, not proof the vessel transmitted continuously.
    public decimal PresenceHours { get; init; }
}
