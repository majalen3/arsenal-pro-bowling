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
def hb(s):   # "10\u00bd" -> 10.5 (bowler half boards, owner aim fix 2026-10-24)
    s = str(s).strip(); return float(s.replace("\u00bd", "")) + (0.5 if s.endswith("\u00bd") else 0)

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
    p.on('pageerror', lambda e: (errs.append(str(e)), print('STACK', (e.stack or '')[:500]) if os.environ.get('E2E_STACK') else None))
    return p

async def qtap(p, sel):
    # Tonight ignores a repeat throw tap within 400 ms (sim bug 2), so scripted throws wait like a real bowler does.
    await p.wait_for_timeout(420); await p.click(sel)

ART = os.environ.get('E2E_ART') or ('/workspace/shots' if os.access('/workspace', os.W_OK) else os.path.join(os.environ.get('RUNNER_TEMP', '/tmp'), 'e2e-art'))   # review screenshots/PDFs; CI has no /workspace
os.makedirs(ART, exist_ok=True)

async def shot(p, name):
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); await p.screenshot(path=os.path.join(SHOTS, name + '.png'))

async def bowl_more(p):
    # IA P1.5: the pad lives on #/bowl; the pick card, reads and setup sit behind its "Bag, lanes and line details" fold.
    await p.wait_for_selector('#tnLog')
    if await p.evaluate("() => { const d = document.querySelector('#tnMore'); if (d && !d.open) { d.open = true; return true; } return false; }"): await p.wait_for_timeout(150)

async def open_folds(p):
    # IA P1.5: Tonight keeps pattern / center / lanes behind "More details" (#tnExtra); Bowl keeps the pick card behind #tnMore.
    await p.wait_for_selector('#tonightBody')
    if await p.evaluate("() => { let n = 0; for (const d of document.querySelectorAll('#tnExtra, #tnMore')) if (!d.open) { d.open = true; n++; } return n; }"): await p.wait_for_timeout(150)

LOAD_SAMPLE = """async () => { const [m, f] = await Promise.all([import('./js/hub.js'), import('./tests/data/fixtures/sample_arsenal.mjs')]);
  await m.ready(); await m.loadStarter(f.sampleEvents, f.SAMPLE_ID); }"""
