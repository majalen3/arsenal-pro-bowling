"""Lighthouse budgets for the screens a bowler sees on a league night (mobile emulation, Lighthouse defaults).

  python tests/journeys/lighthouse.py --base http://localhost:8350/ --out docs/qa-reports/latest/lighthouse

Budgets (docs/QA_PLAN.md section 4.11): performance >= 80, accessibility >= 95, best practices >= 90.
Uses `npx lighthouse@12` and the Playwright Chromium (CHROME_PATH), so nothing else is installed globally.
Exit 1 when any screen is under budget; scores go to summary.json next to the HTML reports."""
import argparse, glob, json, os, subprocess, sys

BUDGET = {'performance': 0.80, 'accessibility': 0.95, 'best-practices': 0.90}
ROUTES = [('welcome', '#/welcome'), ('tonight', '#/tonight'), ('lane', '#/lane'), ('arsenal', '#/arsenal'), ('sessions', '#/sessions'), ('more', '#/more')]


def chrome():
    if os.environ.get('CHROME_PATH'): return os.environ['CHROME_PATH']
    c = sorted(glob.glob(os.path.expanduser('~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome')))
    return c[-1] if c else None


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--base', default='http://localhost:8350/'); ap.add_argument('--out', default='/tmp/lighthouse')
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
    env = dict(os.environ); cp = chrome()
    if cp: env['CHROME_PATH'] = cp
    rows, bad = [], []
    for name, route in ROUTES:
        base = os.path.join(a.out, name)
        cmd = ['npx', '-y', 'lighthouse@12', a.base + route, '--quiet', '--output=json', '--output=html', f'--output-path={base}',
               '--only-categories=performance,accessibility,best-practices', '--chrome-flags=--headless=new --no-sandbox']
        p = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=240)
        try:
            rep = json.load(open(base + '.report.json'))
        except Exception:
            bad.append(f'{name}: lighthouse did not run ({p.stderr.strip()[-200:]})'); continue
        sc = {k: rep['categories'][k]['score'] for k in BUDGET}
        rows.append(dict(screen=name, url=a.base + route, **sc))
        for k, lim in BUDGET.items():
            if sc[k] is None or sc[k] < lim: bad.append(f'{name}: {k} {sc[k]} < {lim}')
        print(f"  [LH] {name:9} perf {sc['performance']}  a11y {sc['accessibility']}  bp {sc['best-practices']}")
    json.dump(dict(budget=BUDGET, screens=rows, over_budget=bad), open(os.path.join(a.out, 'summary.json'), 'w'), indent=1)
    for b in bad: print('  [LH FAIL]', b)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
