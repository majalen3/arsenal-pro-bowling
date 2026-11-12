// Static inventory (owner t134u): module graph, bytes, files nobody references, SW precache list vs disk.
//   node tests/perf/static_audit.mjs [--json]
// Reachability = static `import ... from './x.js'` and `import('./x.js')` strings starting at js/main.js, plus any string literal
// naming a js/ file (router tables, preload lists). It over-approximates on purpose: "unreferenced" here means no string anywhere names it.
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const walk = (d, o = []) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (f.name === 'node_modules' || f.name.startsWith('.git')) continue; const p = path.join(d, f.name); f.isDirectory() ? walk(p, o) : o.push(p); } return o; };
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
const js = walk(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')), read = f => fs.readFileSync(f, 'utf8');
const src = Object.fromEntries(js.map(f => [rel(f), read(f)]));
const edges = {}; const re = /(?:from\s*|import\s*\(\s*|import\s+)['"](\.{1,2}\/[^'"]+\.js)['"]/g;
for (const [f, s] of Object.entries(src)) { edges[f] = new Set(); for (const m of s.matchAll(re)) edges[f].add(path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1]))); }
const seen = new Set(), q = ['js/main.js']; while (q.length) { const f = q.pop(); if (seen.has(f) || !src[f]) continue; seen.add(f); for (const t of edges[f]) q.push(t); }
// strings naming a js file anywhere (router: () => import('./screens/x.js'), preload lists: 'screens/x')
const named = new Set(); const all = Object.values(src).join('\n') + '\n' + read(path.join(ROOT, 'sw.js')) + '\n' + read(path.join(ROOT, 'index.html'));
for (const f of Object.keys(src)) { const base = f.replace(/^js\//, '').replace(/\.js$/, ''); if (all.includes(base + '.js') || all.includes("'" + base + "'")) named.add(f); }
const unreachable = Object.keys(src).filter(f => !seen.has(f)), unnamed = Object.keys(src).filter(f => !named.has(f) && f !== 'js/main.js');
const sw = read(path.join(ROOT, 'sw.js')), shell = [...sw.matchAll(/'([^']+\.(?:js|css|json|html|png|svg|webmanifest|ico))'/g)].map(m => m[1]);
const missing = shell.filter(p => !fs.existsSync(path.join(ROOT, p.replace(/^\.\//, '').replace(/\?.*/, '')))); const shellSet = new Set(shell.map(p => p.replace(/^\.\//, '')));
const notCached = js.map(rel).filter(f => !shellSet.has(f));
const size = f => fs.statSync(path.join(ROOT, f)).size, sum = a => a.reduce((n, f) => n + size(f), 0);
const css = walk(path.join(ROOT, 'css')).map(rel).filter(f => f.endsWith('.css'));
const out = { modules: js.length, js_bytes: sum(js.map(rel)), css_files: css.length, css_bytes: sum(css), sw_shell_entries: shell.length, sw_missing_files: missing, js_not_in_sw_shell: notCached,
  unreachable_from_main: unreachable, unreferenced_anywhere: unnamed, largest: js.map(rel).sort((a, b) => size(b) - size(a)).slice(0, 10).map(f => [f, size(f)]) };
if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 1)); else { for (const [k, v] of Object.entries(out)) console.log(k + ':', Array.isArray(v) ? (v.length ? '\n  ' + v.map(x => JSON.stringify(x)).join('\n  ') : '(none)') : v); }
