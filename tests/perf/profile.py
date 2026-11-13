"""Performance profile of the hot paths (owner t134u). Local, opt-in marks only (js/perf.js, ?perf=1): no network, no third party.

  python tests/perf/profile.py [BASE] [--runs N] [--cpu 4] [--out metrics.json]

BASE must be http://localhost:PORT/ (a service worker only registers on localhost/https). Chromium runs with the CPU throttled
(default 4x, like Lighthouse's mobile profile) so numbers resemble a mid-range phone. Local numbers are relative: python's
http.server is HTTP/1.0 and slower than GitHub Pages, so compare before/after on the SAME machine (the budget gate does).

Measures (median of N runs):
  cold   : empty app, fresh browser profile, #/bag and #/arsenal: first contentful paint, screen painted, bytes (JS/CSS/data),
           module count, long tasks, SW install time and cache size.
  data   : 50 balls / 500 games (tests/perf/synth.mjs): projection replay in the browser, route render per screen, Arsenal grid
           render and sort, Shake it up, Strike finder compute + draw, scoring tap-to-paint, Log book render.
"""
import asyncio, json, statistics, sys, time
from playwright.async_api import async_playwright

BASE = next((a for a in sys.argv[1:] if a.startswith('http')), 'http://localhost:8320/')
arg = lambda k, d: type(d)(sys.argv[sys.argv.index(k) + 1]) if k in sys.argv else d
RUNS, CPU, OUT = arg('--runs', 3), arg('--cpu', 4), arg('--out', '')
PREFS = "localStorage.setItem('ap_prefs', JSON.stringify({onboarded:true, handAsked:true, perfSeen:true}))"
WIPE = "() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('arsenal-pro'); q.onsuccess = q.onerror = q.onblocked = () => r(true); setTimeout(() => r(false), 2000); }); }"
TAPS = """(() => { window.__tap = { t0: 0, last: 0 };
  addEventListener('click', () => { window.__tap.t0 = performance.now(); window.__tap.last = 0; }, true);
  addEventListener('change', () => { window.__tap.t0 = performance.now(); window.__tap.last = 0; }, true);
  new MutationObserver(() => { if (window.__tap.t0) window.__tap.last = performance.now(); }).observe(document, { childList: true, subtree: true, attributes: true, characterData: true }); })()"""
med = lambda a: round(statistics.median(a), 1) if a else None

async def newctx(b, cpu=True, **kw):
    c = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2, service_workers='allow', **kw)
    await c.route('**/arsenal-pro-api.onrender.com/**', lambda r: r.abort())
    await c.add_init_script(PREFS)
    return c

async def throttle(c, p):
    if CPU > 1:
        s = await c.new_cdp_session(p); await s.send('Emulation.setCPUThrottlingRate', {'rate': CPU})

async def cold(b, route):
    """Empty app, fresh profile. Returns timings + bytes."""
    c = await newctx(b); p = await c.new_page(); await throttle(c, p)
    sizes = {'js': 0, 'css': 0, 'data': 0, 'other': 0}; n = {'js': 0}
    async def on_resp(r):
        try: body = await r.body()
        except Exception: return
        u = r.url.split('?')[0]; k = 'js' if u.endswith('.js') else 'css' if u.endswith('.css') else 'data' if u.endswith('.json') else 'other'
        sizes[k] += len(body); n['js'] += k == 'js'
    p.on('response', lambda r: asyncio.ensure_future(on_resp(r)))
    t0 = time.time(); await p.goto(BASE + '?perf=1' + route, wait_until='load')
    try: await p.wait_for_function("() => window.__perf && window.__perf.entries.some(e => e.name.startsWith('screen.painted'))", timeout=30000)
    except Exception: pass
    await p.wait_for_timeout(300)
    m = await p.evaluate("""() => { const pe = performance.getEntriesByType('paint'), fcp = pe.find(x => x.name === 'first-contentful-paint'), nav = performance.getEntriesByType('navigation')[0],
      E = window.__perf.entries; const painted = E.find(e => e.name.startsWith('screen.painted'));
      return { fcp: fcp && Math.round(fcp.startTime), dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), painted: painted && painted.ms,
        longtasks: E.filter(e => e.name === 'longtask').length, longtask_ms: Math.round(E.filter(e => e.name === 'longtask').reduce((a, e) => a + e.ms, 0)), nodes: document.getElementsByTagName('*').length }; }""")
    # service worker: time until it controls the page, and the size of what it cached
    sw = await p.evaluate("""async () => { const t0 = performance.now(); const reg = await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 30000))]);
      const t = Math.round(performance.now() - t0); let bytes = 0, files = 0; for (const k of await caches.keys()) { const c = await caches.open(k); for (const q of await c.keys()) { const r = await c.match(q); const b = await r.clone().arrayBuffer(); bytes += b.byteLength; files++; } }
      return { ready_ms: reg ? t : null, files, bytes }; }""")
    await p.wait_for_timeout(200)
    await c.close(); m.update(sizes); m['modules'] = n['js']; m['sw'] = sw; return m

