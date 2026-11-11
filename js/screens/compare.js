import { balls, rgTxt, diffTxt, coverKind, modelOK } from '../data.js';
import { analyze, readInfo, S, sensitivity } from '../engine.js';
import { h, icon, sheet, emptyState } from '../ui.js';
import { createLane } from '../lane.js';
import { setBall } from '../ctl.js';
import { profile } from '../store.js';
import { aimLayer } from './overlays.js';
import { proj } from '../hub.js';
import { openNight } from '../cc/night.js';
import { presetFor } from '../cc/model.js';
import { go } from '../router.js';
import { backBar } from './ball.js';
import { readMed, ballRow } from './pickers.js';
import { PATTERN_LABEL, FINISH_LABEL, CALL_LABEL, CALL_TONE, f1 } from '../labels.js';
import { helpDot, withHelp } from './help.js';
import { aboutAngle, releaseSource } from '../cc/provenance.js';
import * as HAND from '../cc/hand.js';
import { fitToPocket } from '../cc/pocketfit.js';
// sim2 #2: the Aim Box uses tonight's picked length when this preset is tonight's (same as Lane and Targeting)
const patNow = () => { const P = proj(), sess = P ? ((P.sessions || {})[openNight(P) || ''] || {}) : {}, ft = sess.ft != null ? +sess.ft : null;
  return { preset: S.pattern, ft: ft != null && presetFor(ft) === S.pattern ? ft : null }; };
