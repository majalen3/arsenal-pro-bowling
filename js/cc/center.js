// Center / lane-pair memory (M1). "Last time at <center>": the setup you used and how it went, from the event log only.
// Shown before a game (never during scoring); practice nights are listed but never averaged (USBC averages are certified play).
// Pure (node --test); no new tables, so /api/me export and delete already cover it (session.* and center.* events).
import { sessionsOf } from './card.js';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? `${MON[+m[2] - 1]} ${+m[3]}` : d || ''; };
export const cleanPair = v => { const s = String(v == null ? '' : v).trim().replace(/\s*[-–&/]\s*/g, '-').slice(0, 9); return /^\d{1,3}(-\d{1,3})?$/.test(s) ? s : null; };
// Every earlier night at this center, newest first: setup + games/avg (avg null on practice) + the most thrown ball.
export function visitsOf(P, centerId, excludeSid = null) {
  if (!P || !centerId) return [];
  const stats = Object.fromEntries(sessionsOf(P).map(x => [x.id, x.stats])), byBall = {};
  for (const s of P.shots || []) if (s.sessionId && s.ballId && !s.who) { const k = s.sessionId; (byBall[k] = byBall[k] || {})[s.ballId] = (byBall[k][s.ballId] || 0) + 1; }
  return Object.values(P.sessions || {}).filter(s => s.centerId === centerId && s.id !== excludeSid)
    .map(s => { const st = stats[s.id] || {}, bb = byBall[s.id] || {}, top = Object.entries(bb).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      const practice = s.event === 'practice';
      return { id: s.id, date: s.date || null, ts: s.editTs || s.ts || 0, lanePair: cleanPair(s.lanePair), practice,
        pattern: s.patternName ? { slug: s.patternSlug || null, name: s.patternName, ft: s.ft != null ? +s.ft : null, ml: s.ml ?? null, ratio: s.ratio ?? null, own: !!s.patternOwn } : null,
        surface: s.surface || null, bagId: s.bagId || null, ballId: top ? top[0] : null, games: st.games || 0, avg: practice ? null : st.avg ?? null }; })
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.ts - a.ts);
}
export const lastVisit = (P, centerId, excludeSid) => visitsOf(P, centerId, excludeSid)[0] || null;
// One line, numbers first (coach voice): "Oct 20 · lanes 15-16 · 2026 PBA Shark 48 ft · 2 games, 185 avg · mostly Phaze II".
export function lineOf(v, nameOf = () => null) {
  if (!v) return null;
  const p = [day(v.date)];
  if (v.lanePair) p.push(`lanes ${v.lanePair}`);
  p.push(v.pattern ? `${v.pattern.name}${v.pattern.ft ? ' ' + v.pattern.ft + ' ft' : ''}` : 'house shot (not entered)');
  if (v.games) p.push(v.practice ? `${v.games} practice ${v.games === 1 ? 'game' : 'games'}` : `${v.games} ${v.games === 1 ? 'game' : 'games'}, ${v.avg} avg`);
  const bn = v.ballId ? nameOf(v.ballId) : null; if (bn) p.push(`mostly ${bn}`);
  return p.join(' \u00b7 ');
}
// The session fields "Use last setup" copies (only what was entered; the pick is recomputed).
export function setupOf(v) {
  if (!v) return null;
  const f = { pickId: null };
  if (v.pattern) Object.assign(f, { patternSlug: v.pattern.slug, patternName: v.pattern.name, ft: v.pattern.ft, ml: v.pattern.ml, ratio: v.pattern.ratio, patternOwn: !!v.pattern.own });
  if (v.surface && v.surface !== 'unknown') f.surface = v.surface;
  if (v.bagId) f.bagId = v.bagId;
  if (v.lanePair) f.lanePair = v.lanePair;
  return f;
}
// Note for next time (written on the recap, shown at the top of Tonight next time at this center). Plain text, 140 chars.
export const cleanNote = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, 140) || null;
export const noteOf = (P, centerId) => (P && centerId && P.centers && P.centers[centerId] && cleanNote(P.centers[centerId].note)) || null;
