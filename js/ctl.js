// Control mutations shared by the lane, tune sheet, miss buttons and lines. Engine is untouched.
import { S, RANGES } from './engine.js';
import { app, saveState, emit, logShot, scheduleSync, prefs, setPrefs, profile } from './store.js';
import { balls } from './data.js';
import { arrowsBoard, aimFor, modelOf, clampBoard, half } from './cc/geom.js';
import * as HAND from './cc/hand.js';
const clamp = (k, v) => { const [lo, hi, st] = RANGES[k]; return +Math.max(lo, Math.min(hi, Math.round(v / st) * st)).toFixed(2); };
// Board the model's ball crosses at the arrows (15 ft), from the engine's own geometry (cc/geom.js, DECISIONS #26).
// Was release − aim ("1 board per aim unit", v1), ~10× too large. The model can reach only ±0.8 board off the laydown.
// app.eyes = the bowler's own aim at the arrows (½ boards, 1–39), independent of the stand (owner bug 2026-10-24). null = an
// older line that only has the model aim, read through the engine geometry.
export const target = () => app.eyes != null ? app.eyes : +arrowsBoard(+S.release, +S.aim).toFixed(1);
// Engine inputs for the bowler's line: the laydown is shifted only when the aim is beyond the model's launch reach (geom.modelOf).
export const modelIn = () => { if (app.eyes == null) return { release: +S.release, aim: +S.aim, clamped: false, shift: 0 }; return modelOf(+S.release, app.eyes); };
const lay = v => Math.round(clampBoard(v));
function setEyes(v) { app.eyes = half(clampBoard(v)); S.aim = clamp('aim', aimFor(+S.release, app.eyes).aim); }
export const snapshot = () => ({ ...S, ball: app.ball.id });
export function restore(s) { const b = balls.find(x => x.id === s.ball); if (b) app.ball = b; for (const k of Object.keys(S)) if (k in s) S[k] = s[k]; if ('eyes' in s) app.eyes = s.eyes; saveState(); emit('state', { animate:true }); }
export function adjust(ch, { animate = false } = {}) {
  const t0 = target();
  // Stand and aim are independent: moving the feet keeps the aim board, moving the aim keeps the feet (any combination 1–39).
  if ('release' in ch) { S.release = lay(ch.release); if (ch.keepTarget || app.eyes != null) setEyes(t0); }
  if ('target' in ch) setEyes(ch.target);
  if ('aim' in ch) { S.aim = clamp('aim', ch.aim); app.eyes = null; }
  for (const k of ['speed', 'rev', 'oil']) if (k in ch) S[k] = clamp(k, ch[k]);
  if ('finish' in ch) S.finish = ch.finish; if ('pattern' in ch) S.pattern = ch.pattern;
  saveState(); emit('state', { animate });
}
export function setBall(b) { if (!b || b.id === app.ball.id) return; const prev = app.ball.id; app.ball = b;
  setPrefs({ recent:[b.id, prev, ...(prefs().recent || []).filter(x => x !== b.id && x !== prev)].slice(0, 8) }); saveState(); emit('ball'); emit('state', { animate:true }); scheduleSync(); }
// One-tap miss moves. Left/Right: 2-and-1 toward the miss (bowl.com, NBA): feet 2 boards, target 1 board at the arrows, converted
// through the engine geometry (the model clamps at ±0.8 board off the laydown, so the target part is often at its limit).
// High/Light: +-0.5 mph (app choice, see docs/DECISIONS.md). Returns {before, label} for the undo toast.
export const MISSES = {
  left:  { label:'Left',  move:'Feet 2 left, eyes 1 left',  apply:() => ({ release:S.release + 2, target:target() + 1 }) },
  right: { label:'Right', move:'Feet 2 right, eyes 1 right', apply:() => ({ release:S.release - 2, target:target() - 1 }) },
  high:  { label:'High',  move:'Speed up 0.5 mph',           apply:() => ({ speed:S.speed + 0.5 }) },
  light: { label:'Light', move:'Slow down 0.5 mph',          apply:() => ({ speed:S.speed - 0.5 }) },
};
export function miss(kind) {
  // buttons are screen directions; on a lefty's mirrored lane a left miss is the model's right miss
  const lefty = HAND.isLefty(), mk = lefty && (kind === 'left' || kind === 'right') ? (kind === 'left' ? 'right' : 'left') : kind;
  const before = snapshot(), e0 = app.eyes, m = MISSES[kind]; const ch = MISSES[mk].apply();
  adjust(ch, { animate:true });
  const after = snapshot(); logShot(kind, before, after);
  const same = ['release','aim','speed'].every(k => before[k] === after[k]) && e0 === app.eyes;
  return { before: Object.assign({}, before, { eyes: e0 }), after, text: same ? `${m.label}: already at the limit` : m.move };
}
// Quick-switch strip: most recently used balls first, then the bowler's bag, then catalogue order (current ball excluded)
export function quickBalls(n = 5) {
  const p = profile(), own = p && Array.isArray(p.owned) ? p.owned : [], seen = new Set([app.ball.id]), out = [];
  for (const id of [...(prefs().recent || []), ...own, ...balls.map(b => b.id)]) {
    if (seen.has(id)) continue; const b = balls.find(x => x.id === id); if (!b) continue; seen.add(id); out.push(b); if (out.length >= n) break;
  }
  return out;
}
