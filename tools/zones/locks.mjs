#!/usr/bin/env node
// Lock check for the locked zones (ENGINE, SCORING, EVENT_LOG schema). SHA-256 of every locked file is pinned in
// tools/zones/locks.manifest.json; a deliberate change needs an unlock entry (file + reason + date + new hash) in docs/LOCKS.md.
//   node tools/zones/locks.mjs                              check (exit 1 when a locked file changed without an unlock entry)
//   node tools/zones/locks.mjs --status                     list locked files, their hash and the latest unlock entry
//   node tools/zones/locks.mjs --unlock FILE --reason "..." re-pin FILE after a deliberate change AND append the entry to docs/LOCKS.md
//   node tools/zones/locks.mjs --init                       (one time) create the manifest and the baseline entries
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, loadZones, read } from './lib.mjs';

export const MANIFEST = 'tools/zones/locks.manifest.json';
export const LOG = 'docs/LOCKS.md';
export const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
export const hashFile = f => sha256(fs.readFileSync(path.join(ROOT, f)));   // raw bytes: line endings count
export function lockedFiles(cfg = loadZones()) { return [...new Set(Object.values(cfg.zones).flatMap(z => z.locked || []))].sort(); }

// Unlock log: markdown table rows  | file | reason | date | sha256 (12) |   (later rows win)
export function parseLog(md) {
  const rows = [];
  for (const line of md.split('\n')) {
    if (!line.startsWith('|')) continue;
    const c = line.split('|').slice(1, -1).map(s => s.trim());
    if (c.length < 4 || /^-+$/.test(c[0].replace(/[:\s`]/g, '')) || /^file$/i.test(c[0])) continue;
    rows.push({ file: c[0].replace(/`/g, ''), reason: c[1], date: c[2], sha12: c[3].replace(/`/g, '').toLowerCase() });
  }
  return rows;
}

export function checkLocks({ cfg = loadZones(), manifest = JSON.parse(read(MANIFEST)), log = parseLog(read(LOG)), hash = hashFile } = {}) {
  const errors = []; const want = lockedFiles(cfg); const have = Object.keys(manifest.files || {}).sort();
  for (const f of want) if (!(f in manifest.files)) errors.push(`${f} is in a locked zone but not in ${MANIFEST}. Pin it: node tools/zones/locks.mjs --unlock ${f} --reason "why"`);
  for (const f of have) if (!want.includes(f)) errors.push(`${f} is pinned in ${MANIFEST} but no zone locks it any more (zones.json). Removing a lock needs an unlock entry: edit the zone and manifest together and say why in ${LOG}.`);
  for (const f of want.filter(f => f in manifest.files)) {
    let actual; try { actual = hash(f); } catch { errors.push(`${f}: locked file is missing or unreadable`); continue; }
    const pinned = manifest.files[f];
    if (actual !== pinned) { errors.push(`LOCKED ${f} changed (sha256 ${actual.slice(0, 12)} != pinned ${pinned.slice(0, 12)}). If this is deliberate: node tools/zones/locks.mjs --unlock ${f} --reason "why", and commit ${MANIFEST} and ${LOG} with it.`); continue; }
    const rows = log.filter(r => r.file === f); const last = rows[rows.length - 1];
    if (!last) errors.push(`${f}: no entry in ${LOG}`);
    else {
      if (last.sha12 !== pinned.slice(0, 12)) errors.push(`${f}: the manifest hash ${pinned.slice(0, 12)} has no matching unlock entry in ${LOG} (latest entry says ${last.sha12}). A pin may only move together with a logged reason and date.`);
      if (!last.reason || last.reason.length < 8) errors.push(`${f}: unlock entry needs a real reason`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(last.date)) errors.push(`${f}: unlock entry needs an ISO date (YYYY-MM-DD)`);
    }
  }
  return { errors, files: want.length };
}

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());   // the owner's calendar day (YYYY-MM-DD)
function appendRow(file, reason, h) {
  const clean = reason.replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
  const p = path.join(ROOT, LOG); let md = fs.readFileSync(p, 'utf8'); if (!md.endsWith('\n')) md += '\n';
  fs.writeFileSync(p, md + `| \`${file}\` | ${clean} | ${today()} | \`${h.slice(0, 12)}\` |\n`);
}

if (process.argv[1]?.endsWith('locks.mjs')) {
  const a = process.argv.slice(2); const cfg = loadZones();
  const arg = n => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : null; };
  if (a.includes('--init')) {
    const files = {}; for (const f of lockedFiles(cfg)) files[f] = hashFile(f);
    fs.writeFileSync(path.join(ROOT, MANIFEST), JSON.stringify({ version: 1, algorithm: 'sha256', files }, null, 2) + '\n');
    for (const f of Object.keys(files)) appendRow(f, 'Baseline: initial lock when the zones were drawn', files[f]);
    console.log(`pinned ${Object.keys(files).length} files`);
  } else if (a.includes('--unlock')) {
    const f = arg('--unlock'), reason = arg('--reason');
    if (!f || !reason || reason.trim().length < 8) { console.error('usage: --unlock FILE --reason "why (at least a sentence)"'); process.exit(2); }
    if (!lockedFiles(cfg).includes(f)) { console.error(`${f} is not in a locked zone (tools/zones/zones.json). Add it to the zone's \`locked\` list first.`); process.exit(2); }
    const m = JSON.parse(read(MANIFEST)); const h = hashFile(f);
    if (m.files[f] === h) { console.log(`${f} unchanged since its pin; nothing to unlock`); process.exit(0); }
    m.files[f] = h; fs.writeFileSync(path.join(ROOT, MANIFEST), JSON.stringify(m, null, 2) + '\n'); appendRow(f, reason, h);
    console.log(`re-pinned ${f} -> ${h.slice(0, 12)} and logged it in ${LOG}. Review the diff, then commit both files with the change.`);
  } else if (a.includes('--status')) {
    const m = JSON.parse(read(MANIFEST)); const log = parseLog(read(LOG));
    for (const f of lockedFiles(cfg)) { const rows = log.filter(r => r.file === f); const l = rows[rows.length - 1] || {}; console.log(`${f}  ${(m.files[f] || '-').slice(0, 12)}  last: ${l.date || '-'} ${l.reason || ''}`); }
  } else {
    const r = checkLocks();
    for (const e of r.errors) console.error('LOCK  ' + e);
    console.log(`locks: ${r.files} locked files, ${r.errors.length} problems`);
    if (r.errors.length) process.exit(1);
  }
}
