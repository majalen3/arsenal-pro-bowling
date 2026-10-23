// D3 sync v2 against an in-memory mock of the API contract (tests/data/mock_api.mjs). No network.
import test from 'node:test'; import assert from 'node:assert/strict';
import { createDB } from '../../js/data/db.js';
import { memoryBackend } from '../../js/data/idb.js';
import { mkEvent } from '../../js/data/events.js';
import { createSync, packBatches, BACKOFF } from '../../js/data/sync.js';
import { mockApi } from './mock_api.mjs';
const CODE = 'd-backupcode-1234';
const fakeTimer = () => { const q = []; return { q, set: (f, ms) => { q.push({ f, ms }); return q.length; }, clear: () => {} }; };
async function phone(api, name, o = {}) { const db = createDB(memoryBackend(), { deviceId: name }); await db.open(); const timer = fakeTimer(); return { db, timer, s: createSync({ db, base: 'https://api.test', deviceId: CODE, fetchFn: api.fetchFn, timer, ...o }) }; }
const ev = (type, id, data, ts, dev = 'A') => mkEvent(type, id, data, { ts, deviceId: dev });

test('packBatches: every event once, in order, each body ≤ 15 kB', () => {
  const evs = Array.from({ length: 300 }, (_, i) => ev('patternNote.created', null, { lane: String(i), oil: 'x', adjustment: 'y'.repeat(i % 7 ? 20 : 300) }, 1000 + i));
  const { batches, tooBig } = packBatches(evs);
  assert.equal(tooBig.length, 0); assert.ok(batches.length > 1);
  for (const b of batches) assert.ok(new TextEncoder().encode(JSON.stringify({ events: b })).length <= 15000);
  assert.deepEqual(batches.flat().map(e => e.id), evs.map(e => e.id));
  assert.ok(batches.flat().every(e => !('synced' in e)), 'local-only flags are not sent');
});
test('push marks synced; second run sends nothing; pull of own events adds nothing', async () => {
  const api = mockApi(); const A = await phone(api, 'A');
  await A.db.append(Array.from({ length: 120 }, (_, i) => ev('patternNote.created', null, { lane: String(i), oil: 'medium', adjustment: 'move 2 left' }, 1000 + i)));
  const r = await A.s.run(); assert.equal(r.ok, true); assert.equal(r.pushed, 120); assert.equal(r.pulled, 0);
  assert.equal(A.s.outbox().length, 0); assert.equal(api.count(CODE), 120);
  const n = api.calls.length; const r2 = await A.s.run(); assert.equal(r2.pushed, 0); assert.equal(api.calls.filter(c => c.m === 'POST').length, api.calls.slice(0, n).filter(c => c.m === 'POST').length);
  assert.ok(api.calls.filter(c => c.m === 'POST').every(c => c.size <= 15000));
});
test('two phones, same backup code: field-level last-write-wins converges to the same projection', async () => {
  const api = mockApi(); const A = await phone(api, 'A'), B = await phone(api, 'B');
  await A.db.append([ev('bowler.edited', 'me', { fields: { speed: 15, rev: 220 } }, 100, 'A'), ev('line.created', 'big-bite|House', { ballId: 'big-bite', name: 'House', release: 25, aim: 10 }, 110, 'A')]);
  await B.db.append([ev('bowler.edited', 'me', { fields: { rev: 240, pap: 5.125 } }, 200, 'B'), ev('bowler.edited', 'me', { fields: { speed: 14 } }, 50, 'B'), ev('line.edited', 'big-bite|House', { aim: 12 }, 300, 'B')]);
  await A.s.run(); await B.s.run(); await A.s.run();
  const pa = A.db.projection(), pb = B.db.projection();
  assert.equal(A.db.hash(), B.db.hash(), 'same projection on both phones');
  const v = f => (f && typeof f === 'object' && 'v' in f ? f.v : f);
  assert.equal(v(pa.bowler.speed), 15, 'A wrote speed later (100 > 50)'); assert.equal(v(pa.bowler.rev), 240, 'B wrote rev later'); assert.equal(v(pa.bowler.pap), 5.125);
  assert.equal(pa.lines['big-bite|House'].aim, 12); assert.equal(pa.lines['big-bite|House'].release, 25, 'untouched field kept');
  assert.equal(A.s.outbox().length + B.s.outbox().length, 0); assert.equal(pb.lines['big-bite|House'].aim, 12);
});
test('offline → backoff 15/45/120/300 s; Retry-After honoured; nothing lost; recovers', async () => {
  const api = mockApi(); const A = await phone(api, 'A'); await A.db.append([ev('patternNote.created', null, { lane: '1', oil: 'o', adjustment: 'a' }, 1)]);
  api.faults.push('offline', 'offline', { status: 429, headers: { 'Retry-After': '200' }, json: { error: 'too many requests' } }, 'offline', 'offline');
  assert.equal((await A.s.run()).ok, false); const lat = [];
  while (A.timer.q.length) { const t = A.timer.q.shift(); lat.push(t.ms); t.f(); await A.s.run(); }
  assert.deepEqual(lat, [15000, 45000, 200500, 300000, 300000], 'backoff schedule, Retry-After 200 s wins over 120 s');
  assert.equal(A.s.outbox().length, 0, 'the 6th attempt succeeded'); assert.equal(api.count(CODE), 1); assert.equal(A.s.retryN, 0, 'backoff resets after success');
});
test('response lost after the server committed (tab kill mid-flush): retry stores once, 0 lost', async () => {
  const api = mockApi(); const A = await phone(api, 'A'); await A.db.append(Array.from({ length: 30 }, (_, i) => ev('a.b', 'x' + i, { i }, i + 1)));
  api.faults.push('lose-response'); const r = await A.s.run(); assert.equal(r.ok, false); assert.equal(A.s.outbox().length, 30, 'not marked synced');
  assert.equal(api.count(CODE), 30); assert.equal((await A.s.run()).ok, true); assert.equal(api.count(CODE), 30, 'no duplicates on the server'); assert.equal(A.s.outbox().length, 0);
});
test('quota 429: stops pushing, keeps everything local, reports the message', async () => {
  const api = mockApi({ quota: 10 }); const A = await phone(api, 'A'); await A.db.append(Array.from({ length: 25 }, (_, i) => ev('a.b', 'x' + i, { i }, i + 1)));
  const { batches } = packBatches(A.s.outbox(), 400); assert.ok(batches.length > 1);
  const r = await A.s.run(); assert.equal(r.ok, true); assert.equal(r.quota, true);
  const st = A.s.state(); assert.equal(st.quota.full, true); assert.equal(st.quota.limit, 10); assert.match(st.quota.msg, /quota/);
  assert.equal(A.db.events().length, 25, 'all events kept on the phone'); assert.equal(A.s.outbox().length, 25 - api.count(CODE));
  const posts = api.calls.filter(c => c.m === 'POST').length; await A.s.run(); assert.equal(api.calls.filter(c => c.m === 'POST').length, posts, 'no hammering after quota');
  assert.equal(A.timer.q.length, 0, 'quota is not retried on a timer');
});
test('one event the server refuses (400) does not block the rest', async () => {
  const api = mockApi(); const A = await phone(api, 'A');
  const badE = ev('x.y', 'bad', {}, 5); const good = Array.from({ length: 9 }, (_, i) => ev('a.b', 'g' + i, {}, 10 + i));
  await A.db.append([...good, badE]); badE.ts = 5.5;  // locally valid when stored; the server requires an integer ts
  const r = await A.s.run(); assert.equal(r.ok, true); assert.equal(api.count(CODE), 9); assert.deepEqual(A.s.state().rejected, [badE.id]); assert.equal(A.s.outbox().length, 0);
  assert.ok(A.db.has(badE.id), 'refused event kept locally');
});
test('restore on a wiped phone: pull rebuilds the identical projection (paged)', async () => {
  const api = mockApi(); const A = await phone(api, 'A');
  await A.db.append(Array.from({ length: 1200 }, (_, i) => ev(i % 2 ? 'patternNote.created' : 'ball.surfaceLogged', null, { lane: String(i), ballId: 'b' + (i % 9), date: '2026-10-1' + (i % 9), finish: '2000' }, 1000 + i)));
  await A.s.run(); const B = await phone(api, 'B'); const r = await B.s.run(); assert.equal(r.pulled, 1200); assert.equal(B.db.hash(), A.db.hash());
  assert.ok(api.calls.filter(c => c.m === 'GET').length >= 3, 'paged at 500');
  assert.equal(B.s.outbox().length, 0, 'pulled events are not pushed back');
});
