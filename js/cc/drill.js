// M3: spare drill (practice only, never in averages) + one optional process goal per night. Pure (node --test).
// Drill attempts live on the practice session (session.edited { drill: [...] }), so /api/me export and delete already cover them.
import { sessionsOf, throwStats } from './card.js';
// The leaves to drill: your most-missed spares from scored games (practice included: it is skill data), else the two corner pins.
export function drillLeaves(P, max = 3) {
  const games = sessionsOf(P).flatMap(x => x.games), t = games.length ? throwStats(games) : null;
  const miss = t ? t.leaves.map(l => ({ leave: l.leave, n: l.n, missed: l.n - l.made })).filter(l => l.missed > 0).sort((a, b) => b.missed - a.missed || b.n - a.n || (a.leave < b.leave ? -1 : 1)) : [];
  if (miss.length) return { from: 'your misses', list: miss.slice(0, max).map(l => ({ leave: l.leave, why: `missed ${l.missed} of ${l.n}` })) };
  return { from: 'no misses logged yet', list: [{ leave: '10', why: 'corner pin' }, { leave: '7', why: 'corner pin' }] };
}
const clean = a => (Array.isArray(a) ? a : []).filter(x => x && typeof x.leave === 'string' && typeof x.made === 'boolean');
export const addAttempt = (list, leave, made, ts = Date.now()) => clean(list).concat([{ leave: String(leave), made: !!made, ts }]).slice(-200);
export function drillStats(list) {
  const a = clean(list), by = {};
  for (const x of a) { const L = by[x.leave] = by[x.leave] || { leave: x.leave, n: 0, made: 0 }; L.n++; if (x.made) L.made++; }
  const made = a.filter(x => x.made).length;
  return { n: a.length, made, pct: a.length ? Math.round(made / a.length * 100) : null, byLeave: Object.values(by).sort((p, q) => q.n - p.n || (p.leave < q.leave ? -1 : 1)) };
}
// One process goal (informational, chosen before the night, read after it). Outcome-free: spares made, not score.
export const GOALS = {
  single: { label: 'Single-pin spares', of: 10 },
  drill: { label: 'Drill spares', of: 10 },
};
export const cleanGoal = g => g && GOALS[g.k] && Number.isFinite(+g.target) && +g.target >= 1 && +g.target <= GOALS[g.k].of ? { k: g.k, target: Math.round(+g.target) } : null;
// After the night: "7 of 9 single-pin spares made · goal 8 of 10 (78%, goal 80%)". n is always shown.
export function goalResult(P, sid, goal) {
  const g = cleanGoal(goal); if (!g) return null;
  const s = (P.sessions || {})[sid] || {}, G = GOALS[g.k];
  let made = 0, n = 0;
  if (g.k === 'single') { const x = sessionsOf(P).find(z => z.id === sid), t = x && x.games.length ? throwStats(x.games) : null; if (t) { made = t.singleMade; n = t.single; } }
  else { const d = drillStats(s.drill); made = d.made; n = d.n; }
  if (!n) return { k: g.k, n: 0, text: `${G.label}: none yet tonight \u00b7 goal ${g.target} of ${G.of}.` };
  const pct = Math.round(made / n * 100), gp = Math.round(g.target / G.of * 100);
  return { k: g.k, n, made, pct, goalPct: gp, met: pct >= gp, text: `${made} of ${n} ${G.label.toLowerCase()} made (${pct}%) \u00b7 goal ${g.target} of ${G.of} (${gp}%).` };
}
