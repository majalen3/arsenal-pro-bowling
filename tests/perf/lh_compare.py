"""Lighthouse (mobile defaults) N runs per route against one or two servers; prints median score, FCP, LCP, TBT.
  python tests/perf/lh_compare.py --runs 3 --routes tonight,bag LABEL=http://localhost:8321/ LABEL2=http://localhost:8320/
Lighthouse's own run-to-run noise is about +-0.04 on a laptop, so judge by the median of several runs."""
import argparse, json, os, statistics, subprocess, sys, glob
ap = argparse.ArgumentParser(); ap.add_argument('--runs', type=int, default=3); ap.add_argument('--routes', default='tonight,bag'); ap.add_argument('--out', default='/tmp/lhc'); ap.add_argument('bases', nargs='+')
a = ap.parse_args(); env = dict(os.environ)
cp = sorted(glob.glob(os.path.expanduser('~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome')))
if cp and not env.get('CHROME_PATH'): env['CHROME_PATH'] = cp[-1]
os.makedirs(a.out, exist_ok=True); res = {}
for r in a.routes.split(','):
    for spec in a.bases:
        label, base = spec.split('=', 1); rows = []
        for i in range(a.runs):
            out = f'{a.out}/{label}-{r}-{i}'
            subprocess.run(['npx', '-y', 'lighthouse@12', f'{base}#/{r}', '--quiet', '--output=json', f'--output-path={out}', '--only-categories=performance', '--chrome-flags=--headless=new --no-sandbox'], env=env, capture_output=True, text=True, timeout=240)
            try: j = json.load(open(out if os.path.exists(out) else out + '.report.json'))
            except Exception: continue
            A = j['audits']; rows.append((j['categories']['performance']['score'], A['first-contentful-paint']['numericValue'], A['largest-contentful-paint']['numericValue'], A['total-blocking-time']['numericValue']))
        if rows:
            m = [statistics.median(c) for c in zip(*rows)]; res[f'{label}/{r}'] = dict(score=round(m[0], 2), fcp_ms=round(m[1]), lcp_ms=round(m[2]), tbt_ms=round(m[3]), runs=len(rows), scores=[round(x[0], 2) for x in rows])
            print(f'{label:8} {r:8} score {m[0]:.2f}  FCP {m[1]:.0f} ms  LCP {m[2]:.0f} ms  TBT {m[3]:.0f} ms  runs {[round(x[0], 2) for x in rows]}', flush=True)
json.dump(res, open(a.out + '/summary.json', 'w'), indent=1)
