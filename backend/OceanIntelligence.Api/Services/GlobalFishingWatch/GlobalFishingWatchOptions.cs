namespace OceanIntelligence.Api.Services.GlobalFishingWatch;

public sealed class GlobalFishingWatchOptions
{
    public const string SectionName = "GlobalFishingWatch";

    public string BaseUrl { get; init; } = string.Empty;
    public string AccessToken { get; init; } = string.Empty;
}