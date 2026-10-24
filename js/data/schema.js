// Data schema v1 (docs/DATA_SYSTEM.md §2-3). DOM-free: imported by the app and by node --test.
export const SCHEMA_V = 1;
export const PROV_KINDS = ['manufacturer', 'usbc', 'catalog', 'device', 'user', 'model', 'derived'];
export const SPEED_AT = ['release', 'launch', 'average', 'impact', 'unknown'];
export const BALL_STATUS = ['inBag', 'benched', 'proShop', 'retired'];
// Value = {v, unit, prov}; prov = {kind, ref?, device?, n?, method?, importId?, confidence?, at?}
export const val = (v, unit, prov) => ({ v, unit: unit || null, prov: prov || { kind: 'user' } });
export const prov = (kind, extra) => Object.assign({ kind }, extra || {});
// Chip text shown next to every number (DATA_SYSTEM §3).
export function chip(p) {
  if (!p) return 'you';
  switch (p.kind) {
    case 'manufacturer': return p.ref ? p.ref + ' spec' : 'maker spec';
    case 'usbc': return 'USBC';
    case 'catalog': return 'catalog';
    case 'device': return (p.device || 'device') + (p.date ? ' · ' + p.date : '') + ' · n=' + (p.n == null ? '?' : p.n);
    case 'user': return p.ref === 'user-reported' ? 'you (reported)' : p.ref === 'default' ? 'default (not entered)' : 'you';
    case 'model': return 'estimate';
    case 'derived': return 'calc';
    case 'assumed': return 'assumed';
    default: return 'you';
  }
}
// FNV-1a 32-bit ×2 → 16 hex chars: sync, deterministic ids and projection hashes (not security).
export function fnv(str) {
  let h1 = 0x811c9dc5, h2 = 0xcbf29ce4;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = Math.imul(h2 ^ c, 0x01000193) + (c << 3) >>> 0; }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}
// Stable JSON (sorted keys) so hashes don't depend on insertion order.
export function stable(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
}
export function uuid() {
  const c = globalThis.crypto;
  if (c && c.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16); if (c && c.getRandomValues) c.getRandomValues(b); else for (let i = 0; i < 16; i++) b[i] = Math.random() * 256 | 0;
  b[6] = b[6] & 15 | 64; b[8] = b[8] & 63 | 128; const x = [...b].map(n => n.toString(16).padStart(2, '0')).join('');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}
export async function sha256Hex(data) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const d = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(d)].map(n => n.toString(16).padStart(2, '0')).join('');
}
export const isoDay = (t = Date.now()) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
