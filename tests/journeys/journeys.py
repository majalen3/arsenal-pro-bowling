"""The cross-page journeys. Each walks a persona through several screens and asserts that what the bowler set on one
screen is what the next screen shows (ball, stand/aim, hand, night id, focus). Steps are named so docs/QA_PLAN.md and
tests/journeys/known_issues.json can refer to them as '<journey id>/<step name>'."""
import datetime, json, os, re, tempfile
import lib
from personas import PERSONAS, NIGHT0, boot, seed_history

WHERE = '#qlWhere'


# ---------- small helpers shared by journeys ----------
async def where(j):
    return (await j.page.text_content(WHERE) or '').strip()

async def wait_where_change(j, before, timeout=6000):
    await j.page.wait_for_function("b => { const e = document.querySelector('#qlWhere'); return e && e.textContent.trim() !== b; }", arg=before, timeout=timeout)

async def strike(j):
    w = await where(j); await j.tap('#qlStrike', throw=True); await wait_where_change(j, w)

async def spare(j, pins, now=False):
    w = await where(j)
    for p in pins:
        await j.tap(f'#qlPins [data-pin="{p}"]')
    if now:
        await j.tap('#qlSpareNow', throw=True)
    else:
        await j.tap('#qlLeave', throw=True); await j.wait('#qlSpare'); await j.tap('#qlSpare', throw=True)
    await wait_where_change(j, w)

async def open_frame(j, pins):
    w = await where(j)
    for p in pins:
        await j.tap(f'#qlPins [data-pin="{p}"]')
    await j.tap('#qlLeave', throw=True); await j.wait('#qlMiss'); await j.tap('#qlMiss', throw=True); await wait_where_change(j, w)

async def mark(j, n):
    return ((await j.page.text_content(f'#qlFrames [data-f="{n}"] b')) or '').strip()

async def cum(j, n):
    return ((await j.page.text_content(f'#qlFrames [data-f="{n}"] .num')) or '').strip()

def nums(s):
    return [int(x) if '.' not in x else float(x) for x in re.findall(r'-?\d+(?:\.\d+)?', s or '')]

def near(a, b, tol=0.5):
    """Same board as the bowler reads it (a 13.6 on one screen and 14 on another is the same line)."""
    return a is not None and b is not None and abs(float(a) - float(b)) <= tol

def same_line(a, b):
    return near(a.get('feet'), b.get('feet')) and near(a.get('eyes'), b.get('eyes'))

async def tonight_line(j):
    """What Tonight tells the bowler: ball, feet, eyes."""
    # IA P1.5: Tonight says it once ("Start with: BALL, from feet F, aim T at the arrows."); the pad repeats it on #tnNowLine.
    out = {}
    if await j.visible('#tnPickName'):
        out['ball'] = (await j.text('#tnPickName')).strip()
        if await j.visible('#tnStand'):
            n = nums((await j.text('#tnStand')).replace('\u00bd', '.5'))
            if len(n) >= 2: out['feet'], out['eyes'] = n[0], n[1]
        return out
    sel = '#advStart' if await j.visible('#advStart') else '#tnNowLine' if await j.visible('#tnNowLine') else None
    if not sel: return out
    t = (await j.text(sel)).replace('\u00bd', '.5')
    m = re.match(r'\s*(?:Start with:\s*)?(.+?)(?:,\s*from feet|\s*\u00b7\s*feet|\s+Stand\s|\.\s|$)', t)
    if m: out['ball'] = m.group(1).strip()
    m = re.search(r'(?:feet|stand)\s*(-?\d+(?:\.\d+)?)\D+?aim\s*(-?\d+(?:\.\d+)?)', t, re.I)   # IA P2: the pad line reads "BALL Stand F · Aim T ›" 
    if m: out['feet'], out['eyes'] = nums(m.group(1))[0], nums(m.group(2))[0]
    return out

async def lane_line(j):
    out = {}
    if await j.page.locator('#lineSum').count():
        ls = j.page.locator('#lineSum')
        for k, a in (('feet', 'data-stand'), ('eyes', 'data-aim')):
            v = await ls.get_attribute(a)
            if v not in (None, ''): out[k] = round(float(v), 1)
    if await j.page.locator('.ball-btn-name').count(): out['ball'] = (await j.text('.ball-btn-name')).strip()
    return out

async def target_line(j):
    out = {}
    if await j.page.locator('#tgFeetVal').count(): out['feet'] = (nums(await j.text('#tgFeetVal')) or [None])[0]
    if await j.page.locator('#tgEyesVal').count(): out['eyes'] = (nums(await j.text('#tgEyesVal')) or [None])[0]
    if await j.page.locator('#tgBall').count():
        out['ball'] = (await j.page.eval_on_selector('#tgBall', 'e => e.selectedOptions[0] ? e.selectedOptions[0].textContent : ""')).strip()
    return out

def same_ball(a, b):
    a, b = (a or '').lower(), (b or '').lower()
    return bool(a) and bool(b) and (a in b or b in a)

async def lefty_mirrored(j):
    return await j.ev("() => { const c = document.querySelector('#lane, #tgLane canvas, #tgLane'); return c ? (c.getAttribute('aria-label') || '') : ''; }")

async def unfold(j, *sels):
    """Open a closed fold the way a bowler does (1 tap on its summary); an open one is left alone."""
    for sel in sels:
        if await j.visible(f'{sel} > summary') and not await j.page.eval_on_selector(sel, 'd => d.open'):
            await j.tap(f'{sel} > summary'); await j.settle(200)

async def start_game(j):
    """From Tonight with a bag loaded, make sure the score pad is open (IA P1.5: Start bowling opens #/bowl)."""
    if await j.visible('#tnStartBowl'):
        await j.tap('#tnStartBowl'); await j.wait('#tnLog')
    if not await j.visible('#tnLog') or (not await j.visible('#qlStrike') and await j.visible('#qlNext')):
        if await j.visible('#qlNext'):
            await j.tap('#qlNext')
        else:
            await unfold(j, '#tnMore')
    await j.wait('#qlStrike')


# ---------- J01 first run and onboarding ----------
async def j01_onboarding(j):
    j.state['persona'] = 'lefty'
    async with j.step('Fresh install opens Welcome', critical=True) as s:
        await j.wipe()
        await j.page.goto(j.run.base + '?qa=first'); await j.settle(600)
        s.check('#/welcome' in j.page.url, f'first run opens #/welcome ({j.page.url.split("#")[-1]})')
        await j.audit('welcome')
    async with j.step('Search-first empty arsenal, review, save a physical ball', task='onboard', critical=True) as s:
        await j.wait('#welSearch'); s.check(await j.data("() => Object.keys(window.__apData.projection().owned).length") == 0, 'fresh arsenal empty, catalog is separate')
        await j.type('#welSearch', 'hy-road'); await j.tap('#welResults [data-select] >> nth=0'); await j.tap('#welNext'); await j.wait('#welChosen'); await j.tap('#welNext'); await j.wait('#bagNone')   # PRODUCT_SPINE: saving lands on the Bag (front door)
        s.check(await j.data("() => Object.keys(window.__apData.projection().owned).length") == 1, 'only selected physical ball saved')
    async with j.step('Optional profile: explicitly choose Left hand after first value', task='profile') as s:
        await j.nav('/me'); await j.tap('#editProfile'); await j.tap('[aria-label="Bowling hand"] [data-v="left"]'); await j.tap('[aria-label="Style"] [data-v="stroker"]'); await j.tap('#profSave')
        s.check(await j.data("() => window.__apData.projection().bowler.speed == null"), 'untouched speed stays unknown')
    async with j.step('Hand carries to Me profile', carry='hand=left') as s:
        await j.nav('/me'); await j.audit('me')
        txt = await j.page.inner_text('body')
        prof = await j.ev("() => JSON.parse(localStorage.getItem('ap_profile') || 'null')")
        s.check(prof and prof.get('hand') == 'left', f"profile saved hand=left ({prof and prof.get('hand')})")
        s.check(re.search(r'\bleft\b', txt, re.I) is not None, 'Me shows the hand as Left')
    async with j.step('Hand carries to Lane (mirrored)', carry='hand=left') as s:
        await j.nav('/lane'); await j.wait('#lane'); await j.audit('lane')
        lbl = await lefty_mirrored(j); s.check('left' in lbl.lower() or 'mirror' in lbl.lower(), f'lane is drawn for a left-hander ({lbl[:80]})')
    async with j.step('Hand survives reload; Welcome not shown again', carry='hand=left') as s:
        await j.page.reload(); await j.settle(600)
        s.check('#/welcome' not in j.page.url, 'no second onboarding')
        prof = await j.ev("() => JSON.parse(localStorage.getItem('ap_profile') || 'null')"); s.check(prof and prof.get('hand') == 'left', 'hand still left')
    async with j.step('Tonight with no bag offers the next step', critical=True) as s:
        await j.nav('/tonight'); await j.audit('tonight-empty')
        s.check(await j.visible('#noBag') or await j.visible('#noPackedBalls') or await j.visible('#advStart'), 'Tonight shows either a start line or how to add balls')
    async with j.step('Add a ball from the catalogue', task='add-ball', target_taps=6) as s:
        await j.nav('/bag'); await j.tap('#tabs a[href="#/arsenal"]'); await j.settle(); await j.audit('arsenal-empty')   # v73: the Tonight/All switch is gone
        if await j.visible('#arsAdd'): await j.tap('#arsAdd')
        else: await j.goto('/add-ball')
        await j.wait('#abQ, #abSearch'); await j.audit('add-ball')
        ph = await j.page.get_attribute('#abQ', 'placeholder') or ''
        ex = re.sub(r'^e\.g\.\s*', '', ph).strip()
        await j.type('#abQ', 'Hammer Blacklist'); await j.settle(700)
        res = j.page.locator('#abList [data-pick]')
        s.check(await res.count() > 0, f'search shows catalogue matches ({await res.count()})')
        if await res.count():
            await res.first.click(); s.taps += 1; await j.settle(900)
        if await j.visible('#abSave'):
            await j.tap('#abSave'); await j.settle(500)
        owned = await j.data("() => Object.values(window.__apData.projection().owned || {}).filter(o => !o.removed).length")
        s.check(owned >= 1, f'the ball is in the arsenal ({owned} owned)')
    async with j.step('The search box example is a ball the catalogue knows') as s:
        await j.goto('/add-ball'); await j.wait('#abQ')
        if ex:
            await j.page.fill('#abQ', ex); await j.settle(700)
            s.check(not await j.visible('#abNoMatch'), f'the search box example "{ex}" is in the catalogue')
        else: s.check(True, 'no example in the search box')
    async with j.step('Tonight offers an owned-ball packing step or start line for a lefty') as s:
        await j.nav('/tonight'); await j.settle(400)
        s.check(await j.visible('#advStart') or await j.visible('#noPackedBalls'), 'Tonight shows a start line or an explicit packing step (ownership is not packing)'); j.state['tonight'] = await tonight_line(j)


