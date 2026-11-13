// Match catalog rows to USBC Approved Ball List rows by exact normalised brand+name (no fuzzy guesses).
import { readFileSync } from 'node:fs';
const BRAND = { 'KR Strikeforce': ['Strikeforce', 'KRSF'], Epic: ['Epic Bowling'], Track: ['Track Inc.', 'Track'], Swag: ['Swag'], 'Columbia 300': ['Columbia 300'] };
export const nn = s => String(s).toLowerCase().replace(/[™®]/g, '').replace(/&/g, ' and ').replace(/viz-?a-?ball/g, 'viz a ball').replace(/[\/\-_()]/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
export function matchUsbc(rows, usbc) {
  const idx = new Map(); for (const u of usbc) { const k = nn(u.brand) + '|' + nn(u.name); (idx.get(k) || idx.set(k, []).get(k)).push(u); }
  return rows.map(r => { const bs = BRAND[r.brand] || [r.brand]; let hits = [];
    for (const b of bs) for (const alt of [r.name, r.name.replace(/ Poly$/i, ' Polyester'), r.name.replace(/ Ice\b/i, '')]) hits.push(...(idx.get(nn(b) + '|' + nn(alt)) || []));
    hits = [...new Set(hits)]; return { r, hits }; });
}
