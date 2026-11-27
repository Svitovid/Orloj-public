"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const A = require(process.env.ORLOJ_TEST_ASTRONOMY || "../astronomy-engine.min.js");
const Data = require("../observatory-data.js");
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = a => Math.hypot(...a);
const separation = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * 180 / Math.PI;
const near = (actual, expected, tolerance, label) => assert.ok(Math.abs(actual - expected) <= tolerance,
  `${label}: ${actual}, expected ${expected} ± ${tolerance}`);

test("body directions are normalized and Earth axes remain orthonormal and right-handed", () => {
  for (const date of ["1900-03-01T00:00:00Z", "2000-02-29T12:00:00Z", "2026-11-27T12:00:00Z", "2100-03-01T00:00:00Z"]) {
    const data = Data.compute(A, date);
    for (const vector of [data.sun.vector, data.moon.vector, ...Object.values(data.earth.basis)]) {
      assert.ok(vector.every(Number.isFinite));
      near(length(vector), 1, 1e-12, `unit vector at ${date}`);
    }
    const { x, y, z } = data.earth.basis;
    near(dot(x, y), 0, 1e-12, "equator perpendicular to pole");
    near(dot(x, z), 0, 1e-12, "x perpendicular to z");
    near(dot(y, z), 0, 1e-12, "y perpendicular to z");
    near(dot(cross(x, y), z), 1, 1e-12, "basis determinant");
    assert.ok(data.moon.distanceKm > 330000 && data.moon.distanceKm < 440000);
    assert.ok(data.sun.distanceAU > 0.97 && data.sun.distanceAU < 1.03);
  }
});

// Independent published references, rounded to a minute, U.S. Naval Observatory:
// https://aa.usno.navy.mil/calculated/seasons?year=2026&tz=0&dst=false
const SEASON_FIXTURES = [
  { at: "2026-03-20T14:46:00Z", latitude: 0 },
  { at: "2026-06-21T08:24:00Z", latitude: 23.44 },
  { at: "2026-09-23T00:05:00Z", latitude: 0 },
  { at: "2026-12-21T20:50:00Z", latitude: -23.44 }
];

test("equinox and solstice directions illuminate the correct hemisphere", () => {
  for (const reference of SEASON_FIXTURES) {
    const data = Data.compute(A, reference.at);
    const subsolarLatitude = Math.asin(dot(data.sun.vector, data.earth.basis.y)) * 180 / Math.PI;
    near(subsolarLatitude, reference.latitude, 0.02, reference.at);
  }
});

test("season searches agree with USNO's independent times within two minutes", () => {
  const found = Data.seasons(A, 2026);
  assert.equal(found.length, 4);
  found.forEach((season, index) => near(season.at, Date.parse(SEASON_FIXTURES[index].at), 120000, season.name));
});

// Independent USNO phase references, Universal Time, not snapshots from the engine:
// https://aa.usno.navy.mil/calculated/moon/phases?date=2026-11-01&format=p&nump=8
const PHASE_FIXTURES = [
  { angle: 0, at: "2026-11-09T07:02:00Z" },
  { angle: 90, at: "2026-11-17T11:48:00Z" },
  { angle: 180, at: "2026-11-24T14:53:00Z" },
  { angle: 270, at: "2026-12-01T06:08:00Z" }
];

test("the four future principal phases agree with USNO and are chronologically ordered", () => {
  const phases = Data.nextPhases(A, "2026-11-02T00:00:00Z");
  assert.equal(phases.length, 4);
  phases.forEach((phase, index) => {
    assert.equal(phase.angle, PHASE_FIXTURES[index].angle);
    near(phase.at, Date.parse(PHASE_FIXTURES[index].at), 120000, phase.name);
    if (index) assert.ok(phase.at > phases[index - 1].at);
  });
});

