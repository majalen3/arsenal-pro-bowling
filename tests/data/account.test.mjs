// Optional accounts (2026-10-31): client core + sync account mode against the in-memory API mock. No network.
import test from 'node:test'; import assert from 'node:assert/strict';
import { createDB } from '../../js/data/db.js';
import { memoryBackend } from '../../js/data/idb.js';
import { mkEvent } from '../../js/data/events.js';
import { createSync } from '../../js/data/sync.js';
import { createAccount, KEY, passwordProblem, EMAIL_RE } from '../../js/data/account.js';
import { mockApi } from './mock_api.mjs';
const BASE = 'https://api.test';
const mem = () => { const m = {}; return { m, getItem: k => k in m ? m[k] : null, setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; };
const fakeTimer = () => ({ q: [], set() { return 1; }, clear() {} });
const ev = (type, id, data, ts, dev = 'A') => mkEvent(type, id, data, { ts, deviceId: dev });
async function phone(api, name, code) {
  const storage = mem(), acct = createAccount({ base: BASE, storage, fetchFn: api.fetchFn });
  const db = createDB(memoryBackend(), { deviceId: name }); await db.open();
  const s = createSync({ db, base: BASE, deviceId: code, fetchFn: api.fetchFn, timer: fakeTimer(), auth: () => acct.active(), onAuthLost: () => acct.end() });
  return { storage, acct, db, s };
}

test('validation helpers', () => {
  assert.equal(passwordProblem('short'), 'Use at least 8 characters.'); assert.equal(passwordProblem('longenough'), null);
  assert.ok(EMAIL_RE.test('a@b.co')); assert.ok(!EMAIL_RE.test('nope')); assert.ok(!EMAIL_RE.test('a b@c.de'));
});
test('signup stores the session (token in one key, never the password); login/logout; wrong password errors', async () => {
  const api = mockApi(); const A = await phone(api, 'A', 'code-aaaaaaaa');
  const r = await A.acct.signup('x@example.com', 'password-1'); assert.equal(r.ok, true); assert.equal(r.recoveryKey, 'RK-user1');
  const raw = A.storage.getItem(KEY); assert.ok(raw.includes('tok1')); assert.ok(!raw.includes('password-1'), 'password is never stored');
  assert.equal(A.acct.active().user.email, 'x@example.com');
  const dup = await A.acct.signup('x@example.com', 'password-1'); assert.equal(dup.ok, false); assert.match(dup.error, /already exists/);
  await A.acct.logout(); assert.equal(A.acct.session(), null); assert.equal(Object.keys(api.tokens).filter(t => api.tokens[t] === 'user1').length, 0, 'server session revoked');
  const bad = await A.acct.login('x@example.com', 'wrong-pass'); assert.equal(bad.ok, false); assert.match(bad.error, /wrong/);
  assert.equal((await A.acct.login('x@example.com', 'password-1')).ok, true);
  const calls = api.calls.filter(c => c.path.startsWith('/api/auth/login')); assert.ok(calls.every(c => !c.dev), 'auth calls carry no device code');
});
test('offline without an account: sync uses the backup code only, never the account routes', async () => {
  const api = mockApi(); const A = await phone(api, 'A', 'code-aaaaaaaa');
  await A.db.append([ev('patternNote.created', null, { lane: '1', oil: 'o', adjustment: 'a' }, 1)]);
  api.faults.push('offline'); assert.equal((await A.s.run()).ok, false); assert.equal(A.db.events().length, 1, 'kept on the phone');
  assert.equal((await A.s.run()).ok, true); assert.equal(api.count('code-aaaaaaaa'), 1);
  assert.ok(api.calls.every(c => !c.path.startsWith('/api/account') && !c.auth));
});
test('migration: pending sign-in syncs nothing to the account until confirmed; then this phone\u2019s data is pushed to u:<id>', async () => {
  const api = mockApi(); const A = await phone(api, 'A', 'code-aaaaaaaa');
  await A.db.append([ev('ownedBall.created', 'b1', { catalogId: 'phaze-ii' }, 10), ev('bowler.edited', 'me', { fields: { speed: 17 } }, 11)]);
  await A.s.run(); assert.equal(api.count('code-aaaaaaaa'), 2);
  await A.acct.signup('m@example.com', 'password-1', { pending: true }); assert.equal(A.acct.active(), null, 'pending is not active');
  await A.s.run(); assert.equal(api.count('u:user1'), 0, 'nothing shared before the choice');
  A.acct.confirm(); const r = await A.s.run(); assert.equal(r.ok, true); assert.equal(api.count('u:user1'), 2, 'phone data added to the account');
  assert.equal(A.s.state().code, 'acct:user1');
});
test('"Not now": logout of a pending session leaves the account empty', async () => {
  const api = mockApi(); const A = await phone(api, 'A', 'code-aaaaaaaa'); await A.db.append([ev('ownedBall.created', 'b1', { catalogId: 'x' }, 10)]);
  await A.acct.signup('n@example.com', 'password-1', { pending: true }); await A.acct.logout(); await A.s.run();
  assert.equal(api.count('u:user1'), 0); assert.equal(api.count('code-aaaaaaaa'), 1);
});
test('isolation: two accounts never see each other\u2019s events; a second phone signed in to the same account gets them', async () => {
  const api = mockApi(); const A = await phone(api, 'A', 'code-aaaaaaaa'), B = await phone(api, 'B', 'code-bbbbbbbb'), A2 = await phone(api, 'A2', 'code-cccccccc');
  await A.acct.signup('a@example.com', 'password-a'); await B.acct.signup('b@example.com', 'password-b');
  await A.db.append([ev('ownedBall.created', 'ba', { catalogId: 'phaze-ii' }, 10, 'A')]); await B.db.append([ev('ownedBall.created', 'bb', { catalogId: 'hy-road' }, 10, 'B')]);
  await A.s.run(); await B.s.run(); await A.s.run(); await B.s.run();
  assert.deepEqual(Object.keys(A.db.projection().owned), ['ba']); assert.deepEqual(Object.keys(B.db.projection().owned), ['bb']);
  await A2.acct.login('a@example.com', 'password-a'); const r = await A2.s.run(); assert.equal(r.pulled, 1); assert.deepEqual(Object.keys(A2.db.projection().owned), ['ba']);
  // A device-code request can't name the account stream ('u:' is not a valid code) and the mock keeps it apart.
  assert.equal(api.count('code-aaaaaaaa'), 0, 'signed-in phone wrote nothing under its backup code');
});
test('expired or revoked token: 401 ends the session on this phone, data stays local and goes back to the backup code', async () => {
  const api = mockApi(); const A = await phone(api, 'A', 'code-aaaaaaaa'); await A.acct.signup('r@example.com', 'password-1');
  await A.db.append([ev('ownedBall.created', 'b1', { catalogId: 'x' }, 10)]); await A.s.run();
  for (const t in api.tokens) delete api.tokens[t];
  await A.db.append([ev('ownedBall.created', 'b2', { catalogId: 'y' }, 11)]); const r = await A.s.run();
  assert.equal(r.ok, false); assert.equal(A.acct.session(), null, 'signed out'); assert.equal(A.db.events().length, 2);
  await A.s.run(); assert.equal(api.count('code-aaaaaaaa'), 2, 'falls back to the backup code');
  const s = createAccount({ base: BASE, storage: mem(), now: () => Date.parse('2100-01-01') }); const st = s; assert.equal(st.session(), null);
});
test('export returns only my events; delete needs the password and removes the server copy', async () => {
  const api = mockApi(); const A = await phone(api, 'A', 'code-aaaaaaaa'); await A.acct.signup('d@example.com', 'password-1');
  await A.db.append([ev('ownedBall.created', 'b1', { catalogId: 'x' }, 10)]); await A.s.run();
  const x = await A.acct.exportAll(); assert.equal(x.ok, true); assert.equal(x.data.events.length, 1);
  const no = await A.acct.remove('wrong-pass'); assert.equal(no.ok, false); assert.ok(A.acct.session());
  const yes = await A.acct.remove('password-1'); assert.equal(yes.ok, true); assert.equal(A.acct.session(), null);
  assert.equal(api.count('u:user1'), 0); assert.equal(A.db.events().length, 1, 'phone data kept');
});
test('network failure on sign-in gives a plain message and stores nothing', async () => {
  const api = mockApi(); const A = await phone(api, 'A', 'code-aaaaaaaa'); api.faults.push('offline');
  const r = await A.acct.login('x@example.com', 'password-1'); assert.equal(r.ok, false); assert.match(r.error, /reach the server|offline/); assert.equal(A.storage.getItem(KEY), null);
});
