// Example arsenal: one tap on Tonight ("Load example arsenal") for a bowler who wants to look around before entering
// their own balls. It is NOT a real bowler's data: a mix of catalog balls (specs and sources from js/data.js) chosen to
// span the strength range, with no bowler numbers at all (hand, speed, revs and PAP stay the bowler's own). Every event
// is provenance ref 'example' (shown as "example (not yours)") and it is one undoable import (Me → Imports → Remove).
// Loaded only on request, never automatically (de-brand 2026-10-31).
import { mkEvent } from './events.js';
export const EXAMPLE_ID = 'example-arsenal';
// Phones that loaded the earlier starter set carry this import id; it is still recognised so the offer is not repeated.
export const LEGACY_SEED_ID = 'seed-owner-2026-10-23';
export const SEED_ID = EXAMPLE_ID;
export const EXAMPLE_BALLS = [
  // [ownedId, catalogId, name, status, note]
  ['ex-bigfoot-hybrid', 'bigfoot-hybrid', 'Radical Bigfoot Hybrid', 'inBag', 'Example benchmark'],
  ['ex-innovator', 'innovator', 'Radical Innovator', 'inBag', null],
  ['ex-astrophysix', 'astrophysix', 'Storm AstroPhysiX', 'inBag', null],
  ['ex-hy-road', 'hy-road', 'Storm Original Hy-Road', 'inBag', null],
  ['ex-conspiracy-pearl', 'conspiracy-pearl', 'Radical Conspiracy Pearl', 'inBag', null],
  ['ex-ice-storm', 'ice-storm', 'Storm Ice Storm', 'inBag', 'Example spare ball'],
  ['ex-counter-attack', 'counter-attack', 'Radical Counter Attack Solid', 'benched', null],
  ['ex-hy-road-x', 'hy-road-x', 'Storm Hy-Road X', 'benched', null],
  ['ex-trailblazer', 'trailblazer', 'Radical Trail Blazer', 'benched', null],
  ['ex-rattler-nu', 'rattler-nu', 'Radical Rattler NU', 'benched', null],
];
export const EXAMPLE_BAGS = [
  ['ex-bag-tournament', 'Example tournament 6', 'tournament6', ['ex-bigfoot-hybrid', 'ex-innovator', 'ex-astrophysix', 'ex-hy-road', 'ex-conspiracy-pearl', 'ex-ice-storm'], 'ex-ice-storm'],
  ['ex-bag-league', 'Example league 3', 'league3', ['ex-bigfoot-hybrid', 'ex-hy-road', 'ex-ice-storm'], 'ex-ice-storm'],
];
export const EXAMPLE_LABEL = 'Example arsenal (not a real bowler)';
// keep is accepted for the old call shape; the example never writes bowler fields.
export function seedEvents({ deviceId = null, now = Date.now(), importId = EXAMPLE_ID } = {}) {
  const EX = { kind: 'user', ref: 'example', importId };
  const o = (extra) => Object.assign({ deviceId, ts: now, prov: EX, importId }, extra);
  const out = [mkEvent('import.created', importId, { kind: 'seed', label: EXAMPLE_LABEL, fileName: null, counts: { balls: EXAMPLE_BALLS.length, bags: EXAMPLE_BAGS.length } }, o())];
  EXAMPLE_BALLS.forEach(([id, cat, name, status, note], i) => out.push(mkEvent('ownedBall.created', id, { catalogId: cat, name, status, note, benchmark: id === 'ex-bigfoot-hybrid', example: true }, o({ ts: now + i + 1 }))));
  EXAMPLE_BAGS.forEach(([id, name, format, slots, spare], i) => out.push(mkEvent('bag.saved', id, { name, format, slots: slots.map(s => ({ owned: s, locked: false })), spare, excluded: [] }, o({ ts: now + 20 + i }))));
  return out;
}
export const exampleEvents = seedEvents;
