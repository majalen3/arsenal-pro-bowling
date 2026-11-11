// P1.1 / P1.2 / P1.4: one saved bag, "Bring: N", role words, swap / bring-in / pin. Seed (starter arsenal) only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { seedEvents } from './fixtures/sample_arsenal.mjs';
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
// Live eval 2026-11-10: Bring used to swap a packed ball out (once the only ball with specs). Bring is now additive.
test('bringIn: always adds; a full bag grows to N+1; never swaps a ball out; blocked only for pro shop / retired', () => {
  const bag = P0.bags['bag-league'], n0 = ST.packedIds(P0, bag).length;
  const r1 = BE.bringIn(P0, bag, 'own-super-nova', n0 + 1); assert.equal(r1.out, null); assert.equal(r1.grew, null); assert.ok(r1.data.slots.some(s => s.owned === 'own-super-nova'));
  const r2 = BE.bringIn(P0, bag, 'own-super-nova', n0); assert.equal(r2.out, null); assert.equal(r2.grew, n0 + 1);
  for (const id of ST.packedIds(P0, bag)) assert.ok(r2.data.slots.some(s => s.owned === id), `kept ${id}`);
  let pinned = bag; for (const s of bag.slots) pinned = Object.assign({ id: bag.id }, BE.pin(pinned, s.owned, true));
  assert.equal(BE.bringIn(P0, pinned, 'own-super-nova', n0).grew, n0 + 1);
  const P1 = structuredClone(P0); P1.owned['own-super-nova'].status = 'proShop';
  assert.equal(BE.bringIn(P1, bag, 'own-super-nova', 3).blocked, 'status');
});
// The live-eval arsenal: one ball with specs (Super Nova) and three without (manual / unverified copies).
function evalArsenal() {
  const P = structuredClone(P0), keep = 'own-super-nova';
  for (const id of Object.keys(P.owned)) if (id !== keep) delete P.owned[id];
  for (const [id, name] of [['own-zz-1', 'ZZ Fake Pearl #1'], ['own-zz-2', 'ZZ Fake Pearl #2'], ['own-zz-3', 'ZZ Fake Test Ball Alpha']]) P.owned[id] = { id, name, catalogId: null, status: 'inBag' };
  return P;
}
test('Bring N up is additive: keeps every packed ball and adds Ready balls to the chosen count', () => {
  const P = evalArsenal(), bag = { id: ST.TONIGHT_BAG, slots: [{ owned: 'own-super-nova' }, { owned: 'own-zz-1' }, { owned: 'own-zz-2' }], spare: null };
  const r = BE.resize(P, bag, 4); assert.equal(r.size, 4); assert.deepEqual(r.removed, []); assert.deepEqual(r.added, ['own-zz-3']);
  assert.deepEqual(r.data.slots.map(s => s.owned).slice(0, 3), ['own-super-nova', 'own-zz-1', 'own-zz-2']);
  const r6 = BE.resize(P, bag, 6); assert.equal(r6.size, 4, 'capped by what you own, not shrunk');
});
test('Bring N down takes out balls without specs first and never the only ball with specs, the spare or a pinned ball', () => {
  const P = evalArsenal(), bag = { id: ST.TONIGHT_BAG, slots: [{ owned: 'own-super-nova' }, { owned: 'own-zz-1' }, { owned: 'own-zz-2', locked: true }, { owned: 'own-zz-3' }], spare: 'own-zz-3' };
  const r = BE.resize(P, bag, 2); const ids = r.data.slots.map(s => s.owned);
  assert.ok(ids.includes('own-super-nova'), 'the only modeled ball stays'); assert.ok(ids.includes('own-zz-2'), 'pinned stays'); assert.ok(ids.includes('own-zz-3'), 'spare stays');
  assert.deepEqual(r.removed, ['own-zz-1']); assert.equal(r.size, 3);
  const r1 = BE.resize(P, { id: 'b', slots: [{ owned: 'own-super-nova' }, { owned: 'own-zz-1' }], spare: null }, 1);
  assert.deepEqual(r1.data.slots.map(s => s.owned), ['own-super-nova']);
});
test('Suggest again tops up to Bring N: never proposes a one-ball bag when you own more', () => {
  const P = evalArsenal(), packed = ['own-super-nova', 'own-zz-1', 'own-zz-2'];
  const t = BE.topUp(P, { slots: ['own-super-nova'], spare: null }, 3, packed);
  assert.equal(t.slots.length, 3); assert.equal(t.slots[0], 'own-super-nova'); assert.ok(t.slots.includes('own-zz-1') && t.slots.includes('own-zz-2'));
  const one = BE.topUp(P, { slots: ['own-super-nova'], spare: null }, 3, []); assert.equal(one.slots.length, 3, 'filled from other Ready balls');
  const P1 = evalArsenal(); for (const id of ['own-zz-1', 'own-zz-2', 'own-zz-3']) delete P1.owned[id];
  assert.equal(BE.topUp(P1, { slots: ['own-super-nova'], spare: null }, 3, ['own-super-nova']).slots.length, 1, 'one ball only when you own one');
});
test('fromAnswer keeps 📌 Always bring and sets format from bring', () => {
  const bag = Object.assign({ id: 'b' }, BE.pin(P0.bags['bag-league'], 'own-rattler-big-bite', true));
  const a = A.advise(P0, { event: 'league', bring: 3, locked: ['own-rattler-big-bite'] });
  const d = BE.fromAnswer(P0, bag, { slots: a.rows.filter(r => r.role !== 'spare').map(r => r.ownedId), spare: a.rows.find(r => r.role === 'spare').ownedId }, { bring: 3, event: 'league' });
  assert.ok(d.slots.find(s => s.owned === 'own-rattler-big-bite').locked); assert.equal(d.format, 'league3'); assert.equal(d.bring, 3);
});
test('a fresh arsenal (every ball At home) still fills Bring N, as "grab from home"; Ready balls go first', () => {
  const P = evalArsenal(); for (const id of Object.keys(P.owned)) P.owned[id].status = 'benched';
  const r = BE.resize(P, { id: ST.TONIGHT_BAG, slots: [], spare: null }, 3);
  assert.equal(r.size, 3); assert.equal(r.added[0], 'own-super-nova', 'the ball with specs first'); assert.ok(r.data.slots.every(s => s.fromHome));
  assert.equal(ST.packedIds(P, r.data).length, 3, 'packed means packed: At-home slots count');
  P.owned['own-zz-3'].status = 'inBag';
  assert.equal(BE.resize(P, { id: 'b', slots: [], spare: null }, 1).added[0], 'own-zz-3', 'Ready to bring before At home');
});
