// In-memory stand-in for arsenal-pro-api's /api/events (same contract as server.js: idempotent per (device,id),
// cursor paging by server seq, 20 kB body cap → 413, invalid → 400, per-device quota → 429 without Retry-After).
// Accounts (2026-10-31): /api/auth/{signup,login,logout}, /api/account[/events|/export]; bearer tokens; account events live
// under 'u:<id>' (the same isolation as the real server), unknown or revoked token → 401.
export function mockApi({ quota = 5000, maxBody = 20480 } = {}) {
  const rows = []; let seq = 0; const calls = []; const faults = []; const users = {}, tokens = {}; let uid = 0, tk = 0;
  const res = (status, json, headers = {}) => ({ status, json: async () => json, headers: { get: k => headers[k] ?? headers[k.toLowerCase()] ?? null } });
  async function fetchFn(url, opts = {}) {
    const u = new URL(url), hd = opts.headers || {}, m = opts.method || 'GET'; let dev = hd['X-Device-Id']; calls.push({ m, path: u.pathname, size: opts.body ? opts.body.length : 0, auth: hd.Authorization || null, dev: dev || null });
    const f = faults.shift(); if (f === 'offline') throw new TypeError('Failed to fetch'); if (f && f.status) return res(f.status, f.json || {}, f.headers);
    const body = opts.body ? JSON.parse(opts.body) : {}, who = () => tokens[String(hd.Authorization || '').replace(/^Bearer /, '')];
    const issue = id => { const t = 'tok' + (++tk); tokens[t] = id; return { token: t, expiresAt: new Date(Date.now() + 30 * 864e5).toISOString(), user: { id, email: users[id].email } }; };
    if (u.pathname === '/api/auth/signup') { if (Object.values(users).some(x => x.email === body.email)) return res(409, { error: 'An account with that email already exists. Sign in instead.' }); const id = 'user' + (++uid); users[id] = { email: body.email, password: body.password }; return res(201, Object.assign(issue(id), { recoveryKey: 'RK-' + id })); }
    if (u.pathname === '/api/auth/login') { const id = Object.keys(users).find(k => users[k].email === body.email && users[k].password === body.password); return id ? res(200, issue(id)) : res(401, { error: 'Email or password is wrong.' }); }
    if (u.pathname.startsWith('/api/auth/logout') || u.pathname.startsWith('/api/account')) { const id = who(); if (!id) return res(401, { error: 'Not signed in.' });
      if (u.pathname === '/api/auth/logout') { for (const t in tokens) if (tokens[t] === id && (body.all || 'Bearer ' + t === hd.Authorization)) delete tokens[t]; return res(200, { ok: true }); }
      if (u.pathname === '/api/account' && m === 'GET') return res(200, { user: { id, email: users[id].email }, events: rows.filter(r => r.dev === 'u:' + id).length });
      if (u.pathname === '/api/account' && m === 'DELETE') { if (body.password !== users[id].password) return res(403, { error: 'Password is wrong.' }); for (let i = rows.length - 1; i >= 0; i--) if (rows[i].dev === 'u:' + id) rows.splice(i, 1); for (const t in tokens) if (tokens[t] === id) delete tokens[t]; delete users[id]; return res(200, { deleted: { account: 1 } }); }
      if (u.pathname === '/api/account/export') return res(200, { user: { id, email: users[id].email }, events: rows.filter(r => r.dev === 'u:' + id).map(r => r.e) });
      if (u.pathname !== '/api/account/events') return res(404, { error: 'not found' }); dev = 'u:' + id; }
    else if (u.pathname !== '/api/events') return res(404, { error: 'not found' });
    if (m === 'POST') {
      if (new TextEncoder().encode(opts.body).length > maxBody) return res(413, { error: 'body too large' });
      const evs = JSON.parse(opts.body).events;
      if (!Array.isArray(evs) || !evs.length || evs.some(e => !e || typeof e.id !== 'string' || !/^[a-zA-Z]+\.[a-zA-Z]+$/.test(e.type) || !Number.isSafeInteger(e.ts))) return res(400, { error: 'invalid' });
      const mine = rows.filter(r => r.dev === dev), known = new Set(mine.map(r => r.e.id)); const fresh = [...new Set(evs.map(e => e.id))].filter(id => !known.has(id));
      if (fresh.length && mine.length + fresh.length > quota) return res(429, { error: `event quota reached: ${quota}`, quota, stored: mine.length });
      let accepted = 0; for (const e of evs) if (!known.has(e.id)) { known.add(e.id); rows.push({ dev, seq: ++seq, e: JSON.parse(JSON.stringify(e)) }); accepted++; }
      const r = res(200, { accepted, duplicates: evs.length - accepted, cursor: String(seq), stored: mine.length + accepted, quota });
      if (f === 'lose-response') throw new TypeError('connection reset after commit');
      return r;
    }
    const after = +(u.searchParams.get('after') || 0), limit = +(u.searchParams.get('limit') || 500);
    const page = rows.filter(r => r.dev === dev && r.seq > after).slice(0, limit + 1); const more = page.length > limit; if (more) page.pop();
    return res(200, { events: page.map(r => Object.assign({}, r.e, { serverSeq: String(r.seq) })), cursor: String(page.length ? page[page.length - 1].seq : after), more });
  }
  return { fetchFn, rows, calls, faults, users, tokens, count: dev => rows.filter(r => r.dev === dev).length };
}
