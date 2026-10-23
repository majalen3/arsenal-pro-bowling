// Add a ball (docs/TEAM_PROMPT_ADD_BALL.md). Pure: search → maker lookup result → confirmed spec → engine card + grid.
// Never invents a value: every field is {v, prov}; a field nobody printed stays absent and the UI says "spec TBD".
// Engine = the unchanged 2-D simulatePath (via analyze / modelLine); cc3d stays off.
import { balls, coverKind, specOK } from '../data.js';
import { SPEC_ROWS, CATALOG_SRC } from '../data/spec_catalog.js';
import { norm } from '../data/match.js';
import { S, OIL_LEN, analyze } from '../engine.js';
import { modelLine, presetFor } from './model.js';
import { levelOf, angularity, rule31 } from './rank.js';
import { cellOfCat, overlaps, holes } from './bag.js';

export const BENCH_ID = 'rattler-big-bite';
// USBC Approved Ball List as read 10/20/2026 (ARSENAL_MANAGER_RESEARCH §7). Only exact or month-exact entries; ambiguous
// colourways (Ice Storm, Scout) are left out on purpose.
export const USBC_SRC = { kind: 'usbc', ref: 'USBC Approved Ball List', date: '2026-10-20' };
export const USBC = { 'rattler-big-bite': '2024-06-25', 'deadly-rattler': '2023-09-19', rattler: '2022-09-20', 'rattler-nu': '2024-05-28',
  'super-nova': '2022-08-02', 'hy-road': '2008-10', 'hy-road-pearl': '2013-05', 'hy-road-x': '2018-09-11', 'hy-road-40': '2025-05-06',
  astrophysix: '2019-05-07', 'guru-supreme': '2015-09', innovator: '2022-09-20', 'bigfoot-hybrid': '2022-10-18', trailblazer: '2021-09-21',
  'counter-attack': '2019-05-21' };
// Brands the server lookup can try (arsenal-pro-api lib/specfetch.js BRANDS). Motiv blocks automated reads (403).
export const LOOKUP_BRANDS = ['Storm', 'Roto Grip', '900 Global', 'Brunswick', 'Radical', 'DV8', 'Hammer', 'Ebonite', 'Track', 'Columbia 300'];
export const UNSUPPORTED = { Motiv: 'Motiv blocks automated reads; enter specs from the box or the maker page.' };
const BRAND_ALIAS = { rotogrip: 'Roto Grip', 'roto grip': 'Roto Grip', '900g': '900 Global', '900 global': '900 Global', columbia: 'Columbia 300',
  'columbia 300': 'Columbia 300', dv8: 'DV8', 'dv 8': 'DV8', strikeforce: 'KR Strikeforce', 'kr strikeforce': 'KR Strikeforce', 'kr': 'KR Strikeforce' };
const COND_OIL = { Heavy: ['heavy'], 'Medium-Heavy': ['heavy', 'medium'], Medium: ['medium'], 'Medium-Light': ['medium', 'light'], Light: ['light'], Dry: ['light'] };
const ENGINE_COVERS = ['Solid', 'Pearl', 'Hybrid', 'Urethane'];
const slug = s => norm(s).replace(/ /g, '-');
const APP_PROV = { kind: 'catalog', ref: 'app catalog (data.js)' };
const coverTypeOf = c => { const m = /\b(solid|pearl|hybrid|urethane|plastic|polyester)\b/i.exec(c || ''); if (!m) return null; const k = m[1].toLowerCase(); return k === 'polyester' ? 'Plastic' : k[0].toUpperCase() + k.slice(1); };
const F = (v, prov, note) => (v == null || v === '' ? undefined : Object.assign({ v, prov }, note ? { note } : {}));
const pack = o => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined));

