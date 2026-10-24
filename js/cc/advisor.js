// Bag Advisor (TEAM_PROMPT_BAG_ADVISOR.md). Pure: projection + event type in, a packed bag with roles, reasons,
// evidence and a start line out. Reuses rank.js (spec fit) and bag.js (fill / checks); never invents a number.
import * as ST from './status.js';
import { rank, demandOf, benchFirstReason, levelOf, SRC, HOUSE_ASSUMED } from './rank.js';
import { fill, dueOf, overlaps, SIZE } from './bag.js';
import { catOf } from './cats.js';
// Event → bag size (balls besides the spare). Sizes: league 3 / tournament 6 / practice 2–3 (owner spec); sport and
// new center are app choices, labelled as such.
export const EVENTS = {
  league: { label: 'League night', short: 'League', format: 'league3', size: SIZE.league3, spare: true },
  tournament: { label: 'Tournament', short: 'Tournament', format: 'tournament6', size: SIZE.tournament6, spare: true },
  practice: { label: 'Practice', short: 'Practice', format: 'custom', size: 2, spare: true },
  newCenter: { label: 'New center', short: 'New center', format: 'league3', size: SIZE.league3, spare: true, benchFirst: 'new center' },
  sport: { label: 'Sport pattern', short: 'Sport', format: 'tournament6', size: SIZE.tournament6, spare: true, note: 'app choice: 6 balls, flat patterns need more shapes' },
};
// Minimum sample before results can re-order the bag: USBC Rule 319a needs a 21-game league average (bowl.com,
// "Recent rule changes", search excerpt). Below it, results are shown but labelled "app estimate".
export const MIN_GAMES = 21;
export const MIN_SRC = { label: 'USBC Rule 319a: 21 games', url: 'https://bowl.com/welcome/recent-rule-changes' };
// P1.3: the advisor picks from In my bag; Swap also offers At home (tagged "grab from home"). Labels live in status.js.
export const AVAILABLE = o => ST.inMyBag(o);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
const short = n => String(n || '').replace(/^(Radical|Storm|Hammer|900 Global|Columbia 300|Roto Grip|Motiv)\s+/, '');
// Per-ball results from the log: quick-log throws (shot.logged with frame), scores (game.logged with ballId) and
// LaneTrax aggregates tagged to a ball. Pocket = first balls that struck or were tagged "pocket" over first balls.
export function evidenceOf(P, ownedId, catalogId) {
  const mine = x => x.ballId === ownedId || (catalogId && x.ballId === catalogId);
  const firsts = (P.shots || []).filter(x => mine(x) && x.frame != null && x.roll === 1);
  const strikes = firsts.filter(x => x.down === 10).length, tagged = firsts.filter(x => x.down === 10 || x.miss === 'pocket' || x.miss === 'high' || x.miss === 'light');
  const pocket = tagged.filter(x => x.down === 10 || x.miss === 'pocket').length, pocketNonStrike = tagged.filter(x => x.down !== 10 && x.miss === 'pocket').length;
  const games = new Set((P.games || []).filter(g => (g.balls || []).includes(ownedId)).map(g => g.key));
  const scores = (P.scores || []).filter(mine);
  const aggs = (P.aggregates || []).filter(mine);
  const sessions = new Set([...firsts.map(x => x.sessionId), ...scores.map(x => x.sessionId), ...aggs.map(x => x.sessionId)].filter(Boolean));
  const leaves = {}; for (const x of firsts) if (x.down !== 10 && Array.isArray(x.leave) && x.leave.length) { const k = x.leave.slice().sort((a, b) => a - b).join('-'); leaves[k] = (leaves[k] || 0) + 1; }
  const topLeave = Object.entries(leaves).sort((a, b) => b[1] - a[1])[0] || null;
  const nGames = games.size + scores.length;
  const avg = scores.length ? Math.round(scores.reduce((s, x) => s + (+x.score || 0), 0) / scores.length) : null;
  return { n: firsts.length, strikes, strikePct: pct(strikes, firsts.length), pocketN: tagged.length, pocketPct: pct(pocket, tagged.length),
    carryPct: pocket ? pct(strikes, strikes + pocketNonStrike) : null, games: nGames, sessions: sessions.size, avg, topLeave: topLeave ? { leave: topLeave[0], n: topLeave[1] } : null,
    aggs: aggs.length, enough: nGames >= MIN_GAMES, none: !firsts.length && !scores.length && !aggs.length };
}
export function evidenceText(name, ev) {
  if (ev.none) return null;
  const parts = [];
  if (ev.pocketN) parts.push(`${ev.pocketPct}% pocket`);
  if (ev.n) parts.push(`${ev.strikePct}% strikes`);
  if (ev.avg != null) parts.push(`${ev.avg} avg`);
  const base = `${name}: ${parts.join(', ') || 'results logged'} over ${ev.sessions} session${ev.sessions === 1 ? '' : 's'} (n=${ev.n || ev.games}${ev.n ? ' first balls' : ' games'})`;
  return base + (ev.topLeave ? `; most left: ${ev.topLeave.leave} (${ev.topLeave.n}×)` : '');
}
export const confidenceOf = ev => ev.none ? { key: 'spec', label: 'specs only' } : ev.enough ? { key: 'measured', label: `your results (${ev.games} games)` } : { key: 'estimate', label: `app estimate (${ev.games} of ${MIN_GAMES} games)` };
// One warning per ball at most: service due first, then overlap.
function warningFor(item, all, health) {
  const d = dueOf(item.cat, health && (health[item.ownedId] || health[item.catalogId]), 0);
  if (d.length) return `${d[0].type} due (${d[0].atLeast ? '\u2265' : ''}${d[0].n}/${d[0].every} games)`;
  const ov = overlaps(all).find(o => o.a === item.ownedId || o.b === item.ownedId);
  if (ov) { const other = all.find(x => x.ownedId === (ov.a === item.ownedId ? ov.b : ov.a)); return `overlaps ${other ? short(other.name) : 'another ball'} (${ov.why})`; }
  return null;
}
// opts: { event, pattern, tert, surface, style, speed, rev, health, swaps: {ownedId: replacementId}, line: fn(cat) → model line }
export function advise(P, opts = {}) {
  const E = EVENTS[opts.event] || EVENTS.league;
  const itemOf = o => { const c = catOf(o.catalogId);
    return { ownedId: o.id, catalogId: o.catalogId || null, name: o.name || (c && c.name) || 'Unknown ball', benchmark: !!o.benchmark, status: ST.statusOf(o), note: o.note || '', finish: o.finish || 'factory', cat: c }; };
  const pool = Object.values(P.owned || {}).filter(ST.offered).map(itemOf), owned = pool.filter(AVAILABLE);
  if (!owned.length) return { none: true, reason: 'No ball is In my bag yet. Set a ball\u2019s Status to In my bag on its page (At home, pro shop and retired balls are left out).' };
  const pat = opts.pattern || null, stage = 'fresh';
  const d = demandOf({ pattern: pat, tert: opts.tert, surface: opts.surface || 'unknown', stage });
  // spec/engine fit order (rank.js) + results: a ball with ≥ MIN_GAMES games and a higher strike % moves ahead of a
  // ball at the same distance from tonight's demand. Fewer games never re-order (shown, labelled app estimate).
  const ev = Object.fromEntries(pool.map(o => [o.ownedId, evidenceOf(P, o.ownedId, o.catalogId)]));
  const bf = E.benchFirst || benchFirstReason({ patternKnown: !!pat, centerKnown: true, centerNew: false, tournamentFirstGame: opts.event === 'tournament' });
  const f = fill(owned, { format: E.format, size: E.size, current: opts.current || [], ctx: { format: E.format, pattern: pat, tert: opts.tert, surface: opts.surface, style: opts.style } });
  let ids = f.slots.map(s => s.owned); const spareId = f.spare;
  for (const [from, to] of Object.entries(opts.swaps || {})) { const i = ids.indexOf(from); if (i >= 0 && to && !ids.includes(to) && pool.some(o => o.ownedId === to)) ids[i] = to; }
  const strike = ids.map(id => pool.find(o => o.ownedId === id)).filter(Boolean);
  const r = rank(strike, { demand: d.demand, benchFirst: bf, style: opts.style || 'tweener' });
  const order = r.order.slice();
  for (let pass = 0; pass < order.length; pass++) for (let i = 0; i + 1 < order.length; i++) {
    const a = order[i], b = order[i + 1], ea = ev[a.id], eb = ev[b.id];
    if (a.dist === b.dist && !(bf && a.benchmark) && ea.enough && eb.enough && (eb.strikePct || 0) > (ea.strikePct || 0)) { order[i] = b; order[i + 1] = a; }
  }
  const A = order[0] || null, lvA = A ? A.level : null;
  const all = strike.concat(spareId ? owned.filter(o => o.ownedId === spareId) : []);
  const roleOf = x => x === A ? 'benchmark' : x.level == null || lvA == null ? 'option' : x.level > lvA ? 'stronger' : x.level < lvA ? 'weaker-control' : 'shape change';
  const reasonOf = (x, role) => {
    const lv = x.level != null ? `Level ${x.level} vs demand ${d.demand}` : 'No oil tag (spec TBD)';
    if (role === 'benchmark') return bf && x.benchmark ? `Your benchmark (${bf}): start here and read.` : `Closest fit: ${lv.toLowerCase()}.`;
    if (role === 'stronger') return `${lv}: if lanes won\u2019t hook.`;
    if (role === 'weaker-control') return `${lv}: if lanes hook early.`;
    return `${lv}: other shape, same strength.`;
  };
  const rows = order.map(x => { const role = roleOf(x), e = ev[x.id];
    return { ownedId: x.id, catalogId: x.catalogId, name: short(x.name), role, reason: reasonOf(x, role), confidence: confidenceOf(e), evidence: evidenceText(short(x.name), e), warning: warningFor({ ownedId: x.id, catalogId: x.catalogId, cat: x.cat, name: x.name }, all, opts.health) }; });
  if (spareId) { const s = owned.find(o => o.ownedId === spareId); rows.push({ ownedId: s.ownedId, catalogId: s.catalogId, name: short(s.name), role: 'spare', reason: 'Straight at spares (3-6-9).', confidence: confidenceOf(ev[s.ownedId]), evidence: evidenceText(short(s.name), ev[s.ownedId]), warning: null }); }
  // A → B → C: weaker first (lanes break down as the night goes), then stronger if they never hook.
  const weaker = order.filter(x => x !== A && x.level != null && lvA != null && x.level < lvA).sort((a, b) => b.level - a.level);
  const stronger = order.filter(x => x !== A && x.level != null && lvA != null && x.level > lvA).sort((a, b) => a.level - b.level);
  const B = weaker[0] || stronger[0] || null, C = (B === weaker[0] ? weaker[1] || stronger[0] : stronger[1]) || null;
  const plan = [A && { k: 'A', name: short(A.name), when: 'start' }, B && { k: 'B', name: short(B.name), when: B.level < lvA ? 'lanes hook early or break down' : 'lanes don\u2019t hook' }, C && { k: 'C', name: short(C.name), when: C.level < lvA ? 'later, as they burn' : 'if they still won\u2019t hook' }].filter(Boolean);
  const ml = A && opts.line ? opts.line(A.cat) : null;
  const levels = [...new Set(order.map(x => x.level).filter(x => x != null))].sort((a, b) => b - a);
  const anyEnough = rows.some(x => x.confidence.key === 'measured'), anyData = rows.some(x => x.confidence.key !== 'spec');
  const why = `${strike.length} strike ball${strike.length === 1 ? '' : 's'} covering level${levels.length === 1 ? '' : 's'} ${levels.join('\u2013') || 'unknown'} around demand ${d.demand}${spareId ? ', plus a spare ball' : ''}; ${anyEnough ? 'order uses your results.' : anyData ? `results shown, but under ${MIN_GAMES} games they don\u2019t re-order the bag.` : 'based on specs + your release, no results logged yet.'}`;
  const change = pat ? `${MIN_GAMES}+ logged games with a ball, a lane-condition change, or a ball at the pro shop.` : `Setting the pattern (now an assumed ${HOUSE_ASSUMED.ft} ft house shot), ${MIN_GAMES}+ logged games with a ball, or a ball at the pro shop.`;
  return { event: opts.event || 'league', E, demand: d, rows, plan, A: A ? { ownedId: A.id, catalogId: A.catalogId, name: short(A.name), cat: A.cat } : null, line: ml, slots: strike.map(x => x.ownedId), spare: spareId,
    why, change, noData: !anyData, fromHome: strike.filter(x => x.status === 'benched').map(x => x.ownedId),
    bench: pool.filter(o => !ids.includes(o.ownedId) && o.ownedId !== spareId).map(o => ({ ownedId: o.ownedId, name: short(o.name), level: levelOf(o.cat), home: o.status === 'benched' })),
    // "Why not this ball?" for every owned ball left out (status.js, the same words as the ball page and the builder).
    left: Object.values(P.owned || {}).filter(o => !ids.includes(o.id) && o.id !== spareId).map(itemOf).map(o => Object.assign({ ownedId: o.ownedId, name: short(o.name), status: o.status },
      ST.whyNot(o, { bag: strike, demand: d.demand, health: opts.health, size: strike.length + (spareId ? 1 : 0) }))), src: { min: MIN_SRC, tag: SRC.tag } };
}
