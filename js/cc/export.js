// "Export my arsenal" (owner item E, 2026-10-30): one model behind the printed Arsenal sheet, the bag share card and
// the arsenal CSV. Pure, no DOM. Only what is on file is shown: catalogue specs (or the specs the bowler typed in),
// the bowler's own Status, the saved bag, and games the bowler logged with frames. Nothing is estimated or filled in.
import { records, milestones, TEAM } from './armory.js';
import * as ST from './status.js';
const GROUPS = ST.STATUS;   // In my bag, At home, At the pro shop, Retired (the four bowler words)
const pad = n => String(n).padStart(2, '0');
const day = ts => { if (!(Number.isFinite(+ts) && +ts > 0)) return ''; const d = new Date(+ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };   // the bowler's local date
const num = v => (v == null || v === '' ? null : v);
const coverKind = c => !c || !c.cover ? '' : /solid/i.test(c.cover) ? 'Solid' : /pearl/i.test(c.cover) ? 'Pearl' : /hybrid/i.test(c.cover) ? 'Hybrid' : /urethane/i.test(c.cover) ? 'Urethane' : c.cover;
// Surface: the bowler's own finish if they set one, else the box finish from the maker.
export function surfaceOf(o, c) {
  const f = o && o.finish;
  if (f && f !== 'factory') return f === 'polished' ? 'Polished' : /^\d+$/.test(String(f)) ? `${f} grit` : String(f);
  return c && c.finish ? `Box: ${c.finish}` : 'Box finish';
}
// One row per owned ball.
export function ballRow(P, id, o, catOf, rec) {
  const c = catOf(o.catalogId), r = rec[id] || null, own = !!(o.spec && o.spec.cat);
  return { id, name: o.name || (c && c.name) || 'Ball', brand: (c && c.brand) || '', benchmark: !!o.benchmark, status: ST.statusOf(o),
    cover: c ? [c.coverName, coverKind(c)].filter(Boolean).join(' \u00b7 ') : '', coverKind: coverKind(c), surface: surfaceOf(o, c),
    core: c ? [c.coreName, c.core].filter(Boolean).join(' \u00b7 ') : '', rg: c ? num(c.rg) : null, diff: c ? num(c.diff) : null, role: (c && c.role) || '',
    color: (c && c.color) || null, games: r ? r.games : 0, complete: r ? r.complete : 0, avg: r && r.complete ? Math.round(r.sum / r.complete) : null,
    best: r ? r.best : null, earned: milestones(r), added: day(o.createdTs), src: own ? 'you' : c ? 'maker' : 'none' };
}
// The sheet: header facts (only the ones entered), balls grouped by Status, tonight's bag, Hall of Fame, milestones.
export function sheetModel(P, prof, { catOf, now = Date.now(), version = '' } = {}) {
  const p = prof || {}, ent = p.entered || null, has = k => !ent || ent[k];
  const b = (P && P.bowler) || {}, nm = b.name && typeof b.name === 'object' ? b.name.v : b.name;
  const hand = (p.hand === 'left' || p.hand === 'right') && has('hand') ? (p.hand === 'left' ? 'Left-handed' : 'Right-handed') : null;
  const facts = [];
  if (hand) facts.push(['Hand', hand]);
  if (has('speed') && Number.isFinite(+p.speed) && p.speed !== '' && p.speed != null) facts.push(['Speed', `${(+p.speed).toFixed(1)} mph`]);
  if (has('rev') && Number.isFinite(+p.rev) && p.rev !== '' && p.rev != null) facts.push(['Rev rate', `${Math.round(+p.rev)} rpm`]);
  if (p.pap) facts.push(['PAP', String(p.pap)]);
  const rec = records(P), rows = Object.entries((P && P.owned) || {}).map(([id, o]) => ballRow(P, id, o, catOf, rec))
    .sort((a, b) => (b.benchmark - a.benchmark) || a.name.localeCompare(b.name));
  const bag = ST.currentBag(P), packed = ST.packedIds(P, bag);
  for (const r of rows) r.inTonightBag = packed.includes(r.id);
  const groups = GROUPS.map(([key, label]) => ({ key, label, rows: rows.filter(r => r.status === key) })).filter(g => g.rows.length);
  const bagRows = packed.map(id => rows.find(r => r.id === id)).filter(Boolean);
  const earned = rows.filter(r => r.earned.length).map(r => ({ id: r.id, name: r.name, marks: r.earned.map(m => m.text) }));
  return { team: TEAM, name: nm && String(nm).trim() ? String(nm).trim() : null, facts, date: day(now), groups, rows, bag: bagRows,
    bagSaved: bag ? day(bag.ts) : null, hall: rows.filter(r => r.status === 'retired'), earned, version,
    sources: { maker: rows.some(r => r.src === 'maker'), you: rows.some(r => r.src === 'you'), games: rows.some(r => r.games) } };
}
export const fmtRG = v => (v == null ? 'TBD' : Number(v).toFixed(2));
export const fmtDiff = v => (v == null ? 'TBD' : Number(v).toFixed(3));
export const avgText = r => (r.avg == null ? '' : `${r.avg} (n ${r.complete})`);
export const gamesText = r => (r.games ? String(r.games) : '');
// The arsenal CSV (cells go through data/csv.js toCSV in the screen, which guards formulas).
export const ARSENAL_CSV_HEAD = ['status', 'in_tonights_bag', 'name', 'brand', 'cover', 'surface', 'core', 'rg', 'diff', 'role', 'games', 'complete_games', 'average', 'best', 'date_added', 'spec_source'];
export function arsenalRows(m) {
  const out = [ARSENAL_CSV_HEAD];
  for (const g of m.groups) for (const r of g.rows) out.push([g.label, r.inTonightBag ? 'yes' : 'no', r.name, r.brand, r.cover, r.surface, r.core, r.rg == null ? '' : r.rg, r.diff == null ? '' : r.diff,
    r.role, r.games || '', r.complete || '', r.avg == null ? '' : r.avg, r.best == null ? '' : r.best, r.added, r.src === 'you' ? 'entered by you' : r.src === 'maker' ? 'maker spec' : '']);
  return out;
}
export const fileStem = (m, kind) => `arsenal-${kind}-${m.date || 'export'}`;
