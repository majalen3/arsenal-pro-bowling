import { balls, CLASSES, rgTxt, diffTxt, coverKind } from '../data.js';
import { S, readInfo } from '../engine.js';
import { app } from '../store.js';
import { h, icon, toast } from '../ui.js';
import { setBall } from '../ctl.js';
import { go } from '../router.js';
import { readMed, owned } from './pickers.js';
import { PATTERN_LABEL } from '../labels.js';
import { ready, proj } from '../hub.js';
import { catOf } from '../cc/cats.js';
import * as A from '../cc/armory.js';
const st = { q:'', f:'all', picked:[] };
const PAT_OIL = { house:'medium', cheetah:'medium', sport:'heavy', scorpion:'heavy', shark:'heavy', dry:'light' };
const short = c => c.split(' / ')[0].replace('Strong ', 'Str. ').replace('Medium ', 'Med. ').replace('Asymmetrical', 'Asym').replace('Symmetrical', 'Sym');
export function tile(b, { onCompareToggle, picked }) {
  const r = readInfo(b, readMed());
  const t = h('article', { class:'btile' + (b.id === app.ball.id ? ' current' : ''), 'data-ball':b.id },
    h('a', { class:'btile-link', href:`#/ball/${b.id}`, 'aria-describedby':null },
      h('span', { class:'ball-orb', style:{ '--c':b.color }, 'aria-hidden':'true' }),
      h('span', { class:'btile-text' }, h('span', { class:'btile-name', text:b.name }), h('span', { class:'btile-brand', text:`${b.brand}${b.year ? ' · ' + b.year : ''}` }), h('span', { class:'btile-role', text:b.role }))),
    h('div', { class:'btile-specs num' }, h('span', {}, h('small', { text:'RG' }), String(rgTxt(b))), h('span', {}, h('small', { text:'Diff' }), String(diffTxt(b))), h('span', {}, h('small', { text:'Cover' }), coverKind(b)), r ? h('span', {}, h('small', { text:'Reads' }), r.tag) : null),
    h('div', { class:'btile-actions' },
      b.id === app.ball.id ? h('span', { class:'pill gold', text:'On lane' }) : h('button', { class:'btn sm primary', 'aria-label':`Put on lane: ${b.name}`, onclick:() => { setBall(b); go('#/lane'); } }, 'Put on lane'),
      h('button', { class:'btn sm ghost cmp-btn', 'aria-pressed':String(picked), 'aria-label':`${picked ? 'Picked' : 'Compare'} ${b.name}`, onclick:() => onCompareToggle(b) }, h('span', { html:icon(picked ? 'check' : 'compare') }), picked ? 'Picked' : 'Compare')));
  return t;
}
// Armory (owner brief 2026-10-24): owned balls on lit shelves with gold nameplates; retired balls in the Hall of Fame.
// One takeaway: what is in your bag. Bench and Hall of Fame sit behind a tap; the full catalog stays below.
function pedestal(it) {
  const c = it.cat, inCatalog = c && balls.some(b => b.id === c.id), onLane = c && c.id === app.ball.id;
  const specs = c && c.rg != null ? `RG ${rgTxt(c)} \u00b7 Diff ${diffTxt(c)}` : 'Specs not entered';
  return h('article', { class:'ped' + (onLane ? ' onlane' : ''), 'data-own':it.id },
    h('a', { class:'ped-link', href:inCatalog ? `#/ball/${c.id}` : '#/bag' },
      h('span', { class:'ped-lit', 'aria-hidden':'true' }, h('span', { class:'ball-orb', style:{ '--c':it.color || 'var(--text-3)' } })),
      h('span', { class:'plate' }, h('span', { class:'plate-name', text:(it.benchmark ? '\u2605 ' : '') + it.name }),
        it.role ? h('span', { class:'plate-role', text:it.role }) : null, h('span', { class:'plate-spec num', text:specs }), onLane ? h('span', { class:'sr-only', text:'on lane' }) : null)),
    it.earned.length || onLane ? h('div', { class:'ped-marks' }, onLane ? h('span', { class:'pill gold', text:'On lane' }) : null, ...it.earned.map(m => h('span', { class:'pill', 'data-m':m.id, text:m.text }))) : null);
}
function armory(P) {
  const sh = A.shelves(P, catOf);
  const shelf = (items, id, label, extra) => h('div', { class:'shelf', id, role:'list', 'aria-label':label }, ...items.map(it => h('div', { role:'listitem' }, pedestal(it))), extra || null);
  const empty = h('div', { role:'listitem' }, h('a', { class:'ped ped-empty', id:'armEmpty', href:'#/add-ball' }, h('span', { class:'ped-lit', 'aria-hidden':'true' }, h('span', { class:'ped-slot' })), h('span', { class:'plate' }, h('span', { class:'plate-name', text:'Add ball' }), h('span', { class:'plate-role', text:'Empty pedestal' }))));
  const fold = (id, label, n, body) => h('details', { class:'card arm-fold', id }, h('summary', {}, h('span', { text:label }), h('span', { class:'pill', text:String(n) })), body);
  return h('section', { class:'armory', id:'armory', 'aria-labelledby':'armBagH' },
    h('h2', { class:'group-h', id:'armBagH', text:`In the bag \u00b7 ${sh.bag.length}` }),
    shelf(sh.bag, 'armBag', 'In the bag', empty),
    sh.bench.length ? fold('armBench', 'Bench and pro shop', sh.bench.length, shelf(sh.bench, 'armBenchShelf', 'Bench and pro shop')) : null,
    fold('armHall', 'Hall of Fame', sh.hall.length, sh.hall.length ? shelf(sh.hall, 'armHallShelf', 'Hall of Fame')
      : h('div', { class:'stack', id:'armHallNone' }, h('p', { class:'muted small', text:'Retired balls rest here with their record. Set a ball to Retired in Bag.' }), h('a', { class:'btn ghost sm', href:'#/bag' }, 'Open Bag'))),
    h('p', { class:'muted small', id:'armNote', text:'Marks appear only from games you log with frames.' }));
}
export async function render() {
  await ready(); const P = proj(), T = A.title(P);
  const search = h('input', { type:'search', class:'search', id:'arsSearch', placeholder:'Search name, cover, role', 'aria-label':'Search balls', value:st.q, autocomplete:'off' });
  const chips = h('div', { class:'chips scroll', role:'group', 'aria-label':'Filter balls' });
  const grid = h('div', { class:'bgrid', id:'arsGrid' });
  const tray = h('div', { class:'tray', id:'tray', hidden:true });
  const sugg = h('div', { class:'sugg', id:'sugg' });
  const count = h('p', { class:'muted small', id:'arsCount', 'aria-live':'polite' });
  const opts = [['all', 'All 22'], ['bag', 'My bag'], ['heavy', 'Heavy oil'], ['medium', 'Medium oil'], ['light', 'Light oil'], ['Solid', 'Solid'], ['Pearl', 'Pearl'], ['Hybrid', 'Hybrid'], ['Urethane', 'Urethane']];
  const drawChips = () => { chips.innerHTML = ''; opts.forEach(([v, l]) => chips.append(h('button', { class:'chip', 'data-f':v, 'aria-pressed':String(st.f === v), onclick:() => { st.f = v; drawChips(); draw(); } }, l))); };
  const match = b => { const own = owned(), q = st.q.trim().toLowerCase();
    return (!q || (b.name + ' ' + b.brand + ' ' + b.cover + ' ' + b.role + ' ' + (b.coverName || '') + ' ' + (b.coreName || '')).toLowerCase().includes(q))
      && (st.f === 'all' || (st.f === 'bag' ? (!own || own.includes(b.id)) : ['heavy', 'medium', 'light'].includes(st.f) ? b.oil.includes(st.f) : coverKind(b) === st.f)); };
  const toggle = b => { const i = st.picked.indexOf(b.id); if (i >= 0) st.picked.splice(i, 1); else { if (st.picked.length >= 3) { toast('Compare up to 3 balls'); return; } st.picked.push(b.id); } draw(); };
  function draw() {
    const list = balls.filter(match); grid.innerHTML = ''; let lastCls = -1;
    count.textContent = `${list.length} of ${balls.length} balls`;
    if (!list.length) grid.append(h('div', { class:'empty' }, h('h3', { text:'No balls match' }), h('p', { class:'muted', text:'Try a different word, or clear the filters.' }), h('button', { class:'btn ghost', onclick:() => { st.q = ''; st.f = 'all'; search.value = ''; drawChips(); draw(); } }, 'Clear filters')));
    list.sort((a, b) => a.cls - b.cls).forEach(b => {
      if (b.cls !== lastCls) { lastCls = b.cls; grid.append(h('h2', { class:'group-h', text:CLASSES[b.cls] })); }
      grid.append(tile(b, { onCompareToggle:toggle, picked:st.picked.includes(b.id) }));
    });
    tray.hidden = !st.picked.length;
    tray.innerHTML = '';
    if (st.picked.length) tray.append(h('div', { class:'tray-balls' }, ...st.picked.map(id => { const b = balls.find(x => x.id === id); return h('span', { class:'tray-ball' }, h('span', { class:'swatch', style:{ background:b.color } }), b.name); })),
      h('button', { class:'btn ghost sm', onclick:() => { st.picked = []; draw(); } }, 'Clear'),
      h('button', { class:'btn primary', id:'trayGo', disabled:st.picked.length < 2 ? true : null, onclick:() => go(`#/compare?ids=${st.picked.join(',')}`) }, st.picked.length < 2 ? 'Pick one more' : `Compare ${st.picked.length}`));
    const oil = PAT_OIL[S.pattern], fit = balls.filter(b => b.oil.includes(oil) && b.id !== app.ball.id).sort((a, b) => a.cls - b.cls).slice(0, 4);
    sugg.innerHTML = '';
    sugg.append(h('div', { class:'sugg-h' }, h('span', { class:'label', text:`Fits ${PATTERN_LABEL[S.pattern]} · ${oil} oil` }), h('span', { class:'muted small', text:'from each ball\u2019s oil tags' })),
      h('div', { class:'sugg-row' }, ...fit.map(b => h('button', { class:'sugg-ball', onclick:() => { setBall(b); go('#/lane'); toast(`${b.name} on the lane`); }}, h('span', { class:'sr-only', text:'Put on lane: ' }), h('span', { class:'swatch', style:{ background:b.color } }), h('span', {}, b.name, h('small', { text:b.role }))))));
  }
  search.oninput = () => { st.q = search.value; draw(); };
  drawChips(); draw();
  const el = h('section', { class:'screen list-screen' },
    h('header', { class:'appbar arm-head' }, h('div', { class:'arm-titles' }, h('span', { class:'arm-team', text:T.team }), h('h1', { class:'title', text:T.title })), h('div', { class:'appbar-actions' }, h('a', { class:'btn primary sm', id:'arsAdd', href:'#/add-ball' }, 'Add ball'), h('a', { class:'btn ghost sm', href:'#/arsenal/insights' }, 'Insights'))),
    P ? armory(P) : null, h('h2', { class:'group-h arm-cat', text:'Catalog' }),
    h('div', { class:'list-tools' }, search, chips, count), sugg, grid, tray);
  return { el, title:T.title };
}
