"""Journey runner: steps, tap/time accounting, flow-quality probes, API mock. See tests/journeys/README.md.
Times are Keystroke-Level-Model estimates (Card, Moran & Newell; same constants as tests/ux/harness.py), not real users:
the first tap of a step costs M 1.35 s + P 1.1 s + 0.2 s, later taps P + 0.2 s, a scroll 1.0 s, a typed char 0.28 s,
a precise drag 1.5 s extra. Measured wall-clock is reported next to it."""
import json, os, re, time, traceback, secrets, datetime as _dt
from urllib.parse import urlparse, parse_qs

API = '**/arsenal-pro-api.onrender.com/**'
WIPE = ("() => { localStorage.clear(); sessionStorage.clear(); return new Promise(r => { const q = indexedDB.deleteDatabase('arsenal-pro');"
        " q.onsuccess = q.onerror = () => r(true); setTimeout(() => r(false), 4000); }); }")
KLM_M, KLM_P, KLM_K, KLM_SCROLL, KLM_CHAR, KLM_DRAG = 1.35, 1.1, 0.2, 1.0, 0.28, 1.5

# --- probes run on every screen a journey visits (once per screen per journey) ---
SMALL = """() => [...document.querySelectorAll('button, a[href], input:not([type=file]):not([type=hidden]), select, label.btn, [role=slider], [role=radio], summary')]
 .filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
   const cd = e.closest('details:not([open])'); if (cd && !(e.closest('summary') && e.closest('summary').parentElement === cd)) return false;
   return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !e.closest('.sr-only,[hidden],[aria-hidden=true]') && e.type !== 'range'
     && !(e.tagName === 'A' && getComputedStyle(e.parentElement).display.includes('inline') && e.closest('p,li'))   // inline text links are exempt (WCAG 2.5.8)
     && (r.width < 43.5 || r.height < 43.5); })
 .map(e => ((e.id && '#' + e.id) || (e.className && typeof e.className === 'string' && '.' + e.className.trim().split(/\\s+/)[0]) || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height)
   + ' "' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24) + '"')"""
TRUNC = """() => { const W = document.documentElement.clientWidth, out = [];
 const inScroller = e => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
 if (document.documentElement.scrollWidth > W + 1) out.push('page scrolls sideways: ' + document.documentElement.scrollWidth + 'px > ' + W + 'px');
 for (const e of document.querySelectorAll('main *, .screen *')) {
   if (!e.firstChild || e.closest('[hidden],details:not([open]) > :not(summary),.sr-only,canvas,svg,table,pre,code,.scroll-x,[data-scroll]')) continue;
   const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
   const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own) continue;
   const r = e.getBoundingClientRect(); if (!r.width) continue;
   const clipX = e.scrollWidth > e.clientWidth + 1 && (cs.overflowX !== 'visible' || cs.textOverflow === 'ellipsis');
   const clipY = cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && e.scrollHeight > e.clientHeight + 1;
   const off = r.right > W + 1 && !inScroller(e);   // items in a sideways carousel are meant to sit past the edge
   if (clipX || clipY || off) out.push(((e.id && '#' + e.id) || e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/)[0] : '')) + ' "' + e.textContent.trim().slice(0, 40) + '"' + (off && !clipX ? ' (off-screen right)' : ' (clipped)'));
   if (out.length > 12) break; }
 return out; }"""
