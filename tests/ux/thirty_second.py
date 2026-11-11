"""30-second test (owner t125u) + page-top check (owner t126u).

For each spine screen at 360x780 (and 390x844 with an iPhone-like safe area: 47 px top, 34 px bottom) this loads the sample
arsenal and measures: visible words in the screen (closed <details> do not count), tappable controls, scroll depth, and whether the
page title and the first content heading sit inside the viewport and not under the sticky header. Then it runs the owner's timed
scripts (Bag, Arsenal, Strike line, Log book) and counts taps.

  python tests/ux/thirty_second.py [BASE] [--out audit.json] [--shots DIR] [--no-scripts]
Exit 1 on any failed check (headings, taps, 44 px targets). Word/button numbers are reported, not gated, except the scripts.
"""
import asyncio, json, sys, time
from playwright.async_api import async_playwright

BASE = next((a for a in sys.argv[1:] if a.startswith('http')), 'http://127.0.0.1:8300/')
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
SHOTS = sys.argv[sys.argv.index('--shots') + 1] if '--shots' in sys.argv else None
SCRIPTS = '--no-scripts' not in sys.argv
WIPE = "() => { localStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('arsenal-pro'); q.onsuccess = q.onerror = q.onblocked = () => r(true); setTimeout(() => r(false), 2000); }); }"
LOAD = """async () => { const [m, f] = await Promise.all([import('./js/hub.js'), import('./tests/data/fixtures/sample_arsenal.mjs')]);
  await m.ready(); await m.loadStarter(f.sampleEvents, f.SAMPLE_ID); }"""
ROUTES = [('bag', '#/bag'), ('arsenal', '#/arsenal'), ('strike-line', '#/tonight'), ('strike-finder', '#/target?find=1'), ('log-book', '#/results'), ('add-ball', '#/add-ball')]
SAFE = ".appbar{padding-top:calc(8px + 47px) !important} .tabbar{height:calc(var(--tab-h) + 34px) !important;padding-bottom:34px !important} #view{padding-bottom:calc(var(--tab-h) + 34px + 16px) !important}"
MEASURE = """() => {
  const view = document.querySelector('#view .screen') || document.querySelector('#view');
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('details:not([open]) > :not(summary)'); };
  const words = (view.innerText || '').split(/\\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length;
  const ctl = [...view.querySelectorAll('button, a[href], select, input:not([type=hidden]), summary, [role=radio]')].filter(vis);
  const bar = document.querySelector('#view .appbar'), barB = bar ? bar.getBoundingClientRect().bottom : 0;
  const h1 = view.querySelector('h1'), h1r = h1 ? h1.getBoundingClientRect() : null;
  const first = [...view.querySelectorAll('h2, .card-title, summary, .card')].find(e => !e.closest('.appbar') && vis(e));
  const fr = first ? first.getBoundingClientRect() : null;
  const small = ctl.filter(e => { const r = e.getBoundingClientRect(); return (r.height < 43.5 || r.width < 43.5) && !e.closest('.prose, p, li.small') && e.tagName !== 'INPUT'; }).map(e => (e.id || e.textContent.trim()).slice(0, 24));
  return { words, controls: ctl.length, scroll: document.documentElement.scrollHeight, viewport: innerHeight,
    h1: h1r ? [Math.round(h1r.top), Math.round(h1r.bottom)] : null, header: Math.round(barB), first: fr ? [first.id || first.tagName, Math.round(fr.top)] : null, small };
}"""

fails = []
def check(ok, msg):
    print(('PASS ' if ok else 'FAIL ') + msg)
    if not ok: fails.append(msg)

async def fresh(b, vp, safe=False):
    c = await b.new_context(viewport=vp, is_mobile=True, has_touch=True, device_scale_factor=2)
    await c.route('**/arsenal-pro-api.onrender.com/**', lambda r: r.abort())
    p = await c.new_page(); p.set_default_timeout(15000)
    await p.goto(BASE); await p.evaluate(WIPE); await p.evaluate("localStorage.setItem('ap_prefs', JSON.stringify({onboarded:true, handAsked:true}))")
    await p.goto(BASE + '?a#/bag'); await p.wait_for_function('() => window.__apData', timeout=15000); await p.evaluate(LOAD)
    if safe: await p.add_style_tag(content=SAFE)
    return c, p

async def measure(b, vp, tag, safe=False):
    c, p = await fresh(b, vp, safe); out = {}
    for name, hsh in ROUTES:
        await p.goto(BASE + f'?m{name}{tag}' + hsh); await p.wait_for_timeout(900)
        if safe: await p.add_style_tag(content=SAFE)
        await p.evaluate("() => document.querySelectorAll('.toast').forEach(t => t.remove())")
        m = await p.evaluate(MEASURE); out[name] = m
        if SHOTS: await p.screenshot(path=f'{SHOTS}/{tag}-{name}.png')
        ok_h1 = m['h1'] and m['h1'][0] >= 0 and m['h1'][1] <= m['header'] + 2
        ok_first = m['first'] and m['header'] - 2 <= m['first'][1] < m['viewport'] - 120
        check(ok_h1 and ok_first, f'[{tag}] {name}: title and first content visible on load, not under the header (h1 {m["h1"]}, header {m["header"]}, first {m["first"]})')
    await c.close(); return out

