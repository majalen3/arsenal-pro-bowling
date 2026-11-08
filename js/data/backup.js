// Backup v1 (DATA_SYSTEM §8): one JSON file with every event + a sha256 over the events. Restore goes through a preview.
import { SCHEMA_V, stable, sha256Hex } from './schema.js';
import { isEnvelope } from './events.js';
import { order, project, voidedSet } from './project.js';
export const BACKUP_NAME = 'arsenal-pro-backup-v1.json';
const reserved = new Set(['__proto__', 'constructor', 'prototype']);
function safeTree(v, depth = 0) {
  if (depth > 80) return false;
  if (!v || typeof v !== 'object') return true;
  return Object.keys(v).every(k => !reserved.has(k) && safeTree(v[k], depth + 1));
}
function backupEventOK(e) {
  return isEnvelope(e) && e.id.length > 0 && Number.isSafeInteger(e.seq) && e.seq >= 0 && (e.entityId == null || typeof e.entityId === 'string') && e.schemaV === SCHEMA_V && !reserved.has(e.entityId) && safeTree(e) &&
    (e.data == null || !Array.isArray(e.data)) && (!e.data?.fields || (typeof e.data.fields === 'object' && !Array.isArray(e.data.fields)));
}
const canon = evs => evs.slice().sort(order).map(e => Object.assign({}, e, { synced: undefined }));
export async function buildBackup(db, { prefs = null, legacy = null, now = Date.now(), includeCheckpoints = true, includeRecovery = true } = {}) {
  const events = canon(db.events());
  const imports = Object.values(db.projection().imports);
  const b = { app: 'arsenal-pro', format: 'backup', schemaV: SCHEMA_V, exportedAt: new Date(now).toISOString(), deviceId: db.deviceId, events, imports, prefs };
  if (legacy) b.legacy = legacy;
  // Keep review/rollback evidence, never session tokens or a sync authorization.
  if (db.meta.foundationSnapshot) b.foundation = { snapshot: db.meta.foundationSnapshot, review: db.meta.ownershipReview || null };
  if (includeRecovery && db.meta.localRecovery) b.localRecoveryArchive = db.meta.localRecovery;
  if (db.meta.pendingAccountRecovery) b.pendingAccountRecovery = db.meta.pendingAccountRecovery;
  if (includeCheckpoints && db.meta.restoreCheckpoints) b.restoreCheckpoints = db.meta.restoreCheckpoints;
  b.sha256 = await sha256Hex(stable(events));
  return b;
}
// Parse + verify. Nothing is written here.
export async function readBackup(text, db) {
  let b; try { b = JSON.parse(text); } catch (e) { return { ok: false, error: 'Not a JSON file.' }; }
  if (b?.user && Array.isArray(b.events) && !b.app) return { ok:false, error:'Account exports are private archives, not app-restorable backup files. Keep the archive. Download a phone backup from Me for event recovery; account/team/settings recovery is not provided by Import.' };
  if (!b || b.app !== 'arsenal-pro') return { ok: false, error: 'Not an Arsenal Pro backup.' };
  if (b.schemaV > SCHEMA_V) return { ok:false, error:`Backup is from a newer app (schema ${b.schemaV}). Update the app first.` };
  if (b.format !== 'backup' || !Array.isArray(b.events)) {
    // v0 backup (cycle ≤ 6 "Download backup": lines/surfaceLog/patternNotes) — restore through the migration path.
    if (b.format == null && (Array.isArray(b.lines) || Array.isArray(b.surfaceLog))) return { ok: true, v0: true, backup: b, counts: { lines: (b.lines || []).length, surface: (b.surfaceLog || []).length, notes: (b.patternNotes || []).length } };
    return { ok: false, error: 'Unknown backup format.' };
  }
  if (b.schemaV !== SCHEMA_V) return { ok:false, error:'Missing or unsupported backup schema. Nothing was restored.' };
  const bad = b.events.filter(e => !backupEventOK(e)).length;
  const hash = await sha256Hex(stable(canon(b.events.filter(isEnvelope))));
  const fresh = db ? b.events.filter(e => backupEventOK(e) && !db.has(e.id)).length : b.events.length;
  return { ok: true, backup: b, hashOk: hash === b.sha256, counts: { events: b.events.length, new: fresh, dup: Math.max(0, b.events.length - fresh - bad), bad }, localRevision: db ? stable(canon(db.events())) : null };
}
// Existing facts must survive byte-for-byte. New records are allowed; conflicts stay in preview.
export function restoreIssues(db, parsed) {
  const issues = [];
  if (db.meta.localRecovery && !['undone','closed'].includes(db.meta.localRecovery.phase)) issues.push('An earlier local recovery needs review. Open Import to keep or Undo it before another restore.');
  if (!parsed?.ok || !parsed.backup || !Array.isArray(parsed.backup.events)) return ['Invalid backup.'];
  if (parsed.hashOk !== true) issues.push('Checksum mismatch: nothing can be restored. Keep the original file.');
  if (parsed.backup.schemaV != null && parsed.backup.schemaV !== SCHEMA_V) issues.push('Unsupported backup schema. Nothing can be restored.');
  const events = parsed.backup.events;
  if (parsed.localRevision && parsed.localRevision !== stable(canon(db.events()))) issues.push('Local data changed after this preview. Choose the file again; nothing was restored.');
  if (events.some(e => !backupEventOK(e))) issues.push('Invalid event records: nothing can be restored.');
  const localVoids=voidedSet(db.events()).ids,fileVoids=voidedSet(events).ids;
  if(events.some(e=>localVoids.has(e.id)&&!fileVoids.has(e.id)))issues.push('This file contains locally undone event IDs. They cannot be reinstated in this profile; keep the file for separate clean-profile recovery.');
  const local = new Map(db.events().map(e => [e.id, e])), seen = new Set();
  for (const e of events.filter(isEnvelope)) {
    if (seen.has(e.id)) issues.push('Repeated event IDs inside the file require separate review.');
    seen.add(e.id);
    if (local.has(e.id) && stable(canon([local.get(e.id)])) !== stable(canon([e]))) issues.push('An event ID has different content here. It is not a safe duplicate.');
  }
  if (issues.length) return [...new Set(issues)];
  try {
    const before = db.projection(), after = project([...db.events(), ...events.filter(e => !local.has(e.id))]);
    for (const [kind, value] of Object.entries(before)) {
      if (kind === 'health') continue; // Derived service counters can grow with genuinely new history.
      const next = after[kind];
      const rows = Array.isArray(value) ? value.map((v,i) => [v.id || v.key || String(i), v]) : Object.entries(value);
      for (const [id, old] of rows) {
        const kept = Array.isArray(next) ? next.find((v,i) => (v.id || v.key || String(i)) === id) : next?.[id];
        if (stable(old) !== stable(kept)) { issues.push(`Existing ${kind} would change. This restore is staged only; download your current backup and use a separate clean local profile for recovery.`); break; }
      }
    }
  } catch (_) { issues.push('The file cannot be safely projected by this version. Nothing was restored.'); }
  return issues;
}
// Nonempty legacy hot mirrors cannot be safely reconciled by hydrateMirror's empty-only path.
// Block that UI/core path instead of reporting a successful but partly invisible recovery.
export function recoverySupport(db, parsed, snapshot = {}) {
  const blockers = [], notes = [];
  const hasData = raw => { if (!raw) return false; try { const v = JSON.parse(raw); return v && (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0); } catch (_) { return true; } };
  if (parsed.backup?.localRecoveryArchive) notes.push('Local recovery checkpoint is an archive only; Import does not apply its journal or sync state.');
  if (parsed.backup?.pendingAccountRecovery) notes.push('Staged account recovery is an archive only: Import does not apply that stream or rebind sync. Keep the original file to retain its staged records.');
  if (parsed.backup?.prefs) notes.push('File preferences and saved aiming settings are archived only, not applied. Your current settings stay unchanged; this is not a full phone recovery.');
  if (parsed.backup?.legacy || parsed.backup?.foundation) notes.push('Older mirror/review snapshots are retained in the source file, not applied to this browser.');
  try {
    const before = db.projection(), after = project([...db.events(), ...(parsed.backup?.events || []).filter(e => backupEventOK(e) && !db.has(e.id))]);
    for (const [key, kind, label] of [['ap_lines','lines','saved lines'], ['ap_surface','surface','surface log'], ['ap_notes','notes','pattern notes'], ['ap_shots','shots','older shots']]) {
      const ids = v => new Set(Array.isArray(v) ? v.map(x => x.id) : Object.keys(v));
      const old = ids(before[kind]);
      if (hasData(snapshot.legacy?.[key]) && [...ids(after[kind])].some(id => !old.has(id))) blockers.push(`This phone already has ${label}. Nonempty legacy-mirror reconciliation is unsupported; nothing will be restored here. Keep both files and use a separate clean local profile for event-only recovery.`);
    }
    if (hasData(snapshot.legacy?.ap_profile) && Object.keys(after.bowler).some(k => !(k in before.bowler))) blockers.push('New profile facts cannot be safely applied over this phone’s existing profile mirror. Nothing will be restored here; keep both backups for separate review.');
  } catch (_) {} // restoreIssues supplies the validation error; never project invalid data into storage.
  return { blockers, notes };
}
export async function restoreBackup(db, parsed, snapshot = {}, { guard = null } = {}) {
  if (guard) guard();
  const problems = [...restoreIssues(db, parsed), ...recoverySupport(db, parsed, snapshot).blockers]; if (problems.length) throw new Error(problems.join(' '));
  const evs = parsed.backup.events.filter(e => !db.has(e.id)).map(e => ({ ...e, synced:false }));
  if (!evs.length) return { added:0 };
  const before = stable(canon(db.events()));
  const backup = await buildBackup(db, { ...snapshot, includeCheckpoints:false });
  // Persist before any append. Quota/failure aborts the operation; no safety copy is silently replaced.
  if (guard) guard();
  await db.setMeta('restoreCheckpoints', [...(db.meta.restoreCheckpoints || []), { v:1, at:Date.now(), backup }]);
  const added = await db.append(evs, { preserveDevice:true, guard:() => {
    if (guard) guard();
    if (stable(canon(db.events())) !== before || restoreIssues(db, parsed).length) throw new Error('Local data changed after preview. Nothing was restored; choose the file again.');
  } });
  return { added:added.length };
}