export function render({ query }) {
  const ids = (query.get('ids') || '').split(',').filter(Boolean).slice(0, 3);
  const ps = ids.map(id => balls.find(b => b.id === id)).filter(Boolean);
  if (ps.length < 2) return { el:h('section', { class:'screen' }, backBar('Compare', '#/arsenal'), emptyState('Pick two balls', 'Choose two or three balls in Arsenal to compare them side by side.', { label:'Go to Arsenal', run:() => go('#/bag?view=all') })), title:'Compare' };
  const lanes = [];
  const swap = i => { const s = sheet({ title:'Swap ball', body:h('div', { class:'blist' }, ...balls.filter(b => !ids.includes(b.id)).map(b => ballRow(b, { onPick:x => { s.close(); const n = ids.slice(); n[i] = x.id; go(`#/compare?ids=${n.join(',')}`, { replace:true }); } }))) }); };
  const res = ps.map(b => modelOK(b) ? analyze(b) : { points:[], call:'', entryBoard:null, angle:null, bpBoard:null, bpFeet:null });
  // owner t122u: each drawn line finishes at the pocket. The table keeps the same-line numbers (that is the comparison); the
  // pictures show each ball's own line to the pocket, fitted on aim/feet and labelled as an estimate.
  const fit = ps.map(b => modelOK(b) ? fitToPocket(b, { release:+S.release, aim:+S.aim }) : null);
  const cols = ps.map((b, i) => {
    const cv = h('canvas', { class:'mini-lane', role:'img', 'aria-label':`${b.name} on ${PATTERN_LABEL[S.pattern]}: ${CALL_LABEL[res[i].call]}, entry ${f1(res[i].entryBoard)}, ${f1(res[i].angle)} degrees` });
    if (modelOK(b)) { lanes.push([cv, b, fit[i].result]); cv.dataset.endBoard = String(fit[i].endBoard); cv.dataset.pocketOk = String(fit[i].ok); } else cv.hidden = true;
    return h('div', { class:'cmp-col' },
      h('div', { class:'cmp-head' }, h('span', { class:'ball-orb', style:{ '--c':b.color }, 'aria-hidden':'true' }), h('div', {}, h('div', { class:'cmp-name', text:b.name }), h('div', { class:'muted small', text:b.brand })), h('button', { class:'icon-btn', 'aria-label':`Swap ${b.name}`, html:icon('sync'), onclick:() => swap(i) })),
      cv, fit[i] ? h('p', { class:'small cmp-fit', 'data-fit':b.id }, h('span', { class:'prov', 'data-prov':'model', text:'estimate' }), fit[i].ok ? ` To the pocket: feet ${fit[i].ov.release}, aim ${fit[i].ov.aim}${fit[i].fitted ? ' (fitted)' : ''}` : ' No line reaches the pocket here') : null, h('div', { class:'mini-read', 'data-tone':CALL_TONE[res[i].call] }, h('b', { text:CALL_LABEL[res[i].call] || 'Specs unverified / cover not supported' })),
      h('button', { class:'btn sm primary', onclick:() => { setBall(b); go('#/lane'); } }, 'Put on lane'));
  });
  const best = (vals, fn) => { const nums = vals.map(fn); return nums; };
  const rows = [
    ['Entry board · model', (b,i) => f1(res[i].entryBoard), (b, i) => Math.abs(res[i].entryBoard - 17.5)],
    ['Entry angle · model', (b, i) => res[i].angle == null ? '\u2014' : aboutAngle(res[i].angle), (b, i) => res[i].angle == null ? 99 : Math.abs(res[i].angle - 5)],
    ['Breakpoint · model', (b, i) => res[i].bpBoard == null ? '\u2014' : `${f1(res[i].bpBoard)} @ ${Math.round(res[i].bpFeet)} ft`],
    ['Margin · model', b => modelOK(b) ? sensitivity(b) : '\u2014', b => modelOK(b) ? -(+sensitivity(b).split(' ')[0]) : 99],
    ['RG', b => String(rgTxt(b))], ['Differential', b => String(diffTxt(b))], ['Cover', b => b.cover + (b.coverName ? ' (' + b.coverName + ')' : '')],
    ['Core', b => b.core + (b.coreName ? ' \u00b7 ' + b.coreName : '')], ['Factory finish', b => b.finish || '\u2014'],
    ['Reads · model', b => { const r = modelOK(b) ? readInfo(b, readMed()) : null; return r ? `${r.tag} (skids ~${Math.round(r.f)} ft)` : '\u2014'; }],
    ['Motion', b => b.motion], ['Use when', b => b.when], ['Leave in bag', b => b.whenNot]];
  const table = h('table', { class:'cmp-table' }, h('caption', { class:'sr-only', text:'Ball comparison' }),
    h('thead', {}, h('tr', {}, h('th', { scope:'col' }, h('span', { class:'sr-only', text:'Spec' })), ...ps.map(b => h('th', { scope:'col', text:b.name })))),
    h('tbody', {}, ...rows.map(([k, fn, score]) => { const vals = ps.map((b, i) => fn(b, i)); const sc = score ? ps.map((b, i) => score(b, i)) : null; const min = sc ? Math.min(...sc) : null; const diff = new Set(vals).size > 1;
      return h('tr', { class:diff ? 'differs' : 'same' }, h('th', { scope:'row' }, k.replace(' · model',''), k.endsWith(' · model') ? h('span', { class:'prov', 'data-prov':'model', text:'model' }) : ['RG','Differential'].includes(k) ? h('span', { class:'prov', 'data-prov':'manufacturer', text:'maker / see ball' }) : null), ...vals.map((v, i) => h('td', { class:sc && sc[i] === min && diff ? 'best' : '' , text:v }))); })));
  const el = h('section', { class:'screen compare' }, backBar('Compare', '#/arsenal'),
    h('p', { class:'muted small pad-x' }, helpDot('ap-compare', 'Compare'), ` Same line for both: feet ${S.release} · input; `, `${S.speed} mph`, h('span', { class:'prov', 'data-prov':releaseSource(proj().bowler?.speed, S.speed)[0], text:releaseSource(proj().bowler?.speed, S.speed)[1] }), ` ${S.rev} rpm`, h('span', { class:'prov', 'data-prov':releaseSource(proj().bowler?.rev, S.rev)[0], text:releaseSource(proj().bowler?.rev, S.rev)[1] }), ` on ${PATTERN_LABEL[S.pattern]}, ${FINISH_LABEL[S.finish]}. Highlighted rows differ; gold = closer to a model strike.`),
    h('div', { class:'cmp-body n' + ps.length }, h('div', { class:'cmp-cols n' + ps.length }, ...cols), h('div', { class:'table-wrap' }, table)));
  let ls = [];
  return { el, title:'Compare', mounted() { ls = lanes.map(([cv, b, r]) => { const l = createLane(cv, { lefty:HAND.isLefty, aimBox:aimLayer(patNow) }); l.draw({ ball:b, result:r }, { animate:true }); return l; }); }, destroy() { ls.forEach(l => l.destroy()); } };
}
