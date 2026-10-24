import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadGlossary, search, byTree, find, helpOn, _reset } from '../../js/cc/help.js';
const raw = readFileSync(new URL('../../data/glossary.json', import.meta.url), 'utf8');
const fake = async () => ({ ok: true, json: async () => JSON.parse(raw) });
const PLACED = ['bm-shr', 'tg-arrows', 'eq-spareball', 'eq-cleaning', 'eq-cover-types'];
test('help is off by default', () => { assert.equal(helpOn({}), false); assert.equal(helpOn(null), false); assert.equal(helpOn({ help: true }), true); });
test('glossary loads 113 terms in 7 trees, once', async () => {
  _reset(); let n = 0; const G = await loadGlossary(async () => { n++; return fake(); }); await loadGlossary(async () => { n++; return fake(); });
  assert.equal(G.terms.length, 113); assert.equal(G.trees.length, 7); assert.equal(n, 1);
});
test('every placed bubble exists, is v1 and is at most 2 sentences', async () => {
  _reset(); const G = await loadGlossary(fake);
  for (const id of PLACED) { const t = find(G.terms, id); assert.ok(t, id); assert.ok(t.v1_rank >= 1 && t.v1_rank <= 20, id);
    assert.ok((t.bubble.match(/[.!?](\s|$)/g) || []).length <= 3, id); }
});
test('search matches term, id and glossary words; all words must match', async () => {
  _reset(); const G = await loadGlossary(fake);
  assert.ok(search(G.terms, 'handicap').some(t => t.id === 'sc-handicap'));
  assert.ok(search(G.terms, 'tg-369').some(t => t.id === 'tg-369'));
  assert.equal(search(G.terms, 'zzzz nothing').length, 0);
  assert.equal(search(G.terms, '').length, 113);
});
test('grouped by tree in glossary order', async () => {
  _reset(); const G = await loadGlossary(fake); const g = byTree(G.terms, G.trees);
  assert.deepEqual(g.map(x => x[0]), G.trees); assert.equal(g.reduce((a, x) => a + x[1].length, 0), 113);
});
