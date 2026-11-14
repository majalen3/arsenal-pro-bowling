// Zone design checks (docs/ARCHITECTURE_ZONES.md): dependency boundaries, locked zones, and the zone-scoped planner.
// Runs with the unit tests (node --test tests/data/*.test.mjs), so CI enforces the lines with no extra workflow step.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadZones, importsOf, globToRe, compileZones, ownerOf, trackedFiles } from '../../tools/zones/lib.mjs';
import { analyze } from '../../tools/zones/boundaries.mjs';
import { checkLocks, parseLog, lockedFiles, hashFile } from '../../tools/zones/locks.mjs';
import { plan } from '../../tools/check.mjs';

const clone = o => JSON.parse(JSON.stringify(o));
const files = trackedFiles();

// ---- parser ----------------------------------------------------------------------------------------------------------
test('importsOf: finds static, re-export, side-effect and literal dynamic imports; ignores comments, strings, regex and templates', () => {
  const src = `
    import a from './a.js';
    import { b, c as d } from "./b.js";
    import * as e from './e.js';
    import './side.js';
    export { f } from './f.js';
    export * from './g.js';
    // import x from './comment.js';
    /* import y from './block.js'; */
    const s = "import z from './string.js'"; const t = \`import q from './tpl.js' \${1}\`;
    const re = /import w from '.\\/re.js'/g; const url = 'http://x.test//y';
    const lazy = () => import('./lazy.js');
    const dyn = (n) => import('./screens/' + n + '.js');
    route(/^\\/strike$/, 'tonight', () => import('./screens/strike.js')); // trailing
  `;
  const r = importsOf(src);
  assert.deepEqual([...r.specs].sort(), ['./a.js', './b.js', './e.js', './f.js', './g.js', './lazy.js', './screens/strike.js', './side.js'].sort());
  assert.equal(r.dynNonLiteral.length, 1);
});
test('globs: exact, dir/**, single-segment *', () => {
  assert.ok(globToRe('css/**').test('css/app.css')); assert.ok(globToRe('css/**').test('css/a/b.css'));
  assert.ok(globToRe('js/theme*.js').test('js/theme.js')); assert.ok(!globToRe('js/theme*.js').test('js/sub/theme.js'));
  assert.ok(globToRe('js/engine.js').test('js/engine.js')); assert.ok(!globToRe('js/engine.js').test('js/engineXjs'));
});

// ---- zone map --------------------------------------------------------------------------------------------------------
test('every tracked file belongs to a zone', () => {
  const zones = compileZones(loadZones());
  assert.deepEqual(files.filter(f => ownerOf(zones, f) == null), []);
});
test('every unit test file is claimed by a zone, and every claim exists', () => {
  const cfg = loadZones(); const claimed = new Set(Object.values(cfg.zones).flatMap(z => z.unit || []));
  const unit = files.filter(f => /^tests\/data\/.*\.test\.mjs$/.test(f));
  assert.deepEqual(unit.filter(t => !claimed.has(t)), [], 'unclaimed unit tests: add them to a zone `unit` list in tools/zones/zones.json');
  assert.deepEqual([...claimed].filter(t => !files.includes(t)), []);
});

// ---- boundaries ------------------------------------------------------------------------------------------------------
test('boundaries: the tree has no undocumented cross-zone import, and no stale exception', () => {
  const r = analyze();
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.fresh.map(v => `${v.from} -> ${v.to} [${v.rule}]`), []);
  assert.deepEqual(r.stale.map(x => `${x.from} -> ${x.to} [${x.rule}]`), []);
  for (const x of r.exceptions) assert.ok(x.reason && x.reason.length >= 20, `exception needs a reason: ${x.from} -> ${x.to}`);
});
test('boundaries: importing a zone\'s internals is caught', () => {
  const cfg = clone(loadZones());
  cfg.zones.SCORING.public = [];                         // nothing is public any more -> every outside import of scoring.js is a violation
  const r = analyze(cfg);
  assert.ok(r.fresh.some(v => v.to === 'js/data/scoring.js' && v.rule === 'internal'), 'expected an internal-import violation');
});
test('boundaries: depending on a zone that is not in `allow` is caught', () => {
  const cfg = clone(loadZones());
  cfg.zones.GAME.allow = cfg.zones.GAME.allow.filter(z => z !== 'SCORING');
  const r = analyze(cfg);
  assert.ok(r.fresh.some(v => v.za === 'GAME' && v.zb === 'SCORING' && v.rule === 'layer'), 'expected a layer violation');
});
test('boundaries: an exception that no longer matches, or has no reason, fails', () => {
  const cfg = clone(loadZones());
  cfg.exceptions.push({ from: 'js/ui.js', to: 'js/perf.js', rule: 'layer', reason: 'a stale exception used by the test' });
  assert.equal(analyze(cfg).stale.length, 1);
  const cfg2 = clone(loadZones()); cfg2.exceptions[0].reason = '';
  assert.ok(analyze(cfg2).errors.some(e => /no reason/.test(e)));
});
test('boundaries: app code never imports a remote or bare module (CSP script-src self, no build step)', () => {
  assert.deepEqual(analyze().errors.filter(e => /bare\/remote|unresolved/.test(e)), []);
});

