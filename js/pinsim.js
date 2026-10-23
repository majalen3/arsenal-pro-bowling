// Pin-deck action: a labelled APPROXIMATION, top-down 2-D, after the method of Kickertz (UC Davis Biosport,
// "Pin-0.2 2D frictionless circles", impulse equations from Stronge, Impact Mechanics, 2000):
//   v0 = (V0 - V0')·n,  Vf = V0 - (m v0 / M)(1+e) n,  Vf' = V0' + (m v0 / M')(1+e) n,  m = M M'/(M+M').
// Inputs that come from USBC Equipment Specifications (2026 manual): pin weight target 3 lb 8 oz,
// pin coefficient of restitution target 0.670, pin max diameter 4.766 in, ball diameter 8.5 in.
// Assumptions (not from a source, stated in the UI): ball weight 15 lb, the pin COR is used for every
// impact, no friction, no ball spin/hook on the deck, no pin tipping or flight, no kickback/pit walls,
// and a pin counts as down once it is struck. Pure function of (entry board, entry angle); it does not
// change analyze() or simulatePath.
import { PINS, PIN_R, BALL_R, BOARD_IN, ROW, path } from './deck.js';
export const SIM = { ballLb:15, pinLb:3.5, e:0.670 };
const HALF = 41.5 / 2;
const cache = new Map();
export function simulate(entryBoard, angle, { ballLb = SIM.ballLb } = {}) {
  if (entryBoard == null) return null;
  const key = `${entryBoard}|${angle}|${ballLb}`; if (cache.has(key)) return cache.get(key);
  if (cache.size > 64) cache.clear();
  const out = run(entryBoard, angle, ballLb); cache.set(key, out); return out;
}
function run(entryBoard, angle, ballLb) {
  const p = path(entryBoard, angle), y0 = -14, PIT = 3 * ROW + 14;
  const B = [{ id:0, x:p.x0 + (y0 / p.dy) * p.dx, y:y0, vx:p.dx, vy:p.dy, r:BALL_R, m:ballLb, live:true, tr:[] }]
    .concat(PINS.map(q => ({ id:q.n, x:q.x, y:q.y, vx:0, vy:0, r:PIN_R, m:SIM.pinLb, live:true, tr:[], hit:null, at:null })));
  let last = 0; const ev = [], dt = 0.08, steps = 1400;            // ball travels 1 in per unit time; ~110 in of travel
  for (const b of B) b.tr.push([b.x, b.y, 0]);
  for (let k = 0; k < steps; k++) {
    for (const b of B) if (b.live) { b.x += b.vx * dt; b.y += b.vy * dt; if (Math.abs(b.x) > HALF + b.r || b.y > PIT) b.live = false; }
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
      const a = B[i], c = B[j]; if (!a.live && !c.live) continue;
      const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy), R = a.r + c.r; if (d >= R || d === 0) continue;
      const nx = dx / d, ny = dy / d, v0 = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;   // closing speed along n
      if (v0 <= 0) continue;
      const m = a.m * c.m / (a.m + c.m), J = m * v0 * (1 + SIM.e);
      a.vx -= J / a.m * nx; a.vy -= J / a.m * ny; c.vx += J / c.m * nx; c.vy += J / c.m * ny;
      const push = (R - d) / 2; a.x -= nx * push; a.y -= ny * push; c.x += nx * push; c.y += ny * push;
      for (const [s, o] of [[a, c], [c, a]]) if (s.id && !s.hit) { s.hit = o.id === 0 ? 'ball' : o.id; s.at = k; }
      ev.push({ k, a:a.id, b:c.id, x:a.x + nx * a.r, y:a.y + ny * a.r });
    }
    if (k % 3 === 0) for (const b of B) if (b.live && (b.vx || b.vy)) b.tr.push([b.x, b.y, k]);
    last = k;
    if (!B[0].live && B.slice(1).every(q => !q.live || (!q.vx && !q.vy))) break;
  }
  for (const b of B) if (b.vx || b.vy) b.tr.push([b.x, b.y, last]);
  const ball = B[0], pins = B.slice(1).map(q => ({ n:q.id, down:!!q.hit, by:q.hit, order:q.at, tr:q.tr }));
  // where the ball leaves the deck (crosses the 7-10 row) and its direction change from the entry line
  const ex = ball.tr.find(([, y]) => y >= 3 * ROW) || ball.tr[ball.tr.length - 1];
  const dir = Math.atan2(-ball.vx, ball.vy) * 180 / Math.PI;    // + = toward higher boards (left for a righty)
  const first = ev.length ? ev[0].k : null;
  return { first, end:last, ball:{ tr:ball.tr, exitX:ex[0], exitBoard:20 - ex[0] / BOARD_IN, deflect:+(dir - (angle || 0)).toFixed(1) }, pins, down:pins.filter(q => q.down).map(q => q.n), byBall:pins.filter(q => q.by === 'ball').map(q => q.n), events:ev };
}
