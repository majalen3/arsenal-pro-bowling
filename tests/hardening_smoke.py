"""Local-only 360px title + staged restore acceptance; fictional fixtures, all external HTTP blocked.
Usage: python tests/hardening_smoke.py http://localhost:8371/ --shots /tmp/shots-launch-hardening [--before-only]
"""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
BASE=next((a for a in sys.argv[1:] if a.startswith('http')),'http://localhost:8371/')
OUT=Path(sys.argv[sys.argv.index('--shots')+1] if '--shots' in sys.argv else '/tmp/shots-launch-hardening')
sys.path.insert(0,str(Path(__file__).parent/'journeys'))
from lib import SMALL,TRUNC
async def main():
 OUT.mkdir(exist_ok=True,parents=True)
 async with async_playwright() as pw:
  b=await pw.chromium.launch();c=await b.new_context(viewport={'width':360,'height':780},is_mobile=True,has_touch=True,service_workers='block',accept_downloads=True);errors=[]
  async def guard(r):
   if r.request.url.startswith(BASE):await r.continue_()
   else:await r.abort()
  await c.route('**/*',guard);p=await c.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
  await p.add_init_script("localStorage.setItem('ap_prefs',JSON.stringify({onboarded:true}));")
  await p.goto(BASE+'#/ball/rattler-big-bite');await p.wait_for_selector('.detail h1.title');await p.evaluate("async()=>{const h=await import('./js/hub.js');await h.ready();await h.add('ownedBall.created','fictional-title',{catalogId:'rattler-big-bite',name:'Radical Rattler Big Bite'});}");await p.goto(BASE+'#/ball/fictional-title');await p.wait_for_selector('.detail h1.title');await p.wait_for_timeout(300)
  if '--before-only' in sys.argv:
   await p.screenshot(path=str(OUT/'01-before-catalog-title.png'),full_page=True);print('BEFORE',await p.evaluate(TRUNC));await b.close();return
  async def check(name):
   await p.wait_for_timeout(250)
   await p.screenshot(path=str(OUT/name),full_page=True)
   if await p.evaluate(TRUNC):print('OVERFLOW',await p.evaluate("[...document.querySelectorAll('.screen *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,id:e.id,cl:e.className,text:e.textContent.slice(0,60),width:e.getBoundingClientRect().width,overflow:getComputedStyle(e).overflowX}))"),flush=True)
   assert not await p.evaluate(SMALL),(name,await p.evaluate(SMALL));assert not await p.evaluate(TRUNC),(name,await p.evaluate(TRUNC))
   await p.add_script_tag(url=BASE+'tests/axe.min.js');assert not await p.evaluate("axe.run(document).then(r=>r.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id))")
   await p.screenshot(path=str(OUT/name),full_page=True)
  await check('02-after-catalog-title.png')
  await p.evaluate("""async()=>{const h=await import('./js/hub.js');await h.ready();await h.add('ownedBall.created','fictional-long',{catalogId:'hy-road',name:'Fictional very long physical copy name with surface and layout notes for safe wrapping'});await h.add('ownedBall.created','fictional-unbroken',{catalogId:'hy-road',name:'Fictional'+('LongName'.repeat(15))});await h.add('bowler.edited','me',{fields:{hand:'left'}});}""")
  for id,name in [('fictional-long','03-after-long-copy-title.png'),('fictional-unbroken','04-after-unbroken-title.png')]:
   await p.goto(BASE+'#/ball/'+id);await p.wait_for_selector('.detail h1.title');expected='Fictional very long physical copy name with surface and layout notes for safe wrapping' if id=='fictional-long' else 'Fictional'+('LongName'*15);assert await p.text_content('.detail h1.title')==expected;await check(name)
  fixtures=await p.evaluate("""async()=>{const {createDB}=await import('./js/data/db.js'),{memoryBackend}=await import('./js/data/idb.js'),{mkEvent}=await import('./js/data/events.js'),{buildBackup}=await import('./js/data/backup.js');
   const source=createDB(memoryBackend());await source.open();await source.append([mkEvent('bowler.edited','me',{fields:{hand:'right'}},{ts:Date.now()+1000})]);const conflict=await buildBackup(source);
   const empty=createDB(memoryBackend());await empty.open();await empty.append([mkEvent('ownedBall.created','fictional-new',{catalogId:'hy-road',name:'Fictional second copy'})]);const good=await buildBackup(empty),bad={...good,sha256:'invalid'};return {conflict,good,bad};}""")
  before=await p.evaluate('window.__apData.hash()')
  await p.goto(BASE+'#/import');await p.wait_for_selector('#impFile',state='attached')
  for kind,name in [('bad','05-checksum-blocked.png'),('conflict','06-conflict-staged.png')]:
   await p.locator('#impFile').set_input_files({'name':'fictional-'+kind+'.json','mimeType':'application/json','buffer':json.dumps(fixtures[kind]).encode()});await p.wait_for_selector('#impPreview');assert await p.locator('#impCommit').is_disabled();assert await p.evaluate('window.__apData.hash()')==before;await check(name)
  async with p.expect_download() as d:await p.click('#impBackupFirst')
  assert (await d.value).suggested_filename.endswith('.json')
  await p.locator('#impFile').set_input_files({'name':'fictional-good.json','mimeType':'application/json','buffer':json.dumps(fixtures['good']).encode()});await p.wait_for_selector('#impPreview');assert await p.locator('#impCommit').is_enabled();await p.click('#impCommit');await p.wait_for_selector('#impDone')
  assert await p.evaluate("window.__apData.projection().owned['fictional-new'].name")=='Fictional second copy';assert await p.evaluate("window.__apData.projection().bowler.hand")=='left'
  assert await p.evaluate("import('./js/hub.js').then(h=>h.db.meta.restoreCheckpoints.length)")==1;assert await p.evaluate("window.__apSync.run().then(r=>r.paused)")
  await check('07-safe-additive-restore.png');assert not errors,errors;await c.close();await b.close()
  print('PASS 360px catalog/long/unbroken title, unchanged truncation probe, 44px/a11y, checksum/conflict staged/no writes, safe additive restore/checkpoint/export/local-only')
asyncio.run(main())
