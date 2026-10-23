// Proves js/engine.js produces byte-identical results to the v1 engine in tests/legacy/app.v1.js.
// Run: node tests/engine_equivalence.mjs
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const E = await import(path.join(here, '../js/engine.js'));
const D = await import(path.join(here, '../js/data.js'));
const oldSrc = fs.readFileSync(path.join(here, 'legacy/app.v1.js'), 'utf8').split('\n');
const L = (a, b) => oldSrc.slice(a - 1, b).join('\n');
const inputs = {};
const ctx = { document: { getElementById: id => ({ value: inputs[id] }) }, Math, console };
vm.createContext(ctx);
// v1 regions: data+helpers, cover/finish mods, sim, analysis (same line ranges the port was cut from)
vm.runInContext(L(1, 35) + '\n' + L(219, 255) + '\n' + L(281, 346) +
  '\nthis.API={balls,simulatePath,analyze,sensitivity,coachLine,phasesOf,ruleOf31,readMedian};', ctx);
const O = ctx.API;
const round = v => typeof v === 'number' ? +v.toFixed(9) : v;
const ser = o => JSON.stringify(o, (k, v) => round(v));
let n = 0, bad = 0, seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = a => a[Math.floor(rnd() * a.length)];
const stepv = ([lo, hi, st]) => +(lo + Math.round(rnd() * (hi - lo) / st) * st).toFixed(2);
for (let i = 0; i < 1500; i++) {
  const s = { speed: stepv(E.RANGES.speed), rev: stepv(E.RANGES.rev), release: stepv(E.RANGES.release), aim: stepv(E.RANGES.aim),
    oil: stepv(E.RANGES.oil), finish: pick(E.FINISHES), pattern: pick(E.PATTERNS) };
  Object.assign(E.S, s); for (const k in s) inputs[k] = String(s[k]);
  const bi = i % D.balls.length;
  const a = E.analyze(D.balls[bi]), b = O.analyze(O.balls[bi]);
  const checks = [[ser(E.simulatePath(D.balls[bi])), ser(O.simulatePath(O.balls[bi]))], [ser(a), ser(b)],
    [E.coachLine(a), O.coachLine(b)], [E.sensitivity(D.balls[bi]), O.sensitivity(O.balls[bi])], [ser(E.phasesOf(a)), ser(O.phasesOf(b))]];
  for (const [x, y] of checks) { n++; if (x !== y) { bad++; if (bad < 4) console.error('MISMATCH', s, D.balls[bi].id, x.slice(0, 200), y.slice(0, 200)); } }
}
if (round(E.readMedian()) !== round(O.readMedian())) bad++;
console.log(`engine equivalence: ${n} comparisons, ${bad} mismatches`);
process.exit(bad ? 1 : 0);
