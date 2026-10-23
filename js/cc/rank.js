// Command Center decision core (COMMAND_CENTER_PLAN §2). Pure: no DOM, no storage. Every number it returns carries a
// source label so the screen can show it as a chip: F = fetched source, A = team rule (editable, never shown as fact).
import { balls, specOK, coverKind } from '../data.js';
export const SRC = {
  bowl: 'bowl.com (F)', motiv: 'Motiv (F)', btm: 'BTM (F)', storm: 'Storm (F)', br: "Bowler's Review (F)", usbc: 'USBC (F)',
  tag: 'app tag', spec: 'maker spec', team: 'team rule (A)', you: 'you reported', model: '2-D model estimate', assumed: 'assumed',
};
import { catOf } from './cats.js';
// ---- Step 3: ball strength 1-5 from the app oil tag (no manufacturer condition field is held for these balls).
const TAG_LEVEL = { heavy: 5, 'heavy/medium': 4, 'medium/heavy': 4, medium: 3, 'medium/light': 2, 'light/medium': 2, light: 1 };
export function levelOf(cat) {
  if (!cat || !Array.isArray(cat.oil) || !cat.oil.length) return null;
  const v = TAG_LEVEL[cat.oil.join('/')]; return v == null ? null : v;
}
const COVER_RANK = { Solid: 0, Hybrid: 1, Pearl: 2, Urethane: 3 };   // solid > hybrid > pearl > urethane (plan §2 step 3)
// Shape proxy, smooth (low) to angular (high). A: there is no maker shape spec for most balls.
export function angularity(cat) {
  if (!cat) return null;
  const c = coverKind(cat);
  return (c === 'Pearl' ? 2 : c === 'Hybrid' ? 1 : c === 'Solid' ? 0 : -1) + (cat.core === 'Asymmetric' ? 1 : 0) + (cat.diff != null && cat.diff >= 0.05 ? 1 : 0);
}
// ---- Step 1-2: condition demand 1-5.
export const bandOf = ft => (ft == null ? null : ft <= 36 ? 'short' : ft < 42 ? 'medium' : 'long');
export function tertiles(rows) {   // rows: pattern-index rows or {ml}; mL tertiles inside the library (data, not a magic number)
  const a = rows.map(r => (Array.isArray(r) ? r[5] : r.ml)).filter(x => typeof x === 'number' && x > 0).sort((x, y) => x - y);
  if (a.length < 3) return null;
  const q = p => a[Math.min(a.length - 1, Math.floor(p * a.length))];
  return [q(1 / 3), q(2 / 3)];
}
export const HOUSE_ASSUMED = { slug: null, name: 'House shot', ft: 38, ml: null, ratio: null, assumed: true };
export function demandOf({ pattern, tert = null, surface = 'unknown', stage = 'fresh' }) {
  const p = pattern || HOUSE_ASSUMED, why = [];
  const band = bandOf(p.ft), base = { short: 2, medium: 3, long: 4 }[band] || 3;
  why.push({ t: `${p.ft} ft = ${band} pattern \u2192 base ${base}`, src: p.assumed ? SRC.assumed : SRC.bowl });
  let vol = 0;
  if (p.ml != null && tert) { vol = p.ml < tert[0] ? -1 : p.ml > tert[1] ? 1 : 0; why.push({ t: `${p.ml} mL is ${vol < 0 ? 'low' : vol > 0 ? 'high' : 'mid'} volume for the library \u2192 ${vol >= 0 ? '+' : ''}${vol}`, src: SRC.team }); }
  else why.push({ t: 'Volume unknown \u2192 length only', src: p.assumed ? SRC.assumed : SRC.team });
  const surf = surface === 'wood' ? -1 : 0;
  why.push({ t: surface === 'wood' ? 'Wood lanes hook earlier \u2192 \u22121' : surface === 'synthetic' ? 'Synthetic lanes \u2192 0' : 'Lane surface unknown \u2192 0', src: surface === 'unknown' ? SRC.assumed : SRC.bowl });
  const stg = { fresh: 0, transition: -1, burn: -2 }[stage] ?? 0;
  if (stg) why.push({ t: `${stage === 'burn' ? 'Burn' : 'Transition'}: lanes break down, go weaker \u2192 ${stg}`, src: SRC.storm });
  const demand = Math.max(1, Math.min(5, base + vol + surf + stg));
  return { demand, base, vol, surf, stg, band, why, assumed: !!p.assumed };
}
// ---- Step 4-5: rank the strike balls in the bag (the spare ball is not ranked).
// bag: [{ ownedId, catalogId, name, benchmark, locked, finish }]. ctx: { demand, benchFirst: reason|null, style }.
export function rank(bag, { demand, benchFirst = null, style = 'tweener' }) {
  const items = bag.map(o => {
    const cat = catOf(o.catalogId), level = levelOf(cat), tbd = !cat || !specOK(cat);
    return { id: o.ownedId, catalogId: o.catalogId || null, name: o.name || (cat && cat.name) || 'Unknown ball', cat, level, tbd, benchmark: !!o.benchmark, locked: !!o.locked,
      dist: level == null ? 99 : Math.abs(level - demand), ang: angularity(cat), finish: o.finish || 'factory' };
  });
  const shapePen = it => !it.cat ? 1 : style === 'stroker' ? (it.cat.core === 'Asymmetric' ? 0 : 1) : style === 'cranker' ? (it.cat.core === 'Asymmetric' ? 1 : 0) : 0;
  const grit = f => (f === 'factory' || !f ? 2500 : f === 'polished' ? 5000 : +f);
  const key = it => [benchFirst && it.benchmark ? 0 : 1, it.dist, shapePen(it), it.cat ? COVER_RANK[coverKind(it.cat)] : 9, grit(it.finish),
    it.tbd ? 9 : it.cat.rg, it.tbd ? 0 : -it.cat.diff, it.name];
  const cmp = (a, b) => { const x = key(a), y = key(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1; return 0; };
  const order = items.slice().sort(cmp);
  for (const it of order) it.why = whyOf(it, { demand, benchFirst, style });
  const pick = order[0] || null;
  const alt = dir => (pick && pick.level != null ? order.filter(x => x !== pick && x.level != null && (dir < 0 ? x.level < pick.level : x.level > pick.level))
    .sort((a, b) => Math.abs(a.level - pick.level) - Math.abs(b.level - pick.level) || order.indexOf(a) - order.indexOf(b))[0] || null : null);
  return { order, pick, weaker: alt(-1), stronger: alt(1), demand, benchFirst };
}
function whyOf(it, { demand, benchFirst, style }) {
  const w = [];
  if (it.level == null) w.push({ t: 'No oil tag for this ball \u2192 not placed on the 1-5 scale', src: SRC.tag });
  else w.push({ t: `Level ${it.level} (${it.cat.oil.join('/')} oil) vs demand ${demand}`, src: SRC.tag });
  if (it.tbd) w.push({ t: 'spec TBD: ranked on tag only, no model line', src: SRC.spec });
  else w.push({ t: `${coverKind(it.cat)} \u00b7 ${it.cat.core.toLowerCase()} \u00b7 RG ${it.cat.rg} / diff ${it.cat.diff}`, src: SRC.spec });
  if (it.benchmark) w.push(benchFirst ? { t: `Benchmark first: ${benchFirst}`, src: SRC.motiv } : { t: 'Your benchmark', src: SRC.you });
  if (style !== 'tweener' && it.cat) w.push({ t: `${style === 'stroker' ? 'Stroker: asym preferred' : 'Cranker: sym preferred'} (${it.cat.core.toLowerCase()})`, src: SRC.br });
  return w;
}
export function benchFirstReason({ patternKnown, centerKnown, centerNew, tournamentFirstGame }) {
  if (!patternKnown) return 'pattern unknown';
  if (!centerKnown || centerNew) return 'new center';
  if (tournamentFirstGame) return 'first game of the block';
  return null;
}
// ---- Step 6: read buttons, one step each (Motiv benchmark logic).
export const READS = { early: 'Too early', weak: 'Too weak', angular: 'Too angular', smooth: 'Too smooth' };
export function readMove(r, curId, read) {
  const cur = r.order.find(x => x.id === curId) || r.pick; if (!cur || cur.level == null) return null;
  const others = r.order.filter(x => x !== cur && x.level != null), idx = x => r.order.indexOf(x);
  let c = [];
  if (read === 'early') c = others.filter(x => x.level < cur.level).sort((a, b) => b.level - a.level || idx(a) - idx(b));
  else if (read === 'weak') c = others.filter(x => x.level > cur.level).sort((a, b) => a.level - b.level || idx(a) - idx(b));
  else if (read === 'angular') c = others.filter(x => x.ang != null && x.ang < cur.ang && Math.abs(x.level - cur.level) <= 1).sort((a, b) => Math.abs(a.level - cur.level) - Math.abs(b.level - cur.level) || b.ang - a.ang || idx(a) - idx(b));
  else if (read === 'smooth') c = others.filter(x => x.ang != null && x.ang > cur.ang && Math.abs(x.level - cur.level) <= 1).sort((a, b) => Math.abs(a.level - cur.level) - Math.abs(b.level - cur.level) || a.ang - b.ang || idx(a) - idx(b));
  return c[0] || null;
}
// ---- Step 7: Rule of 31 from the real pattern length, with bowl.com's long-pattern band; both shown when they disagree.
export function rule31(ft) {
  const target = Math.round((ft - 31) * 10) / 10, out = { ft, target, band: null, conflict: false, src: SRC.bowl };
  if (ft >= 42) { out.band = [13, 16]; out.conflict = target < 13 || target > 16; }
  out.text = `Rule of 31: ${ft} ft \u2192 board ${target}` + (out.band ? (out.conflict ? `; long-pattern band says 13\u201316. Both shown.` : ` (inside the 13\u201316 long band)`) : '');
  return out;
}
// ---- Step 8: triggers (A, editable). shots: newest last, [{miss:'high'|'light'|..., read?}].
export const TRIGGERS = { window: 3, need: 2, readNeed: 2 };
export function trigger(shots, { hand = 'right', cfg = TRIGGERS } = {}) {
  const last = shots.slice(-cfg.window), n = k => last.filter(s => s.miss === k).length, rd = shots.slice(-cfg.window).filter(s => s.read === 'early').length;
  const L = hand === 'left';
  if (rd >= cfg.readNeed) return { kind: 'planB', text: `${rd} of ${last.length} read too early: go to Plan B (weaker ball).` };
  if (n('high') >= cfg.need) return { kind: 'move', dir: L ? 'right' : 'left', text: `${n('high')} of ${last.length} high: feet 2 ${L ? 'right' : 'left'}, eyes 1 ${L ? 'right' : 'left'}.` };
  if (n('light') >= cfg.need) return { kind: 'move', dir: L ? 'left' : 'right', text: `${n('light')} of ${last.length} light: feet 2 ${L ? 'left' : 'right'}, eyes 1 ${L ? 'left' : 'right'}, or go stronger.` };
  return null;
}
export function plan(r, line) {
  const weaker = r.pick ? r.order.filter(x => x !== r.pick && x.level != null && r.pick.level != null && x.level < r.pick.level).sort((a, b) => b.level - a.level || r.order.indexOf(a) - r.order.indexOf(b)) : [];
  return { A: r.pick, line, B: weaker[0] || null, C: weaker[1] || null };
}
// ---- 3-6-9 (USBC PDF, F): same target, feet move N boards from your strike position. Boards are counted from your
// own gutter (right for RH, left for LH), so the board numbers mirror while the physical move is the same: left-side
// pins (2/8, 4, 7) move you right, right-side pins (3/9, 6, 10) move you left.
const D369 = [['1 or 5', 0], ['2 or 8', -3], ['4', -6], ['7', -9], ['3 or 9', 3], ['6', 6], ['10', 9]];
export const KEY_OF = { 1: '1 or 5', 5: '1 or 5', 2: '2 or 8', 8: '2 or 8', 4: '4', 7: '7', 3: '3 or 9', 9: '3 or 9', 6: '6', 10: '10' };
export function spares(strike = 20, hand = 'right') {
  const s = hand === 'left' ? -1 : 1;
  return D369.map(([pin, d]) => ({ pin, board: strike + s * d, move: d === 0 ? 'none' : `${Math.abs(d)} ${d < 0 ? 'right' : 'left'}` }));
}
export const spareFor = (pin, strike = 20, hand = 'right') => spares(strike, hand).find(x => x.pin === KEY_OF[pin]);
