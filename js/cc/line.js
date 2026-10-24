// One stand/aim source (sim bug 5). Lane, Tonight, Targeting and the spare hints all read the bowler's line from here:
// laydown + aim come from the 2-D model (js/cc/model.js, engine unchanged); stand = laydown + offset − drift.
import { prefs } from '../store.js';
import { DEFAULTS as TGD } from './target.js';
import { modelLine } from './model.js';
import { rule31, HOUSE_ASSUMED } from './rank.js';
// Stand board = laydown + offset − drift (Breakdown Bowling). Offset/drift are the bowler's Targeting settings, else the assumed 7 / 0.
export function standOf(lay) {
  const pt = prefs().target || {}, t = pt.tv === 2 && pt.t ? pt.t : TGD, off = +t.offset || TGD.offset, dr = +t.drift || 0;
  return { feet: Math.round(lay + off - dr), lay, offset: off, drift: dr, assumed: !(pt.tv === 2 && pt.t) };
}
const memo = new Map();
// The starting line for a catalog ball: {ml, stand, ft}. ft = tonight's pattern length (null → assumed house shot).
export function lineFor(cat, { speed, rev, ft } = {}) {
  const f = ft == null ? HOUSE_ASSUMED.ft : ft, sp = speed || 15, rv = rev || 220;
  const k = [cat && cat.id, sp, rv, f].join('|');
  let ml = memo.get(k);
  if (!ml) { ml = cat ? modelLine(cat, { speed: sp, rev: rv, ft: f, finish: 'factory', target31: rule31(f).target }) : { none: true, reason: 'no ball' }; memo.set(k, ml); }
  return { ml, stand: ml && !ml.none ? standOf(ml.feet) : null, ft: f, assumedFt: ft == null };
}
