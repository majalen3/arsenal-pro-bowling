// Bowler Card (TEAM_PROMPT_BOWLER_CARD.md). Synthetic sessions are TEST DATA (ids 'test-sess-*'); LaneTrax data is the anonymized fixture.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { seedEvents } from '../../js/data/seed.js';
import { project } from '../../js/data/project.js';
import { mkEvent } from '../../js/data/events.js';
import { planLaneTrax } from '../../js/data/importer.js';
import * as C from '../../js/cc/card.js';
const EXPECTED = JSON.parse(readFileSync(new URL('../fixtures/lanetrax/session-report.expected.json', import.meta.url)));
const base = () => seedEvents({ now: 1000 });
// TEST DATA: one game, frames 1..k strikes, others 9 + leave [p] then spare (made if f is odd when mixed=true).
function game(sid, k, { p = 10, mixed = false, ts = 5000, ball = 'own-test' } = {}) {
  const out = []; let t = ts;
  for (let f = 1; f <= 10; f++) {
    if (f <= k) { out.push(mkEvent('shot.logged', sid, { sessionId: sid, game: 1, frame: f, roll: 1, down: 10, leave: [], ballId: ball }, { ts: t++ })); if (f === 10) { out.push(mkEvent('shot.logged', sid, { sessionId: sid, game: 1, frame: 10, roll: 2, down: 10, leave: [], ballId: ball }, { ts: t++ })); out.push(mkEvent('shot.logged', sid, { sessionId: sid, game: 1, frame: 10, roll: 3, down: 10, leave: [], ballId: ball }, { ts: t++ })); } continue; }
    const made = !mixed || f % 2 === 1;
    out.push(mkEvent('shot.logged', sid, { sessionId: sid, game: 1, frame: f, roll: 1, down: 9, leave: [p], ballId: ball, miss: 'pocket' }, { ts: t++ }));
    out.push(mkEvent('shot.logged', sid, { sessionId: sid, game: 1, frame: f, roll: 2, down: made ? 1 : 0, leave: made ? [] : [p], ballId: ball }, { ts: t++ }));
    if (f === 10 && made) out.push(mkEvent('shot.logged', sid, { sessionId: sid, game: 1, frame: 10, roll: 3, down: 9, leave: [p], ballId: ball }, { ts: t++ }));
  }
  return out;
}
test('LaneTrax levels: thresholds as published (fetched table)', () => {
  assert.equal(C.levelOf('speedSD', 0.3), 5); assert.equal(C.levelOf('speedSD', 1), 4); assert.equal(C.levelOf('speedSD', 2.01), 1);
  assert.equal(C.levelOf('rpmSD', 25), 4); assert.equal(C.levelOf('rpmSD', 100), 2); assert.equal(C.levelOf('arrows', 3), 3);
  assert.equal(C.levelOf('conversion', 90), 5); assert.equal(C.levelOf('conversion', 64.9), 2); assert.equal(C.levelOf('conversion', 39), 1);
  assert.equal(C.levelOf('conversion', null), null);
});
test('style (bowling.com ranges) and match (MOTIV rule): cited, labelled, never ranked', () => {
  assert.equal(C.styleOf(231).k, 'stroker'); assert.equal(C.styleOf(300).k, 'tweener'); assert.equal(C.styleOf(450).k, 'cranker'); assert.match(C.styleOf(150).note, /below/);
  assert.equal(C.matchOf(17, 320).k, 'matched'); assert.equal(C.matchOf(17, 250).k, 'speed-dominant'); assert.equal(C.matchOf(15, 300).k, 'rev-dominant');
  assert.deepEqual([C.matchOf(21, 500).lo, C.matchOf(21, 500).hi], [500, 550]);
});
test('walk/throwStats: strikes, single-pin conversion, opens (test data)', () => {
  const P = project(base().concat(game('test-sess-a', 4, { mixed: true })));
  const s = C.sessionsOf(P).find(x => x.id === 'test-sess-a');
  const t = s.stats.throws;
  assert.equal(t.first, 10); assert.equal(t.strikes, 4); assert.equal(t.strikePct, 40);
  assert.equal(t.single, 6); assert.equal(t.singleMade, 3); assert.equal(t.multi, 0); assert.equal(t.opens, 3); assert.equal(t.frames, 10);
  assert.deepEqual(t.leaves[0], { leave: '10', n: 6, made: 3 }); assert.equal(t.firstAvg, 9.4); assert.equal(t.carryPct, 40);
  assert.equal(s.source, 'Scored on Tonight'); assert.equal(s.stats.games, 1);
});
test('LaneTrax fixture: session row, card numbers carry source + n + dates', () => {
  const p = planLaneTrax({ record: EXPECTED, now: 9000, deviceId: 'd' });
  const P = project(base().concat(p.events));
  const list = C.sessionsOf(P), s = list.find(x => x.agg);
  assert.equal(s.source, 'LaneTrax'); assert.equal(s.stats.ltx.shots, 90); assert.equal(s.stats.ltx.strikePct, 12.8); assert.equal(s.stats.ltx.first, 47); assert.equal(s.stats.ltx.spare, 39);
  const c = C.bowlerCard(P);
  assert.equal(c.rev.measured.v, 231.4); assert.equal(c.rev.measured.n, 90); assert.equal(c.rev.measured.dates, '2000-01-01'); assert.ok(c.rev.measured.enough);
  assert.equal(c.style.k, 'stroker'); assert.equal(c.consistency.arrows.level, 4); assert.equal(c.consistency.speed.level, 1);
  assert.equal(c.strike.ltx.v, 12.8); assert.equal(c.spare.ltx.made, 8); assert.equal(c.spare.ltx.n, 39);
  assert.match(c.tend.impactAngle.src.note, /real degrees/);
  assert.equal(c.takeaways.strength.k, 'arrows'); assert.ok(c.takeaways.leak); assert.ok(c.takeaways.drill.text.length < 140);
  const f = C.figures(c); assert.deepEqual(f.map(x => x.k), ['spare', 'strike', 'release']); for (const x of f) assert.ok(x.src);
});
test('compare: vs previous session and vs mean (test data)', () => {
  const P = project(base().concat(game('test-sess-1', 2, { ts: 5000 }), game('test-sess-2', 6, { ts: 90000 })));
  for (const [id, d] of [['test-sess-1', '2026-01-01'], ['test-sess-2', '2026-01-08']]) P.sessions[id] = { id, date: d };
  const list = C.sessionsOf(P); assert.equal(list[0].id, 'test-sess-2');
  const cmp = C.compare(list, 'test-sess-2'), st = cmp.find(x => x.k === 'strikePct');
  assert.equal(st.v, 54.5); assert.equal(st.prev, 18.2); assert.equal(st.dPrev, 36.3);   // 10th-frame fill ball is a rack: 11 first balls
  const all = list.filter(x => x.stats.strikePct != null); assert.equal(st.mean, Math.round(all.reduce((s, x) => s + x.stats.strikePct, 0) / all.length * 10) / 10);
});
test('tagging a LaneTrax session to a ball feeds the advisor (aggregate gets ballId)', () => {
  const p = planLaneTrax({ record: EXPECTED, now: 9000, deviceId: 'd' });
  const sid = p.events.find(e => e.type === 'session.created').entityId;
  const P = project(base().concat(p.events, [mkEvent('session.edited', sid, { fields: { ballId: 'own-test' } }, { ts: 9999 })]));
  assert.equal(P.aggregates[0].ballId, 'own-test'); assert.equal(C.sessionsOf(P)[0].ballId, 'own-test');
});
test('empty: no invented numbers; headline says what to do', () => {
  const P = project([]); const c = C.bowlerCard(P);
  assert.ok(c.empty); assert.equal(c.takeaways, null); assert.equal(C.figures(c).length, 0); assert.match(C.headline(c).text, /Score a game|import/);
});
test('recap: one headline change, ≤2 supporting stats, one fixable focus (test data)', () => {
  const P = project(base().concat(game('test-sess-1', 2, { ts: 5000 }), game('test-sess-2', 6, { ts: 90000, mixed: true })));
  for (const [id, d] of [['test-sess-1', '2026-01-01'], ['test-sess-2', '2026-01-08']]) P.sessions[id] = { id, date: d };
  const list = C.sessionsOf(P), r = C.recapOf(list, 'test-sess-2');
  assert.match(r.head, /^\d+ game: (\d+ pins (over|under)|right on) your \d+ average\.$/); assert.ok(r.support.length <= 2);
  assert.match(r.support[0].text, /^\d+ of \d+/); assert.equal(r.support[1].label, 'Spares made'); assert.equal(r.perGame.length, 1);
  assert.match(r.focus.text, /^Next focus: the 10 pin, 2 of 4 made tonight\.$/);
  assert.doesNotMatch(JSON.stringify(r), /good job|great|awesome/i);
  const p = planLaneTrax({ record: EXPECTED, now: 9000, deviceId: 'd' }); const P2 = project(base().concat(p.events)); const l2 = C.sessionsOf(P2);
  const r2 = C.recapOf(l2, l2.find(x => x.agg).id); assert.match(r2.head, /^6 strikes on 47 first balls; 8 of 39 spares made\.$/); assert.match(r2.focus.text, /^Next focus:/);
});
