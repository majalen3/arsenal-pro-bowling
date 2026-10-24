// Lane overlays menu (one per lane view). Today's only toggle is the Aim Box (default off). The oil line, feet,
// arrows and entry tiles are always drawn. Everything here is between-games planning, never shown during scoring.
import { h, sheet, segmented, stepper } from '../ui.js';
import { prefs, setPrefs } from '../store.js';
import * as AB from '../cc/aimbox.js';
export const aimPref = () => prefs().aimBox || {};
// A pattern getter may return the engine preset name or { preset, ft } (ft = tonight's picked length, sim2 #2).
const pat = g => { const v = g(); return v && typeof v === 'object' ? v : { preset: v, ft: null }; };
const boxFor = (pref, g) => { const q = pat(g); return AB.boxOf(pref, q.preset, q.ft); };
const setAim = p => setPrefs({ aimBox: Object.assign({}, aimPref(), p) });
// Lane hook: returns null when off, so the lane draws nothing extra.
export const aimLayer = pattern => result => { const box = boxFor(aimPref(), pattern); return box ? { box, ok: AB.through(box, result && result.points) } : null; };
// Status pill: hidden when off; "Through zone" (good) or "Outside zone" (warn), the same tones as the pocket read.
// sim2 #1: ctx() = { cat, speed, rev, finish, oil } lets the pill check whether ANY modelled strike line can pass the box.
// When none can (the model's breakpoints sit nearer than a 45 ft house box), it says "Beyond model" (neutral, explained in
// its title and the lane's label) instead of marking the app's own recommended line "Outside zone".
export function paintPill(pill, pattern, result, ctx) {
  const box = boxFor(aimPref(), pattern);
  pill.hidden = !box; if (!box) { delete pill.dataset.state; pill.dataset.why = ''; return ''; }
  const ok = AB.through(box, result && result.points), c = !ok && ctx ? ctx() : null, q = pat(pattern);
  const rc = c && c.cat ? AB.reach(box, c.cat, { speed: c.speed, rev: c.rev, preset: q.preset, finish: c.finish, oil: c.oil }) : null;
  const beyond = !!(rc && !rc.any), why = beyond ? AB.beyondWhy(box, rc) : '';
  pill.textContent = ok ? 'Through zone' : beyond ? 'Beyond model' : 'Outside zone';
  if (beyond) delete pill.dataset.tone; else pill.dataset.tone = ok ? 'good' : 'warn';
  pill.dataset.state = ok ? 'through' : beyond ? 'beyond' : 'outside'; pill.dataset.why = why;
  pill.title = `Aim Box ${AB.label(box)}${beyond ? '. ' + why : ''}`;
  return ` Aim Box ${AB.label(box)}: ${ok ? 'path goes through it' : beyond ? why : 'path misses it'}.`;
}
export function overlaysBtn(pattern, id = 'ovBtn') {
  return h('button', { class: 'chip', id, 'aria-haspopup': 'dialog', onclick: () => openOverlays(pattern) }, 'Overlays');
}
export function openOverlays(pattern) {
  const body = h('div', { class: 'stack', id: 'ovSheet' });
  const paint = () => {
    const ae = document.activeElement, grp = ae && ae.closest && ae.closest('[role=radiogroup]'), gl = grp && grp.getAttribute('aria-label');
    const p = aimPref(), box = boxFor(Object.assign({}, p, { on: true }), pattern), preset = p.preset || box.preset;
    const kids = [
      h('div', { class: 'fld' }, h('span', { text: 'Aim Box' }), segmented('Aim Box', [['off', 'Off'], ['on', 'On']], p.on ? 'on' : 'off', v => { setAim({ on: v === 'on' }); paint(); })),
      h('p', { class: 'muted small', id: 'ovTip', text: AB.TIP })];
    if (p.on) {
      kids.push(h('div', { class: 'fld' }, h('span', { text: 'Box' }), segmented('Aim Box preset', Object.entries(AB.PRESETS), preset, v => {
        setAim(v === 'custom' && !p.b1 ? { preset: v, b1: box.b1, b2: box.b2, ft: box.ft, depth: box.depth } : { preset: v }); paint(); }, 'wide')),
        h('p', { class: 'small', id: 'ovBoxTxt' }, h('b', { text: `Boards ${AB.label(box)}. ` }), AB.source(box)));
      if (preset === 'custom') {
        const st = (id, label, k, min, max, step, unit) => stepper({ id, label, unit, min, max, step, value: box[k], onChange: v => { const c = boxFor(Object.assign({}, aimPref(), { on: true, preset: 'custom' }), pattern), q = { preset: 'custom', b1: c.b1, b2: c.b2, ft: c.ft, depth: c.depth, [k]: v }; if (q.b2 <= q.b1) q.b2 = q.b1 + 1; setAim(q); } });
        kids.push(st('ovB1', 'Outside edge (board)', 'b1', 1, 30, .5, ''), st('ovB2', 'Inside edge (board)', 'b2', 2, 31, .5, ''), st('ovFt', 'Distance (centre)', 'ft', 30, 55, 1, 'ft'), st('ovDepth', 'Depth', 'depth', 1, 6, 1, 'ft'));
      }
      kids.push(h('p', { class: 'muted small', text: 'Aims for roughly 4\u20136\u00b0 model entry (drawn units, about 1\u00b0 real). Saved on this device.' }));
    }
    body.replaceChildren(...kids);
    if (gl) { const n = body.querySelector(`[role=radiogroup][aria-label="${gl}"] [aria-checked=true]`); n && n.focus({ preventScroll: true }); }   // keep focus in the sheet after a repaint
  };
  paint();
  return sheet({ title: 'Lane overlays', body, id: 'ovSheetDlg' });
}
