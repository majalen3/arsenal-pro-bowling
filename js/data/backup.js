// Backup v1 (DATA_SYSTEM §8): one JSON file with every event + a sha256 over the events. Restore goes through a preview.
import { SCHEMA_V, stable, sha256Hex } from './schema.js';
import { isEnvelope } from './events.js';
import { order } from './project.js';
export const BACKUP_NAME = 'arsenal-pro-backup-v1.json';
const canon = evs => evs.slice().sort(order).map(e => Object.assign({}, e, { synced: undefined }));
export async function buildBackup(db, { prefs = null, legacy = null, now = Date.now() } = {}) {
  const events = canon(db.events());
  const imports = Object.values(db.projection().imports);
  const b = { app: 'arsenal-pro', format: 'backup', schemaV: SCHEMA_V, exportedAt: new Date(now).toISOString(), deviceId: db.deviceId, events, imports, prefs };
  if (legacy) b.legacy = legacy;
  b.sha256 = await sha256Hex(stable(events));
  return b;
}
// Parse + verify. Nothing is written here.
export async function readBackup(text, db) {
  let b; try { b = JSON.parse(text); } catch (e) { return { ok: false, error: 'Not a JSON file.' }; }
  if (!b || b.app !== 'arsenal-pro') return { ok: false, error: 'Not an Arsenal Pro backup.' };
  if (b.format !== 'backup' || !Array.isArray(b.events)) {
    // v0 backup (cycle ≤ 6 "Download backup": lines/surfaceLog/patternNotes) — restore through the migration path.
    if (Array.isArray(b.lines) || Array.isArray(b.surfaceLog)) return { ok: true, v0: true, backup: b, counts: { lines: (b.lines || []).length, surface: (b.surfaceLog || []).length, notes: (b.patternNotes || []).length } };
    return { ok: false, error: 'Unknown backup format.' };
  }
  if (b.schemaV > SCHEMA_V) return { ok: false, error: `Backup is from a newer app (schema ${b.schemaV}). Update the app first.` };
  const bad = b.events.filter(e => !isEnvelope(e)).length;
  const hash = await sha256Hex(stable(canon(b.events.filter(isEnvelope))));
  const fresh = db ? b.events.filter(e => isEnvelope(e) && !db.has(e.id)).length : b.events.length;
  return { ok: true, backup: b, hashOk: hash === b.sha256, counts: { events: b.events.length, new: fresh, dup: b.events.length - fresh - bad, bad } };
}
export async function restoreBackup(db, parsed) {
  const evs = parsed.backup.events.filter(isEnvelope).map(e => Object.assign({}, e, { synced: false }));
  const added = await db.append(evs);
  return { added: added.length };
}
