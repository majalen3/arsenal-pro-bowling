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
import { byBall, gamesRows, GAMES_CSV_HEAD } from '../../js/cc/card.js';
import { toCSV } from '../../js/data/csv.js';
const T = (frame, roll, down, leave, ballId, ts) => ({ sessionId: 'n1', game: 1, frame, roll, down, leave, ballId, ts });
const night = () => { const out = []; let ts = 1;
  for (let f = 1; f <= 9; f++) out.push(T(f, 1, 9, [7], 'big', ts++), T(f, 2, 1, [], 'spare', ts++));
  out.push(T(10, 1, 10, [], 'big', ts++), T(10, 2, 10, [], 'big', ts++), T(10, 3, 10, [], 'big', ts++)); return out; };
test('byBall: strikes on first balls and spares made, per ball', () => {
  const games = [{ game: 1, throws: night() }];
  const b = byBall(games), big = b.find(x => x.ballId === 'big'), sp = b.find(x => x.ballId === 'spare');
  assert.equal(big.first, 12); assert.equal(big.strikes, 3); assert.equal(big.spare, 0);
  assert.equal(sp.spare, 9); assert.equal(sp.spareMade, 9); assert.equal(sp.first, 0);
});
test('gamesRows: one row per game, formula-looking names neutralised by toCSV', () => {
  const P = { shots: night(), sessions: { n1: { id: 'n1', date: '2026-10-23' } }, scores: [], aggregates: [] };
  const rows = gamesRows(P, id => id === 'big' ? '=HYPERLINK("x")' : 'Spare');
  assert.deepEqual(rows[0], GAMES_CSV_HEAD); assert.equal(rows.length, 2);
  assert.equal(rows[1][4], 8 * 19 + 20 + 30); assert.equal(rows[1][5], 'yes'); assert.equal(rows[1][7], 3);
  const csv = toCSV(rows); assert.ok(csv.includes(`"'=HYPERLINK(""x"") | Spare"`) || csv.includes(`'=HYPERLINK`), csv.split('\r\n')[1]);
  assert.ok(!/,=/.test(csv));
});
