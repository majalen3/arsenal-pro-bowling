// v76 (owner t140u): the Forgiving line sweep. Read-only on the engine (find/forgive go through analyze -> simulatePath); seeded, so exact.
import test from 'node:test';
import assert from 'node:assert/strict';
import { balls } from '../../js/data.js';
import * as F from '../../js/cc/strikeline.js';
import { AIM_MAX, aimFor } from '../../js/cc/geom.js';

const ball = balls.find(b => /Rattler Big Bite/.test(b.name));
const profile = { speed: 16, rev: 250, ft: 38, start: { lay: 10, arr: 10.5 } };
const run = (miss, o = {}) => F.forgive(ball, Object.assign({}, profile, { miss }, o));

test('deterministic: the same profile and seed give the same lines and percentages', () => {
  const a = run(1.5), b = run(1.5); a.ms = b.ms = 0; assert.deepEqual(a, b);
  assert.notDeepEqual(run(1.5, { seed: 7 }).forgiving.pocket, undefined);
});
test('Forgiving beats the Standard line (the bowler\u2019s start line) at every miss size on the test profile', () => {
  for (const m of F.MISS_CHOICES) { const r = run(m); assert.ok(r.forgiving.pocket > r.standard.pocket, `miss ${m}: ${r.forgiving.pocket} vs ${r.standard.pocket}`); assert.equal(r.same, false); assert.equal(r.forgiving.kind, 'forgiving'); }
});
test('same shots for both lines: Standard in forgive() equals Standard from find() with the same spread, seed and n', () => {
  const r = run(2), f = F.find(ball, { speed: 16, rev: 250, ft: 38, spread: F.withMiss(null, 2), start: profile.start });
  assert.equal(r.standard.pocket, f.best.pocket); assert.equal(r.standard.lay, 10);
});
test('if nothing beats the Standard line, Forgiving IS the Standard line and says so', () => {
  const f = run(1.5).forgiving, r = F.forgive(ball, Object.assign({}, profile, { miss: 1.5, start: { lay: f.lay, arr: f.arrows } }));
  assert.equal(r.same, true); assert.equal(r.forgiving.pocket, r.standard.pocket); assert.equal(r.forgiving.lay, f.lay); assert.equal(r.forgiving.arrows, f.arrows);
});
test('respects bounds: stand 5-30, target on the lane and reachable with the engine\u2019s aim range, and the line really enters the pocket window', () => {
  for (const m of [0.5, 1, 1.5, 2, 3, 4, 9, -3]) { const r = run(m), f = r.forgiving;
    assert.ok(f.lay >= 5 && f.lay <= 30, `lay ${f.lay}`); assert.ok(f.arrows >= 1 && f.arrows <= 39, `arrows ${f.arrows}`);
    assert.ok(Math.abs(aimFor(f.lay, f.arrows).aim) <= AIM_MAX + 1e-9);
    if (!r.same) assert.ok(f.entry >= F.WINDOW[0] - 0.05 && f.entry <= F.WINDOW[1] + 0.05, `a found line enters 17-18: ${f.entry}`);   // when same, it is the bowler\u2019s own line, which may sit outside
    assert.ok(f.pocket >= 0 && f.pocket <= 100); }
});
test('miss size input is clamped to 0.5-4 boards and null keeps the measured/assumed value', () => {
  assert.equal(F.withMiss(null, 9).arrows.v, F.MISS_MAX); assert.equal(F.withMiss(null, 0).arrows.v, F.MISS_MIN); assert.equal(F.withMiss(null, -2).arrows.v, F.MISS_MIN);
  assert.equal(F.withMiss(null, null).arrows.v, F.ASSUMED.arrows); assert.equal(F.withMiss(null, 'x').arrows.v, F.ASSUMED.arrows); assert.equal(F.withMiss(null, 2).arrows.src, 'user');
  const dev = F.spreadFrom({ aggregates: [{ date: '2026-01-01', totalShots: 40, kpis: [{ key: 'arrowsDifference', value: 2 }] }] }); assert.equal(F.withMiss(dev, null).arrows.src, 'device'); assert.equal(F.withMiss(dev, 1).arrows.src, 'user');
});
test('a bigger miss never makes a line look better: pocket % is non-increasing in miss size for both lines', () => {
  const rs = F.MISS_CHOICES.map(m => run(m));
  for (let i = 1; i < rs.length; i++) { assert.ok(rs[i].standard.pocket <= rs[i - 1].standard.pocket, `standard ${i}`); assert.ok(rs[i].forgiving.pocket <= rs[i - 1].forgiving.pocket, `forgiving ${i}`); }
});
test('miss room: room = the smaller side, sides in half boards, and left/right follow the hand (higher boards are left for a right-hander)', () => {
  const r = run(1.5).forgiving; assert.equal(r.room, Math.min(r.roomHi, r.roomLo));
  for (const v of [r.roomHi, r.roomLo]) assert.ok(v >= 0 && v <= 4 && (v * 2) % 1 === 0);
  const c = { roomHi: 2, roomLo: 1 };
  assert.deepEqual(F.missRoom(c, false), { left: 2, right: 1 }); assert.deepEqual(F.missRoom(c, true), { left: 1, right: 2 });
  const std = F.find(ball, { speed: 16, rev: 250, ft: 38 }); assert.equal(std.best.room, Math.min(std.best.roomHi, std.best.roomLo));
});
test('no line for a ball without verified specs, and no strike % anywhere in the result', () => {
  assert.equal(F.forgive({ id: 'x', name: 'x' }, profile).none, true);
  assert.ok(!('strike' in run(1.5).forgiving) && !('strikePct' in run(1.5).forgiving));
});
test('cheap: the sweep stays well inside the phone budget (Node here is ~4x faster than the throttled phone profile; limit 150 ms)', () => {
  run(1.5); const t = performance.now(); run(1.5, { seed: 5 }); assert.ok(performance.now() - t < 150, `${performance.now() - t} ms`);
});
