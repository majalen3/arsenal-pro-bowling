// Drill / grip spec card import (owner queue item 6, 2026-11-01). Pure (node --test): fraction parsing, the field list,
// the OCR-words -> field guesses parser, PAP sign convention and the "your PAP vs the card" plain comparison.
// Nothing here invents a value: every field is either read from the card photo (with the OCR confidence) or typed by the bowler.

// Fractions as pro shops write them: "5 1/8", "41/64", "1/4+", "3 3/4", ".040", "45", "+ 3/8", "-1/16".
// Returns { v, txt, plus } or null. plus = the card's trailing "+" ("a hair more than"), kept as written, not added to v.
export function parseFrac(s) {
  if (s == null) return null;
  let t = String(s).trim().replace(/[\u2044\u2215]/g, '/').replace(/\u2212/g, '-').replace(/\s+/g, ' ');
  if (!t) return null;
  const plus = /\+$/.test(t) && !/^\+\s*\S/.test(t) || /\d\+$/.test(t);
  t = t.replace(/\+$/, '').trim();
  let sign = 1;
  const sm = t.match(/^([+-])\s*/); if (sm) { sign = sm[1] === '-' ? -1 : 1; t = t.slice(sm[0].length); }
  let v = null, m;
  if ((m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/))) { if (+m[3]) v = +m[1] + +m[2] / +m[3]; }
  else if ((m = t.match(/^(\d+)\/(\d+)$/))) { if (+m[2]) v = +m[1] / +m[2]; }
  else if ((m = t.match(/^(\d*\.\d+|\d+(?:\.\d+)?)$/))) v = +m[1];
  if (v == null || !Number.isFinite(v)) return null;
  return { v: Math.round(sign * v * 1e6) / 1e6, txt: (sign < 0 ? '-' : sm && sm[1] === '+' ? '+' : '') + t + (plus ? '+' : ''), plus };
}

