"""Arsenal Pro 2.0 after-audit: same 5 jobs and KLM model as the v1 baseline (before_jobs.json), plus screenshots.
API blocked (no production writes). Portable: run from any checkout.
Usage: python tests/ux/audit_after.py [BASE_URL] [--out DIR]   (env: AP_BASE, AP_SHOTS, AP_UX_OUT)"""
import sys, json, os, argparse
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from harness import Job
from playwright.sync_api import sync_playwright
ap = argparse.ArgumentParser(); ap.add_argument('base', nargs='?', default=os.environ.get('AP_BASE', 'http://127.0.0.1:8300/'))
ap.add_argument('--out', default=os.environ.get('AP_SHOTS', str(HERE / 'out' / 'shots')), help='screenshot dir')
ap.add_argument('--data', default=os.environ.get('AP_UX_OUT', str(HERE / 'out')), help='where after_jobs.json / task_times.md go')
a_ = ap.parse_args(); BASE, OUT, DATA = a_.base, a_.out, Path(a_.data)
os.makedirs(OUT, exist_ok=True); DATA.mkdir(parents=True, exist_ok=True)
VPS = {'phone': (390, 844, True), 'desktop': (1280, 800, False)}
before = json.load(open(HERE / 'before_jobs.json'))
res = {}
with sync_playwright() as p:
    br = p.chromium.launch()
    for vn, (w, h, m) in VPS.items():
        def fresh(route='#/lane'):
            c = br.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=m, has_touch=m)
            c.route('**/arsenal-pro-api.onrender.com/**', lambda r: r.abort())
            pg = c.new_page(); pg.goto(BASE); pg.evaluate("localStorage.setItem('ap_prefs', JSON.stringify({onboarded:true}))")
            pg.goto(BASE + route); pg.wait_for_selector('#view h1'); pg.wait_for_timeout(800); return c, pg
        c, pg = fresh()
        for r, n in [('#/lane', 'lane'), ('#/arsenal', 'arsenal'), ('#/ball/hy-road', 'ball'), ('#/compare?ids=hy-road,rattler', 'compare'), ('#/patterns', 'patterns'), ('#/pattern/2024-pba-shark', 'pattern'), ('#/sessions', 'sessions'), ('#/more', 'more')]:
            pg.goto(BASE + r); pg.wait_for_timeout(900); pg.screenshot(path=f'{OUT}/{vn}-{n}.png')
            if n in ('lane', 'arsenal'): pg.screenshot(path=f'{OUT}/{vn}-{n}-full.png', full_page=True)
        pg.evaluate("document.documentElement.dataset.theme='light'"); pg.goto(BASE + '#/lane'); pg.wait_for_timeout(900); pg.screenshot(path=f'{OUT}/{vn}-lane-light.png')
        c.close()
        jobs = []
        c, pg = fresh(); j = Job(pg, '1 pick ball, see line', h); j.tap('#qballs .qball[data-ball]'); j.see('#deck'); jobs.append(j.result()); c.close()
        c, pg = fresh(); j = Job(pg, '2 adjust after miss', h); j.see('#deckCard'); j.tap('[data-miss=left]'); j.see('#deckCard'); jobs.append(j.result()); c.close()
        c, pg = fresh(); j = Job(pg, '3 save + recall line', h); j.tap('#saveBtn'); j.tap('[data-miss=left]'); j.tap('#backBtn'); j.see('#deck'); jobs.append(j.result()); c.close()
        c, pg = fresh(); j = Job(pg, '4 compare two balls', h); j.tap('#ballBtn'); j.tap('#ballSheet .brow:nth-child(2) .icon-btn'); j.see('.cmp-table'); jobs.append(j.result()); c.close()
        c, pg = fresh(); j = Job(pg, '5 pick next ball (light oil)', h); j.tap('#ballBtn'); j.tap('#ballSheet .chip[data-f=light]'); j.tap('#ballSheet .brow:not(.current) .brow-main'); j.see('#deck'); jobs.append(j.result()); c.close()
        res[vn] = jobs
    br.close()
json.dump(res, open(DATA / 'after_jobs.json', 'w'), indent=1)
lines = ['| Job | Device | Before taps | After taps | Before KLM s | After KLM s | Change |', '|---|---|---|---|---|---|---|']
for vn in res:
    tb = sum(x['klm_s'] for x in before[vn]); ta = sum(x['klm_s'] for x in res[vn])
    for b, a in zip(before[vn], res[vn]):
        lines.append(f"| {a['job']} | {vn} | {b['taps']} | {a['taps']} | {b['klm_s']} | {a['klm_s']} | {round(100*(a['klm_s']-b['klm_s'])/b['klm_s'])}% |")
    lines.append(f"| **Total** | {vn} | | | **{round(tb,1)}** | **{round(ta,1)}** | **{round(100*(ta-tb)/tb)}%** |")
open(DATA / 'task_times.md', 'w').write('\n'.join(lines) + '\n'); print('\n'.join(lines))
for vn in res:
    for a in res[vn]: print(vn, a)
