"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Month = require("../month-panel.js");
const Day = require("../day-profile.js");
const Astronomy = require("../astronomy-engine.min.js");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

// Execute the actual index adapter and number rules, not a second implementation.
function numbers(profile = false) {
  const names = ["reduceNum", "digitSum", "rootNum", "numC", "pyRaw", "pmRaw", "pdRaw", "universalDayParts", "udRaw", "refYear", "personalYear", "personalMonth"];
  const source = names.map(name => html.split("\n").find(line => line.startsWith("  function " + name + "("))).join("\n");
  const adapter = html.match(/  function monthPanelNumbers\(key\)\{[\s\S]*?\n  \}/)[0];
  const context = vm.createContext({window:{OrlojDay:Day}, PROFILE_READY:profile, activeP:() => ({bd:{y:1999, m:12, d:27}})});
  vm.runInContext(source + "\n" + adapter, context);
  return {get:context.monthPanelNumbers, setProfile(value) {context.PROFILE_READY = value;}};
}

function page(query = "", profile = false, extra = {}) {
  const elements = new Map();
  for (const [, id] of html.matchAll(/\bid="(month-[^"]+)"/g)) elements.set(id, {
    textContent:"", innerHTML:"", hidden:false, disabled:false, href:"", attributes:{}, listeners:{},
    setAttribute(name, value) {this.attributes[name] = value;},
    addEventListener(name, callback) {this.listeners[name] = callback;}
  });
  const document = {getElementById(id) {return elements.get(id) || null;}};
  const location = {href:"https://example.test/Orloj-public/?" + query};
  const history = {replaceState(a, b, url) {location.href = String(url);}};
  const rules = numbers(profile);
  let calculations = 0;
  const engine = {...Day, ingressEvents(...args) {calculations++;return Day.ingressEvents(...args);}};
  const context = {Day:engine, Astronomy, now:new Date("2026-10-01T08:00:00Z"), timezone:"Europe/Prague", language:"cs", numbers:rules.get};
  const controller = Month.mount({document, location, history, getContext:() => context, ...extra});
  return {elements, location, context, rules, controller, calculations:() => calculations,
    click(id) {elements.get("month-" + id).listeners.click();}}
}

test("civil calendar starts on Monday and handles leap years and year rollover", () => {
  assert.equal(Month.geometry("2024-02").days.length, 29);
  assert.equal(Month.geometry("2025-02").days.length, 28);
  assert.equal(Month.geometry("2026-10").offset, 3);
  assert.equal(Month.geometry("2026-02").offset, 6);
  assert.equal(Month.shiftMonth("2026-12", 1), "2027-01");
  assert.equal(Month.shiftMonth("2026-01", -1), "2025-12");
  assert.equal(Month.parseMonth("2026-13"), null);
  assert.equal(Month.parseMonth("2026-2"), null);
  assert.equal(Month.parseMonth("<script>"), null);
  assert.throws(() => Month.geometry("2026-13"));
});

test("real monthly events retain both full Moons and use exact elongation", () => {
  const month = Month.buildMonth(Day, Astronomy, "2026-05", "Europe/Prague");
  const full = month.events.filter(e => e.kind === "phase" && e.phaseAngle === 180);
  assert.equal(full.length, 2);
  assert.deepEqual(full.map(e => e.dateKey), ["2026-05-01", "2026-05-31"]);
  for (const e of month.events.filter(e => e.kind === "phase")) {
    assert.ok(Math.abs(Day.signed(Astronomy.MoonPhase(new Date(e.at)) - e.phaseAngle)) < .002);
  }
  assert.ok(month.events.every((e, i, events) => !i || e.at >= events[i - 1].at));
  assert.ok(month.events.every(e => e.body !== "moon"));
});

test("month boundaries follow observer timezone and daylight-saving changes", () => {
  const march = Month.buildMonth(Day, Astronomy, "2026-03", "Europe/Prague");
  const october = Month.buildMonth(Day, Astronomy, "2026-10", "Europe/Prague");
  assert.equal((march.bounds.end - march.bounds.start) / 3600000, 743);
  assert.equal((october.bounds.end - october.bounds.start) / 3600000, 745);
  for (const day of october.days) {
    const noon = Day.zonedLocalToUtc(day.key, "12:00", "Europe/Prague");
    assert.equal(day.phase.illumination, Day.moonPhase(Astronomy, new Date(noon)).illumination);
    assert.ok(day.events.every(e => Day.dateKeyAt(new Date(e.at), "Europe/Prague") === day.key));
  }
});

test("boundary events belong to one month only", () => {
  const bounds = Day.rangeBounds("2026-10-01", "2026-11-01", "Europe/Prague");
  const stub = {...Day, phaseEventsRange:() => [
    {kind:"phase", phaseAngle:0, at:bounds.start, title:"Nov"},
    {kind:"phase", phaseAngle:180, at:bounds.end, title:"Úplněk"}
  ], eclipseEventsRange:() => [], seasonEventsRange:() => [], ingressEvents:() => [], stationEvents:() => []};
  const month = Month.buildMonth(stub, Astronomy, "2026-10", "Europe/Prague");
  assert.equal(month.events.length, 1);
  assert.equal(month.days[0].events.length, 1);
  assert.equal(month.events[0].dateKey, "2026-10-01");
});

test("month numbers use existing compound/master-number rules and preserve birthday transitions", () => {
  const rules = numbers(true);
  assert.equal(rules.get("2026-10-01").universalMonth, "2");
  assert.equal(rules.get("2026-12-27").universalDay, "22/4");
  const segments = Month.rhythmSegments(Month.geometry("2026-12").days, rules.get);
  assert.equal(segments.universal, "4");
  assert.deepEqual(segments.personal, [{value:"6", from:1, to:26}, {value:"25/7", from:27, to:31}]);
  rules.setProfile(false);
  assert.equal(rules.get("2026-10-01").personalMonth, null);
  assert.equal(rules.get("2026-10-01").personalDay, null);
});

