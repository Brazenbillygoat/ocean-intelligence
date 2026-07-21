using System.Net;

namespace OceanIntelligence.Api.Services.GlobalFishingWatch;

// Keeps third-party failures distinct from bugs inside our own API.
internal sealed class GlobalFishingWatchException : Exception
{
    public HttpStatusCode StatusCode { get; }

    public GlobalFishingWatchException(HttpStatusCode statusCode)
        : base($"Global Fishing Watch returned HTTP {(int)statusCode}.")
    {
        StatusCode = statusCode;
    }
}