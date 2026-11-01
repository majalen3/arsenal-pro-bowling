// Me > "Me in the community" (owner 2026-10-31, tactics 4 and 5 plus the pro-shop field of tactic 3): optional identity tags,
// an opt-in home center with the "Regular at <center>" badge (nights there in 90 days, any score), and an optional pro shop name.
// Everything here stays on this phone until the bowler shares it with a team (My Team > Choose what I share).
import { h, toast } from '../ui.js';
import { ready, proj } from '../hub.js';
import { profile, prefs, setPrefs } from '../store.js';
import { helpDot } from './help.js';
import * as C from '../cc/community.js';
export function communityCard() {
  const card = h('div', { class: 'card', id: 'commCard' });
  async function paint() {
    await ready(); const P = proj(), pr = profile() || {}, pf = prefs();
    const on = C.tagsOf(pr, pf.tags || {}), auto = C.profileTags(pr);
    const centers = Object.entries((P && P.centers) || {}).map(([id, c]) => [id, c.name || 'Unnamed center']).sort((a, b) => a[1].localeCompare(b[1]));
    const reg = pf.homeCenter ? C.regularOf(P, pf.homeCenter) : null;
    const sel = h('select', { id: 'homeCenter', 'aria-label': 'Home center', onchange: e => { setPrefs({ homeCenter: e.target.value || null }); paint(); } },
      h('option', { value: '', text: 'No home center' }), ...centers.map(([id, n]) => h('option', { value: id, text: n, selected: id === pf.homeCenter })));
    const shop = h('input', { id: 'proShopIn', maxlength: '60', placeholder: 'e.g. the pro shop at your center', value: pf.proShop || '', autocomplete: 'off',
      onchange: e => { setPrefs({ proShop: e.target.value.trim() || null }); toast(e.target.value.trim() ? 'Pro shop saved on this phone.' : 'Pro shop cleared.'); } });
    card.innerHTML = '';
    card.append(h('div', { class: 'card-h' }, h('h2', { class: 'card-title' }, 'Me in the community', helpDot('tags', 'Identity tags'))),
      h('p', { class: 'small muted', text: 'Optional. Tags are how you describe yourself; nothing here is ranked or scored. They stay on this phone unless you share them with your team.' }),
      h('div', { class: 'chips me-tags', id: 'tagPicker', role: 'group', 'aria-label': 'Identity tags' }, ...C.TAGS.map(t => h('button', { class: 'chip', type: 'button', 'data-tag': t,
        'aria-pressed': String(on.includes(t)), onclick: () => { setPrefs({ tags: C.toggleTag(pr, prefs().tags || {}, t) }); paint(); } }, C.TAG_LABEL[t]))),
      auto.length ? h('p', { class: 'small muted', id: 'tagAuto', text: `From your profile: ${auto.map(t => C.TAG_LABEL[t]).join(', ')}. Tap to switch off.` }) : null,
      h('label', { class: 'fld', id: 'homeCenterFld' }, h('span', {}, 'Home center', helpDot('regular', 'Regular badge')), centers.length ? sel : h('p', { class: 'small muted', text: 'Log a night at a center first (Tonight > center).' })),
      reg ? h('p', { class: 'small', id: 'regularLine' }, reg.regular ? h('span', { class: 'pill gold', id: 'regularBadge', text: `Regular at ${reg.center}` }) : null,
        ` ${reg.nights} night${reg.nights === 1 ? '' : 's'} there in the last ${reg.days} days${reg.regular ? '.' : ` (the badge shows at ${reg.need}).`}`,
        h('span', { class: 'prov', text: ' from your logged nights' })) : null,
      h('details', { class: 'tn-more', id: 'proShopMore', open: pf.proShop ? true : null }, h('summary', { text: 'My pro shop' }),
        h('label', { class: 'fld' }, h('span', { text: 'Pro shop name (optional)' }), shop),
        h('p', { class: 'small muted', text: 'Shown at the top of your pro shop kit. Kept on this phone; the app never contacts the shop.' })),
      h('div', { class: 'btn-grid' }, h('a', { class: 'btn ghost', href: '#/team', id: 'goTeam' }, 'My Team'), h('a', { class: 'btn ghost', href: '#/wrapped', id: 'goWrapped' }, 'Season Wrapped'),
        h('a', { class: 'btn ghost', href: '#/kit', id: 'goKit' }, 'Pro shop kit')));
  }
  paint();
  return card;
}
