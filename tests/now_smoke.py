"""Local-only Now 2/4/6 flags/counters/UI regression. No participant outcomes claimed.
Usage: python tests/now_smoke.py http://localhost:8364/ --shots /tmp/shots-now
All production API traffic is aborted. Screenshots use a 360px phone.
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
BASE=next((a for a in sys.argv[1:] if a.startswith('http')),'http://localhost:8364/')
OUT=sys.argv[sys.argv.index('--shots')+1] if '--shots' in sys.argv else '/tmp/shots-now'
async def main():
 os.makedirs(OUT,exist_ok=True);captured=[]
 async with async_playwright() as pw:
  b=await pw.chromium.launch();c=await b.new_context(viewport={'width':360,'height':780},is_mobile=True,has_touch=True,device_scale_factor=1)
  await c.route('**/arsenal-pro-api.onrender.com/**',lambda r:r.abort())
  p=await c.new_page();p.set_default_timeout(8000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  await p.goto(BASE+'tests/axe.min.js')
  await p.evaluate("() => {localStorage.clear();localStorage.setItem('ap_prefs',JSON.stringify({onboarded:true}));localStorage.setItem('ap_profile',JSON.stringify({hand:'right',style:'tweener',speed:16,rev:250,entered:{hand:true,speed:true,rev:true}}));}")
  await p.goto(BASE+'#/tonight');await p.wait_for_function('() => window.__apData')
  await p.evaluate("""async () => {
   const h=await import('./js/hub.js'), f=await import('./tests/data/fixtures/sample_arsenal.mjs');await h.ready();await h.loadStarter(f.sampleEvents,f.SAMPLE_ID);
   // Fixture seed events extend 21 ms into the future. Subsequent user edits must be later.
   await new Promise(r=>setTimeout(r,100));
   await h.add('bag.saved','qa-verified-bag',{name:'Verified example bag',format:'tournament6',slots:['own-rattler-big-bite','own-super-nova','own-ordnance-c4','own-deadly-rattler','own-ice-storm'].map(owned=>({owned,locked:false})),spare:'own-ice-storm'});
   await h.add('ownedBall.edited','own-rack-attack',{fields:{status:'retired'}});
   await h.add('session.created','qa-ended',{date:'2026-11-05',ended:true});
   await h.add('shot.logged','qa-ended-shot',{sessionId:'qa-ended',game:1,frame:1,roll:1,down:10,ballId:'own-rattler-big-bite'});
   await h.add('line.created','qa-line',{name:'Example line',release:25,aim:1,speed:16,rev:250,pattern:'house'});
  }""")
  nav=[0]
  async def goto(route,sel):
   nav[0]+=1
   await p.goto(BASE+'?nowSmoke='+str(nav[0])+'#/'+route)
   if sel in ('#armMilestones','#armNext'):   # v73: shelves, milestones and Next up sit behind 'Shelf view, milestones, Old Friends' (docs/CUTS_V73.md)
    await p.wait_for_selector('#armShelvesD summary'); await p.click('#armShelvesD summary')
   try: await p.wait_for_selector(sel)
   except Exception:
    print('DEBUG',route,await p.evaluate("async () => {const u=await import('./js/cc/ux.js'),a=await import('./js/cc/armory.js'),h=await import('./js/hub.js');return {ux:u.load(),next:a.nextUp(h.proj()),body:document.querySelector('#view')?.innerText.slice(-500)}}"),flush=True);await p.screenshot(path=OUT+'/failure.png',full_page=True);raise
   await p.wait_for_timeout(300)
  async def flag(k,v):
   await p.evaluate("async ([k,v]) => (await import('./js/cc/ux.js')).setFlag(k,v)",[k,v])
  async def shot(name,full=False):
   assert not await p.evaluate('document.documentElement.scrollWidth > innerWidth+1'),name+' horizontal overflow'
   await p.screenshot(path=OUT+'/'+name+'.png',full_page=full);captured.append(name+'.png')
  await goto('bag?view=all','#armMilestones')
  assert await p.locator('[data-badge]').count()==3
  assert not await p.locator('#armNext').count()
  assert 'Old Friends' in await p.inner_text('#view')
  assert not await p.locator('#armMilestones progress, #armMilestones [aria-disabled=true]').count()
  await shot('armory-earned',True)
  await p.locator('#armMilestones').evaluate('(e)=>scrollTo(0,e.getBoundingClientRect().top+scrollY-160)');await shot('armory-milestones')
  await flag('nextUp',True);await goto('bag?view=all','#armNext');assert await p.locator('#armNext').count()==1
  await shot('armory-next-up',True)
  await p.locator('#armNext').evaluate('(e)=>scrollTo(0,e.getBoundingClientRect().top+scrollY-250)');await shot('armory-next-up-line')
  boxes=await p.locator('.badge-card, #armNext').evaluate_all('(es)=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))')
  assert all(x['w']>=44 and x['h']>=44 for x in boxes),boxes
  await p.evaluate("async () => (await import('./js/hub.js')).add('bowler.edited','me',{fields:{speed:{v:16,unit:'mph',prov:{kind:'device',ref:'lanetrax'}}}})")
  await flag('laneView','summary');await goto('lane','#laneSum')
  assert 'model' in await p.inner_text('#laneSum')
  assert await p.locator('#laneSum [data-prov=model]').count()
  await shot('lane-summary');await shot('lane-summary-full',True)
  await flag('laneView','baseline');await goto('lane','#ballBtn');assert not await p.locator('#laneSum').count()
  assert await p.locator('[data-prov=model]').count()>=4
  await shot('lane-baseline')
  await flag('laneView','summary')
  await goto('ball/rattler-big-bite','#view .screen');await p.locator('#ballSpecs').evaluate('(e)=>e.open=true');await shot('ball-maker-model',True);await p.locator('#ballSpecs').evaluate('(e)=>scrollTo(0,e.getBoundingClientRect().top+scrollY-100)');await shot('ball-specs')
  await goto('compare?ids=rattler-big-bite,super-nova','.cmp-table');assert await p.locator('.cmp-table [data-prov=model]').count()>=4
  await shot('compare-model',True)
  await goto('target','#view .screen');await shot('target-model',True)
  await flag('stepPreview',True);await goto('tonight','#tonightBody')
  if await p.locator('#tnExtra').count(): await p.locator('#tnExtra').evaluate('(e)=>e.open=true')
  await p.wait_for_selector('#stepHint')
  assert await p.locator('[data-alt] .step-name').count()>=1
  await shot('step-preview-planning',True)
  btn=p.locator('[data-alt]').first
  bb=await btn.bounding_box();assert bb['height']>=44 and bb['width']>=44,bb
  await btn.click();await p.wait_for_timeout(250)
  await goto('bowl','#qlStrike');await p.wait_for_timeout(500);await p.click('#qlStrike');await p.wait_for_timeout(250)
  assert not await p.locator('#stepHint, [data-alt] .step-name').count(),'no preview/hint during active scoring'
  await shot('active-scoring-no-extras')
  # Unknown model must be suppressed, but identity and saved specs must remain readable.
  await goto('lane','#ballBtn')
  await p.evaluate("async () => {const c=await import('./js/ctl.js'),d=await import('./js/data.js');c.setBall(d.balls.find(b=>b.id==='hy-road-pearl'));}")
  await p.wait_for_selector('#laneMissing');assert not await p.locator('.lane-grid:visible').count();await shot('lane-unverified')
  await goto('me/usage','#view .screen');await shot('tests-usage',True)
  counts=await p.evaluate("async () => (await import('./js/cc/ux.js')).load().c")
  assert counts['badge.view']['n']>0 and counts['nextup.view']['n']>0
  st=await p.evaluate("async () => (await import('./js/cc/ux.js')).load()")
  assert len(st['taps'])==1 and st['taps'][0]['ball']
  # SW caches v73 and new display helper; local flags are not event-log/sync records.
  await p.wait_for_function("async () => (await caches.keys()).includes('arsenal-pro-v74') && !!navigator.serviceWorker.controller",timeout=30000)   # installed and controlling, not just opened
  await c.set_offline(True);await goto('bag?view=all','#armMilestones');assert await p.locator('[data-badge]').count()==3
  await shot('armory-offline',True);await c.set_offline(False)
  assert not errors,errors
  if os.path.exists(OUT+'/failure.png'): os.remove(OUT+'/failure.png')
  with open(OUT+'/results.json','w') as f:json.dump({'width':360,'checks':'passed','pageErrors':errors,'localCounters':counts,'screenshots':sorted(set(captured))},f,indent=2)
  print('PASS Now UI: earned-only/Old Friends, opt-in next-up, model chips/summary both arms, 44px cards, preview/counter, no active-scoring extras, unverified guard, offline v73; 360px shots:',OUT)
  await c.close();await b.close()
asyncio.run(main())
