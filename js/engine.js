// Arsenal Pro engine — simulatePath and the Breakpoint analysis, moved verbatim from v1 app.js.
// The ONLY change: control values are read from the state object S instead of DOM inputs
// (S holds exactly what the v1 inputs held). tests/engine_equivalence.mjs proves identical output.
import { balls, rgOf, diffOf } from './data.js';
export const LW=220, LH=880;
// Control state. Ranges/steps are the v1 input ranges.
export const S = { speed:15, rev:220, release:12, aim:-4, oil:1, finish:'factory', pattern:'house' };
export const RANGES = { speed:[12,22,0.5], rev:[100,500,10], release:[5,30,1], aim:[-8,8,0.5], oil:[0.6,1.5,0.1] };
export const FINISHES = ['factory','500','1000','2000','3000','polished'];
export const PATTERNS = ['house','sport','cheetah','scorpion','shark','dry'];
export function getFinishMod(f) { if(f==='500')return{e:1.25,h:1.15}; if(f==='1000')return{e:1.12,h:1.08}; if(f==='2000')return{e:1,h:1}; if(f==='3000')return{e:0.88,h:0.95}; if(f==='polished')return{e:0.72,h:0.88}; return{e:1,h:1}; }
export function getCoverMod(c) { if(c.includes('Solid'))return{e:0.75,h:1.15}; if(c.includes('Pearl'))return{e:0.3,h:0.95}; if(c.includes('Hybrid'))return{e:0.52,h:1.05}; if(c.includes('Urethane'))return{e:0.85,h:0.65}; return{e:0.5,h:1}; }
export function boardToX(board, w) { return 14 + ((39 - board) / 39) * (w - 28); }
export function simulatePath(ball, ov) {
  ov = ov || {};
  const num = (k,id) => ov[k]!==undefined ? ov[k] : +S[id];
  const speed = num('speed','speed'), rev = num('rev','rev'), release = num('release','release'), aim = num('aim','aim'), oil = +S.oil, finish = S.finish, pattern = S.pattern, w = LW, h = LH;
  const cover = getCoverMod(ball.cover), fin = getFinishMod(finish);
  const rgEarly = Math.max(0.2, Math.min(0.9, (2.60-rgOf(ball))*2.2));
  const diffHook = 0.7 + diffOf(ball)*12;
  const asym = ball.core==='Asymmetric' ? 1.12 : 1.0;
  const early = (cover.e*0.5 + rgEarly*0.35 + fin.e*0.15) * fin.e;
  const hookPot = cover.h * diffHook * asym * fin.h;
  const revRatio = rev / (speed*14);
  const baseHook = hookPot * (0.55 + revRatio*0.45) / oil;
  let x = boardToX(release, w), y = h - 42, vx = Math.sin(aim * Math.PI/180) * 0.85, vy = -5.6;
  const points = []; let breakpoint = null, gutter = false, skidY = null;
  for (let t=0; t<240; t++) {
    points.push({x,y});
    const board = 39 - ((x-14)/(w-28))*39;
    if (board < 1 || board > 39) { gutter = true; break; } // ball left the lane: stop the path here
    let fr = 0.28;
    if (pattern==='house') fr = (board<8||board>31)?1.55 : (board>15&&board<24?0.22:0.6);
    else if (pattern==='cheetah') fr = 1.6; else if (pattern==='dry') fr = 1.8; else if (pattern==='shark') fr = 0.42; else fr = 0.58;
    fr *= oil;
    const prog = (h-42-y)/(h-125);
    const phaseStart = 0.40 - early*0.18;
    let phase = 0;
    if (prog > phaseStart) { const p = Math.min(1, (prog-phaseStart)/(1-phaseStart)); phase = Math.pow(p, 1.5) * (1.05 - p*0.25); }
    if (skidY===null && phase>0) skidY = y;
    const force = baseHook * fr * phase * 0.36;
    vx -= force * 0.10;
    if (prog > 0.80) vx *= 0.983;
    x += vx; y += vy;
    if (!breakpoint && phase>0.28 && force>0.04) breakpoint = {x,y,board};
    if (y < 60) break;
  }
  return {points, breakpoint, gutter, skidY};
}
/* ===== Breakpoint-style analysis =====
   Coordinates: feet 0 = foul line, 15 = arrows, 60 = head pin. Board 1-39 (1 right, 20 center). Pocket = board 17.5.
   Strike = entry board 16.8-18.2 AND entry angle 4-6 deg. The angle is measured on the drawn lane
   (the lane is drawn stretched sideways, so this is the visual pocket angle, same as the old panel).
   Board in tolerance + angle in tolerance means the ball is inside the 17.5-to-20 pocket line, i.e. sweeps the 5-pin. */
export const HEAD_Y = 68, FOUL_Y = LH - 34, PX_FT = (FOUL_Y - HEAD_Y) / 60;
export const yToFeet = y => (FOUL_Y - y) / PX_FT;
export const xToBoard = x => 39 - ((x - 14) / (LW - 28)) * 39;
export const OIL_LEN = {house:38, sport:42, cheetah:35, scorpion:42, shark:45, dry:32};
/* Rule of 31: oil length (ft) - 31 = board where the ball should exit the oil (breakpoint board).
   Only the board check is shown; the breakpoint distance is not enforced. */
