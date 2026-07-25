using System.Collections.Concurrent;
using OceanIntelligence.Api.Services.GlobalFishingWatch.Models;

namespace OceanIntelligence.Api.Services.GlobalFishingWatch;

public sealed class GlobalFishingWatchRequestCoordinator : IDisposable
{
    private readonly SemaphoreSlim _reportGate = new(1, 1);
    private readonly ConcurrentDictionary<
        string,
        Lazy<Task<GfwVesselDetailsResponse>>> _vesselDetailRequests =
        new(StringComparer.Ordinal);

    internal async Task<T> RunReportAsync<T>(
        Func<CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken)
    {
        await _reportGate.WaitAsync(cancellationToken);

        try
        {
            return await operation(cancellationToken);
        }
        finally
        {
            _reportGate.Release();
        }
    }

    internal async Task<GfwVesselDetailsResponse> RunVesselDetailsAsync(
        string key,
        Func<CancellationToken, Task<GfwVesselDetailsResponse>> operation,
        CancellationToken cancellationToken)
    {
        Lazy<Task<GfwVesselDetailsResponse>>? candidate = null;

        candidate = new Lazy<Task<GfwVesselDetailsResponse>>(
            () => ExecuteVesselDetailsAsync(
                key,
                candidate!,
                operation,
                cancellationToken),
            LazyThreadSafetyMode.ExecutionAndPublication);

        Lazy<Task<GfwVesselDetailsResponse>> request =
            _vesselDetailRequests.GetOrAdd(key, candidate);

        return await request.Value.WaitAsync(cancellationToken);
    }

    public void Dispose()
    {
        _reportGate.Dispose();
    }

    private async Task<GfwVesselDetailsResponse> ExecuteVesselDetailsAsync(
        string key,
        Lazy<Task<GfwVesselDetailsResponse>> request,
        Func<CancellationToken, Task<GfwVesselDetailsResponse>> operation,
        CancellationToken cancellationToken)
    {
        try
        {
            return await operation(cancellationToken);
        }
        finally
        {
            if (_vesselDetailRequests.TryGetValue(
                    key,
                    out Lazy<Task<GfwVesselDetailsResponse>>? current) &&
                ReferenceEquals(current, request))
            {
                _vesselDetailRequests.TryRemove(key, out _);
            }
        }
    }
}
