// IA P2 Learn tab (IA_PLAN §5): search on top, the Bowling Guide first, then Glossary, Oil patterns, How the lane model works,
// the Help "?" switch and Replay the welcome tour. Help stays OFF by default (owner 2026-10-31; DECISIONS #32 kept).
import { h, segmented } from '../ui.js';
import { prefs, setPrefs } from '../store.js';
import { go } from '../router.js';
export function render() {
  const search = h('input', { type: 'search', class: 'search', id: 'lnSearch', placeholder: 'Search bowling words', 'aria-label': 'Search the Bowling Guide and Glossary', autocomplete: 'off', enterkeyhint: 'search' });
  const form = h('form', { class: 'list-tools', id: 'lnForm', role: 'search', onsubmit: e => { e.preventDefault(); const q = search.value.trim(); go('#/glossary' + (q ? '?q=' + encodeURIComponent(q) : '')); } }, search);
  const link = (id, href, title, note) => h('a', { class: 'btn ghost block', id, href }, title, note ? h('small', { class: 'muted', text: ' \u00b7 ' + note }) : null);
  const body = h('div', { class: 'stack' },
    h('div', { class: 'card', id: 'helpCard' }, h('h2', { class: 'card-title', id: 'learnTitle', text: 'Learn' }),
      h('div', { class: 'btn-grid' }, h('a', { class: 'btn primary', id: 'goGuide', href: '#/guide' }, 'Bowling Guide'), h('a', { class: 'btn ghost', id: 'goGlossary', href: '#/glossary' }, 'Glossary')),
      h('div', { class: 'fld', id: 'helpFld' }, h('span', { text: 'Help bubbles \u201c?\u201d' }), segmented('Help bubbles', [['off', 'Off'], ['on', 'On']], prefs().help === true ? 'on' : 'off', v => { setPrefs({ help: v === 'on' }); go(location.hash, { replace: true }); }, 'wide'),
        h('p', { class: 'small muted', text: 'Puts a \u201c?\u201d next to bowling words on every screen; tap it for a plain answer. Same switch as the \u201c?\u201d at the top. Never on the scoring pad.' }))),
    h('div', { class: 'card stack', id: 'lnMore' },
      link('lnPatterns', '#/learn/patterns', 'Oil patterns', 'the pattern library'),
      link('lnLane', '#/lane', 'How the lane model works', 'Lane and Targeting'),
      link('replayTour', '#/welcome', 'Replay the welcome tour')));
  const el = h('section', { class: 'screen list-screen', id: 'learn' }, h('header', { class: 'appbar' }, h('h1', { class: 'title', text: 'Learn' })), form, body);
  return { el, title: 'Learn' };
}
