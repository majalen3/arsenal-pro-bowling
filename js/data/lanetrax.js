// LaneTrax "Session Report" PDF → session-aggregate record (DATA_SYSTEM §6.2). DOM-free, runs on the device.
// Reads ONLY a report the user exported and picked; never contacts LaneTrax. Text layer only: jsPDF writes Flate streams,
// Type0 fonts with ToUnicode CMaps, and `x y Td` + `<hex> Tj` runs. Images (charts, lane diagrams) are never decoded,
// so no per-shot values can come out of this parser.
export const PARSER = 'lanetrax-pdf/1';
export const TITLE = 'LaneTrax Session Report';
const latin1 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return s; };
const toBytes = s => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; };
export async function inflate(bytes) {
  const ds = new DecompressionStream('deflate'); const w = ds.writable.getWriter(); w.write(bytes); w.close();
  const out = new Uint8Array(await new Response(ds.readable).arrayBuffer()); return out;
}
// ---- PDF bytes → positioned text runs {p, x, y, t}
export async function pdfWords(bytes, { inflateFn = inflate } = {}) {
  const s = latin1(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  if (!/^%PDF-/.test(s.slice(0, 1024).trimStart())) return { ok: false, error: 'not-pdf' };
  const objs = new Map();
  for (const m of s.matchAll(/(\d+) 0 obj([\s\S]*?)endobj/g)) objs.set(+m[1], m[2]);
  const producer = ((s.match(/\/Producer\s*\(((?:\\.|[^\\)])*)\)/) || [])[1]) || null;
  const stream = async o => {
    if (!o) return null; const i = o.indexOf('stream'); if (i < 0) return null; let st = i + 6; if (o[st] === '\r') st++; if (o[st] === '\n') st++;
    const e = o.lastIndexOf('endstream'); const raw = toBytes(o.slice(st, e).replace(/\r?\n$/, ''));
    return /\/FlateDecode/.test(o.slice(0, i)) ? latin1(await inflateFn(raw)) : latin1(raw);
  };
  const cmap = t => { const map = {};
    for (const b of t.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) for (const p of b[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) map[parseInt(p[1], 16)] = String.fromCharCode(...p[2].match(/.{4}/g).map(x => parseInt(x, 16)));
    for (const b of t.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) for (const p of b[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) { const a = parseInt(p[1], 16), z = parseInt(p[2], 16), u = parseInt(p[3], 16); for (let c = a; c <= z && c - a < 65536; c++) map[c] = String.fromCharCode(u + c - a); }
    return map; };
  const fontMaps = {};
  for (const [id, o] of objs) { const m = o.match(/\/Type\s*\/Font[\s\S]*?\/ToUnicode (\d+) 0 R/); if (m) fontMaps[id] = cmap((await stream(objs.get(+m[1]))) || ''); }
  const pages = [...objs].filter(([, o]) => /\/Type\s*\/Page\b/.test(o) && !/\/Type\s*\/Pages/.test(o)).sort((a, b) => a[0] - b[0]);
  const words = [];
  for (let pi = 0; pi < pages.length; pi++) {
    const po = pages[pi][1]; const rm = po.match(/\/Resources (\d+) 0 R/), cm = po.match(/\/Contents (\d+) 0 R/);
    const resTxt = rm ? objs.get(+rm[1]) || '' : po; const fonts = {}; for (const m of resTxt.matchAll(/\/(F\d+)\s+(\d+) 0 R/g)) fonts[m[1]] = +m[2];
    const content = cm ? await stream(objs.get(+cm[1])) : null; if (!content) continue;
    let font = null, x = 0, y = 0;
    for (const m of content.matchAll(/\/(F\d+)\s+[\d.]+\s+Tf|([-\d.]+)\s+([-\d.]+)\s+Td|<([0-9a-fA-F]*)>\s*Tj|\(((?:\\.|[^\\)])*)\)\s*Tj/g)) {
      if (m[1]) font = fonts[m[1]];
      else if (m[2] !== undefined) { x = +m[2]; y = +m[3]; }
      else if (m[4] !== undefined) { const map = fontMaps[font] || {}; words.push({ p: pi + 1, x: +x.toFixed(1), y: +y.toFixed(1), t: (m[4].match(/.{4}/g) || []).map(hx => map[parseInt(hx, 16)] ?? '\uFFFD').join('') }); }
      else words.push({ p: pi + 1, x: +x.toFixed(1), y: +y.toFixed(1), t: m[5].replace(/\\([()\\])/g, '$1') });
    }
  }
  return { ok: true, producer, pages: pages.length, words };
}
export const isLaneTraxReport = (w, producer) => !!(w.words || w).find(x => x.p === 1 && x.t === TITLE) && /^jsPDF\b/.test(producer || '');
// ---- positioned words → canonical record (matches tests/fixtures/lanetrax/session-report.expected.json)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const NUM = /^(-?\d+(?:\.\d+)?)\s*(%|rpm|mph|kph|km\/h|m\/s|bds|ft|m|°|s)?$/;
const num = s => { const m = String(s == null ? '' : s).trim().match(NUM); return m ? { v: +m[1], u: m[2] === 'km/h' ? 'kph' : (m[2] || null) } : null; };
const r2 = v => Math.round(v * 100) / 100;
// Unit-aware: LaneTrax lets users show speed in mph/kph/m/s and distance in ft/m. Stored in mph and ft; the printed value is kept.
function normUnit(v, u) {
  if (u === 'kph') return { v: r2(v / 1.609344), u: 'mph', orig: { v, unit: 'kph' } };
  if (u === 'm/s') return { v: r2(v * 2.2369363), u: 'mph', orig: { v, unit: 'm/s' } };
  if (u === 'm') return { v: r2(v * 3.2808399), u: 'ft', orig: { v, unit: 'm' } };
  return { v, u };
}
const KPI = { 'Conversion Rate': 'conversionRate', 'Average Rev Rate': 'revRate', 'Average Impact Speed': 'impactSpeed', 'Average Difference': 'arrowsDifference' };
const KEY = { 'Arrows': 'arrows', 'Average Speed': 'averageSpeed', 'Breakpoint Board': 'breakpointBoard', 'Breakpoint Distance': 'breakpointDistance', 'Entry Board': 'entryBoard', 'Impact Speed': 'impactSpeed', 'Foul Line': 'foulLine', 'Hook Boards': 'hookBoards', 'Impact Angle': 'impactAngle', 'Launch Angle': 'launchAngle', 'Launch Speed': 'launchSpeed', 'Shot Time': 'shotTime', 'Speed Loss': 'speedLoss' };
export const BOARD_KEYS = ['arrows', 'breakpointBoard', 'entryBoard', 'foulLine'];   // positions (flippable); hookBoards is a distance, never flipped
export function recordFromWords(words) {
  const page = p => words.filter(w => w.p === p);
  const out = { kind: 'lanetrax-session-report', parser: PARSER, date: null, totalShots: null, kpis: [], outcomes: {}, summary: {}, warnings: [] };
  const extra = {}, warn = (code, detail) => out.warnings.push({ code, detail });
  for (const w of page(1)) {
    let m;
    if ((m = w.t.match(/^Date: (\w+) (\d{1,2}), (\d{4})$/)) && MONTHS.includes(m[1])) out.date = `${m[3]}-${String(MONTHS.indexOf(m[1]) + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    if ((m = w.t.match(/^Total Shots: (\d+)$/))) out.totalShots = +m[1];
  }
  // KPI rows: same-y rows on page 1 whose last cell is "Level n"
  const rows = {}; for (const w of page(1)) (rows[w.y] = rows[w.y] || []).push(w);
  for (const y of Object.keys(rows).sort((a, b) => b - a)) {
    const r = rows[y].sort((a, b) => a.x - b.x); if (r.length !== 4 || !/^Level \d$/.test(r[3].t)) continue;
    const [label, metric, value, level] = r.map(w => w.t); const n = num(value); if (!n) { warn('UNPARSED_VALUE', `${metric}: '${value}'`); continue; }
    const c = normUnit(n.v, n.u), k = { key: KPI[metric] ?? null, label, metric, value: c.v, unit: c.u, level: +level.replace('Level ', '') };
    if (c.orig) k.orig = c.orig; if (!k.key) warn('UNKNOWN_LABEL', `KPI '${metric}' kept as extra`); out.kpis.push(k);
  }
  const OUT = { strikes: /^(\d+) strikes \(([\d.]+)%\)$/, leaves: /^(\d+) leaves \(([\d.]+)%\)$/, madeSpares: /^(\d+) made spares \(([\d.]+)%\)$/, missedSpares: /^(\d+) missed spares \(([\d.]+)%\)$/ };
  for (const w of page(2)) for (const [k, re] of Object.entries(OUT)) { const m = w.t.match(re); if (m) out.outcomes[k] = { n: +m[1], pct: +m[2] }; }
  // Summary tables: page with "Summary"; each "Stat" header row, then its Range and Average rows below.
  const sp = words.filter(w => w.t === 'Summary').map(w => w.p)[0];
  if (sp) {
    const p3 = page(sp); const graph = p3.find(w => w.t === 'Graph by Stats'), graphY = graph ? graph.y : -Infinity;
    for (const s of p3.filter(w => w.t === 'Stat')) {
      const rangeW = p3.filter(w => w.t === 'Range' && w.y < s.y && w.y > s.y - 60).sort((a, b) => b.y - a.y)[0];
      const avgW = rangeW && p3.filter(w => w.t === 'Average' && w.x < s.x && w.y < rangeW.y && w.y > rangeW.y - 60).sort((a, b) => b.y - a.y)[0];
      if (!rangeW || !avgW) { warn('LAYOUT', 'Summary table without Range/Average rows'); continue; }
      const head = p3.filter(w => w.y <= s.y + 8 && w.y >= s.y - 8 && w.x > s.x + 20 && w.y > graphY);
      const cols = []; for (const hw of head.sort((a, b) => b.y - a.y)) { const c = cols.find(c => Math.abs(c.x - hw.x) < 25); if (c) c.t += ' ' + hw.t; else cols.push({ x: hw.x, t: hw.t }); }
      cols.sort((a, b) => a.x - b.x);
      const rowCells = y => p3.filter(w => w.y === y && w.t !== 'Range' && w.t !== 'Average');
      const nearest = (cells, i) => { let best = null, bd = Infinity; for (const c of cells) { const owner = cols.reduce((bi, cc, j) => Math.abs(cc.x - c.x) < Math.abs(cols[bi].x - c.x) ? j : bi, 0); const d = Math.abs(cols[i].x - c.x); if (owner === i && d < bd) { bd = d; best = c; } } return best; };
      const rc = rowCells(rangeW.y), ac = rowCells(avgW.y);
      cols.forEach((c, i) => {
        const r = num((nearest(rc, i) || {}).t), a = num((nearest(ac, i) || {}).t);
        if (!r || !a) { warn('UNPARSED_VALUE', `${c.t}: missing Range/Average`); return; }
        const unit = a.u ?? r.u ?? 'board', cr = normUnit(r.v, unit), ca = normUnit(a.v, unit);
        const entry = { label: c.t, range: cr.v, mean: ca.v, unit: ca.u };
        if (ca.orig) entry.orig = { range: r.v, mean: a.v, unit };
        if (KEY[c.t]) out.summary[KEY[c.t]] = entry; else { extra[c.t] = entry; warn('UNKNOWN_LABEL', `Summary column '${c.t}' kept as extra`); }
      });
    }
  }
  if (Object.keys(extra).length) out.extra = extra;
  // validations (warnings, never silent fixes)
  const o = out.outcomes;
  if (o.strikes && o.leaves && o.madeSpares && o.missedSpares) {
    const first = o.strikes.n + o.leaves.n, second = o.madeSpares.n + o.missedSpares.n, pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : null;
    if (pct(o.strikes.n, first) !== o.strikes.pct) warn('STRIKE_PCT', `strikes ${o.strikes.n}/${first} ≠ ${o.strikes.pct}%`);
    if (pct(o.madeSpares.n, second) !== o.madeSpares.pct) warn('SPARE_PCT', `made spares ${o.madeSpares.n}/${second} ≠ ${o.madeSpares.pct}%`);
    if (out.totalShots != null && first + second !== out.totalShots) warn('SHOT_COUNT_GAP', `strikes+leaves+made+missed spares = ${first + second}, Total Shots = ${out.totalShots}`);
    const conv = out.kpis.find(k => k.key === 'conversionRate'); if (conv && conv.value !== o.madeSpares.pct) warn('CONVERSION_VS_SPARES', `conversion ${conv.value}% vs made spares ${o.madeSpares.pct}%`);
  } else warn('LAYOUT', 'Outcome captions (strikes / leaves / spares) not found');
  const kImp = out.kpis.find(k => k.key === 'impactSpeed'), sImp = out.summary.impactSpeed;
  if (kImp && sImp && Math.abs(kImp.value - sImp.mean) > 0.05) warn('IMPACT_SPEED_KPI_VS_TABLE', `KPI ${kImp.value} vs summary mean ${sImp.mean}`);
  if (!out.date) warn('LAYOUT', 'Session date not found');
  return out;
}
// Flip board positions for a left-hander's report read as right-handed (b → 40 − b). Ranges and hook boards are unchanged.
export function flipBoards(rec) {
  const r = JSON.parse(JSON.stringify(rec));
  for (const k of BOARD_KEYS) if (r.summary[k]) r.summary[k].mean = r2(40 - r.summary[k].mean);
  r.boardsFlipped = true; return r;
}
export async function parseLaneTrax(bytes, opts) {
  const w = await pdfWords(bytes, opts);
  if (!w.ok || !isLaneTraxReport(w.words, w.producer)) return { ok: false, error: 'This doesn\u2019t look like a LaneTrax Session Report. Nothing was imported. If it is one, send it to us so we can support it.' };
  const record = recordFromWords(w.words);
  if (!record.date || !Object.keys(record.summary).length) return { ok: false, error: 'This LaneTrax report has a layout we don\u2019t read yet. Nothing was imported.' };
  return { ok: true, producer: w.producer, pages: w.pages, words: w.words, record };
}
// Units as printed in the report (null when the report shows none of that kind). Handedness is not printed: null.
export function unitsOf(rec) {
  const all = [...rec.kpis.map(k => (k.orig && k.orig.unit) || k.unit), ...Object.values(rec.summary).map(s => (s.orig && s.orig.unit) || s.unit)];
  return { speed: all.find(u => ['mph', 'kph', 'm/s'].includes(u)) || null, distance: all.find(u => ['ft', 'm'].includes(u)) || null, hand: null };
}
