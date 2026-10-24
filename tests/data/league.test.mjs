import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../../js/cc/league.js';
test('handicap: floor((basis - avg) x pct), fractions dropped (USBC 100d-2g)', () => {
  assert.equal(L.handicap(160, { basis: 220, pct: 90 }), 54);
  assert.equal(L.handicap(165, { basis: 220, pct: 90 }), 49);   // 49.5 -> 49
  assert.equal(L.handicap(175, { basis: 200, pct: 100 }), 25);
  assert.equal(L.handicap(181, { basis: 210, pct: 80 }), 23);   // 23.2
  assert.equal(L.handicap(165.9, { basis: 220, pct: 100 }), 55); // average fraction dropped first
  assert.equal(L.handicap(null), null);
  assert.equal(L.handicap(''), null);
  assert.equal(L.handicap(160), 54);   // default 90% of 220
});
test('handicap above the basis: 0 unless the league allows negative', () => {
  assert.equal(L.handicap(231, { basis: 220, pct: 90 }), 0);
  assert.equal(L.handicap(231, { basis: 220, pct: 90, allowNeg: true }), -9);   // -9.9 -> -9
});
test('absentee and vacancy (USBC 112)', () => {
  const c = { basis: 220, pct: 90 };
  assert.deepEqual(L.spotScore({ status: 'absent', avg: 150 }, null, c), { kind: 'absent', scratch: 140, hdcp: 63, rule: '112e-1' });
  assert.deepEqual(L.spotScore({ status: 'absent', avg: null }, null, c), { kind: 'absent', scratch: 120, hdcp: 90, rule: '112e-3' });
  assert.deepEqual(L.spotScore({ status: 'vacancy' }, null, c), { kind: 'vacancy', scratch: 120, hdcp: 90, rule: '112d' });
  assert.equal(L.total(L.spotScore({ status: 'in', avg: 180 }, 200, c)), 236);
  assert.equal(L.total(L.spotScore({ status: 'in', avg: 180 }, null, c)), null);
});
test('nextUp rotates frames in lineup order and skips absent / finished', () => {
  const lu = [{ who: 'me', status: 'in' }, { who: 'a', status: 'absent' }, { who: 'b', status: 'in' }];
  assert.equal(L.nextUp(lu, {}).who, 'me');
  assert.equal(L.nextUp(lu, { me: 1 }).who, 'b');
  assert.equal(L.nextUp(lu, { me: 1, b: 1 }).who, 'me');
  assert.equal(L.nextUp(lu, { me: 10, b: 9 }).who, 'b');
  assert.equal(L.nextUp(lu, { me: 10, b: 10 }), null);
});
test('bakerOwner: frame f to the active lineup in turn', () => {
  const lu = [{ who: 'me', status: 'in' }, { who: 'a', status: 'in' }, { who: 'b', status: 'vacancy' }, { who: 'c', status: 'in' }];
  assert.deepEqual([1, 2, 3, 4, 10].map(f => L.bakerOwner(f, lu).who), ['me', 'a', 'c', 'me', 'me']);
  assert.equal(L.bakerOwner(1, []), null);
});
test('teamTotal and lineupOf', () => {
  assert.deepEqual(L.teamTotal([{ scratch: 200, hdcp: 18 }, { scratch: 140, hdcp: 63 }]), { done: true, scratch: 340, hdcp: 81, total: 421 });
  assert.equal(L.teamTotal([{ scratch: null, hdcp: 5 }]).done, false);
  const lu = L.lineupOf({ myAvg: '172', team: [{ who: 't1', name: 'Ann', avg: 150 }, { who: 't2', status: 'vacancy' }, { who: 't3', name: 'X' }, { who: 't4', name: 'too many' }] });
  assert.deepEqual(lu.map(b => b.name), ['You', 'Ann', 'Vacancy', 'X']);
  assert.equal(lu[0].avg, 172);
});
