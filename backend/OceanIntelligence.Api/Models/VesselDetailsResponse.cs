namespace OceanIntelligence.Api.Models;

// This is our stable public contract. It intentionally does not expose GFW's raw registry and identity structure.
public sealed class VesselDetailsResponse
{
    public required string VesselId { get; init; }

    // The resolved dataset version helps us investigate changes when GFW updates its latest alias.
    public required string Dataset { get; init; }

    public string DataProvider { get; init; } = "Global Fishing Watch";

    public string Attribution { get; init; } =
        "Vessel data provided by Global Fishing Watch.";

    public int RegistryRecordCount { get; init; }
    public IReadOnlyList<VesselIdentityRecord> AisIdentities { get; init; } = [];
    public IReadOnlyList<VesselRegistryRecord> RegistryRecords { get; init; } = [];
    public IReadOnlyList<VesselClassificationRecord> CombinedVesselTypes { get; init; } = [];
    public IReadOnlyList<VesselClassificationRecord> CombinedGearTypes { get; init; } = [];

    // Caveats travel with the data so every client can explain limitations consistently.
    public IReadOnlyList<string> Caveats { get; init; } = [];
}