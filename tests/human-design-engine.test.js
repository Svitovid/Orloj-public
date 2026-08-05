"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const HD = require("../human-design.js");

function activation(gate, line) {
  return { gate, line: line || 1, nearBoundary: false };
}

function chartSide(assignments) {
  const fallback = [58, 52, 13, 33, 19, 49, 2, 14, 9];
  const side = {};
  HD.PLANET_ORDER.forEach((planet, index) => {
    const value = assignments[planet];
    side[planet] = value || activation(fallback[index % fallback.length], 1);
  });
  return side;
}

test("Rave Mandala starts Gate 25 at 358.25 degrees", () => {
  const start = HD.gateAt(358.25);
  assert.equal(start.gate, 25);
  assert.equal(start.line, 1);
  assert.equal(start.withinGate, 0);
  assert.equal(start.gateBoundary, 0);
  assert.equal(start.lineBoundary, 0);
  assert.deepEqual(start.boundaryAlternative, { gate:36, line:6 });
  assert.equal(HD.gateAt(302).gate, 41);
  assert.equal(HD.gateAt(302).line, 1);
  const allGates = new Set();
  for (let index = 0; index < 64; index++) {
    allGates.add(HD.gateAt(358.25 + index * HD.constants.gateSize + 0.1).gate);
  }
  assert.equal(allGates.size, 64);
});

test("line-boundary activations expose the adjacent result", () => {
  const moon = HD.gateAt(157.621854);
  assert.equal(moon.gate, 40);
  assert.equal(moon.line, 2);
  assert.deepEqual(moon.boundaryAlternative, { gate:40, line:3 });
});

test("every personality Sun gate has a named incarnation cross", () => {
  Object.keys(HD.GATES).map(Number).forEach((gate) => {
    const chart = HD.derive(
      chartSide({ sun: activation(gate, 2), earth: activation(52, 2) }),
      chartSide({ sun: activation(18, 4), earth: activation(17, 4) })
    );
    assert.notEqual(chart.cross.name, "Unknown", `missing cross for Gate ${gate}`);
  });
});

test("known structural gate set derives the stable 2/4 emotional MG core", () => {
  const personality = chartSide({
    sun: activation(58, 2),
    earth: activation(52, 2)
  });
  const design = chartSide({
    sun: activation(18, 4),
    earth: activation(17, 4)
  });
  const chart = HD.derive(personality, design);

  assert.equal(chart.typeKey, "manifestingGenerator");
  assert.equal(chart.authorityKey, "emotional");
  assert.equal(chart.profile.key, "2/4");
  assert.equal(chart.definition.key, "single");
  assert.equal(chart.cross.displayName, "Služby");
  assert.deepEqual(chart.cross.gates, [58, 52, 18, 17]);
  assert.deepEqual(
    chart.channels.map((channel) => channel.key).sort(),
    ["13-33", "18-58", "19-49", "2-14", "9-52"]
  );
  assert.deepEqual(
    chart.definedCenters.slice().sort(),
    ["g", "root", "sacral", "solar", "spleen", "throat"]
  );
});

test("design moment is solved at 88 degrees of solar arc", () => {
  const day = 86400000;
  const tropicalYear = 365.2422 * day;
  const birthMs = Date.UTC(2000, 0, 1, 12, 0, 0);
  const longitude = (planet, date) => {
    const sun = ((date.getTime() / tropicalYear) * 360 % 360 + 360) % 360;
    const offsets = { moon: 20, mercury: 40, venus: 80, mars: 120, jupiter: 160, saturn: 200, uranus: 240, neptune: 280, pluto: 320 };
    return sun + (offsets[planet] || 0);
  };
  const chart = HD.calculate({
    birthMs,
    longitude,
    nodeLongitude: () => 125
  });
  const personalitySun = longitude("sun", new Date(chart.birthAt));
  const designSun = longitude("sun", new Date(chart.designAt));
  const arc = ((personalitySun - designSun) % 360 + 360) % 360;

  assert.ok(Math.abs(arc - 88) < 0.00001, `solar arc was ${arc}`);
  assert.ok(chart.designAt < chart.birthAt - 80 * day);
  assert.ok(chart.designAt > chart.birthAt - 100 * day);
});

test("bodygraph exposes all nine centers and all thirty-six channels", () => {
  const chart = HD.derive(
    chartSide({ sun: activation(58, 2), earth: activation(52, 2) }),
    chartSide({ sun: activation(18, 4), earth: activation(17, 4) })
  );
  const svg = HD.renderBodygraph(chart);

  assert.equal((svg.match(/data-hd-center=/g) || []).length, 9);
  assert.equal((svg.match(/class="hd-channel /g) || []).length, 36);
  assert.match(svg, /hd-channel-segment design/);
  assert.match(svg, /hd-channel-segment both/);
  assert.match(svg, /role="group" aria-labelledby="hd-svg-title hd-svg-desc"/);
  assert.match(svg, /aria-label="Hrdlo: definované"/);

  const personalityOnly = chartSide({});
  const designOnly = chartSide({});
  HD.PLANET_ORDER.forEach((planet) => {
    personalityOnly[planet] = activation(1, 1);
    designOnly[planet] = activation(8, 1);
  });
  const layeredSvg = HD.renderBodygraph(HD.derive(personalityOnly, designOnly));
  assert.match(layeredSvg, /hd-channel-segment personality/);
  assert.match(layeredSvg, /hd-channel-segment design/);
});
