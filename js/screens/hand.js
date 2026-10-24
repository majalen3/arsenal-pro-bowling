// The one-time "Which hand?" question (inline, never a pop-up over the lane) and the "Right-handed · change" line.
import { h, sheet, toast } from '../ui.js';
import { go } from '../router.js';
import * as H from '../cc/hand.js';
const rerender = () => go(location.hash, { replace: true });
function pick(v, close) { H.setHand(v); toast(`${H.HAND_LABEL[v]}. Change it any time in More \u203a Bowler profile.`); if (close) { close(); setTimeout(rerender, 80); } else rerender(); }
// Shown on the first hand-dependent screen while the hand is unset; gone for good after an answer or "Not now".
export function handAsk() {
  if (!H.needsAsk()) return null;
  return h('div', { class: 'card hand-ask', id: 'handAsk', role: 'group', 'aria-labelledby': 'handAskQ' },
    h('p', { id: 'handAskQ' }, h('b', { text: 'Which hand do you bowl with?' }), ' Lane views and spare moves follow it.'),
    h('div', { class: 'btn-grid three' }, h('button', { class: 'btn ghost', id: 'handR', onclick: () => pick('right') }, 'Right'), h('button', { class: 'btn ghost', id: 'handL', onclick: () => pick('left') }, 'Left'),
      h('button', { class: 'btn ghost', id: 'handLater', onclick: () => { H.dismissAsk(); rerender(); } }, 'Not now')));
}
export function changeHand() {
  const s = sheet({ title: 'Bowling hand', id: 'handSheet', body: h('div', { class: 'stack' }, h('p', { class: 'muted small', text: 'Lane views, spare moves and coach words follow this. Nothing else changes.' }),
    h('div', { class: 'btn-grid' }, h('button', { class: 'btn ' + (H.hand() === 'right' ? 'primary' : 'ghost'), id: 'handSheetR', onclick: () => pick('right', s.close) }, 'Right'),
      h('button', { class: 'btn ' + (H.hand() === 'left' ? 'primary' : 'ghost'), id: 'handSheetL', onclick: () => pick('left', s.close) }, 'Left'))) });
  return s;
}
// P1.6: "Right-handed · change" (or "Hand not set · set") as one quiet line.
export function handLine(id = 'tnHand') {
  const v = H.hand();
  return h('p', { class: 'small muted hand-line', id }, v ? H.HAND_LABEL[v] : 'Hand not set (reading boards right-handed)', ' \u00b7 ',
    h('button', { class: 'linkish', id: id + 'Change', onclick: changeHand }, v ? 'change' : 'set'));
}
