// WCAG 2.x contrast for every brand x mode in the THEME TOKENS block of css/app.css (folded in from css/theme.css in v80). Reads the real tokens (no copies), resolves the cascade, derives the tints
// from the color-mix percentages in the file. Exit 1 when a pair misses its bar.   node tests/brand/contrast.mjs [--md]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const css = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'css', 'app.css'), 'utf8').replace(/^[\s\S]*?THEME TOKENS BEGIN[^\n]*\n/, '').replace(/\/\* THEME TOKENS END \*\/[\s\S]*$/, '').replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ sel: m[1].trim().split(',').map(s => s.trim()), decl: Object.fromEntries([...m[2].matchAll(/(--[\w-]+):([^;]+);/g)].map(d => [d[1], d[2].trim()])) }));
const matches = (sel, brand, mode) => { if (sel === ':root') return true; const a = [...sel.matchAll(/\[data-(theme|brand)=(\w+)\]/g)].map(m => [m[1], m[2]]); return a.length > 0 && a.every(([k, v]) => (k === 'theme' ? mode : brand) === v); };
function tokens(brand, mode) { const t = {}; for (const r of rules) if (r.sel.some(s => matches(s, brand, mode))) Object.assign(t, r.decl); return t; }
const hex = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const lin = c => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const L = rgb => .2126 * lin(rgb[0]) + .7152 * lin(rgb[1]) + .0722 * lin(rgb[2]);
const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const mix = (fg, pct, bg) => fg.map((c, i) => c * pct + bg[i] * (1 - pct));
const BRANDS = ['pine', 'maple', 'night'], MODES = ['dark', 'light'], rows = []; let fails = 0;
const pct = (T, name) => { const m = /color-mix\(in srgb,var\(--(\w+)\) (\d+)%,transparent\)/.exec(T[name] || ''); if (!m) throw Error('tint formula missing for ' + name); return +m[2] / 100; };
for (const brand of BRANDS) for (const mode of MODES) {
  const T = tokens(brand, mode), c = n => { const v = T[n]; if (!v) throw Error(`${brand}/${mode}: ${n} missing`); if (v.startsWith('var(')) return c(v.slice(4, -1)); return hex(v); };
  const BG = c('--bg'), S = c('--surface'), S2 = c('--surface-2'), S3 = c('--surface-3');
  const soft = (tone, base) => mix(c('--' + tone), pct(T, `--${tone}-soft`), base);
  const chk = (name, fg, bg, min) => { const r = ratio(fg, bg); const ok = r >= min; if (!ok) fails++; rows.push({ brand, mode, name, r, min, ok }); };
  for (const [bn, b] of [['bg', BG], ['surface', S], ['surface-2', S2]]) {
    chk(`text on ${bn}`, c('--text'), b, 4.5); chk(`text-2 on ${bn}`, c('--text-2'), b, 4.5); chk(`text-3 on ${bn}`, c('--text-3'), b, 4.5);
    chk(`accent-ink on ${bn}`, c('--accent-ink'), b, 4.5); chk(`accent (UI, focus ring) on ${bn}`, c('--accent'), b, 3);
    for (const t of ['good', 'warn', 'bad', 'info']) chk(`${t} text on ${bn}`, c('--' + t), b, 4.5);
  }
  chk('text on surface-3', c('--text'), S3, 4.5); chk('text-2 on surface-3', c('--text-2'), S3, 4.5);
  chk('on-primary on primary (main button)', c('--on-primary'), c('--primary'), 4.5); chk('on-accent on accent', c('--on-accent'), c('--accent'), 4.5);
  chk('accent-ink on accent-soft/surface (chip, pill)', c('--accent-ink'), soft('accent', S), 4.5); chk('accent-ink on accent-soft/bg', c('--accent-ink'), soft('accent', BG), 4.5);
  for (const t of ['good', 'warn', 'bad', 'info']) chk(`${t} on ${t}-soft/surface`, c('--' + t), soft(t, S), 4.5);
  chk('bg on bad (danger button)', BG, c('--bad'), 4.5);
  const toastBg = c('--toast-bg'), TOAST_INK = hex('#F2F5F3'); chk('toast text on toast', TOAST_INK, toastBg, 4.5); chk('toast action on toast', c('--toast-act'), toastBg, 4.5);
  chk('toast text on bad toast', TOAST_INK, mix(c('--bad'), .35, [0, 0, 0]), 4.5);
  chk('lane mark on lane top (canvas, graphic)', c('--lane-mark'), c('--lane-top'), 3); chk('lane mark on lane bottom', c('--lane-mark'), c('--lane-bottom'), 3);
  chk('brand-hi on brand (share card, print)', c('--brand-hi'), c('--brand'), 4.5); chk('brand-hi on black (card band)', c('--brand-hi'), [0, 0, 0], 4.5);
  chk('white on brand (print facts)', [255, 255, 255], c('--brand'), 4.5); chk('brand on white (print headings)', c('--brand'), [255, 255, 255], 4.5);
}
if (process.argv.includes('--md')) {
  console.log('| pair | ' + BRANDS.flatMap(b => MODES.map(m => `${b} ${m}`)).join(' | ') + ' | bar |\n|---|' + '---|'.repeat(BRANDS.length * MODES.length + 1));
  const names = [...new Set(rows.map(r => r.name))];
  for (const n of names) console.log(`| ${n} | ` + BRANDS.flatMap(b => MODES.map(m => { const r = rows.find(x => x.name === n && x.brand === b && x.mode === m); return (r.ok ? '' : '**FAIL** ') + r.r.toFixed(2); })).join(' | ') + ` | ${rows.find(x => x.name === n).min} |`);
} else for (const r of rows) if (!r.ok) console.log(`FAIL ${r.brand} ${r.mode}: ${r.name} = ${r.r.toFixed(2)} (needs ${r.min})`);
console.log(`\n${rows.length - fails}/${rows.length} pairs pass across ${BRANDS.length} brands x ${MODES.length} modes` + (fails ? `; ${fails} FAIL` : ''));
process.exit(fails ? 1 : 0);
