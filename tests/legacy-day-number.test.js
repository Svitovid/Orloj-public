"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Execute the actual in-page function without booting the DOM application.
const index = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const start = index.indexOf("  function dayNumber(");
const end = index.indexOf("\n  function kepler(", start);
assert.ok(start >= 0 && end > start, "legacy dayNumber source missing");
const dayNumber = vm.runInNewContext("(" + index.slice(start, end).trim() + ")", {}, {
  filename: "index.html#dayNumber"
});

// Frozen pre-fix expression, used only for compatibility within its valid range.
function previousDayNumber(date) {
  const Y = date.getUTCFullYear(), M = date.getUTCMonth() + 1, D = date.getUTCDate();
  const ut = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  return 367 * Y - Math.floor((7 * (Y + Math.floor((M + 9) / 12))) / 4)
    + Math.floor((275 * M) / 9) + D - 730530 + ut / 24;
}

function near(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`);
}

test("dayNumber preserves the orbital epoch and the downstream Julian-date offset", () => {
  assert.equal(dayNumber(new Date("1999-12-30T00:00:00Z")), -1);
  assert.equal(dayNumber(new Date("1999-12-31T00:00:00Z")), 0);
  assert.equal(dayNumber(new Date("2000-01-01T00:00:00Z")), 1);
  assert.equal(dayNumber(new Date("2000-01-01T12:00:00Z")), 1.5);
  assert.equal(dayNumber(new Date("2000-01-01T12:00:00Z")) + 2451543.5, 2451545);
});

test("Gregorian century and leap-day fixtures have exact elapsed UTC day counts", () => {
  // Fixed calendar fixtures, independently checked with Python datetime.date.
  // 1900, 2100 and 2200 are common years; 2000 is a leap year.
  const fixtures = [
    ["1899-12-31", -36524], ["1900-01-01", -36523],
    ["1900-02-28", -36465], ["1900-03-01", -36464],
    ["1900-12-31", -36159],
    ["2000-02-28", 59], ["2000-02-29", 60], ["2000-03-01", 61],
    ["2000-12-31", 366], ["2001-01-01", 367],
    ["2024-02-28", 8825], ["2024-02-29", 8826], ["2024-03-01", 8827],
    ["2026-11-25", 9826],
    ["2099-12-31", 36525], ["2100-01-01", 36526],
    ["2100-02-28", 36584], ["2100-03-01", 36585],
    ["2100-12-31", 36890], ["2101-01-01", 36891],
    ["2199-12-31", 73049], ["2200-01-01", 73050],
    ["2200-02-28", 73108], ["2200-03-01", 73109],
    ["2200-12-31", 73414], ["2201-01-01", 73415]
  ];
  for (const [date, expected] of fixtures) {
    assert.equal(dayNumber(new Date(date + "T00:00:00Z")), expected, date);
  }
});

test("modern whole-second results agree with the previous function", () => {
  for (const date of ["1900-03-01", "1970-01-01", "1999-12-31", "2000-01-01",
    "2000-02-28", "2000-02-29", "2000-03-01", "2024-02-29", "2026-11-25",
    "2099-12-31", "2100-01-01", "2100-02-28"]) {
    for (const time of ["00:00:00", "06:17:43", "23:59:59"]) {
      const instant = new Date(date + "T" + time + "Z");
      near(dayNumber(instant), previousDayNumber(instant), 1e-10, instant.toISOString());
    }
  }
});

test("the known century defects no longer shift the orbital clock", () => {
  for (const [date, expected, previousError] of [
    ["1900-01-01", -36523, -1],
    ["2100-03-01", 36585, 1],
    ["2200-03-01", 73109, 2]
  ]) {
    const instant = new Date(date + "T00:00:00Z");
    assert.equal(previousDayNumber(instant), expected + previousError, date + " old defect");
    assert.equal(dayNumber(instant), expected, date + " corrected");
  }
});

test("fractional UTC days retain milliseconds on both sides of the epoch", () => {
  for (const [instant, wholeDays, elapsedMilliseconds] of [
    ["1999-12-30T23:59:59.999Z", 0, -1],
    ["1999-12-31T00:00:00.001Z", 0, 1],
    ["2000-02-29T12:34:56.789Z", 60, 45296789],
    ["2026-11-25T23:59:59.999Z", 9826, 86399999],
    ["2200-03-01T00:00:00.001Z", 73109, 1]
  ]) {
    near((dayNumber(new Date(instant)) - wholeDays) * 86400000,
      elapsedMilliseconds, 0.005, instant);
  }
});

test("midnight stays continuous at leap days and non-leap century boundaries", () => {
  for (const [before, after] of [
    ["1900-02-28", "1900-03-01"],
    ["2000-02-28", "2000-02-29"],
    ["2000-02-29", "2000-03-01"],
    ["2100-02-28", "2100-03-01"],
    ["2200-02-28", "2200-03-01"]
  ]) {
    const midnight = dayNumber(new Date(after + "T00:00:00.000Z"));
    assert.equal(midnight - dayNumber(new Date(before + "T00:00:00Z")), 1, after);
    near((midnight - dayNumber(new Date(before + "T23:59:59.999Z"))) * 86400000,
      1, 0.005, after + " midnight millisecond");
  }
});

test("offsets and DST civil-clock jumps preserve the same elapsed UTC time", () => {
  for (const instant of ["2026-11-25T12:00:00Z", "2026-11-25T13:00:00+01:00",
    "2026-11-25T04:00:00-08:00", "2026-11-26T01:45:00+13:45"]) {
    assert.equal(dayNumber(new Date(instant)), 9826.5, instant);
  }
  for (const [before, after] of [
    ["2026-03-29T01:30:00+01:00", "2026-03-29T03:30:00+02:00"],
    ["2026-10-25T02:30:00+02:00", "2026-10-25T02:30:00+01:00"]
  ]) {
    near((dayNumber(new Date(after)) - dayNumber(new Date(before))) * 24,
      1, 1e-9, before + " → " + after);
  }
});

test("invalid Dates remain invalid rather than producing a plausible day number", () => {
  assert.ok(Number.isNaN(dayNumber(new Date(NaN))));
});
