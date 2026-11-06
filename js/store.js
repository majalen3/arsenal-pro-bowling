// LocalStorage hot mirrors plus the consent-gated event log in hub.js. Legacy private HTTP dual-writes are disabled.
import { balls } from './data.js';
import { ballFor, ballKey } from './cc/cats.js';
import { S, RANGES, FINISHES, PATTERNS } from './engine.js';
import { BOARDS } from './cc/geom.js';
const eyesOf = v => { const x = v === '' || v == null ? NaN : +v; return Number.isFinite(x) && x >= BOARDS[0] && x <= BOARDS[1] ? Math.round(x * 2) / 2 : null; };
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

// --- event-log sink (js/hub.js wires this to the v1 event log; ap_* keys stay as the hot mirror + API compat)
let sink = null; const pending = [];
export const pendingWrites = () => pending.length;
export function setSink(f, { dropPending = 0 } = {}) {
  sink = f;
  while (pending.length) { const a = pending.shift(); if (dropPending > 0) { dropPending--; a.resolve(); } else Promise.resolve().then(() => f(a.type, a.entityId, a.data)).then(a.resolve, a.reject); }
}
export function record(type, entityId, data) {
  const p = sink ? Promise.resolve().then(() => sink(type, entityId, data)) : new Promise((resolve, reject) => pending.push({ type, entityId, data, resolve, reject }));
  p.catch(() => {}); return p;
}
const lineData = l => ({ ballId:l.ballId, ownedId:l.ownedId || null, catalogId:l.catalogId || null, eyes:l.eyes, name:l.name, release:l.release, aim:l.aim, speed:l.speed, rev:l.rev, oil:l.oil, finish:l.finish, pattern:l.pattern, note:l.note||'' });
// --- tiny event bus
const subs = {};
export const on = (ev, fn) => { (subs[ev] = subs[ev] || []).push(fn); return () => subs[ev] = subs[ev].filter(f => f !== fn); };
export const emit = (ev, d) => (subs[ev] || []).forEach(f => { try { f(d); } catch(e) { console.error(e); } });
export const status = { text: '', cls: '' };
function setStatus(text, cls) { status.text = text; status.cls = cls || ''; emit('status', status); }

// --- app state (ball + controls), persisted to ap_state exactly like v1 (string values)
export const app = { ball: balls[0], lastLine: null, eyes: null };   // eyes: the bowler's aim at the arrows (js/ctl.js)   // lastLine: {ballId,name} most recently saved/loaded (for 'Back to saved line')
let stateT = null, stateRevision = 0;
export function hydrateOwnedState() { if (!stateRevision) { restoreState(); emit('state'); } }
function flushState() { rawSet('ap_state', JSON.stringify({ ball:ballKey(app.ball), catalogId:app.ball.id, speed:String(S.speed), rev:String(S.rev), release:String(S.release), aim:String(S.aim), eyes:app.eyes == null ? '' : String(app.eyes), oil:String(S.oil), finish:S.finish, pattern:S.pattern })); stateT = null; }
export function saveState() { stateRevision++; clearTimeout(stateT); stateT = setTimeout(flushState, 300); }
// A reload/navigation must not discard the last debounced physical-copy selection or aim.
if (typeof window !== 'undefined') window.addEventListener('pagehide', () => { if (stateT) { clearTimeout(stateT); flushState(); } });
export function restoreState() {
  let st = null; try { st = JSON.parse(rawGet('ap_state')); } catch(e) {}
  if (!st || typeof st !== 'object') {   // clutter audit #4: no saved lane tune yet, so start from the bowler's own profile (one source)
    const pr = objGet(LS.profile) || {};
    ['speed','rev'].forEach(id => { const v = +pr[id], [lo, hi] = RANGES[id]; if (pr[id] !== '' && pr[id] != null && Number.isFinite(v) && v >= lo && v <= hi) S[id] = v; });
    return false;
  }
  const b = ballFor(st.ball) || ballFor(st.catalogId); if (b) app.ball = b;
  ['speed','rev','release','aim','oil'].forEach(id => { const v = +st[id], [lo, hi] = id === 'release' ? BOARDS : RANGES[id]; if (Number.isFinite(v) && v >= lo && v <= hi) S[id] = v; });
  app.eyes = eyesOf(st.eyes);
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
function localStatus() { setStatus(memMode ? 'Only until this tab closes (browser storage unavailable)' : 'Saved on this phone', 'ok'); }
export const esc = t => String(t==null?'':t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// --- lines
export function currentLine(name, note) { return { ballId:ballKey(app.ball), ownedId:app.ball.ownedId || null, catalogId:app.ball.id, name, release:+S.release, aim:+S.aim, eyes:app.eyes, speed:+S.speed, rev:+S.rev, oil:+S.oil, finish:S.finish, pattern:S.pattern, note:(note||'').trim() }; }
export const allLines = () => lsGet(LS.lines).sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
export const linesForBall = id => allLines().filter(l => l.ballId === (id || ballKey(app.ball)));
export function applyLine(l) {
  const b = ballFor(l.ownedId || l.ballId) || ballFor(l.catalogId); if (b) app.ball = b;
  ['release','aim','speed','rev','oil'].forEach(k => { const v = +l[k], [lo, hi] = k === 'release' ? BOARDS : RANGES[k]; if (Number.isFinite(v) && v >= lo && v <= hi) S[k] = v; });
  app.eyes = eyesOf(l.eyes);
  if (FINISHES.includes(l.finish)) S.finish = l.finish; if (PATTERNS.includes(l.pattern)) S.pattern = l.pattern;
  app.lastLine = { ballId:l.ballId, name:l.name };
  saveState(); emit('state');
}
export async function saveLine(name, note) {
  name = String(name || '').trim(); if (!name) return null;
  const l = { ...currentLine(name, note), updatedAt:Date.now(), synced:false };
  const all = lsGet(LS.lines).filter(x => !(x.ballId === l.ballId && x.name === l.name)); all.push(l); lsSet(LS.lines, all);
  await record('line.created', l.ballId + '|' + l.name, lineData(l));
  app.lastLine = { ballId:l.ballId, name:l.name }; emit('lines'); localStatus(); return l;
}
export async function renameLine(l, name, note) {
  name = String(name || '').trim(); if (!name) return;
  const nl = { ...l, name, note:(note||'').trim(), updatedAt:Date.now(), synced:false }; delete nl.id;
  const all = lsGet(LS.lines).filter(x => !(x.ballId === l.ballId && x.name === l.name) && !(x.ballId === nl.ballId && x.name === nl.name)); all.push(nl); lsSet(LS.lines, all);
  if (l.name !== name) await record('line.deleted', l.ballId + '|' + l.name, {});
  await record('line.created', nl.ballId + '|' + nl.name, lineData(nl)); emit('lines'); localStatus();
}
export async function deleteLine(l) {
  lsSet(LS.lines, lsGet(LS.lines).filter(x => !(x.ballId === l.ballId && x.name === l.name)));
  await record('line.deleted', l.ballId + '|' + l.name, {}); emit('lines'); localStatus();
}
export async function restoreLine(l) {
  const all = lsGet(LS.lines).filter(x => !(x.ballId === l.ballId && x.name === l.name)), r = { ...l, synced:false, updatedAt:Date.now() }; delete r.id; all.push(r); lsSet(LS.lines, all);
  await record('line.created', r.ballId + '|' + r.name, lineData(r)); emit('lines'); localStatus();
}
// Private writes use only the consent-gated v2 outbox. Never dual-write to the legacy code stream.
export async function syncLines() { localStatus(); emit('lines'); }
let syncTimer = null;
export function scheduleSync() { clearTimeout(syncTimer); syncTimer = setTimeout(() => emit('sync-request'), 350); }
export const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); };
export async function logFinish(ballId, finish) {
  const e = { ballId, date:today(), finish, synced:false }, all = lsGet(LS.surface); all.push(e); lsSet(LS.surface, all);
  await record('ball.surfaceLogged', ballId, { ballId, date:e.date, finish, type:'surfaceChange' }); emit('alley'); localStatus();
}
export async function saveNote(lane, oil, adjustment) {
  const e = { lane:String(lane).trim(), oil:String(oil).trim(), adjustment:String(adjustment).trim(), synced:false };
  if (!e.lane || !e.oil || !e.adjustment) return false;
  const all = lsGet(LS.notes); all.push(e); lsSet(LS.notes, all);
  await record('patternNote.created', null, { lane:e.lane, oil:e.oil, adjustment:e.adjustment, date:today() }); emit('alley'); localStatus(); return true;
}
export async function syncAlley() { localStatus(); }

