// Pin-deck inset: a zoomed, true-scale view of the last ~4 ft of the lane drawn from analyze() output
// (entry board + entry angle at the head-pin row). Geometry in inches, head pin centre = (0,0),
// +x toward board 1 (right-hander's right), +y away from the bowler. Real USBC spacing: 12 in between
// pin centres, rows 10.392 in apart; board = 41.5/39 in; pin max dia 4.766 in; ball dia 8.5 in.
// Past first contact the ball and pins follow pinsim.js: an approximate 2-D impulse model (see that file
// and docs/DEFLECTION.md for sources and assumptions). The straight no-deflection line is kept, faint, for comparison.
import { reduced } from './ui.js';
import { simulate } from './pinsim.js';
export const BOARD_IN = 41.5 / 39, PIN_R = 4.766 / 2, BALL_R = 8.5 / 2, ROW = 12 * Math.sin(Math.PI / 3);
export const PINS = [[1,0,0],[2,-6,ROW],[3,6,ROW],[4,-12,2*ROW],[5,0,2*ROW],[6,12,2*ROW],[7,-18,3*ROW],[8,-6,3*ROW],[9,6,3*ROW],[10,18,3*ROW]]
  .map(([n, x, y]) => ({ n, x, y }));
const xOfBoard = b => (20 - b) * BOARD_IN;          // board 20 = head pin; board 17.5 = +2.66 in (1-3 pocket)
// ball centre path: through entry board at y=0, heading toward higher boards at `angle` degrees
export function path(entryBoard, angle) {
  const a = (angle || 0) * Math.PI / 180; return { x0:xOfBoard(entryBoard), dx:-Math.sin(a), dy:Math.cos(a) };
}
// first contact of the ball with each pin along the projected path (t = travel in inches from y=0)
export function contacts(entryBoard, angle) {
  if (entryBoard == null) return [];
  const p = path(entryBoard, angle), R = BALL_R + PIN_R, out = [];
  for (const pin of PINS) {
    const fx = p.x0 - pin.x, fy = -pin.y, b = fx * p.dx + fy * p.dy, c = fx * fx + fy * fy - R * R, disc = b * b - c;
    const tc = -b, miss = Math.sqrt(Math.max(0, fx * fx + fy * fy - tc * tc));    // closest approach of centres
    if (disc < 0) { out.push({ pin, hit:false, miss }); continue; }
    const t = -b - Math.sqrt(disc), bx = p.x0 + t * p.dx, by = t * p.dy;
    out.push({ pin, hit:true, t, ball:{ x:bx, y:by }, at:{ x:pin.x + (bx - pin.x) * PIN_R / R, y:pin.y + (by - pin.y) * PIN_R / R }, miss });
  }
  return out;
}
// left-handers: the model lane is mirrored, so pin numbers mirror too (model 3 pin = lefty's 2 pin)
export const MIRROR = { 1:1, 2:3, 3:2, 4:6, 5:5, 6:4, 7:10, 8:9, 9:8, 10:7 };
// plain-language read for the readout and the canvas text alternative. Only first contacts (head pin +
// pocket pin) come from geometry; pin action and ball deflection come from the labelled pinsim.js model.
export function describe(res, lefty) {
  const pocket = lefty ? '1-2' : '1-3', pp = lefty ? 2 : 3;
  if (res.entryBoard == null || res.call === 'GUTTER') return { pocket, text:'The ball does not reach the pins on this line.', five:'', contact:'' };
  const cs = contacts(res.entryBoard, res.angle), by = n => cs.find(c => c.pin.n === n);
  const off = res.entryBoard - 17.5, side = Math.abs(off) <= 0.25 ? 'right in the pocket' : off > 0 ? `${Math.abs(off).toFixed(1)} boards high` : `${Math.abs(off).toFixed(1)} boards light`;
  const ang = res.angle == null ? '' : `${res.angle.toFixed(1)}° model` + (res.angle < 4 ? ' (flatter than 4–6°)' : res.angle > 6 ? ' (steeper than 4–6°)' : ' (inside 4–6°)');
  const one = by(1), three = by(3);
  // where on the head pin: angle of the contact point from the pin's front (0 = full on the nose)
  const phi = one && one.hit ? Math.abs(Math.atan2(one.at.x, -one.at.y) * 180 / Math.PI) : null;
  const onOne = phi == null ? '' : phi < 10 ? 'nearly full on the nose' : phi < 35 ? `in the pocket (${Math.round(phi)}° off the nose)` : `thin (${Math.round(phi)}° off the nose)`;
  let contact;
  if (one && one.hit && three && three.hit) contact = three.t < one.t - 0.5 ? `Meets the ${pp} pin first, then clips the 1 pin thin.` : `Meets the 1 pin ${onOne}, then the ${pp} pin.`;
  else if (one && one.hit) contact = `Meets the 1 pin ${onOne} and misses the ${pp} pin.`;
  else if (three && three.hit) contact = `Misses the head pin and only meets the ${pp} pin.`;
  else contact = 'Misses the pocket pins.';
  const sim = simulate(res.entryBoard, res.angle), nm = n => lefty ? MIRROR[n] : n;
  const left = PINS.map(q => q.n).filter(n => !sim.down.includes(n)).map(nm).sort((a, b) => a - b);
  const pins = left.length === 0 ? 'all 10 pins down' : left.length === 10 ? 'no pins down' : `leaves the ${left.join('-')}`;
  const dv = sim.ball.deflect, dd = Math.abs(dv) < 0.5 ? 'holds its line' : `deflects ${Math.abs(dv).toFixed(0)}° ${(dv < 0) !== !!lefty ? 'right' : 'left'}`;
  const five = `Model: the ball ${dd} through the pins; ${pins}.`;
  return { pocket, side, ang, contact, five, phi, sim, left, pins, text:`Model estimate: Enters board ${res.entryBoard.toFixed(1)}, ${side}, at ${ang}. ${contact} ${five}` };
}
export function createDeck(canvas) {
  const g = canvas.getContext('2d'); let W = 0, H = 0, dpr = 1, last = null, anim = 0;
  const Y0 = -13, Y1 = 3 * ROW + 3.5, X0 = -21, X1 = 21;     // inches shown
  const ro = new ResizeObserver(() => { if (size() && last) paint(last, 1); }); ro.observe(canvas);
  function size() { const r = canvas.getBoundingClientRect(); if (!r.width) return false; dpr = Math.min(3, devicePixelRatio || 1); W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); return true; }
  const css = n => getComputedStyle(canvas).getPropertyValue(n).trim();
  function paint({ res, lefty, tone }, prog) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const s = Math.min(W / (X1 - X0), H / (Y1 - Y0)), ox = W / 2, oy = H - (0 - Y0) * s - (H - (Y1 - Y0) * s) / 2;
    const m = lefty ? -1 : 1, P = (x, y) => [ox + m * x * s, oy - y * s];
    const toneC = css('--deck-' + tone) || '#DAAF37', gold = css('--gold') || '#DAAF37';
    // deck surface (forest), boards, centre arrow line
    const [lx] = P(xOfBoard(39.5) * m, 0), [rx] = P(xOfBoard(0.5) * m, 0);
    const gr = g.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, css('--lane-bottom') || '#165C3E'); gr.addColorStop(1, css('--lane-top') || '#0D3B28');
    g.fillStyle = css('--lane-gutter') || '#050706'; g.fillRect(0, 0, W, H);
    g.fillStyle = gr; g.fillRect(Math.min(lx, rx), 0, Math.abs(rx - lx), H);
    g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1;
    for (let b = 1; b <= 39; b++) { const [x] = P(xOfBoard(b - 0.5), 0); g.beginPath(); g.moveTo(Math.round(x) + .5, 0); g.lineTo(Math.round(x) + .5, H); g.stroke(); }
    // entry-board target line (17.5) and angle window wedge (4-6 deg) into the pocket
    const pk = xOfBoard(17.5);
    const wedge = (a0, a1) => { g.beginPath(); const [px, py] = P(pk, 0); g.moveTo(px, py); [a0, a1].forEach(a => { const r = a * Math.PI / 180, L = -Y0 + 2; const [x, y] = P(pk + Math.sin(r) * L / Math.cos(r), Y0 - 2); g.lineTo(x, y); }); g.closePath(); };
    g.fillStyle = 'rgba(218,175,55,.18)'; wedge(4, 6); g.fill(); g.strokeStyle = 'rgba(218,175,55,.55)'; g.lineWidth = 1; g.stroke();
    g.setLineDash([3, 4]); g.strokeStyle = 'rgba(255,255,255,.35)'; { const [x, y0] = P(pk, Y0); g.beginPath(); g.moveTo(x, y0 + 2); g.lineTo(x, P(0, 0)[1]); g.stroke(); } g.setLineDash([]);
    // pocket highlight between head pin and 3 pin (1-2 when mirrored)
    { const [ax, ay] = P(0, 0), [bx, by] = P(6, ROW); g.save(); g.strokeStyle = 'rgba(218,175,55,.9)'; g.lineWidth = Math.max(6, BALL_R * s * 1.1); g.lineCap = 'round'; g.globalAlpha = .35; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.restore(); }
    // ball path: approach (solid) to first contact, then the model's deflected path; the straight
    // no-deflection line stays as a faint dashed reference. Animation: approach 0-0.45, pin action 0.45-1.
    const cs = res.entryBoard == null ? [] : contacts(res.entryBoard, res.angle);
    const sim = res.entryBoard == null ? null : simulate(res.entryBoard, res.angle);
    const pa = Math.min(1, prog / 0.45), pd = prog <= 0.45 ? 0 : (prog - 0.45) / 0.55;
    const kLast = sim && sim.first != null ? Math.max(sim.first + 300, ...sim.pins.filter(q => q.down).map(q => q.order + 90)) : 0;
    const kNow = sim && sim.first != null ? sim.first + pd * (kLast - sim.first) : Infinity;
    const upTo = tr => { const o = []; for (const q of tr) { if (q[2] > kNow) break; o.push(q); } return o; };
    if (res.entryBoard != null) {
      const p = path(res.entryBoard, res.angle), tA = Y0 / p.dy, tB = (Y1 + 4) / p.dy, tEnd = cs.filter(c => c.hit).reduce((m, c) => Math.min(m, c.t), 0), tNow = tA + (tEnd - tA) * pa;
      const pt = t => P(p.x0 + t * p.dx, t * p.dy);
      g.lineCap = 'round'; g.strokeStyle = toneC; g.globalAlpha = .28; g.lineWidth = BALL_R * 2 * s; g.beginPath(); g.moveTo(...pt(tA)); g.lineTo(...pt(Math.min(tNow, tEnd))); g.stroke(); g.globalAlpha = 1;
      g.lineWidth = 2.5; g.beginPath(); g.moveTo(...pt(tA)); g.lineTo(...pt(Math.min(tNow, tEnd))); g.stroke();
      if (prog >= 1) { g.setLineDash([3, 5]); g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(...pt(tEnd)); g.lineTo(...pt(tB)); g.stroke(); g.setLineDash([]); }
      let bxy = pt(Math.min(tNow, tEnd));
      if (sim && pd > 0) {        // deflected ball path from the model
        const tr = upTo(sim.ball.tr.filter(q => q[2] >= sim.first));
        if (tr.length) { g.strokeStyle = toneC; g.lineWidth = 2.5; g.beginPath(); g.moveTo(...bxy); for (const q of tr) g.lineTo(...P(q[0], q[1])); g.stroke(); bxy = P(...tr[tr.length - 1]); }
      }
      if (bxy[1] > -BALL_R * s) { g.beginPath(); g.arc(bxy[0], bxy[1], BALL_R * s, 0, 7); g.fillStyle = (last && last.color) || '#DAAF37'; g.globalAlpha = .6; g.fill(); g.globalAlpha = 1; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); }
    }
    // pins: true spots; a knocked pin leaves a faint ring on its spot and is drawn along its model path
    // (fading); standing pins stay solid white. Contact dots mark the first-contact geometry on 1/3/5.
    const hit = new Map(cs.filter(c => c.hit && [1, 3, 5].includes(c.pin.n)).map(c => [c.pin.n, c]));
    const fs = Math.max(9, Math.min(14, PIN_R * s * 0.95)), r = PIN_R * s;
    const pinAt = (pin, x, y, alpha, ring) => {
      g.globalAlpha = alpha; g.beginPath(); g.arc(x, y + 1.5, r, 0, 7); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill();
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = '#F8FAFC'; g.fill(); g.lineWidth = ring ? 2.5 : 1; g.strokeStyle = ring ? toneC : 'rgba(0,0,0,.45)'; g.stroke();
      g.fillStyle = '#0B0F0D'; g.font = `700 ${fs}px system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(lefty ? MIRROR[pin.n] : pin.n), x, y + .5); g.globalAlpha = 1;
    };
    for (const pin of PINS) {
      const sp = sim && sim.pins.find(q => q.n === pin.n), [x0, y0] = P(pin.x, pin.y);
      const tr = sp && sp.down ? upTo(sp.tr) : [], moved = tr.length > 1;
      if (!moved) { pinAt(pin, x0, y0, 1, prog >= 1 && hit.has(pin.n)); continue; }
      g.setLineDash([2, 3]); g.beginPath(); g.arc(x0, y0, r, 0, 7); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; g.stroke(); g.setLineDash([]);
      g.strokeStyle = 'rgba(248,250,252,.45)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y0); for (const q of tr) g.lineTo(...P(q[0], q[1])); g.stroke();
      const q = tr[tr.length - 1], [x, y] = P(q[0], q[1]), age = Math.min(1, (kNow - sp.order) / 160);
      if (x > -r && x < W + r && y > -r && y < H + r) pinAt(pin, x, y, Math.max(.25, .85 - age * .6), false);
      if (prog >= 1) { g.font = `800 ${Math.round(fs * .9)}px system-ui,sans-serif`; g.fillStyle = 'rgba(255,255,255,.55)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('×', x0, y0 + .5); }
    }
    if (prog >= 1) for (const n of [1, 3, 5]) { const c = hit.get(n); if (!c) continue; const [x, y] = P(c.at.x, c.at.y); g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fillStyle = '#ff6b35'; g.fill(); g.strokeStyle = '#0B0F0D'; g.lineWidth = 1.2; g.stroke(); }
    // labels
    g.font = '600 10px system-ui,sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)'; g.textBaseline = 'alphabetic';
    { const [x] = P(pk, Y0); g.textAlign = lefty ? 'left' : 'right'; g.fillText('board 17.5', x + (lefty ? 5 : -5), H - 5); }
    { const [x, y] = P(pk + 4, Y0 + 3); g.textAlign = lefty ? 'right' : 'left'; g.fillStyle = 'rgba(218,175,55,.95)'; g.fillText('4–6°', x + (lefty ? -4 : 4), Math.min(H - 16, y)); }
    { const [x, y] = P(8, ROW * .42), t = lefty ? '1-2 pocket' : '1-3 pocket'; g.font = '700 10px system-ui,sans-serif'; const tw = g.measureText(t).width; g.textAlign = 'left'; g.fillStyle = gold; g.fillText(t, Math.max(4, Math.min(W - tw - 4, lefty ? x - tw : x)), y); }
  }
  function draw(st, { animate = false } = {}) {
    last = st; if (!W && !size()) return; cancelAnimationFrame(anim);
    if (!animate || reduced()) return paint(st, 1);
    const t0 = performance.now(); const step = t => { const p = Math.min(1, (t - t0) / 1100); paint(st, 1 - Math.pow(1 - p, 3)); if (p < 1) anim = requestAnimationFrame(step); }; anim = requestAnimationFrame(step);
  }
  return { draw, destroy:() => { ro.disconnect(); cancelAnimationFrame(anim); } };
}