test("phase directions and illumination agree at new moon, quarters and full moon", () => {
  for (const reference of PHASE_FIXTURES) {
    const data = Data.compute(A, reference.at);
    const alignment = dot(data.sun.vector, data.moon.vector);
    if (reference.angle === 0) {
      assert.ok(alignment > 0.99);
      assert.ok(data.moon.illumination < 0.005);
    } else if (reference.angle === 180) {
      assert.ok(alignment < -0.99);
      assert.ok(data.moon.illumination > 0.995);
    } else {
      assert.ok(Math.abs(alignment) < 0.01);
      near(data.moon.illumination, 0.5, 0.005, "quarter illumination");
    }
    assert.ok(data.moon.phaseAngle >= 0 && data.moon.phaseAngle < 360);
  }
});

test("Gregorian century boundaries advance by one real day without an ephemeris jump", () => {
  for (const [before, after] of [
    ["1900-02-28T12:00:00Z", "1900-03-01T12:00:00Z"],
    ["2000-02-28T12:00:00Z", "2000-02-29T12:00:00Z"],
    ["2100-02-28T12:00:00Z", "2100-03-01T12:00:00Z"]
  ]) {
    const a = Data.compute(A, before), b = Data.compute(A, after);
    assert.equal(b.timestamp - a.timestamp, 86400000);
    const sunMotion = separation(a.sun.vector, b.sun.vector);
    const moonMotion = separation(a.moon.vector, b.moon.vector);
    assert.ok(sunMotion > 0.95 && sunMotion < 1.05, `solar continuity ${before}: ${sunMotion}`);
    assert.ok(moonMotion > 10 && moonMotion < 16, `lunar continuity ${before}: ${moonMotion}`);
  }
});

test("sampled lunar trajectory preserves actual inclination and changing distance", () => {
  const date = new Date("2026-11-27T12:00:00Z"), data = Data.compute(A, date);
  const orbit = Data.lunarOrbit(A, date, 120);
  assert.equal(orbit.length, 120);
  orbit[0].forEach((coordinate, index) => near(coordinate, data.moon.vector[index], 1e-10, "orbit origin"));
  assert.ok(orbit.every(point => point.length === 3 && point.every(Number.isFinite)));
  const radii = orbit.map(length);
  assert.ok(Math.max(...radii) - Math.min(...radii) > 0.05, "real orbit has changing distance");
  assert.ok(orbit.some(point => point[1] > 0.04));
  assert.ok(orbit.some(point => point[1] < -0.04));
});

test("Greenwich follows solar noon and rotates toward the night in six hours", () => {
  const noon = Data.compute(A, "2026-03-20T12:00:00Z");
  const evening = Data.compute(A, "2026-03-20T18:00:00Z");
  assert.ok(dot(noon.sun.vector, noon.earth.basis.x) > 0.99);
  assert.ok(Math.abs(dot(evening.sun.vector, evening.earth.basis.x)) < 0.04);
  // At 18 UTC the Greenwich meridian has rotated east of the subsolar meridian.
  assert.ok(dot(evening.sun.vector, evening.earth.basis.z) > 0.99);
});

test("invalid dates, unsupported years, and missing ephemerides fail explicitly", () => {
  for (const bad of [null, {}, NaN, new Date(NaN), "2026-02-30", "2100-02-29", "2026-01-01T24:01:00Z", "2026-01-01T12:00", "1899-12-31", "2101-01-01"]) {
    assert.throws(() => Data.compute(A, bad), RangeError);
  }
  assert.doesNotThrow(() => Data.compute(A, "1900-01-01T00:00:00Z"));
  assert.doesNotThrow(() => Data.compute(A, "2100-12-31T23:59:59.999Z"));
  assert.throws(() => Data.compute(null, "2026-11-27"), /Astronomy Engine/);
  assert.throws(() => Data.seasons(A, 2101), RangeError);
  assert.throws(() => Data.lunarOrbit(A, "2026-11-27", 0), RangeError);
  assert.deepEqual(Data.nextPhases(A, "2100-12-31T23:59:59.999Z"), []);
});
