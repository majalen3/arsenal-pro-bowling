"""Local-only Phase1 acceptance. Fresh synthetic browser contexts; all external HTTP blocked.
Usage: /workspace/pwenv/bin/python tests/foundation_smoke.py http://localhost:8370/ --shots /tmp/shots-launch-foundation
No real accounts, private inventory, recovery keys, or live writes.
"""
import asyncio, json, os, sys
from pathlib import Path
from playwright.async_api import async_playwright
BASE=next((a for a in sys.argv[1:] if a.startswith('http')), 'http://localhost:8370/')
OUT=sys.argv[sys.argv.index('--shots')+1] if '--shots' in sys.argv else '/tmp/shots-launch-foundation'
os.makedirs(OUT,exist_ok=True)
SMALL="""[...document.querySelectorAll('button,a[href],input:not([type=file]),select,summary')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('.sr-only')&&(r.width<44||r.height<44)&&e.type!=='range'}).map(e=>(e.id||e.tagName)+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height))"""
async def main():
 async with async_playwright() as pw:
  b=await pw.chromium.launch(); c=await b.new_context(viewport={'width':360,'height':800},is_mobile=True,has_touch=True,service_workers='block',accept_downloads=True)
  requests=[];errors=[]
  async def guard(r):
   if r.request.url.startswith(BASE): await r.continue_()
   else: requests.append(r.request.url.split('?')[0]);await r.abort()
  await c.route('**/*',guard);p=await c.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
  async def check_screen(name):
   await p.evaluate("Promise.race([Promise.all(document.getAnimations().filter(a=>a.effect&&a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>0))),new Promise(r=>setTimeout(r,2000))])")
   assert await p.evaluate('document.documentElement.scrollWidth<=innerWidth'),name+' overflow'
   small=await p.evaluate(SMALL);assert not small,(name,small)
   await p.add_script_tag(url=BASE+'tests/axe.min.js')
   v=await p.evaluate("axe.run(document,{resultTypes:['violations']}).then(r=>r.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id+':'+v.nodes.length))")
   assert not v,(name,v)
   await p.screenshot(path=f'{OUT}/{name}.png',full_page=True)
  await p.goto(BASE);await p.wait_for_selector('#welSearch');await p.wait_for_function('() => window.__apData && window.__apSync')
  assert await p.evaluate('Object.keys(window.__apData.projection().owned).length')==0
  assert await p.evaluate('window.__apSync.run().then(r=>r.paused)')
  await check_screen('01-empty-search')
  await p.select_option('#welBrand','Storm');await p.fill('#welSearch','hy-road')
  assert await p.locator('[data-select]').count()==1
  assert all('Storm' in t for t in await p.locator('[data-select]').all_text_contents())
  await p.locator('[data-select]').first.click();await p.click('#welNext');await p.wait_for_selector('#welChosen [data-copy]');await p.locator('[data-copy]').first.click()
  names=p.locator('[data-nickname]');await names.nth(0).fill('Fictional reference - polished');await names.nth(1).fill('Fictional reference - matte')
  await check_screen('02-two-copy-review');await p.click('#welNext');await p.wait_for_selector('#armBench')
  owned=await p.evaluate('Object.values(window.__apData.projection().owned)');assert len(owned)==2;assert len({o['id'] for o in owned})==2
  first,second=owned[0]['id'],owned[1]['id'];
  if not await p.locator('#armBench').evaluate('e=>e.open'): await p.click('#armBench summary')
  await check_screen('03-distinct-owned-copies')
  await p.goto(BASE+'#/bag');await p.wait_for_selector('#bagStartEmpty');await p.click('#bagStartEmpty');await p.wait_for_selector('#bagLeft');await p.click('#bagLeft summary');await p.locator('[data-bring="'+first+'"]').click();await p.locator('[data-bring="'+second+'"]').click();await p.click('#bagPackGo');await p.wait_for_selector('#tnStartBowl')
  packed=await p.evaluate("Promise.all([import('./js/cc/status.js'),import('./js/hub.js')]).then(([s,h])=>s.packedIds(h.proj(),s.currentBag(h.proj())))");assert set(packed)=={first,second}
  await check_screen('10-explicitly-packed-copies')
  await p.goto(BASE+'#/ball/'+second);await p.wait_for_selector('#ownEdit');await p.click('#ownEdit summary');await p.fill('#ownLayout','Fictional 50 x 4 x 30');await p.fill('#ownFinish','Fictional 2000 surface note');await p.click('#ownSave');await p.wait_for_selector('#ownEdit');await p.click('#ownEdit summary')
  assert await p.input_value('#ownLayout')=='Fictional 50 x 4 x 30';assert not owned[0].get('layout')
  await check_screen('04-physical-copy-details')
  await p.goto(BASE+'#/target?ball='+second);await p.wait_for_selector('#tgBall');assert await p.input_value('#tgBall')==second
  await p.click('#tgTourSkip') if await p.locator('#tgTourSkip').count() else None
  await p.click('#tgSave');await p.wait_for_timeout(200)
  line=await p.evaluate("JSON.parse(localStorage.getItem('ap_lines')).at(-1)");assert line['ballId']==second and line['ownedId']==second
  await check_screen('05-owned-targeting')
  await p.goto(BASE+'#/lane');await p.wait_for_selector('#ballBtn');assert 'matte' in await p.text_content('#ballBtn')
  await p.reload();await p.wait_for_selector('#ballBtn');await p.wait_for_function("() => document.querySelector('#ballBtn').textContent.includes('matte')")
  original_name=await p.evaluate("async () => {const s=await import('./js/store.js'),n=s.app.ball.name;s.app.ball.name='Fictional <copy> & test';s.emit('state');return n;}")
  await p.wait_for_function("() => document.querySelector('#laneH1').textContent==='Lane: Fictional <copy> & test'")
  assert await p.text_content('#laneH1')=='Lane: Fictional <copy> & test'
  assert await p.text_content('#ballBtn .ball-btn-name')=='Fictional <copy> & test'
  assert await p.locator('#ballBtn copy').count()==0
  await p.evaluate("async n => {const s=await import('./js/store.js');s.app.ball.name=n;s.emit('state');}",original_name)
  await p.goto(BASE+'#/me');await p.wait_for_selector('#editProfile');assert 'phone only' in await p.text_content('#dataInfo')
  await check_screen('06-local-only-status')
  await p.click('#editProfile');await p.wait_for_selector('#pSpeedVal');assert 'Not set' in await p.text_content('#pSpeedVal');await p.click('#profSave')
  assert await p.evaluate('window.__apData.projection().bowler.speed == null')
  await p.goto(BASE+'#/welcome');await p.wait_for_selector('#welManual');await p.click('#welManual summary');await p.fill('#welManualName','Fictional mystery ball');await p.click('#welManualAdd');await p.click('#welNext');await p.click('#welNext');await p.wait_for_selector('#armBench')
  manual=await p.evaluate("Object.values(window.__apData.projection().owned).find(o=>o.name==='Fictional mystery ball')");assert manual['spec']['cat']['rg'] is None
  await p.goto(BASE+'#/ball/'+manual['id']);await p.wait_for_selector('#ballRead');assert 'no model path' in await p.text_content('#ballRead');await check_screen('07-unmodeled-manual-ball')
  assert not requests,requests;assert not errors,errors
  print('PASS fresh/strict-filter/multiselect/duplicate-edit/literal-safe-nickname/target-save/reload/neutral/local-only/manual/a11y/44px/360px; external requests=0',flush=True)
  await c.close()
  # Separate legacy fixture: all events/keys remain; review and its reversal are explicit, append-only.
  c=await b.new_context(viewport={'width':360,'height':800},is_mobile=True,has_touch=True,service_workers='block');await c.route('**/*',guard);p=await c.new_page();await p.goto(BASE+'#/lane');await p.wait_for_function('() => window.__apData')
  await p.evaluate("localStorage.setItem('ap_profile',JSON.stringify({hand:'left',speed:17,pap:'Fictional confirmed PAP',owned:[]}));localStorage.setItem('ap_prefs',JSON.stringify({onboarded:true,myLines:{'hy-road':{lay:14,eyes:10}}}));")
  # Fresh DB for the legacy snapshot, no production migration or browser owner data.
  await p.evaluate("() => new Promise(r=>{const q=indexedDB.deleteDatabase('arsenal-pro');q.onsuccess=q.onblocked=()=>r()})")
  await p.goto(BASE+'?legacy#/me');await p.wait_for_selector('#legacyReview');before=await p.evaluate('window.__apData.events()')
  await p.goto(BASE+'#/welcome?review=1');await p.wait_for_selector('#welSearch');await p.fill('#welSearch','hy-road');await p.locator('[data-select]').first.click();await p.click('#welNext');await p.click('#welNext');await p.wait_for_selector('#armory')
  await p.goto(BASE+'#/me');await p.wait_for_selector('#undoOwnershipReview');await p.click('#undoOwnershipReview');await p.wait_for_selector('#legacyReview');assert await p.evaluate('Object.keys(window.__apData.projection().owned).length')==0
  pr=await p.evaluate("JSON.parse(localStorage.getItem('ap_profile'))");assert pr['pap']=='Fictional confirmed PAP' and pr['hand']=='left';assert await p.evaluate("JSON.parse(localStorage.getItem('ap_prefs')).myLines['hy-road'].eyes")==10
  assert await p.evaluate('window.__apData.events()')>before
  await check_screen('08-legacy-preserved-review')
  print('PASS legacy snapshot/review/undo/preserved PAP/hand/aims, no deleted events',flush=True);await c.close()
  # Cache-first v65 cold launch then offline add/reload, not impossible never-loaded first-install offline.
  c=await b.new_context(viewport={'width':360,'height':800},is_mobile=True,has_touch=True,service_workers='allow');await c.route('**/*',guard);p=await c.new_page();await p.goto(BASE);await p.wait_for_selector('#welSearch');await p.evaluate('navigator.serviceWorker.ready');await p.reload();await p.wait_for_function('() => navigator.serviceWorker.controller')
  assert await p.evaluate("caches.keys().then(k=>k.includes('arsenal-pro-v65'))")
  await c.set_offline(True);await p.reload();await p.wait_for_selector('#welSearch');await p.fill('#welSearch','hy-road');await p.locator('[data-select]').first.click();await p.click('#welNext');await p.click('#welNext');await p.wait_for_selector('#armory');await p.reload();await p.wait_for_selector('#armory');assert await p.evaluate('Object.keys(window.__apData.projection().owned).length')==1
  await p.screenshot(path=f'{OUT}/09-offline-owned-arsenal.png',full_page=True)
  print('PASS atomic offline v65 catalog/add/durable-reload; screenshot inventory is fictional, no recovery keys',flush=True);await c.close();await b.close()
  Path(OUT+'/manifest.json').write_text(json.dumps({'viewport':'360x800','files':sorted(str(x) for x in Path(OUT).glob('*.png')),'data':'safe fictional inventory; no account/recovery screens'},indent=2))
asyncio.run(main())