// PAP sign convention (explicit, shown on the form): "over" is inches from the centre of the grip toward the bowling side,
// always positive; "up/down" is + when the PAP is above the horizontal midline of the grip, - when below (as printed
// "PAP Up(+) Down(-)" on bowlingball.com grip spec cards). The profile text keeps the familiar "5 1/8 x 3/8 up" form.
export function papOf(over, upDown) {
  const o = parseFrac(over), u = parseFrac(upDown);
  if (!o || o.v < 0 || o.v > 8) return null;
  if (u && Math.abs(u.v) > 3) return null;
  return { over: o.v, up: u ? u.v : 0, overTxt: o.txt.replace(/^[+-]/, ''), upTxt: u ? u.txt.replace(/^[+-]/, '') : '0' };
}
export const papText = p => !p ? '' : `${p.overTxt} x ${p.up === 0 ? '0' : p.upTxt + (p.up > 0 ? ' up' : ' down')}`;
// The free-text PAP on Me ("4 3/4 x 1/2 up", "5 1/8 over 3/8 down", "4.75, 0.5 up").
export function papFromText(s) {
  const t = String(s || '').toLowerCase().replace(/[\u2033"]/g, '').trim();
  const m = t.match(/^\s*([\d .\/]+?)\s*(?:x|over|,|by)\s*([+-]?\s*[\d .\/]+?)\s*(up|down|above|below)?\s*$/);
  if (!m) { const o = parseFrac(t); return o ? { over: o.v, up: 0, overTxt: o.txt, upTxt: '0' } : null; }
  const o = parseFrac(m[1]), u = parseFrac(m[2]);
  if (!o || !u) return null;
  const down = m[3] === 'down' || m[3] === 'below' || u.v < 0;
  return { over: o.v, up: down ? -Math.abs(u.v) : Math.abs(u.v), overTxt: o.txt, upTxt: u.txt.replace(/^[+-]/, '') };
}
const in8 = v => { const n = Math.round(Math.abs(v) * 64); if (!n) return '0'; const w = Math.floor(n / 64); let r = n % 64, d = 64; while (r && r % 2 === 0) { r /= 2; d /= 2; } return (w ? w + (r ? ' ' : '') : '') + (r ? `${r}/${d}` : '') + '"'; };
// Plain info, never a verdict: what each says and the difference in inches.
export function papCompare(profileText, card) {
  const a = papFromText(profileText);
  if (!card) return null;
  if (!a) return { same: false, lines: [`This card: ${papText(card)}.`, profileText ? `Your profile PAP ("${profileText}") is not in a form the app can compare.` : 'No PAP saved on Me yet.'] };
  const dO = card.over - a.over, dU = card.up - a.up;
  const same = Math.abs(dO) < 1 / 128 && Math.abs(dU) < 1 / 128;
  return { same, dOver: dO, dUp: dU, lines: [`Your profile: ${papText(a)}. This card: ${papText(card)}.`,
    same ? 'They match.' : `Difference: ${in8(dO)} ${dO >= 0 ? 'more' : 'less'} over, ${in8(dU)} ${dU >= 0 ? 'higher' : 'lower'}.`] };
}

// Every field on a grip spec card (printed bowlingball.com cards) and on a layout card. kind: text | frac | num | pick.
// Left/right holes are as drawn on the card (thumb at the bottom); the app does not guess which finger is which.
export const GROUPS = [
  ['card', 'Card', [['name', 'Name', 'text'], ['hand', 'Bowling hand', 'pick', ['Right', 'Left']], ['grip', 'Grip style', 'text'], ['notes', 'Notes', 'text']]],
  ['lf', 'Left finger hole (as drawn)', [['lf.size', 'Grip size', 'frac'], ['lf.hole', 'Hole size', 'frac'], ['lf.pitchFR', 'Pitch forward/reverse', 'frac'], ['lf.pitchFRdir', 'Pitch direction', 'pick', ['Forward', 'Reverse']],
    ['lf.pitchLR', 'Pitch left/right', 'frac'], ['lf.pitchLRdir', 'Pitch left/right direction', 'pick', ['Left', 'Right']], ['lf.cut', 'Cut (span to thumb)', 'frac'], ['lf.actual', 'Actual grip span', 'frac']]],
  ['rf', 'Right finger hole (as drawn)', [['rf.size', 'Grip size', 'frac'], ['rf.hole', 'Hole size', 'frac'], ['rf.pitchFR', 'Pitch forward/reverse', 'frac'], ['rf.pitchFRdir', 'Pitch direction', 'pick', ['Forward', 'Reverse']],
    ['rf.pitchLR', 'Pitch left/right', 'frac'], ['rf.pitchLRdir', 'Pitch left/right direction', 'pick', ['Left', 'Right']], ['rf.cut', 'Cut (span to thumb)', 'frac'], ['rf.actual', 'Actual grip span', 'frac']]],
  ['br', 'Bridge', [['bridge', 'Bridge', 'frac']]],
  ['th', 'Thumb', [['th.size', 'Thumb size', 'frac'], ['th.hole', 'Hole size', 'frac'], ['th.insert', 'Insert / hole type', 'text'], ['th.pitchFR', 'Pitch forward/reverse', 'frac'],
    ['th.pitchFRdir', 'Pitch direction', 'pick', ['Forward', 'Reverse']], ['th.pitchLR', 'Pitch left/right', 'frac'], ['th.pitchLRdir', 'Pitch left/right direction', 'pick', ['Left', 'Right']],
    ['th.ovalTo', 'Oval to', 'num'], ['th.ovalAngle', 'Oval angle (degrees)', 'num']]],
  ['pap', 'PAP (positive axis point)', [['pap.over', 'PAP over (inches)', 'frac'], ['pap.up', 'PAP up (+) / down (-) (inches)', 'frac']]],
  ['lay', 'Layout (if the card has one)', [['lay.pinPap', 'Pin to PAP (inches)', 'frac'], ['lay.drillAngle', 'Drilling angle (degrees)', 'num'], ['lay.val', 'VAL angle (degrees)', 'num'],
    ['lay.vls', 'VLS / other layout notation (as written)', 'text'], ['lay.mb', 'Mass bias / balance hole location', 'text'], ['lay.surface', 'Surface (as written)', 'text']]],
];
export const FIELDS = GROUPS.flatMap(([, , f]) => f.map(([k, label, kind, opts]) => ({ k, label, kind, opts })));
export const FIELD = Object.fromEntries(FIELDS.map(f => [f.k, f]));

// Check a value against its field; returns { ok, v, why }. Ranges are physical sanity limits, not advice.
const RANGE = { 'lf.size': [0.2, 2], 'rf.size': [0.2, 2], 'th.size': [0.5, 2], 'lf.hole': [0.2, 1.5], 'rf.hole': [0.2, 1.5], 'th.hole': [0.5, 2], bridge: [0, 1.5],
  'lf.cut': [1, 8], 'rf.cut': [1, 8], 'lf.actual': [1, 8], 'rf.actual': [1, 8], 'pap.over': [0, 8], 'pap.up': [-3, 3], 'lay.pinPap': [0, 8], 'th.ovalTo': [0, 1],
  'th.ovalAngle': [-180, 180], 'lay.drillAngle': [0, 180], 'lay.val': [0, 180] };
export function checkField(k, raw) {
  const f = FIELD[k]; if (!f) return { ok: false, why: 'unknown field' };
  const s = String(raw == null ? '' : raw).trim(); if (!s) return { ok: true, v: '' };
  if (f.kind === 'text') return { ok: s.length <= 200, v: s.slice(0, 200), why: s.length > 200 ? 'too long' : '' };
  if (f.kind === 'pick') { const o = f.opts.find(x => x.toLowerCase() === s.toLowerCase()); return o ? { ok: true, v: o } : { ok: false, why: `one of ${f.opts.join(', ')}` }; }
  const p = parseFrac(s); if (!p) return { ok: false, why: f.kind === 'frac' ? 'a number or fraction, e.g. 5 1/8, 41/64, 1/4+' : 'a number' };
  const r = RANGE[k]; if (r && (p.v < r[0] || p.v > r[1])) return { ok: false, why: `outside ${r[0]} to ${r[1]}` };
  return { ok: true, v: p.txt, n: p.v };
}

// --- OCR words -> guesses. words: [{ text, conf (0-100), x0, y0, x1, y1 }] (Tesseract word boxes). ---
const NUM_RE = /^[+-]?(\d+\/\d+|\d*\.\d+|\d+)\+?$/;
const DEN_RE = /(16|32|64)$/;
const norm = w => String(w.text || '').replace(/(?<=\d)[|]|[|](?=\d)/g, '1').replace(/[Oo](?=\d)|(?<=\d)[Oo]/g, '0').replace(/[\u2044]/g, '/').replace(/[}\])]+$/, '').replace(/\/g$/, '/8');
// OCR often drops the space in a mixed number ("41/8" for 4 1/8). Cards never print improper fractions, so split the
// numerator when that gives a proper fraction over an inch denominator; the value is then marked low-confidence.
const DEN = new Set([2, 4, 8, 16, 32, 64]);
export function splitMixed(t) {
  const m = String(t).match(/^([+-]?)(\d{2,3})\/(\d+)(\+?)$/); if (!m || !DEN.has(+m[3])) return null;
  for (let i = 1; i < m[2].length; i++) { const w = m[2].slice(0, i), n = m[2].slice(i); if (n[0] !== '0' && +n < +m[3]) return `${m[1]}${w} ${n}/${m[3]}${m[4]}`; }
  return null;
}
export function repairMixed(t) {
  const m = String(t).match(/^([+-]?)(\d{2,3})\/(\d+)(\+?)$/); if (!m || !DEN.has(+m[3]) || +m[2] < +m[3]) return null;
  for (let i = 1; i < m[2].length; i++) { const w = m[2].slice(0, i), n = m[2].slice(i); if (n[0] !== '0' && +n < +m[3]) return `${m[1]}${w} ${n}/${m[3]}${m[4]}`; }
  return null;
}
// Join "5" "1/8" (same line, close) into one value token; keep a "+" or "-" just before.
function valueTokens(words) {
  const out = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i], t = norm(w); if (!NUM_RE.test(t)) continue;
    let txt = t, x1 = w.x1, conf = w.conf, x0 = w.x0;
    const nx = words[i + 1], h = (w.y1 - w.y0) || 10;
    if (/^\d+$/.test(t) && nx && NUM_RE.test(norm(nx)) && /\//.test(norm(nx)) && Math.abs(nx.y0 - w.y0) < h * 0.6 && nx.x0 - w.x1 < h * 1.2) { txt += ' ' + norm(nx); x1 = nx.x1; conf = Math.min(conf, nx.conf); i++; }
    const pv = words[out.length ? -1 : i - 1] || words[i - 1];
    if (pv && /^[+-]$/.test(pv.text) && Math.abs(pv.y0 - w.y0) < h * 0.6 && x0 - pv.x1 < h * 1.5) { txt = pv.text + txt; x0 = pv.x0; }
    if (/^\d{3,4}$/.test(txt)) { const m = txt.match(/^(\d{1,2})(16|32|64)$/); if (m && +m[1] < +m[2] && m[1][0] !== '0') { txt = `${m[1]}/${m[2]}`; conf = Math.min(conf, LOW_CONF - 1); } }  // "1516" = 15/16 with the slash lost
    const fix = repairMixed(txt); if (fix) { txt = fix; conf = Math.min(conf, LOW_CONF - 1); }
    out.push({ txt, conf, x0, x1, y0: w.y0, y1: w.y1, cx: (x0 + x1) / 2, cy: (w.y0 + w.y1) / 2, h });
  }
  return out;
}
function phrases(words, re, n = 3) {
  const out = [];
  for (let i = 0; i < words.length; i++) for (let k = 1; k <= n && i + k <= words.length; k++) {
    const seg = words.slice(i, i + k), s = seg.map(w => w.text).join(' ');
    if (Math.max(...seg.map(w => w.y0)) - Math.min(...seg.map(w => w.y0)) > (seg[0].y1 - seg[0].y0)) break;
    if (re.test(s)) { out.push({ x0: seg[0].x0, x1: seg[k - 1].x1, y0: Math.min(...seg.map(w => w.y0)), y1: Math.max(...seg.map(w => w.y1)), conf: Math.min(...seg.map(w => w.conf)) }); break; }
  }
  return out;
}
// Nearest value right of the label on its line, else just below it (overlapping columns).
function near(L, vals, used, { right = true, below = true } = {}) {
  const h = (L.y1 - L.y0) || 10, cy = (L.y0 + L.y1) / 2; let best = null, bd = 1e9;
  for (const v of vals) {
    if (used.has(v)) continue;
    let d = null;
    if (right && Math.abs(v.cy - cy) < h * 0.7 && v.x0 >= L.x1 - h * 0.3 && v.x0 - L.x1 < h * 9) d = v.x0 - L.x1;
    else if (below && v.y0 >= L.y1 - h * 0.3 && v.y0 - L.y1 < h * 2.6 && v.x1 > L.x0 - h * 1.5 && v.x0 < L.x1 + h * 1.5) d = (v.y0 - L.y1) * 2 + Math.abs(v.cx - (L.x0 + L.x1) / 2) * 0.2 + h * 3;
    if (d != null && d < bd) { bd = d; best = v; }
  }
  return best;
}
export const LOW_CONF = 80;
// Returns { fields: { key: { v, conf, low } }, text } — guesses only; the form shows them for the bowler to confirm.
export function parseWords(words, { width } = {}) {
  const W = (words || []).filter(w => w && w.text && Number.isFinite(w.x0));
  const vals = valueTokens(W), used = new Set(), out = {};
  const maxX = width || Math.max(1, ...W.map(w => w.x1)), mid = maxX / 2;
  const put = (k, v, labelConf = 100) => { if (!v) return; let c = checkField(k, v.txt), cap = 100;
    if (!c.ok) { const alt = splitMixed(v.txt); if (alt) { c = checkField(k, alt); cap = LOW_CONF - 1; } }   // "11/64" where a thumb needs 1 1/64
    if (!c.ok || c.v === '') return; used.add(v);
    const conf = Math.round(Math.min(v.conf, labelConf, cap)); out[k] = { v: c.v, conf, low: conf < LOW_CONF }; };
  const side = L => ((L.x0 + L.x1) / 2 < mid ? 'lf' : 'rf');
  const label = (re, n) => phrases(W, re, n);
  // single-value labels first (unambiguous)
  for (const [re, k, o] of [[/oval\s*to:?$/i, 'th.ovalTo'], [/oval\s*angle:?$/i, 'th.ovalAngle'], [/^pap\s*over:?$/i, 'pap.over'], [/^pap\s*up/i, 'pap.up'],
    [/^thumb\s*size$/i, 'th.size'], [/^pin\s*to\s*pap:?$/i, 'lay.pinPap'], [/^drill(ing)?\s*angle:?$/i, 'lay.drillAngle'], [/^val(\s*angle)?:?$/i, 'lay.val']]) {
    const L = label(re, 4)[0]; if (L) put(k, near(L, vals, used, o), L.conf);
  }
  // PAP up/down value may sit on the line below "Down(-):"
  if (!out['pap.up']) { const L = label(/^down\(?-?\)?:?$/i, 1)[0]; if (L) put('pap.up', near(L, vals, used), L.conf); }
  for (const L of label(/^grip\s*size$/i, 2)) put(side(L) + '.size', near(L, vals, used), L.conf);
  // "Pitch" under each grip size is the left/right (lateral) pitch; the number by "Reverse/Forward" beside a hole is the
  // forward/reverse pitch. Directions are arrows on the card, so they are left for the bowler to pick.
  for (const L of label(/^pitch$/i, 1)) put(side(L) + '.pitchLR', near(L, vals, used, { right: false }), L.conf);
  for (const L of label(/^cut$/i, 1)) { const v = vals.filter(x => !used.has(x) && x.y1 <= L.y0 + 2 && L.y0 - x.y1 < (L.y1 - L.y0) * 2 && Math.abs(x.cx - (L.x0 + L.x1) / 2) < (L.y1 - L.y0) * 4)[0]; put(side(L) + '.cut', v, L.conf); }
  for (const L of label(/^actual\s*grip$/i, 2)) { const v = vals.filter(x => !used.has(x) && x.y1 <= L.y0 + 2 && L.y0 - x.y1 < (L.y1 - L.y0) * 2 && Math.abs(x.cx - (L.x0 + L.x1) / 2) < (L.y1 - L.y0) * 5)[0]; put(side(L) + '.actual', v, L.conf); }
  // Hole sizes: the finger holes sit in the upper half, the thumb lower; a value just under each "Hole Size".
  const holes = label(/^\W*hole\s*size$/i, 2).sort((a, b) => a.y0 - b.y0);
  if (holes.length) {
    const lowest = holes[holes.length - 1], thumbY = holes.length >= 3 ? lowest.y0 : Infinity;
    for (const L of holes) { const k = L.y0 >= thumbY ? 'th.hole' : side(L) + '.hole'; put(k, near(L, vals, used, { right: false }), L.conf); }
  }
  const above = (L, k, f = 4) => vals.filter(x => !used.has(x) && x.y1 <= L.y0 + 2 && L.y0 - x.y1 < (L.y1 - L.y0) * 1.6 && Math.abs(x.cx - (L.x0 + L.x1) / 2) < (L.y1 - L.y0) * f).sort((a, b) => b.y1 - a.y1)[0];
  const B = label(/^\W*bridge\W*$/i, 1)[0]; if (B) put('bridge', above(B, 'bridge', 2) || near(B, vals, used, { right: false }), B.conf);
  const TS = label(/^thumb\s*size$/i, 2)[0];
  const thumbY = Math.min(holes.length >= 3 ? holes[holes.length - 1].y0 : Infinity, TS ? TS.y0 - (TS.y1 - TS.y0) * 2 : Infinity);
  const thumbHole = Number.isFinite(thumbY) ? { y0: thumbY } : null;
  for (const L of label(/^reverse/i, 1)) {
    if (thumbHole && L.y0 > thumbHole.y0 - (L.y1 - L.y0)) put('th.pitchFR', near(L, vals, used, { right: false }), L.conf);
    else put(side(L) + '.pitchFR', above(L, 'p', 3), L.conf);
  }
  const LR = label(/^left$/i, 1).find(L => thumbHole && L.y0 > thumbHole.y0); if (LR) put('th.pitchLR', near(L2(LR), vals, used, { right: false }), LR.conf);
  // Text fields from "Label: value" lines.
  const lines = linesOf(W, 10);
  for (const ln of lines) {
    let m;
    if (!out.name && (m = ln.text.match(/^(?:\S*\s)?name:?\s+(.{2,60})$/i))) out.name = { v: m[1].trim(), conf: ln.conf, low: ln.conf < LOW_CONF };
    if (!out.hand && (m = ln.text.match(/hand:?\s+(right|left)\b/i))) out.hand = { v: m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(), conf: ln.conf, low: ln.conf < LOW_CONF };
    if (!out.grip && (m = ln.text.match(/^(?:\S*\s)?(?:grip|g):?\s+(finger(?:tip)?|conventional|semi[- ]?finger|sarge easter)\b/i))) out.grip = { v: m[1], conf: ln.conf, low: ln.conf < LOW_CONF };
    if (!out.notes && (m = ln.text.match(/notes:?\s+(.{2,200})$/i))) out.notes = { v: m[1].trim(), conf: ln.conf, low: ln.conf < LOW_CONF };
    if (!out['th.insert'] && (m = ln.text.match(/\b(standard|oval|vise|turbo|insert|slug)\b/i)) && /hole\s*size|\d\s*\d\/\d/i.test(ln.text) === false && ln.text.split(' ').length <= 2) out['th.insert'] = { v: m[1], conf: ln.conf, low: ln.conf < LOW_CONF };
  }
  return { fields: out, text: lines.map(l => l.text).join('\n') };
}
const L2 = L => ({ ...L, x1: L.x1 + (L.x1 - L.x0) * 3 });   // "Left <-> Right": the value sits under the whole phrase
export function linesOf(W, gap = 3) {
  const s = [...W].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0), out = [];
  for (const w of s) { const h = (w.y1 - w.y0) || 10, L = out.find(l => Math.abs(l.cy - (w.y0 + w.y1) / 2) < h * 0.5 && w.x0 - l.x1 < h * gap);
    if (L) { L.words.push(w); L.x1 = Math.max(L.x1, w.x1); } else out.push({ words: [w], cy: (w.y0 + w.y1) / 2, x1: w.x1 }); }
  return out.map(l => { l.words.sort((a, b) => a.x0 - b.x0); return { text: l.words.map(w => w.text).join(' '), conf: Math.round(Math.min(...l.words.map(w => w.conf))) }; });
}

// What gets saved on the ball (ownedBall.edited { fields: { drill } }): only confirmed fields, each with where it came from.
export function cardRecord(entries, { now = Date.now() } = {}) {
  const fields = {};
  for (const [k, e] of Object.entries(entries || {})) {
    const c = checkField(k, e && e.v); if (!c.ok || c.v === '') continue;
    fields[k] = { v: c.v, src: e.src === 'card' ? 'card' : 'typed' };
  }
  const pap = papOf(fields['pap.over'] && fields['pap.over'].v, fields['pap.up'] && fields['pap.up'].v);
  return { v: 1, savedAt: new Date(now).toISOString(), fields, pap: pap ? { over: pap.over, up: pap.up, text: papText(pap), convention: 'up +, down -' } : null };
}
export const provLabel = src => (src === 'card' ? 'read from card' : 'typed');
