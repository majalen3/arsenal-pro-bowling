// Sync v2 glue (D3): starts the outbox after the log opens and flushes on changes, on reconnect and when the
// app is hidden. Core logic + tests: js/data/sync.js. Everything is kept on the phone whatever the server says.
import { API_BASE, deviceId, emit, on, rawGet, rawSet, prefs } from './store.js';
import { LEGACY_KEYS } from './data/migrate.js';
import { createSync } from './data/sync.js';
import { account } from './account.js';
export let sync = null;
export function startOutbox(db) {
  if (sync || /[?&]nosync\b/.test(location.search)) return sync;
  sync = createSync({ db, base: API_BASE, deviceId, onState: () => { if (db.meta.accountBinding) rawSet('ap_sync_guard', JSON.stringify({ v: 1, account: db.meta.accountBinding, blocked:!!db.meta.privacyConflict })); emit('sync'); }, auth: () => account.active(), onAuthLost: () => account.end(), allowLegacy: () => rawGet('ap_backup_sync') === 'true', recoverySnapshot:()=>({prefs:prefs(),legacy:Object.fromEntries(LEGACY_KEYS.map(k=>[k,rawGet(k)]))}) });
  // Pulled account data on a phone whose ap_* mirror is empty (a new phone): rebuild the profile / lines mirror.
  const run0 = sync.run; sync.run = () => run0().then(r => { if (r && r.pulled) import('./hub.js').then(h => h.hydrateMirror()).catch(() => {}); return r; });
  let t = null; const soon = (ms = 2000) => { clearTimeout(t); t = setTimeout(() => sync.run(), ms); };
  db.on(() => { if (sync.outbox().length) soon(); });
  addEventListener('online', () => soon(500)); on('code', () => soon(200)); on('sync-request', () => soon(200)); on('account', () => soon(200));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && sync.outbox().length) sync.run(); });
  soon(navigator.onLine === false ? 15000 : 1500);
  window.__apSync = { run: () => sync.run(), state: () => sync.state(), outbox: () => sync.outbox().length };
  return sync;
}
