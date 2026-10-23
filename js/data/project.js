// fold(events) → projection (DATA_SYSTEM §2.2). Pure; recomputed from the log, never edited in place.
import { stable, fnv } from './schema.js';
import { scoreGame } from './scoring.js';
export const order = (a, b) => (a.ts - b.ts) || ((a.seq || 0) - (b.seq || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
export function voidedSet(events) {
  const ids = new Set(), imps = new Set();
  for (const e of events) { if (e.type === 'event.voided' && e.data) ids.add(e.data.target); if (e.type === 'import.voided' && e.data) imps.add(e.data.importId); }
  for (const e of events) if (e.importId && imps.has(e.importId) && e.type !== 'import.voided' && e.type !== 'import.created') ids.add(e.id);
  return { ids, imps };
}
// Per-field last-writer-wins (ts, then event id): conflicts between devices resolve per field (§5).
function lww(target, stamps, fields, e) {
  for (const k of Object.keys(fields || {})) {
    const st = stamps[k];
    if (!st || e.ts > st.ts || (e.ts === st.ts && e.id > st.id)) { target[k] = fields[k]; stamps[k] = { ts: e.ts, id: e.id }; }
  }
}
export function project(events) {
  const evs = events.filter(e => e && e.type).slice().sort(order);
  const { ids: voided, imps } = voidedSet(evs);
  const P = { bowler: {}, owned: {}, lines: {}, notes: [], surface: [], service: [], shots: [], sessions: {}, centers: {}, bags: {}, aggregates: [], measurements: [], imports: {}, gamesLogged: [] };
  const st = { bowler: {}, owned: {}, sessions: {}, centers: {}, bags: {} };
  for (const e of evs) {
    if (voided.has(e.id) || e.type === 'event.voided' || e.type === 'import.voided') continue;
    const d = e.data || {}, id = e.entityId;
    switch (e.type) {
      case 'bowler.edited': lww(P.bowler, st.bowler, d.fields, e); break;
      case 'ownedBall.created': if (!P.owned[id]) { P.owned[id] = { id, createdTs: e.ts, prov: e.prov || null, importId: e.importId || null }; st.owned[id] = {}; } lww(P.owned[id], st.owned[id], d, e); break;
      case 'ownedBall.edited': if (P.owned[id]) lww(P.owned[id], st.owned[id], d.fields, e); break;
      case 'line.created': case 'line.edited': P.lines[id] = Object.assign({}, P.lines[id], d, { key: id, ts: e.ts }); break;
      case 'line.deleted': delete P.lines[id]; break;
      case 'patternNote.created': P.notes.push(Object.assign({ id: e.id, ts: e.ts }, d)); break;
      case 'ball.surfaceLogged': P.surface.push(Object.assign({ id: e.id, ts: e.ts }, d)); break;
      case 'ball.serviced': P.service.push(Object.assign({ id: e.id, ts: e.ts }, d)); break;
      case 'ball.gamesLogged': P.gamesLogged.push(Object.assign({ id: e.id, ts: e.ts }, d)); break;
      case 'shot.logged': P.shots.push(Object.assign({ id: e.id, ts: e.ts, importId: e.importId || null }, d)); break;
      case 'session.created': if (!P.sessions[id]) { P.sessions[id] = { id, ts: e.ts }; st.sessions[id] = {}; } lww(P.sessions[id], st.sessions[id], d, e); break;
      case 'session.edited': if (P.sessions[id]) lww(P.sessions[id], st.sessions[id], d.fields, e); break;
      case 'center.created': case 'center.edited': if (!P.centers[id]) { P.centers[id] = { id }; st.centers[id] = {}; } lww(P.centers[id], st.centers[id], d.fields || d, e); break;
      case 'bag.saved': P.bags[id] = Object.assign({ id, ts: e.ts }, d); break;
      case 'bag.deleted': delete P.bags[id]; break;
      case 'sessionAggregate.created': P.aggregates.push(Object.assign({ id: e.id, ts: e.ts, prov: e.prov || null, importId: e.importId || null }, d)); break;
      case 'releaseMeasurement.created': P.measurements.push(Object.assign({ id: e.id, ts: e.ts, prov: e.prov || null, importId: e.importId || null }, d)); break;
      case 'import.created': P.imports[id] = Object.assign({ id, ts: e.ts, undone: false }, d); break;
      default: break;   // unknown types are kept in the log, ignored here (forward compatible)
    }
  }
  for (const i of imps) if (P.imports[i]) P.imports[i].undone = true;
  P.games = gamesOf(P.shots);
  P.health = healthOf(P);
  return P;
}
// Games from quick-log throws (shot.logged with frame/roll), grouped by session + game number.
export function gamesOf(shots) {
  const g = {};
  for (const s of shots) if (s.frame != null && s.sessionId) { const k = s.sessionId + '#' + (s.game || 1); (g[k] = g[k] || { key: k, sessionId: s.sessionId, game: s.game || 1, throws: [], balls: new Set() }).throws.push(s); if (s.ballId) g[k].balls.add(s.ballId); }
  return Object.values(g).map(x => { const r = scoreGame(x.throws.map(t => ({ down: t.down, foul: !!t.foul }))); return { key: x.key, sessionId: x.sessionId, game: x.game, n: x.throws.length, balls: [...x.balls].sort(), score: r.ok ? r.total : null, complete: r.ok && r.complete, ts: x.throws[x.throws.length - 1].ts }; });
}
// Ball health: games since last service of each type = fold(events). Never typed by the user.
export function healthOf(P) {
  const out = {};
  const used = {};   // ballId → [ts of each game]
  for (const g of P.games) for (const b of g.balls) (used[b] = used[b] || []).push(g.ts);
  for (const x of P.gamesLogged) if (x.ballId) for (let i = 0; i < (x.games | 0); i++) (used[x.ballId] = used[x.ballId] || []).push(x.ts);
  const ids = new Set([...Object.keys(used), ...P.service.map(s => s.ballId).filter(Boolean)]);
  for (const b of ids) {
    const ts = used[b] || [], last = {};
    for (const s of P.service) if (s.ballId === b) last[s.type] = Math.max(last[s.type] || 0, s.ts);
    const since = {}; for (const t of ['refresh', 'resurface', 'detox']) since[t] = last[t] ? ts.filter(x => x > last[t]).length : null;
    out[b] = { games: ts.length, since };
  }
  return out;
}
export const projectionHash = P => fnv(stable(P));
