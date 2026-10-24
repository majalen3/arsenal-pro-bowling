import { balls, rgTxt, diffTxt, coverKind } from '../data.js';
import { readInfo, analyze, S } from '../engine.js';
import { app, linesForBall, lsGet, LS, applyLine, logFinish, esc } from '../store.js';
import { h, icon, toast, emptyState } from '../ui.js';
import { setBall } from '../ctl.js';
import { go, back } from '../router.js';
import { readMed } from './pickers.js';
import { PATTERN_LABEL, FINISH_LABEL, CALL_LABEL, CALL_TONE, f1, fmtBoard } from '../labels.js';
import { arrowsBoard } from '../cc/geom.js';
export function backBar(title, fallback) {
  return h('header', { class:'appbar' }, h('button', { class:'icon-btn', 'aria-label':'Back', html:icon('back'), onclick:() => back(fallback) }), h('h1', { class:'title', text:title }));
}
export function render({ params }) {
  const b = balls.find(x => x.id === params[0]);
  if (!b) return { el:h('section', { class:'screen' }, backBar('Ball', '#/arsenal'), emptyState('Ball not found', 'That ball is not in this arsenal.', { label:'Back to Arsenal', run:() => go('#/arsenal') })), title:'Ball' };
  const r = readInfo(b, readMed()), a = analyze(b), onLane = b.id === app.ball.id;
  const spec = (k, v) => h('div', { class:'spec' }, h('div', { class:'spec-k', text:k }), h('div', { class:'spec-v', html:v }));
  const lines = linesForBall(b.id), surf = lsGet(LS.surface).filter(x => x.ballId === b.id).slice(-5).reverse();
  const el = h('section', { class:'screen detail' }, backBar(b.name, '#/arsenal'),
    h('div', { class:'hero' }, h('span', { class:'ball-orb xl', style:{ '--c':b.color }, 'aria-hidden':'true' }),
      h('div', {}, h('div', { class:'muted small', text:`${b.brand}${b.year ? ' · ' + b.year : ''}` }), h('p', { class:'hero-role', text:b.role }),
        h('div', { class:'row gap wrap' },
          onLane ? h('span', { class:'pill gold', text:'On lane' }) : h('button', { class:'btn primary', id:'putOnLane', onclick:() => { setBall(b); go('#/lane'); } }, 'Put on lane'),
          onLane ? null : h('a', { class:'btn ghost', id:'cmpOnLane', href:`#/compare?ids=${app.ball.id},${b.id}` }, h('span', { html:icon('compare') }), `Compare with ${app.ball.name}`)))),
    h('div', { class:'card' }, h('div', { class:'card-h' }, h('h2', { text:`On ${PATTERN_LABEL[S.pattern]}, your line` })),
      h('div', { class:'mini-read', 'data-tone':CALL_TONE[a.call] }, h('b', { text:CALL_LABEL[a.call] }), h('span', { class:'num', text:` entry ${f1(a.entryBoard)} · ${f1(a.angle)}° model · breakpoint ${f1(a.bpBoard)}${a.bpFeet != null ? ' @ ' + Math.round(a.bpFeet) + ' ft' : ''}` }))),
    h('div', { class:'spec-grid' }, spec('RG', String(rgTxt(b))), spec('Differential', String(diffTxt(b))), spec('Core', esc(b.core) + (b.coreName ? '<small>' + esc(b.coreName) + '</small>' : '') + (b.est ? ' <i class="est">est.</i>' : '')),
      spec('Cover', esc(b.cover) + (b.coverName ? '<small>' + esc(b.coverName) + '</small>' : '')), spec('Factory finish', esc(b.finish || '\u2014')), spec('Reads', r ? `${r.tag}<small>skids ~${Math.round(r.f)} ft</small>` : '\u2014')),
    h('div', { class:'card' }, h('h2', { class:'card-title', text:'How it rolls' }), h('p', { text:b.motion }), b.note ? h('p', { class:'muted small', text:b.note }) : null),
    h('div', { class:'two' }, h('div', { class:'card tone-good' }, h('h3', { text:'Use when' }), h('p', { text:b.when })), h('div', { class:'card tone-warn' }, h('h3', { text:'Leave in the bag' }), h('p', { text:b.whenNot }))),
    h('div', { class:'card' }, h('h2', { class:'card-title', text:'Recommendation (~15 mph / ~220 rpm)' }), h('p', { text:b.rec })),
    h('div', { class:'card' }, h('div', { class:'card-h' }, h('h2', { class:'card-title', text:'Saved lines' })),
      lines.length ? h('div', { class:'stack' }, ...lines.map(l => h('button', { class:'line-row', onclick:() => { applyLine(l); go('#/lane'); toast(`Loaded \u201c${l.name}\u201d`); } }, h('span', { class:'line-name', text:l.name }), h('span', { class:'line-meta', text:`Feet ${l.release} · Target ${fmtBoard(l.eyes != null ? +l.eyes : +arrowsBoard(+l.release, +l.aim).toFixed(1))} · ${l.speed} mph · ${PATTERN_LABEL[l.pattern] || l.pattern}` }))))
        : h('p', { class:'muted', text:'No saved lines yet. Put it on the lane and tap the bookmark.' })),
    h('div', { class:'card' }, h('div', { class:'card-h' }, h('h2', { class:'card-title', text:'Surface log' }), h('button', { class:'btn sm ghost', id:'logSurf', onclick:() => { logFinish(b.id, S.finish); toast(`Logged ${FINISH_LABEL[S.finish]} for ${b.name}`); go(location.hash, { replace:true }); } }, `Log ${FINISH_LABEL[S.finish]} today`)),
      surf.length ? h('ul', { class:'plain' }, ...surf.map(x => h('li', { text:`${x.date} \u2014 ${FINISH_LABEL[x.finish] || x.finish}` }))) : h('p', { class:'muted', text:'No surface changes logged.' })),
    b.link ? h('p', { class:'small' }, h('a', { href:b.link, target:'_blank', rel:'noopener', class:'ext' }, 'Manufacturer-style specs on bowwwl.com \u2197')) : null);
  return { el, title:b.name };
}
