// Keep in bag for one owned ball (v74): shared by the ball page and anything else that pins. The pin lives on tonight's bag
// (bag.saved), so it survives Bring changes, Suggest again and Shake it up (cc/bagedit.js).
import { proj, add } from '../hub.js';
import * as BE from './bagedit.js';
import * as ST from './status.js';
export function isKept(P, id) { const b = ST.currentBag(P); return !!(b && b.slots.some(s => s.owned === id && s.locked)); }
// Balls at the pro shop or retired can't be packed, so they can't be kept.
export const canKeep = o => ST.offered(o);
export async function setKeep(id, on) {
  const P = proj(), b = ST.currentBag(P), o = P.owned[id];
  if (!b) return { ok: false, msg: 'Pack a bag on the Bag tab first.' };
  if (on && !canKeep(o)) return { ok: false, msg: 'Set it back to Ready to bring or At home first.' };
  const nb = BE.pin(b, id, on);
  if (on && !nb.slots.some(x => x.owned === id)) nb.slots.push(Object.assign({ owned: id, locked: true }, ST.statusOf(o) === 'benched' ? { fromHome: true } : {}));
  await add('bag.saved', b.id, nb);
  return { ok: true, on };
}
