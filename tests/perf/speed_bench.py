# v81 speed bench (owner t160u): cold route loads, My Team open (cached / not), Block and Hide with a slow API, Add a ball keystroke.
# Mock API only (Playwright route), 4x CPU. usage: python tests/perf/speed_bench.py http://localhost:PORT/ label [runs]
import asyncio, json, sys, time, statistics as st
from playwright.async_api import async_playwright
BASE, LABEL = sys.argv[1], sys.argv[2]; RUNS = int(sys.argv[3]) if len(sys.argv) > 3 else 3
API = 'https://arsenal-pro-api.onrender.com'
UID = 'u-bench'; NOW = '2026-11-21T17:00:00.000Z'
VIEW = {'moderation': 2, 'team': {'id': 't1', 'name': 'Thursday Rollers', 'night': 'Thu', 'time': '18:30', 'createdAt': NOW},
  'me': {'memberId': 'm0', 'role': 'secretary', 'displayName': 'Maja', 'hidden': False},
  'members': [{'memberId': 'm0', 'displayName': 'Maja', 'role': 'secretary', 'joinedAt': NOW, 'shares': {}}] +
    [{'memberId': f'm{i}', 'displayName': f'Bowler {i}', 'role': 'member', 'joinedAt': NOW, 'shares': {'bag': {'data': {'title': 'Tonight', 'balls': [{'name': f'Ball {j}', 'role': 'benchmark', 'why': ''} for j in range(6)]}, 'updatedAt': NOW}, 'tags': {'data': {'tags': []}, 'updatedAt': NOW}}} for i in range(1, 9)],
  'notes': [{'id': str(k), 'memberId': f'm{1 + k % 8}', 'lanes': '5-6', 'text': f'Note {k}: the pair hooked early', 'createdAt': NOW} for k in range(30)],
  'reports': [{'id': '1', 'reporter': 'm2', 'aboutMember': 'm3', 'noteId': None, 'reason': 'test', 'createdAt': NOW}]}
LIST = {'teams': [{'id': 't1', 'name': 'Thursday Rollers', 'night': 'Thu', 'time': '18:30', 'createdAt': NOW, 'role': 'secretary', 'memberId': 'm0', 'displayName': 'Maja', 'members': 9}]}
DELAY = 2.5   # seconds per API answer: a slow phone network or a Render cold start (measured 5.1 s cold, 0.1 s warm)

async def api(route):
    u = route.request.url; m = route.request.method
    if m == 'OPTIONS': return await route.fulfill(status=204, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'})
    await asyncio.sleep(DELAY)
    h = {'access-control-allow-origin': '*', 'content-type': 'application/json'}
    if u.endswith('/api/account/teams'): body = LIST
    elif u.endswith('/api/account/teams/t1'): body = VIEW
    elif '/invites' in u: body = {'invites': []}
    elif '/hide' in u: body = {'ok': True}
    else: body = {}
    await route.fulfill(status=200, headers=h, body=json.dumps(body))

SEED = """(c) => { localStorage.setItem('ap_account', JSON.stringify({token:'bench', expiresAt:'2027-01-01T00:00:00.000Z', user:{id:'%s', email:'b@example.com'}, pending:false}));
  localStorage.setItem('ap_prefs', JSON.stringify({onboarded:true})); if (c) localStorage.setItem('ap_team_cache', JSON.stringify({user:'%s', list:{at:Date.now()-3600e3, teams:%s}, views:{t1:{at:Date.now()-3600e3, view:%s}}})); }""" % (UID, UID, json.dumps(LIST['teams']), json.dumps(VIEW))

async def ctx(b, cpu=4):
    c = await b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); p = await c.new_page()
    await c.route(API + '/**', api)
    cdp = await c.new_cdp_session(p); await cdp.send('Emulation.setCPUThrottlingRate', {'rate': cpu})
    return c, p

async def team_open(b, cached):
    c, p = await ctx(b)
    await p.goto(BASE + '#/me'); await p.wait_for_function('() => window.__apData || document.querySelector("#view section")', timeout=20000)
    await p.evaluate(SEED, cached)
    t0 = time.time(); await p.goto(BASE + '#/team'); await p.reload()
    await p.wait_for_selector('#tmHead', timeout=30000); first = (time.time() - t0) * 1000
    await p.wait_for_selector('#tmShareBtn:not([disabled])', timeout=30000); live = (time.time() - t0) * 1000
    await c.close(); return first, live

