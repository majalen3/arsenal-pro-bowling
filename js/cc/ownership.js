// Catalog model -> physical copy. Stable draft IDs make a failed/retried save idempotent.
import { balls } from '../data.js';
import { ownedEvent, toCat } from './addball.js';
import { mkEvent } from '../data/events.js';
export function selectionEvents(draft, importId) {
  return draft.map(d => {
    const e = d.entry, cat = balls.find(b => b.id === e.id) || toCat(e.fields || {}, e);
    const data = ownedEvent(cat, e.fields || {}, { weight:null, src:e.source || null, entryId:e.id });
    data.name = d.name.trim() || e.name;
    return mkEvent('ownedBall.created', d.id, data, { id:'create-' + d.id, importId, prov:{ kind:'user', ref:'onboarding-confirmed' } });
  });
}
