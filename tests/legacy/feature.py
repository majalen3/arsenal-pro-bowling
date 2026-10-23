"""Phase-colored path / lengths / roll speed / reads early-late. usage: python tests/feature.py BASE_URL"""
import sys
from playwright.sync_api import sync_playwright
BASE=sys.argv[1]+('&' if '?' in sys.argv[1] else '?')+'api=http://127.0.0.1:1'; fails=[]
def check(c,m):
    print(('PASS ' if c else 'FAIL ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch()
    for name,(w,h,mob) in {'mobile':(390,844,True),'desktop':(1280,800,False)}.items():
        ctx=br.new_context(viewport={'width':w,'height':h},device_scale_factor=2,is_mobile=mob,has_touch=mob); pg=ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto(BASE); pg.wait_for_timeout(800)
        r=pg.evaluate('lastResult'); ph=r['phases']
        check(ph and 0<ph['skid']<ph['roll']<=ph['end']<=60.01,f'{name}: phases ordered {ph}')
        check(15<=ph['skid']<=22 and 44<=ph['roll']<=58,f'{name}: boundaries near nominal 20/52 ft (skid {ph["skid"]:.1f}, roll {ph["roll"]:.1f})')
        t=pg.inner_text('#infoPanel'); sp=pg.evaluate('+document.getElementById("speed").value')
        check('Skid' in t and 'Hook' in t and 'Roll' in t and ' ft' in t,f'{name}: readout lists skid/hook/roll in ft')
        import re; m=re.search(r'Rolls at ~([\d.]+) mph \(est\.\)',t)
        check(m and abs(float(m.group(1))-sp*5/7)<0.06,f'{name}: roll speed = 5/7 x {sp} = {sp*5/7:.1f} (shown {m.group(1) if m else None})')
        pg.evaluate('setControl("speed",18);drawLane()'); m=re.search(r'Rolls at ~([\d.]+) mph',pg.inner_text('#infoPanel')); check(m and abs(float(m.group(1))-18*5/7)<0.06,f'{name}: roll speed updates with speed')
        pg.evaluate('setControl("speed",15);drawLane()')
        cols=pg.evaluate('''(()=>{const c=document.getElementById("lane"),g=c.getContext("2d"),d=g.getImageData(0,0,c.width,c.height).data;const want={skid:[125,211,252],hook:[218,175,55],roll:[134,239,172]},n={skid:0,hook:0,roll:0};for(let i=0;i<d.length;i+=4)for(const k in want){const w=want[k];if(Math.abs(d[i]-w[0])<6&&Math.abs(d[i+1]-w[1])<6&&Math.abs(d[i+2]-w[2])<6&&d[i+3]>200)n[k]++}return n})()''')
        check(all(v>15 for v in cols.values()),f'{name}: path drawn in three phase colours {cols}')
        check(pg.evaluate('lastResult.endX<lastResult.startX'),f'{name}: still hooks left')
        # skid end by pattern/ball differs (tuned from sim)
        sk=pg.evaluate('(()=>{const s=new Set();for(const b of balls){const f=skidFtOf(b);if(f!=null)s.add(Math.round(f*10))}return s.size})()'); check(sk>=3,f'{name}: skid boundary varies per ball ({sk} distinct)')
        pg.click('#tabArsenal'); pg.wait_for_timeout(300)
        tags=pg.eval_on_selector_all('.acard .reads','e=>e.map(x=>x.className.split("-")[1]+"|"+x.textContent)')
        kinds={t.split('|')[0] for t in tags}
        check(len(tags)==22 and {'early','late'}<=kinds,f'{name}: reads tags on all 22 cards, kinds {kinds}')
        pg.click('#compareToggle'); 
        for i in range(2): pg.locator('.acard .cmp input').nth(i).click(force=True)
        check('Reads' in pg.inner_text('#compareWrap'),f'{name}: compare table has Reads row')
        check(pg.evaluate('document.documentElement.scrollWidth')<=w,f'{name}: no overflow with tags')
        check(not errs,f'{name}: no page errors {errs}'); ctx.close()
    br.close()
print('FAILS',fails); sys.exit(1 if fails else 0)
