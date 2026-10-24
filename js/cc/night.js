// Nights (sim bug 3, GAP §2c): a Tonight session is a NIGHT, not a calendar day. A game that runs past midnight stays in the
// same session. Pure: takes the projection and a clock, returns the session id to write to.
import { stateOf } from './quicklog.js';
export const IDLE_MS = 4 * 3600e3;      // a night closes itself after 4 h with no throws or edits
export const RESUME_MS = 24 * 3600e3;   // an unfinished game is picked up again for up to a day, whatever the date
const pad = n => String(n).padStart(2, '0');
export const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
export function nightInfo(P, s, now = Date.now()) {
  const shots = (P.shots || []).filter(x => x.sessionId === s.id && x.frame != null);
  const last = Math.max(s.ts || 0, s.editTs || 0, ...shots.map(x => x.ts || 0));
  const g = s.game || 1, mine = shots.filter(x => (x.game || 1) === g);
  const st = mine.length ? stateOf(mine.map(x => ({ down: x.down, leave: x.leave || [], foul: !!x.foul }))) : null;
  return { id: s.id, last, inProgress: !!(st && !st.done), games: new Set(shots.map(x => x.game || 1)).size, shots: shots.length, idle: now - last };
}
// The open night: newest unended Tonight session with a game in progress (≤ 24 h) or any activity in the last 4 h.
export function openNight(P, now = Date.now()) {
  let best = null;
  for (const s of Object.values(P.sessions || {})) {
    if (s.kind !== 'tonight' || s.ended) continue;
    const i = nightInfo(P, s, now);
    if (!(i.idle < IDLE_MS || (i.inProgress && i.idle < RESUME_MS))) continue;
    if (!best || i.last > best.last) best = i;
  }
  return best ? best.id : null;
}
export function newNightId(P, now = Date.now()) {
  const d = dayKey(now); let n = 1; while ((P.sessions || {})[`night-${d}-${n}`]) n++; return `night-${d}-${n}`;
}