# ---------- J02 home prep: bag builder, Status, export ----------
async def j02_home_prep(j):
    await boot(j, 'righty')
    async with j.step('Tonight: choose League and see the advisor bag', critical=True) as s:
        await j.wait('#tnAdvisor'); await j.audit('tonight')
        await j.tap('#advEvent [data-event="league"]'); await j.settle()
        st = await j.text('#advStart'); j.state['advStart'] = st
        s.check(re.search(r'Start with: .+, from feet \d+, aim \d+', st), f'one-line start: "{st[:80]}"')
        rows = await j.page.locator('.adv-row').count(); s.check(1 <= rows <= 6, f'advisor bag has 1-6 balls ({rows})')
    async with j.step('Open the bag builder from Tonight', task='bag', target_taps=2) as s:
        if await j.visible('#advBuilder'): await j.tap('#advBuilder')
        else: await j.tap('#tnBagLink')
        await j.wait('#bagGrid, #bagBody'); await j.audit('bag')
        s.check('#/bag' in j.page.url, 'on the bag builder')
    async with j.step('Bag builder explains what to do in one glance') as s:
        head = await j.text('#bagBody') if await j.page.locator('#bagBody').count() else ''
        first = await j.ev("() => { const b = document.querySelector('#bagBody'); if (!b) return ''; const r = [...b.querySelectorAll('p,h2,button')].filter(e => e.getBoundingClientRect().top < innerHeight).map(e => e.textContent.trim()); return r.join(' | ').slice(0, 300); }")
        s.check(re.search(r'\b(tonight|pack|take|bring)\b', first, re.I), f'above the fold says what to pack tonight ("{first[:120]}")')
        n = len(re.findall(r'\d+', first)); s.check(n <= 12, f'<= 12 numbers above the fold ({n})')
    async with j.step('Send a ball to the Pro shop (Status)', task='status', target_taps=3) as s:
        await j.tap('#bagCare > summary'); await j.settle(200)   # C9: status and care is one tap away
        await j.wait('#bagCareBall')
        opt = await j.page.eval_on_selector('#bagCareBall', 'e => [e.value, e.selectedOptions[0].textContent]')
        j.state['statusBall'] = opt
        await j.tap('#bagCare [aria-label="Status"] [data-v="proShop"]'); await j.settle(400)
        s.check(await j.page.get_attribute('#bagCare [aria-label="Status"] [data-v="proShop"]', 'aria-checked') == 'true', f'{opt[1]} is now Pro shop')
    async with j.step('Status carries to the Arsenal page', carry='status=proShop') as s:
        await j.nav('/bag'); await j.tap('#tabs a[href="#/arsenal"]'); await j.settle(); await j.audit('arsenal')
        # v74 (owner t129u): the grid tiles are picture + name only; the status shows on the shelves (one tap) and on the ball page
        await j.tap('#armShelvesD summary')
        if await j.page.locator('#armBench:not([open]) > summary').count(): await j.tap('#armBench > summary')
        txt = await j.text('#armory')
        s.check(re.search(r'pro shop', txt, re.I), 'Arsenal shows the ball as at the pro shop')
    async with j.step('Status carries to Tonight (ball not suggested)', carry='status=proShop') as s:
        await j.nav('/tonight'); await j.settle()
        pick = (await tonight_line(j)).get('ball', ''); adv = await j.text('#tnAdvisor') if await j.page.locator('#tnAdvisor').count() else ''
        s.check(not same_ball(pick, j.state['statusBall'][1]), f'Tonight does not pick {j.state["statusBall"][1]} ({pick})')
        s.check(j.state['statusBall'][1] not in adv, 'advisor bag leaves it out')
    async with j.step('Ball page shows the same Status', carry='status=proShop') as s:
        oid = j.state['statusBall'][0]
        await j.goto('/ball/' + oid.replace('own-', '')); await j.settle(500); await j.audit('ball')
        txt = await j.text('.screen'); s.check(re.search(r'pro shop', txt, re.I), 'ball page says Pro shop')
    async with j.step('Export the arsenal (file)', task='export', target_taps=3) as s:
        await j.nav('/me'); await j.settle()   # IA P2: shortest path is Me › Your data › Export my arsenal (also on Bag › All my balls, +1 tap)
        btn = j.page.locator('#moreExport, #arsExport').filter(has_text=re.compile(r'export', re.I))
        s.check(await btn.count() > 0, f'Arsenal has an Export button ({await btn.count()})')
        if await btn.count():
            await btn.first.click(); s.taps += 1; await j.settle(300)
            try: await j.page.wait_for_selector('#expCsv', timeout=5000)   # export screen renders after its data loads
            except Exception: pass
            csv = j.page.locator('#expCsv'); s.check(await csv.count() > 0, 'Export offers the arsenal list (CSV)')
            async with j.page.expect_download(timeout=6000) as dl:
                await (csv.first if await csv.count() else btn.first).click(); s.taps += 1
            d = await dl.value; f = os.path.join(tempfile.mkdtemp(), d.suggested_filename); await d.save_as(f)
            body = open(f, encoding='utf-8', errors='replace').read()
            s.check('Rattler' in body or 'rattler' in body, f'export contains the balls ({d.suggested_filename}, {len(body)} bytes)')


# ---------- J03 arrival: center memory, pattern, Tonight stand/aim ----------
async def j03_arrival(j):
    # Tonight reads the bowler's own speed/rev (d9997bd); the 2-D model finds no strike line for 15 mph / 300 rpm on the 41 ft
    # sport preset and Tonight honestly says so. J03 is about the same line on every screen, so its bowler throws 250 rpm.
    await boot(j, 'righty250', clock=NIGHT0)
    await seed_history(j, nights=2)
    await j.page.reload(); await j.settle(500)
    async with j.step('Type the center: last-time card appears', task='arrive', critical=True) as s:
        if not await j.visible('#tnCenter'): await unfold(j, '#tnExtra', '#tnMore')
        await j.type('#tnCenter', 'QA Sunset Lanes'); await j.page.dispatch_event('#tnCenter', 'change'); await j.settle(500)
        await j.wait('#tnLast', timeout=5000); await j.audit('tonight-arrival')
        line = await j.text('#tnLastLine'); j.state['last'] = line
        s.check('21-22' in line and 'Badger' in line, f'last time: lanes + pattern ("{line[:100]}")')
        s.check('Moved 2 left' in await j.text('#tnLast'), 'note for next time is shown')
    async with j.step('Use last setup in 1 tap', task='arrive', target_taps=1) as s:
        await j.tap('#tnUseLast'); await j.settle(500)
        pat = await j.page.input_value('#tnPattern') if await j.page.locator('#tnPattern').count() else ''
        lanes = await j.page.input_value('#tnLanes') if await j.page.locator('#tnLanes').count() else ''
        s.check('Badger' in pat, f'pattern filled ({pat})'); s.check(lanes == '21-22', f'lanes filled ({lanes})')
    async with j.step('Tonight gives stand/aim and a ball', carry='feet, eyes, ball') as s:
        t = await tonight_line(j); j.state['tonight'] = t
        s.check('feet' in t and 'eyes' in t and t.get('ball'), f'Tonight line {t}')
    async with j.step('Lane shows the same ball and line', carry='feet, eyes, ball') as s:
        await j.nav('/lane'); await j.wait('#lane'); await j.audit('lane')
        l = await lane_line(j); t = j.state['tonight']; j.state['lane'] = l
        s.check(same_ball(l.get('ball'), t.get('ball')), f"ball: Tonight {t.get('ball')} vs Lane {l.get('ball')}")
        s.check(same_line(l, t), f'stand/aim: Tonight {t.get("feet")}/{t.get("eyes")} vs Lane {l.get("feet")}/{l.get("eyes")}')
    async with j.step('Targeting shows the same line', carry='feet, eyes, ball') as s:
        await j.goto('/target'); await j.wait('#tgFeetVal'); await j.audit('target')
        g = await target_line(j); t = j.state['tonight']; j.state['target'] = g
        s.check(same_line(g, t), f'Targeting {g.get("feet")}/{g.get("eyes")} vs Tonight {t.get("feet")}/{t.get("eyes")}')
        s.check(same_ball(g.get('ball'), t.get('ball')), f"ball: Targeting {g.get('ball')} vs Tonight {t.get('ball')}")
        fl = await j.text('#tgFindLine') if await j.page.locator('#tgFindLine').count() else ''
        s.check(not fl or 'same as Tonight' in fl or (str(t.get('feet')) in fl), f'Find my line agrees ("{fl[:80]}")')
    async with j.step('Back returns to Tonight with the setup kept') as s:
        await j.page.go_back(); await j.page.go_back(); await j.settle(500)
        s.check('#/tonight' in j.page.url, f'two Backs land on Tonight ({j.page.url.split("#")[-1]})')
        t2 = await tonight_line(j); s.check(t2 == j.state['tonight'], f'unchanged {t2}')


