// Community pieces (docs/TEAM_PROMPT_COMMUNITY_DIRECTOR.md, owner 2026-10-31): identity tags, the "Regular at <center>" badge,
// Season Wrapped and the shared-stats counts. Pure functions over the projection + profile; no ranking, no scores compared.
import { sessionsOf, MIN_SHOTS } from './card.js';
// Same rule as hand.js handOfProfile (kept pure here: hand.js imports the browser store). Only what the bowler told us counts.
const told = (p, k) => !(p.entered && !p.entered[k]);
const handOfProfile = p => p && (p.hand === 'left' || p.hand === 'right') && told(p, 'hand') ? p.hand : null;

// Identity tags (tactic 4). Same list as the API whitelist (arsenal-pro-api lib/teams.js TAGS). Shown side by side, never ranked.
export const TAGS = ['two-hander', 'one-hander', 'lefty', 'righty', 'youth', 'senior', 'adaptive', 'collector', 'coach', 'league bowler'];
export const TAG_LABEL = { 'two-hander': 'Two-hander', 'one-hander': 'One-hander', lefty: 'Lefty', righty: 'Righty', youth: 'Youth', senior: 'Senior',
  adaptive: 'Adaptive', collector: 'Collector', coach: 'Coach', 'league bowler': 'League bowler' };
// From the profile (hand and style); the bowler can switch these off like any other tag.
export const AUTO = ['two-hander', 'one-hander', 'lefty', 'righty'];
export function profileTags(p) {
  const out = [], hand = handOfProfile(p || {}), st = p && told(p, 'style') ? p.style : null;
  if (st === 'two') out.push('two-hander'); else if (st === 'stroker' || st === 'tweener' || st === 'cranker') out.push('one-hander');
  if (hand === 'left') out.push('lefty'); else if (hand === 'right') out.push('righty');
  return out;
}
// prefs.tags: { on: [chosen tags], off: [profile tags switched off] }. Order is the fixed TAGS order (no "top" tag).
export function tagsOf(p, sel = {}) {
  const on = new Set((sel.on || []).filter(t => TAGS.includes(t)));
  for (const t of profileTags(p)) if (!(sel.off || []).includes(t)) on.add(t);
  return TAGS.filter(t => on.has(t));
}
export function toggleTag(p, sel = {}, tag) {
  if (!TAGS.includes(tag)) return sel;
  const cur = tagsOf(p, sel).includes(tag), auto = profileTags(p).includes(tag);
  const on = new Set(sel.on || []), off = new Set(sel.off || []);
  if (cur) { on.delete(tag); if (auto) off.add(tag); } else { off.delete(tag); if (!auto) on.add(tag); }
  return { on: [...on].filter(t => TAGS.includes(t)), off: [...off].filter(t => TAGS.includes(t)) };
}

// Center Regulars (tactic 5): nights at the home center in the last 90 days, whatever the score. App rule (DECISIONS
// 2026-10-31, owner may change): REGULAR_NIGHTS or more distinct nights in REGULAR_DAYS days.
export const REGULAR_DAYS = 90, REGULAR_NIGHTS = 4;
const iso = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
export function regularOf(P, centerId, { now = Date.now(), days = REGULAR_DAYS, need = REGULAR_NIGHTS } = {}) {
  const c = P && centerId && P.centers && P.centers[centerId];
  if (!c) return null;
  const from = iso(now - days * 86400e3), to = iso(now), nights = new Set();
  for (const s of Object.values(P.sessions || {})) {
    const d = s.date || (s.ts ? iso(s.ts) : null);
    if (s.centerId === centerId && d && d >= from && d <= to) nights.add(d);
  }
  return { centerId, center: c.name || 'your center', nights: nights.size, days, need, regular: nights.size >= need, from, to };
}
export const regularText = r => !r ? '' : r.regular ? `Regular at ${r.center}` : `${r.nights} of ${r.need} nights at ${r.center} in the last ${r.days} days`;

