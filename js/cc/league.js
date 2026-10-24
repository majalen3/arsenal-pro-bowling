// League scoring (scoring fix 4): handicap, absentee / vacancy scores, who is up, and team totals. Pure, DOM-free.
// Citations: USBC Playing Rules (bowl.com) Rule 100d-2 (handicap: 100% unless league rule; fractions dropped; base above
// the highest average), Rule 112d/e (vacancy 120; absentee = average - 10, handicap on the average; no average -> 120),
// Rule 3a (modified formats such as Baker are not included in averages). See docs/LEAGUE_SCORING.md.
export const BASES = [200, 210, 220];
export const PCTS = [80, 90, 100];
export const USBC_PCT = 100;          // Rule 100d-2a: 100 percent unless otherwise provided by league rule
export const DEFAULTS = { basis: 220, pct: 90, allowNeg: false };   // app default (90% of 220), league-configurable
export const VACANCY = 120;           // Rule 112d-1a (adult leagues)
export const ABSENT_DEDUCT = 10;      // Rule 112e-1
export const NO_AVG_SCORE = 120;      // Rule 112e-3
const int = v => (v === '' || v == null || !Number.isFinite(+v)) ? null : Math.trunc(+v);
// Rule 100d-2g: fractions are dropped (toward zero, so a negative handicap is not rounded up in size).
export function handicap(avg, cfg = {}) {
  const a = int(avg); if (a == null) return null;
  const { basis, pct, allowNeg } = Object.assign({}, DEFAULTS, cfg);
  const raw = Math.trunc(((basis - a) * pct) / 100);
  return allowNeg ? raw : Math.max(0, raw);
}
// What one lineup spot scores in a game. b = {status:'in'|'absent'|'vacancy', avg}; scratch = bowled score (null if not done).
export function spotScore(b, scratch, cfg = {}) {
  const a = int(b && b.avg);
  if (b && b.status === 'vacancy') return { kind: 'vacancy', scratch: VACANCY, hdcp: handicap(VACANCY, cfg), rule: '112d' };
  if (b && b.status === 'absent') return a == null ? { kind: 'absent', scratch: NO_AVG_SCORE, hdcp: handicap(NO_AVG_SCORE, cfg), rule: '112e-3' }
    : { kind: 'absent', scratch: a - ABSENT_DEDUCT, hdcp: handicap(a, cfg), rule: '112e-1' };
  return { kind: 'bowled', scratch: scratch == null ? null : scratch, hdcp: handicap(a, cfg), rule: null };
}
export const total = x => x.scratch == null ? null : x.scratch + (x.hdcp || 0);
// Who bowls next in a regular league game: bowlers take frames in lineup order, so the next one is the first active
// bowler (lineup order) with the fewest frames done. framesDone: who -> 0..10. Returns null when everyone is done.
export function nextUp(lineup, framesDone) {
  const act = lineup.filter(b => b.status === 'in' && (framesDone[b.who] || 0) < 10);
  if (!act.length) return null;
  const min = Math.min(...act.map(b => framesDone[b.who] || 0));
  return act.find(b => (framesDone[b.who] || 0) === min);
}
// Baker: one team game, frame f bowled by the active lineup in turn (the 10th by whoever's turn it is).
export function bakerOwner(f, lineup) {
  const act = lineup.filter(b => b.status === 'in'); if (!act.length) return null;
  return act[(f - 1) % act.length];
}
// Team totals for a regular league game: rows = [{scratch, hdcp}] (null scratch = not finished).
export function teamTotal(rows) {
  const done = rows.every(r => r.scratch != null);
  const scratch = rows.reduce((s, r) => s + (r.scratch || 0), 0), hdcp = rows.reduce((s, r) => s + (r.hdcp || 0), 0);
  return { done, scratch, hdcp, total: scratch + hdcp };
}
// The lineup from saved league settings: the bowler is always spot 1 ("me").
export function lineupOf(lg = {}) {
  const me = { who: 'me', name: 'You', avg: int(lg.myAvg), status: 'in' };
  return [me].concat((lg.team || []).slice(0, 3).map(t => ({ who: t.who, name: t.status === 'vacancy' ? 'Vacancy' : (t.name || 'Teammate'), avg: int(t.avg), status: t.status || 'in' })));
}
