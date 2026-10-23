// Sync v2 glue (D3): starts the outbox after the log opens and flushes on changes, on reconnect and when the
// app is hidden. Core logic + tests: js/data/sync.js. Everything is kept on the phone whatever the server says.
import { API_BASE, deviceId, emit, on } from './store.js';
import { createSync } from './data/sync.js';
export let sync = null;
export function startOutbox(db) {
  if (sync || /[?&]nosync\b/.test(location.search)) return sync;
  sync = createSync({ db, base: API_BASE, deviceId, onState: () => emit('sync') });
  let t = null; const soon = (ms = 2000) => { clearTimeout(t); t = setTimeout(() => sync.run(), ms); };
  db.on(() => { if (sync.outbox().length) soon(); });
  addEventListener('online', () => soon(500)); on('code', () => soon(200));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && sync.outbox().length) sync.run(); });
  soon(navigator.onLine === false ? 15000 : 1500);
  window.__apSync = { run: () => sync.run(), state: () => sync.state(), outbox: () => sync.outbox().length };
  return sync;
}
