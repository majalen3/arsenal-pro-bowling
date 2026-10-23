// Field validators (DATA_SYSTEM §4). hard = reject; warn = keep but flag for the user. Sources in the spec.
export const RULES = {
  speed:    { unit: 'mph', hard: [0, 40], warn: [10, 24] },
  rev:      { unit: 'rpm', hard: [0, 1000], warn: [100, 650] },
  axisRotation: { unit: '°', hard: [0, 90] },
  axisTilt: { unit: '°', hard: [0, 90] },
  rg:       { unit: 'in', hard: [2.3, 2.9], warn: [2.447, 2.813] },
  diff:     { unit: 'in', hard: [0, 0.1], warn: [0, 0.060] },
  massBias: { unit: 'in', hard: [0, 0.1], warn: [0, 0.040] },
  grit:     { unit: 'grit', hard: [50, 5000] },
  patternFt:{ unit: 'ft', hard: [20, 60], warn: [30, 52] },
  volumeMl: { unit: 'mL', hard: [5, 60], warn: [10, 40] },
  board:    { unit: 'board', hard: [-5, 45], warn: [0, 39] },
  angle:    { unit: '°', hard: [-30, 30] },
  distanceFt: { unit: 'ft', hard: [0, 75] },
  seconds:  { unit: 's', hard: [0, 10] },
  pct:      { unit: '%', hard: [0, 100] },
  score:    { unit: 'pins', hard: [0, 300] },
};
// returns {ok, level:'ok'|'warn'|'error', msg}
export function check(field, v) {
  const r = RULES[field]; if (!r) return { ok: true, level: 'ok' };
  if (v == null || v === '') return { ok: true, level: 'ok', empty: true };
  const n = +v; if (!Number.isFinite(n)) return { ok: false, level: 'error', msg: `${field}: not a number` };
  if (n < r.hard[0] || n > r.hard[1]) return { ok: false, level: 'error', msg: `${field} ${n} outside ${r.hard[0]}–${r.hard[1]} ${r.unit}` };
  if (r.warn && (n < r.warn[0] || n > r.warn[1])) return { ok: true, level: 'warn', msg: `${field} ${n} is unusual (${r.warn[0]}–${r.warn[1]} ${r.unit} typical)` };
  return { ok: true, level: 'ok' };
}
// Unit conversion to canonical units (mph, ft, board).
export function toMph(v, unit) { const u = String(unit || 'mph').toLowerCase(); if (u === 'mph') return v; if (u === 'kph' || u === 'km/h') return v / 1.609344; if (u === 'm/s') return v * 2.2369363; return null; }
export function toFt(v, unit) { const u = String(unit || 'ft').toLowerCase(); if (u === 'ft') return v; if (u === 'm') return v * 3.2808399; return null; }
export const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
// Date: not more than one day in the future; ISO yyyy-mm-dd.
export function checkDate(s, now = Date.now()) {
  if (s == null) return { ok: true, level: 'ok', empty: true };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(Date.parse(s))) return { ok: false, level: 'error', msg: 'date not yyyy-mm-dd' };
  if (Date.parse(s) > now + 86400000) return { ok: false, level: 'error', msg: 'date is in the future' };
  return { ok: true, level: 'ok' };
}
export function checkFrames(frames) {
  for (let i = 0; i < Math.min(9, frames.length); i++) { const f = frames[i]; if (f.length === 2 && f[0] + f[1] > 10) return { ok: false, msg: `frame ${i + 1} sums over 10` }; }
  return { ok: true };
}
