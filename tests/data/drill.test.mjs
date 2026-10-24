// M3 spare drill + process goal (js/cc/drill.js). Sessions are TEST DATA (ids 'test-*').
import test from 'node:test';
import assert from 'node:assert/strict';
import { seedEvents } from '../../js/data/seed.js';
import { project } from '../../js/data/project.js';
import { mkEvent } from '../../js/data/events.js';
import * as D from '../../js/cc/drill.js';
function game(ev, sid, made, { ts = 5000, pin = 10 } = {}) {   // 9 + one-pin leave every frame; `made` of the first spares made
  ev.push(mkEvent('session.created', sid, { kind: 'tonight', date: '2026-10-20' }, { ts }));
  let t = ts + 1, m = 0;
  for (let f = 1; f <= 10; f++) {
    const ok = m++ < made;
    ev.push(mkEvent('shot.logged', sid, { sessionId: sid, game: 1, frame: f, roll: 1, down: 9, leave: [pin] }, { ts: t++ }));
    ev.push(mkEvent('shot.logged', sid, { sessionId: sid, game: 1, frame: f, roll: 2, down: ok ? 1 : 0, leave: ok ? [] : [pin] }, { ts: t++ }));
    if (f === 10 && ok) ev.push(mkEvent('shot.logged', sid, { sessionId: sid, game: 1, frame: 10, roll: 3, down: 9, leave: [pin] }, { ts: t++ }));
  }
}
test('drill leaves: most-missed first, corner pins when nothing missed', () => {
  assert.deepEqual(D.drillLeaves(project(seedEvents({ now: 1000 }))).list.map(x => x.leave), ['10', '7']);
  const ev = seedEvents({ now: 1000 }); game(ev, 'test-g1', 6);
  const r = D.drillLeaves(project(ev)); assert.equal(r.from, 'your misses'); assert.equal(r.list[0].leave, '10'); assert.equal(r.list[0].why, 'missed 4 of 10');
});
test('attempts + stats', () => {
  let a = []; a = D.addAttempt(a, '10', true, 1); a = D.addAttempt(a, '10', false, 2); a = D.addAttempt(a, '7', true, 3);
  const s = D.drillStats(a); assert.equal(s.n, 3); assert.equal(s.made, 2); assert.equal(s.pct, 67); assert.deepEqual(s.byLeave[0], { leave: '10', n: 2, made: 1 });
  assert.equal(D.drillStats([{ leave: 10, made: 'y' }, null]).n, 0, 'bad rows dropped');
});
test('process goal: shown with n, informational', () => {
  assert.equal(D.cleanGoal({ k: 'single', target: 11 }), null); assert.equal(D.cleanGoal({ k: 'score', target: 5 }), null);
  const ev = seedEvents({ now: 1000 }); game(ev, 'test-g2', 7);
  const r = D.goalResult(project(ev), 'test-g2', { k: 'single', target: 8 });
  assert.equal(r.text, '7 of 10 single-pin spares made (70%) \u00b7 goal 8 of 10 (80%).'); assert.equal(r.met, false);
  assert.doesNotMatch(r.text, /good|great|well done/i);
  ev.push(mkEvent('session.edited', 'test-g2', { fields: { drill: [{ leave: '10', made: true, ts: 1 }, { leave: '7', made: true, ts: 2 }] } }, { ts: 9000 }));
  const d = D.goalResult(project(ev), 'test-g2', { k: 'drill', target: 8 }); assert.equal(d.met, true); assert.match(d.text, /^2 of 2 drill spares made \(100%\)/);
  assert.match(D.goalResult(project(seedEvents({ now: 1 })), 'none', { k: 'drill', target: 5 }).text, /none yet tonight/);
});
