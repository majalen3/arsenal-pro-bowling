// Sim2 #3/#4: fixing a frame (mine, a teammate's, a finished game) is void + re-write in one append; Undo restores it exactly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkEvent } from '../../js/data/events.js';
import { project } from '../../js/data/project.js';
import { fixEvents, undoEvents } from '../../js/cc/fix.js';
import { playOrder, scoreGame } from '../../js/data/scoring.js';

const shot = (frame, roll, down, leave = [], extra = {}) => mkEvent('shot.logged', 's1', Object.assign({ sessionId: 's1', game: 1, frame, roll, down, leave, ballId: 'b1', catalogId: 'c1' }, extra));
const total = (shots, game = 1) => { const o = playOrder(shots.filter(x => x.game === game)); const s = scoreGame(o.map(t => ({ down: t.down }))); return s.cum[s.cum.length - 1]; };
const game12 = () => { const ev = []; for (let f = 1; f <= 9; f++) { ev.push(shot(f, 1, 9, [10]), shot(f, 2, 0, [10])); } ev.push(shot(10, 1, 9, [10]), shot(10, 2, 0, [10])); return ev; };
const rows = (P, f, who) => (who ? P.teamShots.filter(x => x.who === who) : P.shots).filter(x => x.game === 1 && x.frame === f);

test('fix my finished game: frame 3 becomes a strike, total recomputes, Undo restores the old frame', () => {
  const log = game12(); let P = project(log); assert.equal(total(P.shots), 90);
  const { events, undo } = fixEvents({ sid: 's1', game: 1, f: 3, old: rows(P, 3), throws: [{ down: 10, leave: [] }] });
  assert.equal(events.filter(e => e.type === 'event.voided').length, 2);
  log.push(...events); P = project(log);
  assert.equal(total(P.shots), 100); assert.equal(rows(P, 3).length, 1); assert.equal(rows(P, 3)[0].ballId, 'b1');
  log.push(...undoEvents(undo)); P = project(log);
  assert.equal(total(P.shots), 90); assert.deepEqual(rows(P, 3).map(x => [x.roll, x.down, x.leave]), [[1, 9, [10]], [2, 0, [10]]]);
  assert.equal(P.shots.length, 20, 'nothing silently lost');
});
test('fix a teammate frame: rows keep who, my shots untouched, undo names the owner', () => {
  const log = [shot(1, 1, 10), shot(1, 1, 7, [7, 8, 10], { who: 'ann' }), shot(1, 2, 2, [8], { who: 'ann' })]; let P = project(log);
  const { events, undo } = fixEvents({ sid: 's1', game: 1, f: 1, old: rows(P, 1, 'ann'), throws: [{ down: 7, leave: [7, 8, 10] }, { down: 3, leave: [] }], who: 'ann' });
  assert.equal(undo.who, 'ann');
  log.push(...events); P = project(log);
  assert.deepEqual(rows(P, 1, 'ann').map(x => x.down), [7, 3]); assert.equal(P.shots.length, 1);
  log.push(...undoEvents(undo)); P = project(log);
  assert.deepEqual(rows(P, 1, 'ann').map(x => [x.down, x.who]), [[7, 'ann'], [2, 'ann']]);
});
