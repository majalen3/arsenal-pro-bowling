// Clutter audit #4: games naming a ball by owned id or catalog id count once, under one record.
import test from 'node:test';
import assert from 'node:assert/strict';
import { healthOf } from '../../js/data/project.js';

test('health merges owned id and catalog id games', () => {
  const P = { owned: { 'own-a': { catalogId: 'cat-a' } }, games: [{ ts: 1, balls: ['own-a'] }, { ts: 2, balls: ['cat-a'] }],
    scores: [{ ballId: 'cat-a', ts: 3 }], gamesLogged: [{ ballId: 'own-a', games: 2, ts: 4 }], service: [{ ballId: 'cat-a', type: 'refresh', ts: 2 }] };
  const h = healthOf(P);
  assert.equal(h['own-a'].games, 5);
  assert.equal(h['own-a'].since.refresh, 3);
  assert.equal(h['cat-a'], h['own-a']);
});

test('a catalog ball nobody owns keeps its own record', () => {
  const h = healthOf({ owned: {}, games: [{ ts: 1, balls: ['cat-x'] }], scores: [], gamesLogged: [], service: [] });
  assert.equal(h['cat-x'].games, 1);
});
