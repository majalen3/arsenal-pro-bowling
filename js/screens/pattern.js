import { h, toast, skeleton, emptyState } from '../ui.js';
import { loadIndex, loadSteps, SOURCE } from '../patdata.js';
import { OIL_LEN } from '../engine.js';
import { adjust } from '../ctl.js';
import { go } from '../router.js';
import { backBar } from './ball.js';
import { PATTERN_LABEL } from '../labels.js';
export const nearestPreset = ft => Object.entries(OIL_LEN).sort((a, b) => Math.abs(a[1] - ft) - Math.abs(b[1] - ft) || (a[0] === 'house' ? -1 : 1))[0][0];
export function grid(steps, ft) {
  // units per board (1..39) per foot (0..ft), forward + reverse, loads x mics (mics unknown => 1 unit per load)
  const rows = Math.max(1, Math.ceil(ft || 1)), g = Array.from({ length:rows }, () => new Float32Array(40));
  for (const s of steps) { if (!s.loads) continue; const a = Math.min(s.ft0, s.ft1), b = Math.max(s.ft0, s.ft1), w = s.loads * (s.mics || 1);
    for (let y = Math.floor(a); y < Math.min(rows, Math.ceil(b)); y++) for (let x = Math.max(1, s.bl); x <= Math.min(39, s.br); x++) g[y][x] += w; }
  return g;
}
export function render({ params }) {
  const slug = params[0];
  const body = h('div', { class:'stack' }, skeleton(3));
  const el = h('section', { class:'screen detail' }, backBar('Pattern', '#/patterns'), body);
  const hm = h('canvas', { class:'heat', role:'img' }), cb = h('canvas', { class:'cross' , role:'img' });
  let g = null, ft = 0;
  function draw() {
    if (!g) return; const cs = getComputedStyle(document.documentElement), oil = cs.getPropertyValue('--gold').trim() || '#DAAF37', ink = cs.getPropertyValue('--text-2').trim(), lane = cs.getPropertyValue('--surface-2').trim();
    const max = Math.max(1e-6, ...g.map(r => Math.max(...r)));
    { const r = hm.getBoundingClientRect(), d = Math.min(3, devicePixelRatio || 1); hm.width = r.width * d; hm.height = r.height * d; const c = hm.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
      const W = r.width, H = r.height, L = 28, B = 18, cw = (W - L) / 39, rh = (H - B) / 60; c.fillStyle = lane; c.fillRect(L, 0, W - L, H - B);
      g.forEach((row, y) => { for (let x = 1; x <= 39; x++) if (row[x]) { c.globalAlpha = 0.15 + 0.85 * row[x] / max; c.fillStyle = oil; c.fillRect(L + (39 - x) * cw, H - B - (y + 1) * rh, cw + 0.5, rh + 0.5); } });
      c.globalAlpha = 1; c.fillStyle = ink; c.font = '10px system-ui'; c.textAlign = 'right';
      [0, 15, 30, 45, 60].forEach(f => c.fillText(f + '\u2032', L - 4, H - B - f * rh + 3));
      c.textAlign = 'center'; [5, 10, 15, 20, 25, 30, 35].forEach(b => c.fillText(String(b), L + (39 - b + 0.5) * cw, H - 4));
      c.strokeStyle = ink; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(L, H - B - ft * rh); c.lineTo(W, H - B - ft * rh); c.stroke(); c.setLineDash([]); }
    { const r = cb.getBoundingClientRect(), d = Math.min(3, devicePixelRatio || 1); cb.width = r.width * d; cb.height = r.height * d; const c = cb.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
      const W = r.width, H = r.height, L = 28, B = 16, cw = (W - L) / 39, tot = new Float32Array(40); g.forEach(row => row.forEach((v, i) => tot[i] += v)); const m = Math.max(1e-6, ...tot);
      for (let x = 1; x <= 39; x++) { const hh = (H - B - 4) * tot[x] / m; c.fillStyle = oil; c.fillRect(L + (39 - x) * cw + 1, H - B - hh, cw - 2, hh); }
      c.fillStyle = ink; c.font = '10px system-ui'; c.textAlign = 'center'; [5, 10, 15, 20, 25, 30, 35].forEach(b => c.fillText(String(b), L + (39 - b + 0.5) * cw, H - 3)); }
  }
  const ro = new ResizeObserver(draw);
  async function load() {
    try {
      const p = (await loadIndex()).find(x => x.slug === slug);
      if (!p) { body.innerHTML = ''; body.append(emptyState('Pattern not found', 'It may have been renamed in the library.', { label:'All patterns', run:() => go('#/patterns') })); return; }
      const steps = await loadSteps(slug); ft = p.ft || 0; g = grid(steps, ft);
      el.querySelector('.title').textContent = p.name; document.title = p.name + ' \u00b7 Arsenal Pro';
      const pre = nearestPreset(ft);
      hm.setAttribute('aria-label', `Oil graph for ${p.name}: ${ft} feet, boards 1 to 39, brighter means more oil.`);
      cb.setAttribute('aria-label', 'Crossboard oil totals by board.');
      const stat = (k, v) => h('div', { class:'spec' }, h('div', { class:'spec-k', text:k }), h('div', { class:'spec-v num', text:v }));
      body.innerHTML = '';
      body.append(
        h('div', { class:'muted small', text:p.series || '\u00a0' }),
        h('div', { class:'spec-grid four' }, stat('Length', ft + ' ft'), stat('Ratio', p.ratio ? p.ratio + ':1' : '\u2014'), stat('Volume', p.ml ? p.ml + ' ml' : '\u2014'), stat('Rule of 31', ft ? `board ${Math.max(1, Math.round(ft - 31))}` : '\u2014')),
        h('div', { class:'card' }, h('h2', { class:'card-title', text:'Oil graph' }), h('div', { class:'heat-wrap' }, hm), h('p', { class:'muted small', text:'Bowler\u2019s view: foul line at the bottom, board 1 on the right. Brighter = more oil. Dashed line = pattern end.' })),
        h('div', { class:'card' }, h('h2', { class:'card-title', text:'Crossboard' }), h('div', { class:'cross-wrap' }, cb)),
        h('div', { class:'card' }, h('h2', { class:'card-title', text:'Bowl it' }),
          h('p', { text:`The lane model has six presets. Closest by length: ${PATTERN_LABEL[pre]} (${OIL_LEN[pre]} ft). This is an approximation, not this exact pattern.` }),
          h('button', { class:'btn primary', id:'useOnLane', onclick:() => { adjust({ pattern:pre }, { animate:true }); go('#/lane'); toast(`Lane set to ${PATTERN_LABEL[pre]} (nearest to ${p.name})`); } }, `Use ${PATTERN_LABEL[pre]} on lane`)),
        h('details', { class:'card' }, h('summary', { text:`Steps (${steps.length})` }), h('div', { class:'table-wrap' }, h('table', { class:'steps' }, h('thead', {}, h('tr', {}, ...['Dir', 'Boards', 'Loads', 'Feet', 'Mics'].map(t => h('th', { scope:'col', text:t })))),
          h('tbody', {}, ...steps.map(s => h('tr', {}, h('td', { text:s.dir === 'F' ? 'Fwd' : 'Rev' }), h('td', { text:`${s.bl}\u2013${s.br}` }), h('td', { text:String(s.loads) }), h('td', { text:`${s.ft0}\u2013${s.ft1}` }), h('td', { text:s.mics == null ? '\u2014' : String(s.mics) }))))))),
        h('p', { class:'muted small source', text:`Data source: ${SOURCE}.` }));
      ro.observe(hm); ro.observe(cb); draw();
    } catch (e) { body.innerHTML = ''; body.append(emptyState('Could not load pattern', 'Check your connection and try again.', { label:'Retry', run:load })); }
  }
  return { el, title:'Pattern', mounted:load, destroy() { ro.disconnect(); } };
}