// ---- Catalogue: app balls (data.js) first, then the derived third-party catalogue; app wins on a name clash.
function appEntry(b) {
  const p = APP_PROV, ct = coverKind(b);
  return { id: b.id, brand: b.brand, name: b.name, src: 'app', fields: pack({
    rg: F(b.rg, p), diff: F(b.diff, p), coverstock: F(b.coverName, p), coverType: F(ct, p), finish: F(b.finish, p), core: F(b.coreName, p),
    symmetry: F(b.core, p), year: F(b.year, p), usbc: F(USBC[b.id], USBC_SRC), oil: F(b.oil && b.oil.length ? b.oil.slice() : null, Object.assign({}, p, { ref: 'app oil tag' })) }) };
}
function rowEntry([brand, name, cond, cover, sym, rg, diff]) {
  const p = CATALOG_SRC, ct = coverTypeOf(cover);
  return { id: 'sc-' + slug(brand + ' ' + name), brand, name, src: 'catalog', fields: pack({
    rg: F(rg, p), diff: F(diff, p), coverType: F(ct, p, ct ? null : cover ? `catalogue says "${cover}" (type not stated)` : null),
    symmetry: F(sym, p), condition: F(cond, p), oil: F(COND_OIL[cond] ? COND_OIL[cond].slice() : null, Object.assign({}, p, { ref: 'catalogue condition' })) }),
    flag: /^storm$/i.test(brand) && /^mix\b/i.test(name) && /urethane/i.test(cover || '') ? 'Catalogue lists Urethane; confirm the cover on the maker page.' : null };
}
let LIST = null;
export function catalog() {
  if (LIST) return LIST;
  const app = balls.map(appEntry), seen = new Set(app.map(e => norm(e.brand + ' ' + e.name)));
  LIST = app.concat(SPEC_ROWS.map(rowEntry).filter(e => !seen.has(norm(e.brand + ' ' + e.name))));
  return LIST;
}
export const entryById = id => catalog().find(e => e.id === id) || null;

// ---- Search. Exact = one unambiguous alias; everything else is a ranked candidate the user must tap. Typo tolerant.
const ROMAN = { ii: '2', iii: '3', iv: '4', v: '5', vi: '6' };
const canon = s => norm(s).split(' ').map(t => ROMAN[t] || t).join(' ');
const squash = s => s.replace(/ /g, '');
function lev(a, b) { if (Math.abs(a.length - b.length) > 2) return 3; let p = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const c = [i]; for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[b.length]; }
const tokEq = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && lev(a, b) <= (Math.min(a.length, b.length) >= 7 ? 2 : 1));
function fuzzyDice(a, b) {
  const A = a.split(' ').filter(Boolean), B = b.split(' ').filter(Boolean), used = new Set(); let i = 0;
  for (const t of A) { const j = B.findIndex((u, k) => !used.has(k) && tokEq(t, u)); if (j >= 0) { used.add(j); i++; } }
  return i ? (2 * i) / (A.length + B.length) : 0;
}
export function detectBrand(input) {
  const n = norm(input); if (!n) return { brand: null, rest: '' };
  const brands = [...new Set(catalog().map(e => e.brand).concat(LOOKUP_BRANDS, Object.keys(UNSUPPORTED)))];
  const keys = brands.map(b => [norm(b), b]).concat(Object.entries(BRAND_ALIAS)).sort((x, y) => y[0].length - x[0].length);
  for (const [k, b] of keys) if (n === k || n.startsWith(k + ' ')) return { brand: b, rest: n.slice(k.length).trim() };
  return { brand: null, rest: n };
}
let IDX = null;
function index() {
  if (IDX) return IDX;
  const m = new Map(), put = (k, id) => { if (!k) return; const s = m.get(k) || new Set(); s.add(id); m.set(k, s); };
  for (const e of catalog()) { const n = canon(e.name), f = canon(e.brand + ' ' + e.name); put(n, e.id); put(f, e.id); put(squash(n), e.id); put(squash(f), e.id);
    if (n.startsWith('original ')) put(n.slice(9) + ' original', e.id); }
  return (IDX = m);
}
// → {query, brand, exact: entry|null, candidates:[{entry, score}]} (top 6, score ≥ 0.4).
export function search(input, { limit = 6 } = {}) {
  const q = canon(input), { brand, rest } = detectBrand(input), qr = canon(rest);
  if (!q) return { query: input, brand: null, exact: null, candidates: [] };
  const hit = index().get(q) || index().get(squash(q));
  if (hit && hit.size === 1) { const e = entryById([...hit][0]); return { query: input, brand: brand || e.brand, exact: e, candidates: [] }; }
  const c = catalog().map(e => {
    const n = canon(e.name), f = canon(e.brand + ' ' + e.name);
    // With a brand typed, only the model words count (the brand word alone must not make "Storm Phaze 2" look like "Ice Storm").
    const w = brand && qr ? qr : q;
    let s = brand && qr ? fuzzyDice(w, n) : Math.max(fuzzyDice(w, f), fuzzyDice(w, n));
    if (w.length >= 3 && (n.startsWith(w) || (!brand && f.startsWith(w)))) s = Math.max(s, 0.6 + 0.3 * w.length / n.length);
    else if (w.length >= 4 && n.includes(w)) s = Math.max(s, 0.6);
    if (brand && e.brand !== brand) s *= 0.6;
    return { entry: e, score: +s.toFixed(3) };
  }).filter(x => x.score >= 0.4).sort((a, b) => b.score - a.score || (a.entry.src === 'app' ? -1 : 1) || a.entry.name.localeCompare(b.entry.name)).slice(0, limit);
  return { query: input, brand, exact: null, candidates: c };
}

