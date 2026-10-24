"""Arsenal Pro 2.0 end-to-end tests (Playwright, Chromium).
usage: python tests/e2e.py [BASE_URL] [--shots DIR]
Runs every core job at phone (390x844) and desktop (1280x800), plus routing/back, v1 localStorage
migration, offline (service worker), axe (0 serious/critical) and 44px target checks.
The live API is blocked so tests never write to the server (saves stay queued locally)."""
import asyncio, json, os, re, sys
from playwright.async_api import async_playwright
BASE = next((a for a in sys.argv[1:] if a.startswith('http')), 'http://127.0.0.1:8300/')
SHOTS = sys.argv[sys.argv.index('--shots') + 1] if '--shots' in sys.argv else None
AXE = open(os.path.join(os.path.dirname(__file__), 'axe.min.js')).read()
API = '**/arsenal-pro-api.onrender.com/**'
# wipe = localStorage + the v1 IndexedDB event log (the page closes its connection on versionchange)
WIPE = "() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('arsenal-pro'); q.onsuccess = q.onerror = q.onblocked = () => r(true); setTimeout(() => r(false), 2000); }); }"
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

async def qtap(p, sel):
    # Tonight ignores a repeat throw tap within 400 ms (sim bug 2), so scripted throws wait like a real bowler does.
    await p.wait_for_timeout(420); await p.click(sel)

async def shot(p, name):
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); await p.screenshot(path=os.path.join(SHOTS, name + '.png'))

async def seed(p, onboarded=True):
    await p.goto(BASE); await p.evaluate(WIPE)
    if onboarded: await p.evaluate("localStorage.setItem('ap_prefs', JSON.stringify({onboarded:true}))")

async def run(b, kind):
    errs = []; c = await ctx_for(b, kind); p = await page(c, errs); t = f'[{kind}] '
    # onboarding: first visit -> welcome, skippable, never shown again
    await p.goto(BASE); await p.evaluate(WIPE); await p.goto(BASE + '?fresh'); await p.wait_for_timeout(600)
    check('#/welcome' in p.url, t + 'first visit opens welcome'); await shot(p, f'{kind}-welcome')
    await p.click('#welSkip'); await p.wait_for_selector('#tonightBody')
    check('#/tonight' in p.url, t + 'skip lands on Tonight (home screen; sim bug 8: not Lane)')
    await p.goto(BASE); await p.wait_for_selector('#tonightBody'); check('#/welcome' not in p.url, t + 'welcome not repeated')
    await p.goto(BASE + '#/lane'); await p.wait_for_selector('#ballBtn')
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
    for r in ['#/lane', '#/arsenal', '#/arsenal/insights', '#/ball/hy-road', '#/compare?ids=hy-road,rattler', '#/patterns', '#/pattern/2024-pba-shark', '#/sessions', '#/more', '#/welcome'] + NEW_ROUTES:
        await p.goto(BASE + r); await p.wait_for_timeout(700)
        await p.add_script_tag(url=BASE + 'tests/axe.min.js')
        res = await p.evaluate("axe.run(document,{resultTypes:['violations']}).then(r=>r.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id+':'+v.nodes.length))")
        check(not res, t + f'axe {r} serious/critical=0 {res}')
        w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]')
        check(w[1] <= (390 if kind == 'phone' else 1280), t + f'{r} no horizontal overflow {w}')
    await p.goto(BASE + '#/lane'); await p.wait_for_selector('#ballBtn'); await p.wait_for_timeout(600)  # let the route-enter transform finish before measuring sizes
    small = await p.evaluate(SMALL)
    check(not small, t + f'lane targets >= 44px {small[:6]}')
    for r in NEW_ROUTES:
        await p.goto(BASE + r); await p.wait_for_timeout(800)
        small = await p.evaluate(SMALL)
        check(not small, t + f'{r} targets >= 44px {small[:6]}')
    check(not errs, t + f'no page errors {errs[:3]}')
    await c.close()

async def deck_cases(b):
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs)
    await p.goto(BASE); await p.evaluate("localStorage.clear();localStorage.setItem('ap_prefs','{\"onboarded\":true}');localStorage.setItem('ap_profile','{\"hand\":\"left\"}')")
    await p.goto(BASE + '#/lane'); await p.wait_for_selector('#deck'); await p.wait_for_timeout(400)
    lbl = await p.get_attribute('#deck', 'aria-label')
    check('1-2 pocket' in lbl and 'then the 2 pin' in lbl, '[deck] left hand highlights the 1-2 pocket')
    # cycle 6: full lane mirror for left-handers
    body = await p.inner_text('#view')
    check('draws a right-hander' not in body, '[lefty] old "read board numbers mirrored" note is gone')
    check('Mirrored for left hand' in (await p.get_attribute('#lane', 'aria-label')) and 'Mirrored for left hand' in await p.inner_text('#deckCap'), '[lefty] lane and caption say the view is mirrored')
    rel = "async()=>(await import('./js/engine.js')).S.release"
    r0 = await p.evaluate(rel); await p.focus('#lane'); await p.keyboard.press('ArrowLeft'); r1 = await p.evaluate(rel)
    check(r1 == r0 - 1, f'[lefty] ArrowLeft moves feet toward board 1 (screen left) {r0}->{r1}')
    await p.keyboard.press('ArrowRight'); r2 = await p.evaluate(rel)
    await p.click('[data-miss=left]'); await p.wait_for_timeout(300); r3 = await p.evaluate(rel)
    check(r3 == r2 - 2, f'[lefty] "Left" miss moves feet 2 boards to the screen left {r2}->{r3}')
    tap = "([fx])=>{const c=document.querySelector('#lane'),r=c.getBoundingClientRect(),o={clientX:r.left+r.width*fx,clientY:r.bottom-12,pointerType:'mouse',pointerId:1,bubbles:true};c.dispatchEvent(new PointerEvent('pointerdown',o));c.dispatchEvent(new PointerEvent('pointerup',o))}"
    await p.evaluate(tap, [.2]); rl = await p.evaluate(rel); await p.evaluate(tap, [.8]); rr = await p.evaluate(rel)
    check(rl < 15 < rr, f'[lefty] press near the foul line: screen left = low boards, screen right = high boards {rl} {rr}')
    await p.evaluate("localStorage.clear();localStorage.setItem('ap_prefs','{\"onboarded\":true}');localStorage.setItem('ap_profile','{\"hand\":\"left\"}')")
    await p.reload(); await p.wait_for_selector('#deck'); await p.wait_for_timeout(300)
    await p.evaluate("localStorage.setItem('ap_profile','{\"hand\":\"right\"}')"); await p.reload(); await p.wait_for_selector('#deck')
    await p.click('[data-miss=right]'); await p.click('[data-miss=right]'); await p.wait_for_timeout(500)
    check(await p.get_attribute('#deckCard', 'data-tone') == 'info' and 'Light' in await p.get_attribute('#deck', 'aria-label'), '[deck] light hit coloured as light')
    if SHOTS: await (await p.query_selector('#deckCard')).screenshot(path=os.path.join(SHOTS, 'phone-deck-light.png'))
    for _ in range(10):   # 2-and-1 moves (DECISIONS #26 geometry): keep moving left until the model reads high
        await p.click('[data-miss=left]'); await p.wait_for_timeout(120)
        if 'High' in (await p.get_attribute('#deck', 'aria-label') or ''): break
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
    await p.goto(BASE + '?m#/lane'); await p.wait_for_selector('#ballBtn')
    check('welcome' not in p.url and await p.locator('#ballBtn').is_visible(), '[migrate] v1 user skips welcome')
    check('Hy-Road' in await p.text_content('.ball-btn-name'), '[migrate] v1 ball restored')
    check(int(await p.get_attribute('#lineSum', 'data-release')) == 20, '[migrate] v1 feet restored')
    check(await p.evaluate("localStorage.getItem('ap_device')") == 'd-test-0000', '[migrate] backup code kept')
    await p.goto(BASE + '#/sessions'); await p.wait_for_selector('.line-card')
    check('v1 line' in await p.text_content('#lineList'), '[migrate] v1 saved lines listed')
    await c.close()

