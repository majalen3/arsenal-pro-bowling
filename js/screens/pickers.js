// Bottom-sheet pickers used from the Lane screen: ball, conditions (pattern / surface / oil), tune, lines.
import { balls, rgTxt, coverKind, CLASSES } from '../data.js';
import { S, RANGES, FINISHES, PATTERNS, readInfo, readMedian } from '../engine.js';
import { app, linesForBall, applyLine, profile, esc } from '../store.js';
import { h, icon, sheet, segmented, stepper } from '../ui.js';
import { adjust, setBall, target } from '../ctl.js';
import { arrowsBoard } from '../cc/geom.js';
import { PATTERN_LABEL, PATTERN_HINT, FINISH_LABEL, fmtBoard } from '../labels.js';
import { go } from '../router.js';
let med = null;
export const readMed = () => (med == null ? (med = readMedian()) : med);
export const owned = () => { const p = profile(); return p && Array.isArray(p.owned) && p.owned.length ? p.owned : null; };
export function ballRow(b, { onPick, onCompare, current }) {
  const r = readInfo(b, readMed());
  const row = h('div', { class:'brow' + (current ? ' current' : '') },
    h('button', { class:'brow-main', 'aria-current':current ? 'true' : null, onclick:() => onPick(b) },
      h('span', { class:'swatch', style:{ background:b.color }, 'aria-hidden':'true' }),
      h('span', { class:'brow-text' }, h('span', { class:'brow-name', text:b.name }), h('span', { class:'brow-meta', text:`${coverKind(b)} · RG ${rgTxt(b)}${r ? ' · reads ' + r.tag : ''}` })),
      current ? h('span', { class:'pill gold', text:'On lane' }) : null),
    onCompare && !current ? h('button', { class:'icon-btn', 'aria-label':`Compare ${b.name} with ${app.ball.name}`, title:'Compare with ball on lane', html:icon('compare'), onclick:() => onCompare(b) }) : null);
  return row;
}
export function filterBalls(q, f) {
  const own = owned(); q = (q || '').trim().toLowerCase();
  return balls.filter(b => (!q || (b.name + ' ' + b.brand + ' ' + b.cover + ' ' + b.role).toLowerCase().includes(q))
    && (f === 'all' || (f === 'bag' ? (!own || own.includes(b.id)) : b.oil.includes(f))));
}
export function openBallSheet() {
  let q = '', f = 'all';
  const list = h('div', { class:'blist', role:'list' });
  const search = h('input', { type:'search', class:'search', placeholder:'Search 22 balls', 'aria-label':'Search balls', autocomplete:'off' });
  const chips = h('div', { class:'chips', role:'group', 'aria-label':'Filter' });
  const opts = [['all','All'], ['bag','My bag'], ['heavy','Heavy oil'], ['medium','Medium'], ['light','Light oil']];
  const drawChips = () => { chips.innerHTML = ''; opts.forEach(([v, l]) => chips.append(h('button', { class:'chip', 'aria-pressed':String(f === v), 'data-f':v, onclick:() => { f = v; drawChips(); draw(); } }, l))); };
  const draw = () => {
    list.innerHTML = ''; const res = filterBalls(q, f);
    if (!res.length) list.append(h('p', { class:'muted pad', text:'No balls match. Clear the search or pick All.' }));
    res.forEach(b => list.append(ballRow(b, { current:b.id === app.ball.id, onPick:x => { s.close(); setBall(x); }, onCompare:x => { s.close(); setTimeout(() => go(`#/compare?ids=${app.ball.id},${x.id}`), 0); } })));
  };
  search.oninput = () => { q = search.value; draw(); };
  drawChips(); draw();
  const s = sheet({ title:'Choose a ball', body:h('div', {}, search, chips, list), id:'ballSheet' });
}
export function openConditions() {
  const body = h('div', { class:'stack' },
    h('h3', { class:'label', text:'Pattern' }),
    h('div', { class:'opt-grid' }, PATTERNS.map(p => h('button', { class:'opt', 'aria-pressed':String(S.pattern === p), 'data-p':p, onclick:e => { adjust({ pattern:p }, { animate:true }); body.querySelectorAll('[data-p]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.p === p))); } },
      h('span', { class:'opt-t', text:PATTERN_LABEL[p] }), h('span', { class:'opt-s', text:PATTERN_HINT[p] })))),
    h('h3', { class:'label', text:'Surface' }),
    segmented('Surface', FINISHES.map(f => [f, FINISH_LABEL[f].replace(' grit', '')]), S.finish, v => adjust({ finish:v }, { animate:true }), 'wrap'),
    stepper({ id:'oil', label:'Oil volume', min:RANGES.oil[0], max:RANGES.oil[1], step:RANGES.oil[2], value:S.oil, fmt:v => '×' + (+v).toFixed(1), onChange:v => adjust({ oil:v }), hint:'1.0 is a typical house volume. Higher = more oil.' }),
    h('button', { class:'btn ghost', onclick:() => { s.close(); go('#/patterns'); } }, 'Browse 700+ real patterns'));
  const s = sheet({ title:'Lane conditions', body, id:'condSheet' });
}
export function tunePanel() {
  const rows = [
    stepper({ id:'speed', label:'Speed', unit:'mph', min:12, max:22, step:.5, value:S.speed, onChange:v => adjust({ speed:v }) }),
    stepper({ id:'rev', label:'Rev rate', unit:'rpm', min:100, max:500, step:10, value:S.rev, onChange:v => adjust({ rev:v }) }),
    stepper({ id:'release', label:'Feet (board at release)', min:5, max:30, step:1, value:S.release, onChange:v => adjust({ release:v, keepTarget:true }), hint:'Moving feet keeps your target.' }),
    stepper({ id:'target', label:'Target at arrows', min:1, max:39, step:.5, value:target(), fmt:fmtBoard, onChange:v => adjust({ target:v }), hint:'Board you aim over at 15 ft. The model reaches only about 0.8 board either side of your feet board here.' }),
  ];
  const wrap = h('div', { class:'tune stack' }, ...rows);
  wrap.sync = () => { rows[0].setValue(S.speed); rows[1].setValue(S.rev); rows[2].setValue(S.release); rows[3].setValue(target()); };
  return wrap;
}
export function openTune() { const p = tunePanel(); const s = sheet({ title:'Tune your shot', body:p, id:'tuneSheet' }); return { s, p }; }
export function openLines() {
  const ls = linesForBall();
  const body = h('div', { class:'stack' });
  if (!ls.length) body.append(h('p', { class:'muted', text:`No saved lines for ${app.ball.name} yet. Tap the bookmark on the lane to save the line you're throwing.` }));
  ls.forEach(l => body.append(h('button', { class:'line-row', onclick:() => { applyLine(l); s.close(); } },
    h('span', { class:'line-name', text:l.name }), h('span', { class:'line-meta', text:`Feet ${l.release} · Target ${fmtBoard(+arrowsBoard(+l.release, +l.aim).toFixed(1))} · ${l.speed} mph · ${PATTERN_LABEL[l.pattern] || l.pattern}${l.synced ? '' : ' · on this device'}` }))));
  body.append(h('button', { class:'btn ghost', onclick:() => { s.close(); go('#/sessions'); } }, 'All lines and sessions'));
  const s = sheet({ title:`Lines · ${app.ball.name}`, body, id:'linesSheet' });
}
