import test from 'node:test';
import assert from 'node:assert/strict';
import { title, records, milestones, shelves } from '../../js/cc/armory.js';
import { project } from '../../js/data/project.js';
import { mkEvent } from '../../js/data/events.js';
const strikeGame = (sid, ball, ts) => { const out = []; for (let f = 1; f <= 9; f++) out.push(mkEvent('shot.logged', 's', { sessionId: sid, game: 1, frame: f, roll: 1, down: 10, ballId: ball }, { ts: ts + f }));
  for (let r = 1; r <= 3; r++) out.push(mkEvent('shot.logged', 's', { sessionId: sid, game: 1, frame: 10, roll: r, down: 10, ballId: ball }, { ts: ts + 10 + r })); return out; };
const own = (id, cat, status, name) => mkEvent('ownedBall.created', id, { catalogId: cat, name, status }, { ts: 1 });
const cat = id => ({ rattler: { id: 'rattler', name: 'Rattler', role: 'Smooth control solid', color: '#86efac', rg: 2.48, diff: 0.035 } })[id] || null;
test('title never invents a name', () => {
  assert.deepEqual(title({ bowler: {} }), { team: 'Urbanek Honey Badgers', title: 'Armory' });
  assert.equal(title({ bowler: { name: { v: 'Sam' } } }).title, 'Sam\u2019s Armory');
});
test('no logged games, no marks', () => {
  const P = project([own('o1', 'rattler', 'inBag', 'Radical Rattler')]);
  const s = shelves(P, cat); assert.equal(s.bag.length, 1); assert.deepEqual(s.bag[0].earned, []); assert.equal(s.bag[0].name, 'Rattler');
});
test('a 300 logged with the ball is earned and shown', () => {
  const P = project([own('o1', 'rattler', 'inBag', 'Radical Rattler'), ...strikeGame('S1', 'o1', 100)]);
  const r = records(P); assert.equal(r.o1.games, 1); assert.equal(r.o1.best, 300);
  assert.deepEqual(milestones(r.o1).map(m => m.text), ['300 game', 'First game logged']);
});
test('shelves: retired go to the Hall of Fame, benched to the bench', () => {
  const P = project([own('a', 'rattler', 'retired', 'Old'), own('b', null, 'benched', 'Rack Attack'), own('c', null, 'proShop', 'X')]);
  const s = shelves(P, cat); assert.equal(s.hall.length, 1); assert.equal(s.bench.length, 2); assert.equal(s.bag.length, 0);
  assert.equal(s.bench[0].role, null);   // no catalog link: no invented role
});
test('milestone thresholds count games, not ratings', () => {
  assert.deepEqual(milestones({ games: 12, best: 180 }).map(m => m.text), ['10+ games']);
  assert.deepEqual(milestones({ games: 3, best: 212 }).map(m => m.text), ['212 best', 'First game logged']);
  assert.deepEqual(milestones(null), []);
});