// ---- locks -----------------------------------------------------------------------------------------------------------
test('locks: the engine, scoring and the event-log schema are locked (and so is the equivalence oracle)', () => {
  const l = lockedFiles();
  for (const f of ['js/engine.js', 'js/data/scoring.js', 'js/data/schema.js', 'js/data/events.js', 'js/data/migrate.js', 'tests/engine_equivalence.mjs', 'tests/fixtures/engine-inputs.v64.json', 'tests/legacy/app.v1.js']) assert.ok(l.includes(f), f);
});
test('locks: every locked file matches its SHA-256 pin, and each pin has a dated, reasoned entry in docs/LOCKS.md', () => {
  const r = checkLocks();
  assert.deepEqual(r.errors, []);
  assert.ok(r.files >= 8);
});
test('locks: a changed locked file fails unless it is unlocked with a reason (simulated edit)', () => {
  const edit = f => (f === 'js/engine.js' ? 'f'.repeat(64) : hashFile(f));
  const r = checkLocks({ hash: edit });
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /LOCKED js\/engine\.js changed/);
});
test('locks: moving a pin without a matching log row fails; so does a log row without a reason or date', () => {
  const manifest = JSON.parse(JSON.stringify(JSON.parse(require_manifest())));
  manifest.files['js/engine.js'] = 'a'.repeat(64);
  const r = checkLocks({ manifest, hash: f => (f === 'js/engine.js' ? 'a'.repeat(64) : hashFile(f)) });
  assert.ok(r.errors.some(e => /no matching unlock entry/.test(e)));
  const log = parseLog(logText()).map(row => row.file === 'js/data/scoring.js' ? { ...row, reason: '', date: 'soon' } : row);
  const r2 = checkLocks({ log });
  assert.ok(r2.errors.some(e => /real reason/.test(e)) && r2.errors.some(e => /ISO date/.test(e)));
});
test('locks: a file added to a locked zone without a pin fails', () => {
  const cfg = clone(loadZones()); cfg.zones.SCORING.locked.push('js/data/validate.js');
  assert.ok(checkLocks({ cfg }).errors.some(e => /not in tools\/zones\/locks\.manifest\.json/.test(e)));
});
test('locks: the unlock log parses', () => {
  const rows = parseLog(logText());
  assert.ok(rows.length >= 8 && rows.every(r => /^[0-9a-f]{12}$/.test(r.sha12) && /^\d{4}-\d{2}-\d{2}$/.test(r.date)));
});

// ---- zone-scoped planner ---------------------------------------------------------------------------------------------
const P = (changed, o = {}) => plan({ changed, files, ...o });
const ids = p => p.steps.map(s => s.id);
test('plan: a docs-only change runs boundaries, locks and equivalence, no browser', () => {
  const p = P(['docs/X.md', 'README.md']);
  assert.equal(p.full, false); assert.deepEqual(ids(p), ['boundaries', 'locks', 'equivalence']);
});
test('plan: a Lane change runs the Lane unit tests (plus downstream dependents), the fast smoke and the Lane journeys only', () => {
  const p = P(['js/cc/strikeline.js']);
  assert.equal(p.full, false);
  const unit = p.steps.find(s => s.id === 'unit').files;
  assert.ok(unit.includes('tests/data/forgiving.test.mjs') && unit.includes('tests/data/oneline.test.mjs'));
  assert.ok(!unit.includes('tests/data/d1.test.mjs'));
  assert.ok(ids(p).includes('flow')); assert.equal(p.steps.find(s => s.id === 'journeys').only, 'J03,J12');
  assert.ok(!ids(p).includes('e2e'));
});
test('plan: locked zones, the SHELL and the service worker escalate to the full suite', () => {
  for (const f of ['js/engine.js', 'js/data/scoring.js', 'js/data/schema.js', 'js/data/project.js', 'sw.js', 'index.html', 'js/router.js', '.github/workflows/ui.yml']) {
    const p = P([f]); assert.equal(p.full, true, f); assert.ok(ids(p).includes('e2e') && ids(p).includes('journeys') && ids(p).includes('recov'), f);
    assert.equal(p.steps.find(s => s.id === 'unit').files.length, files.filter(x => /^tests\/data\/.*\.test\.mjs$/.test(x)).length);
  }
});
test('plan: an app-wide change (4+ feature zones) escalates; an unowned file escalates', () => {
  assert.equal(P(['js/cc/target.js', 'js/cc/bag.js', 'js/cc/card.js', 'js/cc/night.js']).full, true);
  assert.equal(P(['somewhere/new.file']).full, true);
});
test('plan: a theme change adds the visual baseline check; a test-only change runs just that test', () => {
  assert.ok(ids(P(['css/app.css'])).includes('visual'));
  const t = P(['tests/data/hand.test.mjs']);
  assert.deepEqual(t.steps.find(s => s.id === 'unit').files, ['tests/data/hand.test.mjs']);
  assert.ok(!ids(t).includes('flow'));
});
test('plan: --no-browser keeps the node-only steps', () => {
  const p = P(['js/engine.js'], { browser: false });
  assert.ok(!ids(p).includes('e2e') && ids(p).includes('unit') && ids(p).includes('equivalence'));
});

import fs from 'node:fs';
const here = new URL('../../', import.meta.url);
function require_manifest() { return fs.readFileSync(new URL('tools/zones/locks.manifest.json', here), 'utf8'); }
function logText() { return fs.readFileSync(new URL('docs/LOCKS.md', here), 'utf8'); }

import { render, BEGIN, END } from '../../tools/zones/zonedoc.mjs';
test('docs/ARCHITECTURE_ZONES.md zone tables match tools/zones/zones.json (run: node tools/zones/zonedoc.mjs --write)', () => {
  const md = fs.readFileSync(new URL('docs/ARCHITECTURE_ZONES.md', here), 'utf8');
  const a = md.indexOf(BEGIN), b = md.indexOf(END);
  assert.ok(a >= 0 && b > a, 'markers missing');
  assert.equal(md.slice(a, b + END.length), `${BEGIN}\n${render(loadZones(), files)}\n${END}`);
});