test("month controls update calendar and URLs without reloading or erasing existing context", () => {
  const p = page("month=2026-12&view=today&v=release", true);
  assert.equal(p.elements.get("month-title").textContent, "Prosinec 2026");
  assert.match(p.elements.get("month-rhythms").innerHTML, /25\/7/);
  p.click("next");
  assert.equal(p.elements.get("month-title").textContent, "Leden 2027");
  assert.equal((p.elements.get("month-grid").innerHTML.match(/class="month-day/g) || []).length, 31);
  assert.match(p.location.href, /month=2027-01/);
  assert.match(p.location.href, /view=today/);
  assert.match(p.location.href, /v=release/);
  assert.equal(p.elements.get("month-river").href, "timeline.html?start=2027-01-01&range=month&mode=simple");
  p.click("prev");
  p.click("current");
  assert.equal(p.elements.get("month-title").textContent, "Říjen 2026");
  assert.match(p.elements.get("month-grid").innerHTML, /aria-current="date"/);
  assert.match(p.elements.get("month-grid").innerHTML, /href="day\.html\?date=2026-10-01"/);
  assert.match(p.elements.get("month-grid").innerHTML, /Univerzální den 12\/3 · Osobní den 5/);
});

test("refreshes, profile edits and language switches reuse cached astronomy", () => {
  const p = page();
  assert.equal(p.calculations(), 1);
  assert.match(p.elements.get("month-rhythms").innerHTML, /po nastavení osobní mapy/);
  assert.doesNotMatch(p.elements.get("month-grid").innerHTML, /Osobní den/);
  p.controller.refresh();
  p.rules.setProfile(true);
  p.controller.refresh();
  assert.match(p.elements.get("month-grid").innerHTML, /Osobní den/);
  p.context.language = "en";
  p.controller.refresh();
  assert.equal(p.calculations(), 1);
  assert.equal(p.elements.get("month-title").textContent, "October 2026");
  assert.match(p.elements.get("month-events").innerHTML, /Venus stations retrograde/);
  assert.doesNotMatch(p.elements.get("month-events").innerHTML, /undefined|Venuše|Úplněk/);
  assert.match(p.elements.get("month-grid").innerHTML, /Universal day 12\/3/);
  p.click("next");
  p.click("prev");
  assert.equal(p.calculations(), 2);
  p.context.timezone = "Pacific/Honolulu";
  p.controller.refresh();
  assert.equal(p.calculations(), 3);
  assert.equal(p.elements.get("month-timezone").textContent, "Pacific/Honolulu");
});

test("initial calendar month and today marker use observer time, not UTC", () => {
  const p = page();
  p.context.now = new Date("2026-10-01T00:30:00Z");
  p.context.timezone = "Pacific/Honolulu";
  p.controller.refresh();
  assert.equal(p.elements.get("month-title").textContent, "Září 2026");
  assert.match(p.elements.get("month-grid").innerHTML, /href="day\.html\?date=2026-09-30"[^>]*aria-current="date"/);
  p.context.now = new Date("2026-10-01T11:30:00Z");
  p.controller.refresh();
  assert.equal(p.elements.get("month-title").textContent, "Říjen 2026");
});

test("returning from a dated day selects its month, but invalid dates do not", () => {
  assert.equal(page("date=2024-02-29").elements.get("month-title").textContent, "Únor 2024");
  assert.equal(page("date=2024-02-30").elements.get("month-title").textContent, "Říjen 2026");
  assert.equal(page("month=invalid").elements.get("month-title").textContent, "Říjen 2026");
});

test("new astronomy waits until the panel approaches the viewport", () => {
  let callback, observed = false, disconnected = false;
  class Observer {
    constructor(fn) {callback = fn;}
    observe() {observed = true;}
    disconnect() {disconnected = true;}
  }
  const p = page("", false, {IntersectionObserver:Observer});
  assert.equal(observed, true);
  assert.equal(p.calculations(), 0);
  callback([{isIntersecting:false}]);
  assert.equal(p.calculations(), 0);
  callback([{isIntersecting:true}]);
  assert.equal(disconnected, true);
  assert.equal(p.calculations(), 1);
  assert.equal(p.elements.get("month-body").hidden, false);
});

test("failed astronomy shows an error and retry, never an empty factual overview", () => {
  const p = page();
  p.context.Astronomy = null;
  p.context.timezone = "UTC";
  p.controller.refresh();
  assert.equal(p.elements.get("month-body").hidden, true);
  assert.equal(p.elements.get("month-retry").hidden, false);
  assert.match(p.elements.get("month-status").textContent, /nepodařilo/);
  p.context.Astronomy = Astronomy;
  p.click("retry");
  assert.equal(p.elements.get("month-body").hidden, false);
  assert.equal(p.elements.get("month-retry").hidden, true);
});

test("monthly assets and universal day stay connected to the public app and offline cache", () => {
  assert.match(html, /id="now-universal-number"/);
  assert.match(html, /id="month-panel"/);
  assert.match(html, /month-panel\.css\?v=public-v11-13-month-overview/);
  assert.match(html, /month-panel\.js\?v=public-v11-13-month-overview/);
  assert.match(html, /if\(monthPanel\)monthPanel\.refresh\(\)/);
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.match(worker, /"\.\/month-panel\.js"/);
  assert.match(worker, /"\.\/month-panel\.css"/);
});
