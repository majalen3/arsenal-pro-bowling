// Generic CSV import (DATA_SYSTEM §6.1): RFC 4180 parser, delimiter sniff, header fingerprint presets, auto-mapping,
// HQ-style score shapes (ported as an algorithm from Bowling-HQ games.py: wide "Game N", frame/shot rows, score column,
// plain numbers; row errors are collected, never thrown), and a Ruby preset stub that waits for a real sample.
import { fnv, stable } from './schema.js';
import { check, toMph, round } from './validate.js';
import { scoreGame, framesOf } from './scoring.js';

// ---- RFC 4180 parse. Returns {rows: string[][], delimiter, bom, errors}. Cells are plain strings: never evaluated.
export function sniffDelimiter(text) {
  const cand = [',', ';', '\t'], lines = [];
  let cur = '', q = false;
  for (let i = 0; i < text.length && lines.length < 10; i++) { const c = text[i]; if (c === '"') q = !q; if (!q && (c === '\n' || c === '\r')) { if (cur) lines.push(cur); cur = ''; } else cur += c; }
  if (cur && lines.length < 10) lines.push(cur);
  const count = (l, d) => { let n = 0, qq = false; for (const c of l) { if (c === '"') qq = !qq; else if (!qq && c === d) n++; } return n; };
  let best = ',', bestScore = -1;
  for (const d of cand) { const ns = lines.map(l => count(l, d)); if (!ns.length || !ns[0]) continue; const same = ns.filter(n => n === ns[0]).length; const sc = same * 100 + ns[0]; if (sc > bestScore) { bestScore = sc; best = d; } }
  return best;
}
export function parseCSV(input, { delimiter = null } = {}) {
  let text = String(input == null ? '' : input); const bom = text.charCodeAt(0) === 0xFEFF; if (bom) text = text.slice(1);
  const d = delimiter || sniffDelimiter(text), rows = [], errors = [];
  let row = [], cell = '', q = false, i = 0, line = 1, quotedCell = false;
  const endCell = () => { row.push(cell); cell = ''; quotedCell = false; };
  const endRow = () => { endCell(); if (!(row.length === 1 && row[0] === '' )) rows.push(row); row = []; };
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i += 2; continue; } q = false; i++; continue; }
      if (c === '\n') line++;
      cell += c; i++; continue;
    }
    if (c === '"') { if (cell === '' && !quotedCell) { q = true; quotedCell = true; i++; continue; } cell += c; i++; continue; }  // stray quote mid-cell: kept literally
    if (c === d) { endCell(); i++; continue; }
    if (c === '\r') { endRow(); line++; i += text[i + 1] === '\n' ? 2 : 1; continue; }
    if (c === '\n') { endRow(); line++; i++; continue; }
    cell += c; i++;
  }
  if (q) errors.push(`Unclosed quote starting before line ${line}`);
  if (cell !== '' || row.length) endRow();
  return { rows, delimiter: d, bom, errors };
}
// ---- export side: neutralise spreadsheet formulas (=,+,-,@, tab, CR) and quote per RFC 4180.
export const safeCell = v => { const s = v == null ? '' : String(v); return /^[=+\-@\t\r]/.test(s) ? "'" + s : s; };
export const toCSV = rows => rows.map(r => r.map(v => { const s = safeCell(v); return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n') + '\r\n';
export const looksLikeFormula = s => /^[=+\-@]/.test(String(s || '')) && !/^[-+]?\d+(\.\d+)?$/.test(String(s).trim());

// ---- canonical fields + header auto-map
export const FIELDS = {
  date: { label: 'Date' }, ball: { label: 'Ball' }, game: { label: 'Game #' }, frame: { label: 'Frame' }, shot: { label: 'Shot in frame' },
  pins: { label: 'Pins down' }, score: { label: 'Game score' },
  speed: { label: 'Speed', units: ['mph', 'kph', 'm/s'], needsAt: true }, rev: { label: 'Rev rate (rpm)' },
  axisRotation: { label: 'Axis rotation (°)' }, axisTilt: { label: 'Axis tilt (°)' }, pattern: { label: 'Pattern' }, lane: { label: 'Lane' }, note: { label: 'Note' },
};
const SYN = [
  ['date', /^(date|day|session date|bowled on)$/], ['ball', /\b(ball|bowling ball)\b/], ['game', /^(game|game ?#|game ?no\.?|g)$/],
  ['frame', /^(frame|frame ?#|fr)$/], ['shot', /^(shot|roll|delivery|ball ?#|throw)$/], ['pins', /^(pins|pinfall|count|pins down|knocked)$/],
  ['score', /^(score|total|game score|final)$/], ['speed', /speed|\bmph\b|\bkph\b|km\/h/], ['rev', /\brev|\brpm\b/],
  ['axisRotation', /rotation/], ['axisTilt', /tilt/], ['pattern', /pattern|oil/], ['lane', /^lane/], ['note', /note|comment/],
];
export function autoMap(headers) {
  const map = {}, used = new Set(), units = {};
  headers.forEach((h, i) => { const n = String(h).trim().toLowerCase(); for (const [f, re] of SYN) { if (!used.has(f) && re.test(n)) { map[i] = f; used.add(f); if (f === 'speed') units.speed = /kph|km\/h/.test(n) ? 'kph' : /m\/s/.test(n) ? 'm/s' : /mph/.test(n) ? 'mph' : null; break; } } });
  return { map, units };
}
export const headerFingerprint = headers => fnv(headers.map(h => String(h).trim().toLowerCase()).sort().join('|'));

// ---- presets (ap_import_presets). storage = {get(): obj, set(obj)} injected so tests stay DOM-free.
export const RUBY_PRESET = { id: 'ruby-csv', kind: 'ruby-csv', label: 'Ruby release data', status: 'awaiting-sample', fingerprint: null, note: 'Needs a sample file: the Ruby export columns are unknown, so this routes to the generic mapper. No columns are guessed.' };
export function presetFor(headers, storage) { const all = (storage && storage.get()) || {}; return all[headerFingerprint(headers)] || null; }
export function savePreset(headers, mapping, storage, name) { const all = (storage && storage.get()) || {}; all[headerFingerprint(headers)] = { name: name || null, mapping, savedAt: Date.now() }; storage.set(all); return all; }

// ---- score shapes (HQ parse_csv_scores_with_errors, as an algorithm)
const intScore = raw => { const v = Number(String(raw).trim()); if (!Number.isFinite(v)) throw new Error('nan'); const n = Math.trunc(v); if (n < 0 || n > 300) throw new Error('range'); return n; };
export function scoreShape(headers) {
  const hs = headers.map(h => String(h).trim()), isNum = s => /^-?\d+$/.test(s);
  if (!hs.length || hs.every(isNum)) return 'plain';
  if (hs.some(h => /^game\s*\d+$/i.test(h))) return 'wide';
  if (hs.some(h => /frame|shot/i.test(h))) return 'frames';
  if (hs.some(h => /score|total/i.test(h))) return 'score';
  return 'plain';
}
export function parseScores(text) {
  const p = parseCSV(text), errors = [...p.errors], games = [];
  if (!p.rows.length) return { shape: null, games, errors: ['No content provided'] };
  const [hd, ...body] = p.rows, shape = scoreShape(hd);
  const col = (...needles) => hd.findIndex(h => needles.some(n => String(h).toLowerCase().includes(n)));
  if (shape === 'plain') { for (const tok of p.rows.flat().join(' ').split(/[\s,;]+/).filter(Boolean)) { try { games.push({ score: intScore(tok) }); } catch (e) { errors.push(`Invalid score '${tok}'`); } } }
  else if (shape === 'wide') { const cols = hd.map((h, i) => /^game\s*\d+$/i.test(String(h).trim()) ? i : -1).filter(i => i >= 0); const dc = col('date'), bc = col('ball');
    body.forEach((r, ri) => cols.forEach(ci => { const raw = (r[ci] || '').trim(); if (!raw) return; try { games.push({ score: intScore(raw), game: +String(hd[ci]).replace(/\D/g, ''), date: dc >= 0 ? r[dc] : null, ball: bc >= 0 ? r[bc] : null, row: ri + 2 }); } catch (e) { errors.push(`Row ${ri + 2}: invalid score '${raw}' in ${hd[ci]}`); } })); }
  else if (shape === 'frames') {
    const gc = col('game'), pc = col('pins', 'pinfall', 'count'), tc = col('total', 'score'), fc = col('frame'), sc = col('shot', 'roll'), bc = col('ball'), dc = col('date');
    const groups = new Map();
    body.forEach((r, ri) => { const key = (gc >= 0 && r[gc]) || '1'; if (!groups.has(key)) groups.set(key, { throws: [], balls: new Set(), date: dc >= 0 ? r[dc] : null }); const g = groups.get(key);
      let raw = pc >= 0 ? (r[pc] || '').trim() : ''; if (!raw && tc >= 0 && pc < 0) raw = (r[tc] || '').trim(); if (!raw) return;
      const v = Number(raw); if (!Number.isInteger(v) || v < 0 || v > 10) { errors.push(`Row ${ri + 2}: invalid pin value '${raw}' in game ${key}`); return; }
      g.throws.push({ down: v, frame: fc >= 0 ? +r[fc] || null : null, roll: sc >= 0 ? +r[sc] || null : null, row: ri + 2 }); if (bc >= 0 && r[bc]) g.balls.add(r[bc]); });
    for (const [key, g] of groups) { if (!g.throws.length) continue; const s = scoreGame(g.throws); if (!s.ok) { errors.push(`Game ${key}: ${s.errors.join(', ')}`); continue; } for (const fr of framesOf(g.throws).frames) fr.rolls.forEach((t, k) => { if (t.frame == null) t.frame = fr.f; if (t.roll == null) t.roll = k + 1; }); games.push({ score: s.total, game: +key || key, throws: g.throws, complete: s.complete, date: g.date, ball: [...g.balls][0] || null }); }
  } else { const sc = col('score', 'total'), dc = col('date'), bc = col('ball'), gc = col('game');
    body.forEach((r, ri) => { const raw = (r[sc] || '').trim(); if (!raw) return; try { games.push({ score: intScore(raw), date: dc >= 0 ? r[dc] : null, ball: bc >= 0 ? r[bc] : null, game: gc >= 0 ? +r[gc] || null : null, row: ri + 2 }); } catch (e) { errors.push(`Row ${ri + 2}: invalid score '${raw}'`); } }); }
  return { shape, games, errors };
}

// ---- release rows (speed/rev/rotation/tilt per row) with a mapping. Unit-aware; speed needs a measurement point.
export function parseDate(s) {
  const t = String(s || '').trim(); if (!t) return null;
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; }   // US M/D/Y
  return null;
}
export function mapRows(rows, mapping, { speedUnit = 'mph', speedAt = null } = {}) {
  const out = [], issues = [];
  rows.forEach((r, ri) => {
    const o = { row: ri + 2, extra: {} }, rowIssues = [];
    r.forEach((cell, ci) => { const f = mapping[ci]; const v = String(cell == null ? '' : cell).trim(); if (!f) { if (v) o.extra[ci] = v; return; } if (v !== '') o[f] = v; });
    if (o.date != null) { const d = parseDate(o.date); if (!d) rowIssues.push({ level: 'error', field: 'date', text: `Row ${o.row}: date '${o.date}' not understood (use YYYY-MM-DD)` }); o.date = d; }
    for (const f of ['speed', 'rev', 'axisRotation', 'axisTilt', 'score', 'pins', 'frame', 'shot', 'game']) {
      if (o[f] == null) continue; const n = Number(String(o[f]).replace(',', '.'));
      if (!Number.isFinite(n)) { rowIssues.push({ level: 'error', field: f, text: `Row ${o.row}: ${FIELDS[f].label} '${o[f]}' is not a number` }); delete o[f]; continue; }
      o[f] = n;
    }
    if (o.speed != null) {
      if (!speedAt) rowIssues.push({ level: 'error', field: 'speed', text: 'Pick where the speed was measured (release, launch, average or impact)' });
      const mph = toMph(o.speed, speedUnit); o.speed = { v: round(mph, 2), unit: 'mph', at: speedAt || 'unknown', orig: speedUnit === 'mph' ? null : { v: o.speed, unit: speedUnit } };
    }
    const chk = { speed: o.speed && o.speed.v, rev: o.rev, axisRotation: o.axisRotation, axisTilt: o.axisTilt, score: o.score, pins: o.pins };
    for (const [f, v] of Object.entries(chk)) { if (v == null) continue; const key = f === 'pins' ? null : f; if (!key) { if (!Number.isInteger(v) || v < 0 || v > 10) rowIssues.push({ level: 'error', field: f, text: `Row ${o.row}: pins ${v} outside 0–10` }); continue; }
      const c = check(key, v); if (c.level !== 'ok') rowIssues.push({ level: c.level, field: f, text: `Row ${o.row}: ${c.msg}` }); }
    for (const v of Object.values(o.extra)) if (looksLikeFormula(v)) rowIssues.push({ level: 'warn', field: 'extra', text: `Row ${o.row}: a cell starts with a formula sign; kept as plain text` });
    o.ok = !rowIssues.some(x => x.level === 'error'); out.push(o); issues.push(...rowIssues);
  });
  return { rows: out, issues };
}
// Semantic key: same rows (order-free) → same key, so a re-saved copy of an old file is still detected as a re-import.
export const semanticKey = rows => fnv(rows.map(r => stable(Object.assign({}, r, { row: undefined, extra: undefined, ok: undefined }))).sort().join('\n'));
