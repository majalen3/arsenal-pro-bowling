// v0 (ap_* localStorage keys) → v1 events (DATA_SYSTEM §7). Pure: input is a snapshot {key: rawString}.
// Event ids are derived from (key, index, content), so re-running produces the same ids → 0 new events (idempotent).
// Nothing is deleted: the caller keeps the raw snapshot in meta.legacySnapshot until a v1 backup is downloaded.
import { mkEvent } from './events.js';
import { fnv, stable, isoDay } from './schema.js';
export const LEGACY_KEYS = ['ap_lines', 'ap_surface', 'ap_notes', 'ap_shots', 'ap_profile', 'ap_dels', 'ap_state', 'ap_prefs'];
const arr = s => { try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : []; } catch (e) { return []; } };
const obj = s => { try { const v = JSON.parse(s); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch (e) { return null; } };
export function migrateV0(snap, { deviceId = null, now = Date.now() } = {}) {
  const out = [], report = { lines: 0, surface: 0, notes: 0, shots: 0, sessions: 0, profile: 0, owned: 0, skipped: [] };
  let seq = 0;
  const ev = (key, i, type, entityId, data, ts, extra) => out.push(mkEvent(type, entityId, data, Object.assign({ id: 'm0-' + fnv(key + '#' + i + '#' + stable(data)), seq: ++seq, ts: Number.isFinite(ts) ? ts : now, deviceId, prov: { kind: 'user', method: 'migrated-v0' } }, extra || {})));
  arr(snap.ap_lines).forEach((l, i) => {
    if (!l.ballId || !l.name) { report.skipped.push('ap_lines[' + i + ']'); return; }
    const d = {}; ['ballId', 'name', 'release', 'aim', 'speed', 'rev', 'oil', 'finish', 'pattern', 'note', 'id'].forEach(k => { if (l[k] !== undefined) d[k === 'id' ? 'serverId' : k] = l[k]; });
    ev('ap_lines', i, 'line.created', l.ballId + '|' + l.name, d, l.updatedAt); report.lines++;
  });
  arr(snap.ap_surface).forEach((s, i) => { if (!s.ballId) { report.skipped.push('ap_surface[' + i + ']'); return; } ev('ap_surface', i, 'ball.surfaceLogged', s.ballId, { ballId: s.ballId, date: s.date || null, finish: s.finish || null, type: 'surfaceChange' }, s.date ? Date.parse(s.date) : now); report.surface++; });
  // notes: no date in v0 → date null; identical notes are kept (index in the id), never deduped.
  arr(snap.ap_notes).forEach((n, i) => { ev('ap_notes', i, 'patternNote.created', null, { lane: n.lane || '', oil: n.oil || '', adjustment: n.adjustment || '', date: null }, now - (1e6 - i)); report.notes++; });
  // shots → one synthetic legacy session per local day.
  const days = {};
  arr(snap.ap_shots).forEach((s, i) => {
    const t = Number.isFinite(s.t) ? s.t : now, day = isoDay(t), sid = 'legacy-' + day;
    if (!days[sid]) { days[sid] = 1; ev('ap_shots-session', day, 'session.created', sid, { date: day, kind: 'legacy', synthetic: true }, t); report.sessions++; }
    ev('ap_shots', i, 'shot.logged', sid, { sessionId: sid, ballId: s.ballId || null, pattern: s.pattern || null, miss: s.miss || null, before: s.before || null, after: s.after || null }, t); report.shots++;
  });
  const p = obj(snap.ap_profile);
  if (p) {
    const f = {};
    if (p.hand === 'left' || p.hand === 'right') f.hand = p.hand;
    if (p.style) f.style = p.style;
    if (Number.isFinite(+p.speed) && p.speed !== '') f.speed = { v: +p.speed, unit: 'mph', at: 'unknown', prov: { kind: 'user' } };
    if (Number.isFinite(+p.rev) && p.rev !== '') f.rev = { v: +p.rev, unit: 'rpm', prov: { kind: 'user' } };
    if (p.pap) f.pap = { v: String(p.pap), unit: 'in', prov: { kind: 'user' } };
    if (p.tilt) f.tilt = { v: String(p.tilt), unit: null, prov: { kind: 'user' } };
    ev('ap_profile', 0, 'bowler.edited', 'me', { fields: f }, now - 2e6); report.profile++;
    (Array.isArray(p.owned) ? p.owned : []).forEach((id, i) => { if (typeof id !== 'string') return; ev('ap_profile.owned', i, 'ownedBall.created', 'own-' + id, { catalogId: id, name: null, status: 'inBag' }, now - 2e6 + i); report.owned++; });
  }
  return { events: out, report, outbox: { dels: (() => { try { const v = JSON.parse(snap.ap_dels); return Array.isArray(v) ? v.filter(Number.isInteger) : []; } catch (e) { return []; } })() } };
}
