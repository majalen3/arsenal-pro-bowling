// Status UI (P1.3): one control, the same four words everywhere, and the shared "Why not this ball?" line.
import { h, sheet, toast, segmented } from '../ui.js';
import { go } from '../router.js';
import { add } from '../hub.js';
import * as ST from '../cc/status.js';
const rerender = () => go(location.hash, { replace: true });
export async function setStatus(id, v, name) { await add('ownedBall.edited', id, { fields: { status: v } }); toast(`${name}: ${ST.LABEL[v]}.`); }
// Row control: "At home ▾" → a sheet with the 4 choices (2 taps).
export function statusButton(P, id, { onDone = rerender } = {}) {
  const x = ST.itemOfOwned(P, id); if (!x) return null;
  return h('button', { class: 'btn ghost sm status-btn', 'data-status-of': id, 'aria-haspopup': 'dialog', 'aria-label': `${x.name}: ${ST.LABEL[x.status]}. Change where it is`, onclick: () => {
    const s = sheet({ title: `Where is ${x.name}?`, id: 'statusSheet', body: h('div', { class: 'stack', role: 'group', 'aria-label': 'Status' },
      ...ST.STATUS.map(([k, l]) => h('button', { class: 'btn block ' + (k === x.status ? 'primary' : 'ghost'), 'data-set-status': k, 'aria-pressed': String(k === x.status), onclick: async () => {
        s.close(); if (k !== x.status) await setStatus(id, k, x.name); setTimeout(onDone, 80); } }, l))) });
  } }, ST.LABEL[x.status] + ' \u25be');
}
// Ball page: the four choices inline.
export function statusField(P, id) {
  const x = ST.itemOfOwned(P, id); if (!x) return null;
  return h('div', { class: 'fld', id: 'ballStatus' }, h('span', { text: 'Where is it?' }),
    segmented('Where is it?', ST.STATUS, x.status, async v => { await setStatus(id, v, x.name); rerender(); }, 'wide'));
}
// "Why not this ball?" as one quiet line (null when the ball is in tonight's bag).
export function whyNotLine(P, id, { demand = null, idAttr = null } = {}) {
  const w = ST.whyNotFor(P, id, { demand }); if (!w) return null;
  return h('p', { class: 'small muted why-not', id: idAttr, 'data-why-not': id, 'data-why': w.key }, h('b', { text: 'Why not this ball? ' }), w.text);
}
