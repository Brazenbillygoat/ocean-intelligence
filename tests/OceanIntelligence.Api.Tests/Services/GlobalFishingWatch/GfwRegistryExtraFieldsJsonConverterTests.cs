using System.Text.Json;
using OceanIntelligence.Api.Services.GlobalFishingWatch.Models;

namespace OceanIntelligence.Api.Tests.Services.GlobalFishingWatch;

public sealed class GfwRegistryExtraFieldsJsonConverterTests
{
    [Fact]
    public void Deserialize_WithDocumentedObject_MapsAvailableFields()
    {
        const string json = """
        {
          "builtYear": 2008,
          "depthM": 4.6
        }
        """;

        GfwRegistryExtraFields? result =
            JsonSerializer.Deserialize<GfwRegistryExtraFields>(json);

        Assert.NotNull(result);
        Assert.Equal(2008, result.BuiltYear);
        Assert.Equal(4.6m, result.DepthMeters);
    }

    [Fact]
    public void Deserialize_WithLiveEmptyArray_ReturnsNull()
    {
        // Some GFW registry sources return [] instead of the documented object when no extra fields are available.
        GfwRegistryExtraFields? result =
            JsonSerializer.Deserialize<GfwRegistryExtraFields>("[]");

        Assert.Null(result);
    }

    [Fact]
    public void Deserialize_WithUnexpectedNonemptyArray_ThrowsJsonException()
    {
        // Rejecting populated arrays prevents an upstream schema change from being silently discarded.
        Assert.Throws<JsonException>(
            () => JsonSerializer.Deserialize<GfwRegistryExtraFields>("[1]"));
    }
}
