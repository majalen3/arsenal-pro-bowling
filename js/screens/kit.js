// #/kit Pro shop kit (owner 2026-10-31, tactic 3): a printable sheet of QR codes, one per ball. Each code opens
// #/add-ball?cat=<catalogue id> in this app with that ball picked; the bowler still checks it and taps Add.
// Made on this phone with the vendored MIT encoder (js/vendor/qrcode.js). The app never contacts a shop. Printables carry
// the app name once and nothing else of the brand.
import { h, icon, toast } from '../ui.js';
import { back } from '../router.js';
import { ready, proj } from '../hub.js';
import { prefs, setPrefs } from '../store.js';
import * as A from '../cc/addball.js';
import qrcode from '../vendor/qrcode.js';
import { KIT_MAX as MAX, kitUrl as link } from '../cc/kit.js';
export const appBase = (loc = location) => loc.origin + loc.pathname;
const kitUrl = id => link(id, appBase());
const SVGNS = 'http://www.w3.org/2000/svg';
// One QR as an SVG path (no data: URLs, no inline script; prints crisp at any size). Level M survives a smudged print.
export function qrSvg(text, { label = '' } = {}) {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), m = 4, size = n + 2 * m; let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x + m} ${y + m}h1v1h-1z`;
  const svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('viewBox', `0 0 ${size} ${size}`); svg.setAttribute('class', 'kit-qr');
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label || 'QR code'); svg.setAttribute('shape-rendering', 'crispEdges');
  const bg = document.createElementNS(SVGNS, 'rect'); bg.setAttribute('width', size); bg.setAttribute('height', size); bg.setAttribute('fill', '#fff');
  const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', '#000');
  svg.append(bg, p); return svg;
}
const ownedIds = P => Object.values((P && P.owned) || {}).map(o => (o.spec && o.spec.entryId) || o.catalogId).filter(id => id && A.entryById(id));
export async function render() {
  await ready();
  const P = proj(), shop = prefs().proShop || '';
  let ids = (prefs().kit || []).filter(id => A.entryById(id)).slice(0, MAX);
  const save = () => setPrefs({ kit: ids });
  const q = h('input', { type: 'search', class: 'search', id: 'kitQ', placeholder: 'e.g. Storm Hy-Road Pearl', 'aria-label': 'Ball to add to the sheet', autocomplete: 'off', enterkeyhint: 'search' });
  const results = h('div', { id: 'kitResults', 'aria-live': 'polite' }), chosen = h('div', { id: 'kitChosen' }), sheet = h('div', { class: 'kit-sheet', id: 'kitSheet' });
  const addId = id => { if (ids.includes(id)) return; if (ids.length >= MAX) { toast(`A sheet holds ${MAX} codes. Print this one and start another.`); return; } ids.push(id); save(); draw(); };
  function drawResults() {
    results.innerHTML = ''; if (!q.value.trim()) return;
    const r = A.search(q.value), list = [r.exact, ...r.candidates.map(c => c.entry)].filter(Boolean);
    if (!list.length) { results.append(h('p', { class: 'small', text: 'Not in the catalogue, so no code for it yet.' })); return; }
    results.append(h('div', { class: 'blist' }, ...list.map(e => h('div', { class: 'brow' }, h('button', { class: 'brow-main', 'data-kit-add': e.id, onclick: () => { addId(e.id); q.value = ''; drawResults(); } },
      h('span', { class: 'brow-text' }, h('span', { class: 'brow-name', text: `${e.brand} ${e.name}` }), h('span', { class: 'brow-meta', text: ids.includes(e.id) ? 'on the sheet' : 'add to the sheet' })))))));
  }
  q.addEventListener('input', drawResults);
  function draw() {
    chosen.innerHTML = ''; sheet.innerHTML = '';
    if (ids.length) chosen.append(h('ul', { class: 'plain kit-list' }, ...ids.map(id => { const e = A.entryById(id);
      return h('li', { class: 'kit-row' }, h('span', { text: `${e.brand} ${e.name}` }), h('button', { class: 'btn ghost', 'aria-label': `Take ${e.name} off the sheet`, 'data-kit-del': id, onclick: () => { ids = ids.filter(x => x !== id); save(); draw(); } }, 'Remove')); })));
    if (!ids.length) { sheet.append(h('p', { class: 'muted small no-print', id: 'kitEmpty', text: 'Add balls above and their codes appear here, ready to print.' })); return; }
    sheet.append(h('div', { class: 'kit-head' }, h('h2', { text: shop ? `${shop}: scan to add a ball` : 'Scan to add a ball' }),
        h('p', { text: 'Point a phone camera at a code. The ball opens filled in from the catalogue; check it and tap Add.' })),
      h('div', { class: 'kit-grid' }, ...ids.map(id => { const e = A.entryById(id);
        return h('figure', { class: 'kit-cell', 'data-kit': id }, qrSvg(kitUrl(id), { label: `Code that adds ${e.brand} ${e.name}` }), h('figcaption', {}, h('b', { text: e.name }), h('span', { text: e.brand }))); })),
      h('p', { class: 'kit-foot', text: 'Arsenal Pro, a free bowling app. Works offline once opened.' }));
  }
  draw();
  const el = h('section', { class: 'screen list-screen', id: 'kit' },
    h('header', { class: 'appbar no-print' }, h('button', { class: 'icon-btn', 'aria-label': 'Back', html: icon('back'), onclick: () => back('#/me') }), h('h1', { class: 'title', text: 'Pro shop kit' })),
    h('div', { class: 'card no-print', id: 'kitPick' }, h('h2', { class: 'card-title', text: 'Balls on the sheet' }),
      h('p', { class: 'small', text: `Print codes for the balls a shop stocks or a league drills. Up to ${MAX} per sheet. The app never contacts the shop.` }),
      h('label', { class: 'fld' }, h('span', { text: 'Find a ball' }), q), results,
      ownedIds(P).length ? h('button', { class: 'btn ghost block', id: 'kitMine', onclick: () => { ownedIds(P).forEach(addId); } }, 'Add the balls I own') : null, chosen),
    sheet,
    h('div', { class: 'btn-grid no-print' }, h('button', { class: 'btn primary', id: 'kitPrint', onclick: () => ids.length ? window.print() : toast('Add a ball first.') }, 'Print the sheet'),
      ids.length ? h('button', { class: 'btn ghost', id: 'kitClear', onclick: () => { ids = []; save(); draw(); } }, 'Clear') : null));
  return { el, title: 'Pro shop kit' };
}
