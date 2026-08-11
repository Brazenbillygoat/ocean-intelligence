// A nautical mile is defined as exactly one arcminute of latitude, so 60
// nautical miles equals one degree of latitude. Longitude degrees shrink
// with the cosine of latitude, so the east-west delta widens toward the
// poles. The existing area-search API accepts one bounding box with
// west < east and cannot represent a box that wraps across the date line,
// so boxes near either boundary are rejected rather than clamped.

// Pilot 1 fixes the nearby-search radius at 25 nautical miles. The value is
// exported here so the component and any future caller share one source of
// truth, but calculateBoundingBox still accepts it as a parameter so the
// pure math stays independently testable.
export const NEARBY_SEARCH_RADIUS_NAUTICAL_MILES = 25;

export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export type BoundingBoxFailureReason =
  | "invalid_latitude"
  | "invalid_longitude"
  | "invalid_radius"
  | "unsupported_boundary_pole"
  | "unsupported_boundary_date_line";

// A discriminated result prevents an uncaught calculation exception or NaN
// from leaking into React state. Callers check `success` before reading
// `bounds` or mapping `reason` to a user-facing message.
export type CalculateBoundingBoxResult =
  | { success: true; bounds: BoundingBox }
  | { success: false; reason: BoundingBoxFailureReason };

// Convert a latitude, longitude, and radius in nautical miles into a
// rectangular bounding box. Returns a failure result when the inputs are
// non-finite or out of range, or when the resulting box reaches or crosses
// a pole or the international date line. The existing API contract requires
// west < east and cannot represent a wrapped longitude interval, so date-line
// cases are rejected outright rather than clamped to a world-spanning box.
export function calculateBoundingBox(
  latitude: number,
  longitude: number,
  radiusNauticalMiles: number,
): CalculateBoundingBoxResult {
  // Validate every input before computing so NaN or Infinity never reaches
  // the trigonometry below or React state above.
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { success: false, reason: "invalid_latitude" };
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { success: false, reason: "invalid_longitude" };
  }

  if (!Number.isFinite(radiusNauticalMiles) || radiusNauticalMiles <= 0) {
    return { success: false, reason: "invalid_radius" };
  }

  const latitudeDelta = radiusNauticalMiles / 60;

  const longitudeDelta =
    radiusNauticalMiles / (60 * Math.cos((latitude * Math.PI) / 180));

  // At a pole the cosine of latitude is zero and the longitude delta becomes
  // non-finite. The pole check below also catches near-pole cases, but this
  // guard ensures the delta is safe to use before subtracting it.
  if (!Number.isFinite(longitudeDelta)) {
    return { success: false, reason: "unsupported_boundary_pole" };
  }

  const south = latitude - latitudeDelta;
  const north = latitude + latitudeDelta;
  const west = longitude - longitudeDelta;
  const east = longitude + longitudeDelta;

  // Reject a box that reaches or crosses a pole. A box touching exactly 90
  // or -90 degrees is rejected because the longitude delta is undefined at
  // the pole and the API cannot represent a polar cap.
  if (south <= -90 || north >= 90) {
    return { success: false, reason: "unsupported_boundary_pole" };
  }

  // Reject a box that reaches or crosses the international date line.
  // Clamping west or east to ±180 would silently expand the box to cover
  // most of the globe, producing an unexpectedly expensive and misleading
  // query. The user can fall back to manual bounds in this case.
  if (west <= -180 || east >= 180) {
    return { success: false, reason: "unsupported_boundary_date_line" };
  }

  return {
    success: true,
    bounds: { west, south, east, north },
  };
}

// Format a coordinate to at most six decimal places for form inputs. Every
// populated coordinate field uses this single formatter so precision is
// consistent across all four bounding-box values.
export function formatCoordinate(value: number): string {
  return value.toFixed(6);
}
