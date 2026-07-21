namespace OceanIntelligence.Api.Services.GlobalFishingWatch;

public sealed class GlobalFishingWatchOptions
{
    // Matches the configuration section shared by appsettings and user secrets.
    public const string SectionName = "GlobalFishingWatch";

    // init keeps configuration values read-only after the object is created.
    public string BaseUrl { get; init; } = string.Empty;
    public string AccessToken { get; init; } = string.Empty;
}
