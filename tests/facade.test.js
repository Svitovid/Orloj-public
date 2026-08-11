"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Day = require("../day-profile.js");
const Facade = require("../orloj-facade.js");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "orloj-facade.css"), "utf8");
const script = fs.readFileSync(path.join(root, "orloj-facade.js"), "utf8");

test("facade is a single public master image without personal profile controls", () => {
  assert.match(html, /id="celestial-dial"/);
  assert.match(html, /id="facade-calendar-grid"/);
  assert.match(html, /class="now-axis"/);
  assert.match(html, /Symbolické automaty dne/);
  assert.doesNotMatch(html, /Moje mapa|datum narození|osobní profil|synastr|Human Design|tarot|džjótiš/i);
  assert.doesNotMatch(html + script, /localStorage|orloj-public-profile|birth/i);
});

test("facade loads Astronomy Engine and the shared public day engine before its renderer", () => {
  const astronomy = html.indexOf("astronomy-engine.min.js");
  const day = html.indexOf("day-profile.js");
  const facade = html.indexOf("orloj-facade.js");
  assert.ok(astronomy > 0 && day > astronomy && facade > day);
  assert.match(html, /public-v11-11-master-facade/);
});

test("facade keeps all four requested architectural strata", () => {
  assert.match(html, /automata-crown/);
  assert.match(html, /celestial-stage/);
  assert.match(html, /now-axis/);
  assert.match(html, /calendar-stone/);
  assert.match(css, /grid-template-columns:\s*repeat\(7/);
});

test("August 11 2026 approximate true node remains on the Aquarius-Leo axis", () => {
  const longitude = Facade.trueMoonNodeLongitude(new Date("2026-08-11T12:00:00Z"));
  const north = Day.signAt(longitude);
  const south = Day.signAt(Facade.rev(longitude + 180));
  assert.equal(north.name, "Vodnář");
  assert.equal(south.name, "Lev");
});

test("collision layout changes radial lanes without changing longitude", () => {
  const points = [
    {id: "a", lon: 100},
    {id: "b", lon: 101},
    {id: "c", lon: 102},
    {id: "d", lon: 103}
  ];
  const positions = Facade.layoutPoints(points);
  assert.deepEqual(new Set(Object.values(positions).map((position) => position.radius)).size, 4);
  points.forEach((point) => {
    const position = positions[point.id];
    const angle = Facade.rev(Math.atan2(position.y - 400, position.x - 400) * 180 / Math.PI + 90);
    assert.ok(Math.abs(angle - point.lon) < 1e-9);
  });
});

test("Gregorian month navigation preserves the day when possible and clamps month ends", () => {
  assert.equal(Facade.dateKeyForMonthShift(Day, "2026-01-31", 1), "2026-02-28");
  assert.equal(Facade.dateKeyForMonthShift(Day, "2028-01-31", 1), "2028-02-29");
  assert.equal(Facade.dateKeyForMonthShift(Day, "2026-03-30", -1), "2026-02-28");
});

test("calendar lunar marks stay restricted to narrow new and full moon windows", () => {
  assert.equal(Facade.phaseMark({angle: 2}), "nov");
  assert.equal(Facade.phaseMark({angle: 178}), "úplněk");
  assert.equal(Facade.phaseMark({angle: 90}), "");
});

test("facade names the approach to new moon as a waning crescent, not an exact new moon", () => {
  assert.equal(Facade.facadePhaseName({angle: 348}), "Couvající srpek");
  assert.equal(Facade.facadePhaseName({angle: 359}), "Nov");
  assert.equal(Facade.facadePhaseName({angle: 181}), "Úplněk");
});
