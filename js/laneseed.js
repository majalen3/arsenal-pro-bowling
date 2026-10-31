// The lane line for the ball on the lane, shared by Lane and Ball (clutter audit #4: one entry board for the same ball).
// The line the bowler kept for this ball if any (F01), else the model start from js/cc/line.js (the same line as Tonight
// and Targeting). Moved out of js/screens/lane.js unchanged so Ball reads the same stand → aim before Lane is opened.
import { S } from './engine.js';
import { app, prefs, setPrefs } from './store.js';
import { adjust, target } from './ctl.js';
import { proj } from './hub.js';
import { lineFor, keepLine } from './cc/line.js';
import { openNight } from './cc/night.js';
export const half2 = v => Math.round(v * 2) / 2;
export const lineSig = () => `${app.ball.id}|${S.release}|${S.aim}|${half2(target())}`;   // eyes too: the aim can pass the model's launch clamp
const ctxLine = () => { const P = proj() || {}, b = P.bowler || {}, v = f => { const x = f && typeof f === 'object' ? f.v : f; return x == null || x === '' || isNaN(+x) ? null : +x; };
  const sess = (P.sessions || {})[openNight(P) || ''] || {};
  return lineFor(app.ball, { speed: v(b.speed), rev: v(b.rev), ft: sess.ft != null ? +sess.ft : null }); };
// Returns true once seeded (a projection with owned balls exists).
export function seedLine() {
  const P = proj(); if (!P || !Object.keys(P.owned || {}).length) return false;
  const L = ctxLine();
  if (L.kept) { if (S.release !== L.ml.feet || half2(target()) !== L.ml.target) adjust({ release: L.ml.feet, target: L.ml.target }); }
  else {
    // No kept line: seed the model start only over an untouched line (first time from the engine start 12 / -4, later
    // only if still at our last seed, or a different ball). A restored v1 line the bowler picked is left alone.
    const ls = String(prefs().laneSeed || ''), parts = ls.split('|'), now2 = `${S.release}|${S.aim}`;
    const untouched = !ls ? now2 === '12|-4' : parts.length < 4 ? ls === now2 : parts[0] !== app.ball.id || ls === lineSig();
    if (!untouched || !L.stand) { setPrefs({ laneSeed: lineSig() }); return true; }
    if (S.release !== L.ml.feet || S.aim !== L.ml.aim) adjust({ release: L.ml.feet, aim: L.ml.aim });
  }
  setPrefs({ laneSeed: lineSig() });
  return true;
}
// A move on Lane (drag, steppers, miss buttons, a saved line) is kept for this ball.
export function keepMoved() { const ls = prefs().laneSeed; if (ls === lineSig()) return;
  keepLine(app.ball.id, { lay: S.release, eyes: half2(target()) }); setPrefs({ laneSeed: lineSig() }); }