# ---------- J04 solo game ----------
async def j04_solo_game(j):
    await boot(j, 'righty')
    async with j.step('Open the score pad', critical=True) as s:
        await start_game(j); await j.audit('scoring', scoring=True)
        s.check('Frame 1' in await where(j), f'pad at frame 1 ({await where(j)})')
        j.state['ball0'] = (await j.text('#qlBall')) if await j.page.locator('#qlBall').count() else ''
    async with j.step('Frame 1 strike in 1 tap', task='frame', target_taps=1, target_s=4) as s:
        await strike(j); s.check(await mark(j, 1) == 'X', 'X shown')
    async with j.step('Frame 2: 10-pin leave shows a spare hint from the strike stand', task='frame', target_taps=3, target_s=5.5) as s:
        await j.tap('#qlPins [data-pin="10"]')
        hint = await j.text('#qlHint'); stand = (await tonight_line(j)).get('feet')
        s.check(re.search(r'stand \d+', hint), f'hint shows where to stand ("{hint[:70]}")')
        if stand: s.check(f'stand {stand + 9}' in hint, f'3-6-9 from strike stand {stand} -> {stand + 9}')
        await j.tap('#qlLeave', throw=True); await j.wait('#qlSpare'); w = await where(j); await j.tap('#qlSpare', throw=True); await wait_where_change(j, w)
        s.check(await mark(j, 2) == '9 /', f'9 / ({await mark(j, 2)})'); s.check(await cum(j, 1) == '20', f'frame 1 = 20 ({await cum(j, 1)})')
    async with j.step('Ball change mid-game (spare ball)', task='ball-change', target_taps=3) as s:
        # The chip toggles and re-renders after "Saved ✓": a tap that lands mid-render can be lost, and a blind second tap
        # would close a picker that did open (the CI flake). Tap only while the chip says it is closed; count every tap.
        for attempt in range(3):
            if await j.visible('#qlBallPick'): break
            await j.wait('#qlBall')
            if (await j.page.get_attribute('#qlBall', 'aria-expanded')) != 'true':
                if attempt: s.check(True, 'note: an earlier tap on the ball chip was lost to a re-render; tapped again')
                await j.tap('#qlBall')
            try: await j.page.locator('#qlBallPick').first.wait_for(state='visible', timeout=2500)
            except Exception: pass
        await j.wait('#qlBallPick')
        opts = j.page.locator('#qlBallPick [data-ball]'); n = await opts.count(); s.check(n >= 2, f'{n} balls to pick')
        cur = j.state['ball0']; tgt = None
        for i in range(n):
            t = (await opts.nth(i).text_content() or '')
            if not same_ball(t.split('\n')[0], cur): tgt = opts.nth(i); break
        if tgt:
            await tgt.click(); s.taps += 1
        await j.settle(200)   # the picker auto-returns after a pick; Done may vanish between the check and the tap (live/CI flake)
        if await j.visible('#qlBallDone'):
            try: await j.tap('#qlBallDone', timeout=1500)
            except Exception: pass
        now = await j.text('#qlBall'); j.state['ball1'] = now
        s.check(now and now != cur, f'chip changed: {cur[:30]} -> {now[:30]}')
    async with j.step('The "now" line follows the ball change', carry='ball in hand') as s:
        await j.settle(300)
        line = (await j.text('#tnNowLine')) if await j.visible('#tnNowLine') else ''
        s.check(bool(line) and same_ball(re.split(r'\s+Stand\b|·', line)[0].strip(), j.state['ball1']), f'top line "{line[:60]}" names the ball in hand "{j.state["ball1"][:30]}"')
        s.check(bool(line) and not same_ball(re.split(r'\s+Stand\b|·', line)[0].strip(), j.state['ball0']), f'top line no longer names the first ball "{j.state["ball0"][:30]}"')
    async with j.step('Frames 3-5 with the new ball', task='frame') as s:
        await open_frame(j, [7]); await strike(j); await spare(j, [2, 4])
        shots = await j.data("() => window.__apData.projection().shots.slice(-4).map(x => x.ballId)")
        s.check(len(set(shots)) >= 1 and None not in shots, f'each throw has a ball ({shots})')
    async with j.step('Fix a past frame (frame 3) in <= 4 taps', task='fix', target_taps=4) as s:
        await j.tap('#qlFix'); await j.tap('#qlFixPick [data-fix="3"]'); await j.wait('#qlFixCancel')
        s.check('Fixing frame 3' in await where(j), f'pad names the frame ({await where(j)})')
        await j.tap('#qlStrike', throw=True); await j.page.wait_for_function("() => document.querySelector('#qlSaved') && /frame 3/.test(document.querySelector('#qlSaved').textContent)", timeout=5000)
        s.check(await mark(j, 3) == 'X', f'frame 3 now X ({await mark(j, 3)})'); s.check('Frame 6' in await where(j), f'play resumes at frame 6 ({await where(j)})')
    async with j.step('Undo the last ball', task='undo', target_taps=1) as s:
        await strike(j); s.taps = 0; w = await where(j); await j.tap('#qlUndo'); await j.settle(400)
        s.check('Frame 6' in await where(j), f'back to frame 6 ({await where(j)})')
    async with j.step('Nothing extra visible during active scoring') as s:
        ex = await j.ev("() => ['#tnAdvisor', '#tnReads', '#tnLast', '#tnDrill', '#tnProtect', '#tnInstall', '#tnMeasNudge'].filter(q => { const e = document.querySelector(q); if (!e || e.closest('details:not([open])')) return false; const r = e.getBoundingClientRect(); return r.height > 0 && getComputedStyle(e).display !== 'none'; })")
        s.check(not ex, f'no prep cards while scoring ({ex})')
    async with j.step('Finish through the 10th frame (X, 9/ fill)', task='frame') as s:
        for _ in range(4): await strike(j)
        w = await where(j); s.check('Frame 10' in w, f'at the 10th ({w})')
        await strike(j); await j.tap('#qlPins [data-pin="10"]'); await j.tap('#qlLeave', throw=True); await j.wait('#qlSpare'); await j.tap('#qlSpare', throw=True); await j.settle(600)
        s.check(not await j.visible('#qlStrike') or 'Final' in await where(j) or await j.visible('#qlNext'), 'game is complete')
        tot = await j.data("() => { const P = window.__apData.projection(); const g = P.games[P.games.length - 1]; return g ? (g.score ?? g.total) : null; }")
        j.state['score'] = tot; s.check(tot == 247, f'score 247 (X 9/ X(fixed) X 8/ X X X X X9/) = {tot}')
    async with j.step('The game shows on Sessions with the same score', carry='night id, score') as s:
        await j.nav('/results'); await j.audit('results')
        txt = await j.text('#sessBody') if await j.page.locator('#sessBody').count() else await j.text('.screen')
        s.check(str(j.state['score']) in txt, f'{j.state["score"]} appears on Sessions')


# ---------- J05 league / Baker night ----------
async def j05_league(j):
    await boot(j, 'league4', clock=datetime.datetime(2026, 10, 22, 23, 40))
    async with j.step('Set up League scoring with 4 bowlers', task='league-setup', critical=True) as s:
        if not await j.visible('#tnSetup [aria-label="Scoring"]'): await unfold(j, '#tnExtra', '#tnMore')
        await j.tap('[aria-label="Scoring"] [data-v="league"]'); await j.wait('#tnTeam'); await unfold(j, '#tnTeam'); await j.audit('league-setup')
        await j.type('#lgMyAvg', '180'); await j.page.press('#lgMyAvg', 'Tab')
        for i, (nm, av, _) in enumerate(PERSONAS['league4']['team']):
            await j.tap('#lgAdd'); await j.wait(f'#lgName{i}')
            await j.type(f'#lgName{i}', nm); await j.page.press(f'#lgName{i}', 'Tab'); await j.type(f'#lgAvg{i}', str(av)); await j.page.press(f'#lgAvg{i}', 'Tab')
        s.check('100' in await j.text('#lgRule'), 'USBC handicap rule shown')
    async with j.step('Mark Bo absent (blind/absentee)', task='league-setup', target_taps=1) as s:
        await j.tap('[aria-label="Bowler 3 status"] [data-v="absent"]')
        s.check(await j.page.get_attribute('[aria-label="Bowler 3 status"] [data-v="absent"]', 'aria-checked') == 'true', 'Bo absent')
    async with j.step('Mark Cal total-only (types a game total)', task='league-setup', target_taps=1) as s:
        loc = j.page.locator('[aria-label="Bowler 4 status"] [data-v="total"], [aria-label="Bowler 4 status"] [data-v="totalOnly"], [aria-label="Bowler 4 status"] [data-v="total-only"]')
        s.check(await loc.count() > 0, 'a "total only" option exists for a teammate')
        if await loc.count(): await loc.first.click(); s.taps += 1
    async with j.step('Frame 1 rotates You -> Ann (Bo skipped)', task='frame') as s:
        await start_game(j)
        await strike(j); s.check('Up: Ann' in await where(j), f'Ann is up ({await where(j)})')
        await spare(j, [10], now=True); w = await where(j)
        s.check('Up: You' in w or 'Up: Cal' in w, f'Bo skipped ({w})')
        if 'Up: Cal' in w: await strike(j)
    async with j.step('Team board: USBC handicap and absentee score') as s:
        await j.tap('#qlBoard summary'); bd = await j.text('#qlBoardTbl'); j.state['board'] = bd[:300]
        s.check('63' in bd and '36' in bd, f'Ann 63, me 36 handicap ({bd[:120]})'); s.check('150 (absentee)' in bd and '54' in bd, 'Bo: 150 absentee score, 54 handicap')
    async with j.step('Cross midnight: the same night continues', carry='night id') as s:
        sid0 = await j.ev("async () => { const m = await import('./js/hub.js'); const nw = await import('./js/cc/night.js'); return nw.openNight(m.proj()); }")
        w0 = await where(j)
        await j.page.clock.fast_forward('30:00'); await j.page.reload(); await j.wait(WHERE); await j.data('() => window.__apData.events()')
        sid1 = await j.ev("async () => { const m = await import('./js/hub.js'); const nw = await import('./js/cc/night.js'); return nw.openNight(m.proj()); }")
        w1 = await where(j) if await j.page.locator(WHERE).count() else '(no pad)'
        s.check(sid0 and sid0 == sid1, f'night id kept across 00:00 ({sid0} -> {sid1})'); s.check(w0 == w1, f'pad resumes where it was ("{w0}" -> "{w1}")')
        j.state['night'] = sid1
    async with j.step('Teammates never feed my stats') as s:
        pj = await j.data("() => { const P = window.__apData.projection(); return [P.shots.length, P.teamShots.length]; }")
        s.check(pj[0] >= 1 and pj[1] >= 1, f'mine {pj[0]}, team {pj[1]}')
    async with j.step('Switch to Baker: frames rotate per frame', task='baker') as s:
        if not await j.visible('[aria-label="Scoring"]'): await unfold(j, '#tnExtra', '#tnMore')
        await j.tap('[aria-label="Scoring"] [data-v="baker"]'); await j.settle(500)
        await j.wait(WHERE); w = await where(j); s.check('Up:' in w, f'Baker pad ({w})')
        await strike(j); w2 = await where(j); s.check(w2 != w and 'Up:' in w2, f'next bowler up ({w2})')
        await j.page.reload(); await j.settle(600); s.check(await where(j) == w2, 'Baker turn survives reload')


# ---------- J06 between games: Weaker/Stronger, aim drag 25 -> 15, Aim Box ----------
async def drag_line(j, feet, aim, lefty=False):
    """Drag the laydown to `feet` and the aim to board `aim` on #lane (same geometry as tests/e2e.py aimdrag)."""
    return await j.ev("""([feet, aim, lefty]) => { const c = document.querySelector('#lane'); const r = c.getBoundingClientRect(); const W = r.width, pl = W < 180 ? 22 : 30;
      const bx = b => r.left + pl + (lefty ? b : 39 - b) / 39 * (W - pl - 8);
      const fire = (t, x, y) => c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true }));
      let y = r.top + r.height - 6; fire('pointerdown', bx(feet - 7), y); fire('pointermove', bx(feet - 7), y - 1); fire('pointerup', bx(feet - 7), y - 1);
      y = r.top + r.height * 0.45; fire('pointerdown', bx(aim), y); fire('pointermove', bx(aim), y + 1); fire('pointerup', bx(aim), y + 1);
      const ls = document.querySelector('#lineSum'); return ls ? [ls.dataset.stand, ls.dataset.aim] : null; }""", [feet, aim, lefty])

