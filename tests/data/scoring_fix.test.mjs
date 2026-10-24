// Scoring fixes 2-4: play order after a frame fix, re-entering one frame.
import test from 'node:test';
import assert from 'node:assert/strict';
import { playOrder, scoreGame } from '../../js/data/scoring.js';
import { editState, stateOf } from '../../js/cc/quicklog.js';
import { gamesOf } from '../../js/data/project.js';

const sh = (frame, roll, down, ts, leave = []) => ({ sessionId: 's', game: 1, frame, roll, down, leave, ts });
test('playOrder: a fixed frame written later still scores in its place', () => {
  // frame 1 was 9 / (ts 1,2), frame 2 X (ts 3); frame 1 fixed to X at ts 9
  const shots = [sh(2, 1, 10, 3), sh(3, 1, 10, 4), sh(1, 1, 10, 9)];
  const o = playOrder(shots);
  assert.deepEqual(o.map(x => x.frame), [1, 2, 3]);
  assert.equal(scoreGame(o.map(t => ({ down: t.down }))).cum[0], 30);
  const g = gamesOf(shots)[0]; assert.equal(g.ts, 9); assert.equal(g.n, 3);
});
test('playOrder keeps time order for old logs (frame/roll increase with time)', () => {
  const s = [sh(1, 1, 9, 1, [10]), sh(1, 2, 1, 2), sh(2, 1, 10, 3)];
  assert.deepEqual(playOrder(s), s);
});
test('editState: frame 4 re-entered closes after a strike or two balls', () => {
  assert.equal(editState(4, []).frame, 4);
  assert.equal(editState(4, []).standing.length, 10);
  assert.equal(editState(4, [{ down: 10, leave: [] }]).closed, true);
  const one = editState(4, [{ down: 9, leave: [10] }]); assert.equal(one.closed, false); assert.deepEqual(one.standing, [10]);
  assert.equal(editState(4, [{ down: 9, leave: [10] }, { down: 1, leave: [] }]).closed, true);
});
test('editState: the 10th needs the bonus balls before it closes', () => {
  assert.equal(editState(10, [{ down: 10, leave: [] }, { down: 10, leave: [] }]).closed, false);
  assert.equal(editState(10, [{ down: 10, leave: [] }, { down: 10, leave: [] }, { down: 7, leave: [1, 2, 3] }]).closed, true);
  assert.equal(editState(10, [{ down: 7, leave: [1, 2, 3] }, { down: 2, leave: [3] }]).closed, true);
});
test('a fixed frame changes the total the same way a fresh entry would', () => {
  const T = t => ({ down: t, leave: [] });
  const before = [T(10), { down: 9, leave: [10] }, T(1), T(10)];
  const after = [T(10), T(10), T(10)];
  assert.equal(stateOf(after).frames[0].cum, 30);
  assert.equal(stateOf(before).frames[0].cum, 20);
});