NEW_ROUTES = ['#/import', '#/card', '#/session/none']
SMALL = """[...document.querySelectorAll('button, a[href], input:not([type=file]), select, label.btn, [role=slider]')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0 && r.height>0 && getComputedStyle(e).visibility!=='hidden' && !e.closest('.sr-only') && (r.width<44||r.height<44) && !(e.type==='range')}).map(e=>(e.id||e.className||e.tagName)+' '+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height))"""
DATA_READY = "() => window.__apData && window.__apData.events() > 0"
async def data_cycle(b):
    # D0: v0 keys -> event log (migration + one-time seed), export v1 backup -> wipe localStorage AND IndexedDB -> restore -> same projection hash
    errs = []; c = await ctx_for(b, 'phone', accept_downloads=True); p = await page(c, errs)
    await p.goto(BASE); await p.evaluate(WIPE)
    await p.evaluate("""localStorage.setItem('ap_prefs', JSON.stringify({onboarded:true})); localStorage.setItem('ap_device','d-test-0001');
      localStorage.setItem('ap_lines', JSON.stringify([{ballId:'hy-road',name:'league line',release:22,aim:9,speed:16,rev:300,oil:1.2,finish:'2000',pattern:'house',note:'',updatedAt:5,synced:true,id:9}]));
      localStorage.setItem('ap_notes', JSON.stringify([{lane:'7-8',oil:'fresh',adjustment:'2 left',synced:true}]));""")
    await p.goto(BASE + '?d0#/more'); await p.wait_for_function("() => window.__apData && window.__apData.events() >= 12")
    d = await p.evaluate("({backend: window.__apData.backend, boot: window.__apData.bootMs, n: window.__apData.events(), h: window.__apData.hash()})")
    check(d['backend'] == 'indexedDB', f"[data] event log on IndexedDB ({d['backend']}, opened+migrated in {d['boot']} ms after first paint)")
    check(d['n'] >= 2 + 10, f"[data] v0 keys migrated + reported arsenal seeded once ({d['n']} events)")
    await p.wait_for_function("() => document.querySelector('#dataCounts').textContent.includes('On this phone')")
    dc = (await p.text_content('#dataCard')).lower(); check(' balls' in await p.text_content('#dataCounts') and not any(w in dc for w in ['events', 'indexeddb', 'pre-2.1', 'v1 ', 'tracker']), '[data] More shows the data card in plain words')
    await shot(p, 'phone-more-data')
    async with p.expect_download() as dl: await p.click('#dlBackup')
    path = await (await dl.value).path(); bk = json.load(open(path))
    check(bk.get('format') == 'backup' and len(bk['events']) == d['n'] and bk.get('sha256'), f"[data] v1 backup has every event ({len(bk['events'])})")
    await p.evaluate(WIPE); await p.goto(BASE + '?wiped#/lane'); await p.wait_for_selector('#ballBtn')
    await p.wait_for_function("() => window.__apData")
    check(await p.evaluate("window.__apData.events()") == 0 and await p.evaluate("localStorage.getItem('ap_lines')") is None, '[data] wipe clears localStorage and IndexedDB')
    await p.goto(BASE + '#/import'); await p.wait_for_selector('#impPick')
    await p.set_input_files('#impFile', path); await p.wait_for_selector('#impPreview')
    check('new on this device' in await p.text_content('#impPreview') and not await p.query_selector('#impWarn'), '[data] restore preview: counts, checksum ok, nothing saved yet')
    check(await p.evaluate("window.__apData.events()") == 0, '[data] preview persists nothing')
    await p.click('#impCommit'); await p.wait_for_selector('#impDone')
    h2 = await p.evaluate("window.__apData.hash()")
    check(h2 == d['h'], '[data] export -> wipe -> restore gives the identical projection hash')
    check(await p.evaluate("JSON.parse(localStorage.getItem('ap_lines')||'[]').some(l => l.name === 'league line')"), '[data] restore rebuilds the saved-lines list')
    await p.set_input_files('#impFile', path); await p.wait_for_selector('#impPreview')
    check(await p.is_disabled('#impCommit'), '[data] re-importing the same backup adds nothing')
    check(not errs, '[data] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

CSV_WIDE = "Date,Ball,Game 1,Game 2,Game 3\r\n2026-10-18,Big Bite,201,188,=SUM(A1)\r\n2026-10-19,Ice Storm,150,,175\r\n"
CSV_REL = "date;ball;speed (kph);rev rate\n2026-10-18;Hy-Road Pearl;27;240\n2026-10-18;Ice Storm;26,5;250\n"
async def axe_ok(p, label):
    await p.evaluate("Promise.race([Promise.all(document.getAnimations().filter(a => a.effect && a.effect.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => 0))), new Promise(r => setTimeout(r, 2000))])")   # contrast mid-fade is a false positive
    await p.add_script_tag(url=BASE + 'tests/axe.min.js')
    res = await p.evaluate("axe.run(document,{resultTypes:['violations']}).then(r=>r.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id+':'+v.nodes.length))")
    check(not res, f'{label} axe serious/critical=0 {res}')
async def csv_cycle(b):
    # D1: CSV -> preview (nothing saved) -> confirm fuzzy ball -> commit -> duplicate detected -> undo -> importable again; release CSV needs speed point
    import tempfile
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs)
    d = tempfile.mkdtemp(); wide = os.path.join(d, 'league-scores.csv'); rel = os.path.join(d, 'release.csv')
    open(wide, 'w').write(CSV_WIDE); open(rel, 'w').write(CSV_REL); await p.set_viewport_size({'width': 360, 'height': 780})
    await p.goto(BASE); await p.evaluate(WIPE); await p.evaluate("localStorage.setItem('ap_prefs', JSON.stringify({onboarded:true}))")
    await p.goto(BASE + '?csv#/import'); await p.wait_for_selector('#impPick'); await p.wait_for_function("() => window.__apData")
    n0 = await p.evaluate("window.__apData.events()")
    await p.set_input_files('#impFile', wide); await p.wait_for_selector('#impPreview[data-kind=csv]')
    txt = await p.text_content('#impPreview')
    check('4 games in 2 sessions' in txt and '1 row skipped' in txt, '[csv] wide shape detected: 4 games, formula cell skipped as a row error')
    check(await p.query_selector('#impWarn li[data-code=BALL_CONFIRM]') is not None and await p.is_disabled('#impCommit'), '[csv] fuzzy "Big Bite" must be confirmed before import')
    check(await p.evaluate("window.__apData.events()") == n0, '[csv] preview persists nothing')
    check(await p.query_selector('#csvRuby') is not None, '[csv] Ruby preset stub shown (needs sample)')
    await p.click('[data-yes="Big Bite"]'); await p.wait_for_function("() => !document.querySelector('#impCommit').disabled")
    await axe_ok(p, '[csv] preview'); await p.wait_for_timeout(300)
    small = await p.evaluate(SMALL); check(not small, f'[csv] preview targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= w[0], f'[csv] preview no horizontal overflow {w}')
    await shot(p, 'phone-csv-preview')
    await p.click('#impCommit'); await p.wait_for_selector('#impDone')
    n1 = await p.evaluate("window.__apData.events()"); check(n1 == n0 + 1 + 2 + 4, f'[csv] commit wrote import + 2 sessions + 4 games ({n1 - n0})')
    h1 = await p.evaluate("window.__apData.hash()")
    await p.set_input_files('#impFile', wide); await p.wait_for_selector('#impPreview')
    check(await p.query_selector('#impWarn li[data-code=DUPLICATE]') is not None and await p.is_disabled('#impCommit'), '[csv] re-import of the same file detected and blocked')
    await p.goto(BASE + '?u#/import'); await p.wait_for_selector('#impList [data-undo]')
    await p.click('#impList [data-undo]'); await p.wait_for_timeout(400)
    check(await p.evaluate("window.__apData.hash()") != h1, '[csv] undo from Past imports changes the projection back')
    await p.set_input_files('#impFile', wide); await p.wait_for_selector('#impPreview')
    check(await p.query_selector('#impWarn li[data-code=DUPLICATE]') is None, '[csv] after undo the same file can be imported again')
    await p.set_input_files('#impFile', rel); await p.wait_for_selector('#csvAt')
    check(await p.input_value('#csvUnit') == 'kph' and await p.is_disabled('#impCommit'), '[csv] kph detected from header; speed point required before import')
    await p.select_option('#csvAt', 'release'); await p.wait_for_function("() => !document.querySelector('#impCommit').disabled")
    check('2 ready' in await p.text_content('#impPreview'), '[csv] semicolon file with decimal comma parsed (2 rows ready)')
    await p.click('#csvSavePreset'); check(await p.evaluate("Object.keys(JSON.parse(localStorage.getItem('ap_import_presets')||'{}')).length") == 1, '[csv] mapping preset saved by header fingerprint')
    check(not errs, '[csv] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def ltx_cycle(b):
    # D2: LaneTrax PDF -> on-device parse -> preview with both warnings + flip toggle -> commit -> duplicate; non-LaneTrax PDF refused.
    # Uses a synthetic PDF built from the derived fixture; the private real report is used only if LANETRAX_SAMPLE is set (never in git).
    import tempfile, subprocess
    d = tempfile.mkdtemp(); synth = os.path.join(d, 'session-report.pdf'); other = os.path.join(d, 'invoice.pdf')
    subprocess.run(['node', '-e', f"""import('{os.path.abspath('tests/data/make_pdf.mjs')}').then(m=>{{const fs=require('fs');const W=JSON.parse(fs.readFileSync('tests/fixtures/lanetrax/session-report.words.json')).words;
      fs.writeFileSync('{synth}', m.buildPdf(W)); fs.writeFileSync('{other}', m.buildPdf([{{p:1,x:40,y:700,t:'Invoice 42'}}]));}})"""], check=True)
    pdf = os.environ.get('LANETRAX_SAMPLE') or synth
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await p.goto(BASE); await p.evaluate(WIPE); await p.evaluate("localStorage.setItem('ap_prefs', JSON.stringify({onboarded:true}))")
    await p.goto(BASE + '?ltx#/import?kind=lanetrax'); await p.wait_for_selector('#impPick'); await p.wait_for_function("() => window.__apData")
    check('LaneTrax session report' in await p.text_content('#impPick'), '[ltx] pick button labelled for the user\'s own LaneTrax report')
    n0 = await p.evaluate("window.__apData.events()")
    await p.set_input_files('#impFile', other); await p.wait_for_selector('#impErr')
    check('doesn\u2019t look like a LaneTrax' in await p.text_content('#impErr') and await p.evaluate("window.__apData.events()") == n0, '[ltx] non-LaneTrax PDF refused, nothing written')
    await p.set_input_files('#impFile', pdf); await p.wait_for_selector('#impPreview[data-kind=lanetrax]')
    codes = await p.eval_on_selector_all('#impWarn li', 'els => els.map(e => e.dataset.code)')
    check('SHOT_COUNT_GAP' in codes and 'IMPACT_SPEED_KPI_VS_TABLE' in codes, f'[ltx] preview shows both warnings {codes}')
    t = await p.text_content('#impPreview')
    check('13.93 mph' in t and '13 mph' in t and '90 shots' in t and '86' in t, '[ltx] both impact speeds and both shot counts visible')
    check(await p.evaluate("window.__apData.events()") == n0, '[ltx] preview persists nothing')
    e0 = await p.text_content('#ltxSummary [data-key=entryBoard]'); h0 = await p.text_content('#ltxSummary [data-key=hookBoards]')
    await p.click('#ltxFlip'); await p.wait_for_selector('#ltxFlip[aria-pressed=true]')
    e1 = await p.text_content('#ltxSummary [data-key=entryBoard]'); h1 = await p.text_content('#ltxSummary [data-key=hookBoards]')
    check(e0.startswith('bd 20.4') and e1.startswith('bd 19.6') and h0 == h1, f'[ltx] flip boards: entry {e0} -> {e1}, hook boards unchanged')
    await p.click('#ltxFlip'); await p.wait_for_selector('#ltxFlip[aria-pressed=false]')
    await axe_ok(p, '[ltx] preview'); await p.wait_for_timeout(300)
    small = await p.evaluate(SMALL); check(not small, f'[ltx] preview targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= w[0], f'[ltx] preview no horizontal overflow {w}')
    await shot(p, 'phone-lanetrax-preview'); await p.evaluate("document.querySelector('#ltxKpis').scrollIntoView()"); await shot(p, 'phone-lanetrax-preview-details')
    await p.click('#impCommit'); await p.wait_for_selector('#impDone')
    check(await p.evaluate("window.__apData.events()") == n0 + 7, '[ltx] commit: import + session + aggregate + 4 pending measurements (0 per-shot)')
    await p.set_input_files('#impFile', pdf); await p.wait_for_selector('#impPreview')
    check(await p.query_selector('#impWarn li[data-code=DUPLICATE]') is not None and await p.is_disabled('#impCommit') and await p.query_selector('#ltxAgain') is not None, '[ltx] same report again: "Already imported" + option to import as a new session')
    check(not errs, '[ltx] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def tonight_cycle(b):
    # CC0: Tonight on a fresh phone -> starter offer -> benchmark-first pick with labelled why-lines + model line -> read moves one step
    # -> pattern sets demand + Rule of 31 -> LaneTrax measurement accept writes device-provenance release -> survives reload.
    import tempfile, subprocess
    d = tempfile.mkdtemp(); synth = os.path.join(d, 'session-report.pdf')
    subprocess.run(['node', '-e', f"""import('{os.path.abspath('tests/data/make_pdf.mjs')}').then(m=>{{const fs=require('fs');const W=JSON.parse(fs.readFileSync('tests/fixtures/lanetrax/session-report.words.json')).words;fs.writeFileSync('{synth}', m.buildPdf(W));}})"""], check=True)
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.goto(BASE + '?tn#/tonight'); await p.wait_for_selector('#noBag')
    check(await p.query_selector('#tabs a[href="#/tonight"][aria-current=page]') is not None, '[tonight] Tonight tab exists and is current')
    await p.click('#loadStarter'); await p.wait_for_selector('#tnPick')
    check('Big Bite' in await p.text_content('#tnPickName') and 'pattern unknown' in await p.text_content('#tnCoach'), '[tonight] unknown pattern -> benchmark (Big Bite) first, reason stated')
    coach = (await p.text_content('#tnCoach')).strip(); sent = [x for x in coach.replace('e.g.', '').split('. ') if x.strip()]
    check(len(sent) <= 2 and (coach[0].isdigit() or coach.startswith(('Rattler', 'Ordnance', 'Super', 'Hy-Road', 'Deadly', 'Ice'))), f'[tonight] coach voice: <=2 sentences, starts with a ball name: {coach!r}')
    why = await p.eval_on_selector_all('#tnWhy li', 'els => els.map(e => !!e.querySelector(".prov"))')
    check(len(why) >= 2 and all(why), f'[tonight] >=2 why-lines, every one labelled ({len(why)})')
    m = await p.text_content('#tnModel'); check('2-D model' in m and 'of 6' in m, '[tonight] model line with "holds x of 6"')
    check(await p.query_selector('#tnR31') is None and 'Rule of 31' not in await p.text_content('#tonightBody'), '[tonight] Rule of 31 cut from Tonight (sim bug 8)')
    check(await p.eval_on_selector('#tnPickMore', 'e => !e.open') and await p.is_visible('#tnStand'), '[tonight] specs/model behind one tap; feet + eyes up front')
    ms = await p.evaluate("() => window.__apTonightMs"); check(ms is not None and ms < 1000, f'[tonight] render {ms} ms < 1 s')
    await axe_ok(p, '[tonight]'); await p.wait_for_timeout(200)
    small = await p.evaluate(SMALL); check(not small, f'[tonight] targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360 and w[0] == 360, f'[tonight] no horizontal overflow at 360 {w}')
    await shot(p, 'phone-tonight')
    await p.click('[data-read=early]'); await p.wait_for_function("() => !document.querySelector('#tnPickName').textContent.includes('Big Bite')")
    check('Ordnance C4' in await p.text_content('#tnPickName'), '[tonight] "Too early" -> one step weaker (C4) in 1 tap')
    await p.fill('#tnPattern', '2026 PBA Badger'); await p.dispatch_event('#tnPattern', 'change'); await p.wait_for_function("() => document.querySelector('#tnLevel') && document.querySelector('#tnLevel').textContent.includes('demand 5')")
    await p.fill('#tnCenter', 'Test Lanes'); await p.dispatch_event('#tnCenter', 'change'); await p.wait_for_timeout(300)
    await p.click('#tnSetup [role=radio][data-v=synthetic]'); await p.wait_for_timeout(300)
    t = await p.text_content('#tnPickName'); co = await p.text_content('#tnCoach'); st = await p.text_content('#tnPick [data-alt=Stronger]')
    check('Big Bite' in t and 'new center' in co and 'Super Nova' in st and 'demand 5' in await p.text_content('#tnPick'), f'[tonight] Badger 50 ft heavy -> demand 5; first visit to a center keeps benchmark first, Super Nova is the stronger move ({t.strip()})')
    # LaneTrax measurement -> accept on Tonight
    await p.goto(BASE + '?tn#/import?kind=lanetrax'); await p.wait_for_selector('#impPick'); await p.set_input_files('#impFile', synth)
    await p.wait_for_selector('#impPreview[data-kind=lanetrax]'); await p.click('#impCommit'); await p.wait_for_selector('#impDone')
    await p.goto(BASE + '?tn#/tonight'); await p.wait_for_selector('#tnMeasNudge')
    check('LaneTrax' in await p.text_content('#tnMeasNudge') and await p.get_attribute('#tnMeasNudge', 'href') == '#/card', '[tonight] pending LaneTrax numbers: one quiet link to the Bowler Card (accept lives there)')
    pick0 = await p.text_content('#tnPickName')
    await p.reload(); await p.wait_for_selector('#tnPick')
    check(await p.text_content('#tnPickName') == pick0, '[tonight] session survives reload')
    check(not errs, '[tonight] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def bag_cycle(b):
    # CC2: coverage grid (overlap/hole), swap in <= 2 taps, lock/exclude, fill from owned only, pack list, care = fold(log).
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.goto(BASE + '?bag#/tonight'); await p.wait_for_selector('#noBag'); await p.click('#loadStarter'); await p.wait_for_selector('#tnBagLink')
    await p.click('#tnBagLink'); await p.wait_for_selector('#bagGrid')
    check(await p.query_selector('#tabs a[href="#/tonight"][aria-current=page]') is not None, '[bag] reached from Tonight; Tonight tab stays current')
    over = await p.evaluate("() => [...document.querySelectorAll('#bagGrid .cell.over [data-own]')].map(x => x.dataset.own).sort()")
    check(over == ['own-deadly-rattler', 'own-hy-road-pearl'], f'[bag] T6: HRP + Deadly Rattler flagged as overlap in one cell {over}')
    check(await p.get_attribute('#bagChecks [data-check="3"]', 'data-warn') == 'true' and await p.get_attribute('#bagChecks [data-check="1"]', 'data-warn') == 'false', '[bag] checks: overlap warns, benchmark in the middle passes')
    n = await p.evaluate("() => document.querySelectorAll('#bagChecks [data-check]').length"); check(n == 10, f'[bag] 10 checks listed ({n})')
    await axe_ok(p, '[bag]'); await p.wait_for_timeout(200)
    small = await p.evaluate(SMALL); check(not small, f'[bag] targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360 and w[0] == 360, f'[bag] no horizontal overflow at 360 {w}')
    await p.evaluate("() => document.querySelectorAll('.toast').forEach(t => t.remove())"); await p.evaluate("() => document.querySelector('#bagCover').scrollIntoView()"); await shot(p, 'phone-bag')
    await p.click('#bagHead [data-v="bag-league"]'); await p.wait_for_selector('#bagGrid .cell.hole[data-l="3"]')
    check('level 3' in await p.text_content('#bagChecks [data-check="4"]'), '[bag] League 3: hole at level 3 between Big Bite and HRP')
    taps = 0
    await p.click('#bagGrid [data-own="own-hy-road-pearl"]'); taps += 1; await p.wait_for_selector('#bagSwap')
    await p.click('#bagSwap [data-cand="own-ordnance-c4"]'); taps += 1
    await p.wait_for_function("() => document.querySelector('#bagGrid [data-own=\"own-ordnance-c4\"]') && !document.querySelector('#bagGrid .cell.hole')")
    check(taps <= 2, f'[bag] swap HRP -> C4 in {taps} taps; hole closed')
    await p.click('#bagBalls [data-lock="own-ordnance-c4"]'); await p.wait_for_function("() => document.querySelector('#bagBalls [data-lock=\"own-ordnance-c4\"]').getAttribute('aria-pressed') === 'true'")
    await p.click('#bagBalls [data-excl="own-hy-road-pearl"]'); await p.wait_for_function("() => document.querySelector('#bagBalls [data-excl=\"own-hy-road-pearl\"]').getAttribute('aria-pressed') === 'true'")
    await p.reload(); await p.wait_for_selector('#bagGrid')
    await p.click('#bagHead [data-v="bag-league"]'); await p.wait_for_selector('#bagBalls [data-lock="own-ordnance-c4"][aria-pressed="true"]')
    check(await p.get_attribute('#bagBalls [data-excl="own-hy-road-pearl"]', 'aria-pressed') == 'true', '[bag] lock + exclude persist across reload (bag.saved events)')
    # pro shop via status, then fill: owned + available only, locked kept, excluded out
    await p.select_option('#bagCareBall', 'own-guru-supreme'); await p.click('#bagCare [data-v="proShop"]')
    await p.wait_for_function("() => document.querySelector('#bagStatus').textContent.includes('1 at pro shop')")
    await p.click('#bagFill'); await p.wait_for_timeout(150)
    if await p.query_selector('#bagApply'): await p.click('#bagApply'); await p.wait_for_timeout(150)
    ids = await p.evaluate("() => [...document.querySelectorAll('#bagGrid [data-own], #bagTbd [data-own]')].map(x => x.dataset.own)")
    owned = await p.evaluate("() => [...document.querySelectorAll('#bagBalls [data-ball]')].map(x => x.dataset.ball)")
    check(len(ids) == 2 and 'own-ordnance-c4' in ids and 'own-hy-road-pearl' not in ids and 'own-guru-supreme' not in ids and all(i in owned for i in ids), f'[bag] fill (League 3): owned only, locked kept, excluded + pro shop out {ids}')
    pk = await p.text_content('#bagPack'); check('Spare' in pk and 'Ice Storm' in pk and 'level' in pk, '[bag] pack list: role -> ball -> why, spare last')
    await p.click('#bagHead [data-v="bag-tournament"]'); await p.wait_for_selector('#bagGrid')
    check('Rule 18' in await p.text_content('#bagRule18') and 'throws a ball for score' in await p.text_content('#bagRule18'), '[bag] care card states USBC Rule 18 (no surface changes once competition starts)')
    await p.select_option('#bagCareBall', 'own-rattler-big-bite'); await p.click('#bagCare [data-svc="refresh"]')
    await p.wait_for_function("() => document.querySelector('#bagHealth').textContent.includes('Since refresh: 0')")
    check(True, '[bag] service logged -> health recomputed from the log (since refresh 0)')
    await p.fill('#bagDate', '2026-11-07'); await p.dispatch_event('#bagDate', 'change'); await p.wait_for_function("() => document.querySelector('#bagDate').value === '2026-11-07' && !document.querySelector('#bagHead .prov[data-prov=assumed]')")
    check(True, '[bag] event date saved on the bag')
    check(not errs, '[bag] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

FX = os.path.join(os.path.dirname(__file__), 'data', 'fixtures')
def fx(n): return open(os.path.join(FX, n)).read()
async def targeting_cycle(b):
    # Targeting: feet/eyes -> unchanged engine path -> break box + pocket call; missed high -> one cited move, engine-verified, 1 tap;
    # save as my line -> back to saved; walkthrough dismiss/replay; lefty mirror; axe, 44 px, 360 px.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.goto(BASE + '?tg#/tonight'); await p.wait_for_selector('#noBag'); await p.click('#loadStarter'); await p.wait_for_selector('#tnFind')
    await p.click('#tnFind'); await p.wait_for_selector('#tgFindCard')
    check('#/target' in p.url and 'Big Bite' in await p.eval_on_selector('#tgBall', 'e => e.selectedOptions[0].textContent'), '[target] Tonight "Find my strike line" opens Targeting with tonight\'s ball and runs Find')
    await p.goto(BASE + '?tg#/target'); await p.wait_for_selector('#tgTour')
    check(await p.query_selector('#tabs a[href="#/lane"][aria-current=page]') is not None, '[target] lives under the Lane tab')
    await p.evaluate("() => document.querySelectorAll('.toast').forEach(t => t.remove())"); await shot(p, 'phone-target-walkthrough')
    await axe_ok(p, '[target] walkthrough')
    await p.click('#tgTourNext'); await p.click('#tgTourNext'); t3 = await p.text_content('#tgTour'); await p.click('#tgTourNext')
    check('3 of 3' in t3 and await p.query_selector('#tgTour') is None, '[target] 3-step walkthrough, dismissible')
    await p.reload(); await p.wait_for_selector('#tgCoach'); await p.wait_for_timeout(300)
    check(await p.query_selector('#tgTour') is None, '[target] walkthrough not repeated after dismissal')
    await p.click('#tgHelp'); check(await p.query_selector('#tgTour') is not None, '[target] "?" replays the walkthrough'); await p.click('#tgTourSkip')
    # default = tonight's model line: feet 17 (offset 7 assumed) -> laydown 10, eyes 10.7 at the arrows (engine geometry, DECISIONS #26)
    coach = (await p.text_content('#tgCoach')).strip()
    check(coach.startswith('Through the box at') and 'Pocket' in coach and coach.count('. ') <= 1, f'[target] in box + pocket, numbers first, <=2 sentences [{coach}]')
    check((await p.text_content('#tgCall')).startswith('Pocket') and await p.text_content('#tgBox') == 'In the box', '[target] pocket + in-box pills')
    sm = await p.text_content('#tgSum'); check(all(k in sm for k in ['Feet', 'Laydown', 'Arrows', 'Break', 'Entry']), f'[target] bird\'s-eye summary feet -> laydown -> aim -> breakpoint -> entry')
    check('1-3' in (await p.get_attribute('#tgDeck', 'aria-label') or '') or 'pocket' in (await p.get_attribute('#tgDeck', 'aria-label') or ''), '[target] pin deck read for the shot')
    check('assumed' in await p.text_content('#tgCond'), '[target] release / pattern sources labelled')
    await axe_ok(p, '[target] pocket'); await p.wait_for_timeout(200)
    small = await p.evaluate(SMALL); check(not small, f'[target] targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360 and w[0] == 360, f'[target] no horizontal overflow at 360 {w}')
    db = await (await p.query_selector('#tgDock')).bounding_box(); check(db['y'] + db['height'] <= 780, f'[target] feet/eyes controls in the thumb zone (dock bottom {round(db["y"] + db["height"])})')
    await shot(p, 'phone-target-pocket')
    # save as my line, then move away
    await p.click('#tgSave'); await p.wait_for_timeout(300)
    lines = await p.evaluate("JSON.parse(localStorage.getItem('ap_lines')||'[]').map(l=>l.name+'|'+l.release+'|'+l.aim)")
    check(any(x.startswith('Target 17\u219210.7|10|-7') for x in lines), f'[target] "Save as my line" stores a Lane line (release 10, aim -7) {lines}')
    lim = await p.text_content('#tgLimits'); check('Model limit' in lim and 'No model line does that' in lim and 'bowlingball.com' in lim and 'laydown 14.5' in lim, '[target] engine limitation labelled + cited book lines')
    # missed high: feet 6 left, eyes 12 half-boards left (RH screen-left = higher boards) -> laydown 16, arrows 16.7
    for _ in range(6): await p.click('#tgFeet button[aria-label="Feet 1 board left"]')
    for _ in range(12): await p.click('#tgEyes button[aria-label="Eyes 0.5 board left"]')
    await p.wait_for_timeout(200)
    coach = (await p.text_content('#tgCoach')).strip()
    check(await p.text_content('#tgFeetVal') == '23' and coach.startswith('High by') and 'Move feet 2 left, eyes 1 left' in coach, f'[target] missed high: cited move toward the miss in coach voice [{coach}]')
    sg = await p.text_content('#tgSug'); check('2-and-1' in sg and 'Model after the move:' in sg and 'bowl.com' in sg, f'[target] cited 2-and-1 + the model\'s own read after it [{sg[:160]}]')
    check('House-shot rule: move toward the miss' in sg, f'[target] direction = cited rule (model read shown, disagreement disclosed when it worsens) [{sg[:120]}]')
    await shot(p, 'phone-target-high-move')
    await p.click('#tgApply'); await p.wait_for_timeout(250)
    check(await p.text_content('#tgFeetVal') == '25' and await p.text_content('#tgEyesVal') == '17.7', '[target] one tap applies the move (feet 25, eyes 17.7) and re-runs')
    await p.click('#tgBack'); await p.wait_for_timeout(250)
    check(await p.text_content('#tgFeetVal') == '17' and await p.text_content('#tgEyesVal') == '10.7', '[target] back to saved line restores feet/eyes')
    # dots mode keeps the same line
    await p.click('.tg-mode [data-v=dots]'); await p.wait_for_timeout(200)
    check(await p.text_content('#tgEyesVal') == '10.4' and (await p.text_content('#tgCall')).startswith('Pocket'), f'[target] dots (7.5 ft) aim converts on the same straight line [{await p.text_content("#tgEyesVal")}]')
    await p.click('.tg-mode [data-v=arrows]')
    # Find my strike line from Tonight: stand / aim / Pocket % with basis, apply -> lane + box; phone-speed budget
    cdp = None
    try: cdp = await c.new_cdp_session(p); await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
    except Exception: cdp = None
    await p.goto(BASE + '?tg#/tonight'); await p.wait_for_selector('#tnFind'); await p.click('#tnFind'); await p.wait_for_selector('#tgFindLine', timeout=15000)
    fl = (await p.text_content('#tgFindLine')).strip(); ms = int(await p.get_attribute('#tgFindOut', 'data-ms') or 99999)
    if cdp: await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
    check('find=1' in p.url and re.match(r'^Stand \d+, aim [\d.]+ at the arrows\. Pocket \d+% \(model estimate, assumed accuracy \u00b11\.5 bds, no LaneTrax import; 200 simulated shots\)\.$', fl) is not None, f'[find] Tonight -> stand, aim, Pocket % with basis + n [{fl}]')
    check(ms < 1500, f'[find] search under 1.5 s at 4x CPU throttle ({ms} ms{"" if cdp else ", no throttle"})')
    allf = await p.text_content('#tgFindCard'); check('strike' not in fl.lower() and 'No strike % shown' in allf and 'Not higher' in allf or 'High because' in allf, '[find] no strike %, says why; why-lower/higher note')
    check('17\u201318' in allf and 'nationalbowlingacademy.com' in (await p.inner_html('#tgFindInputs')) and 'not a guarantee' in allf, '[find] window + source + inputs + "not a guarantee"')
    check(await p.query_selector('#tgFindAlt') is not None, '[find] second option (more room / next best)')
    await p.evaluate("() => document.querySelectorAll('.toast').forEach(t => t.remove())"); await p.evaluate("() => window.scrollTo(0, 0)"); await shot(p, 'phone-target-find')
    await axe_ok(p, '[find] result')
    m = re.match(r'^Stand (\d+), aim ([\d.]+)', fl); await p.click('#tgFindApply'); await p.wait_for_timeout(300)
    fv, ev = await p.text_content('#tgFeetVal'), await p.text_content('#tgEyesVal')
    check(fv == m.group(1) and float(ev) == float(m.group(2)), f'[find] one tap applies stand/aim to the lane ({fv}/{ev})')
    check((await p.text_content('#tgBox')) == 'In the box' and (await p.text_content('#tgCall')).startswith('Pocket'), f'[find] applied line: through the box, pocket [{await p.text_content("#tgCall")}]')
    await shot(p, 'phone-target-find-applied')
    await p.evaluate("() => document.querySelector('#tgBoxReset').click()")
    # Lane entry point
    await p.goto(BASE + '?tg#/lane'); await p.wait_for_selector('#targetBtn'); await p.click('#targetBtn'); await p.wait_for_selector('#tgCoach')
    check('#/target' in p.url, '[target] reachable from the Lane screen')
    # lefty: lane mirrors, screen-left lowers the board, words flip
    await p.evaluate("localStorage.setItem('ap_profile', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('ap_profile')||'{}'), {hand:'left'})))")
    await p.reload(); await p.wait_for_selector('#tgCoach'); await p.click('#tgBack'); await p.wait_for_timeout(200)
    await p.click('#tgFeet button[aria-label="Feet 1 board right"]'); await p.wait_for_timeout(100)
    check(await p.text_content('#tgFeetVal') == '18', '[target] lefty: screen-right = higher board (own numbering)')
    for _ in range(5): await p.click('#tgFeet button[aria-label="Feet 1 board right"]')
    for _ in range(12): await p.click('#tgEyes button[aria-label="Eyes 0.5 board right"]')
    await p.wait_for_timeout(200)
    coach = (await p.text_content('#tgCoach')).strip()
    check(coach.startswith('High by') and 'feet 2 right, eyes 1 right' in coach, f'[target] lefty: same shot, mirrored move words [{coach}]')
    await p.click('#tgFind'); await p.wait_for_selector('#tgFindLine'); await p.click('#tgFindApply'); await p.wait_for_timeout(250)
    check((await p.text_content('#tgCall')).startswith('Pocket') and (await p.text_content('#tgBox')) == 'In the box', '[find] lefty: found line applies, pocket in the box (own board numbering)')
    check(not errs, f'[target] no page errors {errs[:2]}')
    await c.close()

async def addball_cycle(b):
    # Add a ball: name -> maker lookup (mocked from real parsed responses) -> confirm with source chips -> engine card vs
    # Rattler Big Bite on tonight's pattern -> grid placement -> save as benched. Plus candidates, spec TBD and offline paths.
    errs = []; c = await ctx_for(b, 'phone'); calls = []; mode = {'off': False}
    async def look(route):
        from urllib.parse import urlparse, parse_qs
        qs = parse_qs(urlparse(route.request.url).query); calls.append(qs)
        if mode['off']: return await route.abort()
        name = (qs.get('name') or [''])[0].lower(); url = (qs.get('url') or [''])[0]
        f = 'lookup-prism-hybrid.json' if url.endswith('prism-hybrid') else 'lookup-phaze-ii.json' if 'phaze' in name else 'lookup-prism.json' if 'prism' in name else 'lookup-rattler-big-bite.json' if 'rattler big bite' in name else None
        if not f: return await route.fulfill(status=200, content_type='application/json', body=json.dumps({'status': 'not_found', 'why': 'No maker page matched.'}))
        await route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body=fx(f))
    await c.route('**/arsenal-pro-api.onrender.com/api/spec-lookup**', look)
    p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.goto(BASE + '?ab#/tonight'); await p.wait_for_selector('#noBag'); await p.click('#loadStarter'); await p.wait_for_selector('#tnBagLink')
    await p.goto(BASE + '?ab#/arsenal'); await p.click('#arsAdd'); await p.wait_for_selector('#abQ')
    check(await p.query_selector('#tabs a[href="#/arsenal"][aria-current=page]') is not None, '[addball] reached from Arsenal (Add ball)')
    taps = 0
    await p.fill('#abQ', 'Storm Phaze II'); await p.wait_for_selector('#abNoMatch')
    check(await p.get_attribute('#abMaker', 'disabled') is None, '[addball] not in catalogue -> maker lookup offered (brand detected)')
    await p.click('#abMaker'); taps += 1; await p.wait_for_selector('#abConfirm'); await p.wait_for_selector('#abStatus[data-state=found]')
    q = calls[-1]; check(q.get('brand') == ['Storm'] and q.get('name') == ['Phaze II'], f'[addball] lookup called with brand + model {q}')
    rg = await p.text_content('#abFields [data-f=rg]'); check('2.480' in rg and 'www.stormbowling.com spec' in rg and 'other weight' in rg, f'[addball] RG from the maker with chip; 15 lb default flags the 16 lb value [{rg}]')
    check('spec TBD' in await p.text_content('#abFields [data-f=intDiff]'), '[addball] unprinted field reads "spec TBD"')
    check(await p.get_attribute('#abSource a', 'href') == 'https://www.stormbowling.com/storm-phaze-ii-bowling-ball', '[addball] source URL + read date shown')
    await p.click('#abConfirm [data-v="16"]'); taps += 1; await p.wait_for_function("() => !document.querySelector('#abFields [data-f=rg]').textContent.includes('other weight')")
    check('16 lb' in await p.text_content('#abFields [data-f=rg]'), '[addball] weight 16 -> weight-specific value, no mismatch flag')
    ms = float(await p.text_content('#abMs')); coach = await p.text_content('#abCoach')
    check(ms < 1000, f'[addball] engine card in {ms} ms (< 1 s on a phone profile)')
    check(coach.startswith('Phaze II') and coach.count('. ') <= 1, f'[addball] coach line starts with the ball name, <= 2 sentences [{coach}]')
    t = await p.text_content('#abTable'); check(all(k in t for k in ['Skid', 'Hook', 'Roll', 'Breakpoint', 'Entry angle']), '[addball] skid/hook/roll, breakpoint, entry angle vs bench')
    check('Rattler Big Bite' in await p.text_content('#abEngine'), '[addball] compared against Rattler Big Bite')
    await p.wait_for_selector('#abLevel'); await p.click('#abLevel [data-v="5"]'); taps += 1; await p.wait_for_selector('#abNew')
    why = await p.text_content('#abWhy'); check('Phaze II' in why, f'[addball] grid placement + overlap/hole note [{why}]')
    await p.evaluate("() => document.querySelectorAll('.toast').forEach(t => t.remove())")
    await axe_ok(p, '[addball] confirm + engine'); await p.wait_for_timeout(200)
    small = await p.evaluate(SMALL); check(not small, f'[addball] targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360 and w[0] == 360, f'[addball] no horizontal overflow at 360 {w}')
    await p.evaluate("() => window.scrollTo(0, 0)"); await shot(p, 'phone-addball-confirm')
    await p.evaluate("() => document.querySelector('#abEngine').scrollIntoView()"); await shot(p, 'phone-addball-engine')
    await p.evaluate("() => document.querySelector('#abPlace').scrollIntoView()"); await shot(p, 'phone-addball-grid')
    await p.click('#abSave'); taps += 1; await p.wait_for_selector('#bagGrid')
    check(taps <= 4, f'[addball] type + {taps} taps to a saved ball')
    n = await p.evaluate("() => [...document.querySelectorAll('#bagBalls [data-ball]')].filter(x => x.dataset.ball.startsWith('own-add-storm-phaze-ii')).length")
    check(n == 1, f'[addball] saved as an owned (benched) ball; Bag lists it ({n})')
    await p.reload(); await p.wait_for_selector('#bagGrid')
    n = await p.evaluate("() => [...document.querySelectorAll('#bagBalls [data-ball]')].filter(x => x.dataset.ball.startsWith('own-add-storm-phaze-ii')).length"); check(n == 1, '[addball] persists across reload (ownedBall.created event)')
    # candidates on the maker site -> pick -> spec TBD (no engine run)
    await p.click('#bagAdd'); await p.wait_for_selector('#abQ'); await p.fill('#abQ', 'Brunswick Prism'); await p.click('#abMaker'); await p.wait_for_selector('#abMakerCands')
    await p.click('#abMakerCands [data-url$="prism-hybrid"]'); await p.wait_for_selector('#abStatus[data-state=found]')
    check(await p.query_selector('#abNoEngine') is not None and 'spec TBD' in await p.text_content('#abFields [data-f=rg]'), '[addball] maker page without RG/diff -> "spec TBD", no engine run')
    # exact catalogue match -> lookup -> 16 lb shows the catalogue/maker conflict
    await p.fill('#abQ', 'Rattler Big Bite'); await p.click('#abList [data-pick="rattler-big-bite"]'); await p.wait_for_selector('#abStatus[data-state=found]')
    check(await p.query_selector('#abConflicts') is None, '[addball] Big Bite at 15 lb: app catalogue = maker 15 lb row (no conflict)')
    await p.click('#abConfirm [data-v="16"]'); await p.wait_for_selector('#abConflicts [data-conflict=rg]')
    check('2.493' in await p.text_content('#abConflicts'), '[addball] 16 lb: maker 2.493 vs catalogue 2.480 shown, maker used')
    await axe_ok(p, '[addball] conflict'); await p.wait_for_timeout(200)
    # offline: catalogue values + Retry
    mode['off'] = True; await p.fill('#abQ', 'Hammer Blacklist'); await p.click('#abList [data-pick="sc-hammer-blacklist"]'); await p.wait_for_selector('#abRetry')
    check('catalog' in await p.text_content('#abFields [data-f=rg]') and 'Offline' in await p.text_content('#abStatus'), '[addball] offline: catalogue values with "catalog" chip + Retry')
    check(not errs, '[addball] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def quicklog_cycle(b):
    # CC1: strike = 1 tap, one-pin spare = 3 taps, splits flagged with 3-6-9 per leave, triggers, undo, 10th frame,
    # and 0 throws lost when the tab is killed right after the screen moves on (IndexedDB).
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.goto(BASE + '?ql#/tonight'); await p.wait_for_selector('#noBag'); await p.click('#loadStarter'); await p.wait_for_selector('#tnLog')
    n0 = await p.evaluate("() => window.__apData.events()")
    where = lambda: p.text_content('#qlWhere')
    fr = lambda n: p.text_content(f'#qlFrames [data-f="{n}"] b')
    taps = 0
    await qtap(p, '#qlStrike'); taps += 1; await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 2')")
    check(taps == 1 and (await fr(1)).strip() == 'X', '[quicklog] strike logged in 1 tap')
    taps = 0
    await p.click('#qlPins [data-pin="10"]'); taps += 1
    sf = int((await p.text_content('#tnStand')).split()[1])   # sim bug 1: hints count from the real strike stand, not board 20
    hint = await p.text_content('#qlHint'); check(f'stand {sf + 9}' in hint and 'move 9 left' in hint and f'strike stand {sf}' in hint, f'[quicklog] 3-6-9 for the leave shows before logging ({hint.strip()[:60]})')
    await qtap(p, '#qlLeave'); taps += 1; await p.wait_for_selector('#qlSpare')
    await qtap(p, '#qlSpare'); taps += 1; await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 3')")
    check(taps == 3 and (await fr(2)).strip() == '9 /', f'[quicklog] 10-pin spare in 3 taps ({(await fr(2)).strip()})')
    check((await p.text_content('#qlFrames [data-f="1"] .num')).strip() == '20', '[quicklog] frame 1 = X + 9/ = 20')
    await p.click('#qlPins [data-pin="7"]'); await p.click('#qlPins [data-pin="10"]')
    check(await p.query_selector('#qlSplit') is not None and f'stand {sf - 9}' in await p.text_content('#qlHint') and f'stand {sf + 9}' in await p.text_content('#qlHint'), '[quicklog] 7-10 flagged as a split, both key-pin moves shown')
    await qtap(p, '#qlLeave'); await p.wait_for_selector('#qlMiss')
    check((await p.query_selector_all('#qlPins .pin:not([disabled])')).__len__() == 2, '[quicklog] second ball: only the 7 and 10 can be tapped')
    await qtap(p, '#qlMiss'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 4')")
    check((await fr(3)).strip() == '\u25CB8 -', f'[quicklog] split mark + miss shown ({(await fr(3)).strip()})')
    await p.click('#qlUndo'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 3 \u00b7 ball 2')")
    check(True, '[quicklog] undo voids the last ball')
    await qtap(p, '#qlMiss'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 4')")
    # triggers: 2 of 3 first balls high
    for _ in range(2):
        f0 = await where(); await p.click('#tnLog [role=radio][data-v=high]'); await p.click('#qlPins [data-pin="4"]'); await qtap(p, '#qlLeave'); await p.wait_for_selector('#qlSpare'); await qtap(p, '#qlSpare')
        await p.wait_for_function(f"() => document.querySelector('#qlWhere').textContent !== {json.dumps(f0)} && document.querySelector('#qlStrike')")
    tr = await p.text_content('#qlTrigger'); check('2 of 3 high' in tr and 'feet 2 left' in tr, f'[quicklog] trigger: 2 of 3 high -> move left ({tr.strip()[:50]})')
    await axe_ok(p, '[quicklog]'); small = await p.evaluate(SMALL); check(not small, f'[quicklog] targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360 and w[0] == 360, f'[quicklog] no horizontal overflow at 360 {w}')
    await p.eval_on_selector('#tnLog', 'e => e.scrollIntoView()'); await shot(p, 'phone-quicklog')
    # tab kill: log 3 more balls, kill the page the moment the UI moves on, reopen
    for _ in range(3):
        f0 = await where(); await qtap(p, '#qlStrike'); await p.wait_for_function(f"() => document.querySelector('#qlWhere').textContent !== {json.dumps(f0)}")
    shown = await p.eval_on_selector_all('#qlFrames .fr b', 'els => els.map(e => e.textContent)')
    await p.close(run_before_unload=False)
    p = await page(c, errs); await p.goto(BASE + '?ql#/tonight'); await p.wait_for_selector('#tnLog')
    again = await p.eval_on_selector_all('#qlFrames .fr b', 'els => els.map(e => e.textContent)')
    check(again == shown and (await p.text_content('#qlWhere')).strip() == 'Frame 9 \u00b7 ball 1', f'[quicklog] tab killed -> 0 throws lost ({again})')
    # finish: X in 9, 10th X 7 / -> final
    await qtap(p, '#qlStrike'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 10')")
    await qtap(p, '#qlStrike'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('ball 2')")
    await p.click('#qlPins [data-pin="3"]'); await p.click('#qlPins [data-pin="6"]'); await p.click('#qlPins [data-pin="10"]'); await qtap(p, '#qlLeave')
    await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('ball 3')"); await qtap(p, '#qlSpare'); await p.wait_for_selector('#qlNext')
    tot = (await p.text_content('#qlWhere')).strip(); check((await fr(10)).strip() == 'X 7 /' and tot.startswith('Final'), f'[quicklog] 10th X 7 / ends the game ({tot})')
    n1 = await p.evaluate("() => window.__apData.events()")
    check(n1 - n0 == 19, f'[quicklog] one event per ball: 16 balls + 1 undone + 1 void + 1 night record (sim bug 3) = 19 ({n1 - n0})')
    await p.click('#qlNext'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 1')")
    check('game 2' in await p.text_content('#tnLog'), '[quicklog] next game starts clean')
    check(not errs, '[quicklog] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

class MockEvents:
    """In-memory stand-in for /api/events + the v1 endpoints (same contract as arsenal-pro-api). Intercepts the API host,
    so nothing reaches production. online=False makes every request fail like airplane mode."""
    def __init__(self): self.rows, self.seq, self.online, self.quota, self.posts = [], 0, True, 5000, 0
    def mine(self, dev): return [r for r in self.rows if r[0] == dev]
    async def handle(self, route):
        req = route.request
        if not self.online: return await route.abort('internetdisconnected')
        from urllib.parse import urlparse, parse_qs
        u = urlparse(req.url); dev = req.headers.get('x-device-id'); hdr = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Device-Id', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS', 'Access-Control-Expose-Headers': 'Retry-After'}
        if req.method == 'OPTIONS': return await route.fulfill(status=204, headers=hdr)
        def js(st, body): return route.fulfill(status=st, headers=hdr, content_type='application/json', body=json.dumps(body))
        if u.path == '/api/events' and req.method == 'POST':
            self.posts += 1
            if len(req.post_data or '') > 20480: return await js(413, {'error': 'body too large'})
            evs = json.loads(req.post_data)['events']; known = {r[2]['id'] for r in self.mine(dev)}; fresh = {e['id'] for e in evs} - known
            if fresh and len(known) + len(fresh) > self.quota: return await js(429, {'error': f'event quota reached: this backup code can store {self.quota} events on the server ({len(known)} stored).', 'quota': self.quota, 'stored': len(known)})
            acc = 0
            for e in evs:
                if e['id'] not in known: self.seq += 1; self.rows.append((dev, self.seq, e)); known.add(e['id']); acc += 1
            return await js(200, {'accepted': acc, 'duplicates': len(evs) - acc, 'cursor': str(self.seq), 'stored': len(known), 'quota': self.quota})
        if u.path == '/api/events':
            q = parse_qs(u.query); after = int(q.get('after', ['0'])[0]); lim = int(q.get('limit', ['500'])[0])
            page = [r for r in self.mine(dev) if r[1] > after][:lim + 1]; more = len(page) > lim; page = page[:lim]
            return await js(200, {'events': [dict(r[2], serverSeq=str(r[1])) for r in page], 'cursor': str(page[-1][1] if page else after), 'more': more})
        if req.method == 'GET': return await js(200, [])
        return await js(201, {'id': 1})

async def apx(p, expr):
    # app globals can re-init under load (module re-eval on SW update): wait for them before every read
    await p.wait_for_function("() => window.__apData && window.__apSync", timeout=10000)
    return await p.evaluate(expr)

async def sync_cycle(b):
    # D3: airplane mode -> log (CSV import) -> kill the tab -> reopen (outbox intact) -> online -> flush -> wipe phone -> same code -> pull -> identical projection
    errs = []; m = MockEvents(); c = await b.new_context(viewport={'width': 360, 'height': 780}, is_mobile=True, has_touch=True); c.set_default_timeout(10000)
    await c.route(API, m.handle); p = await page(c, errs)
    await p.goto(BASE); await p.evaluate(WIPE)
    await p.evaluate("localStorage.setItem('ap_prefs', JSON.stringify({onboarded:true})); localStorage.setItem('ap_device', 'd-e2e-sync-0001')")
    m.online = False
    await p.goto(BASE + '?sync1#/import'); await p.wait_for_selector('#impPick'); await p.wait_for_function("() => window.__apData && window.__apSync")
    import tempfile; d = tempfile.mkdtemp(); f = os.path.join(d, 'scores.csv'); open(f, 'w').write("Date,Game 1,Game 2,Game 3\n2026-10-18,201,187,224\n2026-10-19,170,193,\n")
    await p.set_input_files('#impFile', f); await p.wait_for_selector('#impPreview'); await p.click('#impCommit'); await p.wait_for_selector('#impDone')
    await p.wait_for_function("() => window.__apData && window.__apSync && window.__apSync.outbox() > 0")   # globals can re-init under load
    n = await apx(p, "window.__apData.events()");
    check(n >= 8 and await apx(p, "window.__apSync.outbox()") == n, f'[sync] airplane mode: {n} events logged, all waiting in the outbox')
    h0 = await apx(p, "window.__apData.hash()")
    await p.close()  # tab killed while offline
    p = await page(c, errs); await p.goto(BASE + '?sync2#/more'); await p.wait_for_function("() => window.__apData && window.__apSync && window.__apData.events() > 0")
    check(await apx(p, "window.__apData.events()") == n and await apx(p, "window.__apSync.outbox()") == n, '[sync] after the kill: 0 events lost, outbox intact')
    await p.wait_for_function("() => document.querySelector('#dataInfo').textContent.includes('waiting to back up')")
    m.online = True; await apx(p, "window.__apSync.run()")
    await p.wait_for_function("() => window.__apSync.outbox() === 0", timeout=15000)
    srv = {r[2]['id'] for r in m.mine('d-e2e-sync-0001')}
    check(len(srv) == n, f'[sync] back online: all {n} events on the server ({len(srv)}), in <=15 kB batches')
    await p.wait_for_function("() => document.querySelector('#dataInfo').textContent.includes('Backed up')"); await shot(p, 'phone-more-synced')
    await p.evaluate(WIPE); await p.evaluate("localStorage.setItem('ap_prefs', JSON.stringify({onboarded:true})); localStorage.setItem('ap_device', 'd-e2e-sync-0001')")
    await p.goto(BASE + '?sync3#/more'); await p.wait_for_function(f"() => window.__apData && window.__apData.events() === {n}", timeout=15000)
    check(await apx(p, "window.__apData.hash()") == h0, '[sync] wiped phone + same backup code: pull restores the identical projection')
    check(await apx(p, "window.__apSync.outbox()") == 0, '[sync] pulled events are not pushed back')
    posts = m.posts; m.quota = n
    f2 = os.path.join(d, 'scores2.csv'); open(f2, 'w').write("Date,Game 1\n2026-10-20,210\n")
    await p.goto(BASE + '?sync4#/import'); await p.wait_for_selector('#impPick'); await p.wait_for_function("() => window.__apSync")
    await p.set_input_files('#impFile', f2); await p.wait_for_selector('#impPreview'); await p.click('#impCommit'); await p.wait_for_selector('#impDone')
    await apx(p, "window.__apSync.run()"); await p.goto(BASE + '?sync5#/more')
    await p.wait_for_function("() => document.querySelector('#dataInfo') && document.querySelector('#dataInfo').textContent.includes('Server backup is full')")
    check(await apx(p, "window.__apSync.outbox()") > 0, '[sync] quota 429: newer events kept on the phone, More explains it')
    check(not errs, '[sync] no page errors ' + ' | '.join(errs[:2]))
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

async def advisor_cycle(b):
    # Bag Advisor: event selector first on Tonight -> 1 tap builds the bag (roles, reasons, confidence) + "Start with: X, from feet N, aim N"
    # -> swap in 2 taps -> Pack this saves a bag + pack list -> answer remembered per event after reload. Owned in-bag balls only.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 740})
    await seed(p); await p.goto(BASE + '?adv#/tonight'); await p.wait_for_selector('#noBag'); await p.click('#loadStarter'); await p.wait_for_selector('#tnAdvisor')
    first = await p.evaluate("document.querySelector('#tonightBody').firstElementChild.id"); check(first == 'tnAdvisor', f'[advisor] event selector is the first thing on Tonight ({first})')
    labels = await p.eval_on_selector_all('#advEvent [data-event]', 'e=>e.map(x=>x.textContent)'); check(labels == ['League', 'Tournament', 'Practice', 'New center', 'Sport'], f'[advisor] 5 events {labels}')
    await p.click('[data-event=league]'); await p.wait_for_selector('#advStart')
    st = await p.text_content('#advStart'); check(st.startswith('Start with: Rattler Big Bite, from feet 17, aim 10.7'), f'[advisor] 1 tap -> start line with stand feet (laydown 10 + offset 7), not the laydown: {st!r}')
    rows = await p.eval_on_selector_all('.adv-row', 'e=>e.map(x=>[x.dataset.owned, x.dataset.role, !!x.querySelector(".prov"), x.querySelector("p").textContent.length>5])')
    check(len(rows) == 3 and rows[-1][1] == 'spare' and all(r[2] and r[3] for r in rows), f'[advisor] league = 2 + spare, each with role, reason, confidence {rows}')
    check(all(r[0] not in ('own-guru-supreme', 'own-raw-hammer', 'own-green-scout', 'own-rack-attack') for r in rows), '[advisor] benched balls never packed')
    check('no results logged yet' in await p.text_content('#advWhy') and await p.query_selector('#advNoData') is not None, '[advisor] no data -> "based on specs + your release, no results logged yet" + quick-log / import offered')
    check(await p.query_selector('#advPlan') is not None and 'A Rattler Big Bite' in await p.text_content('#advPlan'), '[advisor] A -> B -> C plan')
    check('21' in await p.text_content('#advChange'), '[advisor] "what would change it" cites the 21-game minimum')
    pk = await p.evaluate("document.getElementById('advPack').getBoundingClientRect().bottom"); check(pk <= 740, f'[advisor] answer + Pack this fit one 360x740 screen (bottom {round(pk)})')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360 and w[0] == 360, f'[advisor] no horizontal overflow at 360 {w}')
    small = await p.evaluate(SMALL.replace("filter(e=>{", "filter(e=>{if(!e.closest('#tnAdvisor'))return false;")); check(not small, f'[advisor] targets >= 44px {small[:6]}')
    await axe_ok(p, '[advisor]')
    await shot(p, 'phone-advisor')
    # swap in 2 taps
    await p.click('.adv-row[data-role=weaker-control] [data-swap]'); await p.click('[data-swap-to]'); await p.wait_for_timeout(300)
    rows2 = await p.eval_on_selector_all('.adv-row', 'e=>e.map(x=>x.dataset.owned)'); check(rows2 != [r[0] for r in rows] and len(rows2) == 3, f'[advisor] swap in 2 taps {rows2}')
    await p.click('#advPack'); await p.wait_for_selector('#advPackList')
    pl = await p.text_content('#advPackList'); check('3 balls' in pl and 'Spare' in pl, f'[advisor] Pack this -> pack list shown {pl[:80]!r}')
    check(await p.text_content('#tnPickName') == 'Rattler Big Bite', '[advisor] packed bag drives the Tonight pick')
    await p.reload(); await p.wait_for_selector('#advPackList')
    rows3 = await p.eval_on_selector_all('.adv-row', 'e=>e.map(x=>x.dataset.owned)'); check(rows3 == rows2 and 'Packed' in await p.text_content('#advPack'), '[advisor] answer remembered after reload')
    await p.click('[data-event=tournament]'); await p.wait_for_function("() => document.querySelectorAll('.adv-row').length === 6")
    warn = await p.eval_on_selector_all('.adv-row', 'e=>e.map(x=>x.querySelectorAll("[data-warn]").length)'); check(max(warn) <= 1, f'[advisor] tournament = 5 + spare, <= 1 warning per ball {warn}')
    await p.click('[data-event=league]'); await p.wait_for_selector('#advPackList')
    check(await p.eval_on_selector_all('.adv-row', 'e=>e.map(x=>x.dataset.owned)') == rows2, '[advisor] last answer per event type remembered (league swap kept)')
    await p.click('#advBuilder'); await p.wait_for_function("() => location.hash === '#/bag'"); check(True, '[advisor] full bag builder reachable')
    check(not errs, '[advisor] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def card_cycle(b):
    # BC: empty card says what to import; score a game -> Nights lists it -> session results (1 headline, <=2 stats, 1 focus);
    # LaneTrax import -> "See results" -> tag ball (feeds advisor); card: <=6 figures with sources, measured rev replaces typed only after confirm.
    import tempfile, subprocess
    d = tempfile.mkdtemp(); synth = os.path.join(d, 'session-report.pdf')
    subprocess.run(['node', '-e', f"""import('{os.path.abspath('tests/data/make_pdf.mjs')}').then(m=>{{const fs=require('fs');const W=JSON.parse(fs.readFileSync('tests/fixtures/lanetrax/session-report.words.json')).words;fs.writeFileSync('{synth}', m.buildPdf(W));}})"""], check=True)
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 740})
    await seed(p); await p.goto(BASE + '?bc#/card'); await p.wait_for_selector('#bcHeadline')
    check('Score a game' in await p.text_content('#bcHeadline') and await p.query_selector('#bcFigs') is None, '[card] empty: headline says what to do, no invented figures')
    empties = await p.eval_on_selector_all('.bc-empty', 'e=>e.map(x=>x.textContent)'); check(len(empties) >= 3 and all(('Import' in t or 'Score' in t or 'type' in t) for t in empties), f'[card] each empty section says what to log/import ({len(empties)})')
    await axe_ok(p, '[card] empty'); await shot(p, 'phone-card-empty')
    await p.goto(BASE + '?bc#/sessions'); await p.wait_for_selector('#sessBody')
    check('No sessions yet' in await p.text_content('#sessBody'), '[card] Nights empty state points to Tonight')
    # score one game on Tonight (test data): X, 9/ (10 pin) alternating, 10th X X X
    await p.goto(BASE + '?bc#/tonight'); await p.wait_for_selector('#noBag'); await p.click('#loadStarter'); await p.wait_for_selector('#tnLog')
    async def nxt(sel):
        f0 = await p.text_content('#qlWhere'); await qtap(p, sel); await p.wait_for_function(f"() => !document.querySelector('#qlWhere') || document.querySelector('#qlWhere').textContent !== {json.dumps(f0)}")
    for f in range(1, 10):
        if f % 2: await nxt('#qlStrike')
        else:
            await p.click('#qlPins [data-pin="10"]'); await nxt('#qlLeave'); await p.wait_for_selector('#qlSpare')
            if f == 4: await nxt('#qlMiss')
            else: await nxt('#qlSpare')
    for _ in range(3):
        if await p.query_selector('#qlStrike'): await nxt('#qlStrike')
    await p.wait_for_timeout(300)
    await p.goto(BASE + '?bc2#/sessions'); await p.wait_for_selector('#nightList')
    rows = await p.eval_on_selector_all('#nightList .night-row', 'e=>e.map(x=>x.textContent)'); check(len(rows) == 1 and 'Scored' in rows[0], f'[card] scored game listed in Sessions > Nights {rows}')
    await p.click('#nightList .night-row'); await p.wait_for_selector('#sessRecap')
    head = await p.text_content('#sessHead'); sup = await p.query_selector_all('#sessRecap .bc-fig')
    check(len(sup) <= 2 and await p.query_selector('#sessFocus') is not None, f'[card] session recap: 1 headline, {len(sup)} supporting stats, 1 focus ({head!r})')
    foc = await p.text_content('#sessFocus'); check('10 pin' in foc and '3 of 4' in foc, f'[card] focus names the leave with made/total ({foc!r})')
    check(await p.query_selector('#sessGames .bc-frames') is not None, '[card] game frames visible in the session')
    check(not await p.is_visible('#sessSSO'), '[card] strike/spare/open detail behind "Details"')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360, f'[card] session no horizontal overflow {w}')
    await axe_ok(p, '[card] session'); await shot(p, 'phone-session-scored')
    # LaneTrax import -> See results -> tag a ball
    await p.goto(BASE + '?bc#/import?kind=lanetrax'); await p.wait_for_selector('#impPick'); await p.set_input_files('#impFile', synth)
    await p.wait_for_selector('#impPreview[data-kind=lanetrax]'); await p.click('#impCommit'); await p.wait_for_selector('#impResults')
    await p.click('#impResults'); await p.wait_for_selector('#sessRecap')
    check('6 strikes on 47 first balls; 8 of 39 spares made' in await p.text_content('#sessHead'), '[card] LaneTrax results headline from the report')
    await p.click('#sessDetails summary'); await p.wait_for_selector('#sessLtx')
    t = await p.text_content('#sessDetails'); check('Level' in t and 'Import notes' in t, '[card] LaneTrax levels and import notes behind Details')
    await shot(p, 'phone-session-lanetrax')
    opt = await p.eval_on_selector('#sessBall', 'e=>e.options[1].value'); await p.select_option('#sessBall', opt); await p.wait_for_timeout(400)
    tagged = await p.evaluate("() => window.__apData.projection().aggregates.map(a => a.ballId)"); check(opt in tagged, f'[card] LaneTrax session tagged to a ball (feeds advisor) {tagged}')
    # the card
    await p.goto(BASE + '?bc3#/card'); await p.wait_for_selector('#bcFigs')
    figs = await p.eval_on_selector_all('#bcFigs .bc-fig', 'e=>e.map(x=>[x.dataset.k, x.querySelector(".bc-n").textContent])')
    check(4 <= len(figs) <= 6 and all(f[1] for f in figs), f'[card] 4-6 headline figures, each with source/n {figs}')
    check([f[0] for f in figs][:2] == ['avg', 'single'], f'[card] average and single-pin spares lead (what league bowlers check)')
    await axe_ok(p, '[card] populated'); await p.wait_for_timeout(200)
    small = await p.evaluate(SMALL); check(not small, f'[card] targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360, f'[card] no horizontal overflow at 360 {w}')
    await shot(p, 'phone-card-populated')
    await p.click('#bcRelease summary'); await p.wait_for_selector('[data-use=rev]')
    await shot(p, 'phone-card-release')
    await p.click('[data-use=rev]'); await p.click('.sheet .btn.primary'); await p.wait_for_timeout(500)
    rev = await p.evaluate("() => { const r = window.__apData.projection().bowler.rev; return r && r.v; }")
    check(rev == 231.4, f'[card] measured rev replaces typed only after confirm ({rev})')
    check(await p.query_selector('#bcShare') is not None, '[card] share-as-image offered')
    await p.goto(BASE + '?bc#/arsenal/insights'); await p.wait_for_selector('#insHead')
    check('8.5/10' not in await p.text_content('main') and len(await p.text_content('#insHead')) > 10, '[card] Insights static assessment replaced by computed line')
    await p.reload(); await p.goto(BASE + '?bc4#/sessions'); await p.wait_for_selector('#nightList')
    check(len(await p.query_selector_all('#nightList .night-row')) == 2, '[card] both sessions persist after reload')
    check(not errs, '[card] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def sim_cycle(b):
    # Sim bugs (5:35 steering): home = Tonight; lefty hints; double tap = one throw; game-open layout + reload; offline chip;
    # one stand/aim on Tonight and Lane; recap + focus; plain-words data card is checked in [data].
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.evaluate("localStorage.setItem('ap_profile', JSON.stringify({hand:'left', style:'one', speed:15, rev:220}))")
    # a v1 ap_profile is migrated on first boot, and the migration may seed the starter bag itself (hub.js), so either state is fine
    await p.goto(BASE + '?sim'); await p.wait_for_selector('#noBag, #tnStand')
    check(await p.query_selector('#tabs a[href="#/tonight"][aria-current=page]') is not None, '[sim] app opens on Tonight, not Lane')
    if await p.query_selector('#loadStarter'): await p.click('#loadStarter')
    await p.wait_for_selector('#tnStand')
    feet = int((await p.text_content('#tnStand')).split()[1])
    box = await p.query_selector('#qlStrike'); await box.scroll_into_view_if_needed(); await p.wait_for_timeout(300); bb = await box.bounding_box(); x, y = bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2
    await p.mouse.click(x, y); await p.wait_for_timeout(120); await p.mouse.click(x, y); await p.wait_for_timeout(600)
    wh = await p.text_content('#qlWhere'); check('Frame 2' in wh, f'[sim] double tap on X logs one strike ({wh!r})')
    check(await p.is_visible('#tnNow') and await p.eval_on_selector('#tnMore', 'e => !e.open') and await p.query_selector('#tnMore #tnPick') is not None, '[sim] game open: ball/feet/aim + scoring up front, the rest behind one tap')
    check(f'feet {feet}' in await p.text_content('#tnNowLine'), '[sim] game-open line uses the same stand as the pick card')
    await axe_ok(p, '[sim] game open'); await shot(p, 'phone-tonight-game-open')
    await p.click('#qlPins [data-pin="7"]'); await p.wait_for_selector('#qlHint')
    hint = await p.text_content('#qlHint'); check('lefty' in hint and f'strike stand {feet}' in hint, f'[sim] lefty spare hint uses hand + real strike stand ({hint[:90]!r})')
    await p.reload(); await p.wait_for_selector('#tnNow'); check(await p.is_visible('#tnLog') and 'Frame 2' in await p.text_content('#qlWhere'), '[sim] scoring card restored after reload')
    aim = (await p.text_content('#tnNowLine')).split('aim')[-1].strip()
    await c.set_offline(True); await p.evaluate("() => window.dispatchEvent(new Event('offline'))"); await p.wait_for_selector('#netChip:not([hidden])')
    check('Offline' in await p.text_content('#netChip'), '[sim] offline chip shows'); await shot(p, 'phone-tonight-offline')
    await c.set_offline(False); await p.evaluate("() => window.dispatchEvent(new Event('online'))"); await p.wait_for_selector('#netChip', state='hidden')
    await p.goto(BASE + '?sim#/lane'); await p.wait_for_selector('#lineSum[data-stand]'); await p.wait_for_timeout(400)
    ls = await p.text_content('#lineSum'); st = await p.get_attribute('#lineSum', 'data-stand')
    check(int(st) == feet and aim in ls, f'[sim] Lane shows the same stand/aim as Tonight (lane {st}/{ls!r}, tonight {feet}/{aim})')
    check(not errs, '[sim] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def scoring_cycle(b):
    # Scoring fixes: (1) pad within thumb reach, two-tap spare, Saved line, frame time; (2) any-frame edit + undo in <= 4 taps;
    # (3) ball chip + spare-ball rule, Games by ball/leave, games CSV; (4) league/Baker + USBC handicap (only my frames feed stats).
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.goto(BASE + '?sc#/tonight'); await p.wait_for_selector('#noBag'); await p.click('#loadStarter'); await p.wait_for_selector('#tnLog')
    where = lambda: p.text_content('#qlWhere'); fr = lambda n: p.text_content(f'#qlFrames [data-f="{n}"] b')
    await qtap(p, '#qlStrike'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 2')")
    check('Saved' in await p.text_content('#qlSaved') and 'frame 1' in await p.text_content('#qlSaved'), '[scoring] Saved line confirms the write')
    pad = await p.eval_on_selector('#qlPad', 'e => { const r = e.getBoundingClientRect(); return [r.top, r.bottom, innerHeight]; }')
    check(pad[1] <= pad[2] - 60 and pad[0] >= pad[2] * 0.25, f'[scoring] pad sits in the lower screen, above the tab bar {[round(x) for x in pad]}')
    await p.click('#qlPins [data-pin="10"]'); await qtap(p, '#qlSpareNow'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 3')")
    check((await fr(2)).strip() == '9 /', f'[scoring] one-pin spare in 2 taps (pin, then spare) ({(await fr(2)).strip()})')
    t0 = await p.evaluate('performance.now()')
    for _ in range(3):
        f0 = await where(); await p.click('#qlPins [data-pin="7"]'); await qtap(p, '#qlSpareNow'); await p.wait_for_function(f"() => document.querySelector('#qlWhere').textContent !== {json.dumps(f0)}")
    ms = await p.evaluate('window.__apFrameMs || []')
    check(len(ms) >= 3 and max(ms[-3:]) < 3500, f'[scoring] frame entry under 3.5 s each (app-side, incl. test waits) {ms[-3:]}')
    await axe_ok(p, '[scoring] pad'); small = await p.evaluate(SMALL); check(not small, f'[scoring] targets >= 44px {small[:6]}')
    await shot(p, 'phone-scoring-pad')
    # (2) fix any frame in <= 4 taps, with undo
    wf = lambda txt: p.wait_for_function(f"() => document.querySelector('#qlSaved').textContent.includes({json.dumps(txt)})")
    await p.click('#qlFix'); await p.click('#qlFixPick [data-fix="2"]'); await p.wait_for_selector('#qlFixCancel')
    check('Fixing frame 2' in await where(), f'[scoring] fix mode names the frame ({await where()})')
    await axe_ok(p, '[scoring] fix mode'); small = await p.evaluate(SMALL); check(not small, f'[scoring] fix-mode targets >= 44px {small[:6]}')
    await shot(p, 'phone-scoring-fix')
    await qtap(p, '#qlStrike'); await wf('frame 2 fixed')
    check((await fr(2)).strip() == 'X' and 'Frame 6' in await where(), f'[scoring] frame 2 fixed to X in 3 taps (Fix, 2, X); play resumes at frame 6 ({(await fr(2)).strip()}, {await where()})')
    check((await p.text_content('#qlFrames [data-f="1"] .num')).strip() == '29', '[scoring] totals rescored after the fix (frame 1 = X X 9 = 29)')
    await qtap(p, '#qlUndoFix'); await wf('frame 2 restored')
    check((await fr(2)).strip() == '9 /' and (await p.text_content('#qlFrames [data-f="1"] .num')).strip() == '20', '[scoring] Undo fix puts frame 2 back (1 tap)')
    await p.click('#qlFrames [data-f="3"]'); await p.wait_for_selector('#qlFixCancel'); await p.click('#qlPins [data-pin="1"]'); await p.click('#qlPins [data-pin="2"]'); await qtap(p, '#qlSpareNow'); await wf('frame 3 fixed')
    check((await fr(3)).strip() == '8 /', f'[scoring] tap a frame cell, pins, spare: frame 3 = 8 / in 4 taps ({(await fr(3)).strip()})')
    await p.click('#qlFix'); await p.click('#qlFixPick [data-fix="4"]'); await p.click('#qlPins [data-pin="5"]'); await p.click('#qlFixCancel')
    check((await fr(4)).strip() == '9 /' and 'Frame 6' in await where(), '[scoring] Cancel fix leaves the frame unchanged')
    await p.reload(); await p.wait_for_selector('#tnLog')
    check((await fr(3)).strip() == '8 /' and 'Frame 6' in await where(), '[scoring] a fixed frame survives reload (stored as events)')
    # (3) throwing-this-ball chip + spare-ball rule; Games by ball and by leave; games CSV
    chip0 = await p.text_content('#qlBall'); check('Rattler Big Bite' in chip0, f'[scoring] chip shows the ball being thrown ({chip0!r})')
    await p.click('#qlBall'); await p.wait_for_selector('#qlBallPick')
    await axe_ok(p, '[scoring] ball picker'); small = await p.evaluate(SMALL); check(not small, f'[scoring] ball-picker targets >= 44px {small[:6]}')
    await shot(p, 'phone-scoring-ballpick')
    await p.click('#qlBallPick [data-ball="own-hy-road-pearl"]'); await p.wait_for_function("() => document.querySelector('#qlBall').textContent.includes('Hy-Road')")
    check(not await p.query_selector('#qlBallPick'), '[scoring] choosing a ball closes the picker (2 taps)')
    await p.click('#qlBall'); await p.click('#qlSpareRule'); check('on' in await p.text_content('#qlSpareRule'), '[scoring] spare-ball rule toggles on'); await p.click('#qlBallDone')
    await p.click('#qlPins [data-pin="4"]'); await qtap(p, '#qlLeave'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('ball 2')")
    c2 = await p.text_content('#qlBall'); check('Spare ball' in c2 and 'Ice Storm' in c2, f'[scoring] spare-ball rule: at a leave the chip shows the spare ball ({c2!r})')
    await qtap(p, '#qlSpare'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 7')")
    for _ in range(6): await qtap(p, '#qlStrike')
    await p.wait_for_selector('#qlNext')
    await p.goto(BASE + '?sc#/sessions'); await p.wait_for_selector('#nightList a'); await p.click('#nightList a'); await p.wait_for_selector('#sessDetails')
    await p.click('#sessDetails summary'); await p.wait_for_selector('#sessByBall')
    bb = await p.text_content('#sessByBall'); bl = await p.text_content('#sessByLeave')
    check('Hy-Road' in bb and 'Ice Storm' in bb and 'Rattler Big Bite' in bb and '1 of 1' in bb, f'[scoring] Games by ball credits each ball ({bb[:120]!r})')
    check('4' in bl and 'of' in bl, f'[scoring] Games by leave lists each leave with its count ({bl[:80]!r})')
    await axe_ok(p, '[scoring] session by ball/leave'); await shot(p, 'phone-session-byball')
    await p.goto(BASE + '?sc#/sessions'); await p.wait_for_selector('#gamesCsv')
    async with p.expect_download() as dl: await p.click('#gamesCsv')
    d = await dl.value; path = await d.path(); txt = open(path, encoding='utf-8-sig', newline='').read()
    lines = txt.strip().split('\r\n')
    check(lines[0].startswith('date,session,source,game,score') and len(lines) == 2 and ',yes,' in lines[1], f'[scoring] games CSV: header + 1 complete game ({lines[:2]})')
    check(not any(cell.startswith(('=', '+', '@')) for ln in lines for cell in ln.split(',')), '[scoring] games CSV has no formula cells')
    # (4) league team + USBC handicap: one pad, "Up: Name"; teammates' frames never feed my stats; Baker = team game
    await p.goto(BASE + '?sc#/tonight'); await p.wait_for_selector('#qlNext'); await p.click('#qlNext'); await p.wait_for_selector('#tnSetup')
    await p.click('#tnSetup [aria-label="Scoring"] [data-v="league"]'); await p.wait_for_selector('#tnTeam')
    await p.fill('#lgMyAvg', '180'); await p.press('#lgMyAvg', 'Tab')
    await p.click('#lgAdd'); await p.wait_for_selector('#lgName0'); await p.fill('#lgName0', 'Ann'); await p.press('#lgName0', 'Tab')
    await p.fill('#lgAvg0', '150'); await p.press('#lgAvg0', 'Tab')
    await p.click('#lgAdd'); await p.wait_for_selector('#lgName1'); await p.fill('#lgName1', 'Bo'); await p.press('#lgName1', 'Tab')
    await p.fill('#lgAvg1', '160'); await p.press('#lgAvg1', 'Tab'); await p.click('[aria-label="Bowler 3 status"] [data-v="absent"]')
    await p.wait_for_function("() => document.querySelector('[aria-label=\"Bowler 3 status\"] [data-v=absent]').getAttribute('aria-checked') === 'true'")
    check('100%' in await p.text_content('#lgRule') and '100d-2' in await p.text_content('#lgRule'), '[scoring] league setup cites USBC 100% default (Rule 100d-2)')
    await axe_ok(p, '[scoring] league setup'); small = await p.evaluate(SMALL); check(not small, f'[scoring] league-setup targets >= 44px {small[:6]}')
    await shot(p, 'phone-league-setup')
    n0 = await p.evaluate("() => window.__apData.projection().games.length")
    await qtap(p, '#qlStrike'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Up: Ann')")
    check('frame 1' in await where() and not await p.query_selector('#qlBall'), f'[scoring] after my frame the pad is Ann\'s: "{await where()}", no ball chip')
    await p.click('#qlPins [data-pin="10"]'); await qtap(p, '#qlSpareNow'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Up: You')")
    check('frame 2' in await where(), f'[scoring] absent Bo is skipped; back to me for frame 2 ({await where()})')
    await axe_ok(p, '[scoring] league pad'); small = await p.evaluate(SMALL); check(not small, f'[scoring] league-pad targets >= 44px {small[:6]}')
    await p.click('#qlBoard summary'); bd = await p.text_content('#qlBoardTbl')
    # Ann: 150 avg, 90% of 220 -> 63; Bo absent: 160 - 10 = 150, hdcp on 160 -> 54 (USBC 112e-1); me: 180 -> 36
    check('Ann' in bd and '63' in bd and '150 (absentee)' in bd and '54' in bd and '36' in bd, f'[scoring] team board: handicap 90% of 220 + absentee avg-10 ({bd[:160]!r})')
    await shot(p, 'phone-league-board')
    pj = await p.evaluate("() => { const P = window.__apData.projection(); return [P.games.length, P.teamShots.filter(x => x.who).length, P.shots.filter(x => x.game === 2).length]; }")
    check(pj[0] == n0 + 1 and pj[1] == 2 and pj[2] == 1, f'[scoring] only my frames feed stats; Ann\'s 2 throws are team-only {pj}')
    await p.click('#tnMore summary'); await p.click('#tnSetup [aria-label="Scoring"] [data-v="baker"]')
    await p.wait_for_function("() => document.querySelector('#qlWhere') && document.querySelector('#qlWhere').textContent.includes('Up: You')")
    await qtap(p, '#qlStrike'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Up: Ann')")
    check('frame 2' in await where(), f'[scoring] Baker: frame 2 goes to the next bowler ({await where()})')
    pj2 = await p.evaluate("() => window.__apData.projection().teamShots.filter(x => x.who === 'baker').length")
    check(pj2 == 1, f'[scoring] Baker frames are team-only, not in averages (USBC Rule 3a) ({pj2})')
    await p.reload(); await p.wait_for_selector('#qlWhere')
    check('Up: Ann' in await where(), '[scoring] Baker turn survives reload')
    #FIX4
    check(not errs, '[scoring] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def protect_cycle(b):
    # GAP (a): install offer once after the first saved game (never mid-game), backup nudge (>3 games or file >14 days), More chip + last backup.
    errs = []; c = await ctx_for(b, 'phone', accept_downloads=True); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.goto(BASE + '?pr#/tonight'); await p.wait_for_selector('#noBag'); await p.click('#loadStarter'); await p.wait_for_selector('#tnLog')
    await qtap(p, '#qlStrike'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 2')")
    check(not await p.query_selector('#tnProtect, #tnBackup'), '[protect] nothing new while a game is open')
    for _ in range(11): await qtap(p, '#qlStrike')
    await p.wait_for_selector('#tnProtect')
    tx = await p.text_content('#tnProtect')
    check('7 days' in tx and 'Home Screen' in tx and not any(w in tx.lower() for w in ['great', 'good job', 'awesome']), f'[protect] install offer after the first saved game, plain and informational ({tx[:90]!r})')
    order = await p.evaluate("() => { const a = [...document.querySelectorAll('#tnLog > *')].map(e => e.id); return [a.indexOf('qlNext'), a.indexOf('tnProtect')]; }")
    check(order[0] >= 0 and order[1] > order[0], f'[protect] offer sits below Start next game {order}')
    await axe_ok(p, '[protect] offer'); small = await p.evaluate(SMALL); check(not small, f'[protect] targets >= 44px {small[:6]}')
    await shot(p, 'phone-protect-offer')
    await p.click('#tnInstallLater'); await p.wait_for_function("() => !document.querySelector('#tnProtect')")
    await p.reload(); await p.wait_for_selector('#qlNext')
    check(not await p.query_selector('#tnProtect') and not await p.query_selector('#tnBackup'), '[protect] offer shown once; 1 game and no file -> no backup nudge yet')
    old = "async d => { const m = await import('./js/hub.js'); await m.ready(); await m.db.setMeta('backupDownloadedAt', Date.now() - d * 864e5); }"
    await p.evaluate(old, 20); await p.reload(); await p.wait_for_selector('#tnBackup')
    check('20 days ago' in await p.text_content('#tnBackup'), f"[protect] backup nudge when the file is > 14 days old ({await p.text_content('#tnBackup')!r})")
    async with p.expect_download() as dl: await p.click('#tnBackupNow')
    bk = json.load(open(await (await dl.value).path()))
    check(bk.get('format') == 'backup' and bk['events'], '[protect] nudge downloads the full backup file')
    await p.wait_for_function("() => !document.querySelector('#tnBackup')")
    await p.evaluate(old, 15); await p.reload(); await p.wait_for_selector('#tnBackupLater'); await p.click('#tnBackupLater')
    await p.reload(); await p.wait_for_selector('#qlNext'); check(not await p.query_selector('#tnBackup'), '[protect] "Remind me in 14 days" holds the nudge back')
    await p.goto(BASE + '#/more'); await p.wait_for_selector('#protChip'); await p.wait_for_function("() => /Protected|Not protected/.test(document.querySelector('#protChip').textContent)")
    await p.wait_for_function("() => (document.querySelector('#lastBackup') || {}).textContent")
    lb = await p.text_content('#lastBackup'); chip = await p.text_content('#protChip')
    check(lb.startswith('Last backup file: 15 days ago') or 'days ago' in lb, f'[protect] More: last backup in plain words ({lb!r})')
    await p.click('#protMore summary'); pm = await p.text_content('#protMore')
    check(chip in ('Protected', 'Not protected') and '7 days' in pm and 'backup file' in pm, f'[protect] More: chip {chip!r}; why + fixes behind "Keep it safe"')
    await axe_ok(p, '[protect] More'); small = await p.evaluate(SMALL); check(not small, f'[protect] More targets >= 44px {small[:6]}')
    await shot(p, 'phone-protect-more')
    check(not errs, '[protect] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def alley_cycle(b):
    # GAP (d): wake lock held only while a game is open (released at the final frame / when off); Large + Extra large text.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await c.add_init_script("""window.__wl = {req: 0, rel: 0, held: 0}; Object.defineProperty(navigator, 'wakeLock', {configurable: true, value: {request: async () => { __wl.req++; __wl.held++;
      const l = new EventTarget(); l.release = async () => { if (l.done) return; l.done = 1; __wl.rel++; __wl.held--; l.dispatchEvent(new Event('release')); }; return l; }}});""")
    await seed(p); await p.goto(BASE + '?al#/tonight'); await p.wait_for_selector('#noBag'); await p.click('#loadStarter'); await p.wait_for_selector('#tnLog')
    wl = lambda: p.evaluate('window.__wl')
    check((await wl())['held'] == 0, '[alley] no wake lock before the game starts')
    await qtap(p, '#qlStrike'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 2')")
    check((await wl())['held'] == 1, f'[alley] wake lock held once a game is open {await wl()}')
    for _ in range(11): await qtap(p, '#qlStrike')
    await p.wait_for_selector('#qlNext')
    check((await wl())['held'] == 0, f'[alley] released at the final frame {await wl()}')
    await p.goto(BASE + '#/more'); await p.wait_for_selector('#wakeFld')
    await p.click('#wakeFld [data-v="off"]'); await p.click('#textSizeFld [data-v="xl"]')
    fs = await p.evaluate("getComputedStyle(document.documentElement).fontSize"); check(fs == '20px', f'[alley] Extra large text scales the rem base ({fs})')
    await axe_ok(p, '[alley] More appearance'); small = await p.evaluate(SMALL); check(not small, f'[alley] More targets >= 44px {small[:6]}')
    await p.goto(BASE + '#/tonight'); await p.wait_for_selector('#qlNext'); await p.click('#qlNext'); await p.wait_for_selector('#qlStrike'); await qtap(p, '#qlStrike')
    await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 2')")
    check((await wl())['held'] == 0, f'[alley] setting Off: no wake lock during a game {await wl()}')
    ov = await p.evaluate("document.documentElement.scrollWidth - innerWidth"); check(ov <= 0, f'[alley] XL text at 360 px: no sideways scroll ({ov})')
    pad = await p.eval_on_selector('#qlPad', 'e => { const r = e.getBoundingClientRect(); return [r.top, r.bottom, innerHeight]; }')
    check(pad[1] <= pad[2] and pad[0] >= 0, f'[alley] XL text: the pad still fits on screen {[round(x) for x in pad]}')
    await axe_ok(p, '[alley] XL pad'); small = await p.evaluate(SMALL); check(not small, f'[alley] XL pad targets >= 44px {small[:6]}')
    await shot(p, 'phone-xl-pad')
    await p.reload(); await p.wait_for_selector('#qlPad')
    check(await p.evaluate("document.documentElement.dataset.text") == 'xl', '[alley] text size survives reload')
    wide = []
    for r in ['#/lane', '#/arsenal', '#/patterns', '#/sessions', '#/more', '#/bag', '#/target']:
        await p.goto(BASE + r); await p.wait_for_timeout(700)
        if await p.evaluate("document.documentElement.scrollWidth - innerWidth") > 0: wide.append(r)
    check(not wide, f'[alley] XL text: no sideways scroll on main screens {wide}')
    check(not errs, '[alley] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
        steps = [('sim', lambda: sim_cycle(b)), ('protect', lambda: protect_cycle(b)), ('alley', lambda: alley_cycle(b)), ('phone', lambda: run(b, 'phone')), ('desktop', lambda: run(b, 'desktop')), ('deck', lambda: deck_cases(b)), ('migration', lambda: migration(b)), ('data', lambda: data_cycle(b)), ('csv', lambda: csv_cycle(b)), ('ltx', lambda: ltx_cycle(b)), ('tonight', lambda: tonight_cycle(b)), ('advisor', lambda: advisor_cycle(b)), ('card', lambda: card_cycle(b)), ('quicklog', lambda: quicklog_cycle(b)), ('scoring', lambda: scoring_cycle(b)), ('bag', lambda: bag_cycle(b)), ('addball', lambda: addball_cycle(b)), ('target', lambda: targeting_cycle(b)), ('sync', lambda: sync_cycle(b)), ('offline', lambda: offline(b))]
        for name, fn in steps:
            if only and name not in only: continue
            try: await asyncio.wait_for(fn(), 240)
            except Exception as e:
                import traceback; tb = [l for l in traceback.format_exc().splitlines() if 'e2e.py", line' in l][-1:]
                check(False, f'[{name}] crashed or timed out: {type(e).__name__} {str(e)[:160]} {tb}')
        await b.close()
    print(f'\n{len(passes)} passed, {len(fails)} failed')
    for f in fails: print('  FAIL', f)
    sys.exit(1 if fails else 0)
asyncio.run(main())
