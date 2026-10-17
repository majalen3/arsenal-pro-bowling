"""usage: python tests/sim_cleanup.py API_URL RUN... -- DELETE /api/me for every device id seen in sim runs (paced)."""
import sys, json, glob, time, urllib.request
API = sys.argv[1]; runs = sys.argv[2:]; ids = set()
for r in runs:
    for f in glob.glob(f'/workspace/sim/run{r}-shard*.jsonl'):
        for l in open(f):
            d = json.loads(l).get('device_id')
            if d: ids.add(d)
n = tot = 0
for d in sorted(ids):
    for attempt in range(3):
        try:
            rq = urllib.request.Request(API + '/api/me', method='DELETE', headers={'X-Device-Id': d, 'Origin': 'https://majalen3.github.io'})
            res = json.load(urllib.request.urlopen(rq, timeout=40)); tot += sum(res['deleted'].values()); n += 1; break
        except Exception as e:
            time.sleep(2)
    time.sleep(0.15)
print(f'cleaned {n}/{len(ids)} devices, {tot} rows deleted')
