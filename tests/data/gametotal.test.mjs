// Item 2: "Add a game total" helpers. TEST DATA only (ids 'test-*').
import test from 'node:test';
import assert from 'node:assert/strict';
import * as GT from '../../js/cc/gametotal.js';
test('parseTotal: whole numbers 0-300 only', () => {
  assert.deepEqual(['0', '187', ' 300 ', '301', '18.7', '-1', '', 'abc', null].map(GT.parseTotal), [0, 187, 300, null, null, null, null, null, null]);
});
test('nextGame / taken count frames and totals on the night', () => {
  const P = { shots: [{ sessionId: 'test-n', frame: 1, game: 1 }, { sessionId: 'test-x', frame: 1, game: 2 }], scores: [{ sessionId: 'test-n', game: 2, score: 150 }], sessions: {} };
  assert.equal(GT.nextGame(P, 'test-n'), 3); assert.ok(GT.taken(P, 'test-n', 2)); assert.ok(!GT.taken(P, 'test-n', 3)); assert.equal(GT.nextGame(P, 'test-new'), 1);
});
test('targetNight: open night, else a new night today', () => {
  const now = Date.UTC(2026, 9, 24, 20);
  const t = GT.targetNight({ sessions: {}, shots: [] }, now); assert.ok(t.create && t.sid.startsWith('night-'));
  const P = { sessions: { 'test-open': { id: 'test-open', kind: 'tonight', ts: now - 60e3 } }, shots: [] };
  assert.deepEqual(GT.targetNight(P, now), { sid: 'test-open', create: false });
});
