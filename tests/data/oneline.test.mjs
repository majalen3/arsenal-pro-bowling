// sim2 #1: ONE answer to "where do I stand / aim". Find's headline = the line.js starting line; the Aim Box pill never calls
// the app's own line "Outside zone" when no modelled strike line can reach the box ("Beyond model", explained).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../../js/cc/aimbox.js';
import * as F from '../../js/cc/strikeline.js';
import { modelLine, presetFor } from '../../js/cc/model.js';
import { rule31, HOUSE_ASSUMED } from '../../js/cc/rank.js';
import { S, analyze } from '../../js/engine.js';
import { balls, specOK } from '../../js/data.js';
const cats = balls.filter(specOK).slice(0, 4);
const start = (cat, ft) => modelLine(cat, { speed: 15, rev: 220, ft, finish: 'factory', target31: rule31(ft).target });   // = lineFor's ml
const pathOf = (cat, ft, ml) => { const keep = S.pattern; S.pattern = presetFor(ft); try { return analyze(cat, { speed: 15, rev: 220, release: ml.feet, aim: ml.aim }); } finally { S.pattern = keep; } };
for (const ft of [HOUSE_ASSUMED.ft, 48]) test(`Find headline is the starting line (${ft} ft)`, () => {
  for (const cat of cats) { const ml = start(cat, ft); if (ml.none) continue;
    const res = F.find(cat, { ft, start: { lay: ml.feet, arr: ml.target } }), w = F.say(res, { offset: 7, drift: 0 });
    assert.equal(res.best.kind, 'start'); assert.equal(res.best.lay, ml.feet); assert.equal(res.best.arrows, ml.target);
    assert.equal(w.feet, Math.round(ml.feet + 7)); assert.equal(w.eye, ml.target); assert.match(w.line, /same as Tonight/);
    if (res.alt) { assert.equal(res.alt.kind, 'higher'); assert.ok(res.alt.pocket - res.best.pocket > 3); assert.match(w.alt, /^Higher model pocket %/); }
  }
});
test('without start, find is unchanged (search best leads)', () => { const r = F.find(cats[0], { ft: 38 }); assert.notEqual(r.best.kind, 'start'); assert.equal(r.search, undefined); });
test('reach: Baker 45 ft house box is beyond the model; the Shark Rule-of-31 box is reachable and the starting line passes it', () => {
  for (const cat of cats) {
    const hb = A.boxOf({ on: true }, 'house'), hr = A.reach(hb, cat, { preset: 'house' });
    assert.equal(hr.any, false); assert.ok(hr.bpFt < hb.ft1); assert.match(A.beyondWhy(hb, hr), /No modelled strike line reaches this box/);
    const sb = A.boxOf({ on: true }, 'shark', 48), sr = A.reach(sb, cat, { preset: 'shark' });
    assert.equal(sr.any, true);
    const ml = start(cat, 48); if (!ml.none) assert.equal(A.through(sb, pathOf(cat, 48, ml).points), true, cat.name);
  }
});
test('reach leaves the engine state as it found it', () => { const keep = { ...S }; A.reach(A.boxOf({ on: true }, 'badger'), cats[1], { preset: 'badger', finish: 'polished', oil: 1.2 }); assert.deepEqual({ ...S }, keep); });
// sim2 #8: first league night, no other sessions: the recap compares with the league average typed in Team setup.
import { recapOf } from '../../js/cc/card.js';
test('recap uses the typed league average only when no other sessions give one', () => {
  const g = score => ({ complete: true, score, throws: [], game: 1, balls: 0 });
  const mk = (id, scores) => ({ id, games: scores.map(g), stats: { avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null, games: scores.length, throws: null }, meta: {} });
  const one = [mk('n1', [206])];
  assert.match(recapOf(one, 'n1', { myAvg: 180 }).head, /^206 game: 26 pins over your 180 league average \(typed in Team setup\)\.$/);
  assert.doesNotMatch(recapOf(one, 'n1').head, /league average/);
  const two = [mk('n1', [206, 190]), mk('n0', [170])];
  assert.match(recapOf(two, 'n1', { myAvg: 180 }).head, /your 170 average/);   // logged games win over the typed number
});
