using OceanIntelligence.Api.Services.GlobalFishingWatch;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Bind the merged appsettings and user-secrets section to a typed options object.
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
    // Fail during startup instead of during the first external API request.
    .ValidateOnStart();

// Register a managed HttpClient and allow the GFW client to be constructor-injected.
builder.Services.AddHttpClient<GlobalFishingWatchClient>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
