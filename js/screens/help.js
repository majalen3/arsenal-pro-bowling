// Help bubbles (HELP_BUBBLES_V1.md) and the Glossary screen (#/glossary, reached from More; no new tab, no AI chat).
// Help is OFF by default. When on: at most one "?" per card, never on the scoring pad (owner rule: nothing during scoring).
import { h, sheet, icon, toast } from '../ui.js';
import { back } from '../router.js';
import { prefs, setPrefs } from '../store.js';
import * as HP from '../cc/help.js';
const LVL = { Beginner: 'Beginner', Intermediate: 'Intermediate', Advanced: 'Advanced' };
// "?" for one glossary id; label = short visible topic used in the accessible name. Returns null while Help is off.
// Visual: a small gold "?" (22 px); tap area 44 px (owner bug 2026-10-24: "I can't find any '?'").
export function helpDot(id, label) {
  if (!HP.helpOn(prefs())) return null;
  return h('button', { type: 'button', class: 'help-dot', 'data-help': id, 'aria-label': `Help: ${label}`, 'aria-haspopup': 'dialog', onclick: e => { e.preventDefault(); e.stopPropagation(); openBubble(id, label); } },
    h('span', { class: 'help-i', 'aria-hidden': 'true', text: '?' }));
}
// Append a "?" to an element (a title, a label) and return it.
export function withHelp(el, id, label) { const d = helpDot(id, label); if (d) el.append(d); return el; }
// Top-bar "?" switch (every screen with an app bar, except Welcome). Re-renders the screen; never shown on the scoring pad itself.
export function helpToggle(rerender) {
  const on = HP.helpOn(prefs());
  return h('button', { type: 'button', class: 'icon-btn help-toggle' + (on ? ' on' : ''), id: 'helpToggle', 'aria-pressed': on ? 'true' : 'false', 'aria-label': 'Help bubbles', title: on ? 'Help bubbles on' : 'Help bubbles off',
    onclick: () => { setPrefs({ help: !on }); toast(on ? 'Help bubbles off' : 'Help bubbles on: tap a gold \u201c?\u201d'); rerender(); } }, h('span', { class: 'help-i', 'aria-hidden': 'true', text: '?' }));
}
export async function openBubble(id, label) {
  let t = null; try { t = HP.find((await HP.loadGlossary()).terms, id); } catch (e) { t = null; }
  const body = h('div', { class: 'stack', id: 'helpBody' },
    t ? h('p', { id: 'helpText', text: HP.bubbleText(t) }) : h('p', { class: 'muted', text: 'The Bowling Guide isn\u2019t available offline yet. Open it once online.' }),
    t && t.weak_evidence ? h('p', { class: 'small muted', text: '\u26a0 Weak evidence; see sources.' }) : null,
    h('a', { class: 'btn ghost', id: 'helpMore', href: `#/guide?t=${encodeURIComponent(id)}` }, 'Learn more in the Bowling Guide \u203a'));
  sheet({ title: t ? t.term : label, body, id: 'helpSheet' });
}
// Bowling Guide (owner 2026-10-24: "I thought we had a bowler's education / encyclopedia"): every glossary term, searchable,
// browsable by the 7 trees, linked from every "?". Routes #/guide and #/glossary (old links) open the same screen.
export async function render({ query }) {
  const want = query && query.get('t'), q0 = (query && query.get('q')) || '';
  let tree = (query && query.get('tree')) || '';
  const list = h('div', { class: 'gl-list', id: 'glList' });
  const count = h('p', { class: 'muted small', id: 'glCount', 'aria-live': 'polite' });
  const search = h('input', { type: 'search', class: 'search', id: 'glSearch', placeholder: 'Search the Bowling Guide', 'aria-label': 'Search the Bowling Guide', value: q0, autocomplete: 'off' });
  const trees = h('div', { class: 'chips scroll gl-trees', id: 'glTrees', role: 'group', 'aria-label': 'Browse by topic' });
  let G = null;
  try { G = await HP.loadGlossary(); } catch (e) { list.append(h('p', { class: 'muted', text: 'The Bowling Guide could not load. Open it once online; after that it works offline.' })); }
  const src = s => h('li', {}, s.url && /^https:\/\//.test(s.url) ? h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer', text: s.title }) : h('span', { text: s.title }),
    h('span', { class: 'prov', title: HP.LABELS[s.label] || '', text: ' ' + (s.label || '') }));
  const entry = t => h('details', { class: 'card gl-item', id: 'gl-' + t.id, open: t.id === want ? '' : null },
    h('summary', {}, h('span', { class: 'gl-term', text: t.term }), h('span', { class: 'pill', text: LVL[t.level] || t.level })),
    h('p', { text: t.glossary }), t.weak_evidence ? h('p', { class: 'small muted', text: '\u26a0 Weak evidence.' }) : null,
    h('p', { class: 'small muted', text: 'Sources (F = read at the source, S = search excerpt, repo = this app\u2019s own docs):' }), h('ul', { class: 'gl-src small' }, ...(t.sources || []).map(src)));
  function paintTrees() {
    if (!G) return;
    const chip = (v, label) => h('button', { type: 'button', class: 'chip', 'data-tree': v, 'aria-pressed': tree === v ? 'true' : 'false', onclick: () => { tree = v; paintTrees(); draw(); } }, label);
    trees.replaceChildren(chip('', 'All'), ...G.trees.map(t => chip(t, t)));
  }
  function draw() {
    if (!G) return;
    const hits = HP.search(G.terms, search.value).filter(t => !tree || t.tree === tree); list.innerHTML = '';
    count.textContent = `${hits.length} of ${G.terms.length} terms`;
    if (!hits.length) list.append(h('p', { class: 'muted', text: 'No term matches. Try a shorter word or All topics.' }));
    for (const [tr, xs] of HP.byTree(hits, G.trees)) list.append(h('h2', { class: 'group-h', text: tr }), ...xs.map(entry));
  }
  if (want && G) { const t = HP.find(G.terms, want); if (t && tree && t.tree !== tree) tree = ''; }
  search.oninput = draw; paintTrees(); draw();
  const el = h('section', { class: 'screen list-screen', id: 'glossary' }, h('header', { class: 'appbar' }, h('button', { class: 'icon-btn', 'aria-label': 'Back', html: icon('back'), onclick: () => back('#/more') }), h('h1', { class: 'title', text: 'Bowling Guide' })),
    h('div', { class: 'list-tools' }, h('p', { class: 'small muted', id: 'glIntro', text: 'Plain answers to bowling words, each with its sources. Search, or browse a topic.' }), search, trees, count), list);
  if (want) requestAnimationFrame(() => { const x = el.querySelector('#gl-' + CSS.escape(want)); if (x) x.scrollIntoView({ block: 'start' }); });
  return { el, title: 'Bowling Guide' };
}
