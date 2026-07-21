namespace OceanIntelligence.Api.Models;

// Defines the map rectangle and date window the caller wants to search.
public sealed class VesselTrafficRequest
{
    // West/east are longitude, south/north are latitude.
    public double West { get; init; }
    public double South { get; init; }
    public double East { get; init; }
    public double North { get; init; }

    // Calendar dates are enough here; callers do not need to handle time zones.
    public DateOnly StartDate { get; init; }
    public DateOnly EndDate { get; init; }
}
