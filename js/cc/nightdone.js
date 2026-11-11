// PRODUCT_SPINE: the "Night saved" card shown after End night. End night now lands in the Log book (#/results?night=<id>); the old
// return page (#/tonight?night=<id>) still draws it. v70 rule kept: the share offer is made once per night (showing it records it,
// so reopening never brings it back); while the screen stays open it can be used or dismissed with Not now. Native share sheet only.
import { h } from '../ui.js';
import { prefs, setPrefs } from '../store.js';
export function nightDoneCard(P, id, seen, redraw) {
  const ses = id && P && P.sessions[id]; if (!ses || !ses.ended) return null;
  const games = (P.games || []).filter(gm => gm.sessionId === id && gm.complete).sort((x, y) => x.game - y.game), tot = games.map(gm => gm.score).filter(x => x != null);
  const series = tot.reduce((a, x) => a + x, 0), line = tot.length ? `${tot.length} ${tot.length === 1 ? 'game' : 'games'} \u00b7 ${tot.join(', ')}${tot.length > 1 ? ` \u00b7 series ${series}` : ''}` : 'No complete games logged.';
  const markOffered = () => setPrefs({ shareOffered: Object.assign({}, prefs().shareOffered, { [id]: Date.now() }) });
  if (!!navigator.share && tot.length && !(prefs().shareOffered || {})[id] && !seen.here.has(id)) { seen.here.add(id); markOffered(); }
  const canShare = !!navigator.share && tot.length && seen.here.has(id) && !seen.done.has(id);
  const shareRow = canShare ? h('div', { class: 'btn-grid share-row', id: 'tnShareOffer' },
    h('button', { class: 'btn ghost', id: 'tnShareNight', onclick: async () => { seen.done.add(id); try { await navigator.share({ title: 'My bowling night', text: `Bowled ${line}.` }); } catch (e) {} redraw(); } }, 'Share this night'),
    h('button', { class: 'btn ghost', id: 'tnShareSkip', onclick: () => { seen.done.add(id); redraw(); } }, 'Not now')) : null;
  return h('div', { class: 'card', id: 'tnNightDone', role: 'status' }, h('h2', { class: 'card-title', text: 'Night saved' }), h('p', { id: 'tnNightLine', text: line }),
    h('a', { class: 'btn block', id: 'tnNightResults', href: '#/session/' + encodeURIComponent(id) }, 'Open the night \u203a'),
    shareRow);
}
