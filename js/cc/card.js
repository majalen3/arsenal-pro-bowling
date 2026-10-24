// Bowler Card + session results (BC). Pure and DOM-free (node --test). Every number carries {src, n, dates}.
// Sources: LaneTrax Levels table (docs.lanetrax.app, fetched); bowling.com style ranges (search excerpt) with the USBC caveat
// that labels are not definitive (USBC 2010 study, search excerpt); MOTIV speed↔rev balance rule (search excerpt);
// USBC Rule 319a 21-game minimum (search excerpt). Anything else is labelled "app estimate".
import { stateOf } from './quicklog.js';
export const SRC = {
  levels: { label: 'LaneTrax Levels table', how: 'fetched', url: 'https://docs.lanetrax.app/ios/pastsessions/past-sessions' },
  style: { label: 'bowling.com ranges: stroker 200–300, tweener 300–400, cranker 400+ rpm', how: 'search excerpt', url: 'https://www.bowling.com/knowledge-hub/bowling-balls/bowler-types/all' },
  usbcStyle: { label: 'USBC: style labels are not definitive (2010 study used 220/325/520 rpm as examples)', how: 'search excerpt', url: 'https://images.bowl.com/bowl/media/legacy/internap/bowl/usbowler/pdfs/2010/USBowler_WINTER_PDF.pdf' },
  match: { label: 'MOTIV: 17 mph ↔ 300–350 rpm is balanced; ±50 rpm per mph', how: 'search excerpt', url: 'https://www.motivbowling.com/blog/am-i-rev-or-speed-dominant.html' },
  games: { label: 'USBC Rule 319a: 21 games', how: 'search excerpt', url: 'https://bowl.com/welcome/recent-rule-changes' },
  shots: { label: 'app estimate: 30 shots', how: 'app estimate', url: null },
};
export const MIN_SHOTS = 30, MIN_GAMES = 21;
// LaneTrax Levels (fetched). Lower SD / arrows is better; conversion higher is better. Level 1 = beyond level 2.
export const LEVELS = {
  speedSD: [0.3, 1, 1.5, 2], rpmSD: [10, 25, 50, 100], arrows: [1, 2, 3, 5], conversion: [90, 80, 65, 40],
};
export function levelOf(kind, v) {
  if (v == null || !Number.isFinite(+v)) return null;
  const t = LEVELS[kind]; if (!t) return null;
  if (kind === 'conversion') { for (let i = 0; i < 4; i++) if (v >= t[i]) return 5 - i; return 1; }
  for (let i = 0; i < 4; i++) if (v <= t[i]) return 5 - i; return 1;
}
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
const r1 = v => (v == null ? null : Math.round(v * 10) / 10);
const dayOf = ts => new Date(ts).toISOString().slice(0, 10);
const span = ds => { const d = ds.filter(Boolean).sort(); return d.length ? (d[0] === d[d.length - 1] ? d[0] : `${d[0]} – ${d[d.length - 1]}`) : null; };
// ---- deliveries of one game: each throw with rack/facing/made, via quicklog.stateOf (USBC scoring walk)
export function walk(throws) {
  const out = [];
  for (let i = 0; i < throws.length; i++) {
    const st = stateOf(throws.slice(0, i)); if (st.done) break;
    const fr = st.frames[st.frames.length - 1] || { marks: [] }, pm = fr.marks[fr.marks.length - 1];
    const rack = st.roll === 1 || (st.frame === 10 && (pm === 'X' || pm === '/'));
    const t = throws[i], facing = st.standing.slice(), down = t.foul ? 0 : t.down;
    out.push({ t, frame: st.frame, roll: st.roll, rack, facing, down, strike: rack && !t.foul && down === 10, made: !rack && !t.foul && down === facing.length, leave: (t.leave || []).slice().sort((a, b) => a - b) });
  }
  return out;
}
// ---- per-throw-set stats: strikes, spares (single vs multi), opens, per-leave conversion, pocket
export function throwStats(games) {
  let first = 0, firstPins = 0, pocketNS = 0, strikes = 0, single = 0, singleMade = 0, multi = 0, multiMade = 0, frames = 0, opens = 0, tagged = 0, pocket = 0;
  const byLeave = {};
  for (const g of games) {
    const d = walk(g.throws);
    for (const x of d) {
      if (x.rack) { first++; firstPins += x.down; if (x.strike) strikes++;
        const m = x.t.miss; if (x.strike || m === 'pocket' || m === 'high' || m === 'light') { tagged++; if (x.strike || m === 'pocket') pocket++; if (!x.strike && m === 'pocket') pocketNS++; } }
      else if (x.facing.length) {
        const k = x.facing.join('-'); const L = byLeave[k] = byLeave[k] || { leave: k, n: 0, made: 0 }; L.n++; if (x.made) L.made++;
        if (x.facing.length === 1) { single++; if (x.made) singleMade++; } else { multi++; if (x.made) multiMade++; }
      }
    }
    const st = stateOf(g.throws);
    for (const f of st.frames) { if (!f.marks.length) continue; const closed = st.done || f.f < st.frame; if (!closed) continue; frames++; if (!f.marks.some(m => m === 'X' || m === '/')) opens++; }
  }
  const spare = single + multi, spareMade = singleMade + multiMade;
  return { first, strikes, strikePct: pct(strikes, first), firstAvg: first ? r1(firstPins / first) : null, carryN: strikes + pocketNS, carryPct: pocket && tagged > strikes ? pct(strikes, strikes + pocketNS) : null, spare, spareMade, sparePct: pct(spareMade, spare), single, singleMade, singlePct: pct(singleMade, single),
    multi, multiMade, multiPct: pct(multiMade, multi), frames, opens, openPct: pct(opens, frames), tagged, pocket, pocketPct: pct(pocket, tagged),
    leaves: Object.values(byLeave).sort((a, b) => b.n - a.n || (a.leave < b.leave ? -1 : 1)) };
}
// ---- sessions: quick-log/CSV games and LaneTrax aggregates, one row per session id
export function sessionsOf(P) {
  const S = {};
  const get = id => (S[id] = S[id] || { id, games: [], scores: [], agg: null, ts: 0, date: null, meta: (P.sessions || {})[id] || {} });
  const byGame = {};
  for (const s of P.shots || []) if (s.frame != null && s.sessionId) { const k = s.sessionId + '#' + (s.game || 1); (byGame[k] = byGame[k] || { sessionId: s.sessionId, game: s.game || 1, throws: [], balls: new Set(), ts: 0 }); byGame[k].throws.push(s); if (s.ballId) byGame[k].balls.add(s.ballId); byGame[k].ts = Math.max(byGame[k].ts, s.ts); }
  for (const g of Object.values(byGame)) { const x = get(g.sessionId); const st = stateOf(g.throws); x.games.push({ game: g.game, throws: g.throws, balls: [...g.balls].sort(), score: st.ok ? st.total : null, complete: !!(st.ok && st.complete), frames: st.frames, ts: g.ts }); x.ts = Math.max(x.ts, g.ts); }
  for (const sc of P.scores || []) if (sc.sessionId) { const x = get(sc.sessionId); x.scores.push(sc); x.ts = Math.max(x.ts, sc.ts); if (sc.date) x.date = x.date || sc.date; }
  for (const a of P.aggregates || []) if (a.sessionId) { const x = get(a.sessionId); x.agg = a; x.ts = Math.max(x.ts, a.ts); x.date = a.date || x.date; }
  return Object.values(S).map(x => {
    x.games.sort((a, b) => a.game - b.game);
    x.date = x.meta.date || x.date || (x.ts ? dayOf(x.ts) : null);
    x.source = x.agg ? 'LaneTrax' : x.games.length ? 'Scored on Tonight' : x.scores.some(s => s.importId) ? 'CSV import' : 'Logged scores';
    x.ballId = x.meta.ballId || (x.agg && x.agg.ballId) || null;
    x.stats = statsOf(x);
    return x;
  }).filter(x => x.games.length || x.scores.length || x.agg).sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.ts - a.ts);
}
export function statsOf(x) {
  const scores = [...x.games.filter(g => g.complete && g.score != null).map(g => g.score), ...x.scores.map(s => +s.score).filter(Number.isFinite)];
  const t = x.games.length ? throwStats(x.games) : null, a = x.agg, o = a && a.outcomes || {};
  const out = { games: scores.length, series: scores.length ? scores.reduce((s, v) => s + v, 0) : null, avg: scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null, high: scores.length ? Math.max(...scores) : null, throws: t };
  if (a) {
    const K = k => (a.kpis || []).find(z => z.key === k), first = o.strikes && o.leaves ? o.strikes.n + o.leaves.n : null, spare = o.madeSpares && o.missedSpares ? o.madeSpares.n + o.missedSpares.n : null;
    out.ltx = { shots: a.totalShots ?? null, first, strikes: o.strikes ? o.strikes.n : null, strikePct: o.strikes ? o.strikes.pct : null, spare, spareMade: o.madeSpares ? o.madeSpares.n : null, sparePct: o.madeSpares ? o.madeSpares.pct : null,
      rev: K('revRate') ? K('revRate').value : null, impactSpeed: K('impactSpeed') ? K('impactSpeed').value : null, arrows: K('arrowsDifference') ? K('arrowsDifference').value : null,
      levels: Object.fromEntries((a.kpis || []).filter(k => k.key).map(k => [k.key, k.level])), summary: a.summary || {}, warnings: a.warnings || [] };
  }
  out.strikePct = t && t.first ? t.strikePct : out.ltx ? out.ltx.strikePct : null;
  out.sparePct = t && t.spare ? t.sparePct : out.ltx ? out.ltx.sparePct : null;
  out.openPct = t && t.frames ? t.openPct : null;
  return out;
}
// Comparison: this session vs the previous session that has the metric, and vs the mean of all sessions with it.
export const METRICS = [['avg', 'Average', ''], ['strikePct', 'Strikes', '%'], ['sparePct', 'Spares made', '%'], ['openPct', 'Open frames', '%']];
export function compare(list, id) {
  const i = list.findIndex(x => x.id === id); if (i < 0) return [];
  const me = list[i], older = list.slice(i + 1);
  return METRICS.map(([k, label, unit]) => {
    const v = me.stats[k]; if (v == null) return null;
    const prev = older.find(x => x.stats[k] != null), all = list.filter(x => x.stats[k] != null);
    const mean = all.length > 1 ? r1(all.reduce((s, x) => s + x.stats[k], 0) / all.length) : null;
    return { k, label, unit, v, prev: prev ? prev.stats[k] : null, prevDate: prev ? prev.date : null, dPrev: prev ? r1(v - prev.stats[k]) : null, mean, dMean: mean != null ? r1(v - mean) : null, nSessions: all.length };
  }).filter(Boolean);
}
// ---- style / match (cited rules only)
export function styleOf(rev) {
  if (rev == null) return null;
  const k = rev >= 400 ? 'cranker' : rev >= 300 ? 'tweener' : 'stroker';
  return { k, note: rev < 200 ? 'below the published 200 rpm floor' : null, src: SRC.style };
}
export function matchOf(speed, rev) {
  if (speed == null || rev == null) return null;
  const lo = Math.round(300 + 50 * (speed - 17)), hi = Math.round(350 + 50 * (speed - 17));
  return { k: rev < lo ? 'speed-dominant' : rev > hi ? 'rev-dominant' : 'matched', lo, hi, src: SRC.match };
}
// Shot-weighted mean of a number across aggregates. Returns {v, n, sessions, dates}.
function wmean(aggs, pick) {
  let s = 0, n = 0; const used = [];
  for (const a of aggs) { const v = pick(a); const w = a.totalShots || 0; if (v == null || !Number.isFinite(+v) || !w) continue; s += v * w; n += w; used.push(a); }
  return n ? { v: r1(s / n), n, sessions: used.length, dates: span(used.map(a => a.date)), ids: used.map(a => a.sessionId) } : null;
}
const fv = f => (f == null ? null : typeof f === 'object' ? (f.v == null || f.v === '' ? null : +f.v) : +f);
// ---- the card
export function bowlerCard(P, opts = {}) {
  const list = opts.sessions || sessionsOf(P), aggs = (P.aggregates || []).filter(a => a.source === 'LaneTrax');
  const b = Object.assign({}, opts.profile || {}, P.bowler || {}), typed = (k, u) => fv(b[k]) == null ? null : { v: fv(b[k]), unit: u, src: b[k] && b[k].prov && b[k].prov.kind === 'device' ? { label: b[k].prov.label || 'device', how: 'measured, accepted by you' } : { label: 'you reported', how: 'typed' }, n: null, dates: null };
  const S = k => a => a.summary && a.summary[k] && (a.summary[k].unit === 'mph' || a.summary[k].unit === 'board' || a.summary[k].unit === 'ft' || a.summary[k].unit === '°') ? a.summary[k].mean : null;
  const KPI = k => a => { const x = (a.kpis || []).find(z => z.key === k); return x ? x.value : null; };
  const mk = (m, unit, src) => m ? { v: m.v, unit, src, n: m.n, nLabel: `${m.n} shots, ${m.sessions} session${m.sessions === 1 ? '' : 's'}`, dates: m.dates, enough: m.n >= MIN_SHOTS } : null;
  const ltxSrc = { label: 'LaneTrax session report', how: 'imported' };
  const speedM = mk(wmean(aggs, S('launchSpeed')) || wmean(aggs, S('averageSpeed')), 'mph', Object.assign({ at: wmean(aggs, S('launchSpeed')) ? 'launch' : 'average' }, ltxSrc));
  const revM = mk(wmean(aggs, KPI('revRate')), 'rpm', ltxSrc);
  const speedT = typed('speed', 'mph'), revT = typed('rev', 'rpm');
  const speed = { typed: speedT, measured: speedM }, rev = { typed: revT, measured: revM };
  const sv = speedM ? speedM.v : speedT && speedT.v, rv = revM ? revM.v : revT && revT.v;
  const style = rv != null ? Object.assign(styleOf(rv), { from: revM ? 'measured' : 'typed', typed: b.style || null }) : null;
  const match = matchOf(sv, rv);
  const release = { tilt: typed('tilt', '°'), rotation: typed('rotation', '°'), pap: b.pap ? { v: typeof b.pap === 'object' ? b.pap.v : b.pap, unit: 'in', src: { label: 'you reported', how: 'typed' } } : null };
  // consistency (LaneTrax levels from the latest report that has them; the level itself is LaneTrax's)
  const lastAgg = aggs.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] || null;
  const lvl = k => { const x = lastAgg && (lastAgg.kpis || []).find(z => z.key === k); return x ? { level: x.level, v: x.value, unit: x.unit, metric: x.metric || x.label, date: lastAgg.date, n: lastAgg.totalShots } : null; };
  const consistency = lastAgg ? { speed: lvl('impactSpeed'), rpm: lvl('revRate'), arrows: lvl('arrowsDifference'), conversion: lvl('conversionRate'), src: SRC.levels } : null;
  // results from scored games (all sessions) and LaneTrax outcomes
  const allGames = list.flatMap(x => x.games), T = allGames.length ? throwStats(allGames) : null;
  const gDates = span(list.filter(x => x.games.length).map(x => x.date));
  const gSessions = list.filter(x => x.games.length).length;
  const ltxOut = aggs.reduce((s, a) => { const o = a.outcomes || {}; if (o.strikes && o.leaves) { s.first += o.strikes.n + o.leaves.n; s.strikes += o.strikes.n; } if (o.madeSpares && o.missedSpares) { s.spare += o.madeSpares.n + o.missedSpares.n; s.made += o.madeSpares.n; } return s; }, { first: 0, strikes: 0, spare: 0, made: 0 });
  const ltxDates = span(aggs.map(a => a.date));
  const strike = { games: T && T.first ? { v: T.strikePct, n: T.first, nLabel: `${T.first} first balls, ${gSessions} session${gSessions === 1 ? '' : 's'}`, dates: gDates, src: { label: 'your scored games', how: 'logged' } } : null,
    ltx: ltxOut.first ? { v: pct(ltxOut.strikes, ltxOut.first), n: ltxOut.first, nLabel: `${ltxOut.first} first balls, ${aggs.length} report${aggs.length === 1 ? '' : 's'}`, dates: ltxDates, src: ltxSrc } : null };
  const spare = { single: T && T.single ? { v: T.singlePct, made: T.singleMade, n: T.single, dates: gDates, src: { label: 'your scored games', how: 'logged' } } : null,
    multi: T && T.multi ? { v: T.multiPct, made: T.multiMade, n: T.multi, dates: gDates, src: { label: 'your scored games', how: 'logged' } } : null,
    ltx: ltxOut.spare ? { v: pct(ltxOut.made, ltxOut.spare), made: ltxOut.made, n: ltxOut.spare, dates: ltxDates, src: ltxSrc } : null };
  const accuracy = { arrows: mk(wmean(aggs, KPI('arrowsDifference')), 'boards', Object.assign({ note: 'LaneTrax "Arrows": mean of the closest 50% of arrow differences' }, ltxSrc)),
    pocket: T && T.tagged ? { v: T.pocketPct, n: T.tagged, dates: gDates, src: { label: 'your "First ball hit" tags + strikes', how: 'logged' } } : null };
  const tend = { breakpointBoard: mk(wmean(aggs, S('breakpointBoard')), 'board', ltxSrc), breakpointDistance: mk(wmean(aggs, S('breakpointDistance')), 'ft', ltxSrc),
    entryBoard: mk(wmean(aggs, S('entryBoard')), 'board', ltxSrc), impactAngle: mk(wmean(aggs, S('impactAngle')), '°', Object.assign({ note: 'measured by LaneTrax (real degrees), not the app model' }, ltxSrc)) };
  const trend = list.slice().reverse().filter(x => x.stats.strikePct != null).map(x => ({ date: x.date, v: x.stats.strikePct, src: x.source }));
  const avgTrend = list.slice().reverse().filter(x => x.stats.avg != null).map(x => ({ date: x.date, v: x.stats.avg }));
  const gamesN = list.reduce((s, x) => s + x.stats.games, 0);
  const card = { throws: T, speed, rev, style, match, release, consistency, strike, spare, accuracy, tend, trend, avgTrend, games: gamesN, sessions: list.length, leaves: T ? T.leaves : [], src: SRC };
  card.takeaways = takeaways(card);
  card.empty = !list.length && !speedT && !revT;
  return card;
}
// Three coach takeaways from levels (LaneTrax thresholds, cited). Conversion from scored games is levelled with the same table.
const DRILL = {
  conversion: (c) => { const L = (c.leaves || []).filter(l => l.n >= 2).sort((a, b) => (a.made / a.n) - (b.made / b.n))[0]; return L ? `Spare drill: 10 shots at the ${L.leave} (${L.made}/${L.n} so far), cross-lane.` : 'Spare drill: 10 shots at the 10 pin and 10 at the 7 pin, cross-lane.'; },
  speed: () => 'Speed drill: 10 shots at one target, note the mph each time. Level 4 is ≤1 mph spread.',
  rpm: () => 'Release drill: 10 shots with the same hand position. Level 4 is ≤25 rpm spread.',
  arrows: () => 'Target drill: 10 shots at one arrow. Level 4 is ≤2 boards average miss.',
};
const NAME = { conversion: 'Spare conversion', speed: 'Speed control', rpm: 'Rev consistency', arrows: 'Accuracy at the arrows' };
export function takeaways(c) {
  const cand = [];
  const conv = c.spare.single || c.spare.multi ? (() => { const n = (c.spare.single ? c.spare.single.n : 0) + (c.spare.multi ? c.spare.multi.n : 0), m = (c.spare.single ? c.spare.single.made : 0) + (c.spare.multi ? c.spare.multi.made : 0); return { v: pct(m, n), n, made: m }; })() : c.spare.ltx;
  if (conv && conv.n) cand.push({ k: 'conversion', level: levelOf('conversion', conv.v), text: `${conv.made}/${conv.n} spares made (${conv.v}%)` });
  if (c.consistency) for (const [k, key] of [['speed', 'speed'], ['rpm', 'rpm'], ['arrows', 'arrows']]) { const x = c.consistency[key]; if (x && x.level) cand.push({ k, level: x.level, text: `${x.metric ? x.metric.toLowerCase() + ' ' : ''}${x.v} ${x.unit}, LaneTrax ${x.date}` }); }
  if (!cand.length) return null;
  const sorted = cand.slice().sort((a, b) => b.level - a.level || a.k.localeCompare(b.k));
  const best = sorted[0], worst = sorted[sorted.length - 1];
  const out = { strength: { k: best.k, text: `${NAME[best.k]}: Level ${best.level} of 5 (${best.text}).` }, src: SRC.levels };
  if (worst !== best) out.leak = { k: worst.k, text: `${NAME[worst.k]}: Level ${worst.level} of 5 (${worst.text}).` };
  else out.leak = null;
  const focus = out.leak ? out.leak.k : best.k;
  out.drill = { k: focus, text: DRILL[focus](c), rule: 'app drill (team rule)' };
  return out;
}
// One plain-language headline for the top of the card (owner rule: one takeaway, few numbers up front).
export function headline(c) {
  if (c.takeaways && c.takeaways.leak) return { text: c.takeaways.leak.text.replace(/\.$/, '') + '. ' + c.takeaways.drill.text.split('.')[0] + '.', k: c.takeaways.drill.k };
  if (c.takeaways) return { text: c.takeaways.strength.text, k: c.takeaways.strength.k };
  if (c.empty) return { text: 'Score a game on Tonight or import a LaneTrax report to fill your card.', k: 'empty' };
  return { text: 'Score a game on Tonight to see your strikes and spares here.', k: 'thin' };
}
// Headline figures, in the order league bowlers check them (average, spares, single pins, first ball, carry, strikes);
// each passes usability (plain bowling words) + applicability (changes a decision). Speed/rev feed ball choice. Max 6.
export function figures(c) {
  const out = [], T = c.throws;
  if (c.avgTrend.length) { const avg = Math.round(c.avgTrend.reduce((s, x) => s + x.v, 0) / c.avgTrend.length); out.push({ k: 'avg', label: 'Average', v: avg, unit: '', n: c.games, nUnit: 'games', src: 'your games', why: 'league average, handicap' }); }
  if (c.spare.single) out.push({ k: 'single', label: 'Single-pin spares', v: c.spare.single.v, unit: '%', n: c.spare.single.n, nUnit: 'chances', src: c.spare.single.src.label, why: 'spare approach' });
  else if (c.spare.ltx) out.push({ k: 'spare', label: 'Spares made', v: c.spare.ltx.v, unit: '%', n: c.spare.ltx.n, nUnit: 'chances', src: c.spare.ltx.src.label, why: 'spare approach' });
  if (T && T.firstAvg != null) out.push({ k: 'firstAvg', label: 'First-ball average', v: T.firstAvg, unit: 'pins', n: T.first, nUnit: 'first balls', src: 'your scored games', why: 'line and ball choice' });
  if (T && T.carryPct != null && T.carryN >= 5) out.push({ k: 'carry', label: 'Carry', v: T.carryPct, unit: '%', n: T.carryN, nUnit: 'pocket hits', src: 'strikes ÷ pocket hits you tagged', why: 'ball change vs line change' });
  const st = c.strike.games || c.strike.ltx; if (st) out.push({ k: 'strike', label: 'Strikes', v: st.v, unit: '%', n: st.n, nUnit: 'first balls', src: st.src.label, why: 'scoring pace' });
  const rv = c.rev.measured || c.rev.typed, sp = c.speed.measured || c.speed.typed;
  if (sp && rv) out.push({ k: 'release', label: 'Speed · revs', v: `${sp.v} mph · ${Math.round(rv.v)}`, unit: 'rpm', n: (c.rev.measured || {}).n || null, nUnit: 'shots', src: c.rev.measured ? 'LaneTrax' : 'you reported', why: 'ball choice' });
  for (const f of out) if (f.n === 1 && f.nUnit) f.nUnit = f.nUnit.replace(/s$/, '');
  return out.slice(0, 6);
}
// Session recap (after a session): ONE headline change, ≤2 supporting stats, ONE next focus. Informational, never praise.
const PLURAL = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
export function focusOf(stats) {
  const t = stats.throws;
  const L = t && t.leaves.filter(l => l.n >= 2 && l.made < l.n).sort((a, b) => (a.made / a.n) - (b.made / b.n) || b.n - a.n)[0];
  if (L) return { k: 'leave', leave: L.leave, text: `Next focus: the ${L.leave.includes('-') ? L.leave + ' leave' : L.leave + ' pin'}, ${L.made} of ${L.n} made tonight.` };
  if (stats.ltx) { const lv = stats.ltx.levels || {}, order = [['conversionRate', 'conversion'], ['impactSpeed', 'speed'], ['revRate', 'rpm'], ['arrowsDifference', 'arrows']].filter(([k]) => lv[k]).sort((a, b) => lv[a[0]] - lv[b[0]]);
    if (order.length) { const k = order[0][1]; return { k, text: 'Next focus: ' + DRILL[k]({ leaves: [] }).replace(/^[A-Z][a-z]+ drill: /, '') }; } }
  return null;
}
export function recapOf(list, id) {
  const me = list.find(x => x.id === id); if (!me) return null;
  const s = me.stats, t = s.throws, cmp = compare(list, id), by = k => cmp.find(x => x.k === k);
  const word = { strikePct: 'Strikes', sparePct: 'Spares made', openPct: 'Open frames' };
  let head = null;
  const a = by('avg');
  if (a && a.dPrev != null && Math.abs(a.dPrev) >= 5) head = `${a.v} average, ${Math.abs(Math.round(a.dPrev))} pins ${a.dPrev > 0 ? 'over' : 'under'} last session (${a.prev}).`;
  if (!head) for (const k of ['sparePct', 'strikePct', 'openPct']) { const x = by(k); if (x && x.dPrev != null && Math.abs(x.dPrev) >= 5) { head = `${word[k]}: ${x.v}%, ${x.dPrev > 0 ? 'up' : 'down'} ${Math.abs(x.dPrev)} points from last session.`; break; } }
  if (!head && a && a.dPrev != null) head = `${a.v} average, about the same as last session (${a.prev}).`;
  if (!head) head = s.avg != null ? `${s.avg} average over ${PLURAL(s.games, 'game')}${s.high != null && s.games > 1 ? `, high ${s.high}` : ''}.`
    : s.ltx ? `${s.ltx.strikes} strikes on ${s.ltx.first} first balls; ${s.ltx.spareMade} of ${s.ltx.spare} spares made.` : t ? `${t.strikes} strikes on ${t.first} first balls.` : 'Session saved.';
  const sup = [];
  if (t && t.single) sup.push({ k: 'single', label: 'Single-pin spares', text: `${t.singleMade} of ${t.single}` });
  else if (s.ltx && s.ltx.spare) sup.push({ k: 'spare', label: 'Spares made', text: `${s.ltx.spareMade} of ${s.ltx.spare}` });
  if (t && t.first) sup.push({ k: 'firstAvg', label: 'First-ball average', text: `${t.firstAvg} pins` });
  else if (s.ltx && s.ltx.first) sup.push({ k: 'strike', label: 'Strikes', text: `${s.ltx.strikes} of ${s.ltx.first}` });
  return { head, support: sup.slice(0, 2), focus: focusOf(s), cmp };
}