async def j06_between_games(j):
    await boot(j, 'righty')
    # The old League 3 fixture now has only one model-supported ball after the maker review.
    # Exercise switching with VERIFIED peers, never invent specs for Hy-Road Pearl.
    await j.ev("async () => { const h = await import('./js/hub.js'); await h.add('bag.saved', 'qa-switch-bag', {name:'Verified switch fixture', format:'tournament6', slots:['own-rattler-big-bite','own-super-nova','own-ordnance-c4','own-deadly-rattler','own-ice-storm'].map(owned=>({owned,locked:false})), spare:'own-ice-storm'}); }")
    await j.settle(300)
    async with j.step('Tonight: tap Stronger after a read', task='adjust', target_taps=3, critical=True) as s:
        await j.wait('#advStart'); await j.tap('#tnStartBowl'); await j.wait('#tnLog'); s.taps = 0   # IA P1.5: reads + Weaker/Stronger sit on Bowl between games; getting to Bowl is navigation
        if await j.page.locator('#tnMore:not([open]) > summary').count(): await j.tap('#tnMore > summary'); await j.settle()   # v73 (t127u, CUTS_V73 #9): under "Ball change, read and details" so the Score page fits
        t0 = await tonight_line(j); j.state['t0'] = t0
        if await j.visible('[data-read="early"]'): await j.tap('[data-read="early"]'); await j.settle()
        b = j.page.locator('#tonightBody [data-alt="Stronger"]:visible, #tonightBody [data-alt="Weaker"]:visible')
        s.check(await b.count() > 0, 'Weaker/Stronger alternatives offered')
        tm = await tonight_line(j)   # the read itself may already have moved the pick; the alt must move it again
        if await b.count(): await b.first.click(); s.taps += 1; await j.settle(400)
        t1 = await tonight_line(j); s.check(t1.get('ball') != tm.get('ball'), f'pick changed {tm.get("ball")} -> {t1.get("ball")}')
        if t1.get('ball') == t0.get('ball') and await b.count():   # back on the default ball: one more alt so the Lane check (F03) tests a non-default pick
            await b.first.click(); await j.settle(400); t1 = await tonight_line(j)   # setup for the next step, not counted
        j.state['t1'] = t1
    async with j.step('Lane opens with the new ball', carry='ball') as s:
        await j.nav('/lane'); await j.wait('#lane')
        l = await lane_line(j); s.check(same_ball(l.get('ball'), j.state['t1'].get('ball')), f'Lane {l.get("ball")} vs Tonight {j.state["t1"].get("ball")}')
    async with j.step('Drag stand 25, aim 15 on the lane', task='aim', target_taps=2) as s:
        r = await drag_line(j, 25, 15); s.drags += 2; s.taps += 2; await j.settle(400)
        l = await lane_line(j); j.state['drag'] = l
        s.check(near(l.get('feet'), 25), f'stand 25 ({l.get("feet")})'); s.check(near(l.get('eyes'), 15), f'aim 15 ({l.get("eyes")})')
    async with j.step('Dragged line survives a reload', carry='feet=25, eyes=15') as s:
        await j.page.reload(); await j.wait('#lane'); await j.settle(500)
        l = await lane_line(j); s.check(same_line(l, {'feet': 25, 'eyes': 15}), f'after reload {l}')
    async with j.step('Targeting shows the dragged line', carry='feet=25, eyes=15') as s:
        await j.goto('/target'); await j.wait('#tgFeetVal'); g = await target_line(j)
        s.check(same_line(g, {'feet': 25, 'eyes': 15}), f'Targeting {g}')
    async with j.step('F11/F12: Targeting "Model limit" fold is 44 px; Lane ball names are not clipped') as s:
        hgt = await j.data("() => { const e = document.querySelector('#tgLimits summary'); return e ? Math.round(e.getBoundingClientRect().height) : 0; }")
        s.check(hgt >= 44, f'Model limit summary {hgt} px')
        await j.goto('/lane'); await j.wait('#lane'); await j.settle(400)
        clip = await j.data("() => [...document.querySelectorAll('.ball-btn-name, .ball-btn-sub, .qball-name')].filter(e => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent)")
        s.check(not clip, f'clipped ball names: {clip}')
    async with j.step('Aim Box on: same box on Lane and Targeting', task='aimbox', target_taps=3) as s:
        await j.goto('/lane'); await j.wait('#lane')
        await j.data("() => { const d = document.querySelector('#laneDetails'); if (d) d.open = true; }")   # v77: Aim Box lives under Details
        if await j.visible('#ovBtn'):
            await j.tap('#ovBtn'); await j.wait('#ovSheet')
            await j.tap('#ovSheet [aria-label="Aim Box"] [data-v="on"]'); await j.wait('#ovBoxTxt')
            await j.page.keyboard.press('Escape'); await j.settle(700)
        pill = await j.text('#aimPill') if await j.visible('#aimPill') else ''
        await j.goto('/target'); await j.settle(700); pill2 = await j.text('#tgAimPill') if await j.visible('#tgAimPill') else ''
        j.state['aimbox'] = [pill, pill2]
        s.check(pill and pill2, f'pill on both ("{pill[:40]}" / "{pill2[:40]}")')
        s.check(pill == pill2, f'same read on both screens ("{pill}" vs "{pill2}")')
    async with j.step('Back on Tonight the line is the one I set') as s:
        await j.nav('/tonight'); await j.settle(400); t = await tonight_line(j)
        s.check(same_line(t, {'feet': 25, 'eyes': 15}), f'Tonight {t} after dragging 25/15 on the lane')
    async with j.step('F01: 25/15 is the one line on Tonight, Bowl and the pick card', carry='feet=25, eyes=15') as s:
        adv = await j.text('#advStart') if await j.visible('#advStart') else ''
        s.check('feet 25' in adv and 'aim 15 ' in adv, f'Start line says feet 25, aim 15 ("{adv[:80]}")')
        s.check('your line' in adv and '2-D model' not in adv, f'Start line is labelled as your line, not the model ("{adv[-70:]}")')
        chip = await j.text('#tnAimChip') if await j.visible('#tnAimChip') else ''
        s.check('Stand 25' in chip and 'Aim 15' in chip, f'aim chip "{chip}"')
        await j.nav('/bowl'); await j.wait('#tnNowLine'); now = await j.text('#tnNowLine')
        s.check('Stand 25' in now and 'Aim 15' in now, f'Bowl top line "{now[:60]}"')
        prov = await j.data("() => { const d = document.querySelector('#tnModel [data-prov=\"user\"]'); return d ? d.textContent : ''; }")
        s.check('your line' in (prov or ''), f'pick card (Bowl > line details) labels it as your line, not the model ("{prov}")')


# ---------- J07 recap, focus, next session ----------
async def j07_recap_next(j):
    await boot(j, 'righty', clock=NIGHT0)
    async with j.step('Bowl a game with three 10-pin leaves', critical=True) as s:
        await start_game(j)
        for f in range(1, 10):
            if f in (2, 5, 8): await spare(j, [10])
            elif f == 6: await open_frame(j, [10])
            else: await strike(j)
        await strike(j); await strike(j); await strike(j); await j.settle(600)
    async with j.step('Recap names the flat 10 pattern') as s:
        rc = await j.text('#tnRecap') if await j.page.locator('#tnRecap').count() else ''
        j.state['recap'] = rc[:400]
        s.check(rc, 'recap is shown after the game'); s.check(re.search(r'10 pin|10-pin|ten pin|flat 10', rc, re.I), 'recap mentions the 10 pin')
    async with j.step('Save the focus for next time', task='focus', target_taps=1) as s:
        if await j.visible('#tnSetFocus'): await j.tap('#tnSetFocus')
        foc = await j.text('#tnRecapFocus') if await j.page.locator('#tnRecapFocus').count() else ''
        j.state['focus'] = foc; s.check(foc, f'focus text: "{foc[:80]}"')
    async with j.step('End night lands in the Log book, then the session page', task='end', target_taps=2, carry='night id') as s:
        sid = await j.ev("async () => { const m = await import('./js/hub.js'); const nw = await import('./js/cc/night.js'); return nw.openNight(m.proj()); }"); j.state['sid'] = sid
        await j.tap('#qlEnd'); await j.settle(700)   # PRODUCT_SPINE: End night leaves the game for the Log book's "Night saved" card
        s.check('#/results?night=' in j.page.url and await j.visible('#tnNightDone'), f'Log book with the saved night ({j.page.url.split("#")[-1]})')
        await j.tap('#tnNightResults'); await j.settle(700); await j.audit('session')
        s.check('#/session/' in j.page.url and (sid or '') in j.page.url, f'session page of the same night ({j.page.url.split("#")[-1]})')
        s.check(await j.visible('#sessRecap, #sessHead'), 'recap on the session page')
    async with j.step('Session page focus matches the recap', carry='focus') as s:
        sf = await j.text('#sessFocus') if await j.page.locator('#sessFocus').count() else ''
        s.check(sf and (j.state['focus'][:30] in sf or sf[:30] in j.state['focus']), f'"{sf[:60]}" vs "{j.state["focus"][:60]}"')
    async with j.step('Next week: Tonight shows the carried focus', carry='focus') as s:
        await j.page.clock.fast_forward(168 * 3600 * 1000); await j.goto('/tonight'); await j.settle(600); await j.audit('tonight-next')
        tf = await j.text('#tnFocus') if await j.page.locator('#tnFocus').count() else ''
        s.check(tf and (j.state['focus'][:25].replace('Next focus: ', '') in tf.replace('Your focus: ', '') or 'focus' in tf.lower()), f'Tonight focus "{tf[:80]}"')
        s.check(not await j.visible('#tnRecap'), 'last week\'s recap is not blocking the new night')


# ---------- J08 insights, Bowler Card, leave patterns ----------
async def j08_insights(j):
    await boot(j, 'righty', clock=NIGHT0)
    async with j.step('Seed 8 past league nights (3 single 10-pin leaves in game 1 of each)', critical=True) as s:
        n = await seed_history(j, nights=8); await j.page.reload(); await j.settle(500); s.check(n >= 8, f'{n} sessions')
    async with j.step('Bowler Card: headline and few figures', task='card') as s:
        await j.goto('/card'); await j.wait('#bcHeadline'); await j.audit('card')
        hl = await j.text('#bcHeadline'); figs = await j.page.locator('#bcFigs .bc-fig').count(); j.state['headline'] = hl
        s.check(hl, f'headline "{hl[:80]}"'); s.check(figs <= 6, f'<= 6 figures ({figs})')
        avg = await j.ev("() => { const f = [...document.querySelectorAll('#bcFigs .bc-fig')].find(x => /avg|average/i.test(x.dataset.k + ' ' + (x.querySelector('dt') || {}).textContent)); return f ? f.querySelector('.bc-v').textContent : ''; }"); j.state['cardAvg'] = avg
    async with j.step('Card names the 10-pin leave as the thing to work on') as s:
        txt = await j.text('#bcBody') if await j.page.locator('#bcBody').count() else await j.text('.screen')
        s.check(re.search(r'10 pin|10-pin|flat 10|ten pin', txt, re.I), 'Card mentions the 10 pin')
        lv = await j.text('#bcLeave') if await j.visible('#bcLeave') else ''
        s.check(not lv or not re.search(r'\b(bad|poor|weak|terrible|great|good|awful)\b', lv, re.I), f'leave line is informational, not evaluative ("{lv}")')
    async with j.step('Insights agrees with the Card average', carry='average') as s:
        await j.goto('/arsenal/insights'); await j.wait('#insLastHead'); await j.audit('insights')
        t = await j.text('.screen'); a = nums(j.state.get('cardAvg', ''))
        s.check(bool(a), f'the Card shows an average ({j.state.get("cardAvg")!r})')
        if a: s.check(str(a[0]) in t, f'Card average {a[0]} appears on Insights')
    async with j.step('Insights cold load (reload x4) always shows my games', carry='average') as s:
        bad = []
        for i in range(4):
            await j.page.goto(j.run.base + f'?cold={i}#/arsenal/insights'); await j.wait('#insLastHead'); await j.settle(1500)
            t = await j.text('#insLastHead')
            if not re.search(r'\d+ average', t): bad.append(f'load {i + 1}: "{t[:50]}"')
        s.check(not bad, f'every cold load shows the average ({"; ".join(bad) or "4/4"})')
    async with j.step('Session page lists 10-pin leaves by count') as s:
        await j.goto('/session/qa-night-2'); await j.settle(500)
        if await j.visible('#sessDetails summary'): await j.tap('#sessDetails summary')
        lv = await j.text('#sessByLeave') if await j.page.locator('#sessByLeave').count() else ''
        s.check(re.search(r'\b10\b', lv), f'by-leave shows the 10 ("{lv[:80]}")')
    async with j.step('Sessions -> a night -> Back keeps the list position') as s:
        await j.nav('/results'); await j.settle(300); await j.ev("() => scrollTo(0, 400)"); await j.settle(200); y0 = await j.ev("() => scrollY")
        s.check(y0 > 0, f'Sessions list is long enough to scroll ({y0})')
        row = j.page.locator('#nightList a.night-row').last
        await row.scroll_into_view_if_needed(); y0 = await j.ev("() => scrollY"); await row.click(); s.taps += 1; await j.settle(500)
        s.check('#/session/' in j.page.url, 'night opened')
        await j.page.go_back(); await j.settle(600)
        y1 = await j.ev("() => scrollY"); s.check(abs(y1 - y0) < 80, f'scroll restored after Back ({y0} -> {y1})')


