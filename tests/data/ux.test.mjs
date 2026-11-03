// Now item 5: on-device counters + local flags (js/cc/ux.js). Pure core only; nothing here touches the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as UX from '../../js/cc/ux.js';

test('flags default: summary Lane, step preview on, Next up off', () => {
  const st = UX.blank('seed-1');
  assert.equal(UX.flagOf(st, 'laneView'), 'summary');
  assert.equal(UX.flagOf(st, 'stepPreview'), true);
  assert.equal(UX.flagOf(st, 'nextUp'), false);
});
test('a joined smoke test overrides the hand-set flag with a stable arm', () => {
  const st = UX.blank('seed-1'); st.flags.nextUp = true;
  assert.equal(UX.flagOf(st, 'nextUp'), true);
  UX.enroll(st, 's3', true, 1);
  const a = UX.armOf(st, 's3'); assert.equal(a, UX.armOf(st, 's3'));
  assert.equal(UX.flagOf(st, 'nextUp'), UX.TESTS.s3.arms[a === 'B' ? 1 : 0]);
  UX.enroll(st, 's3', false); assert.equal(UX.flagOf(st, 'nextUp'), true);
});
test('arms split installs roughly in half', () => {
  let b = 0; for (let i = 0; i < 400; i++) if (UX.armOf(UX.blank('dev-' + i), 's1') === 'B') b++;
  assert.ok(b > 150 && b < 250, `B arms ${b}/400`);
});
test('counters store counts and timestamps only, and reject odd names', () => {
  const st = UX.blank('s'); UX.bump(st, 'screen.lane', 10); UX.bump(st, 'screen.lane', 20); UX.bump(st, 'Bad Name!', 30);
  assert.deepEqual(st.c, { 'screen.lane': { n: 2, first: 10, last: 20 } });
});
test('parse drops unknown flags, bad values and free text', () => {
  const st = UX.parse(JSON.stringify({ v: 1, seed: 'x', flags: { laneView: 'nope', nextUp: true, evil: 1 }, c: { 'a.b': { n: 2 }, 'x y': { n: 1 } }, taps: [{ ts: 1, ball: 'o1', dir: 'weaker', note: 'hi' }] }));
  assert.deepEqual(st.flags, { nextUp: true }); assert.deepEqual(Object.keys(st.c), ['a.b']); assert.equal(st.taps[0].note, undefined);
  assert.equal(UX.parse('garbage').v, 1);
});
test('S2 follow-through: 3 first balls with the tapped ball within 3 hours', () => {
  const taps = [{ ts: 1000, ball: 'o1', dir: 'weaker', arm: 'B' }, { ts: 1000, ball: 'o2', dir: 'stronger', arm: 'A' }];
  const shots = [1, 2, 3].map(i => ({ ballId: 'o1', roll: 1, ts: 1000 + i })).concat([{ ballId: 'o2', roll: 1, ts: 1001 }, { ballId: 'o2', roll: 2, ts: 1002 }]);
  const f = UX.followThrough(taps, shots);
  assert.deepEqual(f.B, { taps: 1, followed: 1 }); assert.deepEqual(f.A, { taps: 1, followed: 0 });
});
test('summary has counts and days only: no ids, names or scores', () => {
  const st = UX.blank('secret-seed'); UX.bump(st, 'aim.chip', Date.UTC(2026, 10, 2)); st.taps.push({ ts: 5, ball: 'owned-abc', dir: 'weaker', arm: null });
  const P = { sessions: { n1: { date: '2026-10-27' }, n2: { date: '2026-07-01' } }, games: [{}], shots: [{ ballId: 'owned-abc', roll: 1, ts: 9 }], owned: { 'owned-abc': { name: 'Phaze II' } }, lines: {}, surface: [], imports: {}, aggregates: [], measurements: [] };
  const s = UX.summaryOf(st, P, { now: Date.UTC(2026, 10, 2), build: '1.1.0' }), txt = JSON.stringify(s);
  assert.equal(s.data.nights, 2); assert.equal(s.data.seasonNights, 1); assert.equal(s.counts['aim.chip'].n, 1);
  for (const bad of ['secret-seed', 'owned-abc', 'Phaze']) assert.ok(!txt.includes(bad), bad);
});
