using System.Net.Http.Headers;
using System.Net;
using System.Text.Json;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using OceanIntelligence.Api.Services.GlobalFishingWatch.Models;

namespace OceanIntelligence.Api.Services.GlobalFishingWatch;

public sealed class GlobalFishingWatchClient
{
    internal const string VesselIdentityDataset = "public-global-vessel-identity:latest";

    internal async Task<GfwVesselSearchResponse> SearchVesselsAsync(
        string query, string? cursor, CancellationToken cancellationToken)
    {
        string uri = "/v3/vessels/search?limit=30"
            + $"&datasets%5B0%5D={Uri.EscapeDataString(VesselIdentityDataset)}"
            + "&includes%5B0%5D=MATCH_CRITERIA"
            + $"&query={Uri.EscapeDataString(query)}";
        if (cursor is not null) uri += $"&since={Uri.EscapeDataString(cursor)}";

        try
        {
            using HttpResponseMessage response = await _httpClient.GetAsync(uri, cancellationToken);
            if (!response.IsSuccessStatusCode) throw new GlobalFishingWatchException(response.StatusCode);
            var page = await response.Content.ReadFromJsonAsync<GfwVesselSearchResponse>(cancellationToken);
            cancellationToken.ThrowIfCancellationRequested();
            if (page?.Entries is null || page.Entries.Any(entry => entry is null
                || (entry.SelfReportedInfo?.Any(identity => identity is null) ?? false)
                || (entry.RegistryInfo?.Any(identity => identity is null) ?? false)
                || (entry.MatchCriteria?.Any(criterion => criterion is null
                    || (criterion.Matches?.Any(match => match is null) ?? false)) ?? false))
                || (page.Since is not null && (string.IsNullOrWhiteSpace(page.Since)
                    || page.Since.Length > 2048 || page.Since.Any(char.IsControl) || page.Since == cursor)))
                throw new GlobalFishingWatchException(HttpStatusCode.BadGateway);
            return page;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new GlobalFishingWatchException(HttpStatusCode.GatewayTimeout);
        }
        catch (HttpRequestException)
        {
            throw new GlobalFishingWatchException(HttpStatusCode.BadGateway);
        }
        catch (JsonException)
        {
            throw new GlobalFishingWatchException(HttpStatusCode.BadGateway);
        }
    }

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

    internal async Task<IReadOnlyList<GfwVesselPresence>> GetVesselPresenceAsync(
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

    internal async Task<GfwVesselDetailsResponse> GetVesselDetailsAsync(
        string vesselId,
        CancellationToken cancellationToken)
    {
        // Escape the path value so an unexpected vessel ID cannot alter the request path or query string.
        string encodedVesselId = Uri.EscapeDataString(vesselId);

        string requestUri =
            $"/v3/vessels/{encodedVesselId}" +
            "?dataset=public-global-vessel-identity:latest" +
            "&registries-info-data=ALL";

        using HttpResponseMessage response =
            await _httpClient.GetAsync(requestUri, cancellationToken);

        // Reuse the same exception type so vessel detail failures receive the existing Problem Details mapping.
        if (!response.IsSuccessStatusCode)
        {
            throw new GlobalFishingWatchException(response.StatusCode);
        }

        return await response.Content
            .ReadFromJsonAsync<GfwVesselDetailsResponse>(cancellationToken)
            ?? throw new InvalidOperationException(
                "Global Fishing Watch returned an empty vessel detail response.");
    }
}
