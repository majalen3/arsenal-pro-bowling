// "Find my strike line" (TEAM_PROMPT_TARGETING.md §6). Grid-searches laydown × arrows target with the UNCHANGED engine, then
// scores the best candidates by Monte Carlo with the bowler's variability (measured where we have it, labelled assumed otherwise).
// Pocket window = entry board 17–18: USBC "I Left What Where?" (via National Bowling Academy): the entry board, regardless of
// angle, decides strike vs. leave; 17–18 → strike or single pin 70–85%. No strike % is shown: no cited carry curve by board+angle.
import { S, analyze } from '../engine.js';
import { specOK } from '../data.js';
import { presetFor } from './model.js';
import { arrowsBoard, aimFor, AIM_MAX } from './geom.js';
export const WINDOW = [17, 18], ANGLE_WIN = [4, 6];   // angle: the engine's strike rule (USBC: more entry angle carries better)
export const SRC = {
  window: { label: 'USBC "I Left What Where?" via National Bowling Academy', url: 'https://www.nationalbowlingacademy.com/post/aiming-for-the-pocket-why-didnt-i-strike' },
  drift:  { label: 'bowl.com: consistent = slide within 1\u20132 boards', url: 'https://bowl.com/dealing-with-drift' },
};
// Variability in boards / mph / rpm (1 SD). Arrows from LaneTrax "Arrows: Average Difference" (mean |miss|; SD = mean·√(π/2) for a normal miss).
export const ASSUMED = { arrows: 1.5, laydown: 1, speed: 0.5, rev: 20 };
export function spreadFrom(P) {
  const ag = (P && P.aggregates || []).filter(a => a.kpis && a.kpis.some(k => k.key === 'arrowsDifference' && Number.isFinite(+k.value)))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  const out = { arrows: { v: ASSUMED.arrows, src: 'assumed', label: 'assumed \u00b11.5 bds' },
    laydown: { v: ASSUMED.laydown, src: 'assumed', label: 'assumed \u00b11 bd (bowl.com: 1\u20132 boards is consistent)' },
    speed: { v: ASSUMED.speed, src: 'assumed', label: 'assumed \u00b10.5 mph' }, rev: { v: ASSUMED.rev, src: 'assumed', label: 'assumed \u00b120 rpm' } };
  if (ag) { const md = +ag.kpis.find(k => k.key === 'arrowsDifference').value;
    out.arrows = { v: +(md * Math.sqrt(Math.PI / 2)).toFixed(2), mean: md, src: 'device', n: ag.totalShots || null, date: ag.date, label: `LaneTrax \u00b1${md} bds avg miss${ag.totalShots ? `, n=${ag.totalShots}` : ''}` }; }
  return out;
}
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const gauss = r => { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
let ANG = true;   // false = board-only window (USBC: board decides, regardless of angle) when no line reaches 4–6°
const inWin = a => !!a && a.entryBoard >= WINDOW[0] && a.entryBoard <= WINDOW[1] && (!ANG || (a.angle >= ANGLE_WIN[0] && a.angle <= ANGLE_WIN[1]));
const r1 = v => Math.round(v * 10) / 10;
// one shot that crosses the arrows at board arr from laydown lay, through the engine's own geometry (geom.js). The model can launch
// only ±REACH (~0.8) board off the laydown; past that the rest of the arrows miss is applied as a parallel laydown shift so the
// ball still crosses the arrows exactly at arr (app estimate, DECISIONS #26). Replaces the v1 "aim = lay − arr" (1 board per unit).
function shot(cat, lay, arr, sp, rv) {
  const f = aimFor(lay, arr), rel = f.clamped ? lay + (arr - f.got) : lay;
  const a = analyze(cat, { speed: sp, rev: rv, release: rel, aim: f.aim }); return a.gutter ? null : a;
}
const AIMS = []; for (let x = -AIM_MAX; x <= AIM_MAX; x += 0.5) AIMS.push(x);
export function find(cat, { speed = 15, rev = 220, ft = 38, spread, n = 200, seed = 31, top = 10 } = {}) {
  if (!cat || !specOK(cat)) return { none: true, reason: 'spec TBD: no model line' };
  const sd = spread || spreadFrom(null), keep = { pattern: S.pattern, finish: S.finish, oil: S.oil }, preset = presetFor(ft), t0 = Date.now();
  try {
    S.pattern = preset; S.finish = 'factory'; S.oil = 1;
    const grid = [];
    for (let lay = 5; lay <= 30; lay++) for (const aim of AIMS) {   // the engine's whole launch range; arrows = its measured crossing
      const a = analyze(cat, { speed, rev, release: lay, aim }); if (!a.gutter) grid.push({ lay, arr: r1(arrowsBoard(lay, aim)), entry: a.entryBoard, angle: a.angle, bp: a.bpBoard, bpFt: a.bpFeet, a });
    }
    ANG = true; let cands = grid.filter(c => inWin(c.a));
    if (!cands.length) { ANG = false; cands = grid.filter(c => inWin(c.a)); }
    if (!cands.length) { ANG = true; return { none: true, reason: `No line enters boards 17\u201318 with this ball on the ${preset} preset at ${speed} mph, ${rev} rpm.`, preset }; }
    // one nominal line per laydown (closest to 17.5), then the `top` most central laydowns by nominal room
    const byLay = new Map(); for (const c of cands) { const b = byLay.get(c.lay); if (!b || Math.abs(c.entry - 17.5) < Math.abs(b.entry - 17.5)) byLay.set(c.lay, c); }
    // snap the target to a half board (aimable); keep it only if the snapped line is still in the window
    const pool = [...byLay.values()].map(c => { const arr = Math.round(c.arr * 2) / 2; if (arr === c.arr) return c; const a = shot(cat, c.lay, arr, speed, rev);
      return inWin(a) ? { lay: c.lay, arr, entry: a.entryBoard, angle: a.angle, bp: a.bpBoard, bpFt: a.bpFeet } : null; }).filter(Boolean);
    if (!pool.length) pool.push(...byLay.values());
    for (const c of pool) { c.room = room(cat, c, speed, rev); }
    pool.sort((a, b) => b.room - a.room); const pick = pool.slice(0, top);
    for (const c of pick) {
      const r = rng(seed); let hit = 0, angs = 0, k = 0;     // same seed per candidate: common random numbers, fair comparison
      for (let i = 0; i < n; i++) {
        const lay = c.lay + gauss(r) * sd.laydown.v, arr = c.arr + gauss(r) * sd.arrows.v, sp = speed + gauss(r) * sd.speed.v, rv = rev + gauss(r) * sd.rev.v;
        const a = shot(cat, lay, arr, sp, rv); if (inWin(a)) { hit++; angs += a.angle; k++; }
      }
      c.pocket = Math.round(hit / n * 100); c.angleAvg = k ? r1(angs / k) : null;
    }
    // best = max pocket %; within 3 points prefer more room (margin)
    pick.sort((a, b) => b.pocket - a.pocket || b.room - a.room);
    const top1 = pick[0], close = pick.filter(c => top1.pocket - c.pocket <= 3).sort((a, b) => b.room - a.room || b.pocket - a.pocket);
    const best = close[0];
    const others = pick.filter(c => c !== best && Math.abs(c.lay - best.lay) >= 2);
    const roomier = others.filter(c => c.room > best.room).sort((a, b) => b.pocket - a.pocket)[0];
    const alt = roomier ? Object.assign(roomier, { kind: 'room' }) : others[0] ? Object.assign(others[0], { kind: 'next' }) : null;
    const sens = sensAt(cat, best, speed, rev, sd);
    const angleWin = ANG; ANG = true;
    return { none: false, angleWin, best: fmt(best), alt: alt ? fmt(alt) : null, preset, n, seed, spread: sd, sens, ms: Date.now() - t0, tried: cands.length, scored: pick.length };
  } finally { ANG = true; Object.assign(S, keep); }
}
// miss room: how many boards at the arrows (either side, 0.5 steps) the shot can miss and still enter 17–18 (min of both sides)
function room(cat, c, speed, rev) {
  const side = d => { let k = 0; for (let m = 0.5; m <= 4; m += 0.5) { const a = shot(cat, c.lay, c.arr + d * m, speed, rev); if (!inWin(a)) break; k = m; } return k; };
  return Math.min(side(1), side(-1));
}
// which 1-SD miss moves the entry most (for the "why not higher" note)
function sensAt(cat, c, speed, rev, sd) {
  const d = (f, l) => { const a = shot(cat, ...f(1)), b = shot(cat, ...f(-1)); return { k: l, v: a && b ? r1(Math.abs(a.entryBoard - b.entryBoard) / 2) : 9 }; };
  const all = [d(s => [c.lay, c.arr + s * sd.arrows.v, speed, rev], 'arrows'), d(s => [c.lay + s * sd.laydown.v, c.arr, speed, rev], 'laydown'),
    d(s => [c.lay, c.arr, speed + s * sd.speed.v, rev], 'speed'), d(s => [c.lay, c.arr, speed, rev + s * sd.rev.v], 'rev')];
  return all.sort((a, b) => b.v - a.v);
}
const fmt = c => ({ kind: c.kind || 'best', lay: c.lay, arrows: c.arr, entry: r1(c.entry), angle: r1(c.angle), bp: c.bp == null ? null : r1(c.bp), bpFt: c.bpFt == null ? null : Math.round(c.bpFt), room: c.room, pocket: c.pocket, angleAvg: c.angleAvg });
// coach voice, numbers first. feet = laydown + ball offset − drift (Breakdown Bowling); dots = straight line laydown → arrows.
export function say(res, { offset = 7, drift = 0, mode = 'arrows' } = {}) {
  if (res.none) return { line: res.reason, alt: '', why: '' };
  const where = c => { const feet = Math.round(c.lay + offset - drift), eye = mode === 'dots' ? r1(c.lay + (c.arrows - c.lay) * 0.5) : c.arrows; return { feet, eye, txt: `Stand ${feet}, aim ${eye} at the ${mode}` }; };
  const b = where(res.best), a = res.alt && where(res.alt), sd = res.spread.arrows;
  const basis = sd.src === 'device' ? `your accuracy \u00b1${sd.mean} bds${sd.n ? `, n=${sd.n}` : ''}` : `assumed accuracy \u00b1${sd.v} bds, no LaneTrax import`;
  return {
    line: `${b.txt}. Pocket ${res.best.pocket}% (model estimate, ${basis}; ${res.n} simulated shots).`,
    window: res.angleWin ? 'Pocket = entry board 17\u201318 at 4\u20136\u00b0 (model angle, drawn units).' : `Pocket = entry board 17\u201318 only: no line reaches 4\u20136\u00b0 with this ball here (best ${res.best.angle}\u00b0).`,
    alt: a ? `${res.alt.kind === 'room' ? 'More room' : 'Next best'}: ${a.txt.charAt(0).toLowerCase() + a.txt.slice(1)}, ${res.alt.pocket}% (${res.alt.room ? `still in the window for a ${res.alt.room}-board miss at the arrows${res.alt.kind === 'room' ? `, vs ${res.best.room}` : ''}` : 'less room for a miss'}).` : '',
    why: (() => { const top = res.sens[0], W = { arrows: `a ${res.spread.arrows.v}-board miss at the arrows`, laydown: `a ${res.spread.laydown.v}-board laydown miss`, speed: `${res.spread.speed.v} mph of speed change`, rev: `${res.spread.rev.v} rpm of rev change` };
      return res.best.pocket >= 85 ? `High because this line keeps the entry in 17\u201318 ${res.angleWin ? ' at 4\u20136\u00b0' : ''} for a ${res.best.room}-board miss either way at the arrows.`
        : `Not higher mostly because ${W[top.k]} moves the entry about ${top.v} boards, and the window is 1 board wide.`; })(),
    feet: b.feet, eye: b.eye, altFeet: a ? a.feet : null, altEye: a ? a.eye : null,
  };
}
