using Microsoft.AspNetCore.Mvc;
using OceanIntelligence.Api.Models;
using OceanIntelligence.Api.Services.GlobalFishingWatch;

namespace OceanIntelligence.Api.Controllers;

// Enables API-specific behavior such as automatic request binding and error responses.
[ApiController]
// Combined with HttpGet, this exposes GET /api/vessel-traffic.
[Route("api/vessel-traffic")]
public sealed class VesselTrafficController : ControllerBase
{
    private readonly GlobalFishingWatchClient _gfwClient;

    // ASP.NET injects the registered GFW client when it creates this controller.
    public VesselTrafficController(GlobalFishingWatchClient gfwClient)
    {
        _gfwClient = gfwClient;
    }

    [HttpGet]
    // ActionResult lets this endpoint return either vessel data or an HTTP error.
    public async Task<ActionResult<IReadOnlyList<VesselTrafficVessel>>> Get(
        // Builds the request model from URL query-string values.
        [FromQuery] VesselTrafficRequest request,
        // Stops the GFW request if the caller disconnects or cancels.
        CancellationToken cancellationToken)
    {
        string? validationError = Validate(request);

        if (validationError is not null)
        {
            return BadRequest(new { error = validationError });
        }

        // await releases the request thread while GFW does the network work.
        var vessels = await _gfwClient.GetVesselPresenceAsync(
            request.West,
            request.South,
            request.East,
            request.North,
            request.StartDate,
            request.EndDate,
            cancellationToken);

        // Translate GFW's contract into the smaller contract our API owns.
        List<VesselTrafficVessel> result = vessels
            .Select(vessel => new VesselTrafficVessel
            {
                VesselId = vessel.VesselId,
                Name = vessel.ShipName,
                Mmsi = vessel.Mmsi,
                Imo = vessel.Imo,
                Callsign = vessel.Callsign,
                Flag = vessel.Flag,
                VesselType = vessel.VesselType,
                GearType = vessel.GearType,
                EnteredAt = vessel.EntryTimestamp,
                ExitedAt = vessel.ExitTimestamp,
                PresenceHours = vessel.Hours
            })
            .ToList();

        return Ok(result);
    }

    // These checks compare multiple fields, so they belong together here.
    private static string? Validate(VesselTrafficRequest request)
    {
        if (request.West is < -180 or > 180 ||
            request.East is < -180 or > 180)
        {
            return "Longitude must be between -180 and 180.";
        }

        if (request.South is < -90 or > 90 ||
            request.North is < -90 or > 90)
        {
            return "Latitude must be between -90 and 90.";
        }

        if (request.West >= request.East ||
            request.South >= request.North)
        {
            return "The coordinates do not form a valid bounding box.";
        }

        if (request.StartDate == default ||
            request.EndDate == default ||
            request.StartDate >= request.EndDate)
        {
            return "StartDate must be before EndDate.";
        }

        // GFW limits a single report to 366 days.
        if (request.EndDate.DayNumber - request.StartDate.DayNumber > 366)
        {
            return "The date range cannot exceed 366 days.";
        }

        return null;
    }
}
