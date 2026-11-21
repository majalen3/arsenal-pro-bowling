// First-party feedback, pure core (owner t163u, 2026-11-21). No DOM, no network: node --test tests/data/feedback.test.mjs.
// What may leave the phone, and only to our own API (store.js API_BASE): a feedback note the bowler writes and sends, a post-game
// survey answer, and, only after the bowler turns them on in Me > Privacy (both OFF by default), aggregate usage counts for a few
// key actions and scrubbed crash reports. Never: names, emails, ball lists, scores, notes, account or device ids, team data.
export const BUILD = 'v82';   // keep in step with sw.js CACHE (tests/data/feedback.test.mjs checks)
export const KEY = 'ap_fb';
export const KINDS = [['bug', 'Bug'], ['idea', 'Idea'], ['praise', 'Praise']];
export const TEXT_MAX = 1000, NOTE_MAX = 140;
export const QUEUE_MAX = 20, SHOTS_IN_QUEUE = 3, RECEIPTS_MAX = 50;
export const SURVEY_EVERY = 3;                  // at most once per 3 finished games
export const SURVEY_GAP_MS = 20 * 3600e3;       // and at most once per league night
export const USAGE_EVERY_MS = 12 * 3600e3;      // opt-in counts go up at most twice a day
export const ERRORS_PER_LOAD = 5;
// Keep in step with the API's lib/feedback.js USAGE_KEYS. Only these on-device counters (cc/ux.js) are ever sent, as deltas.
export const USAGE_KEYS = ['bag.built', 'optimize.used', 'game.logged', 'feedback.sent', 'survey.answered',
  'screen.bag', 'screen.arsenal', 'screen.lane', 'screen.results', 'screen.team', 'screen.me', 'screen.add-ball'];

export function blank() { return { v: 1, usage: false, crash: false, queue: [], sent: {}, usageAt: 0, games: 0, surveyAt: 0, surveyDue: false, receipts: [] }; }
export function parse(str) {
  let s = null; try { s = JSON.parse(str); } catch (e) {}
  const b = blank(); if (!s || typeof s !== 'object' || s.v !== 1) return b;
  b.usage = s.usage === true; b.crash = s.crash === true;
  b.queue = Array.isArray(s.queue) ? s.queue.filter(q => q && ['feedback', 'survey', 'error'].includes(q.t) && q.body && typeof q.body === 'object').slice(-QUEUE_MAX) : [];
  if (s.sent && typeof s.sent === 'object') for (const k of USAGE_KEYS) if (Number.isFinite(+s.sent[k]) && +s.sent[k] >= 0) b.sent[k] = +s.sent[k];
  for (const k of ['usageAt', 'games', 'surveyAt']) b[k] = Number.isFinite(+s[k]) && +s[k] >= 0 ? +s[k] : 0;
  b.surveyDue = s.surveyDue === true;
  b.receipts = Array.isArray(s.receipts) ? s.receipts.filter(r => typeof r === 'string' && /^[A-Za-z0-9_-]{22}$/.test(r)).slice(-RECEIPTS_MAX) : [];
  return b;
}

