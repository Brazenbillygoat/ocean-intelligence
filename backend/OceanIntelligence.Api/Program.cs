using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using OceanIntelligence.Api.Protection;
using OceanIntelligence.Api.Services.GlobalFishingWatch;
using OceanIntelligence.Api.ErrorHandling;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
// ProblemDetails gives API errors a consistent, standard JSON shape.
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalFishingWatchExceptionHandler>();
builder.Services.AddMemoryCache();

// Bind the merged appsettings and user-secrets section to typed options and fail during startup instead of during the first external API request.
builder.Services
    .AddOptions<GlobalFishingWatchOptions>()
    .Bind(builder.Configuration.GetSection(
        GlobalFishingWatchOptions.SectionName))
    .Validate(
        options => Uri.TryCreate(
            options.BaseUrl,
            UriKind.Absolute,
            out _),
        "GlobalFishingWatch:BaseUrl must be a valid absolute URL.")
    .Validate(
        options => !string.IsNullOrWhiteSpace(options.AccessToken),
        "GlobalFishingWatch:AccessToken is required.")
    .ValidateOnStart();

builder.Services
    .AddOptions<ApiProtectionOptions>()
    .Bind(builder.Configuration.GetSection(
        ApiProtectionOptions.SectionName))
    .Validate(
        options =>
            options.AreaSearchCacheExpiration > TimeSpan.Zero &&
            options.VesselDetailsCacheExpiration > TimeSpan.Zero,
        "API cache expiration values must be positive.")
    .Validate(
        options =>
            options.AreaSearchRateLimit.PermitLimit > 0 &&
            options.AreaSearchRateLimit.Window > TimeSpan.Zero &&
            options.VesselDetailsRateLimit.PermitLimit > 0 &&
            options.VesselDetailsRateLimit.Window > TimeSpan.Zero,
        "API rate-limit permit counts and windows must be positive.")
    .ValidateOnStart();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, cancellationToken) =>
    {
        if (context.Lease.TryGetMetadata(
                MetadataName.RetryAfter,
                out TimeSpan retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter =
                Math.Ceiling(retryAfter.TotalSeconds)
                    .ToString(CultureInfo.InvariantCulture);
        }

        await Results.Problem(
                statusCode: StatusCodes.Status429TooManyRequests,
                title: "Request rate limit exceeded",
                detail: "Too many requests were sent to this endpoint. Try again later.")
            .ExecuteAsync(context.HttpContext);
    };

    options.AddPolicy(
        RateLimitPolicyNames.AreaSearch,
        httpContext => CreateFixedWindowPartition(
            httpContext,
            httpContext.RequestServices
                .GetRequiredService<IOptions<ApiProtectionOptions>>()
                .Value
                .AreaSearchRateLimit));

    options.AddPolicy(
        RateLimitPolicyNames.VesselDetails,
        httpContext => CreateFixedWindowPartition(
            httpContext,
            httpContext.RequestServices
                .GetRequiredService<IOptions<ApiProtectionOptions>>()
                .Value
                .VesselDetailsRateLimit));
});

// Register a managed HttpClient and allow the GFW client to be constructor-injected.
// Default HttpClient logs include request URIs, which would retain vessel search queries.
builder.Services.AddHttpClient<GlobalFishingWatchClient>().RemoveAllLoggers();
builder.Services
    .AddSingleton<GlobalFishingWatchRequestCoordinator>();
builder.Services.AddScoped<GlobalFishingWatchDataService>();

var app = builder.Build();
// Routes recognized exceptions through our registered handlers.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseRateLimiter();
app.UseAuthorization();
app.MapControllers();

app.Run();

static RateLimitPartition<string> CreateFixedWindowPartition(
    HttpContext httpContext,
    EndpointRateLimitOptions options)
{
    string partitionKey =
        httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    return RateLimitPartition.GetFixedWindowLimiter(
        partitionKey,
        _ => new FixedWindowRateLimiterOptions
        {
            AutoReplenishment = true,
            PermitLimit = options.PermitLimit,
            QueueLimit = 0,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            Window = options.Window
        });
}

public partial class Program
{
}
