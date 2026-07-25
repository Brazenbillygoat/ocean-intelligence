namespace OceanIntelligence.Api.Protection;

public sealed class ApiProtectionOptions
{
    public const string SectionName = "ApiProtection";

    public TimeSpan AreaSearchCacheExpiration { get; init; } =
        TimeSpan.FromMinutes(30);

    public TimeSpan VesselDetailsCacheExpiration { get; init; } =
        TimeSpan.FromHours(24);

    public EndpointRateLimitOptions AreaSearchRateLimit { get; init; } =
        new()
        {
            PermitLimit = 6,
            Window = TimeSpan.FromMinutes(1)
        };

    public EndpointRateLimitOptions VesselDetailsRateLimit { get; init; } =
        new()
        {
            PermitLimit = 60,
            Window = TimeSpan.FromMinutes(1)
        };
}

public sealed class EndpointRateLimitOptions
{
    public int PermitLimit { get; init; }
    public TimeSpan Window { get; init; }
}
