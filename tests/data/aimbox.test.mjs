import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../../js/cc/aimbox.js';
import { boardToX, LW, FOUL_Y, PX_FT } from '../../js/engine.js';
const pt = (b, ft) => ({ x: boardToX(b, LW), y: FOUL_Y - ft * PX_FT });
test('off renders nothing', () => { assert.equal(A.boxOf({}, 'house'), null); assert.equal(A.boxOf({ on: false, preset: 'custom' }, 'sport'), null); assert.equal(A.through(null, [pt(7, 45), pt(7, 46)]), false); });
test('house preset is Baker 4.5-9.5 at 45 ft; sport is Rule of 31 starting point', () => {
  const h = A.boxOf({ on: true }, 'house'); assert.deepEqual([h.b1, h.b2, h.ft1, h.ft2, h.from], [4.5, 9.5, 43.5, 46.5, 'baker']);
  const s = A.boxOf({ on: true }, 'shark'); assert.deepEqual([s.b1, s.b2, s.ft1, s.ft2, s.from], [12.5, 15.5, 47, 49, 'r31']);
  const c = A.boxOf({ on: true, preset: 'custom', b1: 6, b2: 10, ft: 44, depth: 4 }, 'house'); assert.deepEqual([c.b1, c.b2, c.ft1, c.ft2], [6, 10, 42, 46]);
});
test('intersection: through, beside, and a sparse path crossing the band', () => {
  const b = A.boxOf({ on: true, preset: 'house' }, 'house');
  assert.equal(A.through(b, [pt(12, 0), pt(7, 45), pt(17.5, 60)]), true);
  assert.equal(A.through(b, [pt(12, 0), pt(14, 45), pt(17.5, 60)]), false);
  assert.equal(A.through(b, [pt(7, 40), pt(7, 50)]), true);   // no sample inside the band, crosses it
  assert.equal(A.through(b, [pt(2, 40), pt(2, 50)]), false);
});
test('mirroring: lefty rect is the reflection of the righty rect', () => {
  const b = A.boxOf({ on: true }, 'house'), W = 200, fy = f => 600 - f * 10;
  const r = A.rectOf(b, x => x * 5, fy), l = A.rectOf(b, x => W - x * 5, fy);
  assert.equal(l.w, r.w); assert.equal(l.x, W - (r.x + r.w)); assert.equal(l.y, r.y);
});
test('persistence: the pref object round-trips through JSON (prefs storage)', () => {
  const p = { on: true, preset: 'custom', b1: 5, b2: 9, ft: 44, depth: 3 };
  assert.deepEqual(A.boxOf(JSON.parse(JSON.stringify(p)), 'house'), A.boxOf(p, 'house'));
});
