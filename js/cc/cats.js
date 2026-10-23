// One catalog resolver for the whole app. Catalogue balls come from data.js. A ball the user added via #/add-ball
// carries its own confirmed spec (owned.spec.cat), and is registered here so rank / bag / tonight see it the same way.
import { balls } from '../data.js';
const extra = new Map();
export function registerCat(cat) { if (cat && typeof cat.id === 'string' && !balls.some(b => b.id === cat.id)) extra.set(cat.id, cat); }
export function registerOwned(P) {
  for (const o of Object.values((P && P.owned) || {})) if (o && o.catalogId && o.spec && o.spec.cat && o.spec.cat.id === o.catalogId) registerCat(o.spec.cat);
}
export const catOf = id => (id ? balls.find(b => b.id === id) || extra.get(id) || null : null);
export const clearExtra = () => extra.clear();
