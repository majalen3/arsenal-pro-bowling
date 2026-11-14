#!/usr/bin/env node
// Dependency-boundary check. No npm deps, no build step: parses the import graph of js/** and fails when a file imports
// another zone's internals (anything not on that zone's `public` list) or imports a zone the importer may not depend on.
//   node tools/zones/boundaries.mjs            check (exit 1 on a new violation or a stale/undocumented exception)
//   node tools/zones/boundaries.mjs --list     print every cross-zone edge and which exceptions cover it
//   node tools/zones/boundaries.mjs --seed     print the current violations as `exceptions` JSON (reasons left blank)
// Rules, exceptions and the zone map: tools/zones/zones.json, docs/ARCHITECTURE_ZONES.md.
import { loadZones, compileZones, ownerOf, trackedFiles, moduleGraph } from './lib.mjs';

export function analyze(cfg = loadZones(), files = trackedFiles()) {
  const zones = compileZones(cfg); const byId = new Map(zones.map(z => [z.id, z]));
  const errors = []; const violations = []; const edgesAll = [];
  // 1. config sanity
  for (const z of zones) {
    for (const a of z.allow || []) if (!byId.has(a)) errors.push(`zone ${z.id}: allow lists unknown zone ${a}`);
    for (const p of z.publicSet) { if (!files.includes(p)) errors.push(`zone ${z.id}: public file ${p} does not exist`); else if (ownerOf(zones, p) !== z.id) errors.push(`zone ${z.id}: public file ${p} is owned by ${ownerOf(zones, p)}`); }
    for (const p of z.lockedSet) { if (!files.includes(p)) errors.push(`zone ${z.id}: locked file ${p} does not exist`); else if (ownerOf(zones, p) !== z.id) errors.push(`zone ${z.id}: locked file ${p} is owned by ${ownerOf(zones, p)}`); }
  }
  // 2. every shipped app file is owned
  for (const f of files) if (ownerOf(zones, f) == null) errors.push(`unowned file ${f}: add it to a zone's \`owns\` in tools/zones/zones.json`);
  // 3. import graph
  const { edges, problems } = moduleGraph(files);
  errors.push(...problems);
  for (const e of edges) {
    const za = ownerOf(zones, e.from), zb = ownerOf(zones, e.to);
    if (!za || !zb || za === zb) continue;
    const A = byId.get(za), B = byId.get(zb);
    const rules = [];
    if (!(A.allow || []).includes(zb)) rules.push('layer');
    const viaEntry = za === 'SHELL' && (B.entry || []).includes(e.to);   // the router table lazy-loads each zone's route screens
    if (!B.publicSet.has(e.to) && !viaEntry) rules.push('internal');
    edgesAll.push({ ...e, za, zb, rules });
    for (const rule of rules) violations.push({ from: e.from, to: e.to, rule, za, zb });
  }
  // 4. exceptions: each must match a live violation and carry a reason
  const ex = cfg.exceptions || []; const used = new Set();
  const key = v => `${v.from}\u0000${v.to}\u0000${v.rule}`;
  const exMap = new Map();
  for (const x of ex) {
    if (!x.reason || x.reason.trim().length < 8) errors.push(`exception ${x.from} -> ${x.to} (${x.rule}) has no reason`);
    exMap.set(key(x), x);
  }
  const fresh = [];
  for (const v of violations) { const x = exMap.get(key(v)); if (x) used.add(key(v)); else fresh.push(v); }
  const stale = ex.filter(x => !used.has(key(x)));
  return { errors, violations, fresh, stale, edgesAll, zones, exceptions: ex };
}

if (import.meta.url === new URL(process.argv[1], 'file:').href || process.argv[1]?.endsWith('boundaries.mjs')) {
  const arg = process.argv[2];
  const r = analyze();
  if (arg === '--seed') {
    const cur = new Map((r.exceptions || []).map(x => [`${x.from}|${x.to}|${x.rule}`, x]));
    const out = r.violations.map(v => ({ from: v.from, to: v.to, rule: v.rule, reason: (cur.get(`${v.from}|${v.to}|${v.rule}`) || {}).reason || '' }));
    console.log(JSON.stringify(out, null, 0).replace(/\},\{/g, '},\n    {'));
    process.exit(0);
  }
  if (arg === '--list') {
    for (const e of r.edgesAll) console.log(`${e.za} -> ${e.zb}  ${e.from} -> ${e.to}  ${e.rules.join('+') || 'ok'}`);
    process.exit(0);
  }
  for (const e of r.errors) console.error('ERROR  ' + e);
  for (const v of r.fresh) console.error(`BOUNDARY  ${v.rule === 'internal' ? 'imports internals of' : 'depends on'} ${v.zb}: ${v.from} (${v.za}) -> ${v.to}  [${v.rule}]`);
  for (const x of r.stale) console.error(`STALE EXCEPTION  ${x.from} -> ${x.to} [${x.rule}] no longer occurs: delete it from tools/zones/zones.json`);
  const bad = r.errors.length + r.fresh.length + r.stale.length;
  const covered = r.violations.length - r.fresh.length;
  console.log(`boundaries: ${r.zones.length} zones, ${r.edgesAll.length} cross-zone imports, ${r.violations.length} rule hits (${covered} documented exceptions, ${r.fresh.length} new), ${r.errors.length} errors, ${r.stale.length} stale`);
  if (bad) { console.error('FAIL: fix the import (go through the zone\'s public files), or add a documented exception with a reason.'); process.exit(1); }
}