export function ruleOf31(pattern, bpBoard) {
  const len = OIL_LEN[pattern] || 38, target = len - 31;
  const d = bpBoard - target; // higher board = further left = further inside here
  const rel = Math.abs(d) < 0.5 ? 'on it' : (d > 0 ? d.toFixed(1)+' inside' : (-d).toFixed(1)+' outside');
  return {len, target, d, text: `Rule of 31: ${len} ft oil, target board ${target}, you are ${rel}.`};
}
/* Phases from the existing sim: skid ends where the sim's hook phase starts (~17.5-20 ft across the arsenal, so ~20 ft is the nominal boundary);
   roll starts at the nominal 52 ft, shifted by the same amount this ball's skid differs from 20 ft. No new friction constants. */
export const SKID_NOM = 20, ROLL_NOM = 52, C_SKID = '#7dd3fc', C_HOOK = '#DAAF37', C_ROLL = '#86efac';
export function phasesOf(r) {
  const pts = r.points; if (!pts.length) return null;
  const end = Math.min(60, yToFeet(pts[pts.length-1].y));
  const skid = r.skidY==null ? end : Math.min(end, yToFeet(r.skidY));
  const roll = r.skidY==null ? end : Math.min(end, Math.max(skid, Math.min(58, Math.max(44, ROLL_NOM + (skid - SKID_NOM)))));
  return { skid, roll, end, hook: roll - skid, rollLen: end - roll };
}
export const rollMph = v => v * 5 / 7;   // slip-to-roll with initial pure slide: v_roll = (5/7) v_i (estimate; ignores initial rev)
export function skidFtOf(b) { const r = simulatePath(b, {release:12, aim:-4}); return r.skidY==null ? null : yToFeet(r.skidY); }
export function readInfo(b, med) { const f = skidFtOf(b); if (f==null) return null; const tag = f < med-0.5 ? 'early' : f > med+0.5 ? 'late' : 'mid'; return { f, tag }; }
export function readMedian() { const a = balls.map(skidFtOf).filter(x=>x!=null).sort((x,y)=>x-y); return a.length ? a[Math.floor(a.length/2)] : SKID_NOM; }
export function analyze(ball, ov) {
  const r = simulatePath(ball, ov), pts = r.points;
  const out = {phases:phasesOf(r), points:pts, gutter:r.gutter, breakpoint:r.breakpoint, entryBoard:null, angle:null, strike:false, call:'', bpFeet:null, bpBoard:null};
  let entry = null;
  for (let i=1;i<pts.length;i++) if (pts[i].y <= HEAD_Y) {
    const a=pts[i-1], c=pts[i], f=(a.y-HEAD_Y)/(a.y-c.y), x=a.x+(c.x-a.x)*f;
    const b=pts[Math.max(0,i-4)];
    entry = {board:xToBoard(x), angle:Math.abs(Math.atan2(b.x-c.x, b.y-c.y)*180/Math.PI)}; break;
  }
  if (r.gutter || !entry) { out.call = 'GUTTER'; if (!entry) { const e=pts[pts.length-1]; out.entryBoard = e?xToBoard(e.x):null; } }
  else {
    out.entryBoard = entry.board; out.angle = entry.angle;
    const bOK = Math.abs(entry.board-17.5) <= 0.7, aOK = entry.angle>=4 && entry.angle<=6;
    out.strike = bOK && aOK;
    out.call = out.strike ? 'STRIKE' : bOK ? 'ANGLE' : entry.board<17.5 ? 'LIGHT' : 'HIGH';
  }
  if (r.breakpoint) { out.bpFeet = yToFeet(r.breakpoint.y); out.bpBoard = r.breakpoint.board; }
  return out;
}
export function sensitivity(ball) {
  const g = id => +S[id];
  const rel = g('release'), sp = g('speed'), rv = g('rev');
  const vars = [{speed:sp+0.5},{speed:sp-0.5},{rev:rv+20},{rev:rv-20},{release:rel+1},{release:rel-1}];
  return vars.filter(v => analyze(ball, v).strike).length + ' of ' + vars.length;
}
export function coachLine(a) {
  const f1 = v => v.toFixed(1);
  if (a.call==='GUTTER') return 'In the gutter.';
  const b = f1(a.entryBoard);
  if (a.call==='STRIKE') return `Strike. ${b}, sweeping the 5.`;
  if (a.call==='ANGLE') return `On ${b}. The angle is missing the 5-pin. ${f1(a.angle)}\u00b0, need 4-6.`;
  const off = Math.abs(a.entryBoard-17.5), mv = Math.min(6, Math.max(1, Math.round(off))), far = off > 8 ? ' Way off. Reset the line.' : '';
  if (a.call==='LIGHT') return `Light. ${b}, ${f1(off)} boards short of 17.5. Move feet left ${mv} board${mv>1?'s':''} or go stronger.${far}`;
  return `High. ${b}, ${f1(off)} boards past 17.5. Move feet right ${mv} board${mv>1?'s':''} or go weaker.${far}`;
}
