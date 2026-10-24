// Lane renderer. Geometry is the v1 logical lane (220 x 880: pins at top, board 1 on the right,
// dots 7.5 ft, arrows 15 ft, range 37 ft, Baker box boards 5-8 at 42-46 ft). Logical coords map to any
// CSS size (non-uniform scale), so analyze() numbers are unchanged; text is drawn at fixed CSS px.
// Left-handers: the whole lane is mirrored at draw time (board 1 on the left). Only the logical->screen
// x mapping, its inverse for drags, and the arrow-key direction change; the engine still runs its
// right-hander model and every number it returns is read in the bowler's own board numbering.
import { LW, LH, boardToX, xToBoard, yToFeet, FOUL_Y, PX_FT, HEAD_Y, OIL_LEN, C_SKID, C_HOOK, C_ROLL, S, RANGES } from './engine.js';
import { reduced } from './ui.js';
const LX0 = 14, LX1 = LW - 14, LY0 = 20, LY1 = LH - 6;
export function createLane(canvas, { onAdjust, lefty = () => false, state = null, overlay = null, baker = true } = {}) {
  const isL = typeof lefty === 'function' ? lefty : () => !!lefty;
  const ss = () => state ? state() : S;   // Targeting passes its own release/aim/pattern; geometry is unchanged
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, last = null, anim = null;
  const pad = { l: 30, r: 8, t: 10, b: 24 };
  const mx = lx => isL() ? LW - lx : lx;     // LX0..LX1 is symmetric about LW/2
  const X = lx => pad.l + (mx(lx) - LX0) / (LX1 - LX0) * (W - pad.l - pad.r);
  const Y = ly => pad.t + (ly - LY0) / (LY1 - LY0) * (H - pad.t - pad.b);
  const invX = x => mx(LX0 + (x - pad.l) / (W - pad.l - pad.r) * (LX1 - LX0));
  const invY = y => LY0 + (y - pad.t) / (H - pad.t - pad.b) * (LY1 - LY0);
  const css = n => getComputedStyle(canvas).getPropertyValue(n).trim();
  function resize() {
    const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 3); W = r.width; H = r.height;
    pad.t = Math.max(10, Math.min(46, W * 0.17)); pad.l = W < 180 ? 22 : 30;
    const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    return true;
  }
  const ro = new ResizeObserver(() => { if (resize() && last) paint(last, 1); });
  ro.observe(canvas);
  function paint(st, prog) {
    const { ball, result } = st;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const lw = Math.abs(X(LX1) - X(LX0)), sx = lw / (LX1 - LX0), L0 = Math.min(X(LX0), X(LX1)), L1 = L0 + lw;
    const ink = css('--lane-ink') || 'rgba(255,255,255,.55)';
    // gutters + lane bed
    g.fillStyle = css('--lane-gutter') || '#060807'; g.fillRect(L0 - 6, 0, lw + 12, Y(FOUL_Y));
    const grad = g.createLinearGradient(0, 0, 0, Y(FOUL_Y));
    grad.addColorStop(0, css('--lane-top') || '#0c3a27'); grad.addColorStop(1, css('--lane-bottom') || '#14583c');
    g.fillStyle = grad; g.fillRect(L0, 0, lw, Y(FOUL_Y));
    // approach
    g.fillStyle = css('--lane-approach') || '#0d2a1e'; g.fillRect(L0, Y(FOUL_Y), lw, Y(LY1) - Y(FOUL_Y));
    // oil zone sheen (pattern length)
    const oilFt = OIL_LEN[ss().pattern] || 40, oilY = Y(FOUL_Y - oilFt * PX_FT);
    const og = g.createLinearGradient(0, Y(FOUL_Y), 0, oilY); og.addColorStop(0, 'rgba(125,211,252,.10)'); og.addColorStop(1, 'rgba(125,211,252,.02)');
    g.fillStyle = og; g.fillRect(L0, oilY, lw, Y(FOUL_Y) - oilY);
    g.strokeStyle = 'rgba(125,211,252,.35)'; g.setLineDash([2, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(L0, oilY); g.lineTo(L1, oilY); g.stroke(); g.setLineDash([]);
    // boards
    g.strokeStyle = 'rgba(255,255,255,.045)'; g.lineWidth = 1;
    for (let i = 1; i <= 39; i++) { const x = Math.round(X(boardToX(i, LW))) + .5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Y(FOUL_Y)); g.stroke(); }
    // dots (7.5 ft), arrows (15 ft), range (37 ft), foul line, approach dots
    const dotsY = Y(FOUL_Y - 7.5 * PX_FT), arrY = Y(FOUL_Y - 15 * PX_FT), rngY = Y(FOUL_Y - 37 * PX_FT);
    g.fillStyle = 'rgba(0,0,0,.65)'; for (let i = 5; i <= 35; i += 5) { g.beginPath(); g.arc(X(boardToX(i, LW)), dotsY, 2, 0, 7); g.fill(); }
    const aw = Math.max(3, Math.min(6, sx * 2.4));
    [5, 10, 15, 20, 25, 30, 35].forEach(b => { const x = X(boardToX(b, LW)); g.fillStyle = b === 20 ? '#DAAF37' : '#e2554a'; g.beginPath(); g.moveTo(x, arrY - aw * 1.6); g.lineTo(x - aw, arrY + aw); g.lineTo(x + aw, arrY + aw); g.closePath(); g.fill(); });
    g.strokeStyle = 'rgba(255,255,255,.30)'; g.lineWidth = 1; [10, 15, 20, 25, 30].forEach(b => { const x = X(boardToX(b, LW)); g.beginPath(); g.moveTo(x, rngY); g.lineTo(x, rngY + 8); g.stroke(); });
    g.fillStyle = 'rgba(0,0,0,.6)'; for (let i = 5; i <= 35; i += 5) { g.beginPath(); g.arc(X(boardToX(i, LW)), Y(LH - 10), 2, 0, 7); g.fill(); }
    g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(L0, Y(FOUL_Y)); g.lineTo(L1, Y(FOUL_Y)); g.stroke();
    // Baker box boards 5-8 at 42-46 ft (Targeting draws its own break box instead)
    if (baker) {
    const bx1 = Math.min(X(boardToX(8, LW)), X(boardToX(5, LW))), bx2 = Math.max(X(boardToX(8, LW)), X(boardToX(5, LW))), by = Y(FOUL_Y - 46 * PX_FT), bh = Y(FOUL_Y - 42 * PX_FT) - by;
    g.fillStyle = 'rgba(218,175,55,.16)'; g.fillRect(bx1, by, bx2 - bx1, bh); g.strokeStyle = 'rgba(218,175,55,.7)'; g.strokeRect(bx1 + .5, by + .5, bx2 - bx1 - 1, bh - 1);
    }
    // pins around board 20 (v1 layout, uniform scale so the rack keeps its shape)
    const cx = X(boardToX(20, LW)), by0 = Y(HEAD_Y), sp = 14 * sx * 0.95, kv = Math.min(1, (by0 - 4) / (sp * 2.85 + 6));
    const pins = [[0,0],[-.85,.95],[.85,.95],[-1.7,1.9],[0,1.9],[1.7,1.9],[-2.55,2.85],[-.85,2.85],[.85,2.85],[2.55,2.85]];
    const pr = Math.max(2.5, Math.min(7, 5.5 * sx));
    const pm = isL() ? -1 : 1;
    pins.forEach(([dx0, dy]) => { const dx = dx0 * pm; g.beginPath(); g.arc(cx + dx * sp, by0 - dy * sp * kv, pr, 0, 7); g.fillStyle = '#f8fafc'; g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = .8; g.stroke(); g.fillStyle = '#c0392b'; g.fillRect(cx + dx * sp - pr * .7, by0 - dy * sp * kv - pr * .15, pr * 1.4, pr * .3); });
    // pocket target ring (board 17.5)
    g.strokeStyle = 'rgba(218,175,55,.8)'; g.lineWidth = 1.5; g.beginPath(); g.arc(X(boardToX(17.5, LW)), by0 - sp * kv * .45, pr * 2.1, 0, 7); g.stroke();
    // aim line: release (feet) to target at arrows
    const rel = +ss().release, aimB = Math.max(1, Math.min(39, rel - +ss().aim)), relX = X(boardToX(rel, LW));
    g.setLineDash([4, 4]); g.strokeStyle = 'rgba(218,175,55,.85)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(relX, Y(FOUL_Y - 4)); g.lineTo(X(boardToX(aimB, LW)), arrY); g.stroke(); g.setLineDash([]);
    g.strokeStyle = '#DAAF37'; g.lineWidth = 2; g.beginPath(); g.arc(X(boardToX(aimB, LW)), arrY, 7, 0, 7); g.stroke();
    g.fillStyle = '#DAAF37'; g.beginPath(); g.arc(relX, Y(FOUL_Y - 4), 5, 0, 7); g.fill();
    // phase-coloured path
    const pts = result.points, ph = result.phases, n = Math.max(2, Math.floor(pts.length * prog));
    g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = result.strike ? 4 : 3.2;
    if (result.strike && prog >= 1) { g.shadowColor = '#22c55e'; g.shadowBlur = 10; }
    for (let i = 1; i < n; i++) { const ft = yToFeet(pts[i].y); g.strokeStyle = !ph ? ball.color : ft < ph.skid ? C_SKID : ft < ph.roll ? C_HOOK : C_ROLL; g.beginPath(); g.moveTo(X(pts[i-1].x), Y(pts[i-1].y)); g.lineTo(X(pts[i].x), Y(pts[i].y)); g.stroke(); }
    g.shadowBlur = 0; g.lineCap = 'butt';
    const bp = result.breakpoint, bpShown = bp && pts.findIndex(p => p === bp || (p.x === bp.x && p.y === bp.y)) < n;
    if (bp && (prog >= 1 || bpShown)) { g.fillStyle = '#ff6b35'; g.beginPath(); g.arc(X(bp.x), Y(bp.y), 5.5, 0, 7); g.fill(); g.strokeStyle = '#0b0f0d'; g.lineWidth = 1.5; g.stroke(); }
    if (pts.length) { const p = pts[n - 1]; g.beginPath(); g.arc(X(p.x), Y(p.y), Math.max(4, pr * 1.1), 0, 7); g.fillStyle = ball.color; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); }
    if (overlay) { g.save(); overlay({ g, bx: b => X(boardToX(b, LW)), fy: ft => Y(FOUL_Y - ft * PX_FT), foulY: Y(FOUL_Y), approachY: Y(LH - 10), W, H, sx, lefty: isL(), done: prog >= 1 }); g.restore(); }
    // ---- text pass (fixed CSS px)
    g.font = '600 10px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = ink;
    const bStep = lw < 150 ? 10 : 5; for (let b = bStep; b <= 35; b += bStep) g.fillText(String(b), X(boardToX(b, LW)), H - pad.b / 2);
    g.textAlign = 'right';
    [[0,'0'],[15,'15'],[30,'30'],[45,'45'],[60,'60']].forEach(([ft, l]) => { const y = Y(FOUL_Y - ft * PX_FT); g.fillText(l, pad.l - 9, y); g.fillRect(pad.l - 6, y - .5, 3, 1); });
    g.save(); g.translate(9, (Y(24) + Y(FOUL_Y)) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('FEET', 0, 0); g.restore();
    if (bp && prog >= 1 && W > 150) {
      const lbl = `${result.bpBoard.toFixed(1)} @ ${Math.round(result.bpFeet)} ft`;
      g.font = '700 11px system-ui, sans-serif'; const tw = g.measureText(lbl).width + 12; let lx = X(bp.x) + 10; if (lx + tw > W - 2) lx = X(bp.x) - 10 - tw;
      const ly = Y(bp.y); g.fillStyle = 'rgba(11,15,13,.88)'; roundRect(g, lx, ly - 10, tw, 20, 6); g.fill(); g.fillStyle = '#ffb38f'; g.textAlign = 'left'; g.fillText(lbl, lx + 6, ly + .5);
    }
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function draw(st, { animate = false } = {}) {
    last = st; if (!W && !resize()) return; if (!W) return;
    cancelAnimationFrame(anim);
    if (!animate || reduced()) { paint(st, 1); return; }
    const t0 = performance.now(), dur = 520;
    const step = t => { const p = Math.min(1, (t - t0) / dur); paint(st, 1 - Math.pow(1 - p, 3)); if (p < 1) anim = requestAnimationFrame(step); };
    anim = requestAnimationFrame(step);
  }
  // ---- direct manipulation (v1 rules): press within 9 ft of the foul line moves feet (release 5-30), higher sets target at arrows
  let mode = null, startE = null, moved = false;
  const logical = e => { const r = canvas.getBoundingClientRect(); return { x: invX(e.clientX - r.left), y: invY(e.clientY - r.top) }; };
  const apply = e => {
    const p = logical(e), board = xToBoard(Math.max(14, Math.min(LW - 14, p.x)));
    if (mode === 'release') onAdjust && onAdjust({ release: Math.max(5, Math.min(30, Math.round(board))), keepTarget: true });
    else onAdjust && onAdjust({ aim: Math.max(-8, Math.min(8, Math.round((+ss().release - board) * 2) / 2)) });
  };
  canvas.addEventListener('pointerdown', e => { const p = logical(e); mode = (FOUL_Y - p.y) / PX_FT < 9 ? 'release' : 'aim'; startE = e; moved = false; if (e.pointerType === 'mouse') { try { canvas.setPointerCapture(e.pointerId); } catch(_) {} apply(e); e.preventDefault(); } });
  canvas.addEventListener('pointermove', e => { if (!mode) return; if (e.pointerType === 'mouse') { apply(e); return; } if (!moved && Math.abs(e.clientX - startE.clientX) > 3) { moved = true; try { canvas.setPointerCapture(e.pointerId); } catch(_) {} } if (moved) apply(e); });
  const end = e => { if (mode && e.type === 'pointerup' && e.pointerType !== 'mouse' && !moved) apply(e); mode = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('keydown', e => {
    const k = e.key, r = +ss().release, a = +ss().aim;
    const dl = isL() ? -1 : 1;   // screen-left = higher boards for a right-hander, lower for a mirrored lefty lane
    if (k === 'ArrowLeft') onAdjust({ release: Math.max(5, Math.min(30, r + dl)), keepTarget: true }); else if (k === 'ArrowRight') onAdjust({ release: Math.max(5, Math.min(30, r - dl)), keepTarget: true });
    else if (k === 'ArrowUp') onAdjust({ aim: Math.min(8, a + .5) }); else if (k === 'ArrowDown') onAdjust({ aim: Math.max(-8, a - .5) }); else return;
    e.preventDefault();
  });
  return { draw, destroy: () => { ro.disconnect(); cancelAnimationFrame(anim); } };
}
