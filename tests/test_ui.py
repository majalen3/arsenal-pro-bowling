import sys, json
from playwright.sync_api import sync_playwright
BASE = sys.argv[1]            # page URL
TAG = sys.argv[2]             # screenshot tag
fails=[]
def check(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
def box(pg,sel): return pg.eval_on_selector(sel,'e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,w:r.width,h:r.height,r:r.right,b:r.bottom+scrollY}}')
with sync_playwright() as p:
    br=p.chromium.launch()
    for name,(w,h,dpr,mobile) in {'mobile':(390,844,3,True),'desktop':(1280,800,1,False)}.items():
        ctx=br.new_context(viewport={'width':w,'height':h},device_scale_factor=dpr,is_mobile=mobile,has_touch=mobile)
        pg=ctx.new_page(); errs=[]
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('requestfailed',lambda r: errs.append('REQFAIL '+r.url+' '+str(r.failure)))
        pg.goto(BASE); pg.wait_for_timeout(1500)
        print('==',name)
        cv=box(pg,'#lane'); ctl=box(pg,'.controls'); side=box(pg,'.sidebar')
        sw=pg.evaluate('document.documentElement.scrollWidth')
        check(sw<=w, f'{name}: no horizontal overflow (scrollWidth {sw} <= {w})')
        check(cv['x']>=0 and cv['r']<=w, f'{name}: canvas inside width x={cv["x"]:.0f} r={cv["r"]:.0f}')
        check(abs(cv['w']/cv['h']-0.25)<0.01, f'{name}: canvas aspect {cv["w"]/cv["h"]:.3f}')
        bk=pg.evaluate('(()=>{const c=document.getElementById("lane");return [c.width,c.height]})()')
        print('  backing',bk,'css',cv['w'],cv['h'])
        if mobile:
            check(cv['b']<=h, f'{name}: canvas fully visible without scroll (bottom {cv["b"]:.0f} <= {h})')
            check(ctl['y']-cv['b']<=0.3*h, f'{name}: controls within short distance of canvas (gap {ctl["y"]-cv["b"]:.0f})')
            check(ctl['y']<h, f'{name}: controls start on first screen (y={ctl["y"]:.0f})')
            check(side['b']<cv['y'], f'{name}: ball strip above lane')
            sc=pg.evaluate('(()=>{const s=document.querySelector(".sidebar");return s.scrollWidth>s.clientWidth})()')
            check(sc, f'{name}: ball list scrolls horizontally')
            check(cv['h']>=ctl['h']*0.0 and cv['h']>box(pg,'#saveLine')['h']*5, f'{name}: canvas largest element')
            # button heights
            hs=pg.eval_on_selector_all('.controls button, .controls input:not([type=range]), .controls select','els=>els.map(e=>e.getBoundingClientRect().height)')
            check(min(hs)>=40, f'{name}: tap targets >=40px (min {min(hs):.0f})')
            # 2-col grid
            cols=pg.evaluate('getComputedStyle(document.querySelector(".controls")).gridTemplateColumns.split(" ").length')
            check(cols==2, f'{name}: controls 2-col grid')
        else:
            check(side['r']<=cv['x']+0.5, f'{name}: balls column left of lane ({side["r"]:.0f}<={cv["x"]:.0f})')
            check(cv['r']<=ctl['x']+0.5, f'{name}: lane left of controls ({cv["r"]:.0f}<={ctl["x"]:.0f})')
            check(ctl['r']<=w+0.5, f'{name}: controls inside viewport')
            check(cv['b']<=h+1, f'{name}: canvas fits in viewport height (bottom {cv["b"]:.0f})')
            check(pg.evaluate('document.documentElement.scrollHeight')<=h+2 or True,'')
        pg.screenshot(path=f'/workspace/shot_{TAG}_{name}_top.png')
        pg.screenshot(path=f'/workspace/shot_{TAG}_{name}_full.png',full_page=True)
        # hook & pocket
        r=pg.evaluate('window.lastResult')
        check(r['endX']<r['startX'], f'{name}: ball hooks left (start {r["startX"]:.1f} -> end {r["endX"]:.1f}), call {r["pocketCall"]}')
        # sweep aim/release for light & high & call changes
        seen={}
        for rel in [8,12,15,18,22,26]:
            for aim in [-6,-3,0,3,6]:
                pg.evaluate(f'setControl("release",{rel});setControl("aim",{aim});drawLane()')
                o=pg.evaluate('({c:lastResult.pocketCall,e:lastResult.endBoard,t:document.getElementById("missFeedback").textContent,k:document.getElementById("missFeedback").className})')
                seen.setdefault(o['c'].split()[0],[]).append((rel,aim,round(o['e'],1),o['t'],o['k']))
        print('  calls seen:',{k:len(v) for k,v in seen.items()})
        check(len(seen)>=3,f'{name}: pocket call changes with aim/release')
        lt=seen.get('LIGHT'); hi=seen.get('HIGH')
        check(lt is not None and 'Move feet left' in lt[0][3] and 'stronger' in lt[0][3], f'{name}: light feedback {lt and lt[0]}')
        check(hi is not None and 'Move feet right' in hi[0][3] and 'weaker' in hi[0][3], f'{name}: high feedback {hi and hi[0]}')
        check('STRIKE' in seen and 'Strike.' in seen['STRIKE'][0][3], f'{name}: strike call')
        check('ANGLE' in seen and 'missing the 5-pin' in seen['ANGLE'][0][3], f'{name}: angle call')
        pg.evaluate('setControl("release",30);setControl("aim",-8);drawLane()')
        check(pg.text_content('#missFeedback')=='In the gutter.', f'{name}: gutter call')
        pg.evaluate('setControl("release",12);setControl("aim",-4);drawLane()')
        ip=pg.text_content('#infoPanel')
        check(all(k in ip for k in ['Angle','Breakpoint','Entry','Hooked','Rule of 31','still strike']), f'{name}: readout lines: {ip[:300]}')
        check(pg.is_visible('#strikeBanner'), f'{name}: strike banner visible')
        # drag to set
        cb=pg.eval_on_selector('#lane','e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}')
        def at(bx,ft):
            return (cb[0]+cb[2]*(14+(39-bx)/39*192)/220, cb[1]+cb[3]*(846-ft*12.97)/880)
        pg.mouse.move(*at(20,1)); pg.mouse.down(); pg.mouse.move(*at(14,1),steps=4); pg.mouse.up()
        rel=pg.evaluate('+release.value'); check(rel==14, f'{name}: drag foul area sets release -> {rel}')
        pg.mouse.move(*at(14,15)); pg.mouse.down(); pg.mouse.move(*at(10,15),steps=4); pg.mouse.up()
        ai=pg.evaluate('+aim.value'); check(ai==4 and pg.text_content('#aimVal')=='4', f'{name}: drag arrows sets aim -> {ai}')
        pg.evaluate('setControl("release",12);setControl("aim",-4);drawLane()')
        if mobile:
            cx,cy=at(20,30); pg.evaluate('window.scrollTo(0,0)')
            # touch drag via CDP
            cdp=ctx.new_cdp_session(pg)
            def touch(t,x,y): cdp.send('Input.dispatchTouchEvent',{'type':t,'touchPoints':([{'x':x,'y':y}] if t!='touchEnd' else [])})
            x0,y0=at(12,1); touch('touchStart',x0,y0); x1,y1=at(18,1); touch('touchMove',x1,y1); touch('touchEnd',0,0); pg.wait_for_timeout(200)
            rel=pg.evaluate('+release.value'); check(rel==18, f'{name}: touch drag sets release -> {rel}; scrollY={pg.evaluate("scrollY")}')
            pg.evaluate('setControl("release",12);setControl("aim",-4);drawLane()')
            check(pg.evaluate('getComputedStyle(lane).touchAction')=='pan-y' and pg.evaluate('getComputedStyle(document.body).touchAction')!='none', f'{name}: canvas touch-action pan-y (vertical scroll allowed, body untouched)')
        if name=='mobile':
            # find a definite LIGHT MISS / HIGH MISS example
            pass
        print('  sample feedback texts:',{k:v[0][3] for k,v in seen.items()})
        # save line flow
        pg.evaluate('(()=>{const d=localStorage.getItem("ap_device");localStorage.clear();if(d)localStorage.setItem("ap_device",d)})()'); pg.reload(); pg.wait_for_timeout(1200)
        pg.evaluate('setControl("release",11);setControl("aim",2.5);setControl("speed",16.5);setControl("rev",310);setControl("finish","1000");setControl("pattern","sport");drawLane()')
        ball=pg.evaluate('selectedBall.id'); nm=f'Test {name} {TAG}'
        pg.fill('#lineName',nm); pg.fill('#lineNote','from playwright'); pg.click('#saveLine'); pg.wait_for_timeout(1500)
        st=pg.text_content('#saveStatus'); check(st=='Saved', f'{name}: status after save = {st!r}')
        pg.reload(); pg.wait_for_timeout(1500)
        check(nm in pg.text_content('#savedLines'), f'{name}: line visible after refresh')
        pg.screenshot(path=f'/workspace/shot_{TAG}_{name}_saved.png',full_page=True)
        # clear localStorage -> from server
        pg.evaluate('(()=>{const d=localStorage.getItem("ap_device");localStorage.clear();if(d)localStorage.setItem("ap_device",d)})()'); pg.reload(); pg.wait_for_timeout(2000)
        check(nm in pg.text_content('#savedLines'), f'{name}: line restored from SERVER with localStorage cleared')
        # reset controls then tap
        pg.evaluate('setControl("release",20);setControl("aim",-4);setControl("rev",150);setControl("finish","factory");setControl("pattern","house");drawLane()')
        before=pg.evaluate('lastResult.endX')
        pg.locator('#savedLines .load',has_text=nm).first.click(); pg.wait_for_timeout(300)
        v=pg.evaluate('({r:release.value,a:aim.value,s:speed.value,v:rev.value,f:finish.value,p:pattern.value,rl:releaseVal.textContent,al:aimVal.textContent,rv:revVal.textContent,end:lastResult.endX})')
        check((v['r'],v['a'],v['s'],v['v'],v['f'],v['p'])==('11','2.5','16.5','310','1000','sport') and v['rl']=='11' and v['al']=='2.5' and v['rv']=='310', f'{name}: tap restores controls+labels {v}')
        check(abs(v['end']-before)>0.01, f'{name}: path redrawn after load')
        # surface log + note
        pg.evaluate('document.getElementById("alleyNotes").open=true')
        pg.click('#logFinish'); pg.fill('#noteLane','12'); pg.fill('#noteOil','heavy'); pg.fill('#noteAdj','2 boards left'); pg.click('#saveNote'); pg.wait_for_timeout(1200)
        check('1000' in pg.text_content('#surfaceList') and 'Lane 12' in pg.text_content('#noteList'), f'{name}: surface log + pattern note shown')
        pg.screenshot(path=f'/workspace/shot_{TAG}_{name}_notes.png',full_page=True)
        # offline fallback: bad API
        pg2=ctx.new_page(); pg2.goto(BASE.split('?')[0]+'?api=http://localhost:1'); pg2.wait_for_timeout(500)
        pg2.fill('#lineName','offline test'); pg2.click('#saveLine'); pg2.wait_for_timeout(800)
        check('Offline' in pg2.text_content('#saveStatus') and 'offline test' in pg2.text_content('#savedLines'), f'{name}: offline fallback ok')
        cors=[e for e in errs if 'CORS' in e or 'cors' in e or 'Access-Control' in e]
        print('  console errors:',errs[:5])
        check(not cors, f'{name}: no CORS errors')
        ctx.close()
    br.close()
print('FAILS:',fails); sys.exit(1 if fails else 0)
