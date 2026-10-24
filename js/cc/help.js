// Help bubbles + glossary (docs/HELP_BUBBLES_V1.md, data/glossary.json; content is read-only, wired here).
// Pure helpers: load once, search, group by tree. Help is OFF by default (prefs.help === true turns it on).
export const LABELS = { F: 'read at the source', S: 'search excerpt, not fetched', A: 'assumption', repo: 'from a repo doc' };
let cache = null;
export async function loadGlossary(fetchFn = globalThis.fetch) {
  if (cache) return cache;
  const r = await fetchFn('data/glossary.json'); if (!r.ok) throw new Error('HTTP ' + r.status);
  const d = await r.json(); cache = { terms: d.terms || [], trees: (d._meta && d._meta.trees) || [] }; return cache;
}
export const _reset = () => { cache = null; };
export const helpOn = p => !!(p && p.help === true);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// Match term, id and glossary words (HELP_BUBBLES_V1 UI notes). Every word of the query must appear.
export function search(terms, q) {
  const ws = norm(q).split(/\s+/).filter(Boolean);
  if (!ws.length) return terms.slice();
  return terms.filter(t => { const hay = norm(t.term + ' ' + t.id + ' ' + t.glossary); return ws.every(w => hay.includes(w)); });
}
export function byTree(list, trees = []) {
  const g = new Map(trees.map(t => [t, []]));
  for (const t of list) { if (!g.has(t.tree)) g.set(t.tree, []); g.get(t.tree).push(t); }
  return [...g].filter(([, xs]) => xs.length).map(([tree, xs]) => [tree, xs.slice().sort((a, b) => a.term.localeCompare(b.term))]);
}
export const find = (terms, id) => terms.find(t => t.id === id) || null;
