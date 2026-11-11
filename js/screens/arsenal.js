import { balls, CLASSES, rgTxt, diffTxt, coverKind } from '../data.js';
import { S } from '../engine.js';
import { app } from '../store.js';
import { h, icon, toast } from '../ui.js';
import { setBall } from '../ctl.js';
import { go } from '../router.js';
import { owned } from './pickers.js';
import { PATTERN_LABEL } from '../labels.js';
import { ready, proj, add } from '../hub.js';
import * as BE from '../cc/bagedit.js';
import { catOf } from '../cc/cats.js';
import * as A from '../cc/armory.js';
import * as UX from '../cc/ux.js';
import { helpDot, withHelp } from './help.js';
import * as ST from '../cc/status.js';
const st = { q:'', f:'all', picked:[] };
const PAT_OIL = { house:'medium', cheetah:'medium', sport:'heavy', scorpion:'heavy', shark:'heavy', dry:'light' };
const short = c => c.split(' / ')[0].replace('Strong ', 'Str. ').replace('Medium ', 'Med. ').replace('Asymmetrical', 'Asym').replace('Symmetrical', 'Sym');
export function tile(b, { onCompareToggle, picked }) {
  const oil = PAT_OIL[S.pattern], fits = b.oil && b.oil.includes(oil) ? PATTERN_LABEL[S.pattern] : null;   // from each ball's oil tags, as the Fits row
  const t = h('article', { class:'btile' + (b.id === app.ball.id ? ' current' : ''), 'data-ball':b.id },
    h('a', { class:'btile-link', href:`#/ball/${b.id}`, 'aria-describedby':null },
      h('span', { class:'ball-orb', style:{ '--c':b.color }, 'aria-hidden':'true' }),
      h('span', { class:'btile-text' }, h('span', { class:'btile-name', text:b.name }), h('span', { class:'btile-brand', text:`${b.brand}${b.year ? ' · ' + b.year : ''}` }), h('span', { class:'btile-role', text:b.role }))),
    // Clutter audit C10: the row shows name + a "fits" chip; RG, Diff, cover and read are one tap away (ball page Specs, or Compare).
    fits ? h('div', { class:'btile-fits' }, h('span', { class:'pill', 'data-fits':'', text:`Fits ${fits}` })) : null,
    h('div', { class:'btile-actions' },
      b.id === app.ball.id ? h('span', { class:'pill gold', text:'On lane' }) : h('button', { class:'btn sm primary', 'aria-label':`Put on lane: ${b.name}`, onclick:() => { setBall(b); go('#/lane'); } }, 'Put on lane'),
      h('button', { class:'btn sm ghost cmp-btn', 'aria-pressed':String(picked), 'aria-label':`${picked ? 'Picked' : 'Compare'} ${b.name}`, onclick:() => onCompareToggle(b) }, h('span', { html:icon(picked ? 'check' : 'compare') }), picked ? 'Picked' : 'Compare')));
  return t;
}
// Armory (owner brief 2026-10-24): owned balls on lit shelves with gold nameplates; retired balls on the Old Friends shelf (owner, 2026-10-31).
// One takeaway: what is in your bag. At home / pro shop and Old Friends sit behind a tap; the full catalog stays below.
function pedestal(it, why) {
  const c = it.cat, onLane = it.id === app.ball.ownedId;
  const specs = c && c.rg != null ? `RG ${rgTxt(c)} \u00b7 Diff ${diffTxt(c)}` : 'Specs not entered';
  return h('article', { class:'ped' + (onLane ? ' onlane' : ''), 'data-own':it.id },
    h('a', { class:'ped-link', href:`#/ball/${it.id}` },
      h('span', { class:'ped-lit', 'aria-hidden':'true' }, h('span', { class:'ball-orb', style:{ '--c':it.color || 'var(--text-3)' } })),
      h('span', { class:'plate' }, h('span', { class:'plate-name', text:(it.benchmark ? '\u2605 ' : '') + it.name }),
        it.status !== 'inBag' ? h('span', { class:'plate-role', 'data-status':it.status, text:ST.LABEL[it.status] || it.status }) : it.role ? h('span', { class:'plate-role', text:it.role }) : null, h('span', { class:'plate-spec num sr-only', text:specs }), why && it.status !== 'retired' ? h('span', { class:'plate-why', 'data-why-not':it.id, 'data-why':why.key, text:'Why not: ' + why.text }) : null, onLane ? h('span', { class:'sr-only', text:'on lane' }) : null)),
    it.earned.length || onLane ? h('div', { class:'ped-marks' }, onLane ? h('span', { class:'pill gold', text:'On lane' }) : null, ...it.earned.map(m => h('span', { class:'pill', 'data-m':m.id, text:m.text }))) : null);
}
// v73 30-second test (owner t125u): Arsenal's one job is find a ball and keep it in tonight's bag. Search + one compact row per
// ball (small dot, name, status, Keep toggle) replace the lit shelves at the top; the shelves, milestones and catalog now sit
// behind "Shelf view" / "More" (docs/CUTS_V73.md).
function mine(P, rerender) {
  const sh = A.shelves(P, catOf), list = sh.bag.concat(sh.bench), bag = ST.currentBag(P), packed = bag ? ST.packedIds(P, bag) : [];
  const kept = new Set(bag ? bag.slots.filter(s => s.locked).map(s => s.owned) : []);
  const find = h('input', { type:'search', class:'search', id:'armFind', placeholder:'Find a ball', 'aria-label':'Find one of your balls', autocomplete:'off', value:st.mq || '' });
  const ul = h('ul', { class:'plain arm-list', id:'armList' });
  const keep = async (it, on) => {
    const P2 = proj(), b = ST.currentBag(P2); if (!b) { toast('Pack a bag on the Bag tab first.'); return; }
    const nb = BE.pin(b, it.id, on);
    if (on && !nb.slots.some(x => x.owned === it.id)) nb.slots.push(Object.assign({ owned:it.id, locked:true }, it.status === 'benched' ? { fromHome:true } : {}));
    await add('bag.saved', b.id, nb); toast(on ? `${it.name}: kept in tonight’s bag.` : `${it.name}: no longer kept.`); rerender();
  };
  const fill = () => { const q = (st.mq || '').trim().toLowerCase(); ul.replaceChildren(...list.filter(it => !q || it.name.toLowerCase().includes(q)).map(it => {
    const on = kept.has(it.id), inb = packed.includes(it.id);
    return h('li', { class:'arm-row', 'data-own':it.id },
      h('a', { class:'arm-row-link', href:`#/ball/${it.id}` }, h('span', { class:'ball-orb sm', style:{ '--c':it.color || 'var(--text-3)' }, 'aria-hidden':'true' }),
        h('span', { class:'arm-row-name', text:(it.benchmark ? '\u2605 ' : '') + it.name }), h('span', { class:'pill' + (inb ? ' gold' : ''), text:inb ? 'In bag' : (ST.LABEL[it.status] || it.status) })),
      h('button', { class:'btn sm ghost keep-btn', 'data-keep':it.id, 'aria-pressed':String(on), 'aria-label':`Keep ${it.name} in bag: ${on ? 'on' : 'off'}`, onclick:() => keep(it, !on) },
        h('span', { html:icon('pin', on ? 'pin-on' : 'pin-off') }), on ? 'Kept' : 'Keep'));
  })); };
  find.oninput = () => { st.mq = find.value; fill(); };
  fill();
  const dot = helpDot('ap-status', 'Ball status');   // help bubbles on: one "?" beside the search (no extra words when off)
  return h('section', { class:'card', id:'armMine', 'aria-label':'My balls' }, dot ? h('div', { class:'arm-find-row' }, find, dot) : find, ul,
    list.length ? null : h('a', { class:'btn primary block', id:'armAddFirst', href:'#/add-ball' }, 'Add your first ball'));
}
function armory(P) {
  const sh = A.shelves(P, catOf), badges = A.starterBadges(P), next = UX.flag('nextUp') ? A.nextUp(P) : null;
  if (badges.length) UX.count('badge.view');
  if (next) UX.count('nextup.view');
  // P1.3: the same "why not" as the ball page and the builder, for any ball not in tonight's bag (status.js).
  const why = it => ST.whyNotFor(P, it.id);
  const shelf = (items, id, label, extra) => h('div', { class:'shelf', id, role:'list', 'aria-label':label }, ...items.map(it => h('div', { role:'listitem' }, pedestal(it, why(it)))), extra || null);
  const empty = h('div', { role:'listitem' }, h('a', { class:'ped ped-empty', id:'armEmpty', href:'#/add-ball' }, h('span', { class:'ped-lit', 'aria-hidden':'true' }, h('span', { class:'ped-slot' })), h('span', { class:'plate' }, h('span', { class:'plate-name', text:'Add ball' }), h('span', { class:'plate-role', text:'Empty pedestal' }))));
  const fold = (id, label, n, body) => h('details', { class:'card arm-fold', id, open:id === 'armBench' && !sh.bag.length }, h('summary', {}, h('span', { text:label }), h('span', { class:'pill', text:String(n) })), body);
  return h('section', { class:'armory', id:'armory', 'aria-labelledby':'armBagH' },
    withHelp(h('h2', { class:'group-h', id:'armBagH', text:`${ST.LABEL.inBag} \u00b7 ${sh.bag.length}` }), 'ap-status', 'Ball status'),
    shelf(sh.bag, 'armBag', ST.LABEL.inBag, empty),
    sh.bench.length ? fold('armBench', 'At home and at the pro shop', sh.bench.length, shelf(sh.bench, 'armBenchShelf', 'At home and at the pro shop')) : null,
    badges.length ? h('section', { class:'card', id:'armMilestones', 'aria-labelledby':'armMarksH' }, h('h2', { class:'card-title', id:'armMarksH', text:'Milestones' }),
      h('div', { class:'badge-shelf' }, ...badges.map(m => h('a', { class:'badge-card', href:m.href, 'data-badge':m.id, onclick:() => UX.count('badge.open') }, h('b', { text:m.title }), h('span', { class:'small muted', text:m.note })))),
      h('p', { class:'muted small', text:'Private, from what you have logged. Nothing to unlock or keep up with.' })) : null,
    next ? h('a', { class:'next-up small', id:'armNext', href:next.href, onclick:() => UX.count('nextup.open'), text:next.text }) : null,
    fold('armHall', 'Old Friends', sh.hall.length, sh.hall.length ? h('div', { class:'stack' }, shelf(sh.hall, 'armHallShelf', 'Old Friends'),
        h('button', { class:'btn ghost block', id:'armHallShare', onclick:() => import('./export.js').then(m => m.shareOldFriends()) }, 'Share an Old Friends card'))
      : h('div', { class:'stack', id:'armHallNone' }, h('p', { class:'muted small', text:'Retired balls rest here with their record. Set a ball\u2019s Status to Retired on its page or in Bag.' }), h('a', { class:'btn ghost sm', href:'#/bag' }, 'Open Bag'))),
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
      && (st.f === 'all' || (st.f === 'bag' ? own.includes(b.id) : ['heavy', 'medium', 'light'].includes(st.f) ? b.oil.includes(st.f) : coverKind(b) === st.f)); };
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
    P ? mine(P, () => go(location.hash, { replace:true })) : null,
    P ? h('details', { class:'card tn-more', id:'armShelvesD' }, h('summary', { text:'Shelf view, milestones, Old Friends' }), armory(P)) : null,
    h('details', { class:'card tn-more', id:'armMoreD' }, h('summary', { text:'More: export, catalog reference' }),
    P ? h('div', { class:'arm-export' }, h('button', { class:'btn ghost', id:'arsExport', onclick:async () => (await import('./export.js')).openExport() }, 'Export my arsenal')) : null,   // item E: sheet, bag card, CSV, backup
    h('a', { class:'btn ghost block', id:'arsFullCatalog', href:'#/welcome' }, 'Search the complete shared catalog'),
    withHelp(h('h2', { class:'group-h arm-cat', text:'Catalog reference models · not owned' }), 'eq-cover-types', 'Ball types'),
    h('div', { class:'list-tools' }, search, chips, count), sugg, grid), tray);
  return { el, title:T.title };
}
