/* Mean precession geometry. Runtime uses the versioned ERFA-derived data bundle.
 * No daily ephemeris, astrological-age definition, or personal data dependency. */
(function (root) {
  'use strict';
  const RAD = Math.PI / 180;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
  const mul = (a, s) => a.map(v => v * s);
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const norm = a => mul(a, 1 / Math.hypot(...a));
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const wrap = x => ((x % 360) + 360) % 360;
  const zodiac = ['Ari','Tau','Gem','Cnc','Leo','Vir','Lib','Sco','Sgr','Cap','Aqr','Psc'];

  // Julian epoch, not a fractional civil calendar year. For the Nyní button, UTC is
  // sufficient at this display precision. This conversion does not model
  // historical or future TT−UTC, nor leap seconds.
  function julianEpoch(date) {
    const ms = date.getTime();
    if (!Number.isFinite(ms)) throw RangeError('Neplatné datum modelu.');
    return 2000 + (ms - 946728000000) / (365.25 * 86400000);
  }
  function create(data) {
    const minimum = data.samples[0][0], maximum = data.samples.at(-1)[0];
    function validateYear(year) {
      if (!Number.isFinite(year) || year < minimum || year > maximum)
        throw RangeError('Rok je mimo rozsah modelu.');
    }
    function bracket(rows, year) {
      let lo = 0, hi = rows.length - 1;
      if (year <= rows[lo][0]) return [lo, lo, 0];
      if (year >= rows[hi][0]) return [hi, hi, 0];
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (rows[mid][0] <= year) lo = mid; else hi = mid;
      }
      return [lo, hi, (year - rows[lo][0]) / (rows[hi][0] - rows[lo][0])];
    }
    function sample(year) {
      validateYear(year);
      const [lo, hi, t] = bracket(data.samples, year);
      const a = data.samples[lo], b = data.samples[hi];
      const q = norm(mix(a.slice(1,4), b.slice(1,4), t));
      const n = norm(mix(a.slice(4,7), b.slice(4,7), t));
      const e = norm(mix(a.slice(7,10), b.slice(7,10), t));
      const bx = norm(add([1,0,0], mul(e, -e[0]))), by = norm(cross(e, bx));
      return {q, n, e, bx, by, obl: Math.acos(clamp(dot(n, e), -1, 1)) / RAD};
    }
    function iauCode(year) {
      validateYear(year);
      let code = data.firstCode;
      for (const row of data.crossings) {
        if (year >= row[0]) code = row[2]; else break;
      }
      return code;
    }
    function iauSegments(year) {
      validateYear(year);
      const [lo, hi, t] = bracket(data.dynamic, year);
      const a = data.dynamic[lo][1], b = data.dynamic[hi][1];
      // At a topology change, keep an actual sampled partition. Never blend
      // differently named regions or lose a narrow constellation interval.
      const same = a.length === b.length && a.every((v,i) => v[1] === b[i][1]);
      return same ? a.map((v,i) => [v[0] + (b[i][0] - v[0]) * t, data.codes[v[1]]])
        : (t < .5 ? a : b).map(v => [v[0], data.codes[v[1]]]);
    }
    const angle = (v, m) => wrap(Math.atan2(dot(v, m.by), dot(v, m.bx)) / RAD);
    function anchor(m, offset = 0) {
      if (!Number.isFinite(offset) || Math.abs(offset) > 5) throw RangeError('Posun hranic musí být −5° až +5°.');
      return wrap(angle(data.spica, m) - 180 + offset);
    }
    function region(year, mode = 'iau', offset = 0) {
      if (mode === 'iau') return iauCode(year);
      if (mode !== 'equal') throw RangeError('Neznámý model hranic.');
      const m = sample(year);
      return zodiac[Math.floor(wrap(angle(m.q, m) - anchor(m, offset)) / 30) % 12];
    }
    function boundary(mode = 'iau', offset = 0) {
      if (mode === 'iau') return data.crossing;
      if (mode !== 'equal') throw RangeError('Neznámý model hranic.');
      let lo = 1200, hi = 4000;
      for (let i = 0; i < 36; i++) {
        const y = (lo + hi) / 2, m = sample(y);
        const f = wrap(angle(m.q, m) - anchor(m, offset) - 330 + 180) - 180;
        if (f > 0) lo = y; else hi = y;
      }
      return (lo + hi) / 2;
    }
    return {minimum, maximum, sample, iauCode, iauSegments, angle, anchor, region, boundary};
  }
  const api = {create, julianEpoch};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.OrlojPrecession = api;
})(typeof window === 'undefined' ? globalThis : window);
