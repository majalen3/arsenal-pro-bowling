// Armory (owner brief 2026-10-24): the Arsenal screen as a trophy room. Pure helpers, no DOM.
// Shelves come from the owned balls (status is the user's own: inBag / benched / proShop / retired). Milestones come only
// from games the bowler logged with frames (P.games / P.shots). Nothing is shown until it is earned, and nothing is invented.
import { playOrder } from '../data/scoring.js';
export const TEAM = 'Urbanek Honey Badgers';
const short = n => String(n || '').replace(/^(Radical|Storm|Hammer|900 Global|Columbia 300|Roto Grip|Motiv|Brunswick|DV8|Ebonite|Track)\s+/, '');
// Header line: "Urbanek Honey Badgers · Sam's Armory". No name on file means plain "Armory" (we never make one up).
export function title(P) { const b = (P && P.bowler) || {}, n = b.name && typeof b.name === 'object' ? b.name.v : b.name;
  return { team: TEAM, title: n && String(n).trim() ? `${String(n).trim()}\u2019s Armory` : 'Armory' }; }
// Per owned ball: games it threw the most first balls in (its "games"), best complete game among those.
export function records(P) {
  const by = {}, games = {};
  for (const s of (P && P.shots) || []) if (s.frame != null && s.sessionId) (games[s.sessionId + '#' + (s.game || 1)] = games[s.sessionId + '#' + (s.game || 1)] || []).push(s);
  const scoreOf = {}; for (const g of (P && P.games) || []) scoreOf[g.key] = g;
  for (const [k, list] of Object.entries(games)) {
    const n = {}; for (const s of playOrder(list)) if ((s.roll || 1) === 1 && s.ballId) n[s.ballId] = (n[s.ballId] || 0) + 1;
    const top = Object.entries(n).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
    if (!top) continue;
    const r = by[top[0]] = by[top[0]] || { games: 0, complete: 0, best: null }, g = scoreOf[k];
    r.games++;
    if (g && g.complete && g.score != null) { r.complete++; r.best = r.best == null ? g.score : Math.max(r.best, g.score); }
  }
  return by;
}
// Earned milestones only, highest first. Thresholds are round counts, not ratings: no "good job", no comparison to others.
const GAMES = [100, 50, 25, 10, 1];
export function milestones(rec) {
  if (!rec || !rec.games) return [];
  const out = [];
  if (rec.best === 300) out.push({ id: 'p300', text: '300 game' });
  else if (rec.best != null && rec.best >= 200) out.push({ id: 'g200', text: `${rec.best} best` });
  const g = GAMES.find(x => rec.games >= x);
  out.push({ id: 'n' + g, text: g === 1 ? 'First game logged' : `${g}+ games` });
  return out;
}
// Shelves: bag (in bag, highlighted), bench (benched + pro shop), hall (retired). Sorted by name inside each shelf.
export function shelves(P, catOf) {
  const rec = records(P), out = { bag: [], bench: [], hall: [] };
  for (const [id, o] of Object.entries((P && P.owned) || {})) {
    const cat = catOf ? catOf(o.catalogId) : null, st = o.status || 'inBag';
    const item = { id, catalogId: o.catalogId || null, cat, name: short(o.name || (cat && cat.name) || 'Ball'), status: st, benchmark: !!o.benchmark,
      color: cat && cat.color || null, role: cat && cat.role || null, rec: rec[id] || null, earned: milestones(rec[id]) };
    (st === 'retired' ? out.hall : st === 'inBag' ? out.bag : out.bench).push(item);
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => (b.benchmark - a.benchmark) || a.name.localeCompare(b.name));
  return out;
}
