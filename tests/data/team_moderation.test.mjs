// My Team moderation v2 (app side): Hide is gated on the API's moderation flag, Block never leaves the phone, and the notes a
// blocked teammate wrote are not shown. Reports can name the shared item.
import test from 'node:test'; import assert from 'node:assert/strict';
import { canHide, blockedIds, setBlocked, visibleNotes, REPORT_ITEMS, KINDS, createTeamClient } from '../../js/data/team.js';

const mem = () => { const m = {}; return { m, getItem: k => k in m ? m[k] : null, setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; };

test('Hide only shows when the API says moderation 2 (older API: the buttons stay away)', () => {
  assert.equal(canHide(null), false);
  assert.equal(canHide({}), false);
  assert.equal(canHide({ moderation: 1 }), false);
  assert.equal(canHide({ moderation: 2 }), true);
  assert.equal(canHide({ moderation: '2' }), true);
});

test('block is per team, reversible, capped, and never mutates the old prefs', () => {
  const p0 = { teamBlocked: { t1: ['a'] } };
  const p1 = setBlocked(p0, 't1', 'b', true);
  assert.deepEqual([...blockedIds({ teamBlocked: p1 }, 't1')], ['a', 'b']);
  assert.deepEqual(p0.teamBlocked.t1, ['a'], 'input untouched');
  assert.equal(blockedIds({ teamBlocked: p1 }, 't2').size, 0, 'other teams unaffected');
  const p2 = setBlocked({ teamBlocked: setBlocked({ teamBlocked: p1 }, 't1', 'a', false) }, 't1', 'b', false);
  assert.deepEqual(p2, {}, 'unblocking the last one drops the team key');
  assert.equal(blockedIds(undefined, 't1').size, 0);
  let big = {}; for (let i = 0; i < 120; i++) big = setBlocked({ teamBlocked: big }, 't1', 'm' + i, true);
  assert.equal(big.t1.length, 80);
});

test('a blocked teammate\u2019s notes are filtered; everyone else\u2019s stay in order', () => {
  const V = { notes: [{ id: '1', memberId: 'a' }, { id: '2', memberId: 'b' }, { id: '3', memberId: 'a' }] };
  assert.deepEqual(visibleNotes(V, new Set(['a'])).map(n => n.id), ['2']);
  assert.deepEqual(visibleNotes(V, new Set()).map(n => n.id), ['1', '2', '3']);
  assert.deepEqual(visibleNotes(null, new Set()), []);
});

test('a report can name any of the four shared kinds, and the whole card; no ranking words', () => {
  assert.deepEqual(REPORT_ITEMS.map(x => x[0]).filter(Boolean), KINDS);
  assert.equal(REPORT_ITEMS[0][0], '');
  assert.ok(!/best|worst|rank|score|average/i.test(REPORT_ITEMS.map(x => x[1]).join(' ')));
});

test('client: hide and un-hide go to the member and note hide endpoints, and nothing else', async () => {
  const calls = [];
  const account = { active: () => ({ user: { id: 'u1' } }), msg: () => '', request: async (path, o = {}) => { calls.push([o.method || 'GET', path, o.body]); return { status: 200, json: {} }; } };
  const c = createTeamClient({ account, storage: mem() });
  await c.hide('T', 'M/1', true); await c.hide('T', 'M1', false); await c.hideNote('T', 'N1', true);
  assert.deepEqual(calls, [
    ['POST', '/api/account/teams/T/members/M%2F1/hide', { hidden: true }],
    ['POST', '/api/account/teams/T/members/M1/hide', { hidden: false }],
    ['POST', '/api/account/teams/T/notes/N1/hide', { hidden: true }]]);
});
