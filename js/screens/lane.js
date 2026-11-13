import { ballKey } from '../cc/cats.js';
import { analyze, coachLine, sensitivity, ruleOf31, rollMph, S, C_SKID, C_HOOK, C_ROLL } from '../engine.js';
import { rgTxt, coverKind, modelOK } from '../data.js';
import { app, esc, on, saveLine, renameLine, linesForBall, applyLine, status } from '../store.js';
import { h, icon, toast, sheet } from '../ui.js';
import { createLane } from '../lane.js';
import { go } from '../router.js';
import { createDeck, describe } from '../deck.js';
// left-handers see a mirrored lane, so the engine's right-hander directions are swapped for display
const isLefty = HAND.isLefty;   // explicit hand only (cc/hand.js)
const mirrorWords = t => t.replace(/\b(left|right|Left|Right)\b/g, w => ({ left:'right', right:'left', Left:'Right', Right:'Left' })[w]);
const DEFL_DOC = 'https://github.com/majalen3/arsenal-pro-bowling/blob/main/docs/DEFLECTION.md';
import { adjust, miss, restore, snapshot, target, modelIn, MISSES, setBall, quickBalls } from '../ctl.js';
import * as PERF from '../perf.js';
import { ballFor } from '../cc/cats.js';
import { OIL_LEN } from '../engine.js';
import { balls } from '../data.js';
import { openBallSheet, openConditions, openTune, openLines, tunePanel } from './pickers.js';
import { PATTERN_LABEL, FINISH_LABEL, CALL_LABEL, CALL_TONE, f1, fmtBoard, fmtHalf } from '../labels.js';
import { profile } from '../store.js';
import { houseRule } from '../cc/target.js';
import { prefs, setPrefs } from '../store.js';
import { ready, proj } from '../hub.js';
import { lineFor, standOf, keepLine } from '../cc/line.js';
import { releaseSource, specSource, pathSummary, aboutAngle } from '../cc/provenance.js';
import * as UX from '../cc/ux.js';   // Now items 4/5: S1 Lane variant flag + on-device counts
import { openNight } from '../cc/night.js';
import { presetFor } from '../cc/model.js';
import { aimLayer, paintPill, overlaysBtn } from './overlays.js';
import { helpDot } from './help.js';
import * as HAND from '../cc/hand.js';
import { handAsk } from './hand.js';
import { seedLine as seedShared, keepMoved as keepShared } from '../laneseed.js';
export function render({ query } = {}) {
  // v78 (owner t143u): the strike line tab opens THIS screen. #/strike redirects here with ?ball=<id>, so honour it.
  const qb = query && query.get('ball') && ballFor(query.get('ball')); if (qb && modelOK(qb)) setBall(qb);
  const ballBtn = h('button', { class:'ball-btn', id:'ballBtn', 'aria-haspopup':'dialog', onclick:openBallSheet });
  const saveBtn = h('button', { class:'icon-btn', id:'saveBtn', 'aria-label':'Save this line', onclick:quickSave });
  const tgBtn = h('button', { class:'icon-btn', id:'targetBtn', 'aria-label':'Targeting: feet, eyes, break box', html:icon('target'), onclick:() => go('#/target') });
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
  // Now item 4 (PRODUCT_EVAL_1 §8, 2026-11-02): every physics number carries where it comes from. The Lane's path numbers are the
  // 2-D model's (no measured path exists in the app); a release number from an accepted LaneTrax import is marked measured.
  // S1 (docs/SMOKE_TESTS.md): flag laneView 'summary' (default) = one plain path line on top + chips, the phase numbers behind
  // a tap; 'baseline' = no summary and phase numbers open. Both arms keep source chips as a safety floor.
  const V = UX.flag('laneView'), SUM = V !== 'baseline';
  const chip = (p, t) => h('span', { class:'prov', 'data-prov':p, text:t });
  const tile = (id, label, model) => h('div', { class:'tile', id }, h('div', { class:'tile-label' }, label, ...(model ? [chip('model', 'model')] : [])), h('div', { class:'tile-val num' }), h('div', { class:'tile-sub' }));
  const tEntry = tile('tEntry', 'Entry', 1), tAngle = tile('tAngle', 'Angle', 1), tBp = tile('tBp', 'Break', 1);
  const lineSum = h('button', { class:'line-sum', id:'lineSum', onclick:() => { tune = openTune(); } });
  const hold = h('div', { class:'hold', id:'hold' });
  const more = h('div', { class:'more-read', id:'moreRead' });
  const pathSum = SUM ? h('p', { class:'path-sum', id:'laneSum', role:'status' }) : null;
  const moreBox = SUM ? h('details', { class:'more-fold', id:'laneNums', ontoggle:e => { if (e.target.open) UX.count('lane.numbers.open'); } }, h('summary', { text:'Skid, hook, roll and roll speed' }), more) : more;
  UX.count('lane.view.' + (SUM ? 'summary' : 'baseline'));
  const inlineTune = tunePanel(); inlineTune.classList.add('tune-inline');
  const missRow = h('div', { class:'miss-row', role:'group', 'aria-labelledby':'missLbl' },
    h('div', { class:'miss-lbl', id:'missLbl', text:'Your ball went' }),
    h('div', { class:'miss-btns' }, ...['left', 'high', 'light', 'right'].map(k => h('button', { class:'miss-btn', 'data-miss':k, 'aria-label':`Missed ${MISSES[k].label}: ${MISSES[k].move}`, onclick:() => doMiss(k) },
      h('span', { class:'miss-ic', html:icon(k === 'left' ? 'left' : k === 'right' ? 'right' : k === 'high' ? 'up' : 'downArrow') }), h('span', { text:MISSES[k].label })))));
  const aimPill = h('span', { class:'pill', id:'aimPill', hidden:true, 'aria-live':'polite' }), aimWhy = h('p', { class:'muted small', id:'aimWhy', hidden:true }), modelNote = h('p', { class:'muted small', id:'laneModelNote', hidden:true });
  // sim2 #1/#2: the Aim Box uses tonight's picked length when the Lane is on tonight's preset; the pill checks the model's reach.
  const patNow = () => { const P = proj(), sess = P ? ((P.sessions || {})[openNight(P) || ''] || {}) : {}, ft = sess.ft != null ? +sess.ft : null;
    return { preset: S.pattern, ft: ft != null && presetFor(ft) === S.pattern ? ft : null }; };
  const aimCtx = () => ({ cat: app.ball, speed: +S.speed, rev: +S.rev, finish: S.finish, oil: +S.oil });
  const missing = h('p', { class:'card', id:'laneMissing', hidden:true, text:'Specs unverified or cover not supported. No model path: choose another ball, or check your specs in Bag.' });
  // ---- v78 Optimize (owner t143u): one tap runs the existing Forgiving sweep (cc/strikeline.js forgive(), simulatePath unchanged) from the line
  // on the lane, puts the best stand and target on the lane and shows pocket % (estimate) vs the line it replaced, the miss room, and Undo.
  const optBtn = h('button', { class:'btn primary block', id:'optimize', type:'button', onclick:() => optimize() }, h('span', { id:'optLbl', text:'Optimize' }));
  const optRow = h('div', { class:'opt-row', id:'optRow' }, optBtn);
  const optOut = h('div', { class:'opt-out', id:'optOut', 'aria-live':'polite', hidden:true });
  const MISS_AUTO = 'auto', fmtMiss = v => v === 1.5 ? '1\u00bd' : String(v);
  const optMiss = h('select', { id:'optMissSel', onchange:e => { setPrefs({ slMiss:e.target.value === MISS_AUTO ? null : +e.target.value }); opt = null; paintOpt(); } });
  const el = h('section', { class:'screen lane-screen' },
    h('header', { class:'appbar' }, h('h1', { class:'sr-only', id:'laneH1' }), ballBtn, h('div', { class:'appbar-actions' }, syncDot, tgBtn, linesBtn, saveBtn)),
    h('div', { class:'ctl-bar' },
    h('div', { class:'cond-row' }, backBtn, h('div', { class:'cond-grp', role:'group', 'aria-label':'Lane conditions' }, patChip, surfChip, oilChip, tuneChip))),
    missing, h('div', { class:'lane-grid' },
      h('div', { class:'lane-col' }, canvas),
      h('section', { class:'deck-card', id:'deckCard', 'aria-labelledby':'deckH' }, h('div', { class:'deck-side' }, h('h2', { class:'deck-h', id:'deckH', text:'Pin deck' }), h('div', { class:'row call-row' }, callBadge, helpDot('bm-shr', 'Skid, hook, roll')), deckRead,
        h('p', { class:'deck-cap', id:'deckMirror', hidden:true, text:'Mirrored for left hand.' }))),
      handAsk({ compact:true }), h('div', { class:'read-col' }, lineSum, optRow, optOut, missRow),
      h('details', { class:'card more-fold lane-more', id:'laneDetails' }, h('summary', { text:'Details' }),
        qRow, modelNote, pathSum, h('div', { class:'tiles' }, tEntry, tAngle, tBp), coach, hold,
        h('div', { class:'legend', 'aria-hidden':'true' }, h('span', { html:`<i style="background:${C_SKID}"></i>Skid` }), h('span', { html:`<i style="background:${C_HOOK}"></i>Hook` }), h('span', { html:`<i style="background:${C_ROLL}"></i>Roll` }), h('span', { html:'<i class="bp"></i>Breakpoint' })),
        h('div', { class:'row lane-tools' }, overlaysBtn(patNow), aimPill), aimWhy,
        h('label', { class:'small opt-miss', for:'optMissSel' }, 'Optimize miss size at the arrows (1 SD) ', optMiss),
        h('figure', { class:'deck-fig deck-fig-detail' }, deckCv),
        h('details', { class:'deck-how', id:'deckHow' }, h('summary', { text:'How the pin deck works' }), h('div', { id:'deckHowBody' }), h('p', { class:'deck-cap', id:'deckCap' })),
        moreBox, inlineTune)));
  let tune = null;
  const lane = createLane(canvas, { onAdjust:ch => adjust(ch), lefty:isLefty, aimBox:aimLayer(patNow), eyes:target });
  const half2 = v => Math.round(v * 2) / 2;
  const deck = createDeck(deckCv);
  function setTile(t, val, sub, tone) { t.querySelector('.tile-val').textContent = val; t.querySelector('.tile-sub').textContent = sub; t.dataset.tone = tone; }
  let lastKey = '';
  function paintSum(a) { if (pathSum) pathSum.replaceChildren(pathSummary(a), chip('model', 'model')); }
  function update({ animate = false } = {}) {
    const b = app.ball, mi = modelIn();   // the bowler's stand → aim (ctl.modelIn)
    ballBtn.innerHTML = `<span class="ball-orb sm" style="--c:${esc(b.color || "#777")}" aria-hidden="true"></span><span class="ball-btn-text"><span class="ball-btn-name">${esc(b.name)}</span><span class="ball-btn-sub">${esc(b.brand)} · ${esc(coverKind(b))} · RG ${rgTxt(b)}</span></span>${icon('down', 'chev')}`;
    ballBtn.querySelector('.ball-btn-sub').append(chip(specSource(b, 'rg')[0], specSource(b, 'rg')[1] + (b.weight ? ' · ' + b.weight + ' lb' : '')));
    ballBtn.title = 'Change ball';
    el.querySelector('#laneH1').textContent = `Lane: ${b.name}`;
    patChip.innerHTML = `<span class="chip-k">Pattern</span> ${PATTERN_LABEL[S.pattern]}`; patChip.setAttribute('aria-label', `Pattern ${PATTERN_LABEL[S.pattern]}. Change conditions`);
    surfChip.innerHTML = `<span class="chip-k">Surface</span> ${FINISH_LABEL[S.finish]}`; surfChip.setAttribute('aria-label', `Surface ${FINISH_LABEL[S.finish]}. Change conditions`);
    oilChip.innerHTML = `<span class="chip-k">Oil</span> ×${(+S.oil).toFixed(1)}`; oilChip.setAttribute('aria-label', `Oil ×${(+S.oil).toFixed(1)}. Change oil volume`);
    const bw = (proj() || {}).bowler || {}, sp = releaseSource(bw.speed, S.speed), rv = releaseSource(bw.rev, S.rev);
    tuneChip.replaceChildren(h('span', { html:icon('tune') }), `${S.speed} mph `, chip(...sp), ` · ${S.rev} rpm `, chip(...rv)); tuneChip.setAttribute('aria-label', `${S.speed} mph ${sp[1]} · ${S.rev} rpm ${rv[1]}. Tune shot`);
    const supported = modelOK(b); missing.hidden = supported; if (!supported) opt = null; el.querySelector('.lane-grid').hidden = !supported;
    if (!supported) { if (qKey !== b.id) { qKey = b.id; drawQuick(); } return; }
    const a = analyze(b, { release:mi.release, aim:mi.aim });
    const tone = CALL_TONE[a.call]; callBadge.textContent = CALL_LABEL[a.call]; 
    const cl = houseRule(coachLine(a));
    coach.textContent = isLefty() ? mirrorWords(cl) : cl; coach.append(chip('model','model'));
    setTile(tEntry, f1(a.entryBoard), 'pocket 17.5', a.entryBoard != null && Math.abs(a.entryBoard - 17.5) <= 0.7 ? 'good' : 'warn');
    setTile(tAngle, a.angle == null ? '\u2014' : aboutAngle(a.angle), 'drawn, not measured', a.angle != null && a.angle >= 4 && a.angle <= 6 ? 'good' : 'warn');
    const r31 = a.bpBoard == null ? null : ruleOf31(S.pattern, a.bpBoard);
    setTile(tBp, a.bpBoard == null ? '\u2014' : f1(a.bpBoard), a.bpFeet == null ? 'no hook' : `@ ${Math.round(a.bpFeet)} ft`, r31 && Math.abs(r31.d) <= 2 ? 'good' : 'warn');
    // One stand/aim source (sim bug 5): Stand = laydown + offset − drift, the same number Tonight and Targeting show.
    const sd = standOf(S.release); lineSum.dataset.release = S.release; lineSum.dataset.stand = sd.feet; lineSum.dataset.aim = half2(target());
    modelNote.hidden = !mi.clamped;
    if (mi.clamped) modelNote.textContent = `Model limit: the model launches at most 0.9 board off the laydown, so its ball starts ${Math.abs(mi.shift)} boards ${(mi.shift > 0) === !isLefty() ? 'left' : 'right'} of your laydown to cross the arrows at ${fmtHalf(target())}. Your stand is unchanged.`;
    if (mi.clamped) modelNote.append(chip('model','model'));
    lineSum.innerHTML = `<span class="sr-only">Tune shot. </span><span><b class="num">${sd.feet}</b><small>Stand \u00b7 lay ${S.release}</small></span><span class="arrow" aria-hidden="true">→</span><span><b class="num">${fmtHalf(target())}</b><small>Aim</small></span><span><b class="num">${S.speed}</b><small>mph</small></span><span><b class="num">${S.rev}</b><small>rpm</small></span>${icon('tune', 'ls-ic')}`;
    lineSum.querySelectorAll('span').forEach(n => { if (n.querySelector('small')?.textContent === 'mph') n.append(chip(...sp)); if (n.querySelector('small')?.textContent === 'rpm') n.append(chip(...rv)); if (/^(Stand|Aim)/.test(n.querySelector('small')?.textContent || '')) n.append(chip('assumed','input')); });
    const sens = sensitivity(b), n = +sens.split(' ')[0];
    hold.innerHTML = `<span class="hold-bar" aria-hidden="true">${Array.from({ length:6 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span><span>Margin: <b>${sens}</b> small misses still strike</span>`;
    hold.append(chip('model', 'model'));
    hold.dataset.tone = !a.strike ? 'off' : n >= 4 ? 'good' : 'warn';
    const ph = a.phases, n0 = v => Math.round(v);
    more.innerHTML = (ph ? `<div><span class="dot" style="background:${C_SKID}"></span>Skid <b>0\u2013${n0(ph.skid)} ft</b> · <span class="dot" style="background:${C_HOOK}"></span>Hook <b>${n0(ph.skid)}\u2013${n0(ph.roll)} ft</b> · <span class="dot" style="background:${C_ROLL}"></span>Roll <b>${n0(ph.roll)}\u2013${n0(ph.end)} ft</b></div>` : '') +
      `<div>Rolls at ~<b>${rollMph(+S.speed).toFixed(1)} mph</b> (est.)${r31 ? ' · ' + r31.text : ''}</div>`;
    for (const row of more.children) row.append(chip('model', 'model'));
    paintSum(a);
    canvas.setAttribute('aria-label', `Lane preview (model). ${CALL_LABEL[a.call]}. Entry board ${f1(a.entryBoard)}, angle ${f1(a.angle)} degrees, breakpoint board ${f1(a.bpBoard)} at ${a.bpFeet == null ? 'none' : Math.round(a.bpFeet) + ' feet'}. ${isLefty() ? 'Mirrored for left hand. ' : ''}Arrow keys move feet and target.${paintPill(aimPill, patNow, a, aimCtx)}`);
    aimWhy.hidden = aimPill.dataset.state !== 'beyond'; aimWhy.textContent = aimPill.dataset.why || '';
    const same = l => l.release === +S.release && l.aim === +S.aim && (l.eyes ?? null) === app.eyes && l.speed === +S.speed && l.rev === +S.rev && l.pattern === S.pattern && l.finish === S.finish && +l.oil === +S.oil;
    const mine = linesForBall(), saved = mine.some(same), bl = backLine(mine);
    backBtn.hidden = !bl || same(bl);
    if (bl) { backBtn.innerHTML = `${icon('undo')} <span>Back to saved</span>`; backBtn.setAttribute('aria-label', `Back to saved line ${bl.name}`); backBtn.title = `Back to \u201c${bl.name}\u201d`; }
    if (qKey !== b.id) { qKey = b.id; drawQuick(); }
    saveBtn.innerHTML = icon(saved ? 'saved' : 'save'); saveBtn.setAttribute('aria-pressed', String(saved)); saveBtn.classList.toggle('on', saved);
    inlineTune.sync(); tune && tune.p && document.contains(tune.p) && tune.p.sync();
    const key = b.id + S.pattern + S.finish;
    lane.draw({ ball:b, result:a }, { animate:animate && key !== lastKey ? true : animate });
    const lefty = isLefty(), d = describe(a, lefty);
    deck.draw({ res:a, lefty, tone, color:b.color }, { animate });
    deckCv.setAttribute('aria-label', `Pin deck close-up, ${d.pocket} pocket. ${CALL_LABEL[a.call]}. ${d.text}`);
    const how = a.entryBoard != null && d.side;
    deckRead.innerHTML = how ? `<p class="deck-side-call">${d.side[0].toUpperCase() + d.side.slice(1)}.</p>` : `<p>${d.text}</p>`;
    deckRead.append(chip('model','model'));
    el.querySelector('#deckHowBody').innerHTML = how ? `<p class="deck-contact">Angle ${d.ang}. ${d.contact}</p><p class="deck-five">${d.five}</p>` : '';
    if (how) el.querySelector('#deckHowBody').append(chip('model', 'model'));
    el.querySelector('#deckMirror').hidden = !lefty;
    el.querySelector('#deckCard').dataset.tone = tone;
    el.querySelector('#deckCap').innerHTML = `Pin action: approximate 2-D model, assumed 15 lb ball, no spin. <a href="${DEFL_DOC}" target="_blank" rel="noopener">Full write-up</a>`;
    lastKey = key; paintOpt(); optBtn.disabled = optBtn.hasAttribute('aria-busy');
  }
  // ---- Optimize state. `opt` = what the last tap did on THIS ball + conditions + line; it is dropped the moment any of those change.
  let opt = null, F = null;   // F = cc/strikeline.js, loaded after the first paint (the Lane view does not need it until Optimize or Details)
  const loadF = () => F ? Promise.resolve(F) : import('../cc/strikeline.js').then(m => (F = m));
  const half = n => n === 0 ? '0' : n === 0.5 ? '\u00bd' : String(n).replace('.5', '\u00bd');
  const optKey = () => [ballKey(app.ball), S.pattern, S.finish, +S.oil, +S.speed, +S.rev, isLefty()].join('|');
  const missPref = () => { const v = +prefs().slMiss; return Number.isFinite(v) && v ? v : null; };
  const forgCache = new Map();
  function paintOpt() {
    if (opt && (opt.key !== optKey() || opt.rel !== +S.release || opt.tgt !== target())) opt = null;   // anything moved: the stat no longer describes the lane
    if (F) { const a = F.spreadFrom(proj()).arrows, have = prefs().slMiss ? String(prefs().slMiss) : MISS_AUTO;
      optMiss.replaceChildren(h('option', { value:MISS_AUTO, text:`Auto (${a.src === 'device' ? 'your LaneTrax' : 'assumed'} \u00b1${fmtMiss(a.v)})` }), ...F.MISS_CHOICES.map(v => h('option', { value:String(v), text:`\u00b1${fmtMiss(v)} boards` })));
      optMiss.value = have; }
    optRow.querySelector('#optUndo')?.remove();
    optRow.classList.toggle('has-undo', !!opt && !opt.same);
    optOut.hidden = !opt; optOut.dataset.state = opt ? (opt.same ? 'same' : 'applied') : '';
    if (!opt) { optOut.replaceChildren(); return; }
    optOut.dataset.pocket = String(opt.pocket); optOut.dataset.was = String(opt.was); optOut.dataset.room = `${opt.room.left}/${opt.room.right}`;
    const room = h('span', { class:'opt-room', text:`Room ${half(opt.room.left)} left \u00b7 ${half(opt.room.right)} right` });
    optOut.replaceChildren(
      h('div', { class:'opt-line' }, h('span', { class:'prov', 'data-prov':'model', text:'estimate' }), ' ', opt.same ? h('b', { text:'Already your best line' }) : h('b', { text:`${opt.pocket}% pocket` }), opt.same ? null : ` (was ${opt.was}%)`),
      h('div', { class:'opt-line' }, opt.same ? `${opt.pocket}% pocket \u00b7 ` : null, room));
    optRow.querySelector('#optUndo')?.remove();
    if (!opt.same) optRow.append(h('button', { class:'btn ghost', id:'optUndo', type:'button', 'aria-label':'Undo: back to the line before Optimize', onclick:undoOpt }, h('span', { html:icon('undo') }), h('span', { text:'Undo' })));
    optOut.setAttribute('aria-label', `Estimate from the model, not a measurement. ${opt.same ? 'Already your best line. ' : ''}Pocket ${opt.pocket} percent, ${opt.was} before. You can miss ${half(opt.room.left)} board left or ${half(opt.room.right)} right at the arrows and still enter the pocket window.`);
  }
  function undoOpt() { if (!opt || !opt.before) return; restore(opt.before); opt = null; paintOpt(); toast('Back on your previous line'); }
  function optimize() {
    const cat = app.ball; if (!modelOK(cat) || optBtn.disabled) return;
    optBtn.disabled = true; optBtn.setAttribute('aria-busy', 'true'); optBtn.querySelector('#optLbl').textContent = 'Optimizing\u2026';
    loadF().then(() => new Promise(r => setTimeout(r, 20))).then(() => {
      try {
        const P = proj(), pn = patNow(), ft = pn.ft != null ? pn.ft : (OIL_LEN[S.pattern] || 38), miss = missPref(), lefty = isLefty();
        const start = { lay:+S.release, arr:target() }, speed = +S.speed, rev = +S.rev;
        const ck = [ballKey(cat), miss, ft, speed, rev, start.lay, start.arr].join('|');
        if (!forgCache.has(ck)) { const end = PERF.span('lane.optimize'); forgCache.set(ck, F.forgive(cat, { speed, rev, ft, spread:F.spreadFrom(P), miss, start })); end(); PERF.count('cache.forgiving.miss'); } else PERF.count('cache.forgiving.hit');
        const r = forgCache.get(ck);
        if (r.none) { opt = null; optOut.hidden = false; optOut.dataset.state = 'none'; optOut.replaceChildren(h('div', { class:'opt-line', text:r.reason })); return; }
        const c = r.forgiving, before = Object.assign(snapshot(), { eyes:app.eyes }), was = r.standard.pocket;
        if (!r.same) adjust({ release:c.lay, target:c.arrows }, { animate:true });
        opt = { key:optKey(), rel:+S.release, tgt:target(), before, pocket:c.pocket, was, same:r.same, room:F.missRoom(c, lefty) };
        paintOpt();
      } finally { optBtn.disabled = false; optBtn.removeAttribute('aria-busy'); optBtn.querySelector('#optLbl').textContent = 'Optimize'; }
    });
  }
  let qKey = '';
  function drawQuick() {
    const list = quickBalls(5);
    qRow.replaceChildren(...list.map(x => h('button', { class:'qball', 'data-ball':x.id, title:`${x.brand} ${x.name}`, onclick:() => setBall(x) },
      h('span', { class:'ball-orb xs', style:`--c:${x.color}`, 'aria-hidden':'true' }), h('span', { class:'qball-name', text:x.name }))),
      h('button', { class:'qball all', id:'qballAll', 'aria-haspopup':'dialog', onclick:openBallSheet }, h('span', { html:icon('arsenal') }), h('span', { class:'qball-name', text:`All ${balls.length}` })));
  }
  // 'Back to saved line': the line most recently saved or loaded for this ball, else this ball's newest saved line
  function backLine(mine) { const ll = app.lastLine; return (ll && ll.ballId === ballKey(app.ball) && mine.find(l => l.name === ll.name)) || mine[0] || null; }
  function backToSaved() { const l = backLine(linesForBall()); if (!l) return; applyLine(l); toast(`Back on \u201c${l.name}\u201d`); }
  function drawSync() { syncDot.dataset.state = status.cls || 'idle'; syncDot.setAttribute('aria-label', status.text || 'Not synced yet'); syncDot.title = status.text || ''; }
  function quickSave() {
    const name = `${PATTERN_LABEL[S.pattern]} ${S.release}\u2192${fmtHalf(target())}`;
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
  // Lane opens on this ball's line from js/cc/line.js (the same line as Tonight and Targeting): the line the bowler kept
  // for this ball if any (F01), else the model start. Whatever the bowler moves here becomes the kept line for the ball.
  // Lane opens on this ball's line (js/laneseed.js, shared with Ball). Whatever the bowler moves here becomes the kept line.
  let seeded = false;
  const seedLine = () => { if (seedShared()) seeded = true; };
  const keepMoved = () => { if (seeded) keepShared(); };
  ready().then(seedLine).catch(() => {});
  const offs = [on('ball', seedLine), on('state', d => { keepMoved(); queue(d); }), on('lines', () => update()), on('prefs', () => { qKey = ''; queue(); }), on('status', drawSync)];
  return { el, title:'Lane', mounted() { update({ animate:true }); drawSync(); setTimeout(() => loadF().then(paintOpt), 0); }, destroy() { cancelAnimationFrame(rq); offs.forEach(f => f()); lane.destroy(); deck.destroy(); } };
}