async def load_big(p):
    await p.goto(BASE + '#/bag'); await p.evaluate(WIPE); await p.evaluate(PREFS)
    await p.goto(BASE + '?seed#/bag'); await p.wait_for_function('() => window.__apData', timeout=20000)
    n = await p.evaluate("""async () => { const [h, s] = await Promise.all([import('./js/hub.js'), import('./tests/perf/synth.mjs')]); await h.ready();
      const ev = s.bigEvents(); const t0 = performance.now(); await h.addMany(ev); const P = h.proj();
      // a night and a bag so Tonight / Bag / Strike have something to show
      return { events: ev.length, balls: Object.keys(P.owned).length, append_ms: Math.round(performance.now() - t0) }; }""")
    return n

async def entries(p, name=None):
    return await p.evaluate("(n) => window.__perf ? window.__perf.entries.filter(e => !n || e.name === n || e.name.startsWith(n)).map(e => [e.name, e.ms, e.info]) : []", name)

async def settle(p, wait=450):
    await p.wait_for_timeout(wait)
    return await p.evaluate("() => window.__tap.last ? Math.round((window.__tap.last - window.__tap.t0) * 10) / 10 : null")

SEQ = [0]
async def data_run(b):
    c = await newctx(b); p = await c.new_page(); res = {}
    info = await load_big(p); res['dataset'] = info
    await throttle(c, p)
    await p.add_init_script(TAPS)
    async def visit(route, key, ready, **kw):
        out = []
        for i in range(RUNS):
            SEQ[0] += 1; await p.goto(BASE + f'?perf=1&v={SEQ[0]}{route}'); await p.wait_for_selector(ready, timeout=30000); await p.wait_for_timeout(250)
            E = await entries(p)
            pr = [e for e in E if e[0].startswith('screen.painted')]
            out.append({'painted': pr[0][1] if pr else None, 'render': next((e[1] for e in E if e[0] == 'route.render'), None), 'project': next((e[1] for e in E if e[0] == 'project'), None),
                        'projections': sum(1 for e in E if e[0] == 'project'), 'longtasks': sum(1 for e in E if e[0] == 'longtask')})
        res[key] = {k: med([o[k] for o in out if o[k] is not None]) for k in out[0]}
    await visit('#/bag', 'route_bag', '#bagRows')
    await visit('#/arsenal', 'route_arsenal', '#armList [data-own]')
    await visit('#/results', 'route_log', '#view .screen')
    await visit('#/tonight', 'route_strikeline', '#tnFindLine')
    await visit('#/lane', 'route_lane', '#optimize')
    await visit('#/me', 'route_me', '#view .screen')
    await visit('#/bowl', 'route_game', '#qlStrike, #qlSpare, #noBag')
    # replay in the page itself: the cost of one projection of the whole log
    res['replay'] = await p.evaluate("""async () => { const h = await import('./js/hub.js'), pj = await import('./js/data/project.js'); const ev = h.db.events(); const t = [];
      for (let i = 0; i < 7; i++) { const t0 = performance.now(); pj.project(ev); t.push(performance.now() - t0); } t.sort((a, b) => a - b); return { events: ev.length, median_ms: Math.round(t[3] * 10) / 10 }; }""")
    # Arsenal grid: sort change, search, tap a tile
    await p.goto(BASE + '?perf=1#/arsenal'); await p.wait_for_selector('#armList [data-own]'); await p.wait_for_timeout(300)
    sorts = []; grid = []
    for k in ['strength', 'brand', 'newest', 'name', 'used']:
        await p.evaluate("() => { window.__perf.entries.length = 0; }"); await p.select_option('#armSort', k); sorts.append(await settle(p, 300))
        grid += [e[1] for e in await entries(p, 'arsenal.grid')]
    res['arsenal'] = {'tiles': await p.locator('.arm-tile').count(), 'sort_tap_settle_ms': med(sorts), 'grid_render_ms': med(grid)}
    await p.evaluate("() => { window.__perf.entries.length = 0; }")
    await p.click('#armList [data-own] a'); res['arsenal']['tile_to_ball_ms'] = await settle(p, 500)
    # Bag: Shake it up
    await p.goto(BASE + '?perf=1#/bag'); await p.wait_for_selector('#bagRows'); await p.wait_for_timeout(300)
    shakes = []
    for i in range(RUNS):
        await p.evaluate("() => { window.__perf.entries.length = 0; }"); await p.click('#bagShake'); shakes.append(await settle(p, 500))
    res['bag'] = {'shake_tap_settle_ms': med(shakes), 'draw_ms': med([e[1] for e in await entries(p, 'bag.draw')])}
    # v77 (owner t143u): the strike page is the Lane view; Optimize runs the Forgiving sweep on the tap (never on load). Measured on the tap.
    ff = []
    for i in range(RUNS):
        SEQ[0] += 1; await p.goto(BASE + f'?perf=1&g={SEQ[0]}#/lane'); await p.wait_for_selector('#optimize', timeout=30000); await p.wait_for_timeout(300)
        await p.evaluate("() => { window.__perf.entries.length = 0; }"); await p.click('#optimize'); await p.wait_for_selector('#optOut:not([hidden])', timeout=30000); await p.wait_for_timeout(200)
        ff += [e[1] for e in await entries(p, 'lane.optimize')]
    res['strike'] = {'optimize_ms': med(ff)}
    # scoring tap-to-paint: on the game page, a strike every ~600 ms
    await p.goto(BASE + '?perf=1#/tonight'); await p.wait_for_timeout(500)
    try:
        await p.goto(BASE + '?perf=1#/bowl'); await p.wait_for_selector('#qlStrike', timeout=20000)
        await p.evaluate("() => { window.__perf.entries.length = 0; }")
        for i in range(5):
            if await p.query_selector('#qlStrike'): await p.click('#qlStrike'); await p.wait_for_timeout(700)
        E = await entries(p, 'score.tap'); res['score'] = {'taps': len(E), 'tap_to_paint_ms': med([e[1] for e in E]), 'max_ms': max([e[1] for e in E] or [0]),
              'projections_per_tap': round(sum(1 for e in await entries(p, 'project')) / max(1, len(E)), 1), 'project_ms': med([e[1] for e in await entries(p, 'project')]), 'draw_ms': med([e[1] for e in await entries(p, 'tonight.draw')])}
    except Exception as e:
        res['score'] = {'error': str(e)[:120]}
    res['caches'] = await p.evaluate("() => window.__perf.counts")
    await c.close(); return res

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); R = {'cpu_throttle': CPU, 'runs': RUNS, 'base': BASE}
        for route, key in [('#/bag', 'cold_bag'), ('#/arsenal', 'cold_arsenal'), ('#/tonight', 'cold_strikeline'), ('#/results', 'cold_log')]:
            runs = [await cold(b, route) for _ in range(RUNS)]
            R[key] = {k: (med([r[k] for r in runs if r[k] is not None]) if not isinstance(runs[0][k], dict) else {kk: med([r[k][kk] for r in runs if r[k][kk] is not None]) for kk in runs[0][k]}) for k in runs[0]}
        R['data'] = await data_run(b)
        await b.close()
    txt = json.dumps(R, indent=1); print(txt)
    if OUT: open(OUT, 'w').write(txt)
asyncio.run(main())
