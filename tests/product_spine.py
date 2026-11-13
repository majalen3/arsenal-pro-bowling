"""PRODUCT_SPINE (v71, v72 strike finder before scoring) check + 360 px screenshots. Owner 2026-11-11: "bag building first, then arsenal manager, then the strike
finder, then a log book; everything a max three clicks away".
Checks: the default home is the Bag; the four spine tabs in order; first run starts empty (no preload) and lands on the Bag; the
Bag -> Strike line -> Find my strike line -> game -> End night -> Log book flow; the focused game chrome (and in-game Lane/Targeting);
old and new deep links; and a click-depth audit: every core action, from each of the four spine screens, in <= 3 taps (the tab tap
counts). Secondary items (Me, Help, Learn, Glossary, import, backup, tests) are measured too and reported. docs/PRODUCT_SPINE.md.
Usage: python tests/product_spine.py http://localhost:8413/ [--shots /tmp/shots-product-spine]. Fictional data, no API calls."""
import asyncio, json, sys, os
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8413/'
SHOTS = sys.argv[sys.argv.index('--shots') + 1] if '--shots' in sys.argv else None
fails, man, depth = [], [], []
def check(ok, msg):
    print(('PASS ' if ok else 'FAIL ') + msg, flush=True)
    if not ok: fails.append(msg)
async def shot(p, name, what):
    if not SHOTS: return
    os.makedirs(SHOTS, exist_ok=True)
    await p.evaluate("() => { document.querySelectorAll('.toast, #toast').forEach(t => t.style.visibility = 'hidden'); }"); await p.wait_for_timeout(700)
    await p.screenshot(path=f'{SHOTS}/{name}', full_page=False); man.append({'file': name, 'what': what})
    await p.evaluate("() => { document.querySelectorAll('.toast, #toast').forEach(t => t.style.visibility = ''); }")
