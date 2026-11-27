/*
 * Orloj · Observatory 3D — shared astronomical data adapter.
 * The Astronomy Engine instance is supplied by the host; no fallback ephemeris.
 * Frame: true ecliptic of date (ECT), mapped to world (x, z, -y), in a
 * right-handed, Y-up system. Body vectors are unit directions from Earth's centre.
 * References: https://github.com/cosinekitty/astronomy/tree/master/source/js
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.OrlojObservatoryData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DAY = 86400000;
  var RAD = Math.PI / 180;
  var MIN_TIME = Date.UTC(1900, 0, 1);
  var MAX_TIME = Date.UTC(2101, 0, 1);
  // This is only the duration of a sampled trajectory, not an orbit formula.
  var ORBIT_WINDOW_DAYS = 27.321661;
  var PHASE_NAMES = [
    "Nov", "Dorůstající srpek", "První čtvrť", "Dorůstající Měsíc",
    "Úplněk", "Couvající Měsíc", "Poslední čtvrť", "Couvající srpek"
  ];
  var PHASES = [
    { angle: 0, name: "Nov" },
    { angle: 90, name: "První čtvrť" },
    { angle: 180, name: "Úplněk" },
    { angle: 270, name: "Poslední čtvrť" }
  ];
  var SEASONS = [
    { key: "mar_equinox", name: "Jarní rovnodennost", longitude: 0 },
    { key: "jun_solstice", name: "Letní slunovrat", longitude: 90 },
    { key: "sep_equinox", name: "Podzimní rovnodennost", longitude: 180 },
    { key: "dec_solstice", name: "Zimní slunovrat", longitude: 270 }
  ];

  function requireEngine(A, methods) {
    if (!A) throw new Error("Astronomický modul Astronomy Engine není dostupný.");
    methods.forEach(function (name) {
      if (typeof A[name] !== "function") {
        throw new Error("Astronomy Engine neposkytuje funkci " + name + ".");
      }
    });
  }

  function checkedDate(value) {
    if (!(value instanceof Date) && typeof value !== "number" && typeof value !== "string") {
      throw new RangeError("Zadej platný okamžik v letech 1900–2100.");
    }
    // Date.parse alone silently rolls invalid civil dates into the next month.
    // Date-time strings must include an explicit timezone; a date key means UTC.
    if (typeof value === "string") {
      var parts = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/);
      if (!parts) throw new RangeError("Datum musí být platný ISO okamžik s časovým pásmem.");
      var civil = new Date(Date.UTC(+parts[1], +parts[2] - 1, +parts[3]));
      if (civil.getUTCFullYear() !== +parts[1] || civil.getUTCMonth() !== +parts[2] - 1 ||
          civil.getUTCDate() !== +parts[3] || (parts[4] !== undefined &&
          (+parts[4] > 23 || +parts[5] > 59 || +(parts[6] || 0) > 59))) {
        throw new RangeError("Datum nebo čas neexistuje.");
      }
    }
    var date = new Date(value instanceof Date ? value.getTime() : value);
    var timestamp = date.getTime();
    if (!Number.isFinite(timestamp) || timestamp < MIN_TIME || timestamp >= MAX_TIME) {
      throw new RangeError("3D observatoř podporuje data od 1. 1. 1900 do 31. 12. 2100.");
    }
    return date;
  }

  function rev(angle) { return ((angle % 360) + 360) % 360; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function norm(v) { return Math.hypot(v[0], v[1], v[2]); }
  function unit(v) {
    var length = norm(v);
    if (!Number.isFinite(length) || length === 0) throw new Error("Neplatný astronomický vektor.");
    return [v[0] / length, v[1] / length, v[2] / length];
  }
  function world(v) { return [v.x, v.z, -v.y]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }

  function earthBasis(A, date) {
    var time = A.MakeTime(date);
    var theta = A.SiderealTime(time) * 15 * RAD;
    var rotation = A.Rotation_EQD_ECT(time);
    var greenwich = new A.Vector(Math.cos(theta), Math.sin(theta), 0, time);
    var north = new A.Vector(0, 0, 1, time);
    var x = unit(world(A.RotateVector(rotation, greenwich)));
    var y = unit(world(A.RotateVector(rotation, north)));
    // Local +Z points west, so x/y/z is right-handed. A geographical point is
    // [cos(lat)*cos(lon), sin(lat), -cos(lat)*sin(lon)] before this basis.
    var z = unit(cross(x, y));
    return { basis: { x: x, y: y, z: z }, tilt: Math.acos(clamp(y[1], -1, 1)) / RAD };
  }

  function compute(A, inputDate) {
    var date = checkedDate(inputDate);
    requireEngine(A, ["GeoVector", "GeoMoon", "Ecliptic", "Illumination", "MoonPhase", "MakeTime", "SiderealTime", "Rotation_EQD_ECT", "RotateVector", "Vector"]);
    var sunEcliptic = A.Ecliptic(A.GeoVector("Sun", date, true));
    var moonEcliptic = A.Ecliptic(A.GeoMoon(date));
    var sunRaw = world(sunEcliptic.vec);
    var moonRaw = world(moonEcliptic.vec);
    var light = A.Illumination("Moon", date);
    var cycleAngle = rev(A.MoonPhase(date));
    return {
      date: date,
      timestamp: date.getTime(),
      sun: {
        vector: unit(sunRaw),
        distanceAU: norm(sunRaw),
        longitude: rev(sunEcliptic.elon)
      },
      moon: {
        vector: unit(moonRaw),
        distanceKm: norm(moonRaw) * A.KM_PER_AU,
        longitude: rev(moonEcliptic.elon),
        latitude: moonEcliptic.elat,
        // Cycle angle: 0 new, 90 first quarter, 180 full, 270 last quarter.
        // It is not the Sun–Moon–Earth physical incidence angle below.
        phaseAngle: cycleAngle,
        incidenceAngle: light.phase_angle,
        illumination: clamp(light.phase_fraction, 0, 1),
        phaseName: PHASE_NAMES[Math.floor((cycleAngle + 22.5) / 45) % 8],
        waxing: cycleAngle < 180
      },
      earth: earthBasis(A, date)
    };
  }

  function nextPhases(A, inputDate) {
    var date = checkedDate(inputDate);
    requireEngine(A, ["SearchMoonPhase"]);
    var start = date.getTime() + 1000;
    if (start >= MAX_TIME) return [];
    var days = Math.min(32, (MAX_TIME - start - 1) / DAY);
    var result = [];
    PHASES.forEach(function (phase) {
      var found = A.SearchMoonPhase(phase.angle, new Date(start), days);
      if (found && found.date.getTime() < MAX_TIME) {
        result.push({ angle: phase.angle, name: phase.name, at: found.date.getTime() });
      }
    });
    return result.sort(function (a, b) { return a.at - b.at; });
  }

  function lunarOrbit(A, inputDate, samples) {
    var date = checkedDate(inputDate);
    requireEngine(A, ["GeoMoon", "Rotation_EQJ_ECT", "RotateVector"]);
    samples = samples === undefined ? 120 : samples;
    if (!Number.isInteger(samples) || samples < 16 || samples > 720) {
      throw new RangeError("Počet vzorků dráhy musí být celé číslo od 16 do 720.");
    }
    var current = A.GeoMoon(date);
    var distance = Math.hypot(current.x, current.y, current.z);
    var rotation = A.Rotation_EQJ_ECT(date);
    var start = date.getTime();
    var span = Math.min(ORBIT_WINDOW_DAYS * DAY, MAX_TIME - 1 - start);
    var points = [];
    for (var index = 0; index < samples; index += 1) {
      var sampleDate = new Date(start + span * index / (samples - 1));
      var sample = world(A.RotateVector(rotation, A.GeoMoon(sampleDate)));
      points.push([sample[0] / distance, sample[1] / distance, sample[2] / distance]);
    }
    // Real sampled trajectory: deliberately not forced into a closed circle.
    // The trajectory is shortened near the upper supported date boundary.
    return points;
  }

  function seasons(A, year) {
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      throw new RangeError("Roční období jsou dostupná pro roky 1900–2100.");
    }
    requireEngine(A, ["Seasons"]);
    var data = A.Seasons(year);
    return SEASONS.map(function (season) {
      return { name: season.name, at: data[season.key].date.getTime(), longitude: season.longitude };
    });
  }

  return {
    compute: compute,
    nextPhases: nextPhases,
    lunarOrbit: lunarOrbit,
    seasons: seasons,
    MIN_TIME: MIN_TIME,
    MAX_TIME: MAX_TIME,
    ORBIT_WINDOW_DAYS: ORBIT_WINDOW_DAYS
  };
});
