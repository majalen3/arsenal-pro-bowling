// Targeting (TEAM_PROMPT_TARGETING.md): move feet / drift / eyes, see the unchanged engine's path, whether it goes through
// the break box, and the pocket call; one cited move, checked on the engine, is one tap away. Boards are the bowler's own
// numbering; the lane and the words left/right mirror for left-handers.
import { h, icon, toast } from '../ui.js';
import { go } from '../router.js';
import { ready, proj } from '../hub.js';
import { app, today, profile, prefs, setPrefs, saveLine, linesForBall, on } from '../store.js';
import { S, RANGES } from '../engine.js';
import { balls, specOK } from '../data.js';
import { catOf } from '../cc/cats.js';
import { createLane } from '../lane.js';
import { createDeck, describe } from '../deck.js';
import { HOUSE_ASSUMED, rule31 } from '../cc/rank.js';
import { lineFor } from '../cc/line.js';
import { openNight } from '../cc/night.js';
import { arrowsBoard } from '../cc/geom.js';
import * as T from '../cc/target.js';
import * as F from '../cc/strikeline.js';
import { aimLayer as aimL, paintPill, overlaysBtn } from './overlays.js';
const num = f => f == null ? null : typeof f === 'object' ? (Number.isFinite(+f.v) ? +f.v : null) : (Number.isFinite(+f) ? +f : null);
const prov = (p, label) => h('span', { class: 'prov', 'data-prov': p || null, text: label });
const CALL = { pocket: ['Pocket', 'good'], high: ['High', 'warn'], light: ['Light', 'warn'], gutter: ['Gutter', 'bad'] };
const TOUR = [
  ['Set your feet and eyes', 'Tap \u25C0 \u25B6 under Feet and Eyes (or drag on the lane: near the foul line moves your laydown, higher up moves your eyes).'],
  ['Watch the box', 'The gold box is where tonight\u2019s strike line breaks. It turns green when your breakpoint goes through it.'],
  ['Read the call, take the move', 'Pocket, high or light, with the numbers. If it misses, one tap applies the suggested move and re-runs the shot.'],
];
export async function render({ query } = {}) {
  await ready();
  const P = proj(), b = P.bowler || {}, lefty = () => (profile() && profile().hand === 'left') || b.hand === 'left';
  const sess = (P.sessions || {})[openNight(P) || ''] || {};   // the open night (sim bug 3), not the calendar day
  const ft = sess.ft != null ? +sess.ft : HOUSE_ASSUMED.ft;
  const speed = num(b.speed) || +S.speed || 15, rev = num(b.rev) || +S.rev || 220;
  const relSrc = k => { const f = b[k]; return f && f.prov ? (f.prov.kind === 'device' ? ['device', f.prov.label || 'LaneTrax'] : ['user', 'your profile']) : ['assumed', 'assumed']; };
  // balls: owned (not pro shop / retired) + the Lane ball; ?ball= picks one (Tonight link)
  const owned = Object.values(P.owned || {}).filter(o => !['proShop', 'retired'].includes(o.status)).map(o => catOf(o.catalogId)).filter(Boolean);
  const list = [...new Map([app.ball, ...owned].filter(Boolean).map(c => [c.id, c])).values()];
  let cat = (query && query.get('ball') && catOf(query.get('ball'))) || app.ball;
  // tv 2 = eyes in real arrows boards (DECISIONS #26). Older saved eyes used the v1 "1 board per aim unit" label, so they are dropped.
  const pt0 = prefs().target || {}, saved = pt0.tv === 2 ? pt0 : {};
  const ctx = { speed, rev, ft };
  // Same stand/aim as Tonight and Lane (js/cc/line.js, sim bug 5).
  const seed = () => { const L = specOK(cat) ? lineFor(cat, { speed: num(b.speed) || 15, rev: num(b.rev) || 220, ft: sess.ft != null ? +sess.ft : null }) : null;
    return !L || !L.stand ? {} : { feet: L.stand.feet, eyes: L.ml.target }; };
  let t = Object.assign({}, T.DEFAULTS, saved.t || seed());
  let box = null, r = null, sug = null;

  const canvas = h('canvas', { id: 'tgLane', class: 'lane-canvas tg-lane', tabindex: '0', role: 'img' });
  const deckCv = h('canvas', { class: 'deck', id: 'tgDeck', role: 'img' });
  const coach = h('p', { class: 'coach', id: 'tgCoach', role: 'status', 'aria-live': 'polite' });
  const callPill = h('span', { class: 'pill', id: 'tgCall' }), boxPill = h('span', { class: 'pill', id: 'tgBox' });
  const sum = h('ol', { class: 'tg-sum', id: 'tgSum', 'aria-label': 'Line summary' });
  const sugBox = h('div', { class: 'tg-sug', id: 'tgSug' });
  // Engine limitation label (DECISIONS #26): always visible, one line, details on tap.
  const B = T.BOOK;
  const limits = h('details', { class: 'tg-limits small', id: 'tgLimits' },
    h('summary', { text: 'Model limit: straighter line, smaller hook than a real house shot' }),
    h('ul', {}, h('li', { text: T.LIMITS.reach }), h('li', { text: T.LIMITS.hook }), h('li', { text: T.LIMITS.oil }), h('li', { text: T.LIMITS.angle })),
    h('p', { id: 'tgBook' }, 'Book starts on a house shot, all crossing the 2nd arrow (board 10): ',
      B.lines.map(l => `${l.style.toLowerCase()} laydown ${l.lay}`).join(', '), '; breakpoint ', B.bp, ' at ', B.bpFt, ' ft. Sources: ',
      h('a', { href: B.src, target: '_blank', rel: 'noopener', class: 'srclink' }, B.label), ', ',
      h('a', { href: B.nba, target: '_blank', rel: 'noopener', class: 'srclink' }, 'National Bowling Academy'), '. Feet = laydown + your ball offset \u2212 drift.'));
  const warnBox = h('div', { class: 'muted small', id: 'tgWarn' });
  const tourBox = h('div', { id: 'tgTourHost' });
  const ballSel = h('select', { id: 'tgBall', 'aria-label': 'Ball', class: 'tg-ball' }, ...list.map(c => h('option', { value: c.id, text: c.name + (specOK(c) ? '' : ' (spec TBD)') })));
  ballSel.value = cat.id; ballSel.onchange = () => { cat = catOf(ballSel.value) || cat; box = null; findOut.replaceChildren(); update(true); };
  // ---- Find my strike line: grid + Monte Carlo on the unchanged engine (js/cc/strikeline.js)
  const findOut = h('div', { id: 'tgFindOut', 'aria-live': 'polite' });
  const findBtn = h('button', { class: 'btn primary block', id: 'tgFind', html: icon('target') + '<span>Find my strike line</span>', onclick: () => runFind() });
  function runFind() {
    if (!specOK(cat)) { findOut.replaceChildren(h('p', { class: 'coach', text: `${cat.name}: spec TBD, so no model line to search.` })); return; }
    findBtn.disabled = true; findBtn.lastChild.textContent = 'Searching\u2026';
    setTimeout(() => {
      const t0 = performance.now(), sd = F.spreadFrom(P), res = F.find(cat, { speed, rev, ft, spread: sd }), ms = Math.round(performance.now() - t0);
      findBtn.disabled = false; findBtn.lastChild.textContent = 'Find my strike line';
      const w = F.say(res, t); findOut.dataset.ms = ms;
      if (res.none) { findOut.replaceChildren(h('div', { class: 'card tg-find', id: 'tgFindCard' }, h('p', { class: 'coach', id: 'tgFindLine', text: `${w.line} Try another ball or move by hand below.` }))); return; }
      const use = (c, feet, eye, label) => () => { t = Object.assign({}, t, { feet, eyes: eye, bpBoard: c.bp != null ? Math.round(c.bp) : null, bpFt: c.bpFt }); box = null; update(true); toast(`${label}: feet ${feet}, ${t.mode} ${eye}.`); canvas.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
      const sp = relSrc('speed'), rv = relSrc('rev'), S2 = res.spread;
      findOut.replaceChildren(h('div', { class: 'card tg-find', id: 'tgFindCard' },
        h('p', { class: 'coach', id: 'tgFindLine', text: w.line }),
        h('p', { class: 'small', id: 'tgFindWhy', text: w.why }),
        h('p', { class: 'muted small', id: 'tgFindLimit', text: 'Model line. A real tweener house line usually starts wider: laydown 14\u201315 to board 10 at the arrows (bowlingball.com). See Model limit above.' }),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', id: 'tgFindApply', onclick: use(res.best, w.feet, w.eye, 'Strike line') }, `Use stand ${w.feet}, aim ${w.eye}`)),
        w.alt ? h('p', { class: 'small', id: 'tgFindAlt' }, w.alt, ' ', h('button', { class: 'btn ghost sm', id: 'tgFindAltApply', onclick: use(res.alt, w.altFeet, w.altEye, res.alt.kind === 'room' ? 'More room' : 'Next best') }, 'Use it')) : '',
        h('details', { class: 'small', id: 'tgFindInputs' }, h('summary', { text: 'Inputs and method' }),
          h('ul', {},
            h('li', { text: `${w.window} Source: ` }, h('a', { href: F.SRC.window.url, target: '_blank', rel: 'noopener', class: 'srclink' }, F.SRC.window.label), '. No strike % shown: the only published carry number we found (85% strikes at board 17.5) is not a curve by board and angle.'),
            h('li', { text: `Release: ${speed} mph (${sp[1]}), ${rev} rpm (${rv[1]}); ${res.preset} preset (${ft} ft, ${sess.ft != null ? 'tonight' : 'assumed'}); ${cat.name}.` }),
            h('li', { text: `Shot-to-shot spread (1 SD): arrows ${S2.arrows.v} bds (${S2.arrows.label}${S2.arrows.date ? ', ' + S2.arrows.date : ''}); laydown ${S2.laydown.label}; speed ${S2.speed.label}; rev ${S2.rev.label}.` }),
            h('li', { text: `Searched ${res.tried} lines in the window, scored the ${res.scored} with the most miss room by ${res.n} simulated shots each (seed ${res.seed}). Highest pocket % wins; within 3 points the line with more room wins. Feet = laydown + ball offset ${t.offset} \u2212 drift ${t.drift}. ${ms} ms.` })),
          h('p', { class: 'muted', text: 'A model estimate from the ball motion engine, not a guarantee. Import a LaneTrax session to use your measured accuracy.' }))));
    }, 30);
  }

  const lane = createLane(canvas, { lefty,
    state: () => ({ release: r ? r.lay : 10, aim: r ? r.aim : 0, pattern: r ? r.preset : 'house' }),
    aimBox: aimL(() => r ? r.preset : 'house'),
    onAdjust: ch => {
      if (ch.release != null) t.feet = Math.round(ch.release + t.offset - t.drift);
      else if (ch.aim != null) { const arrows = Math.round(arrowsBoard(r.lay, ch.aim) * 10) / 10; t.eyes = t.mode === 'dots' ? Math.round((r.lay + (arrows - r.lay) * T.DOTS_FT / T.ARROWS_FT) * 10) / 10 : arrows; }
      update(false);
    },
    overlay: ({ g, bx, fy, approachY, foulY, done }) => {
      if (!r || !box) return;
      const css = n => getComputedStyle(canvas).getPropertyValue(n).trim();
      const ok = r.box.ok, col = ok ? css('--good') : css('--gold');
      const x1 = bx(box.board - T.BOX_HALF_BOARDS), x2 = bx(box.board + T.BOX_HALF_BOARDS), y1 = fy(box.ft + T.BOX_HALF_FT), y2 = fy(box.ft - T.BOX_HALF_FT);
      g.globalAlpha = .22; g.fillStyle = col; g.fillRect(Math.min(x1, x2), y1, Math.abs(x2 - x1), y2 - y1);
      g.globalAlpha = 1; g.strokeStyle = col; g.lineWidth = 2; g.strokeRect(Math.min(x1, x2), y1, Math.abs(x2 - x1), y2 - y1);
      // feet on the approach, with drift to the laydown point
      const fx = bx(t.feet), lx = bx(r.lay);
      g.fillStyle = css('--text'); g.beginPath(); g.ellipse(fx, approachY, 4, 7, 0, 0, 7); g.fill();
      if (t.drift || t.offset) { g.setLineDash([3, 3]); g.strokeStyle = css('--text-2'); g.lineWidth = 1; g.beginPath(); g.moveTo(fx, approachY - 6); g.lineTo(lx, foulY - 2); g.stroke(); g.setLineDash([]); }
      if (t.mode === 'dots') { const dx = bx(t.eyes); g.strokeStyle = css('--gold'); g.lineWidth = 2; g.beginPath(); g.arc(dx, fy(T.DOTS_FT), 6, 0, 7); g.stroke(); }
    } });
  const deck = createDeck(deckCv);

  // ---- one-handed controls: big ◀ ▶ buttons (screen direction), value in the middle
  const ctlRow = (id, label, get, set, step = 1) => {
    const val = h('output', { class: 'tg-val num', id: id + 'Val', 'aria-live': 'off' });
    const mv = dir => { const db = (dir === 'left') === !lefty() ? step : -step; set(get() + db); update(false); };   // screen-left = higher boards for RH
    const row = h('div', { class: 'tg-ctl', id },
      h('span', { class: 'tg-lbl', text: label }),
      h('button', { class: 'tg-btn', 'aria-label': `${label} ${step === 1 ? '1 board' : step + ' board'} left`, html: icon('left'), onclick: () => mv('left') }), val,
      h('button', { class: 'tg-btn', 'aria-label': `${label} ${step === 1 ? '1 board' : step + ' board'} right`, html: icon('right'), onclick: () => mv('right') }));
    row.paint = txt => { val.textContent = txt; }; return row;
  };
  const feetRow = ctlRow('tgFeet', 'Feet', () => t.feet, v => { t.feet = Math.max(1, Math.min(45, v)); });
  const eyesRow = ctlRow('tgEyes', 'Eyes', () => t.eyes, v => { t.eyes = Math.max(1, Math.min(39, Math.round(v * 10) / 10)); }, 0.5);   // ½-board steps: the model's whole launch range is ±0.8 board
  const driftRow = ctlRow('tgDrift', 'Drift', () => t.drift, v => { t.drift = Math.max(-8, Math.min(8, v)); });
  const offRow = ctlRow('tgOffset', 'Ball from foot', () => t.offset, v => { t.offset = Math.max(0, Math.min(12, v)); });
  const bpbRow = ctlRow('tgBpB', 'Box board', () => t.bpBoard ?? (box ? Math.round(box.board) : 10), v => { t.bpBoard = Math.max(1, Math.min(30, v)); t.bpFt = t.bpFt ?? (box ? box.ft : ft); });
  const bpfRow = h('div', { class: 'tg-ctl', id: 'tgBpF' }, h('span', { class: 'tg-lbl', text: 'Box distance' }),
    h('button', { class: 'tg-btn', 'aria-label': 'Box 1 foot nearer', html: icon('minus'), onclick: () => { t.bpFt = Math.max(25, (t.bpFt ?? box.ft) - 1); t.bpBoard = t.bpBoard ?? Math.round(box.board); update(false); } }),
    h('output', { class: 'tg-val num', id: 'tgBpFVal' }),
    h('button', { class: 'tg-btn', 'aria-label': 'Box 1 foot farther', html: icon('plus'), onclick: () => { t.bpFt = Math.min(55, (t.bpFt ?? box.ft) + 1); t.bpBoard = t.bpBoard ?? Math.round(box.board); update(false); } }));
  const modeSeg = h('div', { class: 'seg tg-mode', role: 'radiogroup', 'aria-label': 'Aim at' },
    ...[['arrows', 'Arrows 15 ft'], ['dots', 'Dots 7.5 ft']].map(([v, l]) => h('button', { role: 'radio', class: 'seg-opt', 'data-v': v, onclick: () => {
      if (v === t.mode) return; const lay = T.laydownOf(t), arrows = T.arrowsOf(t, lay);
      t.eyes = v === 'dots' ? Math.round((lay + (arrows - lay) * T.DOTS_FT / T.ARROWS_FT) * 10) / 10 : Math.round(arrows * 10) / 10; t.mode = v; update(false); } }, l)));
  const resetBox = h('button', { class: 'btn ghost sm', id: 'tgBoxReset', onclick: () => { t.bpBoard = null; t.bpFt = null; update(false); } }, 'Use tonight\u2019s box');
  const setup = h('details', { class: 'card tg-setup', id: 'tgSetup' }, h('summary', { class: 'card-title', text: 'Drift, ball offset, your box' }),
    driftRow, offRow, bpbRow, bpfRow, resetBox, h('div', { class: 'muted small', id: 'tgAssume' }));
  const saveBtn = h('button', { class: 'btn primary', id: 'tgSave', onclick: saveMine }, 'Save as my line');
  const backBtn = h('button', { class: 'btn', id: 'tgBack', onclick: backToSaved }, 'Back to saved line');
  const helpBtn = h('button', { class: 'icon-btn', id: 'tgHelp', 'aria-label': 'How targeting works', text: '?', onclick: () => tour(0) });
  const dock = h('div', { class: 'tg-dock', id: 'tgDock' }, modeSeg, feetRow, eyesRow);

  const aimPill = h('span', { class: 'pill', id: 'tgAimPill', hidden: true });
  const el = h('section', { class: 'screen target-screen', id: 'target' },
    h('header', { class: 'appbar' }, h('button', { class: 'icon-btn', 'aria-label': 'Back to Lane', html: icon('back'), onclick: () => go('#/lane') }), h('h1', { class: 'title', text: 'Targeting' }), helpBtn),
    tourBox,
    h('div', { class: 'tg-top' }, ballSel, h('span', { class: 'muted small', id: 'tgCond' })),
    coach, limits, findBtn, findOut,
    h('div', { class: 'tg-grid' },
      h('div', { class: 'tg-lane-col' }, canvas),
      h('div', { class: 'tg-side' }, h('div', { class: 'row', role: 'group', 'aria-label': 'Result' }, callPill, boxPill, aimPill), overlaysBtn(() => r ? r.preset : 'house', 'tgOvBtn'), deckCv, h('p', { class: 'small', id: 'tgDeckRead' }))),
    sugBox, sum, warnBox, dock,
    h('div', { class: 'row tg-actions' }, saveBtn, backBtn),
    setup,
    h('details', { class: 'card', id: 'tgSources' }, h('summary', { class: 'card-title', text: 'Rules and sources' }),
      h('ul', { class: 'small' }, ...Object.values(T.SRC).map(s => h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener', class: 'srclink' }, s.label), ' \u2014 ' + s.note))),
      h('p', { class: 'muted small', text: 'Laydown = feet \u2212 ball offset + drift (Breakdown Bowling). Eyes at the dots are extended in a straight line to the arrows. Arrows are read from the engine\u2019s own path at 15 ft (DECISIONS #26).' })));

  function update(animate) {
    if (!box || (t.bpBoard != null && t.bpFt != null) !== (box.from === 'yours') || (box.from === 'yours' && (box.board !== t.bpBoard || box.ft !== t.bpFt))) box = T.boxFor(cat, ctx, t);
    if (!specOK(cat)) { coach.textContent = `${cat.name}: spec TBD, so no model line. Pick another ball.`; return; }
    r = T.read(cat, t, ctx, box); sug = T.suggest(cat, t, ctx, box, r);
    const L = lefty();
    coach.textContent = T.coach(r, sug, L);
    const [cl, tone] = CALL[r.call]; callPill.textContent = r.call === 'gutter' ? cl : `${cl} ${r.entry} \u00b7 ${r.angle}\u00b0 model`; callPill.dataset.tone = tone;
    boxPill.textContent = r.box.ok ? 'In the box' : r.box.dB == null ? 'No breakpoint' : `Box missed ${Math.abs(r.box.dB) > T.BOX_HALF_BOARDS ? Math.abs(r.box.dB) + ' bd ' + (r.box.dB > 0 ? 'inside' : 'outside') : Math.abs(r.box.dF) + ' ft ' + (r.box.dF > 0 ? 'long' : 'short')}`;
    boxPill.dataset.tone = r.box.ok ? 'good' : 'warn';
    const dirB = n => n === 0 ? '' : ` ${Math.abs(n)} ${T.dirWord(n, L)}`;
    feetRow.paint(`${t.feet}`); eyesRow.paint(`${t.eyes}`); driftRow.paint(t.drift ? dirB(t.drift).trim() : 'none'); offRow.paint(`${t.offset}`);
    bpbRow.paint(`${box.board}`); el.querySelector('#tgBpFVal').textContent = `${box.ft} ft`;
    modeSeg.querySelectorAll('button').forEach(x => { const on = x.dataset.v === t.mode; x.setAttribute('aria-checked', String(on)); x.tabIndex = on ? 0 : -1; });
    sum.replaceChildren(...[['Feet', t.feet], ['Laydown', r.lay], [t.mode === 'dots' ? 'Dots' : 'Arrows', r.clamped ? `${t.eyes} (model ${r.arrowsModel})` : t.eyes], ['Break', r.bpBoard == null ? '\u2014' : `${r.bpBoard} @ ${r.bpFt}`], ['Entry', r.entry == null ? '\u2014' : `${r.entry} \u00b7 ${r.angle}\u00b0`]]
      .map(([k, v]) => h('li', {}, h('small', { text: k }), h('b', { class: 'num', text: String(v) }))));
    sugBox.replaceChildren();
    if (sug) {
      const m = sug.move, src = T.SRC[m.src];
      sugBox.append(h('div', { class: 'row between' },
        h('div', {}, h('b', { text: `${m.rule}: ` }), T.moveWords(sug, L).replace(/^Move /, '').replace(/\.$/, ''), h('div', { class: 'muted small', text: `Model after the move: ${CALL[sug.r.call][0].toLowerCase()} ${sug.r.entry} \u00b7 ${sug.r.angle}\u00b0${sug.r.box.ok ? ', in the box' : ''}.` })),
        h('button', { class: 'btn primary', id: 'tgApply', onclick: () => { t = Object.assign({}, sug.t); update(true); toast(`${m.rule} applied.`); } }, 'Apply move')),
        h('p', { class: 'muted small' }, 'Rule: ', h('a', { href: src.url, target: '_blank', rel: 'noopener', class: 'srclink' }, src.label), sug.cited
          ? `. House-shot rule: move toward the miss.${sug.modelAgrees ? '' : ' The model can\u2019t show this working: ' + T.LIMITS.oil.replace(/^The model\u2019s/, 'its')}` : '. No cited direction for this miss; picked by the model.'));
    }
    warnBox.textContent = r.warn.join(' ');
    const sp = relSrc('speed'), rv = relSrc('rev');
    el.querySelector('#tgCond').replaceChildren(`${speed} mph `, prov(sp[0], sp[1]), ` ${rev} rpm `, prov(rv[0], rv[1]), ` ${r.preset} preset (${ft} ft) `, prov(sess.ft != null ? 'usbc' : 'assumed', sess.ft != null ? 'tonight' : 'assumed'));
    el.querySelector('#tgAssume').textContent = `Ball offset ${t.offset} and drift ${t.drift || 0} are ${saved.t ? 'yours' : 'assumed (Breakdown Bowling example: 7)'}; set them from a few shots on video. Box: ${box.from === 'model' ? `tonight\u2019s model strike line, ${box.board} @ ${box.ft} ft` : box.from === 'yours' ? 'your target' : 'Rule of 31 (no model line)'}, 3 boards \u00d7 2 ft (Human Kinetics; NBA 8\u201310 at 39\u201341 ft). ${box.r31.text}.`;
    const d = describe(r.a, L);
    el.querySelector('#tgDeckRead').textContent = d.text;
    paintPill(aimPill, () => r.preset, r.a);
    lane.draw({ ball: cat, result: r.a }, { animate });
    deck.draw({ res: r.a, lefty: L, tone: CALL[r.call][1], color: cat.color }, { animate });
    canvas.setAttribute('aria-label', `Lane: feet ${t.feet}, laydown ${r.lay}, eyes ${t.eyes} at the ${t.mode}. ${coach.textContent}`);
    deckCv.setAttribute('aria-label', d.text);
    setPrefs({ target: Object.assign({}, prefs().target, { t, ball: cat.id, tv: 2 }) });
  }
  async function saveMine() {
    if (!r) return;
    const inCat = balls.find(x => x.id === cat.id); if (inCat) app.ball = inCat;
    const keep = { release: S.release, aim: S.aim, pattern: S.pattern, speed: S.speed, rev: S.rev };
    S.release = Math.max(RANGES.release[0], Math.min(RANGES.release[1], r.lay)); S.aim = Math.max(RANGES.aim[0], Math.min(RANGES.aim[1], Math.round(r.aim / RANGES.aim[2]) * RANGES.aim[2])); S.pattern = r.preset; S.speed = speed; S.rev = rev;
    const name = `Target ${t.feet}\u2192${t.eyes}${t.mode === 'dots' ? ' dots' : ''}`;
    const l = await saveLine(name, `feet ${t.feet}, drift ${t.drift}, offset ${t.offset}, eyes ${t.eyes} (${t.mode})`);
    if (!inCat) Object.assign(S, keep);
    setPrefs({ target: Object.assign({}, prefs().target, { t, savedT: t, savedName: name, ball: cat.id, tv: 2 }) });
    toast(l ? `${name} saved for ${cat.name}.` : 'Not saved');
  }
  function backToSaved() {
    const pt = prefs().target || {};
    if (pt.savedT && pt.tv === 2) { t = Object.assign({}, T.DEFAULTS, pt.savedT); update(true); toast(`Back to ${pt.savedName}.`); return; }
    const l = linesForBall(cat.id)[0]; if (!l) { toast('No saved line for this ball yet', { kind: 'bad' }); return; }
    t = T.fromLine(l, t); update(true); toast(`Back to ${l.name}.`);
  }
  function tour(i) {
    tourBox.replaceChildren();
    if (i == null || i >= TOUR.length) { setPrefs({ tgTour: 1 }); helpBtn.focus(); return; }
    const [ti, tx] = TOUR[i];
    tourBox.append(h('div', { class: 'card tg-tour', id: 'tgTour', role: 'dialog', 'aria-labelledby': 'tgTourT', 'aria-modal': 'false' },
      h('p', { class: 'muted small', text: `${i + 1} of ${TOUR.length}` }), h('h2', { class: 'card-title', id: 'tgTourT', text: ti }), h('p', { text: tx }),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', id: 'tgTourNext', onclick: () => tour(i + 1) }, i + 1 < TOUR.length ? 'Next' : 'Got it'),
        h('button', { class: 'btn ghost', id: 'tgTourSkip', onclick: () => tour(null) }, 'Skip'))));
    const nb = tourBox.querySelector('#tgTourNext'); nb && nb.focus({ preventScroll: true });
  }
  let aimSig = JSON.stringify(prefs().aimBox || {});
  const offPrefs = on('prefs', () => { const sg = JSON.stringify(prefs().aimBox || {}); if (sg === aimSig || !r) return; aimSig = sg; update(false); });
  return { el, title: 'Targeting', mounted() { if (!prefs().tgTour && !(query && query.get('find'))) tour(0); update(true); if (query && query.get('find')) runFind(); }, destroy() { offPrefs(); lane.destroy(); deck.destroy(); } };
}
