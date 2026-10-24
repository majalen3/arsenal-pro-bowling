// Targeting core (TEAM_PROMPT_TARGETING.md). Pure: feet/drift/eyes → laydown → the UNCHANGED engine (analyze → simulatePath)
// → break-box check + pocket call + one cited, engine-verified move. Boards are always the bowler's own numbering
// (1 = their outside edge); only the words left/right flip for a left-hander. Engine global state is restored after every call.
import { S, OIL_LEN, analyze } from '../engine.js';
import { specOK } from '../data.js';
import { modelLine, presetFor } from './model.js';
import { rule31 } from './rank.js';

export const SRC = {   // all "search excerpt" (2026-10-24); see docs/TEAM_PROMPT_TARGETING.md §2
  offset: { label: 'Breakdown Bowling', url: 'https://www.breakdownbowling.com/targeting-with-a-bowling-line/', note: 'release ~6\u20137 boards from the ankle; stand = laydown + 7 \u2212 2 (drift left) in their example' },
  hk:     { label: 'Human Kinetics (Rule of 31)', url: 'https://us.humankinetics.com/blogs/excerpt/determining-the-breakpoint-using-the-rule-of-31', note: '"about a three-board area to hit at the breakpoint"; flatter patterns: high = breakpoint missed inside' },
  nba:    { label: 'National Bowling Academy', url: 'https://www.nationalbowlingacademy.com/post/understanding-the-house-shot', note: 'house shot breakpoint 8\u201310 board, 39\u201341 ft; high \u2192 feet 2 left, eyes 1 left; parallel 2 and 2' },
  bowl:   { label: 'bowl.com (USBC)', url: 'https://bowl.com/making-in-game-adjustments', note: 'move in the direction of the miss; 2-and-1 angular move' },
  btm:    { label: 'Bowling This Month', url: 'https://www.bowlingthismonth.com/bowling-tips/the-fundamentals-of-target-line-adjustments/', note: 'feet toward the miss and/or target opposite; 6-board ball-to-foot example' },
  community: { label: 'r/Bowling (community, not official)', url: 'https://www.reddit.com/r/Bowling/comments/11gnv9z/what_does_2_and_1_mean/', note: '"Any number can be subbed in, e.g. 3 and 1, 4 and 2"' },
};
// Cited move families, smallest first. feet/eyes in boards; direction is chosen by the engine check (both are tried).
export const MOVES = [
  { id: 'p1',  feet: 1, eyes: 1, rule: 'parallel 1', src: 'nba' },
  { id: '21',  feet: 2, eyes: 1, rule: '2-and-1', src: 'bowl' },
  { id: 'p2',  feet: 2, eyes: 2, rule: 'parallel 2', src: 'nba' },
  { id: '31',  feet: 3, eyes: 1, rule: '3-and-1', src: 'community' },
  { id: '42',  feet: 4, eyes: 2, rule: '4-and-2', src: 'community' },
];
export const DEFAULTS = { feet: 17, drift: 0, offset: 7, mode: 'arrows', eyes: 17, bpBoard: null, bpFt: null };
export const POCKET = 17.5, POCKET_TOL = 0.7, ANGLE = [4, 6];   // engine strike window (analyze), unchanged
export const BOX_HALF_BOARDS = 1.5, BOX_HALF_FT = 1;             // 3-board area (HK, NBA 8–10) × 39–41 ft span (NBA)
export const ARROWS_FT = 15, DOTS_FT = 7.5;

const r1 = v => Math.round(v * 10) / 10;
export const laydownOf = t => t.feet - t.offset + t.drift;                        // drift + = toward higher boards (RH: left)
export const arrowsOf = (t, lay = laydownOf(t)) => t.mode === 'dots' ? lay + (t.eyes - lay) * (ARROWS_FT / DOTS_FT) : t.eyes;  // straight line laydown → dots, extended to the arrows
export const aimDegOf = (lay, arrows) => lay - arrows;                            // app v1 rule (ctl.target): 1 board per aim unit
export const dirWord = (boards, lefty) => (boards > 0) === !lefty ? 'left' : 'right';   // + boards = left for RH, right for LH

