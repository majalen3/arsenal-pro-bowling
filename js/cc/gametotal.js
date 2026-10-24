// Item 2: "Add a game total" (score only, no frames). Pure helpers; the sheet lives in screens/gametotal.js.
// A total is the bowler's own number (game.logged, prov user/game-total). Nothing here invents a score or a ball.
import { openNight, newNightId, dayKey } from './night.js';
export const MAX = 300;
// A whole number 0–300, else null (no rounding of typos like 18.7 into a score).
export function parseTotal(v) { const s = String(v == null ? '' : v).trim(); if (!/^\d{1,3}$/.test(s)) return null; const n = +s; return n <= MAX ? n : null; }
// Games already on this night: frames scored (shots) and totals logged.
export function gamesOn(P, sid) {
  const g = new Set();
  for (const x of P.shots || []) if (x.sessionId === sid && x.frame != null) g.add(x.game || 1);
  for (const x of P.scores || []) if (x.sessionId === sid) g.add(+x.game || 1);
  return g;
}
export const nextGame = (P, sid) => { const g = gamesOn(P, sid); let n = 1; while (g.has(n)) n++; return n; };
export const taken = (P, sid, game) => gamesOn(P, sid).has(+game);
// Where a total from More goes: tonight's open night, else a new night today.
export function targetNight(P, now = Date.now()) { const o = openNight(P, now); return o ? { sid: o, create: false } : { sid: newNightId(P, now), create: true, date: dayKey(now) }; }
