"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));

test("release identifiers are consistently v11.04", () => {
  assert.match(index, /name="orloj-build" content="public-v11-04"|content="public-v11-04" name="orloj-build"/);
  assert.match(index, /Orloj · Public v11\.04 · Čtyři čtvrtiny/);
  assert.match(index, /sw\.js\?v=public-v11-04/);
  assert.match(worker, /var CACHE = "orloj-public-v11-04"/);
  assert.doesNotMatch(index + worker, /public-v11-03|orloj-public-v11-03/);
});

test("Human Design assets and route are wired before the main application", () => {
  const astronomy = index.indexOf('<script src="./astronomy-engine.min.js?v=public-v11-04"></script>');
  const engine = index.indexOf('<script src="./human-design.js?v=public-v11-04"></script>');
  const main = index.indexOf("<script>\n(function(){", engine);
  assert.ok(astronomy > 0 && engine > astronomy && main > engine);
  assert.match(index, /href="\.\/human-design\.css\?v=public-v11-04"/);
  assert.match(index, /id="panel-design"/);
  assert.match(index, /data-open-tab="design"/);
  assert.match(index, /design:"Human Design"/);
});

test("every precached local asset exists", () => {
  const match = worker.match(/var ASSETS = (\[[^;]+\]);/);
  assert.ok(match, "service worker asset list missing");
  const assets = JSON.parse(match[1]);
  assets.filter((asset) => asset !== "./").forEach((asset) => {
    assert.ok(fs.existsSync(path.join(root, asset.replace(/^\.\//, ""))), `missing ${asset}`);
  });
  assert.ok(assets.includes("./human-design.js"));
  assert.ok(assets.includes("./human-design.css"));
  assert.ok(assets.includes("./astronomy-engine.min.js"));
});

test("manifest names the new system without changing app scope", () => {
  assert.match(manifest.description, /Human Designu/);
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
});

test("four-quarter teaching layer links zodiac, natal angles, houses and study", () => {
  assert.match(index, /id="n-quarter-compass"/);
  assert.match(index, /data-quarter-mode="zodiac"/);
  assert.match(index, /data-quarter-mode="natal"/);
  assert.match(index, /var QUARTER_STAGES=\[/);
  assert.match(index, /ASC","IC".*IC","DSC".*DSC","MC".*MC","ASC"/);
  assert.match(index, /Znamení nejsou domy\./);
  assert.match(index, /data-schema-anchor="n-quarter-compass"/);
  assert.match(index, /renderQuarterCompass\(N\);drawNatalWheel/);
});
