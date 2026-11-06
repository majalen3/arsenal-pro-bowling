// On-device usage counters + local feature flags (docs/PRODUCT_EVAL_1.md §10/§11, Now item 5, 2026-11-02).
// Nothing here leaves the phone. Counters and flags live in localStorage 'ap_ux', NOT in the IndexedDB event log: the sync
// outbox uploads every event and backup files carry the log, so a ux.* event there would leave the device (DECISIONS #ux).
// Data counts (nights, games, shots, balls...) are derived read-only from the existing event-log projection when the summary
// is built. Local tap windows retain an opaque owned-ball key for S2; summaries contain only counts/timestamps, never
// those keys, names, scores or free text. The bowler can read the
// summary on Me > Tests and usage, share it themselves through the phone's share sheet, or reset it.
// Pure core (node --test) + a small localStorage wrapper. Smoke tests: docs/SMOKE_TESTS.md.
export const KEY = 'ap_ux';
export const MAX_TAPS = 60;
// Flags and their defaults. A smoke test, when the tester turns it on, assigns an arm by this install's seed parity and
// overrides the flag; otherwise a flag set by hand on Me > Tests and usage wins; otherwise the default.
export const DEFAULTS = { laneView: 'summary', stepPreview: true, nextUp: false };
export const FLAGS = {
  laneView: { label: 'Lane: path summary line and model chips', values: ['summary', 'baseline'], names: { summary: 'Summary', baseline: 'Before' } },
  stepPreview: { label: 'Weaker/Stronger: next ball preview and feet/eyes-first hint', values: [true, false], names: { true: 'On', false: 'Off' } },
  nextUp: { label: 'Armory: one \u201cNext up\u201d line', values: [false, true], names: { false: 'Off', true: 'On' } },
};
// arms[0] = A, arms[1] = B. B is the change being tested.
export const TESTS = {
  s1: { flag: 'laneView', arms: ['baseline', 'summary'], title: 'S1 \u00b7 Lane screen variants' },
  s2: { flag: 'stepPreview', arms: [false, true], title: 'S2 \u00b7 Step-ladder preview' },
  s3: { flag: 'nextUp', arms: [false, true], title: 'S3 \u00b7 Badges + Next up line' },
};
const now0 = () => Date.now();
export function blank(seed) { return { v: 1, seed: seed || rid(), flags: {}, tests: {}, c: {}, taps: [] }; }
function rid() { try { if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {} return Date.now().toString(36) + Math.random().toString(36).slice(2); }
export function parse(str) {
  let s = null; try { s = JSON.parse(str); } catch (e) {}
  if (!s || typeof s !== 'object' || s.v !== 1) return blank();
  const b = blank(typeof s.seed === 'string' ? s.seed : undefined);
  for (const k of Object.keys(FLAGS)) if (s.flags && FLAGS[k].values.includes(s.flags[k])) b.flags[k] = s.flags[k];
  for (const k of Object.keys(TESTS)) if (s.tests && s.tests[k] && s.tests[k].on) b.tests[k] = { on: true, since: +s.tests[k].since || 0 };
  if (s.c && typeof s.c === 'object') for (const [k, x] of Object.entries(s.c)) if (/^[a-z0-9.\-]{1,48}$/.test(k) && x && Number.isFinite(+x.n)) b.c[k] = { n: +x.n, first: +x.first || 0, last: +x.last || 0 };
  if (Array.isArray(s.taps)) b.taps = s.taps.filter(t => t && Number.isFinite(+t.ts) && typeof t.ball === 'string').slice(-MAX_TAPS).map(t => ({ ts: +t.ts, ball: t.ball, dir: t.dir === 'stronger' ? 'stronger' : 'weaker', arm: t.arm === 'B' ? 'B' : t.arm === 'A' ? 'A' : null }));
  return b;
}
// 32-bit FNV-1a: stable arm per install and test (same phone, same arm, every time).
export function hash(str) { let x = 0x811c9dc5; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return x >>> 0; }
export function armOf(st, test) { return hash(st.seed + ':' + test) % 2 ? 'B' : 'A'; }
export function testFor(flag) { return Object.keys(TESTS).find(k => TESTS[k].flag === flag) || null; }
export function flagOf(st, name) {
  const t = testFor(name);
  if (t && st.tests[t] && st.tests[t].on) return TESTS[t].arms[armOf(st, t) === 'B' ? 1 : 0];
  return Object.prototype.hasOwnProperty.call(st.flags, name) ? st.flags[name] : DEFAULTS[name];
}
export function bump(st, name, now = now0()) {
  if (!/^[a-z0-9.\-]{1,48}$/.test(name)) return st;
  const x = st.c[name] || (st.c[name] = { n: 0, first: now, last: now }); x.n++; x.last = now; return st;
}
export function enroll(st, test, on, now = now0()) { if (!TESTS[test]) return st; if (on) st.tests[test] = { on: true, since: now }; else delete st.tests[test]; return st; }
// S2 follow-through: a Weaker/Stronger tap counts as "followed" when 3 first balls with that ball are logged within 3 hours.
export function followThrough(taps, shots, { need = 3, within = 3 * 3600e3 } = {}) {
  const out = { A: { taps: 0, followed: 0 }, B: { taps: 0, followed: 0 }, none: { taps: 0, followed: 0 } };
  for (const t of taps || []) {
    const n = (shots || []).filter(s => s.ballId === t.ball && (s.roll || 1) === 1 && s.ts > t.ts && s.ts <= t.ts + within).length;
    const o = out[t.arm || 'none']; o.taps++; if (n >= need) o.followed++;
  }
  return out;
}
// Counts from the event-log projection (read-only). Season night count is a plain count; it never resets for a missed week.
export function derived(P, now = now0()) {
  P = P || {}; const d = new Date(now), y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1, from = `${y}-08-01`;
  const sess = Object.values(P.sessions || {}), dayOf = s => s.date || (s.ts ? new Date(s.ts).toISOString().slice(0, 10) : '');
  const nights = new Set(sess.map(dayOf).filter(Boolean));
  return {
    nights: nights.size, seasonNights: [...nights].filter(x => x >= from).length,
    games: (P.games || []).length, firstBalls: (P.shots || []).filter(s => (s.roll || 1) === 1).length,
    balls: Object.keys(P.owned || {}).length, lines: Object.keys(P.lines || {}).length, surface: (P.surface || []).length,
    imports: Object.values(P.imports || {}).filter(x => !x.undone).length, measured: (P.aggregates || []).length + (P.measurements || []).length,
  };
}
// The summary the bowler may choose to share: counts only. Rounded day stamps, no ids.
export function summaryOf(st, P, { now = now0(), build = '' } = {}) {
  const day = t => t ? new Date(t).toISOString().slice(0, 10) : null, tests = {};
  for (const k of Object.keys(TESTS)) if (st.tests[k] && st.tests[k].on) tests[k] = { arm: armOf(st, k), since: day(st.tests[k].since) };
  const counts = {}; for (const [k, x] of Object.entries(st.c).sort()) counts[k] = { n: x.n, first: day(x.first), last: day(x.last) };
  const flags = {}; for (const k of Object.keys(FLAGS)) flags[k] = flagOf(st, k);
  return { what: 'Arsenal Pro usage summary (counts only, made on this phone)', made: day(now), build, tests, flags, counts,
    data: derived(P, now), s2: followThrough(st.taps, (P && P.shots) || []) };
}
// ---- browser wrapper (localStorage; in-memory if storage is blocked)
let mem = null;
const ls = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };
export function load() { if (mem) return mem; const L = ls(); let raw = null; try { raw = L && L.getItem(KEY); } catch (e) {} mem = parse(raw); if (!raw) save(); return mem; }
export function save() { const L = ls(); try { L && L.setItem(KEY, JSON.stringify(mem)); } catch (e) {} }
export function count(name) { try { bump(load(), name); save(); } catch (e) {} }
export function flag(name) { try { return flagOf(load(), name); } catch (e) { return DEFAULTS[name]; } }
export function setFlag(name, v) { const st = load(); if (!FLAGS[name] || !FLAGS[name].values.includes(v)) return; if (v === DEFAULTS[name]) delete st.flags[name]; else st.flags[name] = v; save(); }
export function setTest(test, on) { enroll(load(), test, on); save(); }
export function arm(test) { const st = load(); return st.tests[test] && st.tests[test].on ? armOf(st, test) : null; }
export function tap(ball, dir) { try { const st = load(); st.taps.push({ ts: Date.now(), ball: String(ball || ''), dir, arm: arm('s2') }); st.taps = st.taps.slice(-MAX_TAPS); bump(st, 'step.' + dir); save(); } catch (e) {} }
export function reset() { const st = load(); mem = blank(st.seed); save(); }
export function _resetMem() { mem = null; }
