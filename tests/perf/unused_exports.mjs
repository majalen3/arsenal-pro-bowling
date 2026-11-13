// Static dead-code candidates (owner t134u): exported names that no other file (js/, tests/, tools/, sw.js, index.html) mentions as a
// word, and that the defining file itself uses only at the definition. A name that survives this is not imported, not re-exported, not
// called by a test. Run: node tests/perf/unused_exports.mjs
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const walk = (d, o = []) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (['node_modules', 'vendor', 'e2e-shots'].includes(f.name) || f.name.startsWith('.git')) continue; const p = path.join(d, f.name); f.isDirectory() ? walk(p, o) : o.push(p); } return o; };
const files = [...walk(ROOT)].filter(f => /\.(js|mjs|html|py|json|md)$/.test(f) && !/package-lock|\/docs\/|CHANGELOG|DECISIONS/.test(f)), txt = Object.fromEntries(files.map(f => [f, fs.readFileSync(f, 'utf8')]));
const out = [];
for (const f of Object.keys(txt)) { if (!f.includes('/js/') || !f.endsWith('.js')) continue; const s = txt[f]; const names = new Set();
  for (const m of s.matchAll(/export\s+(?:async\s+)?(?:const|let|function\*?|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of s.matchAll(/export\s*\{([^}]+)\}/g)) for (const n of m[1].split(',')) { const k = n.trim().split(/\s+as\s+/).pop(); if (k && k !== 'default') names.add(k); }
  for (const m of s.matchAll(/export\s+const\s*\{([^}]+)\}/g)) for (const n of m[1].split(',')) names.add(n.trim().split(':').pop().trim());
  for (const m of s.matchAll(/export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*[^;\n]*?,\s*([A-Za-z_$][\w$]*)\s*=/g)) names.add(m[2]);
  for (const n of names) { const w = new RegExp('(?<![\\w$])' + n.replace(/\$/g, '\\$') + '(?![\\w$])', 'g'); let elsewhere = 0; for (const g of Object.keys(txt)) if (g !== f && w.test(txt[g])) { elsewhere++; w.lastIndex = 0; } const own = (s.match(w) || []).length;
    if (!elsewhere && own <= 1) out.push([path.relative(ROOT, f), n]); } }
console.log(out.length + ' exported names with no use outside their own definition:'); for (const [f, n] of out) console.log('  ' + f + '  ' + n);
