// #/wrapped Season Wrapped (owner 2026-10-31, tactic 2): the league season (Aug 1 to Jul 31, DECISIONS) in plain counts.
// Nothing graded: no average, no high game, no "best"; a rate only with 30+ chances (MIN_SHOTS). Card made on this phone.
import { h, icon, segmented } from '../ui.js';
import { back } from '../router.js';
import { ready, proj } from '../hub.js';
import { profile } from '../store.js';
import { catOf } from '../cc/cats.js';
import * as X from '../cc/export.js';
import * as C from '../cc/community.js';
import * as K from './cards.js';
export async function render() {
  await ready();
  const P = proj(), m = X.sheetModel(P, profile(), { catOf }), names = Object.fromEntries(m.rows.map(r => [r.id, r.name]));
  const nameOf = id => names[id] || (catOf(id) || {}).name || 'a ball';
  const now = Date.now(), cur = C.seasonOf(now), prev = C.seasonOf(Date.parse(cur.from) - 86400e3);
  const body = h('div', { class: 'stack', id: 'wrBody' });
  let pick = 'cur';
  function draw() {
    const season = pick === 'cur' ? cur : prev, w = C.wrappedOf(P, { now, season, nameOf }), lines = C.wrappedLines(w);
    body.innerHTML = '';
    if (!lines.length) { body.append(h('div', { class: 'card', id: 'wrEmpty' }, h('h2', { class: 'card-title', text: 'No nights logged in the ' + season.label + ' yet' }),
      h('p', { class: 'small', text: 'Log a night on Tonight and it shows up here. Wrapped counts nights, games and frames; it never grades them.' }))); return; }
    const cv = K.drawWrapped(w, lines, { name: m.name });
    cv.className = 'wr-card'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', `Season Wrapped card: ${lines.map(l => l.join(': ')).join('; ')}`);
    body.append(h('div', { class: 'card', id: 'wrList' }, h('h2', { class: 'card-title', text: season.label }),
        h('dl', { class: 'kv' }, ...lines.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })])),
        h('p', { class: 'small muted', id: 'wrProv' }, h('span', { class: 'prov', 'data-prov': 'device', text: 'your log' }), ` ${season.from} to ${season.to}. A rate shows only with ${w.minShots}+ chances.`)),
      cv, h('button', { class: 'btn primary block', id: 'wrShare', onclick: () => K.sharePng(cv, `arsenal-wrapped-${season.from.slice(0, 4)}.png`, 'Season Wrapped', 'Wrapped card saved as an image.') }, 'Share or save the card'),
      h('p', { class: 'small muted', text: 'Made on this phone. Nothing is posted unless you share it.' }));
  }
  draw();
  const el = h('section', { class: 'screen list-screen', id: 'wrapped' },
    h('header', { class: 'appbar' }, h('button', { class: 'icon-btn', 'aria-label': 'Back', html: icon('back'), onclick: () => back('#/results') }), h('h1', { class: 'title', text: 'Season Wrapped' })),
    h('div', { class: 'list-tools' }, segmented('Season', [['cur', cur.label], ['prev', prev.label]], pick, v => { pick = v; draw(); }, 'wide')), body);
  return { el, title: 'Season Wrapped' };
}
