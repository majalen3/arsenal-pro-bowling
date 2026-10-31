"""Release audit (docs/TEAM_PROMPT_RELEASE_CEO.md checklist 1, 2, 3): every route, empty and seeded, at 360x780 and
414x896. Reports dev/debug words in visible text, page errors, console errors, failed or 404 requests, axe serious /
critical, and the Tonight cold-load bytes. The production API is mocked. Usage:
  python tests/journeys/release_audit.py --base http://localhost:8300/ [--out DIR]"""
import argparse, asyncio, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.async_api import async_playwright
import lib
from personas import NIGHT0, boot, seed_history

ROUTES = ['/tonight', '/bowl', '/results', '/bag', '/bag?view=all', '/learn', '/me', '/lane', '/target', '/arsenal/insights',
          '/arsenal/sheet', '/ball/rattler-big-bite', '/compare', '/add-ball', '/learn/patterns', '/glossary', '/guide',
          '/session/qa-night-2', '/card', '/import', '/welcome']
DEV = re.compile(r'\b(undefined|NaN|null|\[object|IndexedDB|projection|catalogId|ownedBall|bag\.saved|shot\.logged|TODO|FIXME|lorem|stack trace|TypeError|ReferenceError)\b')
# cards and buttons must not touch the screen edge (each screen pads its content; the card screen once did not)
EDGE = """() => [...document.querySelectorAll('.screen .card, .screen .btn')].filter(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
  return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !e.closest('[hidden],.sheet,.tray,nav,.tabbar,.scroll-x,[data-scroll]') && (r.left < 4 || r.right > innerWidth - 4) && r.width < innerWidth - 8; })
  .slice(0, 5).map(e => (e.id ? '#' + e.id : e.className.split(' ').slice(0, 2).join('.')) + ' ' + Math.round(e.getBoundingClientRect().left))"""
AXE = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'axe.min.js')).read()


async def audit(b, base, w, h, seeded, out):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True, timezone_id='UTC', locale='en-US', service_workers='block')
    await ctx.route(lib.API, lib.MockAPI().handle); page = await ctx.new_page()
    errs, cons, bad = [], [], []
    page.on('pageerror', lambda e: errs.append(str(e)[:160]))
    page.on('console', lambda m: m.type == 'error' and cons.append(m.text[:160]))
    page.on('response', lambda r: r.status >= 400 and 'onrender.com' not in r.url and bad.append(f'{r.status} {r.url}'))
    page.on('requestfailed', lambda r: 'onrender.com' not in r.url and bad.append(f'failed {r.url}'))
    rows = []
    if seeded:
        jr = lib.Journey(Run(out, base), f'A{w}', 'audit', 'righty', page, ctx, lib.MockAPI())
        await boot(jr, 'righty', clock=NIGHT0); await seed_history(jr, nights=2)
    else:
        await page.goto(base + '#/me'); await page.evaluate(lib.WIPE); await page.goto(base + '#/welcome')
    for r in ROUTES:
        if seeded and r == '/welcome': continue
        e0, c0, b0 = len(errs), len(cons), len(bad)
        await page.goto(base + '?a=' + str(len(rows)) + '#' + r); await page.wait_for_timeout(900)
        txt = await page.evaluate("() => document.body.innerText")
        dev = sorted(set(m.group(0) for m in DEV.finditer(txt)))
        await page.evaluate(AXE)
        ax = await page.evaluate("async () => { const r = await axe.run(document, { resultTypes: ['violations'] }); return r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id + ' x' + v.nodes.length); }")
        edge = await page.evaluate(EDGE)
        rows.append(dict(vp=f'{w}x{h}', seeded=seeded, route=r, dev=dev, axe=ax, edge=edge, errors=errs[e0:], console=cons[c0:], bad=bad[b0:]))
    await ctx.close(); return rows


class Run:
    def __init__(self, out, base): self.out, self.base, self.media = out, base, out
    def __getattr__(self, k): return None


async def cold_bytes(b, base):
    ctx = await b.new_context(viewport={'width': 414, 'height': 896}, service_workers='block'); await ctx.route(lib.API, lambda r: r.abort())
    page = await ctx.new_page(); cdp = await ctx.new_cdp_session(page); await cdp.send('Network.enable'); tot = {'n': 0, 'b': 0}
    cdp.on('Network.loadingFinished', lambda e: tot.update(n=tot['n'] + 1, b=tot['b'] + e['encodedDataLength']))
    await page.goto(base + '#/tonight', wait_until='networkidle'); await page.wait_for_timeout(1500); await ctx.close(); return tot


async def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--base', default='http://localhost:8300/'); ap.add_argument('--out', default='/tmp/release-audit'); a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); rows = []
        for w, h in [(360, 780), (414, 896)]:
            for seeded in (False, True):
                try: rows += await audit(b, a.base, w, h, seeded, a.out)
                except Exception as e: rows.append(dict(vp=f'{w}x{h}', seeded=seeded, route='setup', errors=[str(e)[:300]], dev=[], axe=[], console=[], bad=[]))
        cb = await cold_bytes(b, a.base); await b.close()
    bad = [r for r in rows if r.get('edge') or r['dev'] or r['axe'] or r['errors'] or r['console'] or r['bad']]
    for r in bad: print('ISSUE', json.dumps(r))
    print(f'routes checked {len(rows)}, with issues {len(bad)}; Tonight cold load {cb["n"]} requests, {round(cb["b"] / 1024)} kB transferred')
    json.dump(dict(rows=rows, cold=cb), open(os.path.join(a.out, 'audit.json'), 'w'), indent=1)
    sys.exit(1 if bad else 0)

asyncio.run(main())
