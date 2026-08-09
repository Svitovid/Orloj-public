"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const index = fs.readFileSync(path.resolve(__dirname, "..", "index.html"), "utf8");

function loadFunction(name) {
  const match = index.match(new RegExp(`function ${name}\\(date\\)\\{[^}]+\\}`));
  assert.ok(match, `${name} is missing from index.html`);
  return vm.runInNewContext(`(${match[0]})`, {Date, Math});
}

test("week of month follows Monday-start calendar rows", () => {
  const weekOfMonthNumber = loadFunction("weekOfMonthNumber");

  assert.equal(weekOfMonthNumber(new Date(2026, 7, 1, 12)), 1);
  assert.equal(weekOfMonthNumber(new Date(2026, 7, 2, 12)), 1);
  assert.equal(weekOfMonthNumber(new Date(2026, 7, 3, 12)), 2);
  assert.equal(weekOfMonthNumber(new Date(2026, 7, 9, 12)), 2);
  assert.equal(weekOfMonthNumber(new Date(2026, 7, 31, 12)), 6);
  assert.equal(weekOfMonthNumber(new Date(2026, 5, 1, 12)), 1);
  assert.equal(weekOfMonthNumber(new Date(2026, 5, 8, 12)), 2);
});
