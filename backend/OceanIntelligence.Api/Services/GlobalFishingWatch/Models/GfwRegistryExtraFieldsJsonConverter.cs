using System.Text.Json;
using System.Text.Json.Serialization;

namespace OceanIntelligence.Api.Services.GlobalFishingWatch.Models;

// GFW documents extraFields as an object but returns an empty array when a registry record has no extra fields.
internal sealed class GfwRegistryExtraFieldsJsonConverter : JsonConverter<GfwRegistryExtraFields>
{
    public override GfwRegistryExtraFields? Read(
        ref Utf8JsonReader reader,
        Type typeToConvert,
        JsonSerializerOptions options)
    {
        using JsonDocument document = JsonDocument.ParseValue(ref reader);
        JsonElement root = document.RootElement;

        if (root.ValueKind == JsonValueKind.Array && root.GetArrayLength() == 0)
        {
            return null;
        }

        if (root.ValueKind != JsonValueKind.Object)
        {
            throw new JsonException(
                "GFW registry extraFields must be an object or an empty array.");
        }

        return new GfwRegistryExtraFields
        {
            BuiltYear = ReadOptionalInt32(root, "builtYear"),
            DepthMeters = ReadOptionalDecimal(root, "depthM")
        };
    }

    public override void Write(
        Utf8JsonWriter writer,
        GfwRegistryExtraFields value,
        JsonSerializerOptions options)
    {
        writer.WriteStartObject();

        if (value.BuiltYear is not null)
        {
            writer.WriteNumber("builtYear", value.BuiltYear.Value);
        }

        if (value.DepthMeters is not null)
        {
            writer.WriteNumber("depthM", value.DepthMeters.Value);
        }

        writer.WriteEndObject();
    }

    private static int? ReadOptionalInt32(JsonElement parent, string propertyName)
    {
        if (!parent.TryGetProperty(propertyName, out JsonElement property) ||
            property.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        if (property.ValueKind == JsonValueKind.Number &&
            property.TryGetInt32(out int value))
        {
            return value;
        }

        throw new JsonException(
            $"GFW registry extraFields.{propertyName} must be an integer.");
    }

    private static decimal? ReadOptionalDecimal(
        JsonElement parent,
        string propertyName)
    {
        if (!parent.TryGetProperty(propertyName, out JsonElement property) ||
            property.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        if (property.ValueKind == JsonValueKind.Number &&
            property.TryGetDecimal(out decimal value))
        {
            return value;
        }

        throw new JsonException(
            $"GFW registry extraFields.{propertyName} must be a number.");
    }
}
