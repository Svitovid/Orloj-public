"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Day = require("../day-profile.js");
const Astronomy = require("../astronomy-engine.min.js");
const root = path.resolve(__dirname, "..");

// Exercise actual page controllers with their HTML IDs and real astronomy.
function page(name, query, profile = false) {
  const html = fs.readFileSync(path.join(root, name + ".html"), "utf8");
  const elements = new Map();
  const listener = {};
  const copied = [];
  const errors = [];
  const classes = () => ({add() {}, remove() {}, toggle() {}});
  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) elements.set(id, {
    value: "", textContent: "", innerHTML: "", dataset: {}, hidden: false,
    style: {setProperty(key, value) {this[key] = String(value);}},
    listeners: {}, attributes: {}, classList: classes(), parentElement: {classList: classes()},
    setAttribute(key, value) {this.attributes[key] = value;},
    addEventListener(type, callback) {this.listeners[type] = callback;}
  });
  const document = {
    readyState: "loading", documentElement: {dataset: {theme: "dark"}},
    getElementById(id) {return elements.get(id) || null;},
    querySelectorAll() {return [];},
    addEventListener(type, callback) {listener[type] = callback;}
  };
  const storage = new Map([["orloj-public-observer-v1", JSON.stringify({place:"Zlín",lat:49.2,lon:17.7,timezone:"Europe/Prague"})]]);
  if (profile) storage.set("orloj-public-profile-v1", JSON.stringify({name:"Local profile",date:"1999-12-27",time:"10:27",lat:49.038,lon:17.644,timezone:"Europe/Prague"}));
  const localStorage = {getItem(key) {return storage.get(key) || null;}};
  const location = {href:"https://example.test/Orloj-public/" + name + ".html?" + query};
  const history = {replaceState(a, b, url) {location.href = String(url);}};
  const window = {document, OrlojDay:Day, Astronomy, scrollTo() {throw new Error("Unexpected scroll");}};
  const context = vm.createContext({window, self:window, document, localStorage, location, history,
    navigator:{clipboard:{writeText(value) {copied.push(value);return Promise.resolve();}}},
    Date, Intl, URL, URLSearchParams, setTimeout(fn) {fn();}, console:{error(e) {errors.push(e);}}
  });
  vm.runInContext(fs.readFileSync(path.join(root, name === "day" ? "day-profile.js" : "timeline.js"), "utf8"), context);
  listener.DOMContentLoaded();
  assert.deepEqual(errors, []);
  return {elements, location, copied, document,
    event(id, type, event = {}) {const el = elements.get(id);return el.listeners[type].call(el, event);}
  };
}

test("day controls update all values across leap day without scrolling", () => {
  const p = page("day", "date=2024-03-01", true);
  p.event("day-prev", "click");
  assert.equal(p.elements.get("day-date").value, "2024-02-29");
  assert.equal(p.elements.get("day-year-day").textContent, "60. den roku");
  assert.equal(p.elements.get("day-year-week").textContent, "9. týden roku");
  assert.equal(p.elements.get("day-ruler-value").textContent, "Jupiter");
  assert.equal(p.elements.get("day-selected-date").dateTime, "2024-02-29");
  assert.match(p.elements.get("day-date").attributes["aria-label"], /29. února 2024/);
  assert.match(p.elements.get("day-moon-copy").textContent, /°\d\d′$/);
  assert.equal(p.elements.get("day-number-label").textContent, "osobní den");
  p.event("day-next", "click");
  assert.equal(p.elements.get("day-date").value, "2024-03-01");
});

test("date selection opens the native picker and survives its absence or rejection", () => {
  const p = page("day", "date=2026-09-07"), input = p.elements.get("day-date");
  let opened = 0, prevented = 0;
  input.showPicker = () => {opened++;};
  p.event("day-date", "click");
  p.event("day-date", "keydown", {key:"Enter", preventDefault() {prevented++;}});
  assert.equal(opened, 2);
  assert.equal(prevented, 1);
  input.showPicker = () => {throw new Error("Not supported");};
  assert.doesNotThrow(() => p.event("day-date", "click"));
  delete input.showPicker;
  assert.doesNotThrow(() => p.event("day-date", "click"));
  input.value = "2026-10-25";
  p.event("day-date", "change");
  assert.match(p.elements.get("day-context").textContent, /25 h/);
  assert.match(p.location.href, /date=2026-10-25/);
  input.value = "2026-02-30";
  p.event("day-date", "change");
  assert.equal(input.value, "2026-10-25");
});

