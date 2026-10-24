// M2 own / house pattern entry (js/cc/ownpat.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as O from '../../js/cc/ownpat.js';
test('any name is accepted; details optional and sanity-checked', () => {
  assert.deepEqual(O.ownPattern(' Fridays  house '), { pickId: null, patternSlug: 'own-fridays-house', patternName: 'Fridays house', ft: null, ml: null, ratio: null, patternOwn: true });
  const p = O.ownPattern('Tuesday league', { ft: '41', ml: '24,5', ratio: '3 to 1' });
  assert.equal(p.ft, 41); assert.equal(p.ml, 24.5); assert.equal(p.ratio, 3);
  const bad = O.ownPattern('x', { ft: 900, ml: -2, ratio: 'lots' }); assert.equal(bad.ft, null); assert.equal(bad.ml, null); assert.equal(bad.ratio, null);
  assert.equal(O.ownPattern('   '), null); assert.equal(O.ownPattern('!!!'), null);
});
test('labels: an unknown length says so and names the 38 ft assumption', () => {
  assert.equal(O.ownLabel(O.ownPattern('House')), 'your entry \u00b7 length not entered, 38 ft assumed');
  assert.equal(O.ownLabel(O.ownPattern('House', { ft: 40 })), 'your entry \u00b7 40 ft');
  assert.equal(O.ownLabel({ patternName: '2026 PBA Shark', ft: 48 }), null);
  assert.equal(O.patOf(O.ownPattern('House')), null); assert.equal(O.patOf(O.ownPattern('House', { ft: 40 })).own, true);
  assert.equal(O.cleanRatio('10'), 10); assert.equal(O.cleanRatio('3.5:1'), 3.5); assert.equal(O.cleanRatio('0'), null);
});
