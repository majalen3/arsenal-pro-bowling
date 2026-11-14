"""Brand evidence: Bag, Lane, Score (game page), Arsenal and Me at 390x844 for a theme/mode.
  python tests/brand/shots.py --base http://localhost:8351/ --out DIR [--brands pine,maple,night | --audit] [--modes dark,light]
--audit takes today's look with no brand pref (the pre-v79 build ignores it). File names: <brand>_<mode>_<screen>.png"""
import asyncio, os, sys, datetime, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'journeys'))
from playwright.async_api import async_playwright
import lib
from personas import PERSONAS, NIGHT0

SCREENS = [('bag', '/bag'), ('lane', '/lane'), ('score', '/bowl'), ('arsenal', '/arsenal'), ('me', '/me')]
arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d

async def main():
    base = arg('--base', 'http://localhost:8351/'); out = arg('--out', '/tmp/brand-shots'); os.makedirs(out, exist_ok=True)
    brands = (arg('--brands', 'audit')).split(','); modes = arg('--modes', 'dark,light').split(',')
    P = PERSONAS['righty']
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for brand in brands:
            for mode in modes:
                ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2, timezone_id='UTC', locale='en-US', service_workers='block', reduced_motion='reduce')
                await ctx.route(lib.API, lib.MockAPI().handle); page = await ctx.new_page()
                await page.clock.install(time=NIGHT0)
                prof = dict(hand=P['hand'], style=P['style'], speed=P['speed'], rev=P['rev'], pap=P['pap'], tilt='', owned=[], entered={'hand': True, 'style': True, 'speed': True, 'rev': True})
                prefs = dict(onboarded=True, help=False, theme=mode)
                if brand != 'audit': prefs['brand'] = brand
                await page.goto(base + '#/me'); await page.evaluate("([a,b]) => { localStorage.clear(); localStorage.setItem('ap_profile', JSON.stringify(a)); localStorage.setItem('ap_prefs', JSON.stringify(b)); localStorage.setItem('ap_device', 'd-qa-brand'); }", [prof, prefs])
                await page.goto(base + '?qa=brand#/tonight'); await page.wait_for_function("() => window.__apData", timeout=15000)
                await page.evaluate("async () => { const [m, f] = await Promise.all([import('./js/hub.js'), import('./tests/data/fixtures/sample_arsenal.mjs')]); await m.ready(); if (!Object.keys(m.proj().owned || {}).length) await m.loadStarter(f.sampleEvents, f.SAMPLE_ID); }")
                await page.reload(); await page.wait_for_timeout(600)
                await page.clock.set_fixed_time(NIGHT0 + datetime.timedelta(hours=1))
                for name, route in SCREENS:
                    await page.evaluate("r => { location.hash = r; }", route); await page.wait_for_timeout(900)
                    await page.evaluate("() => document.querySelectorAll('.toast,#toast,.toasts').forEach(e => e.remove())")
                    if name == 'me': await page.evaluate("() => document.querySelector('#lookFld')?.scrollIntoView({block: 'center'})"); await page.wait_for_timeout(300)
                    await page.screenshot(path=os.path.join(out, f'{brand}_{mode}_{name}.png'), animations='disabled', caret='hide')
                    ov = await page.evaluate("() => ({sh: document.documentElement.scrollHeight, ih: innerHeight, sw: document.documentElement.scrollWidth, iw: innerWidth})")
                    print(brand, mode, name, ov)
                await ctx.close()
        await b.close()
asyncio.run(main())
