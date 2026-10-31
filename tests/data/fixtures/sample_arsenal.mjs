// TEST FIXTURE ONLY (not shipped in the app's UI): a fixed 10-ball arsenal + 2 bags that the unit, e2e and journey tests
// load so their expectations and visual baselines stay stable. It is written as if a bowler had reported it (prov
// 'user-reported'), to exercise that path. It is not any real person's data: bowler numbers are round sample values.
// (The app's own one-tap demo data is the Example arsenal in js/data/seed.js.)
import { mkEvent } from '../../../js/data/events.js';
export const SAMPLE_ID = 'sample-fixture';
const UR = { kind: 'user', ref: 'user-reported', importId: SAMPLE_ID };
export const SAMPLE_BALLS = [
  // [ownedId, catalogId|null, name, status, note]
  ['own-rattler-big-bite', 'rattler-big-bite', 'Radical Rattler Big Bite', 'inBag', 'Benchmark'],
  ['own-super-nova', 'super-nova', 'Storm Super Nova', 'inBag', null],
  ['own-ordnance-c4', 'ordnance-c4', '900 Global Ordnance C4', 'inBag', null],
  ['own-hy-road-pearl', 'hy-road-pearl', 'Storm Hy-Road Pearl', 'inBag', 'Secondary (Hy-Road)'],
  ['own-deadly-rattler', 'deadly-rattler', 'Radical Deadly Rattler', 'inBag', null],
  ['own-ice-storm', 'ice-storm', 'Storm Ice Storm', 'inBag', 'Spare'],
  ['own-guru-supreme', 'guru-supreme', 'Radical Guru Supreme', 'benched', null],
  ['own-raw-hammer', 'raw-hammer', 'Hammer Raw Hammer Black', 'benched', null],
  ['own-green-scout', 'green-scout', 'Columbia 300 Scout Reactive', 'benched', null],
  // A ball with no catalog link and no cover type: exercises the "spec TBD" path.
  ['own-rack-attack', null, 'Rack Attack', 'benched', 'type unverified'],
];
export const SAMPLE_BAGS = [
  ['bag-tournament', 'Tournament 6', 'tournament6', ['own-rattler-big-bite', 'own-super-nova', 'own-ordnance-c4', 'own-hy-road-pearl', 'own-deadly-rattler', 'own-ice-storm'], 'own-ice-storm'],
  ['bag-league', 'League 3', 'league3', ['own-rattler-big-bite', 'own-hy-road-pearl', 'own-ice-storm'], 'own-ice-storm'],
];
// keep: bowler fields the user already set (hand, speed...). Loading it never overwrites them (sim1 lefty bug).
export function sampleEvents({ deviceId = null, now = Date.now(), importId = SAMPLE_ID, keep = [] } = {}) {
  const UR = { kind: 'user', ref: 'user-reported', importId };
  const o = (extra) => Object.assign({ deviceId, ts: now, prov: UR, importId }, extra);
  const out = [mkEvent('import.created', importId, { kind: 'seed', label: 'Sample arsenal (test fixture)', fileName: null, counts: { balls: SAMPLE_BALLS.length, bags: 2 } }, o())];
  const bf = {
    style: 'tweener',   // no hand: the bowler tells us (no auto-detected handedness)
    speed: { v: 16, unit: 'mph', at: 'unknown', approx: true, prov: UR },
    rev: { v: 250, unit: 'rpm', approx: true, prov: UR },
    pap: { v: '4 3/4', unit: 'in', note: 'horizontal; vertical unknown', prov: UR },
    tilt: { v: 'medium', unit: null, prov: UR }, rotation: { v: 'medium', unit: null, prov: UR },
  };
  for (const k of keep) delete bf[k];
  if (Object.keys(bf).length) out.push(mkEvent('bowler.edited', 'me', { fields: bf }, o()));
  SAMPLE_BALLS.forEach(([id, cat, name, status, note], i) => out.push(mkEvent('ownedBall.created', id, { catalogId: cat, name, status, note, benchmark: id === 'own-rattler-big-bite', secondary: id === 'own-hy-road-pearl', userReported: true }, o({ ts: now + i + 1 }))));
  SAMPLE_BAGS.forEach(([id, name, format, slots, spare], i) => out.push(mkEvent('bag.saved', id, { name, format, slots: slots.map(s => ({ owned: s, locked: false })), spare, excluded: [] }, o({ ts: now + 20 + i }))));
  return out;
}
export const seedEvents = sampleEvents, SEED_ID = SAMPLE_ID;   // tests import these names
