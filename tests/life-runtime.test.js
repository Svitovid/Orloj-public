"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Astronomy = require("../astronomy-engine.min.js");
const Day = require("../day-profile.js");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "life.html"), "utf8");
const script = fs.readFileSync(path.join(root, "life-chronicle.js"), "utf8");

function runtime(withProfile) {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const elements = new Map();
  class Element {
    constructor(id) {
      this.id = id;
      this.innerHTML = "";
      this.textContent = "";
      this.value = "";
      this.hidden = false;
      this.disabled = false;
      this.dataset = {};
      this.listeners = {};
      this.classList = {toggle() {}, add() {}, remove() {}};
    }
    addEventListener(type, callback) { this.listeners[type] = callback; }
    querySelector() { return null; }
    scrollIntoView() {}
  }
  ids.forEach((id) => elements.set(id, new Element(id)));
  const documentListeners = {};
  const document = {
    readyState: "loading",
    title: "",
    activeElement: null,
    getElementById(id) { return elements.get(id) || null; },
    querySelectorAll() { return []; },
    addEventListener(type, callback) { documentListeners[type] = callback; }
  };
  const store = new Map();
  if (withProfile) {
    store.set("orloj-public-profile-v1", JSON.stringify({name:"Vladimír",date:"1999-12-27",time:"10:27",lat:49.038,lon:17.644,timezone:"Europe/Prague"}));
    store.set("orloj-public-observer-v1", JSON.stringify({place:"Zlín",lat:49.226,lon:17.668,timezone:"Europe/Prague"}));
  }
  const localStorage = {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); }
  };
  const window = {document,OrlojDay:Day,Astronomy,localStorage,location:{href:"https://example.test/life.html?year=2013"},history:{replaceState() {}}};
  const context = vm.createContext({window,self:window,document,localStorage,location:window.location,history:window.history,Astronomy,Intl,URL,URLSearchParams,Date,Math,JSON,Number,String,Array,Object,Error,console,setTimeout(callback){callback();return 1;},clearTimeout(){}});
  vm.runInContext(script, context, {filename:"life-chronicle.js"});
  documentListeners.DOMContentLoaded();
  return {elements,store,document};
}

test("life page loads 2013 with a local profile and keeps memories local", () => {
  const page = runtime(true);
  assert.equal(page.elements.get("life-content").hidden, false);
  assert.equal(page.elements.get("life-status").hidden, true);
  assert.equal(page.elements.get("life-year-title").textContent, 2013);
  assert.match(page.elements.get("life-calendar-number").innerHTML, /18\/9/);
  assert.match(page.elements.get("life-chinese").innerHTML, /Drak/);
  assert.match(page.elements.get("life-chinese").innerHTML, /Had/);
  assert.match(page.elements.get("life-wheel").innerHTML, /<svg/);
  assert.match(page.elements.get("life-cycles").innerHTML, /Tradiční symbolika/);

  page.elements.get("life-memory").value = "Začal jsem si více uvědomovat změnu školy.";
  page.elements.get("life-save").listeners.click();
  const saved = JSON.parse(page.store.get("orloj-public-life-memories-v1"));
  const profileBook = Object.values(saved.profiles)[0];
  assert.match(profileBook.years[2013].memory, /změnu školy/);
});

test("life page without a local profile stops at the private empty state", () => {
  const page = runtime(false);
  assert.match(page.elements.get("life-status").innerHTML, /potřebuje osobní profil/);
  assert.equal(page.store.has("orloj-public-life-memories-v1"), false);
});
