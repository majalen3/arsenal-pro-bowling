// Ten-pin scoring per USBC Playing Rules 2a–2h (bowl.com "USBC Playing Rules", fetched 2026-10-23).
// throws: [{down, foul?}] in delivery order. A foul counts 0 pins for that delivery (USBC Rule 2/Ch.1 fouls);
// pins knocked down by a fouled first ball are respotted, so the second ball faces a full rack.
export function framesOf(throws) {
  const fr = []; let i = 0;
  const pins = t => (t.foul ? 0 : t.down);
  for (let f = 1; f <= 10 && i < throws.length; f++) {
    const a = throws[i];
    if (f < 10) {
      if (pins(a) === 10) { fr.push({ f, rolls: [a], strike: true }); i += 1; continue; }
      const b = throws[i + 1];
      fr.push({ f, rolls: b ? [a, b] : [a], spare: !!b && pins(a) + pins(b) === 10 }); i += b ? 2 : 1;
    } else {
      const r = throws.slice(i, i + 3); fr.push({ f, rolls: r, tenth: true }); i += r.length;
    }
  }
  return { frames: fr, used: i };
}
export function scoreGame(throws) {
  const errors = [];
  const pins = t => (t && !t.foul ? t.down : 0);
  for (const t of throws) if (!t || !Number.isInteger(t.down) || t.down < 0 || t.down > 10) { errors.push('bad delivery'); break; }
  if (errors.length) return { ok: false, errors, total: null, frames: [], complete: false };
  const { frames, used } = framesOf(throws);
  if (used < throws.length) errors.push('too many deliveries');
  const flat = throws.map(pins); let k = 0, total = 0;
  const cum = [];
  for (const fr of frames) {
    const p = fr.rolls.map(pins);
    if (!fr.tenth) {
      if (p.length === 2 && p[0] + p[1] > 10) errors.push(`frame ${fr.f}: ${p[0]}+${p[1]} > 10`);
      let s = null;
      if (fr.strike) { if (k + 2 < flat.length) s = 10 + flat[k + 1] + flat[k + 2]; k += 1; }
      else if (fr.spare) { if (k + 2 < flat.length) s = 10 + flat[k + 2]; k += 2; }
      else { if (p.length === 2) s = p[0] + p[1]; k += p.length; }
      if (s != null && cum.length === fr.f - 1 && (fr.f === 1 || cum[fr.f - 2] != null)) { total += s; cum.push(total); } else cum.push(null);
    } else {
      const [a, b, c] = p;
      if (a < 10 && b != null && a + b > 10) errors.push(`frame 10: ${a}+${b} > 10`);
      if (a === 10 && b != null && b < 10 && c != null && b + c > 10) errors.push(`frame 10: ${b}+${c} > 10`);
      const needThird = b != null && (a === 10 || a + b === 10);
      if (c != null && !needThird) errors.push('frame 10: third ball not earned');
      const done = b != null && (needThird ? c != null : true);
      if (done && cum[8] != null) { total += a + b + (c || 0); cum.push(total); } else cum.push(null);
    }
  }
  const complete = frames.length === 10 && cum[9] != null;
  return { ok: errors.length === 0, errors, total: complete ? total : (cum.filter(x => x != null).pop() || 0), frames, cum, complete };
}
// Pin geometry (pin 1 at the front). x in half-pin steps, y = row.
const PIN = { 1: [0, 0], 2: [-1, 1], 3: [1, 1], 4: [-2, 2], 5: [0, 2], 6: [2, 2], 7: [-3, 3], 8: [-1, 3], 9: [1, 3], 10: [3, 3] };
// USBC Rule 2h: a split is a setup of pins left standing after the first delivery, provided the head pin is down and at
// least one pin is down (1) between two or more standing pins (e.g. 7-9, 3-10) or (2) immediately ahead of two or more
// standing pins (e.g. 5-6). Our reading of "between": a down pin whose x lies strictly between two standing pins' x and whose
// row lies within their rows; "immediately ahead": a down pin whose two touching pins in the next row both stand.
export function isSplit(standing) {
  const s = new Set(standing.map(Number));
  if (s.has(1) || s.size < 2) return false;
  const down = Object.keys(PIN).map(Number).filter(p => !s.has(p)), st = [...s];
  for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) {
    const [ax, ay] = PIN[st[i]], [bx, by] = PIN[st[j]], lo = Math.min(ax, bx), hi = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by);
    if (down.some(p => { const [x, y] = PIN[p]; return x > lo && x < hi && y >= y0 && y <= y1; })) return true;
  }
  for (const p of down) { const [x, y] = PIN[p]; const back = Object.keys(PIN).map(Number).filter(q => PIN[q][1] === y + 1 && Math.abs(PIN[q][0] - x) === 1); if (back.length === 2 && back.every(q => s.has(q))) return true; }
  return false;
}
// Play order of one game's quick-log throws: by frame, then ball, then time. An edited frame's replacement shots are written
// later than the frames after it, so time order alone would score them in the wrong place (scoring fix 2).
export const playOrder = shots => shots.slice().sort((a, b) => ((a.frame || 0) - (b.frame || 0)) || ((a.roll || 0) - (b.roll || 0)) || ((a.ts || 0) - (b.ts || 0)));
