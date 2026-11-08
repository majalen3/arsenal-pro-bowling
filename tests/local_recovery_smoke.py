"""Synthetic one-tab local recovery/Undo UI. No external requests or real accounts.
python tests/local_recovery_smoke.py http://localhost:8374/ --shots /tmp/shots-restore-review
"""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
BASE=next((a for a in sys.argv[1:] if a.startswith('http')),'http://localhost:8374/')
OUT=Path(sys.argv[sys.argv.index('--shots')+1] if '--shots' in sys.argv else '/tmp/shots-restore-review')
sys.path.insert(0,str(Path(__file__).parent/'journeys'))
from lib import SMALL,TRUNC
async def main():
 OUT.mkdir(parents=True,exist_ok=True)
 async with async_playwright() as pw:
  b=await pw.chromium.launch()
  async def context():
   c=await b.new_context(viewport={'width':360,'height':780},is_mobile=True,has_touch=True,service_workers='block',accept_downloads=True)
   calls=[]
   async def guard(r):
    if r.request.url.startswith(BASE):await r.continue_()
    else:calls.append(r.request.url);await r.abort()
   await c.route('**/*',guard)
   await c.add_init_script("if(!localStorage.getItem('ap_prefs')){localStorage.setItem('ap_prefs',JSON.stringify({onboarded:true,theme:'dark',help:false}));localStorage.setItem('ap_profile',JSON.stringify({ownedVersion:1,owned:[],pap:'Fictional original PAP'}));}")
   p=await c.new_page();await p.goto(BASE+'#/me');await p.evaluate("import('./js/hub.js').then(h=>h.ready())")
   await p.evaluate("async()=>{const h=await import('./js/hub.js');await h.add('ownedBall.created','local',{catalogId:'hy-road',name:'Fictional original',layout:'Original layout'});await h.add('game.logged','original-game',{ballId:'local',total:123});await h.add('line.created','original-line',{ballId:'local',name:'Original line',eyes:9});localStorage.setItem('ap_lines',JSON.stringify([{ballId:'local',name:'Original line',eyes:9,note:'Keep original'}]));localStorage.setItem('ap_surface',JSON.stringify([{ballId:'local',date:'2026-11-01',finish:1000}]));}")
   return c,p,calls
  async def snapshot(p):return await p.evaluate("({hash:window.__apData.hash(),prefs:localStorage.getItem('ap_prefs'),profile:localStorage.getItem('ap_profile'),lines:localStorage.getItem('ap_lines'),surface:localStorage.getItem('ap_surface'),code:localStorage.getItem('ap_device'),guard:localStorage.getItem('ap_sync_guard'),consent:localStorage.getItem('ap_backup_sync')})")
  async def check(p,name):
   await p.evaluate("Promise.all(document.getAnimations().filter(a=>a.effect&&a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>0)))")
   assert not await p.evaluate(SMALL),(name,await p.evaluate(SMALL));assert not await p.evaluate(TRUNC),(name,await p.evaluate(TRUNC))
   await p.add_script_tag(url=BASE+'tests/axe.min.js');issues=await p.evaluate("axe.run(document).then(r=>r.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})))");assert not issues,(name,issues)
   await p.evaluate('window.scrollTo(0,0)');await p.screenshot(path=str(OUT/name),full_page=True)
  c,p,calls=await context()
  source=await p.evaluate("""async()=>{const {createDB}=await import('./js/data/db.js'),{memoryBackend}=await import('./js/data/idb.js'),{mkEvent}=await import('./js/data/events.js'),{buildBackup}=await import('./js/data/backup.js');const d=createDB(memoryBackend());await d.open();await d.append([mkEvent('ownedBall.created','copy-a',{catalogId:'hy-road',name:'Fictional A',layout:'Layout A'}),mkEvent('ownedBall.created','copy-b',{catalogId:'hy-road',name:'Fictional B',layout:'Layout B'}),mkEvent('line.created','line-a',{ballId:'copy-a',ownedId:'copy-a',name:'A line',eyes:10}),mkEvent('ball.surfaceLogged','surface-a',{ballId:'copy-a',date:'2026-11-07',finish:2000}),mkEvent('patternNote.created','note-a',{lane:'2',oil:'house',adjustment:'Fictional adjustment'}),mkEvent('game.logged','game-b',{ballId:'copy-b',total:145})]);return buildBackup(d,{prefs:{theme:'light',textSize:'large',help:true,myLines:{'copy-a':{lay:18,eyes:10}},teamShare:{archiveOnly:true}}});}""")
  async def upload(p,blocked=False):
   await p.goto(BASE+'#/import');await p.locator('#impFile').set_input_files({'name':'fictional-local-recovery.json','mimeType':'application/json','buffer':json.dumps(source).encode()});await p.wait_for_selector('#impPreview');await p.locator('#localReviewDetails > summary').click();assert await p.locator('#localPlanBlocked' if blocked else '#localApply').count()==1
   if not blocked:assert await p.locator('#localApply').is_disabled()
  before=await snapshot(p);await check(p,'00-me-local-only-360.png');original_ids=await p.evaluate("import('./js/hub.js').then(h=>h.db.events().map(e=>e.id))");await upload(p)
  assert await p.locator('#impCommit').is_disabled();assert await snapshot(p)==before
  assert await p.locator('#localReview input[type=checkbox]:checked').count()==0
  await check(p,'01-before-local-review-360.png')
  await p.check('#localAck');await p.click('#localApply');await p.wait_for_selector('#localUndo')
  assert await p.locator('#localUndo').is_enabled();assert await p.evaluate("Object.keys(window.__apData.projection().owned).length")==3
  assert await p.evaluate("window.__apData.projection().owned['copy-b'].layout")=='Layout B'
  assert await p.evaluate("JSON.parse(localStorage.getItem('ap_lines')).length")==2
  assert await p.evaluate("JSON.parse(localStorage.getItem('ap_surface')).length")==2
  assert await p.evaluate("JSON.parse(localStorage.getItem('ap_prefs')).theme")=='dark'
  assert await p.evaluate("JSON.parse(localStorage.getItem('ap_prefs')).myLines['copy-a'].lay")==18
  assert await p.evaluate("window.__apData.projection().scores.length")==2
  await check(p,'02-after-local-recovery-360.png')
  await p.goto(BASE+'#/me');await p.wait_for_function("document.querySelector('#dataInfo')?.textContent.includes('Local recovery needs review')");assert await p.locator('#backupCodeTools').count()==0;assert 'last-write-wins' in await p.text_content('#syncConflictLimit');await check(p,'07-me-recovery-hold-360.png');await p.goto(BASE+'#/import');await p.wait_for_selector('#localUndo')
  async with p.expect_download() as dl:await p.click('#localCheckpoint')
  checkpoint=json.loads(Path(await (await dl.value).path()).read_text());assert sorted(e['id'] for e in checkpoint['events'])==sorted(original_ids);assert 'token' not in checkpoint
  await p.reload();await p.wait_for_selector('#localUndo');await p.evaluate("()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='ap_lines')throw Error('Synthetic Undo quota');return set.call(this,k,v);};}");await p.click('#localUndo');await p.wait_for_selector('#localRecoveryError');assert 'Synthetic Undo quota' in await p.text_content('#localRecoveryError');await p.reload();await p.wait_for_selector('#localUndo');await p.click('#localUndo');await p.wait_for_function("import('./js/hub.js').then(h=>h.db.meta.localRecovery.phase==='undone')");assert await snapshot(p)==before
  await check(p,'03-reloaded-guarded-undo-360.png');assert not calls,calls;await c.close()
  # Explicit preference choice; later settings edits must not be rolled back by Undo.
  c,p,calls=await context();before=await snapshot(p);await upload(p);await p.check('#localConflict0');await p.check('#localAck');await p.click('#localApply');await p.wait_for_selector('#localUndo');assert await p.evaluate("JSON.parse(localStorage.getItem('ap_prefs')).theme")=='light'
  await p.evaluate("localStorage.setItem('ap_prefs',JSON.stringify({...JSON.parse(localStorage.getItem('ap_prefs')),theme:'system'}))");await p.reload();await p.wait_for_selector('#localUndoBlocked');assert await p.locator('#localUndo').is_disabled();await check(p,'04-later-edit-undo-blocked-360.png');await p.click('#localKeep');await p.wait_for_function("import('./js/hub.js').then(h=>h.db.meta.localRecovery.phase==='closed')");assert await p.evaluate("JSON.parse(localStorage.getItem('ap_prefs')).theme")=='system';assert not calls,calls;await c.close()
  # Stale preview adds no incoming events; an interrupted mirror write retains repair across reload.
  c,p,calls=await context();await upload(p);await p.evaluate("import('./js/hub.js').then(h=>h.add('game.logged','after-preview',{total:177}))");old=await snapshot(p);await p.check('#localAck');await p.click('#localApply');await p.wait_for_selector('#localRecoveryError');assert await snapshot(p)==old
  await upload(p);old=await snapshot(p)
  await p.evaluate("()=>{window.oldSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='ap_lines')throw Error('Synthetic quota');return window.oldSet.call(this,k,v);};}")
  await p.check('#localAck');await p.click('#localApply');await p.wait_for_selector('#localRecoveryError');assert 'Synthetic quota' in await p.text_content('#localRecoveryError');await p.reload();await p.wait_for_selector('#localUndo');await p.click('#localUndo');await p.wait_for_function("import('./js/hub.js').then(h=>h.db.meta.localRecovery.phase==='undone')");assert await snapshot(p)==old
  await check(p,'05-interrupted-restore-repaired-360.png');assert not calls,calls;await c.close()
  # Even pending account identity or explicit backup consent blocks local staging.
  c,p,calls=await context();await p.evaluate("localStorage.setItem('ap_account',JSON.stringify({token:'public-synthetic',user:{id:'A',email:'fictional@example.invalid'},pending:true}))");await p.reload();await upload(p,blocked=True);assert await p.locator('#localApply').count()==0;assert 'requires signing out' in await p.text_content('#localPlanBlocked');assert not calls,calls;await c.close()
  # Settings changed from an IDB request-success callback must abort the transaction, not overwrite the edit.
  c,p,calls=await context();await upload(p);old=await snapshot(p)
  await p.evaluate("()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v,...args){const r=put.call(this,v,...args);if(this.name==='events'&&v.entityId==='copy-a')r.addEventListener('success',()=>localStorage.setItem('ap_prefs',JSON.stringify({...JSON.parse(localStorage.getItem('ap_prefs')),theme:'system'})));return r;};}")
  await p.check('#localAck');await p.click('#localApply');await p.wait_for_selector('#localRecoveryError');assert await p.evaluate('window.__apData.hash()')==old['hash'];assert await p.evaluate("JSON.parse(localStorage.getItem('ap_prefs')).theme")=='system';assert await p.locator('#localUndo').is_disabled();await check(p,'06-commit-time-edit-preserved-360.png');assert not calls,calls;await c.close();await b.close()
 print('PASS synthetic local review/default-keep + explicit preference; nonempty lines/surface/notes, copies/layout/history/aims; checkpoint download; interrupted Undo/reload repair; later-edit/stale-preview/actual IDB commit-time edit blocking; interrupted write repair; pending-account guard; 360px 44px/axe; no external requests')
asyncio.run(main())
