// P1.1 / P1.2 / P1.4: one saved bag, "Bring: N", role words, swap / bring-in / pin. Seed (starter arsenal) only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { seedEvents } from '../../js/data/seed.js';
import { project } from '../../js/data/project.js';
import * as A from '../../js/cc/advisor.js';
import * as BE from '../../js/cc/bagedit.js';
import * as ST from '../../js/cc/status.js';
const P0 = project(seedEvents({ now: 1000 }));
const ROLE = ['Start ball', 'If it hooks early', 'If it stops hooking', 'For heavy oil', 'Spares', 'Specs to check'];
test('Bring defaults count the spare; bringOf accepts any whole number incl. 7, rejects junk', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(A.EVENTS).map(([k, e]) => [k, e.bring])), { league: 3, tournament: 6, practice: 3, newCenter: 3, sport: 6 });
  assert.equal(A.bringOf('7'), 7); assert.equal(A.bringOf(2.6), 3); assert.equal(A.bringOf(0), null); assert.equal(A.bringOf('x'), null); assert.equal(A.bringOf(99), 20);
});
test('advise(bring) sizes the bag incl. the spare; capped by what is In my bag', () => {
  for (const n of [2, 3, 4, 6]) assert.equal(A.advise(P0, { event: 'league', bring: n }).rows.length, n, `bring ${n}`);
  const inBag = Object.values(P0.owned).filter(ST.inMyBag).length;
  assert.equal(A.advise(P0, { event: 'league', bring: 7 }).rows.length, inBag);
  assert.equal(A.advise(P0, { event: 'league', bring: 3 }).rows.at(-1).role, 'spare');
});
test('role words: one Start ball, spare reads Spares, every row has a label and one line', () => {
  const a = A.advise(P0, { event: 'tournament' });
  assert.equal(a.rows.filter(r => r.label === 'Start ball').length, 1); assert.equal(a.rows.at(-1).label, 'Spares');
  for (const r of a.rows) { assert.ok(ROLE.includes(r.label), r.label); assert.ok(r.line && r.line.length > 5); }
});
test('fixed: the saved bag is used as-is (no refill), filtered to offered balls', () => {
  const bag = P0.bags['bag-league'], ids = ST.packedIds(P0, bag);
  const a = A.advise(P0, { event: 'league', fixed: { slots: ids, spare: bag.spare } });
  assert.deepEqual(a.rows.map(r => r.ownedId).sort(), ids.slice().sort());
});
test('formatOfBring', () => { assert.deepEqual([2, 3, 4, 6, 7].map(BE.formatOfBring), ['league3', 'league3', 'league4', 'tournament6', 'custom']); });
test('swap: replacement takes the slot; At home ball tagged fromHome; no id/ts leak', () => {
  const bag = P0.bags['bag-league'], d = BE.swap(P0, bag, 'own-hy-road-pearl', 'own-guru-supreme');
  assert.equal(d.id, undefined); assert.equal(d.ts, undefined);
  const s = d.slots.find(x => x.owned === 'own-guru-supreme'); assert.ok(s && s.fromHome); assert.ok(!d.slots.some(x => x.owned === 'own-hy-road-pearl'));
  assert.equal(d.spare, bag.spare);
});
test('bringIn: adds while room, else swaps the closest unpinned non-spare; blocked for pro shop / all pinned', () => {
  const bag = P0.bags['bag-league'];
  const r1 = BE.bringIn(P0, bag, 'own-super-nova', 4); assert.equal(r1.out, null); assert.ok(r1.data.slots.some(s => s.owned === 'own-super-nova'));
  const r2 = BE.bringIn(P0, bag, 'own-super-nova', 3); assert.ok(r2.out && r2.out !== bag.spare); assert.equal(r2.data.slots.length, bag.slots.length);
  let pinned = bag; for (const s of bag.slots) pinned = Object.assign({ id: bag.id }, BE.pin(pinned, s.owned, true));
  assert.equal(BE.bringIn(P0, pinned, 'own-super-nova', 3).blocked, 'pinned');
  const P1 = structuredClone(P0); P1.owned['own-super-nova'].status = 'proShop';
  assert.equal(BE.bringIn(P1, bag, 'own-super-nova', 3).blocked, 'status');
});
test('fromAnswer keeps 📌 Always bring and sets format from bring', () => {
  const bag = Object.assign({ id: 'b' }, BE.pin(P0.bags['bag-league'], 'own-rattler-big-bite', true));
  const a = A.advise(P0, { event: 'league', bring: 3, locked: ['own-rattler-big-bite'] });
  const d = BE.fromAnswer(P0, bag, { slots: a.rows.filter(r => r.role !== 'spare').map(r => r.ownedId), spare: a.rows.find(r => r.role === 'spare').ownedId }, { bring: 3, event: 'league' });
  assert.ok(d.slots.find(s => s.owned === 'own-rattler-big-bite').locked); assert.equal(d.format, 'league3'); assert.equal(d.bring, 3);
});
