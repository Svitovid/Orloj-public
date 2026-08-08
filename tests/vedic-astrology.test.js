"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Astronomy = require("../astronomy-engine.min.js");
const Vedic = require("../vedic-astrology.js");

const postDate = new Date("2026-08-08T10:00:00Z");

test("Lahiri ayanamsha stays in the expected 2026 range", () => {
  const ayanamsha = Vedic.ayanamshaLahiri(postDate);
  assert.ok(ayanamsha > 24.20 && ayanamsha < 24.25, ayanamsha);
});

test("27 nakshatras and 108 padas cover the whole zodiac without gaps", () => {
  const nakshatras = new Set();
  const padas = new Set();
  for (let index = 0; index < 108; index += 1) {
    const point = Vedic.nakshatraAt(index * (360 / 108) + 1e-7);
    nakshatras.add(point.index);
    padas.add(`${point.index}-${point.pada}`);
  }
  assert.equal(nakshatras.size, 27);
  assert.equal(padas.size, 108);
  assert.equal(Vedic.nakshatraAt(0).cz, "Ašviní");
  assert.equal(Vedic.nakshatraAt(359.999).cz, "Révatí");
});

test("August 8 post resolves tropical Leo against sidereal Cancer", () => {
  const result = Vedic.postAudit(Astronomy);
  assert.equal(Vedic.rashiAt(result.sun.tropical).cz, "Lev");
  assert.equal(result.sun.rashi.cz, "Rak");
  assert.equal(result.sun.nakshatra.cz, "Ášléšá");
  assert.equal(result.sun.nakshatra.pada, 2);
  assert.equal(result.ketu.nakshatra.cz, "Maghá");
  assert.equal(result.ketu.nakshatra.pada, 2);
});

test("Simha Sankranti falls near 04:19 CEST on August 17", () => {
  const ingress = Vedic.postAudit(Astronomy).ingress.at;
  assert.equal(ingress.toISOString().slice(0, 10), "2026-08-17");
  assert.ok(ingress.getUTCHours() === 2);
  assert.ok(ingress.getUTCMinutes() >= 10 && ingress.getUTCMinutes() <= 30);
});

test("mean and true node modes keep Rahu and Ketu opposite", () => {
  ["mean", "true"].forEach((mode) => {
    const snapshot = Vedic.calculate(Astronomy, postDate, mode);
    const rahu = Vedic.point(snapshot, "rahu");
    const ketu = Vedic.point(snapshot, "ketu");
    assert.ok(Math.abs(Vedic.rev(ketu.sidereal - rahu.sidereal) - 180) < 1e-8);
  });
});

test("panchanga exposes all five limbs", () => {
  const panchanga = Vedic.calculate(Astronomy, postDate, "mean").panchanga;
  assert.deepEqual(Object.keys(panchanga), ["vara", "tithi", "nakshatra", "yoga", "karana"]);
  Object.values(panchanga).forEach((limb) => {
    assert.ok(limb.name);
    assert.ok(limb.detail);
  });
});

test("personal reference profile reproduces Aquarius lagna and Purva Phalguni Moon", () => {
  const profile = {name:"Vladimír",date:"1999-12-27",time:"10:27",lat:49.038,lon:17.644,timezone:"Europe/Prague"};
  const chart = Vedic.personalChart(Astronomy, profile, "mean");
  assert.equal(chart.ascendant.rashi.cz, "Vodnář");
  assert.ok(chart.ascendant.rashi.degree > 4 && chart.ascendant.rashi.degree < 6);
  assert.equal(Vedic.point(chart, "moon").nakshatra.cz, "Púrva Phalguní");
  chart.points.forEach((planet) => assert.ok(planet.house >= 1 && planet.house <= 12));
});

test("Vimshottari periods total 120 years per full cycle", () => {
  const periods = Vedic.vimshottari(134.688190276, Date.UTC(1999, 11, 27, 9, 27));
  assert.equal(periods.slice(0, 9).reduce((sum, period) => sum + period.years, 0), 120);
  assert.deepEqual(periods.slice(0, 9).map((period) => period.lord), ["Venuše", "Slunce", "Měsíc", "Mars", "Ráhu", "Jupiter", "Saturn", "Merkur", "Ketu"]);
});

test("reference profile is in Moon mahadasha during August 2026", () => {
  const profile = {name:"Vladimír",date:"1999-12-27",time:"10:27",lat:49.038,lon:17.644,timezone:"Europe/Prague"};
  const chart = Vedic.personalChart(Astronomy, profile, "mean");
  const periods = Vedic.vimshottari(Vedic.point(chart, "moon").sidereal, chart.utc);
  const at = Date.parse("2026-08-08T12:00:00Z");
  const active = periods.find((period) => at >= period.from && at < period.to);
  assert.equal(active.lord, "Měsíc");
});

