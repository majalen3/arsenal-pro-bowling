import test from 'node:test'; import assert from 'node:assert/strict';
import { shouldHold, TEXT_SIZES, IDLE_MS } from '../../js/cc/wake.js';
test('wake lock only while a game is open, default on', () => {
  assert.equal(shouldHold(true, undefined), true);
  assert.equal(shouldHold(true, false), false);
  assert.equal(shouldHold(false, true), false);
  assert.equal(IDLE_MS, 600000);
});
test('text sizes scale the rem base', () => { assert.deepEqual(Object.keys(TEXT_SIZES), ['normal', 'large', 'xl']); assert.equal(TEXT_SIZES.xl, '125%'); });
