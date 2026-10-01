/* Orloj: a civil-month overview using the same astronomy as Profile dne. */
(function(root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.OrlojMonth = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
  "use strict";
  var DAY = 86400000;
  var SIGN_EN = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  var BODY_EN = {sun:"Sun", moon:"Moon", mercury:"Mercury", venus:"Venus", mars:"Mars", jupiter:"Jupiter", saturn:"Saturn", uranus:"Uranus", neptune:"Neptune", pluto:"Pluto"};
  var PHASE_EN = {0:"New Moon", 90:"First quarter", 180:"Full Moon", 270:"Last quarter"};
  var MOON_EN = {"Nov":"New Moon", "Dorůstající srpek":"Waxing crescent", "První čtvrť":"First quarter", "Dorůstající Měsíc":"Waxing gibbous", "Úplněk":"Full Moon", "Couvající Měsíc":"Waning gibbous", "Poslední čtvrť":"Last quarter", "Couvající srpek":"Waning crescent"};
  var SEASON_EN = {"Jarní rovnodennost":"March equinox", "Letní slunovrat":"June solstice", "Podzimní rovnodennost":"September equinox", "Zimní slunovrat":"December solstice"};
  var COPY = {
    cs:{kicker:"Měsíční přehled", prev:"Předchozí měsíc", next:"Následující měsíc", current:"Tento měsíc", universal:"Univerzální měsíc", personal:"Osobní měsíc", noProfile:"po nastavení osobní mapy", tradition:"Čísla · numerologická tradice", calendar:"Kalendář měsíce", legend:"Dnešek zlatě · ● událost · klepni na den pro Profil dne", phases:"Novy a úplňky", events:"Události měsíce", river:"Měsíc v Časové řece →", method:"Fáze v kalendáři jsou pro 12:00 ve zvoleném pásmu. Časy událostí jsou přesné okamžiky z Astronomy Engine; zatmění jsou globální, místní viditelnost se liší. Osobní rok se v Orloji mění o narozeninách, proto se v takovém měsíci může změnit i osobní měsíc. Čísla jsou symbolická tradice, nikoli předpověď.", loading:"Načítám měsíční přehled…", error:"Měsíční přehled se nepodařilo načíst. Zkus jej obnovit.", retry:"Obnovit přehled", dayU:"Univerzální den", dayP:"Osobní den", today:"dnes", since:"od", phase:"Lunární fáze", station:"Planetární obrat", ingress:"Vstup do znamení", season:"Sezónní práh", eclipse:"Zatmění"},
    en:{kicker:"Month overview", prev:"Previous month", next:"Next month", current:"This month", universal:"Universal month", personal:"Personal month", noProfile:"after setting up your personal chart", tradition:"Numbers · numerological tradition", calendar:"Monthly calendar", legend:"Today in gold · ● event · tap a day for its profile", phases:"New and full Moons", events:"Events this month", river:"Month in the Time River →", method:"Calendar phases are sampled at 12:00 in the selected timezone. Event times are exact instants calculated by Astronomy Engine; eclipses are global and local visibility varies. Orloj changes the personal year on your birthday, so the personal month can also change within that month. Numbers are a symbolic tradition, not a prediction.", loading:"Loading the month overview…", error:"The month overview could not be loaded. Try refreshing it.", retry:"Refresh overview", dayU:"Universal day", dayP:"Personal day", today:"today", since:"from", phase:"Lunar phase", station:"Planetary station", ingress:"Sign ingress", season:"Seasonal threshold", eclipse:"Eclipse"}
  };
  function esc(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function(c) { return {"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]; }); }
  function parseMonth(key) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key || "")) return null;
    var year = Number(key.slice(0, 4));
    return year >= 1 && year <= 9999 ? key : null;
  }
  function shiftMonth(key, amount) {
    if (!parseMonth(key)) return null;
    var date = new Date(key + "-01T12:00:00Z");
    date.setUTCMonth(date.getUTCMonth() + amount);
    return parseMonth(date.toISOString().slice(0, 7));
  }
  function geometry(key) {
    if (!parseMonth(key)) throw new Error("Invalid month");
    var next = shiftMonth(key, 1);
    if (!next) throw new Error("Month outside supported date range");
    var startKey = key + "-01", endKey = next + "-01";
    var start = new Date(startKey + "T12:00:00Z"), end = new Date(endKey + "T12:00:00Z"), days = [];
    for (var at = start.getTime(); at < end.getTime(); at += DAY) {
      var date = new Date(at);
      days.push({key:date.toISOString().slice(0, 10), number:date.getUTCDate()});
    }
    return {key:key, startKey:startKey, endKey:endKey, offset:(start.getUTCDay() + 6) % 7, days:days};
  }
  function buildMonth(D, A, key, timezone) {
    if (!D || !A) throw new Error("Astronomy module unavailable");
    var month = geometry(key), bounds = D.rangeBounds(month.startKey, month.endKey, timezone);
    // No aspect-window or natal calculations: this is a compact factual overview.
    var events = [].concat(D.phaseEventsRange(A, bounds), D.eclipseEventsRange(A, bounds),
      D.seasonEventsRange(A, bounds, month.startKey, month.endKey),
      D.ingressEvents(A, bounds).filter(function(e) { return e.body !== "moon"; }), D.stationEvents(A, bounds));
    events = events.filter(function(e) { return e.at >= bounds.start && e.at < bounds.end; }).sort(function(a, b) { return a.at - b.at; });
    events.forEach(function(e) {
      e.dateKey = D.dateKeyAt(new Date(e.at), timezone);
      if (e.kind === "phase") e.sign = D.signAt(D.longitudeById(A, e.phaseAngle === 180 ? "moon" : "sun", new Date(e.at)));
    });
    month.days.forEach(function(day) {
      day.phase = D.moonPhase(A, new Date(D.zonedLocalToUtc(day.key, "12:00", timezone)));
      day.events = events.filter(function(e) { return e.dateKey === day.key; });
    });
    month.events = events;
    month.bounds = bounds;
    return month;
  }
  function eventTitle(e, language) {
    if (language !== "en") return e.title;
    if (e.kind === "phase") return PHASE_EN[e.phaseAngle];
    if (e.kind === "season") return SEASON_EN[e.title] || "Seasonal threshold";
    if (e.kind === "ingress") return BODY_EN[e.body] + " enters " + SIGN_EN[e.to];
    if (e.kind === "station") return BODY_EN[e.body] + " stations " + (e.toDirect ? "direct" : "retrograde");
    var classification = {total:"Total", annular:"Annular", partial:"Partial", hybrid:"Hybrid", penumbral:"Penumbral"};
    return (classification[e.classification] || "") + (e.eclipseType === "solar" ? " solar eclipse" : " lunar eclipse");
  }
  function rhythmSegments(days, numbers) {
    var universal = null, personal = [];
    days.forEach(function(day) {
      var n = numbers(day.key), last = personal[personal.length - 1];
      if (universal == null) universal = n.universalMonth;
      if (n.personalMonth == null) return;
      if (last && last.value === n.personalMonth) last.to = day.number;
      else personal.push({value:n.personalMonth, from:day.number, to:day.number});
    });
    return {universal:universal, personal:personal};
  }
  function dayLink(key) { return "day.html?date=" + encodeURIComponent(key); }
  function disc(phase, size) {
    var r = size / 2 - 1, c = size / 2, rx = (r * Math.abs(1 - 2 * phase.illumination)).toFixed(3);
    var first = phase.waxing ? 1 : 0, second = phase.waxing ? (phase.illumination > .5 ? 1 : 0) : (phase.illumination > .5 ? 0 : 1);
    var path = "M " + c + ",1 A " + r + "," + r + " 0 0 " + first + " " + c + "," + (size - 1) + " A " + rx + "," + r + " 0 0 " + second + " " + c + ",1 Z";
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" aria-hidden="true"><circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="#171c28" stroke="#758091" stroke-opacity=".65"/><path d="' + path + '" fill="#dde5f2"/></svg>';
  }
  function mount(options) {
    var doc = options.document, root = doc.getElementById("month-panel");
    if (!root) return null;
    var el = function(id) { return doc.getElementById("month-" + id); };
    var requested = null;
    try {
      var params = new URL(options.location.href).searchParams;
      requested = parseMonth(params.get("month"));
      if (!requested && options.getContext().Day.parseDateKey(params.get("date"))) requested = parseMonth(params.get("date").slice(0, 7));
    } catch (e) {}
    var selected = requested, followCurrent = !requested, active = !options.IntersectionObserver, cache = new Map(), rendered = "";
    function remember() {
      try {
        var url = new URL(options.location.href);
        url.searchParams.set("month", selected);
        options.history.replaceState(null, "", url);
      } catch (e) {}
    }
    function refresh() {
      var ctx = options.getContext(), language = ctx.language === "en" ? "en" : "cs", text = COPY[language];
      var D = ctx.Day, A = ctx.Astronomy, timezone = ctx.timezone, today = D ? D.dateKeyAt(ctx.now, timezone) : "";
      if (!selected || followCurrent) selected = parseMonth(today.slice(0, 7));
      var current = selected === today.slice(0, 7), locale = language === "en" ? "en-GB" : "cs-CZ";
      el("kicker").textContent = text.kicker;
      el("nav").setAttribute("aria-label", language === "en" ? "Months" : "Měsíce");
      var label = selected ? new Intl.DateTimeFormat(locale, {timeZone:"UTC", month:"long", year:"numeric"}).format(new Date(selected + "-01T12:00:00Z")) : "—";
      el("title").textContent = label.charAt(0).toUpperCase() + label.slice(1);
      el("prev").setAttribute("aria-label", text.prev);
      el("next").setAttribute("aria-label", text.next);
      el("prev").disabled = !shiftMonth(selected, -1);
      el("next").disabled = !shiftMonth(selected, 1);
      el("current").textContent = text.current;
      el("current").disabled = current;
      el("timezone").textContent = timezone;
      el("status").textContent = text.loading;
      el("retry").textContent = text.retry;
      if (!active) return;
      try {
        var key = selected + "|" + timezone, month = cache.get(key);
        if (!month) {
          month = buildMonth(D, A, selected, timezone);
          cache.set(key, month);
          if (cache.size > 3) cache.delete(cache.keys().next().value);
        }
        var numbers = month.days.map(function(day) { return ctx.numbers(day.key); });
        var signature = key + "|" + language + "|" + today + "|" + JSON.stringify(numbers);
        if (signature === rendered) return;
        var rhythms = rhythmSegments(month.days, ctx.numbers);
        el("rhythms").innerHTML = '<div class="month-rhythm"><span>' + text.universal + '</span><b>' + esc(rhythms.universal) + '</b></div><div class="month-rhythm"><span>' + text.personal + '</span><div class="month-rhythm-values">' + (rhythms.personal.length ? rhythms.personal.map(function(segment) {
          return '<div><b>' + esc(segment.value) + '</b>' + (rhythms.personal.length > 1 ? '<small>' + segment.from + '.–' + segment.to + '.</small>' : '') + '</div>';
        }).join('<i aria-hidden="true">→</i>') : '<div><b>—</b><small>' + text.noProfile + '</small></div>') + '</div></div>';
        el("tradition").textContent = text.tradition;
        el("phases-label").textContent = text.phases;
        el("phases").innerHTML = month.events.filter(function(e) { return e.kind === "phase" && (e.phaseAngle === 0 || e.phaseAngle === 180); }).map(function(e) {
          var stamp = new Intl.DateTimeFormat(locale, {timeZone:timezone, day:"numeric", month:"short", hour:"2-digit", minute:"2-digit", hourCycle:"h23"}).format(new Date(e.at));
          var sign = D.SIGN_GLYPHS[e.sign.index] + " " + (language === "en" ? SIGN_EN[e.sign.index] : e.sign.name);
          return '<a class="month-phase" href="' + dayLink(e.dateKey) + '"><span class="month-phase-disc">' + disc({illumination:e.phaseAngle === 0 ? 0 : 1, waxing:true}, 28) + '</span><span><b>' + esc(eventTitle(e, language)) + '</b><time datetime="' + new Date(e.at).toISOString() + '">' + esc(stamp) + '</time><small>' + esc(sign) + '</small></span><i aria-hidden="true">↗</i></a>';
        }).join("");
        el("calendar").setAttribute("aria-label", text.calendar + " · " + label);
        el("weekdays").innerHTML = Array.from({length:7}, function(_, i) {
          var date = new Date(Date.UTC(2024, 0, 1 + i, 12));
          return '<span title="' + esc(new Intl.DateTimeFormat(locale, {timeZone:"UTC", weekday:"long"}).format(date)) + '">' + esc(new Intl.DateTimeFormat(locale, {timeZone:"UTC", weekday:"short"}).format(date)) + '</span>';
        }).join("");
        var cells = Array.from({length:month.offset}, function() { return '<span class="month-empty" aria-hidden="true"></span>'; });
        month.days.forEach(function(day, i) {
          var isToday = day.key === today, n = numbers[i], phase = language === "en" ? MOON_EN[day.phase.name] : day.phase.name;
          var dayLabel = new Intl.DateTimeFormat(locale, {timeZone:"UTC", weekday:"long", day:"numeric", month:"long", year:"numeric"}).format(new Date(day.key + "T12:00:00Z"));
          var description = dayLabel + (isToday ? " · " + text.today : "") + " · " + phase + " " + Math.round(day.phase.illumination * 100) + " % · " + text.dayU + " " + n.universalDay + (n.personalDay != null ? " · " + text.dayP + " " + n.personalDay : "");
          if (day.events.length) description += " · " + day.events.map(function(e) { return eventTitle(e, language); }).join(" · ");
          cells.push('<a class="month-day' + (isToday ? ' is-today' : '') + (day.events.length ? ' has-event' : '') + '" href="' + dayLink(day.key) + '" aria-label="' + esc(description) + '" title="' + esc(description) + '"' + (isToday ? ' aria-current="date"' : '') + '><span>' + day.number + '</span>' + disc(day.phase, 18) + '<i aria-hidden="true"></i></a>');
        });
        el("grid").innerHTML = cells.join("");
        el("legend").textContent = text.legend;
        el("events-title").textContent = text.events + " · " + month.events.length;
        el("events").innerHTML = month.events.map(function(e) {
          var stamp = new Intl.DateTimeFormat(locale, {timeZone:timezone, day:"numeric", month:"short", hour:"2-digit", minute:"2-digit", hourCycle:"h23"}).format(new Date(e.at));
          return '<a class="month-event" href="' + dayLink(e.dateKey) + '"><time datetime="' + new Date(e.at).toISOString() + '">' + esc(stamp) + '</time><span class="month-event-glyph" aria-hidden="true">' + esc(e.glyph) + '</span><span><b>' + esc(eventTitle(e, language)) + '</b><small>' + esc(text[e.kind]) + '</small></span><i aria-hidden="true">↗</i></a>';
        }).join("");
        el("river").href = "timeline.html?start=" + month.startKey + "&range=month&mode=simple";
        el("river").textContent = text.river;
        el("method").textContent = text.method;
        el("method-title").textContent = language === "en" ? "Calculation and tradition" : "Výpočet a tradice";
        el("body").hidden = false;
        el("status").hidden = true;
        el("retry").hidden = true;
        rendered = signature;
      } catch (e) {
        el("body").hidden = true;
        el("status").hidden = false;
        el("status").textContent = text.error;
        el("retry").hidden = false;
        rendered = "";
      }
    }
    function change(amount) {
      var next = shiftMonth(selected, amount);
      if (!next) return;
      selected = next; followCurrent = false; active = true; remember(); refresh();
    }
    el("prev").addEventListener("click", function() { change(-1); });
    el("next").addEventListener("click", function() { change(1); });
    el("current").addEventListener("click", function() { followCurrent = true; active = true; refresh(); remember(); });
    el("retry").addEventListener("click", function() { active = true; refresh(); });
    if (options.IntersectionObserver) {
      var observer = new options.IntersectionObserver(function(entries) {
        if (entries.some(function(entry) { return entry.isIntersecting; })) { active = true; observer.disconnect(); refresh(); }
      }, {rootMargin:"200px"});
      observer.observe(root);
    }
    refresh();
    return {refresh:refresh};
  }
  return {parseMonth:parseMonth, shiftMonth:shiftMonth, geometry:geometry, buildMonth:buildMonth, rhythmSegments:rhythmSegments, eventTitle:eventTitle, mount:mount};
});
