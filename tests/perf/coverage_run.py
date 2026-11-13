"""Chromium function coverage while an existing Playwright suite runs (owner t134u, dead-code safety net).
  python tests/perf/coverage_run.py tests/e2e.py http://localhost:8320/ [--out /tmp/cov.json]
Wraps BrowserContext.new_page of the async Playwright API so every page of the suite records precise JS coverage, then writes
{ 'js/x.js': {'functions': N, 'executed': M, 'never': [[name, line], ...]} } over the union of all pages. Dev tool only.
Uses CDP Profiler.takePreciseCoverage (polled, because a navigation discards a page's scripts). Executed = the function body ran at least once on some page. Never-executed is evidence, not proof: it only counts as removable
when the static import/usage scan (tests/perf/unused_exports.mjs) also finds nothing referencing it."""
import asyncio, json, runpy, sys, os
from playwright.async_api import BrowserContext
args = sys.argv[1:]; OUT = args[args.index('--out') + 1] if '--out' in args else '/tmp/cov.json'
if '--out' in args: i = args.index('--out'); del args[i:i + 2]
suite = args[0]; sys.argv = [suite] + args[1:]
seen = {}   # key -> {(name, start): executed}
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_new, _close = BrowserContext.new_page, BrowserContext.close
def absorb(entries):
    for e in entries.get('result', []):
        u = e['url'].split('?')[0]
        if '/js/' not in u or '/vendor/' in u: continue
        d = seen.setdefault(u.split('/js/')[-1], {})
        for f in e['functions']:
            r = f['ranges'][0]; k = (f['functionName'], r['startOffset']); d[k] = d.get(k, False) or r['count'] > 0
async def poll(sess, page):
    # takePreciseCoverage returns what ran since the last take, so poll often: a navigation discards the page's scripts.
    while not page.is_closed():
        try: absorb(await sess.send('Profiler.takePreciseCoverage'))
        except Exception: return
        await asyncio.sleep(0.25)
async def new_page(self, *a, **k):
    p = await _new(self, *a, **k)
    try:
        s = await self.new_cdp_session(p); await s.send('Profiler.enable'); await s.send('Profiler.startPreciseCoverage', {'callCount': True, 'detailed': True})
        asyncio.ensure_future(poll(s, p))
    except Exception as e: print('coverage off for a page:', e)
    return p
BrowserContext.new_page = new_page
try: runpy.run_path(suite, run_name='__main__')
except SystemExit: pass
finally:
    out = {}
    for key, d in sorted(seen.items()):
        path = os.path.join(ROOT, 'js', key); text = open(path).read() if os.path.exists(path) else ''
        never = [[n, text.count('\n', 0, off) + 1] for (n, off), ex in sorted(d.items(), key=lambda x: x[0][1]) if not ex and n]
        out['js/' + key] = {'functions': len(d), 'executed': sum(d.values()), 'never': never}
    json.dump(out, open(OUT, 'w'), indent=1); print('coverage ->', OUT, len(out), 'files')
