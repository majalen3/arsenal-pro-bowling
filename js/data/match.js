// Ball-name matcher (DATA_SYSTEM §6.1). The normaliser is ported as an algorithm from bowling-app-/model_normalizer.py
// (noise words, weights, "used", spans…); the alias data is built from OUR catalog names in js/data.js only.
import { balls } from '../data.js';
const NOISE = [/\b\d{1,2}\s*lbs?\b/g, /\b\d{1,2}\s*pounds?\b/g, /\bused\b/g, /\bpre ?owned\b/g, /\bsingle drill\b/g, /\bfree shipping\b/g, /\bspan\b/g,
  /\binch(es)?\b/g, /\bbowling ball\b/g, /\bball\b/g, /\bclean\b/g, /\brare\b/g, /\bwith core\b/g, /\bundrilled\b/g, /\bdrilled\b/g, /\bnew\b/g, /\bnib\b/g];
export function norm(v) {
  let s = String(v || '').toLowerCase().replace(/!/g, 'i').replace(/&/g, ' and ').replace(/[-_/]+/g, ' ').replace(/[^a-z0-9 ]+/g, ' ');
  for (const re of NOISE) s = s.replace(re, ' ');
  return s.replace(/\s+/g, ' ').trim();
}
// alias → catalog id. Only unambiguous forms: "brand name" and "name" (and "name" without a leading "original").
export function aliasIndex(list = balls, owned = []) {
  const idx = new Map(), clash = new Set();
  const put = (k, id) => { if (!k) return; if (idx.has(k) && idx.get(k) !== id) clash.add(k); else idx.set(k, id); };
  for (const b of list) { const n = norm(b.name), br = norm(b.brand); put(n, b.id); put(br + ' ' + n, b.id); if (n.startsWith('original ')) { put(n.slice(9) + ' original', b.id); } }
  for (const o of owned) if (o.name && o.catalogId) put(norm(o.name), o.catalogId);
  for (const k of clash) idx.delete(k);
  return idx;
}
const toks = s => new Set(s.split(' ').filter(Boolean));
function sim(a, b) { const A = toks(a), B = toks(b); let i = 0; for (const t of A) if (B.has(t)) i++; return i ? (2 * i) / (A.size + B.size) : 0; }
// → {input, exact: id|null, candidates:[{id, label, score}]}. Exact = alias hit (auto-filled but editable); otherwise the
// preview must ask "Hy-Road Pearl?" with Yes / pick. Never auto-accepts a fuzzy match.
export function matchBall(input, { list = balls, idx = aliasIndex(list) } = {}) {
  const n = norm(input);
  if (!n) return { input, exact: null, candidates: [] };
  if (idx.has(n)) return { input, exact: idx.get(n), candidates: [] };
  const c = list.map(b => { const full = norm(b.brand + ' ' + b.name), nm = norm(b.name); return { id: b.id, label: `${b.brand} ${b.name}`, score: Math.max(sim(n, full), sim(n, nm), nm.includes(n) && n.length >= 3 ? 0.6 : 0) }; })
    .filter(x => x.score >= 0.4).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label)).slice(0, 6);
  return { input, exact: null, candidates: c };
}
