"""Real local v64/v65/v66/v67/v68/v69/v70->v71 worker update, existing synthetic data, then offline cold launch.
No live API requests; requires an archived base tree and the current static app.
"""
import argparse,asyncio,json,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.async_api import async_playwright
async def main():
 a=argparse.ArgumentParser();a.add_argument('--from-version',type=int,choices=[64,65,66,67,68,69,70],default=65);a.add_argument('--legacy-root',required=True);a.add_argument('--current-root',required=True);a.add_argument('--shots',default='/tmp/shots-launch-foundation');args=a.parse_args();root=[args.legacy_root]
 class Handler(SimpleHTTPRequestHandler):
  def __init__(self,*a,**kw):super().__init__(*a,directory=root[0],**kw)
  def log_message(self,*a):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://localhost:{server.server_port}/';Path(args.shots).mkdir(exist_ok=True,parents=True)
 try:
  async with async_playwright() as pw:
   b=await pw.chromium.launch();c=await b.new_context(viewport={'width':360,'height':800},is_mobile=True,has_touch=True,service_workers='allow');external=[]
   async def guard(route):
    if route.request.url.startswith(base):await route.continue_()
    else:external.append(route.request.url.split('?')[0]);await route.abort()
   await c.route('**/*',guard);p=await c.new_page();await p.goto(base+'#/me');await p.wait_for_function('() => window.__apData');await p.evaluate('navigator.serviceWorker.ready');await p.reload();await p.wait_for_function('() => navigator.serviceWorker.controller')
   assert await p.evaluate("v=>caches.keys().then(k=>k.includes('arsenal-pro-v'+v))",args.from_version)
   await p.evaluate("""async () => { const h=await import('./js/hub.js');await h.ready();localStorage.setItem('ap_profile',JSON.stringify({hand:'left',pap:'Fictional confirmed PAP',owned:[]}));localStorage.setItem('ap_prefs',JSON.stringify({onboarded:true,myLines:{'hy-road':{lay:14,eyes:10}}}));await h.add('ownedBall.created','fictional-kept',{catalogId:'hy-road',name:'Fictional original copy',layout:'Fictional confirmed layout',status:'benched'});await h.add('session.created','fictional-kept-night',{kind:'tonight',ended:true,date:'2026-11-01'}); }""")
   before=await p.evaluate("import('./js/hub.js').then(h=>h.db.events().map(e=>e.id))");foundation=await p.evaluate("import('./js/hub.js').then(h=>JSON.stringify(h.db.meta.foundationSnapshot))");root[0]=args.current_root
   await p.evaluate('navigator.serviceWorker.getRegistration().then(r=>{window.__upgradeReg=r;return r.update()})');await p.wait_for_function('() => !!window.__upgradeReg.waiting',timeout=30000)
   # Same explicit Refresh action as the app offers, never activation during scoring.
   async with p.expect_navigation(wait_until='load',timeout=30000):
    await p.evaluate("window.__upgradeReg.waiting.postMessage('skip')")
   await p.wait_for_function('() => window.__apData')
   await p.evaluate("import('./js/hub.js').then(h=>h.ready())")
   assert await p.evaluate("import('./js/data/backup.js').then(m=>typeof m.restoreIssues==='function' && typeof m.recoverySupport==='function')")
   assert await p.evaluate("import('./js/hub.js').then(h=>h.db.meta.foundationV===1)")
   assert await p.evaluate("v=>caches.keys().then(k=>k.includes('arsenal-pro-v71')&&!k.includes('arsenal-pro-v'+v))",args.from_version)
   if args.from_version>=65:assert await p.evaluate("import('./js/hub.js').then(h=>JSON.stringify(h.db.meta.foundationSnapshot))")==foundation
   else:await p.wait_for_selector('#legacyReview')
   after=await p.evaluate("import('./js/hub.js').then(h=>h.db.events().map(e=>e.id))");assert set(before)<=set(after);o=await p.evaluate("window.__apData.projection().owned['fictional-kept']");assert o['layout']=='Fictional confirmed layout';assert await p.evaluate("JSON.parse(localStorage.getItem('ap_profile')).pap")=='Fictional confirmed PAP';assert await p.evaluate("JSON.parse(localStorage.getItem('ap_profile')).hand")=='left'
   assert await p.evaluate("JSON.parse(localStorage.getItem('ap_prefs')).myLines['hy-road'].eyes")==10
   assert await p.evaluate('window.__apSync.run().then(r=>r.paused)')
   asset=await c.new_page();response=await asset.goto(base+'tests/axe.min.js');assert response and 'html' not in response.headers.get('content-type','');assert await asset.locator('script[src]').count()==0;await asset.close()
   await c.set_offline(True);await p.reload();await p.wait_for_function('() => window.__apData');assert await p.evaluate("window.__apData.projection().owned['fictional-kept'].name")=='Fictional original copy';assert await p.evaluate("Promise.all([import('./js/data/local_recovery.js'),import('./js/screens/recovery.js')]).then(([a,b])=>typeof a.undoLocalRecovery==='function'&&typeof b.localRecoveryPanel==='function')");await p.screenshot(path=args.shots+f'/v{args.from_version}-to-v68-offline-upgrade.png',full_page=True)
   await c.close();await b.close();print(f'PASS real waiting v{args.from_version}->v71 update + reload; original IDs/layout/PAP/aims kept, migration idempotent, sync paused, offline cold launch; direct asset navigation stays an asset, all external requests blocked')
 finally:server.shutdown();server.server_close()
asyncio.run(main())
