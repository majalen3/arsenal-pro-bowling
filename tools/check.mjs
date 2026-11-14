#!/usr/bin/env node
// Zone-scoped quick check. Works out which zones your change touches (git diff against origin/main + working tree) and runs
// only those zones' tests, plus the boundary check, the lock check and a fast smoke. A change to a locked zone, to the SHELL
// (index.html, router, service worker, CI) or an app-wide change escalates to the FULL suite automatically.
// No npm deps, no build step. Zone map: tools/zones/zones.json. Design + timings: docs/ARCHITECTURE_ZONES.md.
//
//   node tools/check.mjs                 quick check for the current branch vs origin/main
//   node tools/check.mjs --dry-run       print the plan (zones, escalation reasons, steps) and run nothing
//   node tools/check.mjs --full          force the full suite
//   node tools/check.mjs --base REF      diff against REF instead of origin/main
//   node tools/check.mjs --files a,b     pretend exactly these files changed
//   node tools/check.mjs --no-browser    node-only steps (boundaries, locks, unit, equivalence, syntax, perf budget)
//   node tools/check.mjs --url URL       use an already running server instead of starting python -m http.server
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { ROOT, loadZones, compileZones, ownerOf, trackedFiles, moduleGraph, importsOf, resolveSpec, closureOf, read } from './zones/lib.mjs';

const APP_WIDE_ZONES = 4;                                   // this many feature zones in one change = an app-wide change
const FEATURE = ['LANE', 'BAG', 'ARSENAL', 'ADD_BALL', 'GAME', 'LOGBOOK', 'IMPORT', 'PERSISTENCE', 'ME', 'THEME', 'CATALOG'];
const shipped = f => /^(js\/|css\/|data\/|index\.html$|sw\.js$|manifest\.webmanifest$|icon\.svg$|icons\/)/.test(f);

export function changedFiles(base = 'origin/main') {
  const git = (...a) => execFileSync('git', a, { cwd: ROOT, maxBuffer: 1 << 26 }).toString().split('\n').filter(Boolean);
  let committed = [];
  try { committed = git('diff', '--name-only', `${base}...HEAD`); } catch { try { committed = git('diff', '--name-only', base); } catch { /* no base: fall through to the working tree only */ } }
  return [...new Set([...committed, ...git('diff', '--name-only', 'HEAD'), ...git('ls-files', '-o', '--exclude-standard')])].sort();
}

// Files each test file depends on: relative imports (resolved) plus any tracked path written in its source (readFileSync etc.).
function testDeps(testFile, fileSet) {
  const src = read(testFile); const out = new Set();
  for (const spec of importsOf(src).specs) { if (!spec.startsWith('.')) continue; const r = resolveSpec(testFile, spec); if (fileSet.has(r.file)) out.add(r.file); }
  for (const m of src.matchAll(/(?:js|css|data|tools)\/[\w./-]+\.\w+|\bsw\.js\b|\bindex\.html\b/g)) if (fileSet.has(m[0])) out.add(m[0]);
  return out;
}

