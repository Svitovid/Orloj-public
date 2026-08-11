"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Maya = require("../maya-calendar.js");

test("GMT 584283 maps the epoch to 4 Ajaw 8 Kumk'u", () => {
  const epoch = Maya.calculate("-3113-08-11");
  assert.equal(epoch.jdn, 584283);
  assert.equal(epoch.dayCount, 0);
  assert.equal(epoch.longCount.text, "13.0.0.0.0");
  assert.equal(epoch.tzolkin.number, 4);
  assert.equal(epoch.tzolkin.sign.name, "Ajaw");
  assert.equal(epoch.haab.text, "8 Kumk’u");
});

test("the 2012 threshold completes thirteen baktuns without stopping the count", () => {
  const before = Maya.calculate("2012-12-20");
  const threshold = Maya.calculate("2012-12-21");
  const after = Maya.calculate("2012-12-22");
  assert.equal(before.longCount.text, "12.19.19.17.19");
  assert.equal(before.tzolkin.text, "3 Kawak");
  assert.equal(before.haab.text, "2 K’ank’in");
  assert.equal(threshold.dayCount, 1872000);
  assert.equal(threshold.longCount.text, "13.0.0.0.0");
  assert.equal(threshold.tzolkin.text, "4 Ajaw");
  assert.equal(threshold.haab.text, "3 K’ank’in");
  assert.equal(after.longCount.text, "13.0.0.0.1");
});

test("project reference dates match the documented Maya readings", () => {
  const birth = Maya.calculate("1999-12-27");
  const releaseDay = Maya.calculate("2026-08-11");
  assert.equal(birth.longCount.text, "12.19.6.14.17");
  assert.equal(birth.tzolkin.text, "6 Kab’an");
  assert.equal(birth.tzolkin.sign.kiche, "No’j");
  assert.equal(birth.haab.text, "5 K’ank’in");
  assert.equal(releaseDay.longCount.text, "13.0.13.15.1");
  assert.equal(releaseDay.tzolkin.text, "6 Imix’");
  assert.equal(releaseDay.tzolkin.sign.kiche, "Imox");
  assert.equal(releaseDay.haab.text, "14 Yaxk’in");
});

test("Tzolk'in, Haab and Calendar Round repeat at their exact lengths", () => {
  const start = Maya.calculate("2026-08-11");
  const tzolkin = Maya.calculate(Maya.shiftDate(start.gregorian, Maya.TZOLKIN_LENGTH));
  const haab = Maya.calculate(Maya.shiftDate(start.gregorian, Maya.HAAB_LENGTH));
  const round = Maya.calculate(Maya.shiftDate(start.gregorian, Maya.CALENDAR_ROUND));
  assert.equal(tzolkin.tzolkin.text, start.tzolkin.text);
  assert.notEqual(tzolkin.haab.text, start.haab.text);
  assert.equal(haab.haab.text, start.haab.text);
  assert.notEqual(haab.tzolkin.text, start.tzolkin.text);
  assert.equal(round.calendarRound.text, start.calendarRound.text);
  assert.equal(round.calendarRound.position, start.calendarRound.position);
});

test("proleptic Gregorian conversion round-trips leap days and BCE dates", () => {
  [
    { year: -3113, month: 8, day: 11 },
    { year: 1, month: 1, day: 1 },
    { year: 1600, month: 2, day: 29 },
    { year: 1900, month: 3, day: 1 },
    { year: 2000, month: 2, day: 29 },
    { year: 2026, month: 8, day: 11 }
  ].forEach((date) => {
    assert.deepEqual(Maya.jdnToGregorian(Maya.gregorianToJdn(date.year, date.month, date.day)), date);
  });
  assert.equal(Maya.parseDateKey("1900-02-29"), null);
  assert.deepEqual(Maya.parseDateKey("2000-02-29"), { year: 2000, month: 2, day: 29 });
});

test("bar-and-dot numerals retain base-five structure", () => {
  assert.deepEqual(Maya.numeralParts(0), { value: 0, zero: true, bars: 0, dots: 0 });
  assert.deepEqual(Maya.numeralParts(13), { value: 13, zero: false, bars: 2, dots: 3 });
  assert.deepEqual(Maya.numeralParts(19), { value: 19, zero: false, bars: 3, dots: 4 });
  assert.throws(() => Maya.numeralParts(20), /0–19/);
});
