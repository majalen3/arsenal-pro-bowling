// Optional account (de-brand + accounts, 2026-10-31; DECISIONS 2026-10-31). DOM-free core: talks to the API's
// /api/auth/* and /api/account* routes and keeps the session in one storage key. The app works fully without it.
// The session is an opaque bearer token (the API stores only its HMAC). It is sent only in the Authorization header,
// never in a URL, and only to API_BASE. A 401 from any account route ends the session on this phone.
export const KEY = 'ap_account';
export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
export function passwordProblem(p) { p = String(p || ''); return p.length < 8 ? 'Use at least 8 characters.' : p.length > 200 ? 'Use at most 200 characters.' : null; }
export function createAccount({ base, storage, fetchFn = (...a) => fetch(...a), now = () => Date.now(), onChange = () => {}, timeoutMs = 20000 } = {}) {
  const read = () => { try { const s = JSON.parse(storage.getItem(KEY) || 'null'); return s && s.token && s.user && s.user.id ? s : null; } catch (e) { return null; } };
  function session() { const s = read(); if (s && s.expiresAt && Date.parse(s.expiresAt) <= now()) { storage.removeItem(KEY); return null; } return s; }
  // pending: signed in, but this phone's data is not yet added to the account (the owner chooses first); sync ignores it.
  function save(j, pending = false) { const s = { token: j.token, expiresAt: j.expiresAt, user: { id: j.user.id, email: j.user.email }, pending: !!pending }; storage.setItem(KEY, JSON.stringify(s)); onChange(s); return s; }
  function end() { const had = !!read(); storage.removeItem(KEY); if (had) onChange(null); }
  async function call(path, { method = 'GET', body, auth = false } = {}) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
    const headers = {}; if (body) headers['Content-Type'] = 'application/json';
    if (auth) { const s = session(); if (!s) return { status: 401, json: { error: 'Not signed in.' } }; headers.Authorization = 'Bearer ' + s.token; }
    try {
      const r = await fetchFn(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: ctl && ctl.signal, credentials: 'omit', cache: 'no-store' });
      let j = null; try { j = await r.json(); } catch (e) {}
      if (auth && r.status === 401) end();
      return { status: r.status, json: j || {}, retryAfter: +(r.headers && r.headers.get && r.headers.get('Retry-After')) || 0 };
    } catch (e) { return { status: 0, json: { error: typeof navigator !== 'undefined' && navigator.onLine === false ? 'You are offline. Try again when you have a connection.' : 'Could not reach the server. Try again in a minute.' } }; }
    finally { if (t) clearTimeout(t); }
  }
  const msg = (r, fallback) => (r.json && r.json.error) || (r.status === 429 ? 'Too many tries. Wait a few minutes.' : fallback);
  return {
    session, end,
    active() { const s = session(); return s && !s.pending ? s : null; },
    confirm() { const s = session(); if (s && s.pending) { s.pending = false; storage.setItem(KEY, JSON.stringify(s)); onChange(s); } return s; },
    async signup(email, password, { pending = false } = {}) { const r = await call('/api/auth/signup', { method: 'POST', body: { email, password } }); if (r.status !== 201) return { ok: false, status: r.status, error: msg(r, 'Could not create the account.') }; return { ok: true, session: save(r.json, pending), recoveryKey: r.json.recoveryKey }; },
    async login(email, password, { pending = false } = {}) { const r = await call('/api/auth/login', { method: 'POST', body: { email, password } }); if (r.status !== 200) return { ok: false, status: r.status, error: msg(r, 'Email or password is wrong.') }; return { ok: true, session: save(r.json, pending) }; },
    async recover(email, recoveryKey, newPassword, { pending = false } = {}) { const r = await call('/api/auth/recover', { method: 'POST', body: { email, recoveryKey, newPassword } }); if (r.status !== 200) return { ok: false, status: r.status, error: msg(r, 'That email and recovery key do not match.') }; return { ok: true, session: save(r.json, pending), recoveryKey: r.json.recoveryKey }; },
    async logout(all = false) { const r = session() ? await call('/api/auth/logout', { method: 'POST', body: { all: !!all }, auth: true }) : { status: 200 }; end(); return { ok: true, server: r.status === 200 }; },
    // Generic authed call for feature clients (js/data/team.js). A 401 ends the session, as everywhere else.
    request(path, o = {}) { return call(path, { ...o, auth: true }); },
    msg,
    async info() { const r = await call('/api/account', { auth: true }); return r.status === 200 ? { ok: true, ...r.json } : { ok: false, status: r.status, error: msg(r, 'Could not load the account.') }; },
    async exportAll() { const r = await call('/api/account/export', { auth: true }); return r.status === 200 ? { ok: true, data: r.json } : { ok: false, status: r.status, error: msg(r, 'Could not export.') }; },
    async remove(password) { const r = await call('/api/account', { method: 'DELETE', body: { password }, auth: true }); if (r.status !== 200) return { ok: false, status: r.status, error: msg(r, 'Could not delete the account.') }; end(); return { ok: true }; },
  };
}
