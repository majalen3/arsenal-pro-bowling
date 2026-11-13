"""t139u smoke: Add a ball shows the legal source chain. Mocks /api/spec-lookup with a chain result (archived maker page + USBC),
checks per-field source chips, the "Checked:" line, the check-against-the-box note, and that nothing is saved until Add.
usage: python tests/addball_chain_smoke.py [--shots DIR]   (starts its own static server on :8311)"""
import asyncio, json, os, subprocess, sys, time
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FX = json.load(open(os.path.join(ROOT, 'tests/data/fixtures/lookup-chain-archived.json')))
SHOTS = sys.argv[sys.argv.index('--shots') + 1] if '--shots' in sys.argv else None
fails = []
def check(c, n): print(('PASS ' if c else 'FAIL ') + n); (None if c else fails.append(n))
async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8311', '--directory', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    try:
        async with async_playwright() as pw:
            b = await pw.chromium.launch(); c = await b.new_context(viewport={'width': 360, 'height': 780}, is_mobile=True, has_touch=True); calls = []
            await c.route('**/arsenal-pro-api.onrender.com/**', lambda r: r.abort())
            async def look(route):
                calls.append(route.request.url); await route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body=json.dumps(FX))
            await c.route('**/arsenal-pro-api.onrender.com/api/spec-lookup**', look)
            p = await c.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
            await p.goto('http://127.0.0.1:8311/?ab#/add-ball'); await p.wait_for_selector('#abQ')
            await p.fill('#abQ', 'Brunswick Fury Orange Red'); await p.wait_for_selector('#abList [data-pick]'); await p.click('#abList [data-pick]')
            await p.wait_for_selector('#abStatus[data-state=found]'); await p.wait_for_selector('#abConfirm')
            st = await p.text_content('#abStatus'); check('saved copy of the maker page' in st and 'USBC list' in st, f'status names the sources: {st!r}')
            ch = await p.text_content('#abChain'); check('Archived maker page: found' in ch and 'USBC list: found' in ch, f'chain line: {ch!r}')
            rg = await p.text_content('#abFields [data-f=rg]'); check('2.541' in rg and 'archived maker page' in rg, f'RG chip says archived maker page [{rg}]')
            fin = await p.text_content('#abFields [data-f=finish]'); check('Crown Factory Polish' in fin and 'archived' not in fin, f'finish from the live maker page keeps the normal chip [{fin}]')
            us = await p.text_content('#abFields [data-f=usbc]'); check('2023-05-02' in us and 'USBC list' in us, f'USBC approval date with its own chip [{us}]')
            check(await p.query_selector('#abNonMaker') is not None, 'a "check against the box" note lists the values not from the maker page')
            check(len(await p.query_selector_all('#abFields .prov[data-prov=archived]')) >= 2, 'archived chips are styled apart from maker chips')
            ow = await p.evaluate("document.documentElement.scrollWidth <= window.innerWidth"); check(ow, 'no horizontal overflow at 360 px')
            check(await p.evaluate("(() => { try { return !JSON.stringify(Object.keys(localStorage)).includes('owned'); } catch (e) { return true; } })()"), 'nothing saved before the user taps Add')
            check(not errs, f'no page errors {errs[:2]}')
            if SHOTS: os.makedirs(SHOTS, exist_ok=True); await p.screenshot(path=os.path.join(SHOTS, 'addball-chain-360.png'), full_page=True)
            await b.close()
    finally: srv.terminate()
    print('FAILS', fails) if fails else print('ALL PASS')
    sys.exit(1 if fails else 0)
asyncio.run(main())
