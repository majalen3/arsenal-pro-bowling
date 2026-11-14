// Privacy and Terms pages: they exist, say they are a draft for an attorney, keep the owner's blanks visible, load nothing from
// outside, work offline, and are linked from Me and from first run. They must match what the app actually does.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
const read = f => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const pages = { 'privacy.html': read('privacy.html'), 'terms.html': read('terms.html') };

for (const [f, html] of Object.entries(pages)) {
  test(`${f}: draft banner, owner blanks, no scripts, no outside loads`, () => {
    assert.match(html, /Draft, not legal advice\. Have an attorney review/);
    for (const ph of ['OPERATOR NAME', 'CONTACT EMAIL', 'EFFECTIVE DATE']) assert.ok(html.includes(`[${ph}]`), ph);
    assert.ok(!/<script/i.test(html), 'CSP script-src self and no page needs script');
    assert.ok(!/(src|href)=["']https?:\/\/(?!docs\.github\.com|render\.com)/i.test(html), 'only the two provider policy links go outside');
    assert.ok(!/@[a-z0-9-]+\.(com|org|net)/i.test(html), 'no invented email address');
    assert.match(html, /href="\.\/#\/me"/, 'back link');
    assert.match(html, /name="viewport"/);
  });
}

test('privacy page covers what the app does, plainly', () => {
  const t = pages['privacy.html'].replace(/<[^>]+>/g, ' ');
  for (const k of ['IndexedDB', 'localStorage', 'no cookies', 'GitHub Pages', 'Render', 'backup-code', 'My Team', 'Export my data', 'Delete account and server data', 'under 13', 'no analytics']) assert.ok(new RegExp(k, 'i').test(t), k);
  assert.ok(!/\b(best|worst) (style|bowler)/i.test(t));
});

test('terms page says estimates are estimates and gives no medical advice or style ranking', () => {
  const t = pages['terms.html'].replace(/<[^>]+>/g, ' ');
  assert.match(t, /estimates/i); assert.match(t, /no medical or health advice/i); assert.match(t, /does not rank bowling styles/i);
});

test('linked from Me and from first run, and precached so they open offline', () => {
  const more = read('js/screens/more.js'), wel = read('js/screens/welcome.js'), sw = read('sw.js');
  for (const s of [more, wel]) { assert.ok(s.includes("href:'privacy.html'"), 'privacy link'); assert.ok(s.includes("href:'terms.html'"), 'terms link'); }
  assert.match(wel, /id:'welLegal'/); assert.ok(!/confirmSheet|sheet\(/.test(wel.slice(wel.indexOf('welLegal') - 100, wel.indexOf('welLegal') + 400)), 'one line, not a modal');
  assert.ok(sw.includes("'privacy.html'") && sw.includes("'terms.html'"));
});
