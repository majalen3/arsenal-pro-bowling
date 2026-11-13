// #/strike — Find my strike line, the 30-second version (owner t124u/t125u/t127u). One job: show where to stand and aim.
// A lane picture whose drawn line ends at the pocket, four big tiles (stand, target, breakpoint, ball) and an "estimate" tag;
// one primary button (Use this line). Everything else (why, alternative line, inputs, model limits, hand edit) is behind Details.
// Values come straight from cc/strikeline.js find() (the same search Targeting runs); nothing here changes simulatePath.
// v76 (owner t140u): ONE screen for "where do I stand". A Standard | Forgiving line toggle (Forgiving = the stand/aim with the most simulated
// shots still reaching the pocket for your miss size, plus the miss room each side), a miss-size setting in Details, and a visible Adjust
// button to the Lane view (the Lane view and Targeting stay as the optional what-if tools).
import * as PERF from '../perf.js';
import { h, toast } from '../ui.js';
import { go } from '../router.js';
import { ready, proj } from '../hub.js';
import { app, prefs, setPrefs } from '../store.js';
import { START } from '../engine.js';
import { modelOK as specOK } from '../data.js';
import { catOf, ballFor, ballKey } from '../cc/cats.js';
import { HOUSE_ASSUMED } from '../cc/rank.js';
import { lineFor, keptLine, keepLine } from '../cc/line.js';
import { openNight } from '../cc/night.js';
import * as T from '../cc/target.js';
import * as F from '../cc/strikeline.js';
import * as HAND from '../cc/hand.js';
import { fmtHalf } from '../labels.js';

const num = f => { const v = f && typeof f === 'object' ? f.v : f; return v == null || isNaN(+v) ? null : +v; };
export const POCKET_BOARD = 17.5;   // 1-3 pocket (right hand) / 1-2 (left hand), boards counted from the bowler's own gutter
// Lane picture geometry: 39 boards across, foul line at the bottom, head pin at 60 ft. Boards count from the right gutter for a
// right-hander and from the left for a left-hander, so the picture mirrors with the hand.
export function lanePoints(c, { lefty = false, W = 117, H = 300 } = {}) {
  const x = b => lefty ? (b - 0.5) * W / 39 : W - (b - 0.5) * W / 39, y = ft => H - ft / 60 * H;
  const pts = [[x(c.lay), y(0), 'stand'], [x(c.arrows), y(15), 'target']];
  if (c.bp != null && c.bpFt != null) pts.push([x(c.bp), y(c.bpFt), 'breakpoint']);
  pts.push([x(POCKET_BOARD), y(60), 'pocket']);
  return pts;
}
function diagram(c, lefty, miss = null) {
  const W = 117, H = 300, pts = lanePoints(c, { lefty, W, H }), ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg'), el = (n, a) => { const e = document.createElementNS(ns, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  svg.setAttribute('viewBox', `-4 -10 ${W + 8} ${H + 14}`); svg.setAttribute('class', 'sl-svg'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Lane picture: stand board ${c.lay}, target ${c.arrows} at the arrows${c.bp != null ? `, breakpoint ${c.bp} at ${c.bpFt} ft` : ''}, ending at the pocket. Model estimate.`);
  svg.append(el('rect', { x: 0, y: 0, width: W, height: H, rx: 4, class: 'sl-lane' }));
  for (const a of [5, 10, 15, 20, 25, 30, 35]) { const ax = lefty ? (a - 0.5) * W / 39 : W - (a - 0.5) * W / 39; svg.append(el('path', { d: `M${ax - 3} ${H - 15 / 60 * H + 4}l3 -7l3 7z`, class: 'sl-arrow' })); }
  [[17.5, 60], [15, 58], [20, 58]].forEach(([b, ft]) => svg.append(el('circle', { cx: lefty ? (b - 0.5) * W / 39 : W - (b - 0.5) * W / 39, cy: H - ft / 60 * H, r: 3, class: 'sl-pin' })));
  if (miss != null && c.arrows != null) { const ax = b => lefty ? (b - 0.5) * W / 39 : W - (b - 0.5) * W / 39, x0 = Math.min(ax(c.arrows - miss), ax(c.arrows + miss)), w = Math.abs(ax(c.arrows - miss) - ax(c.arrows + miss));
    svg.append(el('rect', { x: x0.toFixed(1), y: (H - 15 / 60 * H - 9).toFixed(1), width: w.toFixed(1), height: 18, rx: 3, class: 'sl-miss', 'aria-hidden': 'true', 'data-miss': String(miss) })); }
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  svg.append(el('path', { d, class: 'sl-line' }));
  pts.forEach(p => svg.append(el('circle', { cx: p[0], cy: p[1], r: p[2] === 'pocket' ? 5 : 4, class: 'sl-dot sl-' + p[2], 'data-pt': p[2] })));
  return svg;
}

