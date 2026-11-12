// v75 (owner t134u): the caches added by the performance pass are exact, bounded and invalidate correctly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { isSplit, isSplitRaw, splitMemoSize } from '../../js/data/scoring.js';
import { registerOwned, ballFor } from '../../js/cc/cats.js';
import { balls } from '../../js/data.js';
import { createDB } from '../../js/data/db.js';
import { memoryBackend } from '../../js/data/idb.js';
import { mkEvent } from '../../js/data/events.js';
import * as PERF from '../../js/perf.js';

test('isSplit memo is identical to the uncached rule for every possible leave (1,023 sets), in any order, with repeats', () => {
  for (let m = 1; m < 1024; m++) {
    const pins = []; for (let p = 1; p <= 10; p++) if (m & (1 << (p - 1))) pins.push(p);
    const want = isSplitRaw(pins);
    assert.equal(isSplit(pins), want, 'first ask ' + pins);
    assert.equal(isSplit(pins.slice().reverse()), want, 'reversed ' + pins);
    assert.equal(isSplit(pins.concat(pins)), want, 'duplicated ' + pins);
    assert.equal(isSplit(pins.map(String)), want, 'strings ' + pins);
  }
  assert.ok(splitMemoSize() <= 1024, 'bounded by the number of leaves: ' + splitMemoSize());
});
test('isSplit: the textbook leaves', () => {
  assert.equal(isSplit([7, 10]), true); assert.equal(isSplit([5, 6]), true); assert.equal(isSplit([3, 10]), true); assert.equal(isSplit([2, 4]), false);
  assert.equal(isSplit([1, 2]), false); assert.equal(isSplit([]), false); assert.equal(isSplit([7]), false);
});

test('legacyLineKey counts copies per catalog id and follows the registered projection (no stale count)', () => {
  const c = balls[0].id, mk = (id, cat) => ({ id, catalogId: cat, name: id });
  registerOwned({ owned: { a: mk('a', c) } });
  assert.equal(ballFor('a').legacyLineKey, c);
  registerOwned({ owned: { a: mk('a', c), b: mk('b', c) } });
  assert.equal(ballFor('a').legacyLineKey, null, 'two copies of one model: no legacy line key');
  registerOwned({ owned: { b: mk('b', c) } });
  assert.equal(ballFor('b').legacyLineKey, c, 'back to one copy');
  registerOwned({ owned: { a: mk('a', c), d: mk('d', balls[1].id) } });
  assert.equal(ballFor('d').legacyLineKey, balls[1].id); assert.equal(ballFor('a').legacyLineKey, c);
});

test('db.projection() is the same object until the log changes, then a new one (what hub.proj keys registerOwned on)', async () => {
  const db = await createDB(memoryBackend()).open();
  const a = db.projection(); assert.equal(db.projection(), a, 'cached');
  await db.append([mkEvent('session.created', 's1', { kind: 'tonight' })]);
  const b = db.projection(); assert.notEqual(b, a, 'append invalidates'); assert.equal(db.projection(), b);
  await db.append([mkEvent('session.created', 's1', { kind: 'tonight' })].map(e => Object.assign({}, e, { id: 'dup' })));
  await db.wipe(); assert.notEqual(db.projection(), b, 'wipe invalidates');
});

test('perf helper is a no-op unless switched on: no entries, no globals, no network', () => {
  assert.equal(PERF.ON, false);
  assert.equal(PERF.span('x')(), 0); assert.equal(PERF.timed('y', () => 7), 7); PERF.mark('m'); PERF.count('c'); PERF.tapToPaint('t')();
  assert.deepEqual(PERF.summary(), []); assert.equal(typeof globalThis.__perf, 'undefined');
});
