using System.Text.Json.Serialization;

namespace OceanIntelligence.Api.Services.GlobalFishingWatch.Models;

// Models the top level response from the GFW vessel detail endpoint. This type remains internal so our public API does not become coupled to GFW's contract.
internal sealed class GfwVesselDetailsResponse
{
    [JsonPropertyName("dataset")]
    public string Dataset { get; init; } = string.Empty;

    [JsonPropertyName("registryInfoTotalRecords")]
    public int RegistryInfoTotalRecords { get; init; }

    [JsonPropertyName("registryInfo")]
    public List<GfwRegistryVesselInfo> RegistryInfo { get; init; } = [];

    [JsonPropertyName("combinedSourcesInfo")]
    public List<GfwCombinedSourcesInfo> CombinedSourcesInfo { get; init; } = [];

    // A physical vessel can have several AIS identity records because transmitted names, MMSIs, callsigns, or flags may change over time.
    [JsonPropertyName("selfReportedInfo")]
    public List<GfwSelfReportedVesselInfo> SelfReportedInfo { get; init; } = [];
}