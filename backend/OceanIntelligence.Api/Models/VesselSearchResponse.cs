namespace OceanIntelligence.Api.Models;

public sealed class VesselSearchResponse
{
    public required string Query { get; init; }
    public IReadOnlyList<VesselSearchMatch> Matches { get; init; } = [];
    public string? NextCursor { get; init; }
    public string Dataset { get; init; } = "public-global-vessel-identity:latest";
    public string DataProvider { get; init; } = "Global Fishing Watch";
    public string Attribution { get; init; } = "Vessel data provided by Global Fishing Watch.";
    public IReadOnlyList<string> Caveats { get; init; } =
    [
        "Results are identity records, not a verified count of physical vessels. Names and identifiers may be shared or change.",
        "Matching evidence relates to the provider result group and may reference a different AIS identity or registry record.",
        "AIS and registry data may be incomplete, outdated, conflicting, or incorrect.",
        "Observation dates describe identity or registry records, not vessel positions.",
        "Direct lookup has no searched area or area-presence evidence and does not establish a current location."
    ];
}

public sealed class VesselSearchMatch
{
    public required string MatchKey { get; init; }
    public string? VesselId { get; init; }
    public required string RecordSource { get; init; }
    public string Name { get; init; } = "";
    public string Mmsi { get; init; } = "";
    public string Imo { get; init; } = "";
    public string Callsign { get; init; } = "";
    public string Flag { get; init; } = "";
    public string? ObservedFrom { get; init; }
    public string? ObservedThrough { get; init; }
    public string? MatchFields { get; init; }
    public IReadOnlyList<VesselSearchEvidence> MatchingEvidence { get; init; } = [];
}

public sealed class VesselSearchEvidence
{
    public string Source { get; init; } = "";
    public string Reference { get; init; } = "";
    public string Field { get; init; } = "";
    public string Value { get; init; } = "";
    public string? ObservedFrom { get; init; }
    public string? ObservedThrough { get; init; }
    public bool? IsLatestRecord { get; init; }
}
