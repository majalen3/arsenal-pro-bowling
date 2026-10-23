"""Arsenal Pro 2.0 end-to-end tests (Playwright, Chromium).
usage: python tests/e2e.py [BASE_URL] [--shots DIR]
Runs every core job at phone (390x844) and desktop (1280x800), plus routing/back, v1 localStorage
migration, offline (service worker), axe (0 serious/critical) and 44px target checks.
The live API is blocked so tests never write to the server (saves stay queued locally)."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
BASE = next((a for a in sys.argv[1:] if a.startswith('http')), 'http://127.0.0.1:8300/')
SHOTS = sys.argv[sys.argv.index('--shots') + 1] if '--shots' in sys.argv else None
AXE = open(os.path.join(os.path.dirname(__file__), 'axe.min.js')).read()
API = '**/arsenal-pro-api.onrender.com/**'
fails, passes = [], []
def check(cond, name):
    (passes if cond else fails).append(name); print(('PASS ' if cond else 'FAIL ') + name)

async def ctx_for(b, kind, **kw):
    vp = {'width': 390, 'height': 844} if kind == 'phone' else {'width': 1280, 'height': 800}
    c = await b.new_context(viewport=vp, is_mobile=kind == 'phone', has_touch=kind == 'phone', device_scale_factor=2 if kind == 'phone' else 1, **kw)
    await c.route(API, lambda r: r.abort())
    c.set_default_timeout(10000)
    return c

async def page(c, errs):
    p = await c.new_page()
    p.on('pageerror', lambda e: errs.append(str(e)))
    return p

async def shot(p, name):
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); await p.screenshot(path=os.path.join(SHOTS, name + '.png'))

async def seed(p, onboarded=True):
    await p.goto(BASE); await p.evaluate("localStorage.clear()")
    if onboarded: await p.evaluate("localStorage.setItem('ap_prefs', JSON.stringify({onboarded:true}))")

async def run(b, kind):
    errs = []; c = await ctx_for(b, kind); p = await page(c, errs); t = f'[{kind}] '
    # onboarding: first visit -> welcome, skippable, never shown again
    await p.goto(BASE); await p.evaluate("localStorage.clear()"); await p.goto(BASE + '?fresh'); await p.wait_for_timeout(600)
    check('#/welcome' in p.url, t + 'first visit opens welcome'); await shot(p, f'{kind}-welcome')
    await p.click('#welSkip'); await p.wait_for_selector('#ballBtn')
    check('#/lane' in p.url, t + 'skip lands on lane')
    await p.goto(BASE); await p.wait_for_selector('#ballBtn'); check('#/welcome' not in p.url, t + 'welcome not repeated')
    await shot(p, f'{kind}-lane')
    # pin deck close-up: readable size, real pocket, text alternative, tone by result
    bb = await (await p.query_selector('#deck')).bounding_box()
    check(bb['width'] >= 180, t + f"pin deck is large enough ({round(bb['width'])}px wide)")
    lbl = await p.get_attribute('#deck', 'aria-label')
    check('1-3 pocket' in lbl and 'Enters board' in lbl and 'Model:' in lbl and ('pins down' in lbl or 'leaves the' in lbl), t + 'pin deck has text alternative with 1-3 pocket, entry and model pin action')
    cap = await p.text_content('#deckCap')
    check('approximate 2-D model' in cap and await p.query_selector('#deckCap a[href*="DEFLECTION"]') is not None, t + 'pin action labelled as an approximate model with a sources link')
    check(await p.get_attribute('#deckCard', 'data-tone') in ('good', 'warn', 'info', 'bad'), t + 'pin deck coloured by result')
    if SHOTS: await (await p.query_selector('#deckCard')).screenshot(path=os.path.join(SHOTS, f'{kind}-deck.png'))
    # J1 change ball: 2 taps
    before = await p.text_content('.ball-btn-name')
    await p.click('#ballBtn'); await p.wait_for_selector('#ballSheet')
    await shot(p, f'{kind}-ball-sheet')
    await p.click('#ballSheet .brow:nth-child(4) .brow-main'); await p.wait_for_timeout(400)
    after = await p.text_content('.ball-btn-name')
    check(after != before and not await p.is_visible('#ballSheet'), t + f'J1 ball switch in 2 taps ({before} -> {after})')
    # G1a quick-ball strip: 1 tap, current ball never listed, previous ball offered back
    qn = await p.locator('#qballs .qball[data-ball]').count(); cur = await p.evaluate("JSON.parse(localStorage.getItem('ap_state')||'{}').ball")
    ids = await p.eval_on_selector_all('#qballs .qball[data-ball]', 'es=>es.map(e=>e.dataset.ball)')
    check(qn >= 3 and cur not in ids, t + f'quick-ball strip lists {qn} other balls, not the current one')
    q0 = await p.text_content('#qballs .qball[data-ball] .qball-name'); await p.click('#qballs .qball[data-ball]'); await p.wait_for_timeout(400)
    check((await p.text_content('.ball-btn-name')) == q0, t + f'1-tap ball switch from strip ({q0})')
    check(after in await p.eval_on_selector_all('#qballs .qball[data-ball] .qball-name', 'es=>es.map(e=>e.textContent)'), t + 'previous ball offered first in strip')
    await p.click('#qballs .qball[data-ball]'); await p.wait_for_timeout(300)
    check((await p.text_content('.ball-btn-name')) == after, t + 'strip switches back in 1 tap')
    # J2 miss left: 1 tap, 2-and-1 rule, undo
    s0 = await p.evaluate("JSON.parse(localStorage.getItem('ap_state')||'null')") or {}
    rel0 = int(await p.text_content('#lineSum b')); await p.click('[data-miss=left]'); await p.wait_for_timeout(500)
    rel1 = int(await p.text_content('#lineSum b')); check(rel1 == min(30, rel0 + 2), t + f'J2 miss-left moves feet 2 ({rel0}->{rel1}) in 1 tap')
    shots = await p.evaluate("JSON.parse(localStorage.getItem('ap_shots')||'[]').length"); check(shots >= 1, t + 'miss logged to ap_shots')
    await shot(p, f'{kind}-miss')
    await p.click('.toast-act'); await p.wait_for_timeout(400)
    check(int(await p.text_content('#lineSum b')) == rel0, t + 'undo restores the line')
    # J3 save line (offline queue since API blocked): 1 tap + verify in Sessions
    await p.click('#saveBtn'); await p.wait_for_timeout(600)
    lines = await p.evaluate("JSON.parse(localStorage.getItem('ap_lines')||'[]')")
    check(len(lines) == 1 and lines[0].get('synced') is False, t + 'J3 save line stored locally + queued')
    # G1b back to saved line: hidden on the line, appears after a miss, 1 tap restores
    check(not await p.is_visible('#backBtn'), t + 'back-to-saved hidden while on the saved line')
    await p.click('[data-miss=right]'); await p.wait_for_timeout(400)
    check(await p.is_visible('#backBtn') and lines[0]['name'] in (await p.get_attribute('#backBtn', 'aria-label')), t + 'back-to-saved appears after a change, named')
    await p.click('#backBtn'); await p.wait_for_timeout(400)
    st = await p.evaluate("JSON.parse(localStorage.getItem('ap_state')||'{}')")
    check(float(st.get('release')) == lines[0]['release'] and float(st.get('aim')) == lines[0]['aim'] and not await p.is_visible('#backBtn'), t + 'J3 back to saved line in 1 tap (save, miss, back = 3 taps)')
    await p.click('#tabs a[href="#/sessions"]'); await p.wait_for_selector('.line-card')
    check(await p.locator('.line-card').count() == 1, t + 'saved line visible in Sessions'); await shot(p, f'{kind}-sessions')
    # load line from sessions -> lane
    await p.click('.line-card .line-row'); await p.wait_for_timeout(500)
    check('#/lane' in p.url, t + 'tap saved line loads it on lane')
    # J4 pattern -> lane
    await p.goto(BASE + '#/patterns'); await p.wait_for_selector('#patSearch')
    await p.fill('#patSearch', 'shark'); await p.wait_for_timeout(400); await shot(p, f'{kind}-patterns')
    await p.click('#patList a >> nth=0'); await p.wait_for_selector('#useOnLane'); await p.wait_for_timeout(300); await shot(p, f'{kind}-pattern')
    check('Kegel' in (await p.text_content('#view')), t + 'pattern cites Kegel library source')
    await p.click('#useOnLane'); await p.wait_for_selector('#patChip')
    check('Sport' in (await p.text_content('#patChip')) or 'Shark' in (await p.text_content('#patChip')), t + 'J4 pattern applied to lane (' + (await p.text_content('#patChip')).strip() + ')')
    # J5 compare 2 balls in Arsenal
    await p.click('#tabs a[href="#/arsenal"]'); await p.wait_for_selector('#arsGrid')
    await p.click('.cmp-btn >> nth=0'); await p.click('.cmp-btn >> nth=1'); await p.click('#trayGo'); await p.wait_for_selector('.cmp-table')
    check(await p.locator('.cmp-col').count() == 2, t + 'J5 compare two balls'); await p.wait_for_timeout(700); await shot(p, f'{kind}-compare')
    # back button: sheet closes before route changes
    await p.goto(BASE + '#/lane'); await p.wait_for_selector('#ballBtn'); await p.click('#ballBtn'); await p.wait_for_selector('#ballSheet')
    await p.go_back(); await p.wait_for_timeout(400)
    check(not await p.is_visible('#ballSheet') and '#/lane' in p.url, t + 'Back closes sheet first')
    # deep link + bad id = empty state, not dead end
    await p.goto(BASE + '#/ball/nope'); await p.wait_for_timeout(500)
    check(await p.locator('.empty a, .empty button').count() >= 1, t + 'unknown ball shows recovery action')
    # axe on every route
    for r in ['#/lane', '#/arsenal', '#/arsenal/insights', '#/ball/hy-road', '#/compare?ids=hy-road,rattler', '#/patterns', '#/pattern/2024-pba-shark', '#/sessions', '#/more', '#/welcome']:
        await p.goto(BASE + r); await p.wait_for_timeout(700)
        await p.add_script_tag(url=BASE + 'tests/axe.min.js')
        res = await p.evaluate("axe.run(document,{resultTypes:['violations']}).then(r=>r.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id+':'+v.nodes.length))")
        check(not res, t + f'axe {r} serious/critical=0 {res}')
        w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]')
        check(w[1] <= (390 if kind == 'phone' else 1280), t + f'{r} no horizontal overflow {w}')
    await p.goto(BASE + '#/lane'); await p.wait_for_selector('#ballBtn'); await p.wait_for_timeout(600)  # let the route-enter transform finish before measuring sizes
    small = await p.evaluate("""[...document.querySelectorAll('button, a[href], input, select, [role=slider]')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0 && r.height>0 && getComputedStyle(e).visibility!=='hidden' && !e.closest('.sr-only') && (r.width<44||r.height<44) && !(e.type==='range')}).map(e=>(e.id||e.className||e.tagName)+' '+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height))""")
    check(not small, t + f'lane targets >= 44px {small[:6]}')
    check(not errs, t + f'no page errors {errs[:3]}')
    await c.close()

async def deck_cases(b):
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs)
    await p.goto(BASE); await p.evaluate("localStorage.clear();localStorage.setItem('ap_prefs','{\"onboarded\":true}');localStorage.setItem('ap_profile','{\"hand\":\"left\"}')")
    await p.goto(BASE + '#/lane'); await p.wait_for_selector('#deck'); await p.wait_for_timeout(400)
    lbl = await p.get_attribute('#deck', 'aria-label')
    check('1-2 pocket' in lbl and 'then the 2 pin' in lbl, '[deck] left hand highlights the 1-2 pocket')
    await p.evaluate("localStorage.setItem('ap_profile','{\"hand\":\"right\"}')"); await p.reload(); await p.wait_for_selector('#deck')
    await p.click('[data-miss=right]'); await p.click('[data-miss=right]'); await p.wait_for_timeout(500)
    check(await p.get_attribute('#deckCard', 'data-tone') == 'info' and 'Light' in await p.get_attribute('#deck', 'aria-label'), '[deck] light hit coloured as light')
    if SHOTS: await (await p.query_selector('#deckCard')).screenshot(path=os.path.join(SHOTS, 'phone-deck-light.png'))
    for _ in range(4): await p.click('[data-miss=left]')
    await p.wait_for_timeout(500)
    check(await p.get_attribute('#deckCard', 'data-tone') == 'bad' and 'High' in await p.get_attribute('#deck', 'aria-label'), '[deck] high hit coloured as high')
    if SHOTS: await (await p.query_selector('#deckCard')).screenshot(path=os.path.join(SHOTS, 'phone-deck-high.png'))
    # pin-action model vs USBC Pin Carry Study (2009) qualitative outcomes, right-hander, 5 deg
    sim = await p.evaluate("""async()=>{const m=await import('./js/pinsim.js');const f=(b,a)=>{const r=m.simulate(b,a);return {down:r.down.length,byBall:r.byBall,exitX:r.ball.exitX,defl:r.ball.deflect}};return {pocket:f(17.5,5),light:f(16.5,5),high:f(18.5,5)}}""")
    pk = sim['pocket']
    check(pk['down'] == 10 and {1, 3, 5} <= set(pk['byBall']) and 0 < pk['exitX'] < 6 and pk['defl'] < 0, f'[deck] pocket hit: model strike, ball takes 1-3-5, deflects right, exits just left of the 9 spot {pk}')
    check(sim['light']['exitX'] > 6, f"[deck] light hit: ball exits right of the 9 spot {sim['light']}")
    check(sim['high']['exitX'] < 0, f"[deck] high hit: ball goes left off the deck {sim['high']}")
    check(not errs, '[deck] no page errors')
    await c.close()

async def migration(b):
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs)
    await p.goto(BASE); await p.evaluate("""localStorage.clear();
      localStorage.setItem('ap_device','d-test-0000');
      localStorage.setItem('ap_state', JSON.stringify({ball:'hy-road',speed:'17',rev:'300',release:'20',aim:'4',oil:'1.2',finish:'2000',pattern:'sport'}));
      localStorage.setItem('ap_lines', JSON.stringify([{ballId:'hy-road',name:'v1 line',release:20,aim:4,speed:17,rev:300,oil:1.2,finish:'2000',pattern:'sport',note:'',updatedAt:1,synced:true,id:7}]));""")
    await p.goto(BASE + '?m'); await p.wait_for_selector('#ballBtn')
    check('welcome' not in p.url and await p.locator('#ballBtn').is_visible(), '[migrate] v1 user skips welcome')
    check('Hy-Road' in await p.text_content('.ball-btn-name'), '[migrate] v1 ball restored')
    check(int(await p.text_content('#lineSum b')) == 20, '[migrate] v1 feet restored')
    check(await p.evaluate("localStorage.getItem('ap_device')") == 'd-test-0000', '[migrate] backup code kept')
    await p.goto(BASE + '#/sessions'); await p.wait_for_selector('.line-card')
    check('v1 line' in await p.text_content('#lineList'), '[migrate] v1 saved lines listed')
    await c.close()

async def offline(b):
    errs = []; c = await ctx_for(b, 'phone', service_workers='allow'); p = await page(c, errs)
    await p.goto(BASE + '#/lane'); await p.wait_for_selector('#ballBtn')
    await p.evaluate("Promise.race([navigator.serviceWorker.ready.then(()=>1), new Promise(r=>setTimeout(()=>r(0),8000))])"); await p.wait_for_timeout(1500)
    await p.reload(); await p.wait_for_selector('#ballBtn'); await p.wait_for_timeout(500)
    await c.set_offline(True)
    for r in ['#/lane', '#/arsenal', '#/patterns', '#/sessions']:
        await p.goto(BASE + r); await p.wait_for_timeout(800)
        check(await p.locator('#view h1').count() >= 1, f'[offline] {r} renders from cache')
    await p.goto(BASE + '#/lane'); await p.wait_for_selector('#ballBtn'); await p.click('#saveBtn'); await p.wait_for_timeout(500)
    check(await p.evaluate("JSON.parse(localStorage.getItem('ap_lines')||'[]').some(l=>!l.synced)"), '[offline] save queued while offline')
    await c.close()

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
        steps = [('phone', lambda: run(b, 'phone')), ('desktop', lambda: run(b, 'desktop')), ('deck', lambda: deck_cases(b)), ('migration', lambda: migration(b)), ('offline', lambda: offline(b))]
        for name, fn in steps:
            if only and name not in only: continue
            try: await asyncio.wait_for(fn(), 240)
            except Exception as e: check(False, f'[{name}] crashed or timed out: {type(e).__name__} {str(e)[:160]}')
        await b.close()
    print(f'\n{len(passes)} passed, {len(fails)} failed')
    for f in fails: print('  FAIL', f)
    sys.exit(1 if fails else 0)
asyncio.run(main())
