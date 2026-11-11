// owner t122u: every compared ball's drawn line finishes at the pocket (board 17.5) within a small tolerance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balls, modelOK } from '../../js/data.js';
import { S, HEAD_Y, xToBoard } from '../../js/engine.js';
import { fitToPocket, POCKET } from '../../js/cc/pocketfit.js';
const sample = balls.filter(modelOK).slice(0, 8);
test('each compared ball: drawn path ends at the head pin line on the pocket board (±0.5)', () => {
  assert.ok(sample.length >= 3);
  for (const b of sample) {
    const f = fitToPocket(b, { release: +S.release, aim: +S.aim }), last = f.result.points.at(-1);
    assert.ok(f.ok, `${b.name}: a line to the pocket exists`);
    assert.ok(Math.abs(last.y - HEAD_Y) < 1e-6, `${b.name}: path stops at the pins (y ${last.y})`);
    assert.ok(Math.abs(xToBoard(last.x) - POCKET) <= 0.5, `${b.name}: ends at board ${xToBoard(last.x).toFixed(2)}`);
    assert.ok(f.result.points.every(p => p.y >= HEAD_Y - 1e-6), `${b.name}: never wanders past the pins`);
  }
});
test('fit only changes inputs: a line already in the pocket is not refitted', () => {
  const b = sample[0], f = fitToPocket(b, { release: +S.release, aim: +S.aim }), g = fitToPocket(b, f.ov);
  assert.equal(g.fitted, false); assert.deepEqual(g.ov, f.ov);
});
test('a line that misses the pocket is fitted (aim/feet) so the drawn path still ends there', () => {
  let refit = 0;
  for (const b of sample) {
    const f = fitToPocket(b, { release: 20, aim: 6 }), last = f.result.points.at(-1);
    if (f.fitted) refit++;
    assert.ok(f.ok && Math.abs(xToBoard(last.x) - POCKET) <= 0.5 && Math.abs(last.y - HEAD_Y) < 1e-6, `${b.name}: ${xToBoard(last.x).toFixed(2)}`);
  }
  assert.ok(refit > 0, 'at least one line needed fitting');
});
