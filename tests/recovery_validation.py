"""Synthetic local recovery contract + stable cold Me. All external HTTP mocked/blocked.
python tests/recovery_validation.py http://localhost:8372/ --shots /tmp/shots-recovery-validation
"""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
BASE=next((a for a in sys.argv[1:] if a.startswith('http')),'http://localhost:8372/')
OUT=Path(sys.argv[sys.argv.index('--shots')+1] if '--shots' in sys.argv else '/tmp/shots-recovery-validation')
sys.path.insert(0,str(Path(__file__).parent/'journeys'))
from lib import SMALL,TRUNC
async def main():
 OUT.mkdir(parents=True,exist_ok=True)
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  async def context(account=False,delay=False,recovery=False):
   c=await b.new_context(viewport={'width':360,'height':780},is_mobile=True,has_touch=True,service_workers='block',accept_downloads=True)
   calls=[]
   async def guard(r):
    if r.request.url.startswith(BASE):await r.continue_();return
    if account and '/api/' in r.request.url:
     path=r.request.url.split('/api/',1)[1];calls.append(path)
     data={'events':[{'id':'remote-conflicting-profile','seq':1,'ts':2090000000000,'deviceId':'fictional-remote','schemaV':1,'type':'bowler.edited','entity':'bowler','entityId':'me','data':{'fields':{'hand':'right'}}}],'cursor':'1','more':False} if path.startswith('account/events') else {'exportedAt':'2026-11-07','user':{'id':'A','email':'fictional@example.invalid'},'events':[],'teams':[]} if path=='account/export' else {'user':{'id':'B','email':'fictional-b@example.invalid'},'token':'public-synthetic-unused-B'} if path=='auth/login' else {}
     await r.fulfill(status=200,content_type='application/json',body=json.dumps(data));return
    await r.abort()
   await c.route('**/*',guard)
   if not delay:await c.add_init_script("localStorage.setItem('ap_prefs',JSON.stringify({onboarded:true,theme:'dark',myLines:{local:{lay:14,eyes:9}}}));")
   if account:await c.add_init_script(("localStorage.setItem('ap_sync_guard',JSON.stringify({v:1,account:'A'}));localStorage.setItem('ap_account',JSON.stringify({token:'public-synthetic-A',user:{id:'A',email:'fictional@example.invalid'},pending:true}));").replace('pending:true','pending:false' if recovery else 'pending:true'))
   if delay:await c.add_init_script("""const open=indexedDB.open.bind(indexedDB);indexedDB.open=(...a)=>{const r=open(...a);Object.defineProperty(r,'onsuccess',{set(fn){r.addEventListener('success',()=>setTimeout(()=>fn.call(r),500));}});return r;};new MutationObserver(()=>{const p=document.querySelector('#acctPitch');if(p&&!window.firstPitch)window.firstPitch=p;}).observe(document,{subtree:true,childList:true});""")
   p=await c.new_page();await p.goto(BASE+'#/me');await p.wait_for_selector('#accountCard');return c,p,calls
  async def check(p,name):
   await p.evaluate("Promise.all(document.getAnimations().filter(a=>a.effect && a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>0)))")
   assert not await p.evaluate(SMALL),(name,await p.evaluate(SMALL));assert not await p.evaluate(TRUNC),(name,await p.evaluate(TRUNC))
   await p.add_script_tag(url=BASE+'tests/axe.min.js');issues=await p.evaluate("axe.run(document).then(r=>r.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})))");assert not issues,(name,issues)
   await p.evaluate('window.scrollTo(0,0)');await p.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
   await p.screenshot(path=str(OUT/name),full_page=True)
  async def upload(p,data):
   await p.locator('#impFile').set_input_files({'name':'fictional-recovery.json','mimeType':'application/json','buffer':json.dumps(data).encode()})
  # Me's privacy text/focus survives delayed IndexedDB hydration, and editing still works on demand.
  c,p,_=await context(delay=True);await p.focus('#acctSignIn');await p.evaluate("import('./js/hub.js').then(h=>h.ready())")
  assert await p.evaluate("window.firstPitch===document.querySelector('#acctPitch') && document.activeElement.id==='acctSignIn'")
  assert not await p.evaluate("performance.getEntriesByType('resource').some(r=>r.name.includes('/data/spec_catalog.js'))")
  await check(p,'01-me-stable-privacy.png');await p.click('#editProfile');await p.wait_for_selector('#profSave');await c.close()
  # Nonempty legacy hot mirror + new line must stage/block without changing anything.
  c,p,_=await context();await p.evaluate("""async()=>{const h=await import('./js/hub.js');await h.ready();await h.add('ownedBall.created','local',{catalogId:'hy-road',name:'Fictional original',layout:'Original layout'});await h.add('line.created','local-line',{ballId:'local',eyes:9});localStorage.setItem('ap_lines',JSON.stringify([{ballId:'local',eyes:9,note:'Original'}]));}""")
  source=await p.evaluate("""async()=>{const {createDB}=await import('./js/data/db.js'),{memoryBackend}=await import('./js/data/idb.js'),{mkEvent}=await import('./js/data/events.js'),{buildBackup}=await import('./js/data/backup.js');const d=createDB(memoryBackend());await d.open();await d.append([mkEvent('ownedBall.created','copy-a',{catalogId:'hy-road',name:'Fictional A',layout:'Layout A'}),mkEvent('ownedBall.created','copy-b',{catalogId:'hy-road',name:'Fictional B',layout:'Layout B'}),mkEvent('line.created','line-a',{ballId:'copy-a',ownedId:'copy-a',eyes:10}),mkEvent('ball.surfaceLogged','surface-a',{ballId:'copy-a',date:'2026-11-07',finish:2000}),mkEvent('game.logged','game-b',{ballId:'copy-b',total:145})]);return buildBackup(d,{prefs:{theme:'light',myLines:{'copy-a':{eyes:10}}}});}""")
  before=await p.evaluate("({hash:window.__apData.hash(),lines:localStorage.getItem('ap_lines'),prefs:localStorage.getItem('ap_prefs')})")
  await p.goto(BASE+'#/import');await p.wait_for_selector('#impFile',state='attached');await upload(p,source);await p.wait_for_selector('#impPreview');assert await p.locator('#impCommit').is_disabled();assert 'Nonempty legacy-mirror reconciliation is unsupported' in await p.text_content('#impWarn')
  assert await p.evaluate("({hash:window.__apData.hash(),lines:localStorage.getItem('ap_lines'),prefs:localStorage.getItem('ap_prefs')})")==before
  await check(p,'02-nonempty-mirror-blocked.png');await c.close()
  # Additive event recovery on a separate fixture; no local setting/identity application.
  c,p,_=await context();await p.evaluate("import('./js/hub.js').then(async h=>{await h.ready();await h.add('ownedBall.created','local',{catalogId:'hy-road',name:'Fictional original',layout:'Original layout'});})")
  before=await p.evaluate("({hash:window.__apData.hash(),prefs:localStorage.getItem('ap_prefs')})")
  await p.goto(BASE+'#/import');await p.wait_for_selector('#impFile',state='attached');await upload(p,source);await p.wait_for_selector('#impPreview');assert await p.locator('#impCommit').is_enabled();assert 'not a full phone recovery' in await p.text_content('#impScope');assert await p.locator('#impWarn').count()==0;await check(p,'03-event-only-reviewed.png')
  async with p.expect_download() as d:await p.click('#impBackupFirst')
  assert (await d.value).suggested_filename.endswith('.json')
  await p.click('#impCommit');await p.wait_for_selector('#impDone')
  assert await p.evaluate("Object.keys(window.__apData.projection().owned).length")==3
  assert await p.evaluate("window.__apData.projection().owned['copy-b'].layout")=='Layout B'
  assert await p.evaluate("window.__apData.projection().surface.length")==1
  assert await p.evaluate("window.__apData.projection().scores.length")==1
  assert await p.evaluate("localStorage.getItem('ap_prefs')")==before['prefs']
  assert await p.evaluate("JSON.parse(localStorage.getItem('ap_lines')).some(l=>l.ownedId==='copy-a')")
  restored=await p.evaluate("""async()=>{const h=await import('./js/hub.js'),{createDB}=await import('./js/data/db.js'),{memoryBackend}=await import('./js/data/idb.js'),m=await import('./js/data/backup.js');const saved=await m.buildBackup(h.db),d=createDB(memoryBackend());await d.open();await m.restoreBackup(d,await m.readBackup(JSON.stringify(saved.restoreCheckpoints[0].backup),d));return d.hash();}""")
  assert restored==before['hash'];await check(p,'04-additive-restored-checkpoint.png')
  # Stale preview is explicit, disabled until a new file review, and writes nothing new.
  more={**source,'events':source['events'][:1]};more['events'][0]={**more['events'][0],'id':'new-preview-id','entityId':'later-copy'}
  more=await p.evaluate("async b=>{const {stable,sha256Hex}=await import('./js/data/schema.js');b.sha256=await sha256Hex(stable(b.events.map(e=>({...e,synced:undefined}))));return b;}",more)
  await upload(p,more);await p.wait_for_selector('#impPreview');assert await p.locator('#impCommit').is_enabled(),await p.text_content('#impPreview')
  await p.evaluate("import('./js/hub.js').then(h=>h.add('ownedBall.created','after-preview',{name:'Fictional local change'}))");old=await p.evaluate('window.__apData.hash()');await p.click('#impCommit');await p.wait_for_selector('#impCommitError');assert await p.locator('#impCommit').is_disabled();assert await p.evaluate('window.__apData.hash()')==old
  await check(p,'05-stale-preview-stopped.png');await c.close()
  # Account export is an archive; keep-data signout/foreign identity never copies/rebinds.
  c,p,calls=await context(account=True);await p.evaluate("import('./js/hub.js').then(h=>h.ready())");await check(p,'06-account-archive-scope.png')
  async with p.expect_download() as d:await p.click('#acctExport')
  archive=json.loads(Path(await (await d.value).path()).read_text());assert archive['user']['id']=='A';assert await p.locator('body > a[download]').count()==0
  await p.click('#acctSignOut');await p.wait_for_selector('#soKeep');await p.click('#soKeep');await p.wait_for_selector('.sheet',state='detached');await p.wait_for_selector('#acctSignIn')
  assert await p.evaluate("import('./js/account.js').then(m=>m.account.login('fictional-b@example.invalid','public-synthetic-password')).then(r=>!r.ok)")
  assert await p.evaluate("JSON.parse(localStorage.getItem('ap_sync_guard')).account")=='A';assert await p.evaluate("localStorage.getItem('ap_account')")==None
  assert not any('events' in x or x in ['me','lines','surface','notes'] for x in calls),calls
  await p.goto(BASE+'#/import');await p.wait_for_selector('#impFile',state='attached');await upload(p,archive);await p.wait_for_selector('#impErr');assert 'not app-restorable' in await p.text_content('#impErr');assert await p.locator('#impCommit').count()==0
  await check(p,'07-account-archive-not-importable.png');await c.close()
  c,p,calls=await context(account=True,recovery=True);await p.evaluate("import('./js/hub.js').then(async h=>{await h.ready();await h.add('bowler.edited','me',{fields:{hand:'left'}});})");before=await p.evaluate('window.__apData.hash()')
  assert not (await p.evaluate('window.__apSync.run()'))['ok'];assert await p.evaluate('window.__apData.hash()')==before
  assert 'Account recovery is paused for separate review' in await p.text_content('#dataInfo')
  async with p.expect_download() as d:await p.click('#dlBackup')
  recovery=json.loads(Path(await (await d.value).path()).read_text());assert len(recovery['pendingAccountRecovery']['events'])==1;assert 'public-synthetic-A' not in json.dumps(recovery)
  await check(p,'08-initial-account-recovery-staged.png');await c.close();await b.close()
 print('PASS stable Me privacy/focus/lazy edit; 360px 44px/axe; nonempty mirror staged; additive copies/layouts/surface/history/checkpoint; settings unchanged; stale preview; mocked export/signout/foreign identity; no external data writes')
asyncio.run(main())
