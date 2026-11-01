// My Team client (API: /api/account/teams/*, arsenal-pro-api lib/teams.js). Needs an account; everything else in the app works
// without one. The last team view is kept on this phone (CACHE_KEY) so the hub opens offline with an "offline" chip.
// Sharing is opt-in per team and per item; nothing is sent until the bowler switches an item on.
export const CACHE_KEY = 'ap_team_cache';
export const KINDS = ['bag', 'stats', 'tags', 'regular'];
export const NIGHTS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const CODE_RE = /^[A-HJ-NP-Z2-9]{4}-?[A-HJ-NP-Z2-9]{4}$/;
export const normCode = c => { const s = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return s.length === 8 ? s.slice(0, 4) + '-' + s.slice(4) : s; };
export const joinLink = (code, base = 'https://majalen3.github.io/arsenal-pro-bowling/') => `${base}#/team?join=${encodeURIComponent(normCode(code))}`;
const clip = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
// "Tonight I'm bringing": ball name, role and one reason the bowler typed (or nothing). Max 8 balls, server caps mirrored.
// Word-boundary shortening for the server's caps (a role never ends mid-word).
export const shorten = (v, n) => { const t = clip(v, 400); if (t.length <= n) return t; const cut = t.slice(0, n - 1), sp = cut.lastIndexOf(' '); return (sp > n / 2 ? cut.slice(0, sp) : cut).replace(/[\s,;:\u00b7-]+$/, '') + '\u2026'; };
export function bagShare(rows, why = {}, title = 'Tonight I\u2019m bringing') {
  return { title: clip(title, 40), balls: (rows || []).slice(0, 8).map(r => ({ name: clip(r.name, 60), role: shorten(r.role, 24), why: clip(why[r.id], 80) })).filter(b => b.name) };
}
export const tagsShare = tags => ({ tags: [...new Set(tags || [])].slice(0, 10) });
export const regularShare = r => r ? { center: clip(r.center, 60), nights: Math.max(0, Math.min(200, r.nights | 0)), days: 90 } : null;

export function createTeamClient({ account, storage = globalThis.localStorage, now = () => Date.now() } = {}) {
  const readCache = () => { try { const v = JSON.parse(storage.getItem(CACHE_KEY) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } };
  const writeCache = c => { try { storage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) {} };
  const who = () => { const s = account.active(); return s ? s.user.id : null; };
  // The cache is per account so a different sign-in never sees another bowler's team.
  const mine = () => { const c = readCache(), u = who(); return u && c.user === u ? c : { user: u, list: null, views: {} }; };
  const put = f => { const c = mine(); f(c); c.user = who(); writeCache(c); };
  const R = async (path, o) => { const r = await account.request('/api/account/teams' + path, o); return { ok: r.status >= 200 && r.status < 300, status: r.status, json: r.json || {}, offline: r.status === 0, error: account.msg(r, 'Could not reach the team.') }; };
  return {
    signedIn: () => !!who(),
    cached: tid => { const c = mine(); return tid ? (c.views[tid] || null) : c.list; },
    async list() { const r = await R(''); if (r.ok) put(c => { c.list = { at: now(), teams: r.json.teams }; }); return r; },
    async view(tid) { const r = await R('/' + tid);
      if (r.ok) put(c => { c.views[tid] = { at: now(), view: r.json }; });
      else if (r.status === 404) put(c => { delete c.views[tid]; if (c.list) c.list.teams = c.list.teams.filter(t => t.id !== tid); });
      return r; },
    create: (name, displayName, night = '', time = '') => R('', { method: 'POST', body: { name, displayName, night, time } }),
    join: (code, displayName) => R('/join', { method: 'POST', body: { code: normCode(code), displayName } }),
    settings: (tid, b) => R(`/${tid}/settings`, { method: 'POST', body: b }),
    rename: (tid, displayName) => R(`/${tid}/me`, { method: 'POST', body: { displayName } }),
    invite: (tid, days = 7, maxUses = 30) => R(`/${tid}/invites`, { method: 'POST', body: { days, maxUses } }),
    invites: tid => R(`/${tid}/invites`),
    revoke: (tid, iid) => R(`/${tid}/invites/${encodeURIComponent(iid)}`, { method: 'DELETE' }),
    share: (tid, kind, data) => R(`/${tid}/shares/${kind}`, { method: 'POST', body: { data } }),
    unshare: (tid, kind) => R(`/${tid}/shares/${kind}`, { method: 'DELETE' }),
    note: (tid, lanes, text) => R(`/${tid}/notes`, { method: 'POST', body: { lanes, text } }),
    deleteNote: (tid, nid) => R(`/${tid}/notes/${encodeURIComponent(nid)}`, { method: 'DELETE' }),
    report: (tid, b) => R(`/${tid}/reports`, { method: 'POST', body: b }),
    dismiss: (tid, rid) => R(`/${tid}/reports/${encodeURIComponent(rid)}`, { method: 'DELETE' }),
    remove: (tid, mid) => R(`/${tid}/members/${encodeURIComponent(mid)}`, { method: 'DELETE' }),
    async leave(tid) { const r = await R(`/${tid}/members/me`, { method: 'DELETE' }); if (r.ok) put(c => { delete c.views[tid]; if (c.list) c.list.teams = c.list.teams.filter(t => t.id !== tid); }); return r; },
    async destroy(tid) { const r = await R('/' + tid, { method: 'DELETE' }); if (r.ok) put(c => { delete c.views[tid]; if (c.list) c.list.teams = c.list.teams.filter(t => t.id !== tid); }); return r; },
    forget() { try { storage.removeItem(CACHE_KEY); } catch (e) {} },
  };
}
