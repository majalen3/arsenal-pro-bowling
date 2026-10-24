// Sim bugs 1 and 3 (docs/user-simulations.md). TEST DATA only: ids 'test-night-*'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { seedEvents } from '../../js/data/seed.js';
import { project } from '../../js/data/project.js';
import { mkEvent } from '../../js/data/events.js';
import * as N from '../../js/cc/night.js';
import * as Q from '../../js/cc/quicklog.js';
const H = 3600e3, T0 = new Date(2026, 9, 23, 23, 50).getTime();   // 23:50 local
const night = (id, ts, extra = {}) => mkEvent('session.created', id, Object.assign({ kind: 'tonight', date: N.dayKey(ts), game: 1 }, extra), { ts });
const shot = (sid, ts, frame, down = 10) => mkEvent('shot.logged', sid, { sessionId: sid, game: 1, frame, roll: 1, down, leave: [], foul: false }, { ts });
test('night: a game that runs past midnight stays in the same session', () => {
  const sid = 'test-night-a', ev = seedEvents({ now: 1 }).concat(night(sid, T0), shot(sid, T0 + 60e3, 1), shot(sid, T0 + 120e3, 2));
  const P = project(ev), after = T0 + 20 * 60e3;   // 00:10 the next day
  assert.notEqual(N.dayKey(after), N.dayKey(T0));
  assert.equal(N.openNight(P, after), sid);
  assert.equal(N.nightInfo(P, P.sessions[sid], after).inProgress, true);
});
test('night: an unfinished game resumes after 4 h idle (≤ 24 h); a finished one does not', () => {
  const sid = 'test-night-b', P = project(seedEvents({ now: 1 }).concat(night(sid, T0), shot(sid, T0 + 1000, 1)));
  assert.equal(N.openNight(P, T0 + 6 * H), sid);
  assert.equal(N.openNight(P, T0 + 30 * H), null);
  const ev = [night('test-night-c', T0)]; for (let f = 1; f <= 12; f++) ev.push(shot('test-night-c', T0 + f * 1000, f > 10 ? 10 : f));
  const P2 = project(seedEvents({ now: 1 }).concat(ev));
  assert.equal(N.openNight(P2, T0 + 2 * H), 'test-night-c', 'within 4 h: same night');
  assert.equal(N.openNight(P2, T0 + 5 * H), null, 'game done and 4 h idle: new night');
});
test('night: "End night" closes it; ids are numbered per day', () => {
  const sid = 'test-night-d', ev = seedEvents({ now: 1 }).concat(night(sid, T0), shot(sid, T0 + 1000, 1), mkEvent('session.edited', sid, { fields: { ended: true } }, { ts: T0 + 2000 }));
  const P = project(ev);
  assert.equal(N.openNight(P, T0 + 3000), null);
  P.sessions[`night-${N.dayKey(T0)}-1`] = { id: 'x' };
  assert.equal(N.newNightId(P, T0), `night-${N.dayKey(T0)}-2`);
});
test('spare hints: lefty and the real strike stand move the numbers (sim bug 1)', () => {
  const r20 = Q.leaveHint([7], 20, 'right').keys[0].board, l20 = Q.leaveHint([7], 20, 'left').keys[0].board, l17 = Q.leaveHint([7], 17, 'left').keys[0].board;
  assert.notEqual(r20, l20); assert.equal(l17, l20 - 3);
});
test('seed: the starter arsenal keeps bowler fields the user already set (sim bug 1 root cause)', () => {
  const P = project([mkEvent('bowler.edited', 'me', { fields: { hand: 'left' } }, { ts: 5 })].concat(seedEvents({ now: 10, keep: ['hand'] })));
  assert.equal(P.bowler.hand, 'left');
  const P2 = project(seedEvents({ now: 10 })); assert.equal(P2.bowler.hand, 'right');
});
