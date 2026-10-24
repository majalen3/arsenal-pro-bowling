// 2-D line check for Tonight (COMMAND_CENTER_PLAN §2 step 7). Calls the unchanged engine (simulatePath via analyze) with the
// user's speed/rev/finish on the nearest of the six preset patterns by length; the same approximation the Pattern screen
// discloses. Spec-TBD balls never get a model line. The engine's global state is restored after every call.
import { S, OIL_LEN, PATTERNS, analyze } from '../engine.js';
import { specOK } from '../data.js';
import { arrowsBoard } from './geom.js';
export function presetFor(ft) {
  let best = PATTERNS[0];
  for (const p of PATTERNS) if (Math.abs(OIL_LEN[p] - ft) < Math.abs(OIL_LEN[best] - ft)) best = p;
  return best;
}
export function modelLine(cat, { speed = 15, rev = 220, ft = 38, finish = 'factory', target31 = null } = {}) {
  if (!cat || !specOK(cat)) return { none: true, reason: 'spec TBD: no model line' };
  const keep = { pattern: S.pattern, finish: S.finish, oil: S.oil }, preset = presetFor(ft);
  try {
    S.pattern = preset; S.finish = finish; S.oil = 1;
    const want = target31 == null ? ft - 31 : target31; let best = null;
    for (let rel = 5; rel <= 30; rel++) for (let aim = -8; aim <= 8; aim += 0.5) {
      const a = analyze(cat, { speed, rev, release: rel, aim }); if (!a.strike) continue;
      const sc = Math.abs((a.bpBoard ?? 99) - want) + Math.abs(rel - 20) * 0.05;
      if (!best || sc < best.sc) best = { sc, rel, aim, a };
    }
    if (!best) return { none: true, reason: `No strike line found on the ${preset} preset`, preset, presetLen: OIL_LEN[preset] };
    const vars = [{ speed: speed + 0.5 }, { speed: speed - 0.5 }, { rev: rev + 20 }, { rev: rev - 20 }, { release: best.rel + 1 }, { release: best.rel - 1 }];
    const holds = vars.filter(v => analyze(cat, Object.assign({ speed, rev, release: best.rel, aim: best.aim }, v)).strike).length;
    return { none: false, feet: best.rel, target: +arrowsBoard(best.rel, best.aim).toFixed(1), aim: best.aim, bp: best.a.bpBoard == null ? null : +best.a.bpBoard.toFixed(1),
      bpFt: best.a.bpFeet == null ? null : Math.round(best.a.bpFeet), holds, of: vars.length, preset, presetLen: OIL_LEN[preset] };
  } finally { Object.assign(S, keep); }
}
