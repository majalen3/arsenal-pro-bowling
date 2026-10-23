// Event envelope (DATA_SYSTEM §2.1). Every change is an appended event; voids are events too.
import { SCHEMA_V, uuid } from './schema.js';
let seqN = 0;
export const setSeq = n => { seqN = Math.max(seqN, n | 0); };
export function mkEvent(type, entityId, data, o = {}) {
  const entity = type.split('.')[0];
  const e = { id: o.id || uuid(), seq: o.seq != null ? o.seq : ++seqN, ts: o.ts != null ? o.ts : Date.now(), deviceId: o.deviceId || null, schemaV: SCHEMA_V, type, entity, entityId: entityId == null ? null : String(entityId), data: data || {}, synced: !!o.synced };
  if (o.prov) e.prov = o.prov;
  if (o.importId) e.importId = o.importId;
  return e;
}
// Void one event, or every event of an import (undo).
export const voidEvent = (targetId, o) => mkEvent('event.voided', targetId, { target: targetId }, o);
export const voidImport = (importId, o) => mkEvent('import.voided', importId, { importId }, o);
export function isEnvelope(e) {
  return !!e && typeof e === 'object' && typeof e.id === 'string' && e.id.length <= 80 && typeof e.type === 'string' && /^[a-zA-Z]+\.[a-zA-Z]+$/.test(e.type) && Number.isFinite(e.ts) && (e.data == null || typeof e.data === 'object');
}
