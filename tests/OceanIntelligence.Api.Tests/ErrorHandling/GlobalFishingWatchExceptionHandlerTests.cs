using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using OceanIntelligence.Api.ErrorHandling;
using OceanIntelligence.Api.Services.GlobalFishingWatch;

namespace OceanIntelligence.Api.Tests.ErrorHandling;

public sealed class GlobalFishingWatchExceptionHandlerTests
{
    // Confirms that upstream failures become meaningful statuses from our API.
    [Theory]
    [InlineData(HttpStatusCode.TooManyRequests, 503)]
    [InlineData(HttpStatusCode.RequestTimeout, 504)]
    [InlineData(HttpStatusCode.GatewayTimeout, 504)]
    [InlineData(HttpStatusCode.Unauthorized, 502)]
    [InlineData(HttpStatusCode.InternalServerError, 502)]
    public async Task TryHandleAsync_WithGfwFailure_MapsStatusCode(
        HttpStatusCode upstreamStatus,
        int expectedStatus)
    {
        // DefaultHttpContext lets us test middleware behavior without a web server.
        var context = new DefaultHttpContext();

        // Responses normally write to the network. A memory stream captures the JSON.
        context.Response.Body = new MemoryStream();

        var handler = new GlobalFishingWatchExceptionHandler(
            NullLogger<GlobalFishingWatchExceptionHandler>.Instance);

        var exception =
            new GlobalFishingWatchException(upstreamStatus);

        bool handled = await handler.TryHandleAsync(
            context,
            exception,
            CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(expectedStatus, context.Response.StatusCode);

        // Rewind the captured response before reading it.
        context.Response.Body.Position = 0;

        using JsonDocument json =
            await JsonDocument.ParseAsync(context.Response.Body);

        Assert.Equal(
            "Vessel data service unavailable",
            json.RootElement.GetProperty("title").GetString());
    }

    [Fact]
    public async Task TryHandleAsync_WithUnrelatedException_DoesNotHandleIt()
    {
        var context = new DefaultHttpContext();

        var handler = new GlobalFishingWatchExceptionHandler(
            NullLogger<GlobalFishingWatchExceptionHandler>.Instance);

        // Returning false allows another handler to inspect unknown exceptions.
        bool handled = await handler.TryHandleAsync(
            context,
            new InvalidOperationException("Unrelated failure"),
            CancellationToken.None);

        Assert.False(handled);
    }
}