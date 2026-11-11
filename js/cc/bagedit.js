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
// [Bring] from "Left out" is additive (live eval 2026-11-10: it used to swap out a packed ball, once the only one with specs):
// the ball goes in and, when the bag is already at Bring N, the bag grows to N + 1. { data, out: null, grew } or { blocked: 'status' }.
export function bringIn(P, bag, id, bring) {
  if (!ST.offered(P.owned[id])) return { blocked: 'status' };
  const packed = ST.packedIds(P, bag), nb = base(bag);
  nb.slots = nb.slots.filter(s => s.owned !== id).concat([slotFor(P, id)]);
  const size = packed.includes(id) ? packed.length : packed.length + 1;
  return { data: nb, out: null, grew: size > bring ? size : null };
}
const modeled = (P, id) => lvl(P, id) != null;
// Balls Bring N and Suggest again may add, not yet packed: Ready to bring first, then At home (packed as "grab from home"; new
// balls start At home, so a fresh arsenal can still fill a bag); within each, the ones with specs first, then by name.
export function readyIds(P, except = []) {
  const name = id => String((P.owned[id] || {}).name || id), home = id => ST.statusOf(P.owned[id]) === 'benched' ? 1 : 0;
  return Object.keys(P.owned || {}).filter(id => ST.offered(P.owned[id]) && !except.includes(id))
    .sort((a, b) => (home(a) - home(b)) || (modeled(P, b) - modeled(P, a)) || name(a).localeCompare(name(b)));
}
// Bring N (the size control) never silently reshuffles: going up keeps every packed ball and adds (the advisor's picks first,
// then other Ready balls); going down takes out balls without specs first and never the last ball with specs, the spare or a
// 📌 Always bring ball. → { data, added, removed, size }.
export function resize(P, bag, n, advised = null) {
  const nb = base(bag), was = new Map((bag && bag.slots || []).map(s => [s.owned, s])), ids = ST.packedIds(P, bag).slice(), added = [], removed = [];
  if (ids.length < n) {
    const pref = advised ? (advised.slots || []).concat(advised.spare ? [advised.spare] : []).filter(id => ST.offered(P.owned[id])) : [];
    for (const id of pref.concat(readyIds(P, ids))) { if (ids.length >= n) break; if (!ids.includes(id)) { ids.push(id); added.push(id); } }
  }
  while (ids.length > n) {
    const free = ids.filter(id => id !== nb.spare && !(was.get(id) || {}).locked), nMod = ids.filter(id => modeled(P, id)).length;
    const pickOut = free.slice().reverse().find(id => !modeled(P, id)) || (nMod > 1 ? free.slice().reverse().find(id => modeled(P, id)) : null);
    if (!pickOut) break; ids.splice(ids.indexOf(pickOut), 1); removed.push(pickOut);
  }
  nb.slots = ids.map(id => was.get(id) ? Object.assign({}, was.get(id)) : slotFor(P, id));
  if (nb.spare && !ids.includes(nb.spare)) nb.spare = null;
  if (!nb.spare && advised && advised.spare && ids.includes(advised.spare)) nb.spare = advised.spare;
  return { data: nb, added, removed, size: ids.length };
}
// Suggest again: the advisor's answer, topped up to Bring N from what is packed now (then other Ready balls), so a re-suggest
// never shrinks the bag to one ball when the bowler owns more.
export function topUp(P, answer, n, current = []) {
  const ids = (answer.slots || []).concat(answer.spare ? [answer.spare] : []), out = { slots: answer.slots.slice(), spare: answer.spare || null };
  const keep = current.filter(id => ST.offered(P.owned[id]) && !ids.includes(id)).sort((a, b) => modeled(P, b) - modeled(P, a));
  for (const id of keep.concat(readyIds(P, ids.concat(keep)))) { if (out.slots.length + (out.spare ? 1 : 0) >= n) break; if (!out.slots.includes(id) && id !== out.spare) out.slots.push(id); }
  return out;
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
