"""usage: python tests/sim_report.py RUN OUT.md  -- aggregates /workspace/sim/run{RUN}-shard*.jsonl"""
import sys, json, glob, collections, statistics as st
RUN, OUT = sys.argv[1], sys.argv[2]
U = [json.loads(l) for f in sorted(glob.glob(f'/workspace/sim/run{RUN}-shard*.jsonl')) for l in open(f)]
pct = lambda a, p: (sorted(a)[min(len(a)-1, int(len(a)*p))] if a else None)
fails = collections.Counter(); 
for u in U:
    for f in u['fails']: fails[__import__('re').sub(r'\d+','N',f)[:90]] += 1
    for f in u['pageerrors']: fails['PAGEERROR '+f[:70]] += 1
    for f in u['console']: fails['CONSOLE '+f[:70]] += 1
saves = [s for u in U for s in u['saves']]; lat = [s[1] for s in saves]
nl = [s[1] for u in U if u['net'] == 'normal' for s in u['saves']]
api = [a for u in U for a in u['api']]; codes = collections.Counter(a[2] for a in api)
cors = sum(1 for u in U for f in u['console'] if 'CORS' in f or 'Access-Control' in f)
L = [f'# Simulation report run {RUN}', '', '**Scripted simulated users** (headless Playwright personas, not real people). Real-world coverage (real devices, GPS/alley wifi, human behaviour) is NOT proven by this.', '',
     f'- Users: {len(U)}; **pass {sum(u["pass"] for u in U)} / {len(U)} ({100*sum(u["pass"] for u in U)/max(1,len(U)):.0f}%)**',
     f'- By network: ' + ', '.join(f'{k} {sum(1 for u in U if u["net"]==k and u["pass"])}/{sum(1 for u in U if u["net"]==k)}' for k in sorted({u["net"] for u in U})),
     f'- By device: ' + ', '.join(f'{k} {sum(1 for u in U if u["device"]==k and u["pass"])}/{sum(1 for u in U if u["device"]==k)}' for k in sorted({u["device"] for u in U})),
     f'- Save latency (UI click -> status), all nets: n={len(lat)} p50={pct(lat,.5)} ms p95={pct(lat,.95)} ms max={max(lat) if lat else None}',
     f'- Save latency, normal network only: n={len(nl)} p50={pct(nl,.5)} ms p95={pct(nl,.95)} ms max={max(nl) if nl else None}',
     f'- Page load (ms): p50={pct([u["t"].get("load") for u in U if u["t"].get("load")],.5)} p95={pct([u["t"].get("load") for u in U if u["t"].get("load")],.95)}',
     f'- API responses: {len(api)}; status codes {dict(codes)}; API latency p50={pct([a[3] for a in api],.5)} p95={pct([a[3] for a in api],.95)} ms',
     f'- Console CORS errors: {cors}; failed requests (unexpected): {sum(1 for u in U for r in u["reqfail"] if not r[0].startswith("(expected)"))}',
     f'- Layout overflow findings: {sum(v for k,v in fails.items() if "overflow" in k)}', '', '## Failure types (count)']
L += [f'- {v} x {k}' for k, v in fails.most_common()] or ['- none']
L += ['', '## Failed users'] + [f'- u{u["user"]} {u["device"]} {u["net"]}: ' + '; '.join((u['fails']+u['pageerrors']+u['console'])[:3]) for u in U if not u['pass']][:40]
open(OUT, 'w').write('\n'.join(L)+'\n'); print('\n'.join(L[:14]))
