// Help bubbles (HELP_BUBBLES_V1.md) and the Glossary screen (#/glossary, reached from More; no new tab, no AI chat).
// Help is OFF by default. When on: at most one "?" per card, never on the scoring pad (owner rule: nothing during scoring).
import { h, sheet, icon } from '../ui.js';
import { back } from '../router.js';
import { prefs } from '../store.js';
import * as HP from '../cc/help.js';
const LVL = { Beginner: 'Beginner', Intermediate: 'Intermediate', Advanced: 'Advanced' };
// "?" for one glossary id; label = short visible topic used in the accessible name. Returns null while Help is off.
export function helpDot(id, label) {
  if (!HP.helpOn(prefs())) return null;
  return h('button', { class: 'help-dot', 'data-help': id, 'aria-label': `Help: ${label}`, 'aria-haspopup': 'dialog', text: '?', onclick: () => openBubble(id, label) });
}
async function openBubble(id, label) {
  let t = null; try { t = HP.find((await HP.loadGlossary()).terms, id); } catch (e) { t = null; }
  const body = h('div', { class: 'stack', id: 'helpBody' },
    t ? h('p', { id: 'helpText', text: t.bubble || t.glossary }) : h('p', { class: 'muted', text: 'The glossary isn\u2019t available offline yet. Open it once online.' }),
    t && t.weak_evidence ? h('p', { class: 'small muted', text: '\u26a0 Weak evidence; see sources.' }) : null,
    h('a', { class: 'btn ghost', id: 'helpMore', href: `#/glossary?t=${encodeURIComponent(id)}` }, 'Glossary \u203a'));
  sheet({ title: t ? t.term : label, body, id: 'helpSheet' });
}
export async function render({ query }) {
  const want = query && query.get('t'), q0 = (query && query.get('q')) || '';
  const list = h('div', { class: 'gl-list', id: 'glList' });
  const count = h('p', { class: 'muted small', id: 'glCount', 'aria-live': 'polite' });
  const search = h('input', { type: 'search', class: 'search', id: 'glSearch', placeholder: 'Search a term', 'aria-label': 'Search the glossary', value: q0, autocomplete: 'off' });
  let G = null;
  try { G = await HP.loadGlossary(); } catch (e) { list.append(h('p', { class: 'muted', text: 'The glossary could not load. Try again when online.' })); }
  const src = s => h('li', {}, s.url && /^https:\/\//.test(s.url) ? h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer', text: s.title }) : h('span', { text: s.title }),
    h('span', { class: 'prov', title: HP.LABELS[s.label] || '', text: ' ' + (s.label || '') }));
  const entry = t => h('details', { class: 'card gl-item', id: 'gl-' + t.id, open: t.id === want ? '' : null },
    h('summary', {}, h('span', { class: 'gl-term', text: t.term }), h('span', { class: 'pill', text: LVL[t.level] || t.level })),
    h('p', { text: t.glossary }), t.weak_evidence ? h('p', { class: 'small muted', text: '\u26a0 Weak evidence.' }) : null,
    h('p', { class: 'small muted', text: 'Sources (F = read at the source, S = search excerpt):' }), h('ul', { class: 'gl-src small' }, ...(t.sources || []).map(src)));
  function draw() {
    if (!G) return;
    const hits = HP.search(G.terms, search.value); list.innerHTML = '';
    count.textContent = `${hits.length} of ${G.terms.length} terms`;
    if (!hits.length) list.append(h('p', { class: 'muted', text: 'No term matches. Try a shorter word.' }));
    for (const [tree, xs] of HP.byTree(hits, G.trees)) list.append(h('h2', { class: 'group-h', text: tree }), ...xs.map(entry));
  }
  search.oninput = draw; draw();
  const el = h('section', { class: 'screen list-screen', id: 'glossary' }, h('header', { class: 'appbar' }, h('button', { class: 'icon-btn', 'aria-label': 'Back', html: icon('back'), onclick: () => back('#/more') }), h('h1', { class: 'title', text: 'Glossary' })),
    h('div', { class: 'list-tools' }, search, count), list);
  if (want) requestAnimationFrame(() => { const x = el.querySelector('#gl-' + CSS.escape(want)); if (x) x.scrollIntoView({ block: 'start' }); });
  return { el, title: 'Glossary' };
}
