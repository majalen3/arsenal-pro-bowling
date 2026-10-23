// CC2 bag builder: coverage grid, overlap/hole fixtures, the 10 checks, fill (owned only), health = fold(event log).
import test from 'node:test'; import assert from 'node:assert/strict';
import * as G from '../../js/cc/bag.js';
import { project } from '../../js/data/project.js';
import { mkEvent } from '../../js/data/events.js';
import { seedEvents } from '../../js/data/seed.js';
const O = (o, c, x = {}) => Object.assign({ ownedId: 'own-' + o, catalogId: c, name: o, status: 'inBag' }, x);
const BB = O('bb', 'rattler-big-bite', { benchmark: true }), SN = O('sn', 'super-nova'), C4 = O('c4', 'ordnance-c4'), HRP = O('hrp', 'hy-road-pearl'),
  DR = O('dr', 'deadly-rattler'), ICE = O('ice', 'ice-storm', { note: 'Spare' }), GURU = O('guru', 'guru-supreme', { status: 'benched' }),
  RAW = O('raw', 'raw-hammer', { status: 'benched' }), SCOUT = O('scout', 'green-scout', { status: 'benched' }), RACK = O('rack', null, { status: 'benched', name: 'Rack Attack' });
const ALL = [BB, SN, C4, HRP, DR, ICE, GURU, RAW, SCOUT, RACK];
test('B01 cells: level from the app tag, shape is an estimate from cover/core/diff', () => {
  const c = id => { const x = G.cellOf(id); return [x.level, x.shape]; };
  assert.deepEqual(c('rattler-big-bite'), [4, 'smooth']); assert.deepEqual(c('super-nova'), [5, 'medium']);
  assert.deepEqual(c('ordnance-c4'), [3, 'smooth']); assert.deepEqual(c('hy-road-pearl'), [2, 'medium']);
  assert.deepEqual(c('deadly-rattler'), [2, 'medium']); assert.deepEqual(c('ice-storm'), [1, 'medium']);
  assert.equal(G.cellOf(null).tbd, true);
});
// 12 overlap/hole fixtures: [name, items, overlapPairs, holes]
const FIX = [
  ['T6 as reported', [BB, SN, C4, HRP, DR], [['own-hrp', 'own-dr']], []],
  ['League 3 as reported', [BB, HRP], [], [3]],
  ['BB + DR share the Rattler core but not the cover', [BB, DR], [], [3]],
  ['SN + Guru: same level 5, different shape (medium vs smooth)', [SN, GURU], [], []],
  ['C4 + Raw Hammer: same cell (3, smooth)', [C4, RAW], [['own-c4', 'own-raw']], []],
  ['SN + Ice: holes at 2,3,4', [SN, ICE], [], [2, 3, 4]],
  ['BB + C4 + HRP: ladder, no hole', [BB, C4, HRP], [], []],
  ['SN + C4: hole at 4', [SN, C4], [], [4]],
  ['single ball: nothing to compare', [BB], [], []],
  ['Rack Attack (spec TBD) is left out of the grid', [BB, RACK, HRP], [], [3]],
  ['HRP + Scout: same level, different shape', [HRP, SCOUT], [], []],
  ['C4 + Raw + SN + Ice: overlap and holes', [C4, RAW, SN, ICE], [['own-c4', 'own-raw']], [2, 4]],
];
FIX.forEach(([name, items, ov, hs], i) => test(`B${String(i + 2).padStart(2, '0')} ${name}`, () => {
  assert.deepEqual(G.overlaps(items).map(o => [o.a, o.b]), ov); assert.deepEqual(G.holes(items), hs);
}));
test('B14 checks on the reported T6: overlap warns, benchmark in the middle, spare ok', () => {
  const c = G.checks([BB, SN, C4, HRP, DR], ICE, { format: 'tournament6' }), w = c.filter(x => x.warn).map(x => x.n);
  assert.equal(c.length, 10); assert.deepEqual(w, [3]);
  assert.match(c[0].text, /benchmark, in the middle/);
});
test('B15 checks: no spare, benchmark at the top, USBC check for Rack Attack, pro shop blocked', () => {
  const c = G.checks([BB, C4, Object.assign({}, HRP, { status: 'proShop' }), RACK], null, { format: 'league3' }), w = n => c.find(x => x.n === n);
  assert.equal(w(1).warn, true); assert.match(w(1).text, /strongest/);
  assert.equal(w(2).warn, true); assert.equal(w(9).warn, true); assert.match(w(9).text, /pro shop/);
  assert.equal(w(10).warn, true); assert.match(w(10).text, /Rack Attack/);
});
test('B16 check 7: short pattern without control warns; with Ice Storm it passes', () => {
  const pat = { name: 'Short', ft: 33, ratio: 2 };
  assert.equal(G.checks([SN, GURU], null, { pattern: pat }).find(x => x.n === 7).warn, true);
  assert.equal(G.checks([SN, ICE], null, { pattern: pat }).find(x => x.n === 7).warn, false);
});
test('B17 fill uses owned, available balls only; locked always in; excluded never', () => {
  const owned = ALL.concat([O('shop', 'guru-supreme', { status: 'proShop' }), O('old', 'super-nova', { status: 'retired' })]);
  for (const format of ['league3', 'league4', 'tournament6']) {
    const r = G.fill(owned, { format, locked: ['own-hrp'], excluded: ['own-sn'] }), ids = r.slots.map(s => s.owned);
    assert.equal(ids.length, G.SIZE[format]); assert.equal(r.spare, 'own-ice');
    assert.ok(ids.includes('own-hrp')); assert.ok(!ids.includes('own-sn')); assert.ok(!ids.includes('own-shop')); assert.ok(!ids.includes('own-old'));
    assert.ok(ids.every(id => owned.some(o => o.ownedId === id))); assert.ok(!ids.includes('own-ice'));
  }
});
test('B18 fill is deterministic and keeps what you carry on ties', () => {
  const cur = ['own-bb', 'own-sn', 'own-c4', 'own-hrp', 'own-dr'];
  const a = G.fill(ALL, { format: 'tournament6', current: cur }), b = G.fill(ALL.slice().reverse(), { format: 'tournament6', current: cur });
  assert.deepEqual(a, b); assert.ok(a.slots.some(s => s.owned === 'own-bb'));
  const d = G.diffBags({ slots: cur.map(owned => ({ owned })), spare: 'own-ice' }, a);
  assert.equal(d.in.length, d.out.length);
});
test('B19 health = fold(event log): counts come from logged games and reset on service', () => {
  const ev = seedEvents({ now: 1000 }); let ts = 2000;
  const game = (sid, g, ball) => { for (let f = 1; f <= 10; f++) ev.push(mkEvent('shot.logged', `s-${sid}-${g}-${f}`, { sessionId: sid, game: g, frame: f, roll: 1, down: 10, ballId: ball }, { ts: ts++ })); };
  for (let g = 1; g <= 4; g++) game('a', g, 'own-rattler-big-bite');
  ev.push(mkEvent('ball.serviced', 'svc1', { ballId: 'own-rattler-big-bite', type: 'refresh' }, { ts: ts++ }));
  for (let g = 1; g <= 3; g++) game('b', g, 'own-rattler-big-bite');
  ev.push(mkEvent('score.logged', 'sc1', { score: 200, ballId: 'own-super-nova' }, { ts: ts++ }));
  const P = project(ev), h = P.health['own-rattler-big-bite'];
  assert.equal(h.games, 7); assert.equal(h.since.refresh, 3); assert.equal(h.since.resurface, null);
  // recount straight from the log
  const games = new Set(ev.filter(e => e.type === 'shot.logged' && e.data.ballId === 'own-rattler-big-bite').map(e => e.data.sessionId + e.data.game));
  assert.equal(h.games, games.size);
  assert.deepEqual(project(ev.slice().reverse()).health, P.health);   // order-independent fold
  // Brunswick family (Radical): refresh 10, lead 6 → due at 4+ games since refresh; resurface unknown → "at least 7"
  const due = G.dueOf(G.cellOf('rattler-big-bite').cat, h, 0);
  assert.ok(!due.some(d => d.type === 'refresh'));   // 3 + 6 < 10
  assert.deepEqual(G.dueOf(G.cellOf('rattler-big-bite').cat, h, 2).map(d => d.type), ['refresh']);   // event 2 games away → 3+2+6 ≥ 10
});
test('B20 care rules: urethane detox off; Hammer has resurface only', () => {
  assert.equal(G.careOf({ brand: 'Storm', cover: 'Urethane' }).detox, null);
  const hm = G.careOf({ brand: 'Hammer', cover: 'Solid Reactive' }); assert.equal(hm.refresh, null); assert.equal(hm.resurface, 50);
  assert.equal(G.careOf({ brand: 'Columbia 300', cover: 'Solid Reactive' }).family, 'none');
});
test('B21 pack list: role → ball → why; blocked listed with a reason', () => {
  const r = G.packList([BB, SN, HRP, Object.assign({}, C4, { status: 'proShop' })], ICE, {});
  assert.deepEqual(r.rows.map(x => x.role), ['Stronger', 'Benchmark', 'Weaker / cleaner', 'Spare']);
  assert.deepEqual(r.blocked, [{ name: 'c4', why: 'at the pro shop' }]);
});
