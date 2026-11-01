// "Export my arsenal" (owner item E): one sheet of options reachable from Arsenal and More > Your data, the printable
// Arsenal sheet (#/arsenal/sheet, window.print with @media print), the bag share card (canvas PNG through the share
// sheet or a download), the arsenal CSV and the full backup (the existing backup code).
import { h, toast, sheet } from '../ui.js';
import { go } from '../router.js';
import { ready, proj } from '../hub.js';
import { profile, prefs } from '../store.js';
import { catOf } from '../cc/cats.js';
import * as X from '../cc/export.js';
import { toCSV } from '../data/csv.js';
import * as PR from '../cc/protect.js';
import { VERSION } from './more.js';
import * as K from './cards.js';
import * as C from '../cc/community.js';
const model = () => X.sheetModel(proj(), profile(), { catOf, version: VERSION });
function save(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function saveCsv(m = model()) {
  const rows = X.arsenalRows(m); save(new Blob(['\ufeff' + toCSV(rows)], { type: 'text/csv' }), X.fileStem(m, 'list') + '.csv');
  toast(`Saved ${rows.length - 1} ball${rows.length === 2 ? '' : 's'} as CSV`);
}
// ---- share card: the current bag on a 1080 x 1350 canvas (frame in js/screens/cards.js). Refined 2026-10-31: role and the
// bowler's own reason per ball (My Team "why"), tags; no averages on a shared picture (non-evaluative; the sheet keeps them).
export function drawCard(m, canvas = document.createElement('canvas'), { why = prefs().teamWhy || {}, tags = [] } = {}) {
  const list = m.bag.length ? m.bag : (m.groups.find(g => g.key === 'inBag') || { rows: [] }).rows;
  const sub = [m.facts.filter(f => f[0] !== 'PAP').map(f => f[1]).join(' \u00b7 '), tags.join(' \u00b7 '), m.bag.length && m.bagSaved ? 'Bag saved ' + m.bagSaved : m.date].filter(Boolean).join('  |  ');
  const c = K.frame(canvas, { eyebrow: m.team, title: (m.name ? m.name + '\u2019s ' : 'My ') + (m.bag.length ? 'bag' : 'balls in the bag'), sub,
    note: 'Specs from the maker' + (m.sources.you ? ' or entered by the bowler' : '') });
  const { PAD: P, W, FONT, fit } = K, shown = list.slice(0, 6), rowH = 148, top = 330;
  if (!shown.length) { c.fillStyle = '#fff'; c.font = `600 40px ${FONT}`; c.fillText('No balls in the bag yet.', P, top + 80); }
  shown.forEach((r, i) => {
    const y = top + i * rowH, cy = y + 62, x = P + 112, w = W - x - P;
    K.panel(c, P - 16, y, W - 2 * P + 32, rowH - 18); K.orb(c, P + 44, cy, 40, r.color);
    c.fillStyle = '#fff'; c.font = `800 40px ${FONT}`; c.fillText(fit(c, (r.benchmark ? '\u2605 ' : '') + r.name, w), x, cy - 8);
    c.fillStyle = K.GOLD; c.font = `600 28px ${FONT}`;
    const spec = [r.brand, r.coverKind, r.rg != null ? 'RG ' + X.fmtRG(r.rg) : '', r.diff != null ? 'Diff ' + X.fmtDiff(r.diff) : ''].filter(Boolean).join(' \u00b7 ');
    c.fillText(fit(c, spec || 'Specs not entered', w), x, cy + 30);
    const third = [r.role, why[r.id] ? '\u201c' + why[r.id] + '\u201d' : ''].filter(Boolean).join(' \u00b7 ');
    if (third) { c.fillStyle = 'rgba(255,255,255,.78)'; c.font = `500 24px ${FONT}`; c.fillText(fit(c, third, w), x, cy + 62); }
  });
  if (list.length > shown.length) { c.fillStyle = '#fff'; c.font = `600 30px ${FONT}`; c.fillText(`+ ${list.length - shown.length} more`, P, top + shown.length * rowH + 30); }
  return canvas;
}
const tagWords = () => C.tagsOf(profile() || {}, prefs().tags || {}).map(t => C.TAG_LABEL[t]);
export async function shareCard(m = model()) { return K.sharePng(drawCard(m, undefined, { tags: tagWords() }), X.fileStem(m, 'bag') + '.png', 'My bag', 'Bag card saved as an image.'); }
export async function shareOldFriends(m = model()) { return K.sharePng(K.drawOldFriends(m), X.fileStem(m, 'old-friends') + '.png', 'Old Friends', 'Old Friends card saved as an image.'); }
// The options sheet (Arsenal header button, More > Your data).
export async function openExport() {
  await ready(); const m = model(), n = m.rows.length;
  let s = null;
  const opt = (id, label, sub, fn) => h('button', { class: 'btn ghost block exp-opt', id, onclick: async () => { await fn(); } }, h('span', { class: 'exp-l' }, h('b', { text: label }), h('small', { class: 'muted', text: sub })));
  s = sheet({ title: 'Export my arsenal', id: 'expSheet', body: h('div', { class: 'stack' },
    h('p', { class: 'small muted', text: n ? `${n} ball${n === 1 ? '' : 's'} on file${m.bag.length ? `, ${m.bag.length} in tonight\u2019s bag` : ''}.` : 'No balls on file yet. Add a ball first.' }),
    opt('expSheetBtn', 'Arsenal sheet', 'Print it or save as PDF', () => { s.close(); go('#/arsenal/sheet'); }),
    opt('expCard', 'Bag card (image)', 'Share or save a picture of your bag', async () => { await shareCard(m); }),
    m.hall.length ? opt('expOld', 'Old Friends card (image)', 'Your retired balls and the games you bowled together', async () => { await shareOldFriends(m); }) : null,
    opt('expCsv', 'Arsenal list (CSV)', 'Opens in Excel, Numbers or Sheets', () => saveCsv(m)),
    opt('expBackup', 'Full backup (JSON)', 'Everything, to restore on another phone', async () => { const db = await ready(); await PR.saveBackupFile(db, prefs()); toast('Backup file saved.'); })) });
  return s;
}
// ---- #/arsenal/sheet
const cell = (t, cls) => h('td', { class: cls || null, text: t == null ? '' : String(t) });
function table(g) {
  return h('table', { class: 'ps-table', 'data-group': g.key },
    h('thead', {}, h('tr', {}, ...['Ball', 'Cover', 'Surface', 'Core', 'RG', 'Diff', 'Role', 'Games', 'Avg (n)', 'Added'].map((t, i) => h('th', { class: i >= 4 && i <= 5 || i >= 7 && i <= 8 ? 'n' : null, text: t })))),
    h('tbody', {}, ...g.rows.map(r => h('tr', { class: r.inTonightBag ? 'bag' : null, 'data-own': r.id },
      h('td', { class: 'ps-ball' }, h('span', { class: 'ps-dot', style: { background: r.color || '#888' } }), h('b', { text: (r.benchmark ? '\u2605 ' : '') + r.name + (r.src === 'you' ? ' \u2020' : '') }), r.brand ? h('small', { text: r.brand }) : null, r.inTonightBag ? h('span', { class: 'ps-tag', text: 'Tonight\u2019s bag' }) : null),
      cell(r.cover), cell(r.surface), cell(r.core), cell(r.src === 'none' ? '' : X.fmtRG(r.rg), 'n'), cell(r.src === 'none' ? '' : X.fmtDiff(r.diff), 'n'), cell(r.role), cell(X.gamesText(r), 'n'), cell(X.avgText(r), 'n'), cell(r.added, 'n d')))));
}
export async function render() {
  await ready(); const m = model();
  const facts = m.facts.length ? m.facts : [['Profile', 'not entered']];
  const paper = h('article', { class: 'ps-paper', id: 'arsSheet' },
    h('header', { class: 'ps-head' }, h('div', { class: 'ps-brand' }, h('span', { class: 'ps-team', text: m.team }), h('h1', { class: 'ps-title', text: 'Arsenal sheet' })),
      h('div', { class: 'ps-who' }, m.name ? h('div', { class: 'ps-name', text: m.name }) : null, h('div', { class: 'ps-date', text: 'Printed ' + m.date }))),
    h('dl', { class: 'ps-facts', id: 'psFacts' }, ...facts.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })])),
    h('section', { class: 'ps-bag', id: 'psBag' }, h('h2', { text: 'Tonight\u2019s bag' + (m.bagSaved ? ' \u00b7 saved ' + m.bagSaved : '') }),
      m.bag.length ? h('ol', {}, ...m.bag.map(r => h('li', {}, h('span', { class: 'ps-dot', style: { background: r.color || '#888' } }), h('b', { text: r.name }), h('small', { text: [r.coverKind, r.role].filter(Boolean).join(' \u00b7 ') }))))
        : h('p', { class: 'ps-muted', text: 'No bag saved yet. Build one on Bag.' })),
    ...(m.groups.length ? m.groups.map(g => h('section', { class: 'ps-group', 'data-group': g.key }, h('h2', { text: `${g.label} \u00b7 ${g.rows.length}` }), h('div', { class: 'ps-tscroll', tabindex: '0', role: 'region', 'aria-label': `${g.label} table` }, table(g))))
      : [h('p', { class: 'ps-muted', text: 'No balls on file yet.' })]),
    h('section', { class: 'ps-hof', id: 'psHof' }, h('h2', { text: 'Old Friends and milestones' }),
      m.hall.length ? h('ul', {}, ...m.hall.map(r => h('li', {}, h('b', { text: r.name }), ` retired \u00b7 ${r.games ? r.games + ' games' : 'no games logged'}${r.best != null ? ' \u00b7 best ' + r.best : ''}`))) : h('p', { class: 'ps-muted', text: 'No retired balls.' }),
      m.earned.length ? h('ul', { class: 'ps-marks' }, ...m.earned.map(e => h('li', {}, h('b', { text: e.name }), ' ' + e.marks.join(' \u00b7 ')))) : h('p', { class: 'ps-muted', text: 'Milestones appear from games logged with frames.' })),
    h('footer', { class: 'ps-foot', id: 'psFoot' },
      h('p', { text: 'Specs: manufacturer data in the Arsenal Pro catalogue' + (m.sources.you ? '; \u2020 specs entered by the bowler from the box or the maker page' : '') + '. TBD = not published or not entered.' }),
      h('p', { text: 'Games and averages: only games logged with frames in Arsenal Pro, credited to the ball that threw the most first balls; n = complete games. Surface: the bowler\u2019s own finish, else the box finish. Status and bag: as set by the bowler.' }),
      h('p', { text: m.team && m.team !== 'Arsenal Pro' ? `Arsenal Pro ${m.version} \u00b7 ${m.team}` : `Arsenal Pro ${m.version}` })));
  const el = h('section', { class: 'screen list-screen ps-screen' },
    h('header', { class: 'appbar no-print' }, h('a', { class: 'btn ghost sm', href: '#/bag?view=all', id: 'psBack' }, 'Back'), h('h1', { class: 'title', text: 'Sheet' }),
      h('div', { class: 'appbar-actions' }, h('button', { class: 'btn primary sm', id: 'psPrint', 'aria-label': 'Print or save as PDF', onclick: () => window.print() }, 'Print'))),
    h('p', { class: 'small muted no-print ps-hint', text: 'Prints on Letter or A4. In the print dialog choose \u201cSave as PDF\u201d to keep a file.' }),
    h('div', { class: 'ps-scroll', tabindex: '0', role: 'region', 'aria-label': 'Arsenal sheet preview' }, paper));
  return { el, title: 'Arsenal sheet' };
}
