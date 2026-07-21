namespace OceanIntelligence.Api.Models;

// Keeps the vessel list tied to the area and dates that produced it.
public sealed class VesselTrafficResponse
{
    // Echoing the query helps clients label results without rebuilding this context.
    public required VesselTrafficRequest Query { get; init; }

    // Included separately so clients do not need to count a potentially large array.
    public int Count { get; init; }

    public IReadOnlyList<VesselTrafficVessel> Vessels { get; init; } = [];
}