// Pure planner (unit-tested in tests/data/zones.test.mjs).
export function plan({ changed, cfg = loadZones(), files = trackedFiles(), forceFull = false, browser = true }) {
  const zones = compileZones(cfg); const byId = new Map(zones.map(z => [z.id, z]));
  const touched = new Map();                                 // zone -> files
  const unowned = [];
  for (const f of changed) { const z = ownerOf(zones, f); if (!z) { unowned.push(f); continue; } if (!touched.has(z)) touched.set(z, []); touched.get(z).push(f); }
  const reasons = [];
  if (forceFull) reasons.push('--full');
  const lockedHit = changed.filter(f => zones.some(z => z.lockedSet.has(f)));
  if (lockedHit.length) reasons.push(`locked file changed: ${lockedHit.join(', ')}`);
  for (const [id, fs_] of touched) if (byId.get(id).escalate) reasons.push(`${id} zone changed (${fs_.length} file${fs_.length > 1 ? 's' : ''}) -> full suite by rule`);
  const featureHit = [...touched.keys()].filter(z => FEATURE.includes(z));
  if (featureHit.length >= APP_WIDE_ZONES) reasons.push(`app-wide change: ${featureHit.length} feature zones touched (${featureHit.join(', ')})`);
  if (unowned.length) reasons.push(`unowned file(s) ${unowned.join(', ')}: cannot scope, running everything`);
  const full = reasons.length > 0;

  const steps = [];
  const add = (id, label, kind, extra = {}) => steps.push({ id, label, kind, ...extra });
  add('boundaries', 'Dependency boundaries', 'node', { cmd: ['tools/zones/boundaries.mjs'] });
  add('locks', 'Locked zones (SHA-256 pins)', 'node', { cmd: ['tools/zones/locks.mjs'] });
  const jsChanged = changed.filter(f => f.startsWith('js/') && f.endsWith('.js') && !f.startsWith('js/vendor/') && fs.existsSync(path.join(ROOT, f)));
  if (jsChanged.length || full) add('syntax', 'Syntax check (node --check)', 'syntax', { files: full ? files.filter(f => /^js\/.*\.js$/.test(f) && !f.startsWith('js/vendor/')) : jsChanged });
  add('equivalence', 'Engine equivalence (7500 / 0)', 'node', { cmd: ['tests/engine_equivalence.mjs'], expect: /7500 comparisons, 0 mismatches/ });

  // unit tests
  const unitAll = files.filter(f => /^tests\/data\/.*\.test\.mjs$/.test(f));
  let unit;
  if (full) unit = unitAll;
  else {
    const sel = new Set();
    for (const id of touched.keys()) for (const t of byId.get(id).unit || []) sel.add(t);
    const { edges } = moduleGraph(files); const fileSet = new Set(files);
    const changedSet = new Set(changed);
    const sharedTestHelper = changed.some(f => /^tests\/data\/(fixtures\/|mock_api|make_pdf)/.test(f));
    for (const t of unitAll) {
      if (changedSet.has(t) || sharedTestHelper) { sel.add(t); continue; }
      const deps = testDeps(t, fileSet);
      if (deps.size && [...closureOf(deps, edges)].some(f => changedSet.has(f))) sel.add(t);   // downstream dependents of a changed file
    }
    unit = unitAll.filter(t => sel.has(t));
  }
  if (unit.length) add('unit', `Unit tests (${unit.length} of ${unitAll.length} files)`, 'unit', { files: unit });

  // browser + budget (only when shipped app files changed, or a browser test itself changed)
  const shippedChanged = changed.some(shipped);
  const browserTestChanged = changed.filter(f => /^tests\/(.*\.py|journeys\/)/.test(f));
  const checksCfg = cfg.checks; const wanted = new Set(); let journeys = new Set();
  if (full) {
    add('perf', 'Performance budget (bytes, modules, SW list)', 'py-node', { cmd: ['tests/perf_budget.py'] });
    if (browser) {
      add('e2e', 'End-to-end suite (e2e.py)', 'py', { py: ['tests/e2e.py', '{base}'] });
      add('recov', 'Local recovery review', 'py', { py: ['tests/local_recovery_smoke.py', '{base}'] });
      add('journeys', 'Journeys J01-J20 + visual baselines', 'journeys', { only: '' });
    }
  } else {
    if (shippedChanged) add('perf', 'Performance budget (bytes, modules, SW list)', 'py-node', { cmd: ['tests/perf_budget.py'] });
    if (browser && (shippedChanged || browserTestChanged.length)) {
      if (shippedChanged) wanted.add('flow');                         // the fast smoke: Bag -> game -> Log book
      for (const id of touched.keys()) for (const c of byId.get(id).browser || []) { if (c === 'spine') continue; wanted.add(c); }
      if (!shippedChanged) wanted.clear();
      for (const f of browserTestChanged) {
        const m = /^tests\/([\w]+)\.py$/.exec(f);
        if (f.startsWith('tests/journeys/')) { journeys = null; break; }
        if (m) { const key = Object.keys(checksCfg).find(k => checksCfg[k].py && checksCfg[k].py[0] === f); if (key) wanted.add(key); else if (f === 'tests/e2e.py') wanted.add('e2e'); }
      }
      if (journeys === null) add('journeys', 'Journeys (journey harness changed)', 'journeys', { only: '' });
      else {
        for (const c of wanted) if (checksCfg[c] && checksCfg[c].journey) { journeys.add(checksCfg[c].journey); wanted.delete(c); }
        for (const c of wanted) if (c === 'e2e') add('e2e', 'End-to-end suite (e2e.py)', 'py', { py: ['tests/e2e.py', '{base}'] });
        else if (checksCfg[c]) add(c, checksCfg[c].label, 'py', { py: checksCfg[c].py, ownServer: !!checksCfg[c].ownServer });
        if (journeys.size) add('journeys', `Journeys ${[...journeys].sort().join(', ')}`, 'journeys', { only: [...journeys].sort().join(',') });
        if (touched.has('THEME') && !full) add('visual', 'Visual baselines (13 screens x 2 phones)', 'journeys', { only: 'VISUAL' });
      }
    }
  }
  return { changed, touched: Object.fromEntries(touched), unowned, full, reasons, steps, shippedChanged };
}

