// Targeting (TEAM_PROMPT_TARGETING.md): laydown/dots math, box, pocket call, cited moves, lefty words, Find my strike line.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../js/cc/target.js';
import * as F from '../../js/cc/strikeline.js';
import { S, analyze, yToFeet, xToBoard } from '../../js/engine.js';
import { balls, specOK } from '../../js/data.js';
import * as G from '../../js/cc/geom.js';
const cat = balls.find(b => b.name === 'Big Bite') || balls.find(b => /Big Bite/.test(b.name));
const ctx = { speed: 15, rev: 220, ft: 38 };
const D = T.DEFAULTS;

test('laydown = feet − offset + drift; dots extend in a straight line to the arrows', () => {
  assert.equal(T.laydownOf({ ...D, feet: 17 }), 10);
  assert.equal(T.laydownOf({ ...D, feet: 17, drift: 2 }), 12);
  assert.equal(T.arrowsOf({ ...D, mode: 'dots', eyes: 13.5 }, 10), 17);   // dots 13.5 from 10 → arrows 17
  assert.ok(Math.abs(G.arrowsBoard(10, T.aimDegOf(10, 10.5)) - 10.5) < 0.01);   // in reach: exact
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
test('high/light: the move is always toward the miss (bowl.com, NBA); the engine only reports modelAgrees', () => {
  const box = T.boxFor(cat, ctx);
  for (const eyes of [6, 8, 10, 12, 14]) for (const feet of [14, 17, 20, 23]) {
    const t = { ...D, feet, eyes }, r = T.read(cat, t, ctx, box); if (r.call !== 'high' && r.call !== 'light') continue;
    const s = T.suggest(cat, t, ctx, box, r); assert.ok(s && s.cited, 'cited move');
    assert.equal(s.sign, r.call === 'high' ? 1 : -1);                          // + = higher boards = RH left
    assert.equal(s.move.id, r.call === 'high' ? '21' : 'p2');
    assert.ok(T.SRC[s.move.src] && /^https:/.test(T.SRC[s.move.src].url)); assert.equal(typeof s.modelAgrees, 'boolean');
    const rh = T.moveWords(s, false), lh = T.moveWords(s, true);
    assert.equal(rh.replace(/left/g, 'X').replace(/right/g, 'left').replace(/X/g, 'right'), lh);
    if (r.call === 'high') assert.match(rh, /feet 2 left, eyes 1 left/);
  }
});
test('Lane coach: the engine high/light sentence is replaced by the cited direction', () => {
  assert.equal(T.houseRule('High. 18.3, 0.8 boards past 17.5. Move feet right 1 board or go weaker.'), 'High. 18.3, 0.8 boards past 17.5. Move toward the miss: feet 2 left, eyes 1 left or go weaker.');
  assert.match(T.houseRule('Light. 15.0, 2.5 boards short of 17.5. Move feet left 3 boards or go stronger. Way off. Reset the line.'), /feet 2 right, eyes 2 right or go stronger\. Way off/);
  assert.equal(T.houseRule('Strike. 17.5, sweeping the 5.'), 'Strike. 17.5, sweeping the 5.');
});
test('geometry: arrowsBoard equals the engine path at 15 ft for every ball, laydown and aim (investigation, DECISIONS #26)', () => {
  const keep = { p: S.pattern, f: S.finish, o: S.oil }; S.pattern = 'house'; S.finish = 'factory'; S.oil = 1;
  let worst = 0;
  try {
    for (const b of balls.filter(specOK)) for (const rel of [5, 12, 20, 30]) for (const aim of [-8, -3, 0, 4, 8]) {
      const a = analyze(b, { speed: 15, rev: 220, release: rel, aim }); const pts = a.points;
      let x = null; for (let i = 1; i < pts.length; i++) if (yToFeet(pts[i].y) >= 15) { const p0 = pts[i - 1], p1 = pts[i], f = (15 - yToFeet(p0.y)) / (yToFeet(p1.y) - yToFeet(p0.y)); x = xToBoard(p0.x + (p1.x - p0.x) * f); break; }
      worst = Math.max(worst, Math.abs(x - G.arrowsBoard(rel, aim)));
    }
  } finally { Object.assign(S, { pattern: keep.p, finish: keep.f, oil: keep.o }); }
  assert.ok(worst < 0.05, `worst ${worst}`);
  assert.ok(G.REACH > 0.7 && G.REACH < 0.9);                                  // the model's whole launch range is ±~0.8 board
  const f = G.aimFor(10, 17); assert.ok(f.clamped); assert.equal(f.aim, -8);  // the old "laydown 10 → arrows 17" line is out of reach
});
test('engine limitation is real (revisit the UI label if this fails): no NBA-style house pocket line exists in the model', () => {
  const keep = { p: S.pattern, f: S.finish, o: S.oil }; S.pattern = 'house'; S.finish = 'factory'; S.oil = 1;
  try {
    for (const [speed, rev] of [[15, 220], [17, 300], [13, 350], [18, 400]]) {
      let nba = 0, hook = 0, out = 99;
      for (const b of balls.filter(specOK)) for (let rel = 5; rel <= 30; rel++) for (let aim = -8; aim <= 8; aim += 2) {
        const a = analyze(b, { speed, rev, release: rel, aim }); if (a.gutter || a.entryBoard < 17 || a.entryBoard > 18 || a.angle < 4 || a.angle > 6) continue;
        const bds = a.points.map(p => xToBoard(p.x)), mn = Math.min(...bds), ft = yToFeet(a.points[bds.indexOf(mn)].y);
        if (ft < 30) continue;                                                  // outermost point at the foul line = no downlane breakpoint
        hook = Math.max(hook, bds[bds.length - 1] - mn); out = Math.min(out, mn);
        if (mn >= 8 && mn <= 10 && ft >= 37 && ft <= 43) nba++;
      }
      assert.equal(nba, 0, `${speed}/${rev}: model now has NBA-style lines`);
      assert.ok(hook <= 7 && out > 10, `${speed}/${rev}: hook ${hook}, outermost ${out}`);
    }
  } finally { Object.assign(S, { pattern: keep.p, finish: keep.f, oil: keep.o }); }
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
test('Find: the reported arrows board is where the engine path actually crosses 15 ft (ENGINE_VERIFICATION_REPORT 5b: HEAD said 18, path crossed 11.7)', () => {
  const cross = pts => { for (let i = 1; i < pts.length; i++) if (yToFeet(pts[i].y) >= 15) { const p0 = pts[i - 1], p1 = pts[i], f = (15 - yToFeet(p0.y)) / (yToFeet(p1.y) - yToFeet(p0.y)); return xToBoard(p0.x + (p1.x - p0.x) * f); } return null; };
  let n = 0;
  for (const b of balls.filter(specOK).slice(0, 6)) for (const [speed, rev] of [[15, 220], [17, 300], [13, 350]]) {
    const r = F.find(b, { speed, rev, ft: 38, n: 40 }); if (r.none || !r.best) continue;
    const s = F.say(r), { lay, arrows } = r.best, f = G.aimFor(lay, arrows);
    const rel = f.clamped ? lay + (arrows - f.got) : lay;                      // same rule as strikeline shot()
    const x = cross(analyze(b, { speed, rev, release: rel, aim: f.aim }).points);
    assert.ok(Math.abs(x - arrows) < 0.1, `${b.name} ${speed}/${rev}: reported arrows ${arrows}, path crosses ${x}`);
    assert.ok(Math.abs(x - s.eye) <= 0.3, `${b.name}: "aim ${s.eye} at the arrows" but the path crosses ${x}`);
    assert.ok(Math.abs(s.eye - (lay)) <= G.REACH + 0.5 || f.clamped, 'eye within the model reach of the laydown');
    n++;
  }
  assert.ok(n >= 6, `checked ${n}`);
});

test('Sim2 #12: the Find card book note follows the bowler style, range when unknown', () => {
  assert.match(T.bookLineFor('stroker'), /real stroker house line .*laydown 13 to board 10/);
  assert.match(T.bookLineFor('tweener'), /laydown 14½ to board 10/);
  assert.match(T.bookLineFor({ v: 'cranker' }), /real cranker house line .*laydown 18/);
  for (const s of [null, 'two', '']) { const t = T.bookLineFor(s); assert.match(t, /laydown 13–18 \(stroker to power\)/); assert.doesNotMatch(t, /tweener/); }
});
