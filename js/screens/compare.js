import { balls, rgTxt, diffTxt, coverKind } from '../data.js';
import { analyze, readInfo, S, sensitivity } from '../engine.js';
import { h, icon, sheet, emptyState } from '../ui.js';
import { createLane } from '../lane.js';
import { setBall } from '../ctl.js';
import { go } from '../router.js';
import { backBar } from './ball.js';
import { readMed, ballRow } from './pickers.js';
import { PATTERN_LABEL, FINISH_LABEL, CALL_LABEL, CALL_TONE, f1 } from '../labels.js';
export function render({ query }) {
  const ids = (query.get('ids') || '').split(',').filter(Boolean).slice(0, 3);
  const ps = ids.map(id => balls.find(b => b.id === id)).filter(Boolean);
  if (ps.length < 2) return { el:h('section', { class:'screen' }, backBar('Compare', '#/arsenal'), emptyState('Pick two balls', 'Choose two or three balls in Arsenal to compare them side by side.', { label:'Go to Arsenal', run:() => go('#/arsenal') })), title:'Compare' };
  const lanes = [];
  const swap = i => { const s = sheet({ title:'Swap ball', body:h('div', { class:'blist' }, ...balls.filter(b => !ids.includes(b.id)).map(b => ballRow(b, { onPick:x => { s.close(); const n = ids.slice(); n[i] = x.id; go(`#/compare?ids=${n.join(',')}`, { replace:true }); } }))) }); };
  const res = ps.map(b => analyze(b));
  const cols = ps.map((b, i) => {
    const cv = h('canvas', { class:'mini-lane', role:'img', 'aria-label':`${b.name} on ${PATTERN_LABEL[S.pattern]}: ${CALL_LABEL[res[i].call]}, entry ${f1(res[i].entryBoard)}, ${f1(res[i].angle)} degrees` });
    lanes.push([cv, b, res[i]]);
    return h('div', { class:'cmp-col' },
      h('div', { class:'cmp-head' }, h('span', { class:'ball-orb', style:{ '--c':b.color }, 'aria-hidden':'true' }), h('div', {}, h('div', { class:'cmp-name', text:b.name }), h('div', { class:'muted small', text:b.brand })), h('button', { class:'icon-btn', 'aria-label':`Swap ${b.name}`, html:icon('sync'), onclick:() => swap(i) })),
      cv, h('div', { class:'mini-read', 'data-tone':CALL_TONE[res[i].call] }, h('b', { text:CALL_LABEL[res[i].call] })),
      h('button', { class:'btn sm primary', onclick:() => { setBall(b); go('#/lane'); } }, 'Put on lane'));
  });
  const best = (vals, fn) => { const nums = vals.map(fn); return nums; };
  const rows = [
    ['Entry board', b => f1(analyze(b).entryBoard), (b, i) => Math.abs(res[i].entryBoard - 17.5)],
    ['Entry angle', (b, i) => res[i].angle == null ? '\u2014' : f1(res[i].angle) + '\u00b0', (b, i) => res[i].angle == null ? 99 : Math.abs(res[i].angle - 5)],
    ['Breakpoint', (b, i) => res[i].bpBoard == null ? '\u2014' : `${f1(res[i].bpBoard)} @ ${Math.round(res[i].bpFeet)} ft`],
    ['Margin', b => sensitivity(b), b => -(+sensitivity(b).split(' ')[0])],
    ['RG', b => String(rgTxt(b))], ['Differential', b => String(diffTxt(b))], ['Cover', b => b.cover + (b.coverName ? ' (' + b.coverName + ')' : '')],
    ['Core', b => b.core + (b.coreName ? ' \u00b7 ' + b.coreName : '')], ['Factory finish', b => b.finish || '\u2014'],
    ['Reads', b => { const r = readInfo(b, readMed()); return r ? `${r.tag} (skids ~${Math.round(r.f)} ft)` : '\u2014'; }],
    ['Motion', b => b.motion], ['Use when', b => b.when], ['Leave in bag', b => b.whenNot]];
  const table = h('table', { class:'cmp-table' }, h('caption', { class:'sr-only', text:'Ball comparison' }),
    h('thead', {}, h('tr', {}, h('th', { scope:'col' }, h('span', { class:'sr-only', text:'Spec' })), ...ps.map(b => h('th', { scope:'col', text:b.name })))),
    h('tbody', {}, ...rows.map(([k, fn, score]) => { const vals = ps.map((b, i) => fn(b, i)); const sc = score ? ps.map((b, i) => score(b, i)) : null; const min = sc ? Math.min(...sc) : null; const diff = new Set(vals).size > 1;
      return h('tr', { class:diff ? 'differs' : 'same' }, h('th', { scope:'row', text:k }), ...vals.map((v, i) => h('td', { class:sc && sc[i] === min && diff ? 'best' : '' , text:v }))); })));
  const el = h('section', { class:'screen compare' }, backBar('Compare', '#/arsenal'),
    h('p', { class:'muted small pad-x', text:`Same line for both: feet ${S.release}, ${S.speed} mph, ${S.rev} rpm on ${PATTERN_LABEL[S.pattern]}, ${FINISH_LABEL[S.finish]}. Highlighted rows differ; gold = closer to a strike.` }),
    h('div', { class:'cmp-cols n' + ps.length }, ...cols), h('div', { class:'table-wrap' }, table));
  let ls = [];
  return { el, title:'Compare', mounted() { ls = lanes.map(([cv, b, r]) => { const l = createLane(cv); l.draw({ ball:b, result:r }, { animate:true }); return l; }); }, destroy() { ls.forEach(l => l.destroy()); } };
}