// ---- runner --------------------------------------------------------------------------------------------------------
const freePort = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
function findPython() {
  for (const p of [process.env.ARSENAL_PY, '/workspace/pwenv/bin/python', 'python3', 'python'].filter(Boolean)) {
    const r = spawnSync(p, ['-c', 'import playwright'], { stdio: 'ignore' }); if (r.status === 0) return p;
  }
  return null;
}
function run(cmd, args, opts = {}) {
  const t0 = Date.now(); const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, ...opts });
  return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || ''), ms: Date.now() - t0 };
}
const fmt = ms => ms >= 60000 ? `${Math.floor(ms / 60000)}m${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}s` : `${(ms / 1000).toFixed(1)}s`;

async function main() {
  const a = process.argv.slice(2); const arg = n => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : null; };
  const base = arg('--base') || 'origin/main';
  const changed = arg('--files') ? arg('--files').split(',').filter(Boolean) : changedFiles(base);
  const p = plan({ changed, forceFull: a.includes('--full'), browser: !a.includes('--no-browser') });
  console.log(`changed files: ${changed.length}   zones touched: ${Object.keys(p.touched).join(', ') || '(none)'}`);
  for (const [z, fl] of Object.entries(p.touched)) console.log(`  ${z}: ${fl.slice(0, 6).join(', ')}${fl.length > 6 ? ` +${fl.length - 6} more` : ''}`);
  console.log(p.full ? `MODE: FULL suite\n  ${p.reasons.join('\n  ')}` : 'MODE: quick (zone-scoped)');
  console.log('plan:'); for (const s of p.steps) console.log(`  - ${s.label}`);
  if (a.includes('--dry-run')) return;

  const needBrowser = p.steps.some(s => ['py', 'journeys'].includes(s.kind) || s.kind === 'py-node' && false);
  const py = findPython();
  let server = null, baseUrl = arg('--url');
  if (needBrowser) {
    if (!py) { console.error('Browser steps need python with playwright (pip install playwright pillow && python -m playwright install chromium). Re-run with --no-browser for the node-only steps.'); process.exit(2); }
    if (!baseUrl) {
      const port = await freePort();
      server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
      baseUrl = `http://localhost:${port}/`;
      for (let i = 0; i < 40; i++) { try { const r = await fetch(baseUrl); if (r.ok) break; } catch { /* not up yet */ } await new Promise(r => setTimeout(r, 250)); }
    }
  }
  const results = []; const t0 = Date.now();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arsenal-check-'));
  for (const s of p.steps) {
    let r;
    if (s.kind === 'node') { r = run('node', s.cmd); if (r.ok && s.expect && !s.expect.test(r.out)) r.ok = false; }
    else if (s.kind === 'syntax') { const t = Date.now(); let ok = true, out = ''; for (const f of s.files) { const c = spawnSync('node', ['--check', f], { cwd: ROOT, encoding: 'utf8' }); if (c.status !== 0) { ok = false; out += c.stderr; } } r = { ok, out, ms: Date.now() - t }; }
    else if (s.kind === 'unit') r = run('node', ['--test', ...s.files]);
    else if (s.kind === 'py-node') r = run(py || 'python3', s.cmd);
    else if (s.kind === 'py') r = run(py, s.py.map(x => x.replace('{base}', baseUrl)), { env: { ...process.env, E2E_ART: path.join(tmp, 'art') } });
    else if (s.kind === 'journeys') { const args = ['tests/journeys/run.py', '--base', baseUrl, '--no-video', '--out', path.join(tmp, 'qa'), '--media', path.join(tmp, 'media')]; if (s.only) args.push('--only', s.only); if (s.only === 'VISUAL') { /* visual only */ } else if (s.only) args.push('--no-visual'); r = run(py, args); }
    results.push({ ...s, ...r });
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${fmt(r.ms).padStart(7)}  ${s.label}`);
    if (!r.ok) console.log(r.out.split('\n').slice(-25).join('\n'));
  }
  if (server) server.kill();
  fs.rmSync(tmp, { recursive: true, force: true });
  const bad = results.filter(r => !r.ok);
  console.log(`\n${p.full ? 'FULL' : 'QUICK'} check: ${results.length - bad.length}/${results.length} steps passed in ${fmt(Date.now() - t0)}`);
  if (bad.length) { console.log('FAILED: ' + bad.map(b => b.label).join('; ')); process.exit(1); }
}
if (process.argv[1]?.endsWith('check.mjs')) main();
