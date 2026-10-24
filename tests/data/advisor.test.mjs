// Bag Advisor (TEAM_PROMPT_BAG_ADVISOR.md). Synthetic sessions below are TEST DATA (ids 'test-*'), never real results.
import test from 'node:test';
import assert from 'node:assert/strict';
import { seedEvents } from '../../js/data/seed.js';
import { project } from '../../js/data/project.js';
import { mkEvent } from '../../js/data/events.js';
import * as A from '../../js/cc/advisor.js';
const base = () => seedEvents({ now: 1000 });
const P0 = project(base());
// TEST DATA: n games of 10 first balls with ball `id`, `k` strikes per game, rest tagged high with a 4-pin leave.
function games(id, n, k, from = 0) {
  const out = []; let ts = 5000 + from * 1000;
  for (let g = 0; g < n; g++) for (let f = 1; f <= 10; f++) {
    const strike = f <= k, sid = `test-sess-${id}-${from + g}`;
    out.push(mkEvent('shot.logged', sid, { sessionId: sid, game: 1, frame: f, roll: 1, down: strike ? 10 : 9, leave: strike ? [] : [4], ballId: id, miss: strike ? null : 'high' }, { ts: ts++ }));
    if (!strike) out.push(mkEvent('shot.logged', sid, { sessionId: sid, game: 1, frame: f, roll: 2, down: 1, leave: [], ballId: id }, { ts: ts++ }));
  }
  return out;
}
test('sizes by event: league 2+spare, tournament 5+spare, practice 2+spare; owned in-bag balls only', () => {
  const sz = ev => A.advise(P0, { event: ev }).rows.length;
  assert.equal(sz('league'), 3); assert.equal(sz('tournament'), 6); assert.equal(sz('practice'), 3);
  for (const ev of Object.keys(A.EVENTS)) for (const r of A.advise(P0, { event: ev }).rows) assert.equal(P0.owned[r.ownedId].status, 'inBag', `${ev}: ${r.name}`);
});
test('every ball has a role, a reason and a confidence; spare is last; at most one warning per ball', () => {
  const a = A.advise(P0, { event: 'tournament', health: P0.health });
  for (const r of a.rows) { assert.ok(['benchmark', 'stronger', 'weaker-control', 'shape change', 'spare', 'option'].includes(r.role)); assert.ok(r.reason.length > 5); assert.ok(r.confidence.label); assert.ok(r.warning == null || typeof r.warning === 'string'); }
  assert.equal(a.rows.at(-1).role, 'spare'); assert.equal(a.rows.filter(r => r.role === 'benchmark').length, 1);
});
test('no data: honest label, no evidence text, no invented numbers', () => {
  const a = A.advise(P0, { event: 'league' });
  assert.ok(a.noData); assert.match(a.why, /based on specs \+ your release, no results logged yet/);
  for (const r of a.rows) { assert.equal(r.evidence, null); assert.equal(r.confidence.key, 'spec'); }
});
test('evidence: pocket / strike % and n from logged shots (test data)', () => {
  const P = project(base().concat(games('own-ordnance-c4', 4, 6)));
  const e = A.evidenceOf(P, 'own-ordnance-c4', 'ordnance-c4');
  assert.equal(e.n, 40); assert.equal(e.strikePct, 60); assert.equal(e.pocketPct, 60); assert.equal(e.games, 4); assert.equal(e.sessions, 4);
  assert.deepEqual(e.topLeave, { leave: '4', n: 16 }); assert.equal(e.enough, false);
  assert.match(A.evidenceText('Ordnance C4', e), /^Ordnance C4: 60% pocket, 60% strikes over 4 sessions \(n=40 first balls\); most left: 4 \(16×\)$/);
  assert.match(A.confidenceOf(e).label, /app estimate \(4 of 21 games\)/);
});
test('under the 21-game minimum results never re-order; at 21+ a better strike % moves ahead at equal fit', () => {
  const ev = 'tournament';
  const before = A.advise(P0, { event: ev, pattern: { ft: 44, ml: null }, }).rows.map(r => r.ownedId);
  // Deadly Rattler and Hy-Road share a cell (same level & shape): only results can separate them.
  const i1 = before.indexOf('own-deadly-rattler'), i2 = before.indexOf('own-hy-road-pearl'); assert.ok(i1 >= 0 && i2 >= 0);
  const [first, second] = i1 < i2 ? ['own-deadly-rattler', 'own-hy-road-pearl'] : ['own-hy-road-pearl', 'own-deadly-rattler'];
  const few = project(base().concat(games(second, 5, 9), games(first, 5, 1, 100)));
  const o1 = A.advise(few, { event: ev, pattern: { ft: 44, ml: null } }).rows.map(r => r.ownedId);
  assert.ok(o1.indexOf(first) < o1.indexOf(second), 'under 21 games: order unchanged');
  const many = project(base().concat(games(second, 21, 9), games(first, 21, 1, 100)));
  const a2 = A.advise(many, { event: ev, pattern: { ft: 44, ml: null } }), o2 = a2.rows.map(r => r.ownedId);
  assert.ok(o2.indexOf(second) < o2.indexOf(first), '21+ games and a better strike %: moves ahead');
  assert.equal(a2.rows.find(r => r.ownedId === second).confidence.key, 'measured');
});
test('swap replaces one ball; At home is offered (grab from home); pro shop / retired never offered or packed', () => {
  const a = A.advise(P0, { event: 'league' }), from = a.rows[1].ownedId;
  assert.ok(a.bench.every(b => ['inBag', 'benched'].includes(P0.owned[b.ownedId].status)));
  assert.ok(a.bench.filter(b => b.home).every(b => P0.owned[b.ownedId].status === 'benched'));
  const to = a.bench[0].ownedId, b = A.advise(P0, { event: 'league', swaps: { [from]: to } });
  assert.ok(b.slots.includes(to) && !b.slots.includes(from));
  const home = A.advise(P0, { event: 'league', swaps: { [from]: 'own-guru-supreme' } });   // At home: allowed, marked fromHome
  assert.ok(home.slots.includes('own-guru-supreme') && home.fromHome.includes('own-guru-supreme'));
  const P1 = project(base().concat([mkEvent('ownedBall.edited', 'own-guru-supreme', { fields: { status: 'proShop' } }, { ts: 9999 })]));
  const ps = A.advise(P1, { event: 'league', swaps: { [from]: 'own-guru-supreme' } });
  assert.ok(!ps.slots.includes('own-guru-supreme') && !ps.bench.some(x => x.ownedId === 'own-guru-supreme'));
  assert.equal(ps.left.find(x => x.ownedId === 'own-guru-supreme').key, 'proShop');
});
test('start line comes from the model line callback; deterministic', () => {
  const line = () => ({ none: false, feet: 10, target: 10.7 });
  const a = A.advise(P0, { event: 'league', line }), b = A.advise(P0, { event: 'league', line });
  assert.deepEqual(a.line, { none: false, feet: 10, target: 10.7 }); assert.deepEqual(a.rows, b.rows);
  assert.ok(a.plan[0].k === 'A' && a.plan[0].name === a.A.name);
});
test('no available balls → a reason, not a bag', () => {
  const evs = base().concat(Object.keys(P0.owned).map((id, i) => mkEvent('ownedBall.edited', id, { fields: { status: 'benched' } }, { ts: 9000 + i })));
  const a = A.advise(project(evs), { event: 'league' }); assert.ok(a.none); assert.match(a.reason, /In my bag/);
});
