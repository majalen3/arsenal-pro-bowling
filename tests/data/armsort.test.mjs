// v74 (owner t129u): the Arsenal grid sort. Pure function, real-data keys only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sortBalls, SORTS } from '../../js/cc/armory.js';

const it = (name, brand, games, lvl, ts) => ({ id: name, name, cat: brand ? { brand } : null, rec: games ? { games } : null, lvl, ts });
const items = [it('Zed', 'Storm', 0, 3, 10), it('alpha', 'Hammer', 12, 5, 30), it('Mid', null, 3, null, 20), it('Beta', 'Storm', 12, 1, 40), it('Cap', 'Radical', 0, 5, 5)];
const opt = { level: x => x.lvl, created: x => x.ts };
const names = k => sortBalls(items, k, opt).map(x => x.name);

test('the five sorts are the ones the data supports', () => assert.deepEqual(SORTS.map(s => s[0]), ['name', 'brand', 'strength', 'newest', 'used']));
test('Name: A-Z, case-insensitive', () => assert.deepEqual(names('name'), ['alpha', 'Beta', 'Cap', 'Mid', 'Zed']));
test('Brand: A-Z by maker, unknown maker last, then by name', () => assert.deepEqual(names('brand'), ['alpha', 'Cap', 'Beta', 'Zed', 'Mid']));
test('Strongest to weakest: level 5 down to 1, unknown strength last, ties by name', () => assert.deepEqual(names('strength'), ['alpha', 'Cap', 'Zed', 'Beta', 'Mid']));
test('Newest: most recently added first', () => assert.deepEqual(names('newest'), ['Beta', 'alpha', 'Mid', 'Zed', 'Cap']));
test('Most used: most games first, never-used by name', () => assert.deepEqual(names('used'), ['alpha', 'Beta', 'Mid', 'Cap', 'Zed']));
test('an unknown key falls back to Name, and the input is not mutated', () => {
  const before = items.map(x => x.name); assert.deepEqual(names('nope'), names('name')); assert.deepEqual(items.map(x => x.name), before);
});
