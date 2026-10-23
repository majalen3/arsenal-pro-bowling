import { analyze, coachLine, sensitivity, ruleOf31, rollMph, S, C_SKID, C_HOOK, C_ROLL } from '../engine.js';
import { rgTxt, coverKind } from '../data.js';
import { app, on, saveLine, renameLine, linesForBall, applyLine, status } from '../store.js';
import { h, icon, toast, sheet } from '../ui.js';
import { createLane } from '../lane.js';
import { createDeck, describe } from '../deck.js';
const DEFL_DOC = 'https://github.com/majalen3/arsenal-pro-bowling/blob/main/docs/DEFLECTION.md';
import { adjust, miss, restore, target, MISSES, setBall, quickBalls } from '../ctl.js';
import { balls } from '../data.js';
import { openBallSheet, openConditions, openTune, openLines, tunePanel } from './pickers.js';
import { PATTERN_LABEL, FINISH_LABEL, CALL_LABEL, CALL_TONE, f1, fmtBoard } from '../labels.js';
import { profile } from '../store.js';
export function render() {
  const ballBtn = h('button', { class:'ball-btn', id:'ballBtn', 'aria-haspopup':'dialog', onclick:openBallSheet });
  const saveBtn = h('button', { class:'icon-btn', id:'saveBtn', 'aria-label':'Save this line', onclick:quickSave });
  const linesBtn = h('button', { class:'icon-btn', id:'linesBtn', 'aria-label':'Saved lines for this ball', html:icon('sessions'), onclick:openLines });
  const syncDot = h('span', { class:'sync-dot', id:'syncDot', role:'img' });
  const patChip = h('button', { class:'chip cond', id:'patChip', onclick:openConditions, 'aria-haspopup':'dialog' });
  const surfChip = h('button', { class:'chip cond', id:'surfChip', onclick:openConditions, 'aria-haspopup':'dialog' });
  const oilChip = h('button', { class:'chip cond', id:'oilChip', onclick:openConditions, 'aria-haspopup':'dialog' });
  const tuneChip = h('button', { class:'chip cond tune-chip', id:'tuneChip', 'aria-haspopup':'dialog', onclick:() => { tune = openTune(); } });
  const qRow = h('div', { class:'qball-row', id:'qballs', role:'group', 'aria-label':'Quick switch ball' });
  const backBtn = h('button', { class:'chip back-chip', id:'backBtn', hidden:true, onclick:backToSaved });
  const canvas = h('canvas', { id:'lane', class:'lane-canvas', tabindex:'0', role:'img' });
  const callBadge = h('div', { class:'call-badge', id:'callBadge' });
  const coach = h('p', { class:'coach', id:'coach', 'aria-live':'polite' });
  const deckCv = h('canvas', { class:'deck', id:'deck', role:'img' });
  const deckRead = h('div', { class:'deck-read', id:'deckRead' });
  const tile = (id, label) => h('div', { class:'tile', id }, h('div', { class:'tile-label', text:label }), h('div', { class:'tile-val num' }), h('div', { class:'tile-sub' }));
  const tEntry = tile('tEntry', 'Entry'), tAngle = tile('tAngle', 'Angle'), tBp = tile('tBp', 'Break pt');
  const lineSum = h('button', { class:'line-sum', id:'lineSum', onclick:() => { tune = openTune(); } });
  const hold = h('div', { class:'hold', id:'hold' });
  const more = h('div', { class:'more-read', id:'moreRead' });
  const inlineTune = tunePanel(); inlineTune.classList.add('tune-inline');
  const missRow = h('div', { class:'miss-row', role:'group', 'aria-labelledby':'missLbl' },
    h('div', { class:'miss-lbl', id:'missLbl', text:'Your ball went' }),
    h('div', { class:'miss-btns' }, ...['left', 'high', 'light', 'right'].map(k => h('button', { class:'miss-btn', 'data-miss':k, 'aria-label':`Missed ${MISSES[k].label}: ${MISSES[k].move}`, onclick:() => doMiss(k) },
      h('span', { class:'miss-ic', html:icon(k === 'left' ? 'left' : k === 'right' ? 'right' : k === 'high' ? 'up' : 'downArrow') }), h('span', { text:MISSES[k].label })))));
  const p = profile(); const lefty = p && p.hand === 'left';
  const el = h('section', { class:'screen lane-screen' },
    h('header', { class:'appbar' }, h('h1', { class:'sr-only', id:'laneH1' }), ballBtn, h('div', { class:'appbar-actions' }, syncDot, linesBtn, saveBtn)),
    h('div', { class:'ctl-bar' }, qRow,
    h('div', { class:'cond-row' }, backBtn, h('div', { class:'cond-grp', role:'group', 'aria-label':'Lane conditions' }, patChip, surfChip, oilChip, tuneChip))),
    h('div', { class:'lane-grid' },
      h('div', { class:'lane-col' }, canvas,
        h('div', { class:'legend', 'aria-hidden':'true' }, h('span', { html:`<i style="background:${C_SKID}"></i>Skid` }), h('span', { html:`<i style="background:${C_HOOK}"></i>Hook` }), h('span', { html:`<i style="background:${C_ROLL}"></i>Roll` }), h('span', { html:'<i class="bp"></i>Breakpoint' }))),
      h('section', { class:'deck-card', id:'deckCard', 'aria-labelledby':'deckH' }, h('figure', { class:'deck-fig' }, deckCv), h('div', { class:'deck-side' }, h('h2', { class:'deck-h', id:'deckH', text:'Pin deck' }), callBadge, coach, deckRead, h('p', { class:'deck-cap', id:'deckCap' }))),
      h('div', { class:'read-col' },
        h('div', { class:'tiles' }, tEntry, tAngle, tBp),
        lineSum, hold, missRow, lefty ? h('p', { class:'note small', text:'Left-handed: the model draws a right-hander’s lane. Read board numbers mirrored.' }) : null, more, inlineTune)));
  let tune = null;
  const lane = createLane(canvas, { onAdjust:ch => adjust(ch) });
  const deck = createDeck(deckCv);
  function setTile(t, val, sub, tone) { t.querySelector('.tile-val').textContent = val; t.querySelector('.tile-sub').textContent = sub; t.dataset.tone = tone; }
  let lastKey = '';
  function update({ animate = false } = {}) {
    const b = app.ball, a = analyze(b);
    ballBtn.innerHTML = `<span class="ball-orb sm" style="--c:${b.color}" aria-hidden="true"></span><span class="ball-btn-text"><span class="ball-btn-name">${b.name}</span><span class="ball-btn-sub">${b.brand} · ${coverKind(b)} · RG ${rgTxt(b)}</span></span>${icon('down', 'chev')}`;
    ballBtn.title = 'Change ball';
    el.querySelector('#laneH1').textContent = `Lane: ${b.name}`;
    patChip.innerHTML = `<span class="chip-k">Pattern</span> ${PATTERN_LABEL[S.pattern]}`; patChip.setAttribute('aria-label', `Pattern ${PATTERN_LABEL[S.pattern]}. Change conditions`);
    surfChip.innerHTML = `<span class="chip-k">Surface</span> ${FINISH_LABEL[S.finish]}`; surfChip.setAttribute('aria-label', `Surface ${FINISH_LABEL[S.finish]}. Change conditions`);
    oilChip.innerHTML = `<span class="chip-k">Oil</span> ×${(+S.oil).toFixed(1)}`; oilChip.setAttribute('aria-label', `Oil ×${(+S.oil).toFixed(1)}. Change oil volume`);
    tuneChip.innerHTML = `${icon('tune')} ${S.speed} mph · ${S.rev} rpm`; tuneChip.setAttribute('aria-label', `${S.speed} mph · ${S.rev} rpm. Tune shot`);
    const tone = CALL_TONE[a.call]; callBadge.textContent = CALL_LABEL[a.call]; 
    coach.textContent = coachLine(a);
    setTile(tEntry, f1(a.entryBoard), 'pocket 17.5', a.entryBoard != null && Math.abs(a.entryBoard - 17.5) <= 0.7 ? 'good' : 'warn');
    setTile(tAngle, a.angle == null ? '\u2014' : f1(a.angle) + '\u00b0', 'need 4\u20136\u00b0', a.angle != null && a.angle >= 4 && a.angle <= 6 ? 'good' : 'warn');
    const r31 = a.bpBoard == null ? null : ruleOf31(S.pattern, a.bpBoard);
    setTile(tBp, a.bpBoard == null ? '\u2014' : f1(a.bpBoard), a.bpFeet == null ? 'no hook' : `@ ${Math.round(a.bpFeet)} ft`, r31 && Math.abs(r31.d) <= 2 ? 'good' : 'warn');
    lineSum.innerHTML = `<span class="sr-only">Tune shot. </span><span><b class="num">${S.release}</b><small>Feet</small></span><span class="arrow" aria-hidden="true">→</span><span><b class="num">${fmtBoard(target())}</b><small>Target</small></span><span><b class="num">${S.speed}</b><small>mph</small></span><span><b class="num">${S.rev}</b><small>rpm</small></span>${icon('tune', 'ls-ic')}`;
    const sens = sensitivity(b), n = +sens.split(' ')[0];
    hold.innerHTML = `<span class="hold-bar" aria-hidden="true">${Array.from({ length:6 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span><span>Margin: <b>${sens}</b> small misses still strike</span>`;
    hold.dataset.tone = !a.strike ? 'off' : n >= 4 ? 'good' : 'warn';
    const ph = a.phases, n0 = v => Math.round(v);
    more.innerHTML = (ph ? `<div><span class="dot" style="background:${C_SKID}"></span>Skid <b>0\u2013${n0(ph.skid)} ft</b> · <span class="dot" style="background:${C_HOOK}"></span>Hook <b>${n0(ph.skid)}\u2013${n0(ph.roll)} ft</b> · <span class="dot" style="background:${C_ROLL}"></span>Roll <b>${n0(ph.roll)}\u2013${n0(ph.end)} ft</b></div>` : '') +
      `<div>Rolls at ~<b>${rollMph(+S.speed).toFixed(1)} mph</b> (est.)${r31 ? ' · ' + r31.text : ''}</div>`;
    canvas.setAttribute('aria-label', `Lane preview. ${CALL_LABEL[a.call]}. Entry board ${f1(a.entryBoard)}, angle ${f1(a.angle)} degrees, breakpoint board ${f1(a.bpBoard)} at ${a.bpFeet == null ? 'none' : Math.round(a.bpFeet) + ' feet'}. Arrow keys move feet and target.`);
    const same = l => l.release === +S.release && l.aim === +S.aim && l.speed === +S.speed && l.rev === +S.rev && l.pattern === S.pattern && l.finish === S.finish && +l.oil === +S.oil;
    const mine = linesForBall(), saved = mine.some(same), bl = backLine(mine);
    backBtn.hidden = !bl || same(bl);
    if (bl) { backBtn.innerHTML = `${icon('undo')} <span>Back to saved</span>`; backBtn.setAttribute('aria-label', `Back to saved line ${bl.name}`); backBtn.title = `Back to \u201c${bl.name}\u201d`; }
    if (qKey !== b.id) { qKey = b.id; drawQuick(); }
    saveBtn.innerHTML = icon(saved ? 'saved' : 'save'); saveBtn.setAttribute('aria-pressed', String(saved)); saveBtn.classList.toggle('on', saved);
    inlineTune.sync(); tune && tune.p && document.contains(tune.p) && tune.p.sync();
    const key = b.id + S.pattern + S.finish;
    lane.draw({ ball:b, result:a }, { animate:animate && key !== lastKey ? true : animate });
    const lefty = !!(profile() && profile().hand === 'left'), d = describe(a, lefty);
    deck.draw({ res:a, lefty, tone, color:b.color }, { animate });
    deckCv.setAttribute('aria-label', `Pin deck close-up, ${d.pocket} pocket. ${CALL_LABEL[a.call]}. ${d.text}`);
    deckRead.innerHTML = a.entryBoard == null ? `<p>${d.text}</p>` : `<p class="deck-side-call">${d.side[0].toUpperCase() + d.side.slice(1)}, ${d.ang}.</p><p class="deck-contact">${d.contact}</p><p class="deck-five">${d.five}</p>`;
    el.querySelector('#deckCard').dataset.tone = tone;
    el.querySelector('#deckCap').innerHTML = `Pin action: approximate 2-D model, assumed 15 lb ball, no spin. <a href="${DEFL_DOC}" target="_blank" rel="noopener">How it works</a>${lefty ? ' · Mirrored for left hand.' : ''}`;
    lastKey = key;
  }
  let qKey = '';
  function drawQuick() {
    const list = quickBalls(5);
    qRow.replaceChildren(...list.map(x => h('button', { class:'qball', 'data-ball':x.id, title:`${x.brand} ${x.name}`, onclick:() => setBall(x) },
      h('span', { class:'ball-orb xs', style:`--c:${x.color}`, 'aria-hidden':'true' }), h('span', { class:'qball-name', text:x.name }))),
      h('button', { class:'qball all', id:'qballAll', 'aria-haspopup':'dialog', onclick:openBallSheet }, h('span', { html:icon('arsenal') }), h('span', { class:'qball-name', text:`All ${balls.length}` })));
  }
  // 'Back to saved line': the line most recently saved or loaded for this ball, else this ball's newest saved line
  function backLine(mine) { const ll = app.lastLine; return (ll && ll.ballId === app.ball.id && mine.find(l => l.name === ll.name)) || mine[0] || null; }
  function backToSaved() { const l = backLine(linesForBall()); if (!l) return; applyLine(l); toast(`Back on \u201c${l.name}\u201d`); }
  function drawSync() { syncDot.dataset.state = status.cls || 'idle'; syncDot.setAttribute('aria-label', status.text || 'Not synced yet'); syncDot.title = status.text || ''; }
  function quickSave() {
    const name = `${PATTERN_LABEL[S.pattern]} ${S.release}\u2192${fmtBoard(target())}`;
    saveLine(name).then(l => { update(); toast(`Saved \u201c${name}\u201d`, { action:{ label:'Rename', run:() => renameSheet(l) } }); });
  }
  function renameSheet(l) {
    const nm = h('input', { class:'field', id:'renameName', value:l.name, maxlength:'60', 'aria-label':'Line name', autofocus:true });
    const nt = h('input', { class:'field', id:'renameNote', value:l.note || '', maxlength:'200', placeholder:'Note (optional)', 'aria-label':'Note' });
    const s = sheet({ title:'Rename line', body:h('form', { class:'stack', onsubmit:e => { e.preventDefault(); renameLine(l, nm.value, nt.value); s.close(); toast('Line renamed'); } }, nm, nt, h('button', { class:'btn primary', type:'submit' }, 'Save')) });
  }
  function doMiss(k) { const r = miss(k); toast(r.text, { action:{ label:'Undo', run:() => restore(r.before) } }); }
  let rq = 0, ranim = false;
  const queue = d => { ranim = ranim || !!(d && d.animate); if (rq) return; rq = requestAnimationFrame(() => { rq = 0; const a = ranim; ranim = false; update({ animate:a }); }); };
  const offs = [on('state', queue), on('lines', () => update()), on('prefs', () => { qKey = ''; queue(); }), on('status', drawSync)];
  return { el, title:'Lane', mounted() { update({ animate:true }); drawSync(); }, destroy() { cancelAnimationFrame(rq); offs.forEach(f => f()); lane.destroy(); deck.destroy(); } };
}