async def team_actions(b):
    c, p = await ctx(b)
    await p.goto(BASE + '#/me'); await p.wait_for_function('() => document.querySelector("#view section")', timeout=20000)
    await p.evaluate(SEED, True); await p.goto(BASE + '#/team'); await p.reload()
    await p.wait_for_selector('#tmShareBtn:not([disabled])', timeout=30000)
    # watch for a blank team body
    await p.evaluate("""() => { window.__blank = 0; window.__bt = 0; const b = document.querySelector('#teamBody'); new MutationObserver(() => { const now = performance.now();
      if (!b.childElementCount) { if (!window.__bt) window.__bt = now; } else if (window.__bt) { window.__blank += now - window.__bt; window.__bt = 0; } }).observe(b, {childList:true}); }""")
    t0 = time.time(); await p.click('[data-block="m1"]'); await p.click('.sheet button:has-text("Block")')
    await p.wait_for_selector('[data-unblock="m1"]', timeout=30000); block = (time.time() - t0) * 1000
    await p.wait_for_timeout(DELAY * 2000 + 500)
    await p.wait_for_selector('[data-hide="m2"]:not([disabled])', timeout=30000)
    t0 = time.time(); await p.click('[data-hide="m2"]'); await p.click('.sheet button:has-text("Hide")')
    await p.wait_for_function("() => /hidden from the team/.test(document.querySelector('#toast')?.textContent || '')", timeout=30000)
    await p.wait_for_selector('[data-hide="m2"]:not([disabled])', timeout=30000); hide = (time.time() - t0) * 1000
    blank = await p.evaluate('window.__blank + (window.__bt ? performance.now() - window.__bt : 0)')
    await c.close(); return block, hide, blank

async def cold(b, route):
    c, p = await ctx(b)
    t0 = time.time(); await p.goto(BASE + '#/' + route)
    await p.wait_for_function('() => document.querySelector("#view > section")', timeout=30000); ms = (time.time() - t0) * 1000
    await p.wait_for_timeout(1500)
    r = await p.evaluate("() => { const e = performance.getEntriesByType('resource').filter(x => /\\.js$/.test(x.name.split('?')[0])); return [e.length, e.reduce((a, x) => a + (x.decodedBodySize || 0), 0)]; }")
    await c.close(); return ms, r[0], r[1]

async def typing(b):
    c, p = await ctx(b)
    await p.goto(BASE + '#/add-ball'); await p.wait_for_selector('#abQ', timeout=30000); await p.wait_for_timeout(800)
    ts = []
    for word in ['storm phaze', 'hammer black widow', 'roto grip']:
        await p.fill('#abQ', '')
        for ch in word:
            ts.append(await p.evaluate("(ch) => { const q = document.querySelector('#abQ'); const t = performance.now(); q.value += ch; q.dispatchEvent(new Event('input', {bubbles:true})); return performance.now() - t; }", ch))
    await c.close(); return st.median(ts), max(ts)

async def main():
    out = {}
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for route in ['bag', 'arsenal', 'tonight', 'lane', 'team']:
            rs = [await cold(b, route) for _ in range(RUNS)]
            out['cold_' + route] = {'painted_ms': round(st.median(r[0] for r in rs)), 'js_modules': rs[0][1], 'js_bytes': rs[0][2]}
        for cached in (False, True):
            rs = [await team_open(b, cached) for _ in range(RUNS)]
            out['team_open_' + ('cached' if cached else 'nocache')] = {'first_team_paint_ms': round(st.median(r[0] for r in rs)), 'buttons_live_ms': round(st.median(r[1] for r in rs))}
        rs = [await team_actions(b) for _ in range(RUNS)]
        out['team_actions'] = {'block_to_painted_ms': round(st.median(r[0] for r in rs)), 'hide_to_settled_ms': round(st.median(r[1] for r in rs)), 'blank_body_ms': round(st.median(r[2] for r in rs))}
        rs = [await typing(b) for _ in range(RUNS)]
        out['addball_keystroke'] = {'median_ms': round(st.median(r[0] for r in rs), 1), 'max_ms': round(max(r[1] for r in rs), 1)}
        await b.close()
    print(json.dumps({LABEL: out}, indent=1))
    json.dump(out, open(f'bench-{LABEL}.json', 'w'), indent=1)
asyncio.run(main())
