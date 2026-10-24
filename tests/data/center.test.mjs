// M1 center / lane-pair memory (js/cc/center.js). Sessions here are TEST DATA (ids 'test-*').
import test from 'node:test';
import assert from 'node:assert/strict';
import { seedEvents } from '../../js/data/seed.js';
import { project } from '../../js/data/project.js';
import { mkEvent } from '../../js/data/events.js';
import * as M from '../../js/cc/center.js';
const C = 'center-test-lanes';
function night(ev, sid, date, fields, { score9 = true, ball = 'own-a', ts = 5000 } = {}) {
  ev.push(mkEvent('session.created', sid, Object.assign({ kind: 'tonight', date, centerId: C }, fields), { ts }));
  let t = ts + 1;   // one game: 9 + spare every frame, bonus 9 => 190
  for (let f = 1; f <= 10; f++) {
    ev.push(mkEvent('shot.logged', sid, { sessionId: sid, game: 1, frame: f, roll: 1, down: 9, leave: [10], ballId: ball }, { ts: t++ }));
    ev.push(mkEvent('shot.logged', sid, { sessionId: sid, game: 1, frame: f, roll: 2, down: 1, leave: [], ballId: 'own-spare' }, { ts: t++ }));
  }
  ev.push(mkEvent('shot.logged', sid, { sessionId: sid, game: 1, frame: 10, roll: 3, down: 9, leave: [10], ballId: ball }, { ts: t++ }));
}
test('cleanPair and cleanNote', () => {
  assert.equal(M.cleanPair(' 15 - 16 '), '15-16'); assert.equal(M.cleanPair('15&16'), '15-16'); assert.equal(M.cleanPair('7'), '7');
  assert.equal(M.cleanPair('abc'), null); assert.equal(M.cleanPair(''), null);
  assert.equal(M.cleanNote('  move  left\n early '), 'move left early'); assert.equal(M.cleanNote(''), null); assert.equal(M.cleanNote('x'.repeat(200)).length, 140);
});
test('last visit: newest night at this center, setup + games/avg + most thrown ball; this night excluded', () => {
  const ev = seedEvents({ now: 1000 });
  ev.push(mkEvent('center.created', C, { fields: { name: 'Test Lanes', surface: 'synthetic' } }, { ts: 1100 }));
  night(ev, 'test-n1', '2026-10-13', { lanePair: '9-10', surface: 'synthetic' }, { ts: 2000, ball: 'own-b' });
  night(ev, 'test-n2', '2026-10-20', { lanePair: '15-16', surface: 'synthetic', patternSlug: 'shark', patternName: '2026 PBA Shark', ft: 48, ml: 22, ratio: null, bagId: 'bag-x' }, { ts: 3000 });
  ev.push(mkEvent('session.created', 'test-now', { kind: 'tonight', date: '2026-10-27', centerId: C }, { ts: 4000 }));
  const P = project(ev), v = M.lastVisit(P, C, 'test-now');
  assert.equal(v.id, 'test-n2'); assert.equal(v.lanePair, '15-16'); assert.equal(v.games, 1); assert.equal(v.avg, 190); assert.equal(v.ballId, 'own-a');
  assert.equal(M.visitsOf(P, C, 'test-now').length, 2);
  assert.equal(M.lineOf(v, id => id === 'own-a' ? 'Phaze II' : null), 'Oct 20 \u00b7 lanes 15-16 \u00b7 2026 PBA Shark 48 ft \u00b7 1 game, 190 avg \u00b7 mostly Phaze II');
  assert.deepEqual(M.setupOf(v), { pickId: null, patternSlug: 'shark', patternName: '2026 PBA Shark', ft: 48, ml: 22, ratio: null, surface: 'synthetic', bagId: 'bag-x', lanePair: '15-16' });
  assert.equal(M.lastVisit(P, 'center-elsewhere'), null);
});
test('practice nights are listed but never averaged; a note round-trips through center.edited', () => {
  const ev = seedEvents({ now: 1000 });
  ev.push(mkEvent('center.created', C, { fields: { name: 'Test Lanes' } }, { ts: 1100 }));
  night(ev, 'test-p1', '2026-10-21', { event: 'practice' }, { ts: 2000 });
  ev.push(mkEvent('center.edited', C, { fields: { note: ' 2 boards left after game 1 ' } }, { ts: 2500 }));
  const P = project(ev), v = M.lastVisit(P, C);
  assert.equal(v.practice, true); assert.equal(v.avg, null); assert.match(M.lineOf(v), /1 practice game/); assert.match(M.lineOf(v), /house shot \(not entered\)/);
  assert.equal(M.noteOf(P, C), '2 boards left after game 1'); assert.equal(M.noteOf(P, 'center-none'), null);
});
