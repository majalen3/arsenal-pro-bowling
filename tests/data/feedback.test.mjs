// First-party feedback core (js/cc/feedback.js): what may leave the phone, the offline queue, the survey cadence, opt-in counts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as F from '../../js/cc/feedback.js';
const root = new URL('../../', import.meta.url);

test('build id matches the service worker cache (v82)', () => {
  const sw = fs.readFileSync(new URL('sw.js', root), 'utf8');
  assert.equal(`arsenal-pro-${F.BUILD}`, /CACHE = '([^']+)'/.exec(sw)[1]);
  for (const f of ['js/feedback.js', 'js/cc/feedback.js', 'js/screens/feedback.js']) assert.ok(sw.includes(`'${f}'`), f + ' precached');
});
test('defaults: usage counts and crash reports are OFF; garbage state parses to defaults', () => {
  const b = F.parse(null); assert.equal(b.usage, false); assert.equal(b.crash, false); assert.deepEqual(b.queue, []);
  assert.equal(F.parse('{"v":1,"usage":"yes","crash":1}').usage, false);
  assert.equal(F.parse('{"v":1,"usage":"yes","crash":1}').crash, false);
  assert.equal(F.parse('{"v":1,"usage":true,"crash":true}').crash, true);
  const q = F.parse(JSON.stringify({ v: 1, queue: [{ t: 'evil', body: {} }, { t: 'feedback', body: { type: 'bug' } }, null], receipts: ['bad', 'A'.repeat(22)] }));
  assert.equal(q.queue.length, 1); assert.deepEqual(q.receipts, ['A'.repeat(22)]);
});
test('route: path shape only; ids, slugs and queries are dropped', () => {
  assert.equal(F.routeOf('#/bag'), '/bag');
  assert.equal(F.routeOf('#/ball/storm-phaze-ii?x=1'), '/ball/:id');
  assert.equal(F.routeOf('#/session/n-2026-11-21'), '/session/:id');
  assert.equal(F.routeOf('#/results?night=abc'), '/results');
  assert.equal(F.routeOf(''), '/');
});
test('device class: phone/tablet/desktop (+ -app when installed), no model or browser string', () => {
  assert.equal(F.deviceClass({ w: 390, h: 844 }), 'phone');
  assert.equal(F.deviceClass({ w: 820, h: 1180, standalone: true }), 'tablet-app');
  assert.equal(F.deviceClass({ w: 1920, h: 1080 }), 'desktop');
});
test('free text: emails, links, phone numbers removed; capped at 1000', () => {
  const t = F.scrubText('call 312-555-0199 or joe@x.com, https://a.b/c?d', 1000);
  assert.doesNotMatch(t, /312|joe@|https/);
  assert.equal(F.scrubText('y'.repeat(3000)).length, F.TEXT_MAX);
  const b = F.feedbackBody({ type: 'rant', text: 'hi', route: '/bag', device: 'phone' });
  assert.equal(b.type, 'idea'); assert.equal(b.build, F.BUILD); assert.equal(b.screenshot, undefined);
});
test('crash report: message and stack scrubbed (quotes, URLs, query strings, long numbers), 12 frames max', () => {
  const err = new TypeError('Cannot read "Joe\'s Phaze II" of undefined at https://majalen3.github.io/x/js/lane.js?v=81:12:3 id 99887766');
  err.stack = 'TypeError: boom\n' + Array.from({ length: 20 }, (_, i) => `    at f${i} (https://majalen3.github.io/arsenal-pro-bowling/js/screens/lane.js?v=81:${i + 1}:5)`).join('\n');
  const r = F.errorReport('error', err, null, { route: '/lane', device: 'phone' });
  assert.doesNotMatch(r.message, /Joe|Phaze|https|\?v=|99887766/);
  assert.match(r.message, /^TypeError: /);
  assert.doesNotMatch(r.stack, /https|\?v=/);
  assert.match(r.stack, /lane\.js:1:5/);
  assert.ok(r.stack.split('\n').length <= 12);
  assert.equal(F.errorReport('rejection', 'plain string reason').message, 'plain string reason');
  assert.equal(F.errorReport('weird', null, 'x').kind, 'error');
});
test('crash gate: each distinct error once, at most 5 per page load', () => {
  const g = F.errorGate(), r = i => ({ kind: 'error', message: 'E' + i, stack: '' });
  assert.equal(g(r(1)), true); assert.equal(g(r(1)), false);
  for (let i = 2; i <= 5; i++) assert.equal(g(r(i)), true);
  assert.equal(g(r(6)), false);
});
test('offline queue: capped at 20, crash reports dropped first, at most 3 screenshots kept', () => {
  const st = F.blank();
  for (let i = 0; i < 5; i++) F.enqueue(st, { t: 'feedback', body: { type: 'bug', text: 'n' + i, screenshot: 'data:image/jpeg;base64,AAAA' } });
  assert.equal(st.queue.filter(q => q.body.screenshot).length, 3);
  assert.equal(st.queue[0].body.screenshot, undefined, 'oldest lose their image first');
  for (let i = 0; i < 10; i++) F.enqueue(st, { t: 'error', body: { kind: 'error', message: 'e' + i } });
  for (let i = 0; i < 10; i++) F.enqueue(st, { t: 'survey', body: { useful: 3 } });
  assert.equal(st.queue.length, F.QUEUE_MAX);
  assert.equal(st.queue.filter(q => q.t === 'feedback').length, 5, 'words the bowler wrote are kept over crash reports');
});
test('survey: due only after 3 finished games and not twice in one night; asking resets', () => {
  const st = F.blank(), t0 = Date.UTC(2026, 10, 21, 2);
  F.gamesFinished(st, 2, t0); assert.equal(st.surveyDue, false);
  F.gamesFinished(st, 1, t0); assert.equal(st.surveyDue, true);
  F.surveyAsked(st, t0); assert.equal(st.surveyDue, false); assert.equal(st.games, 0);
  F.gamesFinished(st, 3, t0 + 3600e3); assert.equal(st.surveyDue, false, 'same night: not asked again');
  F.gamesFinished(st, 3, t0 + 7 * 86400e3); assert.equal(st.surveyDue, true, 'next week');
  assert.equal(F.surveyBody({ useful: 9 }), null);
  assert.deepEqual(F.surveyBody({ useful: 4, note: 'x'.repeat(500), device: 'phone' }).note.length, F.NOTE_MAX);
});
test('usage counts: allow-listed deltas only, starting from the moment of opt-in', () => {
  const c = { 'bag.built': { n: 5 }, 'optimize.used': { n: 2 }, 'help.open': { n: 9 }, 'screen.bag': { n: 30 } };
  const base = F.baseline(c);
  assert.deepEqual(F.usageDeltas(c, base), {}, 'nothing before opt-in is sent');
  c['bag.built'].n = 7; c['help.open'].n = 12; c['game.logged'] = { n: 3 };
  assert.deepEqual(F.usageDeltas(c, base), { 'bag.built': 2, 'game.logged': 3 });
  const st = F.blank(); assert.equal(F.usageReady(st), false, 'off by default');
  st.usage = true; assert.equal(F.usageReady(st, Date.now()), true);
  st.usageAt = Date.now(); assert.equal(F.usageReady(st, Date.now() + 3600e3), false);
});
test('usage keys match the API allow-list', () => {
  for (const k of F.USAGE_KEYS) assert.match(k, /^[a-z0-9.\-]{1,48}$/);
  assert.ok(F.USAGE_KEYS.includes('bag.built') && F.USAGE_KEYS.includes('optimize.used') && F.USAGE_KEYS.includes('game.logged'));
});
