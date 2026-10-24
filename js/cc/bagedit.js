// P1.1 / P1.4 (IA_PLAN, wireframe 03): edits on THE saved bag (status.js currentBag). Pure: each returns the
// bag.saved data to append under the same bag id, so Tonight, the builder and the ball chip keep reading one bag.
import * as ST from './status.js';
import { levelOf } from './rank.js';
import { catOf } from './cats.js';
export const formatOfBring = n => n <= 3 ? 'league3' : n === 4 ? 'league4' : n === 6 ? 'tournament6' : 'custom';
const base = bag => { const nb = Object.assign({ slots: [], spare: null, excluded: [] }, bag); delete nb.id; delete nb.ts; nb.slots = (bag && bag.slots || []).map(s => Object.assign({}, s)); return nb; };
const home = (P, id) => ST.statusOf(P.owned[id]) === 'benched';
const lvl = (P, id) => levelOf(catOf((P.owned[id] || {}).catalogId));
const slotFor = (P, id, locked = false) => Object.assign({ owned: id, locked }, home(P, id) ? { fromHome: true } : {});
// Swap one ball for another (the replacement takes the slot; "grab from home" when it is At home).
export function swap(P, bag, fromId, toId) {
  const nb = base(bag), i = nb.slots.findIndex(s => s.owned === fromId);
  nb.slots = nb.slots.filter(s => s.owned !== toId);
  const j = nb.slots.findIndex(s => s.owned === fromId), sl = slotFor(P, toId);
  if (j >= 0) nb.slots[j] = sl; else if (i >= 0) nb.slots.push(sl); else nb.slots.push(sl);
  if (nb.spare === fromId) nb.spare = toId;
  return nb;
}
// [Bring] from "Left out": add it while the bag has room for Bring N, else swap it in for the closest-strength ball
// that is not the spare and not 📌 Always bring. { data, out } or { blocked: 'pinned' | 'status' }.
export function bringIn(P, bag, id, bring) {
  if (!ST.offered(P.owned[id])) return { blocked: 'status' };
  const packed = ST.packedIds(P, bag), nb = base(bag);
  if (packed.length < bring) { nb.slots = nb.slots.filter(s => s.owned !== id).concat([slotFor(P, id)]); return { data: nb, out: null }; }
  const lv = lvl(P, id), cands = (bag.slots || []).filter(s => packed.includes(s.owned) && s.owned !== bag.spare && !s.locked);
  if (!cands.length) return { blocked: 'pinned' };
  const d = s => { const l = lvl(P, s.owned); return lv == null || l == null ? 50 : Math.abs(l - lv); };
  const out = cands.slice().sort((a, b) => d(a) - d(b) || (a.owned < b.owned ? -1 : 1))[0].owned;
  return { data: swap(P, bag, out, id), out };
}
export function pin(bag, id, on) { const nb = base(bag); nb.slots = nb.slots.map(s => s.owned === id ? Object.assign(s, { locked: !!on }) : s); return nb; }
// A filled answer (advisor.advise) → the bag, keeping 📌 Always bring and the bag's other fields.
export function fromAnswer(P, bag, a, extra = {}) {
  const nb = base(bag), was = new Map((bag && bag.slots || []).map(s => [s.owned, s]));
  const ids = a.slots.concat(a.spare ? [a.spare] : []);
  nb.slots = ids.map(o => Object.assign(slotFor(P, o, !!(was.get(o) || {}).locked)));
  nb.spare = a.spare || null; nb.excluded = [];
  return Object.assign(nb, extra, extra.bring ? { format: formatOfBring(extra.bring) } : {});
}
