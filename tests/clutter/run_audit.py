"""Clutter audit: every route at 360x780 and 414x896 on seeded data (2 past league nights, starter arsenal), production API
mocked (tests/journeys/lib.MockAPI). Read-only against the app. Writes out/<vp>/<screen>.json + fold.png + full.png and
out/summary.json. Usage:
  /workspace/pwenv/bin/python tests/clutter/run_audit.py --base https://majalen3.github.io/arsenal-pro-bowling/ --out /tmp/clutter"""
import argparse, asyncio, datetime, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', 'journeys')); sys.path.insert(0, HERE)
from playwright.async_api import async_playwright
import lib
from personas import NIGHT0, boot, seed_history
from imgclutter import metrics

MEASURE = open(os.path.join(HERE, 'measure.js')).read()

async def league(p):
    loc = p.locator('#advEvent [data-event="league"]')
    if await loc.count(): await loc.first.click(); await p.wait_for_timeout(500)

async def bowling(p):
    """Start a game and log a few balls so the pad is mid-game (active scoring)."""
    if await p.locator('#tnStartBowl').count() and await p.locator('#tnStartBowl').first.is_visible():
        await p.click('#tnStartBowl')
    await p.wait_for_timeout(600)
    if not await p.locator('#qlStrike').first.is_visible() and await p.locator('#qlNext').count(): await p.click('#qlNext'); await p.wait_for_timeout(400)
    for _ in range(2):
        await p.wait_for_timeout(450); await p.click('#qlStrike')
    await p.wait_for_timeout(500)
    await p.click('#qlPins [data-pin="10"]')
    await p.wait_for_timeout(300)

# (name, label, hash, setup)
SCREENS = [
    ('tonight', 'Tonight', '/tonight', None), ('tonight-league', 'Tonight · League', '/tonight', league),
    ('bowl', 'Bowl (mid-game)', '/tonight', bowling), ('results', 'Results', '/results', None),
    ('session', 'Night recap', '/session/qa-night-2', None), ('card', 'Bowler Card', '/card', None),
    ('bag', 'Bag builder', '/bag', None), ('armory', 'Armory (All my balls)', '/bag?view=all', None),
    ('ball', 'Ball detail', '/ball/rattler-big-bite', None), ('compare', 'Compare', '/compare', None),
    ('insights', 'Insights', '/arsenal/insights', None), ('export', 'Arsenal sheet (export)', '/arsenal/sheet', None),
    ('learn', 'Learn', '/learn', None), ('guide', 'Guide', '/guide', None), ('glossary', 'Glossary', '/glossary', None),
    ('patterns', 'Patterns', '/learn/patterns', None), ('me', 'Me', '/me', None),
    ('lane', 'Lane', '/lane', None), ('target', 'Targeting', '/target', None),
]
HIDE = "() => { document.querySelectorAll('.toast, #toast, .toasts').forEach(e => e.remove()); }"

class Run:
    def __init__(self, out, base): self.out, self.base, self.media, self.known = out, base, out, {}
    def __getattr__(self, k): return None

async def audit_vp(b, base, out, w, h, only):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True, device_scale_factor=1, timezone_id='UTC',
                              locale='en-US', service_workers='block', reduced_motion='reduce')
    api = lib.MockAPI(); await ctx.route(lib.API, api.handle); p = await ctx.new_page()
    j = lib.Journey(Run(out, base), f'C{w}', 'clutter', 'righty', p, ctx, api)
    await boot(j, 'righty', clock=NIGHT0); await seed_history(j, nights=2)
    await p.clock.set_fixed_time(NIGHT0 + datetime.timedelta(hours=1))
    vp = f'{w}x{h}'; d = os.path.join(out, vp); os.makedirs(d, exist_ok=True); rows = []
    for name, label, route, setup in SCREENS:
        if only and name not in only: continue
        try:
            await p.goto(base + '?c=' + name + '#/me'); await p.evaluate("async () => { const m = await import('./js/hub.js'); await m.ready(); }")
            await p.evaluate("r => { location.hash = r; }", route); await p.wait_for_timeout(900)
            if setup: await setup(p)
            await p.evaluate(HIDE); await p.evaluate('() => scrollTo(0, 0)'); await p.wait_for_timeout(250)
            m = await p.evaluate(MEASURE)
            fold, full = os.path.join(d, name + '.fold.png'), os.path.join(d, name + '.full.png')
            await p.screenshot(path=fold, animations='disabled', caret='hide')
            await p.screenshot(path=full, full_page=True, animations='disabled', caret='hide')
            m.update(name=name, label=label, route=route, vp=vp, img_fold=metrics(fold), img_full=metrics(full))
        except Exception as e:
            m = dict(name=name, label=label, route=route, vp=vp, error=str(e)[:300])
        json.dump(m, open(os.path.join(d, name + '.json'), 'w'), indent=1); rows.append(m)
        print(vp, name, {k: m.get(k) for k in ('dataFold', 'data', 'numsFold', 'nums', 'actionsFold', 'actions', 'words', 'screens', 'error')}, m.get('img_fold'))
    await ctx.close(); return rows

async def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--base', default='https://majalen3.github.io/arsenal-pro-bowling/')
    ap.add_argument('--out', default='/tmp/clutter'); ap.add_argument('--only', default=''); a = ap.parse_args()
    base = a.base if a.base.endswith('/') else a.base + '/'; only = {x for x in a.only.split(',') if x}
    os.makedirs(a.out, exist_ok=True); rows = []
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for w, h in [(360, 780), (414, 896)]: rows += await audit_vp(b, base, a.out, w, h, only)
        await b.close()
    json.dump(rows, open(os.path.join(a.out, 'summary.json'), 'w'), indent=1)

asyncio.run(main())
