#!/usr/bin/env node
// Builds spec_fill.json + still_missing.csv + counts from the catalog rows, the USBC list snapshot and the hand-reviewed fills below.
// Research of 2026-11-12 (owner t138u). Nothing here changes maker_rows.json; the owner integrates spec_fill.json after review.
// Usage: node tools/catalog/spec_fill_build.mjs  (reads research_cache/usbc_approved.json, research_cache/wb/index.json when present)
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { SPEC_ROWS as R } from '../../js/data/spec_catalog.js';
import { matchUsbc, nn } from './usbc_match.mjs';
const require = createRequire(import.meta.url);
const ROOT = new URL('../../', import.meta.url).pathname, ACCESSED = '2026-11-12';
const USBC_URL = 'https://bowl.com/getmedia/8b570e80-761c-4486-8628-9d50d718dd60/approved_balllist_CURRENT.pdf';
const usbc = JSON.parse(fs.readFileSync(ROOT + 'research_cache/usbc_approved.json', 'utf8'));
const idOf = r => 'sc-' + nn(r.brand + ' ' + r.name).replace(/ /g, '-');
const KEYS = ['rg', 'diff', 'coverstock', 'coverType', 'core', 'finish', 'symmetry', 'release'];
const plastic = r => /plastic|polyester|clear poly|\bpoly\b|viz-?a-?ball/i.test([r.coverType, r.coverstock, r.name].join(' '));
const ownUrl = r => (r.specStatus === 'archive' ? r.original : r.page || r.source);

// ---- curated USBC aliases: catalogue name -> exact USBC list name (colourway wording differs; each read by hand, same colours, same line)
const USBC_ALIAS = {
  'Brunswick|Rhino Cobalt Teal Aqua Pearl': 'Rhino Cobalt/Aqua/Teal',
  'Epic|Curve Candy Ice': 'Curve Blue-Pink-White (Candy Ice)', 'Epic|Curve Darkness': 'Curve Black-Blue-Purple (Darkness)',
  'Epic|Curve Midnight Apple Gold': 'Curve Red-Black Gold (Midnight-Apple-Gold)', 'Epic|Curve Polar Ice': 'Curve Blue-Teal-White (Polar Ice)',
  'Epic|Ignite Hybrid Orange Smoke': 'Ignite Orange-Black (Orange-Smoke)', 'Epic|Ignite Pearl Arctic Rose': 'Ignite Black-White-Pink (Arctic-Pearl-Rose)',
  'Epic|Ignite Solid Ocean Candy Metallic': 'Ignite Black-Blue-Pink (Ocean-Candy-Metallic)', 'Epic|Ignite Solid Red White Black': 'Ignite Red-White-Black',
  'KR Strikeforce|Rise Purple Black Solid': 'Rise Black-Purple Solid',
  'Motiv|Ascend Black Green Teal Pearl': 'Ascend Black/Green/Teal', 'Motiv|Ascend Navy Teal Yellow Pearl': 'Ascend Navy/Teal/Yellow',
  'Motiv|Ascend Purple Blue Pearl': 'Ascend Dark Purple/Purple/Blue', 'Motiv|Ascend Red Black Tangerine Pearl': 'Ascend Red/Black/Tangerine',
  'Storm|Clear Teal': 'Clear Storm Teal',
  'SWAG|Dragon Cotton Candy Poly': 'Dragon Poly Cotton Candy', 'SWAG|Dragon Midnight Poly': 'Dragon Poly Midnight',
  '900 Global|Honey Badger': 'HB (Honey Badger)',
};
const UBR = { 'KR Strikeforce': ['Strikeforce', 'KRSF'], Epic: ['Epic Bowling'], Track: ['Track Inc.'], SWAG: ['Swag'] };
const usbcFor = r => {
  const auto = matchUsbc([r], usbc)[0].hits; if (auto.length) return { hits: auto, how: 'exact name match' };
  const al = USBC_ALIAS[r.brand + '|' + r.name]; if (!al) return null;
  const bs = new Set((UBR[r.brand] || [r.brand]).map(nn)), hits = usbc.filter(u => bs.has(nn(u.brand)) && u.name === al);
  return hits.length ? { hits, how: `matched by hand to the list's "${al}"` } : null;
};

