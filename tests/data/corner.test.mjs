import test from 'node:test';
import assert from 'node:assert/strict';
import { cornerLeaves, cornerInsight, enough, cornerPin, MIN } from '../../js/cc/corner.js';
const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const left = pins => ALL.filter(p => !pins.includes(p));
// one frame = first ball leaving `lv` (tag m) then a spare
const fr = (lv, m) => lv.length ? [{ down: 10 - lv.length, leave: lv, miss: m }, { down: lv.length, leave: [] }] : [{ down: 10, leave: [] }];
const game = frames => ({ throws: frames.flat().concat([{ down: 10, leave: [] }, { down: 10, leave: [] }]) });
test('corner pin follows the hand; unset reads right-handed', () => { assert.equal(cornerPin('left'), 7); assert.equal(cornerPin('right'), 10); assert.equal(cornerPin(null), 10); });
test('counts only first balls that left the corner pin alone, high/light tags kept apart', () => {
  const g = game([fr([10], 'pocket'), fr([10]), fr([10], 'light'), fr([10, 7]), fr([]), fr([4]), fr([10]), fr([]), fr([6, 10]), fr([])]);
  const c = cornerLeaves([g], 'right');
  assert.equal(c.first, 12); assert.equal(c.n, 3); assert.equal(c.pocket, 1); assert.equal(c.untagged, 2); assert.equal(c.offHit, 1);
  const l = cornerLeaves([game([fr([7]), fr([7]), fr([7]), fr([10]), fr([]), fr([]), fr([]), fr([]), fr([]), fr([])])], 'left');
  assert.equal(l.pin, 7); assert.equal(l.n, 3);
});
test('nothing below the sample minimum; with enough, n of N and no percent', () => {
  assert.equal(cornerInsight({ pin: 10, first: 9, n: 3, pocket: 0, untagged: 3 }), null);
  assert.equal(cornerInsight({ pin: 10, first: 20, n: 2, pocket: 0, untagged: 2 }), null);
  assert.equal(enough({ n: 4, first: 29 }, 'all'), false);
  const i = cornerInsight({ pin: 10, first: 12, n: 3, pocket: 1, untagged: 2 }, { hand: 'right' });
  assert.match(i.lead, /^10 pin alone on 3 of 12 first balls/); assert.ok(!/%/.test(JSON.stringify(i)));
  assert.ok(i.options.length >= 1 && i.options.length <= 3); assert.ok(i.sources.every(s => /^https:\/\//.test(s.url)));
  assert.equal(i.handNote, null); assert.match(i.label, /your frames/); assert.match(i.coachLabel, /not a measurement/);
  const lh = cornerInsight({ pin: 7, first: 40, n: 6, pocket: 0, untagged: 6 }, { scope: 'all', hand: 'left' });
  assert.match(lh.options[1], /left/); assert.match(lh.why, /4 pin/);
  assert.ok(cornerInsight({ pin: 10, first: 12, n: 3, pocket: 0, untagged: 3 }).handNote);
  assert.deepEqual(MIN.night, { n: 3, of: 10 });
});
