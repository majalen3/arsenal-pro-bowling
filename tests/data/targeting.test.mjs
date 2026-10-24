// Targeting (TEAM_PROMPT_TARGETING.md): laydown/dots math, box, pocket call, cited moves, lefty words, Find my strike line.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../js/cc/target.js';
import * as F from '../../js/cc/strikeline.js';
import { S } from '../../js/engine.js';
import { balls } from '../../js/data.js';
const cat = balls.find(b => b.name === 'Big Bite') || balls.find(b => /Big Bite/.test(b.name));
const ctx = { speed: 15, rev: 220, ft: 38 };
const D = T.DEFAULTS;

test('laydown = feet − offset + drift; dots extend in a straight line to the arrows', () => {
  assert.equal(T.laydownOf({ ...D, feet: 17 }), 10);
  assert.equal(T.laydownOf({ ...D, feet: 17, drift: 2 }), 12);
  assert.equal(T.arrowsOf({ ...D, mode: 'dots', eyes: 13.5 }, 10), 17);   // dots 13.5 from 10 → arrows 17
  assert.equal(T.aimDegOf(10, 17), -7);
});
test('direction words mirror for left-handers', () => {
  assert.equal(T.dirWord(2, false), 'left'); assert.equal(T.dirWord(2, true), 'right'); assert.equal(T.dirWord(-1, false), 'right');
});
test('box is centred on the model line and inBox uses ±1.5 boards × ±1 ft', () => {
  const box = T.boxFor(cat, ctx);
  assert.equal(box.from, 'model');
  assert.ok(T.inBox(box, box.board + 1.4, box.ft + 0.9).ok);
  assert.ok(!T.inBox(box, box.board + 1.6, box.ft).ok);
});
test('the house line reads pocket through the box, and S is restored', () => {
  const before = { p: S.pattern, f: S.finish, o: S.oil };
  const box = T.boxFor(cat, ctx), t = T.fromLine({ release: box.ml.feet, aim: box.ml.aim }, D);
  const r = T.read(cat, t, ctx, box);
  assert.equal(r.call, 'pocket'); assert.ok(r.box.ok); assert.ok(T.done(r));
  assert.deepEqual({ p: S.pattern, f: S.finish, o: S.oil }, before);
});
test('a high shot gets a cited move that the engine says improves it; lefty words mirror', () => {
  const box = T.boxFor(cat, ctx), t = { ...D, feet: 17, eyes: 10 };
  const r = T.read(cat, t, ctx, box); assert.notEqual(r.call, 'pocket');
  const s = T.suggest(cat, t, ctx, box, r); assert.ok(s, 'a move');
  assert.ok(T.SRC[s.move.src] && /^https:/.test(T.SRC[s.move.src].url));
  assert.ok(Math.abs(s.r.entry - 17.5) < Math.abs(r.entry - 17.5) || s.r.call === 'pocket');
  const rh = T.moveWords(s, false), lh = T.moveWords(s, true);
  assert.notEqual(rh, lh); assert.equal(rh.replace(/left/g, 'X').replace(/right/g, 'left').replace(/X/g, 'right'), lh);
  assert.equal(typeof s.againstHouseRule, 'boolean');
});
test('coach line: numbers first, ≤2 sentences', () => {
  const box = T.boxFor(cat, ctx), t = { ...D, feet: 17, eyes: 10 }, r = T.read(cat, t, ctx, box);
  const c = T.coach(r, T.suggest(cat, t, ctx, box, r), false);
  assert.ok(/^(High|Light|Through|Box|Gutter)/.test(c)); assert.ok(c.split(/\.\s/).length <= 3);
});

// ---- Find my strike line
const withArrows = v => { const sp = F.spreadFrom(null); sp.arrows = { ...sp.arrows, v }; return sp; };
test('find is deterministic for a seed and restores S', () => {
  const before = { p: S.pattern, f: S.finish, o: S.oil };
  const a = F.find(cat, { ...ctx, seed: 7 }), b = F.find(cat, { ...ctx, seed: 7 });
  assert.equal(a.none, false); assert.deepEqual(a.best, b.best); assert.deepEqual(a.alt, b.alt);
  assert.deepEqual({ p: S.pattern, f: S.finish, o: S.oil }, before);
  assert.ok(a.best.entry >= 17 && a.best.entry <= 18);
  assert.equal(a.best.arrows * 2 % 1, 0, 'half-board target');
});
test('pocket % falls as the arrows spread grows (same seed)', () => {
  const p = [0.5, 1.5, 3, 5].map(v => F.find(cat, { ...ctx, spread: withArrows(v) }).best.pocket);
  for (let i = 1; i < p.length; i++) assert.ok(p[i] <= p[i - 1], `non-increasing: ${p}`);
  assert.ok(p[0] - p[3] >= 20, `sensible drop: ${p}`);
});
test('spread: LaneTrax "Arrows: Average Difference" is used (mean |miss| → SD), else labelled assumed', () => {
  assert.equal(F.spreadFrom(null).arrows.src, 'assumed');
  const P = { aggregates: [{ date: '2000-01-01', totalShots: 90, kpis: [{ key: 'arrowsDifference', value: 1.45 }] }] };
  const s = F.spreadFrom(P); assert.equal(s.arrows.src, 'device'); assert.equal(s.arrows.n, 90); assert.equal(s.arrows.v, 1.82);
});
test('coach text: model estimate, basis, sample size; never a strike %', () => {
  const P = { aggregates: [{ date: '2000-01-01', totalShots: 90, kpis: [{ key: 'arrowsDifference', value: 1.45 }] }] };
  const w = F.say(F.find(cat, { ...ctx, spread: F.spreadFrom(P) }));
  assert.match(w.line, /^Stand \d+, aim [\d.]+ at the arrows\. Pocket \d+% \(model estimate, your accuracy ±1\.45 bds, n=90; 200 simulated shots\)\.$/);
  assert.ok(!/strike/i.test(w.line + w.alt));
  assert.ok(w.why.length > 10);
  const d = F.say(F.find(cat, ctx), { mode: 'dots' }); assert.match(d.line, /at the dots/);
});
test('spec-TBD ball returns none', () => { assert.equal(F.find({ name: 'x' }).none, true); });
