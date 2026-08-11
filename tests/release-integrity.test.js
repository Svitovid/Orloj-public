"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const facadeScript = fs.readFileSync(path.join(root, "orloj-facade.js"), "utf8");
const facadeCss = fs.readFileSync(path.join(root, "orloj-facade.css"), "utf8");
const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));

test("release identifiers consistently mark the v11.11 master facade", () => {
  assert.match(index, /name="orloj-build" content="public-v11-11-master-facade"/);
  assert.match(index, /Orloj · veřejná v11\.11 · mistrovská fasáda/);
  assert.match(index, /sw\.js\?v=public-v11-11-master-facade/);
  assert.match(worker, /var CACHE = "orloj-public-v11-11-master-facade"/);
  assert.doesNotMatch(index + worker, /orloj-public-v11-(?:09|10)/);
});

test("the public root is the facade itself, not a redirect or dashboard", () => {
  assert.match(index, /<title>Digitální orloj — živá fasáda času<\/title>/);
  assert.match(index, /id="orloj-facade"/);
  assert.doesNotMatch(index, /http-equiv="refresh"|location\.(?:href|replace)/);
  assert.doesNotMatch(index, /class="tabs"|data-tab=|id="panel-/);
});

test("the root keeps the four architectural strata of the master image", () => {
  assert.match(index, /automata-crown/);
  assert.match(index, /celestial-stage/);
  assert.match(index, /class="now-axis"/);
  assert.match(index, /calendar-stone/);
  assert.match(facadeCss, /grid-template-columns:\s*repeat\(7/);
});

test("Astronomy Engine and the shared day engine load before the facade renderer", () => {
  const astronomy = index.indexOf("astronomy-engine.min.js");
  const day = index.indexOf("day-profile.js");
  const facade = index.indexOf("orloj-facade.js");
  assert.ok(astronomy > 0 && day > astronomy && facade > day);
  assert.match(index, /orloj-facade\.css\?v=public-v11-11-master-facade/);
});

test("the released interface contains no personal profile or local persistence", () => {
  assert.doesNotMatch(index + facadeScript, /localStorage|datum narození|osobní profil|synastr|birth/i);
  assert.doesNotMatch(index, /<input[^>]+(?:time|latitude|longitude)|name="(?:birth|profile)/i);
});

test("specialist systems are not linked or exposed from the master facade", () => {
  assert.doesNotMatch(index, /href="(?:day|timeline|life|vedic|tarot)\.html/);
  assert.doesNotMatch(index, /Human Design|džjótiš|tarot|Životní kronika|Časová řeka/i);
});

test("every precached facade asset exists", () => {
  const match = worker.match(/var ASSETS = (\[[^;]+\]);/);
  assert.ok(match, "service worker asset list missing");
  const assets = JSON.parse(match[1]);
  assets.filter((asset) => asset !== "./").forEach((asset) => {
    assert.ok(fs.existsSync(path.join(root, asset.replace(/^\.\//, ""))), `missing ${asset}`);
  });
  ["./index.html", "./orloj-facade.js", "./orloj-facade.css", "./day-profile.js", "./astronomy-engine.min.js"].forEach((asset) => {
    assert.ok(assets.includes(asset), `facade core not precached: ${asset}`);
  });
});

test("the offline package contains only the master facade and its engine", () => {
  assert.doesNotMatch(worker, /\.\/(?:day|timeline|life|vedic|tarot)\.html/);
  assert.doesNotMatch(worker, /human-design|life-chronicle|vedic-astrology|timeline\.js/);
  assert.match(worker, /event\.request\.mode === "navigate"\) return caches\.match\("\.\/index\.html"\)/);
});

test("the web app manifest describes the public three-language facade", () => {
  assert.equal(manifest.name, "Digitální orloj — živá fasáda času");
  assert.match(manifest.description, /gregoriánského času/);
  assert.match(manifest.description, /tropické astrologie/);
  assert.match(manifest.description, /univerzální numerologie/);
  assert.doesNotMatch(manifest.description, /osobní|Human Design|džjótiš/i);
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
});

test("the released calendar remains Gregorian and universally numerical", () => {
  assert.match(index, /Gregoriánský měsíc/);
  assert.match(index, /Univerzální číslo dne/);
  assert.match(index, /id="facade-date-input" type="date"/);
  assert.match(facadeScript, /D\.numerology\([^;]+, null\)\.universal/);
});

test("the main interactive controls retain accessible labels", () => {
  assert.match(index, /role="img" aria-labelledby="dial-title dial-description"/);
  assert.match(index, /role="grid" aria-label="Gregoriánský měsíc s univerzálními čísly"/);
  assert.match(index, /aria-label="Předchozí měsíc"/);
  assert.match(index, /aria-label="Následující měsíc"/);
  assert.match(index, /aria-live="polite"/);
});

test("previous public pages remain recoverable but outside the released entrance", () => {
  ["day.html", "timeline.html", "life.html", "vedic.html", "tarot.html"].forEach((file) => {
    assert.ok(fs.existsSync(path.join(root, file)), `historical route missing: ${file}`);
    assert.doesNotMatch(index, new RegExp(file.replace(".", "\\.")));
  });
});
