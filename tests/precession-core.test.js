"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {create, julianEpoch} = require("../precession-core.js");
const data = require("../precession-data.js");
const model = create(data);

function near(actual, expected, tolerance, label) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected} ± ${tolerance}, received ${actual}`);
}
function vectorNear(actual, expected, tolerance, label) {
  assert.equal(actual.length, 3, label + " dimension");
  actual.forEach((v, i) => near(v, expected[i], tolerance, `${label}[${i}]`));
}
const dot = (a, b) => a.reduce((sum, v, i) => sum + v*b[i], 0);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const wrap = a => ((a % 360) + 360) % 360;

// Fixed direct ERFA 2.0.1.5 results, not outputs copied from the JS runtime or
// its table. All five dates are intentionally outside data.samples.
// q=erfa.ltp(year)[0], n=erfa.ltpequ(year), e=erfa.ltpecl(year),
// obl=degrees(acos(dot(n,e))). See scripts/precession/README.md.
const references = [
  {year:-4321.25,
    q:[0.049169300792473634,0.9105056304744968,0.41056287792957896],
    n:[-0.40575507209374106,-0.35740246961503747,0.8412052640011682],
    e:[0.0026511667945276467,-0.41117760159379174,0.911551398036449],
    obl:24.12134414819229},
  {year:0.5,
    q:[0.8845052036570389,0.4271637340262574,0.18756782516296622],
    n:[-0.18750433984004325,-0.0426505169202446,0.9813373813055251],
    e:[-0.00002345445883978346,-0.4020078001168716,0.9156362422354642],
    obl:23.694908173258828},
  {year:2026.8980150581794,
    q:[0.9999784950544173,-0.006014944493746371,-0.002613402272887055],
    n:[0.002613402071498741,-0.000007893300037568714,0.9999965850278232],
    e:[0.000005543865603345773,-0.3977209780328151,0.9175064161093842],
    obl:23.435779948056368},
  {year:3210.5,
    q:[0.956538043047281,-0.26771293770981464,-0.11560603438427762],
    n:[0.11561461222771378,-0.01578749635535633,0.9931686746964309],
    e:[0.0003822800985323081,-0.3952923252723337,0.918555295800268],
    obl:23.282780041213766},
  {year:12345.6,
    q:[-0.8399443826164584,-0.5050881502873266,-0.198442421247029],
    n:[0.218401620420875,-0.6493828600477707,0.7284247615737081],
    e:[0.010533313386081936,-0.38078156601473634,0.9246050228570443],
    obl:22.61959898446691}
];

test("J2000 basis has the expected orientation and mean obliquity", () => {
  const s = model.sample(2000);
  vectorNear(s.q, [1,0,0], 6e-10, "J2000 equinox");
  vectorNear(s.n, [0,0,1], 6e-10, "J2000 equator pole");
  vectorNear(s.e, [0,-0.397776969112606,0.9174821430652418], 6e-10, "J2000 ecliptic pole");
  vectorNear(s.bx, [1,0,0], 6e-10, "ring zero direction");
  vectorNear(s.by, [0,0.9174821430652418,0.397776969112606], 6e-10, "ring positive direction");
  near(s.obl, 23.439279444722246, 5e-8, "J2000 mean obliquity");
  near(model.sample(2026.8980150581794).obl, 23.435779948056368, 3e-7,
    "2026-11-25 mean obliquity");
});

test("interpolation agrees with independent ERFA references in ancient, modern and future epochs", () => {
  // Tolerances cover the actual 20-year interpolation error, under 0.25 arcsec
  // in pole direction/obliquity. They are not claims about physical accuracy
  // of the astronomical model itself over the entire long time interval.
  for (const ref of references) {
    assert.ok(!data.samples.some(row => row[0] === ref.year), "fixture must test interpolation");
    const actual = model.sample(ref.year);
    vectorNear(actual.q, ref.q, 8e-8, `${ref.year} equinox`);
    vectorNear(actual.n, ref.n, 1.2e-6, `${ref.year} equator pole`);
    vectorNear(actual.e, ref.e, 1.2e-8, `${ref.year} ecliptic pole`);
    near(actual.obl, ref.obl, 7e-5, `${ref.year} obliquity`);
  }
});

test("interpolated geometry stays normalized, right handed and on the mean planes", () => {
  for (const year of [-12000,-4321.25,-1,0,0.5,2000,2026.9,2597.4,3210.5,12345.6,14000]) {
    const s = model.sample(year);
    for (const key of ["q","n","e","bx","by"])
      near(Math.hypot(...s[key]), 1, 2e-14, `${year} ${key} unit length`);
    near(dot(s.q,s.n), 0, 2e-8, `${year} equinox in equator`);
    // Interpolating q and e separately leaves a tiny plane residual. The
    // direct-reference audit bounds it below 0.02 arcsec, not exactly zero.
    near(dot(s.q,s.e), 0, 8e-8, `${year} equinox in ecliptic`);
    near(dot(s.bx,s.e), 0, 2e-14, `${year} basisX in ecliptic`);
    near(dot(s.by,s.e), 0, 2e-14, `${year} basisY in ecliptic`);
    vectorNear(cross(s.bx,s.by), s.e, 2e-14, `${year} right-handed ecliptic basis`);
  }
});

test("IAU membership uses modern boundaries, including the Pisces-Aquarius crossing", () => {
  near(model.boundary("iau"), 2597.3809392235025, 1e-6, "IAU boundary convention");
  assert.equal(model.iauCode(2026.9), "Psc");
  assert.equal(model.region(2597.37), "Psc");
  assert.equal(model.region(2597.39), "Aqr");
  assert.equal(model.region(4312.98), "Aqr");
  assert.equal(model.region(4313.01), "Cap");
  assert.equal(model.iauCode(-2000), "Tau");
  assert.equal(model.iauCode(-100), "Ari");
  assert.equal(model.iauCode(0), "Psc");
});

test("Spica sectors have a distinct illustrative crossing and the offset sign is correct", () => {
  // Direct ERFA solutions using the same explicitly fixed HYG Spica anchor.
  const fixtures = [[-5,2797.6551309746465],[0,2440.5849262983625],[5,2082.953832318268]];
  for (const [offset, expected] of fixtures) {
    const crossing = model.boundary("equal", offset);
    near(crossing, expected, 0.0002, `Spica crossing offset ${offset}`);
    assert.equal(model.region(crossing - 0.01, "equal", offset), "Psc");
    assert.equal(model.region(crossing + 0.01, "equal", offset), "Aqr");
    const state = model.sample(2026.9);
    near(wrap(model.angle(data.spica,state) - model.anchor(state,offset)),
      180 - offset, 1e-10, `Spica longitude offset ${offset}`);
  }
  assert.ok(model.boundary("equal",5) < model.boundary("equal",0));
  assert.ok(model.boundary("equal",0) < model.boundary("equal",-5));
  assert.ok(model.boundary("equal",0) < model.boundary("iau"));
});

function intervalFor(partition, code) {
  const index = partition.findIndex(row => row[1] === code);
  return index < 0 ? null : [partition[index][0], partition[index+1]?.[0] ?? 360];
}
function assertPartition(partition, label) {
  assert.equal(partition[0][0], 0, label + " starts at zero");
  for (let i=0;i<partition.length;i++) {
    const [angle,code] = partition[i];
    assert.ok(Number.isFinite(angle) && angle >= 0 && angle < 360, label + " angle range");
    assert.ok(data.codes.includes(code), label + " valid IAU code");
    if (i) assert.ok(angle > partition[i-1][0], label + " increasing boundaries");
  }
}

test("IAU rings partition the ecliptic and retain the 13 unequal modern constellations", () => {
  for (const year of [-12000,-6175,-6165,0,2026.9,2597.4,6435,14000])
    assertPartition(model.iauSegments(year), String(year));
  const modern = model.iauSegments(2026.9);
  assert.equal(new Set(modern.map(row => row[1])).size, 13);
  assert.ok(intervalFor(modern,"Oph"));
  assert.equal(intervalFor(modern,"Cet"),null);
  assert.equal(intervalFor(modern,"Ori"),null);
  const [s0,s1] = intervalFor(modern,"Sco");
  near(s1-s0, 6.575831, 2e-6, "Scorpius width is not a 30-degree zodiac sign");
});

test("topology changes preserve narrow real regions instead of blending unrelated sectors", () => {
  // Direct analytic B1875 intersections: Cet is just 3.024 arcsec wide here.
  assert.deepEqual(intervalFor(model.iauSegments(-6175),"Cet"), [7.123046,7.123886]);
  assert.equal(intervalFor(model.iauSegments(-6165),"Cet"),null);
  assert.equal(intervalFor(model.iauSegments(-6170),"Cet"),null);
  assert.equal(intervalFor(model.iauSegments(6425),"Ori"),null);
  assert.deepEqual(intervalFor(model.iauSegments(6435),"Ori"), [87.598713,87.663481]);
  assert.deepEqual(intervalFor(model.iauSegments(6430),"Ori"), [87.598713,87.663481]);
});

test("year bounds are inclusive and invalid epochs, modes and sector offsets are rejected", () => {
  assert.equal(model.minimum,-12000);
  assert.equal(model.maximum,14000);
  for (const year of [-12000,14000]) {
    assert.ok(Number.isFinite(model.sample(year).obl));
    assert.equal(model.region(year),"Vir");
    assertPartition(model.iauSegments(year),String(year));
  }
  for (const year of [-12000.001,14000.001,NaN,Infinity,-Infinity,"2026",null,undefined]) {
    for (const fn of [model.sample,model.iauCode,model.iauSegments])
      assert.throws(() => fn(year),RangeError,String(year));
    assert.throws(() => model.region(year,"equal"),RangeError,String(year));
  }
  assert.throws(() => model.region(2026,"unknown"),RangeError);
  assert.throws(() => model.boundary("unknown"),RangeError);
  for (const offset of [-5.01,5.01,NaN,Infinity]) {
    assert.throws(() => model.region(2026,"equal",offset),RangeError);
    assert.throws(() => model.boundary("equal",offset),RangeError);
  }
});

test("UTC-based Julian epoch conversion preserves J2000 noon and the Julian-year length", () => {
  // JD fixtures independently evaluated with erfa.epj(JD,0). This checks the
  // documented UTC display approximation, not an exact UTC-to-TT conversion.
  for (const [date,expected] of [
    ["2000-01-01T12:00:00Z",2000],
    ["2000-01-01T00:00:00Z",1999.9986310746065],
    ["2000-12-31T18:00:00Z",2001],
    ["2026-11-25T00:00:00Z",2026.8980150581792],
    ["0000-01-01T00:00:00Z",0.039698836413435856],
    ["0001-01-01T00:00:00Z",1.0417522245038526]
  ]) near(julianEpoch(new Date(date)),expected,1e-12,date);
  assert.equal(julianEpoch(new Date("2026-11-25T01:00:00+01:00")),
    julianEpoch(new Date("2026-11-25T00:00:00Z")));
  const a = julianEpoch(new Date("2026-03-29T01:30:00+01:00"));
  const b = julianEpoch(new Date("2026-03-29T03:30:00+02:00"));
  near((b-a)*365.25*24,1,1e-8,"DST civil-clock jump is one elapsed hour");
  assert.throws(() => julianEpoch(new Date(NaN)),RangeError);
});