// ---- what gets attached automatically (no personal data)
// Route = the screen's path shape only: ids, slugs and query strings are dropped.
export function routeOf(hash) {
  const p = String(hash || '').replace(/^#/, '').split('?')[0] || '/';
  return p.replace(/^\/(ball|session|pattern)\/.+$/, '/$1/:id').replace(/[^a-z0-9\-/:]/gi, '').slice(0, 40).toLowerCase() || '/';
}
// Device class from the screen's short side and whether the app is installed. No model, OS or browser string.
export function deviceClass({ w = 0, h = 0, standalone = false } = {}) {
  const s = Math.min(w, h) || Math.max(w, h);
  const c = s && s < 600 ? 'phone' : s && s < 1000 ? 'tablet' : 'desktop';
  return standalone ? c + '-app' : c;
}

// ---- free text: drop anything that looks like an email, link or phone number before it is queued (the API does it again)
export function scrubText(s, max = TEXT_MAX) {
  if (typeof s !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  const t = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email removed]')
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[link removed]')
    .replace(/(?:\+?\d[\s().-]*){9,}\d/g, '[number removed]').replace(/[ \t]+/g, ' ').trim();
  return t.slice(0, max);
}
// ---- crash reports: keep the error's shape, drop anything that could be the bowler's data.
// Quoted strings (often user text or ball names), URLs (file names kept, query strings dropped), long numbers, emails.
export function scrubError(s, max) {
  if (typeof s !== 'string') return '';
  const t = s.replace(/(["'`])(?:(?!\1)[^\\\n]|\\.){0,400}\1/g, '\u2026')
    .replace(/\b(?:https?|file|blob|chrome-extension|moz-extension):\/\/[^\s)]*?([\w.-]+\.m?js)(?:\?[^\s):]*)?(:\d+:\d+)?/gi, '$1$2')
    .replace(/\b(?:https?|file|blob):\/\/\S+/gi, '[url]').replace(/\?[^\s):]*/g, '')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]').replace(/\d{6,}/g, '#');
  return t.slice(0, max);
}
export function errorReport(kind, err, msg, { route, device, build = BUILD } = {}) {
  const e = err && typeof err === 'object' ? err : null;
  const message = scrubError(String((e && (e.name ? e.name + ': ' : '') + (e.message || '')) || msg || (err != null ? String(err) : 'Unknown error')), 200);
  const stack = scrubError(String((e && e.stack) || ''), 1500).split('\n').map(l => l.trim()).filter(Boolean).slice(0, 12).join('\n');
  return { kind: ['error', 'rejection', 'sw'].includes(kind) ? kind : 'error', message: message || 'Unknown error', stack, build, route, device };
}
export function fingerprint(r) { let x = 0x811c9dc5; const s = r.kind + '|' + r.message + '|' + (r.stack || '').split('\n')[0]; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16); }
// Per page load: at most ERRORS_PER_LOAD reports and each distinct error once (a loop that throws every frame sends one report).
export function errorGate() {
  const seen = new Set(); let n = 0;
  return r => { const f = fingerprint(r); if (seen.has(f) || n >= ERRORS_PER_LOAD) return false; seen.add(f); n++; return true; };
}

// ---- offline queue: newest wins; screenshots are the first to go when the queue is full
export function enqueue(st, item) {
  st.queue.push(Object.assign({ at: Date.now() }, item));
  const shots = st.queue.filter(q => q.body && q.body.screenshot);
  for (const q of shots.slice(0, Math.max(0, shots.length - SHOTS_IN_QUEUE))) delete q.body.screenshot;
  while (st.queue.length > QUEUE_MAX) { const i = st.queue.findIndex(q => q.t === 'error'); st.queue.splice(i >= 0 ? i : 0, 1); }
  return st;
}
export function feedbackBody({ type, text, screenshot, route, device }) {
  return { type: KINDS.some(([k]) => k === type) ? type : 'idea', text: scrubText(text || '', TEXT_MAX), screenshot: screenshot || undefined, build: BUILD, route, device };
}
export function surveyBody({ useful, note, device }) {
  const u = Math.round(+useful); return u >= 1 && u <= 5 ? { useful: u, note: scrubText(note || '', NOTE_MAX), build: BUILD, device } : null;
}

// ---- post-game survey: only after finished games, at most once per SURVEY_EVERY games and once per night
export function gamesFinished(st, n = 1, now = Date.now()) {
  if (!(n > 0)) return st;
  st.games += Math.min(n, 20);
  if (st.games >= SURVEY_EVERY && now - st.surveyAt >= SURVEY_GAP_MS) st.surveyDue = true;
  return st;
}
// Asked (answered or dismissed): the counter starts over either way, so a dismiss is never followed by a re-ask the same night.
export function surveyAsked(st, now = Date.now()) { st.games = 0; st.surveyAt = now; st.surveyDue = false; return st; }

// ---- opt-in usage counts: deltas of the allow-listed on-device counters since the last upload
export function usageDeltas(counters, sent) {
  const out = {};
  for (const k of USAGE_KEYS) { const n = (counters[k] && +counters[k].n) || 0, d = n - (+sent[k] || 0); if (d > 0) out[k] = Math.min(d, 1000); }
  return out;
}
// Turning counts on starts from now: nothing counted before the opt-in is ever sent.
export function baseline(counters) { const out = {}; for (const k of USAGE_KEYS) out[k] = (counters[k] && +counters[k].n) || 0; return out; }
export function usageReady(st, now = Date.now()) { return st.usage && now - st.usageAt >= USAGE_EVERY_MS; }