// --- shots (new, local-only): one entry per miss-button tap
export function logShot(miss, before, after) { const a = lsGet(LS.shots), x = { t:Date.now(), ballId:ballKey(app.ball), catalogId:app.ball.id, pattern:S.pattern, miss, before, after }; a.push(x); lsSet(LS.shots, a); record('shot.logged', null, { sessionId:null, ballId:x.ballId, pattern:x.pattern, miss, before, after }); emit('shots'); }

// --- backup / device code (v1 semantics)
export function backupBlob() { const data = { app:'arsenal-pro', code:deviceId(), exportedAt:new Date().toISOString(), lines:lsGet(LS.lines), surfaceLog:lsGet(LS.surface), patternNotes:lsGet(LS.notes) }; return new Blob([JSON.stringify(data, null, 1)], {type:'application/json'}); }
export function useCode(v) {
  v = String(v || '').trim(); if (!/^[A-Za-z0-9_-]{8,64}$/.test(v)) return false;
  const guard = objGet('ap_sync_guard'); if (guard?.account || guard?.blocked) return false;
  rawSet('ap_device', v); _dev = v; rawSet('ap_backup_sync', 'true');
  lsSet(LS.lines, lsGet(LS.lines).map(x => Object.assign(x, {synced:false}))); setStatus('Backup-code sync enabled. Waiting for server acknowledgement.'); emit('code', v); return true;
}
export function startSync() { localStatus(); }
export const profile = () => objGet(LS.profile);
export const setProfile = p => {
  lsSet(LS.profile, p);
  const f = {}; if (p.hand) f.hand = p.hand; if (p.style) f.style = p.style;
  // Sim2 #11: a welcome default the bowler never touched is saved with prov.ref 'default', so it is labelled 'default (not entered)', not 'you reported'.
  const pv = k => p.entered && !p.entered[k] ? { kind:'user', ref:'default' } : { kind:'user' };
  if (p.speed != null && Number.isFinite(+p.speed) && p.speed !== '') f.speed = { v:+p.speed, unit:'mph', at:'unknown', prov:pv('speed') };
  if (p.rev != null && Number.isFinite(+p.rev) && p.rev !== '') f.rev = { v:+p.rev, unit:'rpm', prov:pv('rev') };
  if (p.pap) f.pap = { v:String(p.pap), unit:'in', prov:{ kind:'user' } }; if (p.tilt) f.tilt = { v:String(p.tilt), unit:null, prov:{ kind:'user' } };
  record('bowler.edited', 'me', { fields:f });
  emit('profile');
};
export const prefs = () => objGet(LS.prefs) || {};
export const setPrefs = p => { lsSet(LS.prefs, Object.assign(prefs(), p)); emit('prefs'); };
