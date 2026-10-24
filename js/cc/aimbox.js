// Aim Box: an optional overlay (default OFF) showing a target zone for the ball's breakpoint, drawn on every lane view.
// Boards are the bowler's own numbering (RH engine numbers are used as-is; the lane mirrors the drawing for lefties).
// House: Mark Baker's house-shot tape at 45 ft, boards 4.5 to 9.5 (Baker, fetched transcript, YouTube short 3rDOswCFlmk).
// Depth is 3 ft (secondary description of his poster, excerpt). Sport: the Rule of 31 board at oil length + 3 ft (Baker's
// spacing: 42 ft oil, tape at 45), with a shorter box of 3 boards by 2 ft (Human Kinetics break box, already cited in Targeting).
// That is a starting point, not a rule. See docs/DECISIONS.md "Aim Box".
import { OIL_LEN, xToBoard, yToFeet } from '../engine.js';
export const TIP = 'Optional visual target zone for the ball\u2019s breakpoint. Best used on house shots to help achieve optimal pocket entry angle.';
export const PRESETS = { house: 'House', sport: 'Sport', custom: 'Custom' };
export const HOUSE = { b1: 4.5, b2: 9.5, ft: 45, depth: 3 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// pref: { on, preset: 'house'|'sport'|'custom'|undefined, b1, b2, ft, depth }. Returns null when off (no drawing, no work).
// patLen: tonight's picked pattern length in ft when known (sim2 #2: a 48 ft Shark must give board 17, not the 45 ft preset's 14).
export function boxOf(pref, pattern, patLen) {
  const p = pref || {};
  if (!p.on) return null;
  const preset = p.preset || (pattern === 'house' ? 'house' : 'sport');
  if (preset === 'custom') {
    const b1 = clamp(+p.b1 || HOUSE.b1, 1, 38), b2 = clamp(+p.b2 || HOUSE.b2, b1 + 1, 39), ft = clamp(+p.ft || HOUSE.ft, 30, 55), depth = clamp(+p.depth || HOUSE.depth, 1, 6);
    return { preset, b1, b2, ft1: ft - depth / 2, ft2: ft + depth / 2, ft, depth, from: 'yours' };
  }
  if (preset === 'sport') {
    const len = Math.round(+patLen > 0 ? +patLen : (OIL_LEN[pattern] || 38)), c = len - 31, ft = len + 3;
    return { preset, b1: c - 1.5, b2: c + 1.5, ft1: ft - 1, ft2: ft + 1, ft, depth: 2, from: 'r31', len };
  }
  return { preset: 'house', b1: HOUSE.b1, b2: HOUSE.b2, ft1: HOUSE.ft - HOUSE.depth / 2, ft2: HOUSE.ft + HOUSE.depth / 2, ft: HOUSE.ft, depth: HOUSE.depth, from: 'baker' };
}
// Does the modelled path pass through the box? points are engine logical {x,y}; the path is sampled at every point inside
// the box's distance band, plus interpolated points at both band edges, so a sparse path can't skip over it.
export function through(box, points) {
  if (!box || !points || points.length < 2) return false;
  const inB = b => b >= box.b1 && b <= box.b2;
  for (let i = 1; i < points.length; i++) {
    const a = { b: xToBoard(points[i - 1].x), f: yToFeet(points[i - 1].y) }, c = { b: xToBoard(points[i].x), f: yToFeet(points[i].y) };
    if (a.f >= box.ft1 && a.f <= box.ft2 && inB(a.b)) return true;
    for (const edge of [box.ft1, box.ft2]) {
      if ((a.f - edge) * (c.f - edge) < 0) { const t = (edge - a.f) / (c.f - a.f); if (inB(a.b + t * (c.b - a.b))) return true; }
    }
  }
  const z = points[points.length - 1]; return yToFeet(z.y) >= box.ft1 && yToFeet(z.y) <= box.ft2 && inB(xToBoard(z.x));
}
// Screen rectangle from the lane's own mappers (bx already mirrors for lefties), so the box always sits on its boards.
export function rectOf(box, bx, fy) {
  const xa = bx(box.b1), xb = bx(box.b2), ya = fy(box.ft2), yb = fy(box.ft1);
  return { x: Math.min(xa, xb), y: Math.min(ya, yb), w: Math.abs(xb - xa), h: Math.abs(yb - ya) };
}
export const label = box => !box ? '' : `${box.b1}\u2013${box.b2} at ${box.ft1}\u2013${box.ft2} ft`;
export const source = box => !box ? '' : box.from === 'baker' ? 'Mark Baker\u2019s house-shot box (tape at 45 ft, boards 4.5\u20139.5).'
  : box.from === 'r31' ? `Starting point: Rule of 31 (${box.len} ft oil \u2212 31 = board ${box.len - 31}), 3 ft past the oil.` : 'Your box.';