export async function render({ query } = {}) {
  await ready();
  const P = proj(), b = P.bowler || {}, lefty = HAND.isLefty();
  const sess = (P.sessions || {})[openNight(P) || ''] || {}, ft = sess.ft != null ? +sess.ft : HOUSE_ASSUMED.ft;
  const speed = num(b.speed) || START.speed, rev = num(b.rev) || START.rev;
  const owned = Object.values(P.owned || {}).filter(o => !['proShop', 'retired'].includes(o.status)).map(o => ballFor(o.id)).filter(Boolean);
  const list = [...new Map([...owned, app.ball].filter(Boolean).map(c => [ballKey(c), c])).values()];
  let cat = (query && query.get('ball') && ballFor(query.get('ball'))) || list.find(specOK) || app.ball;
  const pt = (prefs().target || {}), offset = +pt.t?.offset || T.DEFAULTS.offset, drift = +pt.t?.drift || 0;
  const sel = h('select', { id: 'slBall', 'aria-label': 'Ball' }, ...list.map(c => h('option', { value: ballKey(c), text: c.name })));
  sel.value = ballKey(cat); sel.onchange = () => { cat = ballFor(sel.value) || cat; run(); };
  const out = h('div', { id: 'slOut', 'aria-live': 'polite' }, h('p', { class: 'muted', text: 'Finding your line\u2026' }));
  const el = h('section', { class: 'screen strike-screen', id: 'strike' },
    h('header', { class: 'appbar' }, h('a', { class: 'btn ghost sm', href: '#/tonight', 'aria-label': 'Back to Strike line' }, '\u2039 Back'), h('h1', { class: 'title', text: 'Your strike line' })),
    h('div', { class: 'sl-top' }, sel), out);
  const MISS_AUTO = 'auto', fmtMiss = v => v === 1.5 ? '1\u00bd' : String(v);
  let mode = prefs().slMode === 'forgiving' ? 'forgiving' : 'standard', miss = Number.isFinite(+prefs().slMiss) && prefs().slMiss ? +prefs().slMiss : null;
  let detailsOpen = false;   // keep Details open while the miss size or the toggle redraws the answer
  const cache = new Map();   // Forgiving sweep per ball + miss size + conditions: tap the toggle back and forth without recomputing
  const half = n => n === 0 ? '0' : n === 0.5 ? '\u00bd' : String(n).replace('.5', '\u00bd');
  const toggle = h('div', { class: 'seg wide sl-mode', id: 'slMode', role: 'radiogroup', 'aria-label': 'Line type' },
    ...[['standard', 'Standard'], ['forgiving', 'Forgiving line']].map(([k, label]) => h('button', { type: 'button', id: k === 'standard' ? 'slStd' : 'slForg', role: 'radio', class: 'seg-opt', 'aria-checked': String(mode === k), text: label,
      onclick: () => { mode = k; setPrefs({ slMode: k }); for (const b of toggle.children) b.setAttribute('aria-checked', String(b.id === (k === 'standard' ? 'slStd' : 'slForg'))); run(); } })));
  function run() {
    if (!specOK(cat)) { out.replaceChildren(h('p', { class: 'coach', id: 'slNone', text: `${cat.name}: specs not published, so no line to draw. Pick another ball.` })); return; }
    out.replaceChildren(h('p', { class: 'muted', text: 'Finding your line\u2026' }));
    setTimeout(() => {
      const L = lineFor(cat, { speed, rev, ft: sess.ft != null ? +sess.ft : null }), st = L && L.ml && !L.ml.none ? L.ml : null, start = st ? { lay: st.feet, arr: st.target } : null;
      const sd = F.withMiss(F.spreadFrom(P), miss);
      const endFind = PERF.span('strike.find'), res = F.find(cat, { speed, rev, ft, spread: sd, start }); endFind();
      if (res.none) { out.replaceChildren(h('p', { class: 'coach', id: 'slNone', text: res.reason })); return; }
      const w = F.say(res, { offset, drift, mode: 'arrows', ball: cat.name, kept: !!keptLine(ballKey(cat)) });
      let c = res.best, fg = null;
      if (mode === 'forgiving') {
        const key = [ballKey(cat), miss, ft, speed, rev, start && start.lay, start && start.arr].join('|');
        if (!cache.has(key)) { const endF = PERF.span('strike.forgiving'); cache.set(key, F.forgive(cat, { speed, rev, ft, spread: F.spreadFrom(P), miss, start })); endF(); PERF.count('cache.forgiving.miss'); } else PERF.count('cache.forgiving.hit');
        fg = cache.get(key); if (!fg.none) c = fg.forgiving;
      }
      const wc = F.say(Object.assign({}, res, { best: c, alt: null }), { offset, drift, mode: 'arrows', ball: cat.name }), feet = Math.round(c.lay + offset - drift);
      const pts = lanePoints(c, { lefty }), end = pts[pts.length - 1], pk = lanePoints({ lay: 0, arrows: 0, bp: null, bpFt: null }, { lefty }).pop();
      const svg = diagram(c, lefty, fg && !fg.none ? sd.arrows.v : null), wrap = h('div', { class: 'sl-pic', id: 'slDiagram', 'data-ends-at-pocket': String(Math.abs(end[0] - pk[0]) < 0.01 && Math.abs(end[1] - pk[1]) < 0.01), 'data-mode': mode }); wrap.append(svg);
      const tile = (k, label, big, small) => h('div', { class: 'sl-tile', 'data-tile': k }, h('span', { class: 'sl-k', text: label }), h('b', { class: 'sl-v num', text: big }), small ? h('span', { class: 'sl-s', text: small }) : null);
      const mr = F.missRoom(c, lefty), roomTxt = mr.left === 0 && mr.right === 0 ? 'the pocket is about a board wide, so any miss at the arrows leaves it' : `still in the pocket window if you miss ${half(mr.left)} left or ${half(mr.right)} right at the arrows`;
      const stat = mode === 'forgiving' && fg && !fg.none
        ? [h('span', { class: 'prov', 'data-prov': 'model', text: 'estimate' }), ` Pocket ${c.pocket}% (Standard ${fg.standard.pocket}%) \u00b7 room ${half(mr.left)} left, ${half(mr.right)} right${fg.same ? ' \u00b7 already your most forgiving' : ''}`]
        : [h('span', { class: 'prov', 'data-prov': 'model', text: 'estimate' }), ` Pocket ${c.pocket}% (model) \u00b7 ends at the ${lefty ? '1-2' : '1-3'} pocket`];
      out.replaceChildren(
        h('div', { class: 'sl-grid' }, wrap, h('div', { class: 'sl-tiles', id: 'slTiles' },
          tile('stand', 'Stand', String(feet), 'board, feet'),
          tile('target', 'Target', fmtHalf(c.arrows), 'at the arrows'),
          tile('breakpoint', 'Breakpoint', c.bp != null ? String(Math.round(c.bp)) : '\u2014', c.bpFt != null ? `board at ${c.bpFt} ft` : 'not found'),
          tile('ball', 'Ball', cat.name, null))),
        toggle,
        h('p', { class: 'sl-tag small', id: 'slTag', 'data-room': mode === 'forgiving' ? `${mr.left}/${mr.right}` : '' }, ...stat),
        h('div', { class: 'sl-actions' },
          h('button', { class: 'btn primary', id: 'slUse', onclick: () => { keepLine(ballKey(cat), { lay: c.lay, eyes: c.arrows }); toast(`Kept: stand ${feet}, aim ${fmtHalf(c.arrows)}.`); go('#/tonight'); } }, `Use this line`),
          h('a', { class: 'btn ghost', id: 'slAdjust', href: '#/lane' }, 'Adjust \u203a')),
        h('details', { class: 'card tn-more', id: 'slDetails', open: detailsOpen, ontoggle: e => { detailsOpen = e.target.open; } }, h('summary', { text: 'Details' }),
          h('label', { class: 'small', for: 'slMissSel' }, 'Miss size at the arrows (1 SD) ', h('select', { id: 'slMissSel', onchange: e => { miss = e.target.value === MISS_AUTO ? null : +e.target.value; setPrefs({ slMiss: miss }); run(); } },
            h('option', { value: MISS_AUTO, text: `Auto (${res.spread.arrows.src === 'device' ? 'your LaneTrax' : 'assumed'} \u00b1${fmtMiss(res.spread.arrows.v)})` }), ...F.MISS_CHOICES.map(v => h('option', { value: String(v), text: `\u00b1${fmtMiss(v)} boards` })))),
          h('ul', { class: 'small' }, mode === 'forgiving' && fg && !fg.none ? h('li', { id: 'slRoom', text: `Model: ${roomTxt}. Room is measured at the arrows in half boards, and the pocket window is entry boards 17\u201318, so it is small by nature.` }) : null, h('li', { id: 'slWhy', text: w.why }), mode === 'standard' && w.alt ? h('li', { id: 'slAlt', text: w.alt }) : null, h('li', { text: w.window }),
            h('li', { text: `Release ${speed} mph, ${rev} rpm; ${ft} ft ${sess.ft != null ? 'tonight' : '(assumed house shot)'}; searched ${res.tried} lines, ${res.n} simulated shots each.${mode === 'forgiving' && fg && !fg.none ? ` Forgiving line: every stand board, ${fg.n} shots each, same random misses as Standard.` : ''}` }),
            h('li', { text: 'Estimates from the model, not a measurement. No strike percentage is shown: there is no cited carry curve for it. The drawn line joins the model\u2019s stand, target and breakpoint and is finished to the pocket; the curve shape is a sketch.' })),
          h('a', { class: 'btn ghost block', id: 'slByHand', href: '#/target' + (query && query.get('ball') ? '?ball=' + encodeURIComponent(query.get('ball')) : '') }, 'Move it by hand \u203a')));
      const ms = out.querySelector('#slMissSel'); if (ms) ms.value = miss == null ? MISS_AUTO : String(miss);
    }, 20);
  }
  return { el, title: 'Your strike line', mounted() { run(); } };
}
