using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using OceanIntelligence.Api.Protection;
using OceanIntelligence.Api.Services.GlobalFishingWatch;

namespace OceanIntelligence.Api.Tests.TestSupport;

internal sealed class GlobalFishingWatchDataServiceHarness : IDisposable
{
    private readonly MemoryCache _cache = new(new MemoryCacheOptions());
    private readonly GlobalFishingWatchRequestCoordinator _coordinator = new();

    internal GlobalFishingWatchDataServiceHarness(
        GlobalFishingWatchClient client,
        ApiProtectionOptions? options = null)
    {
        Service = new GlobalFishingWatchDataService(
            client,
            _cache,
            Options.Create(options ?? new ApiProtectionOptions()),
            _coordinator);
    }

    internal GlobalFishingWatchDataService Service { get; }

    public void Dispose()
    {
        _coordinator.Dispose();
        _cache.Dispose();
    }
}
