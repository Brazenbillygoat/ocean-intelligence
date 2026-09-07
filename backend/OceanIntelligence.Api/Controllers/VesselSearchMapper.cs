using System.Security.Cryptography;
using System.Text.Json;
using OceanIntelligence.Api.Models;
using OceanIntelligence.Api.Services.GlobalFishingWatch.Models;

namespace OceanIntelligence.Api.Controllers;

internal static class VesselSearchMapper
{
    internal static VesselSearchResponse Map(GfwVesselSearchResponse page, string query)
    {
        var matches = new List<VesselSearchMatch>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (GfwVesselSearchEntry entry in page.Entries!.OfType<GfwVesselSearchEntry>())
        {
            List<VesselSearchEvidence> evidence = (entry.MatchCriteria ?? [])
                .SelectMany(criterion => (criterion.Matches ?? []).Select(match => new VesselSearchEvidence
                {
                    Source = criterion.Source ?? criterion.Property ?? "",
                    Reference = criterion.Reference ?? "",
                    Field = match.Property ?? "",
                    Value = match.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined
                        ? "" : match.Value.ToString(),
                    ObservedFrom = criterion.Period?.DateFrom ?? criterion.Period?.StartDate,
                    ObservedThrough = criterion.Period?.DateTo ?? criterion.Period?.EndDate,
                    IsLatestRecord = criterion.LatestVesselInfo
                })).ToList();

            // Expand every AIS identity in provider order; MMSI/name are never keys.
            // A registry ID is not evidence that the detail endpoint accepts that ID.
            List<GfwSearchIdentity> identities = entry.SelfReportedInfo ?? [];
            string source = "AIS identity";
            if (identities.Count == 0)
            {
                identities = entry.RegistryInfo ?? [];
                source = "Registry record";
            }
            if (identities.Count == 0)
            {
                identities = [new GfwSearchIdentity()];
                source = "Unspecified record";
            }

            foreach (GfwSearchIdentity identity in identities)
            {
                string? vesselId = source == "AIS identity" && IsUsableId(identity.Id) ? identity.Id : null;
                string key = source + ":" + (string.IsNullOrWhiteSpace(identity.Id)
                    ? Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(
                        source == "Unspecified record" ? (object)entry : identity)))
                    : identity.Id);
                if (!seen.Add(key)) continue;
                matches.Add(new VesselSearchMatch
                {
                    MatchKey = key,
                    VesselId = vesselId,
                    RecordSource = source,
                    Name = identity.Name ?? "",
                    Mmsi = identity.Mmsi ?? "",
                    Imo = identity.Imo ?? "",
                    Callsign = identity.Callsign ?? "",
                    Flag = identity.Flag ?? "",
                    ObservedFrom = identity.TransmissionDateFrom,
                    ObservedThrough = identity.TransmissionDateTo,
                    MatchFields = identity.MatchFields,
                    MatchingEvidence = evidence
                });
            }
        }
        return new VesselSearchResponse { Query = query, Matches = matches, NextCursor = page.Since };
    }

    private static bool IsUsableId(string? value) =>
        !string.IsNullOrWhiteSpace(value) && value.Length <= 100
        && value == value.Trim() && !value.Any(char.IsControl);
}
