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
    await p.wait_for_function("document.querySelector('#dataInfo').textContent.includes('events on this phone')")
    check('owned balls' in await p.text_content('#dataInfo'), '[data] More shows the data card')
    await shot(p, 'phone-more-data')
    async with p.expect_download() as dl: await p.click('#dlBackup')
    path = await (await dl.value).path(); bk = json.load(open(path))
    check(bk.get('format') == 'backup' and len(bk['events']) == d['n'] and bk.get('sha256'), f"[data] v1 backup has every event ({len(bk['events'])})")
    await p.evaluate(WIPE); await p.goto(BASE + '?wiped#/lane'); await p.wait_for_selector('#ballBtn')
    await p.wait_for_function("window.__apData")
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
    await p.goto(BASE + '?csv#/import'); await p.wait_for_selector('#impPick'); await p.wait_for_function("window.__apData")
    n0 = await p.evaluate("window.__apData.events()")
    await p.set_input_files('#impFile', wide); await p.wait_for_selector('#impPreview[data-kind=csv]')
    txt = await p.text_content('#impPreview')
    check('4 games in 2 sessions' in txt and '1 row skipped' in txt, '[csv] wide shape detected: 4 games, formula cell skipped as a row error')
    check(await p.query_selector('#impWarn li[data-code=BALL_CONFIRM]') is not None and await p.is_disabled('#impCommit'), '[csv] fuzzy "Big Bite" must be confirmed before import')
    check(await p.evaluate("window.__apData.events()") == n0, '[csv] preview persists nothing')
    check(await p.query_selector('#csvRuby') is not None, '[csv] Ruby preset stub shown (needs sample)')
    await p.click('[data-yes="Big Bite"]'); await p.wait_for_function("!document.querySelector('#impCommit').disabled")
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
    await p.select_option('#csvAt', 'release'); await p.wait_for_function("!document.querySelector('#impCommit').disabled")
    check('2 ready' in await p.text_content('#impPreview'), '[csv] semicolon file with decimal comma parsed (2 rows ready)')
    await p.click('#csvSavePreset'); check(await p.evaluate("Object.keys(JSON.parse(localStorage.getItem('ap_import_presets')||'{}')).length") == 1, '[csv] mapping preset saved by header fingerprint')
    check(not errs, '[csv] no page errors ' + ' | '.join(errs[:2]))
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
        steps = [('phone', lambda: run(b, 'phone')), ('desktop', lambda: run(b, 'desktop')), ('deck', lambda: deck_cases(b)), ('migration', lambda: migration(b)), ('data', lambda: data_cycle(b)), ('csv', lambda: csv_cycle(b)), ('offline', lambda: offline(b))]
        for name, fn in steps:
            if only and name not in only: continue
            try: await asyncio.wait_for(fn(), 240)
            except Exception as e: check(False, f'[{name}] crashed or timed out: {type(e).__name__} {str(e)[:160]}')
        await b.close()
    print(f'\n{len(passes)} passed, {len(fails)} failed')
    for f in fails: print('  FAIL', f)
    sys.exit(1 if fails else 0)
asyncio.run(main())
