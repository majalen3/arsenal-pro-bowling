// v75 (owner t134u): the service worker's precache list is correct. A missing file fails the whole install (cache.addAll is atomic),
// and a module that is imported but not precached works online and breaks offline.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const shell = [...sw.slice(sw.indexOf('const SHELL'), sw.indexOf("self.addEventListener('install'")).matchAll(/'([^']+)'/g)].map(m => m[1]);
const walk = (d, o = []) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); f.isDirectory() ? walk(p, o) : o.push(p); } return o; };
// Loaded on demand and runtime-cached on first use (sw.js comment "Drill card import"), so deliberately not precached.
const LAZY = new Set(['js/cc/drillocr.js']), LAZY_DIR = 'js/vendor/tesseract/';

test('the cache name is the release string', () => assert.match(sw, /const CACHE = 'arsenal-pro-v\d+';/));
test('every precache entry exists on disk, and none is listed twice', () => {
  const miss = shell.filter(p => p !== './' && !fs.existsSync(path.join(ROOT, p))); assert.deepEqual(miss, []);
  const dup = shell.filter((p, i) => shell.indexOf(p) !== i); assert.deepEqual(dup, []);
});
test('every js module under js/ is precached (except the documented lazy OCR files)', () => {
  const mods = walk(path.join(ROOT, 'js')).map(f => path.relative(ROOT, f).split(path.sep).join('/')).filter(f => f.endsWith('.js') && !LAZY.has(f) && !f.startsWith(LAZY_DIR));
  assert.deepEqual(mods.filter(f => !shell.includes(f)), []);
});
test('every static import reachable from the shell is itself precached', () => {
  const bad = []; for (const f of shell.filter(p => p.endsWith('.js'))) { const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of s.matchAll(/(?:from\s*|import\s*\(\s*)['"](\.{1,2}\/[^'"]+\.js)['"]/g)) { const t = path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1])); if (!shell.includes(t) && !LAZY.has(t) && !t.startsWith(LAZY_DIR)) bad.push(f + ' -> ' + t); } }
  assert.deepEqual(bad, []);
});