SPINE = [('bag', '#/bag', 'Bag'), ('arsenal', '#/arsenal', 'Arsenal'), ('tonight', '#/tonight', 'Strike line'), ('results', '#/results', 'Log book')]
TAB = lambda k: f'#tabs [data-tab="{k}"]'
# Core actions: (name, home tab, taps inside the home screen, done-check JS). From another spine screen the tab tap is added.
CORE = [
    ('Pack tonight\u2019s bag', 'bag', ['#bagPackGo'], "() => location.hash.startsWith('#/tonight')"),
    ('Bring N (2/3/4/6)', 'bag', ['#bagBring button:has-text("3")'], "() => !!document.querySelector('#bagRows')"),
    ('Swap a packed ball', 'bag', ['#bagRows [data-swap] >> nth=0'], "() => !!document.querySelector('#bagSwap')"),
    ('Where & lanes', 'bag', ['#bagWhereChange'], "() => !!document.querySelector('#advEvent')"),
    ('Add a ball (search)', 'arsenal', ['#arsAdd'], "() => !!document.querySelector('#abQ')"),
    ('Open a ball\u2019s specs', 'arsenal', ['#view a[href^="#/ball/"] >> nth=0'], "() => location.hash.startsWith('#/ball/')"),
    ('Start a compare (pick a ball)', 'arsenal', ['#armMoreD summary', '#view .cmp-btn >> nth=0'], "() => !!document.querySelector('#tray:not([hidden])')"),
    ('Arsenal insights', 'arsenal', ['#view a[href="#/arsenal/insights"]'], "() => location.hash === '#/arsenal/insights'"),
    ('Your strike line = the Lane view (v78)', 'tonight', ['#tnFindLine'], "() => location.hash.startsWith('#/lane') && !!document.querySelector('#ballBtn') && !!document.querySelector('#optimize')"),
    ('Optimize (v78)', 'tonight', ['#tnFindLine', '#optimize'], "() => !!document.querySelector('#optOut:not([hidden])')"),
    ('Targeting (Stand \u00b7 Aim)', 'tonight', ['#tnAimChip'], "() => location.hash.startsWith('#/target') && !!document.querySelector('#tgBall')"),
    ('Open last night', 'results', ['#resRecap'], "() => location.hash.startsWith('#/session/')"),
    ('Fix a frame', 'results', ['#resFix'], "() => location.hash.includes('fix=1')"),
    ('Bowler Card', 'results', ['#lbMore summary', '#goCard'], "() => location.hash.startsWith('#/card')"),
    ('Season Wrapped', 'results', ['#lbMore summary', '#goWrapped2'], "() => location.hash.startsWith('#/wrapped')"),
]
# Secondary (documented, off the tab bar): reached from the top bar on every spine screen.
SECONDARY = [
    ('Me (profile, data, sync)', ['#meBtn'], "() => location.hash === '#/me'"),
    ('Help "?" bubbles on', ['#helpToggle, [data-help-toggle], .help-toggle'], "() => true"),
    ('Look up a bowling word', ['#meBtn', '#meSearch'], "() => document.activeElement && document.activeElement.id === 'meSearch'"),
    ('Learn', ['#meBtn', '#meLearnLink'], "() => location.hash === '#/learn'"),
    ('Glossary', ['#meBtn', '#meGlossary'], "() => location.hash.startsWith('#/glossary')"),
    ('Import / restore a backup', ['#meBtn', '#goImport'], "() => location.hash.startsWith('#/import')"),
    ('Tests and usage', ['#meBtn', '#aboutUsage'], "() => location.hash.startsWith('#/me/usage')"),
]
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        c = await b.new_context(viewport={'width': 360, 'height': 780}, device_scale_factor=2, is_mobile=True, has_touch=True, service_workers='block')
        await c.route('https://arsenal-pro-api.onrender.com/**', lambda r: r.fulfill(status=503, body='{}'))
        await c.add_init_script("navigator.share = async d => { window.__shares = (window.__shares || 0) + 1; }")
        p = await c.new_page(); errs = []
        p.on('pageerror', lambda e: errs.append(str(e)))
        cur = lambda: p.evaluate("() => (document.querySelector('#tabs [aria-current=page]') || {}).dataset?.tab || null")
        # ---- first run: welcome (search first), Skip -> the Bag, empty (nothing preloaded)
        await p.goto(BASE); await p.wait_for_selector('#welSearch')
        check('#/welcome' in p.url, 'first run opens the search-first welcome')
        await p.click('#welSkip'); await p.wait_for_selector('#bagNone')
        r = await p.evaluate("() => ({ h: location.hash, tabs: [...document.querySelectorAll('#tabs .tab')].map(t => [t.dataset.tab, t.textContent.trim(), Math.round(t.getBoundingClientRect().height)]), owned: Object.keys(window.__apData.projection().owned).length, find: !!document.querySelector('#bagFindBalls') })")
        check(r['h'] == '#/bag' and r['owned'] == 0 and r['find'], f'Skip lands on the Bag, empty, Find my balls first {r["h"]} owned={r["owned"]}')
        check([t[1] for t in r['tabs']] == [s[2] for s in SPINE] and [t[0] for t in r['tabs']] == [s[0] for s in SPINE], f'four spine tabs in order {r["tabs"]}')
        check(all(t[2] >= 44 for t in r['tabs']), 'every tab >= 44 px tall')
        await shot(p, '01-first-bag-home.png', 'First run after Skip: the Bag is home, empty (nothing preloaded), Find my balls / Add a ball; four spine tabs')
        await p.goto(BASE); await p.wait_for_selector('#bag')
        check(p.url.endswith('#/bag') or p.url.endswith('/'), f'no hash opens the Bag ({p.url.split("#")[-1] if "#" in p.url else "/"})')
        check(await cur() == 'bag', 'default home is the Bag (Bag tab current)')
        # ---- arsenal: search the catalog, save three balls -> back on the Bag
        await p.click('#bagFindBalls'); await p.wait_for_selector('#welSearch')
        for q, pick in [('hy-road', 'hy-road-pearl'), ('phaze 2', 'sc-storm-phaze-ii'), ('super nova', 'super-nova')]:
            await p.fill('#welSearch', q); await p.wait_for_timeout(250); await p.click(f'#welResults [data-select="{pick}"]')
        await p.click('#welNext'); await p.wait_for_selector('#welChosen'); await p.click('#welNext')
        await p.wait_for_function("() => location.hash.startsWith('#/bag')"); await p.wait_for_selector('#bagStartEmpty')
        check(await p.evaluate("() => Object.keys(window.__apData.projection().owned).length") == 3, 'saved exactly the 3 picked balls; lands on the Bag')
        await p.click('#bagStartEmpty'); await p.wait_for_selector('#bagBring')
        await p.click('#bagBring button:has-text("3")'); await p.wait_for_timeout(500); await p.evaluate("() => scrollTo(0, 0)")
        n = await p.eval_on_selector_all('#bagRows [data-own]', 'e => e.length'); check(n == 3, f'Bring 3 packs 3 ({n})')
        await shot(p, '02-packed-bag.png', 'The Bag (front door) packed: where & lanes, Bring 3, tonight\u2019s three balls, sticky "Pack these 3"')
        await p.click(TAB('arsenal')); await p.wait_for_function("() => location.hash === '#/arsenal'"); await p.wait_for_timeout(400)
        check(await cur() == 'arsenal' and await p.locator('#arsAdd').count() == 1, 'Arsenal tab: the arsenal manager (#/arsenal), Add ball on top')
        await shot(p, '03-arsenal-manager.png', 'Arsenal tab (#/arsenal): the Armory / arsenal manager, Add ball and Insights in the bar')
        # ---- Bag -> Strike line
        await p.click(TAB('bag')); await p.wait_for_selector('#bagPackGo'); await p.click('#bagPackGo')
        await p.wait_for_function("() => location.hash.startsWith('#/tonight')"); await p.wait_for_selector('#tnFindLine')
        if await p.locator('#handAsk').count(): await p.click('#handR'); await p.wait_for_selector('#tnHand')   # the one-time hand question
        r = await p.evaluate("() => ({ title: document.querySelector('#tnTitle').textContent, cur: (document.querySelector('#tabs [aria-current=page]') || {}).dataset.tab, find: document.querySelector('#tnFindLine').getBoundingClientRect().bottom, start: document.querySelector('#tnStartBowl').getBoundingClientRect().bottom, startTop: document.querySelector('#tnStartBowl').getBoundingClientRect().top, fold: document.querySelector('#tabs').getBoundingClientRect().top, findPrimary: document.querySelector('#tnFindLine').classList.contains('primary'), startPrimary: document.querySelector('#tnStartBowl').classList.contains('primary') })")
        check(r['title'] == 'Strike line' and r['cur'] == 'tonight' and r['find'] <= r['fold'] and r['start'] <= r['fold'], f'Pack -> Strike line: Find my strike line and Start bowling above the tab bar on the first screen {r}')
        check(r['find'] < r['startTop'] and r['findPrimary'] and not r['startPrimary'], 'v72: Find my strike line is the primary button, above Start bowling (strike finder before scoring)')
        await shot(p, '04-strike-finder.png', 'v72 Strike line: where you bowl and the start line, then Your strike line (primary, opens the Lane view), Stand \u00b7 Aim, who is bowling, then Start bowling (secondary); the bag rows fold under one line of ball names')
        await p.click('#tnFindLine'); await p.wait_for_selector('#optimize', timeout=20000); await p.wait_for_timeout(500)
        await p.click('#optimize'); await p.wait_for_selector('#optOut:not([hidden])', timeout=20000); await p.wait_for_timeout(300)
        sl = await p.evaluate("() => ({ pocket: document.querySelector('#optOut').dataset.pocket, was: document.querySelector('#optOut').dataset.was, est: !!document.querySelector('#optOut [data-prov=model]'), strikePct: /strike/i.test(document.querySelector('#optOut').innerText), lineSum: !!document.querySelector('#lineSum'), deck: !!document.querySelector('#deck'), old: !!document.querySelector('#slTiles'), scroll: document.documentElement.scrollHeight, h: innerHeight })")
        check(p.url.split('#')[-1].startswith('/lane') and await cur() == 'tonight' and sl['est'] and not sl['strikePct'] and int(sl['pocket']) >= int(sl['was']) and sl['lineSum'] and sl['deck'] and not sl['old'] and sl['scroll'] <= sl['h'] + 1, f'v78 Your strike line = the Lane view, Optimize: stand/aim + pocket % (estimate) vs the line before, no strike %, no scroll {sl}')
        await shot(p, '04b-lane-optimize.png', 'v78 Your strike line = the Lane view: lane picture, pin deck, stand/aim, one Optimize button with the pocket % (estimate) and miss room, Undo; everything else behind Details')
        # ---- the game: focused chrome; in-game Lane/Targeting keep it
        await p.click(TAB('tonight')); await p.wait_for_selector('#tnStartBowl'); await p.click('#tnStartBowl'); await p.wait_for_selector('#qlStrike')
        for _ in range(3): await p.click('#qlStrike'); await p.wait_for_timeout(450)
        CH = "() => ({ h: location.hash, bar: getComputedStyle(document.querySelector('#tabs')).display, me: !!document.querySelector('#meBtn'), help: !!document.querySelector('#helpToggle'), leave: (document.querySelector('#tnLeave:not([hidden])') || {}).getAttribute?.('aria-label') || '', back: !!document.querySelector('#gameBack'), extras: [...document.querySelectorAll('#view .milestone, #view [data-badge], #tnShareNight, #tnBagLink, #advEvent, #tnStrike')].filter(x => x.offsetParent).length })"
        g = await p.evaluate(CH)
        check(g['h'] == '#/bowl' and g['bar'] == 'none' and not g['me'] and not g['help'] and g['leave'].startswith('Back to Strike line') and not g['extras'], f'in-game scoring: no tab bar, no Me/Help/badges/share/bag tools, Back to Strike line {g}')
        await shot(p, '05-in-game-scoring.png', 'In-game scoring (#/bowl) mid-game: focused page, no tab bar, badges, share, tests or bag management; "\u2190 Strike line" keeps the night open')
        await p.click('#tnAimChip'); await p.wait_for_selector('#tgBall'); g = await p.evaluate(CH)
        check(g['bar'] == 'none' and g['back'] and not g['me'], f'in-game Targeting keeps the game chrome {g}')
        await p.click('#gameBack'); await p.wait_for_selector('#qlStrike')
        # Leave -> Strike line offers Back to the game; the Bag (front door) offers it too
        await p.click('#tnLeave'); await p.wait_for_function("() => location.hash === '#/tonight' && document.querySelector('#tnStartBowl[data-back]')")
        await p.click(TAB('bag')); await p.wait_for_selector('#bagBackGame')
        t = await p.text_content('#bagBackGame'); check('Back to the game' in t and 'game 1' in t, f'the Bag shows Back to the game while a night is open ({t})')
        await p.click('#bagBackGame'); await p.wait_for_selector('#qlStrike')
        for _ in range(9): await p.click('#qlStrike'); await p.wait_for_timeout(450)
        await p.wait_for_selector('#qlEnd'); await p.click('#qlEnd'); await p.wait_for_selector('#tnNightDone')
        r = await p.evaluate("() => ({ h: location.hash, line: document.querySelector('#tnNightLine').textContent, bar: getComputedStyle(document.querySelector('#tabs')).display, title: document.querySelector('#view h1').textContent, cur: (document.querySelector('#tabs [aria-current=page]') || {}).dataset?.tab })")
        check(r['h'].startswith('#/results?night=') and '300' in r['line'] and r['bar'] != 'none' and r['cur'] == 'results' and r['title'].startswith('Log book'), f'End night -> the Log book with the night (game kept through Leave/Bag) {r}')
        await p.click('#tnShareSkip'); await p.wait_for_timeout(300)
        await shot(p, '06-log-book-after-night.png', 'Log book after End night: Night saved (1 game \u00b7 300), Open the night, Latest night recap, Bowler Card / Wrapped, the nights list')
        # ---- deep links: old and new hashes still land
        for hsh, want, sel in [('#/tonight', '#/tonight', '#tnFindLine'), ('#/building', '#/bag', '#bagRows'), ('#/game', '#/bowl', '#tnLeave'), ('#/bowl', '#/bowl', '#tnLeave'),
                               ('#/arsenal', '#/arsenal', '#arsAdd'), ('#/bag', '#/bag', '#bagRows'), ('#/bag?view=all', '#/bag?view=all', '#arsAdd'), ('#/sessions', '#/results', '#resLast'),
                               ('#/results', '#/results', '#resLast'), ('#/learn', '#/learn', '#lnSearch'), ('#/nope', '#/nope', '#bagRows')]:
            await p.goto(BASE + '?dl' + hsh); 
            try: await p.wait_for_selector(sel, timeout=8000); ok = True
            except Exception: ok = False
            got = p.url.split('#', 1)[-1]
            check(ok and ('#' + got) == want, f'deep link {hsh} -> {want} ({got}, {sel} {"shown" if ok else "missing"})')
        # ---- click depth: every core action from each spine screen
        runs = [0]
        async def run_path(start, steps, done):
            runs[0] += 1; await p.goto(BASE + f'?cd{runs[0]}#' + start); await p.wait_for_timeout(500)   # a fresh load each time (no carried picks)
            taps = 0
            for sel in steps:
                if sel.startswith('#tabs') and await p.query_selector(sel + '[aria-current=page]'): continue
                await p.locator(sel).first.click(timeout=6000); taps += 1; await p.wait_for_timeout(350)
            await p.wait_for_function(done, timeout=8000)
            await p.keyboard.press('Escape'); return taps
        for name, home, steps, done in CORE:
            row = {'action': name, 'home': home, 'from': {}}
            for k, hsh, label in SPINE:
                path = ([] if k == home else [TAB(home)]) + steps
                try: taps = await run_path(hsh[1:], path, done)
                except Exception as e: taps = None; print(f'  {name} from {label}: {str(e)[:140]}')
                row['from'][label] = taps
            depth.append(row)
            check(all(v is not None and v <= 3 for v in row['from'].values()), f'click depth <= 3: {name} {row["from"]}')
        # Log a ball (starts a night): Strike line tab, Start bowling, the pad; with the game open the tab or Back to the game.
        row = {'action': 'Log a ball (start bowling)', 'home': 'tonight', 'from': {}}
        for k, hsh, label in SPINE:
            await p.goto(BASE + f'?lb{k}#' + hsh[1:]); await p.wait_for_timeout(500); taps = 0
            try:
                if k != 'tonight': await p.click(TAB('tonight')); taps += 1; await p.wait_for_timeout(500)
                if not await p.query_selector('#qlStrike'): await p.click('#tnStartBowl'); taps += 1; await p.wait_for_selector('#qlStrike')
                w0 = await p.text_content('#qlWhere'); await p.click('#qlStrike'); taps += 1
                await p.wait_for_function("w0 => document.querySelector('#qlWhere').textContent !== w0", arg=w0)
                if await p.query_selector('#tnLeave:not([hidden])'): await p.click('#tnLeave'); await p.wait_for_timeout(300)
            except Exception as e: taps = None; print(f'  log a ball from {label}: {str(e)[:140]}')
            row['from'][label] = taps
        depth.append(row); check(all(v is not None and v <= 3 for v in row['from'].values()), f'click depth <= 3: log a ball {row["from"]}')
        for name, steps, done in SECONDARY:
            row = {'action': name, 'home': 'top bar (secondary)', 'from': {}}
            for k, hsh, label in SPINE:
                try: taps = await run_path(hsh[1:], steps, done)
                except Exception as e: taps = None; print(f'  {name} from {label}: {str(e)[:140]}')
                row['from'][label] = taps
            depth.append(row)
            check(all(v is not None and v <= 3 for v in row['from'].values()), f'secondary within 3 taps: {name} {row["from"]}')
        check(not errs, f'no page errors {errs[:3]}')
        await b.close()
    worst = max((v for r in depth for v in r['from'].values() if v is not None), default=None)
    note = ('Click depth = taps from a spine screen (Bag, Arsenal, Strike line, Log book) to the control that does the action; the tab tap counts, '
            'typing does not. Measured by tests/product_spine.py on this run; worst case %s. Exceptions (docs/PRODUCT_SPINE.md): the in-game page has no '
            'tab bar (one extra tap, Leave or Back to the game); a compare needs two picks after the first; account sign-in and file pickers need typing.' % worst)
    if SHOTS:
        json.dump({'run': 'product-spine 360x780 mobile Chromium (DPR 2), fresh profile, fictional data, local server, API blocked', 'base': BASE,
                   'files': man, 'click_depth_note': note, 'click_depth': depth}, open(f'{SHOTS}/manifest.json', 'w'), indent=1, ensure_ascii=False)
    print(note); print(f'{len(fails)} failed'); sys.exit(1 if fails else 0)
asyncio.run(main())
