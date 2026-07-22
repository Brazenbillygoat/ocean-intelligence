namespace OceanIntelligence.Api.Models;

// A combined classification may use registry records, AIS identity, and GFW model output, so its evidence source remains visible.
public sealed class VesselClassificationRecord
{
    public required string VesselId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Source { get; init; } = string.Empty;
    public int? YearFrom { get; init; }
    public int? YearTo { get; init; }
}