// ---- fills read from a maker page (live or saved copy) that the catalogue row did not have
const MAKER_FILLS = [
  { brand: 'Motiv', name: 'Venom Shock', field: 'coverType', value: 'Solid', url: 'https://www.motivbowling.com/products/balls/light-medium-oil/venom-shock.html', type: 'maker', derived: true,
    note: 'Cover Stock line on the maker page reads "Turmoil\u2122 MFS Solid Reactive"; cover type read from that printed wording (no separate Cover Type cell).' },
];
// ---- same maker, same core name, symmetry printed on another page: NOT applied automatically (candidates for the owner to accept)
const SIBLING = [
  { brand: 'Roto Grip', name: 'Hustle Ink', field: 'symmetry', value: 'Symmetric', core: 'Hustle', from: 'Roto Grip Hustle (core "Hustle")' },
];
// ---- public third-party figures whose provenance could not be verified (NOT applied, NOT counted): the owner decides
const UNVETTED = R.filter(r => r.brand === 'KR Strikeforce' && /^Rise /.test(r.name) && (r.rg == null || r.diff == null)).map(r => ({ id: idOf(r), brand: r.brand, name: r.name,
  fields: { rg: 2.53, diff: 0.047, weight: 15, symmetry: 'Symmetric' }, source: 'https://www.carrydown.com/balls/kr-strikeforce-rise/', sourceType: 'secondary', accessed: ACCESSED, applied: false,
  why: 'CarryDown says its specs come from maker sites, but krstrikeforce.com prints no RG/differential/symmetry for the Rise, and the same numbers appear on a banned site (bowwwl), so their origin cannot be verified. Core "Launch" is printed on the maker page; its symmetric type is only stated by the third party.' }));
// ---- Wayback copies read (fill-only; produced by research_cache/wayback.py + the parser); empty when none had a new value
let WB = [];
try { WB = JSON.parse(fs.readFileSync(ROOT + 'research_cache/wb_fills.json', 'utf8')); } catch (e) { /* none */ }

const fills = new Map(), sib = [];
const entry = r => { const id = idOf(r); if (!fills.has(id)) fills.set(id, { id, brand: r.brand, name: r.name, fields: {}, notes: [] }); return fills.get(id); };
for (const r of R) {
  if (!KEYS.some(k => r[k] == null)) continue;
  const u = usbcFor(r);
  if (u) { const e = entry(r), ds = [...new Set(u.hits.map(h => h.approved))].sort();
    e.fields.usbcApproved = { value: ds[0], allDates: ds, sourceType: 'usbc', source: USBC_URL, listDate: '2026-11-10', accessed: ACCESSED, derived: false, match: u.how };
    e.notes.push('usbcApproved is the USBC approval date, not the maker release date; it is not a value for the release field.'); }
}
for (const f of MAKER_FILLS) { const r = R.find(x => x.brand === f.brand && x.name === f.name); if (!r || r[f.field] != null) continue;
  const e = entry(r); e.fields[f.field] = { value: f.value, sourceType: f.type, source: f.url, accessed: ACCESSED, derived: !!f.derived }; e.notes.push(f.note); }
for (const f of WB) { const r = R.find(x => x.brand === f.brand && x.name === f.name); if (!r || r[f.field] != null) continue;
  const e = entry(r); e.fields[f.field] = { value: f.value, sourceType: 'archived-maker', source: f.snapshot, original: f.original, accessed: ACCESSED, capturedAt: f.capturedAt }; if (f.note) e.notes.push(f.note); }
for (const f of SIBLING) { const r = R.find(x => x.brand === f.brand && x.name === f.name); if (r && r[f.field] == null) sib.push({ id: idOf(r), brand: r.brand, name: r.name, field: f.field, value: f.value, basis: `same maker, same core name (${f.core}); printed as ${f.value} on ${f.from}`, applied: false }); }

