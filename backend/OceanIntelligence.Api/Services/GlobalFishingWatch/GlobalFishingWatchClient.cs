using System.Net.Http.Headers;
using Microsoft.Extensions.Options;

namespace OceanIntelligence.Api.Services.GlobalFishingWatch;

public sealed class GlobalFishingWatchClient
{
    private readonly HttpClient _httpClient;

    public GlobalFishingWatchClient(
        HttpClient httpClient,
        IOptions<GlobalFishingWatchOptions> options)
    {
        GlobalFishingWatchOptions settings = options.Value;

        _httpClient = httpClient;
        _httpClient.BaseAddress = new Uri(settings.BaseUrl);
        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", settings.AccessToken);
    }
}