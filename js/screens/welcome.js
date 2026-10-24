import { balls } from '../data.js';
import { S, RANGES } from '../engine.js';
import { profile, setProfile, setPrefs } from '../store.js';
import { h, segmented, stepper, toast } from '../ui.js';
import { adjust } from '../ctl.js';
import { go } from '../router.js';
export const STYLES = [['stroker', 'Stroker'], ['tweener', 'Tweener'], ['cranker', 'Cranker'], ['two', 'Two-handed']];
export function profileForm(p, onChange) {
  const set = (k, v) => { p[k] = v; if (p.entered) p.entered = Object.assign({}, p.entered, { [k]: true }); onChange && onChange(p); };   // Sim2 #11: what was touched
  return {
    hand: h('div', { class:'fld' }, h('span', { class:'label', text:'Bowling hand' }), segmented('Bowling hand', [['right', 'Right'], ['left', 'Left']], p.hand, v => set('hand', v), 'wide')),
    style: h('div', { class:'fld' }, h('span', { class:'label', text:'Style' }), segmented('Style', STYLES, p.style, v => set('style', v), 'wide')),
    speed: stepper({ id:'pSpeed', label:'Ball speed', unit:'mph', min:RANGES.speed[0], max:RANGES.speed[1], step:RANGES.speed[2], value:p.speed, fmt:v => (+v).toFixed(1), onChange:v => set('speed', v), hint:'Typical league bowler: 15\u201317 mph' }),
    rev: stepper({ id:'pRev', label:'Rev rate', unit:'rpm', min:RANGES.rev[0], max:RANGES.rev[1], step:RANGES.rev[2], value:p.rev, onChange:v => set('rev', v), hint:'Not sure? 200\u2013300 is common' }),
    pap: h('label', { class:'fld' }, h('span', { class:'label', text:'PAP (optional)' }), h('input', { id:'pPap', value:p.pap || '', placeholder:'e.g. 5 1/8 \u00d7 1/2 up', autocomplete:'off', oninput:e => set('pap', e.target.value.slice(0, 40)) })),
    tilt: h('label', { class:'fld' }, h('span', { class:'label', text:'Axis tilt (optional)' }), h('input', { id:'pTilt', value:p.tilt || '', placeholder:'e.g. 15\u00b0', autocomplete:'off', oninput:e => set('tilt', e.target.value.slice(0, 20)) })),
  };
}
export function ownedPicker(p) {
  const sel = new Set(p.owned && p.owned.length ? p.owned : balls.map(b => b.id));
  const all = h('button', { class:'btn ghost sm', type:'button', onclick:() => { const every = sel.size === balls.length; sel.clear(); if (!every) balls.forEach(b => sel.add(b.id)); paint(); } });
  const list = h('div', { class:'own-grid' }, ...balls.map(b => h('button', { type:'button', class:'own', 'data-ball':b.id, 'aria-pressed':'true', onclick:e => { sel.has(b.id) ? sel.delete(b.id) : sel.add(b.id); paint(); } }, h('span', { class:'swatch', style:{ background:b.color } }), h('span', { text:b.name }))));
  const paint = () => { list.querySelectorAll('.own').forEach(x => x.setAttribute('aria-pressed', String(sel.has(x.dataset.ball)))); all.textContent = sel.size === balls.length ? 'Clear all' : 'Select all'; p.owned = sel.size === balls.length ? [] : [...sel]; };
  paint();
  return h('div', { class:'stack' }, h('div', { class:'row between' }, h('span', { class:'muted small', text:'Tap to toggle. \u201cMy bag\u201d filters use this.' }), all), list);
}
export function render() {
  const p = Object.assign({ hand:'right', style:'tweener', speed:+S.speed, rev:+S.rev, pap:'', tilt:'', owned:[] }, profile() || { entered:{} });
  let step = 0;
  const finish = (skip) => { if (!skip) { setProfile(p); adjust({ speed:p.speed, rev:p.rev }); } setPrefs({ onboarded:true }); go('#/tonight', { replace:true }); toast(skip ? 'You can set your profile any time in More.' : 'Profile saved. Tonight is ready.'); };
  const f = profileForm(p);
  const steps = [
    ['How do you bowl?', 'Two quick questions. Skip any time.', [f.hand, f.style]],
    ['Speed and revs', 'These drive the lane model. Rough is fine.', [f.speed, f.rev, h('details', {}, h('summary', { text:'More (PAP, tilt)' }), f.pap, f.tilt)]],
    ['Which balls do you own?', 'Start with all 22 or pick yours.', [ownedPicker(p)]]];
  const body = h('div', { class:'wel-body' }), dots = h('div', { class:'dots', 'aria-hidden':'true' });
  const nextBtn = h('button', { class:'btn primary lg', id:'welNext', onclick:() => step < 2 ? (step++, draw()) : finish(false) });
  const backBtn = h('button', { class:'btn ghost lg', id:'welBack', onclick:() => { step--; draw(); } }, 'Back');
  function draw() {
    const [t, sub, kids] = steps[step]; body.innerHTML = '';
    body.append(h('p', { class:'eyebrow', text:`Step ${step + 1} of 3` }), h('h1', { class:'title xl', tabindex:'-1', text:t }), h('p', { class:'muted', text:sub }), h('div', { class:'stack' }, ...kids));
    dots.innerHTML = steps.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('');
    nextBtn.textContent = step < 2 ? 'Next' : 'Start bowling'; backBtn.hidden = step === 0;
    body.querySelector('h1').focus({ preventScroll:true });
  }
  draw();
  const el = h('section', { class:'screen welcome' },
    h('header', { class:'wel-top' }, h('span', { class:'brand' }, h('span', { class:'brand-mark', 'aria-hidden':'true' }), 'Arsenal Pro'), h('button', { class:'btn ghost sm', id:'welSkip', onclick:() => finish(true) }, 'Skip')),
    body, h('footer', { class:'wel-foot' }, dots, h('div', { class:'row gap' }, backBtn, nextBtn)));
  return { el, title:'Welcome' };
}
