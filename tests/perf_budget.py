"""Performance budget gate (owner t134u). Fails (exit 1) when a measured number is over its limit in tests/perf/budget.json.

  python tests/perf_budget.py                          # fast, no browser: bytes, module count, SW list, replay time (node)
  python tests/perf_budget.py --browser http://localhost:8320/ [--runs 3]
                                                       # + hot paths in Chromium at 4x CPU on the 50-ball / 500-game dataset
  python tests/perf_budget.py --lighthouse DIR         # + Lighthouse scores from DIR/*.report.json or DIR/summary.json (target >= 0.85)
  python tests/perf_budget.py --measure                # print the numbers only (to set or tighten a budget), never fails

How limits were set: bytes and counts are exact, so they get small headroom (see PERF_BUDGET.md). Times depend on the machine:
the limits are the measured value after the v75 pass x ~1.6, measured here under 4x CPU throttle against python's http.server, so a
real regression (2x or worse) fails and normal noise does not. Run it on the same machine before and after a change.
Local gate only: wiring it into a CI workflow needs a .github/workflows change (see PERF_BUDGET.md)."""
import json, os, subprocess, sys, glob
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
B = json.load(open(os.path.join(HERE, 'perf', 'budget.json')))
args = sys.argv[1:]; opt = lambda k, d=None: args[args.index(k) + 1] if k in args else d
MEASURE = '--measure' in args; fails, rows = [], []

def check(name, value, limit, unit='', lo=False):
    ok = value is None or (value >= limit if lo else value <= limit)
    rows.append((('PASS ' if ok else 'FAIL ') + name, value, ('>= ' if lo else '<= ') + str(limit) + unit))
    if not ok and not MEASURE: fails.append(name)

def node(script, *a):
    return subprocess.run(['node', os.path.join(HERE, 'perf', script), *a], capture_output=True, text=True, cwd=ROOT, timeout=300)

# 1. static, deterministic
st = json.loads(node('static_audit.mjs', '--json').stdout); S = B['static']
check('js bytes (all modules, excl. vendor OCR)', st['js_bytes'] - sum(os.path.getsize(os.path.join(ROOT, f)) for f in glob.glob(os.path.join(ROOT, 'js/vendor/tesseract/*.js'))), S['js_bytes_max'])
check('css bytes', st['css_bytes'], S['css_bytes_max'])
check('js module count', st['modules'], S['modules_max'])
check('service worker precache entries', st['sw_shell_entries'], S['sw_shell_max'])
check('precache entries missing on disk', len(st['sw_missing_files']), 0)
# 2. replay at realistic size (node, no throttle)
rb = json.loads(node('replay_bench.mjs', '--json').stdout)
check(f"replay: project() over {rb['events_large']} events (50 balls, 500 games), ms", rb['project_large_ms'], B['replay']['project_large_ms_max'], ' ms')
check('replay: small log (10 balls, 30 games), ms', rb['project_small_ms'], B['replay']['project_small_ms_max'], ' ms')
# 3. browser hot paths
if opt('--browser'):
    out = '/tmp/perf_budget_profile.json'; env = dict(os.environ)
    r = subprocess.run([sys.executable, os.path.join(HERE, 'perf', 'profile.py'), opt('--browser'), '--runs', opt('--runs', '3'), '--out', out], capture_output=True, text=True, timeout=1800)
    if r.returncode: print(r.stdout[-500:], r.stderr[-800:]); sys.exit(2)
    R = json.load(open(out)); D = R['data']; H = B['browser']
    for key, limit in H['cold_js_bytes_max'].items(): check(f'cold {key}: JS bytes fetched', R[key]['js'], limit)
    for key, limit in H['cold_modules_max'].items(): check(f'cold {key}: modules fetched', R[key]['modules'], limit)
    for key, limit in H['cold_fcp_ms_max'].items(): check(f'cold {key}: first contentful paint (4x CPU)', R[key]['fcp'], limit, ' ms')
    for key, limit in H['route_painted_ms_max'].items(): check(f'{key}: navigation to screen painted (4x CPU, big data)', D[key]['painted'], limit, ' ms')
    check('score tap to painted (4x CPU, big data)', D['score'].get('tap_to_paint_ms'), H['score_tap_ms_max'], ' ms')
    check('Arsenal sort settle', D['arsenal']['sort_tap_settle_ms'], H['arsenal_sort_ms_max'], ' ms')
    check('Bag: Shake it up settle', D['bag']['shake_tap_settle_ms'], H['bag_shake_ms_max'], ' ms')
    check('Lane Optimize tap: the Forgiving sweep (4x CPU)', D['strike'].get('optimize_ms'), H['optimize_ms_max'], ' ms')
    check('long tasks on the game page (count)', D['route_game']['longtasks'], H['game_longtasks_max'])
# 4. Lighthouse
if opt('--lighthouse'):
    d = opt('--lighthouse'); L = B['lighthouse']
    for f in sorted(glob.glob(os.path.join(d, '*.report.json'))):
        j = json.load(open(f)); check('lighthouse performance: ' + os.path.basename(f).replace('.report.json', ''), j['categories']['performance']['score'], L['performance_target'], '', lo=True)
w = max(len(r[0]) for r in rows)
for n, v, l in rows: print(f'{n:<{w}}  {v!s:>9}  {l}')
print(f"\n{len(rows) - len(fails)}/{len(rows)} within budget" + ('' if not fails else f"; OVER BUDGET: {fails}"))
sys.exit(1 if fails else 0)
