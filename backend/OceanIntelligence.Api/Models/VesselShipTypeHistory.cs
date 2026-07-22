namespace OceanIntelligence.Api.Models;

// Vessel classifications can change as identity data and GFW models improve, so the associated years remain part of the record.
public sealed class VesselShipTypeHistory
{
    public string VesselType { get; init; } = string.Empty;
    public IReadOnlyList<int> Years { get; init; } = [];
}