async def load_sample(p):
    # De-brand 2026-10-31: flows that need a fixed arsenal load the test fixture (same path as the Load example button).
    await p.wait_for_function("() => window.__apData", timeout=15000); await p.evaluate(LOAD_SAMPLE)

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
    await p.click('#tabs a[href="#/results"]'); await p.wait_for_selector('.line-card')
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
    await p.click('#tabs a[href="#/bag"]'); await p.click('#bagView [data-v="all"]'); await p.wait_for_selector('#arsGrid')
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
    check('Mirrored for left hand' in (await p.get_attribute('#lane', 'aria-label')) and 'Mirrored for left hand' in await p.inner_text('#deckMirror'), '[lefty] lane and caption say the view is mirrored')
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
    await p.reload(); await p.wait_for_selector('#deck'); await p.wait_for_timeout(800)   # let the 300 ms saveState debounce land first
    await p.evaluate("localStorage.removeItem('ap_state');localStorage.setItem('ap_profile','{\"hand\":\"right\",\"speed\":15,\"rev\":220}')"); await p.reload(); await p.wait_for_selector('#deck')
    # neutral start ball (de-brand): keep missing right until the model reads light (at most 4 moves)
    for _ in range(4):
        await p.click('[data-miss=right]'); await p.wait_for_timeout(400)
        if 'Light' in (await p.get_attribute('#deck', 'aria-label') or ''): break
    check(await p.get_attribute('#deckCard', 'data-tone') == 'info' and 'Light' in await p.get_attribute('#deck', 'aria-label'), '[deck] light hit coloured as light')
    if SHOTS: await (await p.query_selector('#deckCard')).screenshot(path=os.path.join(SHOTS, 'phone-deck-light.png'))
    for _ in range(16):   # 2-and-1 moves (DECISIONS #26 geometry): keep moving left until the model reads high
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
    await p.goto(BASE + '?d0#/more'); await p.wait_for_function("() => window.__apData && window.__apData.events() >= 2", timeout=30000); await p.wait_for_timeout(400)
    d = await p.evaluate("({backend: window.__apData.backend, boot: window.__apData.bootMs, n: window.__apData.events(), h: window.__apData.hash()})")
    check(d['backend'] == 'indexedDB', f"[data] event log on IndexedDB ({d['backend']}, opened+migrated in {d['boot']} ms after first paint)")
    nown = await p.evaluate("() => Object.keys(window.__apData.projection().owned).length")
    check(d['n'] >= 2 and nown == 0, f"[data] v0 keys migrated; no arsenal is auto-loaded (de-brand) ({d['n']} events, {nown} balls)")
    await p.wait_for_function("() => (document.querySelector('#dataCounts')?.textContent || '').includes('On this phone')")
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
    await load_sample(p); await p.wait_for_selector('#tnStartBowl')
    check(await p.query_selector('#tnPick') is None, '[tonight] P1.5: no first-ball card on Tonight (the start line says it once)')
    await p.click('#tnStartBowl'); await p.wait_for_function("() => location.hash === '#/bowl'"); await bowl_more(p); await p.wait_for_selector('#tnPick')
    # P1.1: Tonight reads THE bag (latest bag.saved). Re-save the starter's 6-ball tournament bag so it is the current one.
    await p.evaluate("""async () => { const h = await import('./js/hub.js'); const b = Object.assign({}, h.proj().bags['bag-tournament']); delete b.id; delete b.ts; await h.add('bag.saved', 'bag-tournament', b); }""")
    await p.evaluate("location.hash = '#/more'"); await p.wait_for_timeout(100); await p.evaluate("location.hash = '#/bowl'"); await bowl_more(p); await p.wait_for_selector('#tnPick')
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
    t = await p.text_content('#tnPickName'); co = await p.text_content('#tnCoach'); st = await p.text_content('#tonightBody [data-alt=Stronger]')
    check('Big Bite' in t and 'new center' in co and 'Super Nova' in st and 'demand 5' in await p.text_content('#tnPick'), f'[tonight] Badger 50 ft heavy -> demand 5; first visit to a center keeps benchmark first, Super Nova is the stronger move ({t.strip()})')
    # LaneTrax measurement -> accept on Tonight
    await p.goto(BASE + '?tn#/import?kind=lanetrax'); await p.wait_for_selector('#impPick'); await p.set_input_files('#impFile', synth)
    await p.wait_for_selector('#impPreview[data-kind=lanetrax]'); await p.click('#impCommit'); await p.wait_for_selector('#impDone')
    await p.goto(BASE + '?tn#/tonight'); await p.wait_for_selector('#tnMeasNudge')
    check('LaneTrax' in await p.text_content('#tnMeasNudge') and await p.get_attribute('#tnMeasNudge', 'href') == '#/card', '[tonight] pending LaneTrax numbers: one quiet link to the Bowler Card (accept lives there)')
    await p.goto(BASE + '?tn#/bowl'); await bowl_more(p); pick0 = await p.text_content('#tnPickName')
    await p.reload(); await bowl_more(p); await p.wait_for_selector('#tnPick')
    check(await p.text_content('#tnPickName') == pick0, '[tonight] session survives reload')
    check(not errs, '[tonight] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def bag_cycle(b):
    # P1.4 3-step builder (wireframe 03): role words, Swap sheet (in my bag + at home, "what changes"), 📌 Always bring,
    # ladder + 10 checks behind a tap, suggest-again from owned only, pack list, care = fold(log).
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.goto(BASE + '?bag#/bowl'); await p.wait_for_selector('#noBag'); await load_sample(p); await bowl_more(p); await p.wait_for_selector('#tnBagLink')
    await p.click('#tnBagLink'); await p.wait_for_selector('#bagRows')
    check(await p.query_selector('#tabs a[href="#/bag"][aria-current=page]') is not None, '[bag] reached from Tonight; the Bag tab is current (IA P2)')
    steps = await p.eval_on_selector_all('#bagBody .card-title', 'e => e.map(x => x.textContent)')
    check(steps[:3] == ['1 \u00b7 Where & lanes', '2 \u00b7 Tonight\u2019s bag', '3 \u00b7 Why not the others? (7)'], f'[bag] three steps in order {steps[:3]}')
    roles = await p.eval_on_selector_all('#bagRows [data-role-label]', 'e => e.map(x => x.textContent)')
    check(roles and roles[0] == 'Start ball' and roles[-1] == 'Spares' and all(r in ('Start ball', 'If it hooks early', 'If it stops hooking', 'For heavy oil', 'Spares', 'Specs to check') for r in roles), f'[bag] roles in bowler words {roles}')
    lines = await p.eval_on_selector_all('#bagRows .bb-row > p.small', 'e => e.map(x => x.textContent.trim())'); check(len(lines) >= len(roles) and all(lines), '[bag] each row has a one-line why')
    check(await p.query_selector('#bagGrid') is None and not await p.eval_on_selector('#bagLadder', 'e => e.open') and not await p.eval_on_selector('#bagChecksD', 'e => e.open'), '[bag] no 5x3 grid; ladder and checks behind a tap')
    n = await p.evaluate("() => document.querySelectorAll('#bagChecks [data-check]').length"); check(n == 10, f'[bag] 10 checks listed ({n})')
    sm = await p.text_content('#bagChecksSum'); wn = await p.evaluate("() => document.querySelectorAll('#bagChecks [data-warn=true]').length")
    check((f'{wn} thing' in sm and 'to check' in sm) if wn else 'Nothing to check' in sm, f'[bag] "N things to check" summary matches ({sm})')
    await axe_ok(p, '[bag]'); await p.wait_for_timeout(200)
    small = await p.evaluate(SMALL); check(not small, f'[bag] targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360 and w[0] == 360, f'[bag] no horizontal overflow at 360 {w}')
    await p.evaluate("() => document.querySelectorAll('.toast').forEach(t => t.remove())"); await shot(p, 'phone-bag')
    taps = 0
    await p.click('#bagRows [data-swap="own-hy-road-pearl"]'); taps += 1; await p.wait_for_selector('#bagSwap')
    sw = await p.eval_on_selector_all('#bagSwap [data-cand]', 'e => e.map(x => [x.dataset.cand, x.textContent])')
    check(all(x[1].strip() for x in sw) and all(('grab from home' in x[1]) == (x[0] in ('own-guru-supreme', 'own-raw-hammer', 'own-green-scout', 'own-rack-attack')) for x in sw) and any(('Stronger' in x[1] or 'Weaker' in x[1] or 'Same' in x[1] or 'TBD' in x[1]) for x in sw), '[bag] Swap sheet: In my bag + At home ("grab from home"), each with what changes')
    await axe_ok(p, '[bag] swap sheet')
    await p.click('#bagSwap [data-cand="own-ordnance-c4"]'); taps += 1
    await p.wait_for_function("() => document.querySelector('#bagRows [data-own=\"own-ordnance-c4\"]') && !document.querySelector('#bagRows [data-own=\"own-hy-road-pearl\"]')")
    check(taps <= 2, f'[bag] swap HRP -> C4 in {taps} taps')
    await p.click('#bagRows [data-pin="own-ordnance-c4"]'); await p.wait_for_function("() => document.querySelector('#bagRows [data-pin=\"own-ordnance-c4\"]').getAttribute('aria-pressed') === 'true'")
    check((await p.text_content('#bagRows [data-pin="own-ordnance-c4"]')).strip() == '\U0001F4CC Always bring', '[bag] pin reads "📌 Always bring"')
    await p.evaluate("() => { document.querySelectorAll('#bagCare, #bagLeft, #bagLeftAll').forEach(d => { d.open = true; }) }")
    await p.click('#bagLeft [data-status-of="own-hy-road-pearl"]'); await p.click('#statusSheet [data-set-status="benched"]')
    await p.wait_for_function("() => (document.querySelector('#bagLeft [data-why-not=\"own-hy-road-pearl\"]') || {}).dataset?.why === 'home'")
    await p.reload(); await p.wait_for_selector('#bagRows [data-pin="own-ordnance-c4"][aria-pressed="true"]')
    check(await p.get_attribute('#bagLeft [data-why-not="own-hy-road-pearl"]', 'data-why') == 'home', '[bag] Always bring + Status persist across reload (events)')
    # pro shop via the care card, then suggest again: In my bag only, pinned kept, At home + pro shop out
    await p.evaluate("() => { document.querySelectorAll('#bagCare, #bagLeft, #bagLeftAll').forEach(d => { d.open = true; }) }"); await p.select_option('#bagCareBall', 'own-guru-supreme'); await p.click('#bagCare [data-v="proShop"]')
    await p.wait_for_function("() => (document.querySelector('#bagLeft [data-why-not=\"own-guru-supreme\"]') || {}).dataset?.why === 'proShop'")
    await p.click('#bagFill'); await p.wait_for_timeout(150)
    if await p.query_selector('#bagApply'): await p.click('#bagApply'); await p.wait_for_timeout(150)
    ids = await p.evaluate("() => [...document.querySelectorAll('#bagRows [data-own]:not([data-role=spare])')].map(x => x.dataset.own)")
    inbag = await p.evaluate("""async () => { const h = await import('./js/hub.js'); const P = h.proj(); return Object.values(P.owned).filter(o => (o.status || 'inBag') === 'inBag').map(o => o.id); }""")
    check(len(ids) == 2 and 'own-ordnance-c4' in ids and 'own-hy-road-pearl' not in ids and 'own-guru-supreme' not in ids and all(i in inbag for i in ids), f'[bag] suggest again (Bring 3): Ready to bring only, pinned kept, At home + pro shop out {ids}')
    pk = await p.text_content('#bagPack'); check('Spare' in pk and 'Ice Storm' in pk and 'level' in pk, '[bag] pack list: role -> ball -> why, spare last')
    check('Rule 18' in await p.text_content('#bagRule18') and 'throws a ball for score' in await p.text_content('#bagRule18'), '[bag] care card states USBC Rule 18 (no surface changes once competition starts)')
    await p.select_option('#bagCareBall', 'own-rattler-big-bite'); await p.click('#bagCare [data-svc="refresh"]')
    await p.wait_for_function("() => document.querySelector('#bagHealth').textContent.includes('Since refresh: 0')")
    check(True, '[bag] service logged -> health recomputed from the log (since refresh 0)')
    await p.evaluate("() => { document.querySelector('#bagMore').open = true; }")
    await p.fill('#bagDate', '2026-11-07'); await p.dispatch_event('#bagDate', 'change'); await p.wait_for_function("() => document.querySelector('#bagDate') && document.querySelector('#bagDate').value === '2026-11-07' && !document.querySelector('#bagHead .prov[data-prov=assumed]')")
    check(True, '[bag] event date saved on the bag')
    check(not errs, '[bag] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def onebag_cycle(b):
    # P1.1: one saved bag. League -> Pack on Tonight -> #/bag shows the same names and count; the ball chip reads it too.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 740})
    await seed(p); await p.goto(BASE + '?ob#/tonight'); await p.wait_for_selector('#noBag'); await load_sample(p); await p.wait_for_selector('#tnAdvisor')
    await p.click('[data-event=league]'); await p.wait_for_selector('#advPack')
    names = await p.eval_on_selector_all('.adv-row .adv-head b', 'e => e.map(x => x.textContent)')
    await p.click('#advPack'); await p.wait_for_selector('#advPackList')
    chip = await p.evaluate("""async () => { const h = await import('./js/hub.js'), S = await import('./js/cc/status.js'); const P = h.proj(), b = S.currentBag(P); return [b.id, S.packedIds(P, b).map(id => S.itemOfOwned(P, id).name)]; }""")
    check(chip[0] == 'bag-tonight' and sorted(chip[1]) == sorted(names), f'[onebag] Pack saves THE bag; ball chip source = the same balls {chip}')
    await p.evaluate("location.hash = '#/bag'"); await p.wait_for_selector('#bagRows')
    got = await p.eval_on_selector_all('#bagRows .adv-head b', 'e => e.map(x => x.textContent)'); cnt = await p.text_content('#bagCount')
    check(len(names) == 3 and got == names and cnt == '3 packed', f'[onebag] #/bag shows the same 3 names and count {got} {cnt!r}')
    await p.click('#bagPackGo'); await p.wait_for_function("() => location.hash === '#/tonight'"); await p.wait_for_selector('#advPack')
    again = await p.eval_on_selector_all('.adv-row .adv-head b', 'e => e.map(x => x.textContent)'); check(again == names and 'Packed' in await p.text_content('#advPack'), f'[onebag] "Pack these 3" -> Tonight shows the same bag {again}')
    check(not errs, f'[onebag] no page errors {errs[:3]}'); await c.close()

async def bagsize_cycle(b):
    # P1.2: "Bring: N" (N counts the spare) is the only bag-size control across Tonight + Bag; defaults; Other takes 7.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 740})
    await seed(p); await p.goto(BASE + '?bs#/tonight'); await p.wait_for_selector('#noBag'); await load_sample(p); await p.wait_for_selector('#tnAdvisor')
    dft = await p.evaluate("async () => { const A = await import('./js/cc/advisor.js'); return Object.fromEntries(Object.entries(A.EVENTS).map(([k, e]) => [k, e.bring])); }")
    check(dft == {'league': 3, 'tournament': 6, 'practice': 3, 'newCenter': 3, 'sport': 6}, f'[bagsize] defaults incl. the spare {dft}')
    await p.click('[data-event=tournament]'); await p.wait_for_function("() => document.querySelectorAll('.adv-row').length === 6")
    t = await p.evaluate("() => [document.querySelectorAll('[data-size-control]').length, document.querySelectorAll('[role=radiogroup][aria-label=Bag], [role=radiogroup][aria-label=Format]').length]")
    check('Bring 6' in await p.text_content('#advBuilder'), '[bagsize] Tonight states Bring 6 for a tournament (no control there)')
    await p.evaluate("location.hash = '#/bag'"); await p.wait_for_selector('#bagRows')
    g = await p.evaluate("() => [document.querySelectorAll('[data-size-control]').length, document.querySelectorAll('[role=radiogroup][aria-label=Bag], [role=radiogroup][aria-label=Format]').length]")
    check(t[0] + g[0] == 1 and t[1] + g[1] == 0, f'[bagsize] exactly 1 size control across Tonight + Bag (tonight {t}, bag {g})')
    await p.click('#bagBring [data-v="other"]'); await p.wait_for_selector('#bagBringN')
    await p.fill('#bagBringN', '7'); await p.dispatch_event('#bagBringN', 'change')
    await p.wait_for_function("async () => { const h = await import('./js/hub.js'), S = await import('./js/cc/status.js'); return (S.currentBag(h.proj()) || {}).bring === 7; }")
    await p.reload(); await p.wait_for_selector('#bagBringN')
    v = await p.input_value('#bagBringN'); oc = await p.get_attribute('#bagBring [data-v="other"]', 'aria-checked')
    check(v == '7' and oc == 'true', f'[bagsize] Other accepts 7 and keeps it ({v}, other={oc})')
    await p.click('#bagBring [data-v="4"]'); await p.wait_for_function("() => document.querySelector('#bagCount').textContent === '4 packed'")
    check(True, '[bagsize] Bring 4 -> 4 packed')
    await axe_ok(p, '[bagsize]'); check(not errs, f'[bagsize] no page errors {errs[:3]}'); await c.close()

async def whynot_cycle(b):
    # P1.4: every owned ball appears once: in the bag or in Left out with a non-empty reason; pro shop / retired get no
    # Bring, only "Change where it is"; [Bring] swaps in; sticky "Pack these N" inside 360x740.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 740})
    await seed(p); await p.goto(BASE + '?wn#/tonight'); await p.wait_for_selector('#noBag'); await load_sample(p); await p.wait_for_selector('#tnAdvisor')
    await p.evaluate("""async () => { const h = await import('./js/hub.js'); await h.add('ownedBall.edited', 'own-ordnance-c4', { fields: { status: 'proShop' } }); await h.add('ownedBall.edited', 'own-raw-hammer', { fields: { status: 'retired' } }); }""")
    await p.evaluate("location.hash = '#/bag'"); await p.wait_for_selector('#bagRows')
    async def tally():
        return await p.evaluate("""async () => { const h = await import('./js/hub.js'); const P = h.proj(), own = Object.values(P.owned);
          const bag = [...document.querySelectorAll('#bagRows [data-own]')].map(x => x.dataset.own), left = [...document.querySelectorAll('#bagLeft [data-why-not]')].map(x => [x.dataset.whyNot, x.dataset.why, x.querySelector('.why-not').textContent.trim()]);
          return { bag, left, owned: own.filter(o => o.status !== 'retired').length, retired: own.filter(o => o.status === 'retired').length, ids: own.map(o => o.id).sort() }; }""")
    t = await tally(); ids = sorted(t['bag'] + [x[0] for x in t['left']])
    check(len(t['bag']) + len(t['left']) == t['owned'] + t['retired'] and ids == t['ids'], f"[whynot] count(bag) {len(t['bag'])} + count(why not) {len(t['left'])} == owned {t['owned']} + retired {t['retired']}; each once")
    check(all(x[1] and x[2] for x in t['left']), '[whynot] every left-out ball has a non-empty reason')
    nb = await p.evaluate("() => ['own-ordnance-c4', 'own-raw-hammer'].map(id => [!!document.querySelector(`#bagLeft [data-bring=\"${id}\"]`), (document.querySelector(`#bagLeft [data-status-of=\"${id}\"]`) || {}).textContent || ''])")
    check(all((not x[0]) and 'Change where it is' in x[1] for x in nb), f'[whynot] pro shop + retired: no Bring, only "Change where it is" {nb}')
    check(await p.query_selector('#bagLeftAll') is not None, '[whynot] "Show all" when more than 4 are left out')
    bb = await p.evaluate("() => { const r = document.querySelector('#bagPackGo').getBoundingClientRect(); return [r.top, r.bottom, innerHeight]; }")
    check(bb[0] >= 0 and bb[1] <= 740, f'[whynot] sticky "Pack these N" inside 360x740 {bb}')
    await p.evaluate("() => window.scrollTo(0, document.body.scrollHeight)"); await p.wait_for_timeout(100)
    bb2 = await p.evaluate("() => { const r = document.querySelector('#bagPackGo').getBoundingClientRect(); return [r.top, r.bottom]; }"); check(bb2[0] >= 0 and bb2[1] <= 740, f'[whynot] Pack still inside 740 after scrolling {bb2}')
    await p.evaluate("() => { window.scrollTo(0, 0); document.querySelectorAll('#bagCare, #bagLeft, #bagLeftAll').forEach(d => { d.open = true; }) }")
    await p.click('#bagLeft [data-bring="own-guru-supreme"]')
    await p.wait_for_selector('#bagRows [data-own="own-guru-supreme"]')
    # Live eval 2026-11-10: Bring is additive (it used to swap a ball out, once the only one with specs); the bag grows by one.
    t2 = await tally(); check(len(t2['bag']) == len(t['bag']) + 1 and set(t['bag']) <= set(t2['bag']) and len(t2['bag']) + len(t2['left']) == len(t['ids']), f"[whynot] [Bring] adds without dropping a packed ball (bag {len(t['bag'])} -> {len(t2['bag'])})")
    check('grab from home' in await p.text_content('#bagRows [data-own="own-guru-supreme"]'), '[whynot] an At home ball brought in is tagged "grab from home"')
    await axe_ok(p, '[whynot]'); small = await p.evaluate(SMALL); check(not small, f'[whynot] targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360, f'[whynot] no horizontal overflow {w}')
    await p.click('#bagPackGo'); await p.wait_for_function("() => location.hash === '#/tonight'"); await p.click('[data-event=league]'); await p.wait_for_selector('.adv-row[data-owned="own-guru-supreme"]')
    check(True, '[whynot] Pack these N -> Tonight shows the packed bag (Guru in)')
    check(not errs, f'[whynot] no page errors {errs[:3]}'); await c.close()

async def gametotal_cycle(b):
    # Item 2: "Add a game total" (score only) lives on the night (Session) view, in More and in team setup; not on Tonight.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 740})
    await seed(p); await p.goto(BASE + '?gt#/tonight'); await p.wait_for_selector('#noBag'); await load_sample(p); await p.wait_for_selector('#tnAdvisor')
    check('Quick-log a game' not in await p.text_content('#tonightBody') and await p.query_selector('#tonightBody #moreAddTotal, #tonightBody #sessAddTotal') is None, '[gametotal] no quick game log on the Tonight front page')
    await p.evaluate("location.hash = '#/more'"); await p.wait_for_selector('#moreAddTotal')
    await p.click('#moreAddTotal'); await p.wait_for_selector('#gameTotal #gtScore')
    check(await p.input_value('#gtGame') == '1', '[gametotal] first total of a new night defaults to game 1')
    await axe_ok(p, '[gametotal] sheet'); small = await p.evaluate(SMALL); check(not small, f'[gametotal] sheet targets >= 44px {small[:6]}')
    n0 = await p.evaluate("async () => (await import('./js/hub.js')).proj().scores.length")
    await p.fill('#gtScore', '301'); await p.click('#gtSave'); await p.wait_for_timeout(150)
    n1 = await p.evaluate("async () => (await import('./js/hub.js')).proj().scores.length")
    check(n1 == n0 and await p.query_selector('#gameTotal') is not None and '0 to 300' in await p.text_content('#toast'), '[gametotal] 301 rejected, nothing saved')
    await p.fill('#gtScore', '187'); await p.select_option('#gtBall', 'own-rattler-big-bite'); await p.click('#gtSave')
    await p.wait_for_function("() => location.hash.startsWith('#/session/night-')"); await p.wait_for_selector('#sessGames')
    check('187' in await p.text_content('#sessGames'), '[gametotal] More -> total saved on tonight\'s night and shown on its Session view')
    ev = await p.evaluate("async () => { const h = await import('./js/hub.js'); const x = h.proj().scores.at(-1); return [x.score, x.game, x.ballId, x.sessionId]; }")
    check(ev[0] == 187 and ev[1] == 1 and ev[2] == 'own-rattler-big-bite' and ev[3].startswith('night-'), f'[gametotal] one game.logged event, the bowler\'s own number {ev}')
    bb = await p.evaluate("() => { const r = document.querySelector('#sessAddTotal').getBoundingClientRect(); return [r.top, r.bottom]; }")
    check(bb[1] <= 740, f'[gametotal] "Add a game total" one tap from the night view, in the first viewport {bb}')
    await p.click('#sessAddTotal'); await p.wait_for_selector('#gameTotal #gtScore')
    check(await p.input_value('#gtGame') == '2', '[gametotal] next total defaults to game 2')
    await p.fill('#gtGame', '1'); await p.fill('#gtScore', '200'); await p.click('#gtSave'); await p.wait_for_timeout(150)
    check(await p.query_selector('#gameTotal') is not None and 'already has a score' in await p.text_content('#toast'), '[gametotal] game 1 already scored -> blocked, no duplicate')
    await p.fill('#gtGame', '2'); await p.fill('#gtScore', '201'); await p.click('#gtSave'); await p.wait_for_function("() => document.querySelector('#sessGames') && document.querySelector('#sessGames').textContent.includes('201')")
    check('388' in await p.text_content('#sessGames'), '[gametotal] series 388 from the two totals')
    await axe_ok(p, '[gametotal] session'); w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360, f'[gametotal] no horizontal overflow {w}')
    await p.evaluate("location.hash = '#/tonight'"); await open_folds(p); await p.wait_for_selector('#tnSetup')
    await p.click('#tnSetup [aria-label="Scoring"] [data-v="league"]'); await p.wait_for_selector('#tnTeam'); await p.evaluate("() => { document.querySelector('#tnTeam').open = true; }")
    await p.evaluate("() => { document.querySelector('#tnTeam').open = true; }")
    check(await p.is_visible('#lgAddTotal') and 'final score' in await p.text_content('#lgTotalWhy'), '[gametotal] offered in team setup')
    check(not errs, f'[gametotal] no page errors {errs[:3]}'); await c.close()

async def export_cycle(b):
    # Item E: Export my arsenal from Arsenal and More > Your data: printable Arsenal sheet (window.print, @media print,
    # Letter/A4), the bag share card (PNG), the arsenal CSV and the full backup. Only data on file; games only where logged.
    import tempfile, json as _j, subprocess, struct, shutil
    errs = []; c = await ctx_for(b, 'phone', accept_downloads=True); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 740})
    await c.add_init_script("navigator.canShare = undefined; window.__printed = 0; window.print = () => { window.__printed++; };")
    await seed(p); await p.goto(BASE + '?ex#/tonight'); await p.wait_for_selector('#noBag'); await load_sample(p); await p.wait_for_selector('#tnAdvisor')
    await p.click('[data-event=league]'); await p.wait_for_selector('#advPack'); await p.click('#advPack'); await p.wait_for_selector('#advPackList')
    info = await p.evaluate("""async () => { const m = await import('./js/hub.js'), S = await import('./js/cc/status.js'); const P = m.proj(), bag = S.packedIds(P, S.currentBag(P));
      const id = bag[0], other = Object.keys(P.owned).find(x => !bag.includes(x)); let n = 0;
      const game = async (sid, g, strikes) => { for (let f = 1; f <= 10; f++) { if (f <= strikes) await m.add('shot.logged', 'test-ex-' + n++, { sessionId: sid, game: g, frame: f, roll: 1, down: 10, leave: [], ballId: id });
          else { await m.add('shot.logged', 'test-ex-' + n++, { sessionId: sid, game: g, frame: f, roll: 1, down: 9, leave: [10], ballId: id }); await m.add('shot.logged', 'test-ex-' + n++, { sessionId: sid, game: g, frame: f, roll: 2, down: 1, leave: [], ballId: id }); } }
        if (strikes >= 10) for (const r of [2, 3]) await m.add('shot.logged', 'test-ex-' + n++, { sessionId: sid, game: g, frame: 10, roll: r, down: 10, leave: [], ballId: id });
        else await m.add('shot.logged', 'test-ex-' + n++, { sessionId: sid, game: g, frame: 10, roll: 3, down: 10, leave: [], ballId: id }); };
      await m.add('session.created', 'test-ex-s1', { kind: 'tonight', date: '2026-10-20', ended: true }); await game('test-ex-s1', 1, 10); await game('test-ex-s1', 2, 5);
      await m.add('ownedBall.edited', other, { fields: { status: 'retired' } });
      const Q = m.proj(); return { bag, id, other, name: S.itemOfOwned(Q, id).name, games: Q.games.filter(g => g.complete).map(g => g.score), n: Object.keys(Q.owned).length }; }""")
    await p.evaluate("const q = JSON.parse(localStorage.getItem('ap_profile') || '{}'); localStorage.setItem('ap_profile', JSON.stringify(Object.assign(q, {hand:'right', speed:15.5, rev:310, pap:'4 3/4 x 1/2 up', entered:Object.assign(q.entered || {}, {hand:true, speed:true, rev:true})})))")
    await p.goto(BASE + '?ex2#/arsenal'); await p.wait_for_selector('#arsExport')
    await p.click('#arsExport'); await p.wait_for_selector('#expSheet')
    opts = await p.eval_on_selector_all('#expSheet .exp-opt', 'e => e.map(x => x.id)')
    check([o for o in opts if o != 'expOld'] == ['expSheetBtn', 'expCard', 'expCsv', 'expBackup'], f'[export] Arsenal > Export offers sheet, card, CSV, backup (+ Old Friends card when a ball is retired) {opts}')
    small = await p.evaluate(SMALL); check(not small, f'[export] options >= 44px {small[:6]}'); await axe_ok(p, '[export] options sheet'); await p.screenshot(path=ART + '/itemE-export-options.png')
    async with p.expect_download() as dl: await p.click('#expCsv')
    d = await dl.value; f = os.path.join(tempfile.mkdtemp(), d.suggested_filename); await d.save_as(f); csv = open(f, encoding='utf-8-sig').read().splitlines()
    check(csv[0].startswith('status,in_tonights_bag,name,brand,cover,surface,core,rg,diff,role,games') and len(csv) == info['n'] + 1, f'[export] CSV: header + one row per ball ({len(csv) - 1} of {info["n"]})')
    row = next((l for l in csv if info['name'] in l), ''); check(',yes,' in row and ',2,2,' in row, f'[export] CSV marks the bag and the logged games for {info["name"]}: {row[:160]!r}')
    check(any(l.startswith('Retired,') for l in csv), '[export] CSV groups by Status (Retired row present)')
    async with p.expect_download() as dl: await p.click('#expBackup')
    d = await dl.value; f = os.path.join(tempfile.mkdtemp(), d.suggested_filename); await d.save_as(f); bk = _j.load(open(f))
    check(bk.get('format') == 'backup' and len(bk.get('events', [])) > 20, f'[export] full backup re-uses the backup file ({d.suggested_filename}, {len(bk.get("events", []))} events)')
    async with p.expect_download() as dl: await p.click('#expCard')
    d = await dl.value; card = ART + '/itemE-share-card.png'; await d.save_as(card)
    w, hgt = struct.unpack('>II', open(card, 'rb').read()[16:24]); check(d.suggested_filename.endswith('.png') and (w, hgt) == (1080, 1350), f'[export] bag card PNG 1080x1350 downloaded when sharing files is not offered ({d.suggested_filename} {w}x{hgt})')
    shared = await p.evaluate("""async () => { const X = await import('./js/screens/export.js'); let got = null; navigator.canShare = o => !!(o.files && o.files.length); const s0 = navigator.share;
      navigator.share = async o => { got = o.files.map(f => [f.name, f.type, f.size]); }; const r = await X.shareCard(); navigator.share = s0; navigator.canShare = undefined; return [r, got]; }""")
    check(shared[0] == 'shared' and shared[1] and shared[1][0][1] == 'image/png' and shared[1][0][2] > 10000, f'[export] bag card goes to navigator.share with the PNG file when offered {shared}')
    await p.click('#expSheetBtn'); await p.wait_for_selector('#arsSheet')
    t = await p.text_content('#arsSheet')
    check('ARSENAL PRO' in t.upper() and 'Urbanek' not in t and 'Right-handed' in t and '15.5 mph' in t and '310 rpm' in t and '4 3/4 x 1/2 up' in t, '[export] sheet header: team, hand, speed, rev, PAP (entered)')
    groups = await p.eval_on_selector_all('#arsSheet .ps-group', 'e => e.map(x => x.dataset.group)')
    check(groups[0] == 'inBag' and 'retired' in groups, f'[export] balls grouped by Status {groups}')
    hl = await p.eval_on_selector_all('#arsSheet tr.bag', 'e => e.length'); bagli = await p.eval_on_selector_all('#psBag li', 'e => e.length')
    check(hl == len(info['bag']) == bagli, f'[export] tonight\'s bag highlighted ({hl} rows, {bagli} listed, {len(info["bag"])} packed)')
    avg = round(sum(info['games']) / len(info['games'])) if info['games'] else None
    rowt = await p.text_content(f'#arsSheet tr[data-own="{info["id"]}"]')
    check(avg is not None and f'{avg} (n 2)' in rowt, f'[export] games and average only where logged, with n ({rowt!r}, avg {avg})')
    blank = await p.evaluate(f"""() => [...document.querySelectorAll('#arsSheet tr[data-own]')].filter(r => r.dataset.own !== {_j.dumps(info['id'])}).every(r => !r.children[7].textContent && !r.children[8].textContent)""")
    check(blank, '[export] no games/average for balls without logged games')
    hof = await p.text_content('#psHof'); check('retired' in hof and '300 game' in hof, f'[export] Old Friends and earned milestones {hof[:120]!r}')
    foot = await p.text_content('#psFoot'); check('manufacturer' in foot and 'logged with frames' in foot, '[export] provenance footer')
    ov = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(ov[1] <= ov[0], f'[export] sheet preview does not scroll the page sideways {ov}')
    await p.click('#psPrint'); check(await p.evaluate('window.__printed') == 1, '[export] Print or PDF calls window.print()')
    small = await p.evaluate(SMALL); check(not small, f'[export] sheet screen targets >= 44px {small[:6]}'); await axe_ok(p, '[export] arsenal sheet')
    await p.evaluate('scrollTo(0, 0)'); await p.wait_for_timeout(300); await p.screenshot(path=ART + '/itemE-sheet-phone.png'); await shot(p, 'phone-export-sheet')
    await p.emulate_media(media='print')
    hidden = await p.evaluate("() => ['#tabs', '.appbar', '.ps-hint'].map(s => { const e = document.querySelector(s); return !e || getComputedStyle(e).display === 'none'; })")
    check(all(hidden), f'[export] print hides the tab bar, app bar and hint {hidden}')
    for fmt in ['Letter', 'A4']:
        pdf = f'{ART}/itemE-arsenal-sheet-{fmt}.pdf'; await p.pdf(path=pdf, format=fmt, print_background=True, prefer_css_page_size=False)
        if not shutil.which('pdfinfo'): check(os.path.getsize(pdf) > 20000, f'[export] {fmt} PDF written (poppler not installed; page check skipped)'); continue
        out = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout; pages = int(re.search(r'Pages:\s+(\d+)', out).group(1))
        txt = subprocess.run(['pdftotext', '-layout', pdf, '-'], capture_output=True, text=True).stdout.lower()
        check(1 <= pages <= 3 and 'arsenal sheet' in txt and 'tonight' in txt and 'retired' in txt, f'[export] {fmt} PDF: {pages} page(s), sheet text present')
        subprocess.run(['pdftoppm', '-png', '-r', '110', '-f', '1', '-l', '1', pdf, pdf[:-4]], check=False)
    await p.emulate_media(media='screen')
    await p.evaluate("location.hash = '#/more'"); await p.wait_for_selector('#moreExport'); await p.click('#moreExport'); await p.wait_for_selector('#expSheet')
    check(await p.is_visible('#expSheetBtn'), '[export] More > Your data > Export my arsenal opens the same options')
    check(not errs, f'[export] no page errors {errs[:3]}'); await c.close()

async def corner_cycle(b):
    # Item 3: corner pin left alone (flat/ring 10; 7 for LH). Only with enough first balls, always n of N, counts labelled
    # "from your frames", coaching options labelled and sourced, nothing on the scoring pad.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 740})
    await seed(p); await p.goto(BASE + '?co#/tonight'); await p.wait_for_selector('#noBag'); await load_sample(p); await p.wait_for_selector('#tnAdvisor')
    await p.evaluate("""async () => { const m = await import('./js/hub.js'); let n = 0;
      const night = async (id, d, tens) => { await m.add('session.created', id, { kind: 'tonight', date: d, ended: true });
        for (let f = 1; f <= 10; f++) { const ten = f <= tens;
          if (ten) { await m.add('shot.logged', 'test-co-' + n++, { sessionId: id, game: 1, frame: f, roll: 1, down: 9, leave: [10], miss: f <= 2 ? 'pocket' : null }); await m.add('shot.logged', 'test-co-' + n++, { sessionId: id, game: 1, frame: f, roll: 2, down: 1, leave: [] }); }
          else await m.add('shot.logged', 'test-co-' + n++, { sessionId: id, game: 1, frame: f, roll: 1, down: 10, leave: [] }); }
        for (const r of [2, 3]) await m.add('shot.logged', 'test-co-' + n++, { sessionId: id, game: 1, frame: 10, roll: r, down: 10, leave: [] }); };
      await night('test-co-1', '2026-10-03', 2); await night('test-co-2', '2026-10-10', 4); await night('test-co-3', '2026-10-17', 4); await night('test-co-4', '2026-10-21', 4); }""")
    await p.evaluate("location.hash = '#/session/test-co-1'"); await p.wait_for_selector('#sessRecap')
    check(await p.query_selector('#sessCorner') is None, '[corner] 2 corner leaves on 12 first balls: not enough, nothing shown')
    await p.evaluate("location.hash = '#/session/test-co-4'"); await p.wait_for_selector('#sessCorner')
    lead = await p.text_content('#sessCornerLead')
    check('10 pin alone on 4 of 12 first balls' in lead and 'From your frames' in lead, f'[corner] recap names the leave with n of N, labelled real {lead!r}')
    await p.click('#sessCornerMore summary'); await p.wait_for_timeout(100)
    more = await p.text_content('#sessCornerMore'); opts = await p.eval_on_selector_all('#sessCornerOpts li', 'e => e.length')
    check(1 <= opts <= 3 and 'not a measurement' in more and "can't see which" in more and '%' not in more, f'[corner] 1-3 labelled options, flat vs ring not claimed, no percentages ({opts})')
    hrefs = await p.eval_on_selector_all('#sessCornerMore a', 'e => e.map(a => a.href)')
    check('https://bowl.com/adjusting-entry-angle' in hrefs, f'[corner] sources linked {hrefs}')
    await axe_ok(p, '[corner] recap'); small = await p.evaluate(SMALL); check(not small, f'[corner] targets >= 44px {small[:6]}')
    # C2 (clutter audit): 12 first balls is a small sample -> counts, no %-point change in the recap or the Compared table
    rc = await p.text_content('#sessRecap'); cmp = await p.evaluate("() => { const r = document.querySelector('#sessCmp tr[data-k=strikePct]'); return r ? [...r.cells].map(c => c.textContent) : null; }")
    check('points from last session' not in rc and cmp is not None and cmp[1] == '8 of 12' and cmp[2] == '\u2014' and await p.query_selector('#sessCmpNote') is not None, f'[corner] C2 small sample: counts, no deltas {cmp}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360, f'[corner] no horizontal overflow {w}')
    await p.evaluate("() => { const t = document.querySelector('#toast'); if (t) t.style.visibility = 'hidden'; document.querySelector('#sessRecap').scrollIntoView({ block: 'start' }); }")
    await p.screenshot(path=ART + '/item3-recap-flat10.png'); await shot(p, 'phone-corner-recap')
    await p.evaluate("location.hash = '#/arsenal/insights'"); await p.wait_for_selector('#insCorner')
    ins = await p.text_content('#insCornerLead')
    check('10 pin alone on 14 of 48 first balls' in ins, f'[corner] Insights: all scored games, n of N {ins!r}')
    await axe_ok(p, '[corner] insights')
    await p.evaluate("location.hash = '#/tonight'"); await p.wait_for_selector('#tnAdvisor')
    check(await p.query_selector('#tonightBody .corner-ins') is None, '[corner] nothing on the scoring screen')
    check(not errs, f'[corner] no page errors {errs[:3]}'); await c.close()

FX = os.path.join(os.path.dirname(__file__), 'data', 'fixtures')
def fx(n): return open(os.path.join(FX, n)).read()
async def targeting_cycle(b):
    # Targeting: feet/eyes -> unchanged engine path -> break box + pocket call; missed high -> one cited move, engine-verified, 1 tap;
    # save as my line -> back to saved; walkthrough dismiss/replay; lefty mirror; axe, 44 px, 360 px.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.goto(BASE + '?tg#/bowl'); await p.wait_for_selector('#noBag'); await load_sample(p); await bowl_more(p); await p.wait_for_selector('#tnFind')
    await p.click('#tnFind'); await p.wait_for_selector('#tgFindCard')
    check('#/target' in p.url and 'Big Bite' in await p.eval_on_selector('#tgBall', 'e => e.selectedOptions[0].textContent'), '[target] Tonight "Find my strike line" opens Targeting with tonight\'s ball and runs Find')
    await p.goto(BASE + '?tg#/target'); await p.wait_for_selector('#tgTour')
    check(await p.query_selector('#tabs [aria-current=page]') is None and await p.is_visible('#tabs'), '[target] a tool: no tab of its own, tab bar still there (IA P2)')
    await p.evaluate("() => document.querySelectorAll('.toast').forEach(t => t.remove())"); await shot(p, 'phone-target-walkthrough')
    await axe_ok(p, '[target] walkthrough')
    # C10 (clutter audit): the 1-of-3 card shows on the first visit only, even when it was not dismissed
    await p.reload(); await p.wait_for_selector('#tgCoach'); await p.wait_for_timeout(300)
    check(await p.query_selector('#tgTour') is None, '[target] C10 walkthrough on first visit only (not repeated when left open)')
    await p.click('#tgHelp'); await p.wait_for_selector('#tgTour')
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
    check(await p.text_content('#tgFeetVal') == '25' and await p.text_content('#tgEyesVal') == '17\u00bd', '[target] one tap applies the move (feet 25, eyes 17.7 shown as 17\u00bd) and re-runs')
    await p.click('#tgBack'); await p.wait_for_timeout(250)
    check(await p.text_content('#tgFeetVal') == '17' and await p.text_content('#tgEyesVal') == '10\u00bd', '[target] back to saved line restores feet/eyes')
    # dots mode keeps the same line
    await p.click('.tg-mode [data-v=dots]'); await p.wait_for_timeout(200)
    check(await p.text_content('#tgEyesVal') == '10\u00bd' and (await p.text_content('#tgCall')).startswith('Pocket'), f'[target] dots (7.5 ft) aim converts on the same straight line [{await p.text_content("#tgEyesVal")}]')
    await p.click('.tg-mode [data-v=arrows]')
    # Find my strike line from Tonight: stand / aim / Pocket % with basis, apply -> lane + box; phone-speed budget
    cdp = None
    try: cdp = await c.new_cdp_session(p); await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
    except Exception: cdp = None
    await p.goto(BASE + '?tg#/bowl'); await bowl_more(p); await p.wait_for_selector('#tnFind'); await p.click('#tnFind'); await p.wait_for_selector('#tgFindLine', timeout=15000)
    fl = (await p.text_content('#tgFindLine')).strip(); ms = int(await p.get_attribute('#tgFindOut', 'data-ms') or 99999)
    if cdp: await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
    check('find=1' in p.url and re.match(r'^(Your starting line with [^(]+ \(same as Tonight\)|Model starting line with [^(]+ \(Tonight shows your own line\)): stand \d+, aim [\d.\u00bd]+ at the arrows\. Pocket \d+% \(model estimate, assumed accuracy \u00b11\.5 bds, no LaneTrax import; 200 simulated shots\)\.$', fl) is not None, f'[find] Tonight -> stand, aim, Pocket % with basis + n [{fl}]')
    check(ms < 1500, f'[find] search under 1.5 s at 4x CPU throttle ({ms} ms{"" if cdp else ", no throttle"})')
    allf = await p.text_content('#tgFindCard'); check('strike' not in fl.lower() and 'No strike % shown' in allf and 'Not higher' in allf or 'High because' in allf, '[find] no strike %, says why; why-lower/higher note')
    check('17\u201318' in allf and 'nationalbowlingacademy.com' in (await p.inner_html('#tgFindInputs')) and 'not a guarantee' in allf, '[find] window + source + inputs + "not a guarantee"')
    alt = await p.query_selector('#tgFindAlt'); check(alt is None or (await alt.text_content()).startswith('Higher model pocket %'), '[find] sim2 #1: headline is the starting line; a search line shows only when >3 points higher, labelled')
    await p.evaluate("() => document.querySelectorAll('.toast').forEach(t => t.remove())"); await p.evaluate("() => window.scrollTo(0, 0)"); await shot(p, 'phone-target-find')
    await axe_ok(p, '[find] result')
    m = re.search(r'stand (\d+), aim ([\d.\u00bd]+)', fl); await p.click('#tgFindApply'); await p.wait_for_timeout(300)
    fv, ev = await p.text_content('#tgFeetVal'), await p.text_content('#tgEyesVal')
    check(fv == m.group(1) and hb(ev) == hb(m.group(2)), f'[find] one tap applies stand/aim to the lane ({fv}/{ev})')
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
    await seed(p); await p.goto(BASE + '?ab#/bowl'); await p.wait_for_selector('#noBag'); await load_sample(p); await bowl_more(p); await p.wait_for_selector('#tnBagLink')
    await p.goto(BASE + '?ab#/arsenal'); await p.click('#arsAdd'); await p.wait_for_selector('#abQ')
    check(await p.query_selector('#tabs a[href="#/bag"][aria-current=page]') is not None, '[addball] reached from Bag (Add ball); Bag tab current')
    taps = 0
    await p.fill('#abQ', 'Storm Zephyr Test'); await p.wait_for_selector('#abNoMatch')
    check(await p.get_attribute('#abMaker', 'disabled') is None, '[addball] not in catalogue -> maker lookup offered (brand detected)')
    # 2026-11-10: Phaze II is now a maker-sourced catalogue row; pick it, then the maker lookup runs as for any catalogue ball.
    await p.fill('#abQ', 'Storm Phaze II'); await p.wait_for_selector('#abList [data-pick="sc-storm-phaze-ii"]')
    await p.click('#abList [data-pick="sc-storm-phaze-ii"]'); taps += 1; await p.wait_for_selector('#abConfirm'); await p.wait_for_selector('#abStatus[data-state=found]')
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
    await p.click('#abSave'); taps += 1; await p.wait_for_selector('#bagRows')
    check(taps <= 4, f'[addball] type + {taps} taps to a saved ball')
    n = await p.evaluate("() => [...document.querySelectorAll('#bagBody [data-ball]')].filter(x => window.__apData.projection().owned[x.dataset.ball]?.catalogId === 'add-storm-phaze-ii').length")
    check(n == 1, f'[addball] saved as an owned (benched) ball; Bag lists it ({n})')
    await p.reload(); await p.wait_for_selector('#bagRows')
    n = await p.evaluate("() => [...document.querySelectorAll('#bagBody [data-ball]')].filter(x => window.__apData.projection().owned[x.dataset.ball]?.catalogId === 'add-storm-phaze-ii').length"); check(n == 1, '[addball] persists across reload (ownedBall.created event)')
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
    mode['off'] = True; await p.fill('#abQ', 'Hammer Reckoning'); await p.click('#abList [data-pick="sc-hammer-reckoning"]'); await p.wait_for_selector('#abRetry')
    check('hammerbowling.com spec' in await p.text_content('#abFields [data-f=rg]') and 'hammerbowling.com' in await p.text_content('#abSource') and "Can\u2019t reach the maker list offline. Type the name and specs." in await p.text_content('#abStatus'), '[addball] lookup fails: catalogue values with the maker chip + Source link + Retry + the offline line')
    check(await p.query_selector('#abType') is None, '[addball] catalogue ball with every spec: no "Type the specs" card')
    # Airplane mode (navigator.onLine false): say it before any lookup, then a typed ball reaches the engine and saves
    mode['off'] = False; n_calls = len(calls); await c.set_offline(True)
    await p.fill('#abQ', 'Storm Zz Testball'); await p.wait_for_selector('#abOffline')
    check(await p.text_content('#abOffline') == "Can\u2019t reach the maker list offline. Type the name and specs.", '[addball] offline: the maker-list line shows on the search')
    await p.click('#abMaker'); await p.wait_for_selector('#abType')
    check(len(calls) == n_calls, '[addball] offline: no lookup request is sent')
    check('offline' in await p.text_content('#abStatus') and await p.query_selector('#abNoEngine') is not None, '[addball] offline: typed ball starts spec TBD, no engine run')
    await p.fill('#abType-rg', '3.10'); await p.press('#abType-rg', 'Tab'); await p.wait_for_timeout(200)
    check('spec TBD' in await p.text_content('#abFields [data-f=rg]'), '[addball] RG outside the USBC range is refused')
    await p.fill('#abType-rg', '2.51'); await p.press('#abType-rg', 'Tab'); await p.wait_for_selector('#abType-diff')
    await p.fill('#abType-diff', '0.048'); await p.press('#abType-diff', 'Tab'); await p.wait_for_timeout(150)
    await p.click('#abType [aria-label="Cover type"] [data-v="Solid"]'); await p.click('#abType [aria-label="Core symmetry"] [data-v="Asymmetric"]')
    await p.wait_for_selector('#abTable')
    rg = await p.text_content('#abFields [data-f=rg]'); check('2.510' in rg and 'you' in rg, f'[addball] typed RG shows with the "you" chip [{rg}]')
    check(await p.input_value('#abType-rg') == '2.51' and await p.get_attribute('#abType [data-v="Solid"]', 'aria-checked') == 'true', '[addball] typed values stay on the card to correct')
    check(await p.query_selector('#abNoEngine') is None, '[addball] all four typed: the engine card runs')
    await axe_ok(p, '[addball] offline typed'); small = await p.evaluate(SMALL); check(not small, f'[addball] offline targets >= 44px {small[:6]}')
    await shot(p, 'phone-addball-offline')
    await p.click('#abSave'); await p.wait_for_selector('#bagBody')
    o = await p.evaluate("() => Object.values(window.__apData.projection().owned).find(x => /Testball/.test(x.name || ''))")
    check(o is not None, '[addball] offline: typed ball saved (queued)')
    await c.set_offline(False)
    check(not errs, '[addball] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def quicklog_cycle(b):
    # CC1: strike = 1 tap, one-pin spare = 3 taps, splits flagged with 3-6-9 per leave, triggers, undo, 10th frame,
    # and 0 throws lost when the tab is killed right after the screen moves on (IndexedDB).
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.goto(BASE + '?ql#/bowl'); await p.wait_for_selector('#noBag'); await load_sample(p); await bowl_more(p); await p.wait_for_selector('#tnLog')
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
    def __init__(self): self.rows, self.seq, self.online, self.quota, self.posts, self.users, self.tokens, self.authlog = [], 0, True, 5000, 0, {}, {}, []
    def mine(self, dev): return [r for r in self.rows if r[0] == dev]
    async def handle(self, route):
        req = route.request
        if not self.online: return await route.abort('internetdisconnected')
        from urllib.parse import urlparse, parse_qs
        u = urlparse(req.url); dev = req.headers.get('x-device-id'); auth = req.headers.get('authorization'); hdr = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Device-Id, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS', 'Access-Control-Expose-Headers': 'Retry-After'}
        if req.method == 'OPTIONS': return await route.fulfill(status=204, headers=hdr)
        def js(st, body): return route.fulfill(status=st, headers=hdr, content_type='application/json', body=json.dumps(body))
        # Accounts (2026-10-31): same contract as arsenal-pro-api's /api/auth/* and /api/account*; events under 'u:<id>'.
        if u.path.startswith('/api/auth/') or u.path.startswith('/api/account'):
            body = json.loads(req.post_data or '{}') if req.method != 'GET' else {}
            def issue(i): t = f'tok{len(self.tokens) + 1}'; self.tokens[t] = i; return {'token': t, 'expiresAt': '2099-01-01T00:00:00.000Z', 'user': {'id': i, 'email': self.users[i]['email']}}
            if u.path == '/api/auth/signup':
                if any(x['email'] == body.get('email') for x in self.users.values()): return await js(409, {'error': 'An account with that email already exists. Sign in instead.'})
                i = f'user{len(self.users) + 1}'; self.users[i] = {'email': body['email'], 'password': body['password']}; return await js(201, dict(issue(i), recoveryKey=f'RKEY-{i}-0000'))
            if u.path == '/api/auth/login':
                i = next((k for k, x in self.users.items() if x['email'] == body.get('email') and x['password'] == body.get('password')), None)
                return await js(200, issue(i)) if i else await js(401, {'error': 'Email or password is wrong.'})
            i = self.tokens.get((auth or '').replace('Bearer ', '')); self.authlog.append((req.method, u.path, bool(auth), dev))
            if not i: return await js(401, {'error': 'Not signed in.'})
            if u.path == '/api/auth/logout': self.tokens = {t: v for t, v in self.tokens.items() if 'Bearer ' + t != auth}; return await js(200, {'ok': True})
            if u.path == '/api/account' and req.method == 'DELETE':
                if body.get('password') != self.users[i]['password']: return await js(403, {'error': 'Password is wrong.'})
                self.rows = [r for r in self.rows if r[0] != 'u:' + i]; self.tokens = {t: v for t, v in self.tokens.items() if v != i}; del self.users[i]; return await js(200, {'deleted': {'account': 1}})
            if u.path == '/api/account/export': return await js(200, {'user': {'id': i}, 'events': [r[2] for r in self.mine('u:' + i)]})
            if u.path == '/api/account': return await js(200, {'user': {'id': i, 'email': self.users[i]['email']}})
            dev = 'u:' + i
            u = u._replace(path=u.path.replace('/api/account/events', '/api/events'))
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
    await p.click('#backupCodeTools summary'); await p.click('#enableCodeSync')  # explicit user consent, not automatic sync
    await p.wait_for_function("() => document.querySelector('#dataInfo').textContent.includes('waiting to back up')")
    m.online = True; await apx(p, "window.__apSync.run()")
    await p.wait_for_function("() => window.__apSync.outbox() === 0", timeout=15000)
    srv = {r[2]['id'] for r in m.mine('d-e2e-sync-0001')}
    check(len(srv) == n, f'[sync] back online: all {n} events on the server ({len(srv)}), in <=15 kB batches')
    await p.wait_for_function("() => document.querySelector('#dataInfo').textContent.includes('Server acknowledged')"); await shot(p, 'phone-more-synced')
    await p.evaluate(WIPE); await p.evaluate("localStorage.setItem('ap_prefs', JSON.stringify({onboarded:true})); localStorage.setItem('ap_device', 'd-e2e-sync-0001')")
    await p.goto(BASE + '?sync3#/more'); await p.wait_for_selector('#backupCodeTools summary'); await p.click('#backupCodeTools summary'); await p.click('#enableCodeSync'); await p.wait_for_function(f"() => window.__apData && window.__apData.events() === {n}", timeout=15000)
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
    await seed(p); await p.goto(BASE + '?adv#/tonight'); await p.wait_for_selector('#noBag'); await load_sample(p); await p.wait_for_selector('#tnAdvisor')
    first = await p.evaluate("document.querySelector('#tonightBody').firstElementChild.id"); check(first == 'tnAdvisor', f'[advisor] event selector is the first thing on Tonight ({first})')
    labels = await p.eval_on_selector_all('#advEvent [data-event]', 'e=>e.map(x=>x.textContent)'); check(labels == ['League', 'Tournament', 'Practice', 'New center', 'Sport'], f'[advisor] 5 events {labels}')
    await p.click('[data-event=league]'); await p.wait_for_selector('.adv-row')
    st = await p.text_content('#advStart'); check(st.startswith('Start with: Rattler Big Bite, from feet 17, aim 10\u00bd'), f'[advisor] 1 tap -> start line with stand feet (laydown 10 + offset 7), not the laydown: {st!r}')
    rows = await p.eval_on_selector_all('.adv-row', 'e=>e.map(x=>[x.dataset.owned, x.dataset.role, !!document.querySelector(`#advDetails [data-ev-of="${x.dataset.owned}"] .prov`), x.querySelector("p").textContent.length>5])')
    check(len(rows) == 3 and rows[-1][1] == 'spare' and all(r[2] and r[3] for r in rows), f'[advisor] league = 2 + spare, each with role, reason, confidence {rows}')
    check(all(r[0] not in ('own-guru-supreme', 'own-raw-hammer', 'own-green-scout', 'own-rack-attack') for r in rows), '[advisor] benched balls never packed')
    check('no results logged yet' in await p.text_content('#advWhy') and await p.query_selector('#advNoData') is not None, '[advisor] no data -> "based on specs + your release, no results logged yet" + quick-log / import offered')
    check(await p.query_selector('#advPlan') is not None and 'A Rattler Big Bite' in await p.text_content('#advPlan'), '[advisor] A -> B -> C plan')
    check('21' in await p.text_content('#advChange'), '[advisor] "what would change it" cites the 21-game minimum')
    pk = await p.evaluate("[document.getElementById('advStart').getBoundingClientRect().bottom, document.getElementById('tnStartBowl').getBoundingClientRect().bottom, !!document.getElementById('advPack')]")
    check(pk[0] <= 740 and pk[1] <= 740 and pk[2], f'[advisor] P1.5: start line + Start bowling inside one 360x740 screen, the bag and Pack below ({[round(x) for x in pk[:2]]})')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360 and w[0] == 360, f'[advisor] no horizontal overflow at 360 {w}')
    small = await p.evaluate(SMALL.replace("filter(e=>{", "filter(e=>{if(!e.closest('#tnAdvisor, #tnBag'))return false;")); check(not small, f'[advisor] targets >= 44px {small[:6]}')
    await axe_ok(p, '[advisor]')
    await shot(p, 'phone-advisor')
    # swap in 2 taps
    await p.click('.adv-row[data-role=weaker-control] [data-swap]'); await p.click('[data-swap-to]'); await p.wait_for_timeout(300)
    rows2 = await p.eval_on_selector_all('.adv-row', 'e=>e.map(x=>x.dataset.owned)'); check(rows2 != [r[0] for r in rows] and len(rows2) == 3, f'[advisor] swap in 2 taps {rows2}')
    await p.click('#advPack'); await p.wait_for_selector('#advPackList')
    pl = await p.text_content('#advPackList'); check('3 balls' in pl and 'Spare' in pl, f'[advisor] Pack this -> pack list shown {pl[:80]!r}')
    check((await p.text_content('#advStart')).startswith('Start with: Rattler Big Bite,'), '[advisor] packed bag drives the Tonight pick')
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
    await p.goto(BASE + '?bc#/bowl'); await p.wait_for_selector('#noBag'); await load_sample(p); await bowl_more(p); await p.wait_for_selector('#tnLog')
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
    check(len(figs) == 4 and all(f[1] for f in figs), f'[card] C5: 4 outcome tiles, each with its n {figs}')
    check('release' not in [f[0] for f in figs] and await p.query_selector('#bcRelease #bcSpeedRevs') is not None and await p.query_selector('#bcSrc #bcFigSrc') is not None, '[card] C5: Speed \u00b7 revs in Release, tile sources in Sources')
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
    await p.goto(BASE + '?bc#/arsenal/insights'); await p.wait_for_selector('#insLastHead')
    check('8.5/10' not in await p.text_content('main') and len(await p.text_content('#insLastHead')) > 10, '[card] Insights static assessment replaced by computed line')
    check(await p.get_attribute('#insGame', 'href') == '#/card' and await p.query_selector('#insHead') is None, '[card] C6: Insights links to the Bowler Card instead of repeating its headline')
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
    await p.goto(BASE + '?sim'); await p.wait_for_selector('#noBag, #tnStartBowl')
    check(await p.query_selector('#tabs a[href="#/tonight"][aria-current=page]') is not None, '[sim] app opens on Tonight, not Lane')
    if await p.query_selector('#loadStarter'): await load_sample(p)
    await p.click('#tnStartBowl'); await p.wait_for_selector('#qlStrike'); await p.wait_for_selector('#tnStand', state='attached')
    feet = int((await p.text_content('#tnStand')).split()[1])
    box = await p.query_selector('#qlStrike'); await box.scroll_into_view_if_needed(); await p.wait_for_timeout(300); bb = await box.bounding_box(); x, y = bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2
    await p.mouse.click(x, y); await p.wait_for_timeout(120); await p.mouse.click(x, y); await p.wait_for_timeout(600)
    wh = await p.text_content('#qlWhere'); check('Frame 2' in wh, f'[sim] double tap on X logs one strike ({wh!r})')
    check(await p.is_visible('#tnNow') and await p.eval_on_selector('#tnMore', 'e => !e.open') and await p.query_selector('#tnMore #tnPick') is not None, '[sim] game open: ball/feet/aim + scoring up front, the rest behind one tap')
    check(f'Stand {feet}' in await p.text_content('#tnNowLine'), '[sim] game-open line (Stand · Aim chip) uses the same stand as the pick card')
    await axe_ok(p, '[sim] game open'); await shot(p, 'phone-tonight-game-open')
    await p.click('#qlPins [data-pin="7"]'); await p.wait_for_selector('#qlHint')
    hint = await p.text_content('#qlHint'); check('lefty' in hint and f'strike stand {feet}' in hint, f'[sim] lefty spare hint uses hand + real strike stand ({hint[:90]!r})')
    await p.reload(); await p.wait_for_selector('#tnNow'); check(await p.is_visible('#tnLog') and 'Frame 2' in await p.text_content('#qlWhere'), '[sim] scoring card restored after reload')
    aim = (await p.text_content('#tnNowLine')).split('Aim')[-1].strip(' \u203a')
    await c.set_offline(True); await p.evaluate("() => window.dispatchEvent(new Event('offline'))"); await p.wait_for_selector('#netChip:not([hidden])')
    check('Offline' in await p.text_content('#netChip'), '[sim] offline chip shows'); await shot(p, 'phone-tonight-offline')
    await c.set_offline(False); await p.evaluate("() => window.dispatchEvent(new Event('online'))"); await p.wait_for_selector('#netChip', state='hidden')
    await p.goto(BASE + '?sim#/lane'); await p.wait_for_selector('#lineSum[data-stand]'); await p.wait_for_timeout(400)
    ls = await p.text_content('#lineSum'); st = await p.get_attribute('#lineSum', 'data-stand')
    ah = hb(aim); ahs = (str(int(ah)) if ah == int(ah) else f'{int(ah)}\u00bd')   # Lane shows whole/half boards (owner aim fix); Tonight shows the same
    check(int(st) == feet and ahs in ls, f'[sim] Lane shows the same stand/aim as Tonight (lane {st}/{ls!r}, tonight {feet}/{aim})')
    check(not errs, '[sim] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def scoring_cycle(b):
    # Scoring fixes: (1) pad within thumb reach, two-tap spare, Saved line, frame time; (2) any-frame edit + undo in <= 4 taps;
    # (3) ball chip + spare-ball rule, Games by ball/leave, games CSV; (4) league/Baker + USBC handicap (only my frames feed stats).
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.goto(BASE + '?sc#/bowl'); await p.wait_for_selector('#noBag'); await load_sample(p); await bowl_more(p); await p.wait_for_selector('#tnLog')
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
    # sim2 #5: at 360x740 Undo, Fix and the spare hint sit inside the pinned pad, in the bottom third, 44-48 px tall
    await p.set_viewport_size({'width': 360, 'height': 740}); await p.wait_for_timeout(300)
    await p.click('#qlPins [data-pin="10"]'); await p.wait_for_selector('#qlHint')
    rr = await p.evaluate("""() => { const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom), Math.round(b.height)]; };
      return { undo: r('#qlUndo'), fix: r('#qlFix'), hint: r('#qlHint'), pad: r('#qlPad'), inPad: !!document.querySelector('#qlPad #qlUndo') && !!document.querySelector('#qlPad #qlFix') && !!document.querySelector('#qlPad #qlHint'), h: innerHeight }; }""")
    check(rr['inPad'] and all(rr[k][0] >= rr['h'] * 2 / 3 - 40 and rr[k][1] <= rr['h'] and 44 <= rr[k][2] <= 52 for k in ('undo', 'fix')), f'[scoring] sim2 #5: Undo/Fix in the pad, bottom third, 44-48 px at 360x740 {rr}')
    check(rr['hint'][0] >= rr['pad'][0] and rr['hint'][1] <= rr['h'], f'[scoring] sim2 #5: the spare hint is inside the pad, on screen {rr["hint"]} {rr["pad"]}')
    check('Undo ball' in await p.text_content('#qlUndo') and 'frame' in await p.text_content('#qlUndo'), '[scoring] sim2 #5: Undo names the ball and frame it removes')
    await p.click('#qlPins [data-pin="10"]'); await p.wait_for_function("() => !document.querySelector('#qlHint')")
    await p.set_viewport_size({'width': 360, 'height': 780}); await p.wait_for_timeout(200)
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
    # sim2 #4: a finished game is fixable from the night view: Fix a frame in game 1, frame, X (3 taps); Undo (1 tap)
    tot = lambda: p.evaluate("() => window.__apData.projection().games.map(g => g.score)")
    g0 = await tot(); await p.click('[data-fix-game="1"]'); await p.click('.fix-game[data-game="1"] [data-fix="2"]'); await p.wait_for_selector('[data-fixing]')
    check('game 1, frame 2' in await p.text_content('[data-fixing]'), '[scoring] sim2 #4: the session fix pad names game and frame')
    await axe_ok(p, '[scoring] session fix pad'); small = await p.evaluate(SMALL); check(not small, f'[scoring] session fix targets >= 44px {small[:6]}')
    await qtap(p, '.fix-game[data-game="1"] [data-k="strike"]'); await p.wait_for_selector('[data-undo-fix]')
    g1 = await tot(); msg = await p.text_content('[data-fix-msg]')
    check('game 1, frame 2 fixed' in msg and g1 != g0 and str(g1[-1] if g1 else '') in msg, f'[scoring] sim2 #4: finished game fixed in 3 taps, total recomputes ({g0} -> {g1}, {msg!r})')
    await shot(p, 'phone-session-fix')
    await qtap(p, '[data-undo-fix]'); await p.wait_for_function("() => (document.querySelector('[data-fix-msg]')||{}).textContent?.includes('restored')")
    check(await tot() == g0, f'[scoring] sim2 #4: Undo restores the finished game ({await tot()})')
    await p.goto(BASE + '?sc#/sessions'); await p.wait_for_selector('#gamesCsv')
    async with p.expect_download() as dl: await p.click('#gamesCsv')
    d = await dl.value; path = await d.path(); txt = open(path, encoding='utf-8-sig', newline='').read()
    lines = txt.strip().split('\r\n')
    check(lines[0].startswith('date,session,source,game,score') and len(lines) == 2 and ',yes,' in lines[1], f'[scoring] games CSV: header + 1 complete game ({lines[:2]})')
    check(not any(cell.startswith(('=', '+', '@')) for ln in lines for cell in ln.split(',')), '[scoring] games CSV has no formula cells')
    # (4) league team + USBC handicap: one pad, "Up: Name"; teammates' frames never feed my stats; Baker = team game
    await p.goto(BASE + '?sc#/tonight'); await p.wait_for_selector('#qlNext'); check('#/bowl' in p.url, '[scoring] P1.5: #/tonight between games of an open night lands on Bowl'); await p.click('#qlNext'); await bowl_more(p); await p.wait_for_selector('#tnSetup')
    await p.click('#tnSetup [aria-label="Scoring"] [data-v="league"]'); await p.wait_for_selector('#tnTeam'); await p.evaluate("() => { document.querySelector('#tnTeam').open = true; }")
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
    # sim2 #3: league Fix a frame shows whose frame; a teammate's frame can be fixed with the name shown; Saved names the bowler
    await p.click('#qlFix'); await p.wait_for_selector('#qlFixPick')
    pk = await p.text_content('#qlFixPick'); ab = await p.eval_on_selector_all('#qlFixPick [data-fix]', 'e => e.map(x => x.getAttribute("aria-label"))')
    check('Fix whose frame?' in pk and 'Fix your frame 1' in ab and any('Ann' in x and 'frame 1' in x for x in ab), f'[scoring] sim2 #3: league picker groups frames by bowler ({ab})')
    await axe_ok(p, '[scoring] league fix picker'); small = await p.evaluate(SMALL); check(not small, f'[scoring] league picker targets >= 44px {small[:6]}')
    await p.click('#qlFixPick [data-who]:not([data-who="me"])[data-fix="1"]'); await p.wait_for_selector('#qlFixCancel')
    check('Fixing Ann' in await where() and 'frame 1' in await where(), f'[scoring] sim2 #3: fix pad names the teammate ({await where()})')
    await qtap(p, '#qlStrike'); await wf('frame 1 fixed')
    sv = await p.text_content('#qlSaved'); ann = await p.evaluate("() => window.__apData.projection().teamShots.filter(x => x.who && x.who !== 'baker' && x.game === 2).map(x => x.down)")
    check('Ann' in sv and ann == [10] and 'Up: You' in await where(), f'[scoring] sim2 #3: Ann\'s frame 1 fixed, Saved names her, play resumes with me ({sv!r}, {ann}, {await where()})')
    await qtap(p, '#qlUndoFix'); await wf('restored')
    ann = await p.evaluate("() => window.__apData.projection().teamShots.filter(x => x.who && x.who !== 'baker' && x.game === 2).map(x => x.down)")
    check(ann == [9, 1] and 'Ann' in await p.text_content('#qlSaved'), f'[scoring] sim2 #3: Undo restores Ann\'s frame ({ann})')
    await open_folds(p); await p.click('#tnSetup [aria-label="Scoring"] [data-v="baker"]')
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
    await seed(p); await p.goto(BASE + '?pr#/bowl'); await p.wait_for_selector('#noBag'); await load_sample(p); await bowl_more(p); await p.wait_for_selector('#tnLog')
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
    await p.goto(BASE + '#/more'); await p.wait_for_selector('#protChip'); await p.wait_for_function("() => /Retention requested|Local storage only/.test(document.querySelector('#protChip').textContent)")
    await p.wait_for_function("() => (document.querySelector('#lastBackup') || {}).textContent")
    lb = await p.text_content('#lastBackup'); chip = await p.text_content('#protChip')
    check(lb.startswith('Last backup file: 15 days ago') or 'days ago' in lb, f'[protect] More: last backup in plain words ({lb!r})')
    await p.click('#protMore summary'); pm = await p.text_content('#protMore')
    check(chip in ('Retention requested', 'Local storage only') and 'not a backup' in pm and 'backup file' in pm, f'[protect] More: chip {chip!r}; why + fixes behind "Keep it safe"')
    await axe_ok(p, '[protect] More'); small = await p.evaluate(SMALL); check(not small, f'[protect] More targets >= 44px {small[:6]}')
    await shot(p, 'phone-protect-more')
    check(not errs, '[protect] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def alley_cycle(b):
    # GAP (d): wake lock held only while a game is open (released at the final frame / when off); Large + Extra large text.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await c.add_init_script("""window.__wl = {req: 0, rel: 0, held: 0}; Object.defineProperty(navigator, 'wakeLock', {configurable: true, value: {request: async () => { __wl.req++; __wl.held++;
      const l = new EventTarget(); l.release = async () => { if (l.done) return; l.done = 1; __wl.rel++; __wl.held--; l.dispatchEvent(new Event('release')); }; return l; }}});""")
    await seed(p); await p.goto(BASE + '?al#/bowl'); await p.wait_for_selector('#noBag'); await load_sample(p); await bowl_more(p); await p.wait_for_selector('#tnLog')
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

async def armory_cycle(b):
    # Armory: owned balls on lit shelves, gold nameplates, Old Friends behind a tap, marks only when earned. No new tab.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.goto(BASE + '?arm#/arsenal'); await p.wait_for_selector('#armory')
    check(await p.text_content('.arm-team') == 'Arsenal Pro' and await p.text_content('.appbar .title') == 'Armory', '[armory] header: team line + Armory (no invented name)')
    n = await p.evaluate("() => document.querySelectorAll('#armBag .ped[data-own]').length"); check(n == 0 and await p.query_selector('#armEmpty[href=\"#/add-ball\"]') is not None, f'[armory] empty: only the Add ball pedestal ({n})')
    await p.goto(BASE + '?arm#/bowl'); await p.wait_for_selector('#noBag'); await load_sample(p); await bowl_more(p); await p.wait_for_selector('#tnBagLink')
    await p.goto(BASE + '?arm2#/arsenal'); await p.wait_for_selector('#armBag .ped[data-own]')
    ids = await p.evaluate("() => [...document.querySelectorAll('#armBag .ped[data-own]')].map(x => x.dataset.own)")
    check(len(ids) == 6 and ids[0] == 'own-rattler-big-bite', f'[armory] bag shelf: 6 in-bag balls, benchmark first {ids}')
    check(await p.evaluate("() => document.querySelectorAll('#armBenchShelf .ped').length") == 4 and not await p.evaluate("() => document.querySelector('#armBench').open"), '[armory] bench (4) folded behind a tap')
    check(await p.evaluate("() => !document.querySelector('#armory [data-m]')"), '[armory] no marks without logged games')
    spec = await p.text_content('#armBag [data-own="own-rattler-big-bite"] .plate-spec'); check('RG' in spec and 'Diff' in spec, f'[armory] nameplate keeps catalog RG/Diff for screen readers (C10: visible on the ball page) ({spec})')
    check(await p.query_selector('#tabs a[href="#/bag"][aria-current=page]') is not None and await p.query_selector('#tabs a[href*="armory"]') is None, '[armory] a view of the Bag tab, no tab of its own')
    await axe_ok(p, '[armory]'); small = await p.evaluate(SMALL); check(not small, f'[armory] targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360, f'[armory] no horizontal overflow at 360 {w}')
    await shot(p, 'phone-armory')
    await p.goto(BASE + '?arm3#/bag'); await p.wait_for_selector('#bagCare'); await p.evaluate("() => { document.querySelectorAll('#bagCare, #bagLeft, #bagLeftAll').forEach(d => { d.open = true; }) }"); await p.select_option('#bagCareBall', 'own-raw-hammer'); await p.click('#bagCare [data-v="retired"]')
    await p.wait_for_function("() => document.querySelector('#bagCare [data-v=\"retired\"]').getAttribute('aria-checked') === 'true' || document.querySelector('#bagCare [data-v=\"retired\"]').getAttribute('aria-pressed') === 'true'"); await p.wait_for_timeout(400)
    await p.goto(BASE + '?arm4#/arsenal'); await p.wait_for_selector('#armHall'); await p.click('#armHall summary')
    hall = await p.evaluate("() => [...document.querySelectorAll('#armHallShelf .ped')].map(x => x.dataset.own)")
    check(hall == ['own-raw-hammer'], f'[armory] retired ball moves to Old Friends {hall}')
    await axe_ok(p, '[armory] hall open'); await shot(p, 'phone-armory-hall')
    await p.click('#armBag [data-own="own-rattler-big-bite"] .ped-link'); await p.wait_for_function("() => location.hash.startsWith('#/ball/')")
    check(True, '[armory] pedestal opens the ball page')
    check(not errs, f'[armory] no page errors {errs[:3]}'); await c.close()

HELP_SCREENS = [('tonight', '#/tonight', '#tnAdvisor'), ('lane', '#/lane', '.lane-tools'), ('target', '#/target', '#tgCall'), ('arsenal', '#/arsenal', '#armBagH'),
    ('ball', '#/ball/hy-road', '#ballRead'), ('compare', '#/compare?ids=hy-road,rattler', '.cmp-body'), ('insights', '#/arsenal/insights', '#insGame'),
    ('patterns', '#/patterns', '.list-screen'), ('pattern', '#/pattern/2024-pba-shark', '.heat-wrap'), ('sessions', '#/sessions', '.list-screen'),
    ('card', '#/card', '#bcHead'), ('bag', '#/bag', '#bagCare')]
VISIBLE_DOTS = "() => [...document.querySelectorAll('.help-dot')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('details:not([open]) > :not(summary)'); }).length"

async def help_counts(p, tag):
    out = {}
    for name, route, sel in HELP_SCREENS:
        await p.goto(BASE + f'?{tag}{name}' + route); await p.wait_for_selector(sel); await p.wait_for_timeout(150)
        # clutter C8/C9: some terms sit in collapsed sections; their "?" shows once the section is opened
        await p.evaluate("() => document.querySelectorAll('#ballSpecs, #bagCare, #bagLeft').forEach(d => { d.open = true; })")
        out[name] = await p.evaluate(VISIBLE_DOTS)
    return out

async def help_cycle(b):
    # Owner bug 2026-10-24 ("the help feature does nothing"): a gold "?" next to bowling words on every main screen (never on the
    # scoring pad), a "?" switch in every top bar + More › Learn, each bubble 1-2 sentences + "Learn more" to the Bowling Guide.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 740})
    await seed(p); await p.goto(BASE + '?hp#/bowl'); await p.wait_for_selector('#noBag'); await load_sample(p); await bowl_more(p); await p.wait_for_selector('#tnSetup')
    off = await help_counts(p, 'hoff'); check(not any(off.values()), f'[help] off by default: 0 "?" on every screen {off}')
    await p.goto(BASE + '?hp#/lane'); await p.wait_for_selector('#helpToggle[aria-pressed="false"]')
    box = await p.evaluate("() => { const r = document.querySelector('#helpToggle').getBoundingClientRect(); return [r.width, r.height, r.top]; }")
    check(round(box[0]) >= 44 and round(box[1]) >= 44 and box[2] < 80, f'[help] "?" switch in the top bar, 44 px {box}')
    await p.click('#helpToggle'); await p.wait_for_selector('#helpToggle[aria-pressed="true"]')
    check(await p.evaluate("() => JSON.parse(localStorage.getItem('ap_prefs') || '{}').help === true"), '[help] top-bar switch turns Help on (saved)')
    on = await help_counts(p, 'hon'); zero = [k for k, v in on.items() if v < 1]
    check(not zero, f'[help] Help on: at least one "?" on every screen {on}')
    check(on['ball'] >= 12, f'[help] ball page: "?" on RG, differential, core, cover, finish, reads, the line, cards, compare ({on["ball"]})')
    await p.goto(BASE + '?hb#/ball/hy-road'); await p.wait_for_selector('#ballRead')
    await p.evaluate("() => { const d = document.querySelector('#ballSpecs'); if (d) d.open = true; }")
    for hid in ['eq-rg', 'eq-diff', 'eq-core', 'eq-cover-types', 'eq-surface', 'bm-shr', 'tg-hit', 'bm-entry-angle', 'ap-model', 'bm-breakpoint', 'ap-use-when', 'ap-compare']:
        check(await p.query_selector(f'.help-dot[data-help="{hid}"]') is not None, f'[help] ball page has "?" for {hid}')
    await shot(p, 'phone-ball-help'); await axe_ok(p, '[help] ball page with Help on')
    small = await p.evaluate(SMALL); check(not small, f'[help] ball page targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360, f'[help] ball page: no horizontal overflow at 360 {w}')
    gold = await p.evaluate("() => { const i = document.querySelector('.help-dot .help-i'), cs = getComputedStyle(i); return [cs.borderTopColor, cs.width]; }")
    check(gold[1] == '22px' and gold[0] not in ('rgba(0, 0, 0, 0)',), f'[help] dot is a small gold "?" {gold}')
    await p.click('.help-dot[data-help="eq-rg"]'); await p.wait_for_selector('#helpSheet #helpText')
    txt = await p.text_content('#helpText'); sents = len([x for x in re.split(r'(?<=[.!?])\s+', txt.strip()) if x])
    check(1 <= sents <= 2, f'[help] bubble is 1-2 sentences ({sents}: {txt[:60]})')
    await axe_ok(p, '[help] bubble'); await p.click('#helpMore'); await p.wait_for_selector('#gl-eq-rg[open]')
    check('Bowling Guide' in (await p.text_content('.appbar .title')), '[help] "Learn more" opens the Bowling Guide at the term')
    check(await p.query_selector('#tabs a[href="#/learn"][aria-current=page]') is not None, '[help] Guide lives under the Learn tab')
    await p.goto(BASE + '?hp3#/bowl'); await p.wait_for_selector('#tnLog')
    check(await p.query_selector('#tnLog .help-dot') is None, '[help] never inside the scoring pad')
    await p.goto(BASE + '?hp4#/lane'); await p.wait_for_selector('.help-dot[data-help="bm-shr"]')
    await p.click('.help-dot[data-help="bm-shr"]'); await p.wait_for_selector('#helpSheet #helpText')
    txt = await p.text_content('#helpText'); check(txt.startswith('Every ball skids'), f'[help] Lane bubble shows the v1 text ({txt[:40]})')
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    await p.goto(BASE + '?hp5#/learn'); await p.wait_for_selector('#helpFld'); await p.click('#helpFld [data-v="off"]')
    await p.wait_for_selector('#helpToggle[aria-pressed="false"]'); check(True, '[help] More switch and top-bar switch stay in step')
    off2 = await help_counts(p, 'hoff2'); check(not any(off2.values()), f'[help] off again: 0 "?" everywhere {off2}')
    check(not errs, f'[help] no page errors {errs[:3]}'); await c.close()

async def guide_cycle(b):
    # P1.7 -> P2 Bowling Guide: one tap from the Learn tab (first card, Glossary in the first viewport = learnfirst), searchable, 7 topic chips.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 740})
    await seed(p); await p.goto(BASE + '?lf#/learn'); await p.wait_for_selector('#helpCard')
    first = await p.evaluate("() => document.querySelector('#view .card').id"); check(first == 'helpCard', f'[learnfirst] Learn opens with the Guide card ({first})')
    vis = await p.evaluate("() => ['#goGuide', '#goGlossary', '#helpFld'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return r.bottom <= innerHeight - 64 && r.top >= 0; })")
    check(all(vis), f'[learnfirst] Bowling Guide, Glossary and the Help switch are in the first viewport {vis}')
    await p.click('#goGuide'); await p.wait_for_selector('#glTrees')
    title = await p.text_content('.appbar .title'); check(title.strip() == 'Bowling Guide', f'[guide] title ({title})')
    chips = await p.evaluate("() => document.querySelectorAll('#glTrees [data-tree]').length"); check(chips == 8, f'[guide] All + 7 topic chips ({chips})')
    tot = await p.text_content('#glCount'); n = int(re.search(r'of (\d+) terms', tot).group(1)); check(n >= 113, f'[guide] all terms ({tot})')
    await p.click('#glTrees [data-tree="Lane & Oil"]'); cnt = await p.text_content('#glCount')
    trees = await p.evaluate("() => [...new Set([...document.querySelectorAll('#glList .group-h')].map(e => e.textContent))]"); check(trees == ['Lane & Oil'], f'[guide] browse by topic {trees} ({cnt})')
    await p.click('#glTrees [data-tree=""]'); await p.fill('#glSearch', 'handicap'); await p.wait_for_selector('#gl-sc-handicap')
    await p.click('#gl-sc-handicap summary'); k = await p.evaluate("() => document.querySelectorAll('#gl-sc-handicap .gl-src li').length"); check(k >= 1, f'[guide] search + sources ({k})')
    await axe_ok(p, '[guide]'); small = await p.evaluate(SMALL); check(not small, f'[guide] targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360, f'[guide] no horizontal overflow at 360 {w}')
    await shot(p, 'phone-guide')
    await p.goto(BASE + '?lf2#/glossary?t=tg-hit'); await p.wait_for_selector('#gl-tg-hit[open]'); check(True, '[guide] old #/glossary links still open a term')
    check(not errs, f'[guide] no page errors {errs[:3]}'); await c.close()

async def hand_cycle(b):
    # Explicit handedness (owner 2026-10-24, IA_PLAN P1.6): nothing preselected on welcome, starter data never sets it,
    # asked once (inline, not during a game), "Right-handed · change" on Tonight, and every hand-dependent view follows it.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 740})
    await p.goto(BASE); await p.evaluate(WIPE); await p.goto(BASE + '?hw'); await p.wait_for_selector('#welNext')
    pre = await p.evaluate("() => [...document.querySelectorAll('[aria-label=\"Bowling hand\"] [aria-checked=true]')].length")
    check(pre == 0, f'[hand] welcome: no hand preselected ({pre})')
    await p.click('#welSkip'); await p.wait_for_selector('#noBag'); await p.click('#loadStarter'); await p.wait_for_selector('#handAsk')
    pr = await p.evaluate("() => JSON.parse(localStorage.getItem('ap_profile') || 'null')")
    check(not pr or pr.get('hand') in (None, ''), f'[hand] starter arsenal does not set a hand ({pr and pr.get("hand")})')
    await axe_ok(p, '[hand] ask'); small = await p.evaluate(SMALL); check(not small, f'[hand] targets >= 44px {small[:6]}')
    await shot(p, 'phone-hand-ask')
    await p.click('#handL'); await p.wait_for_selector('#tnHand')
    t = await p.text_content('#tnHand'); check(t.startswith('Left-handed') and 'change' in t, f'[hand] Tonight: "Left-handed · change" ({t})')
    pr = await p.evaluate("() => JSON.parse(localStorage.getItem('ap_profile'))"); check(pr['hand'] == 'left' and pr['handSource'] == 'user-reported', f'[hand] stored as user-reported {pr.get("hand")}/{pr.get("handSource")}')
    await p.goto(BASE + '?hl#/lane'); await p.wait_for_selector('#deck')
    check(await p.query_selector('#handAsk') is None, '[hand] asked only once')
    lbl = await p.get_attribute('#deck', 'aria-label'); check('1-2 pocket' in lbl, f'[hand] Lane pin deck follows the hand (1-2 pocket for a lefty)')
    await p.goto(BASE + '?hm#/more'); await p.wait_for_selector('#editProfile')
    check('Left-handed' in await p.text_content('#view'), '[hand] Bowler profile shows Left-handed')
    await p.goto(BASE + '?ht#/tonight'); await p.wait_for_selector('#tnHandChange'); await p.click('#tnHandChange'); await p.wait_for_selector('#handSheetR')
    await p.click('#handSheetR'); await p.wait_for_function("() => (document.querySelector('#tnHand') || {}).textContent?.startsWith('Right-handed')")
    await p.goto(BASE + '?hr#/lane'); await p.wait_for_selector('#deck'); lbl = await p.get_attribute('#deck', 'aria-label'); check('1-3 pocket' in lbl, '[hand] change to Right: Lane follows (1-3 pocket)')
    # "Not now": never asked again; boards read right-handed and the line says so.
    await seed(p); await p.goto(BASE + '?hn#/tonight'); await p.wait_for_selector('#noBag'); await load_sample(p); await p.wait_for_selector('#handLater')
    await p.click('#handLater'); await p.wait_for_selector('#tnHand'); t = await p.text_content('#tnHand')
    check('Hand not set' in t, f'[hand] "Not now": quiet line, boards read right-handed ({t})')
    await p.goto(BASE + '?hn2#/target'); await p.wait_for_selector('#tgCall'); check(await p.query_selector('#handAsk') is None, '[hand] "Not now" is final (Targeting)')
    check(not errs, f'[hand] no page errors {errs[:3]}'); await c.close()

async def status_cycle(b):
    # P1.3 / D: one Status per ball, the same words everywhere. Set C4 to "At the pro shop" on its ball page -> gone from the
    # ball chip, Tonight's Swap and the builder's Swap; present in every "Why not". No reload anywhere (hash navigation only).
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 740})
    await seed(p); await p.goto(BASE + '?st#/tonight'); await p.wait_for_selector('#noBag'); await load_sample(p); await p.wait_for_selector('#tnAdvisor')
    words = await p.evaluate("""async () => { const m = await import('./js/cc/status.js'); return m.STATUS.map(x => x[1]); }""")
    check(words == ['Ready to bring', 'At home', 'At the pro shop', 'Retired'], f'[status] four words {words}')
    await p.evaluate("async () => { const s = await import('./js/store.js'); s.setPrefs({ help: true }); }")   # show the "?" dots
    await p.evaluate("location.hash = '#/ball/ordnance-c4'"); await p.wait_for_selector('#ballStatus')
    opts = await p.eval_on_selector_all('#ballStatus [data-v]', 'e => e.map(x => x.textContent)'); check(opts == words, f'[status] ball page: one Status control with the four words {opts}')
    check(await p.query_selector('#ballOwned .help-dot, #ballOwned [data-help]') is not None, '[status] ball page Status has a "?"')
    await axe_ok(p, '[status] ball page'); small = await p.evaluate(SMALL); check(not small, f'[status] ball page targets >= 44px {small[:6]}')
    await p.click('#ballStatus [data-v="proShop"]'); await p.wait_for_selector('#ballWhyNot[data-why="proShop"]')
    check('pro shop' in await p.text_content('#ballWhyNot'), '[status] ball page: "Why not this ball?" says at the pro shop')
    await p.evaluate("location.hash = '#/tonight'"); await p.wait_for_selector('#tnAdvisor')
    await p.click('[data-event=tournament]'); await p.wait_for_selector('#advStart')
    rows = await p.eval_on_selector_all('.adv-row', 'e => e.map(x => x.dataset.owned)'); check('own-ordnance-c4' not in rows, f'[status] advisor never packs a pro-shop ball {rows}')
    await p.click('.adv-row [data-swap]'); await p.wait_for_selector('[data-swap-to]')
    sw = await p.eval_on_selector_all('[data-swap-to]', 'e => e.map(x => [x.dataset.swapTo, x.textContent])')
    check(sw and all(x[0] != 'own-ordnance-c4' for x in sw), f'[status] absent from Tonight Swap {[x[0] for x in sw]}')
    check(all(('grab from home' in x[1]) == (x[0] in ('own-guru-supreme', 'own-raw-hammer', 'own-green-scout', 'own-rack-attack')) for x in sw), '[status] At home balls offered in Swap, tagged "grab from home"')
    left = await p.get_attribute('#advLeft [data-why-not="own-ordnance-c4"]', 'data-why'); check(left == 'proShop', f'[status] present in Tonight\'s Why not ({left})')
    if await p.query_selector('#qlBall') is None:
        await p.evaluate("location.hash = '#/bag'"); await p.wait_for_selector('#bagRows')
    else:
        await p.click('#qlBall'); await p.wait_for_selector('#qlBallPick')
        chip = await p.eval_on_selector_all('#qlBallPick [data-ball]', 'e => e.map(x => x.dataset.ball)'); check('own-ordnance-c4' not in chip, f'[status] absent from the ball chip {chip}')
        await p.evaluate("location.hash = '#/bag'"); await p.wait_for_selector('#bagRows')
    grid = await p.eval_on_selector_all('#bagRows [data-own]', 'e => e.map(x => x.dataset.own)')
    check('own-ordnance-c4' not in grid, f'[status] builder: a pro-shop ball is not packed {grid}')
    chipIds = await p.evaluate("""async () => { const h = await import('./js/hub.js'), S = await import('./js/cc/status.js'); await h.ready(); const P = h.proj(); return S.packedIds(P, S.currentBag(P)); }""")
    check('own-ordnance-c4' not in chipIds, f'[status] ball chip source (packed ids of the one bag) has no pro-shop ball {chipIds}')
    w = await p.get_attribute('#bagLeft [data-why-not="own-ordnance-c4"]', 'data-why'); check(w == 'proShop', f'[status] builder Why not: pro shop ({w})')
    check(await p.query_selector('#bagLeft [data-help="ap-why-not"], #bagLeft .help-dot') is not None, '[status] builder has a "?"')
    await p.click('#bagRows [data-swap]'); await p.wait_for_selector('#bagSwap')
    cands = await p.eval_on_selector_all('#bagSwap [data-cand]', 'e => e.map(x => x.dataset.cand)'); check('own-ordnance-c4' not in cands, f'[status] absent from the builder Swap {cands}')
    await p.click('#bagSwapCancel')
    # change it back on the builder (2 taps): the builder and Swap update at once
    await p.evaluate("() => { document.querySelectorAll('#bagCare, #bagLeft, #bagLeftAll').forEach(d => { d.open = true; }) }")
    check(await p.query_selector('#bagLeft [data-bring="own-ordnance-c4"]') is None and 'Change where it is' in await p.text_content('#bagLeft [data-status-of="own-ordnance-c4"]'), '[status] builder: pro shop ball has no Bring, only "Change where it is"')
    await p.click('#bagLeft [data-status-of="own-ordnance-c4"]'); await p.wait_for_selector('#statusSheet'); await p.click('#statusSheet [data-set-status="inBag"]')
    await p.wait_for_function("() => !document.querySelector('#bagLeft [data-why-not=\"own-ordnance-c4\"][data-why=\"proShop\"]')")
    check(True, '[status] Status changed on the builder updates it without a reload')
    ui = await p.evaluate("() => document.body.innerText"); check(not re.search(r'\b(Exclude|Excluded|Benched|Lock|Locked)\b', ui), '[status] no Exclude / Benched / Lock on screen')
    await axe_ok(p, '[status] builder'); small = await p.evaluate(SMALL); check(not small, f'[status] builder targets >= 44px {small[:6]}')
    wd = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(wd[1] <= 360, f'[status] no horizontal overflow {wd}')
    # an old bag with an `excluded` list (old backup / other device): migrated at once -> At home, list cleared
    mg = await p.evaluate("""async () => { const h = await import('./js/hub.js'); await h.ready(); const b = Object.assign({}, h.proj().bags['bag-league']); delete b.id; delete b.ts;
      await h.add('bag.saved', 'bag-league', Object.assign(b, { excluded: ['own-super-nova'] })); for (let i = 0; i < 40 && (h.proj().bags['bag-league'].excluded || []).length; i++) await new Promise(r => setTimeout(r, 50));
      const P = h.proj(); return [P.owned['own-super-nova'].status, P.bags['bag-league'].excluded.length]; }""")
    check(mg == ['benched', 0], f'[status] migration: excluded -> At home, list cleared ({mg})')
    check(not errs, f'[status] no page errors {errs[:3]}'); await c.close()

async def center_cycle(b):
    # M1 center memory: "Last time at <center>" before the first ball only (never while scoring), one line + your note,
    # "Use last setup" copies pattern / surface / lane pair, older visits behind a tap, note written from the session page.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.goto(BASE + '?cm#/bowl'); await p.wait_for_selector('#noBag'); await load_sample(p); await bowl_more(p); await p.wait_for_selector('#tnSetup')
    await p.evaluate("""async () => { const m = await import('./js/hub.js'); await m.ready();
      await m.add('center.created', 'center-test-lanes', { fields: { name: 'Test Lanes', surface: 'synthetic' } });
      for (const [id, d] of [['test-cm-1', '2026-10-10'], ['test-cm-2', '2026-10-17']]) { await m.add('session.created', id, { kind: 'tonight', date: d, centerId: 'center-test-lanes', patternSlug: 'test', patternName: '2026 PBA Badger', ft: 52, ml: null, ratio: null, surface: 'synthetic', lanePair: '15-16', ended: true }); await m.add('shot.logged', id + '-s1', { sessionId: id, game: 1, frame: 1, roll: 1, down: 10, leave: [] }); } }""")
    await p.goto(BASE + '?cm2#/tonight'); await open_folds(p); await p.wait_for_selector('#tnCenter')
    check(await p.query_selector('#tnLast') is None, '[center] nothing until a center is chosen')
    check(await p.evaluate("() => [...document.querySelectorAll('#tnCenterList option')].some(o => o.value === 'Test Lanes')"), '[center] your centers are offered as you type')
    await p.fill('#tnCenter', 'Test Lanes'); await p.dispatch_event('#tnCenter', 'change'); await p.wait_for_selector('#tnLast')
    ln = await p.text_content('#tnLastLine'); check(ln.startswith('Oct 17') and 'lanes 15-16' in ln and '2026 PBA Badger 52 ft' in ln, f'[center] last visit in one line, date first ({ln})')
    check(await p.eval_on_selector('#tnLastAll', 'e => !e.open') and '2 visits' in await p.text_content('#tnLastAll summary'), '[center] older visits behind one tap')
    await p.click('#tnUseLast'); await p.wait_for_function("() => document.querySelector('#tnPattern').value === '2026 PBA Badger'")
    check(await p.input_value('#tnLanes') == '15-16' and await p.get_attribute('#tnSetup [role=radio][data-v=synthetic]', 'aria-checked') == 'true', '[center] Use last setup copies pattern, lane pair and surface')
    check(await p.query_selector('#tnUseLast') is None, '[center] button gone once the setup matches')
    await p.fill('#tnLanes', 'abc'); await p.dispatch_event('#tnLanes', 'change'); await p.wait_for_timeout(200)
    await p.fill('#tnLanes', '21 - 22'); await p.dispatch_event('#tnLanes', 'change'); await p.wait_for_function("() => document.querySelector('#tnLanes').value === '21-22'")
    check(True, '[center] lane pair cleaned to 21-22')
    await axe_ok(p, '[center] last time'); small = await p.evaluate(SMALL); check(not small, f'[center] targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360, f'[center] no horizontal overflow at 360 {w}')
    await shot(p, 'phone-center-last')
    await p.click('#tnStartBowl'); await p.wait_for_selector('#qlStrike'); await qtap(p, '#qlStrike'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 2')")
    check(await p.query_selector('#tnLast') is None, '[center] gone once the night has a ball logged (nothing new during scoring)')
    await p.goto(BASE + '?cm3#/session/test-cm-2'); await p.wait_for_selector('#sessDetails'); await p.click('#sessDetails summary')
    await p.fill('#sessCenterNote', '  3rd arrow   hooked early  '); await p.dispatch_event('#sessCenterNote', 'change'); await p.wait_for_timeout(300)
    await p.evaluate("async () => { const m = await import('./js/hub.js'); const nw = await import('./js/cc/night.js'); await m.add('session.edited', nw.openNight(m.proj()), { fields: { ended: true } }); }")
    await p.goto(BASE + '?cm4#/tonight'); await open_folds(p); await p.wait_for_selector('#tnCenter'); await p.fill('#tnCenter', 'Test Lanes'); await p.dispatch_event('#tnCenter', 'change'); await p.wait_for_selector('#tnLastNote')
    nt = await p.text_content('#tnLastNote'); check(nt == 'Your note: 3rd arrow hooked early', f'[center] note from the session page shows next time ({nt})')
    check(not errs, f'[center] no page errors {errs[:3]}'); await c.close()

async def ownpat_cycle(b):
    # M2 (Sim2 #9): a pattern not in the Kegel list is kept as your own (no "pick from the list" dead end); length, volume and
    # ratio are optional behind one tap; an unknown length says 38 ft is assumed; a known one drives the pick; the library still works.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.goto(BASE + '?op#/bowl'); await p.wait_for_selector('#noBag'); await load_sample(p); await bowl_more(p); await p.wait_for_selector('#tnSetup')
    await p.fill('#tnPattern', 'Fridays house'); await p.dispatch_event('#tnPattern', 'change'); await p.wait_for_selector('#tnOwnPat')
    chip = await p.text_content('#tnSetup .fld .prov'); check(await p.input_value('#tnPattern') == 'Fridays house' and 'length not entered, 38 ft assumed' in chip, f'[ownpat] any name kept; unknown length labelled ({chip})')
    check(await p.eval_on_selector('#tnOwnPat', 'e => !e.open'), '[ownpat] details behind one tap')
    lv0 = await p.text_content('#tnLevel')
    await p.click('#tnOwnPat summary'); await p.fill('#tnOwnFt', '50'); await p.fill('#tnOwnMl', '35'); await p.fill('#tnOwnRatio', '3:1'); await p.click('#tnOwnSave')
    await p.wait_for_function("() => document.querySelector('#tnSetup .fld .prov').textContent.includes('50 ft')")
    lv = await p.text_content('#tnLevel'); check('demand 5' in lv and lv != lv0, f'[ownpat] entered length drives the demand ({lv0.strip()} -> {lv.strip()})')
    sv = await p.evaluate("async () => { const m = await import('./js/hub.js'); return Object.values(m.proj().sessions).map(x => [x.patternName, x.ft, x.ml, x.ratio, x.patternOwn]).find(x => x[4]); }")
    check(sv == ['Fridays house', 50, 35, 3, True], f'[ownpat] saved on the night as your entry {sv}')
    await axe_ok(p, '[ownpat]'); small = await p.evaluate(SMALL); check(not small, f'[ownpat] targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360, f'[ownpat] no horizontal overflow at 360 {w}')
    await shot(p, 'phone-own-pattern')
    await p.fill('#tnPattern', '2026 PBA Badger'); await p.dispatch_event('#tnPattern', 'change'); await p.wait_for_function("() => !document.querySelector('#tnOwnPat')")
    check('Kegel library' in await p.text_content('#tnSetup .fld .prov'), '[ownpat] picking from the library clears the own entry')
    check(not errs, f'[ownpat] no page errors {errs[:3]}'); await c.close()

async def aimdrag_cycle(b):
    # Owner bug 2026-10-24: "If I stand at the 25 board I should be able to aim at the 15 board. I can't drag that."
    # Touch drag on a 360 px phone: feet near the foul line, aim higher up; independent, no snap back, mirrored for lefties.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    drag = """async ([board, fy, lefty]) => { const c = document.querySelector('#lane'), r = c.getBoundingClientRect(), W = r.width, pl = W < 180 ? 22 : 30;
      const x = r.left + pl + (lefty ? board : 39 - board) / 39 * (W - pl - 8), y = fy < 0 ? r.bottom - 12 : r.top + r.height * fy, x0 = x + (x > r.left + W / 2 ? -40 : 40);
      const ev = (t, xx) => c.dispatchEvent(new PointerEvent(t, { clientX: xx, clientY: y, pointerType: 'touch', pointerId: 7, bubbles: true, isPrimary: true }));
      ev('pointerdown', x0); for (let i = 1; i <= 8; i++) { ev('pointermove', x0 + (x - x0) * i / 8); await new Promise(f => setTimeout(f, 16)); } ev('pointerup', x); }"""
    for hand in ['right', 'left']:
        lefty = hand == 'left'
        await p.goto(BASE); await p.evaluate("h => { localStorage.clear(); localStorage.setItem('ap_prefs', JSON.stringify({ onboarded: true })); localStorage.setItem('ap_profile', JSON.stringify({ hand: h })); }", hand)
        await p.goto(BASE + '?ad' + hand + '#/lane'); await p.wait_for_selector('#lineSum'); await p.wait_for_timeout(400)
        for feet, aim in [(25, 15), (35, 10), (10, 5)]:
            await p.evaluate(drag, [feet - 7, -1, lefty]); await p.wait_for_timeout(150)
            await p.evaluate(drag, [aim, 0.45, lefty]); await p.wait_for_timeout(700)
            st, am = await p.get_attribute('#lineSum', 'data-stand'), await p.get_attribute('#lineSum', 'data-aim')
            check(st == str(feet) and float(am) == aim, f'[aimdrag] {hand}: touch-drag stand {feet}, aim {aim} on 360 px (got stand {st}, aim {am})')
        await p.wait_for_timeout(600); am2 = await p.get_attribute('#lineSum', 'data-aim')
        check(float(am2) == 5, f'[aimdrag] {hand}: aim stays where it was dragged (no snap back) ({am2})')
        txt = await p.inner_text('#lineSum'); check('Aim' in txt and '5' in txt, f'[aimdrag] {hand}: line summary shows the aim board')
        note = await p.query_selector('#laneModelNote:not([hidden])'); check(note is not None, f'[aimdrag] {hand}: a wide line says it is a model limit (laydown shift), stand unchanged')
        await p.reload(); await p.wait_for_selector('#lineSum'); await p.wait_for_timeout(300)
        check(float(await p.get_attribute('#lineSum', 'data-aim')) == 5 and await p.get_attribute('#lineSum', 'data-stand') == '10', f'[aimdrag] {hand}: stand/aim survive a reload')
    check(not errs, f'[aimdrag] no console errors {errs[:2]}')
    await c.close()

async def drill_cycle(b):
    # M3: spare drill on practice nights (most-missed leaves, Made/Missed, never in a score), one optional process goal read
    # on the recap with its n ("10 of 10 single-pin spares made (100%) · goal 7 of 10"), never a "good job".
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.goto(BASE + '?dr#/bowl'); await p.wait_for_selector('#noBag'); await load_sample(p); await bowl_more(p); await p.wait_for_selector('#tnSetup')
    check(await p.query_selector('#tnDrill') is None, '[drill] not shown unless the night is practice')
    await p.click('#advEvent [data-event=practice]'); await p.wait_for_selector('#tnDrill')
    check(await p.eval_on_selector('#tnDrill', 'e => !e.open') and 'corner pins' in await p.text_content('#tnDrillFrom'), '[drill] behind one tap; no misses yet -> corner pins, said so')
    await p.click('#tnDrill summary'); await p.click('#tnDrill .drill-row[data-leave="10"] [data-drill=made]'); await p.wait_for_function("() => document.querySelector('#tnDrill summary').textContent.includes('1 of 1')")
    await p.wait_for_timeout(450); await p.click('#tnDrill .drill-row[data-leave="10"] [data-drill=miss]'); await p.wait_for_function("() => document.querySelector('#tnDrill summary').textContent.includes('1 of 2 made')")
    check(await p.eval_on_selector('#tnDrill', 'e => e.open') and 'tonight 1 of 2' in await p.text_content('#tnDrill .drill-row[data-leave="10"]'), '[drill] Made/Missed logged, card stays open, per-leave n shown')
    await axe_ok(p, '[drill]'); small = await p.evaluate(SMALL); check(not small, f'[drill] targets >= 44px {small[:6]}')
    w = await p.evaluate('[innerWidth, document.documentElement.scrollWidth]'); check(w[1] <= 360, f'[drill] no horizontal overflow at 360 {w}')
    await shot(p, 'phone-drill')
    await p.click('#tnGoal [data-v=single]'); await p.wait_for_selector('#tnGoalN'); await p.select_option('#tnGoalN', '7'); await p.wait_for_timeout(300)
    g = await p.evaluate("async () => { const m = await import('./js/hub.js'); const nw = await import('./js/cc/night.js'); return m.proj().sessions[nw.openNight(m.proj())].goal; }")
    check(g == {'k': 'single', 'target': 7}, f'[drill] one process goal saved on the night {g}')
    await p.evaluate("""async () => { const m = await import('./js/hub.js'); const nw = await import('./js/cc/night.js'); const sid = nw.openNight(m.proj()); let n = 0;
      for (let f = 1; f <= 10; f++) { await m.add('shot.logged', 'test-dr-' + n++, { sessionId: sid, game: 1, frame: f, roll: 1, down: 9, leave: [10] }); await m.add('shot.logged', 'test-dr-' + n++, { sessionId: sid, game: 1, frame: f, roll: 2, down: 1, leave: [] }); }
      await m.add('shot.logged', 'test-dr-' + n++, { sessionId: sid, game: 1, frame: 10, roll: 3, down: 9, leave: [10] }); }""")
    await p.goto(BASE + '?dr2#/tonight'); await p.wait_for_selector('#tnGoalResult')
    gt = await p.text_content('#tnGoalResult'); check(gt == 'Your goal: 10 of 10 single-pin spares made (100%) · goal 7 of 10 (70%).', f'[drill] goal read on the recap with its n ({gt})')
    check(not any(x in gt.lower() for x in ['good', 'great', 'well done', 'nice']), '[drill] informational, no praise words')
    sid = await p.evaluate("async () => { const m = await import('./js/hub.js'); const nw = await import('./js/cc/night.js'); return nw.openNight(m.proj()); }")
    await p.goto(BASE + '?dr3#/session/' + sid); await p.wait_for_selector('#sessGoal'); await p.click('#sessDetails summary')
    check('10 pin: 1 of 2 made' in await p.text_content('#sessDrill'), '[drill] session page lists the drill tries in Details')
    avg = await p.evaluate("async () => { const m = await import('./js/hub.js'); const c = await import('./js/cc/card.js'); const s = c.sessionsOf(m.proj())[0]; return s.games.length; }")
    check(avg == 1, f'[drill] drill tries add no game ({avg})')
    await p.evaluate("async () => { const m = await import('./js/hub.js'); const nw = await import('./js/cc/night.js'); const st = await import('./js/store.js'); st.setPrefs({ league: Object.assign({}, st.prefs().league, { myAvg: 180 }) }); await m.add('session.edited', nw.openNight(m.proj()), { fields: { event: 'league' } }); }")
    await p.goto(BASE + '?dr4#/session/' + sid); await p.wait_for_selector('#sessHead'); hd = await p.text_content('#sessHead')
    check('your 180 league average' in hd, f'[drill] session page recap uses the typed league average like Tonight (sim2 #8) ({hd})')
    check(not errs, f'[drill] no page errors {errs[:3]}'); await c.close()

async def aimbox_cycle(b):
    # Aim Box: default off (lane pixels unchanged, no pill); Overlays sheet turns it on; House = Baker 4.5-9.5 at 45 ft;
    # through/outside pill; Custom edges persist after reload; lefty mirror keeps the same read; Targeting + Compare show it.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 740})
    await seed(p); await p.goto(BASE + '#/lane'); await p.wait_for_selector('#ovBtn'); await p.wait_for_timeout(900)
    px = lambda: p.evaluate("document.querySelector('#lane').toDataURL()")
    off0 = await px()
    check(await p.eval_on_selector('#aimPill', 'e => e.hidden'), '[aimbox] default off: no pill')
    await p.click('#ovBtn'); await p.wait_for_selector('#ovSheet')
    tip = await p.text_content('#ovTip'); check('Best used on house shots' in tip, '[aimbox] tooltip text')
    await axe_ok(p, '[aimbox] overlays sheet (off)')
    await p.click('#ovSheet [aria-label="Aim Box"] [data-v="on"]'); await p.wait_for_selector('#ovBoxTxt')
    txt = await p.text_content('#ovBoxTxt'); check('4.5\u20139.5 at 43.5\u201346.5 ft' in txt and 'Baker' in txt, f'[aimbox] House preset = Baker box ({txt})')
    await axe_ok(p, '[aimbox] overlays sheet (on)'); small = await p.evaluate(SMALL); check(not small, f'[aimbox] sheet targets >= 44px {small[:6]}')
    await shot(p, 'phone-aimbox-sheet')
    await p.keyboard.press('Escape'); await p.wait_for_timeout(700)
    on1 = await px(); check(on1 != off0, '[aimbox] on: box drawn on the lane')
    pill = await p.text_content('#aimPill'); check(pill in ('Through zone', 'Outside zone', 'Beyond model') and not await p.eval_on_selector('#aimPill', 'e => e.hidden'), f'[aimbox] pill shows the read ({pill})')
    lbl = await p.get_attribute('#lane', 'aria-label'); check('Aim Box 4.5' in lbl, '[aimbox] canvas label includes the box')
    await shot(p, 'phone-aimbox-lane')
    # Custom: edges persist across reload
    await p.click('#ovBtn'); await p.click('#ovSheet [aria-label="Aim Box preset"] [data-v="custom"]'); await p.wait_for_selector('#ovB1')
    await p.click('#ovSheet [aria-label="Increase Outside edge (board)"]'); await p.wait_for_timeout(200)
    await p.keyboard.press('Escape'); await p.reload(); await p.wait_for_selector('#aimPill'); await p.wait_for_timeout(700)
    ab = await p.evaluate("JSON.parse(localStorage.getItem('ap_prefs')).aimBox")
    check(ab['on'] and ab['preset'] == 'custom' and ab['b1'] == 5, f'[aimbox] custom box persists ({ab})')
    check('Aim Box 5' in await p.get_attribute('#lane', 'aria-label'), '[aimbox] custom box drawn after reload')
    pr = await p.text_content('#aimPill')
    await p.evaluate("localStorage.setItem('ap_profile', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('ap_profile') || '{}'), {hand: 'left'})))")
    await p.reload(); await p.wait_for_selector('#aimPill'); await p.wait_for_timeout(700)
    check(await p.text_content('#aimPill') == pr, '[aimbox] lefty mirror: same read in own boards')
    await shot(p, 'phone-aimbox-lefty')
    await p.goto(BASE + '#/target'); await p.wait_for_selector('#tgOvBtn'); await p.wait_for_timeout(700)
    check(not await p.eval_on_selector('#tgAimPill', 'e => e.hidden'), '[aimbox] Targeting shows the Aim Box read')
    # sim2 #2: on tonight's 2026 PBA Shark (48 ft) the Sport box is board 17 at 50-52 ft, not the 45 ft preset's board 14.
    await p.goto(BASE + '?ab2#/tonight'); await p.wait_for_timeout(500)
    if await p.query_selector('#loadStarter'): await load_sample(p)
    await p.wait_for_selector('#tnStartBowl'); await open_folds(p); await p.wait_for_selector('#tnPattern'); await p.fill('#tnPattern', '2026 PBA Shark'); await p.press('#tnPattern', 'Enter'); await p.wait_for_timeout(500)
    await p.goto(BASE + '?ab3#/target'); await p.wait_for_selector('#tgOvBtn'); await p.click('#tgOvBtn'); await p.wait_for_selector('#ovSheet')
    await p.click('#ovSheet [aria-label="Aim Box preset"] [data-v="sport"]'); await p.wait_for_selector('#ovBoxTxt')
    txt = await p.text_content('#ovBoxTxt'); check('48 ft oil' in txt and 'board 17' in txt and '50\u201352 ft' in txt, f'[aimbox] Sport uses tonight\'s 48 ft length ({txt[:90]})')
    await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    # Off again: lane pixels back to the default
    await p.evaluate("localStorage.setItem('ap_profile', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('ap_profile') || '{}'), {hand: 'right'})))")
    await p.goto(BASE + '#/lane'); await p.wait_for_selector('#ovBtn'); await p.click('#ovBtn'); await p.click('#ovSheet [aria-label="Aim Box"] [data-v="off"]')
    await p.keyboard.press('Escape'); await p.wait_for_timeout(900)
    check(await p.eval_on_selector('#aimPill', 'e => e.hidden'), '[aimbox] off again: pill hidden')
    check(not errs, '[aimbox] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def oneline_cycle(b):
    # sim2 #1: ONE answer to "where do I stand / aim". For the bowler's pick and the Bag Advisor's start ball, on the house shot
    # and on 2026 PBA Shark, righty and lefty: Tonight's line == Targeting's first feet/eyes == Find's headline (js/cc/line.js).
    # The Aim Box never calls that line "Outside zone": Baker's 45 ft box is past the model's reach -> "Beyond model", explained.
    import re
    for hand in ('right', 'left'):
        for patn in (None, '2026 PBA Shark'):
            errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); tag = f'[oneline] {hand} {patn or "house"}:'
            await seed(p); await p.evaluate(f"localStorage.setItem('ap_profile', JSON.stringify({{hand: '{hand}'}}))")
            await p.goto(BASE + '?ol#/tonight'); await p.wait_for_timeout(600)
            if await p.query_selector('#loadStarter'): await load_sample(p); await p.wait_for_timeout(600)
            await p.click('[data-event=sport]'); await p.wait_for_timeout(400)
            if patn: await open_folds(p); await p.wait_for_selector('#tnPattern'); await p.fill('#tnPattern', patn); await p.press('#tnPattern', 'Enter'); await p.wait_for_timeout(600)
            await p.click('#tnStartBowl'); await bowl_more(p); await p.wait_for_selector('#tnStand')
            m = re.search(r'Feet (\d+) \u00b7 eyes ([\d.\u00bd]+)', await p.text_content('#tnStand')); tn = (int(m[1]), hb(m[2]))
            pick = await p.text_content('#tnPickName'); ma = re.search(r'Start with: (.+?), from feet (\d+), aim ([\d.\u00bd]+)', await p.text_content('#advStart'))
            await p.click('#tnFind'); await p.wait_for_selector('#tgFindLine', timeout=20000)
            pick_id = await p.input_value('#tgBall'); tg = (int(await p.text_content('#tgFeetVal')), hb(await p.text_content('#tgEyesVal'))); fl = await p.text_content('#tgFindLine')
            mf = re.search(r'stand (\d+), aim ([\d.\u00bd]+)', fl); fd = (int(mf[1]), hb(mf[2]))
            check(tn == tg == fd and pick in fl and 'same as Tonight' in fl, f'{tag} pick {pick}: Tonight {tn} = Targeting {tg} = Find {fd}')
            alt = await p.query_selector('#tgFindAlt')
            if alt: check((await alt.text_content()).startswith('Higher model pocket %'), f'{tag} a different search line is labelled as the model\'s alternative')
            if ma:
                matches = await p.evaluate("async name => { const [h,s,c]=await Promise.all([import('./js/hub.js'),import('./js/cc/status.js'),import('./js/cc/cats.js')]); return Object.values(h.proj().owned).filter(o=>s.shortName(o.name || c.catOf(o.catalogId)?.name)===name).map(o=>o.id); }", ma[1]); assert len(matches)==1, matches
                await p.select_option('#tgBall', value=matches[0]); await p.wait_for_timeout(300)
                tg2 = (int(await p.text_content('#tgFeetVal')), hb(await p.text_content('#tgEyesVal')))
                await p.click('#tgFind')
                for _ in range(80):
                    if ma[1] in ((await p.text_content('#tgFindLine')) or ''): break
                    await p.wait_for_timeout(100)
                mf = re.search(r'stand (\d+), aim ([\d.\u00bd]+)', await p.text_content('#tgFindLine')); fd2 = (int(mf[1]), hb(mf[2]))
                check((int(ma[2]), hb(ma[3])) == tg2 == fd2, f'{tag} advisor ball {ma[1]}: Tonight {ma[2]}/{ma[3]} = Targeting {tg2} = Find {fd2}')
                await p.select_option('#tgBall', value=pick_id); await p.wait_for_timeout(300)
            # Aim Box on (house preset) -> Targeting's pill for the recommended line
            await p.click('#tgOvBtn'); await p.wait_for_selector('#ovSheet'); await p.click('#ovSheet [aria-label="Aim Box"] [data-v="on"]'); await p.wait_for_timeout(200)
            await p.keyboard.press('Escape'); await p.wait_for_timeout(500)
            st, why = await p.eval_on_selector('#tgAimPill', 'e => [e.dataset.state, document.querySelector("#tgAimWhy").hidden ? "" : document.querySelector("#tgAimWhy").textContent]')
            check(st in ('through', 'beyond') and (st != 'beyond' or 'No modelled strike line reaches this box' in why), f'{tag} recommended line is never "Outside zone" unexplained ({st}; {why[:70]})')
            if hand == 'right' and not patn: await axe_ok(p, '[oneline] Targeting with Beyond model'); await shot(p, 'phone-oneline-beyond')
            check(not errs, f'{tag} no page errors ' + ' | '.join(errs[:2]))
            await c.close()

async def tonightfold_cycle(b):
    # IA P1.5: Tonight is the plan (lanes first), Bowl is the pad. League: <= 1110 px tall (P2: the Stand · Aim chip shares the hand row) at 360 wide, Start bowling and
    # Add a bowler inside the first 740 px, no first-ball card; Start bowling opens #/bowl; #/tonight with a game open lands on Bowl.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.evaluate("localStorage.setItem('ap_profile', JSON.stringify({hand: 'right', handSource: 'user-reported', style: 'tweener', speed: 15, rev: 300}))")
    await p.goto(BASE + '?tf#/tonight'); await p.wait_for_selector('#noBag, #tnStartBowl')
    if await p.query_selector('#loadStarter'): await load_sample(p)
    await p.wait_for_selector('#tnStartBowl')
    await p.click('#advEvent [data-event="league"]'); await p.wait_for_selector('#tnWho'); await p.wait_for_timeout(300)
    m = await p.evaluate("() => ({ h: document.scrollingElement.scrollHeight, sb: document.querySelector('#tnStartBowl').getBoundingClientRect().bottom + scrollY, ab: document.querySelector('#tnAddBowler').getBoundingClientRect().bottom + scrollY, who: document.querySelector('#tnWho').getBoundingClientRect().top < document.querySelector('#tnStartBowl').getBoundingClientRect().top, pad: !!document.querySelector('#qlStrike'), pick: !!document.querySelector('#tnPick'), extra: !document.querySelector('#tnExtra').open })")
    check(m['h'] <= 1110, f"[tonightfold] League Tonight <= 1110 px tall ({m['h']})")
    check(m['sb'] <= 740 and m['ab'] <= 740, f"[tonightfold] Start bowling ({round(m['sb'])}) and Add a bowler ({round(m['ab'])}) in the first 740 px")
    check(m['who'] and not m['pad'] and not m['pick'] and m['extra'], f'[tonightfold] Who\'s bowling above Start bowling; no pad, no first-ball card; extras folded {m}')
    t = await p.text_content('#tnHand'); check(t.startswith('Right-handed') and 'change' in t, f'[tonightfold] P1.6 "Right-handed \u00b7 change" visible ({t})')
    await p.click('#tnStartBowl'); await p.wait_for_selector('#qlStrike')
    check(p.url.endswith('#/bowl') and 'Game' in await p.text_content('.appbar h1'), f'[tonightfold] Start bowling opens the game page #/bowl ({p.url.split("#")[-1]})')
    await qtap(p, '#qlStrike'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 2')")
    await p.goto(BASE + '?tf2#/tonight'); await p.wait_for_selector('#qlStrike')
    check('#/bowl' in p.url, f'[tonightfold] #/tonight with a game open lands on the pad ({p.url.split("#")[-1]})')
    await p.evaluate("location.hash = '#/arsenal'"); await p.wait_for_timeout(300); await p.evaluate("location.hash = '#/tonight'"); await p.wait_for_selector('#qlStrike')
    check('Frame 2' in await p.text_content('#qlWhere'), '[tonightfold] Tonight tab keeps the game going')
    await axe_ok(p, '[tonightfold] bowl')
    check(not errs, '[tonightfold] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def ia5_cycle(b):
    # IA P2 (owner 2026-10-31): five tabs Tonight, Bowl, Results, Bag, Learn + a Me button; old hashes redirect; Help off by
    # default with the "?" toggle kept; Lane/Target from the Stand · Aim chip; Bowl shows no help bubbles even with Help on.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.goto(BASE + '?i5#/tonight'); await p.wait_for_selector('#noBag, #tnStartBowl')
    if await p.query_selector('#loadStarter'): await load_sample(p)
    await p.wait_for_selector('#tnStartBowl')
    tabs = await p.eval_on_selector_all('#tabs .tab', 'e => e.map(x => [x.dataset.tab, x.textContent.trim(), Math.round(x.getBoundingClientRect().height), Math.round(x.getBoundingClientRect().width)])')
    # HOME_GAME_FLOW (owner 2026-11-10): the Building is home; scoring is a game page with no tab (and no tab bar).
    check([t[1] for t in tabs] == ['Building', 'Bag', 'Results', 'Learn'], f'[ia5] four tabs Building, Bag, Results, Learn; no Bowl or More tab {[t[1] for t in tabs]}')
    check(all(t[2] >= 44 and t[3] >= 44 for t in tabs), f'[ia5] every tab >= 44 px {tabs}')
    for hsh, cur in [('#/tonight', 'tonight'), ('#/bowl', None), ('#/results', 'results'), ('#/bag', 'bag'), ('#/learn', 'learn')]:
        await p.evaluate(f"location.hash = '{hsh}'"); await p.wait_for_timeout(350)
        r = await p.evaluate("() => ({ cur: (document.querySelector('#tabs [aria-current=page]') || {}).dataset?.tab || null, me: !!document.querySelector('#meBtn'), help: !!document.querySelector('#helpToggle, [data-help-toggle], .help-toggle'), w: document.documentElement.scrollWidth, bar: getComputedStyle(document.querySelector('#tabs')).display, leave: !!document.querySelector('#tnLeave:not([hidden])') })")
        if cur: check(r['cur'] == cur and r['me'] and r['w'] <= 360, f'[ia5] {hsh}: {cur} tab current, Me button top-right, no overflow {r}')
        else: check(r['bar'] == 'none' and not r['me'] and not r['help'] and r['leave'] and r['w'] <= 360, f'[ia5] {hsh}: game page: no tab bar, no Me or Help, a Leave button, no overflow {r}')
    await p.click('#meBtn'); await p.wait_for_function("() => location.hash === '#/me' && document.querySelector('.appbar h1').textContent.includes('Me')")
    r = await p.evaluate("() => ({ cur: !!document.querySelector('#tabs [aria-current=page]'), bar: getComputedStyle(document.querySelector('#tabs')).display, title: document.querySelector('.appbar h1').textContent, me: !!document.querySelector('#meBtn') })")
    check(not r['cur'] and r['bar'] != 'none' and 'Me' in r['title'] and not r['me'], f'[ia5] Me opens #/me: no tab current, tab bar stays, no Me button on Me {r}')
    # v1.0 release: Me > About states the version, a plain privacy note, and opens outside links safely.
    ab = await p.evaluate("() => ({ v: (document.querySelector('#aboutVersion') || {}).textContent || '', priv: (document.querySelector('#aboutPrivacy') || {}).textContent || '', ext: [...document.querySelectorAll('.screen a[target=_blank]')].every(a => (a.rel || '').includes('noopener')), api: document.body.innerText.includes('onrender') })")
    check(ab['v'].startswith('Version 1.1.0') and 'account is optional' in ab['priv'] and 'No ads, no tracking' in ab['priv'] and ab['ext'] and not ab['api'], f'[release] Me > About: version 1.1.0, privacy note, outside links noopener, no server host shown {ab}')
    for old, new in [('#/sessions', '#/results'), ('#/arsenal', '#/bag?view=all'), ('#/more', '#/me'), ('#/patterns', '#/learn/patterns')]:
        await p.goto(BASE + '?i5r' + old); await p.wait_for_timeout(500)
        check(p.url.split('#')[-1] == new[1:], f'[ia5] redirect {old} -> {new} ({p.url.split("#")[-1]})')
    await p.goto(BASE + '?i5r#/sessions?x=1'); await p.wait_for_timeout(400); check(p.url.endswith('#/results?x=1'), f'[ia5] redirect keeps the query ({p.url.split("#")[-1]})')
    await p.goto(BASE + '?i5r#/arsenal'); await p.wait_for_selector('#bagView'); check(await p.get_attribute('#bagView [data-v="all"]', 'aria-pressed') == 'true' or await p.query_selector('#bagView [data-v="all"][aria-checked=true], #bagView [data-v="all"].on'), '[ia5] #/arsenal lands on Bag > All my balls')
    hp = await p.evaluate("() => JSON.parse(localStorage.getItem('ap_prefs') || '{}').help")
    check(not hp, f'[ia5] DECISIONS #32 kept: Help is off by default ({hp})')
    await p.goto(BASE + '?i5#/tonight'); await p.wait_for_selector('#tnAimChip')
    t = await p.text_content('#tnAimChip'); check('Stand' in t and 'Aim' in t, f'[ia5] Tonight: Stand · Aim chip ({t})')
    # Now item 3 (2026-11-02): one tap from the chip to Targeting (was Lane, then a second tap); Lane is one tap back.
    await p.click('#tnAimChip'); await p.wait_for_function("() => location.hash.startsWith('#/target') && document.body.dataset.tab === 'lane'")
    await p.wait_for_selector('#tgCoach'); check(True, '[now3] Aim chip opens Targeting in one tap')
    r = await p.evaluate("() => ({ cur: !!document.querySelector('#tabs [aria-current=page]'), bar: getComputedStyle(document.querySelector('#tabs')).display })")
    check(not r['cur'] and r['bar'] != 'none', f'[ia5] the chip opens Lane/Target: no tab current, bar visible {r}')
    # Bowl with a game open and Help ON: no help bubble and no card other than the now-line, the pad and the closed fold.
    await p.evaluate("() => { const x = JSON.parse(localStorage.getItem('ap_prefs') || '{}'); x.help = true; localStorage.setItem('ap_prefs', JSON.stringify(x)); }")
    await p.goto(BASE + '?i5b#/tonight'); await p.wait_for_selector('#tnStartBowl'); await p.click('#tnStartBowl'); await p.wait_for_selector('#qlStrike')
    await qtap(p, '#qlStrike'); await p.wait_for_function("() => document.querySelector('#qlWhere').textContent.includes('Frame 2')")
    r = await p.evaluate("""() => { const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; };
      const v = document.querySelector('#view'), fold = document.querySelector('#tnMore');
      return { dots: [...v.querySelectorAll('.help-dot')].filter(vis).filter(e => !(fold && !fold.open && fold.contains(e) && !e.closest('summary'))).map(e => e.dataset.help),
        cards: [...v.querySelectorAll('.card')].filter(vis).filter(e => !e.closest('#tnLog') && e.id !== 'tnNow' && !e.closest('#tnNow') && !(fold && fold.contains(e))).map(e => e.id || e.className),
        fold: fold ? !fold.open : true, chip: !!document.querySelector('#tnNow #tnAimChip') }; }""")
    check(not r['dots'], f'[ia5] Bowl (game open, Help on): 0 help bubbles {r["dots"]}')
    check(not r['cards'] and r['fold'] and r['chip'], f'[ia5] Bowl: now-line (with Stand · Aim chip) + pad only; extras folded {r}')
    await axe_ok(p, '[ia5] bowl'); await shot(p, 'ia5-bowl')
    check(not errs, '[ia5] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def task12_cycle(b):
    # IA P2: the top-12 task tap counts on the 5-tab layout (IA_PLAN §6 plan column, within +1). A tap on a field to type counts 1;
    # typing and Enter count 0. Each task starts on another tab, as a bowler would.
    errs = []; c = await ctx_for(b, 'phone'); p = await page(c, errs); await p.set_viewport_size({'width': 360, 'height': 780})
    await seed(p); await p.evaluate("localStorage.setItem('ap_profile', JSON.stringify({hand: 'right', handSource: 'user-reported', style: 'tweener', speed: 15, rev: 300}))")
    await p.goto(BASE + '?t12#/tonight'); await p.wait_for_selector('#noBag, #tnStartBowl')
    if await p.query_selector('#loadStarter'): await load_sample(p)
    await p.wait_for_selector('#tnStartBowl')
    plan = {1: 2, 2: 4, 3: 4, 4: 3, 5: 2, 6: 0, 7: 2, 8: 1, 9: 4, 10: 3, 11: 2, 12: 4}
    names = {1: 'Log a frame', 2: 'Start a league night', 3: 'Add a bowler', 4: "Pick tonight's bag", 5: 'Change ball mid-game', 6: 'Find stand/aim', 7: 'Look up a term', 8: "See last night's recap", 9: 'Add a ball', 10: 'Set handedness', 11: 'Export games', 12: 'Fix a past frame'}
    got = {}; n = [0]
    async def tap(sel, q=False):
        n[0] += 1
        if q: await qtap(p, sel)
        else: await p.click(sel)
    async def start(hsh): await p.goto(BASE + '?t12#' + hsh); await p.wait_for_timeout(400); n[0] = 0
    async def tab(t):
        # HOME_GAME_FLOW: the game page has no tab bar: one tap on Leave first; scoring is entered from the Building.
        if await p.query_selector('#tnLeave:not([hidden])'): await tap('#tnLeave'); await p.wait_for_timeout(300)
        await tap(f'#tabs [data-tab="{"tonight" if t == "bowl" else t}"]'); await p.wait_for_timeout(300)
        if t == 'bowl' and not await p.query_selector('#qlStrike'): await tap('#tnStartBowl'); await p.wait_for_timeout(300)
    async def task(k, fn):
        try: await fn(); got[k] = n[0]
        except Exception as e: got[k] = None; print(f'  task {k} failed: {str(e)[:160]}')
    async def t10():
        await start('/results'); await tab('tonight'); await tap('#tnHandChange'); await p.wait_for_selector('#handSheetL'); await tap('#handSheetL')
        await p.wait_for_function("() => (document.querySelector('#tnHand') || {}).textContent?.startsWith('Left-handed')")
        await p.evaluate("() => { const x = JSON.parse(localStorage.getItem('ap_profile')); x.hand = 'right'; localStorage.setItem('ap_profile', JSON.stringify(x)); }")
    async def t3():
        await start('/results'); await tab('tonight'); await tap('#advEvent [data-event="league"]'); await p.wait_for_selector('#tnAddBowler'); await tap('#tnAddBowler')
        await p.wait_for_timeout(300); sel = '#tnWho input[type=text], #tnWho input:not([type])'
        await tap(sel); await p.keyboard.type('Ann'); await p.keyboard.press('Tab'); await p.wait_for_timeout(300)
        nm = await p.evaluate("() => (JSON.parse(localStorage.getItem('ap_prefs') || '{}').league || {}).team || []")
        assert any(x.get('name') == 'Ann' for x in nm), nm
        await p.evaluate("() => { const x = JSON.parse(localStorage.getItem('ap_prefs')); x.league.team = []; localStorage.setItem('ap_prefs', JSON.stringify(x)); }")   # solo again for the next tasks
    async def t4():
        await start('/results'); await tab('tonight')
        if not await p.query_selector('#advEvent [data-event="league"][aria-pressed=true], #advEvent [data-event="league"][aria-checked=true]'): await tap('#advEvent [data-event="league"]')
        await tap('#tnStartBowl'); await p.wait_for_selector('#qlStrike')
        got[2] = n[0] + 1   # task 2 = the same path + the first throw
    async def t1():
        await start('/results'); await tab('bowl'); await p.wait_for_selector('#qlStrike'); w0 = await p.text_content('#qlWhere'); await tap('#qlStrike', True)
        await p.wait_for_function("w0 => document.querySelector('#qlWhere').textContent !== w0", arg=w0)
    async def t5():
        await start('/bowl'); await p.wait_for_selector('#qlBall'); await tap('#qlBall'); await p.wait_for_selector('#qlBallPick')
        cur = await p.text_content('#qlBall'); ids = await p.eval_on_selector_all('#qlBallPick [data-ball]', 'e => e.map(x => [x.dataset.ball, x.textContent])')
        other = next(i for i, t in ids if t.split('\u00b7')[0].strip()[:8] not in cur); await tap(f'#qlBallPick [data-ball="{other}"]')
        await p.wait_for_function("() => !document.querySelector('#qlBallPick')")
    async def t6():
        await start('/bowl'); await p.wait_for_selector('#tnAimChip'); t = await p.text_content('#tnAimChip'); assert 'Stand' in t and 'Aim' in t, t
    async def t7():
        await start('/bowl'); await tab('learn'); await tap('#lnSearch'); await p.keyboard.type('pocket'); await p.keyboard.press('Enter')
        await p.wait_for_function("() => location.hash.startsWith('#/glossary') && /pocket/i.test(document.querySelector('#view').textContent)")
    async def t8():
        await start('/bowl'); await tab('results'); await p.wait_for_selector('#resLast #resLastHead')
    async def t11():
        await start('/bowl'); await tab('results'); await p.wait_for_selector('#gamesCsv')
        async with p.expect_download(): await tap('#gamesCsv')
    async def t12():
        await start('/bowl')
        for _ in range(3): await qtap(p, '#qlStrike')
        n[0] = 0; await tab('results'); await tap('#resFix'); await p.wait_for_selector('.fix-game [data-fix="1"]'); await tap('.fix-game [data-fix="1"]')
        await p.wait_for_selector('[data-fixing]'); await tap('.fix-game [data-k="strike"]', True); await p.wait_for_selector('[data-undo-fix], [data-fix-msg]')
    async def t9():
        await start('/results'); await tab('bag'); await tap('#bagAdd'); await p.wait_for_selector('#abQ'); await p.wait_for_timeout(100)
        if not await p.evaluate("() => document.activeElement && document.activeElement.id === 'abQ'"): n[0] += 1
        await p.keyboard.type('Hy-Road')
        await p.wait_for_selector('#abList [data-pick]'); await tap('#abList [data-pick]'); await p.wait_for_selector('#abConfirm')
        if await p.query_selector('#abConfirm [data-v="15"]'): await tap('#abConfirm [data-v="15"]')
        if await p.query_selector('#abLevel'): await tap('#abLevel [data-v="5"]')
        await tap('#abSave'); await p.wait_for_function("() => !location.hash.startsWith('#/add-ball')")
    for k, fn in [(10, t10), (3, t3), (4, t4), (1, t1), (5, t5), (6, t6), (7, t7), (8, t8), (11, t11), (12, t12), (9, t9)]: await task(k, fn)
    rows = [(k, names[k], plan[k], got.get(k)) for k in sorted(plan)]
    for k, nm, pl, g in rows: check(g is not None and g <= pl + 1, f'[task12] {k:>2}. {nm}: {g} taps (plan {pl})')
    tot = sum(g for _, _, _, g in rows if g is not None); print(f'  task12 total: {tot} taps (plan 31)')
    try: open(os.path.join(ART, 'task12.json'), 'w').write(json.dumps({'tasks': [{'k': k, 'task': nm, 'plan': pl, 'taps': g} for k, nm, pl, g in rows], 'total': tot}, indent=1))
    except OSError: pass
    check(not errs, '[task12] no page errors ' + ' | '.join(errs[:2]))
    await c.close()

async def account_cycle(b):
    # Optional accounts (2026-10-31): signed out works; create -> recovery key -> add this phone's data -> second phone signs in and gets it;
    # sign out keeps data; delete needs the password. Mock API only (nothing reaches production).
    errs = []; m = MockEvents()
    async def phone(dev):
        c = await b.new_context(viewport={'width': 414, 'height': 896}, is_mobile=True, has_touch=True); c.set_default_timeout(10000)
        await c.route(API, m.handle); p = await page(c, errs); await p.goto(BASE); await p.evaluate(WIPE)
        await p.evaluate(f"localStorage.setItem('ap_prefs', JSON.stringify({{onboarded:true}})); localStorage.setItem('ap_device', '{dev}')"); return c, p
    c1, p = await phone('d-e2e-acct-0001')
    await p.goto(BASE + '?acct1#/tonight'); await p.wait_for_selector('#noBag')
    check(await p.locator('#acctSignIn, #acctCreate, #acctSheet').count() == 0, '[account] Tonight never asks to sign in')
    await load_sample(p); await p.wait_for_function("() => window.__apSync", timeout=15000); await apx(p, 'window.__apSync.run()')
    n = len(m.mine('d-e2e-acct-0001')); check(n == 0 and not m.authlog and await apx(p, 'window.__apSync.outbox()') > 0, f'[account] signed out: local only, no default backup-code copy ({n} events, 0 account calls)')
    await p.goto(BASE + '?acct2#/more'); await p.wait_for_selector('#accountCard #acctCreate')
    sz = await p.evaluate("['#acctSignIn','#acctCreate'].map(s => document.querySelector(s).getBoundingClientRect().height)")
    check(min(sz) >= 44, f'[account] Me: Sign in / Create account are 44 px {sz}')
    priv = await p.text_content('#aboutPrivacy'); check('account is optional' in priv and 'export or delete' in priv, '[account] privacy note explains the optional account')
    await shot(p, 'phone-me-signin')
    await p.click('#acctCreate'); await p.wait_for_selector('#acctSheet #acctEmail')
    await p.fill('#acctEmail', 'e2e@example.com'); await p.fill('#acctPass', 'short'); await p.click('#acctSubmit')
    check('8 characters' in await p.text_content('#acctErr'), '[account] short password: plain error, nothing sent')
    await p.fill('#acctPass', 'e2e-password-1'); await p.click('#acctSubmit'); await p.wait_for_selector('#recKeySheet #recKey')
    check((await p.text_content('#recKey')) == 'RKEY-user1-0000', '[account] recovery key shown once after create')
    check(await apx(p, "JSON.parse(localStorage.getItem('ap_account')).pending === true") and not m.mine('u:user1'), '[account] nothing goes to the account before the choice')
    await p.click('#recDone'); await p.wait_for_selector('#migSheet #migAdd')
    await shot(p, 'phone-me-migrate')
    await p.click('#migAdd'); await p.wait_for_function(f"() => window.__apSync && window.__apSync.state().code === 'acct:user1' && window.__apSync.outbox() === 0", timeout=15000)
    ev = await apx(p, "window.__apData.events()")
    check(len(m.mine('u:user1')) == ev, f"[account] 'Add this phone's data': all {ev} events in the account ({len(m.mine('u:user1'))})")
    check(all(a for (_, path, a, d) in m.authlog if path.startswith('/api/account')) and all(d is None for (_, path, a, d) in m.authlog), '[account] account calls use the bearer token, never the backup code')
    await p.wait_for_selector('#accountCard #acctWho'); check('e2e@example.com' in await p.text_content('#acctWho'), '[account] Me shows who is signed in')
    # Second phone: sign in, no local data -> no migration question, pull gives the same arsenal.
    c2, q = await phone('d-e2e-acct-0002')
    await q.goto(BASE + '?acct3#/more'); await q.wait_for_selector('#acctSignIn'); await q.click('#acctSignIn')
    await q.fill('#acctEmail', 'e2e@example.com'); await q.fill('#acctPass', 'wrong-password'); await q.click('#acctSubmit')
    await q.wait_for_function("() => document.querySelector('#acctErr').textContent.length > 0"); check('wrong' in await q.text_content('#acctErr'), '[account] wrong password: plain error')
    await q.fill('#acctPass', 'e2e-password-1'); await q.click('#acctSubmit')
    await q.wait_for_function(f"() => window.__apData && window.__apData.events() === {ev}", timeout=15000)
    check(await q.locator('#migSheet').count() == 0, '[account] empty phone: no migration question')
    h1, h2 = await apx(p, "window.__apData.hash()"), await apx(q, "window.__apData.hash()")
    check(h1 == h2, '[account] second phone signed in: identical arsenal and history')
    await q.goto(BASE + '?acct4#/arsenal'); await q.wait_for_selector('#armBag'); await q.wait_for_timeout(300)
    nb = await q.locator('#armBag .ped, #armBag [data-ball], #armBag button').count(); check(nb > 0, f'[account] signed-in arsenal shows the synced balls ({nb})')
    await shot(q, 'phone-arsenal-signedin')
    # Isolation: a different account sees none of it.
    c3, r = await phone('d-e2e-acct-0003'); await r.goto(BASE + '?acct5#/more'); await r.click('#acctCreate')
    await r.fill('#acctEmail', 'other@example.com'); await r.fill('#acctPass', 'other-password'); await r.click('#acctSubmit'); await r.wait_for_selector('#recDone'); await r.click('#recDone')
    await r.wait_for_function("() => window.__apSync && window.__apSync.state().code === 'acct:user2'", timeout=15000); await apx(r, "window.__apSync.run()")
    check(await apx(r, "window.__apData.events()") == 0, '[account] another account gets none of user1\'s data')
    # Sign out keeps the phone's data; delete needs the password and removes the server copy.
    await q.goto(BASE + '?acct6#/more'); await q.click('#acctSignOut'); await q.click('#soKeep'); await q.wait_for_selector('#acctSignIn')
    check(await apx(q, "window.__apData.events()") == ev, '[account] sign out keeps data on this phone')
    await p.goto(BASE + '?acct7#/more'); await p.click('#acctMore summary'); await p.click('#acctDelete'); await p.fill('#delPass', 'nope-nope'); await p.click('#delConfirm')
    await p.wait_for_function("() => document.querySelector('#delErr').textContent.length > 0"); check('user1' in m.users, '[account] delete with the wrong password does nothing')
    await p.fill('#delPass', 'e2e-password-1'); await p.click('#delConfirm'); await p.wait_for_selector('#acctSignIn')
    check('user1' not in m.users and not m.mine('u:user1') and await apx(p, "window.__apData.events()") == ev, '[account] delete: account and server copy gone, phone keeps its data')
    check(not errs, f'[account] no page errors {errs[:3]}')
    for c in (c1, c2, c3): await c.close()

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
        steps = [('account', lambda: account_cycle(b)), ('tonightfold', lambda: tonightfold_cycle(b)), ('ia5', lambda: ia5_cycle(b)), ('task12', lambda: task12_cycle(b)), ('sim', lambda: sim_cycle(b)), ('protect', lambda: protect_cycle(b)), ('alley', lambda: alley_cycle(b)), ('phone', lambda: run(b, 'phone')), ('desktop', lambda: run(b, 'desktop')), ('deck', lambda: deck_cases(b)), ('migration', lambda: migration(b)), ('data', lambda: data_cycle(b)), ('csv', lambda: csv_cycle(b)), ('ltx', lambda: ltx_cycle(b)), ('tonight', lambda: tonight_cycle(b)), ('advisor', lambda: advisor_cycle(b)), ('card', lambda: card_cycle(b)), ('quicklog', lambda: quicklog_cycle(b)), ('scoring', lambda: scoring_cycle(b)), ('bag', lambda: bag_cycle(b)), ('onebag', lambda: onebag_cycle(b)), ('bagsize', lambda: bagsize_cycle(b)), ('whynot', lambda: whynot_cycle(b)), ('gametotal', lambda: gametotal_cycle(b)), ('corner', lambda: corner_cycle(b)), ('export', lambda: export_cycle(b)), ('addball', lambda: addball_cycle(b)), ('target', lambda: targeting_cycle(b)), ('aimbox', lambda: aimbox_cycle(b)), ('oneline', lambda: oneline_cycle(b)), ('armory', lambda: armory_cycle(b)), ('help', lambda: help_cycle(b)), ('guide', lambda: guide_cycle(b)), ('hand', lambda: hand_cycle(b)), ('status', lambda: status_cycle(b)), ('center', lambda: center_cycle(b)), ('ownpat', lambda: ownpat_cycle(b)), ('drill', lambda: drill_cycle(b)), ('aimdrag', lambda: aimdrag_cycle(b)), ('sync', lambda: sync_cycle(b)), ('offline', lambda: offline(b))]
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
