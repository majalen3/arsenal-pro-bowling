// Owner-reported arsenal + release (parent brief 2026-10-23). Every value is marked user-reported; nothing here is a
// measurement or a maker spec. Seeded once, as one undoable import ("Not my bag? Remove"), only on a device that has no
// owned balls yet. Ball specs still come from the catalog (js/data.js) with their own sources.
import { mkEvent } from './events.js';
export const SEED_ID = 'seed-owner-2026-10-23';
const UR = { kind: 'user', ref: 'user-reported', importId: SEED_ID };
export const OWNER_BALLS = [
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
  // USBC's list shows only the Radical Rack Attack (reactive). The owner's piece is not verified, so it is NOT linked to
  // the catalog's urethane entry and carries no cover type.
  ['own-rack-attack', null, 'Rack Attack', 'benched', 'type unverified'],
];
export const OWNER_BAGS = [
  ['bag-tournament', 'Tournament 6', 'tournament6', ['own-rattler-big-bite', 'own-super-nova', 'own-ordnance-c4', 'own-hy-road-pearl', 'own-deadly-rattler', 'own-ice-storm'], 'own-ice-storm'],
  ['bag-league', 'League 3', 'league3', ['own-rattler-big-bite', 'own-hy-road-pearl', 'own-ice-storm'], 'own-ice-storm'],
];
// keep: bowler fields the user already set (hand, speed...). The starter arsenal never overwrites them (sim1 lefty bug).
export function seedEvents({ deviceId = null, now = Date.now(), importId = SEED_ID, keep = [] } = {}) {
  const UR = { kind: 'user', ref: 'user-reported', importId };
  const o = (extra) => Object.assign({ deviceId, ts: now, prov: UR, importId }, extra);
  const out = [mkEvent('import.created', importId, { kind: 'seed', label: 'Your reported arsenal (Oct 23, 2026)', fileName: null, counts: { balls: OWNER_BALLS.length, bags: 2 } }, o())];
  const bf = {
    hand: 'right', style: 'tweener',
    speed: { v: 15, unit: 'mph', at: 'unknown', approx: true, prov: UR },
    rev: { v: 220, unit: 'rpm', approx: true, prov: UR },
    pap: { v: '5 1/8', unit: 'in', note: 'horizontal; vertical unknown', prov: UR },
    tilt: { v: 'medium', unit: null, prov: UR }, rotation: { v: 'medium', unit: null, prov: UR },
  };
  for (const k of keep) delete bf[k];
  if (Object.keys(bf).length) out.push(mkEvent('bowler.edited', 'me', { fields: bf }, o()));
  OWNER_BALLS.forEach(([id, cat, name, status, note], i) => out.push(mkEvent('ownedBall.created', id, { catalogId: cat, name, status, note, benchmark: id === 'own-rattler-big-bite', secondary: id === 'own-hy-road-pearl', userReported: true }, o({ ts: now + i + 1 }))));
  OWNER_BAGS.forEach(([id, name, format, slots, spare], i) => out.push(mkEvent('bag.saved', id, { name, format, slots: slots.map(s => ({ owned: s, locked: false })), spare, excluded: [] }, o({ ts: now + 20 + i }))));
  return out;
}