SCREEN = """() => { const vis = e => { if (!e) return false; const cd = e.closest('details:not([open])'); if (cd && !(e.closest('summary') && e.closest('summary').parentElement === cd)) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
 const H = innerHeight, inFold = e => { const r = e.getBoundingClientRect(); return r.top < H && r.bottom > 0; };
 const tabs = [...document.querySelectorAll('nav a[href^="#/"], .tabbar a, [role=tablist] a')].filter(vis);
 const back = [...document.querySelectorAll('a[href^="#/"], button')].filter(e => vis(e) && /^(back|‹|←|<)|\\bback\\b/i.test((e.getAttribute('aria-label') || e.textContent || '').trim()));
 const scr = document.querySelector('.screen') || document.body;
 const acts = [...scr.querySelectorAll('button, a[href], select, input')].filter(e => vis(e) && inFold(e) && !e.closest('nav,.tabbar'));
 const text = [...scr.querySelectorAll('*')].filter(e => vis(e) && inFold(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
 const foldText = text.map(e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ')).join(' ');
 const nums = (foldText.match(/\\d+(?:[.,]\\d+)?/g) || []).length;
 const words = (foldText.match(/[A-Za-z]{2,}/g) || []).length;
 const h1 = document.querySelector('.screen h1, h1'); const fontMin = Math.min(...text.map(e => parseFloat(getComputedStyle(e).fontSize)).filter(x => x > 0), 99);
 const imperative = /\\b(stand|aim|throw|use|move|pick|score|start|add|import|try|tap|play|log|set|bowl|save|open|find|pack|keep)\\b/i.test(foldText);
 const provs = scr.querySelectorAll('.prov, [data-prov], .src, .chip').length;
 const helpDots = [...document.querySelectorAll('.help-dot')].filter(vis).length;
 return { hash: location.hash, title: document.title, h1: h1 ? h1.textContent.trim().slice(0, 60) : '', tabs: tabs.length, back: back.length,
   actionsAboveFold: acts.length, numbersAboveFold: nums, wordsAboveFold: words, fontMin, imperative, provs, helpDots,
   scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight }; }"""


class MockAPI:
    """In-memory stand-in for arsenal-pro-api (same contract as tests/e2e.py MockEvents). Every request to the production
    host is answered here, so no journey can write to the live database. online=False behaves like airplane mode."""
    def __init__(self):
        self.rows, self.seq, self.online, self.posts, self.calls = [], 0, True, 0, []
        self.acct = MockAccounts()

    async def handle(self, route):
        req = route.request
        self.calls.append(req.method + ' ' + urlparse(req.url).path)
        if not self.online:
            return await route.abort('internetdisconnected')
        u = urlparse(req.url); dev = req.headers.get('x-device-id')
        hdr = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Device-Id, Authorization',
               'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS', 'Access-Control-Expose-Headers': 'Retry-After'}
        if req.method == 'OPTIONS':
            return await route.fulfill(status=204, headers=hdr)
        js = lambda st, body: route.fulfill(status=st, headers=hdr, content_type='application/json', body=json.dumps(body))
        if u.path.startswith('/api/auth') or u.path.startswith('/api/account'):
            if u.path in ('/api/account/events',):
                uid = self.acct.uid(req)
                if not uid: return await js(401, {'error': 'Not signed in.'})
                dev, path = 'acct:' + uid, '/api/events'
            else:
                st, body = self.acct.handle(req.method, u.path, json.loads(req.post_data or '{}') if req.post_data else {}, req)
                if st == 'POSTED': self.posts += 1
                return await js(body[0], body[1]) if st == 'POSTED' else await js(st, body)
        else:
            path = u.path
        mine = [r for r in self.rows if r[0] == dev]
        if path == '/api/events' and req.method == 'POST':
            self.posts += 1
            evs = json.loads(req.post_data or '{"events":[]}')['events']; known = {r[2]['id'] for r in mine}; acc = 0
            for e in evs:
                if e['id'] not in known:
                    self.seq += 1; self.rows.append((dev, self.seq, e)); known.add(e['id']); acc += 1
            return await js(200, {'accepted': acc, 'duplicates': len(evs) - acc, 'cursor': str(self.seq), 'stored': len(known), 'quota': 5000})
        if path == '/api/events':
            q = parse_qs(u.query); after = int(q.get('after', ['0'])[0]); lim = int(q.get('limit', ['500'])[0])
            page = [r for r in mine if r[1] > after][:lim + 1]; more = len(page) > lim; page = page[:lim]
            return await js(200, {'events': [dict(r[2], serverSeq=str(r[1])) for r in page], 'cursor': str(page[-1][1] if page else after), 'more': more})
        if req.method == 'GET':
            return await js(200, [])
        self.posts += 1
        return await js(201, {'id': 1})


