// Compare views draw every ball's line finishing at the pocket (owner t122u). Drawing/target layer only: simulatePath and
// analyze() are unchanged; this only searches the inputs (aim, then feet) for each ball so its model line enters at board 17.5
// (1-3 for a right-hander; the lane mirrors for a left-hander), and cuts the drawn path at the head pin. Everything it derives
// is an estimate and is labelled as one.
import { analyze, HEAD_Y, RANGES, xToBoard } from '../engine.js';
export const POCKET = 17.5, TOL = 0.5;
const err = a => a && !a.gutter && a.entryBoard != null ? Math.abs(a.entryBoard - POCKET) : 99;
// The drawn path ends where the model line crosses the head-pin line (no wandering past it into the pit).
export function cutAtPins(a) {
  const pts = a.points || [], out = [];
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].y <= HEAD_Y && i) { const p = pts[i - 1], c = pts[i], f = (p.y - HEAD_Y) / (p.y - c.y); out.push({ ...c, x: p.x + (c.x - p.x) * f, y: HEAD_Y }); return Object.assign({}, a, { points: out }); }
    out.push(pts[i]);
  }
  return Object.assign({}, a, { points: out });
}
export function fitToPocket(ball, base = {}) {
  const at = ov => { const a = analyze(ball, ov); return { ov, a, e: err(a) }; };
  let best = at(base);
  if (best.e > TOL / 2) {
    const [lo, hi] = RANGES.aim, rels = [base.release];
    for (let d = 1; d <= 10; d++) rels.push(base.release + d, base.release - d);
    for (const release of rels) {
      if (release == null || release < RANGES.release[0] || release > RANGES.release[1]) continue;
      for (let aim = lo; aim <= hi; aim += 0.5) { const c = at({ ...base, release, aim }); if (c.e < best.e) best = c; }
      if (best.e <= TOL / 2) break;
    }
    for (let aim = best.ov.aim - 0.5; aim <= best.ov.aim + 0.5; aim += 0.1) { const c = at({ ...best.ov, aim: Math.round(aim * 10) / 10 }); if (c.e < best.e) best = c; }
  }
  const fitted = best.ov.release !== base.release || best.ov.aim !== base.aim;
  const end = cutAtPins(best.a), last = end.points[end.points.length - 1];
  return { result: end, ov: best.ov, fitted, ok: best.e <= TOL, endBoard: last ? xToBoard(last.x) : null, entryBoard: best.a.entryBoard };
}
