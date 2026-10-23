// Storage backends for the event log (DATA_SYSTEM §1): IndexedDB → localStorage → memory.
// Same tiny interface: load() → {events, meta}; put(events); setMeta(k, v); clear().
export function memoryBackend() {
  let ev = new Map(), meta = {};
  return { kind: 'memory', async load() { return { events: [...ev.values()], meta: { ...meta } }; }, async put(list) { for (const e of list) ev.set(e.id, e); }, async setMeta(k, v) { meta[k] = v; }, async clear() { ev = new Map(); meta = {}; } };
}
export function localStorageBackend(ls = globalThis.localStorage, prefix = 'ap_v1_') {
  const get = k => { try { return JSON.parse(ls.getItem(prefix + k)); } catch (e) { return null; } };
  const set = (k, v) => ls.setItem(prefix + k, JSON.stringify(v));
  return {
    kind: 'localStorage',
    async load() { return { events: get('events') || [], meta: get('meta') || {} }; },
    async put(list) { const m = new Map((get('events') || []).map(e => [e.id, e])); for (const e of list) m.set(e.id, e); set('events', [...m.values()]); },
    async setMeta(k, v) { const m = get('meta') || {}; m[k] = v; set('meta', m); },
    async clear() { ls.removeItem(prefix + 'events'); ls.removeItem(prefix + 'meta'); },
  };
}
const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const done = tx => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = tx.onabort = () => rej(tx.error); });
export async function idbBackend(name = 'arsenal-pro', idb = globalThis.indexedDB) {
  if (!idb) throw new Error('no indexedDB');
  const o = idb.open(name, 1);
  o.onupgradeneeded = () => {
    const db = o.result;
    const ev = db.createObjectStore('events', { keyPath: 'id' });
    ev.createIndex('seq', 'seq'); ev.createIndex('entity', 'entity'); ev.createIndex('ts', 'ts'); ev.createIndex('synced', 'synced');
    db.createObjectStore('snap'); db.createObjectStore('imports', { keyPath: 'sha256' }); db.createObjectStore('meta');
  };
  const db = await Promise.race([req(o), new Promise((_, rej) => setTimeout(() => rej(new Error('idb open timeout')), 3000))]);
  db.onversionchange = () => db.close();   // let another tab (or a wipe) delete/upgrade the database
  return {
    kind: 'indexedDB',
    async load() {
      const tx = db.transaction(['events', 'meta'], 'readonly');
      const events = await req(tx.objectStore('events').getAll());
      const ms = tx.objectStore('meta'), keys = await req(ms.getAllKeys()), vals = await req(ms.getAll());
      const meta = {}; keys.forEach((k, i) => { meta[k] = vals[i]; });
      return { events, meta };
    },
    async put(list) { const tx = db.transaction('events', 'readwrite'); const s = tx.objectStore('events'); for (const e of list) s.put(e); await done(tx); },
    async setMeta(k, v) { const tx = db.transaction('meta', 'readwrite'); tx.objectStore('meta').put(v, k); await done(tx); },
    async clear() { const tx = db.transaction(['events', 'meta', 'imports', 'snap'], 'readwrite'); ['events', 'meta', 'imports', 'snap'].forEach(n => tx.objectStore(n).clear()); await done(tx); },
  };
}
export async function bestBackend() {
  try { return await idbBackend(); } catch (e) {}
  try { const ls = globalThis.localStorage; ls.setItem('ap_v1_probe', '1'); ls.removeItem('ap_v1_probe'); return localStorageBackend(ls); } catch (e) {}
  return memoryBackend();
}