class MockAccounts:
    """In-memory accounts + My Team (same contract as arsenal-pro-api lib/teams.js, server-side checks included: membership
    404, secretary-only 403, invite expiry/revoke 410). Journeys sign up here, never on the live API."""
    NIGHTS = ('', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')
    def __init__(self):
        self.users, self.tokens, self.teams, self.members, self.invites, self.shares, self.notes, self.reports, self.n = {}, {}, {}, [], [], {}, [], [], 0
    def uid(self, req):
        a = req.headers.get('authorization') or ''
        return self.tokens.get(a[7:]) if a.startswith('Bearer ') else None
    def _id(self): return secrets.token_hex(8)
    def _now(self): return _dt.datetime.now(_dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    def _sess(self, uid):
        t = secrets.token_urlsafe(24); self.tokens[t] = uid
        u = next(v for v in self.users.values() if v['id'] == uid)
        return {'token': t, 'expiresAt': '2027-01-01T00:00:00.000Z', 'user': {'id': uid, 'email': u['email'], 'createdAt': u['at']}}
    def _team(self, t): return {'id': t['id'], 'name': t['name'], 'night': t['night'], 'time': t['time'], 'createdAt': t['at']}
    def handle(self, m, path, b, req):
        W = lambda st, j: ('POSTED', (st, j)) if m != 'GET' else (st, j)
        if path == '/api/auth/signup' and m == 'POST':
            e = (b.get('email') or '').strip().lower()
            if '@' not in e: return W(400, {'error': 'a valid email is required'})
            if len(b.get('password') or '') < 10: return W(400, {'error': 'use at least 10 characters'})
            if e in self.users: return W(409, {'error': 'an account with this email already exists; sign in instead'})
            self.users[e] = {'id': self._id(), 'email': e, 'pw': b['password'], 'at': self._now()}
            return W(201, dict(self._sess(self.users[e]['id']), recoveryKey='QA-RECOVERY-KEY-NOT-REAL'))
        if path == '/api/auth/login' and m == 'POST':
            u = self.users.get((b.get('email') or '').strip().lower())
            if not u or u['pw'] != b.get('password'): return W(401, {'error': 'email or password is wrong'})
            return W(200, self._sess(u['id']))
        uid = self.uid(req)
        if not uid: return W(401, {'error': 'Not signed in.'})
        if path == '/api/auth/logout': return W(200, {'ok': True})
        if path == '/api/account' and m == 'GET':
            u = next(v for v in self.users.values() if v['id'] == uid); return 200, {'user': {'id': uid, 'email': u['email'], 'createdAt': u['at']}, 'stored': 0, 'quota': 20000}
        P = '/api/account/teams'
        if not path.startswith(P): return W(404, {'error': 'not found'})
        rest = [x for x in path[len(P):].split('/') if x]
        me = lambda tid: next((x for x in self.members if x['tid'] == tid and x['uid'] == uid), None)
        if not rest and m == 'GET':
            out = []
            for x in [x for x in self.members if x['uid'] == uid]:
                t = self.teams[x['tid']]; out.append(dict(self._team(t), role=x['role'], memberId=x['id'], displayName=x['dn'], members=sum(1 for y in self.members if y['tid'] == t['id'])))
            return 200, {'teams': out}
        if not rest and m == 'POST':
            name, dn = (b.get('name') or '').strip()[:40], (b.get('displayName') or '').strip()[:30]
            if not name or not dn: return W(400, {'error': 'team name and your display name are required'})
            if b.get('night', '') not in self.NIGHTS: return W(400, {'error': 'league night must be Mon-Sun and time HH:MM'})
            t = {'id': self._id(), 'name': name, 'night': b.get('night') or '', 'time': b.get('time') or '', 'at': self._now()}; self.teams[t['id']] = t
            mid = self._id(); self.members.append({'id': mid, 'tid': t['id'], 'uid': uid, 'role': 'secretary', 'dn': dn, 'at': self._now()})
            return W(201, {'team': self._team(t), 'memberId': mid, 'role': 'secretary'})
        if rest == ['join'] and m == 'POST':
            code = re.sub(r'[^A-Z0-9]', '', (b.get('code') or '').upper()); dn = (b.get('displayName') or '').strip()[:30]
            if len(code) != 8: return W(400, {'error': 'invite code is 8 letters and numbers (XXXX-XXXX)'})
            if not dn: return W(400, {'error': 'your display name is required (1-30 characters)'})
            inv = next((i for i in self.invites if i['code'] == code), None)
            if not inv or inv['revoked'] or inv['uses'] >= inv['max']: return W(410, {'error': 'this invite has expired or was turned off; ask the secretary for a new one'})
            t = self.teams[inv['tid']]; x = me(t['id'])
            if x: return W(200, {'team': self._team(t), 'memberId': x['id'], 'role': x['role'], 'already': True})
            mid = self._id(); self.members.append({'id': mid, 'tid': t['id'], 'uid': uid, 'role': 'member', 'dn': dn, 'at': self._now()}); inv['uses'] += 1
            return W(201, {'team': self._team(t), 'memberId': mid, 'role': 'member'})
        tid = rest[0]; x = me(tid)
        if not x or tid not in self.teams: return W(404, {'error': 'team not found'})
        t, sec, sub = self.teams[tid], x['role'] == 'secretary', rest[1:]
        deny = lambda: W(403, {'error': 'only the league secretary can do this'})
        if not sub and m == 'GET':
            ms = [y for y in self.members if y['tid'] == tid]
            return 200, {'team': self._team(t), 'me': {'memberId': x['id'], 'role': x['role'], 'displayName': x['dn']},
                         'members': [{'memberId': y['id'], 'displayName': y['dn'], 'role': y['role'], 'joinedAt': y['at'],
                                      'shares': {k: v for (mid, k), v in self.shares.items() if mid == y['id']}} for y in ms],
                         'notes': [{'id': n['id'], 'memberId': n['mid'], 'lanes': n['lanes'], 'text': n['text'], 'createdAt': n['at']} for n in reversed(self.notes) if n['tid'] == tid],
                         'reports': [dict(r) for r in self.reports if r['tid'] == tid] if sec else None}
        if not sub and m == 'DELETE':
            if not sec: return deny()
            del self.teams[tid]; self.members = [y for y in self.members if y['tid'] != tid]; return W(200, {'deleted': 1})
        if sub == ['settings'] and m == 'POST':
            if not sec: return deny()
            for k in ('name', 'night', 'time'):
                if k in b: t[k] = b[k]
            return W(200, {'team': self._team(t)})
        if sub == ['me'] and m == 'POST': x['dn'] = (b.get('displayName') or x['dn'])[:30]; return W(200, {'displayName': x['dn']})
        if sub == ['invites'] and m == 'POST':
            if not sec: return deny()
            code = ''.join(secrets.choice('ABCDEFGHJKMNPQRSTUVWXYZ23456789') for _ in range(8)); iid = self._id()
            self.invites.append({'id': iid, 'tid': tid, 'code': code, 'uses': 0, 'max': int(b.get('maxUses') or 30), 'revoked': False, 'exp': '2026-12-31T00:00:00.000Z'})
            return W(201, {'id': iid, 'code': code[:4] + '-' + code[4:], 'expiresAt': '2026-12-31T00:00:00.000Z', 'maxUses': int(b.get('maxUses') or 30)})
        if sub == ['invites'] and m == 'GET':
            if not sec: return 403, {'error': 'only the league secretary can do this'}
            return 200, {'invites': [{'id': i['id'], 'createdAt': self._now(), 'expiresAt': i['exp'], 'uses': i['uses'], 'maxUses': i['max'], 'revoked': i['revoked']} for i in self.invites if i['tid'] == tid and not i['revoked']]}
        if len(sub) == 2 and sub[0] == 'invites' and m == 'DELETE':
            if not sec: return deny()
            n = 0
            for i in self.invites:
                if i['id'] == sub[1] and i['tid'] == tid: i['revoked'] = True; n += 1
            return W(200, {'revoked': n})
        if len(sub) == 2 and sub[0] == 'shares':
            if m == 'POST': self.shares[(x['id'], sub[1])] = {'data': b.get('data'), 'updatedAt': self._now()}; return W(200, {'kind': sub[1], 'data': b.get('data'), 'updatedAt': self._now()})
            if m == 'DELETE': return W(200, {'deleted': 1 if self.shares.pop((x['id'], sub[1]), None) else 0})
        if sub == ['notes'] and m == 'POST':
            self.n += 1; n = {'id': str(self.n), 'tid': tid, 'mid': x['id'], 'lanes': b.get('lanes') or '', 'text': (b.get('text') or '')[:280], 'at': self._now()}; self.notes.append(n)
            return W(201, {'id': n['id'], 'memberId': x['id'], 'lanes': n['lanes'], 'text': n['text'], 'createdAt': n['at']})
        if len(sub) == 2 and sub[0] == 'notes' and m == 'DELETE':
            n = next((n for n in self.notes if n['id'] == sub[1] and n['tid'] == tid), None)
            if not n: return W(404, {'error': 'note not found'})
            if n['mid'] != x['id'] and not sec: return W(403, {'error': 'only the author or the secretary can delete this note'})
            self.notes.remove(n); return W(200, {'deleted': 1})
        if sub == ['reports'] and m == 'POST':
            self.n += 1; self.reports.append({'id': str(self.n), 'tid': tid, 'reporter': x['id'], 'aboutMember': b.get('memberId'), 'noteId': b.get('noteId'), 'reason': (b.get('reason') or '')[:200], 'createdAt': self._now()})
            return W(201, {'id': str(self.n)})
        if len(sub) == 2 and sub[0] == 'reports' and m == 'DELETE':
            if not sec: return deny()
            before = len(self.reports); self.reports = [r for r in self.reports if not (r['id'] == sub[1] and r['tid'] == tid)]; return W(200, {'dismissed': before - len(self.reports)})
        if len(sub) == 2 and sub[0] == 'members' and m == 'DELETE':
            target = x if sub[1] == 'me' else next((y for y in self.members if y['id'] == sub[1] and y['tid'] == tid), None)
            if sub[1] != 'me' and not sec: return W(403, {'error': 'only the league secretary can remove a member'})
            if not target: return W(404, {'error': 'member not on this team'})
            self.members.remove(target); [self.shares.pop(k) for k in list(self.shares) if k[0] == target['id']]
            return W(200, {'left': sub[1] == 'me', 'removed': sub[1] != 'me'})
        return W(404, {'error': 'not found'})


class Abort(Exception):
    pass


class Step:
    def __init__(self, j, name, task, target_taps, target_s, critical, carry):
        self.j, self.name, self.task, self.target_taps, self.target_s, self.critical, self.carry = j, name, task, target_taps, target_s, critical, carry
        self.checks, self.taps, self.scrolls, self.chars, self.drags, self.error, self.status = [], 0, 0, 0, 0, None, 'pass'
        self.console, self.failed_req, self.shot, self.known = [], [], None, None

    def check(self, ok, label):
        self.checks.append([bool(ok), label])
        return bool(ok)

    def klm(self):
        if not (self.taps or self.scrolls or self.chars or self.drags):
            return 0.0
        return round((KLM_M if self.taps else 0) + self.taps * (KLM_P + KLM_K) + self.scrolls * KLM_SCROLL + self.chars * KLM_CHAR + self.drags * KLM_DRAG, 1)

    async def __aenter__(self):
        if self.j.aborted:
            self.status = 'skip'; self.j.steps.append(self); self.j.cur = self; self.t0 = time.time()
            print(f'  [SKIP ] {self.j.id} · {self.name}')
            return self
        self.t0 = time.time(); self.j.cur = self; self.c0, self.r0 = len(self.j.console), len(self.j.failed)
        return self

    async def __aexit__(self, et, ev, tb):
        j = self.j; self.wall = round(time.time() - getattr(self, 't0', time.time()), 2)
        if self.status == 'skip':
            self.j.cur = None
            return True
        if et is not None:
            self.error = (f'{et.__name__}: {ev}'.split('\n')[0])[:400]
            self.trace = ''.join(traceback.format_exception(et, ev, tb))[-1500:]
        self.console = j.console[self.c0:]; self.failed_req = j.failed[self.r0:]
        bad = [c for c in self.checks if not c[0]]
        if self.target_taps is not None:
            self.check(self.taps <= self.target_taps, f'taps {self.taps} <= target {self.target_taps}')
        if self.target_s is not None:
            self.check(self.klm() <= self.target_s, f'est. time {self.klm()} s <= target {self.target_s} s')
        bad = [c for c in self.checks if not c[0]]
        self.status = 'fail' if (self.error or bad) else 'pass'
        try:
            self.url = j.page.url.split('#', 1)[-1] if '#' in j.page.url else '/'
            self.shot = await j.screenshot(f'{len(j.steps) + 1:02d}')
        except Exception:
            self.url = '?'
        known = j.run.known.get(f'{j.id}/{self.name}')
        if self.status == 'fail' and known:
            self.status, self.known = 'known', known
        elif self.status == 'pass' and known:
            self.known = known; self.fixed = True
        j.steps.append(self); j.cur = None
        print(f'  [{self.status.upper():5}] {j.id} · {self.name}' + (f'  — {self.error}' if self.error else '') + ''.join(f'\n          ✗ {c[1]}' for c in self.checks if not c[0]))
        if self.status in ('fail', 'known') and self.critical:
            j.aborted = f'stopped after "{self.name}"'
        return True

    def asdict(self):
        return dict(name=self.name, task=self.task, status=self.status, checks=self.checks, error=self.error, taps=self.taps, scrolls=self.scrolls,
                    chars=self.chars, drags=self.drags, klm_s=self.klm(), wall_s=getattr(self, 'wall', 0), target_taps=self.target_taps,
                    target_s=self.target_s, url=getattr(self, 'url', ''), shot=self.shot, console=self.console[:6], failed=self.failed_req[:6],
                    known=self.known, fixed=getattr(self, 'fixed', False), carry=self.carry)


class Journey:
    def __init__(self, run, jid, title, persona, page, ctx, api):
        self.run, self.id, self.title, self.persona, self.page, self.ctx, self.api = run, jid, title, persona, page, ctx, api
        self.steps, self.cur, self.aborted, self.console, self.failed, self.screens, self.state = [], None, None, [], [], {}, {}
        self.audit_screens = set()
        page.on('console', lambda m: m.type == 'error' and self.console.append(m.text[:300]))
        page.on('pageerror', lambda e: self.console.append('pageerror: ' + str(e)[:300]))
        page.on('requestfailed', lambda r: self._reqfail(r))
        page.on('response', lambda r: r.status >= 400 and self.run.base_host in r.url and self.failed.append(f'{r.status} {r.url[-120:]}'))

    def _reqfail(self, r):
        f = r.failure or ''
        if 'arsenal-pro-api' in r.url and (not self.api.online or 'internetdisconnected' in f):
            return   # deliberate airplane mode
        if 'ERR_ABORTED' in f and r.resource_type in ('media', 'image'):
            return
        self.failed.append(f'{r.method} {r.url[-120:]} {f}')

    def step(self, name, task=None, target_taps=None, target_s=None, critical=False, carry=None):
        return Step(self, name, task, target_taps, target_s, critical, carry)

    def _g(self):
        if self.cur is not None and self.cur.status == 'skip':
            raise Abort(self.aborted)

    # --- user actions (counted) ---
    async def _ensure_visible(self, loc):
        b = await loc.bounding_box()
        vh = self.page.viewport_size['height']
        if not b or b['y'] < 0 or b['y'] + b['height'] > vh:
            if self.cur: self.cur.scrolls += 1
            await loc.scroll_into_view_if_needed()

    async def tap(self, sel, throw=False, timeout=6000):
        self._g()
        if throw:
            await self.page.wait_for_timeout(420)   # Tonight ignores a repeat throw tap within 400 ms
        loc = self.page.locator(sel).first
        await loc.wait_for(state='visible', timeout=timeout)
        await self._ensure_visible(loc)
        await loc.click(timeout=timeout)
        if self.cur: self.cur.taps += 1
        await self.page.wait_for_timeout(80)

    async def type(self, sel, text):
        await self.tap(sel); await self.page.locator(sel).first.fill(text)
        if self.cur: self.cur.chars += len(text)

    async def select(self, sel, value=None, label=None):
        self._g()
        loc = self.page.locator(sel).first; await self._ensure_visible(loc)
        await (loc.select_option(value=value) if value is not None else loc.select_option(label=label))
        if self.cur: self.cur.taps += 2

    async def nav(self, route):
        self._g()
        """Navigate the way a bowler would: through the tab bar when the route has a tab, otherwise by URL (counted as 1 tap)."""
        tab = self.page.locator(f'nav a[href="#{route}"]').first
        if await tab.count() and await tab.is_visible():
            await self.tap(f'nav a[href="#{route}"]')
        elif route == '/me' and await self.page.locator('#meBtn').count():   # IA P2: Me is the top-right button
            await self.tap('#meBtn')
        else:
            await self.page.evaluate("r => location.hash = r", route)
            if self.cur: self.cur.taps += 1
        await self.settle()

    async def goto(self, route, query=''):
        self._g()
        await self.page.goto(self.run.base + query + '#' + route); await self.settle()

    async def settle(self, ms=250):
        try:
            await self.page.wait_for_load_state('domcontentloaded')
        except Exception:
            pass
        await self.page.wait_for_timeout(ms)

    async def wipe(self, prefs=None):
        """Clear this origin's storage from a same-origin page that has no app (and so no open IndexedDB connection)."""
        await self.page.goto(self.run.base + 'tests/axe.min.js')
        ok = await self.page.evaluate(WIPE)
        if prefs is not None:
            await self.page.evaluate('p => localStorage.setItem("ap_prefs", JSON.stringify(p))', prefs)
        return ok

    async def text(self, sel, timeout=4000):
        self._g()
        loc = self.page.locator(sel).first
        await loc.wait_for(state='attached', timeout=timeout)
        t = await loc.inner_text() if await loc.is_visible() else await loc.text_content()
        return ' '.join((t or '').split())

    async def visible(self, sel):
        self._g()
        loc = self.page.locator(sel)
        return await loc.count() > 0 and await loc.first.is_visible()

    async def wait(self, sel, timeout=6000, state='visible'):
        self._g()
        await self.page.locator(sel).first.wait_for(state=state, timeout=timeout)

    async def ev(self, expr, arg=None):
        self._g()
        return await self.page.evaluate(expr, arg) if arg is not None else await self.page.evaluate(expr)

    async def data(self, expr):
        self._g()
        await self.page.wait_for_function("() => window.__apData", timeout=10000)
        return await self.page.evaluate(expr)

    async def screenshot(self, tag):
        d = os.path.join(self.run.out, 'shots', self.id); os.makedirs(d, exist_ok=True)
        f = os.path.join(d, f'{tag}.jpg')
        await self.page.screenshot(path=f, type='jpeg', quality=55, timeout=8000)
        return os.path.relpath(f, self.run.out)

    # --- flow-quality audit of the current screen ---
    async def audit(self, screen, scoring=False, axe=True):
        key = screen
        if key in self.audit_screens:
            return
        self.audit_screens.add(key)
        p = self.page; r = {'screen': screen, 'journey': self.id, 'persona': self.persona}
        try:
            await p.evaluate("Promise.race([Promise.all(document.getAnimations().filter(a => a.effect && a.effect.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => 0))), new Promise(r => setTimeout(r, 1500))])")
            r.update(await p.evaluate(SCREEN))
            r['small'] = await p.evaluate(SMALL)
            r['trunc'] = await p.evaluate(TRUNC)
            r['hscroll'] = await p.evaluate("() => { const w = document.scrollingElement.scrollWidth; return w > innerWidth + 1 ? `page is ${w}px wide in a ${innerWidth}px screen` : ''; }")   # IA_PLAN §7: no horizontal scroll
            if axe:
                if not await p.evaluate("() => !!window.axe"):
                    await p.add_script_tag(url=self.run.base + 'tests/axe.min.js')
                r['axe'] = await p.evaluate("axe.run(document,{resultTypes:['violations']}).then(r=>r.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id+' ×'+v.nodes.length+' '+(v.nodes[0]&&v.nodes[0].target.join(' ')||'')))")
            r['scoring'] = scoring
            r['deadEnd'] = r['tabs'] == 0 and r['back'] == 0 and screen != 'welcome'   # Welcome is the one-way entry: its only exit is forward (Get started)
            # usability/applicability heuristic (0-10, automated proxy; see docs/QA_PLAN.md §4.12)
            u = [bool(r['h1']), r['actionsAboveFold'] > 0, r['fontMin'] >= 12, not r['small'], not (r['trunc'] or r['hscroll'])]
            a = [r['imperative'], r['numbersAboveFold'] <= 12, r['numbersAboveFold'] == 0 or r['provs'] > 0, not r['deadEnd'], (not scoring) or r['numbersAboveFold'] <= 24]
            r['usability'], r['applicability'] = sum(u), sum(a); r['score'] = sum(u) + sum(a)
            r['why'] = [n for n, ok in zip(['heading', 'action above fold', 'text >= 12px', 'targets >= 44px', 'no truncation'], u) if not ok] + \
                       [n for n, ok in zip(['a next step in words', '<= 12 numbers above fold', 'numbers carry a source', 'not a dead end', 'scoring view stays lean'], a) if not ok]
        except Exception as e:
            r['error'] = str(e)[:300]
        self.run.screens.append(r)
        return r

    def asdict(self):
        st = [s.asdict() for s in self.steps]
        return dict(id=self.id, title=self.title, persona=self.persona, steps=st, aborted=self.aborted, state=self.state,
                    passed=sum(s['status'] == 'pass' for s in st), failed=sum(s['status'] == 'fail' for s in st),
                    known=sum(s['status'] == 'known' for s in st), skipped=sum(s['status'] == 'skip' for s in st),
                    taps=sum(s['taps'] for s in st), klm_s=round(sum(s['klm_s'] for s in st), 1), api_calls=len(self.api.calls),
                    video=getattr(self, 'video', None), trace=getattr(self, 'trace', None))
