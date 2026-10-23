// CC0 Tonight decision core: golden scenarios (COMMAND_CENTER_PLAN §2). The owner's reported Tournament 6 is the fixture;
// expectations were worked by hand from the rules, then frozen.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as R from '../../js/cc/rank.js';
import { modelLine, presetFor } from '../../js/cc/model.js';
import { S } from '../../js/engine.js';
import { balls } from '../../js/data.js';
const IDX = JSON.parse(fs.readFileSync(new URL('../../data/patterns-index.json', import.meta.url))).rows;
const TERT = R.tertiles(IDX);
const pat = slug => { const r = IDX.find(x => x[0] === slug); return { slug, name: r[1], ft: r[3], ratio: r[4], ml: r[5] }; };
const B = (o, c, extra = {}) => Object.assign({ ownedId: 'own-' + o, catalogId: c }, extra);
const T6 = [B('rattler-big-bite', 'rattler-big-bite', { benchmark: true }), B('super-nova', 'super-nova'), B('ordnance-c4', 'ordnance-c4'), B('hy-road-pearl', 'hy-road-pearl'), B('deadly-rattler', 'deadly-rattler')];
const L3 = [T6[0], T6[3]];
const pick = (bag, ctx) => R.rank(bag, ctx).pick.id.slice(4);
const golden = [
  // [name, demand ctx, bag, benchFirst, expected pick, expected weaker, expected stronger]
  ['G01 unknown pattern → benchmark first', { pattern: null }, T6, 'pattern unknown', 'rattler-big-bite', 'ordnance-c4', 'super-nova'],
  ['G02 house 38 ft assumed, synthetic, fresh → C4 (level 3)', { pattern: R.HOUSE_ASSUMED, surface: 'synthetic' }, T6, null, 'ordnance-c4', 'deadly-rattler', 'rattler-big-bite'],
  ['G03 house 38 ft, wood → demand 2 → Deadly Rattler', { pattern: R.HOUSE_ASSUMED, surface: 'wood' }, T6, null, 'deadly-rattler', null, 'ordnance-c4'],
  ['G04 2026 PBA Badger 50 ft heavy volume → Super Nova', { pattern: pat('2026-pba-badger'), surface: 'synthetic' }, T6, null, 'super-nova', 'rattler-big-bite', null],
  ['G05 Badger, transition → Big Bite', { pattern: pat('2026-pba-badger'), stage: 'transition' }, T6, null, 'rattler-big-bite', 'ordnance-c4', 'super-nova'],
  ['G06 Badger, burn → C4', { pattern: pat('2026-pba-badger'), stage: 'burn' }, T6, null, 'ordnance-c4', 'deadly-rattler', 'rattler-big-bite'],
  ['G07 PBA Bat 37 ft but low volume (24.5 mL) → demand 2 → Deadly Rattler', { pattern: pat('2026-pba-bat') }, T6, null, 'deadly-rattler', null, 'ordnance-c4'],
  ['G08 Bat on wood → demand 2 → Deadly Rattler', { pattern: pat('2026-pba-bat'), surface: 'wood' }, T6, null, 'deadly-rattler', null, 'ordnance-c4'],
  ['G09 Bear 38 ft high volume → Big Bite', { pattern: pat('2026-pba-bear') }, T6, null, 'rattler-big-bite', 'ordnance-c4', 'super-nova'],
  ['G10 new center overrides: benchmark first even on a short pattern', { pattern: pat('2026-pba-bat'), surface: 'wood' }, T6, 'new center', 'rattler-big-bite', 'ordnance-c4', 'super-nova'],
  ['G11 League 3 on the assumed house shot → Big Bite (4 and 2 tie on distance; hybrid beats pearl)', { pattern: R.HOUSE_ASSUMED }, L3, null, 'rattler-big-bite', 'hy-road-pearl', null],
  ['G12 League 3 on wood burn → Hy-Road Pearl', { pattern: pat('2026-pba-bat'), surface: 'wood', stage: 'burn' }, L3, null, 'hy-road-pearl', null, 'rattler-big-bite'],
];
for (const [name, dctx, bag, bf, p, w, s] of golden) test(name, () => {
  const d = R.demandOf(Object.assign({ tert: TERT }, dctx)), r = R.rank(bag, { demand: d.demand, benchFirst: bf });
  assert.equal(r.pick.id, 'own-' + p); assert.equal(r.weaker ? r.weaker.id : null, w ? 'own-' + w : null); assert.equal(r.stronger ? r.stronger.id : null, s ? 'own-' + s : null);
  for (const it of r.order) { assert.ok(it.why.length >= 2, it.id + ' has ≥2 why-lines'); for (const y of it.why) assert.ok(y.src && y.t, 'every why-line is labelled'); }
});
test('G13 demand: house shot is labelled assumed and volume unknown', () => {
  const d = R.demandOf({ pattern: null }); assert.equal(d.demand, 3); assert.equal(d.assumed, true); assert.ok(d.why.some(w => /Volume unknown/.test(w.t) && w.src === R.SRC.assumed));
});
test('G14 demand clamps to 1..5', () => {
  assert.equal(R.demandOf({ pattern: { ft: 32, ml: 10 }, tert: TERT, surface: 'wood', stage: 'burn' }).demand, 1);
  assert.equal(R.demandOf({ pattern: { ft: 52, ml: 40 }, tert: TERT }).demand, 5);
});
test('G15 read: too early → one step weaker; too weak → one step stronger', () => {
  const r = R.rank(T6, { demand: 4 });
  assert.equal(R.readMove(r, 'own-rattler-big-bite', 'early').id, 'own-ordnance-c4');
  assert.equal(R.readMove(r, 'own-rattler-big-bite', 'weak').id, 'own-super-nova');
  assert.equal(R.readMove(r, 'own-super-nova', 'weak'), null);
});
test('G16 read: too angular → smoother at a similar level; too smooth → more angular', () => {
  const r = R.rank(T6, { demand: 3 });
  assert.equal(R.readMove(r, 'own-hy-road-pearl', 'angular').id, 'own-ordnance-c4');
  assert.equal(R.readMove(r, 'own-ordnance-c4', 'smooth').id, 'own-deadly-rattler');
});
test('G17 Rule of 31: 41 ft → board 10; 47 ft → 16 inside long band; 50 ft → 19 conflicts with 13-16, both shown', () => {
  assert.equal(R.rule31(41).target, 10); assert.equal(R.rule31(41).band, null);
  const a = R.rule31(47); assert.equal(a.target, 16); assert.equal(a.conflict, false);
  const b = R.rule31(50); assert.equal(b.target, 19); assert.equal(b.conflict, true); assert.match(b.text, /Both shown/);
});
test('G18 triggers: 2 of 3 high → feet 2 left eyes 1 left (RH); light → right; LH mirrored', () => {
  assert.match(R.trigger([{ miss: 'high' }, { miss: 'good' }, { miss: 'high' }]).text, /feet 2 left, eyes 1 left/);
  assert.match(R.trigger([{ miss: 'light' }, { miss: 'light' }]).text, /feet 2 right/);
  assert.match(R.trigger([{ miss: 'high' }, { miss: 'high' }], { hand: 'left' }).text, /feet 2 right/);
  assert.equal(R.trigger([{ miss: 'high' }, { miss: 'good' }, { miss: 'light' }]), null);
  assert.equal(R.trigger([{ miss: 'high' }, { miss: 'good' }, { miss: 'good' }, { miss: 'high' }]), null, 'window is the last 3');
});
test('G19 trigger: two "too early" reads → Plan B', () => assert.equal(R.trigger([{ read: 'early' }, { miss: 'good' }, { read: 'early' }]).kind, 'planB'));
test('G20 plan A/B/C walks weaker', () => {
  const p = R.plan(R.rank(T6, { demand: 5 }), null);
  assert.equal(p.A.id, 'own-super-nova'); assert.equal(p.B.id, 'own-rattler-big-bite'); assert.equal(p.C.id, 'own-ordnance-c4');
});
test('G21 spec-TBD ball (Rack Attack, unlinked) is ranked last-but-listed, gets "spec TBD" and 0 model lines', () => {
  const r = R.rank([...T6, B('rack-attack', null, { name: 'Rack Attack' })], { demand: 3 });
  const ra = r.order.find(x => x.id === 'own-rack-attack');
  assert.equal(r.order[r.order.length - 1], ra); assert.equal(ra.level, null); assert.ok(ra.why.some(w => /spec TBD/.test(w.t)));
  assert.equal(modelLine(null).none, true);
  assert.equal(R.readMove(r, 'own-rack-attack', 'early'), null);
});
test('G22 stroker prefers asym, cranker prefers sym on equal level', () => {
  const bag = [B('a', 'astrophysix'), B('c', 'rattler-nu')];   // both medium (3): asym pearl vs sym hybrid
  assert.equal(pick(bag, { demand: 3, style: 'stroker' }), 'a');
  assert.equal(pick(bag, { demand: 3, style: 'cranker' }), 'c');
});
test('G23 benchFirstReason precedence', () => {
  assert.equal(R.benchFirstReason({ patternKnown: false }), 'pattern unknown');
  assert.equal(R.benchFirstReason({ patternKnown: true, centerKnown: true, centerNew: true }), 'new center');
  assert.equal(R.benchFirstReason({ patternKnown: true, centerKnown: true, tournamentFirstGame: true }), 'first game of the block');
  assert.equal(R.benchFirstReason({ patternKnown: true, centerKnown: true }), null);
});
test('G24 3-6-9 (USBC): RH and LH boards for all 10 pins from strike 20', () => {
  const rh = { 1: 20, 5: 20, 2: 17, 8: 17, 4: 14, 7: 11, 3: 23, 9: 23, 6: 26, 10: 29 }, lh = { 1: 20, 5: 20, 2: 23, 8: 23, 4: 26, 7: 29, 3: 17, 9: 17, 6: 14, 10: 11 };
  for (let p = 1; p <= 10; p++) { assert.equal(R.spareFor(p, 20, 'right').board, rh[p]); assert.equal(R.spareFor(p, 20, 'left').board, lh[p]); }
  assert.equal(R.spareFor(10, 18, 'right').board, 27);
});
test('G25 model: nearest preset by length; engine globals restored; Big Bite on 41 ft gives a line with holds x of 6', () => {
  assert.equal(presetFor(38), 'house'); assert.equal(presetFor(41), 'sport'); assert.equal(presetFor(35), 'cheetah'); assert.equal(presetFor(50), 'shark');
  const before = JSON.stringify(S);
  const m = modelLine(balls.find(b => b.id === 'rattler-big-bite'), { ft: 41 });
  assert.equal(JSON.stringify(S), before);
  assert.equal(m.none, false); assert.ok(m.holds >= 0 && m.holds <= 6); assert.equal(m.of, 6); assert.ok(m.feet >= 5 && m.feet <= 30);
});
test('G26 the decision core is fast: 6 balls rank + model lines < 1 s', () => {
  const t = performance.now();
  const r = R.rank(T6, { demand: 3 }); for (const it of r.order) modelLine(it.cat, { ft: 38 });
  assert.ok(performance.now() - t < 1000);
});
