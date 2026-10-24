// GAP (a): data protection. iOS Safari (not installed) can clear site data after 7 days without a visit
// (webkit.org/tracking-prevention); Home Screen apps are exempt. We ask the browser to keep storage
// (navigator.storage.persist), offer install once after the first saved game, and nudge a backup file.
// Thresholds are team calls (GAP_REVIEW_1 §2, "A"): nudge when no backup and more than 3 games, or the last backup is older than 14 days.
export const NUDGE_GAMES = 3, NUDGE_DAYS = 14, DAY = 864e5;
// Pure: should the recap show the backup nudge?
export function needsBackup({ games = 0, lastBackupAt = 0, snoozeUntil = 0, now = Date.now() } = {}) {
  if (snoozeUntil && now < snoozeUntil) return false;
  if (!lastBackupAt) return games > NUDGE_GAMES;
  return games > 0 && now - lastBackupAt > NUDGE_DAYS * DAY;
}
// Pure: "Last backup" in plain words.
export function lastBackupText(at, now = Date.now()) {
  if (!at) return 'No backup file yet.';
  const d = Math.floor((now - at) / DAY);
  return 'Last backup file: ' + (d <= 0 ? 'today.' : d === 1 ? 'yesterday.' : d + ' days ago.');
}
// Pure: the label for the More chip. Protected = the browser promised to keep storage, or the app runs from the Home Screen.
export function protectLabel({ persisted = false, standalone = false } = {}) {
  return persisted || standalone ? 'Protected' : 'Not protected';
}
// ---- browser glue (no-ops where unsupported)
let deferred = null;
export function listenInstall() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', () => { deferred = null; });
}
export const canPrompt = () => !!deferred;
export async function promptInstall() {
  if (!deferred) return false; const e = deferred; deferred = null;
  try { await e.prompt(); const c = await e.userChoice; return c && c.outcome === 'accepted'; } catch (_) { return false; }
}
export function isStandalone() {
  try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (_) { return false; }
}
export function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
export async function persisted() {
  try { return !!(navigator.storage && navigator.storage.persisted && await navigator.storage.persisted()); } catch (_) { return false; }
}
// Ask once per call site; browsers grant silently by heuristics (installed, engaged) or say no.
export async function askPersist() {
  try { return !!(navigator.storage && navigator.storage.persist && await navigator.storage.persist()); } catch (_) { return false; }
}
export async function state() { const p = await persisted(), s = isStandalone(); return { persisted: p, standalone: s, label: protectLabel({ persisted: p, standalone: s }) }; }
// How to install, in plain words for this browser.
export function installHow() {
  if (canPrompt()) return null; // the Install button does it
  if (isIOS()) return 'In Safari, tap Share, then Add to Home Screen.';
  return 'Use your browser menu: Install app or Add to Home screen.';
}
export function lastBackupAt(meta = {}) { return Math.max(meta.backupDownloadedAt || 0, meta.sync && meta.sync.lastPushAt && meta.codeCopiedAt ? meta.codeCopiedAt : 0); }
// Download the backup file and record when (shared by More and the recap nudge).
export async function saveBackupFile(db, prefsObj) {
  const { buildBackup, BACKUP_NAME } = await import('../data/backup.js');
  const b = await buildBackup(db, { prefs: prefsObj, legacy: db.meta.legacySnapshot || null });
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(b)], { type: 'application/json' })); a.download = BACKUP_NAME; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  await db.setMeta('backupDownloadedAt', Date.now());
}
