// Fix a finished game (sim2 #4): from the night / session view, the same re-entry as the live pad. Fix a frame -> frame
// number -> re-enter it (a strike 1 tap, a spare 2) = at most 4 taps; Undo fix puts the old frame back. The old shots are
// voided, not deleted (js/cc/fix.js), and every number on the page is recomputed from the log.
import { h } from '../ui.js';
import { addMany } from '../hub.js';
import { deviceId } from '../store.js';
import * as Q from '../cc/quicklog.js';
import * as FX from '../cc/fix.js';
const TAP_GUARD_MS = 400;
// fx: the screen's fix state { game, f, throws, leave:Set, foul, pick, last, msg }, kept by the caller across redraws.
export const fixState = () => ({ game: null, f: null, throws: [], leave: new Set(), foul: false, pick: null, last: null, msg: '', t: 0, busy: false });
export function fixPanel(sid, g, fx, redraw) {
  const live = Q.stateOf(g.throws.map(x => ({ down: x.down, leave: x.leave || [], foul: !!x.foul })));
  const frames = live.frames.filter(fr => fr.marks.length && (live.done || fr.f < live.frame)).map(fr => fr.f);
  const box = h('div', { class: 'fix-game', 'data-game': g.game });
  const o = { deviceId: deviceId(), prov: { kind: 'user' } };
  if (fx.msg && fx.msgGame === g.game) box.append(h('p', { class: 'ql-saved small', role: 'status', 'data-fix-msg': '', text: fx.msg }));
  if (fx.last && fx.last.game === g.game && fx.last.sid === sid) box.append(h('button', { class: 'btn ghost block', 'data-undo-fix': g.game, onclick: async () => {
    const u = fx.last; fx.last = null; await addMany(FX.undoEvents(u, o)); fx.msg = `Saved \u2713 game ${u.game}, frame ${u.f} restored`; fx.msgGame = u.game; redraw(); } }, `Undo fix (game ${fx.last.game}, frame ${fx.last.f})`));
  if (fx.game !== g.game || (fx.f == null && fx.pick !== g.game)) {
    if (frames.length) box.append(h('button', { class: 'btn ghost block', 'data-fix-game': g.game, onclick: () => { Object.assign(fx, { game: g.game, pick: g.game, f: null, throws: [] }); fx.leave.clear(); fx.foul = false; redraw(); } }, `Fix a frame in game ${g.game}`));
    return box;
  }
  const close = () => { Object.assign(fx, { game: null, pick: null, f: null, throws: [] }); fx.leave.clear(); fx.foul = false; redraw(); };
  if (fx.f == null) {
    box.append(h('div', { class: 'fix-pick', role: 'group', 'aria-label': `Fix which frame in game ${g.game}?` }, h('p', { class: 'small muted', text: `Fix which frame in game ${g.game}?` }),
      h('div', { class: 'fix-grid' }, ...frames.map(f => h('button', { class: 'btn ghost', 'data-fix': f, 'aria-label': `Fix game ${g.game} frame ${f}`, onclick: () => { fx.f = f; fx.throws = []; redraw(); } }, String(f)))),
      h('button', { class: 'btn ghost block', 'data-fix-close': '', onclick: close }, 'Close')));
    return box;
  }
  const st = Q.editState(fx.f, fx.throws), facing = st.standing.length < 10, n = fx.leave.size;
  const push = async throws => {
    const now = Date.now(); if (fx.busy || now - fx.t < TAP_GUARD_MS) return; fx.t = now;
    fx.throws.push(...throws); fx.leave.clear(); fx.foul = false;
    if (!Q.editState(fx.f, fx.throws).closed) return redraw();
    fx.busy = true;
    try {
      const before = live.complete ? live.total : null, f = fx.f;
      const x = FX.fixEvents({ sid, game: g.game, f, old: g.throws.filter(z => z.frame === f), throws: fx.throws }, o);
      // the new total, from the same throws the projection will see
      const rest = g.throws.filter(z => z.frame !== f).map(z => ({ frame: z.frame, roll: z.roll, down: z.down, leave: z.leave || [], foul: !!z.foul }))
        .concat(fx.throws.map((t, i) => ({ frame: f, roll: i + 1, down: t.down, leave: t.leave || [], foul: !!t.foul }))).sort((a, b) => a.frame - b.frame || a.roll - b.roll);
      const after = Q.stateOf(rest);
      await addMany(x.events); fx.last = x.undo;
      fx.msg = `Saved \u2713 game ${g.game}, frame ${f} fixed` + (before != null && after.complete ? ` \u00b7 ${before} \u2192 ${after.total}` : ''); fx.msgGame = g.game;
      Object.assign(fx, { game: null, pick: null, f: null, throws: [] });
    } finally { fx.busy = false; }
    redraw();
  };
  const log = kind => push([Q.throwOf(kind, st.standing, { leave: [...fx.leave], foul: fx.foul })]);
  const spareNow = () => { const t1 = Q.throwOf('leave', st.standing, { leave: [...fx.leave] }); return push([t1, { down: t1.leave.length, leave: [], foul: false }]); };
  const pins = h('div', { class: 'pins', role: 'group', 'aria-label': facing ? 'Tap the pins still standing' : 'Tap the pins left standing' },
    ...Q.LAYOUT.map(([pin, col]) => h('button', { class: 'pin', 'data-pin': pin, 'aria-pressed': String(fx.leave.has(pin)), disabled: !st.standing.includes(pin), 'aria-label': `Pin ${pin}`,
      style: { gridColumn: `${col + 1} / span 2`, gridRow: String(pin >= 7 ? 1 : pin >= 4 ? 2 : pin >= 2 ? 3 : 4) }, onclick: () => { fx.leave.has(pin) ? fx.leave.delete(pin) : fx.leave.add(pin); redraw(); } }, String(pin))));
  const btns = h('div', { class: 'btn-grid' },
    facing ? h('button', { class: 'btn primary', 'data-k': 'spare', onclick: () => log('all') }, '/ Spare') : n ? null : h('button', { class: 'btn primary', 'data-k': 'strike', onclick: () => log('all') }, 'X Strike'),
    !facing && n && !fx.foul && (st.roll === 1 || (st.frame === 10 && st.roll === 2)) ? h('button', { class: 'btn primary', 'data-k': 'sparenow', onclick: spareNow }, `${n === 1 ? 'Pin' : n + ' pins'} left, then / spare`) : null,
    h('button', { class: 'btn ghost', 'data-k': 'leave', disabled: !n, onclick: () => log('leave') }, n ? `Log ${n} standing` : 'Tap pins standing'),
    facing ? h('button', { class: 'btn ghost', 'data-k': 'miss', onclick: () => log('none') }, '\u2013 Missed all') : null,
    h('button', { class: 'btn ghost', 'data-k': 'foul', 'aria-pressed': String(fx.foul), onclick: () => { fx.foul = !fx.foul; redraw(); } }, 'F Foul'));
  box.append(h('p', { class: 'pill', 'data-fixing': '', text: `Fixing game ${g.game}, frame ${fx.f} \u00b7 ball ${st.roll}` }), h('div', { class: 'ql-pad' }, pins, btns),
    h('button', { class: 'btn ghost block', 'data-fix-cancel': '', onclick: close }, `Cancel fix (frame ${fx.f} unchanged)`));
  return box;
}
