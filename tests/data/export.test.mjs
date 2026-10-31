import test from 'node:test';
import assert from 'node:assert/strict';
import * as X from '../../js/cc/export.js';
import { project } from '../../js/data/project.js';
import { mkEvent } from '../../js/data/events.js';
const strikeGame = (sid, ball, ts) => { const out = []; for (let f = 1; f <= 9; f++) out.push(mkEvent('shot.logged', 's', { sessionId: sid, game: 1, frame: f, roll: 1, down: 10, ballId: ball }, { ts: ts + f }));
  for (let r = 1; r <= 3; r++) out.push(mkEvent('shot.logged', 's', { sessionId: sid, game: 1, frame: 10, roll: r, down: 10, ballId: ball }, { ts: ts + 10 + r })); return out; };
const own = (id, cat, status, name, extra = {}) => mkEvent('ownedBall.created', id, { catalogId: cat, name, status, ...extra }, { ts: 1761800000000 });
const CAT = { rattler: { id: 'rattler', brand: 'Radical', name: 'Rattler', role: 'Smooth control solid', cover: 'HK22 Solid', coverName: 'HK22', coreName: 'Rattler', core: 'Symmetric', finish: '3000 Abralon', color: '#86efac', rg: 2.48, diff: 0.035 },
  nova: { id: 'nova', brand: 'Storm', name: 'Super Nova', cover: 'NeX Solid', rg: 2.49, diff: 0.052 } };
const catOf = id => CAT[id] || null;
test('header shows only the facts the bowler entered', () => {
  const P = project([own('o1', 'rattler', 'inBag', 'Radical Rattler')]);
  let m = X.sheetModel(P, { hand: 'right', speed: 16, rev: 300, entered: { hand: true, speed: false, rev: true } }, { catOf, now: 1761800000000 });
  assert.deepEqual(m.facts.map(f => f[0]), ['Hand', 'Rev rate']);
  m = X.sheetModel(P, {}, { catOf }); assert.deepEqual(m.facts, []); assert.equal(m.name, null); assert.equal(m.team, 'Arsenal Pro');
});
test('balls are grouped by Status; games and average only where logged, with n', () => {
  const P = project([own('o1', 'rattler', 'inBag', 'Radical Rattler'), own('o2', 'nova', 'retired', 'Storm Super Nova'), ...strikeGame('S1', 'o1', 100)]);
  const m = X.sheetModel(P, {}, { catOf });
  assert.deepEqual(m.groups.map(g => g.key), ['inBag', 'retired']);
  const r1 = m.rows.find(r => r.id === 'o1'), r2 = m.rows.find(r => r.id === 'o2');
  assert.equal(r1.avg, 300); assert.equal(X.avgText(r1), '300 (n 1)'); assert.equal(X.gamesText(r1), '1');
  assert.equal(r2.avg, null); assert.equal(X.avgText(r2), ''); assert.equal(X.gamesText(r2), '');
  assert.equal(m.hall.length, 1); assert.equal(m.hall[0].id, 'o2');
  assert.ok(m.earned.find(e => e.id === 'o1').marks.some(t => /300/.test(t)));
});
test('specs come from the maker or the bowler; missing ones stay TBD, never invented', () => {
  const P = project([own('o1', 'rattler', 'inBag', 'Radical Rattler'), own('o3', 'nope', 'benched', 'Mystery Ball')]);
  const m = X.sheetModel(P, {}, { catOf }), r1 = m.rows.find(r => r.id === 'o1'), r3 = m.rows.find(r => r.id === 'o3');
  assert.equal(r1.src, 'maker'); assert.equal(r1.surface, 'Box: 3000 Abralon'); assert.equal(X.fmtRG(r1.rg), '2.48');
  assert.equal(r3.src, 'none'); assert.equal(r3.rg, null); assert.equal(X.fmtRG(r3.rg), 'TBD'); assert.equal(X.fmtDiff(r3.diff), 'TBD'); assert.equal(r3.core, '');
  assert.equal(X.surfaceOf({ finish: 'polished' }, CAT.rattler), 'Polished'); assert.equal(X.surfaceOf({ finish: '2000' }, null), '2000 grit'); assert.equal(X.surfaceOf({}, null), 'Box finish');
});
test('CSV: header plus one row per ball, bag flagged, blanks stay blank', () => {
  const P = project([own('o1', 'rattler', 'inBag', 'Radical Rattler'), own('o3', 'nope', 'benched', 'Mystery Ball')]);
  const m = X.sheetModel(P, {}, { catOf, now: 1761800000000 }), rows = X.arsenalRows(m);
  assert.deepEqual(rows[0], X.ARSENAL_CSV_HEAD); assert.equal(rows.length, 3);
  const mys = rows.find(r => r[2] === 'Mystery Ball'); assert.equal(mys[7], ''); assert.equal(mys[10], ''); assert.equal(mys[15], '');
  assert.match(X.fileStem(m, 'list'), /^arsenal-list-\d{4}-\d{2}-\d{2}$/);
});
