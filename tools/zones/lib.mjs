// Shared helpers for the zone tools (no dependencies, no build step). See docs/ARCHITECTURE_ZONES.md.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
export const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

export function loadZones() { return JSON.parse(read('tools/zones/zones.json')); }

// ---- patterns: exact path, `dir/**`, `*` inside one segment --------------------------------------------------------
export function globToRe(g) {
  let s = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*' && g[i + 1] === '*') { s += '.*'; i++; if (g[i + 1] === '/') i++; }
    else if (c === '*') s += '[^/]*';
    else s += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + s + '$');
}
export function compileZones(cfg) {
  const out = [];
  for (const [id, z] of Object.entries(cfg.zones)) out.push({ id, ...z, ownRes: (z.owns || []).map(globToRe), lockedSet: new Set(z.locked || []), publicSet: new Set(z.public || []) });
  return out;
}
export function ownerOf(zones, file) {
  for (const z of zones) if (z.ownRes.some(r => r.test(file))) return z.id;
  return null;
}

// ---- files -----------------------------------------------------------------------------------------------------------
export function trackedFiles() {
  // tracked + new (untracked, not ignored) files, so the checks also see work that is not committed yet
  const ls = (...a) => execFileSync('git', ['ls-files', '-z', ...a], { cwd: ROOT, maxBuffer: 1 << 28 }).toString().split('\0').filter(Boolean);
  return [...new Set([...ls(), ...ls('-o', '--exclude-standard')])].filter(f => fs.existsSync(path.join(ROOT, f))).sort();
}

// ---- import parsing --------------------------------------------------------------------------------------------------
// Strips comments and string/template *contents* (keeping the quotes' specifiers for import statements), then finds
//   import ... from 'x' | import 'x' | export ... from 'x' | import('x')
// A tiny scanner, not a full parser: enough for this code base (verified against tests/data/zones.test.mjs fixtures).
export function importsOf(src) {
  const specs = []; const dynNonLiteral = [];
  let i = 0; const n = src.length; let code = ''; const strs = [];
  const prevSig = () => { for (let k = code.length - 1; k >= 0; k--) { const ch = code[k]; if (!/\s/.test(ch)) return ch; } return ''; };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; code += ' '; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1, s = '';
      while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') { s += src[j + 1] || ''; j += 2; continue; } s += src[j++]; }
      strs.push(s); code += `${c}#${strs.length - 1}${c}`; i = j + 1; continue;
    }
    if (c === '`') {
      let j = i + 1, depth = 0;
      while (j < n) { if (src[j] === '\\') { j += 2; continue; } if (depth === 0 && src[j] === '`') break; if (src[j] === '$' && src[j + 1] === '{') { depth++; j += 2; continue; } if (depth > 0 && src[j] === '}') { depth--; j++; continue; } j++; }
      code += '`T`'; i = j + 1; continue;
    }
    if (c === '/') { // regex literal vs division: a regex follows an operator, '(' ',' '=' ':' '[' '!' '&' '|' '?' '{' '}' ';' or start
      const p = prevSig();
      if (p === '' || '(,=:[!&|?{};+-*%<>~^'.includes(p) || /(?:return|typeof|case)\s*$/.test(code)) {
        let j = i + 1, cls = false;
        while (j < n && src[j] !== '\n') { if (src[j] === '\\') { j += 2; continue; } if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; else if (src[j] === '/' && !cls) break; j++; }
        code += '/R/'; i = j + 1; while (i < n && /[a-z]/i.test(src[i])) i++; continue;
      }
    }
    code += c; i++;
  }
  const take = idx => strs[+idx];
  let m;
  const stat = /(?:^|[;}\s])(?:import|export)\s*(?:[^'"`;]*?\bfrom\s*)?(['"])#(\d+)\1/g;
  while ((m = stat.exec(code))) specs.push(take(m[2]));
  const dyn = /\bimport\s*\(\s*(?:(['"])#(\d+)\1\s*\)|([^)]*)\))/g;
  while ((m = dyn.exec(code))) { if (m[2] != null) specs.push(take(m[2])); else dynNonLiteral.push(m[3].trim()); }
  return { specs, dynNonLiteral };
}

export function resolveSpec(fromFile, spec) {
  if (!spec.startsWith('.') && !spec.startsWith('/')) return { external: spec };
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));
  return { file: target };
}

// Edges of the app module graph: [{from, to, spec}] for js/** (vendor/ is third-party code and not scanned).
export function moduleGraph(files) {
  const edges = []; const problems = [];
  for (const f of files) {
    if (!f.startsWith('js/') || !f.endsWith('.js') || f.startsWith('js/vendor/')) continue;
    const { specs, dynNonLiteral } = importsOf(read(f));
    for (const spec of new Set(specs)) {
      const r = resolveSpec(f, spec);
      if (r.external) { problems.push(`${f}: bare/remote import '${spec}' (the app allows relative imports only: CSP script-src 'self', no build step)`); continue; }
      if (!fs.existsSync(path.join(ROOT, r.file))) { problems.push(`${f}: unresolved import '${spec}'`); continue; }
      edges.push({ from: f, to: r.file, spec });
    }
    for (const e of dynNonLiteral) problems.push(`${f}: dynamic import(${e}) is not a literal, so the boundary check cannot see it`);
  }
  return { edges, problems };
}

// Files a test touches, found from path literals in its source (covers imports AND readFileSync of app files).
export function appRefsOf(testSrc, allFiles) {
  const out = new Set();
  for (const m of testSrc.matchAll(/(?:js\/[\w./-]+\.js|\bsw\.js|\bindex\.html|css\/[\w./-]+\.css)/g)) if (allFiles.has(m[0])) out.add(m[0]);
  return out;
}
export function closureOf(startFiles, edges) {
  const adj = new Map();
  for (const e of edges) { if (!adj.has(e.from)) adj.set(e.from, []); adj.get(e.from).push(e.to); }
  const seen = new Set(startFiles); const q = [...startFiles];
  while (q.length) { const f = q.pop(); for (const t of adj.get(f) || []) if (!seen.has(t)) { seen.add(t); q.push(t); } }
  return seen;
}