// League season: Aug 1 to Jul 31 (most US leagues start in late summer). App rule; Wrapped can also show the calendar year.
export function seasonOf(now = Date.now()) {
  const d = new Date(now), y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return { from: `${y}-08-01`, to: `${y + 1}-07-31`, label: `${y}\u2013${String(y + 1).slice(2)} season` };
}
// Season Wrapped (tactic 2): counts only, nothing graded. Rates need MIN_SHOTS chances; below that a count is shown.
export function wrappedOf(P, { now = Date.now(), season = seasonOf(now), nameOf = id => id } = {}) {
  const list = sessionsOf(P || {}).filter(x => x.date && x.date >= season.from && x.date <= season.to);
  const nights = new Set(list.map(x => x.date)), centers = new Set(), pairs = new Set(), ballGames = {};
  let games = 0, frames = 0, first = 0, strikes = 0, spare = 0, spareMade = 0;
  for (const x of list) {
    const m = x.meta || {}; if (m.centerId) centers.add(m.centerId); if (m.lanePair) pairs.add(String(m.lanePair));
    games += x.stats.games || 0;
    const t = x.stats.throws; if (t) { frames += t.frames || 0; first += t.first || 0; strikes += t.strikes || 0; spare += t.spare || 0; spareMade += t.spareMade || 0; }
    for (const g of x.games) for (const b of g.balls) ballGames[b] = (ballGames[b] || 0) + 1;
    if (!x.games.length && x.ballId) ballGames[x.ballId] = (ballGames[x.ballId] || 0) + (x.stats.games || 1);
  }
  const top = Object.entries(ballGames).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const centerNames = [...centers].map(id => (P.centers && P.centers[id] && P.centers[id].name) || null).filter(Boolean);
  const out = { season: season.label, from: season.from, to: season.to, nights: nights.size, games, frames, centers: centerNames, pairs: pairs.size,
    ball: top ? { id: top[0], name: nameOf(top[0]), games: top[1] } : null,
    strikes: first ? { n: strikes, of: first, enough: first >= MIN_SHOTS } : null,
    spares: spare ? { n: spareMade, of: spare, enough: spare >= MIN_SHOTS } : null, minShots: MIN_SHOTS };
  out.empty = !out.nights;
  return out;
}
// Plain lines for the Wrapped card and screen. Counts, never "best/worst"; a rate only with MIN_SHOTS chances.
export function wrappedLines(w) {
  if (!w || w.empty) return [];
  const pl = (n, s) => `${n} ${s}${n === 1 ? '' : 's'}`, L = [];
  L.push(['Nights bowled', pl(w.nights, 'night')]);
  if (w.games) L.push(['Games logged', pl(w.games, 'game')]);
  if (w.frames) L.push(['Frames scored', String(w.frames)]);
  if (w.centers.length) L.push([w.centers.length === 1 ? 'Center' : 'Centers', w.centers.slice(0, 3).join(', ') + (w.centers.length > 3 ? ` +${w.centers.length - 3}` : '')]);
  if (w.pairs) L.push(['Lane pairs', pl(w.pairs, 'pair')]);
  if (w.ball) L.push(['Ball you reached for most', `${w.ball.name} (${pl(w.ball.games, 'game')})`]);
  if (w.strikes) L.push(['Strikes', w.strikes.enough ? `${w.strikes.n} of ${w.strikes.of} first balls` : `${w.strikes.n} (counts only until ${w.minShots} first balls)`]);
  if (w.spares) L.push(['Spares made', w.spares.enough ? `${w.spares.n} of ${w.spares.of}` : `${w.spares.n} of ${w.spares.of} (a small sample)`]);
  return L;
}
// Shared stats (tactic 1): plain counts the bowler chooses to show the team. src names where each count comes from.
export function statsShare(P, { now = Date.now() } = {}) {
  const w = wrappedOf(P, { now }), items = [];
  items.push({ label: 'Nights this season', value: String(w.nights), src: 'your log' });
  items.push({ label: 'Games logged', value: String(w.games), src: 'your log' });
  if (w.spares && w.spares.enough) items.push({ label: 'Spares made', value: `${w.spares.n} of ${w.spares.of}`, src: 'scored frames' });
  return { items };
}
