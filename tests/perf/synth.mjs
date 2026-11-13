// Realistic-size synthetic event log for the performance tests (owner t134u): 50 owned balls, 500 scored games over 100 nights,
// with every roll logged (shot.logged), plus session edits, ball edits, bags and lines. Deterministic (seeded), no real person's data.
import { mkEvent } from '../../js/data/events.js';
import { balls } from '../../js/data.js';
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function bigEvents({ balls: nBalls = 50, games = 500, nights = 100, now = 1790000000000, seed = 7, deviceId = 'perf-device' } = {}) {
  const r = rng(seed), out = [], o = (ts, extra) => Object.assign({ deviceId, ts, prov: { kind: 'user' } }, extra);
  let ts = now - 400 * 864e5;
  out.push(mkEvent('bowler.edited', 'me', { fields: { hand: 'right', speed: { v: 16, unit: 'mph' }, rev: { v: 250, unit: 'rpm' } } }, o(ts++)));
  const owned = [];
  for (let i = 0; i < nBalls; i++) {
    const cat = balls[i % balls.length], id = 'own-perf-' + i; owned.push(id);
    out.push(mkEvent('ownedBall.created', id, { catalogId: cat.id, name: cat.brand + ' ' + cat.name + (i >= balls.length ? ' #' + (1 + Math.floor(i / balls.length)) : ''), status: i % 7 === 6 ? 'benched' : 'inBag' }, o(ts++)));
    if (i % 3 === 0) out.push(mkEvent('ownedBall.edited', id, { fields: { layout: '55 x 4 x 35', finish: '2000 Abralon' } }, o(ts++)));
  }
  out.push(mkEvent('bag.saved', 'bag-tonight', { name: 'Tonight', format: 'league3', slots: owned.slice(0, 4).map(s => ({ owned: s, locked: false })), spare: owned[3], excluded: [] }, o(ts++)));
  for (let i = 0; i < 40; i++) out.push(mkEvent('line.created', 'line-' + i, { name: 'Line ' + i, ballId: owned[i % owned.length], feet: 10 + (i % 15), aim: 8 + (i % 9) }, o(ts++)));
  const perNight = Math.ceil(games / nights); let g = 0;
  for (let n = 0; n < nights && g < games; n++) {
    const sid = 'night-perf-' + n; ts += 864e5 * 3.5;
    out.push(mkEvent('session.created', sid, { kind: 'tonight', date: new Date(ts).toISOString().slice(0, 10), game: 1 }, o(ts)));
    for (let k = 1; k <= perNight && g < games; k++, g++) {
      const ball = owned[Math.floor(r() * owned.length)]; let t = ts + k * 1000;
      for (let f = 1; f <= 10; f++) {
        const strike = r() < 0.3; const pins1 = strike ? 10 : Math.floor(r() * 10);
        out.push(mkEvent('shot.logged', sid, { sessionId: sid, game: k, frame: f, roll: 1, down: pins1, leave: strike ? [] : [2, 4, 5].slice(0, 10 - pins1 > 3 ? 3 : 10 - pins1), foul: false, ballId: ball }, o(t++)));
        if (!strike || f === 10) {
          if (f === 10 && strike) { out.push(mkEvent('shot.logged', sid, { sessionId: sid, game: k, frame: f, roll: 2, down: 10, leave: [], foul: false, ballId: ball }, o(t++))); out.push(mkEvent('shot.logged', sid, { sessionId: sid, game: k, frame: f, roll: 3, down: 7, leave: [1, 2, 4], foul: false, ballId: ball }, o(t++))); }
          else if (!strike) out.push(mkEvent('shot.logged', sid, { sessionId: sid, game: k, frame: f, roll: 2, down: 10 - pins1 > 0 ? Math.min(10 - pins1, Math.floor(r() * (11 - pins1))) : 0, leave: [], foul: false, ballId: ball }, o(t++)));
        }
      }
      if (g % 2 === 0) out.push(mkEvent('game.logged', sid, { sessionId: sid, game: k, score: 120 + Math.floor(r() * 120), ballId: ball, date: new Date(ts).toISOString().slice(0, 10) }, o(t++)));
      out.push(mkEvent('session.edited', sid, { fields: { game: k + 1, editTs: t } }, o(t++)));
    }
    out.push(mkEvent('session.edited', sid, { fields: { ended: true, endedTs: ts + 3600e3 } }, o(ts + 3600e3)));
  }
  return out;
}
