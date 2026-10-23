// The event log + cached projection. One instance per app (or per test). DOM-free.
import { project, projectionHash } from './project.js';
import { isEnvelope, setSeq } from './events.js';
import { migrateV0 } from './migrate.js';
import { SCHEMA_V } from './schema.js';
export function createDB(backend, { deviceId = null } = {}) {
  const ev = new Map(); let meta = {}, P = null; const subs = new Set();
  const notify = () => { P = null; subs.forEach(f => { try { f(); } catch (e) { console.error(e); } }); };
  const api = {
    backend, deviceId,
    async open() { const r = await backend.load(); ev.clear(); for (const e of r.events) if (isEnvelope(e)) ev.set(e.id, e); meta = r.meta || {}; let mx = 0; for (const e of ev.values()) if ((e.seq || 0) > mx) mx = e.seq; setSeq(mx); P = null; return api; },
    events: () => [...ev.values()],
    has: id => ev.has(id),
    get meta() { return meta; },
    async setMeta(k, v) { meta[k] = v; await backend.setMeta(k, v); },
    // Appends new events (dedupe by id); returns the ones actually added.
    async append(list, { silent = false } = {}) {
      const add = [];
      for (const e of list) { if (!isEnvelope(e) || ev.has(e.id)) continue; if (!e.deviceId && api.deviceId) e.deviceId = api.deviceId; add.push(e); }
      if (!add.length) return add;
      await backend.put(add); add.forEach(e => ev.set(e.id, e));
      if (!silent) notify(); else P = null;
      return add;
    },
    async markSynced(ids) { const ch = []; for (const id of ids) { const e = ev.get(id); if (e && !e.synced) { e.synced = true; ch.push(e); } } if (ch.length) await backend.put(ch); },
    projection() { if (!P) P = project(api.events()); return P; },
    hash() { return projectionHash(api.projection()); },
    on(fn) { subs.add(fn); return () => subs.delete(fn); },
    async wipe() { await backend.clear(); ev.clear(); meta = {}; notify(); },
    // v0 → v1 migration, run once. legacy = {ap_key: rawString}. Snapshot kept until a v1 backup is downloaded.
    async migrate(legacy, now = Date.now()) {
      if ((meta.schemaV || 0) >= SCHEMA_V) return { ran: false, added: 0 };
      const has = Object.values(legacy || {}).some(v => v != null);
      if (has && !meta.legacySnapshot) await api.setMeta('legacySnapshot', { takenAt: now, keys: legacy });
      const r = migrateV0(legacy || {}, { deviceId: api.deviceId, now });
      const added = await api.append(r.events, { silent: true });
      if (r.outbox.dels.length) await api.setMeta('outboxDels', r.outbox.dels);
      await api.setMeta('migrationReport', Object.assign({ at: now, added: added.length }, r.report));
      await api.setMeta('schemaV', SCHEMA_V);
      notify();
      return { ran: true, added: added.length, report: r.report };
    },
  };
  return api;
}
