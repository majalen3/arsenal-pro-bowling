"""Visual regression at 360x780 and 414x896 on seeded, clock-frozen data. Baselines live in tests/journeys/baselines/
(committed). A screen fails when more than `tol` of its pixels differ by > 40/255 on any channel (anti-aliasing noise
stays under that). Update after an intended UI change: python tests/journeys/run.py --only visual --update-baselines"""
import os, shutil, datetime
from PIL import Image, ImageChops
import lib
from personas import NIGHT0, boot, seed_history

HERE = os.path.dirname(os.path.abspath(__file__))
VIEWPORTS = [(360, 780), (414, 896)]
SCREENS = [('tonight', '/tonight'), ('lane', '/lane'), ('target', '/target'), ('arsenal', '/arsenal'), ('ball', '/ball/rattler-big-bite'),
           ('bag', '/bag'), ('patterns', '/patterns'), ('sessions', '/sessions'), ('session', '/session/qa-night-2'), ('card', '/card'),
           ('insights', '/arsenal/insights'), ('more', '/more'), ('glossary', '/glossary')]
HIDE = "() => { document.querySelectorAll('.toast, #toast, .toasts').forEach(e => e.remove()); }"


def diff(a, b):
    A, B = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
    if A.size != B.size: return 1.0, None
    d = ImageChops.difference(A, B).convert('L').point(lambda v: 255 if v > 40 else 0)
    n = sum(1 for v in d.getdata() if v); return n / (A.size[0] * A.size[1]), d


async def run(b, run, update=False, tol=0.02):
    out = []
    for w, h in VIEWPORTS:
        ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=True, has_touch=True, device_scale_factor=1, timezone_id='UTC', locale='en-US', service_workers='block', reduced_motion='reduce')
        await ctx.route(lib.API, lib.MockAPI().handle); page = await ctx.new_page()
        j = lib.Journey(run, f'V{w}', 'visual', 'righty', page, ctx, lib.MockAPI())
        try:
            await boot(j, 'righty', clock=NIGHT0); await seed_history(j, nights=2)
            await page.clock.set_fixed_time(NIGHT0 + datetime.timedelta(hours=1))
        except Exception as e:
            out.append(dict(screen='setup', vp=f'{w}x{h}', status='fail', ratio=1, note=str(e)[:200])); await ctx.close(); continue
        for name, route in SCREENS:
            vp = f'{w}x{h}'; base = os.path.join(HERE, 'baselines', vp, name + '.png'); cur = os.path.join(run.out, 'visual', vp, name + '.png')
            os.makedirs(os.path.dirname(cur), exist_ok=True); os.makedirs(os.path.dirname(base), exist_ok=True)
            r = dict(screen=name, vp=vp, route=route, shot=os.path.relpath(cur, run.out))
            try:
                # Boot on a neutral screen, wait for the event log, then route in-app: a pixel diff must not depend on a
                # cold-load race (that race is asserted by J08 'Insights cold load' instead).
                await page.goto(run.base + '?v=' + name + '#/more'); await page.evaluate("async () => { const m = await import('./js/hub.js'); await m.ready(); }")
                await page.evaluate("r => { location.hash = r; }", route); await page.wait_for_timeout(700); await page.evaluate(HIDE)
                await page.screenshot(path=cur, animations='disabled', caret='hide')
                if update or not os.path.exists(base):
                    shutil.copy(cur, base); r.update(status='new' if not update else 'updated', ratio=0)
                else:
                    ratio, d = diff(base, cur); r['ratio'] = round(ratio, 4)
                    r['status'] = 'pass' if ratio <= tol else 'fail'
                    shutil.copy(base, cur.replace('.png', '.base.png')); r['base'] = os.path.relpath(cur.replace('.png', '.base.png'), run.out)
                    if d is not None and ratio > 0:
                        dp = cur.replace('.png', '.diff.png'); d.save(dp); r['diff'] = os.path.relpath(dp, run.out)
            except Exception as e:
                r.update(status='fail', ratio=1, note=str(e)[:200])
            print(f"  [VIS {r['status'].upper():5}] {vp} {name} {r.get('ratio', '')}")
            out.append(r)
        await ctx.close()
    return out
