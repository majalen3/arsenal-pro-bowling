// Live eval 2026-11-10: a partial name must list EVERY catalogue match ("Hy-Road" showed 1 of 5, "Rattler" 1 of 4, "Phaze" none).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../../js/cc/addball.js';
const names = q => A.browse(q).map(e => `${e.brand} ${e.name}`);
const family = re => A.catalog().filter(e => re.test(e.name)).map(e => `${e.brand} ${e.name}`).sort();
test('Hy-Road: every Hy-Road in the catalogue, whatever the case or hyphen', () => {
  const want = family(/hy-road/i); assert.ok(want.length >= 5, 'catalogue has the five Hy-Roads');
  for (const q of ['Hy-Road', 'hy-road', 'HY-ROAD', 'hy road', 'Hyroad', 'Storm Hy-Road', 'hy-ro']) assert.deepEqual(names(q).filter(n => /hy-road/i.test(n)).sort(), want, q);
  assert.equal(names('Hy-Road')[0], 'Storm Original Hy-Road', 'the exact alias stays first');
});
test('Rattler: every Rattler (Rattler, Big Bite, NU, Deadly)', () => {
  const want = family(/rattler/i); assert.ok(want.length >= 4);
  for (const q of ['Rattler', 'rattler', 'RATTLER', 'Radical Rattler', 'ratt']) assert.deepEqual(names(q).filter(n => /rattler/i.test(n)).sort(), want, q);
});
test('Phaze: Phaze II is in the catalogue from the Storm page; II = 2 = ii, with or without a space', () => {
  const p2 = A.catalog().find(e => e.brand === 'Storm' && e.name === 'Phaze II');
  assert.ok(p2, 'Phaze II row'); assert.equal(p2.source, 'https://www.stormbowling.com/storm-phaze-ii-bowling-ball'); assert.equal(p2.fields.rg.v, 2.48); assert.equal(p2.fields.diff.v, 0.051);
  for (const q of ['Phaze', 'phaze', 'Storm Phaze']) { const n = names(q); assert.ok(n.includes('Storm Phaze II'), q); assert.ok(n.length >= 3, q); }
  for (const q of ['Phaze II', 'phaze ii', 'Phaze 2', 'phaze2', 'Storm Phaze 2']) assert.equal(names(q)[0], 'Storm Phaze II', q);
});
test('browse: substring across brand and name, nothing for junk, empty = whole catalogue, typos still found', () => {
  assert.ok(names('Rhino').length >= 5); assert.deepEqual(names('zzqx'), []); assert.equal(A.browse('').length, A.catalog().length);
  assert.ok(names('Rattlr').includes('Radical Rattler'), 'typo-tolerant fuzzy candidates follow');
  assert.equal(names('nova')[0], 'Storm Super Nova', 'word-start matches rank ahead of fuzzy ones');
});
// v70 (owner 2026-11-11): the balls whose maker URL 404'd on 2026-11-10 were found under the maker's archive URLs or in archived copies
// of the maker's own page. Each is searchable by the name a bowler types, with its source; nothing is filled from a banned site.
test('404-gap balls: searchable by the names bowlers type, with maker or archived-maker sources', () => {
  const want = { 'Phaze III': 'Storm Phaze III', 'phaze 3': 'Storm Phaze III', 'Phaze 5': 'Storm Phaze V', 'phaze v': 'Storm Phaze V', 'Physix': 'Storm PhysiX',
    'Summit': 'Storm Summit', 'IQ Tour': 'Storm !Q Tour Edition', '!q tour': 'Storm !Q Tour Edition', 'Idol': 'Roto Grip Idol', 'Hustle Ink': 'Roto Grip Hustle Ink',
    'Zen': '900 Global Zen', 'Honey Badger': '900 Global Honey Badger' };
  for (const [q, n] of Object.entries(want)) assert.ok(names(q).slice(0, 3).includes(n), `${q} -> ${n} (${names(q).slice(0, 4)})`);
  assert.deepEqual(names('Prism').filter(n => /prism/i.test(n)).sort(), ['Brunswick Prism Hybrid', 'Brunswick Prism Solid', 'Brunswick Prism Warp', 'Brunswick Prism Warp Hybrid']);
  assert.ok(!A.catalog().some(e => /^prism$/i.test(e.name)), 'no generic "Prism" guessed');
  for (const q of ['Phaze', 'phaze']) for (const n of ['Storm Phaze II', 'Storm Phaze III', 'Storm Phaze 4', 'Storm Phaze V', 'Storm Phaze AI']) assert.ok(names(q).includes(n), `${q} lists ${n}`);
  const row = n => A.catalog().find(e => `${e.brand} ${e.name}` === n);
  const zen = row('900 Global Zen');
  assert.equal(zen.specStatus, 'archive'); assert.match(zen.source, /^https:\/\/web\.archive\.org\/web\/\d{14}\/https:\/\/www\.stormbowling\.com\//);
  assert.equal(zen.fields.rg.v, 2.49); assert.equal(zen.fields.rg.prov.kind, 'manufacturer'); assert.match(zen.fields.rg.prov.ref, /^archived /); assert.equal(zen.flag, null);
  const hb = row('900 Global Honey Badger'); assert.equal(hb.fields.rg, undefined, 'no RG printed: spec TBD, never guessed'); assert.equal(hb.fields.core.v, 'Grapnel');
  assert.equal(row('Storm Phaze III').fields.diff.v, 0.051); assert.equal(row('Storm PhysiX').fields.intDiff.v, 0.017);
  for (const e of A.catalog().filter(x => x.src === 'catalog')) assert.ok(!/bowlingballvideos|bowwwl|bowlingball\.com|bowlingthismonth/i.test(JSON.stringify(e)), e.name);
});
