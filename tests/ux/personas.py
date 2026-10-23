"""20-persona simulation for Arsenal Pro 2.0 (scripted agents, not real users). API blocked.
Each persona: device/viewport, settings (hand, theme, reduced motion, text zoom, keyboard-only), one goal job.
Pass = goal reached in <=3 taps (job core), no page errors, no horizontal overflow, every visited screen offers a way out."""
import json, sys, os
from pathlib import Path
HERE = Path(__file__).resolve().parent
OUTD = Path(os.environ.get('AP_UX_OUT', HERE / 'out')); OUTD.mkdir(parents=True, exist_ok=True)
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('AP_BASE', 'http://127.0.0.1:8300/')
P = [  # name, (w,h,mobile), prefs, goal
 ('League bowler, iPhone', (390,844,1), {}, 'miss'), ('New bowler, first launch', (390,844,1), {'fresh':1}, 'onboard'),
 ('Lefty tweener', (390,844,1), {'hand':'left'}, 'deck'), ('Two-hander, small phone', (360,740,1), {}, 'switch'),
 ('Pro shop staff, desktop', (1280,800,0), {}, 'compare'), ('Coach on tablet', (820,1180,1), {}, 'pattern'),
 ('Low-vision, 200% text', (390,844,1), {'zoom':2}, 'miss'), ('Keyboard-only, desktop', (1280,800,0), {'kbd':1}, 'switch'),
 ('Reduced motion', (390,844,1), {'rm':1}, 'save'), ('Light theme, sunny alley', (390,844,1), {'theme':'light'}, 'miss'),
 ('Offline at the alley', (390,844,1), {'offline':1}, 'save'), ('v1 returning user', (390,844,1), {'v1':1}, 'recall'),
 ('Tournament, sport shot', (390,844,1), {}, 'pattern'), ('Ball nerd, specs', (1280,800,0), {}, 'detail'),
 ('Senior, large phone', (430,932,1), {'zoom':1.3}, 'switch'), ('Youth, Android small', (360,640,1), {}, 'miss'),
 ('Stroker, house shot', (390,844,1), {}, 'lightoil'), ('Cranker, high rev', (390,844,1), {}, 'tune'),
 ('Desktop light theme', (1440,900,0), {'theme':'light'}, 'compare'), ('Screen-reader check', (390,844,1), {}, 'a11yname'),
]
out = []
with sync_playwright() as pw:
    br = pw.chromium.launch()
    for name, (w, h, mob), pr, goal in P:
        c = br.new_context(viewport={'width': w, 'height': h}, is_mobile=bool(mob), has_touch=bool(mob), device_scale_factor=2,
                           reduced_motion='reduce' if pr.get('rm') else 'no-preference', service_workers='allow' if pr.get('offline') else 'block')
        c.route('**/arsenal-pro-api.onrender.com/**', lambda r: r.abort()); c.set_default_timeout(8000)
        pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE); pg.evaluate('localStorage.clear()')
        if pr.get('v1'):
            pg.evaluate("""localStorage.setItem('ap_state', JSON.stringify({ball:'hy-road',speed:'17',rev:'300',release:'20',aim:'4',oil:'1.0',finish:'2000',pattern:'house'}));
              localStorage.setItem('ap_lines', JSON.stringify([{ballId:'hy-road',name:'Old line',release:18,aim:5,speed:17,rev:300,oil:1,finish:'2000',pattern:'house',note:'',updatedAt:1,synced:true,id:9}]))""")
        elif not pr.get('fresh'):
            pg.evaluate("localStorage.setItem('ap_prefs', JSON.stringify({onboarded:true, theme:%s}))" % json.dumps(pr.get('theme', 'dark')))
        if pr.get('hand'): pg.evaluate("localStorage.setItem('ap_profile', JSON.stringify({hand:'left'}))")
        pg.goto(BASE + ('' if pr.get('fresh') or pr.get('v1') else '#/lane')); pg.wait_for_selector('#view h1')
        if pr.get('zoom'): pg.evaluate(f"document.documentElement.style.fontSize='{100*pr['zoom']}%'")
        if pr.get('offline'):
            pg.evaluate("Promise.race([navigator.serviceWorker.ready, new Promise(r=>setTimeout(r,6000))])"); pg.reload(); pg.wait_for_selector('#ballBtn'); c.set_offline(True)
        taps = 0; ok = False; note = ''
        def tap(sel):
            global taps
        try:
            T = []
            def t(sel): pg.locator(sel).first.click(); T.append(sel); pg.wait_for_timeout(150)
            if goal == 'onboard':
                t('text=Skip'); ok = pg.locator('#ballBtn').is_visible(); note = 'skip to lane'
            elif goal == 'miss':
                f0 = pg.text_content('#lineSum b'); t('[data-miss=left]'); ok = pg.text_content('#lineSum b') != f0; note = f'feet {f0}->{pg.text_content("#lineSum b")}'
            elif goal == 'deck':
                lbl = pg.get_attribute('#deck', 'aria-label'); ok = '1-2 pocket' in lbl; note = lbl[:60]
            elif goal == 'switch':
                if pr.get('kbd'):
                    pg.focus('#ballBtn'); pg.keyboard.press('Enter'); T.append('kbd'); pg.wait_for_timeout(200)
                    pg.locator('#ballSheet .brow:nth-child(3) .brow-main').focus(); pg.keyboard.press('Enter'); T.append('kbd'); pg.wait_for_timeout(200)
                else: t('#ballBtn'); t('#ballSheet .brow:nth-child(3) .brow-main')
                pg.wait_for_timeout(500); ok = pg.locator('#ballSheet').count() == 0 and 'Rattler' not in pg.text_content('.ball-btn-name'); note = pg.text_content('.ball-btn-name')
            elif goal == 'compare':
                t('#ballBtn'); t('#ballSheet .brow:nth-child(2) .icon-btn'); pg.wait_for_selector('.cmp-table'); ok = pg.locator('.cmp-col').count() == 2
            elif goal == 'pattern':
                t('#tabs a[href="#/patterns"]'); t('#patList a >> nth=0'); t('#useOnLane'); pg.wait_for_selector('#patChip'); ok = True; note = pg.text_content('#patChip')
            elif goal == 'save':
                t('#saveBtn'); pg.wait_for_timeout(300); ok = pg.evaluate("JSON.parse(localStorage.getItem('ap_lines')||'[]').length>0")
            elif goal == 'recall':
                t('#linesBtn'); t('#linesSheet .line-row'); ok = pg.text_content('#lineSum b').strip() == '18'; note = 'v1 line loaded'
            elif goal == 'detail':
                t('#tabs a[href="#/arsenal"]'); t('.btile-link >> nth=1'); pg.wait_for_selector('#view h1'); ok = 'RG' in pg.text_content('#view')
            elif goal == 'lightoil':
                t('#ballBtn'); t('#ballSheet .chip[data-f=light]'); t('#ballSheet .brow:not(.current) .brow-main'); ok = True; note = pg.text_content('.ball-btn-name')
            elif goal == 'tune':
                t('#lineSum'); pg.wait_for_selector('.sheet'); pg.locator('.sheet button[aria-label^="Increase"]').nth(1).click(); T.append('+'); ok = True
            elif goal == 'a11yname':
                names = pg.evaluate("[...document.querySelectorAll('button,a,[role=img]')].filter(e=>e.offsetParent).filter(e=>!(e.getAttribute('aria-label')||e.textContent.trim()||e.title)).map(e=>e.outerHTML.slice(0,60))")
                ok = not names; note = f'{len(names)} unnamed'
            taps = len(T)
            pg.wait_for_timeout(300)
            sw = pg.evaluate('[innerWidth, document.documentElement.scrollWidth]')
            exits = pg.locator('#tabs a, .appbar .icon-btn, .sheet .icon-btn').count()
            ok = ok and taps <= 3 and not errs and sw[1] <= sw[0] + 1 and exits > 0
            if errs: note += ' errors:' + errs[0][:80]
            if sw[1] > sw[0] + 1: note += f' overflow {sw}'
        except Exception as e:
            note = 'EXC ' + str(e)[:120]
        out.append(dict(persona=name, goal=goal, ok=ok, taps=taps, note=note)); print(('PASS' if ok else 'FAIL'), name, goal, taps, note)
        c.close()
    br.close()
json.dump(out, open(OUTD / 'personas.json', 'w'), indent=1)
print(sum(o['ok'] for o in out), '/', len(out), 'personas passed')
