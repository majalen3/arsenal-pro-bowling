// Event-log replay time at realistic sizes (owner t134u). node tests/perf/replay_bench.mjs [--json]
// Reports the median of 9 runs for: project() over the whole log (what every write costs the next screen draw), the same over a
// small log (a new phone), and an append + projection (a scoring tap).
import { bigEvents } from './synth.mjs';
import { project } from '../../js/data/project.js';
const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
const time = (fn, n = 9) => { fn(); const t = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); fn(); t.push(performance.now() - t0); } return Math.round(med(t) * 100) / 100; };
const big = bigEvents(), small = bigEvents({ balls: 10, games: 30, nights: 10 });
const res = { events_large: big.length, events_small: small.length, project_large_ms: time(() => project(big)), project_small_ms: time(() => project(small)) };
const P = project(big); res.games_scored = P.scores.length + new Set(P.shots.map(s => s.sessionId + '#' + s.game)).size; res.shots = P.shots.length;
if (process.argv.includes('--json')) console.log(JSON.stringify(res)); else console.table(res);
