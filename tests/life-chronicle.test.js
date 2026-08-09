"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Astronomy = require("../astronomy-engine.min.js");
const Life = require("../life-chronicle.js");

const profile = {
  name: "Vladimír",
  date: "1999-12-27",
  time: "10:27",
  lat: 49.038,
  lon: 17.644,
  timezone: "Europe/Prague"
};

test("2013 exposes both calendar and birthday personal-year conventions", () => {
  const calendar = Life.personalYearCalendar(profile.date, 2013);
  const segments = Life.personalYearSegments(profile.date, 2013);
  assert.equal(calendar.label, "18/9");
  assert.deepEqual(segments.map((segment) => [segment.start, segment.end, segment.number.label, segment.age]), [
    ["2013-01-01", "2013-12-27", "17/8", 13],
    ["2013-12-27", "2014-01-01", "18/9", 14]
  ]);
  assert.equal(Life.ageSpan(profile.date, 2013), "13 → 14 let");
});

test("master personal years stay unreduced", () => {
  assert.equal(Life.personalYearCalendar(profile.date, 2017).label, "22/4");
  assert.equal(Life.personalYearCalendar(profile.date, 2017).value, 22);
});

test("2013 Chinese year changes from Water Dragon to Water Snake on February 10", () => {
  const chinese = Life.chineseYearSpan(2013);
  assert.equal(chinese.boundary, "2013-02-10");
  assert.equal(chinese.before.label, "Jangová voda · Drak");
  assert.equal(chinese.after.label, "Jinová voda · Had");
  assert.equal(chinese.before.han, "壬辰");
  assert.equal(chinese.after.han, "癸巳");
});

test("year bounds include the real Prague daylight-saving duration", () => {
  const bounds = Life.yearBounds(2013, "Europe/Prague");
  assert.equal(bounds.dateKey, "2013-01-01");
  assert.equal(bounds.endKey, "2014-01-01");
  assert.equal(bounds.days, 365);
});

test("planet tracks cover only slow planets and preserve sign order", () => {
  const tracks = Life.planetTracks(Astronomy, 2013, "Europe/Prague");
  assert.deepEqual(tracks.map((track) => track.id), Life.SLOW_IDS);
  tracks.forEach((track) => {
    assert.ok(track.signs.length >= 1);
    track.signs.forEach((sign) => assert.ok(sign.index >= 0 && sign.index < 12));
  });
});

test("annual personal cycles group retrograde passes without mixing fast planets", () => {
  const cycles = Life.annualCycles(Astronomy, 2013, "Europe/Prague", profile);
  assert.ok(cycles.length > 0);
  cycles.forEach((cycle) => {
    assert.ok(Life.SLOW_IDS.includes(cycle.body));
    assert.ok(cycle.start < cycle.end);
  });
  assert.ok(cycles.some((cycle) => cycle.passes.length >= 1));
  assert.ok(cycles.some((cycle) => cycle.passes.length > 1));
});

test("year data keeps astronomy, tradition and personal cycles as separate fields", () => {
  const data = Life.yearData(Astronomy, 2013, "Europe/Prague", profile);
  assert.equal(data.year, 2013);
  assert.equal(data.focus, "2013-12-27");
  assert.equal(data.snapshot.length, 10);
  assert.equal(data.calendarYear.label, "18/9");
  assert.equal(data.chinese.boundary, "2013-02-10");
  assert.ok(data.cycles.length > 0);
  assert.ok(data.eclipses.length >= 4);
  const interpretation = Life.cycleInterpretation(data.cycles[0]);
  assert.match(interpretation.symbol, /Tradičně/);
  assert.match(interpretation.question, /\?/);
});
