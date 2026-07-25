using System.Globalization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using OceanIntelligence.Api.Protection;
using OceanIntelligence.Api.Services.GlobalFishingWatch.Models;

namespace OceanIntelligence.Api.Services.GlobalFishingWatch;

public sealed class GlobalFishingWatchDataService
{
    private readonly GlobalFishingWatchClient _client;
    private readonly IMemoryCache _cache;
    private readonly ApiProtectionOptions _options;
    private readonly GlobalFishingWatchRequestCoordinator _coordinator;

    public GlobalFishingWatchDataService(
        GlobalFishingWatchClient client,
        IMemoryCache cache,
        IOptions<ApiProtectionOptions> options,
        GlobalFishingWatchRequestCoordinator coordinator)
    {
        _client = client;
        _cache = cache;
        _options = options.Value;
        _coordinator = coordinator;
    }

    internal async Task<IReadOnlyList<GfwVesselPresence>>
        GetVesselPresenceAsync(
            double west,
            double south,
            double east,
            double north,
            DateOnly startDate,
            DateOnly endDate,
            CancellationToken cancellationToken)
    {
        string cacheKey = CreateAreaCacheKey(
            west,
            south,
            east,
            north,
            startDate,
            endDate);

        if (_cache.TryGetValue(
                cacheKey,
                out IReadOnlyList<GfwVesselPresence>? cachedVessels) &&
            cachedVessels is not null)
        {
            return cachedVessels;
        }

        return await _coordinator.RunReportAsync(
            async token =>
            {
                if (_cache.TryGetValue(
                        cacheKey,
                        out IReadOnlyList<GfwVesselPresence>?
                            recheckedVessels) &&
                    recheckedVessels is not null)
                {
                    return recheckedVessels;
                }

                IReadOnlyList<GfwVesselPresence> vessels =
                    await _client.GetVesselPresenceAsync(
                        west,
                        south,
                        east,
                        north,
                        startDate,
                        endDate,
                        token);

                _cache.Set(
                    cacheKey,
                    vessels,
                    _options.AreaSearchCacheExpiration);

                return vessels;
            },
            cancellationToken);
    }

    internal async Task<GfwVesselDetailsResponse> GetVesselDetailsAsync(
        string vesselId,
        CancellationToken cancellationToken)
    {
        string cacheKey = $"gfw:vessel:v1:{vesselId}";

        if (_cache.TryGetValue(
                cacheKey,
                out GfwVesselDetailsResponse? cachedDetails) &&
            cachedDetails is not null)
        {
            return cachedDetails;
        }

        return await _coordinator.RunVesselDetailsAsync(
            cacheKey,
            async token =>
            {
                if (_cache.TryGetValue(
                        cacheKey,
                        out GfwVesselDetailsResponse? recheckedDetails) &&
                    recheckedDetails is not null)
                {
                    return recheckedDetails;
                }

                GfwVesselDetailsResponse details =
                    await _client.GetVesselDetailsAsync(vesselId, token);

                _cache.Set(
                    cacheKey,
                    details,
                    _options.VesselDetailsCacheExpiration);

                return details;
            },
            cancellationToken);
    }

    private static string CreateAreaCacheKey(
        double west,
        double south,
        double east,
        double north,
        DateOnly startDate,
        DateOnly endDate)
    {
        return string.Create(
            CultureInfo.InvariantCulture,
            $"gfw:area:v1:{CanonicalizeZero(west):R}:" +
            $"{CanonicalizeZero(south):R}:" +
            $"{CanonicalizeZero(east):R}:" +
            $"{CanonicalizeZero(north):R}:" +
            $"{startDate:yyyy-MM-dd}:{endDate:yyyy-MM-dd}");
    }

    private static double CanonicalizeZero(double value)
    {
        return value == 0d ? 0d : value;
    }
}
