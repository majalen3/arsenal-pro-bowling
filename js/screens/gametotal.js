// Item 2: "Add a game total": a 2-field sheet (score, game) + optional ball. Offered on the night (Session) view, in
// More › Your data and in Tonight's team setup; never on the scoring pad. Saves one game.logged event.
import { h, sheet, toast } from '../ui.js';
import { proj, addMany } from '../hub.js';
import { mkEvent } from '../data/events.js';
import { deviceId } from '../store.js';
import * as GT from '../cc/gametotal.js';
import * as ST from '../cc/status.js';
import { dayKey } from '../cc/night.js';
const nameOf = (P, id) => (ST.itemOfOwned(P, id) || {}).name || 'Ball';
export function openGameTotal({ sessionId = null, onDone = () => {} } = {}) {
  const P = proj(), tgt = sessionId ? { sid: sessionId, create: !P.sessions[sessionId] && !(P.scores || []).some(x => x.sessionId === sessionId) && !(P.shots || []).some(x => x.sessionId === sessionId), date: dayKey(Date.now()) } : GT.targetNight(P);
  const sid = tgt.sid, g0 = GT.nextGame(P, sid);
  const balls = Object.values(P.owned || {}).filter(ST.offered).sort((a, b) => (ST.inMyBag(b) - ST.inMyBag(a)) || (nameOf(P, a.id) < nameOf(P, b.id) ? -1 : 1));
  const score = h('input', { id: 'gtScore', type: 'number', inputmode: 'numeric', min: 0, max: GT.MAX, step: 1, autocomplete: 'off', 'aria-describedby': 'gtHint' });
  const game = h('input', { id: 'gtGame', type: 'number', inputmode: 'numeric', min: 1, max: 20, step: 1, value: String(g0) });
  const ball = h('select', { id: 'gtBall' }, h('option', { value: '', text: 'Not set' }), ...balls.map(o => h('option', { value: o.id, text: nameOf(P, o.id) })));
  const save = async () => {
    const n = GT.parseTotal(score.value), g = Math.trunc(+game.value);
    if (n == null) { toast('Type a score from 0 to 300.', { kind: 'bad' }); score.focus(); return; }
    if (!(g >= 1 && g <= 20)) { toast('Type a game number from 1 to 20.', { kind: 'bad' }); game.focus(); return; }
    if (GT.taken(proj(), sid, g)) { toast(`Game ${g} already has a score on this night. Pick another game number.`, { kind: 'bad' }); game.focus(); return; }
    const o = { deviceId: deviceId(), prov: { kind: 'user', method: 'game-total' } }, list = [];
    if (tgt.create && !proj().sessions[sid]) list.push(mkEvent('session.created', sid, { kind: 'tonight', date: tgt.date }, o));
    list.push(mkEvent('game.logged', sid, { sessionId: sid, game: g, score: n, ballId: ball.value || null, date: (proj().sessions[sid] || {}).date || tgt.date }, o));
    await addMany(list); s.close(); toast(`${n} added as game ${g}.`); setTimeout(() => onDone(sid), 80);
  };
  const s = sheet({ title: 'Add a game total', id: 'gameTotal', body: h('div', { class: 'stack' },
    h('p', { class: 'muted small', id: 'gtHint', text: 'Just the final score, no frames. It counts in your games and average; strikes and spares need frames.' }),
    h('div', { class: 'row gt-row' }, h('label', { class: 'fld' }, h('span', { text: 'Score' }), score), h('label', { class: 'fld' }, h('span', { text: 'Game' }), game)),
    h('label', { class: 'fld' }, h('span', { text: 'Ball (optional)' }), ball),
    h('button', { class: 'btn primary block', id: 'gtSave', onclick: save }, 'Add game total')) });
  score.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
  setTimeout(() => score.focus(), 60);
  return s;
}
export const gameTotalButton = (id, opts = {}, label = 'Add a game total') => h('button', { class: 'btn ghost block', id, 'aria-haspopup': 'dialog', onclick: () => openGameTotal(opts) }, label);
