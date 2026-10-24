import { balls, specOK, BAGS } from '../data.js';
import { h } from '../ui.js';
import { setBall } from '../ctl.js';
import { go } from '../router.js';
import { backBar } from './ball.js';
import { proj } from '../hub.js';
import { profile } from '../store.js';
import { bowlerCard, headline } from '../cc/card.js';
// v1 text, kept verbatim
function gapsText() {
  const oils = ['heavy', 'medium', 'light'];
  const cnt = Object.fromEntries(oils.map(o => [o, balls.filter(b => b.oil.includes(o)).length]));
  const thin = oils.slice().sort((a, b) => cnt[a] - cnt[b])[0];
  const tbd = balls.filter(b => !specOK(b)).length;
  return { cnt, thin, tbd };
}
// GAP (f): the v1 static "Assessment" (fixed profile text and uncited x/10 ratings) is removed. In its place, one computed
// line from the Bowler Card (js/cc/card.js) with a link; it says what to do when there is no data yet.
export function render() {
  const g = gapsText();
  const cv = h('canvas', { class:'chart', id:'rgChart', role:'img', 'aria-label':`Chart of core RG (across) against differential (up) for ${balls.filter(specOK).length} balls. Tap a dot to open the ball. The Arsenal list has every ball with its specs.` });
  const maxc = Math.max(g.cnt.heavy, g.cnt.medium, g.cnt.light);
  const bars = h('div', { class:'bars' }, ...['heavy', 'medium', 'light'].map(o => h('div', { class:'bar-row' + (o === g.thin ? ' thin' : '') }, h('span', { class:'bar-k', text:o[0].toUpperCase() + o.slice(1) + ' oil' }), h('span', { class:'bar' }, h('i', { style:{ width:(g.cnt[o] / maxc * 100) + '%' } })), h('b', { class:'num', text:String(g.cnt[o]) }))));
  const el = h('section', { class:'screen detail' }, backBar('Arsenal insights', '#/arsenal'),
    h('div', { class:'card' }, h('h2', { class:'card-title', text:'Coverage by oil' }), bars, h('p', { class:'muted small', text:`Thinnest is ${g.thin}. ${g.tbd ? g.tbd + ' ball' + (g.tbd === 1 ? '' : 's') + ' still spec TBD.' : 'All 22 balls have specs.'}` })),
    h('div', { class:'card' }, h('h2', { class:'card-title', text:'Core map: RG vs differential' }), h('div', { class:'chart-wrap' }, cv), h('p', { class:'muted small', text:'Low RG = revs up earlier. High differential = more flare / hook potential.' })),
    (() => { const P = proj(), hd = P ? headline(bowlerCard(P, { profile:profile() || {} })) : { text:'Score a game on Tonight to see your numbers here.' };
      return h('div', { class:'card', id:'insGame' }, h('h2', { class:'card-title', text:'Your game' }), h('p', { id:'insHead', text:hd.text }), h('a', { class:'btn ghost', href:'#/card' }, 'My Bowler Card')); })(),
    h('div', { class:'card' }, h('h2', { class:'card-title', text:'Bag builder' }), ...BAGS.map(([t, l]) => h('div', { class:'bagset' }, h('h3', { text:t }), h('div', { class:'bag-row' }, ...l.map(([id, r]) => { const b = balls.find(x => x.id === id); return h('button', { class:'sugg-ball', 'data-ball':id, onclick:() => { setBall(b); go('#/lane'); } }, h('span', { class:'swatch', style:{ background:b.color } }), h('span', {}, b.name, h('small', { text:r }))); }))))));
  let pts = [];
  function draw() {
    const r = cv.getBoundingClientRect(); if (!r.width) return; const dpr = Math.min(3, devicePixelRatio || 1);
    const W = r.width, H = r.height; cv.width = W * dpr; cv.height = H * dpr; const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cs = getComputedStyle(document.documentElement), ink = cs.getPropertyValue('--text-2').trim(), grid = cs.getPropertyValue('--line').trim(), txt = cs.getPropertyValue('--text').trim(), acc = cs.getPropertyValue('--accent-ink').trim();
    const L = 44, R = 14, T = 12, B = 34, x0 = 2.45, x1 = 2.62, y0 = 0.01, y1 = 0.06;
    const X = v => L + (v - x0) / (x1 - x0) * (W - L - R), Y = v => H - B - (v - y0) / (y1 - y0) * (H - T - B);
    c.clearRect(0, 0, W, H); c.strokeStyle = grid; c.fillStyle = ink; c.font = '11px system-ui'; c.lineWidth = 1;
    for (let v = 2.45; v <= 2.621; v += 0.02) { c.beginPath(); c.moveTo(X(v), T); c.lineTo(X(v), H - B); c.stroke(); c.textAlign = 'center'; c.fillText(v.toFixed(2), X(v), H - B + 14); }
    for (let v = 0.01; v <= 0.0601; v += 0.01) { c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(W - R, Y(v)); c.stroke(); c.textAlign = 'right'; c.fillText(v.toFixed(2), L - 6, Y(v) + 4); }
    c.fillStyle = acc; c.textAlign = 'center'; c.fillText('RG', (L + W - R) / 2, H - 4); c.save(); c.translate(11, (T + H - B) / 2); c.rotate(-Math.PI / 2); c.fillText('Differential', 0, 0); c.restore();
    const cb = balls.filter(specOK), groups = {}; cb.forEach(b => { const k = b.rg + '/' + b.diff; (groups[k] = groups[k] || []).push(b); });
    pts = cb.map(b => { const gr = groups[b.rg + '/' + b.diff], n = gr.length, i = gr.indexOf(b); let dx = 0, dy = 0; if (n > 1) { const a = i / n * Math.PI * 2 - Math.PI / 2; dx = Math.cos(a) * 12; dy = Math.sin(a) * 12; } return { b, x:X(b.rg) + dx, y:Y(b.diff) + dy }; });
    pts.forEach(p => { c.beginPath(); c.arc(p.x, p.y, 6.5, 0, 7); c.fillStyle = p.b.color; c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1; c.stroke(); });
    if (W > 520) { c.font = '10.5px system-ui'; c.fillStyle = txt; pts.forEach(p => { const rt = p.x > W - 130; c.textAlign = rt ? 'right' : 'left'; c.fillText(p.b.name.replace('Radical ', '').replace(' Pro Line Urethane', ''), p.x + (rt ? -10 : 10), p.y + 3.5); }); }
  }
  cv.addEventListener('click', e => { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let best = null, bd = 1e9; pts.forEach(p => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }); if (best && bd < 24) go(`#/ball/${best.b.id}`); });
  const ro = new ResizeObserver(draw);
  return { el, title:'Insights', mounted() { ro.observe(cv); draw(); }, destroy() { ro.disconnect(); } };
}