// ---- Maker lookup result (GET /api/spec-lookup) → fields with manufacturer provenance, for one ball weight.
export function oilFromCondition(txt) {
  const t = String(txt || '').toLowerCase(), o = [];
  if (/heavy/.test(t)) o.push('heavy'); if (/medium/.test(t)) o.push('medium'); if (/light|dry/.test(t)) o.push('light');
  return o.length && o.length < 3 ? o : null;
}
export function fromLookup(res, weight = 15) {
  if (!res || res.status !== 'found') return null;
  const src = res.source || {}, p = { kind: 'manufacturer', ref: src.host || 'maker page', url: src.url || null, date: (src.fetchedAt || '').slice(0, 10) || null };
  const d = Object.assign({}, p, { kind: 'derived', ref: 'read from the maker\u2019s wording' }), f = res.fields || {}, out = {};
  const put = (k, x) => { if (x && x.v != null && x.v !== '') out[k] = { v: x.v, prov: x.derived ? Object.assign({}, d, { ref: x.label }) : p }; };
  ['coverstock', 'finish', 'core', 'symmetry', 'releaseDate', 'condition'].forEach(k => put(k, f[k]));
  if (f.coverType) out.coverType = { v: coverTypeOf(f.coverType.v) || f.coverType.v, prov: f.coverType.derived ? Object.assign({}, d, { ref: f.coverType.label }) : p };
  const ws = res.weights || {}, row = ws[String(weight)], hw = res.headlineWeight;
  if (row) { for (const k of ['rg', 'diff', 'intDiff']) if (row[k] != null) out[k] = { v: row[k], prov: p, note: `${weight} lb` }; }
  if (!row || row.intDiff == null) for (const k of ['rg', 'diff', 'intDiff']) if (!out[k] && f[k] && f[k].v != null) {
    const note = hw == null ? 'weight not stated' : hw === weight ? `${hw} lb` : `${hw} lb value; ${weight} lb not printed`;
    out[k] = { v: f[k].v, prov: p, note }; if (hw != null && hw !== weight) out[k].weightMismatch = true;
  }
  if (out.condition) { const o = oilFromCondition(out.condition.v); if (o) out.oil = { v: o, prov: Object.assign({}, d, { ref: 'maker condition' }) }; }
  return { fields: out, weights: Object.keys(ws).map(Number).sort((a, b) => b - a), source: p, title: src.title || null };
}
// Maker wins; a catalogue value that disagrees is kept as a visible conflict, never silently dropped.
const NUM_TOL = { rg: 0.005, diff: 0.002, intDiff: 0.002 };
export function merge(base = {}, maker = {}) {
  const fields = Object.assign({}, base), conflicts = [];
  for (const [k, x] of Object.entries(maker)) {
    const b = base[k];
    if (b && b.v != null && k !== 'oil') {
      const differ = typeof x.v === 'number' && typeof b.v === 'number' ? Math.abs(x.v - b.v) > (NUM_TOL[k] || 0) : ['coverType', 'symmetry'].includes(k) && String(x.v) !== String(b.v);
      if (differ) conflicts.push({ field: k, maker: x.v, other: b.v, otherProv: b.prov, note: x.note || null });
    }
    fields[k] = x;
  }
  return { fields, conflicts };
}
// ---- Engine-ready catalog object (same shape data.js uses) + what's missing for a model run.
export function toCat(fields, { id, brand, name }) {
  const v = k => (fields[k] ? fields[k].v : null), ct = v('coverType');
  return { id, brand, name, rg: v('rg'), diff: v('diff'), cover: ct ? (ct === 'Urethane' || ct === 'Plastic' ? ct : ct + ' Reactive') : '', core: v('symmetry') || '',
    coreName: v('core') || null, coverName: v('coverstock') || null, finish: v('finish') || null, oil: v('oil') || [], added: true };
}
export function missing(fields) {
  const m = [];
  if (!fields.rg) m.push('RG'); if (!fields.diff) m.push('differential');
  if (!fields.coverType) m.push('cover type'); else if (!ENGINE_COVERS.includes(fields.coverType.v)) m.push(`${fields.coverType.v} cover (the 2-D model covers reactive and urethane only)`);
  if (!fields.symmetry) m.push('core symmetry');
  return m;
}
export const engineReady = fields => missing(fields).length === 0;

