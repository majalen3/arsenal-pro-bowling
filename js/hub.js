// Glue between the UI (store.js) and the v1 event log (js/data/). Opens IndexedDB after first paint, migrates v0 once,
// seeds the owner-reported arsenal once, and emits 'data' on every change.
import { setSink, rawGet, deviceId, emit, on, profile, lsGet, lsSet, objGet, LS } from './store.js';
import { createDB } from './data/db.js';
import { bestBackend, memoryBackend } from './data/idb.js';
import { mkEvent, voidImport } from './data/events.js';
import { seedEvents, SEED_ID } from './data/seed.js';
import { LEGACY_KEYS } from './data/migrate.js';
import { registerOwned } from './cc/cats.js';
export let db = null;
let readyP = null;
export const ready = () => readyP || (readyP = init());
export const proj = () => { const P = db ? db.projection() : null; if (P) registerOwned(P); return P; };   // added balls resolve via cats.catOf
async function init() {
  const t0 = performance.now();
  let be; try { be = await bestBackend(); } catch (e) { be = memoryBackend(); }
  db = createDB(be, { deviceId: deviceId() }); await db.open();
  const legacy = {}; for (const k of LEGACY_KEYS) { const v = rawGet(k); if (v != null) legacy[k] = v; }
  const r = await db.migrate(legacy);
  // Writes made before the log opened are already inside the migrated ap_* snapshot, so drop them when migration ran.
  setSink((type, id, data) => { db.append([mkEvent(type, id, data, { deviceId: deviceId(), prov: { kind: 'user' } })]); }, { dropPending: r.ran });
  // The reported arsenal auto-loads once only on a phone that already has history (the owner's); fresh phones get a
  // one-tap "Load starter arsenal" offer instead, so a stranger never inherits someone else's bag (DECISIONS 2026-10-23).
  if (!db.meta.seeded) { if (r.ran && r.added > 0 && !Object.keys(db.projection().owned).length) await db.append(seedEvents({ deviceId: deviceId() }), { silent: true }); await db.setMeta('seeded', Date.now()); }
  on('profile', syncOwnedFromProfile);
  db.on(() => emit('data'));
  window.__apData = { backend: be.kind, bootMs: Math.round(performance.now() - t0), events: () => db.events().length, hash: () => db.hash(), projection: () => db.projection() };
  emit('data');
  import('./sync.js').then(m => m.startOutbox(db)).catch(() => {});
  return db;
}
// The More → "My bag" picker still writes ap_profile.owned; mirror new picks into ownedBall events (never removes).
function syncOwnedFromProfile() {
  const p = profile(); if (!db || !p || !Array.isArray(p.owned)) return;
  const P = db.projection(), have = new Set(Object.values(P.owned).map(o => o.catalogId).filter(Boolean));
  const add = p.owned.filter(id => typeof id === 'string' && !have.has(id)).map(id => mkEvent('ownedBall.created', 'own-' + id, { catalogId: id, name: null, status: 'inBag' }, { deviceId: deviceId(), prov: { kind: 'user' } }));
  if (add.length) db.append(add);
}
export async function add(type, entityId, data, o = {}) { await ready(); return db.append([mkEvent(type, entityId, data, Object.assign({ deviceId: deviceId(), prov: { kind: 'user' } }, o))]); }
export async function addMany(list) { await ready(); return db.append(list); }
export async function undoImport(importId) { await ready(); return db.append([voidImport(importId, { deviceId: deviceId() })]); }
// The ap_* keys are the hot mirror the v1 screens + v1 API read. After a restore onto a wiped phone they are empty while the
// log is full: rebuild each EMPTY key from the projection (never overwrites a key that has data). No events are recorded.
export function hydrateMirror() {
  if (!db) return 0; const P = db.projection(); let n = 0;
  const vals = o => Object.values(o);
  if (!lsGet(LS.lines).length && vals(P.lines).length) { lsSet(LS.lines, vals(P.lines).map(l => ({ ballId: l.ballId, name: l.name, release: l.release, aim: l.aim, speed: l.speed, rev: l.rev, oil: l.oil, finish: l.finish, pattern: l.pattern, note: l.note || '', updatedAt: l.ts, synced: false }))); n++; emit('lines'); }
  if (!lsGet(LS.surface).length && P.surface.length) { lsSet(LS.surface, P.surface.map(s => ({ ballId: s.ballId, date: s.date, finish: s.finish, synced: false }))); n++; }
  if (!lsGet(LS.notes).length && P.notes.length) { lsSet(LS.notes, P.notes.map(x => ({ lane: x.lane, oil: x.oil, adjustment: x.adjustment, synced: false }))); n++; }
  const legacyShots = P.shots.filter(x => x.frame == null && x.miss);
  if (!lsGet(LS.shots).length && legacyShots.length) { lsSet(LS.shots, legacyShots.map(x => ({ t: x.ts, ballId: x.ballId, pattern: x.pattern, miss: x.miss, before: x.before, after: x.after }))); n++; }
  if (!objGet(LS.profile) && (Object.keys(P.bowler).length || Object.keys(P.owned).length)) {
    const b = P.bowler, v = f => (f && typeof f === 'object' && 'v' in f) ? f.v : f;
    const pr = { hand: b.hand === 'left' || b.hand === 'right' ? b.hand : null,   // explicit hand only; never guessed
                 style: b.style || null, speed: v(b.speed) ?? '', rev: v(b.rev) ?? '', pap: v(b.pap) ?? '', tilt: v(b.tilt) ?? '', owned: vals(P.owned).map(o => o.catalogId).filter(Boolean) };
    lsSet(LS.profile, pr); n++; emit('profile');
  }
  if (n) emit('alley');
  return n;
}
export async function loadStarter() { await ready(); const P = db.projection(); if (Object.values(P.owned).some(o => o.importId && o.importId.startsWith(SEED_ID))) return []; const n = Object.keys(P.imports).filter(k => k.startsWith(SEED_ID)).length; const keep = Object.keys(P.bowler || {}).filter(k => P.bowler[k] != null && P.bowler[k] !== ''); return db.append(seedEvents({ deviceId: deviceId(), importId: n ? SEED_ID + '-' + (n + 1) : SEED_ID, keep })); }
