"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Astronomy = require("../astronomy-engine.min.js");
const Day = require("../day-profile.js");

const profile = {
  name: "Vladimír",
  date: "1999-12-27",
  time: "10:27",
  lat: 49.038,
  lon: 17.644,
  timezone: "Europe/Prague"
};

test("date keys are strict and move safely across month boundaries", () => {
  assert.deepEqual(Day.parseDateKey("2026-08-09"), {year:2026, month:8, day:9, key:"2026-08-09"});
  assert.equal(Day.parseDateKey("2026-02-30"), null);
  assert.equal(Day.shiftDateKey("2026-08-01", -1), "2026-07-31");
  assert.equal(Day.shiftDateKey("2026-12-31", 1), "2027-01-01");
});

test("civil day bounds respect Prague daylight-saving transitions", () => {
  assert.equal(Day.dayBounds("2026-03-29", "Europe/Prague").hours, 23);
  assert.equal(Day.dayBounds("2026-10-25", "Europe/Prague").hours, 25);
  assert.equal(Day.dayBounds("2026-08-09", "Europe/Prague").hours, 24);
});

test("August 8 noon snapshot keeps the tropical Sun in Leo", () => {
  const moment = new Date(Day.zonedLocalToUtc("2026-08-08", "12:00", "Europe/Prague"));
  const snapshot = Day.snapshot(Astronomy, moment);
  assert.equal(snapshot.length, 10);
  assert.equal(snapshot[0].sign.name, "Lev");
  assert.ok(snapshot[0].sign.degree > 15 && snapshot[0].sign.degree < 17);
  assert.equal(snapshot[1].sign.name, "Blíženci");
  snapshot.forEach((point) => assert.ok(point.lon >= 0 && point.lon < 360));
});

test("daily event stream recognizes both August 2026 eclipses", () => {
  const solar = Day.dailyEvents(Astronomy, "2026-08-12", "Europe/Prague");
  const solarEclipse = solar.events.find((event) => event.kind === "eclipse" && event.eclipseType === "solar");
  assert.ok(solarEclipse);
  assert.equal(solarEclipse.classification, "total");
  assert.equal(new Date(solarEclipse.at).toISOString(), "2026-08-12T17:45:46.794Z");
  assert.ok(solar.events.some((event) => event.kind === "phase" && event.phaseAngle === 0));

  const lunar = Day.dailyEvents(Astronomy, "2026-08-28", "Europe/Prague");
  const lunarEclipse = lunar.events.find((event) => event.kind === "eclipse" && event.eclipseType === "lunar");
  assert.ok(lunarEclipse);
  assert.equal(lunarEclipse.classification, "partial");
  assert.ok(lunar.events.some((event) => event.kind === "phase" && event.phaseAngle === 180));
});

test("exact aspect events stay inside the selected civil day", () => {
  const bounds = Day.dayBounds("2026-08-12", "Europe/Prague");
  const events = Day.exactAspectEvents(Astronomy, bounds);
  assert.ok(events.some((event) => event.a === "sun" && event.b === "moon" && event.aspect.angle === 0));
  events.forEach((event) => {
    assert.ok(event.at >= bounds.start && event.at < bounds.end);
    assert.ok(Math.abs(Day.angularSeparation(
      Day.longitudeById(Astronomy, event.a, new Date(event.at)),
      Day.longitudeById(Astronomy, event.b, new Date(event.at))
    ) - event.aspect.angle) < 0.02);
  });
});

test("numerology preserves compound values and master numbers", () => {
  const numbers = Day.numerology("2026-08-09", profile);
  assert.equal(numbers.universal.label, "27/9");
  assert.equal(numbers.personal.year, 3);
  assert.equal(numbers.personal.month, 11);
  assert.equal(numbers.personal.label, "20/2");
  assert.equal(Day.reduceMaster(22), 22);
  assert.equal(Day.numberLabel(11), "11/2");
});

test("calendar layer keeps Gregorian, Ethiopic, Julian order and dates", () => {
  const calendars = Day.calendars("2026-08-09");
  assert.equal(calendars.gregorian.numeric, "9 / 8 / 2026");
  assert.deepEqual(Day.julianDate("2026-08-09"), {day:27, month:7, year:2026});
  assert.match(calendars.ethiopic.long, /2018|dostupný/);
});

test("personal resonance uses local birth data without placing it in the URL", () => {
  const moment = new Date(Day.zonedLocalToUtc("2026-08-08", "12:00", "Europe/Prague"));
  const result = Day.personalResonance(Astronomy, moment, profile);
  assert.equal(result.profile.name, "Vladimír");
  assert.ok(result.natal.axis.asc > 327 && result.natal.axis.asc < 330);
  assert.ok(result.hits.length > 0);
  result.hits.forEach((hit) => assert.ok(hit.orb >= 0));
});
