// One catalog resolver for the whole app. Catalogue balls come from data.js. A ball the user added via #/add-ball
// carries its own confirmed spec (owned.spec.cat), and is registered here so rank / bag / tonight see it the same way.
import { balls } from '../data.js';
const extra = new Map(), owned = new Map(), copies = new Map();   // copies: how many owned balls share a catalogId (for legacyLineKey)
export function registerCat(cat) { if (cat && typeof cat.id === 'string' && !balls.some(b => b.id === cat.id)) extra.set(cat.id, cat); }
export function registerOwned(P) {
  owned.clear(); copies.clear(); for (const o of Object.values((P && P.owned) || {})) { owned.set(o.id, o); copies.set(o.catalogId, (copies.get(o.catalogId) || 0) + 1); }
  for (const o of Object.values((P && P.owned) || {})) if (o && o.catalogId && o.spec && o.spec.cat && o.spec.cat.id === o.catalogId) registerCat(o.spec.cat);
}
export const catOf = id => (id ? balls.find(b => b.id === id) || extra.get(id) || null : null);   // 22 catalog rows: a linear find costs nothing, an index was measured and dropped
export const clearExtra = () => extra.clear();

// Catalog id describes a model. ownedId describes one physical copy; never pick an arbitrary first copy.
export const ballKey = b => b && (b.ownedId || b.id);
export function ballFor(id) {
  const o = owned.get(id); if (!o) return catOf(id);
  const c = o.spec?.cat || catOf(o.catalogId);
  return c ? { ...c, name: o.name || c.name, ownedId: o.id, specFields:o.spec?.fields || null, legacyLineKey: copies.get(o.catalogId) === 1 ? c.id : null } : { id: o.catalogId || ('custom-' + o.id), ownedId: o.id, name: o.name || 'Unnamed ball', brand: '', cover: '', core: '', oil: [], rg: null, diff: null, added: true };
}
