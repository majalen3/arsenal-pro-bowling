import { balls } from '../data.js';
import { S, RANGES } from '../engine.js';
import { profile, setOwnedMirror, setPrefs } from '../store.js';
import { h, segmented, stepper, toast } from '../ui.js';
import { adjust } from '../ctl.js';
import { go } from '../router.js';
import { ready, proj, addMany } from '../hub.js';
import * as A from '../cc/addball.js';
import { selectionEvents } from '../cc/ownership.js';
import { uuid } from '../data/schema.js';
export const STYLES = [['stroker', 'Stroker'], ['tweener', 'Tweener'], ['cranker', 'Cranker'], ['two', 'Two-handed']];
export function profileForm(p, onChange) {
  const set = (k, v) => { p[k] = v; if (p.entered) p.entered = Object.assign({}, p.entered, { [k]: true }); onChange && onChange(p); };   // Sim2 #11: what was touched
  return {
    hand: h('div', { class:'fld' }, h('span', { class:'label', text:'Bowling hand' }), segmented('Bowling hand', [['right', 'Right'], ['left', 'Left']], p.hand, v => set('hand', v), 'wide')),
    style: h('div', { class:'fld' }, h('span', { class:'label', text:'Style' }), segmented('Style', STYLES, p.style, v => set('style', v), 'wide')),
    speed: unknownStepper('speed', p, set, { id:'pSpeed', label:'Ball speed', unit:'mph', min:RANGES.speed[0], max:RANGES.speed[1], step:RANGES.speed[2], value:p.speed, fmt:v => (+v).toFixed(1), onChange:v => set('speed', v), hint:'Typical league bowler: 15\u201317 mph' }),
    rev: unknownStepper('rev', p, set, { id:'pRev', label:'Rev rate', unit:'rpm', min:RANGES.rev[0], max:RANGES.rev[1], step:RANGES.rev[2], value:p.rev, onChange:v => set('rev', v), hint:'Not sure? 200\u2013300 is common' }),
    pap: h('label', { class:'fld' }, h('span', { class:'label', text:'PAP (optional)' }), h('input', { id:'pPap', value:p.pap || '', placeholder:'e.g. 4 3/4 \u00d7 1/2 up', autocomplete:'off', oninput:e => set('pap', e.target.value.slice(0, 40)) })),
    tilt: h('label', { class:'fld' }, h('span', { class:'label', text:'Axis tilt (optional)' }), h('input', { id:'pTilt', value:p.tilt || '', placeholder:'e.g. 15\u00b0', autocomplete:'off', oninput:e => set('tilt', e.target.value.slice(0, 20)) })),
  };
}
function unknownStepper(k, p, set, opts) {
  const initial = p[k], known = initial != null && initial !== '';
  const row = stepper({ ...opts, onChange:v => { row.querySelector('input').removeAttribute('aria-valuetext'); opts.onChange(v); }, value: known ? +initial : +S[k], hint: 'Optional. Leave unknown if you have not measured or entered it.' });
  if (!known) { row.querySelector('output').textContent = 'Not set · model input is assumed'; row.querySelector('input').setAttribute('aria-valuetext', 'Not entered; model input ' + S[k] + ' is assumed'); }
  return row;
}
// Kept for older importers: empty always means empty, including a deliberate all-selected array.
export async function render({ query } = {}) {
  const db = await ready(), reviewLegacy = !!query?.has('review') && db.meta.ownershipReview?.needed;
  const draft = [], batchId = 'onboard-' + uuid(); let limit = 6, saving = false, reviewing = false;
  const result = h('div', { class:'blist', id:'welResults', 'aria-live':'polite' }), chosen = h('div', { class:'stack', id:'welChosen' });
  const q = h('input', { type:'search', class:'search', id:'welSearch', placeholder:'Brand or ball name', 'aria-label':'Brand or ball name', autocomplete:'off' });
  const brand = h('select', { id:'welBrand', 'aria-label':'Filter catalog by brand' }, h('option', { value:'', text:'All brands' }), ...[...new Set(A.catalog().map(e => e.brand))].sort().map(b => h('option', { value:b, text:b })));
  const next = h('button', { class:'btn primary block', id:'welNext', onclick:() => { if (reviewing) save(); else { reviewing = true; draw(); } } });
  const body = h('div', { class:'wel-body' }), count = h('p', { class:'small', id:'welCount', role:'status' });
  const finish = (skip = false) => { setPrefs({ onboarded:true }); go('#/bag', { replace:true }); };   // PRODUCT_SPINE: land on the front door, tonight's bag
  // A second physical copy sits right under the ball it copies (live eval: it landed at the bottom, so nicknames went on the wrong row).
  const addDraft = (e, near = false) => { const id = 'own-' + uuid(), base = `${e.brand} ${e.name}`.trim(), same = draft.filter(d => d.entry.id === e.id).length;
    const row = { id, entry:e, name:same ? `${base} #${same + 1}` : base, copyOf:same ? e.id : null };
    if (near && same) { let at = -1; draft.forEach((d, i) => { if (d.entry.id === e.id) at = i; }); draft.splice(at + 1, 0, row); } else draft.push(row); return row; };
  function select(e) { const i = draft.findIndex(d => d.entry.id === e.id); if (i < 0) addDraft(e); else { for (let j = draft.length - 1; j >= 0; j--) if (draft[j].entry.id === e.id) draft.splice(j, 1); } drawResults(); paintChosen(); }
  function drawResults() {
    const text = q.value.trim(), all = A.browse(text);   // every catalog match, not only the one exact alias (live eval: Hy-Road showed 1 of 5)
    const items = all.filter(e => !brand.value || e.brand === brand.value); result.replaceChildren();
    for (const e of items.slice(0, limit)) { const n = draft.filter(d => d.entry.id === e.id).length;
      result.append(h('button', { class:'brow-main', 'data-select':e.id, 'aria-pressed':String(n > 0), onclick:() => select(e) }, h('span', { class:'brow-text' }, h('span', { class:'brow-name', text:`${e.brand} ${e.name}` }), h('span', { class:'brow-meta', text:n ? `Selected · ${n} physical ${n === 1 ? 'ball' : 'balls'}` : 'Catalog model · not owned until you save' })))); }
    if (!items.length) result.append(h('p', { class:'muted', text:'No catalog match. Add by name below; specs can stay unknown.' }));
    else if (text) result.prepend(h('p', { class:'small muted', id:'welMatchCount', role:'status', text:`${items.length} catalog ${items.length === 1 ? 'match' : 'matches'} for \u201c${text}\u201d` }));
    if (items.length > limit) result.append(h('button', { class:'btn ghost block', id:'welMore', onclick:() => { limit += 6; drawResults(); } }, 'More matches'));
  }
  function paintChosen() {
    count.textContent = `${draft.length} physical ${draft.length === 1 ? 'ball selected' : 'balls selected'} · saved only when you confirm`;
    next.disabled = saving || !draft.length; next.textContent = saving ? 'Saving…' : reviewing ? 'Save my balls' : `Review ${draft.length || ''} selection${draft.length === 1 ? '' : 's'}`;
  }
  function drawReview() {
    chosen.replaceChildren();
    for (const d of draft) chosen.append(h('div', { class:'card' + (d.copyOf ? ' wel-copy' : ''), 'data-draft':d.id, 'data-entry':d.entry.id }, h('h2', { class:'card-title', text:`${d.entry.brand} ${d.entry.name}`.trim() + (d.copyOf ? ` \u00b7 copy ${draft.filter(x => x.entry.id === d.entry.id).indexOf(d) + 1}` : '') }),
      h('label', { class:'fld' }, h('span', { text:'Name for this physical copy' }), h('input', { value:d.name, maxlength:100, 'data-nickname':d.id, oninput:e => { d.name = e.target.value.slice(0,100); } })),
      h('div', { class:'btn-grid' }, h('button', { class:'btn ghost', 'data-copy':d.id, onclick:() => { const c = addDraft(d.entry, true); draw(); const f = chosen.querySelector(`[data-nickname="${c.id}"]`); if (f) f.focus(); } }, 'Add another copy'), h('button', { class:'btn ghost', 'data-remove':d.id, onclick:() => { draft.splice(draft.indexOf(d), 1); draw(); } }, 'Remove'))));
  }
  function draw() {
    body.replaceChildren(h('h1', { class:'title xl', text:reviewing ? 'These are mine' : reviewLegacy ? 'Review your older bag' : 'Add your balls' }), h('p', { class:'muted', text: reviewLegacy ? 'The older app showed 22 catalog models by default. Choose only physical balls you own. Existing saved balls, games and lines stay unchanged.' : 'Your arsenal starts empty. Search the shared catalog, then save only the balls you own. No account needed.' }));
    if (reviewing) { drawReview(); body.append(chosen, h('button', { class:'btn ghost block', id:'welBack', onclick:() => { reviewing = false; draw(); } }, 'Keep choosing')); }
    else { body.append(h('label', { class:'fld' }, h('span', { text:'Find a ball' }), q), h('label', { class:'fld' }, h('span', { text:'Brand filter' }), brand), result,
      h('details', { class:'card', id:'welManual' }, h('summary', { text:'Ball not found? Add by name' }), manualForm()),
      h('p', { class:'small', text:`${A.catalog().length} searchable catalog models, not every ball ever made. Catalog facts may describe a reference weight; your weight stays unknown. Missing or unsupported specs have no model path.` }),
      h('div', { class:'btn-grid' }, h('a', { class:'btn ghost', id:'welMaker', href:'#/add-ball' }, 'Maker lookup / typed specs'), h('a', { class:'btn ghost', href:'#/drill-card' }, 'Existing drill-card scan')),
      h('a', { class:'btn ghost block', href:'#/me' }, 'Restore a file or sign in'),
      h('p', { class:'small muted wel-legal', id:'welLegal' }, 'Your data stays on this phone unless you choose otherwise. ', h('a', { href:'privacy.html', id:'welPrivacy' }, 'Privacy'), ' \u00b7 ', h('a', { href:'terms.html', id:'welTerms' }, 'Terms')));
      drawResults(); }
    paintChosen();
  }
  function manualForm() {
    const name = h('input', { id:'welManualName', maxlength:100, required:'', autocomplete:'off' });
    return h('form', { class:'stack', onsubmit:e => { e.preventDefault(); const v = name.value.trim(); if (!v) return; addDraft({ id:'custom-' + uuid(), brand:'', name:v, fields:{}, src:'manual' }); name.value = ''; paintChosen(); toast('Name selected. Review before saving; specs are unknown.'); } }, h('label', { class:'fld' }, h('span', { text:'Ball name (specs optional)' }), name), h('button', { class:'btn ghost block', id:'welManualAdd', type:'submit' }, 'Select this name'));
  }
  async function save() {
    if (saving || !draft.length) return; saving = true; paintChosen();
    try {
      const evs = selectionEvents(draft, batchId);
      await addMany(evs); if (evs.some(e => !db.has(e.id))) throw new Error('Write not confirmed');
      setOwnedMirror([...new Set(Object.values(proj().owned).map(o => o.catalogId).filter(Boolean))], 1);
      if (reviewLegacy) await db.setMeta('ownershipReview', { v:1, needed:false, confirmed:true, importId:batchId, at:Date.now() });
      toast(db.backend.kind === 'memory' ? 'Only until this tab closes. Download a backup from Me.' : 'Saved on this phone. Backup is optional in Me.'); finish();
    } catch (_) { saving = false; paintChosen(); toast('Could not finish saving. Your selections remain here. Retry or download a backup in Me.', { kind:'bad' }); }
  }
  q.oninput = () => { limit = 6; drawResults(); }; brand.onchange = () => { limit = 6; drawResults(); }; draw();
  const el = h('section', { class:'screen welcome', id:'welcomeSearch' }, h('header', { class:'wel-top' }, h('span', { class:'brand', text:'Arsenal Pro' }), h('button', { class:'btn ghost sm', id:'welSkip', onclick:() => finish(true) }, reviewLegacy ? 'Keep older view' : 'Skip for now')), body, h('footer', { class:'wel-foot' }, count, next));
  return { el, title:'Add your balls' };
}
