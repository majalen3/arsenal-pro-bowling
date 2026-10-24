// Session results (BC): after a session, what changed and what to work on. One headline, ≤2 supporting stats, one
// next focus; games, comparison, LaneTrax detail and import notes sit behind "Details". Pure numbers from js/cc/card.js.
import { h, icon, toast, emptyState } from '../ui.js';
import { go, back } from '../router.js';
import { ready, proj, add } from '../hub.js';
import { on, prefs, setPrefs } from '../store.js';
import { catOf } from '../cc/cats.js';
import * as C from '../cc/card.js';
export const ballName = (P, id) => { const o = id && P.owned && P.owned[id]; return o ? (o.name || (catOf(o.catalogId) || {}).name || 'Ball') : id ? ((catOf(id) || {}).name || id) : null; };
const fmtDate = d => { if (!d) return 'Undated'; const t = new Date(d + 'T12:00:00'); return isNaN(t) ? d : t.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); };
export const backBar = (title, fallback) => h('header', { class: 'appbar' }, h('button', { class: 'icon-btn', 'aria-label': 'Back', html: icon('back'), onclick: () => back(fallback) }), h('h1', { class: 'title', text: title }));
const sign = (d, u) => (d > 0 ? '+' : d < 0 ? '\u2212' : '\u00b1') + Math.abs(d) + (u === '%' ? ' pts' : '');
export function marksRow(g) {
  return h('ol', { class: 'bc-frames', 'aria-label': `Game ${g.game} frames` }, ...g.frames.map(f => h('li', {}, h('span', { class: 'bc-m', text: f.marks.join(' ') || '\u00a0' }), h('span', { class: 'bc-c', text: f.cum != null ? String(f.cum) : '' }))));
}
export async function render({ params }) {
  await ready();
  const id = params[0], el = h('section', { class: 'screen bc' }), body = h('div', { class: 'stack' });
  el.append(backBar('Session', '#/sessions'), body);
  function draw() {
    const P = proj(), list = C.sessionsOf(P), s = list.find(x => x.id === id); body.innerHTML = '';
    if (!s) { body.append(emptyState('Session not found', 'It may have been undone. Your sessions are listed on Sessions.', { label: 'Open Sessions', run: () => go('#/sessions') })); return; }
    const r = C.recapOf(list, id), st = s.stats;
    body.append(h('p', { class: 'bc-sub muted', id: 'sessWhen', text: `${fmtDate(s.date)} \u00b7 ${s.source}${s.ballId ? ' \u00b7 ' + ballName(P, s.ballId) : ''}` }),
      h('div', { class: 'card bc-head', id: 'sessRecap' }, h('p', { class: 'bc-headline', id: 'sessHead', text: r.head }),
        r.support.length ? h('dl', { class: 'bc-figs' }, ...r.support.map(x => h('div', { class: 'bc-fig', 'data-k': x.k }, h('dt', { text: x.label }), h('dd', { text: x.text })))) : null,
        r.focus ? h('p', { class: 'bc-focus', id: 'sessFocus', text: r.focus.text }) : null,
        r.focus ? (() => { const fc = prefs().focus, set = !!(fc && fc.from === id && fc.text === r.focus.text);
          return h('button', { class: 'btn ghost block', id: 'sessSetFocus', 'aria-pressed': String(set), onclick: () => { setPrefs({ focus: set ? null : { text: r.focus.text, from: id, ts: Date.now() } }); toast(set ? 'Focus cleared.' : 'Saved. It shows on Tonight next time.'); draw(); } }, set ? 'Next-time focus saved \u2713' : 'Make this my next focus'); })() : null));
    if (s.games.length || s.scores.length) body.append(h('div', { class: 'card', id: 'sessGames' }, h('h2', { class: 'card-title', text: s.games.length + s.scores.length === 1 ? 'Game' : `Games \u00b7 ${st.series != null ? st.series + ' series' : ''}` }),
      ...s.games.map(g => h('div', { class: 'bc-game' }, h('div', { class: 'row between' }, h('b', { text: `Game ${g.game}` }), h('span', { class: 'bc-score', text: g.score != null ? String(g.score) + (g.complete ? '' : ' (in progress)') : '\u2014' })), marksRow(g))),
      ...s.scores.map(x => h('div', { class: 'row between bc-game' }, h('b', { text: `Game ${x.game || ''}` }), h('span', { class: 'bc-score', text: String(x.score) })))));
    // Details: everything that passes usability but only sometimes changes a decision.
    const det = h('details', { class: 'card bc-more', id: 'sessDetails' }, h('summary', { text: 'Details' }));
    const T = st.throws;
    // Game by game (sim bug 7): score, ball(s), moves, with the sample size of each line.
    if (r.perGame.length) det.append(h('h3', { class: 'section-title', text: 'Game by game' }), h('ul', { class: 'plain small', id: 'sessPerGame' },
      ...r.perGame.map(x => h('li', { text: `Game ${x.game}: ${x.score != null ? x.score : 'not finished'} \u00b7 ${x.balls.map(b => ballName(P, b)).join(', ') || 'ball not set'} \u00b7 ${x.moves} ${x.moves === 1 ? 'move' : 'moves'} \u00b7 ${x.throws} balls thrown` }))));
    if (r.cmp.length) det.append(h('h3', { class: 'section-title', text: 'Compared with' }), h('table', { class: 'bc-tbl', id: 'sessCmp' },
      h('thead', {}, h('tr', {}, h('th', { text: '' }), h('th', { text: 'Tonight' }), h('th', { text: 'Last' }), h('th', { text: 'Your avg' }))),
      h('tbody', {}, ...r.cmp.map(x => h('tr', {}, h('th', { text: x.label }), h('td', { text: x.v + (x.unit || '') }), h('td', { text: x.dPrev != null ? sign(x.dPrev, x.unit) : '\u2014' }), h('td', { text: x.dMean != null ? sign(x.dMean, x.unit) : '\u2014' }))))));
    if (T) det.append(h('h3', { class: 'section-title', text: 'Strikes, spares, opens' }), h('dl', { class: 'kv', id: 'sessSSO' },
      h('dt', { text: 'Strikes' }), h('dd', { text: `${T.strikes} of ${T.first} first balls` }),
      h('dt', { text: 'Single-pin spares' }), h('dd', { text: T.single ? `${T.singleMade} of ${T.single}` : '\u2014' }),
      h('dt', { text: 'Multi-pin spares' }), h('dd', { text: T.multi ? `${T.multiMade} of ${T.multi}` : '\u2014' }),
      h('dt', { text: 'Open frames' }), h('dd', { text: `${T.opens} of ${T.frames}` }),
      T.leaves.length ? h('dt', { text: 'Leaves' }) : null, T.leaves.length ? h('dd', { text: T.leaves.slice(0, 6).map(l => `${l.leave}: ${l.made}/${l.n}`).join(', ') }) : null));
    if (st.ltx) {
      const L = st.ltx, sm = L.summary || {};
      det.append(h('h3', { class: 'section-title', text: 'LaneTrax report' }), h('dl', { class: 'kv', id: 'sessLtx' },
        h('dt', { text: 'Shots' }), h('dd', { text: String(L.shots) }),
        h('dt', { text: 'Strikes' }), h('dd', { text: `${L.strikes} of ${L.first} (${L.strikePct}%)` }),
        h('dt', { text: 'Spares made' }), h('dd', { text: `${L.spareMade} of ${L.spare} (${L.sparePct}%)` }),
        L.rev != null ? h('dt', { text: 'Rev rate' }) : null, L.rev != null ? h('dd', { text: `${Math.round(L.rev)} rpm \u00b7 Level ${L.levels.revRate}` }) : null,
        L.impactSpeed != null ? h('dt', { text: 'Impact speed' }) : null, L.impactSpeed != null ? h('dd', { text: `${L.impactSpeed} mph \u00b7 Level ${L.levels.impactSpeed}` }) : null,
        L.arrows != null ? h('dt', { text: 'Arrows' }) : null, L.arrows != null ? h('dd', { text: `${L.arrows} boards off \u00b7 Level ${L.levels.arrowsDifference}` }) : null,
        sm.breakpointBoard ? h('dt', { text: 'Breakpoint' }) : null, sm.breakpointBoard ? h('dd', { text: `board ${sm.breakpointBoard.mean} at ${sm.breakpointDistance ? sm.breakpointDistance.mean + ' ft' : '?'}` }) : null,
        sm.impactAngle ? h('dt', { text: 'Entry angle' }) : null, sm.impactAngle ? h('dd', { text: `${sm.impactAngle.mean}\u00b0 (measured by LaneTrax)` }) : null),
        h('p', { class: 'muted small', text: 'Levels 1\u20135 are LaneTrax\u2019s own scale (docs.lanetrax.app).' }));
      // Tag this report to a ball so it feeds the Bag Advisor.
      const owned = Object.values(P.owned || {}).filter(o => o.status !== 'retired');
      const sel = h('select', { id: 'sessBall', 'aria-label': 'Ball used in this session' }, h('option', { value: '', text: 'Not set' }), ...owned.map(o => h('option', { value: o.id, text: ballName(P, o.id), selected: o.id === s.ballId })));
      sel.onchange = async () => { await add('session.edited', s.id, { fields: { ballId: sel.value || null } }); toast(sel.value ? `Tagged to ${ballName(P, sel.value)}. It now counts in Bag Advisor.` : 'Ball cleared.'); };
      det.append(h('label', { class: 'fld' }, h('span', { text: 'Ball used (feeds Bag Advisor)' }), sel));
      if (L.warnings && L.warnings.length) det.append(h('h3', { class: 'section-title', text: `Import notes (${L.warnings.length})` }), h('ul', { class: 'plain small', id: 'sessWarn' }, ...L.warnings.map(w => h('li', { text: typeof w === 'string' ? w : `${String(w.code || '').replace(/_/g, ' ').toLowerCase()}${w.detail ? ': ' + w.detail : ''}` }))));
    }
    if (det.children.length > 1) body.append(det);
    body.append(h('a', { class: 'btn ghost block', href: '#/card', id: 'sessToCard' }, 'My Bowler Card'));
  }
  draw();
  const off = on('data', () => { if (body.contains(document.activeElement) && document.activeElement.tagName === 'SELECT') return; const o = new Set([...body.querySelectorAll('details[open]')].map(d => d.id)); draw(); for (const i of o) { const d = body.querySelector('#' + i); if (d) d.open = true; } });
  return { el, title: 'Session', destroy() { off(); } };
}
