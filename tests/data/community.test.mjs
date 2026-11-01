// My Team + community tactics (2026-10-31): tags, the regular badge, Season Wrapped, shared stats, the team client cache.
import test from 'node:test'; import assert from 'node:assert/strict';
import * as C from '../../js/cc/community.js';
import { createTeamClient, bagShare, normCode, joinLink, CODE_RE, CACHE_KEY, regularShare } from '../../js/data/team.js';
const mem = () => { const m = {}; return { m, getItem: k => k in m ? m[k] : null, setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; };
const DAY = 86400e3, NOW = Date.parse('2026-10-31T20:00:00');
const iso = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

test('tags: profile gives hand and style; the bowler can switch any off; fixed order, from the list only', () => {
  const p = { hand: 'left', style: 'two' };
  assert.deepEqual(C.profileTags(p), ['two-hander', 'lefty']);
  assert.deepEqual(C.profileTags({ hand: 'right', style: 'tweener' }), ['one-hander', 'righty']);
  assert.deepEqual(C.profileTags({}), []);
  let sel = {}; sel = C.toggleTag(p, sel, 'coach'); sel = C.toggleTag(p, sel, 'youth');
  assert.deepEqual(C.tagsOf(p, sel), ['two-hander', 'lefty', 'youth', 'coach'], 'TAGS order, not pick order');
  sel = C.toggleTag(p, sel, 'lefty'); assert.deepEqual(C.tagsOf(p, sel), ['two-hander', 'youth', 'coach']);
  sel = C.toggleTag(p, sel, 'lefty'); assert.ok(C.tagsOf(p, sel).includes('lefty'));
  assert.deepEqual(C.toggleTag(p, sel, 'best bowler'), sel, 'unknown tags ignored');
  assert.deepEqual(C.tagsOf(p, { on: ['hacker'] }), ['two-hander', 'lefty']);
  assert.equal(C.TAGS.length, 10);
});

test('regular badge: distinct nights at the home center in 90 days, any score; other centers and old nights do not count', () => {
  const P = { centers: { c1: { id: 'c1', name: 'Bowlero Mesa' }, c2: { id: 'c2', name: 'Other' } }, sessions: {} };
  const add = (id, daysAgo, centerId = 'c1') => { P.sessions[id] = { id, date: iso(NOW - daysAgo * DAY), centerId }; };
  add('a', 1); add('b', 8); add('b2', 8); add('c', 30, 'c2'); add('d', 120);
  let r = C.regularOf(P, 'c1', { now: NOW }); assert.equal(r.nights, 2, 'two sessions on one night count once'); assert.equal(r.regular, false);
  assert.match(C.regularText(r), /2 of 4 nights at Bowlero Mesa in the last 90 days/);
  add('e', 40); add('f', 89); r = C.regularOf(P, 'c1', { now: NOW }); assert.equal(r.nights, 4); assert.equal(r.regular, true); assert.equal(C.regularText(r), 'Regular at Bowlero Mesa');
  assert.equal(C.regularOf(P, 'nope', { now: NOW }), null); assert.equal(C.regularOf(P, null), null);
  assert.deepEqual(regularShare(r), { center: 'Bowlero Mesa', nights: 4, days: 90 });
});

test('season and Wrapped: counts only, MIN_SHOTS guard on rates, empty season says so', () => {
  assert.equal(C.seasonOf(Date.parse('2026-10-31')).label, '2026\u201327 season');
  assert.equal(C.seasonOf(Date.parse('2026-03-01')).from, '2025-08-01');
  assert.equal(C.wrappedOf({}, { now: NOW }).empty, true); assert.deepEqual(C.wrappedLines(C.wrappedOf({}, { now: NOW })), []);
  const P = { centers: { c1: { name: 'Bowlero Mesa' } }, sessions: { s1: { id: 's1', date: '2026-09-10', centerId: 'c1', lanePair: '5-6' }, s2: { id: 's2', date: '2026-07-01', centerId: 'c1' } },
    scores: [{ sessionId: 's1', score: 180, ts: 1 }, { sessionId: 's1', score: 200, ts: 2 }, { sessionId: 's2', score: 150, ts: 3 }], shots: [], aggregates: [] };
  const w = C.wrappedOf(P, { now: NOW }); assert.equal(w.nights, 1, 'July is last season'); assert.equal(w.games, 2); assert.deepEqual(w.centers, ['Bowlero Mesa']); assert.equal(w.pairs, 1);
  const L = C.wrappedLines(w), txt = JSON.stringify(L);
  assert.ok(!/180|200|average|avg|best|worst|high/i.test(txt), 'no scores or grades on Wrapped');
  assert.equal(w.strikes, null);
  const small = C.wrappedLines({ ...w, strikes: { n: 5, of: 12, enough: false } }); assert.match(JSON.stringify(small), /counts only until 30/);
  const big = C.wrappedLines({ ...w, strikes: { n: 20, of: 60, enough: true } }); assert.match(JSON.stringify(big), /20 of 60 first balls/);
  const st = C.statsShare(P, { now: NOW }); assert.deepEqual(st.items.map(i => i.value), ['1', '2']); assert.ok(st.items.every(i => i.src));
});

test('share builders mirror server caps', () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ id: 'b' + i, name: 'Ball ' + i + ' '.repeat(3), role: 'Benchmark' }));
  const s = bagShare(rows, { b0: 'Reads the mids\u0007 early' + 'x'.repeat(100) });
  assert.equal(s.balls.length, 8); assert.equal(s.balls[0].name, 'Ball 0'); assert.equal(s.balls[0].why.length, 80); assert.ok(!/\u0007/.test(s.balls[0].why)); assert.equal(s.balls[1].why, '');
  assert.equal(normCode('abcd efgh'), 'ABCD-EFGH'); assert.ok(CODE_RE.test('ABCD-EFGH')); assert.ok(!CODE_RE.test('ABCD-EFG0'), 'no zero');
  assert.match(joinLink('abcdefgh'), /#\/team\?join=ABCD-EFGH$/);
});

