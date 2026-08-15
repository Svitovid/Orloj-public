"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Astronomy = require("../astronomy-engine.min.js");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");

function rev(value) {
  return ((value % 360) + 360) % 360;
}

function houseOf(longitude, cusps) {
  const lon = rev(longitude);
  for (let house = 1; house <= 12; house += 1) {
    const start = cusps[house];
    const end = cusps[(house % 12) + 1];
    if (rev(lon - start) < rev(end - start)) return house;
  }
  return 12;
}

function geocentricEclipticLongitude(body, date) {
  return Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true)).elon;
}

test("Transity contain one personal-sky layer that explains sign, house and aspect", () => {
  const panelStart = index.indexOf('id="panel-transit"');
  const panelEnd = index.indexOf('id="panel-horizont"', panelStart);
  const panel = index.slice(panelStart, panelEnd);

  assert.ok(panelStart > 0 && panelEnd > panelStart);
  assert.match(panel, /id="personal-sky-now"/);
  assert.match(panel, /Právě k tobě/);
  assert.match(panel, /znamení říká <b>jak<\/b>/);
  assert.match(panel, /osobní dům říká <b>kde<\/b>/);
  assert.match(panel, /aspekt ukazuje <b>který nativní bod<\/b>/);
  assert.match(panel, /Geocentrickou ekliptikální polohu a směr pohybu počítá Astronomy Engine/);
});

test("all ten moving bodies receive their current sign, Placidus house and natal links", () => {
  const bodies = index.match(/var BODIES=\[([^;]+)\];/);
  assert.ok(bodies);
  assert.equal((bodies[1].match(/\{id:/g) || []).length, 10);

  assert.match(index, /function personalSkySnapshot\(now\)/);
  assert.match(index, /return BODIES\.map\(function\(m\)/);
  assert.match(index, /house=houseOf\(lon,N\.cusp\)/);
  assert.match(index, /sign=signOf\(lon\)/);
  assert.match(index, /lon=personalSkyLongitude\(m\.id,now\)/);
  assert.match(index, /retro:personalSkyRate\(m\.id,now\)<0/);
  assert.match(index, /A\.Ecliptic\(A\.GeoVector\(body,date,true\)\)\.elon/);
  assert.match(index, /aspectsNow\.filter\(function\(a\)\{return a\.t\.id===m\.id;/);
});

test("future sign and personal-house thresholds are calculated only for the opened planet", () => {
  assert.match(index, /selected\.nextSign=nextPersonalSignIngress\(selected\.meta\.id,from\)/);
  assert.match(index, /selected\.nextHouse=nextNatalHouseIngress\(selected\.meta\.id,from,P\.natal\.cusp,personalSkyProfileKey\(P\)\)/);
  assert.doesNotMatch(index, /BODIES\.map\(function\(m\)[^;]+nextNatalHouseIngress\(m\.id/s);
  assert.match(index, /for\(var i=0;i<34;i\+\+\)/);
  assert.match(index, /Další znamení/);
  assert.match(index, /Další osobní dům/);
});

test("the reference natal cusps put 2026-08-15 Venus in house 7 and Saturn in house 1", () => {
  // 27 Dec 1999, 10:27 CET, Zlín; Placidus cusps used by the public profile.
  const cusps = [
    null,
    328 + 22 / 60,
    23 + 54 / 60,
    55 + 3 / 60,
    76 + 3 / 60,
    94 + 26 / 60,
    115 + 10 / 60,
    148 + 22 / 60,
    203 + 54 / 60,
    235 + 3 / 60,
    256 + 3 / 60,
    274 + 26 / 60,
    295 + 10 / 60
  ];
  const moment = new Date("2026-08-15T12:00:00Z");
  const venus = geocentricEclipticLongitude("Venus", moment);
  const saturn = geocentricEclipticLongitude("Saturn", moment);

  assert.ok(venus > 188 && venus < 190, `unexpected Venus longitude ${venus}`);
  assert.ok(saturn > 14 && saturn < 15, `unexpected Saturn longitude ${saturn}`);
  assert.equal(houseOf(venus, cusps), 7);
  assert.equal(houseOf(saturn, cusps), 1);
});

test("the compact visual map covers all twelve personal houses", () => {
  assert.match(index, /function personalSkyHouseMap\(items,selected\)/);
  assert.match(index, /for\(var house=1;house<=12;house\+\+\)/);
  assert.match(index, /personal-sky-house-map/);
  assert.match(index, /personalSkyHouseMap\(items,selected\)\+'<div class="personal-sky-layout/);
});

test("personal reading keeps calculation, tradition and resonance visibly separate", () => {
  assert.match(index, /01 · Výpočet/);
  assert.match(index, /02 · Symbolická tradice/);
  assert.match(index, /03 · Osobní rezonance/);
  assert.match(index, /Aktuální vazby k nativu/);
  assert.match(index, /PERSONAL_SKY_HOUSE_QUESTION/);
  assert.match(index, /data-personal-sky-profile/);
  assert.doesNotMatch(index, /searchParams\.set\([^)]*(birth|profile|lat|lon|cusp|trSkyPlanet)/i);
});

test("all inline scripts remain syntactically valid", () => {
  const scripts = [...index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  let parsed = 0;
  scripts.forEach((match) => {
    if (!match[1].trim()) return;
    assert.doesNotThrow(() => new Function(match[1]));
    parsed += 1;
  });
  assert.ok(parsed >= 3);
});
