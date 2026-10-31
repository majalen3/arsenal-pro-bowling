// One stand/aim source (sim bug 5). Lane, Tonight, Targeting and the spare hints all read the bowler's line from here:
// laydown + aim come from the 2-D model (js/cc/model.js, engine unchanged); stand = laydown + offset − drift.
import { prefs, setPrefs } from '../store.js';
import { DEFAULTS as TGD } from './target.js';
import { modelLine } from './model.js';
import { rule31, HOUSE_ASSUMED } from './rank.js';
// Stand board = laydown + offset − drift (Breakdown Bowling). Offset/drift are the bowler's Targeting settings, else the assumed 7 / 0.
export function standOf(lay) {
  const pt = prefs().target || {}, t = pt.tv === 2 && pt.t ? pt.t : TGD, off = +t.offset || TGD.offset, dr = +t.drift || 0;
  return { feet: Math.round(lay + off - dr), lay, offset: off, drift: dr, assumed: !(pt.tv === 2 && pt.t) };
}
const memo = new Map();
// F01 (FINDINGS_2): the line the bowler set (dragged on Lane, moved on Targeting) is THE line for that ball everywhere,
// until they move it again. Stored per catalog ball as laydown + eyes at the arrows; stand is derived (standOf).
const half = v => Math.round(v * 2) / 2;
export function keptLine(id) { const k = id && (prefs().myLines || {})[id]; return k && isFinite(+k.lay) && isFinite(+k.eyes) ? k : null; }
export function keepLine(id, { lay, eyes }) {
  if (!id || !isFinite(+lay) || !isFinite(+eyes)) return;
  const cur = keptLine(id), nx = { lay: Math.round(+lay), eyes: half(+eyes) };
  if (cur && cur.lay === nx.lay && cur.eyes === nx.eyes) return;
  setPrefs({ myLines: Object.assign({}, prefs().myLines, { [id]: Object.assign(nx, { ts: Date.now() }) }) });
}
export function clearKept(id) { const m = Object.assign({}, prefs().myLines); if (!(id in m)) return; delete m[id]; setPrefs({ myLines: m }); }
// The line for a catalog ball: {ml, stand, ft, kept}. ft = tonight's pattern length (null → assumed house shot).
// ml is the 2-D model line; when the bowler kept their own line, ml.feet/ml.target are theirs (ml.kept = true) and the
// model's breakpoint/holds numbers are dropped, because they describe the model's line, not this one.
export function lineFor(cat, { speed, rev, ft } = {}) {
  const f = ft == null ? HOUSE_ASSUMED.ft : ft, sp = speed || 15, rv = rev || 220;
  const k = [cat && cat.id, sp, rv, f].join('|');
  let ml = memo.get(k);
  if (!ml) { ml = cat ? modelLine(cat, { speed: sp, rev: rv, ft: f, finish: 'factory', target31: rule31(f).target }) : { none: true, reason: 'no ball' }; memo.set(k, ml); }
  const kept = cat && keptLine(cat.id);
  if (kept) ml = { feet: kept.lay, target: kept.eyes, kept: true, model: ml };
  return { ml, stand: ml && !ml.none ? standOf(ml.feet) : null, ft: f, assumedFt: ft == null, kept: !!kept };
}