// ---- reasons for what stays missing
const why = (r, k) => {
  const p = plastic(r), b = r.brand;
  if (/^(Epic|SWAG)$/.test(b) && (k === 'rg' || k === 'diff' || k === 'release')) return `${b} page prints no ${k === 'release' ? 'release date' : 'RG/differential'}; ${b}'s terms bar automated access, so no further reads were made`;
  if (b === 'KR Strikeforce' && p) return 'polyester spare ball: the maker lists no core numbers or finish';
  if (b === 'KR Strikeforce') return k === 'release' ? 'maker page prints no release date' : 'KR Strikeforce prints no RG/differential or symmetry (core "Launch"); only banned or unvetted third-party pages have numbers';
  if (b === '900 Global' && r.name === 'Honey Badger') return 'maker tech sheet is not in the Wayback Machine (page and tech-sheet URL checked); the maker page lists no RG/differential';
  if (b === '900 Global' && r.name === 'Sublime') return 'release date not printed on the sources used';
  if (k === 'release') return 'maker page prints no release date' + (r.__u ? '; USBC approval date supplied separately' : '');
  if (p && (k === 'rg' || k === 'diff')) return 'polyester spare ball: the maker prints no RG/differential (info sheet and ball talker checked)';
  if (p) return 'polyester spare ball: not printed by the maker';
  if (k === 'symmetry') return 'maker prints the core name but not symmetric/asymmetric (page and info sheet checked); not guessed';
  if (k === 'rg' || k === 'diff') return 'maker does not publish RG/differential for this ball (info sheet checked)';
  if (k === 'finish') return 'finish not printed as text on the maker page';
  if (k === 'coverType') return 'cover type not printed; coverstock name does not state it';
  return 'not printed by the maker';
};
const filledKey = (id, k) => { const e = fills.get(id); return !!(e && e.fields[k === 'release' ? 'releaseDate' : k] && k !== 'release'); };
const missCsv = [['id', 'brand', 'name', 'missing_field', 'reason', 'plastic_spare', 'usbc_approved_available', 'maker_url_checked']];
const after = R.map(r => { const e = fills.get(idOf(r)), c = Object.assign({}, r); if (e) for (const [k, x] of Object.entries(e.fields)) if (KEYS.includes(k) && c[k] == null) c[k] = x.value; return c; });
for (const r of after) for (const k of KEYS) if (r[k] == null) { const e = fills.get(idOf(r)); r.__u = !!(e && e.fields.usbcApproved);
  missCsv.push([idOf(r), r.brand, r.name, k, why(r, k), plastic(r) ? 'yes' : 'no', e && e.fields.usbcApproved ? e.fields.usbcApproved.value : '', ownUrl(r)]); }
const q = s => '"' + String(s).replace(/"/g, '""') + '"';
fs.writeFileSync(ROOT + 'still_missing.csv', missCsv.map(row => row.map(q).join(',')).join('\n') + '\n');

// ---- counts, the same way as the v73 report
const CORE = ['rg', 'diff', 'coverstock', 'coverType', 'core', 'finish', 'symmetry', 'weight'];
const count = rows => ({ rows: rows.length, anyCoreSpecMissing: rows.filter(r => CORE.some(k => r[k] == null)).length, rgOrDiffMissing: rows.filter(r => r.rg == null || r.diff == null).length,
  rgOrDiffMissingNonPlastic: rows.filter(r => (r.rg == null || r.diff == null) && !plastic(r)).length, releaseMissing: rows.filter(r => r.release == null).length });
const before = count(R), aft = count(after);
const bySource = {}; let nFields = 0;
for (const e of fills.values()) for (const x of Object.values(e.fields)) { bySource[x.sourceType] = (bySource[x.sourceType] || 0) + 1; nFields++; }
const releaseFilledFromMaker = [...fills.values()].filter(e => e.fields.release).length;
const out = { generated: ACCESSED, note: 'Facts only. Every value has its own source URL and type. usbcApproved is an approval date, not a release date. Nothing here is applied to maker_rows.json yet.',
  sourceTypes: { maker: 'maker page or maker spec sheet', 'archived-maker': 'Wayback Machine copy of the maker page', usbc: 'USBC Approved Ball List (bowl.com)', secondary: 'public secondary source, not the maker', forum: 'name-only, unverified' },
  counts: { before, after: aft, fieldsFilled: nFields, fieldsBySourceType: bySource, rowsWithAnyFill: fills.size, rowsWithUsbcApproval: [...fills.values()].filter(e => e.fields.usbcApproved).length },
  siblingSymmetryCandidates: sib, unvettedThirdParty: UNVETTED, fills: [...fills.values()].map(e => Object.assign(e, { notes: e.notes.join(' ') })) };
fs.writeFileSync(ROOT + 'spec_fill.json', JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out.counts, null, 1), '\nstill missing field-rows:', missCsv.length - 1);