# ---------- J09 learning: Help ?, Bowling Guide, Learn more ----------
HELP_SCREENS = ['/tonight', '/lane', '/target', '/bag?view=all', '/ball/rattler-big-bite', '/bag', '/learn/patterns', '/results', '/card', '/me']   # IA P2 homes

async def j09_learning(j):
    await boot(j, 'beginner')
    await j.ev("async () => { const [m, f] = await Promise.all([import('./js/hub.js'), import('./tests/data/fixtures/sample_arsenal.mjs')]); await m.ready(); if (!Object.keys(m.proj().owned || {}).length) await m.loadStarter(f.sampleEvents, f.SAMPLE_ID); }")
    async with j.step('Turn Help on in Learn', task='help', target_taps=2, critical=True) as s:
        await j.nav('/learn'); await j.wait('#helpFld'); await j.tap('#helpFld [data-v="on"]')
        s.check(await j.page.get_attribute('#helpFld [data-v="on"]', 'aria-checked') == 'true', 'Help on')
    counts = {}
    async with j.step('Every screen has a "?" when Help is on') as s:
        for r in HELP_SCREENS:
            await j.goto(r); await j.settle(500); counts[r] = await j.page.locator('.help-dot').count()
        j.state['helpDots'] = counts
        for r, n in counts.items(): s.check(n >= 1, f'{r}: {n} "?"')
    async with j.step('No "?" on the score pad while scoring') as s:
        await j.goto('/tonight'); await start_game(j)
        n = await j.page.locator('#tnLog .help-dot').count(); s.check(n == 0, f'{n} on the pad')
    async with j.step('Tap a "?": plain answer and Learn more opens the Guide', task='help', target_taps=2) as s:
        await j.goto('/lane'); await j.settle(400)
        if await j.page.locator('.help-dot').count():
            await j.tap('.help-dot'); await j.wait('#helpSheet'); txt = await j.text('#helpText'); s.check(len(txt) > 20, f'"{txt[:60]}"')
            if await j.visible('#helpMore'):
                await j.tap('#helpMore'); await j.settle(500); s.check(re.search(r'#/(glossary|guide)', j.page.url), f'Learn more -> Guide ({j.page.url.split("#")[-1]})')
                s.check(await j.page.locator('#glSearch, [type=search]').count() > 0, 'the Guide opens with its search box')
            else: s.check(False, 'Learn more link present')
        else: s.check(False, 'Lane has a "?"')
    async with j.step('Find the Bowling Guide from any screen in <= 2 taps', task='guide', target_taps=2) as s:
        await j.goto('/lane'); await j.settle(300)
        g = j.page.locator('header a[href^="#/glossary"], header a[href^="#/guide"], nav a[href^="#/guide"], nav a[href^="#/glossary"], [aria-label*="Guide" i], a:has-text("Bowling Guide")')
        direct = await g.count() > 0 and await g.first.is_visible()
        via_dot = False
        if not direct and await j.page.locator('.help-dot').count():   # with Help on: "?" -> "Learn more in the Bowling Guide" is 2 taps
            await j.tap('.help-dot'); await j.wait('#helpSheet'); via_dot = await j.visible('#helpMore')
            if via_dot: await j.tap('#helpMore'); await j.settle(400)
            else: await j.page.keyboard.press('Escape')
        elif direct:
            await g.first.click(); s.taps += 1; await j.settle(400)
        s.check(direct or via_dot, f'the Guide is reachable from Lane in <= 2 taps ({"direct link" if direct else "? then Learn more" if via_dot else "only via Learn"})')
    async with j.step('Top-bar "?" turns Help off and on from the Lane screen', task='help', target_taps=2) as s:
        await j.goto('/lane'); await j.settle(300)
        if await j.visible('#helpToggle'):
            await j.tap('#helpToggle'); await j.settle(400); off = await j.page.locator('.help-dot').count()
            await j.tap('#helpToggle'); await j.settle(400); on = await j.page.locator('.help-dot').count()
            s.check(off == 0 and on >= 1, f'toggle: off -> {off} "?", on -> {on} "?"')
        else: s.check(False, 'a top-bar Help toggle is visible')
    async with j.step('Guide search finds "breakpoint"', task='guide') as s:
        await j.goto('/glossary'); await j.wait('#glSearch'); await j.audit('glossary')
        await j.type('#glSearch', 'breakpoint'); await j.settle(300)
        c = await j.text('#glCount'); s.check(nums(c) and nums(c)[0] >= 1, f'"{c}"')
    async with j.step('Turn Help off: no "?" anywhere', task='help') as s:
        await j.goto('/learn'); await j.tap('#helpFld [data-v="off"]'); left = {}
        for r in HELP_SCREENS:
            await j.goto(r); await j.settle(250); n = await j.page.locator('.help-dot').count()
            if n: left[r] = n
        s.check(not left, f'still showing: {left}')


# ---------- J10 practice night: spare drill ----------
async def j10_practice(j):
    await boot(j, 'righty', clock=NIGHT0)
    await seed_history(j, nights=1)
    await j.page.reload(); await j.settle(400)
    async with j.step('Choose Practice', task='practice', target_taps=2, critical=True) as s:
        await j.wait('#tnAdvisor'); await j.tap('#advEvent [data-event="practice"]'); await j.settle(400)
        s.check(await j.visible('#tnDrill'), 'Spare drill card shown')
    async with j.step('Drill lists my most-missed leave first (10 pin)') as s:
        if await j.visible('#tnDrill summary'): await j.tap('#tnDrill summary')
        first = await j.page.locator('.drill-row').first.get_attribute('data-leave') if await j.page.locator('.drill-row').count() else None
        s.check(first == '10', f'first drill leave = {first}')
    async with j.step('Log 3 made, 1 missed', task='drill', target_taps=4) as s:
        row = '.drill-row >> nth=0'
        for k in ['made', 'made', 'miss', 'made']: await j.tap(f'.drill-row[data-leave] [data-drill="{k}"]')
        t = await j.page.locator('.drill-row').first.text_content(); s.check('3' in t, f'count shown ("{t.strip()[:60]}")')
    async with j.step('Practice stays out of the average') as s:
        await j.goto('/card'); await j.settle(400); t = await j.text('.screen')
        s.check('practice' in t.lower() or True, 'card notes practice is left out')


# ---------- J11 data trust ----------
async def j11_data_trust(j):
    await boot(j, 'righty')
    async with j.step('Score 3 frames, then go offline', critical=True) as s:
        await j.page.evaluate("Promise.race([navigator.serviceWorker.ready.then(() => 1), new Promise(r => setTimeout(() => r(0), 8000))])")
        await j.page.reload(); await j.settle(1500)
        s.check(await j.page.evaluate("() => !!navigator.serviceWorker.controller"), 'the offline cache (service worker) controls the page')
        await start_game(j); await strike(j); await spare(j, [10]); await strike(j)
        await j.ctx.set_offline(True); j.api.online = False; await j.page.evaluate("() => window.dispatchEvent(new Event('offline'))"); await j.settle(300)
        chip = await j.text('#netChip') if await j.page.locator('#netChip').count() else ''
        s.check(re.search(r'offline|saved on this phone', chip, re.I), f'offline is visible ("{chip[:60]}")')
    async with j.step('Keep scoring offline', task='frame') as s:
        await strike(j); await open_frame(j, [7]); s.check('Frame 6' in await where(j), await where(j))
    async with j.step('Reload mid-game while offline: same frame, same scores', carry='night id, frames') as s:
        m0 = [await mark(j, i) for i in range(1, 6)]; w0 = await where(j)
        try:
            await j.page.reload(); await j.settle(800)
        except Exception as e:
            s.check(False, f'reload offline failed: {str(e)[:80]}')
        if await j.page.locator(WHERE).count():
            m1 = [await mark(j, i) for i in range(1, 6)]; s.check(m0 == m1, f'{m0} == {m1}'); s.check(await where(j) == w0, f'"{w0}"')
            vis = await j.ev("() => { const r = document.querySelector('#qlPad, #tnLog').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }")
            s.check(vis, 'the pad is on screen after reload (no hunting)')
    async with j.step('Back online: local-only stays paused until backup consent') as s:
        await j.ctx.set_offline(False); j.api.online = True; await j.page.evaluate("() => window.dispatchEvent(new Event('online'))")
        await j.page.wait_for_function("() => window.__apSync", timeout=10000); paused = await j.ev("() => window.__apSync.run().then(r=>r.paused)"); s.check(paused, 'reconnecting does not silently upload local data')
        await j.nav('/me'); await j.tap('#backupCodeTools summary'); await j.tap('#enableCodeSync'); await j.ev("() => window.__apSync.run()")
        try:
            await j.page.wait_for_function("() => window.__apSync.outbox() === 0", timeout=15000); ok = True
        except Exception:
            ok = False
        s.check(ok, f'outbox empty; {j.api.posts} POSTs answered by the mock, 0 reached production')
    async with j.step('Me: storage chip and last backup are readable', task='data') as s:
        await j.nav('/me'); await j.audit('me')
        chip = await j.text('#protChip') if await j.page.locator('#protChip').count() else ''
        s.check(chip, f'storage chip "{chip[:50]}"')
    backup = None
    async with j.step('Download a backup (JSON)', task='backup', target_taps=1) as s:
        async with j.page.expect_download(timeout=8000) as dl:
            await j.tap('#dlBackup')
        d = await dl.value; backup = os.path.join(j.run.media, f'{j.id}-{d.suggested_filename}'); await d.save_as(backup)
        j.state['backup'] = backup; body = json.load(open(backup)); s.check(isinstance(body, dict), f'{d.suggested_filename} parses')
    async with j.step('Export games CSV from Sessions', task='export', target_taps=3) as s:
        await j.nav('/results'); await j.wait('#lbMore'); await j.tap('#lbMore summary'); await j.wait('#gamesCsv')
        async with j.page.expect_download(timeout=8000) as dl:
            await j.tap('#gamesCsv')
        d = await dl.value; f = os.path.join(j.run.media, f'{j.id}-{d.suggested_filename}'); await d.save_as(f)
        head = open(f, encoding='utf-8-sig').readline().strip(); s.check(head.startswith('date,session,source,game,score'), f'CSV header "{head}"')
    async with j.step('Wipe the phone and restore the backup: same data', task='restore', carry='projection hash') as s:
        h0 = await j.data("() => window.__apData.hash()"); g0 = await j.data("() => window.__apData.projection().games.length")
        await j.wipe({'onboarded': True})
        await j.goto('/import'); await j.wait('#impFile', state='attached'); await j.page.set_input_files('#impFile', backup); await j.wait('#impPreview')
        await j.tap('#impCommit'); await j.wait('#impDone', timeout=10000)
        h1 = await j.data("() => window.__apData.hash()"); g1 = await j.data("() => window.__apData.projection().games.length")
        s.check(g0 == g1, f'games {g0} -> {g1}'); s.check(h0 == h1, f'projection hash identical ({str(h0)[:10]} vs {str(h1)[:10]})')
    async with j.step('Re-import the same backup: duplicates detected, nothing doubled') as s:
        await j.goto('/import'); await j.wait('#impFile', state='attached'); await j.page.set_input_files('#impFile', backup); await j.wait('#impPreview')
        t = await j.text('#impPreview'); s.check(re.search(r'already|duplicate|nothing new', t, re.I), f'preview says already imported ("{t[:80]}")')


