// P1.3: one Status per ball. Migration (excluded → At home), the shared "why not", packed ids, and no old words in the UI.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { seedEvents } from '../../js/data/seed.js';
import { project } from '../../js/data/project.js';
import { mkEvent } from '../../js/data/events.js';
import * as ST from '../../js/cc/status.js';
const base = () => seedEvents({ now: 1000 });
const ed = (id, status, ts) => mkEvent('ownedBall.edited', id, { fields: { status } }, { ts });
const apply = (evs, mig) => evs.concat(mig.map(([t, id, d], i) => mkEvent(t, id, d, { ts: 50000 + i })));
test('labels: four bowler words, v1 keys kept', () => {
  assert.deepEqual(ST.STATUS.map(s => s[1]), ['In my bag', 'At home', 'At the pro shop', 'Retired']);
  assert.deepEqual(ST.KEYS, ['inBag', 'benched', 'proShop', 'retired']);
  assert.equal(ST.label({}), 'In my bag'); assert.equal(ST.label({ status: 'benched' }), 'At home'); assert.equal(ST.ALWAYS, '\ud83d\udccc Always bring');
});
test('migration: excluded in-bag ball → At home; pro shop / retired keep their status; lists cleared; idempotent', () => {
  const bag = Object.assign({}, project(base()).bags['bag-league']); delete bag.id; delete bag.ts;
  let evs = base().concat([ed('own-ordnance-c4', 'proShop', 2000),
    mkEvent('bag.saved', 'bag-league', Object.assign(bag, { excluded: ['own-super-nova', 'own-ordnance-c4', 'own-guru-supreme', 'gone'] }), { ts: 3000 })]);
  const P = project(evs), mig = ST.migrateExcluded(P);
  assert.deepEqual(mig.filter(e => e[0] === 'ownedBall.edited').map(e => e[1]), ['own-super-nova']);
  evs = apply(evs, mig); const P2 = project(evs);
  assert.equal(P2.owned['own-super-nova'].status, 'benched'); assert.equal(P2.owned['own-ordnance-c4'].status, 'proShop');
  assert.equal(P2.owned['own-guru-supreme'].status, 'benched');
  assert.deepEqual(P2.bags['bag-league'].excluded, []); assert.deepEqual(P2.bags['bag-league'].slots, P.bags['bag-league'].slots);
  assert.deepEqual(ST.migrateExcluded(P2), []);
  assert.deepEqual(ST.migrateExcluded(project(base())), []);
});
test('packedIds: a ball moved to the pro shop / At home leaves the bag; At home swapped in on purpose stays', () => {
  const P = project(base().concat([ed('own-hy-road-pearl', 'proShop', 2000)])), bag = P.bags['bag-league'];
  assert.deepEqual(ST.packedIds(P, bag), ['own-rattler-big-bite', 'own-ice-storm']);
  const P2 = project(base().concat([mkEvent('bag.saved', 'bag-league', { name: 'L', format: 'league3', slots: [{ owned: 'own-guru-supreme', locked: false, fromHome: true }, { owned: 'own-raw-hammer', locked: false }], spare: null, excluded: [] }, { ts: 3000 })]));
  assert.deepEqual(ST.packedIds(P2, P2.bags['bag-league']), ['own-guru-supreme']);
});
test('whyNot: one plain reason, in order; pro shop and retired cannot be brought', () => {
  const P = project(base().concat([ed('own-ordnance-c4', 'proShop', 2000), ed('own-deadly-rattler', 'retired', 2001)])), bag = P.bags['bag-league'];
  const w = id => ST.whyNotFor(P, id, { bag, demand: 3 });
  assert.equal(w('own-rattler-big-bite'), null);
  assert.deepEqual([w('own-ordnance-c4').key, w('own-ordnance-c4').canBring], ['proShop', false]);
  assert.deepEqual([w('own-deadly-rattler').key, w('own-deadly-rattler').canBring], ['retired', false]);
  assert.equal(w('own-guru-supreme').key, 'home'); assert.match(w('own-guru-supreme').text, /grab from home/);
  const sn = w('own-super-nova'); assert.ok(['overlap', 'stronger', 'weaker', 'full', 'due', 'tbd'].includes(sn.key) && sn.canBring, sn.key);
  assert.ok(sn.text.length > 10 && !/%/.test(sn.text));
  for (const id of Object.keys(P.owned)) { const x = w(id); if (x) assert.ok(x.text.split(/[.!?]\s/).length <= 2, x.text); }
});
test('currentBag: the most recently saved bag (one bag everywhere)', () => {
  const P = project(base()); assert.equal(ST.currentBag(P).id, 'bag-league');   // seeded last
  const b = Object.assign({}, P.bags['bag-tournament']); delete b.id; delete b.ts;
  assert.equal(ST.currentBag(project(base().concat([mkEvent('bag.saved', 'bag-tournament', b, { ts: 9000 })]))).id, 'bag-tournament');
  assert.equal(ST.currentBag({ bags: {} }), null);
});
test('no "Exclude", "Benched" or "Lock" left in the UI code (the iOS "Auto-Lock" setting name is fine)', () => {
  const dir = new URL('../../js/screens/', import.meta.url), bad = [];
  for (const f of readdirSync(dir)) { if (!f.endsWith('.js')) continue;
    const src = readFileSync(new URL(f, dir), 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
    for (const m of src.matchAll(/(['"`])((?:(?!\1).)*)\1/g)) if (/\b(Exclude[ds]?|Benched|(?<!Auto-)Lock(ed)?)\b/.test(m[2])) bad.push(`${f}: ${m[2]}`); }
  assert.deepEqual(bad, []);
});
