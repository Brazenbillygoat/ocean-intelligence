using System.Net;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using OceanIntelligence.Api.Services.GlobalFishingWatch;

namespace OceanIntelligence.Api.ErrorHandling;

// Converts known GFW failures into safe responses for our API callers.
internal sealed class GlobalFishingWatchExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalFishingWatchExceptionHandler> _logger;

    // The framework supplies the logger when it creates this handler.
    public GlobalFishingWatchExceptionHandler(
        ILogger<GlobalFishingWatchExceptionHandler> logger)
    {
        _logger = logger;
    }

    // Returning true tells ASP.NET that this exception has been fully handled.
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        // Leave unrelated exceptions for another handler or ASP.NET itself.
        if (exception is not GlobalFishingWatchException gfwException)
        {
            return false;
        }

        // Translate the upstream status into one that makes sense to our caller.
        int statusCode = gfwException.StatusCode switch
        {
            HttpStatusCode.TooManyRequests =>
                StatusCodes.Status503ServiceUnavailable,

            HttpStatusCode.RequestTimeout or HttpStatusCode.GatewayTimeout =>
                StatusCodes.Status504GatewayTimeout,

            _ => StatusCodes.Status502BadGateway
        };

        // Keep the real upstream status in server logs without exposing it as internals.
        _logger.LogWarning(
            exception,
            "Global Fishing Watch request failed with status {StatusCode}",
            (int)gfwException.StatusCode);

        // ProblemDetails gives every API error the same standard JSON structure.
        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = "Vessel data service unavailable",
            Detail = "Global Fishing Watch could not complete the request."
        };

        httpContext.Response.StatusCode = statusCode;

        // Write the response here so the controller stays focused on successful requests.
        await httpContext.Response.WriteAsJsonAsync(
            problem,
            cancellationToken);

        return true;
    }
}