// ---- Engine comparison: new ball vs the benchmark at the SAME release (the benchmark's best line on tonight's pattern),
// plus the new ball's own best line. Engine state restored. Timed.
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
function readAt(cat, preset, line, ov) {
  const keep = { pattern: S.pattern, finish: S.finish, oil: S.oil };
  try { S.pattern = preset; S.finish = 'factory'; S.oil = 1; const a = analyze(cat, Object.assign({ release: line.feet, aim: line.aim }, ov));
    const ph = a.phases || {}; return { skid: r1(ph.skid), hook: r1(ph.hook), roll: r1(ph.rollLen), bpFt: a.bpFeet == null ? null : Math.round(a.bpFeet), bpBoard: a.bpBoard == null ? null : r1(a.bpBoard),
      entry: a.entryBoard == null ? null : r1(a.entryBoard), angle: a.angle == null ? null : r1(a.angle), strike: !!a.strike, call: a.call || '' };
  } finally { Object.assign(S, keep); }
}
const r1 = x => (x == null || isNaN(x) ? null : Math.round(x * 10) / 10);
export function compare(cat, { bench = balls.find(b => b.id === BENCH_ID), speed = 15, rev = 220, ft = 38, hand = 'right' } = {}) {
  const t0 = now(), preset = presetFor(ft), r31 = rule31(ft), ov = { speed, rev };
  if (!cat || !specOK(cat) || !ENGINE_COVERS.some(c => (cat.cover || '').includes(c))) return { none: true, reason: 'spec TBD: no engine run', ms: 0 };
  const benchLine = modelLine(bench, { speed, rev, ft, target31: r31.target });
  const line = benchLine.none ? { feet: 15, aim: -3, assumed: true } : benchLine;
  const a = readAt(cat, preset, line, ov), b = readAt(bench, preset, line, ov), own = modelLine(cat, { speed, rev, ft, target31: r31.target });
  const d = (x, y) => (x == null || y == null ? null : r1(x - y));
  const delta = { skid: d(a.skid, b.skid), hook: d(a.hook, b.hook), bpFt: d(a.bpFt, b.bpFt), bpBoard: d(a.bpBoard, b.bpBoard), angle: d(a.angle, b.angle) };
  return { none: false, preset, presetLen: OIL_LEN[preset], ft, hand, release: { feet: line.feet, aim: line.aim, target: line.target ?? null, speed, rev, assumedLine: !!line.assumed },
    ball: a, bench: b, benchName: bench.name, own, delta, coach: coachLine(cat.name, bench.name, a, delta, own), ms: Math.round((now() - t0) * 10) / 10 };
}
// Coach voice: ≤ 2 sentences, starts with a ball name.
export function coachLine(name, benchName, a, dl, own) {
  if (dl.skid == null) return `${name} has no model read on this line.`;
  const s = Math.abs(dl.skid) < 0.5 ? `about the same length as ${benchName}` : dl.skid > 0 ? `${Math.abs(dl.skid)} ft longer than ${benchName}` : `${Math.abs(dl.skid)} ft earlier than ${benchName}`;
  const ang = dl.angle == null || Math.abs(dl.angle) < 0.3 ? '' : dl.angle > 0 ? `, ${dl.angle}\u00b0 more entry angle` : `, ${Math.abs(dl.angle)}\u00b0 less entry angle`;
  const tail = own && !own.none ? ` Its own model line is ${own.feet} at the feet to ${own.target} at the arrows.` : ' No strike line in the model on this preset.';
  return `${name} reads ${s}${ang} on the same release.` + tail;
}
// ---- Bag placement: strength × shape cell, overlaps with owned balls, holes it fills or leaves.
export function placement(cat, items) {
  const cell = cellOfCat(cat), me = { ownedId: '__new', catalogId: cat.id, name: cat.name, cat };
  const ov = overlaps(items.concat([me])).filter(o => o.a === '__new' || o.b === '__new');
  const before = holes(items), after = holes(items.concat([me]));
  return { level: cell.level, shape: cell.shape, tbd: cell.tbd, overlaps: ov, fills: before.filter(x => !after.includes(x)), holesLeft: after, holesBefore: before,
    levelProv: levelOf(cat) == null ? null : (cat.oil && cat.oil.length ? 'oil tag' : null), angularity: angularity(cat) };
}
export function ownedEvent(cat, fields, { weight, src, entryId, conflicts = [] }) {
  return { catalogId: cat.id, name: `${cat.brand} ${cat.name}`.trim(), status: 'benched', note: null, added: true, weight: weight ?? null,
    spec: { cat, fields, src: src || null, entryId: entryId || null, conflicts: conflicts.map(c => ({ field: c.field, maker: c.maker, other: c.other })) } };
}
