import { balls } from '../data.js';
import { allLines, applyLine, deleteLine, restoreLine, lsGet, LS, saveNote, logFinish, on, today } from '../store.js';
import { h, icon, toast, confirmSheet, emptyState, segmented } from '../ui.js';
import { go } from '../router.js';
import { arrowsBoard } from '../cc/geom.js';
import { PATTERN_LABEL, FINISH_LABEL, fmtBoard } from '../labels.js';
import { FINISHES } from '../engine.js';
const st = { tab:'lines', q:'' };
const MISS_LABEL = { left:'Left', right:'Right', high:'High', light:'Light' };
const ago = t => { const s = (Date.now() - t) / 1000; return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : new Date(t).toLocaleDateString(); };
export function render() {
  const body = h('div', { class:'stack', id:'sessBody' });
  const seg = segmented('Session view', [['lines', 'Lines'], ['shots', 'Shots'], ['notes', 'Alley notes']], st.tab, v => { st.tab = v; draw(); }, 'wide');
  function lines() {
    const q = h('input', { type:'search', class:'search', placeholder:'Search lines, balls, patterns', 'aria-label':'Search saved lines', value:st.q });
    const list = h('div', { class:'stack', id:'lineList' });
    const fill = () => { const all = allLines(), qq = st.q.trim().toLowerCase(); list.innerHTML = '';
      const res = all.filter(l => { const b = balls.find(x => x.id === l.ballId); return !qq || (l.name + ' ' + (b ? b.name : '') + ' ' + (PATTERN_LABEL[l.pattern] || l.pattern) + ' ' + (l.note || '')).toLowerCase().includes(qq); });
      if (!all.length) { list.append(emptyState('No saved lines yet', 'On the Lane, tap the bookmark to save the line you are throwing. It shows up here and syncs to your other devices.', { label:'Go to Lane', run:() => go('#/lane') })); return; }
      if (!res.length) { list.append(h('p', { class:'muted', text:'No lines match.' })); return; }
      res.forEach(l => { const b = balls.find(x => x.id === l.ballId);
        list.append(h('div', { class:'line-card' },
          h('button', { class:'line-row', onclick:() => { applyLine(l); go('#/lane'); toast(`Loaded \u201c${l.name}\u201d`); } }, h('span', { class:'sr-only', text:'Load on lane: ' }),
            h('span', { class:'swatch', style:{ background:b ? b.color : '#888' } }),
            h('span', { class:'line-text' }, h('span', { class:'line-name', text:l.name }), h('span', { class:'line-meta', text:`${b ? b.name : l.ballId} \u00b7 Feet ${l.release} \u2192 ${fmtBoard(+arrowsBoard(+l.release, +l.aim).toFixed(1))} \u00b7 ${l.speed} mph \u00b7 ${PATTERN_LABEL[l.pattern] || l.pattern}` }), l.note ? h('span', { class:'line-note', text:l.note }) : null),
            h('span', { class:'sync-ic', title:l.synced ? 'Synced' : 'Not synced yet', html:icon(l.synced ? 'check' : 'cloudOff') })),
          h('button', { class:'icon-btn', 'aria-label':`Delete ${l.name}`, html:icon('trash'), onclick:async () => {
            if (!await confirmSheet({ title:'Delete this line?', text:`\u201c${l.name}\u201d will be removed from this device and the server.` })) return;
            await deleteLine(l); toast('Line deleted', { action:{ label:'Undo', run:() => { restoreLine(l); toast('Restored'); } } }); } })));
      }); };
    q.oninput = () => { st.q = q.value; fill(); };
    fill(); return [allLines().length ? q : null, list].filter(Boolean);
  }
  function shots() {
    const a = lsGet(LS.shots).slice().reverse();
    if (!a.length) return [emptyState('No shots logged yet', 'On the Lane, tap where your ball went (Left, Right, High, Light). Each tap moves you and is logged here, on this device only.', { label:'Go to Lane', run:() => go('#/lane') })];
    const counts = {}; a.forEach(s => counts[s.miss] = (counts[s.miss] || 0) + 1);
    return [h('div', { class:'chips' }, ...Object.entries(counts).map(([k, n]) => h('span', { class:'pill', text:`${MISS_LABEL[k] || k} \u00d7${n}` }))),
      h('ol', { class:'shot-list' }, ...a.slice(0, 80).map(s => { const b = balls.find(x => x.id === s.ballId);
        return h('li', {}, h('b', { text:MISS_LABEL[s.miss] || s.miss }), h('span', { text:` \u2192 feet ${s.before.release}\u2192${s.after.release}, speed ${s.before.speed}\u2192${s.after.speed}` }), h('small', { class:'muted', text:` ${b ? b.name : ''} \u00b7 ${PATTERN_LABEL[s.pattern] || ''} \u00b7 ${ago(s.t)}` })); })),
      h('p', { class:'muted small', text:'Shots stay on this device (not synced).' })];
  }
  function notes() {
    const surf = lsGet(LS.surface).slice().reverse(), ns = lsGet(LS.notes).slice().reverse();
    const ballSel = h('select', { id:'surfBall', 'aria-label':'Ball' }, ...balls.map(b => h('option', { value:b.id, text:b.name })));
    const finSel = h('select', { id:'surfFin', 'aria-label':'Surface' }, ...FINISHES.map(f => h('option', { value:f, text:FINISH_LABEL[f] })));
    const lane = h('input', { id:'nLane', placeholder:'Center / lanes', 'aria-label':'Center or lanes', autocomplete:'off' }), oil = h('input', { id:'nOil', placeholder:'Oil, e.g. fresh house', 'aria-label':'Oil', autocomplete:'off' }), adj = h('input', { id:'nAdj', placeholder:'What worked', 'aria-label':'Adjustment', autocomplete:'off' });
    return [
      h('div', { class:'card' }, h('h2', { class:'card-title', text:'Surface log' }),
        h('form', { class:'inline-form', onsubmit:e => { e.preventDefault(); logFinish(ballSel.value, finSel.value); toast('Surface logged'); draw(); } }, h('label', { class:'fld' }, h('span', { text:'Ball' }), ballSel), h('label', { class:'fld' }, h('span', { text:'Surface' }), finSel), h('button', { class:'btn primary', type:'submit' }, 'Log today')),
        surf.length ? h('ul', { class:'plain' }, ...surf.slice(0, 20).map(x => { const b = balls.find(y => y.id === x.ballId); return h('li', { text:`${x.date} \u2014 ${b ? b.name : x.ballId}: ${FINISH_LABEL[x.finish] || x.finish}` }); })) : h('p', { class:'muted', text:'Nothing logged yet.' })),
      h('div', { class:'card' }, h('h2', { class:'card-title', text:'Pattern notes' }),
        h('form', { class:'stack', onsubmit:e => { e.preventDefault(); if (saveNote(lane.value, oil.value, adj.value)) { toast('Note saved'); draw(); } else toast('Fill in all three fields', { kind:'bad' }); } },
          h('label', { class:'fld' }, h('span', { text:'Center / lanes' }), lane), h('label', { class:'fld' }, h('span', { text:'Oil' }), oil), h('label', { class:'fld' }, h('span', { text:'What worked' }), adj), h('button', { class:'btn primary', type:'submit' }, 'Save note')),
        ns.length ? h('ul', { class:'plain' }, ...ns.slice(0, 30).map(x => h('li', {}, h('b', { text:x.lane }), ` \u00b7 ${x.oil}: ${x.adjustment}`))) : h('p', { class:'muted', text:'No notes yet.' }))];
  }
  function draw() { body.innerHTML = ''; body.append(...(st.tab === 'lines' ? lines() : st.tab === 'shots' ? shots() : notes())); }
  draw();
  const offs = [on('lines', () => st.tab === 'lines' && draw()), on('alley', () => st.tab === 'notes' && !body.contains(document.activeElement) && draw())];
  const el = h('section', { class:'screen list-screen' }, h('header', { class:'appbar' }, h('h1', { class:'title', text:'Sessions' })), h('div', { class:'list-tools' }, seg), body);
  return { el, title:'Sessions', destroy() { offs.forEach(f => f()); } };
}