test('team client: per-account cache for offline, 404 drops the team, sign-out forgets', async () => {
  const storage = mem(); let user = 'u1', next = null; const calls = [];
  const account = { active: () => user ? { user: { id: user } } : null, msg: (r, f) => (r.json && r.json.error) || f,
    request: async (path, o = {}) => { calls.push([o.method || 'GET', path, o.body]); return next; } };
  const T = createTeamClient({ account, storage, now: () => 5 });
  next = { status: 200, json: { teams: [{ id: 't1', name: 'Rollers' }] } }; await T.list();
  next = { status: 200, json: { team: { id: 't1', name: 'Rollers' }, members: [] } }; await T.view('t1');
  assert.equal(T.cached().teams[0].name, 'Rollers'); assert.equal(T.cached('t1').view.team.name, 'Rollers'); assert.equal(T.cached('t1').at, 5);
  next = { status: 0, json: { error: 'You are offline.' } }; const off = await T.view('t1'); assert.equal(off.offline, true); assert.ok(T.cached('t1'), 'offline keeps the last view');
  user = 'u2'; assert.equal(T.cached('t1'), null, 'another account never sees it'); user = 'u1';
  next = { status: 404, json: { error: 'team not found' } }; await T.view('t1'); assert.equal(T.cached('t1'), null); assert.equal(T.cached().teams.length, 0);
  next = { status: 201, json: {} }; await T.join('abcd efgh', 'Sam'); assert.deepEqual(calls.at(-1), ['POST', '/api/account/teams/join', { code: 'ABCD-EFGH', displayName: 'Sam' }]);
  await T.share('t1', 'bag', { balls: [] }); assert.deepEqual(calls.at(-1).slice(0, 2), ['POST', '/api/account/teams/t1/shares/bag']);
  next = { status: 200, json: { left: true } }; await T.leave('t1'); assert.deepEqual(calls.at(-1).slice(0, 2), ['DELETE', '/api/account/teams/t1/members/me']);
  T.forget(); assert.equal(storage.getItem(CACHE_KEY), null);
});
