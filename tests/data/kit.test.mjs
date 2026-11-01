// Pro shop kit (2026-10-31): every catalogue ball gets a code whose link round-trips to the same entry; the vendored
// encoder makes a valid symbol for the longest live link.
import test from 'node:test'; import assert from 'node:assert/strict';
import qrcode from '../../js/vendor/qrcode.js';
import { kitUrl, catFromHash, KIT_MAX } from '../../js/cc/kit.js';
import * as A from '../../js/cc/addball.js';
const LIVE = 'https://majalen3.github.io/arsenal-pro-bowling/';
test('kit link round-trips every catalogue id to its entry', () => {
  const all = A.catalog(); assert.ok(all.length > 50);
  for (const e of all) { const u = kitUrl(e.id, LIVE); assert.equal(A.entryById(catFromHash(u.split('#')[1])), e); }
  assert.equal(catFromHash('#/add-ball'), null); assert.equal(catFromHash('/add-ball?q=x&cat=a%20b'), 'a b');
  assert.equal(KIT_MAX, 24);
});
test('vendored qrcode-generator encodes the longest kit link at level M', () => {
  const longest = A.catalog().map(e => kitUrl(e.id, LIVE)).sort((a, b) => b.length - a.length)[0];
  const q = qrcode(0, 'M'); q.addData(longest); q.make();
  const n = q.getModuleCount(); assert.ok(n >= 21 && n <= 57, `module count ${n}`);
  for (const [y, x] of [[0, 0], [0, n - 1], [n - 1, 0]]) assert.equal(q.isDark(y, x), true, 'finder corner is dark');
});
