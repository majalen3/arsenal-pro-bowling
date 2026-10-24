// Quick log (CC1): where are we in the game, what is standing, and what each frame shows. Pure, DOM-free (node --test).
// A throw = {down, leave:[pins standing after], foul?}. Scoring is js/data/scoring.js (USBC Playing Rules 2a–2h).
import { scoreGame, isSplit } from '../data/scoring.js';
import { spareFor } from './rank.js';
export const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// Pin rows from the back (as the bowler sees the deck): column 0..6 in a 7-wide grid.
export const LAYOUT = [[7, 0], [8, 2], [9, 4], [10, 6], [4, 1], [5, 3], [6, 5], [2, 2], [3, 4], [1, 3]];
const ROW = { 1: 0, 2: 1, 3: 1, 4: 2, 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 3 };
// Walk the throws: returns the next frame/roll, the pins facing the next delivery, and per-frame marks.
export function stateOf(throws) {
  let f = 1, roll = 1, standing = ALL.slice(); const frames = [];
  let cur = { f: 1, marks: [], split: false };
  const close = () => { frames.push(cur); f++; roll = 1; standing = ALL.slice(); cur = { f, marks: [], split: false }; };
  for (const t of throws) {
    if (f > 10) break;
    const facing = standing.length, pm = cur.marks[cur.marks.length - 1];
    const rack = roll === 1 || (f === 10 && (pm === 'X' || pm === '/'));   // a fresh rack for this delivery
    const down = t.foul ? 0 : t.down;
    const left = t.foul ? (rack ? ALL.slice() : standing) : (t.leave || []).filter(p => standing.includes(p));
    const mark = t.foul ? 'F' : rack && down === 10 ? 'X' : !rack && down === facing ? '/' : down === 0 ? '-' : String(down);
    cur.marks.push(mark);
    if (rack && !t.foul && left.length && isSplit(left)) cur.split = true;
    if (f < 10) {
      if (roll === 1 && mark !== 'X') { roll = 2; standing = t.foul ? ALL.slice() : left; } else close();
    } else {
      const m = cur.marks;
      if (roll === 1) { roll = 2; standing = mark === 'X' || t.foul ? ALL.slice() : left; }
      else if (roll === 2) {
        const bonus = m[0] === 'X' || m[1] === '/';
        if (!bonus) close(); else { roll = 3; standing = (m[1] === 'X' || m[1] === '/' || (m[0] === 'X' && t.foul)) ? ALL.slice() : left; }
      } else close();
    }
  }
  if (f <= 10) frames.push(cur);
  const sc = scoreGame(throws.map(t => ({ down: t.down, foul: !!t.foul })));
  frames.forEach((fr, i) => { fr.cum = sc.cum ? sc.cum[i] ?? null : null; });
  return { frame: Math.min(f, 10), roll, standing, done: f > 10, frames, total: sc.total, ok: sc.ok, errors: sc.errors, complete: sc.complete };
}
// Re-entering one frame (scoring fix 2): frames before it are treated as strikes so the walk starts on a fresh rack of
// frame f; `closed` turns true when frame f is complete (for the 10th, when the game is).
export function editState(f, throws) {
  const st = stateOf(Array.from({ length: f - 1 }, () => ({ down: 10, leave: [], foul: false })).concat(throws));
  return Object.assign(st, { closed: st.done || st.frame > f });
}
// The throw a button press makes, given the pins facing the delivery.
export function throwOf(kind, standing, { leave = [], foul = false } = {}) {
  if (foul) return { down: 0, leave: standing.slice(), foul: true };
  if (kind === 'all') return { down: standing.length, leave: [] };          // X or /
  if (kind === 'none') return { down: 0, leave: standing.slice() };          // – (miss / gutter)
  const l = leave.filter(p => standing.includes(p)).sort((a, b) => a - b);
  return { down: standing.length - l.length, leave: l };
}
// 3-6-9 for a leave: the key pin is the one nearest the bowler (USBC 3-6-9 PDF). Two key pins in the same row (e.g. 7-10)
// have no single move, so both are returned.
export function leaveHint(leave, strike = 20, hand = 'right') {
  if (!leave || !leave.length) return null;
  const front = Math.min(...leave.map(p => ROW[p])), keys = leave.filter(p => ROW[p] === front);
  return { leave: leave.slice().sort((a, b) => a - b), split: isSplit(leave), keys: keys.map(p => Object.assign({ key: p }, spareFor(p, strike, hand))) };
}
