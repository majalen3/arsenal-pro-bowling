// Shared by tests/data/preload_closure.test.mjs and usable by hand: node tests/perf/preload_closure.mjs
// Static import closure (not dynamic import()) of the boot modules and of each route's screens, versus what index.html and
// main.js's routePreloads already hint with <link rel=modulepreload>. A module found late (only after its importer is fetched and
// parsed) costs one more network round trip on a cold phone; a hint costs nothing once the module is needed anyway.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
export function closure(entries) {
  const seen = new Set(), q = [...entries];
  while (q.length) { const f = q.pop(); if (seen.has(f) || !fs.existsSync(path.join(ROOT, f))) continue; seen.add(f);
    for (const m of read(f).matchAll(/(?:^|[;\s}])(?:import|export)\s+(?:[^'"();]*?\s+from\s+)?['"](\.{1,2}\/[^'"]+\.js)['"]/g)) q.push(path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1]))); }
  return seen;
}
export const htmlPreloads = () => new Set([...read('index.html').matchAll(/rel="modulepreload" href="(js\/[^"]+)"/g)].map(m => m[1]));
export const routePreloads = () => { const lit = read('js/main.js').match(/const routePreloads = (\{[\s\S]*?\n\});/)[1]; const o = vm.runInNewContext('(' + lit + ')'); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.map(n => 'js/' + n + '.js')])); };
export const ROUTE_ENTRY = { '/me': ['screens/more'], '/welcome': ['screens/welcome'], '/tonight': ['screens/tonight'], '/arsenal': ['screens/bag', 'screens/arsenal'], '/bag': ['screens/bag', 'screens/arsenal'],
  '/lane': ['screens/lane'], '/target': ['screens/target'], '/strike': ['screens/strike'], '/results': ['screens/sessions'], '/learn': ['screens/learn'] };
export const bootClosure = () => closure(['js/main.js', 'js/hub.js']);
export function report() {
  const boot = bootClosure(), html = htmlPreloads(), rp = routePreloads(), out = { bootMissing: [...boot].filter(f => !html.has(f)), routes: {} };
  for (const [r, e] of Object.entries(ROUTE_ENTRY)) { const c = closure(e.map(n => 'js/' + n + '.js')); out.routes[r] = [...c].filter(f => !boot.has(f) && !html.has(f) && !(rp[r] || []).includes(f)); }
  return out;
}
if (process.argv[1] === new URL(import.meta.url).pathname) { const r = report(); console.log('boot modules not in index.html preloads:\n  ' + (r.bootMissing.join('\n  ') || '(none)')); for (const [k, v] of Object.entries(r.routes)) console.log(k, 'static deps not hinted:', v.map(f => f.replace(/^js\/|\.js$/g, '')).join(' ') || '(none)'); }
