"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");

function block(pattern, label) {
  const match = index.match(pattern);
  assert.ok(match, `${label} is missing`);
  return match[1];
}

test("My map opens with Orloj's own philosophy of symbolic self-knowledge", () => {
  const mapStart = index.indexOf('id="panel-map"');
  const philosophy = index.indexOf('id="cesta-symbolu"', mapStart);
  const modules = index.indexOf('class="map-status-grid"', philosophy);

  assert.ok(mapStart > 0 && philosophy > mapStart && modules > philosophy);
  assert.match(index, /Mapa není totožnost\.<br>Je počátkem rozhovoru\./);
  assert.match(index, /Nativ je základ,<\/b> ne hranice/);
  assert.match(index, /Osobnost je nádoba,<\/b> ne celá podstata/);
  assert.match(index, /Láska sílu nepotlačuje;<\/b> rozpouští její ztuhlost/);
  assert.match(index, /Ego zde není nepřítel/);
});

test("the six-step path and six-part symbolic grammar remain visible", () => {
  const card = block(/(<section class="card symbol-philosophy"[\s\S]*?<\/section>)\n  <div class="map-status-grid">/, "symbol philosophy card");
  assert.equal((card.match(/class="symbol-journey-step"/g) || []).length, 6);
  assert.equal((card.match(/class="symbol-grammar-item"/g) || []).length, 6);
  ["Otisk", "Ztotožnění", "Rozpoznání", "Přijetí", "Proměnění", "Svobodný čin"].forEach((name) => {
    assert.match(card, new RegExp(name));
  });
  ["Planeta", "Znamení", "Dům", "Aspekt", "Tranzit", "Číslo"].forEach((name) => {
    assert.match(card, new RegExp(name));
  });
});

test("planets, signs, houses and aspects each have a complete transformation vocabulary", () => {
  const planets = block(/var SYMBOL_PLANET_PATH=\{([\s\S]*?)\n  \};\n  var SYMBOL_SIGN_PATH=/, "planet path");
  const signs = block(/var SYMBOL_SIGN_PATH=\[([\s\S]*?)\n  \];\n  var SYMBOL_HOUSE_PATH=/, "sign path");
  const houses = block(/var SYMBOL_HOUSE_PATH=\[([\s\S]*?)\n  \];\n  var SYMBOL_ASPECT_PATH=/, "house path");
  const aspects = block(/var SYMBOL_ASPECT_PATH=\{([\s\S]*?)\n  \};\n  function symbolicPlanetMeta/, "aspect path");

  assert.equal((planets.match(/pattern:/g) || []).length, 10);
  assert.equal((planets.match(/gift:/g) || []).length, 10);
  assert.equal((planets.match(/love:/g) || []).length, 10);
  assert.equal((signs.match(/pattern:/g) || []).length, 12);
  assert.equal((houses.match(/pattern:/g) || []).length, 12);
  assert.equal((aspects.match(/pattern:/g) || []).length, 5);
});

test("the philosophy changes actual natal, transit, planet, sign, house and number readings", () => {
  assert.match(index, /id="n-symbol-path"/);
  assert.match(index, /renderNatalSymbolPath\(N\)/);
  assert.match(index, /symbolicReadingHTML\(m\.id,item\.lon,item\.house,true\)/);
  assert.match(index, /h\+=planetTransformationHTML\(m\)/);
  assert.match(index, /signTransformationHTML\(wi\)/);
  assert.match(index, /houseTransformationHTML\(activeHouse\)/);
  assert.match(index, /symbolicAspectHTML\(a\.name\)/);
  assert.match(index, /První čtení · tři tvary síly/);
  assert.match(index, /<div class="nfk">Proměnění<\/div>/);
});

test("the supplied social-media quote is not reproduced or attributed by Orloj", () => {
  assert.doesNotMatch(index, /Humans are afraid of Love/i);
  assert.doesNotMatch(index, /real Love transforms us/i);
  assert.doesNotMatch(index, /ego wants control/i);
  assert.doesNotMatch(index, /Love demands freedom/i);
});
