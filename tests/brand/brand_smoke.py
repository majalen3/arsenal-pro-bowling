"""v79 brand + theme checks (owner t144u). python tests/brand/brand_smoke.py http://localhost:8351/
 1. default / legacy: an old install (prefs.theme only) and a bad brand value both land on the default brand (pine) with unchanged dark tokens
 2. picker: Bag -> Me (tap 1) -> a look (tap 2); the option is >= 44 px, has a tick (not color alone), the page gets data-brand, meta theme-color follows --bg
 3. remembered: reload keeps the look and the mode; Auto follows prefers-color-scheme
 4. axe serious/critical = 0 on Bag, Lane, Score, Arsenal, Me for all 3 looks x light/dark
 5. no horizontal scroll and no new vertical scroll on Lane, Score and Arsenal at 390x844 in every look (Bag/Me scroll as before)
Offline-only: the API is blocked, no external request is allowed (counted)."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
BASE = next((a for a in sys.argv[1:] if a.startswith('http')), 'http://localhost:8351/')
AXE = open(os.path.join(os.path.dirname(__file__), '..', 'axe.min.js')).read()
fails = []
def check(ok, name, info=''):
    print(('PASS ' if ok else 'FAIL ') + name, info if not ok or info else '')
    if not ok: fails.append(name)
PROFILE = dict(hand='right', style='tweener', speed=15.0, rev=300, pap='', tilt='', owned=[], entered={'hand': True, 'style': True, 'speed': True, 'rev': True})
ROUTES = [('bag', '/bag'), ('lane', '/lane'), ('score', '/bowl'), ('arsenal', '/arsenal'), ('me', '/me')]
async def boot(b, prefs, scheme='dark'):
    ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=1, color_scheme=scheme, service_workers='block')
    ext = []
    ctx.on('request', lambda r: ext.append(r.url) if not r.url.startswith(BASE) and not r.url.startswith('data:') and 'arsenal-pro-api' not in r.url else None)
    await ctx.route('**/arsenal-pro-api.onrender.com/**', lambda r: r.fulfill(status=200, body='[]', content_type='application/json'))
    p = await ctx.new_page(); await p.goto(BASE + '#/me')
    await p.evaluate("([a,b]) => { localStorage.clear(); localStorage.setItem('ap_profile', JSON.stringify(a)); localStorage.setItem('ap_prefs', JSON.stringify(b)); localStorage.setItem('ap_device', 'd-qa-brand'); }", [PROFILE, dict(onboarded=True, help=False, **prefs)])
    await p.goto(BASE + '?qa=brand#/tonight'); await p.wait_for_function("() => window.__apData", timeout=15000)
    await p.evaluate("async () => { const [m, f] = await Promise.all([import('./js/hub.js'), import('./tests/data/fixtures/sample_arsenal.mjs')]); await m.ready(); if (!Object.keys(m.proj().owned || {}).length) await m.loadStarter(f.sampleEvents, f.SAMPLE_ID); }")
    await p.reload(); await p.wait_for_timeout(500)
    return ctx, p, ext
async def attrs(p): return await p.evaluate("() => ({t: document.documentElement.dataset.theme, b: document.documentElement.dataset.brand, bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(), meta: document.querySelector('meta[name=theme-color]').content})")
async def go(p, r): await p.evaluate("r => { location.hash = r; }", r); await p.wait_for_timeout(700)
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        # 1 legacy + bad value
        ctx, p, ext = await boot(b, dict(theme='dark')); a = await attrs(p)
        check(a['b'] == 'pine' and a['t'] == 'dark' and a['bg'].upper() == '#0B0F0D' and a['meta'].upper() == '#0B0F0D', 'old install (theme only) -> pine dark, tokens unchanged', json.dumps(a)); await ctx.close()
        ctx, p, ext = await boot(b, dict(theme='dark', brand='<script>')); a = await attrs(p)
        check(a['b'] == 'pine', 'unknown brand value -> default', json.dumps(a)); await ctx.close()
        # 2 + 3 picker
        ctx, p, ext = await boot(b, dict(theme='dark'))
        await go(p, '/bag'); taps = 0
        await p.click('#meBtn'); taps += 1; await p.wait_for_timeout(600)
        opt = p.locator('#look-maple'); await opt.scroll_into_view_if_needed(); box = await opt.bounding_box()
        check(box['height'] >= 44 and box['width'] >= 44, 'look option is a 44 px target', json.dumps(box))
        await opt.click(); taps += 1; await p.wait_for_timeout(300); a = await attrs(p)
        check(taps == 2 and a['b'] == 'maple' and a['bg'].upper() == '#15110D' and a['meta'].upper() == '#15110D', 'Bag -> Me -> Maple look in 2 taps; page and theme-color follow', json.dumps(a))
        check(await p.evaluate("() => document.querySelector('#look-maple').getAttribute('aria-checked') === 'true' && getComputedStyle(document.querySelector('#look-maple'), '::after').content.includes('\\u2713')"), 'chosen look shows a tick, not only a color')
        check(await p.evaluate("() => JSON.parse(localStorage.ap_prefs).brand") == 'maple', 'saved in ap_prefs (works offline: no network involved)')
        await p.reload(); await p.wait_for_timeout(500); a = await attrs(p); check(a['b'] == 'maple' and a['t'] == 'dark', 'remembered after reload', json.dumps(a))
        await p.evaluate("() => { location.hash = '#/me'; }"); await p.wait_for_timeout(500)
        await p.locator('.seg-opt[data-v=light]').click(); await p.wait_for_timeout(200); a = await attrs(p)
        check(a['t'] == 'light' and a['b'] == 'maple' and a['bg'].upper() == '#FAF5EB' and a['meta'].upper() == '#FAF5EB', 'Light mode keeps the look; theme-color follows', json.dumps(a))
        check(await p.evaluate("() => document.querySelector('#look-night').dataset.theme") == 'light', 'previews switch to the current mode')
        await p.locator('.seg-opt[data-v=system]').click(); await p.wait_for_timeout(200); a = await attrs(p); check(a['t'] == 'dark', 'Auto follows the phone (dark here)', json.dumps(a)); await ctx.close()
        ctx, p, ext = await boot(b, dict(theme='system'), scheme='light'); a = await attrs(p); check(a['t'] == 'light' and a['b'] == 'pine', 'Auto + phone light -> light pine', json.dumps(a)); await ctx.close()
        # 4 + 5 axe and fit, all looks
        for brand in ('pine', 'maple', 'night'):
            for mode in ('dark', 'light'):
                ctx, p, ext = await boot(b, dict(theme=mode, brand=brand)); bad = []; scroll = []
                for name, r in ROUTES:
                    await go(p, r); await p.wait_for_timeout(300)
                    await p.evaluate(AXE)
                    v = await p.evaluate("async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.filter(x => ['serious','critical'].includes(x.impact)).map(x => x.id + ':' + x.nodes.length)")
                    if v: bad.append((name, v))
                    m = await p.evaluate("() => ({v: document.documentElement.scrollHeight - innerHeight, h: document.documentElement.scrollWidth - innerWidth})")
                    if m['h'] > 0 or (name in ('lane', 'score', 'arsenal') and m['v'] > 0): scroll.append((name, m))
                check(not bad, f'axe serious/critical = 0 [{brand} {mode}] Bag Lane Score Arsenal Me', json.dumps(bad))
                check(not scroll, f'no sideways scroll; Lane, Score, Arsenal fit 390x844 [{brand} {mode}]', json.dumps(scroll))
                check(not ext, f'no external requests [{brand} {mode}]', json.dumps(ext[:3])); await ctx.close()
        await b.close()
    print(f"\n{'FAIL: ' + ', '.join(fails) if fails else 'ALL PASS'}"); sys.exit(1 if fails else 0)
asyncio.run(main())
