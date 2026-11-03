// Me > Tests and usage (Now item 5, docs/PRODUCT_EVAL_1.md §10/§11, docs/SMOKE_TESTS.md). Local feature flags, the three
// smoke tests (S1/S2/S3) and the on-device counters. Nothing is sent anywhere: "Share my usage summary" opens the phone's
// own share sheet (or copies the text) only when the bowler taps it.
import { h, icon, toast, segmented } from '../ui.js';
import { back, go } from '../router.js';
import { ready, proj } from '../hub.js';
import * as UX from '../cc/ux.js';
import { VERSION } from './more.js';
const LABEL = { nights: 'Nights', seasonNights: 'Nights this season', games: 'Games scored', firstBalls: 'First balls logged', balls: 'Balls in the app', lines: 'Lines saved', surface: 'Surface logs', imports: 'Imports', measured: 'Measured rows (LaneTrax)' };
export async function render() {
  await ready();
  const P = proj(), st = UX.load(), redo = () => go('#/me/usage', { replace: true });
  const build = VERSION;
  const sum = UX.summaryOf(st, P, { build });
  const testRow = (k) => {
    const T = UX.TESTS[k], on = !!(st.tests[k] && st.tests[k].on), a = on ? UX.armOf(st, k) : null, F = UX.FLAGS[T.flag];
    return h('div', { class: 'card', 'data-test': k },
      h('h2', { class: 'card-title', text: T.title }),
      h('p', { class: 'small muted', text: on ? `In the test: arm ${a} (${F.names[String(T.arms[a === 'B' ? 1 : 0])]}) since ${sum.tests[k].since}. This phone always gets the same arm.` : 'Not in this test. Joining picks arm A or B for this phone; the counts stay here.' }),
      segmented(T.title, [['off', 'Not in it'], ['on', 'In the test']], on ? 'on' : 'off', v => { UX.setTest(k, v === 'on'); redo(); }));
  };
  const flagRow = (k) => {
    const F = UX.FLAGS[k], t = UX.testFor(k), locked = t && st.tests[t] && st.tests[t].on, v = UX.flagOf(st, k);
    return h('div', { class: 'stack', 'data-flag': k }, h('p', { class: 'small', text: F.label + (locked ? ` (set by ${t.toUpperCase()} while you are in it)` : '') }),
      locked ? h('p', { class: 'small muted', text: F.names[String(v)] }) : segmented(F.label, F.values.map(x => [String(x), F.names[String(x)]]), String(v), s => { UX.setFlag(k, F.values.find(x => String(x) === s)); redo(); }));
  };
  const text = () => JSON.stringify(UX.summaryOf(UX.load(), proj(), { build }), null, 1);
  async function share() {
    const t = text();
    try { if (navigator.share) { await navigator.share({ title: 'Arsenal Pro usage summary', text: t }); UX.count('usage.shared'); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(t); toast('Summary copied. Paste it wherever you like.'); UX.count('usage.shared'); } catch (e) { pre.hidden = false; toast('Copy failed: the summary is shown below.', { kind: 'bad' }); }
  }
  const pre = h('pre', { class: 'small ux-pre', id: 'uxPre', hidden: true, text: text() });
  const counts = Object.entries(sum.counts);
  const el = h('section', { class: 'screen list-screen', id: 'usage' },
    h('header', { class: 'appbar' }, h('button', { class: 'icon-btn', 'aria-label': 'Back to Me', html: icon('back'), onclick: () => back('#/me') }), h('h1', { class: 'title', text: 'Usage' })),
    h('div', { class: 'stack' },
      h('p', { class: 'small', id: 'uxPrivacy', text: 'Counts kept on this phone only. Nothing here is sent, synced or put in your backup. You can share the summary yourself, or reset it.' }),
      ...Object.keys(UX.TESTS).map(testRow),
      h('div', { class: 'card', id: 'uxFlags' }, h('h2', { class: 'card-title', text: 'Features on this phone' }), ...Object.keys(UX.FLAGS).map(flagRow)),
      h('div', { class: 'card', id: 'uxCounts' }, h('h2', { class: 'card-title', text: 'Your counts' }),
        h('ul', { class: 'plain small' }, ...Object.entries(sum.data).map(([k, v]) => h('li', { 'data-k': k }, `${LABEL[k] || k}: ${v}`))),
        counts.length ? h('details', { class: 'ux-fold' }, h('summary', { text: `Taps counted · ${counts.length}` }),
          h('ul', { class: 'plain small', id: 'uxTaps' }, ...counts.map(([k, x]) => h('li', { 'data-c': k }, `${k}: ${x.n} (${x.first} \u2013 ${x.last})`)))) : null,
        h('p', { class: 'small muted', text: `Weaker/Stronger taps followed by 3 shots with that ball: ${['A', 'B', 'none'].map(a => sum.s2[a].taps ? `${a === 'none' ? 'not in S2' : 'arm ' + a} ${sum.s2[a].followed} of ${sum.s2[a].taps}` : null).filter(Boolean).join(' \u00b7 ') || 'none yet'}.` })),
      h('div', { class: 'row gap wrap' },
        h('button', { class: 'btn primary', id: 'uxShare', onclick: share }, 'Share my usage summary'),
        h('button', { class: 'btn ghost', id: 'uxShow', onclick: () => { pre.textContent = text(); pre.hidden = !pre.hidden; } }, 'Show it'),
        h('button', { class: 'btn ghost', id: 'uxReset', onclick: () => { if (confirm('Reset the counts and leave all tests on this phone?')) { UX.reset(); redo(); } } }, 'Reset counts')),
      pre));
  return { el, title: 'Tests and usage' };
}
