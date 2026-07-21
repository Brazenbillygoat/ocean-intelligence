using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using OceanIntelligence.Api.Services.GlobalFishingWatch.Models;

namespace OceanIntelligence.Api.Services.GlobalFishingWatch;

public sealed class GlobalFishingWatchClient
{
    // HttpClient is created and managed by ASP.NET's HttpClient factory.
    private readonly HttpClient _httpClient;

    public GlobalFishingWatchClient(
        HttpClient httpClient,
        IOptions<GlobalFishingWatchOptions> options)
    {
        // IOptions<T> exposes configuration bound during application startup.
        GlobalFishingWatchOptions settings = options.Value;

        _httpClient = httpClient;

        // Every request can use a relative GFW path and receives this token.
        _httpClient.BaseAddress = new Uri(settings.BaseUrl);
        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", settings.AccessToken);
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
        string dateRange =
            $"{startDate:yyyy-MM-dd},{endDate:yyyy-MM-dd}";

        string requestUri =
            "/v3/4wings/report" +
            "?temporal-resolution=ENTIRE" +
            "&group-by=VESSEL_ID" +
            "&spatial-aggregation=true" +
            "&datasets%5B0%5D=public-global-presence:latest" +
            $"&date-range={dateRange}" +
            "&format=JSON";

        // GeoJSON coordinates use longitude first, then latitude.
        double[][][] coordinates =
        [
            [
                [west, south],
                [east, south],
                [east, north],
                [west, north],
                [west, south]
            ]
        ];

        var requestBody = new
        {
            geojson = new
            {
                type = "Polygon",
                coordinates
            }
        };

        using HttpResponseMessage response =
            await _httpClient.PostAsJsonAsync(
                requestUri,
                requestBody,
                cancellationToken);

        // Convert non-success HTTP responses into exceptions.
        if (!response.IsSuccessStatusCode)
        {
            throw new GlobalFishingWatchException(response.StatusCode);
        }

        GfwReportResponse report =
            await response.Content.ReadFromJsonAsync<GfwReportResponse>(
                cancellationToken)
            ?? throw new InvalidOperationException(
                "Global Fishing Watch returned an empty response.");

        // Remove the dynamic dataset-version wrapper from GFW's response.
        return report.Entries
            .SelectMany(entry => entry.Values)
            .Where(vessels => vessels is not null)
            .SelectMany(vessels => vessels!)
            .ToList();
    }
}