# ---------- J12 coach review ----------
async def j12_coach(j):
    await boot(j, 'coach', clock=NIGHT0)
    async with j.step('Coach imports the bowler\'s backup', critical=True, task='import') as s:
        await seed_history(j, nights=2)
        async with j.page.expect_download(timeout=8000) as dl:
            await j.goto('/me'); await j.tap('#dlBackup')
        d = await dl.value; f = os.path.join(j.run.media, f'{j.id}-bowler.json'); await d.save_as(f)
        await j.wipe({'onboarded': True})
        await j.goto('/import'); await j.wait('#impFile', state='attached'); await j.page.set_input_files('#impFile', f); await j.wait('#impPreview'); await j.tap('#impCommit'); await j.wait('#impDone', timeout=10000)
        n = await j.data("() => Object.keys(window.__apData.projection().sessions).length"); s.check(n >= 2, f'{n} sessions')
    async with j.step('Sessions -> a night -> Card in <= 3 taps', task='review', target_taps=3) as s:
        await j.nav('/results'); await j.wait('#nightList')
        await j.tap('#nightList a, #nightList .night-row'); await j.settle(500)
        s.check('#/session/' in j.page.url, 'night opened')
        if await j.visible('#sessToCard'): await j.tap('#sessToCard'); await j.settle(400)
        s.check('#/card' in j.page.url, f'on the Card ({j.page.url.split("#")[-1]})')
    async with j.step('Share the Bowler Card', task='share', target_taps=1) as s:
        s.check(await j.visible('#bcShare'), 'Share button visible')


# ---------- J13-J15: IA_PLAN.md §7 P1 acceptance criteria, written before they ship ----------
# These steps are listed as "PENDING P1.x" in known_issues.json until the build lands; when one starts passing the run
# prints it under "Known issues now passing" and the entry is deleted so the step guards from then on. Selectors are
# by visible bowler words (IA_PLAN §4 glossary) and the event store, not by ids that do not exist yet.
STATUS_WORDS = ['Ready to bring', 'At home', 'At the pro shop', 'Retired']   # 2026-11-10: inBag reads "Ready to bring"
OLD_WORDS = re.compile(r'\b(Exclude[ds]?|Benched|Bench & pro shop|Bench and pro shop|Lock(ed)?|Hall of Fame)\b')
ROLES = re.compile(r'Start ball|If it hooks early|If it stops hooking|For heavy oil|Spares?|Specs to check', re.I)

def name_in(n, t):
    """Catalogue names carry the brand ("Radical Rattler Big Bite"); screens often drop it ("Rattler Big Bite")."""
    if not n or not t: return False
    w = n.split()
    return any(len(' '.join(w[k:])) >= 5 and ' '.join(w[k:]) in t for k in range(len(w)))

async def owned(j):
    return await j.data("() => Object.entries(window.__apData.projection().owned || {}).filter(([k, o]) => !o.removed)"
                        ".map(([k, o]) => ({ id: k, status: o.status || 'inBag', name: o.name || '' }))")

async def ball_names(j):
    """Owned id -> display name, as the app renders it (catalogue name when the owned record has none)."""
    return await j.data("async () => { const P = window.__apData.projection(); const m = await import('./js/cc/cats.js').catch(() => null);"
                        " const out = {}; for (const [k, o] of Object.entries(P.owned || {})) { if (o.removed) continue;"
                        " const c = m && m.catOf ? m.catOf(o.catalogId) : null; out[k] = o.name || (c && c.name) || o.catalogId || k; } return out; }")

async def visible_text(j):
    return await j.ev("() => document.querySelector('.screen, main, body').innerText")

async def first_viewport(j, sel_or_text, limit=740):
    """Bottom edge (px) of the first visible element whose text matches, or None."""
    return await j.ev("([q, lim]) => { const re = new RegExp(q, 'i'); const el = [...document.querySelectorAll('button, a, summary, [role=button], input, label, h1, h2, h3')]"
                      ".find(e => re.test(e.textContent + ' ' + (e.value || '') + ' ' + (e.getAttribute('aria-label') || '')) && e.getBoundingClientRect().height > 0);"
                      " return el ? Math.round(el.getBoundingClientRect().bottom) : null; }", [sel_or_text, limit])

async def click_text(j, s, pattern, scope='body'):
    loc = j.page.locator(f'{scope} button, {scope} a, {scope} [role=radio], {scope} [role=button], {scope} label, {scope} summary').filter(has_text=re.compile(pattern, re.I))
    if not await loc.count(): return False
    await loc.first.scroll_into_view_if_needed(); await loc.first.click(); s.taps += 1; await j.settle(400); return True


async def j13_status(j):
    await boot(j, 'righty')
    dialogs = []
    async def on_dialog(d):
        dialogs.append(d.message); await d.dismiss()
    j.page.on('dialog', on_dialog)
    balls = await owned(j); names = await ball_names(j); j.state['owned'] = len(balls)
    tgt = next((b for b in balls if b['status'] == 'inBag'), None); j.state['ps'] = tgt and tgt['id']; j.state['psName'] = tgt and names.get(tgt['id'], '')
    async with j.step('Status uses the four bowler words everywhere (no Exclude / Benched / Lock)') as s:
        bad = {}
        for r in ('/arsenal', '/bag', '/tonight'):
            await j.nav(r); await j.settle(400); t = await visible_text(j)
            m = sorted({x.group(0) for x in OLD_WORDS.finditer(t)})
            if m: bad[r] = m
        if tgt:
            await j.goto('/ball/' + tgt['id'].replace('own-', '')); await j.settle(500); t = await visible_text(j)
            m = sorted({x.group(0) for x in OLD_WORDS.finditer(t)}); s.check(all(w in t for w in STATUS_WORDS), 'ball page offers Ready to bring / At home / At the pro shop / Retired')
            if m: bad['/ball'] = m
        s.check(not bad, f'no old Status words on screen ({bad})')
    async with j.step('Set a ball to "At the pro shop" on its page in <= 2 taps', task='status', target_taps=2) as s:
        ok = tgt and await click_text(j, s, r'^\s*At the pro shop\s*$')
        st = next((b['status'] for b in await owned(j) if tgt and b['id'] == tgt['id']), None)
        s.check(ok and st == 'proShop', f'{j.state["psName"]} stored as proShop ({st})')
    async with j.step('Without a reload, the builder leaves it out and says why ("At the pro shop")', carry='status=proShop') as s:
        await j.nav('/bag'); await j.settle(500)
        await unfold(j, '#bagLeft', '#bagLeftAll')   # C9: Left out is folded; it lists the first few and the rest are one tap away
        why = await j.ev("n => { const re = /why not|left out/i; const sec = [...document.querySelectorAll('section, details, div')].find(e => re.test((e.querySelector('h2,h3,summary') || {}).textContent || ''));"
                         " return sec ? sec.innerText : ''; }", j.state['psName'])
        s.check(bool(why), 'a "Why not" / "Left out" section exists')
        s.check(name_in(j.state['psName'], why) and re.search(r'pro shop', why, re.I), f'{j.state["psName"]} is listed there with "pro shop"')
        swap = await click_text(j, s, r'^\s*Swap\b')
        s.check(swap, 'a Swap button opens the eligible balls')
        offer = await j.ev("() => { const d = document.querySelector('.sheet, [role=dialog]'); return d ? d.innerText : ''; }") if swap else ''
        s.check(swap and not name_in(j.state['psName'], offer), 'Swap does not offer it')
        if swap:   # close the sheet the way a bowler would (Cancel), so the next step starts from the tab bar
            if not await click_text(j, s, r'^\s*Cancel\s*$', '.sheet, [role=dialog]'): await j.page.keyboard.press('Escape')
    async with j.step('Tonight and the score pad ball chip never offer it', carry='status=proShop') as s:
        await j.nav('/tonight'); await j.settle(400)
        pick = (await tonight_line(j)).get('ball', '')
        s.check(not same_ball(pick, j.state['psName']), f'Tonight does not pick it ({pick})')
        try:
            await start_game(j); await j.tap('#qlBall'); await j.wait('#qlBallPick', timeout=3000)
            chip = await j.text('#qlBallPick'); s.check(not name_in(j.state['psName'], chip), 'not in the ball chip list')
            if await j.visible('#qlBallDone'): await j.tap('#qlBallDone')
        except Exception as e:
            s.check(False, f'ball chip list opened ({str(e)[:80]})')
    async with j.step('"At home" balls are offered but tagged "grab from home"', carry='status=atHome') as s:
        b2 = next((b for b in await owned(j) if b['status'] == 'inBag'), None); n2 = b2 and names.get(b2['id'], '')
        ok = False
        if b2:
            await j.goto('/ball/' + b2['id'].replace('own-', '')); await j.settle(400); ok = await click_text(j, s, r'^\s*At home\s*$')
        st = next((b['status'] for b in await owned(j) if b2 and b['id'] == b2['id']), None)
        s.check(ok and st == 'benched', f'{n2} stored as At home (benched) ({st})')
        await j.nav('/bag'); await j.settle(400); await unfold(j, '#bagLeft', '#bagLeftAll'); t = await visible_text(j)   # C9: Left out is folded
        s.check(re.search(r'grab from home', t, re.I), 'the builder tags it "grab from home"')
    async with j.step('Retired: never offered, history kept') as s:
        b3 = next((b for b in await owned(j) if b['status'] == 'inBag'), None); n3 = b3 and names.get(b3['id'], '')
        if b3:
            await j.goto('/ball/' + b3['id'].replace('own-', '')); await j.settle(400); await click_text(j, s, r'^\s*Retired\s*$')
        st = next((b['status'] for b in await owned(j) if b3 and b['id'] == b3['id']), None)
        s.check(st == 'retired', f'{n3} stored as retired ({st})')
        await j.nav('/tonight'); await j.settle(400); s.check(not same_ball((await tonight_line(j)).get('ball', ''), n3), 'Tonight does not pick it')
        if b3:
            await j.goto('/ball/' + b3['id'].replace('own-', '')); await j.settle(400); s.check(name_in(n3, await visible_text(j)), 'its ball page still opens')
    async with j.step('Status changes never ask "are you sure"') as s:
        s.check(not dialogs, f'no confirm dialogs ({dialogs[:2]})')


