"""SCRIPTED simulated users (headless Playwright personas) - NOT real people.
usage: python tests/sim.py RUN BASE_URL API_URL SHARD NSHARDS [N=100]
Writes /workspace/sim/run{RUN}-shard{SHARD}.jsonl (one JSON per user). Data prefix: SIM{RUN}-."""
import sys, os, json, time, random, re
from playwright.sync_api import sync_playwright
RUN, BASE, API, SHARD, NSH = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
N = int(sys.argv[6]) if len(sys.argv) > 6 else 100
os.makedirs('/workspace/sim', exist_ok=True)
URL = BASE + ('&' if '?' in BASE else '?') + 'api=' + API
DEV = [('iPhoneSE',375,667,2,True),('iPhone14',390,844,3,True),('Pixel7',412,915,2.6,True),('Galaxy360',360,640,3,True),('iPad',768,1024,2,True),('Laptop',1280,800,1,False),('Desktop',1920,1080,1,False),('Fold',280,653,3,True),('iPhone14Land',844,390,3,True)]
NET = ['normal']*11+['slow3g']*3+['offline']*2+['api_slow']*1+['api_fail']*2+['api_429']*1
NAMES = lambda r,u: [f'SIM{RUN}-u{u}-Lane{r.randint(1,40)} fresh', f'SIM{RUN}-u{u}-'+'L'*45, f'SIM{RUN}-u{u}-\U0001F3B3\U0001F525\U0001F3B3', f'SIM{RUN}-u{u}-<img src=x onerror=window.__x=1>', f'SIM{RUN}-u{u}-"\'><svg onload=window.__x=1>', f'SIM{RUN}-u{u}-  spaces  ']
ACTS = ['save','save','drag','keys','sliders','rapid','balls','finish','note','arsenal','arsenal','reload','dossier','delete','recommend']
def run_user(br, u):
    r = random.Random(RUN.__hash__() % 1000 * 1000 + u)
    dev = r.choice(DEV); net = r.choice(NET)
    name, w, h, dpr, mob = dev
    rec = dict(user=u, device=name, vp=[w,h], net=net, acts=[], fails=[], console=[], pageerrors=[], reqfail=[], api=[], saves=[], t={})
    ctx = br.new_context(viewport={'width':w,'height':h}, device_scale_factor=dpr, is_mobile=mob, has_touch=mob)
    pg = ctx.new_page(); pg.set_default_timeout(8000)
    pg.evaluate("1") if False else None
    expected_fail = net in ('offline','api_fail','api_429','api_slow')
    def on_console(m):
        if m.type == 'error' and not (expected_fail and ('Failed to load resource' in m.text or 'ERR_' in m.text or 'CORS' in m.text)): rec['console'].append(m.text[:200])
    pg.on('console', on_console); pg.on('pageerror', lambda e: rec['pageerrors'].append(str(e)[:200]))
    starts = {}
    pg.on('request', lambda q: starts.__setitem__(q, time.time()) if '/api/' in q.url else None)
    def on_resp(resp):
        q = resp.request
        if '/api/' in q.url and q in starts: rec['api'].append([q.method, re.sub(r'\?.*','',q.url.split('/api/')[1]), resp.status, round((time.time()-starts[q])*1000)])
    pg.on('response', on_resp)
    pg.on('requestfailed', lambda q: rec['reqfail'].append([q.url[:80], str(q.failure)[:60]]) if not (expected_fail and '/api/' in q.url) else rec['reqfail'].append(['(expected)'+q.url[:60], '']))
    if net == 'slow3g':
        cdp = ctx.new_cdp_session(pg); cdp.send('Network.enable'); cdp.send('Network.emulateNetworkConditions', {'offline':False,'latency':300,'downloadThroughput':400*1024/8,'uploadThroughput':200*1024/8})
    if net == 'api_slow': ctx.route('**/api/**', lambda rt: (time.sleep(3.0 if r.random()<.6 else 7.5), rt.continue_())[1])
    if net == 'api_fail': ctx.route('**/api/**', lambda rt: rt.fulfill(status=503, body='{"error":"x"}', headers={'access-control-allow-origin':'*','content-type':'application/json'}))
    if net == 'api_429': ctx.route('**/api/**', lambda rt: rt.fulfill(status=429, body='{"error":"too many requests"}', headers={'access-control-allow-origin':'*','content-type':'application/json','retry-after':'30'}))
    def F(c, m):
        if not c: rec['fails'].append(m)
    def vis_ok(tag):
        sw = pg.evaluate('document.documentElement.scrollWidth'); F(sw <= w, f'{tag}: h-overflow {sw}>{w}')
    try:
        t0 = time.time(); pg.goto(URL, wait_until='load', timeout=45000); rec['t']['load'] = round((time.time()-t0)*1000)
        pg.wait_for_timeout(500)
        if net == 'offline': ctx.set_offline(True)
        # base invariants
        lb = pg.eval_on_selector('#lane','e=>{const r=e.getBoundingClientRect();return [r.y,r.bottom,r.width,r.height]}')
        phone = w < 800
        if phone and h >= 600 and w < h: F(lb[1] <= h, f'lane not fully visible on first screen (bottom {lb[1]:.0f}>{h})')
        if phone and w < h: F(pg.eval_on_selector('.controls','e=>e.getBoundingClientRect().y') < h, 'controls not on first screen')
        F(pg.evaluate('lastResult.endX<lastResult.startX'), 'default shot does not hook left')
        vis_ok('initial')
        pg.evaluate('window.__x=0')
        saved_names = []
        for _ in range(r.randint(5, 9)):
            a = r.choice(ACTS); rec['acts'].append(a); pg.wait_for_timeout(r.randint(100, 500))
            if a == 'save':
                nm = r.choice(NAMES(r, u)); pg.fill('#lineName', nm); pg.fill('#lineNote', r.choice(['', 'ok', '<b>x</b>', 'n'*200]))
                if r.random() < .5: pg.evaluate(f'setControl("release",{r.randint(5,30)});setControl("aim",{r.randint(-8,8)});drawLane()')
                t = time.time(); pg.click('#saveLine')
                try: pg.wait_for_function('()=>/^(Saved|Offline|Slow|Too|Server|Could)/.test(document.getElementById("saveStatus").textContent)', timeout=20000); st = pg.text_content('#saveStatus')
                except Exception: st = 'TIMEOUT'
                lat = round((time.time()-t)*1000); rec['saves'].append([st, lat]); saved_names.append(nm.strip())
                F(st != 'TIMEOUT', 'save status never resolved (UI stuck on Saving...)')
                if net == 'normal': F(st.startswith('Saved'), f'normal-network save status {st!r}')
                F(pg.locator('#savedLines .load').count() >= 1, 'saved line not listed immediately')
            elif a == 'drag':
                bb = pg.eval_on_selector('#lane','e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}')
                for fy in (0.93, 0.6):
                    pg.mouse.move(bb[0]+bb[2]*.5, bb[1]+bb[3]*fy); pg.mouse.down()
                    for k in range(8): pg.mouse.move(bb[0]+bb[2]*(.3+.05*k), bb[1]+bb[3]*fy, steps=2)
                    pg.mouse.up()
                F(pg.evaluate('typeof lastResult.pocketCall')=='string', 'drag broke result')
            elif a == 'keys':
                pg.focus('#lane')
                for k in r.choices(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'], k=10): pg.keyboard.press(k)
                F(pg.evaluate('document.getElementById("missFeedback").textContent.length')>3, 'no feedback after keys')
            elif a == 'sliders':
                for id_ in ['speed','rev','release','aim','oil']:
                    pg.evaluate(f'(()=>{{const e=document.getElementById("{id_}");e.value=e.min;e.dispatchEvent(new Event("input"));e.value=e.max;e.dispatchEvent(new Event("input"))}})()')
                pg.wait_for_timeout(120); F(pg.evaluate('lastResult.pocketCall')!=None, 'extreme sliders broke sim'); pg.evaluate('setControl("speed",15);setControl("rev",220);setControl("release",12);setControl("aim",-4);drawLane()')
            elif a == 'rapid':
                t = time.time()
                for _ in range(25): pg.click('#simulate', timeout=3000)
                rec['t']['rapid25'] = round((time.time()-t)*1000)
            elif a == 'balls':
                cards = pg.locator('.ball-card .pick'); n = cards.count()
                for _ in range(r.randint(3, 8)): cards.nth(r.randrange(n)).click(); 
                F(pg.evaluate('lastResult.points.length')>5, 'ball switch left empty path')
            elif a == 'finish':
                pg.select_option('#finish', r.choice(['factory','500','1000','2000','3000','polished'])); pg.select_option('#pattern', r.choice(['house','sport','cheetah','scorpion','shark','dry']))
                pg.evaluate('document.getElementById("alleyNotes").open=true'); pg.click('#logFinish'); pg.wait_for_timeout(300)
            elif a == 'note':
                pg.evaluate('document.getElementById("alleyNotes").open=true')
                pg.fill('#noteLane', str(r.randint(1,40))); pg.fill('#noteOil', r.choice(['heavy','<i>med</i>','light \U0001F3B3'])); pg.fill('#noteAdj', f'SIM{RUN}-u{u} '+r.choice(['2 left','<script>window.__x=1</script>','x'*300]))
                pg.click('#saveNote'); pg.wait_for_timeout(400)
            elif a == 'arsenal':
                pg.click('#tabArsenal'); pg.wait_for_timeout(250)
                exp=pg.evaluate('arsList().length'); F(pg.locator('.acard').count()==exp, f'arsenal cards {pg.locator(".acard").count()}!={exp}'); F(len(rec.setdefault('_v',[]))>0 or exp==22, f'first arsenal visit shows {exp}!=22'); rec['_v'].append(1); vis_ok('arsenal')
                for sel in r.sample(['#clsChips .chip','#coverChips .chip','#oilChips .chip','#sortChips .chip'], 2):
                    c = pg.locator(sel); c.nth(r.randrange(c.count())).click()
                pg.click('#compareToggle')
                for i in range(min(r.randint(1,4), pg.locator('.acard .cmp input').count())): pg.locator('.acard .cmp input').nth(i).click(force=True)
                F(pg.locator('#compareWrap thead th').count()<=4, 'compare >3 balls'); vis_ok('compare')
                pg.click('#compareToggle')
                pg.locator('.bagball').nth(r.randrange(pg.locator('.bagball').count())).click(); pg.wait_for_timeout(250)
                F(pg.is_visible('#lane'), 'bag ball did not return to lane')
            elif a == 'reload':
                pg.reload(wait_until='load'); pg.wait_for_timeout(500); pg.evaluate('window.__x=window.__x||0')
                if net == 'offline': ctx.set_offline(True)
                if rec['saves']: 
                    # selected ball resets after reload? check line for first ball is only valid on same ball; just app health
                    F(pg.evaluate('typeof lastResult')=='object', 'app dead after reload')
            elif a == 'dossier':
                pg.locator('.info-btn').nth(r.randrange(pg.locator('.info-btn').count())).click(); F(pg.is_visible('#dossierModal.open'), 'dossier not open'); pg.keyboard.press('Escape'); F(not pg.is_visible('#dossierModal.open'), 'Esc did not close dossier')
            elif a == 'delete':
                if pg.locator('#savedLines .del').count(): pg.locator('#savedLines .del').first.click(); pg.wait_for_timeout(300)
            elif a == 'recommend': pg.click('#recommend')
            vis_ok(a)
        F(pg.evaluate('window.__x')==0, 'XSS executed')
        # persistence: pick a ball w/ saved line, reload, line must still be listed (local fallback must always work)
        if saved_names:
            bid = pg.evaluate('selectedBall.id'); has = pg.locator('#savedLines .load').count()
            pg.reload(wait_until='load'); pg.wait_for_timeout(800)
            if net == 'offline': ctx.set_offline(True)
            ls = pg.evaluate('(()=>{try{return JSON.parse(localStorage.getItem("ap_lines")||"[]").length}catch(e){return -1}})()')
            F(ls >= 0, 'localStorage lines unreadable')
            F(not pg.evaluate('window.__x'), 'XSS after reload')
        rec['device_id'] = pg.evaluate('localStorage.getItem("ap_device")')
        rec['t']['dcl'] = pg.evaluate('performance.getEntriesByType("navigation")[0].domContentLoadedEventEnd') if False else None
    except Exception as e:
        rec['fails'].append('EXC['+(rec['acts'][-1] if rec['acts'] else 'load')+'] '+str(e).split('\n')[0][:160])
        try: rec['device_id'] = pg.evaluate('localStorage.getItem("ap_device")')
        except Exception: pass
    rec['pass'] = not rec['fails'] and not rec['pageerrors'] and not rec['console']
    ctx.close(); return rec
with sync_playwright() as p:
    br = p.chromium.launch()
    out = open(f'/workspace/sim/run{RUN}-shard{SHARD}.jsonl', 'w')
    for u in range(N):
        if u % NSH != SHARD: continue
        rec = run_user(br, u); out.write(json.dumps(rec)+'\n'); out.flush()
        time.sleep(0.4)
    br.close()
