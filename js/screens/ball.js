import { balls, rgTxt, diffTxt, coverKind, modelOK } from '../data.js';
import { readInfo, analyze, S } from '../engine.js';
import { app, linesForBall, lsGet, LS, applyLine, logFinish, esc } from '../store.js';
import { h, icon, toast, emptyState } from '../ui.js';
import { setBall, modelIn } from '../ctl.js';
import { seedLine } from '../laneseed.js';
import { go, back } from '../router.js';
import { readMed } from './pickers.js';
import { PATTERN_LABEL, FINISH_LABEL, CALL_LABEL, CALL_TONE, f1, fmtBoard } from '../labels.js';
import { arrowsBoard } from '../cc/geom.js';
import { helpDot, withHelp } from './help.js';
import { ready, proj } from '../hub.js';
import { statusField, whyNotLine } from './status.js';
import { demandOf } from '../cc/rank.js';
import { aboutAngle } from '../cc/provenance.js';
import { drillSummary } from './drillscan.js';
export function backBar(title, fallback) {
  return h('header', { class:'appbar' }, h('button', { class:'icon-btn', 'aria-label':'Back', html:icon('back'), onclick:() => back(fallback) }), h('h1', { class:'title', text:title }));
}
export async function render({ params }) {
  const b = balls.find(x => x.id === params[0]);
  if (!b) return { el:h('section', { class:'screen' }, backBar('Ball', '#/bag?view=all'), emptyState('Ball not found', 'That ball is not in this arsenal.', { label:'Back to Bag', run:() => go('#/bag?view=all') })), title:'Ball' };
  await ready(); seedLine();   // clutter audit #4: the Lane line for this ball before Lane is opened
  const supported = modelOK(b), r = supported ? readInfo(b, readMed()) : null, mi = modelIn(), a = supported ? analyze(b, { release: mi.release, aim: mi.aim }) : { call:'GUTTER', entryBoard:null, bpBoard:null, bpFeet:null, angle:null }, onLane = b.id === app.ball.id;
  const spec = (k, v, hid) => h('div', { class:'spec' }, h('div', { class:'spec-k' }, k, hid ? helpDot(hid, k) : null), h('div', { class:'spec-v', html:v }));
  await ready();
  // P1.3: an owned ball shows where it is (one Status) and, when it isn't in tonight's bag, the shared "why not".
  const P = proj(), own = P ? Object.values(P.owned).find(o => o.catalogId === b.id) : null;
  const ownCard = own ? h('div', { class:'card', id:'ballOwned' }, withHelp(h('h2', { class:'card-title', text:'Your ball' }), 'ap-status', 'Ball status'),
    statusField(P, own.id), whyNotLine(P, own.id, { demand: demandOf({ pattern: null }).demand, idAttr: 'ballWhyNot' }),
    // Queue item 6: the drill card (grip + layout as the driller wrote it), from a photo or typed; one line plus one link.
    h('div', { class:'row between gap', id:'ballDrill' }, h('span', { class:'small' + (own.drill ? '' : ' muted'), id:'ballDrillSum', text: own.drill ? 'Drill card: ' + drillSummary(own.drill) : 'No drill card saved.' }),
      h('a', { class:'btn sm ghost', id:'ballDrillScan', href:'#/drill-card?own=' + encodeURIComponent(own.id) }, own.drill ? 'View or edit' : 'Scan a drill card'))) : null;
  const lines = linesForBall(b.id), surf = lsGet(LS.surface).filter(x => x.ballId === b.id).slice(-5).reverse();
  const el = h('section', { class:'screen detail' }, backBar(b.name, '#/bag?view=all'),
    h('div', { class:'hero' }, h('span', { class:'ball-orb xl', style:{ '--c':b.color }, 'aria-hidden':'true' }),
      h('div', {}, h('div', { class:'muted small', text:`${b.brand}${b.year ? ' · ' + b.year : ''}` }), h('p', { class:'hero-role', text:b.role }),
        h('div', { class:'row gap wrap' },
          onLane ? h('span', { class:'pill gold', text:'On lane' }) : h('button', { class:'btn primary', id:'putOnLane', onclick:() => { setBall(b); go('#/lane'); } }, 'Put on lane'),
          onLane ? null : h('a', { class:'btn ghost', id:'cmpOnLane', href:`#/compare?ids=${app.ball.id},${b.id}` }, h('span', { html:icon('compare') }), `Compare with ${app.ball.name}`), onLane ? null : helpDot('ap-compare', 'Compare')))),
    ownCard,
    h('div', { class:'card' }, h('div', { class:'card-h' }, h('h2', { text:`On ${PATTERN_LABEL[S.pattern]}, your line` }), h('span', { class:'muted small', id:'ballLineFrom', text:' (the stand and aim on Lane)' })),
      h('div', { class:'mini-read', id:'ballRead', 'data-tone':CALL_TONE[a.call] }, h('b', { text:CALL_LABEL[a.call] }), helpDot('tg-hit', 'High, light and solid hits'),
        h('span', { class:'num', text:` entry ${f1(a.entryBoard)}` }), h('span', { class:'prov', 'data-prov':'model', text:'model' }), helpDot('bm-entry-angle', 'Entry'), h('span', { class:'num', text: ' · ' + aboutAngle(a.angle) }), h('span', { class:'prov', 'data-prov':'model', text:'model' }), helpDot('ap-model', 'Model estimate'),   // Now item 4: "about N° · model"
        h('span', { class:'num', text:` · breakpoint ${f1(a.bpBoard)}${a.bpFeet != null ? ' @ ' + Math.round(a.bpFeet) + ' ft' : ''}` }), h('span', { class:'prov', 'data-prov':'model', text:'model' }), helpDot('bm-breakpoint', 'Breakpoint'))),
    // Clutter audit C8: the spec tiles are for Compare and Armory; one tap away here.
    h('details', { class:'card tn-more', id:'ballSpecs' }, h('summary', { text:'Specs: RG, differential, core, cover' }),
      h('div', { class:'spec-grid' }, spec('RG', String(rgTxt(b)) + '<small class="prov">' + (b.rg != null ? 'maker' : 'unverified') + '</small>', 'eq-rg'), spec('Differential', String(diffTxt(b)) + '<small class="prov">' + (b.diff != null ? 'maker' : 'unverified') + '</small>', 'eq-diff'), spec('Core', esc(b.core) + (b.coreName ? '<small>' + esc(b.coreName) + '</small>' : '') + (b.est ? ' <i class="est">est.</i>' : ''), 'eq-core'),
      spec('Cover', esc(b.cover) + (b.coverName ? '<small>' + esc(b.coverName) + '</small>' : ''), 'eq-cover-types'), spec('Factory finish', esc(b.finish || '\u2014'), 'eq-surface'), spec('Reads · model', r ? `${r.tag}<small>skids ~${Math.round(r.f)} ft</small>` : '\u2014', 'bm-shr'))),
    h('div', { class:'card' }, withHelp(h('h2', { class:'card-title', text:'How it rolls' }), 'eq-cover-types', 'How it rolls'), h('p', { text:b.motion }), b.note ? h('p', { class:'muted small', text:b.note }) : null),
    h('div', { class:'two' }, h('div', { class:'card tone-good' }, withHelp(h('h3', { text:'Use when' }), 'ap-use-when', 'Use when'), h('p', { text:b.when })), h('div', { class:'card tone-warn' }, withHelp(h('h3', { text:'Leave in the bag' }), 'ap-use-when', 'Leave in the bag'), h('p', { text:b.whenNot }))),
    h('div', { class:'card' }, withHelp(h('h2', { class:'card-title', text:'Catalog note (written for ~15 mph, ~220 rpm)' }), 'bm-matchup', 'Speed and revs'), h('p', { text:b.rec })),
    h('div', { class:'card' }, h('div', { class:'card-h' }, withHelp(h('h2', { class:'card-title', text:'Saved lines' }), 'tg-arrows', 'Stand and aim')),
      lines.length ? h('div', { class:'stack' }, ...lines.map(l => h('button', { class:'line-row', onclick:() => { applyLine(l); go('#/lane'); toast(`Loaded \u201c${l.name}\u201d`); } }, h('span', { class:'line-name', text:l.name }), h('span', { class:'line-meta', text:`Feet ${l.release} · Target ${fmtBoard(l.eyes != null ? +l.eyes : +arrowsBoard(+l.release, +l.aim).toFixed(1))} · ${l.speed} mph · ${PATTERN_LABEL[l.pattern] || l.pattern}` }))))
        : h('p', { class:'muted', text:'No saved lines yet. Put it on the lane and tap the bookmark.' })),
    h('div', { class:'card' }, h('div', { class:'card-h' }, withHelp(h('h2', { class:'card-title', text:'Surface log' }), 'eq-surface', 'Surface'), h('button', { class:'btn sm ghost', id:'logSurf', onclick:() => { logFinish(b.id, S.finish); toast(`Logged ${FINISH_LABEL[S.finish]} for ${b.name}`); go(location.hash, { replace:true }); } }, `Log ${FINISH_LABEL[S.finish]} today`)),
      surf.length ? h('ul', { class:'plain' }, ...surf.map(x => h('li', { text:`${x.date} \u2014 ${FINISH_LABEL[x.finish] || x.finish}` }))) : h('p', { class:'muted', text:'No surface changes logged.' })),
    h('p', { class:'small', id:'ballSource' }, b.source ? h('a', { href:b.source, target:'_blank', rel:'noopener', class:'ext' }, 'Maker source \u2197') : 'No manufacturer page found.', ` · checked ${b.checked || 'not checked'}${b.weight ? ` · ${b.weight} lb specs` : ''}${b.specStatus === 'unverified' ? ' · specs unverified' : ''}`));
  if (!supported) el.querySelector('#ballRead').replaceChildren('Specs unverified or cover not supported: no model path.');
  return { el, title:b.name };
}