// Break box: centred on tonight's model strike line for this ball (or the user's own target), 3 boards × 2 ft.
export function boxFor(cat, ctx, t = {}) {
  const r31 = rule31(ctx.ft);
  if (t.bpBoard != null && t.bpFt != null) return { board: t.bpBoard, ft: t.bpFt, from: 'yours', r31 };
  const ml = modelLine(cat, { speed: ctx.speed, rev: ctx.rev, ft: ctx.ft, finish: 'factory', target31: r31.target });
  if (ml.none || ml.bp == null) return { board: r31.target, ft: ctx.ft, from: 'rule31', r31, reason: ml.reason };
  return { board: ml.bp, ft: ml.bpFt, from: 'model', r31, ml };
}
export function inBox(box, bpBoard, bpFt) {
  if (bpBoard == null || bpFt == null) return { ok: false, dB: null, dF: null };
  const dB = r1(bpBoard - box.board), dF = r1(bpFt - box.ft);
  return { ok: Math.abs(dB) <= BOX_HALF_BOARDS && Math.abs(dF) <= BOX_HALF_FT, dB, dF };
}
export function pocketOf(a) {
  if (a.gutter) return { call: 'gutter', off: null };
  const off = r1(a.entryBoard - POCKET);
  const call = Math.abs(off) <= POCKET_TOL ? 'pocket' : off > 0 ? 'high' : 'light';
  return { call, off, angleOK: a.angle >= ANGLE[0] && a.angle <= ANGLE[1] };
}
// One shot through the unchanged engine on the preset nearest tonight's length.
export function read(cat, t, ctx, box) {
  const lay = laydownOf(t), arrows = arrowsOf(t, lay), aim = aimDegOf(lay, arrows), preset = presetFor(ctx.ft);
  const keep = { pattern: S.pattern, finish: S.finish, oil: S.oil };
  let a;
  try { S.pattern = preset; S.finish = 'factory'; S.oil = 1; a = analyze(cat, { speed: ctx.speed, rev: ctx.rev, release: lay, aim }); }
  finally { Object.assign(S, keep); }
  const p = pocketOf(a), b = box ? inBox(box, a.bpBoard, a.bpFeet) : { ok: false };
  const warn = [];
  if (lay < 5 || lay > 30) warn.push(`Laydown ${r1(lay)} is outside the model's tested range (boards 5–30).`);
  if (Math.abs(aim) > 8) warn.push(`Laydown to arrows spans ${r1(Math.abs(aim))} boards; the model is tested to 8.`);
  return { lay: r1(lay), arrows: r1(arrows), aim: r1(aim), preset, presetLen: OIL_LEN[preset], a, ...p, box: b,
    bpBoard: a.bpBoard == null ? null : r1(a.bpBoard), bpFt: a.bpFeet == null ? null : Math.round(a.bpFeet), entry: a.gutter ? null : r1(a.entryBoard), angle: r1(a.angle), warn };
}
const grade = r => r.call === 'pocket' && r.box.ok && r.angleOK ? 0 : r.call === 'pocket' && r.box.ok ? 1 : r.call === 'pocket' && r.angleOK ? 2 : r.call === 'pocket' ? 3 : 4;
export const done = r => grade(r) === 0;
// Try every cited move both ways through the engine; return the smallest that improves the grade (ties: closer to 17.5, then smaller).
export function suggest(cat, t, ctx, box, cur = read(cat, t, ctx, box)) {
  if (done(cur) || !specOK(cat)) return null;
  const g0 = grade(cur), d0 = cur.entry == null ? 99 : Math.abs(cur.entry - POCKET);
  let best = null;
  for (const m of MOVES) for (const s of [1, -1]) {
    const nt = Object.assign({}, t, { feet: t.feet + s * m.feet, eyes: t.eyes + s * m.eyes });
    const r = read(cat, nt, ctx, box), g = grade(r), d = r.entry == null ? 99 : Math.abs(r.entry - POCKET);
    if (g > g0 || (g === g0 && (g < 4 || d >= d0 - 0.3))) continue;   // must get better: a better grade, or ≥0.3 board closer when missing
    const sc = g * 100 + (g === 4 ? d * 10 : 0) + m.feet + m.eyes;
    if (!best || sc < best.sc) best = { sc, move: m, sign: s, t: nt, r };
  }
  if (!best) return null;
  // Disclose when the engine's direction disagrees with "move toward the miss" (house shot, bowl.com/NBA): high → move left (RH).
  const towardMiss = cur.call === 'high' ? 1 : cur.call === 'light' ? -1 : 0;
  return { move: best.move, sign: best.sign, t: best.t, r: best.r, feet: best.sign * best.move.feet, eyes: best.sign * best.move.eyes,
    againstHouseRule: towardMiss !== 0 && towardMiss !== best.sign };
}
export function moveWords(s, lefty) {
  return `Move feet ${s.move.feet} ${dirWord(s.feet, lefty)}, eyes ${s.move.eyes} ${dirWord(s.eyes, lefty)}.`;
}
// Coach line, numbers first, ≤ 2 sentences.
export function coach(r, s, lefty) {
  if (r.call === 'gutter') return s ? `Gutter before the pins. ${moveWords(s, lefty)}` : 'Gutter before the pins. Move your eyes toward the middle.';
  const deg = `${r.angle}\u00b0`;
  const boxTxt = r.box.ok ? `Through the box at ${r.bpFt} ft, board ${r.bpBoard}.`
    : r.bpBoard == null ? 'No breakpoint on this line.' : `Box missed: breakpoint board ${r.bpBoard} at ${r.bpFt} ft.`;
  if (r.call === 'pocket') return s && !r.box.ok ? `${boxTxt.replace(/\.$/, '')}, pocket ${deg}. ${moveWords(s, lefty)}` : `${boxTxt} Pocket, ${deg}${r.angleOK ? '' : ' (outside 4\u20136\u00b0)'}.`;
  const miss = `${r.call === 'high' ? 'High' : 'Light'} by ${Math.abs(r.off)} boards`;
  return s ? `${miss}. ${moveWords(s, lefty)}` : `${miss}. No single listed move fixes it on the model; try another ball.`;
}
// Saved Lane line (release/aim) → targeting inputs, keeping the bowler's offset/drift.
export function fromLine(l, t) { const lay = +l.release, arrows = lay - +l.aim; return Object.assign({}, t, { feet: Math.round(lay + t.offset - t.drift), mode: 'arrows', eyes: r1(arrows) }); }
