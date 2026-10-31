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
const model = () => X.sheetModel(proj(), profile(), { catOf, version: VERSION });
function save(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function saveCsv(m = model()) {
  const rows = X.arsenalRows(m); save(new Blob(['\ufeff' + toCSV(rows)], { type: 'text/csv' }), X.fileStem(m, 'list') + '.csv');
  toast(`Saved ${rows.length - 1} ball${rows.length === 2 ? '' : 's'} as CSV`);
}
// ---- share card: the current bag on a 1080 x 1350 canvas in the Arsenal Pro green and gold.
const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif';
function fit(ctx, t, w) { t = String(t || ''); if (ctx.measureText(t).width <= w) return t; while (t.length > 1 && ctx.measureText(t + '\u2026').width > w) t = t.slice(0, -1); return t + '\u2026'; }
export function drawCard(m, canvas = document.createElement('canvas')) {
  const W = 1080, H = 1350, P = 72; canvas.width = W; canvas.height = H; const c = canvas.getContext('2d');
  const list = m.bag.length ? m.bag : (m.groups.find(g => g.key === 'inBag') || { rows: [] }).rows;
  c.fillStyle = '#0F4D34'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#000'; c.fillRect(0, 0, W, 210); c.fillStyle = '#DAAF37'; c.fillRect(0, 210, W, 8);
  c.fillStyle = '#DAAF37'; c.font = `800 34px ${FONT}`; c.textBaseline = 'alphabetic'; c.fillText(m.team.toUpperCase(), P, 92);
  c.fillStyle = '#fff'; c.font = `800 64px ${FONT}`;
  c.fillText(fit(c, (m.name ? m.name + '\u2019s ' : 'My ') + (m.bag.length ? 'bag' : 'balls in the bag'), W - 2 * P), P, 170);
  c.font = `600 30px ${FONT}`; c.fillStyle = 'rgba(255,255,255,.82)';
  const sub = [m.facts.filter(f => f[0] !== 'PAP').map(f => f[1]).join(' \u00b7 '), m.bag.length && m.bagSaved ? 'Bag saved ' + m.bagSaved : m.date].filter(Boolean).join('  |  ');
  c.fillText(fit(c, sub, W - 2 * P), P, 280);
  const shown = list.slice(0, 6), rowH = 148, top = 330;
  if (!shown.length) { c.fillStyle = '#fff'; c.font = `600 40px ${FONT}`; c.fillText('No balls in the bag yet.', P, top + 80); }
  shown.forEach((r, i) => {
    const y = top + i * rowH, cy = y + 62;
    c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.roundRect ? c.roundRect(P - 16, y, W - 2 * P + 32, rowH - 18, 22) : c.rect(P - 16, y, W - 2 * P + 32, rowH - 18); c.fill();
    c.beginPath(); c.arc(P + 44, cy, 40, 0, Math.PI * 2); c.fillStyle = r.color || '#6b7a72'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#DAAF37'; c.stroke();
    const x = P + 112, w = W - x - P;
    c.fillStyle = '#fff'; c.font = `800 40px ${FONT}`; c.fillText(fit(c, (r.benchmark ? '\u2605 ' : '') + r.name, w), x, cy - 8);
    c.fillStyle = '#DAAF37'; c.font = `600 28px ${FONT}`;
    const spec = [r.brand, r.coverKind, r.rg != null ? 'RG ' + X.fmtRG(r.rg) : '', r.diff != null ? 'Diff ' + X.fmtDiff(r.diff) : ''].filter(Boolean).join(' \u00b7 ');
    c.fillText(fit(c, spec || 'Specs not entered', w), x, cy + 30);
    if (r.role || r.avg != null) { c.fillStyle = 'rgba(255,255,255,.75)'; c.font = `500 24px ${FONT}`;
      c.fillText(fit(c, [r.role, r.avg != null ? `avg ${r.avg} in ${r.complete} game${r.complete === 1 ? '' : 's'}` : ''].filter(Boolean).join(' \u00b7 '), w), x, cy + 62); }
  });
  if (list.length > shown.length) { c.fillStyle = '#fff'; c.font = `600 30px ${FONT}`; c.fillText(`+ ${list.length - shown.length} more`, P, top + shown.length * rowH + 30); }
  c.fillStyle = '#000'; c.fillRect(0, H - 96, W, 96); c.fillStyle = '#DAAF37'; c.font = `700 28px ${FONT}`; c.fillText('Arsenal Pro', P, H - 38);
  c.fillStyle = 'rgba(255,255,255,.7)'; c.font = `500 24px ${FONT}`; const note = 'Specs from the maker' + (m.sources.you ? ' or entered by the bowler' : '');
  c.fillText(note, W - P - c.measureText(note).width, H - 38);
  return canvas;
}
export async function shareCard(m = model()) {
  const cv = drawCard(m), name = X.fileStem(m, 'bag') + '.png';
  const blob = await new Promise(r => cv.toBlob(r, 'image/png')); if (!blob) { toast('Could not draw the card.', { kind: 'bad' }); return; }
  const file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'My bag' }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  }
  save(blob, name); toast('Bag card saved as an image.'); return 'saved';
}
// The options sheet (Arsenal header button, More > Your data).
export async function openExport() {
  await ready(); const m = model(), n = m.rows.length;
  let s = null;
  const opt = (id, label, sub, fn) => h('button', { class: 'btn ghost block exp-opt', id, onclick: async () => { await fn(); } }, h('span', { class: 'exp-l' }, h('b', { text: label }), h('small', { class: 'muted', text: sub })));
  s = sheet({ title: 'Export my arsenal', id: 'expSheet', body: h('div', { class: 'stack' },
    h('p', { class: 'small muted', text: n ? `${n} ball${n === 1 ? '' : 's'} on file${m.bag.length ? `, ${m.bag.length} in tonight\u2019s bag` : ''}.` : 'No balls on file yet. Add a ball first.' }),
    opt('expSheetBtn', 'Arsenal sheet', 'Print it or save as PDF', () => { s.close(); go('#/arsenal/sheet'); }),
    opt('expCard', 'Bag card (image)', 'Share or save a picture of your bag', async () => { await shareCard(m); }),
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
    ...(m.groups.length ? m.groups.map(g => h('section', { class: 'ps-group', 'data-group': g.key }, h('h2', { text: `${g.label} \u00b7 ${g.rows.length}` }), table(g)))
      : [h('p', { class: 'ps-muted', text: 'No balls on file yet.' })]),
    h('section', { class: 'ps-hof', id: 'psHof' }, h('h2', { text: 'Hall of Fame and milestones' }),
      m.hall.length ? h('ul', {}, ...m.hall.map(r => h('li', {}, h('b', { text: r.name }), ` retired \u00b7 ${r.games ? r.games + ' games' : 'no games logged'}${r.best != null ? ' \u00b7 best ' + r.best : ''}`))) : h('p', { class: 'ps-muted', text: 'No retired balls.' }),
      m.earned.length ? h('ul', { class: 'ps-marks' }, ...m.earned.map(e => h('li', {}, h('b', { text: e.name }), ' ' + e.marks.join(' \u00b7 ')))) : h('p', { class: 'ps-muted', text: 'Milestones appear from games logged with frames.' })),
    h('footer', { class: 'ps-foot', id: 'psFoot' },
      h('p', { text: 'Specs: manufacturer data in the Arsenal Pro catalogue' + (m.sources.you ? '; \u2020 specs entered by the bowler from the box or the maker page' : '') + '. TBD = not published or not entered.' }),
      h('p', { text: 'Games and averages: only games logged with frames in Arsenal Pro, credited to the ball that threw the most first balls; n = complete games. Surface: the bowler\u2019s own finish, else the box finish. Status and bag: as set by the bowler.' }),
      h('p', { text: m.team && m.team !== 'Arsenal Pro' ? `Arsenal Pro ${m.version} \u00b7 ${m.team}` : `Arsenal Pro ${m.version}` })));
  const el = h('section', { class: 'screen list-screen ps-screen' },
    h('header', { class: 'appbar no-print' }, h('a', { class: 'btn ghost sm', href: '#/bag?view=all', id: 'psBack' }, 'Back'), h('h1', { class: 'title', text: 'Sheet' }),
      h('div', { class: 'appbar-actions' }, h('button', { class: 'btn primary sm', id: 'psPrint', onclick: () => window.print() }, 'Print or PDF'))),
    h('p', { class: 'small muted no-print ps-hint', text: 'Prints on Letter or A4. In the print dialog choose \u201cSave as PDF\u201d to keep a file.' }),
    h('div', { class: 'ps-scroll', tabindex: '0', role: 'region', 'aria-label': 'Arsenal sheet preview' }, paper));
  return { el, title: 'Arsenal sheet' };
}
