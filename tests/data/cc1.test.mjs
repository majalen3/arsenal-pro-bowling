// CC1 quick log: USBC scoring incl. the 10th frame, fouls, splits (Rule 2h), triggers, and 3-6-9 per leave.
// Every expected total was worked by hand from USBC Playing Rules 2a–2h.
import test from 'node:test'; import assert from 'node:assert/strict';
import { scoreGame, isSplit } from '../../js/data/scoring.js';
import * as Q from '../../js/cc/quicklog.js';
import * as R from '../../js/cc/rank.js';
const d = (...a) => a.map(x => (typeof x === 'object' ? x : { down: x }));
const Z18 = Array(18).fill(0);
test('Q01 perfect game = 300, 12 deliveries', () => { const r = scoreGame(d(...Array(12).fill(10))); assert.equal(r.total, 300); assert.ok(r.complete); });
test('Q02 all 9-spares + 9 fill ball = 190', () => { const t = []; for (let i = 0; i < 10; i++) t.push(9, 1); t.push(9); const r = scoreGame(d(...t)); assert.equal(r.total, 190); assert.ok(r.complete && r.ok); });
test('Q03 gutter game = 0, complete', () => { const r = scoreGame(d(...Array(20).fill(0))); assert.equal(r.total, 0); assert.ok(r.complete); });
test('Q04 10th X 7 2 = 19', () => assert.equal(scoreGame(d(...Z18, 10, 7, 2)).total, 19));
test('Q05 10th 7 / X = 20', () => assert.equal(scoreGame(d(...Z18, 7, 3, 10)).total, 20));
test('Q06 10th X X X = 30', () => assert.equal(scoreGame(d(...Z18, 10, 10, 10)).total, 30));
test('Q07 10th X 7 / = 20', () => assert.equal(scoreGame(d(...Z18, 10, 7, 3)).total, 20));
test('Q08 10th open: a third ball is not earned', () => { const r = scoreGame(d(...Z18, 7, 2, 5)); assert.equal(r.ok, false); assert.match(r.errors.join(), /third ball not earned/); });
test('Q09 10th X 7 5 is impossible (12 pins on one rack)', () => assert.equal(scoreGame(d(...Z18, 10, 7, 5)).ok, false));
test('Q10 10th open 7 2 completes the game without a third ball', () => { const r = scoreGame(d(...Z18, 7, 2)); assert.ok(r.complete); assert.equal(r.total, 9); });
test('Q11 foul on the first ball scores 0; 10 on the second is a spare', () => { const r = scoreGame(d({ down: 7, foul: true }, 10, 5, 0)); assert.equal(r.cum[0], 15); assert.equal(r.cum[1], 20); });
test('Q12 strike bonus waits for the next two deliveries', () => { const r = scoreGame(d(10, 7)); assert.equal(r.cum[0], null); assert.equal(r.complete, false); });
test('Q13 stateOf: marks, frame and pins facing the next ball', () => {
  let s = Q.stateOf([Q.throwOf('leave', Q.ALL, { leave: [10] })]);
  assert.deepEqual([s.frame, s.roll, s.standing], [1, 2, [10]]); assert.deepEqual(s.frames[0].marks, ['9']);
  s = Q.stateOf([Q.throwOf('leave', Q.ALL, { leave: [10] }), Q.throwOf('all', [10])]); assert.deepEqual(s.frames[0].marks, ['9', '/']); assert.deepEqual([s.frame, s.roll, s.standing.length], [2, 1, 10]);
  s = Q.stateOf([Q.throwOf('all', Q.ALL)]); assert.deepEqual(s.frames[0].marks, ['X']); assert.equal(s.frame, 2);
  s = Q.stateOf([Q.throwOf('leave', Q.ALL, { leave: [7] }), Q.throwOf('none', [7])]); assert.deepEqual(s.frames[0].marks, ['9', '-']);
});
test('Q14 stateOf 10th: X then a leave → third ball faces the leave; X X → fresh rack', () => {
  const pre = Array(18).fill(0).map(() => ({ down: 0, leave: Q.ALL.slice() }));
  let s = Q.stateOf(pre.concat([Q.throwOf('all', Q.ALL), Q.throwOf('leave', Q.ALL, { leave: [3, 6, 10] })]));
  assert.deepEqual([s.frame, s.roll, s.standing], [10, 3, [3, 6, 10]]); assert.equal(s.done, false);
  s = Q.stateOf(pre.concat([Q.throwOf('all', Q.ALL), Q.throwOf('leave', Q.ALL, { leave: [3, 6, 10] }), Q.throwOf('all', [3, 6, 10])]));
  assert.deepEqual(s.frames[9].marks, ['X', '7', '/']); assert.ok(s.done); assert.equal(s.total, 20);
  s = Q.stateOf(pre.concat([Q.throwOf('all', Q.ALL), Q.throwOf('all', Q.ALL)])); assert.deepEqual([s.roll, s.standing.length], [3, 10]);
  s = Q.stateOf(pre.concat([Q.throwOf('all', Q.ALL), Q.throwOf('all', Q.ALL), Q.throwOf('all', Q.ALL)])); assert.deepEqual(s.frames[9].marks, ['X', 'X', 'X']); assert.equal(s.total, 30);
  s = Q.stateOf(pre.concat([Q.throwOf('leave', Q.ALL, { leave: [7] }), Q.throwOf('none', [7])])); assert.ok(s.done); assert.equal(s.total, 9);
  s = Q.stateOf(pre.concat([Q.throwOf('leave', Q.ALL, { leave: [7] }), Q.throwOf('all', [7])])); assert.deepEqual([s.roll, s.standing.length, s.done], [3, 10, false]);
});
test('Q15 stateOf foul: first-ball foul respots; 10 on the next ball is a spare mark', () => {
  const s = Q.stateOf([Q.throwOf('leave', Q.ALL, { foul: true }), Q.throwOf('all', Q.ALL)]);
  assert.deepEqual(s.frames[0].marks, ['F', '/']); assert.equal(s.frame, 2);
});
test('Q16 splits per USBC Rule 2h', () => {
  for (const L of [[7, 10], [4, 6], [7, 9], [3, 10], [2, 7], [5, 6], [4, 7, 10], [2, 10], [6, 7, 10]]) assert.equal(isSplit(L), true, L.join('-'));
  for (const L of [[1, 2, 10], [2, 8], [3, 6, 10], [10], [2, 4, 5, 8], [1, 7, 10], [3, 6], [2, 4]]) assert.equal(isSplit(L), false, L.join('-'));
  assert.equal(Q.stateOf([Q.throwOf('leave', Q.ALL, { leave: [7, 10] })]).frames[0].split, true);
  assert.equal(Q.stateOf([Q.throwOf('leave', Q.ALL, { leave: [3, 6, 10] })]).frames[0].split, false);
});
test('Q17 3-6-9 per leave: key pin = nearest the bowler, RH and LH', () => {
  const h = Q.leaveHint([3, 6, 10]); assert.equal(h.keys.length, 1); assert.deepEqual([h.keys[0].key, h.keys[0].board, h.keys[0].move], [3, 23, '3 left']);
  const l = Q.leaveHint([3, 6, 10], 20, 'left'); assert.deepEqual([l.keys[0].board, l.keys[0].move], [17, '3 left']);
  const s = Q.leaveHint([7, 10]); assert.equal(s.split, true); assert.deepEqual(s.keys.map(k => k.board), [11, 29]);
  assert.deepEqual([Q.leaveHint([10]).keys[0].board, Q.leaveHint([7]).keys[0].board, Q.leaveHint([2, 4, 5, 8]).keys[0].board], [29, 11, 17]);
  assert.equal(Q.leaveHint([]), null);
});
test('Q18 throwOf: X / – and a leave give the right pin counts', () => {
  assert.deepEqual(Q.throwOf('all', Q.ALL), { down: 10, leave: [] });
  assert.deepEqual(Q.throwOf('none', [3, 6]), { down: 0, leave: [3, 6] });
  assert.deepEqual(Q.throwOf('leave', [3, 6, 10], { leave: [10, 99] }), { down: 2, leave: [10] });
  assert.deepEqual(Q.throwOf('leave', [3, 6], { foul: true }), { down: 0, leave: [3, 6], foul: true });
});
test('Q19 triggers: High/Light sequences (window 3, need 2)', () => {
  const m = (...a) => a.map(x => ({ miss: x }));
  assert.equal(R.trigger(m('high', 'high')).dir, 'left');
  assert.equal(R.trigger(m('high', 'pocket', 'high')).dir, 'left');
  assert.equal(R.trigger(m('high', 'high'), { hand: 'left' }).dir, 'right');
  assert.equal(R.trigger(m('light', 'pocket', 'light')).dir, 'right');
  assert.equal(R.trigger(m('high', 'light', 'pocket')), null);
  assert.equal(R.trigger(m('high', 'high', 'pocket', 'pocket', 'light')), null, 'only the last 3 count');
  assert.equal(R.trigger(m('high')), null);
  assert.equal(R.trigger([{ read: 'early' }, { miss: 'high' }, { read: 'early' }]).kind, 'planB');
});
