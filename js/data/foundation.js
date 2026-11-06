// Append-only launch review metadata. No event, legacy key, user field or server row is deleted.
import { accountIdOf } from './privacy.js';
export async function prepareFoundation(db, keys, now = Date.now()) {
  if (db.meta.foundationV === 1) return { ran: false };
  let p = null; try { p = JSON.parse(keys.ap_profile || 'null'); } catch (_) {}
  if (!db.meta.foundationSnapshot) await db.setMeta('foundationSnapshot', { v: 1, at: now, keys: { ...keys }, eventIds: db.events().map(e => e.id) });
  const bound = db.meta.accountBinding || accountIdOf(db.meta.sync?.code);
  if (bound) await db.setMeta('accountBinding', bound);
  await db.setMeta('ownershipReview', { v: 1, needed: p?.ownedVersion !== 1 && (!Array.isArray(p?.owned) || !p.owned.length) && Object.keys(keys).some(k => keys[k] != null), confirmed: false });
  await db.setMeta('foundationV', 1);
  return { ran: true };
}
