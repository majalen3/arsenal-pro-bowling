// In-memory stand-in for arsenal-pro-api's /api/events (same contract as server.js: idempotent per (device,id),
// cursor paging by server seq, 20 kB body cap → 413, invalid → 400, per-device quota → 429 without Retry-After).
export function mockApi({ quota = 5000, maxBody = 20480 } = {}) {
  const rows = []; let seq = 0; const calls = []; const faults = [];
  const res = (status, json, headers = {}) => ({ status, json: async () => json, headers: { get: k => headers[k] ?? headers[k.toLowerCase()] ?? null } });
  async function fetchFn(url, opts = {}) {
    const u = new URL(url), dev = (opts.headers || {})['X-Device-Id'], m = opts.method || 'GET'; calls.push({ m, path: u.pathname, size: opts.body ? opts.body.length : 0 });
    const f = faults.shift(); if (f === 'offline') throw new TypeError('Failed to fetch'); if (f && f.status) return res(f.status, f.json || {}, f.headers);
    if (u.pathname !== '/api/events') return res(404, { error: 'not found' });
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
  return { fetchFn, rows, calls, faults, count: dev => rows.filter(r => r.dev === dev).length };
}
