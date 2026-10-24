"""Run the cross-page journeys and write the storyboard report.
  python tests/journeys/run.py                       # local static server at http://localhost:8350/
  python tests/journeys/run.py --base https://majalen3.github.io/arsenal-pro-bowling/ --live
  python tests/journeys/run.py --only J04,J05 --update-baselines
Exit code: 0 when every step passed or failed only as a listed known issue (known_issues.json); 1 on any new failure,
visual regression beyond tolerance, or a probe budget breach."""
import argparse, asyncio, datetime, json, os, shutil, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from playwright.async_api import async_playwright
import lib, journeys as J, visual, report

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
JOURNEYS = [
    ('J01', 'First run and onboarding: choose hand, add a ball', 'lefty', J.j01_onboarding),
    ('J02', 'Home prep: bag builder, Status, export the arsenal', 'righty', J.j02_home_prep),
    ('J03', 'Arrival: center memory, pattern, Tonight stand/aim on every screen', 'righty', J.j03_arrival),
    ('J04', 'Solo game: strike, spare hint, ball change, fix, undo, 10th frame', 'righty', J.j04_solo_game),
    ('J05', 'League/Baker night: handicap, absentee, total-only, past midnight', 'league4', J.j05_league),
    ('J06', 'Between games: Weaker/Stronger, drag 25 -> 15, Aim Box', 'righty', J.j06_between_games),
    ('J07', 'Recap -> focus -> next session shows the focus', 'righty', J.j07_recap_next),
    ('J08', 'Insights, Bowler Card and leave patterns (flat 10)', 'righty', J.j08_insights),
    ('J09', 'Learning: Help "?" on every screen, Bowling Guide, Learn more', 'beginner', J.j09_learning),
    ('J10', 'Practice night spare drill', 'righty', J.j10_practice),
    ('J11', 'Data trust: offline, reload, sync, backup, CSV, restore, re-import', 'righty', J.j11_data_trust),
    ('J12', 'Coach review from a backup', 'coach', J.j12_coach),
    ('J13', 'Ball Status: four words, one source, pro shop never offered (IA P1.3, pending)', 'righty', J.j13_status),
    ('J14', 'Bag builder: one bag, Bring: N, 3 steps with why-not (IA P1.1/P1.2/P1.4, pending)', 'righty', J.j14_bag),
    ('J15', 'Front page: hand chip, Tonight fold, Learn first (IA P1.5-P1.7, pending)', 'righty', J.j15_front),
]


class Run:
    WIPE = lib.WIPE
    def __init__(s, a):
        s.base = a.base if a.base.endswith('/') else a.base + '/'; s.base_host = s.base.split('//', 1)[-1].split('/')[0]
        s.out = os.path.abspath(a.out); s.media = os.path.abspath(a.media); s.live = a.live
        s.known = {k: v for k, v in json.load(open(os.path.join(HERE, 'known_issues.json'))).items() if not k.startswith('_')}
        s.screens, s.results, s.visual, s.started = [], [], [], datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


async def run_journey(b, run, jid, title, persona, fn, video, timeout):
    api = lib.MockAPI()
    ctx = await b.new_context(viewport={'width': 360, 'height': 780}, is_mobile=True, has_touch=True, device_scale_factor=1, timezone_id='UTC',
                              locale='en-US', accept_downloads=True, service_workers='allow' if jid == 'J11' else 'block',
                              record_video_dir=os.path.join(run.media, 'video') if video else None, record_video_size={'width': 360, 'height': 780})
    ctx.set_default_timeout(8000)
    await ctx.route(lib.API, api.handle)   # nothing reaches the production API
    await ctx.tracing.start(screenshots=True, snapshots=True, sources=False)
    page = await ctx.new_page()
    j = lib.Journey(run, jid, title, persona, page, ctx, api)
    print(f'\n== {jid} {title} [{persona}]')
    t0 = time.time()
    try:
        await asyncio.wait_for(fn(j), timeout)
    except asyncio.TimeoutError:
        j.aborted = f'journey timed out after {timeout}s'
        async with j.step('Journey finished within the time limit') as s: s.check(False, j.aborted)
    except lib.Abort:
        pass
    except Exception as e:
        j.aborted = f'{type(e).__name__}: {str(e)[:200]}'
        async with j.step('Journey ran without a harness error') as s: s.check(False, j.aborted)
    tr = os.path.join(run.media, 'trace', f'{jid}.zip'); os.makedirs(os.path.dirname(tr), exist_ok=True)
    try: await ctx.tracing.stop(path=tr); j.trace = os.path.relpath(tr, run.media)
    except Exception: pass
    vp = page.video
    await ctx.close()
    if vp:
        try:
            src = await vp.path(); dst = os.path.join(run.media, 'video', f'{jid}.webm'); shutil.move(src, dst); j.video = os.path.relpath(dst, run.media)
        except Exception: pass
    d = j.asdict(); d['seconds'] = round(time.time() - t0, 1); run.results.append(d)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default='http://localhost:8350/'); ap.add_argument('--live', action='store_true')
    ap.add_argument('--only', default=''); ap.add_argument('--out', default=os.path.join(ROOT, 'docs/qa-reports/latest'))
    ap.add_argument('--media', default=os.path.join(os.environ.get('TMPDIR', '/tmp'), 'arsenal-qa-media')); ap.add_argument('--no-video', action='store_true')
    ap.add_argument('--no-visual', action='store_true'); ap.add_argument('--update-baselines', action='store_true')
    ap.add_argument('--visual-tolerance', type=float, default=float(os.environ.get('QA_VISUAL_TOL', '0.02')))
    ap.add_argument('--timeout', type=int, default=150)
    a = ap.parse_args()
    if os.path.isdir(a.out): shutil.rmtree(a.out)
    os.makedirs(a.out, exist_ok=True); os.makedirs(a.media, exist_ok=True)
    run = Run(a); only = {x.strip().upper() for x in a.only.split(',') if x.strip()}
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for jid, title, persona, fn in JOURNEYS:
            if only and jid not in only and not (only == {'VISUAL'}): continue
            if only == {'VISUAL'}: break
            await run_journey(b, run, jid, title, persona, fn, not a.no_video, a.timeout)
        if not a.no_visual and (not only or 'VISUAL' in only):
            run.visual = await visual.run(b, run, update=a.update_baselines, tol=a.visual_tolerance)
        await b.close()
    summary = report.write(run)
    print(f"\n{summary['passed']} passed, {summary['failed']} failed, {summary['known']} known, {summary['skipped']} skipped steps; "
          f"visual {summary['visual_fail']} over tolerance; report: {os.path.relpath(os.path.join(run.out, 'index.html'), ROOT)}")
    new_fail = summary['failed_total'] + summary['visual_fail']
    if summary['fixed']: print('Known issues now passing (remove from known_issues.json):', ', '.join(summary['fixed']))
    sys.exit(1 if new_fail else 0)

if __name__ == '__main__':
    asyncio.run(main())
