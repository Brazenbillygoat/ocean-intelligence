import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateBoundingBox,
  formatCoordinate,
  NEARBY_SEARCH_RADIUS_NAUTICAL_MILES,
} from "../src/utils/geographicBounds.js";

describe("calculateBoundingBox equator and mid-latitude math", () => {
  it("calculates the 25 nautical mile box at the equator within rounding tolerance", () => {
    const result = calculateBoundingBox(0, 0, NEARBY_SEARCH_RADIUS_NAUTICAL_MILES);

    assert.equal(result.success, true);
    if (!result.success) return;

    const { west, south, east, north } = result.bounds;

    assert.ok(Math.abs(west - -0.416667) < 1e-6);
    assert.ok(Math.abs(south - -0.416667) < 1e-6);
    assert.ok(Math.abs(east - 0.416667) < 1e-6);
    assert.ok(Math.abs(north - 0.416667) < 1e-6);
  });

  it("calculates the 25 nautical mile box at 42.36, -71.06 within rounding tolerance", () => {
    const result = calculateBoundingBox(42.36, -71.06, NEARBY_SEARCH_RADIUS_NAUTICAL_MILES);

    assert.equal(result.success, true);
    if (!result.success) return;

    const { west, south, east, north } = result.bounds;

    assert.ok(Math.abs(west - -71.623882) < 1e-6);
    assert.ok(Math.abs(south - 41.943333) < 1e-6);
    assert.ok(Math.abs(east - -70.496118) < 1e-6);
    assert.ok(Math.abs(north - 42.776667) < 1e-6);
  });
});

describe("calculateBoundingBox preserves box ordering on success", () => {
  it("returns west < east and south < north for a valid mid-latitude box", () => {
    const result = calculateBoundingBox(42.36, -71.06, 25);

    assert.equal(result.success, true);
    if (!result.success) return;

    const { west, south, east, north } = result.bounds;

    assert.ok(west < east);
    assert.ok(south < north);
  });
});

describe("calculateBoundingBox rejects invalid inputs", () => {
  it("rejects latitude above 90", () => {
    const result = calculateBoundingBox(90.1, 0, 25);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "invalid_latitude");
  });

  it("rejects latitude below -90", () => {
    const result = calculateBoundingBox(-90.1, 0, 25);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "invalid_latitude");
  });

  it("rejects NaN latitude", () => {
    const result = calculateBoundingBox(NaN, 0, 25);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "invalid_latitude");
  });

  it("rejects Infinity latitude", () => {
    const result = calculateBoundingBox(Infinity, 0, 25);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "invalid_latitude");
  });

  it("rejects longitude above 180", () => {
    const result = calculateBoundingBox(0, 180.1, 25);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "invalid_longitude");
  });

  it("rejects longitude below -180", () => {
    const result = calculateBoundingBox(0, -180.1, 25);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "invalid_longitude");
  });

  it("rejects NaN longitude", () => {
    const result = calculateBoundingBox(0, NaN, 25);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "invalid_longitude");
  });

  it("rejects Infinity longitude", () => {
    const result = calculateBoundingBox(0, Infinity, 25);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "invalid_longitude");
  });

  it("rejects zero radius", () => {
    const result = calculateBoundingBox(0, 0, 0);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "invalid_radius");
  });

  it("rejects negative radius", () => {
    const result = calculateBoundingBox(0, 0, -25);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "invalid_radius");
  });

  it("rejects NaN radius", () => {
    const result = calculateBoundingBox(0, 0, NaN);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "invalid_radius");
  });

  it("rejects Infinity radius", () => {
    const result = calculateBoundingBox(0, 0, Infinity);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "invalid_radius");
  });
});

describe("calculateBoundingBox rejects unsupported boundaries", () => {
  it("rejects a box that crosses the international date line going east", () => {
    const result = calculateBoundingBox(0, 179.9, 25);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "unsupported_boundary_date_line");
  });

  it("rejects a box that crosses the international date line going west", () => {
    const result = calculateBoundingBox(0, -179.9, 25);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "unsupported_boundary_date_line");
  });

  it("rejects a box that crosses the north pole", () => {
    const result = calculateBoundingBox(89.9, 0, 25);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "unsupported_boundary_pole");
  });

  it("rejects a box that crosses the south pole", () => {
    const result = calculateBoundingBox(-89.9, 0, 25);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "unsupported_boundary_pole");
  });

  it("rejects a location exactly at the north pole", () => {
    const result = calculateBoundingBox(90, 0, 25);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "unsupported_boundary_pole");
  });

  it("rejects a location exactly at the south pole", () => {
    const result = calculateBoundingBox(-90, 0, 25);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.reason, "unsupported_boundary_pole");
  });
});

describe("formatCoordinate", () => {
  it("formats to at most six decimal places", () => {
    assert.equal(formatCoordinate(0.416666666), "0.416667");
    assert.equal(formatCoordinate(-71.623881999), "-71.623882");
    assert.equal(formatCoordinate(42), "42.000000");
    assert.equal(formatCoordinate(-0), "0.000000");
  });
});
