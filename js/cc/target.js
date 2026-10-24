// Targeting core (TEAM_PROMPT_TARGETING.md). Pure: feet/drift/eyes → laydown → the UNCHANGED engine (analyze → simulatePath)
// → break-box check + pocket call + one cited, engine-verified move. Boards are always the bowler's own numbering
// (1 = their outside edge); only the words left/right flip for a left-hander. Engine global state is restored after every call.
import { S, OIL_LEN, analyze } from '../engine.js';
import { specOK } from '../data.js';
import { modelLine, presetFor } from './model.js';
import { rule31 } from './rank.js';
import { arrowsBoard, aimFor, REACH } from './geom.js';

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
export const DEFAULTS = { feet: 17, drift: 0, offset: 7, mode: 'arrows', eyes: 10,   // fallback: a straight 10-to-10 line (BTM, Breakdown)
  bpBoard: null, bpFt: null };
export const POCKET = 17.5, POCKET_TOL = 0.7, ANGLE = [4, 6];   // engine strike window (analyze), unchanged
export const BOX_HALF_BOARDS = 1.5, BOX_HALF_FT = 1;             // 3-board area (HK, NBA 8–10) × 39–41 ft span (NBA)
export const ARROWS_FT = 15, DOTS_FT = 7.5;

const r1 = v => Math.round(v * 10) / 10;
export const laydownOf = t => t.feet - t.offset + t.drift;                        // drift + = toward higher boards (RH: left)
export const arrowsOf = (t, lay = laydownOf(t)) => t.mode === 'dots' ? lay + (t.eyes - lay) * (ARROWS_FT / DOTS_FT) : t.eyes;  // straight line laydown → dots, extended to the arrows
// Requested arrows → engine aim through the engine's own geometry (geom.js). The model can only launch ±REACH (~0.8) board off the
// laydown by the arrows, so a wider line is clamped and flagged (engine limitation, DECISIONS #26).
export const aimDegOf = (lay, arrows) => aimFor(lay, arrows).aim;
export { REACH };
// Model limits shown in the UI (measured on the unchanged engine, tests/data/targeting.test.mjs).
export const LIMITS = {
  reach: `The model launches at most ${Math.round(REACH * 10) / 10} board off your laydown by the arrows; real tweener lines swing 3\u20135 (bowlingball.com).`,
  hook: 'The model\u2019s 4\u20136\u00b0 pocket lines break inside board 10 and hook 7 boards or less; a real house line breaks at board 8\u201310 near 40 ft (NBA). No model line does that.',
  oil: 'The model\u2019s house oil has 3 flat zones, so a feet move mostly slides the whole line; it can\u2019t show why moving toward the miss works on a real house shot.',
};
export const BOOK = { src: 'https://www.bowlingball.com/BowlVersity/bowling-ball-delivery-angle', label: 'bowlingball.com', nba: 'https://www.nationalbowlingacademy.com/post/understanding-the-house-shot',
  lines: [{ style: 'Stroker', lay: 13, arrows: 10 }, { style: 'Tweener', lay: 14.5, arrows: 10 }, { style: 'Power', lay: 18, arrows: 10 }], bp: '8\u201310', bpFt: '39\u201341' };
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
  const lay = laydownOf(t), arrows = arrowsOf(t, lay), af = aimFor(lay, arrows), aim = af.aim, preset = presetFor(ctx.ft);
  const keep = { pattern: S.pattern, finish: S.finish, oil: S.oil };
  let a;
  try { S.pattern = preset; S.finish = 'factory'; S.oil = 1; a = analyze(cat, { speed: ctx.speed, rev: ctx.rev, release: lay, aim }); }
  finally { Object.assign(S, keep); }
  const p = pocketOf(a), b = box ? inBox(box, a.bpBoard, a.bpFeet) : { ok: false };
  const warn = [];
  if (lay < 5 || lay > 30) warn.push(`Laydown ${r1(lay)} is outside the model's tested range (boards 5–30).`);
  if (af.clamped) warn.push(`Model limit: from laydown ${r1(lay)} the model can only cross the arrows at ${r1(lay - REACH)}\u2013${r1(lay + REACH)}, so it is showing ${r1(af.got)}, not ${r1(arrows)}.`);
  return { lay: r1(lay), arrows: r1(arrows), arrowsModel: r1(af.got), clamped: af.clamped, aim: Math.round(aim * 100) / 100, preset, presetLen: OIL_LEN[preset], a, ...p, box: b,
    bpBoard: a.bpBoard == null ? null : r1(a.bpBoard), bpFt: a.bpFeet == null ? null : Math.round(a.bpFeet), entry: a.gutter ? null : r1(a.entryBoard), angle: r1(a.angle), warn };
}
const grade = r => r.call === 'pocket' && r.box.ok && r.angleOK ? 0 : r.call === 'pocket' && r.box.ok ? 1 : r.call === 'pocket' && r.angleOK ? 2 : r.call === 'pocket' ? 3 : 4;
export const done = r => grade(r) === 0;
// High/light: the direction is the cited house-shot rule (move toward the miss: bowl.com, NBA), never the engine's. The engine
// only reports what it predicts after the move (modelAgrees); its 3-zone oil can't show the gradient effect (LIMITS.oil).
// Gutter / pocket-but-box-missed: no cited direction applies, so every cited move is tried both ways through the engine.
export function suggest(cat, t, ctx, box, cur = read(cat, t, ctx, box)) {
  if (done(cur) || !specOK(cat)) return null;
  const g0 = grade(cur), d0 = cur.entry == null ? 99 : Math.abs(cur.entry - POCKET);
  const better = r => { const g = grade(r), d = r.entry == null ? 99 : Math.abs(r.entry - POCKET); return g < g0 || (g === g0 && g === 4 && d < d0 - 0.3); };
  const toward = cur.call === 'high' ? 1 : cur.call === 'light' ? -1 : 0;     // + = higher boards (RH left)
  if (toward) {
    const m = MOVES.find(x => x.id === (cur.call === 'high' ? '21' : 'p2'));     // NBA: high → 2 left, 1 left; light → parallel 2 right
    const nt = Object.assign({}, t, { feet: t.feet + toward * m.feet, eyes: t.eyes + toward * m.eyes }), r = read(cat, nt, ctx, box);
    return { move: m, sign: toward, t: nt, r, feet: toward * m.feet, eyes: toward * m.eyes, cited: true, modelAgrees: better(r) };
  }
  let best = null;
  for (const m of MOVES) for (const s of [1, -1]) {
    const nt = Object.assign({}, t, { feet: t.feet + s * m.feet, eyes: t.eyes + s * m.eyes });
    const r = read(cat, nt, ctx, box), g = grade(r), d = r.entry == null ? 99 : Math.abs(r.entry - POCKET);
    if (!better(r)) continue;
    const sc = g * 100 + (g === 4 ? d * 10 : 0) + m.feet + m.eyes;
    if (!best || sc < best.sc) best = { sc, move: m, sign: s, t: nt, r };
  }
  if (!best) return null;
  return { move: best.move, sign: best.sign, t: best.t, r: best.r, feet: best.sign * best.move.feet, eyes: best.sign * best.move.eyes, cited: false, modelAgrees: true };
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
export function fromLine(l, t) { const lay = +l.release, arrows = arrowsBoard(lay, +l.aim); return Object.assign({}, t, { feet: Math.round(lay + t.offset - t.drift), mode: 'arrows', eyes: r1(arrows) }); }

// The engine's coachLine says high → feet right, light → feet left: the model's 3-zone oil only slides the line (DECISIONS #26).
// Cited house-shot rule is the opposite, move toward the miss (bowl.com; NBA: high → feet 2 left, eyes 1 left; light → 2 right, 2 right).
// engine.js stays unchanged (equivalence test); only the advice sentence is replaced here, RH words (mirrored for lefties above).
export function houseRule(txt) {
  return txt.replace(/Move feet right \d+ boards?( or go weaker\.)/, 'Move toward the miss: feet 2 left, eyes 1 left$1')
    .replace(/Move feet left \d+ boards?( or go stronger\.)/, 'Move toward the miss: feet 2 right, eyes 2 right$1');
}
