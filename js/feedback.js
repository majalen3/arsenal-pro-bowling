// First-party feedback runtime (owner t163u, 2026-11-21): the offline queue, sending, opt-in usage counts, opt-in crash reports and
// the post-game survey trigger. Pure rules: cc/feedback.js. Sheets: screens/feedback.js (loaded on first use).
// Nothing is sent during active scoring: the queue waits until the bowler is off the game page. Nothing is sent to anyone but our API.
import { API_BASE } from './store.js';
import * as F from './cc/feedback.js';
import * as UX from './cc/ux.js';

let st = null;
const ls = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };
function load() { if (!st) { let raw = null; try { raw = ls() && ls().getItem(F.KEY); } catch (e) {} st = F.parse(raw); } return st; }
function save() {
  const L = ls(); if (!L) return;
  try { L.setItem(F.KEY, JSON.stringify(st)); }
  catch (e) { st.queue.forEach(q => { if (q.body) delete q.body.screenshot; }); try { L.setItem(F.KEY, JSON.stringify(st)); } catch (e2) {} }   // storage full: drop images, keep words
}
export const settings = () => { const s = load(); return { usage: s.usage, crash: s.crash, queued: s.queue.length, receipts: s.receipts.length }; };
// Turning counts on takes a baseline (nothing earlier is ever sent), then counts usage.on once so the funnel has a denominator.
export function setUsage(on) { boot(); const s = load(); const was = s.usage; s.usage = !!on; if (on) { s.sent = F.baseline(UX.load().c); s.usageAt = Date.now(); } save(); if (on && !was) UX.count('usage.on'); }
export function setCrash(on) { load().crash = !!on; save(); }

export const device = () => F.deviceClass({ w: (globalThis.screen && screen.width) || innerWidth, h: (globalThis.screen && screen.height) || innerHeight,
  standalone: !!(navigator.standalone || (globalThis.matchMedia && matchMedia('(display-mode: standalone)').matches)) });
export const route = () => F.routeOf(location.hash);
// Active scoring = the game page, or a Lane/Target tool opened from it (main.js marks those with data-ingame).
export const inGame = () => location.hash.startsWith('#/bowl') || document.body.hasAttribute('data-ingame') || !!document.querySelector('#qlPins');

// ---- queue + send
const PATH = { feedback: '/api/feedback', survey: '/api/survey', error: '/api/errors' };
let flushing = false, timer = 0;
export function later(ms = 2500) { clearTimeout(timer); timer = setTimeout(() => flush(), ms); }
export async function flush() {
  const s = load();
  if (flushing || navigator.onLine === false || inGame()) return;
  flushing = true;
  try {
    while (s.queue.length) {
      const q = s.queue[0]; let r;
      try { r = await fetch(API_BASE + PATH[q.t], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(q.body), cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' }); }
      catch (e) { break; }   // offline or the server is asleep: keep it, try again later
      if (r.status === 404 || r.status === 429 || r.status >= 500) break;   // 404 = the API has not been updated yet: keep it
      s.queue.shift();       // 2xx sent; 4xx is a malformed item that will never go through, so it is dropped rather than retried forever
      if (r.ok) { try { const j = await r.json(); if (j && typeof j.receipt === 'string') s.receipts = [...s.receipts, j.receipt].slice(-F.RECEIPTS_MAX); } catch (e) {} }
      save();
    }
    if (F.usageReady(s)) await sendUsage(s);
  } finally { flushing = false; save(); }
}
async function sendUsage(s) {
  const c = UX.load().c, counts = F.usageDeltas(c, s.sent);
  if (!Object.keys(counts).length) { s.usageAt = Date.now(); return; }
  try {
    const r = await fetch(API_BASE + '/api/usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ build: F.BUILD, counts }), cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (r.ok) { let j = null; try { j = await r.json(); } catch (e) {} for (const k of F.sentKeys(counts, j)) s.sent[k] = (s.sent[k] || 0) + counts[k]; s.usageAt = Date.now(); }
    else if (r.status >= 400 && r.status < 500 && r.status !== 429 && r.status !== 404) { for (const [k, n] of Object.entries(counts)) s.sent[k] = (s.sent[k] || 0) + n; s.usageAt = Date.now(); }
  } catch (e) {}
}
// Returns 'sent' | 'queued'. The phone keeps it either way until the API says it has it.
export async function submit(t, body) {
  boot(); const s = load(); F.enqueue(s, { t, body }); save();
  if (t === 'feedback') UX.count('feedback.sent'); else if (t === 'survey') UX.count('survey.answered');
  const before = s.queue.length; await flush();
  return load().queue.length < before ? 'sent' : 'queued';
}
export async function deleteMine() {
  const s = load(); if (!s.receipts.length) return { ok: true, deleted: 0 };
  // Anything still waiting on this phone is simply dropped: it never left.
  s.queue = s.queue.filter(q => q.t === 'error'); save();
  try {
    const r = await fetch(API_BASE + '/api/feedback', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receipts: s.receipts }), cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!r.ok) return { ok: false };
    const j = await r.json(); s.receipts = []; save();
    return { ok: true, deleted: ((j.deleted && j.deleted.feedback) || 0) + ((j.deleted && j.deleted.survey) || 0) };
  } catch (e) { return { ok: false }; }
}

// ---- crash reports (main.js forwards window errors here only when the bowler turned them on)
const gate = F.errorGate();
export function reportError(kind, err, msg) {
  const s = load(); if (!s.crash) return;
  const r = F.errorReport(kind, err, msg, { route: route(), device: device() });
  if (!gate(r)) return;
  F.enqueue(s, { t: 'error', body: r }); save(); boot(); later();
}

// ---- post-game survey
let asking = false;
export function gamesFinished(n = 1) {
  const s = load(); for (let i = 0; i < Math.min(n, 20); i++) UX.count('game.logged');
  if (n > 0) UX.once('first.game');
  F.gamesFinished(s, n); save(); setTimeout(maybeSurvey, 700);
}
export function maybeSurvey() {
  const s = load();
  if (!s.surveyDue || asking || inGame() || document.body.classList.contains('has-sheet') || /^#\/(welcome|bowl)/.test(location.hash)) return;
  asking = true;
  import('./screens/feedback.js').then(m => m.openSurvey({ onDone: () => { asking = false; } })).catch(() => { asking = false; });
}
export function surveyAsked() { F.surveyAsked(load()); save(); }
export const openFeedback = () => import('./screens/feedback.js').then(m => m.openFeedback());

// ---- one-time opt-in offer (v83). 'bag': a quiet toast with a Choose button after the first bag is packed. 'survey': the small
// sheet right after a 4 or 5. Never on the game page, never over another sheet, once per phone (cc/feedback.js optInDue).
export function offerOptIn(where, { rating } = {}) {
  const s = load();
  if (!F.optInDue(s, { rating }) || inGame() || document.body.classList.contains('has-sheet') || /^#\/(welcome|bowl)/.test(location.hash)) return false;
  F.optInAsked(s); save();
  import('./screens/feedback.js').then(m => where === 'survey' ? m.openOptIn() : m.optInToast()).catch(() => {});
  return true;
}
export const openOptIn = () => import('./screens/feedback.js').then(m => m.openOptIn());

// ---- boot (main.js, after the first screen paints): send anything waiting, and again whenever the phone comes back online
let booted = false;
export function boot() {
  if (booted) return; booted = true;
  addEventListener('online', () => later(1500));
  addEventListener('hashchange', () => { const s = load(); if (s.queue.length || F.usageReady(s)) later(3000); });
  const s = load(); if (s.queue.length || F.usageReady(s)) later(4000);
}