test("new moon has no halo; the same illumination drives stronger full-moon light", () => {
  const dark = Day.moonAppearance(0), half = Day.moonAppearance(.5), full = Day.moonAppearance(1);
  for (const key of ["wash", "inset", "glow", "glowSize"]) {
    assert.equal(dark[key], 0);
    assert.ok(half[key] > dark[key] && full[key] > half[key]);
  }
  assert.deepEqual(Day.moonAppearance(-1), dark);
  assert.deepEqual(Day.moonAppearance(NaN), dark);
  assert.deepEqual(Day.moonAppearance(2), full);
  const p = page("day", "date=2026-08-12");
  const wash = () => Number(p.elements.get("day-moon-summary").style["--moon-wash"]);
  assert.equal(p.elements.get("day-moon-title").textContent, "Nov");
  assert.ok(wash() < .0001);
  p.elements.get("day-date").value = "2026-08-28";
  p.event("day-date", "change");
  assert.equal(p.elements.get("day-moon-title").textContent, "Úplněk");
  assert.ok(wash() > .15);
});

test("timeline → day → timeline preserves month/quarter and the starting date", () => {
  for (const range of ["month", "quarter"]) {
    const river = page("timeline", "start=2026-09-01&range=" + range + "&mode=study");
    const href = river.elements.get("river-universal").innerHTML.match(/href="(day.html\?[^\"]+)"/)[1];
    const day = page("day", href.split("?")[1]);
    assert.equal(day.elements.get("day-river-link").href, "timeline.html?start=2026-09-01&range=" + range + "&mode=study");
    assert.match(day.elements.get("day-back").href, /view=now&date=2026-09-\d\d#time-travel-title/);
  }
  assert.deepEqual(Day.timelineContext("2027-01-01", {start:"2026-10-01",range:"quarter",mode:"study"}), {start:"2027-01-01",range:"quarter",mode:"study"});
  assert.deepEqual(Day.timelineContext("2026-09-07", {start:"invalid",range:"invalid",mode:"invalid"}), {start:"2026-09-07",range:"month",mode:"simple"});
});

test("shared links contain only public date context even if the incoming URL contains personal data", async () => {
  const day = page("day", "date=2026-09-07&start=2026-09-01&range=month&profile=secret&lat=49#private", true);
  day.event("day-share", "click");
  assert.equal(day.copied[0], "https://example.test/Orloj-public/day.html?date=2026-09-07");
  const river = page("timeline", "start=2026-09-01&range=week&birth=secret#private");
  river.event("river-share", "click");
  assert.equal(river.copied[0], "https://example.test/Orloj-public/timeline.html?start=2026-09-01&range=week&mode=simple");
});

test("offline versioned scripts and styles fall back to the installed canonical asset", async () => {
  const listeners = {}, asset = {ok:true, source:"precache"};
  const context = vm.createContext({URL, Response,
    self:{location:{href:"https://example.test/Orloj-public/sw.js?v=build",origin:"https://example.test"}, addEventListener(type, cb) {listeners[type] = cb;}},
    fetch() {return Promise.reject(new Error("Offline"));},
    caches:{match() {return Promise.resolve(undefined);},open() {return Promise.resolve({match(key) {return Promise.resolve(key === "./day-profile.js" || key === "./day-profile.css" ? asset : undefined);}});}}
  });
  vm.runInContext(fs.readFileSync(path.join(root, "sw.js"), "utf8"), context);
  for (const file of ["day-profile.js", "day-profile.css", "unlisted.js"]) {
    let response;
    listeners.fetch({request:{method:"GET",mode:"cors",url:"https://example.test/Orloj-public/" + file + "?v=public-v11-13-day-clarity"}, respondWith(p) {response = p;}});
    const result = await response;
    if (file === "unlisted.js") assert.equal(result.type, "error");
    else assert.equal(result, asset);
  }
});

test("main time journey restores the returned date and keeps it through navigation", () => {
  const source = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const start = source.indexOf("  function initTimeTravelUI(){");
  const end = source.indexOf("\n  initObserverUI();", start);
  const controls = new Map(["time-travel-form", "time-travel-date", "time-travel-today", "time-travel-river"].map(id => [id, {
    value:"", listeners:{}, focus() {}, addEventListener(type, fn) {this.listeners[type] = fn;}
  }]));
  let destination;
  const location = {href:"https://example.test/Orloj-public/?view=now&date=2013-12-27#time-travel-title", assign(url) {destination = url;}};
  const context = vm.createContext({URL, Date, location, window:{location}, jrKey() {return "2026-09-07";},
    history:{replaceState(a, b, url) {location.href = String(url);}},
    document:{getElementById(id) {return controls.get(id);}}
  });
  vm.runInContext(source.slice(start, end) + "\ninitTimeTravelUI();", context);
  assert.equal(controls.get("time-travel-date").value, "2013-12-27");
  controls.get("time-travel-river").listeners.click();
  assert.equal(destination, "timeline.html?start=2013-12-27&range=month&mode=simple");
  controls.get("time-travel-date").value = "2024-02-29";
  controls.get("time-travel-form").listeners.submit({preventDefault() {}});
  assert.equal(destination, "day.html?date=2024-02-29");
  assert.match(location.href, /date=2024-02-29/);
  controls.get("time-travel-today").listeners.click();
  assert.equal(controls.get("time-travel-date").value, "2026-09-07");
});
