namespace OceanIntelligence.Api.Models;

// Registry data comes from public authorities and organizations, so each record retains its sources and effective dates.
public sealed class VesselRegistryRecord
{
    public string RecordId { get; init; } = string.Empty;
    public IReadOnlyList<string> SourceCodes { get; init; } = [];
    public string Mmsi { get; init; } = string.Empty;
    public string Flag { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Callsign { get; init; } = string.Empty;
    public string Imo { get; init; } = string.Empty;
    public bool IsLatestRecord { get; init; }
    public IReadOnlyList<string> GearTypes { get; init; } = [];
    public decimal? LengthMeters { get; init; }
    public decimal? GrossTonnage { get; init; }
    public int? BuiltYear { get; init; }
    public decimal? DepthMeters { get; init; }

    // These dates describe the period associated with the registry record and should not be presented as vessel position timestamps.
    public DateTimeOffset? RecordObservedFrom { get; init; }
    public DateTimeOffset? RecordObservedThrough { get; init; }
}