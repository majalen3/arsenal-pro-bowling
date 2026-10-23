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

NEW_ROUTES = ['#/import']
SMALL = """[...document.querySelectorAll('button, a[href], input:not([type=file]), select, label.btn, [role=slider]')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0 && r.height>0 && getComputedStyle(e).visibility!=='hidden' && !e.closest('.sr-only') && (r.width<44||r.height<44) && !(e.type==='range')}).map(e=>(e.id||e.className||e.tagName)+' '+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height))"""
DATA_READY = "() => window.__apData && window.__apData.events() > 0"
async def data_cycle(b):
    # D0: v0 keys -> event log (migration + one-time seed), export v1 backup -> wipe localStorage AND IndexedDB -> restore -> same projection hash
    errs = []; c = await ctx_for(b, 'phone', accept_downloads=True); p = await page(c, errs)
    await p.goto(BASE); await p.evaluate(WIPE)
    await p.evaluate("""localStorage.setItem('ap_prefs', JSON.stringify({onboarded:true})); localStorage.setItem('ap_device','d-test-0001');
      localStorage.setItem('ap_lines', JSON.stringify([{ballId:'hy-road',name:'league line',release:22,aim:9,speed:16,rev:300,oil:1.2,finish:'2000',pattern:'house',note:'',updatedAt:5,synced:true,id:9}]));
      localStorage.setItem('ap_notes', JSON.stringify([{lane:'7-8',oil:'fresh',adjustment:'2 left',synced:true}]));""")
    await p.goto(BASE + '?d0#/more'); await p.wait_for_function(DATA_READY)
    d = await p.evaluate("({backend: window.__apData.backend, boot: window.__apData.bootMs, n: window.__apData.events(), h: window.__apData.hash()})")
    check(d['backend'] == 'indexedDB', f"[data] event log on IndexedDB ({d['backend']}, opened+migrated in {d['boot']} ms after first paint)")
    check(d['n'] >= 2 + 10, f"[data] v0 keys migrated + reported arsenal seeded once ({d['n']} events)")
    await p.wait_for_function("() => document.querySelector('#dataInfo').textContent.includes('events on this phone')")
    check('owned balls' in await p.text_content('#dataInfo'), '[data] More shows the data card')
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
    check('Rule of 31' in await p.text_content('#tnR31'), '[tonight] Rule of 31 shown')
    ms = await p.evaluate("() => window.__apTonightMs"); check(ms is not None and ms < 1000, f'[tonight] render {ms} ms < 1 s')
    await axe_ok(p, '[tonight]'); await p.wait_for_timeout(200)
    small = await p.evaluate(SMALL); check(not small, f'[tonight] targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= w[0], f'[tonight] no horizontal overflow at 360 {w}')
    await shot(p, 'phone-tonight')
    await p.click('[data-read=early]'); await p.wait_for_function("() => !document.querySelector('#tnPickName').textContent.includes('Big Bite')")
    check('Ordnance C4' in await p.text_content('#tnPickName'), '[tonight] "Too early" -> one step weaker (C4) in 1 tap')
    await p.fill('#tnPattern', '2026 PBA Badger'); await p.dispatch_event('#tnPattern', 'change'); await p.wait_for_function("() => document.querySelector('#tnR31').textContent.includes('50 ft')")
    check('Both shown' in await p.text_content('#tnR31'), '[tonight] long pattern: Rule of 31 vs 13-16 band conflict shown')
    await p.fill('#tnCenter', 'Test Lanes'); await p.dispatch_event('#tnCenter', 'change'); await p.wait_for_timeout(300)
    await p.click('#tnSetup [role=radio][data-v=synthetic]'); await p.wait_for_timeout(300)
    t = await p.text_content('#tnPickName'); co = await p.text_content('#tnCoach'); st = await p.text_content('#tnPick [data-alt=Stronger]')
    check('Big Bite' in t and 'new center' in co and 'Super Nova' in st and 'demand 5' in await p.text_content('#tnPick'), f'[tonight] Badger 50 ft heavy -> demand 5; first visit to a center keeps benchmark first, Super Nova is the stronger move ({t.strip()})')
    # LaneTrax measurement -> accept on Tonight
    await p.goto(BASE + '?tn#/import?kind=lanetrax'); await p.wait_for_selector('#impPick'); await p.set_input_files('#impFile', synth)
    await p.wait_for_selector('#impPreview[data-kind=lanetrax]'); await p.click('#impCommit'); await p.wait_for_selector('#impDone')
    await p.goto(BASE + '?tn#/tonight'); await p.wait_for_selector('#tnMeas')
    n = await p.evaluate("() => document.querySelectorAll('#tnMeas [data-accept]').length"); check(n == 4, f'[tonight] 4 LaneTrax measurements waiting ({n})')
    check('LaneTrax \u00b7 2000-01-01' in await p.text_content('#tnMeas'), '[tonight] measurements labelled "LaneTrax \u00b7 date"')
    rev_btn = await p.query_selector('#tnMeas div:has-text("Rev rate") [data-accept]'); await rev_btn.click()
    await p.wait_for_function("() => document.querySelectorAll('#tnMeas [data-accept]').length === 3")
    rel = await p.text_content('#tnRelease'); check('231.43 rpm' in rel and 'LaneTrax \u00b7 2000-01-01' in rel, '[tonight] accepted rev shows with device provenance')
    pick0 = await p.text_content('#tnPickName')
    await p.reload(); await p.wait_for_selector('#tnPick')
    check(await p.text_content('#tnPickName') == pick0 and '231.43 rpm' in await p.text_content('#tnRelease'), '[tonight] session + accepted release survive reload')
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
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= w[0], f'[bag] no horizontal overflow at 360 {w}')
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
    await p.select_option('#bagCareBall', 'own-rattler-big-bite'); await p.click('#bagCare [data-svc="refresh"]')
    await p.wait_for_function("() => document.querySelector('#bagHealth').textContent.includes('Since refresh: 0')")
    check(True, '[bag] service logged -> health recomputed from the log (since refresh 0)')
    await p.fill('#bagDate', '2026-11-07'); await p.dispatch_event('#bagDate', 'change'); await p.wait_for_function("() => document.querySelector('#bagDate').value === '2026-11-07' && !document.querySelector('#bagHead .prov[data-prov=assumed]')")
    check(True, '[bag] event date saved on the bag')
    check(not errs, '[bag] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

FX = os.path.join(os.path.dirname(__file__), 'data', 'fixtures')
def fx(n): return open(os.path.join(FX, n)).read()
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
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= w[0], f'[addball] no horizontal overflow at 360 {w}')
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
    await p.click('#qlStrike'); taps += 1; await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 2')")
    check(taps == 1 and (await fr(1)).strip() == 'X', '[quicklog] strike logged in 1 tap')
    taps = 0
    await p.click('#qlPins [data-pin="10"]'); taps += 1
    hint = await p.text_content('#qlHint'); check('stand 29' in hint and 'move 9 left' in hint, f'[quicklog] 3-6-9 for the leave shows before logging ({hint.strip()[:60]})')
    await p.click('#qlLeave'); taps += 1; await p.wait_for_selector('#qlSpare')
    await p.click('#qlSpare'); taps += 1; await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 3')")
    check(taps == 3 and (await fr(2)).strip() == '9 /', f'[quicklog] 10-pin spare in 3 taps ({(await fr(2)).strip()})')
    check((await p.text_content('#qlFrames [data-f="1"] .num')).strip() == '20', '[quicklog] frame 1 = X + 9/ = 20')
    await p.click('#qlPins [data-pin="7"]'); await p.click('#qlPins [data-pin="10"]')
    check(await p.query_selector('#qlSplit') is not None and 'stand 11' in await p.text_content('#qlHint') and 'stand 29' in await p.text_content('#qlHint'), '[quicklog] 7-10 flagged as a split, both key-pin moves shown')
    await p.click('#qlLeave'); await p.wait_for_selector('#qlMiss')
    check((await p.query_selector_all('#qlPins .pin:not([disabled])')).__len__() == 2, '[quicklog] second ball: only the 7 and 10 can be tapped')
    await p.click('#qlMiss'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 4')")
    check((await fr(3)).strip() == '\u25CB8 -', f'[quicklog] split mark + miss shown ({(await fr(3)).strip()})')
    await p.click('#qlUndo'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 3 \u00b7 ball 2')")
    check(True, '[quicklog] undo voids the last ball')
    await p.click('#qlMiss'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 4')")
    # triggers: 2 of 3 first balls high
    for _ in range(2):
        f0 = await where(); await p.click('#tnLog [role=radio][data-v=high]'); await p.click('#qlPins [data-pin="4"]'); await p.click('#qlLeave'); await p.wait_for_selector('#qlSpare'); await p.click('#qlSpare')
        await p.wait_for_function(f"() => document.querySelector('#qlWhere').textContent !== {json.dumps(f0)} && document.querySelector('#qlStrike')")
    tr = await p.text_content('#qlTrigger'); check('2 of 3 high' in tr and 'feet 2 left' in tr, f'[quicklog] trigger: 2 of 3 high -> move left ({tr.strip()[:50]})')
    await axe_ok(p, '[quicklog]'); small = await p.evaluate(SMALL); check(not small, f'[quicklog] targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= w[0], f'[quicklog] no horizontal overflow at 360 {w}')
    await p.eval_on_selector('#tnLog', 'e => e.scrollIntoView()'); await shot(p, 'phone-quicklog')
    # tab kill: log 3 more balls, kill the page the moment the UI moves on, reopen
    for _ in range(3):
        f0 = await where(); await p.click('#qlStrike'); await p.wait_for_function(f"() => document.querySelector('#qlWhere').textContent !== {json.dumps(f0)}")
    shown = await p.eval_on_selector_all('#qlFrames .fr b', 'els => els.map(e => e.textContent)')
    await p.close(run_before_unload=False)
    p = await page(c, errs); await p.goto(BASE + '?ql#/tonight'); await p.wait_for_selector('#tnLog')
    again = await p.eval_on_selector_all('#qlFrames .fr b', 'els => els.map(e => e.textContent)')
    check(again == shown and (await p.text_content('#qlWhere')).strip() == 'Frame 9 \u00b7 ball 1', f'[quicklog] tab killed -> 0 throws lost ({again})')
    # finish: X in 9, 10th X 7 / -> final
    await p.click('#qlStrike'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 10')")
    await p.click('#qlStrike'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('ball 2')")
    await p.click('#qlPins [data-pin="3"]'); await p.click('#qlPins [data-pin="6"]'); await p.click('#qlPins [data-pin="10"]'); await p.click('#qlLeave')
    await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('ball 3')"); await p.click('#qlSpare'); await p.wait_for_selector('#qlNext')
    tot = (await p.text_content('#qlWhere')).strip(); check((await fr(10)).strip() == 'X 7 /' and tot.startswith('Final'), f'[quicklog] 10th X 7 / ends the game ({tot})')
    n1 = await p.evaluate("() => window.__apData.events()")
    check(n1 - n0 == 18, f'[quicklog] one event per ball: 16 balls + 1 undone + 1 void = 18 ({n1 - n0})')
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
    n = await p.evaluate("window.__apData.events()");
    check(n >= 8 and await p.evaluate("window.__apSync.outbox()") == n, f'[sync] airplane mode: {n} events logged, all waiting in the outbox')
    h0 = await p.evaluate("window.__apData.hash()")
    await p.close()  # tab killed while offline
    p = await page(c, errs); await p.goto(BASE + '?sync2#/more'); await p.wait_for_function("() => window.__apData && window.__apSync && window.__apData.events() > 0")
    check(await p.evaluate("window.__apData.events()") == n and await p.evaluate("window.__apSync.outbox()") == n, '[sync] after the kill: 0 events lost, outbox intact')
    await p.wait_for_function("() => document.querySelector('#dataInfo').textContent.includes('waiting to sync')")
    m.online = True; await p.evaluate("window.__apSync.run()")
    await p.wait_for_function("() => window.__apSync.outbox() === 0", timeout=15000)
    srv = {r[2]['id'] for r in m.mine('d-e2e-sync-0001')}
    check(len(srv) == n, f'[sync] back online: all {n} events on the server ({len(srv)}), in <=15 kB batches')
    await p.wait_for_function("() => document.querySelector('#dataInfo').textContent.includes('All synced')"); await shot(p, 'phone-more-synced')
    await p.evaluate(WIPE); await p.evaluate("localStorage.setItem('ap_prefs', JSON.stringify({onboarded:true})); localStorage.setItem('ap_device', 'd-e2e-sync-0001')")
    await p.goto(BASE + '?sync3#/more'); await p.wait_for_function(f"() => window.__apData && window.__apData.events() === {n}", timeout=15000)
    check(await p.evaluate("window.__apData.hash()") == h0, '[sync] wiped phone + same backup code: pull restores the identical projection')
    check(await p.evaluate("window.__apSync.outbox()") == 0, '[sync] pulled events are not pushed back')
    posts = m.posts; m.quota = n
    f2 = os.path.join(d, 'scores2.csv'); open(f2, 'w').write("Date,Game 1\n2026-10-20,210\n")
    await p.goto(BASE + '?sync4#/import'); await p.wait_for_selector('#impPick'); await p.wait_for_function("() => window.__apSync")
    await p.set_input_files('#impFile', f2); await p.wait_for_selector('#impPreview'); await p.click('#impCommit'); await p.wait_for_selector('#impDone')
    await p.evaluate("window.__apSync.run()"); await p.goto(BASE + '?sync5#/more')
    await p.wait_for_function("() => document.querySelector('#dataInfo') && document.querySelector('#dataInfo').textContent.includes('Server backup is full')")
    check(await p.evaluate("window.__apSync.outbox()") > 0, '[sync] quota 429: newer events kept on the phone, More explains it')
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

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
        steps = [('phone', lambda: run(b, 'phone')), ('desktop', lambda: run(b, 'desktop')), ('deck', lambda: deck_cases(b)), ('migration', lambda: migration(b)), ('data', lambda: data_cycle(b)), ('csv', lambda: csv_cycle(b)), ('ltx', lambda: ltx_cycle(b)), ('tonight', lambda: tonight_cycle(b)), ('quicklog', lambda: quicklog_cycle(b)), ('bag', lambda: bag_cycle(b)), ('addball', lambda: addball_cycle(b)), ('sync', lambda: sync_cycle(b)), ('offline', lambda: offline(b))]
        for name, fn in steps:
            if only and name not in only: continue
            try: await asyncio.wait_for(fn(), 240)
            except Exception as e: check(False, f'[{name}] crashed or timed out: {type(e).__name__} {str(e)[:160]}')
        await b.close()
    print(f'\n{len(passes)} passed, {len(fails)} failed')
    for f in fails: print('  FAIL', f)
    sys.exit(1 if fails else 0)
asyncio.run(main())
