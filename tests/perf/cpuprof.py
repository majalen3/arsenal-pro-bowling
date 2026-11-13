"""Where does the time go on one route? CDP sampling profiler, 4x CPU throttle, big dataset (50 balls / 500 games).
  python tests/perf/cpuprof.py http://localhost:8320/ '#/results' [--top 15]
Prints self time by function (ms, as sampled under throttle). Dev tool only; nothing here ships."""
import asyncio, sys, collections
sys.argv += []  # profile.py reads argv
import importlib.util
spec = importlib.util.spec_from_file_location('prof', __file__.replace('cpuprof.py', 'profile.py'))
src = open(spec.origin).read().replace('asyncio.run(main())', '')
ns = {'__name__': 'prof'}; exec(compile(src, spec.origin, 'exec'), ns)
from playwright.async_api import async_playwright
BASE, route = ns['BASE'], next(a for a in sys.argv[1:] if a.startswith('#'))
TOP = int(sys.argv[sys.argv.index('--top') + 1]) if '--top' in sys.argv else 15
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); c = await ns['newctx'](b); p = await c.new_page(); await ns['load_big'](p)
        s = await c.new_cdp_session(p); await s.send('Emulation.setCPUThrottlingRate', {'rate': ns['CPU']}); await s.send('Profiler.enable'); await s.send('Profiler.setSamplingInterval', {'interval': 200})
        await p.goto(BASE + '?perf=1&cp=1'); await p.wait_for_timeout(500)
        await s.send('Profiler.start'); await p.evaluate("(r) => { location.hash = r; }", route.lstrip('#') and route)
        await p.wait_for_timeout(4000)
        prof = (await s.send('Profiler.stop'))['profile']; nodes = {n['id']: n for n in prof['nodes']}
        self_t = collections.Counter(); tot = 0
        for i, dt in zip(prof['samples'], prof['timeDeltas']):
            cf = nodes[i]['callFrame']; k = f"{cf['functionName'] or '(anon)'} {cf['url'].split('/')[-1]}:{cf['lineNumber'] + 1}"; self_t[k] += dt; tot += dt
        print(f'route {route}: sampled {tot/1000:.0f} ms total')
        for k, v in self_t.most_common(TOP): print(f'{v/1000:8.1f} ms  {k}')
        await b.close()
asyncio.run(main())
