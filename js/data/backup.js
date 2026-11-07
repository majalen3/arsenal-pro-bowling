// Backup v1 (DATA_SYSTEM §8): one JSON file with every event + a sha256 over the events. Restore goes through a preview.
import { SCHEMA_V, stable, sha256Hex } from './schema.js';
import { isEnvelope } from './events.js';
import { order, project } from './project.js';
export const BACKUP_NAME = 'arsenal-pro-backup-v1.json';
const canon = evs => evs.slice().sort(order).map(e => Object.assign({}, e, { synced: undefined }));
export async function buildBackup(db, { prefs = null, legacy = null, now = Date.now(), includeCheckpoints = true } = {}) {
  const events = canon(db.events());
  const imports = Object.values(db.projection().imports);
  const b = { app: 'arsenal-pro', format: 'backup', schemaV: SCHEMA_V, exportedAt: new Date(now).toISOString(), deviceId: db.deviceId, events, imports, prefs };
  if (legacy) b.legacy = legacy;
  // Keep review/rollback evidence, never session tokens or a sync authorization.
  if (db.meta.foundationSnapshot) b.foundation = { snapshot: db.meta.foundationSnapshot, review: db.meta.ownershipReview || null };
  if (includeCheckpoints && db.meta.restoreCheckpoints) b.restoreCheckpoints = db.meta.restoreCheckpoints;
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
// Existing facts must survive byte-for-byte. New records are allowed; conflicts stay in preview.
export function restoreIssues(db, parsed) {
  const issues = [];
  if (!parsed?.ok || !parsed.backup || !Array.isArray(parsed.backup.events)) return ['Invalid backup.'];
  if (parsed.hashOk !== true) issues.push('Checksum mismatch: nothing can be restored. Keep the original file.');
  const events = parsed.backup.events;
  if (events.some(e => !isEnvelope(e))) issues.push('Invalid event records: nothing can be restored.');
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
export async function restoreBackup(db, parsed, snapshot = {}) {
  const problems = restoreIssues(db, parsed); if (problems.length) throw new Error(problems.join(' '));
  const evs = parsed.backup.events.filter(e => !db.has(e.id)).map(e => ({ ...e, synced:false }));
  if (!evs.length) return { added:0 };
  const before = stable(canon(db.events()));
  const backup = await buildBackup(db, { ...snapshot, includeCheckpoints:false });
  // Persist before any append. Quota/failure aborts the operation; no safety copy is silently replaced.
  await db.setMeta('restoreCheckpoints', [...(db.meta.restoreCheckpoints || []), { v:1, at:Date.now(), backup }]);
  const added = await db.append(evs, { preserveDevice:true, guard:() => {
    if (stable(canon(db.events())) !== before || restoreIssues(db, parsed).length) throw new Error('Local data changed after preview. Nothing was restored; choose the file again.');
  } });
  return { added:added.length };
}