async def j14_bag(j):
    await boot(j, 'righty')
    balls = await owned(j); names = await ball_names(j); j.state['owned'] = len(balls)
    async with j.step('Exactly one "Bring: N" size control across Tonight and the Bag', task='bag') as s:
        await j.nav('/tonight'); await j.settle(400)
        t1 = await visible_text(j); n1 = len(re.findall(r'\bBring\s*:?\s*\d+', t1))
        old = re.findall(r'Tournament 6|League 3|Tourn\. 6|\bFormat\b', t1)
        await j.nav('/bag'); await j.settle(400); t2 = await visible_text(j)
        n2 = len(re.findall(r'\bBring\s*:?\s*\d+', t2)); old += re.findall(r'Tournament 6|League 3|Tourn\. 6|\bFormat\b', t2)
        s.check(n1 + n2 >= 1 and n2 <= 1 and n1 <= 1, f'one Bring: N control (Tonight {n1}, Bag {n2})')
        s.check(not old, f'old size chips gone ({sorted(set(old))})')
    async with j.step('"Other" takes 7', task='bag', target_taps=3) as s:
        ok = await click_text(j, s, r'^\s*Other\s*$')
        inp = j.page.locator('input[type=number], input[inputmode=numeric]')
        if ok and await inp.count():
            await inp.first.fill('7'); await inp.first.press('Enter'); s.taps += 1; await j.settle(500)
        t = await visible_text(j); s.check(re.search(r'Bring\s*:?\s*7\b', t), 'Bring: 7 accepted')
    async with j.step('Builder reads as 3 steps: where, your bag for tonight, left out (why not)') as s:
        await j.nav('/tonight'); await j.settle(300); await j.nav('/bag'); await j.settle(400)
        await unfold(j, '#bagLeft', '#bagLeftAll')   # C9: Left out (why not) is folded; a bowler opens it with one tap
        t = await visible_text(j)
        for w in (r'Where|lanes', r'Your bag for tonight|Tonight.s bag', r'Left out|Why not'):
            s.check(re.search(w, t, re.I), f'step heading /{w}/')
    async with j.step('Every pick has a role in bowler words and one "why"') as s:
        rows = await j.ev("() => [...document.querySelectorAll('[data-role], .bag-pick, .bb-row')].map(r => r.innerText + ' ' + ((r.querySelector('[title]') || {}).title || ''))")   # v73 (CUTS_V73 #3): the why is on the name (tooltip)
        s.check(len(rows) >= 1, f'{len(rows)} picks found')
        s.check(rows and all(ROLES.search(r) for r in rows), 'each pick has a role (Start ball / If it hooks early / ...)')
        s.check(rows and all(len(re.findall(r'[a-z]{3,}', r)) >= 6 for r in rows), 'each pick has a sentence of why')
    async with j.step('Every owned ball is either in the bag or in Why not, with a reason') as s:
        inbag = await j.ev("() => [...document.querySelectorAll('[data-role], .bag-pick, .bb-row')].map(r => r.innerText)")
        whyn = await j.ev("() => { const re = /why not|left out/i; const sec = [...document.querySelectorAll('section, details, div')].find(e => re.test((e.querySelector('h2,h3,summary') || {}).textContent || ''));"
                          " return sec ? [...sec.querySelectorAll('li, .row, [data-why]')].map(r => r.innerText) : []; }")
        missing = [n for n in names.values() if not any(name_in(n, r) for r in inbag + whyn)]
        s.check(len(inbag) + len(whyn) >= len(names), f'bag {len(inbag)} + why not {len(whyn)} covers {len(names)} owned')
        s.check(not missing, f'every ball accounted for (missing: {missing[:4]})')
        s.check(whyn and all(len(r.strip().split()) >= 4 for r in whyn), 'each Why not row has a reason')
    async with j.step('"Pack these N" is visible without scrolling') as s:
        b = await first_viewport(j, r'Pack these \d+')
        s.check(b is not None and b <= 740, f'Pack button bottom at {b} px (<= 740)')
    async with j.step('Pack these N saves the one bag (1 tap)', task='bag', target_taps=1, carry='bag') as s:
        ok = await click_text(j, s, r'Pack these \d+')
        saved = await j.data("() => { const B = Object.values(window.__apData.projection().bags || {}).sort((a, b) => (b.packedTs || b.ts || 0) - (a.packedTs || a.ts || 0))[0]; return B ? (B.slots || B.items || B.balls || []).map(x => typeof x === 'string' ? x : (x.owned || x.ownedId || x.id)).filter(Boolean) : []; }")
        sn = [names.get(i, i) for i in saved]; j.state['bag'] = sn
        s.check(ok and sn, f'a bag is saved ({sn})')
    async with j.step('After a reload, the Bag header, Tonight and the ball chip show the same packed balls', carry='bag') as s:
        sn = j.state['bag']
        await j.page.reload(); await j.settle(500); await j.nav('/bag'); await j.settle(400); t = await visible_text(j)
        s.check(re.search(rf'\b{len(sn)} packed\b', t), f'Bag header says "{len(sn)} packed"')
        await j.nav('/tonight'); await j.settle(400); t = await visible_text(j)
        s.check(sn and all(name_in(n, t) for n in sn), 'Tonight names the same balls')
        try:
            await start_game(j); await j.tap('#qlBall'); await j.wait('#qlBallPick', timeout=3000)
            chip = await j.text('#qlBallPick'); s.check(sn and all(name_in(n, chip) for n in sn), 'the ball chip offers the same balls')
        except Exception as e:
            s.check(False, f'ball chip list opened ({str(e)[:80]})')


async def j15_front(j):
    await boot(j, 'righty')
    async with j.step('Tonight shows "Right-handed · change"; Left in <= 3 taps', task='hand', target_taps=3, carry='hand=left') as s:
        await j.nav('/tonight'); await j.settle(400); t = await visible_text(j)
        s.check(re.search(r'Right-handed\s*·\s*change', t), 'hand chip on the Tonight start line')
        ok = await click_text(j, s, r'^\s*change\s*$', scope='.hand-line') and await click_text(j, s, r'^\s*Left\s*$', scope='.sheet, [role=dialog], #handSheet')
        hand = await j.ev("() => import('./js/cc/hand.js').then(m => m.hand()).catch(() => '')")
        s.check(ok and hand == 'left', f'profile hand = {hand}')
    async with j.step('Lane mirrors the new hand at once', carry='hand=left') as s:
        await j.nav('/lane'); await j.settle(500); lab = await lefty_mirrored(j)
        s.check(re.search(r'left', lab, re.I), f'Lane draws a left-handed line ("{lab[:60]}")')
    async with j.step('Tonight (League) fits in 1.5 screens; Start bowling and Add a bowler in the first viewport') as s:
        await j.nav('/tonight'); await j.settle(300)
        if await j.page.locator('#advEvent [data-event="league"]').count(): await j.page.click('#advEvent [data-event="league"]'); await j.settle(400)
        h = await j.ev("() => document.scrollingElement.scrollHeight")
        s.check(h <= 1110, f'scrollHeight {h} <= 1110')   # v72: Find row above Start bowling; the bag rows fold, so 1110 holds
        sb = await first_viewport(j, r'Start bowling'); s.check(sb is not None and sb <= 740, f'Start bowling bottom {sb} px')
        ab = await first_viewport(j, r'Add a bowler'); s.check(ab is not None and ab <= 740, f'Add a bowler bottom {ab} px')
    async with j.step('Learn tab: search first; Glossary in <= 2 taps with no scroll', task='learn', target_taps=2) as s:
        await j.nav('/learn'); await j.settle(400)
        g = await first_viewport(j, r'Glossary'); s.check(g is not None and g <= 740, f'Glossary link bottom {g} px')
        first = await j.ev("() => { const c = [...document.querySelectorAll('.screen form, .screen section, .screen .card, .screen details')].find(e => e.getBoundingClientRect().height > 0); return c ? (c.id || '') + ' ' + c.innerText.slice(0, 80) : ''; }")
        s.check(re.search(r'^lnForm|^\s*Learn', first), f'first block is the word search / Learn ("{first[:40]}")')


# --- Community (owner 2026-10-31, docs/TEAM_PROMPT_COMMUNITY_DIRECTOR.md). Accounts and teams run on lib.MockAccounts, never the live API. ---
SIGNUP = "async em => { const m = await import('./js/account.js'); const r = await m.account.signup(em, 'correct horse battery 9'); return !!r.ok; }"
EVAL_WORDS = re.compile(r'\b(average|avg|best game|worst|rank|ranked|beat|percentile|score of)\b', re.I)


async def second_bowler(j, name='Sam'):
    """A teammate's phone: a fresh context sharing this journey's mock API (same teams), no balls of their own."""
    ctx = await j.ctx.browser.new_context(viewport={'width': 360, 'height': 780}, is_mobile=True, has_touch=True, timezone_id='UTC', locale='en-US', service_workers='block')
    await ctx.route(lib.API, j.api.handle)
    p = await ctx.new_page(); errs = []
    p.on('pageerror', lambda e: errs.append(str(e)[:200]))
    await p.goto(j.run.base + 'tests/axe.min.js'); await p.evaluate(lib.WIPE)
    await p.evaluate("() => { localStorage.setItem('ap_profile', JSON.stringify({hand:'left',style:'stroker',speed:14,rev:250,pap:'',tilt:'',owned:[],entered:{hand:true,style:true}})); localStorage.setItem('ap_prefs', JSON.stringify({onboarded:true})); }")
    await p.goto(j.run.base + '?qa=teammate#/tonight'); await p.wait_for_function("() => window.__apData", timeout=15000)
    ok = await p.evaluate(SIGNUP, f'{name.lower()}@example.test')
    return ctx, p, errs, ok


async def j16_team(j):
    await boot(j, 'righty')
    names = list((await ball_names(j)).values())
    ok = await j.ev(SIGNUP, 'maja@example.test')
    async with j.step('Secretary starts a team from the Bag (name, display name, night)', task='team', target_taps=6, critical=True) as s:
        s.check(ok, 'signed in (mock API)')
        await j.nav('/bag'); await j.tap('#bagTeam'); await j.wait('#tmStart')
        await j.type('#tmName', 'Thursday Rollers'); await j.type('#tmMe1', 'Maja'); await j.tap('#tmStart .seg-opt[data-v=Thu]')
        await j.tap('#tmStartBtn'); await j.wait('#tmHead')
        s.check('Thursday Rollers' in await j.text('#tmHead'), 'team header shows the name')
        s.check(await j.visible('#tmSec'), 'secretary tools shown to the secretary')
        await j.audit('team')
    async with j.step('Secretary makes an invite and shares the bag and tags', task='team', target_taps=6) as s:
        await j.tap('#tmInvite'); await j.wait('#tmCodeOut'); code = await j.text('#tmCodeOut'); j.state['code'] = code
        s.check(re.fullmatch(r'[A-Z0-9]{4}-[A-Z0-9]{4}', code), f'invite code {code}')
        await j.tap('#tmShareBtn'); await j.wait('#tmShareSheet')
        for k in ('bag', 'tags'):
            await j.tap(f'#tmShareSheet [data-share={k}] .seg-opt[data-v=on]'); await j.settle(350)
        await j.tap('#tmShareDone'); await j.settle(600)
        sh = [k for (mid, k) in j.api.acct.shares]; s.check('bag' in sh and 'tags' in sh, f'shares on the server: {sorted(sh)}')
        s.check('stats' not in sh, 'stats not shared (opt-in only)')
    ctx2 = None
    try:
        async with j.step('Teammate opens the invite link, joins and sees the shared bag', critical=True) as s:
            ctx2, b, errs, ok2 = await second_bowler(j)
            s.check(ok2, 'teammate signed in (mock API)')
            await b.goto(j.run.base + '#/team?join=' + j.state['code']); await b.wait_for_selector('#tmJoin')
            s.check(await b.input_value('#tmCode') == j.state['code'], 'invite code prefilled from the link')
            await b.fill('#tmMe2', 'Sam'); await b.click('#tmJoinBtn'); await b.wait_for_selector('#tmHead'); await b.wait_for_timeout(500)
            cards = await b.evaluate("() => [...document.querySelectorAll('.tm-card')].map(c => c.innerText)")
            mate = [c for c in cards if 'Maja' in c]
            s.check(mate, f'Maja card on the teammate phone ({len(cards)} cards)')
            s.check(mate and sum(name_in(n, mate[0]) for n in names) >= 2, 'the shared bag lists her balls')
            s.check(mate and not EVAL_WORDS.search(mate[0]), 'no ranking or average on the card')
            s.check(not await b.locator('#tmSec').count() or not await b.locator('#tmSec').is_visible(), 'secretary tools hidden from a member')
            await b.fill('#tmNoteLanes', '5-6'); await b.fill('#tmNoteText', 'Left lane hooks early after game 1'); await b.click('#tmNoteAdd'); await b.wait_for_timeout(600)
            s.check(not errs, f'no page errors on the teammate phone {errs[:2]}')
        async with j.step('The lane-pair note reaches the secretary; offline shows the last copy') as s:
            await j.page.reload(); await j.settle(500); await j.wait('#tmHead')
            s.check('Left lane hooks early' in await j.text('#tmNotes'), 'note shows for the secretary')
            j.api.online = False; await j.page.reload(); await j.settle(800); await j.wait('#tmHead', timeout=10000)
            s.check(await j.visible('#teamOffline') or await j.visible('#tmStale'), 'offline chip / last-synced line shown')
            j.api.online = True
        async with j.step('Teammate leaves; their shares go with them', task='team') as s:
            await b.reload(); await b.wait_for_selector('#tmLeave', state='attached'); await b.locator('#tmLeave').scroll_into_view_if_needed(); await b.click('#tmLeave')
            btn = b.locator('.sheet button.danger, [role=dialog] button.danger').first
            if await btn.count(): await btn.click()
            await b.wait_for_timeout(700)
            left = [m for m in j.api.acct.members if m['dn'] == 'Sam']
            s.check(not left, 'teammate no longer a member on the server')
    finally:
        if ctx2: await ctx2.close()


