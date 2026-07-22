using Microsoft.AspNetCore.Mvc;
using OceanIntelligence.Api.Models;
using OceanIntelligence.Api.Services.GlobalFishingWatch;

namespace OceanIntelligence.Api.Controllers;

[ApiController]
[Route("api/vessels")]
public sealed class VesselsController : ControllerBase
{
    private readonly GlobalFishingWatchClient _gfwClient;

    public VesselsController(GlobalFishingWatchClient gfwClient)
    {
        _gfwClient = gfwClient;
    }

    [HttpGet("{vesselId}")]
    public async Task<ActionResult<VesselDetailsResponse>> GetById(
        string vesselId,
        CancellationToken cancellationToken)
    {
        // We avoid enforcing a UUID format because GFW vessel IDs use their own identifier structure and may change independently of our API.
        if (string.IsNullOrWhiteSpace(vesselId) || vesselId.Length > 100)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid vessel ID.",
                Detail = "A valid Global Fishing Watch vessel ID is required.",
                Status = StatusCodes.Status400BadRequest
            });
        }

        var details = await _gfwClient.GetVesselDetailsAsync(
            vesselId,
            cancellationToken);

        // Newest AIS identity records appear first so clients do not need to duplicate this selection rule.
        List<VesselIdentityRecord> identities = details.SelfReportedInfo
            .OrderByDescending(identity => identity.TransmissionDateTo)
            .Select(identity => new VesselIdentityRecord
            {
                VesselId = identity.Id,
                Mmsi = identity.Mmsi,
                Name = identity.ShipName,
                Flag = identity.Flag,
                Callsign = identity.Callsign,
                Imo = identity.Imo ?? string.Empty,
                GearType = identity.GearType ?? string.Empty,
                VesselType = identity.ShipType ?? string.Empty,
                MessagesCount = identity.MessagesCount,
                PositionsCount = identity.PositionsCount,
                SourceCodes = identity.SourceCodes,
                ShipTypeHistory = identity.ShipTypesByYear
                    .Select(history => new VesselShipTypeHistory
                    {
                        VesselType = history.ShipType,
                        Years = history.Years
                    })
                    .ToList(),
                IdentityObservedFrom = identity.TransmissionDateFrom,
                IdentityObservedThrough = identity.TransmissionDateTo
            })
            .ToList();

        // GFW can return several historical records from different registries, so no record is silently selected as universally authoritative.
        List<VesselRegistryRecord> registryRecords = details.RegistryInfo
            .OrderByDescending(record => record.LatestVesselInfo)
            .ThenByDescending(record => record.TransmissionDateTo)
            .Select(record => new VesselRegistryRecord
            {
                RecordId = record.RecordId,
                SourceCodes = record.SourceCodes,
                Mmsi = record.Mmsi,
                Flag = record.Flag,
                Name = record.ShipName,
                Callsign = record.Callsign,
                Imo = record.Imo ?? string.Empty,
                IsLatestRecord = record.LatestVesselInfo,
                GearTypes = record.GearTypes,
                LengthMeters = record.LengthMeters,
                GrossTonnage = record.GrossTonnage,
                BuiltYear = record.ExtraFields?.BuiltYear,
                DepthMeters = record.ExtraFields?.DepthMeters,
                RecordObservedFrom = record.TransmissionDateFrom,
                RecordObservedThrough = record.TransmissionDateTo
            })
            .ToList();

        // Flattening these collections gives clients simple lists while retaining the vessel ID and evidence source for every classification.
        List<VesselClassificationRecord> combinedVesselTypes =
            details.CombinedSourcesInfo
                .SelectMany(source => source.ShipTypes.Select(
                    classification => new VesselClassificationRecord
                    {
                        VesselId = source.VesselId,
                        Name = classification.Name,
                        Source = classification.Source,
                        YearFrom = classification.YearFrom,
                        YearTo = classification.YearTo
                    }))
                .OrderByDescending(classification => classification.YearTo)
                .ToList();

        List<VesselClassificationRecord> combinedGearTypes =
            details.CombinedSourcesInfo
                .SelectMany(source => source.GearTypes.Select(
                    classification => new VesselClassificationRecord
                    {
                        VesselId = source.VesselId,
                        Name = classification.Name,
                        Source = classification.Source,
                        YearFrom = classification.YearFrom,
                        YearTo = classification.YearTo
                    }))
                .OrderByDescending(classification => classification.YearTo)
                .ToList();

        var response = new VesselDetailsResponse
        {
            VesselId = vesselId,
            Dataset = details.Dataset,
            RegistryRecordCount = details.RegistryInfoTotalRecords,
            AisIdentities = identities,
            RegistryRecords = registryRecords,
            CombinedVesselTypes = combinedVesselTypes,
            CombinedGearTypes = combinedGearTypes,
            Caveats =
            [
                "AIS identity values are self reported and may be incomplete, outdated, or incorrect.",
                "Identity and registry dates describe when records were associated with a vessel; they are not vessel positions.",
                "Identity records and GFW classifications can change as transmitted identifiers, registry data, and classification models change."
            ]
        };

        return Ok(response);
    }
}