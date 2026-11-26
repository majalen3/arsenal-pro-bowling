// v83 theme boot (js/theme-boot.js): the saved look is applied before first paint. Runs the classic script in a sandbox with a
// fake document/localStorage, and checks its lists stay in step with js/main.js (BRANDS, DEFAULT_BRAND) and js/cc/wake.js (TEXT_SIZES).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { TEXT_SIZES } from '../../js/cc/wake.js';

const SRC = fs.readFileSync(new URL('../../js/theme-boot.js', import.meta.url), 'utf8');
const MAIN = fs.readFileSync(new URL('../../js/main.js', import.meta.url), 'utf8');

function run(stored, { systemDark = true, throwStorage = false } = {}) {
  const attrs = {}, meta = { content: '#0B0F0D', setAttribute(k, v) { this[k] = v; } };
  const el = { setAttribute(k, v) { attrs[k] = v; } };
  const ctx = {
    localStorage: { getItem(k) { if (throwStorage) throw new Error('blocked'); return k === 'ap_prefs' ? stored : null; } },
    document: { documentElement: el, querySelector: s => s === 'meta[name=theme-color]' ? meta : null },
    window: {}, matchMedia: () => ({ matches: systemDark }),
    getComputedStyle: () => ({ getPropertyValue: () => (attrs['data-brand'] === 'night' ? ' #0A1220 ' : ' #0B0F0D ') }),
  };
  ctx.window.matchMedia = ctx.matchMedia;
  vm.runInNewContext(SRC, ctx);
  return { attrs, meta };
}

test('lists match main.js and wake.js', () => {
  const brands = JSON.parse(MAIN.match(/export const BRANDS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  const def = MAIN.match(/export const DEFAULT_BRAND = '([^']+)'/)[1];
  assert.deepEqual(JSON.parse(SRC.match(/var BRANDS = (\[[^\]]*\])/)[1].replace(/'/g, '"')), brands);
  assert.equal(SRC.match(/DEFAULT_BRAND = '([^']+)'/)[1], def);
  assert.deepEqual(JSON.parse(SRC.match(/TEXT = (\[[^\]]*\])/)[1].replace(/'/g, '"')).sort(), Object.keys(TEXT_SIZES).sort());
});

test('saved look, mode and text size are applied', () => {
  const r = run(JSON.stringify({ theme: 'light', brand: 'maple', textSize: 'xl' }));
  assert.deepEqual(r.attrs, { 'data-theme': 'light', 'data-brand': 'maple', 'data-text': 'xl' });
  assert.equal(run(JSON.stringify({ brand: 'night' })).meta.content, '#0A1220');
});

test('system mode follows the OS', () => {
  assert.equal(run(JSON.stringify({ theme: 'system' }), { systemDark: false }).attrs['data-theme'], 'light');
  assert.equal(run(JSON.stringify({ theme: 'system' }), { systemDark: true }).attrs['data-theme'], 'dark');
});

test('nothing saved, bad values, bad JSON or blocked storage fall back to the defaults', () => {
  const def = { 'data-theme': 'dark', 'data-brand': 'pine', 'data-text': 'normal' };
  assert.deepEqual(run(null).attrs, def);
  assert.deepEqual(run(JSON.stringify({ brand: '<script>', textSize: 'huge' })).attrs, def);
  assert.deepEqual(run(JSON.stringify([1, 2])).attrs, def);
  assert.deepEqual(run('{not json').attrs, {});           // throws inside try: untouched, main.js applies defaults
  assert.deepEqual(run(null, { throwStorage: true }).attrs, {});
});

test('wired into index.html right after the stylesheet, and precached', () => {
  const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.match(html, /<link rel="stylesheet" href="css\/app\.css">\n<!--[^\n]*-->\n<script src="js\/theme-boot\.js"><\/script>/);
  assert.ok(!/<script>(?!<)/.test(html.replace(/<script src=[^>]*><\/script>/g, '')), 'no inline script');
  assert.ok(fs.readFileSync(new URL('../../sw.js', import.meta.url), 'utf8').includes("'js/theme-boot.js'"));
});