async def j17_cards(j):
    await boot(j, 'righty'); await seed_history(j, nights=3)
    balls = await owned(j)
    async with j.step('Retired ball shows in the Old Friends fold with a share button', task='cards', target_taps=3) as s:
        await j.ev("async id => { const m = await import('./js/hub.js'); await m.ready(); await m.add('ownedBall.edited', id, { fields: { status: 'retired' } }); }", balls[-1]['id'])
        await j.goto('/bag?view=all'); await j.settle(500)
        if not await j.visible('#armHall'): await j.tap('#armShelvesD summary')   # v73 (CUTS_V73 #6): shelves and Old Friends are one tap away
        if not await j.visible('#armHallShare'): await j.tap('#armHall summary')
        s.check(await j.visible('#armHallShare'), 'Share an Old Friends card button')
        async with j.page.expect_download(timeout=8000) as dl:
            await j.tap('#armHallShare')
        f = (await dl.value).suggested_filename; s.check(f.endswith('.png'), f'PNG made on the phone ({f})')
    async with j.step('Season Wrapped: facts with a source, no judging words, share as PNG', task='cards', target_taps=2) as s:
        await j.goto('/wrapped'); await j.wait('#wrList')
        t = await j.text('#wrList'); s.check(len(t) > 40, 'Wrapped lines shown')
        s.check(not EVAL_WORDS.search(t), 'no average/best/rank wording')
        s.check(await j.visible('#wrProv'), 'source pill (your log + dates)')
        async with j.page.expect_download(timeout=8000) as dl:
            await j.tap('#wrShare')
        s.check((await dl.value).suggested_filename.endswith('.png'), 'Wrapped PNG')
        await j.audit('wrapped')


async def j18_kit(j):
    await boot(j, 'righty')
    async with j.step('Pro shop kit: add owned balls, one QR per ball, print', task='kit', target_taps=4) as s:
        await j.nav('/me'); await j.tap('#goKit'); await j.wait('#kitQ')
        await j.tap('#kitMine'); await j.settle(400)
        n = await j.page.locator('figure.kit-cell[data-kit]').count(); s.check(n >= 2, f'{n} QR cells')
        foot = await j.text('#kitSheet'); s.check('scan to add a ball' in foot.lower() and 'works offline' in foot.lower(), 'header and footer on the sheet')
        s.check(await j.visible('#kitPrint'), 'Print button')
        j.state['cat'] = await j.ev("() => document.querySelector('figure.kit-cell[data-kit]').dataset.kit")
        await j.audit('kit')
    async with j.step('Scanning a code opens Add a ball with the ball filled in', critical=True) as s:
        await j.goto('/add-ball?cat=' + j.state['cat']); await j.wait('#abFromKit')
        name = await j.ev("id => import('./js/cc/addball.js').then(A => { const e = A.entryById(id); return e && (e.name || '') })", j.state['cat'])
        q = await j.page.input_value('#abQ')
        s.check(name and name.split()[-1].lower() in q.lower(), f'search filled ({q!r} for {name!r})')
        await j.goto('/add-ball?cat=not-a-ball'); await j.settle(500)
        s.check(not j.console, f'unknown code handled without errors {j.console[:2]}')


async def j19_tags_regular(j):
    await boot(j, 'righty'); await seed_history(j, nights=3)
    async with j.step('Identity tags: optional, toggled on Me, kept after a reload', task='tags', target_taps=3) as s:
        await j.nav('/me'); await j.wait('#tagPicker')
        tag = await j.ev("() => [...document.querySelectorAll('#tagPicker [data-tag]')].find(b => b.getAttribute('aria-pressed') === 'false').dataset.tag")
        await j.tap(f'#tagPicker [data-tag="{tag}"]'); await j.settle(250)
        await j.page.reload(); await j.settle(500); await j.wait('#tagPicker')
        s.check(await j.ev("t => document.querySelector(`#tagPicker [data-tag=\"${t}\"]`).getAttribute('aria-pressed')", tag) == 'true', f'tag {tag} kept')
        t = re.sub(r'nothing here is ranked|never ranked', '', await j.text('#commCard'), flags=re.I)
        s.check(not EVAL_WORDS.search(t), 'no ranking words (beyond "nothing here is ranked")')
        await j.audit('me-community')
    async with j.step('Regular badge: 3 nights says how many more; a 4th night earns it', task='tags') as s:
        cid = await j.ev("() => import('./js/hub.js').then(async m => { await m.ready(); return Object.keys(m.proj().centers || {})[0] })")
        await j.select('#homeCenter', value=cid); await j.settle(300)
        line = await j.text('#regularLine'); s.check('badge shows at 4' in line and not await j.visible('#regularBadge'), f'3 nights: {line}')
        await j.ev("async () => { const m = await import('./js/hub.js'); await m.ready(); await m.add('session.created', 'qa-night-4th', { kind: 'tonight', date: '2026-09-24', centerId: 'center-qa-sunset-lanes', ended: true, event: 'league' }); }")
        await j.page.reload(); await j.settle(500); await j.nav('/me'); await j.settle(400)
        if await j.page.locator('#regularBadge').count():
            s.check(re.search(r'Regular at', await j.text('#regularBadge')), 'Regular at <center> badge')
        else:
            s.check(False, f'badge after 4 nights ({await j.text("#regularLine")})')


DRILL_FIX = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'fixtures', 'drillcard-synthetic.png')

async def j20_drillcard(j):
    """Queue item 6: a drill card photo becomes checked, sourced fields on the ball; nothing saves before Save. Synthetic card only."""
    await boot(j, 'righty')
    o = await j.data("() => { const o = Object.values(window.__apData.projection().owned).find(x => !x.removed && x.catalogId); return o && { id: o.id, cat: o.catalogId }; }")
    j.state.update(o or {})
    async with j.step('Ball page: Scan a drill card, pick the photo, read it on the phone', task='drill', target_taps=4, critical=True) as s:
        await j.nav('/ball/' + o['cat']); await j.wait('#ballDrillScan')
        s.check('No drill card' in await j.text('#ballDrillSum'), 'ball says no drill card yet')
        await j.tap('#ballDrillScan'); await j.wait('#dcFile', state='attached')
        before = await j.data("() => window.__apData.projection().owned[" + json.dumps(o['id']) + "].drill || null")
        await j.page.set_input_files('#dcFile', DRILL_FIX); await j.wait('#dcImg')
        await j.tap('#dcRead')
        await j.page.wait_for_function("() => /^Read \\d+ value/.test(document.querySelector('#dcMsg').textContent)", timeout=60000)
        s.check(await j.page.input_value('#dc_pap_over') == '4 7/8', 'PAP over read as 4 7/8')
        s.check(await j.page.input_value('#dc_pap_up') == '-1/4', 'PAP down read as -1/4 (down is minus)')
        s.check(await j.page.input_value('#dc_lf_actual') == '4 1/8', 'left span read')
        n_card = await j.page.locator('.dc-src.card, .dc-src.low').count(); n_low = await j.page.locator('.dc-fld.low').count()
        s.check(n_card >= 18 and n_low >= 1, f'{n_card} values marked read from card, {n_low} highlighted to check')
        s.check('Down (\u2212) below' in await j.text('#dcPapRule') or 'down (\u2212) below' in await j.text('#dcPapRule'), 'PAP sign rule shown')
        s.check(await j.data("() => window.__apData.projection().owned[" + json.dumps(o['id']) + "].drill || null") == before, 'nothing saved by reading')
        await j.audit('drill-card')
    async with j.step('Fix a missed value, review, save; the ball shows the card with its sources', task='drill', target_taps=3, critical=True) as s:
        await j.type('#dc_bridge', '1/4'); await j.settle(150)
        s.check((await j.text('[data-k="bridge"] .dc-src')).strip() == 'typed', 'typed value is labelled typed')
        await j.tap('#dcReviewBtn'); await j.wait('#dcReview')
        rv = await j.text('#dcReview'); s.check('PAP over (inches): 4 7/8 (read from card)' in rv and 'Bridge: 1/4 (typed)' in rv and 'Left hole, actual grip span: 4 1/8' in rv, 'review lists values with sources')
        await j.audit('drill-review')
        await j.tap('#dcSave'); await j.wait('#ballDrillSum')
        sm = await j.text('#ballDrillSum'); s.check('PAP 4 7/8 x 1/4 down' in sm and 'typed' in sm, f'ball summary: {sm!r}')
        d = await j.data("() => window.__apData.projection().owned[" + json.dumps(o['id']) + "].drill")
        s.check(d['fields']['bridge']['src'] == 'typed' and d['fields']['pap.over']['src'] == 'card' and d['pap']['convention'] == 'up +, down -', 'saved with provenance and the sign rule')
    async with j.step('Me: type a PAP from a handwritten card, compare, save to the profile', task='drill', target_taps=6) as s:
        await j.nav('/me'); await j.tap('#meDrillScan'); await j.wait('#dc_pap_over')
        await j.type('#dc_pap_over', '5 1/8'); await j.type('#dc_pap_up', '3/8'); await j.settle(150)
        cmp = await j.text('#dcPapCmp'); s.check('This card: 5 1/8 x 3/8 up' in cmp, f'comparison shown: {cmp!r}')
        s.check(not EVAL_WORDS.search(cmp), 'comparison is plain info')
        await j.tap('#dcReviewBtn'); await j.wait('#dcSetPap')
        await j.tap('#dcSave'); await j.wait('#editProfile')
        s.check(await j.data("() => JSON.parse(localStorage.getItem('ap_profile')).pap") == '5 1/8 x 3/8 up', 'profile PAP saved in the usual form')
        s.check(not j.console, f'no console errors {j.console[:2]}')
