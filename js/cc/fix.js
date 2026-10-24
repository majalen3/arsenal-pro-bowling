// Fix a frame (scoring fix 2; sim2 #3/#4): one re-entry for the open game, a teammate's frame and a finished game.
// The old shots are voided and the re-entered ones written in one append, so the log keeps both and Undo restores the
// old frame exactly. Stats are projections of shot.logged, so every total recomputes from the log. Pure (node --test).
import { mkEvent, voidEvent } from '../data/events.js';
import { leaveHint } from './quicklog.js';
const keep = (x, whoF) => Object.assign({ sessionId: x.sessionId, game: x.game, frame: x.frame, roll: x.roll, down: x.down, leave: x.leave || [], foul: !!x.foul,
  split: !!x.split, ballId: x.ballId || null, catalogId: x.catalogId || null, miss: x.miss || null }, whoF);
// old: the frame's current shots (P.shots / P.teamShots rows with ids); throws: the re-entered throws; fallback: the ball
// to credit when the old frame had none (my own frames only). Returns { events, undo }.
export function fixEvents({ sid, game, f, old, throws, who = null, fallback = null }, o = {}) {
  const whoF = who && who !== 'me' ? { who } : {};
  const fresh = throws.map((t, i) => { const was = old.find(x => x.roll === i + 1) || old[0] || {};
    return mkEvent('shot.logged', sid, Object.assign({ sessionId: sid, game, frame: f, roll: i + 1, down: t.down, leave: t.leave || [], foul: !!t.foul,
      split: i === 0 && !t.foul && (t.leave || []).length > 0 && !!leaveHint(t.leave).split,
      ballId: was.ballId || (fallback ? fallback.id : null), catalogId: was.catalogId || (fallback ? fallback.catalogId : null), miss: i === 0 ? (was.miss || null) : null }, whoF), o); });
  return { events: old.map(x => voidEvent(x.id, o)).concat(fresh), undo: { f, game, sid, who: who || 'me', added: fresh.map(e => e.id), old: old.map(x => keep(x, whoF)) } };
}
// Undo a fix: void the re-entered shots and write the old ones back.
export const undoEvents = (u, o = {}) => u.added.map(id => voidEvent(id, o)).concat(u.old.map(d => mkEvent('shot.logged', u.sid, d, o)));
