// Explicit handedness (owner 2026-10-24): the hand comes only from what the bowler told us; nothing guesses it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { seedEvents } from '../../js/data/seed.js';
const mem = new Map();
globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k), clear: () => mem.clear(), key: i => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
globalThis.location = globalThis.location || { hostname: 'localhost', host: 'localhost', origin: 'http://localhost', href: 'http://localhost/', search: '', hash: '', protocol: 'http:' };
globalThis.window = globalThis.window || globalThis; globalThis.addEventListener = globalThis.addEventListener || (() => {});
const H = await import('../../js/cc/hand.js');
const read = rel => fs.readFileSync(new URL('../../' + rel, import.meta.url), 'utf8');

test('handOfProfile: only an explicit left/right answer counts', () => {
  assert.equal(H.handOfProfile(null), null);
  assert.equal(H.handOfProfile({}), null);
  assert.equal(H.handOfProfile({ hand: 'Right' }), null, 'no fuzzy matching');
  assert.equal(H.handOfProfile({ hand: 'left' }), 'left');
  assert.equal(H.handOfProfile({ hand: 'right' }), 'right');
  assert.equal(H.handOfProfile({ hand: 'right', entered: { speed: true } }), null, 'an untouched welcome default is not an answer');
  assert.equal(H.handOfProfile({ hand: 'left', entered: { hand: true } }), 'left');
});
test('unset: reads boards right-handed but asks once; setHand stores it as user-reported', () => {
  mem.clear();
  assert.equal(H.hand(), null); assert.equal(H.handOr(), 'right'); assert.equal(H.isLefty(), false); assert.equal(H.needsAsk(), true);
  H.dismissAsk(); assert.equal(H.needsAsk(), false, '"Not now" = asked once'); assert.equal(H.hand(), null);
  mem.clear(); H.setHand('left');
  assert.equal(H.hand(), 'left'); assert.equal(H.isLefty(), true); assert.equal(H.needsAsk(), false);
  assert.equal(JSON.parse(localStorage.getItem('ap_profile')).handSource, 'user-reported');
  assert.throws(() => H.setHand('ambi'));
});
test('the starter arsenal never sets a hand', () => {
  const ev = seedEvents({ now: 1 }).filter(e => e.type === 'bowler.edited');
  for (const e of ev) assert.ok(!('hand' in (e.data.fields || e.fields || {})), 'seed bowler has no hand');
});
test('no auto-detection left in the app: every screen reads cc/hand.js', () => {
  const files = ['js/screens/tonight.js', 'js/screens/lane.js', 'js/screens/target.js', 'js/screens/compare.js', 'js/ctl.js'];
  for (const f of files) {
    const s = read(f);
    assert.ok(!/\.hand\s*===\s*'left'/.test(s), `${f} reads profile().hand directly`);
    assert.ok(!/bowler[^\n]{0,20}\.hand/i.test(s.replace(/\/\/.*$/gm, '')), `${f} guesses from the event-log bowler`);
    assert.ok(/cc\/hand\.js/.test(s), `${f} uses cc/hand.js`);
  }
  assert.ok(!/hand:\s*'right'/.test(read('js/screens/welcome.js')), 'welcome has no preselected hand');
  assert.ok(!/hand:\s*'right'/.test(read('js/screens/more.js')), 'profile editor has no preselected hand');
  assert.ok(!/b\.hand \|\| 'right'/.test(read('js/hub.js')), 'restore never fills in right');
});
