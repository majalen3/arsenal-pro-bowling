// My Bowler Card (BC). Leads with one takeaway + next drill, then ≤6 headline figures league bowlers check
// (average, single-pin spares, first-ball average, carry, strikes, speed·revs). Everything else is behind a tap.
// Numbers come from js/cc/card.js with source, n and dates; measured values replace typed ones only after you confirm.
import { h, toast, confirmSheet } from '../ui.js';
import { ready, proj, addMany } from '../hub.js';
import { on, profile, lsSet, LS, emit, deviceId } from '../store.js';
import { mkEvent } from '../data/events.js';
import { adjust } from '../ctl.js';
import * as C from '../cc/card.js';
import { backBar } from './session.js';
const STYLE = { stroker: 'Stroker', tweener: 'Tweener', cranker: 'Cranker' };
const MATCH = { matched: 'speed and revs matched', 'speed-dominant': 'speed-dominant (more speed than revs)', 'rev-dominant': 'rev-dominant (more revs than speed)' };
const nd = x => [x.nLabel || (x.n != null ? `n=${x.n}` : null), x.dates].filter(Boolean).join(' \u00b7 ');
function spark(points, label) {
  if (points.length < 2) return null;
  const W = 280, H = 44, vs = points.map(p => p.v), lo = Math.min(...vs), hi = Math.max(...vs), rng = hi - lo || 1;
  const xy = points.map((p, i) => [Math.round((i / (points.length - 1)) * (W - 8) + 4), Math.round(H - 4 - ((p.v - lo) / rng) * (H - 8))]);
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'bc-spark'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${label}: ${points.map(p => p.v).join(', ')} (oldest to newest)`);
  const pl = document.createElementNS(ns, 'polyline'); pl.setAttribute('points', xy.map(p => p.join(',')).join(' ')); svg.append(pl);
  const c = document.createElementNS(ns, 'circle'); const last = xy[xy.length - 1]; c.setAttribute('cx', last[0]); c.setAttribute('cy', last[1]); c.setAttribute('r', 4); svg.append(c);
  return svg;
}
// On-device PNG (canvas → blob). Colours come from the theme tokens; nothing leaves the phone unless you share it.
async function sharePng(card, head, figs) {
  const cs = getComputedStyle(document.documentElement), tok = k => cs.getPropertyValue(k).trim();
  const cv = document.createElement('canvas'), W = 1080, H = 1080; cv.width = W; cv.height = H; const g = cv.getContext('2d');
  g.fillStyle = tok('--bg'); g.fillRect(0, 0, W, H);
  g.fillStyle = tok('--accent'); g.font = '800 54px system-ui, sans-serif'; g.fillText('My Bowler Card', 72, 130);
  g.fillStyle = tok('--text-2'); g.font = '500 30px system-ui, sans-serif'; g.fillText(`${card.sessions} sessions \u00b7 ${card.games} games \u00b7 Arsenal Pro`, 72, 180);
  figs.forEach((f, i) => { const x = 72 + (i % 2) * 480, y = 290 + Math.floor(i / 2) * 190;
    g.fillStyle = tok('--text'); g.font = '800 72px system-ui, sans-serif'; g.fillText(`${f.v}${f.unit === '%' ? '%' : ''}`, x, y);
    g.fillStyle = tok('--text-2'); g.font = '600 30px system-ui, sans-serif'; g.fillText(f.label + (f.unit && f.unit !== '%' ? ` (${f.unit})` : ''), x, y + 46); });
  g.fillStyle = tok('--text'); g.font = '600 32px system-ui, sans-serif';
  const words = head.text.split(' '); let line = '', y = 900;
  for (const w of words) { if (g.measureText(line + w).width > W - 144) { g.fillText(line, 72, y); line = ''; y += 44; } line += w + ' '; } g.fillText(line, 72, y);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png')); if (!blob) { toast('Could not make the image', { kind: 'bad' }); return; }
  const file = new File([blob], 'bowler-card.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'My Bowler Card' }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bowler-card.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Saved bowler-card.png');
}
export async function render() {
  await ready();
  const el = h('section', { class: 'screen bc' }), body = h('div', { class: 'stack', id: 'bcBody' });
  el.append(backBar('My Bowler Card', '#/sessions'), body);
  async function useMeasured(k, m, P) {
    const label = k === 'style' ? `${STYLE[m]}` : `${m.v} ${m.unit}`;
    if (!await confirmSheet({ title: `Use ${label}?`, text: k === 'style' ? 'From your measured rev rate (bowling.com ranges). Tonight and Bag Advisor will use it.' : `Measured by LaneTrax (${nd(m)}). Replaces what you typed; Tonight, Targeting and Bag Advisor will use it.`, confirm: 'Use measured', danger: false })) return;
    const pr = Object.assign({}, profile() || {}), evs = [];
    if (k === 'style') { pr.style = m; evs.push(mkEvent('bowler.edited', 'me', { fields: { style: m } }, { deviceId: deviceId(), prov: { kind: 'user', method: 'bowler-card' } })); }
    else {
      const f = { v: m.v, unit: m.unit, prov: { kind: 'device', ref: 'lanetrax', label: `LaneTrax \u00b7 ${m.dates}`, n: m.n } }; if (k === 'speed') f.at = m.src.at || 'unknown';
      pr[k] = m.v; evs.push(mkEvent('bowler.edited', 'me', { fields: { [k]: f } }, { deviceId: deviceId(), prov: { kind: 'device', ref: 'lanetrax' } }));
      for (const x of P.measurements.filter(x => !x.accepted && x.source === 'lanetrax' && x[k])) evs.push(mkEvent('releaseMeasurement.accepted', x.id, { measurementId: x.id, fields: { [k]: f } }, { deviceId: deviceId(), prov: { kind: 'user' } }));
      adjust({ [k]: m.v });
    }
    lsSet(LS.profile, pr); await addMany(evs); emit('profile'); toast(`Now using ${label}.`);
  }
  function draw() {
    const P = proj(), c = C.bowlerCard(P, { profile: profile() || {} }), head = C.headline(c), figs = C.figures(c);
    body.innerHTML = '';
    body.append(h('div', { class: 'card bc-head', id: 'bcHead' }, h('p', { class: 'bc-headline', id: 'bcHeadline', text: head.text }),
      c.takeaways && c.takeaways.leak ? null : c.takeaways ? h('p', { class: 'bc-focus', text: c.takeaways.drill.text }) : null));
    if (figs.length) body.append(h('dl', { class: 'bc-figs bc-grid', id: 'bcFigs' }, ...figs.map(f => h('div', { class: 'bc-fig', 'data-k': f.k },
      h('dt', { text: f.label }), h('dd', {}, h('span', { class: 'bc-v', text: String(f.v) }), f.unit ? h('span', { class: 'bc-u', text: f.unit === '%' ? '%' : ' ' + f.unit }) : null),
      h('dd', { class: 'bc-n', text: [f.src, f.n ? `${f.n} ${f.nUnit || ''}`.trim() : null].filter(Boolean).join(' \u00b7 ') })))));
    const sp = spark(c.avgTrend.length >= 2 ? c.avgTrend : c.trend, c.avgTrend.length >= 2 ? 'Average by session' : 'Strike % by session');
    if (sp) body.append(h('div', { class: 'card bc-trend', id: 'bcTrend' }, h('p', { class: 'small muted', text: c.avgTrend.length >= 2 ? `Average by session, last ${c.avgTrend.length}` : `Strike % by session, last ${c.trend.length}` }), sp));
    // ---- Details (behind taps). Empty sections say exactly what to log or import.
    const sec = (id, title, kids, empty) => h('details', { class: 'card bc-more', id }, h('summary', { text: title }), ...(kids && kids.filter(Boolean).length ? kids.filter(Boolean) : [h('p', { class: 'muted small bc-empty', text: empty })]));
    const row = (k, v, meta) => [h('dt', { text: k }), h('dd', {}, v, meta ? h('span', { class: 'bc-n', text: ' ' + meta }) : null)];
    const rel = [];
    for (const [k, name] of [['speed', 'Speed'], ['rev', 'Rev rate']]) { const x = c[k]; if (!x.typed && !x.measured) continue;
      rel.push(h('dl', { class: 'kv' }, ...(x.typed ? row(name, `${x.typed.v} ${x.typed.unit}`, x.typed.src.label) : []), ...(x.measured ? row('Measured', `${x.measured.v} ${x.measured.unit}`, `LaneTrax${x.measured.src.at ? ' ' + x.measured.src.at : ''} \u00b7 ${nd(x.measured)}`) : [])));
      if (x.measured && (!x.typed || Math.abs(x.typed.v - x.measured.v) >= (k === 'rev' ? 5 : 0.2))) rel.push(x.measured.enough ? h('button', { class: 'btn sm', 'data-use': k, onclick: () => useMeasured(k, x.measured, P) }, `Use measured ${name.toLowerCase()}`)
        : h('p', { class: 'muted small', text: `${x.measured.n} of ${C.MIN_SHOTS} shots measured before it can replace yours (${C.SRC.shots.label}).` })); }
    if (c.style) { rel.push(h('p', { id: 'bcStyle', text: `${c.style.k[0].toUpperCase() + c.style.k.slice(1)} rev range (${c.style.from} ${Math.round((c.rev.measured || c.rev.typed).v)} rpm)${c.style.note ? ', ' + c.style.note : ''}${c.match ? '; ' + MATCH[c.match.k] + ` (balanced at this speed: ${c.match.lo}\u2013${c.match.hi} rpm)` : ''}.` }),
      h('p', { class: 'muted small', text: `${C.SRC.style.label} (${C.SRC.style.how}). ${C.SRC.usbcStyle.label}. ${c.match ? C.SRC.match.label + ' (' + C.SRC.match.how + ').' : ''} No style is better than another.` }));
      if (c.rev.measured && c.rev.measured.enough && c.style.typed !== c.style.k && c.style.typed !== 'two') rel.push(h('button', { class: 'btn sm', 'data-use': 'style', onclick: () => useMeasured('style', c.style.k, P) }, `Use ${c.style.k}`)); }
    const tr = c.release; const trk = [['Tilt', tr.tilt], ['Rotation', tr.rotation], ['PAP', tr.pap]].filter(([, v]) => v);
    if (trk.length) rel.push(h('dl', { class: 'kv' }, ...trk.flatMap(([k, v]) => row(k, `${v.v}${v.unit === '°' ? '\u00b0' : ' ' + (v.unit || '')}`, 'you reported'))));
    else rel.push(h('p', { class: 'muted small', text: 'Tilt, rotation and PAP: type them in More \u203a Bowler profile. LaneTrax does not measure them.' }));
    const cons = c.consistency, lvRow = (k, x, what) => x ? row(k, `Level ${x.level} of 5`, `${what} ${x.v} ${x.unit} \u00b7 ${x.n} shots \u00b7 ${x.date}`) : [];
    const spare = [];
    if (c.spare.single || c.spare.multi) spare.push(h('dl', { class: 'kv' }, ...(c.spare.single ? row('Single pin', `${c.spare.single.made} of ${c.spare.single.n} (${c.spare.single.v}%)`, `your games \u00b7 ${c.spare.single.dates || ''}`) : []), ...(c.spare.multi ? row('Multi pin', `${c.spare.multi.made} of ${c.spare.multi.n} (${c.spare.multi.v}%)`, 'your games') : [])));
    if (c.leaves.length) spare.push(h('p', { class: 'small', text: 'By leave: ' + c.leaves.slice(0, 8).map(l => `${l.leave} ${l.made}/${l.n}`).join(', ') }));
    if (c.spare.ltx) spare.push(h('dl', { class: 'kv' }, ...row('LaneTrax spares', `${c.spare.ltx.made} of ${c.spare.ltx.n} (${c.spare.ltx.v}%)`, c.spare.ltx.dates)));
    const acc = [], A = c.accuracy, Tn = c.tend;
    if (A.arrows) acc.push(h('dl', { class: 'kv' }, ...row('At the arrows', `${A.arrows.v} boards off target`, `LaneTrax \u00b7 ${nd(A.arrows)}`)));
    if (A.pocket) acc.push(h('dl', { class: 'kv' }, ...row('Pocket hits', `${A.pocket.v}%`, `${A.pocket.n} first balls you tagged`)));
    if (Tn.breakpointBoard) acc.push(h('dl', { class: 'kv' }, ...row('Breakpoint', `board ${Tn.breakpointBoard.v}${Tn.breakpointDistance ? ' at ' + Tn.breakpointDistance.v + ' ft' : ''}`, nd(Tn.breakpointBoard)),
      ...(Tn.entryBoard ? row('Pocket entry', `board ${Tn.entryBoard.v}`, nd(Tn.entryBoard)) : []), ...(Tn.impactAngle ? row('Entry angle', `${Tn.impactAngle.v}\u00b0`, 'measured by LaneTrax (real degrees)') : [])));
    const tk = c.takeaways;
    body.append(
      tk ? sec('bcTake', 'Coach notes', [h('ul', { class: 'plain' }, h('li', {}, h('b', { text: 'Strength: ' }), tk.strength.text), tk.leak ? h('li', {}, h('b', { text: 'Leak: ' }), tk.leak.text) : null, h('li', {}, h('b', { text: 'Next drill: ' }), tk.drill.text)), h('p', { class: 'muted small', text: `Levels: ${C.SRC.levels.label} (${C.SRC.levels.how}). Drill: ${tk.drill.rule}.` })], '') : null,
      sec('bcSpares', 'Spares', spare, 'Score a game on Tonight (tap the pins left standing) to see single- and multi-pin spares.'),
      sec('bcRelease', 'Release: speed, revs, style', rel.length ? rel : null, 'Import a LaneTrax report (More \u203a LaneTrax report) or type speed and revs in More \u203a Bowler profile.'),
      sec('bcCons', 'Consistency (LaneTrax levels)', cons ? [h('dl', { class: 'kv' }, ...lvRow('Speed', cons.speed, 'avg impact'), ...lvRow('Revs', cons.rpm, 'avg'), ...lvRow('Arrows', cons.arrows, 'avg off'), ...lvRow('Spares', cons.conversion, 'conversion')), h('p', { class: 'muted small', text: 'LaneTrax levels speed and revs by how much they vary shot to shot (5 = tightest).' })] : null, 'Import a LaneTrax report to see speed, rev and accuracy consistency.'),
      sec('bcAcc', 'Accuracy and breakpoint', acc, 'Import a LaneTrax report for arrows, breakpoint and entry. Tag "First ball hit" on Tonight for pocket %.'),
      sec('bcSrc', 'Sources and thresholds', [h('ul', { class: 'plain small bc-src' }, ...Object.values(C.SRC).map(s => h('li', {}, s.url ? h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.label) : s.label, ` (${s.how})`)))], ''));
    body.append(h('div', { class: 'btn-grid' }, h('a', { class: 'btn ghost', href: '#/sessions', id: 'bcToSessions' }, 'Sessions'),
      figs.length ? h('button', { class: 'btn ghost', id: 'bcShare', onclick: () => sharePng(c, head, figs) }, 'Share as image') : h('a', { class: 'btn ghost', href: '#/import?kind=lanetrax', id: 'bcImport' }, 'Import LaneTrax')));
  }
  function drawKeep() { const open = new Set([...body.querySelectorAll('details[open]')].map(d => d.id)); draw(); for (const id of open) { const d = body.querySelector('#' + id); if (d) d.open = true; } }
  draw();
  const offs = [on('data', drawKeep), on('profile', drawKeep)];
  return { el, title: 'My Bowler Card', destroy() { offs.forEach(f => f()); } };
}
