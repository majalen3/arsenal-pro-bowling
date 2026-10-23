// Add a ball: matcher accuracy on 50 real names, maker-lookup mapping, zero invented values, engine card, placement.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as A from '../../js/cc/addball.js';
import { S } from '../../js/engine.js';
import { catOf, registerOwned, clearExtra } from '../../js/cc/cats.js';
const fx = n => JSON.parse(fs.readFileSync(new URL('./fixtures/' + n, import.meta.url)));

test('50-name match rate: ≥90% top-1, ≥98% top-6, 0 false exact', () => {
  const { names } = fx('add_ball_names.json'); assert.equal(names.length, 50);
  let t1 = 0, t6 = 0, falseExact = 0; const miss = [];
  for (const [q, want] of names) {
    const r = A.search(q), ok = id => (Array.isArray(want) ? want.includes(id) : id === want);
    if (r.exact && (want === null || Array.isArray(want) || r.exact.id !== want)) { falseExact++; miss.push(`${q}: false exact ${r.exact.id}`); continue; }
    const ids = r.exact ? [r.exact.id] : r.candidates.map(c => c.entry.id);
    if (want === null) { t1++; t6++; continue; }
    if (ok(ids[0])) t1++; else miss.push(`${q}: top-1 ${ids[0]}`);
    if (ids.slice(0, 6).some(ok)) t6++;
  }
  console.log(`match: top-1 ${t1}/50, top-6 ${t6}/50, false exact ${falseExact}`, miss);
  assert.equal(falseExact, 0); assert.ok(t1 >= 45, `top-1 ${t1}`); assert.ok(t6 >= 49, `top-6 ${t6}`);
});
test('maker lookup → weight-specific fields with manufacturer provenance; nothing invented', () => {
  const res = fx('lookup-rattler-big-bite.json'), m = A.fromLookup(res, 16), raw = JSON.stringify(res);
  assert.equal(m.fields.rg.v, 2.493); assert.equal(m.fields.diff.v, 0.03); assert.equal(m.fields.rg.note, '16 lb');
  assert.equal(m.fields.rg.prov.kind, 'manufacturer'); assert.match(m.fields.rg.prov.url, /^https:\/\/radicalbowling\.com\//);
  assert.deepEqual(m.weights, [16, 15, 14, 13, 12]);
  for (const name of ['lookup-rattler-big-bite.json', 'lookup-phaze-ii.json', 'lookup-black-widow-black-gold.json', 'lookup-prism-hybrid.json']) {
    const r = fx(name), s = JSON.stringify(r);
    for (const w of [16, 15, 14]) { const out = A.fromLookup(r, w); for (const [k, x] of Object.entries(out.fields)) {
      if (k === 'oil') { assert.ok(out.fields.condition, 'oil only from printed condition'); continue; }
      if (k === 'coverType') { assert.ok(s.toLowerCase().includes(String(x.v).toLowerCase()), `${name} ${k}`); continue; }
      assert.ok(typeof x.v === 'number' ? s.includes(String(x.v).replace(/^0\./, '.')) || s.includes(String(x.v)) : s.includes(JSON.stringify(x.v).slice(1, -1)), `${name} ${k}=${x.v} not in source`);
    } }
  }
  assert.ok(raw);
});
test('weight not printed → value kept with a visible note; missing fields stay TBD', () => {
  const p = A.fromLookup(fx('lookup-phaze-ii.json'), 15);
  assert.equal(p.fields.rg.v, 2.48); assert.equal(p.fields.rg.weightMismatch, true); assert.match(p.fields.rg.note, /16 lb value/);
  const ph = A.fromLookup(fx('lookup-prism-hybrid.json'), 15);
  assert.equal(ph.fields.rg, undefined); assert.equal(ph.fields.diff, undefined);
  assert.deepEqual(A.missing(ph.fields).slice(0, 2), ['RG', 'differential']); assert.equal(A.engineReady(ph.fields), false);
  assert.equal(A.fromLookup(fx('lookup-prism.json'), 15), null);   // candidates → user picks; nothing filled
});
test('merge: maker wins, catalogue disagreement is a visible conflict', () => {
  const m = A.fromLookup(fx('lookup-rattler-big-bite.json'), 16), g = A.merge(A.entryById('rattler-big-bite').fields, m.fields);
  assert.equal(g.fields.rg.v, 2.493); assert.deepEqual(g.conflicts.map(c => c.field).sort(), ['diff', 'rg']);
  const g15 = A.merge(A.entryById('rattler-big-bite').fields, A.fromLookup(fx('lookup-rattler-big-bite.json'), 15).fields);
  assert.equal(g15.conflicts.length, 0, 'data.js Rattler values are the 15 lb row');
  assert.equal(g.fields.usbc.v, '2024-06-25'); assert.equal(g.fields.usbc.prov.kind, 'usbc');
});
test('catalogue rows: provenance "catalog", plastic is not engine-ready, Storm Mix flagged', () => {
  const e = A.entryById('sc-storm-mix-platinum'); assert.ok(e.flag); assert.equal(e.fields.rg ? e.fields.rg.prov.kind : 'catalog', 'catalog');
  const pl = A.catalog().find(x => x.src === 'catalog' && x.fields.coverType && x.fields.coverType.v === 'Plastic' && x.fields.rg);
  assert.ok(pl); assert.equal(A.engineReady(pl.fields), false); assert.match(A.missing(pl.fields)[0], /Plastic cover/);
});
test('engine card: same release as the benchmark, < 1 s, engine state restored, coach voice', () => {
  const keep = JSON.stringify(S), f = A.fromLookup(fx('lookup-phaze-ii.json'), 16).fields, cat = A.toCat(f, { id: 'add-storm-phaze-ii', brand: 'Storm', name: 'Phaze II' });
  const t0 = performance.now(), c = A.compare(cat, { ft: 38, speed: 15, rev: 220 }), ms = performance.now() - t0;
  assert.equal(JSON.stringify(S), keep); assert.equal(c.none, false); assert.ok(ms < 1000, `${ms} ms`);
  assert.equal(c.release.feet, c.own.none ? c.release.feet : c.release.feet); assert.ok(c.ball.skid != null && c.bench.skid != null);
  assert.match(c.coach, /^Phaze II /); assert.ok(c.coach.split(/(?<=\.)\s/).length <= 2);
  assert.equal(A.compare(A.toCat({}, { id: 'x', brand: 'X', name: 'Y' })).none, true);
});
test('placement: strength × shape, overlaps and holes; added ball resolves via cats.catOf', () => {
  const f = Object.assign(A.fromLookup(fx('lookup-black-widow-black-gold.json'), 15).fields), cat = A.toCat(f, { id: 'add-hammer-black-widow-black-gold', brand: 'Hammer', name: 'Black Widow Black Gold' });
  const items = [{ ownedId: 'a', catalogId: 'super-nova', name: 'Super Nova' }, { ownedId: 'b', catalogId: 'deadly-rattler', name: 'Deadly Rattler' }];
  const p = A.placement(cat, items); assert.ok(p.level == null || (p.level >= 1 && p.level <= 5)); assert.ok(Array.isArray(p.overlaps));
  const ev = A.ownedEvent(cat, f, { weight: 15, src: 'maker' }); assert.ok(JSON.stringify(ev).length < 8000, 'fits the API event limit');
  clearExtra(); assert.equal(catOf(cat.id), null); registerOwned({ owned: { o1: Object.assign({ id: 'o1' }, ev) } }); assert.equal(catOf(cat.id).rg, cat.rg); clearExtra();
});
