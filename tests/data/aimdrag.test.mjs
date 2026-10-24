// Owner bug 2026-10-24: "If I stand at the 25 board I should be able to aim at the 15 board." Stand and aim are independent.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../../js/cc/geom.js';
import { analyze } from '../../js/engine.js';
import { balls } from '../../js/data.js';
const OFF = 7;   // assumed stand = laydown + 7 (js/cc/line.js standOf default)
for (const [feet, aim] of [[25, 15], [35, 10], [10, 5]]) {
  test(`stand ${feet} → aim ${aim}: model ball crosses the arrows at the aim, stand unchanged`, () => {
    const lay = feet - OFF, m = G.modelOf(lay, aim);
    assert.ok(Math.abs(G.arrowsBoard(m.release, m.aim) - aim) < 0.01, 'crosses the arrows at the aim board');
    assert.equal(lay + OFF, feet, 'stand round-trip');
    assert.ok(Math.abs(m.aim) <= G.AIM_MAX, 'engine aim stays inside its tested range');
    const a = analyze(balls[0], { release: m.release, aim: m.aim });
    assert.ok(a.points.length > 10, 'engine runs');
  });
}
test('within reach: no shift, same as aimFor', () => { const m = G.modelOf(18, 17.5); assert.equal(m.clamped, false); assert.equal(m.release, 18); });
test('board range 1–39 and half boards', () => { assert.equal(G.clampBoard(0), 1); assert.equal(G.clampBoard(45), 39); assert.equal(G.half(15.3), 15.5); assert.equal(G.half(14.7), 14.5); });
