(function(root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.OrlojFacade = api;
    api.autoStart(root);
  }
})(typeof self !== "undefined" ? self : this, function() {
  "use strict";

  var DAY = 86400000;
  var RAD = Math.PI / 180;
  var ASPECT_COLORS = {soft: "#65bba8", hard: "#ca6b5c", neutral: "#c9a961"};
  var POINT_COPY = {
    sun: "Slunce · střed geocentrického obrazu",
    moon: "Měsíc · nejrychlejší světlo ciferníku",
    mercury: "Merkur · vnitřní planeta",
    venus: "Venuše · vnitřní planeta",
    mars: "Mars · vnější planeta",
    jupiter: "Jupiter · vnější planeta",
    saturn: "Saturn · vnější planeta",
    uranus: "Uran · transsaturnská planeta",
    neptune: "Neptun · transsaturnská planeta",
    pluto: "Pluto · trpasličí planeta v astrologickém kruhu",
    northnode: "Severní průsečík dráhy Měsíce s ekliptikou",
    southnode: "Jižní průsečík dráhy Měsíce s ekliptikou"
  };

  function rev(value) {
    return ((value % 360) + 360) % 360;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function(char) {
      return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[char];
    });
  }

  function polar(angle, radius, center) {
    var a = (angle - 90) * RAD;
    var c = center == null ? 400 : center;
    return {x: c + Math.cos(a) * radius, y: c + Math.sin(a) * radius};
  }

  function arcPoint(angle, radius) {
    return polar(angle, radius, 400);
  }

  function donutSegment(inner, outer, start, end) {
    var a = arcPoint(start, outer), b = arcPoint(end, outer);
    var c = arcPoint(end, inner), d = arcPoint(start, inner);
    var large = end - start > 180 ? 1 : 0;
    return [
      "M", a.x.toFixed(2), a.y.toFixed(2),
      "A", outer, outer, 0, large, 1, b.x.toFixed(2), b.y.toFixed(2),
      "L", c.x.toFixed(2), c.y.toFixed(2),
      "A", inner, inner, 0, large, 0, d.x.toFixed(2), d.y.toFixed(2),
      "Z"
    ].join(" ");
  }

  function distance(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function layoutPoints(points) {
    var lanes = [284, 244, 204, 164, 124];
    var placed = [];
    var output = {};
    points.slice().sort(function(a, b) { return a.lon - b.lon; }).forEach(function(point) {
      var chosen = null;
      for (var lane = 0; lane < lanes.length; lane++) {
        var candidate = polar(point.lon, lanes[lane]);
        var clear = placed.every(function(previous) { return distance(candidate, previous) >= 38; });
        if (clear) {
          chosen = {x: candidate.x, y: candidate.y, lane: lane, radius: lanes[lane]};
          break;
        }
      }
      if (!chosen) {
        var fallback = polar(point.lon, lanes[lanes.length - 1]);
        chosen = {x: fallback.x, y: fallback.y, lane: lanes.length - 1, radius: lanes[lanes.length - 1]};
      }
      placed.push(chosen);
      output[point.id] = chosen;
    });
    return output;
  }

  function legacyDayNumber(date) {
    var y = date.getUTCFullYear();
    var m = date.getUTCMonth() + 1;
    var day = date.getUTCDate();
    var ut = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    return 367 * y - Math.floor(7 * (y + Math.floor((m + 9) / 12)) / 4) + Math.floor(275 * m / 9) + day - 730530 + ut / 24;
  }

  function sinDeg(value) {
    return Math.sin(value * RAD);
  }

  function trueMoonNodeLongitude(date) {
    var d = legacyDayNumber(date);
    var node = 125.1228 - 0.0529538083 * d;
    var sunAnomaly = 356.047 + 0.9856002585 * d;
    var moonAnomaly = 115.3654 + 13.0649929509 * d;
    var sunLongitude = sunAnomaly + (282.9404 + 4.70935e-5 * d);
    var moonLongitude = node + (318.0634 + 0.1643573223 * d) + moonAnomaly;
    var elongation = rev(moonLongitude - sunLongitude);
    var argument = rev(moonLongitude - node);
    var correction =
      -1.4979 * sinDeg(2 * elongation - 2 * argument) -
      0.1500 * sinDeg(sunAnomaly) -
      0.1226 * sinDeg(2 * elongation) +
      0.1177 * sinDeg(2 * argument) -
      0.0801 * sinDeg(2 * moonAnomaly - 2 * argument);
    return rev(node + correction);
  }

  function phaseMark(phase) {
    var angle = rev(phase.angle);
    if (angle < 7 || angle > 353) return "nov";
    if (Math.abs(angle - 180) < 7) return "úplněk";
    return "";
  }

  function facadePhaseName(phase) {
    var angle = rev(phase.angle);
    if (angle < 3 || angle > 357) return "Nov";
    if (angle < 87) return "Dorůstající srpek";
    if (angle <= 93) return "První čtvrť";
    if (angle < 177) return "Dorůstající Měsíc";
    if (angle <= 183) return "Úplněk";
    if (angle < 267) return "Couvající Měsíc";
    if (angle <= 273) return "Poslední čtvrť";
    return "Couvající srpek";
  }

  function moonDiscSvg(phase, size) {
    var s = size || 30;
    var radius = s / 2 - 1;
    var center = s / 2;
    var rx = (radius * Math.abs(1 - 2 * phase.illumination)).toFixed(2);
    var firstSweep = phase.waxing ? 1 : 0;
    var secondSweep = phase.waxing ? (phase.illumination > .5 ? 1 : 0) : (phase.illumination > .5 ? 0 : 1);
    var top = center + "," + (center - radius).toFixed(2);
    var bottom = center + "," + (center + radius).toFixed(2);
    var path = "M " + top + " A " + radius.toFixed(2) + "," + radius.toFixed(2) + " 0 0 " + firstSweep + " " + bottom + " A " + rx + "," + radius.toFixed(2) + " 0 0 " + secondSweep + " " + top + " Z";
    return '<svg viewBox="0 0 ' + s + " " + s + '" aria-hidden="true"><circle cx="' + center + '" cy="' + center + '" r="' + radius.toFixed(2) + '" fill="#080b10" stroke="rgba(203,217,243,.5)"/><path d="' + path + '" fill="#dfe8fa"/></svg>';
  }

  function dateKeyForMonthShift(D, key, amount) {
    var parsed = D.parseDateKey(key);
    if (!parsed) return key;
    var first = new Date(Date.UTC(parsed.year, parsed.month - 1 + amount, 1, 12));
    var year = first.getUTCFullYear(), month = first.getUTCMonth() + 1;
    var days = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
    var day = Math.min(parsed.day, days);
    return year + "-" + pad(month) + "-" + pad(day);
  }

  function formatDate(date, options, timezone) {
    return new Intl.DateTimeFormat("cs-CZ", Object.assign({timeZone: timezone}, options)).format(date);
  }

  function titleCase(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  }

  function localMoment(D, key, timezone, live) {
    return live ? new Date() : new Date(D.zonedLocalToUtc(key, "12:00", timezone));
  }

  function nodePoint(D, id, name, glyph, lon, color) {
    var sign = D.signAt(lon);
    return {id: id, name: name, glyph: glyph, lon: lon, color: color, sign: sign, speed: 0, retro: false, node: true};
  }

  function pointTitle(D, point) {
    var motion = point.node ? "aproximovaný pravý uzel" : (point.retro ? "retrográdní · " : "přímý · ") + Math.abs(point.speed).toFixed(2).replace(".", ",") + "° za den";
    return point.sign.name + " " + D.fmtDeg(point.sign.degree) + " · " + motion;
  }

  function createApp(root, D, A) {
    var document = root.document;
    var timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Prague";
    if (!D.validTimeZone(timezone)) timezone = "Europe/Prague";
    var now = new Date();
    var todayKey = D.dateKeyAt(now, timezone);
    var requested = null;
    try { requested = new URL(root.location.href).searchParams.get("date"); } catch (error) {}
    var selectedKey = D.parseDateKey(requested) ? requested : todayKey;
    var state = {
      D: D,
      A: A,
      timezone: timezone,
      selectedKey: selectedKey,
      selectedPoint: "sun",
      points: [],
      nodes: [],
      moment: now,
      phase: null,
      lastMinute: -1,
      todayKey: todayKey
    };

    function $(id) {
      return document.getElementById(id);
    }

    function isLive() {
      state.todayKey = D.dateKeyAt(new Date(), state.timezone);
      return state.selectedKey === state.todayKey;
    }

    function updateUrl() {
      try {
        var url = new URL(root.location.href);
        if (isLive()) url.searchParams.delete("date");
        else url.searchParams.set("date", state.selectedKey);
        root.history.replaceState(null, "", url);
      } catch (error) {}
    }

    function selectDate(key) {
      if (!D.parseDateKey(key)) return;
      state.selectedKey = key;
      updateUrl();
      renderAll();
    }

    function renderCrown() {
      var sun = state.points[0], moon = state.points[1];
      var ruler = D.dayRuler(state.selectedKey);
      var civil = D.civilDate(state.selectedKey);
      $("facade-sun-sign").textContent = sun.sign.name;
      $("facade-sun-degree").textContent = D.fmtDeg(sun.sign.degree);
      $("facade-ruler-glyph").textContent = ruler.glyph;
      $("facade-ruler-glyph").style.color = ruler.color;
      $("facade-ruler-name").textContent = ruler.name;
      $("facade-weekday").textContent = formatDate(civil, {weekday: "long", timeZone: "UTC"}, "UTC");
      $("facade-moon-disc").innerHTML = moonDiscSvg(state.phase, 30);
      $("facade-moon-phase").textContent = facadePhaseName(state.phase);
      $("facade-moon-sign").textContent = moon.sign.name + " " + D.fmtDeg(moon.sign.degree);
    }

    function renderTimeRing(moment) {
      var local = D.localPartsAt(moment, state.timezone);
      var timeAngle = (local.hour + local.minute / 60 + local.second / 3600) * 15;
      var svg = "";
      for (var i = 0; i < 96; i++) {
        var angle = i * 3.75 - timeAngle;
        var major = i % 4 === 0, half = i % 2 === 0;
        var inner = major ? 366 : (half ? 371 : 375);
        var a = polar(angle, inner), b = polar(angle, 386);
        svg += '<line x1="' + a.x.toFixed(2) + '" y1="' + a.y.toFixed(2) + '" x2="' + b.x.toFixed(2) + '" y2="' + b.y.toFixed(2) + '" stroke="' + (major ? "rgba(240,222,177,.56)" : "rgba(240,222,177,.2)") + '" stroke-width="' + (major ? 1.2 : .65) + '"/>';
      }
      for (var hour = 0; hour < 24; hour++) {
        var labelAngle = hour * 15 - timeAngle;
        var point = polar(labelAngle, 352);
        svg += '<text class="time-label" x="' + point.x.toFixed(2) + '" y="' + point.y.toFixed(2) + '" text-anchor="middle" dominant-baseline="middle">' + pad(hour) + '</text>';
      }
      return svg;
    }

    function renderZodiac() {
      var glyphs = D.SIGN_GLYPHS;
      var svg = "";
      for (var i = 0; i < 12; i++) {
        svg += '<path d="' + donutSegment(301, 340, i * 30, (i + 1) * 30) + '" fill="' + (i % 2 ? "rgba(35,48,52,.48)" : "rgba(73,62,37,.36)") + '" stroke="rgba(215,189,119,.14)" stroke-width=".65"/>';
        var glyph = polar(i * 30 + 15, 321);
        svg += '<text class="zodiac-glyph" x="' + glyph.x.toFixed(2) + '" y="' + glyph.y.toFixed(2) + '" text-anchor="middle" dominant-baseline="middle">' + glyphs[i] + '\uFE0E</text>';
        for (var degree = 0; degree < 30; degree += 5) {
          var tickAngle = i * 30 + degree;
          var outer = polar(tickAngle, 300), inner = polar(tickAngle, degree === 0 ? 288 : 294);
          svg += '<line x1="' + inner.x.toFixed(2) + '" y1="' + inner.y.toFixed(2) + '" x2="' + outer.x.toFixed(2) + '" y2="' + outer.y.toFixed(2) + '" stroke="rgba(215,189,119,' + (degree === 0 ? ".4" : ".2") + ')" stroke-width="' + (degree === 0 ? 1.1 : .65) + '"/>';
        }
      }
      return svg;
    }

    function renderAspects(positions) {
      var aspectList = D.aspects(state.points).slice(0, 18);
      return aspectList.map(function(aspect) {
        var a = positions[aspect.a.id], b = positions[aspect.b.id];
        if (!a || !b) return "";
        var opacity = Math.max(.13, Math.min(.68, .68 - aspect.orb * .075));
        var color = ASPECT_COLORS[aspect.type] || ASPECT_COLORS.neutral;
        return '<line x1="' + a.x.toFixed(2) + '" y1="' + a.y.toFixed(2) + '" x2="' + b.x.toFixed(2) + '" y2="' + b.y.toFixed(2) + '" stroke="' + color + '" stroke-opacity="' + opacity.toFixed(2) + '" stroke-width="1"/>';
      }).join("");
    }

    function renderPlanetMarkers(positions) {
      return state.points.map(function(point) {
        var pos = positions[point.id];
        var anchor = polar(point.lon, 289);
        var leader = pos.radius < 280 ? '<line x1="' + anchor.x.toFixed(2) + '" y1="' + anchor.y.toFixed(2) + '" x2="' + pos.x.toFixed(2) + '" y2="' + pos.y.toFixed(2) + '" stroke="' + point.color + '" stroke-opacity=".34" stroke-width=".8"/>' : "";
        var selected = state.selectedPoint === point.id ? " is-selected" : "";
        var retro = point.retro ? '<text class="retro-mark" x="12" y="-11" fill="#efaa73">R</text>' : "";
        return leader + '<g class="planet-marker' + selected + '" data-point-id="' + point.id + '" tabindex="0" role="button" aria-label="' + esc(point.name + ", " + pointTitle(D, point)) + '" transform="translate(' + pos.x.toFixed(2) + " " + pos.y.toFixed(2) + ')" style="color:' + point.color + '"><circle class="marker-disc" r="16" fill="rgba(6,9,12,.94)" stroke="currentColor" stroke-width="1.35"/><text class="planet-symbol" x="0" y="1" fill="currentColor" text-anchor="middle" dominant-baseline="middle">' + point.glyph + "</text>" + retro + "</g>";
      }).join("");
    }

    function renderNodeAxis() {
      var north = state.nodes[0], south = state.nodes[1];
      var a = polar(north.lon, 288), b = polar(south.lon, 288);
      var line = '<line x1="' + a.x.toFixed(2) + '" y1="' + a.y.toFixed(2) + '" x2="' + b.x.toFixed(2) + '" y2="' + b.y.toFixed(2) + '" stroke="#a98fc2" stroke-opacity=".34" stroke-width="1" stroke-dasharray="3 6"/>';
      return line + state.nodes.map(function(point) {
        var p = polar(point.lon, 287);
        var selected = state.selectedPoint === point.id ? " is-selected" : "";
        return '<g class="node-marker' + selected + '" data-point-id="' + point.id + '" tabindex="0" role="button" aria-label="' + esc(point.name + ", " + pointTitle(D, point)) + '" transform="translate(' + p.x.toFixed(2) + " " + p.y.toFixed(2) + ')" style="color:' + point.color + '"><circle class="marker-disc" r="13" fill="rgba(10,8,13,.94)" stroke="currentColor" stroke-width="1.1"/><text class="node-symbol" x="0" y="1" fill="currentColor" text-anchor="middle" dominant-baseline="middle">' + point.glyph + "</text></g>";
      }).join("");
    }

    function renderDial() {
      var svg = $("celestial-dial");
      var positions = layoutPoints(state.points);
      var clock = formatDate(state.moment, {hour: "2-digit", minute: "2-digit", hourCycle: "h23"}, state.timezone);
      var shortDate = formatDate(D.civilDate(state.selectedKey), {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"}, "UTC");
      var content =
        '<defs>' +
          '<radialGradient id="facade-sky" cx="50%" cy="44%" r="58%"><stop offset="0" stop-color="#111b21"/><stop offset=".58" stop-color="#091015"/><stop offset="1" stop-color="#040709"/></radialGradient>' +
          '<radialGradient id="facade-center" cx="45%" cy="38%" r="68%"><stop offset="0" stop-color="#26251e"/><stop offset="1" stop-color="#0b0e10"/></radialGradient>' +
          '<filter id="axis-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
        '</defs>' +
        '<circle cx="400" cy="400" r="389" fill="url(#facade-sky)" stroke="rgba(215,189,119,.38)" stroke-width="1.2"/>' +
        '<circle cx="400" cy="400" r="365" fill="none" stroke="rgba(215,189,119,.24)"/>' +
        renderTimeRing(state.moment) +
        '<circle cx="400" cy="400" r="341" fill="none" stroke="rgba(215,189,119,.42)" stroke-width="1.2"/>' +
        renderZodiac() +
        '<circle cx="400" cy="400" r="299" fill="rgba(4,9,12,.34)" stroke="rgba(215,189,119,.28)"/>' +
        '<circle cx="400" cy="400" r="202" fill="none" stroke="rgba(215,189,119,.09)"/>' +
        '<circle cx="400" cy="400" r="147" fill="none" stroke="rgba(215,189,119,.07)"/>' +
        renderNodeAxis() +
        renderAspects(positions) +
        renderPlanetMarkers(positions) +
        '<circle cx="400" cy="400" r="77" fill="url(#facade-center)" stroke="rgba(215,189,119,.48)" stroke-width="1.2"/>' +
        '<circle cx="400" cy="400" r="67" fill="none" stroke="rgba(215,189,119,.14)"/>' +
        '<text class="dial-center-date" x="400" y="378" text-anchor="middle">' + esc(shortDate) + '</text>' +
        '<text class="dial-center-clock" id="dial-center-clock" x="400" y="407" text-anchor="middle">' + esc(clock) + '</text>' +
        '<text class="dial-center-date" x="400" y="430" text-anchor="middle">' + (isLive() ? "ŽIVÝ OKAMŽIK" : "MÍSTNÍ POLEDNE") + '</text>' +
        '<line x1="400" y1="10" x2="400" y2="91" stroke="#cc654f" stroke-opacity=".78" stroke-width="1.4" filter="url(#axis-glow)"/>' +
        '<path d="M400 9 L393 24 L407 24 Z" fill="#cc654f"/>' +
        '<circle cx="400" cy="91" r="3.6" fill="#cc654f" filter="url(#axis-glow)"/>';
      svg.innerHTML = content;
      Array.prototype.forEach.call(svg.querySelectorAll("[data-point-id]"), function(node) {
        function choose() { selectPoint(node.getAttribute("data-point-id")); }
        node.addEventListener("click", choose);
        node.addEventListener("keydown", function(event) {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(); }
        });
      });
    }

    function selectedPointData(id) {
      return state.points.concat(state.nodes).find(function(point) { return point.id === id; }) || state.points[0];
    }

    function selectPoint(id) {
      state.selectedPoint = id;
      Array.prototype.forEach.call($("celestial-dial").querySelectorAll("[data-point-id]"), function(node) {
        node.classList.toggle("is-selected", node.getAttribute("data-point-id") === id);
      });
      updatePlaque();
    }

    function updatePlaque() {
      var point = selectedPointData(state.selectedPoint);
      $("plaque-glyph").textContent = point.glyph;
      $("plaque-glyph").style.color = point.color;
      $("plaque-kicker").textContent = point.node ? "uzlová osa" : "planetární poloha";
      $("plaque-title").textContent = point.name;
      $("plaque-detail").textContent = pointTitle(D, point) + " · " + POINT_COPY[point.id];
    }

    function renderCalendar() {
      var parsed = D.parseDateKey(state.selectedKey);
      var firstKey = parsed.year + "-" + pad(parsed.month) + "-01";
      var first = D.civilDate(firstKey);
      var mondayOffset = (first.getUTCDay() + 6) % 7;
      var startKey = D.shiftDateKey(firstKey, -mondayOffset);
      var today = D.dateKeyAt(new Date(), state.timezone);
      var grid = $("facade-calendar-grid");
      var html = "";
      for (var i = 0; i < 42; i++) {
        var key = D.shiftDateKey(startKey, i);
        var date = D.parseDateKey(key);
        var number = D.numerology(key, null).universal;
        var noon = new Date(D.zonedLocalToUtc(key, "12:00", state.timezone));
        var mark = phaseMark(D.moonPhase(A, noon));
        var classes = ["calendar-day"];
        if (date.month !== parsed.month) classes.push("is-outside");
        if (key === today) classes.push("is-today");
        if (key === state.selectedKey) classes.push("is-selected");
        var dateLabel = titleCase(formatDate(D.civilDate(key), {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"}, "UTC"));
        html += '<button class="' + classes.join(" ") + '" type="button" role="gridcell" data-date="' + key + '" aria-selected="' + (key === state.selectedKey ? "true" : "false") + '" aria-label="' + esc(dateLabel + ", univerzální den " + number.label + (mark ? ", " + mark : "")) + '"><span class="calendar-date-number">' + date.day + '</span><strong class="calendar-universal">' + esc(number.label) + '</strong><span class="calendar-lunar-mark">' + esc(mark) + "</span></button>";
      }
      grid.innerHTML = html;
      Array.prototype.forEach.call(grid.querySelectorAll("[data-date]"), function(button) {
        button.addEventListener("click", function() { selectDate(button.getAttribute("data-date")); });
      });
      var monthTitle = formatDate(first, {month: "long", year: "numeric", timeZone: "UTC"}, "UTC");
      $("calendar-heading").textContent = titleCase(monthTitle);
    }

    function renderCalendarSeal() {
      var civil = D.civilDate(state.selectedKey);
      var number = D.numerology(state.selectedKey, null).universal;
      var fullDate = formatDate(civil, {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"}, "UTC");
      $("facade-selected-date").textContent = titleCase(fullDate);
      $("facade-year-position").textContent = D.dayOfYear(state.selectedKey) + ". den roku · " + D.isoWeek(state.selectedKey) + ". týden ISO";
      $("facade-number").textContent = number.label;
      $("facade-number-title").textContent = number.theme ? number.theme.title : "univerzální rytmus";
      $("facade-date-input").value = state.selectedKey;
    }

    function renderMeta() {
      var live = isLive();
      var full = formatDate(state.moment, {weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23"}, state.timezone);
      var clock = formatDate(state.moment, {hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"}, state.timezone);
      $("facade-clock").textContent = clock;
      $("facade-live-label").textContent = live ? "živý okamžik" : "vybraný den";
      $("facade-moment-label").textContent = titleCase(full) + " · " + state.timezone;
      $("facade-date-kicker").textContent = live ? "gregoriánský den · nyní" : "gregoriánský den · poledne";
      $("facade-method").textContent = "Planetární polohy: Astronomy Engine · uzlová osa: aproximovaný pravý uzel · časové pásmo: " + state.timezone;
    }

    function renderAll() {
      var live = isLive();
      state.moment = localMoment(D, state.selectedKey, state.timezone, live);
      state.points = D.snapshot(A, state.moment);
      state.phase = D.moonPhase(A, state.moment);
      var northLon = trueMoonNodeLongitude(state.moment);
      state.nodes = [
        nodePoint(D, "northnode", "Severní uzel", "☊", northLon, "#b89acb"),
        nodePoint(D, "southnode", "Jižní uzel", "☋", rev(northLon + 180), "#8c789c")
      ];
      renderMeta();
      renderCrown();
      renderDial();
      renderCalendarSeal();
      renderCalendar();
      updatePlaque();
      state.lastMinute = state.moment.getMinutes();
    }

    function bind() {
      $("facade-prev-day").addEventListener("click", function() { selectDate(D.shiftDateKey(state.selectedKey, -1)); });
      $("facade-next-day").addEventListener("click", function() { selectDate(D.shiftDateKey(state.selectedKey, 1)); });
      $("facade-prev-month").addEventListener("click", function() { selectDate(dateKeyForMonthShift(D, state.selectedKey, -1)); });
      $("facade-next-month").addEventListener("click", function() { selectDate(dateKeyForMonthShift(D, state.selectedKey, 1)); });
      $("facade-today").addEventListener("click", function() { selectDate(D.dateKeyAt(new Date(), state.timezone)); });
      $("facade-date-input").addEventListener("change", function() { selectDate(this.value); });
    }

    function tick() {
      if (!isLive()) return;
      var liveNow = new Date();
      var key = D.dateKeyAt(liveNow, state.timezone);
      if (key !== state.selectedKey || liveNow.getMinutes() !== state.lastMinute) {
        state.selectedKey = key;
        renderAll();
        return;
      }
      state.moment = liveNow;
      var clock = formatDate(liveNow, {hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"}, state.timezone);
      $("facade-clock").textContent = clock;
      var center = $("dial-center-clock");
      if (center) center.textContent = clock.slice(0, 5);
    }

    bind();
    renderAll();
    root.setInterval(tick, 1000);
    return state;
  }

  function autoStart(root) {
    if (!root || !root.document) return;
    function start() {
      var shell = root.document.getElementById("orloj-facade");
      if (!shell) return;
      if (!root.OrlojDay || !root.Astronomy) {
        shell.innerHTML = '<p style="padding:3rem;text-align:center">Výpočetní jádro Orloje se nepodařilo načíst.</p>';
        return;
      }
      createApp(root, root.OrlojDay, root.Astronomy);
    }
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", start);
    else start();
  }

  return {
    rev: rev,
    polar: polar,
    layoutPoints: layoutPoints,
    trueMoonNodeLongitude: trueMoonNodeLongitude,
    phaseMark: phaseMark,
    facadePhaseName: facadePhaseName,
    dateKeyForMonthShift: dateKeyForMonthShift,
    createApp: createApp,
    autoStart: autoStart
  };
});
