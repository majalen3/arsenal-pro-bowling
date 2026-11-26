"""Feedback button, sheet, offline queue, post-game survey and the two opt-ins (owner t163u, v82), and the v83 one-time opt-in offer + funnel counts (owner t177u). Mock API only: every request to
the real API host is answered here, so nothing reaches the production server. Also checks 44 px targets, truncation and axe.
python tests/feedback_smoke.py http://localhost:8099/ --shots /tmp/shots-feedback
"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = next((a for a in sys.argv[1:] if a.startswith('http')), 'http://localhost:8099/')
OUT = Path(sys.argv[sys.argv.index('--shots') + 1] if '--shots' in sys.argv else '/tmp/shots-feedback')
sys.path.insert(0, str(Path(__file__).parent / 'journeys'))
from lib import SMALL, TRUNC
OUT.mkdir(parents=True, exist_ok=True)
PNG = bytes.fromhex('89504e470d0a1a0a0000000d4948445200000001000000010806000000'
                    '1f15c4890000000d49444154789c6360f8cfc0000003010100c9fe92ef0000000049454e44ae426082')
sent, outside = [], []
def api(route):
    r = route.request; path = r.url.split('onrender.com', 1)[1].split('?')[0]
    if r.method == 'POST' and path in ('/api/feedback', '/api/survey', '/api/usage', '/api/errors'):
        sent.append((path, json.loads(r.post_data or '{}')))
        return route.fulfill(status=201, content_type='application/json', body=json.dumps({'ok': True, 'receipt': 'R' * 22}))
    if r.method == 'DELETE' and path == '/api/feedback':
        sent.append((path + ' DELETE', json.loads(r.post_data or '{}')))
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'deleted': {'feedback': 1, 'survey': 1}}))
    return route.fulfill(status=200, content_type='application/json', body='[]')
def guard(route):
    u = route.request.url
    if u.startswith(BASE): return route.continue_()
    if 'arsenal-pro-api.onrender.com' in u: return api(route)
    outside.append(u); return route.abort()
def checks(p, name):
    p.wait_for_timeout(350)
    small = p.evaluate(SMALL); assert not small, (name, small)
    tr = p.evaluate(TRUNC); assert not tr, (name, tr)
    p.add_script_tag(url=BASE + 'tests/axe.min.js')
    bad = p.evaluate("axe.run(document).then(r=>r.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id+': '+v.nodes.map(n=>n.target).join(' ')))")
    assert not bad, (name, bad)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    c = b.new_context(viewport={'width': 360, 'height': 780}, is_mobile=True, has_touch=True, service_workers='block')
    c.route('**/*', guard)
    c.add_init_script("if(!localStorage.getItem('ap_prefs'))localStorage.setItem('ap_prefs',JSON.stringify({onboarded:true,theme:'dark',help:false}))")
    p = c.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto(BASE + '#/results'); p.wait_for_selector('#fbBtn')   # at 360 px the button shows where the title still fits (Bag keeps Me only)
    assert p.evaluate("localStorage.getItem('ap_fb')") is None, 'nothing stored until used'
    p.click('#fbBtn'); p.wait_for_selector('#fbSheet'); assert p.is_disabled('#fbSend'); checks(p, 'feedback sheet')
    p.screenshot(path=str(OUT / 'feedback-sheet.png'))
    p.click('#fbType [data-v=bug]'); p.fill('#fbText', 'Lane froze, write me at a@b.co')
    p.set_input_files('#fbFile', files=[{'name': 's.png', 'mimeType': 'image/png', 'buffer': PNG}]); p.wait_for_selector('#fbShotImg')
    p.click('#fbSend'); p.wait_for_selector('.toast')
    path, body = sent[-1]
    assert path == '/api/feedback' and body['type'] == 'bug' and body['route'] == '/results' and body['build'] == 'v83' and body['device'] == 'phone', body
    assert 'a@b.co' not in body['text'] and body['screenshot'].startswith('data:image/jpeg;base64,'), body['text']
    assert set(body) <= {'type', 'text', 'screenshot', 'build', 'route', 'device'}, body.keys()
    # offline: queued, then sent when back online
    p.wait_for_timeout(300); c.set_offline(True)
    p.click('#fbBtn'); p.wait_for_selector('#fbSheet'); p.click('#fbType [data-v=idea]'); p.click('#fbSend'); p.wait_for_timeout(400)
    assert p.evaluate("JSON.parse(localStorage.ap_fb).queue.length") == 1
    n0 = len(sent); c.set_offline(False); p.evaluate("dispatchEvent(new Event('online'))"); p.wait_for_timeout(2600)
    assert len(sent) == n0 + 1 and sent[-1][1]['type'] == 'idea', sent[-1]
    # survey: never on the game page; once on the next screen after 3 finished games; dismiss in one tap
    p.goto(BASE + '#/bowl'); p.wait_for_timeout(600)
    assert not p.query_selector('#fbBtn'), 'no feedback button on the game page'
    p.evaluate("import('./js/feedback.js').then(m => m.gamesFinished(3))"); p.wait_for_timeout(1200)
    assert not p.query_selector('#svSheet'), 'no survey during scoring'
    p.goto(BASE + '#/learn'); p.wait_for_selector('#svSheet'); checks(p, 'survey sheet'); p.screenshot(path=str(OUT / 'survey-sheet.png'))
    p.click('#svSkip'); p.wait_for_timeout(400); assert not p.query_selector('#svSheet')
    p.goto(BASE + '#/bag'); p.wait_for_timeout(900); assert not p.query_selector('#svSheet'), 'dismissed = not asked again tonight'
    assert not any(s[0] == '/api/survey' for s in sent)
    # Me: feedback card + Privacy, both opt-ins OFF; nothing sent for usage/errors while off
    p.evaluate("setTimeout(() => { throw new Error('off: not reported') })"); p.wait_for_timeout(800)
    p.goto(BASE + '#/me'); p.wait_for_selector('#mePrivacy')
    assert p.evaluate("[...document.querySelectorAll('#usageFld [aria-checked=true],#crashFld [aria-checked=true]')].map(e=>e.dataset.v).join()") == 'off,off'
    p.eval_on_selector('#mePrivacy', 'e => e.scrollIntoView({block:"center"})'); checks(p, 'me privacy'); p.screenshot(path=str(OUT / 'me-privacy.png'))
    assert not any(s[0] in ('/api/usage', '/api/errors') for s in sent), 'opt-ins are off'
    p.click('#crashFld [data-v=on]')
    p.evaluate("setTimeout(() => { throw new Error('boom near \"Joe\" https://x.example/?t=1') })"); p.wait_for_timeout(3600)
    er = [s[1] for s in sent if s[0] == '/api/errors']
    assert len(er) == 1 and 'Joe' not in er[0]['message'] and 'x.example' not in er[0]['message'], er
    p.click('#fbDelete'); p.wait_for_timeout(600)
    d = [s[1] for s in sent if s[0] == '/api/feedback DELETE']; assert d and d[0]['receipts'], d
    assert all('boom' in e or 'off: not reported' in e for e in errs), errs
    # v83 (owner t177u): the one-time opt-in offer. After a 4 or 5 on the survey: a small sheet; both switches stay OFF until tapped.
    def fresh():
        cx = b.new_context(viewport={'width': 360, 'height': 780}, is_mobile=True, has_touch=True, service_workers='block')
        cx.route('**/*', guard)
        cx.add_init_script("if(!localStorage.getItem('ap_prefs'))localStorage.setItem('ap_prefs',JSON.stringify({onboarded:true,theme:'dark',help:false}))")
        pg = cx.new_page(); e2 = []; pg.on('pageerror', lambda e: e2.append(str(e))); return cx, pg, e2
    c2, q, e2 = fresh()
    q.goto(BASE + '#/learn'); q.wait_for_timeout(500)
    q.evaluate("import('./js/feedback.js').then(m => m.gamesFinished(3))"); q.wait_for_selector('#svSheet')
    q.click('#svRate [data-v="5"]'); q.click('#svSend'); q.wait_for_selector('#optSheet', timeout=6000)
    st = q.evaluate("JSON.parse(localStorage.ap_fb)"); assert st['usage'] is False and st['crash'] is False and st['optAsked'] > 0, st
    checks(q, 'opt-in sheet'); q.screenshot(path=str(OUT / 'optin-sheet.png'))
    q.click('#optBoth'); q.wait_for_timeout(300)
    st = q.evaluate("JSON.parse(localStorage.ap_fb)"); assert st['usage'] is True and st['crash'] is True, st
    assert q.evaluate("import('./js/feedback.js').then(m => m.offerOptIn('bag'))") is False, 'asked once, never again'
    # the funnel: counted only after the opt-in; a v82-style answer (no keys list) leaves the new keys waiting on the phone
    q.evaluate("import('./js/cc/ux.js').then(U => { U.once('first.ball'); U.once('first.ball'); U.count('ball.added'); U.count('bag.built'); })")
    q.evaluate("(() => { const s = JSON.parse(localStorage.ap_fb); s.usageAt = 0; localStorage.ap_fb = JSON.stringify(s); })()")
    q.reload(); q.wait_for_timeout(300); q.evaluate("import('./js/feedback.js').then(m => m.flush())"); q.wait_for_timeout(800)
    us = [s[1] for s in sent if s[0] == '/api/usage']
    assert us and us[-1]['counts'].get('usage.on') == 1 and us[-1]['counts'].get('first.ball') == 1 and us[-1]['counts'].get('bag.built') == 1, us[-1:]
    sentk = q.evaluate("JSON.parse(localStorage.ap_fb).sent")
    assert sentk.get('bag.built') == 1 and not sentk.get('first.ball'), sentk
    c2.close()
    # a 3 is not a good moment: no offer. The first packed bag offers a quiet toast instead; No thanks keeps both OFF.
    c3, q, e3 = fresh()
    q.goto(BASE + '#/learn'); q.wait_for_timeout(500)
    q.evaluate("import('./js/feedback.js').then(m => m.gamesFinished(3))"); q.wait_for_selector('#svSheet')
    q.click('#svRate [data-v="3"]'); q.click('#svSend'); q.wait_for_timeout(3400); assert not q.query_selector('#optSheet')
    q.goto(BASE + '#/bowl'); q.wait_for_timeout(400)
    assert q.evaluate("import('./js/feedback.js').then(m => m.offerOptIn('bag'))") is False, 'never during scoring'
    q.goto(BASE + '#/learn'); q.wait_for_timeout(400)
    assert q.evaluate("import('./js/feedback.js').then(m => m.offerOptIn('bag'))") is True
    q.wait_for_selector('.toast .toast-act'); q.click('.toast .toast-act'); q.wait_for_selector('#optSheet'); q.click('#optNo'); q.wait_for_timeout(300)
    st = q.evaluate("JSON.parse(localStorage.ap_fb)"); assert st['usage'] is False and st['crash'] is False, st
    # Me: Share the app + Help improve it (shown while a switch is off)
    q.goto(BASE + '#/me'); q.wait_for_selector('#meShareApp'); assert q.query_selector('#meHelpMore')
    q.eval_on_selector('#meFeedback', 'e => e.scrollIntoView({block:"center"})'); checks(q, 'me feedback card'); q.screenshot(path=str(OUT / 'me-feedback-card.png'))
    assert not e2 and not e3, (e2, e3)
    c3.close()
    assert not outside, outside
    b.close()
print('feedback smoke: PASS (%d mock API calls, 0 outside requests)' % len(sent))
