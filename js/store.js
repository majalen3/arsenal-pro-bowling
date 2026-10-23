// Persistence: Render API + localStorage mirror. Ported from v1 app.js: same ap_* keys, same record
// shapes, same endpoints, same offline queue / retry schedule. DOM writes replaced by events.
import { balls } from './data.js';
import { S, RANGES, FINISHES, PATTERNS } from './engine.js';
export const API_BASE = new URLSearchParams(location.search).get('api') || 'https://arsenal-pro-api.onrender.com';
const API_TIMEOUT = 8000, API_WRITE_TIMEOUT = 25000; // writes wait out a free-tier cold start; UI never blocks on them
export const LS = { lines:'ap_lines', surface:'ap_surface', notes:'ap_notes', dels:'ap_dels', shots:'ap_shots', profile:'ap_profile', prefs:'ap_prefs' };
const mem = {}; export let memMode = false;   // fallback when localStorage is blocked/full (private mode, quota)
export const rawGet = k => { if (k in mem) return mem[k]; try { return localStorage.getItem(k); } catch(e) { memMode = true; return null; } };
export const rawSet = (k, str) => { try { localStorage.setItem(k, str); delete mem[k]; } catch(e) { memMode = true; mem[k] = str; } };
export const lsGet = k => { try { const v = JSON.parse(rawGet(k)); return Array.isArray(v) ? v.filter(x => x && typeof x === 'object') : []; } catch(e) { return []; } };
const lsGetIds = k => { try { const v = JSON.parse(rawGet(k)); return Array.isArray(v) ? v.filter(Number.isInteger) : []; } catch(e) { return []; } };
export const lsSet = (k,v) => rawSet(k, JSON.stringify(v));
export const objGet = k => { try { const v = JSON.parse(rawGet(k)); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch(e) { return null; } };

// --- tiny event bus
const subs = {};
export const on = (ev, fn) => { (subs[ev] = subs[ev] || []).push(fn); return () => subs[ev] = subs[ev].filter(f => f !== fn); };
export const emit = (ev, d) => (subs[ev] || []).forEach(f => { try { f(d); } catch(e) { console.error(e); } });
export const status = { text: '', cls: '' };
function setStatus(text, cls) { status.text = text; status.cls = cls || ''; emit('status', status); }

// --- app state (ball + controls), persisted to ap_state exactly like v1 (string values)
export const app = { ball: balls[0] };
let stateT = null;
export function saveState() { clearTimeout(stateT); stateT = setTimeout(() => { rawSet('ap_state', JSON.stringify({ ball:app.ball.id, speed:String(S.speed), rev:String(S.rev), release:String(S.release), aim:String(S.aim), oil:String(S.oil), finish:S.finish, pattern:S.pattern })); }, 300); }
export function restoreState() {
  let st = null; try { st = JSON.parse(rawGet('ap_state')); } catch(e) {}
  if (!st || typeof st !== 'object') return false;
  const b = balls.find(x => x.id === st.ball); if (b) app.ball = b;
  ['speed','rev','release','aim','oil'].forEach(id => { const v = +st[id]; if (Number.isFinite(v) && v >= RANGES[id][0] && v <= RANGES[id][1]) S[id] = v; });
  if (typeof st.finish === 'string' && FINISHES.includes(st.finish)) S.finish = st.finish;
  if (typeof st.pattern === 'string' && PATTERNS.includes(st.pattern)) S.pattern = st.pattern;
  return true;
}

let _dev = null;
export function deviceId() {
  if (_dev) return _dev;
  _dev = rawGet('ap_device');
  if (!_dev || !/^[A-Za-z0-9_-]{8,64}$/.test(_dev)) {
    const b = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
    _dev = 'd-' + b; rawSet('ap_device', _dev);
  }
  return _dev;
}
async function api(path, opts={}) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), opts.method && opts.method !== 'GET' ? API_WRITE_TIMEOUT : API_TIMEOUT);
  try {
    const r = await fetch(API_BASE + path, { ...opts, signal:ctl.signal, headers:Object.assign({'X-Device-Id':deviceId()}, opts.body ? {'Content-Type':'application/json'} : {}) });
    if (!r.ok) { const er = new Error('HTTP ' + r.status); er.status = r.status; er.retryAfter = +r.headers.get('Retry-After') || 0; throw er; }
    return await r.json();
  } finally { clearTimeout(t); }
}
function failStatus(e) { return e && e.status === 429 ? 'Server busy. Saved on this phone, will retry.' : e && e.name === 'AbortError' ? 'Server waking up. Saved on this phone, will retry.' : 'Offline (saved on this phone)'; }
let retryN = 0, retryT = null;
function retryLater(e) { if (retryT || retryN >= 4) return; const d = Math.max([15000,45000,120000,300000][retryN++], e && e.retryAfter ? e.retryAfter*1000+500 : 0); retryT = setTimeout(async () => { retryT = null; await syncLines(); await syncAlley(); }, d); }
export const esc = t => String(t==null?'':t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// --- lines
export function currentLine(name, note) { return { ballId:app.ball.id, name, release:+S.release, aim:+S.aim, speed:+S.speed, rev:+S.rev, oil:+S.oil, finish:S.finish, pattern:S.pattern, note:(note||'').trim() }; }
export const allLines = () => lsGet(LS.lines).sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
export const linesForBall = id => allLines().filter(l => l.ballId === (id || app.ball.id));
export function applyLine(l) {
  const b = balls.find(x => x.id === l.ballId); if (b) app.ball = b;
  ['release','aim','speed','rev','oil'].forEach(k => { const v = +l[k]; if (Number.isFinite(v) && v >= RANGES[k][0] && v <= RANGES[k][1]) S[k] = v; });
  if (FINISHES.includes(l.finish)) S.finish = l.finish; if (PATTERNS.includes(l.pattern)) S.pattern = l.pattern;
  saveState(); emit('state');
}
async function pushLine(l) {
  const body = { ballId:l.ballId, name:l.name, release:l.release, aim:l.aim, speed:l.speed, rev:l.rev, oil:l.oil, finish:l.finish, pattern:l.pattern, note:l.note||'' };
  const r = await api('/api/lines', { method:'POST', body:JSON.stringify(body) });
  const all = lsGet(LS.lines); const m = all.find(x => x.ballId === l.ballId && x.name === l.name);
  if (m) { m.synced = true; m.id = r.id; lsSet(LS.lines, all); }
}
export async function saveLine(name, note) {
  name = String(name || '').trim(); if (!name) return null;
  const l = { ...currentLine(name, note), updatedAt:Date.now(), synced:false };
  const all = lsGet(LS.lines).filter(x => !(x.ballId === l.ballId && x.name === l.name)); all.push(l); lsSet(LS.lines, all);
  emit('lines'); setStatus('Saving\u2026');
  pushLine(l).then(() => { setStatus(memMode ? 'Saved (browser storage blocked: kept until this tab closes)' : 'Synced', 'ok'); retryN = 0; emit('lines'); })
    .catch(e => { setStatus(failStatus(e), 'off'); retryLater(e); });
  return l;
}
export async function renameLine(l, name, note) {
  name = String(name || '').trim(); if (!name) return;
  const old = { ...l }; const nl = { ...l, name, note:(note||'').trim(), updatedAt:Date.now(), synced:false }; delete nl.id;
  const all = lsGet(LS.lines).filter(x => !(x.ballId === l.ballId && x.name === l.name) && !(x.ballId === nl.ballId && x.name === nl.name)); all.push(nl); lsSet(LS.lines, all);
  emit('lines');
  if (old.name !== name && old.id) queueDelete(old.id);
  pushLine(nl).then(() => { setStatus('Synced', 'ok'); emit('lines'); }).catch(e => { setStatus(failStatus(e), 'off'); retryLater(e); });
}
function queueDelete(id) { api('/api/lines/' + id, {method:'DELETE'}).catch(e => { if (!(e && e.status === 404)) { const q = lsGetIds(LS.dels); q.push(id); lsSet(LS.dels, q.slice(-100)); retryLater(); } }); }
export async function deleteLine(l) {
  lsSet(LS.lines, lsGet(LS.lines).filter(x => !(x.ballId === l.ballId && x.name === l.name))); emit('lines');
  if (l.id) { try { await api('/api/lines/' + l.id, {method:'DELETE'}); setStatus('Deleted', 'ok'); } catch(e) { if (!(e && e.status === 404)) { const q = lsGetIds(LS.dels); q.push(l.id); lsSet(LS.dels, q.slice(-100)); retryLater(); } setStatus('Deleted here; will remove from server when online', 'off'); } }
}
export function restoreLine(l) { const all = lsGet(LS.lines).filter(x => !(x.ballId === l.ballId && x.name === l.name)); const r = { ...l, synced:false, updatedAt:Date.now() }; delete r.id; all.push(r); lsSet(LS.lines, all); emit('lines'); pushLine(r).catch(e => retryLater(e)); }
async function flushDels() { const q = lsGetIds(LS.dels); if (!q.length) return; const keep = []; for (const id of q) { try { await api('/api/lines/' + id, {method:'DELETE'}); } catch(e) { if (!(e && e.status === 404)) keep.push(id); } } lsSet(LS.dels, keep); }
export async function syncLines() {
  const ballId = app.ball.id;
  try {
    await flushDels();
    const server = await api('/api/lines?ballId=' + encodeURIComponent(ballId));
    const all = lsGet(LS.lines);
    server.forEach(s => {
      const t = Date.parse(s.updatedAt) || 0; const i = all.findIndex(x => x.ballId === s.ballId && x.name === s.name);
      const rec = { ballId:s.ballId, name:s.name, release:s.release, aim:s.aim, speed:s.speed, rev:s.rev, oil:s.oil, finish:s.finish, pattern:s.pattern, note:s.note||'', updatedAt:t, synced:true, id:s.id };
      if (i < 0) all.push(rec); else if (all[i].synced || t >= (all[i].updatedAt||0)) all[i] = rec;
    });
    lsSet(LS.lines, all); emit('lines');
    for (const l of all.filter(x => x.ballId === ballId && !x.synced)) { try { await pushLine(l); } catch(e) { break; } }
    emit('lines'); setStatus('Synced', 'ok'); retryN = 0;
  } catch(e) { setStatus(failStatus(e), 'off'); retryLater(e); }
}
let syncTimer = null;
export function scheduleSync() { clearTimeout(syncTimer); syncTimer = setTimeout(() => { syncLines(); syncAlley(); }, 350); }

// --- surface log + pattern notes (v1 semantics)
export const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
export async function logFinish(ballId, finish) {
  const e = { ballId, date:today(), finish, synced:false };
  const all = lsGet(LS.surface); all.push(e); lsSet(LS.surface, all.slice(-200)); emit('alley'); setStatus('Saving\u2026');
  try { await api('/api/surface-log', {method:'POST', body:JSON.stringify({ballId:e.ballId, date:e.date, finish:e.finish})}); lsSet(LS.surface, lsGet(LS.surface).map(x => (x.ballId===e.ballId && x.date===e.date && x.finish===e.finish && x.synced===false) ? Object.assign(x, {synced:true}) : x)); setStatus('Synced', 'ok'); emit('alley'); } catch(err) { setStatus(failStatus(err), 'off'); retryLater(err); }
}
export async function saveNote(lane, oil, adjustment) {
  const e = { lane:String(lane).trim(), oil:String(oil).trim(), adjustment:String(adjustment).trim(), synced:false };
  if (!e.lane || !e.oil || !e.adjustment) return false;
  const all = lsGet(LS.notes); all.push(e); lsSet(LS.notes, all.slice(-100)); emit('alley'); setStatus('Saving\u2026');
  api('/api/pattern-notes', {method:'POST', body:JSON.stringify({lane:e.lane, oil:e.oil, adjustment:e.adjustment})}).then(() => { lsSet(LS.notes, lsGet(LS.notes).map(x => (x.lane===e.lane && x.oil===e.oil && x.adjustment===e.adjustment && x.synced===false) ? Object.assign(x, {synced:true}) : x)); setStatus('Synced', 'ok'); emit('alley'); }).catch(err => { setStatus(failStatus(err), 'off'); retryLater(err); });
  return true;
}
async function pushUnsyncedAlley() {
  for (const x of lsGet(LS.surface).filter(x => x.synced === false)) { await api('/api/surface-log', {method:'POST', body:JSON.stringify({ballId:x.ballId, date:x.date, finish:x.finish})}); const a = lsGet(LS.surface); const m = a.find(y => y.synced===false && y.ballId===x.ballId && y.date===x.date && y.finish===x.finish); if (m) { m.synced = true; lsSet(LS.surface, a); } }
  for (const x of lsGet(LS.notes).filter(x => x.synced === false)) { await api('/api/pattern-notes', {method:'POST', body:JSON.stringify({lane:x.lane, oil:x.oil, adjustment:x.adjustment})}); const a = lsGet(LS.notes); const m = a.find(y => y.synced===false && y.lane===x.lane && y.oil===x.oil && y.adjustment===x.adjustment); if (m) { m.synced = true; lsSet(LS.notes, a); } }
}
export async function syncAlley() {
  try {
    await pushUnsyncedAlley();
    const sv = await api('/api/surface-log?ballId=' + encodeURIComponent(app.ball.id));
    const all = lsGet(LS.surface);
    sv.forEach(s => { if (!all.some(x => x.ballId===s.ballId && x.date===s.date && x.finish===s.finish)) all.push({ballId:s.ballId, date:s.date, finish:s.finish, synced:true}); });
    all.sort((a,b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0); lsSet(LS.surface, all.slice(-200));
    const nv = await api('/api/pattern-notes'); const notes = lsGet(LS.notes);
    nv.slice().reverse().forEach(n => { if (!notes.some(x => x.lane===n.lane && x.oil===n.oil && x.adjustment===n.adjustment)) notes.unshift({lane:n.lane, oil:n.oil, adjustment:n.adjustment, synced:true}); });
    lsSet(LS.notes, notes.slice(-100)); emit('alley');
  } catch(e) { retryLater(); }
}

// --- shots (new, local-only): one entry per miss-button tap
export function logShot(miss, before, after) { const a = lsGet(LS.shots); a.push({ t:Date.now(), ballId:app.ball.id, pattern:S.pattern, miss, before, after }); lsSet(LS.shots, a.slice(-300)); emit('shots'); }

// --- backup / device code (v1 semantics)
export function backupBlob() { const data = { app:'arsenal-pro', code:deviceId(), exportedAt:new Date().toISOString(), lines:lsGet(LS.lines), surfaceLog:lsGet(LS.surface), patternNotes:lsGet(LS.notes) }; return new Blob([JSON.stringify(data, null, 1)], {type:'application/json'}); }
export function useCode(v) {
  v = String(v || '').trim(); if (!/^[A-Za-z0-9_-]{8,64}$/.test(v)) return false;
  rawSet('ap_device', v); _dev = v;
  lsSet(LS.lines, lsGet(LS.lines).map(x => Object.assign(x, {synced:false}))); setStatus('Code set. Syncing\u2026'); syncLines(); syncAlley(); return true;
}
export function startSync() {
  syncLines(); syncAlley();
  fetch(API_BASE + '/api/health', {cache:'no-store'}).catch(() => {});
  window.addEventListener('online', () => { syncLines(); syncAlley(); });
}
export const profile = () => objGet(LS.profile);
export const setProfile = p => { lsSet(LS.profile, p); emit('profile'); };
export const prefs = () => objGet(LS.prefs) || {};
export const setPrefs = p => { lsSet(LS.prefs, Object.assign(prefs(), p)); emit('prefs'); };
