"""Reviewer audit. usage: python tests/review.py BASE_URL [API_URL]  (API defaults to dead port => offline mode, no data written)
Checks: viewport matrix, overflow, lane geometry, a11y (axe), tap targets, XSS, persistence, perf, keyboard."""
import sys, os, json, time
from playwright.sync_api import sync_playwright
BASE=sys.argv[1]; API=sys.argv[2] if len(sys.argv)>2 else 'http://127.0.0.1:1'
URL=BASE+('&' if '?' in BASE else '?')+'api='+API
AXE=open(os.path.join(os.path.dirname(__file__),'axe.min.js')).read()
res=[]
def check(cat,c,m,sev='Med'):
    res.append((cat,bool(c),m,sev)); print(('PASS ' if c else 'FAIL ['+sev+'] ')+f'({cat}) '+m)
VPS={'360x640':(360,640,3,True),'390x844':(390,844,3,True),'768x1024':(768,1024,2,True),'1280x800':(1280,800,1,False)}
def rect(pg,sel): return pg.eval_on_selector(sel,'e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,w:r.width,h:r.height,r:r.right,b:r.bottom+scrollY}}')
with sync_playwright() as p:
    br=p.chromium.launch()
    for name,(w,h,dpr,mob) in VPS.items():
        ctx=br.new_context(viewport={'width':w,'height':h},device_scale_factor=dpr,is_mobile=mob,has_touch=mob)
        pg=ctx.new_page(); errs=[]
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'ERR_CONNECTION_REFUSED' not in m.text and 'Failed to load resource' not in m.text else None)
        pg.on('pageerror',lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(1000)
        phone = w<800
        cv=rect(pg,'#lane'); ctl=rect(pg,'.controls')
        check('mobile',pg.evaluate('document.documentElement.scrollWidth')<=w,f'{name} no h-overflow','High')
        if phone:
            check('mobile',cv['b']<=h and cv['y']>=0,f'{name} lane fully visible on first screen (y {cv["y"]:.0f}-{cv["b"]:.0f} of {h})','High')
            check('mobile',ctl['y']<h,f'{name} controls start on first screen (y={ctl["y"]:.0f})','High')
            check('mobile',pg.evaluate('getComputedStyle(document.querySelector(".controls")).gridTemplateColumns.split(" ").length')==2,f'{name} controls 2-col','Med')
            bigs=pg.evaluate('(()=>{const a=document.getElementById("lane").getBoundingClientRect().height;const o=[];document.querySelectorAll(".controls,#infoPanel,#missFeedback,.sidebar,details.alley").forEach(e=>{const r=e.getBoundingClientRect();if(r.height>=a)o.push((e.className||e.id)+":"+Math.round(r.height)+">="+Math.round(a))});return o})()')
            check('mobile',not bigs,f'{name} lane is largest element ({bigs})','Med')
        else:
            sd=rect(pg,'.sidebar')
            check('mobile',sd['r']<=cv['x']+.5 and cv['r']<=ctl['x']+.5 and ctl['r']<=w+.5,f'{name} 3 columns no overlap','High')
            check('mobile',cv['b']<=h+1,f'{name} lane fits viewport height','Med')
        # tap targets
        small=pg.evaluate('''(()=>{const o=[];document.querySelectorAll("button,select,input:not([type=hidden]),a,[role=button]").forEach(e=>{const r=e.getBoundingClientRect();if(!r.width||getComputedStyle(e).visibility==="hidden")return;const lab=e.closest("label");const rr=e.type==="range"?r:r;const hh=Math.max(r.height,lab?lab.getBoundingClientRect().height:0);if(hh<44||r.width<44&&e.tagName==="BUTTON")o.push((e.id||e.className||e.tagName)+":"+Math.round(r.width)+"x"+Math.round(hh))});return o})()''')
        if phone: check('a11y',len(small)==0,f'{name} tap targets >=44px; small: {small[:6]}','Med')
        # geometry via spying fillText
        if name=='390x844':
            g=pg.evaluate('''(()=>{const rec={};const o=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,x,y){if(["DOTS","ARROWS","RANGE","BAKER"].includes(t))rec[t]=y;return o.apply(this,arguments)};drawLane();CanvasRenderingContext2D.prototype.fillText=o;
              const pf=(FOUL_Y-68)/60;return {dots:(FOUL_Y-(rec.DOTS+3))/pf,arrows:(FOUL_Y-(rec.ARROWS+4))/pf,range:(FOUL_Y-(rec.RANGE+2))/pf,baker:(FOUL_Y-(rec.BAKER+3))/pf,pxft:PX_FT,pf}})()''')
            for k,t in [('dots',7.5),('arrows',15),('range',37),('baker',46)]:
                check('lane',abs(g[k]-t)<0.3,f'marker {k} at {g[k]:.2f} ft (want {t})','High')
            check('lane',abs(g['pxft']-g['pf'])<0.01,f'PX_FT const matches draw scale ({g["pxft"]:.3f} vs {g["pf"]:.3f})','Med')
            hx=pg.evaluate('(()=>{const r=lastResult;return [r.endX<r.startX, boardToX(1,220)>boardToX(39,220)]})()')
            check('lane',hx[0],'ball hooks left','Blocker'); check('lane',not hx[1],'board 1 on the right (x(1) > x(39))','Blocker') if False else check('lane',pg.evaluate('boardToX(1,220)>boardToX(39,220)'),'board 1 on the right','Blocker')
            sw=pg.evaluate('''(()=>{const s={};for(const ball of balls){selectedBall=ball;let bad=0;for(const rel of [8,12,16,22]){for(const aim of [-6,-4,-2,0,2]){setControl("release",rel);setControl("aim",aim);drawLane();s[lastResult.pocketCall.split(" ")[0]]=1;const P=lastResult.points,n=P.length,k=Math.max(3,Math.floor(n/8));if(n<2*k)continue;const s0=(P[k].x-P[0].x)/(P[0].y-P[k].y),s1=(P[n-1].x-P[n-1-k].x)/(P[n-1-k].y-P[n-1].y);if(!(s1<s0+0.002))bad++}}if(bad)s["BAD_"+ball.id]=bad}return s})()''')
            check('lane',not [k for k in sw if k.startswith('BAD_')],f'every ball curves left (late slope more leftward than early) over release/aim sweep: {sw}','High')
            check('lane',{'LIGHT','HIGH'}<=set(sw),'light & high calls reachable','High')
            pg.evaluate('selectedBall=balls[0];init&&0')
        # a11y axe
        pg.evaluate(AXE); ax=pg.evaluate('axe.run({runOnly:["wcag2a","wcag2aa","best-practice"]}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,ex:v.nodes[0].target.join(" ")})))')
        bad=[a for a in ax if a['impact'] in('serious','critical')]; mod=[a for a in ax if a['impact'] in ('moderate','minor')]
        check('a11y',not bad,f'{name} axe serious/critical: {bad}','High'); check('a11y',not mod,f'{name} axe moderate/minor: {mod}','Low')
        # arsenal view axe once
        if name in('390x844','1280x800'):
            pg.click('#tabArsenal'); pg.wait_for_timeout(300)
            check('mobile',pg.evaluate('document.documentElement.scrollWidth')<=w,f'{name} arsenal no h-overflow','High')
            pg.evaluate(AXE); ax=pg.evaluate('axe.run({runOnly:["wcag2a","wcag2aa","best-practice"]}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,ex:v.nodes[0].target.join(" ")})))')
            check('a11y',not ax,f'{name} arsenal axe: {ax}','High' if any(a['impact'] in('serious','critical') for a in ax) else 'Low')
            pg.click('#tabArsenal')
        check('code',not errs,f'{name} no console/page errors {errs}','Med')
        ctx.close()
    # XSS + long names + persistence + keyboard (390)
    ctx=br.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True); pg=ctx.new_page()
    dlg=[]; pg.on('dialog',lambda d:(dlg.append(d.message),d.dismiss()))
    pg.goto(URL); pg.wait_for_timeout(800)
    pg.evaluate('window.__x=0')
    for nm in ['<img src=x onerror=window.__x=1>','"><svg onload=window.__x=1>','a'*60,'\U0001F3B3'*20,"x' onclick='window.__x=1"]:
        pg.fill('#lineName',nm); pg.fill('#lineNote','<b onmouseover=window.__x=1>n</b>'); pg.click('#saveLine'); pg.wait_for_timeout(200)
    pg.wait_for_timeout(300)
    check('security',pg.evaluate('window.__x')==0 and not dlg,'XSS payloads in line names/notes inert','Blocker')
    check('security',pg.evaluate('document.querySelectorAll("#savedLines img,#savedLines svg,#savedLines b").length')==0,'no injected elements in saved list','Blocker')
    ov=pg.evaluate('document.documentElement.scrollWidth'); culprit=pg.evaluate('[...document.querySelectorAll("main *")].filter(e=>e.getBoundingClientRect().right>391).map(e=>(e.className||e.tagName)+"#"+e.id).slice(0,5)')
    check('mobile',ov<=390,f'long/emoji names do not overflow page (scrollWidth {ov}; {culprit})','High')
    pg.evaluate('document.querySelectorAll("details").forEach(d=>d.open=true)')
    pg.fill('#noteLane','<i>1'); pg.fill('#noteOil','<img src=x onerror=window.__x=1>'); pg.fill('#noteAdj','a'); 
    if not pg.is_visible('#noteLane'):
        pg.evaluate('document.querySelectorAll("details").forEach(d=>d.open=true)')
    pg.click('#saveNote'); pg.wait_for_timeout(300)
    check('security',pg.evaluate('window.__x')==0,'XSS in pattern note inert','Blocker')
    # persistence: save, reload, load
    pg.fill('#lineName','Persist1'); pg.fill('#lineNote','n'); pg.evaluate('setControl("release",21);setControl("aim",3);drawLane()'); pg.click('#saveLine')
    pg.reload(); pg.wait_for_timeout(800)
    pg.evaluate('setControl("release",5);drawLane()')
    pg.locator('#savedLines .load',has_text='Persist1').first.click()
    check('persist',pg.evaluate('+document.getElementById("release").value')==21,'saved line survives refresh & one-tap load','Blocker')
    if 'ahora' or True:
        if '127.0.0.1:1' not in API:
            # offline writes must sync later; offline delete must reach server
            ctx.route('**/api/**', lambda rt: rt.abort()); pg.evaluate('document.getElementById("alleyNotes").open=true')
            pg.click('#logFinish'); pg.wait_for_timeout(400)
            pg.fill('#noteLane','7'); pg.fill('#noteOil','offlineoil'); pg.fill('#noteAdj','offline adj'); pg.click('#saveNote'); pg.wait_for_timeout(400)
            ctx.unroute('**/api/**')
            pg.evaluate('window.dispatchEvent(new Event("online"))'); pg.wait_for_timeout(2500)
            dv=pg.evaluate('localStorage.getItem("ap_device")')
            cnt=pg.evaluate('(async()=>{const h={"X-Device-Id":localStorage.getItem("ap_device")};const a=await (await fetch(API_BASE+"/api/surface-log",{headers:h})).json();const b=await (await fetch(API_BASE+"/api/pattern-notes",{headers:h})).json();return [a.length,b.filter(x=>x.oil==="offlineoil").length]})()')
            check('persist',cnt[0]>=1 and cnt[1]==1,f'offline surface log + pattern note sync when connection returns {cnt}','High')
            pg.fill('#lineName','DelMe'); pg.click('#saveLine'); pg.wait_for_timeout(600)
            ctx.route('**/api/**', lambda rt: rt.abort())
            pg.locator('#savedLines .line-item',has_text='DelMe').locator('.del').click(); pg.wait_for_timeout(400)
            ctx.unroute('**/api/**'); pg.evaluate('window.dispatchEvent(new Event("online"))'); pg.wait_for_timeout(2500)
            gone=pg.evaluate('(async()=>{const h={"X-Device-Id":localStorage.getItem("ap_device")};const a=await (await fetch(API_BASE+"/api/lines",{headers:h})).json();return a.filter(x=>x.name==="DelMe").length})()')
            check('persist',gone==0 and pg.locator('#savedLines .line-item',has_text='DelMe').count()==0,'line deleted while offline is removed from server after reconnect and does not reappear','High')
            pg.evaluate('fetch(API_BASE+"/api/me",{method:"DELETE",headers:{"X-Device-Id":localStorage.getItem("ap_device")}})'); pg.wait_for_timeout(300)
    # touch: vertical swipe over the lane must scroll the page and not change aim; horizontal drag sets aim
    bb=pg.eval_on_selector('#lane','e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}'); cdp=ctx.new_cdp_session(pg)
    def touch(t,x,y): cdp.send('Input.dispatchTouchEvent',{'type':t,'touchPoints':[{'x':x,'y':y}] if t!='touchEnd' else []})
    pg.evaluate('setControl("aim",0);drawLane();scrollTo(0,0)'); x=bb[0]+bb[2]*.5; y=bb[1]+bb[3]*.5
    touch('touchStart',x,y+100)
    for i in range(1,10): touch('touchMove',x,y+100-i*20)
    touch('touchEnd',0,0); pg.wait_for_timeout(300)
    check('mobile',pg.evaluate('scrollY')>50 and pg.evaluate('+document.getElementById("aim").value')==0,'vertical swipe on lane scrolls page without moving aim','High')
    pg.evaluate('scrollTo(0,0)'); pg.wait_for_timeout(100)
    bb=pg.eval_on_selector('#lane','e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}'); x=bb[0]+bb[2]*.5; y=bb[1]+bb[3]*.5; touch('touchStart',x,y)
    for i in range(1,8): touch('touchMove',x+i*8,y)
    touch('touchEnd',0,0); pg.wait_for_timeout(200)
    check('mobile',pg.evaluate('+document.getElementById("aim").value')!=0,'horizontal touch drag on lane sets aim','High')
    if '127.0.0.1:1' not in API:
        code=pg.evaluate('localStorage.getItem("ap_device")'); pg.fill('#lineName','CodeLine'); pg.click('#saveLine'); pg.wait_for_timeout(600)
        ctx2=br.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True); p2=ctx2.new_page(); p2.goto(URL); p2.wait_for_timeout(800)
        check('persist',p2.evaluate('document.getElementById("deviceCode").value')!=code and p2.locator('#savedLines .load',has_text='CodeLine').count()==0,'fresh phone starts with its own code and no foreign data','High')
        p2.evaluate('document.querySelectorAll("details").forEach(d=>d.open=true)'); p2.fill('#restoreCode','bad code!'); p2.click('#useCode')
        check('persist',p2.text_content('#saveStatus').startswith('That is not'),'invalid backup code rejected','Med')
        p2.fill('#restoreCode',code); p2.click('#useCode'); p2.wait_for_timeout(1800)
        p2.reload(); p2.wait_for_timeout(1200)
        n=p2.evaluate('lsGet("ap_lines")' if False else 'JSON.parse(localStorage.getItem("ap_lines")||"[]").filter(l=>l.name==="CodeLine").length')
        check('persist',n>=1 and p2.evaluate('localStorage.getItem("ap_device")')==code,'backup code moves saved lines to another phone','High')
        ctx2.close(); pg.evaluate('fetch(API_BASE+"/api/me",{method:"DELETE",headers:{"X-Device-Id":localStorage.getItem("ap_device")}})'); pg.wait_for_timeout(300)
    for mode,js in [('blocked',"Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError')}})"),('full',"Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError')}")]:
        cx=br.new_context(viewport={'width':390,'height':844}); cx.add_init_script(js); px=cx.new_page(); pe=[]; px.on('pageerror',lambda e:pe.append(str(e)))
        px.goto(URL); px.wait_for_timeout(600); px.fill('#lineName','Mem1'); px.click('#saveLine'); px.wait_for_timeout(500)
        check('persist',px.locator('#savedLines .load',has_text='Mem1').count()==1 and not pe,f'storage {mode}: line still listed in this tab, no errors {pe}','High'); cx.close()
    check('security',pg.evaluate('!!document.querySelector("meta[http-equiv=Content-Security-Policy]")') and 'unsafe-inline' not in pg.evaluate('document.querySelector("meta[http-equiv=Content-Security-Policy]").content.match(/script-src[^;]*/)[0]'),'CSP present and scripts/inline handlers blocked (no unsafe-inline in script-src)','Med')
    pg.evaluate('window.__x=0;document.body.insertAdjacentHTML("beforeend","<img src=x onerror=window.__x=1>")'); pg.wait_for_timeout(300)
    check('security',pg.evaluate('window.__x')==0,'injected inline event handler does not run (CSP)','High')
    pg.evaluate('document.querySelectorAll(".ball-card .pick")[3].click();setControl("release",19);setControl("aim",1.5);drawLane()'); pg.wait_for_timeout(600); pg.reload(); pg.wait_for_timeout(700)
    check('persist',pg.evaluate('selectedBall.id')==pg.evaluate('balls[3].id') and pg.evaluate('+document.getElementById("release").value')==19 and pg.evaluate('document.querySelector(".ball-card.active .name").textContent')==pg.evaluate('balls[3].name'),'selected ball + settings survive refresh','Med')
    # corrupt localStorage resilience
    pg.evaluate('localStorage.setItem("ap_lines","{{notjson");localStorage.setItem("ap_notes","123")'); pg.reload(); pg.wait_for_timeout(600)
    check('persist',pg.is_visible('#lane') and pg.evaluate('typeof lastResult')=='object','corrupt localStorage does not break app','High')
    # keyboard focus visibility
    pg.reload(); pg.wait_for_timeout(500); vis=0; tot=0
    for i in range(25):
        pg.keyboard.press('Tab')
        o=pg.evaluate('(()=>{const e=document.activeElement;if(!e||e===document.body)return null;const s=getComputedStyle(e);return {t:e.tagName,v:(s.outlineStyle!=="none"&&parseFloat(s.outlineWidth)>0)||s.boxShadow!=="none"}})()')
        if o: tot+=1; vis+=o['v']
    check('a11y',tot>5 and vis>=tot-1,f'visible keyboard focus on tabbed controls {vis}/{tot}','Med')
    # canvas keyboard operability
    check('a11y',pg.evaluate('(()=>{const c=document.getElementById("lane");return !!(c.getAttribute("aria-label")||c.getAttribute("role"))})()'),'canvas has role/aria-label','Med')
    # reduced motion / viewport meta / manifest
    check('perf',pg.evaluate('!!document.querySelector("link[rel=manifest]")'),'PWA manifest present','Low')
    check('perf',pg.evaluate('"serviceWorker" in navigator')and pg.evaluate('!!document.querySelector("link[rel=manifest]")'),'installable (manifest)','Low')
    check('a11y',pg.evaluate('document.documentElement.lang')!='' ,'html lang set','Low')
    ctx.close()
    # perf
    ctx=br.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=3); pg=ctx.new_page()
    pg.goto(URL,wait_until='load'); pg.wait_for_timeout(500)
    t=pg.evaluate('(()=>{const n=performance.getEntriesByType("navigation")[0];return {dcl:n.domContentLoadedEventEnd,load:n.loadEventEnd,bytes:n.transferSize}})()')
    check('perf',t['dcl']<1500,f'DCL {t["dcl"]:.0f} ms bytes {t["bytes"]}','Med')
    d=pg.evaluate('(()=>{const t=performance.now();for(let i=0;i<50;i++)drawLane();return (performance.now()-t)/50})()')
    check('perf',d<16,f'drawLane {d:.2f} ms/call','Med')
    n=pg.evaluate('''(()=>{let c=0;const o=window.drawLane;window.drawLane=function(){c++;return o.apply(this,arguments)};const r=document.getElementById("release");for(let i=0;i<30;i++){r.value=10+i%10;r.dispatchEvent(new Event("input",{bubbles:true}))}return new Promise(res=>requestAnimationFrame(()=>requestAnimationFrame(()=>{window.drawLane=o;res(c)})))})()''')
    check('perf',n<=3,f'30 rapid slider inputs -> {n} redraws (rAF-coalesced)','Low')
    ctx.close(); br.close()
fails=[r for r in res if not r[1]]
json.dump({'pass':len(res)-len(fails),'fail':[{'cat':c,'msg':m,'sev':s} for c,ok,m,s in fails]},open('/workspace/review-last.json','w'),indent=1)
print('SUMMARY pass',len(res)-len(fails),'fail',len(fails))
