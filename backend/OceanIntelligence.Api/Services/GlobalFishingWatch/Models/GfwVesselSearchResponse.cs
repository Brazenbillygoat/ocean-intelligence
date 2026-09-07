using System.Text.Json;
using System.Text.Json.Serialization;

namespace OceanIntelligence.Api.Services.GlobalFishingWatch.Models;

internal sealed class GfwVesselSearchResponse
{
    [JsonPropertyName("entries")]
    public required List<GfwVesselSearchEntry?>? Entries { get; init; }

    // Vessel search uses an opaque "since" token, unlike GFW's offset APIs.
    [JsonPropertyName("since")]
    public string? Since { get; init; }
}

internal sealed class GfwVesselSearchEntry
{
    public string? Dataset { get; init; }
    public List<GfwSearchIdentity>? SelfReportedInfo { get; init; } = [];
    public List<GfwSearchIdentity>? RegistryInfo { get; init; } = [];
    public List<GfwMatchCriterion>? MatchCriteria { get; init; } = [];
}

// Search needs only identity fields. Unrelated registry extras stay upstream.
internal sealed class GfwSearchIdentity
{
    public string? Id { get; init; }
    public string? VesselInfoReference { get; init; }
    [JsonPropertyName("ssvid")]
    public string? Mmsi { get; init; }
    [JsonPropertyName("shipname")]
    public string? Name { get; init; }
    public string? Imo { get; init; }
    public string? Callsign { get; init; }
    public string? Flag { get; init; }
    public string? MatchFields { get; init; }
    // Preserve provider observation text, including dates that are not ISO timestamps.
    public string? TransmissionDateFrom { get; init; }
    public string? TransmissionDateTo { get; init; }
}

internal sealed class GfwMatchCriterion
{
    public string? Reference { get; init; }
    public string? Property { get; init; }
    public string? Source { get; init; }
    public bool? LatestVesselInfo { get; init; }
    public GfwMatchPeriod? Period { get; init; }
    public List<GfwMatchedValue>? Matches { get; init; } = [];
}

internal sealed class GfwMatchedValue
{
    public string? Property { get; init; }
    public JsonElement Value { get; init; }
}

internal sealed class GfwMatchPeriod
{
    public string? DateFrom { get; init; }
    public string? DateTo { get; init; }
    public string? StartDate { get; init; }
    public string? EndDate { get; init; }
}