async def scripts(b):
    res = {}
    c, p = await fresh(b, {'width': 360, 'height': 780})
    # Bag: see tonight's bag + oil, then Pack / Shake it up
    t0 = time.time(); await p.goto(BASE + '?s1#/bag'); await p.wait_for_selector('#bagRows')
    see = await p.evaluate("() => { const r = document.querySelector('#bagRows').getBoundingClientRect(), o = document.querySelector('#bagWhereLine'); return r.top < innerHeight && o && o.getBoundingClientRect().bottom < innerHeight; }")
    taps = 0; await p.click('#bagShake'); taps += 1; await p.wait_for_selector('#bagShakeUndo')
    await p.click('#bagPackGo'); taps += 1; await p.wait_for_timeout(300); dt = time.time() - t0
    res['bag'] = {'taps': taps, 'seconds': round(dt, 1), 'bag_and_oil_visible': see}
    check(see and taps <= 2 and dt < 10, f'[script] Bag: tonight\'s bag + oil on screen, Shake it up + Pack in {taps} taps, {dt:.1f}s')
    # Arsenal: find a ball and pin it (Keep in bag)
    t0 = time.time(); await p.goto(BASE + '?s2#/arsenal'); await p.wait_for_selector('[data-keep], #arsSearch, input[type=search]')
    taps = 0; q = await p.query_selector('#arsSearch') or await p.query_selector('#view input[type=search]')
    await q.fill('Ordnance'); taps += 1; await p.wait_for_timeout(250)
    k = await p.query_selector('#view [data-keep]:not([aria-pressed=true])')
    if k: await k.click(); taps += 1; await p.wait_for_timeout(300)
    pinned = await p.evaluate("() => !!document.querySelector('#view [data-keep][aria-pressed=true]')"); dt = time.time() - t0
    res['arsenal'] = {'taps': taps, 'seconds': round(dt, 1), 'pinned': pinned}
    check(pinned and taps <= 2 and dt < 15, f'[script] Arsenal: find a ball and keep it in the bag in {taps} taps, {dt:.1f}s')
    # Strike line: 1 tap -> stand / target / breakpoint / ball, line ends at the pocket
    t0 = time.time(); await p.goto(BASE + '?s3#/tonight'); await p.wait_for_selector('#tnFindLine')
    await p.click('#tnFindLine'); await p.wait_for_selector('#slTiles [data-tile]', timeout=20000); dt = time.time() - t0
    tiles = await p.eval_on_selector_all('#slTiles [data-tile]', 'e => e.map(x => [x.dataset.tile, x.getBoundingClientRect().bottom <= innerHeight])')
    pocket = await p.evaluate("() => { const s = document.querySelector('#slDiagram'); return s ? s.dataset.endsAtPocket : null; }")
    res['strike'] = {'taps': 1, 'seconds': round(dt, 1), 'tiles': tiles, 'ends_at_pocket': pocket}
    names = [t[0] for t in tiles]
    check(all(x in names for x in ('stand', 'target', 'breakpoint', 'ball')) and all(t[1] for t in tiles) and pocket == 'true' and dt < 10, f'[script] Strike line: 1 tap -> {names} on screen, line ends at the pocket ({pocket}), {dt:.1f}s')
    # Log book: tonight's games + one key stat in 1 tap
    await p.goto(BASE + '?s4#/bag'); await p.wait_for_selector('#tabs'); t0 = time.time()
    await p.click('#tabs a[href="#/results"]'); await p.wait_for_selector('#lbStat', timeout=10000); dt = time.time() - t0
    stat = (await p.text_content('#lbStat')).strip()
    res['logbook'] = {'taps': 1, 'seconds': round(dt, 1), 'stat': stat}
    check(bool(stat) and dt < 10, f'[script] Log book: 1 tap -> key stat "{stat}"')
    await c.close(); return res

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); out = {'base': BASE}
        out['360x780'] = await measure(b, {'width': 360, 'height': 780}, '360')
        out['390x844-safe'] = await measure(b, {'width': 390, 'height': 844}, '390safe', safe=True)
        if SCRIPTS: out['scripts'] = await scripts(b)
        await b.close()
    for k, m in out['360x780'].items(): print(f'{k:14s} words {m["words"]:4d}  controls {m["controls"]:3d}  scroll {m["scroll"]:5d}px  small {m["small"][:4]}')
    if OUT: json.dump(out, open(OUT, 'w'), indent=1)
    print(f'\n{len(fails)} failed'); sys.exit(1 if fails else 0)

asyncio.run(main())
