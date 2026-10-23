// Sync v2 core (DATA_SYSTEM §7), DOM-free. Outbox = events with synced:false, flushed in ≤ 15 kB batches to
// POST /api/events; pulls GET /api/events?after=<cursor> so a second phone with the same backup code converges
// (the projection is field-level last-writer-wins, so order of arrival does not matter).
// Backoff 15 s / 45 s / 120 s / 300 s, honouring Retry-After. A quota 429 (no Retry-After) stops pushing;
// everything stays on the phone. The v1 endpoints (/api/lines etc.) keep being written by store.js (dual-write).
export const BATCH_BYTES = 15000, BACKOFF = [15000, 45000, 120000, 300000];
const wire = e => { const o = {}; for (const k of ['id', 'seq', 'ts', 'deviceId', 'schemaV', 'type', 'entity', 'entityId', 'data', 'prov', 'importId']) if (e[k] !== undefined) o[k] = e[k]; return o; };
const enc = s => (typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s).length : s.length);
// Pack events into batches whose serialized {events:[…]} body is ≤ maxBytes. An event that alone exceeds it is returned in `tooBig`.
export function packBatches(events, maxBytes = BATCH_BYTES, maxCount = 500) {
  const out = [], tooBig = []; let cur = [], size = 12;
  for (const e of events) {
    const w = wire(e), n = enc(JSON.stringify(w)) + 1;
    if (n + 12 > maxBytes) { tooBig.push(e); continue; }
    if (cur.length && (size + n > maxBytes || cur.length >= maxCount)) { out.push(cur); cur = []; size = 12; }
    cur.push(w); size += n;
  }
  if (cur.length) out.push(cur);
  return { batches: out, tooBig };
}
const order = (a, b) => (a.ts - b.ts) || ((a.seq || 0) - (b.seq || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
export function createSync({ db, base, deviceId, fetchFn = (...a) => fetch(...a), timer = { set: (f, ms) => setTimeout(f, ms), clear: id => clearTimeout(id) }, now = () => Date.now(), onState = () => {}, timeoutMs = 25000 } = {}) {
  let busy = null, retryN = 0, retryT = null, stopped = false;
  const state = () => Object.assign({ lastPushAt: null, lastPullAt: null, cursor: '0', quota: null, rejected: [], lastError: null }, db.meta.sync || {});
  const save = async patch => { const s = Object.assign(state(), patch); await db.setMeta('sync', s); onState(s); return s; };
  async function req(path, opts = {}) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null; const t = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
    try {
      const r = await fetchFn(base + path, Object.assign({}, opts, { signal: ctl && ctl.signal, headers: Object.assign({ 'X-Device-Id': typeof deviceId === 'function' ? deviceId() : deviceId }, opts.body ? { 'Content-Type': 'application/json' } : {}) }));
      let j = null; try { j = await r.json(); } catch (e) {}
      return { status: r.status, retryAfter: +(r.headers && r.headers.get && r.headers.get('Retry-After')) || 0, json: j };
    } finally { if (t) clearTimeout(t); }
  }
  const outbox = () => { const rej = new Set(state().rejected); return db.events().filter(e => !e.synced && !rej.has(e.id)).sort(order); };
  function schedule(retryAfter) {
    if (retryT || stopped) return; const d = Math.max(BACKOFF[Math.min(retryN, BACKOFF.length - 1)], retryAfter ? retryAfter * 1000 + 500 : 0); retryN++;
    retryT = timer.set(() => { retryT = null; run(); }, d);
  }
  async function push() {
    const st = state(); if (st.quota && st.quota.full) return { pushed: 0, quota: true };
    const { batches, tooBig } = packBatches(outbox());
    if (tooBig.length) await save({ rejected: [...new Set([...st.rejected, ...tooBig.map(e => e.id)])].slice(-1000) });
    let pushed = 0;
    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      const r = await req('/api/events', { method: 'POST', body: JSON.stringify({ events: b }) });
      if (r.status === 200) { await db.markSynced(b.map(e => e.id)); pushed += b.length; if (r.json && r.json.quota) await save({ quota: { full: false, stored: r.json.stored, limit: r.json.quota } }); continue; }
      if (r.status === 429 && !r.retryAfter && r.json && r.json.quota) { await save({ quota: { full: true, stored: r.json.stored, limit: r.json.quota, at: now(), msg: r.json.error } }); return { pushed, quota: true }; }
      if (r.status === 400 || r.status === 413) {
        // A bad batch: retry its events one by one so one invalid event cannot block the rest; record the ones refused.
        if (b.length > 1) { const half = Math.ceil(b.length / 2); batches.splice(i + 1, 0, b.slice(0, half), b.slice(half)); continue; }
        await save({ rejected: [...new Set([...state().rejected, b[0].id])].slice(-1000), lastError: `event ${b[0].type} refused (${r.status})` }); continue;
      }
      const er = new Error('HTTP ' + r.status); er.status = r.status; er.retryAfter = r.retryAfter; throw er;
    }
    return { pushed };
  }
  async function pull() {
    let cursor = state().cursor || '0', got = 0;
    for (let page = 0; page < 40; page++) {
      const r = await req('/api/events?limit=500&after=' + encodeURIComponent(cursor));
      if (r.status !== 200 || !r.json || !Array.isArray(r.json.events)) { const er = new Error('HTTP ' + r.status); er.status = r.status; er.retryAfter = r.retryAfter; throw er; }
      const add = r.json.events.map(e => { const o = Object.assign({}, e, { synced: true }); delete o.serverSeq; if (o.seq == null) delete o.seq; if (o.prov == null) delete o.prov; if (o.importId == null) delete o.importId; return o; });
      // seq is the writing phone's own counter (orders same-ms events identically on every phone); serverSeq is only the cursor.
      const added = await db.append(add.filter(e => !db.has(e.id)));
      got += added.length; cursor = r.json.cursor || cursor; await save({ cursor });
      if (!r.json.more) break;
    }
    return { pulled: got };
  }
  async function run() {
    if (busy) return busy;
    busy = (async () => {
      try {
        // A different backup code means a different server log: start its cursor at 0 and push this phone's events there too.
        const code = typeof deviceId === 'function' ? deviceId() : deviceId, st = state();
        if (st.code !== code) { if (st.code) await db.markUnsynced(); await save({ code, cursor: '0', quota: null, rejected: [] }); } const a = await push(); const b = await pull(); retryN = 0; const s = await save({ lastPushAt: now(), lastPullAt: now(), lastError: null }); return Object.assign({ ok: true, state: s }, a, b); }
      catch (e) { await save({ lastError: e.status ? 'HTTP ' + e.status : (e.name === 'AbortError' ? 'timeout' : 'offline') }); schedule(e.retryAfter); return { ok: false, error: e }; }
      finally { busy = null; }
    })();
    return busy;
  }
  return { run, push, pull, outbox, state, stop() { stopped = true; if (retryT) timer.clear(retryT); retryT = null; }, get retryN() { return retryN; }, get scheduled() { return !!retryT; } };
}
