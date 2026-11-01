import { restoreState, startSync, deviceId, prefs, profile, rawGet } from './store.js';
import { route, redirect, start, go, setDecorate } from './router.js';
import { helpToggle } from './screens/help.js';
import { $, $$, toast, icon } from './ui.js';
import { listenInstall, isStandalone, askPersist } from './cc/protect.js';
import { applyTextSize } from './cc/wake.js';
// theme: dark (alley) default, light, or system
export function applyTheme(t = prefs().theme || 'dark') {
  const dark = t === 'system' ? matchMedia('(prefers-color-scheme: dark)').matches : t !== 'light';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#0B0F0D' : '#F6F5F0';
}
applyTextSize(prefs().textSize); applyTheme(); matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme());
restoreState(); deviceId();
// GAP (a): keep the install offer for later (shown once after the first saved game, never mid-game). Installed apps ask for persistent storage at boot (no prompt there).
listenInstall(); if (isStandalone()) askPersist();
// IA P2 (owner 2026-10-31: "Do the 5-tab layout but keep Help off by default"): Tonight / Bowl / Results / Bag / Learn, Me in the top bar.
// Lane and Target are tools (no tab of their own): they open from the Stand · Aim chip on Tonight and Bowl, and from Learn.
route(/^\/lane$/, 'lane', () => import('./screens/lane.js'));
route(/^\/target$/, 'lane', () => import('./screens/target.js'));
route(/^\/arsenal\/insights$/, 'bag', () => import('./screens/insights.js'));
route(/^\/arsenal\/sheet$/, 'bag', () => import('./screens/export.js'));
route(/^\/ball\/([\w-]+)$/, 'bag', () => import('./screens/ball.js'));
route(/^\/compare$/, 'bag', () => import('./screens/compare.js'));
route(/^\/add-ball$/, 'bag', () => import('./screens/addball.js'));
route(/^\/team$/, 'bag', () => import('./screens/team.js'));
route(/^\/conduct$/, 'bag', () => import('./screens/conduct.js'));
route(/^\/drill-card$/, 'bag', () => import('./screens/drillscan.js'));
route(/^\/me\/drill-card$/, 'me', () => import('./screens/drillscan.js'));
// Bag tab: the bag builder first; "All my balls" (the Armory and catalog) is a view of the same tab (#/bag?view=all).
route(/^\/bag$/, 'bag', () => Promise.all([import('./screens/bag.js'), import('./screens/arsenal.js')]).then(([b, a]) => ({ render: o => (o.query && o.query.get('view') === 'all' ? a : b).render(o) })));
route(/^\/learn$/, 'learn', () => import('./screens/learn.js'));
route(/^\/learn\/patterns$/, 'learn', () => import('./screens/patterns.js'));
route(/^\/pattern\/([\w.-]+)$/, 'learn', () => import('./screens/pattern.js'));
route(/^\/glossary$/, 'learn', () => import('./screens/help.js'));
route(/^\/guide$/, 'learn', () => import('./screens/help.js'));
route(/^\/results$/, 'results', () => import('./screens/sessions.js'));
route(/^\/session\/([\w.%-]+)$/, 'results', () => import('./screens/session.js'));
route(/^\/card$/, 'results', () => import('./screens/card.js'));
route(/^\/wrapped$/, 'results', () => import('./screens/wrapped.js'));
route(/^\/me$/, 'me', () => import('./screens/more.js'));
route(/^\/kit$/, 'me', () => import('./screens/kit.js'));
route(/^\/import$/, 'me', () => import('./screens/import.js'));
route(/^\/welcome$/, null, () => import('./screens/welcome.js'));
route(/^\/tonight$/, 'tonight', () => import('./screens/tonight.js'));
route(/^\/bowl$/, 'bowl', () => import('./screens/tonight.js').then(m => ({ render: o => m.render(Object.assign({}, o, { bowl: true })) })));
// Old hashes land on their new home (IA_PLAN §7 P2).
redirect(/^\/sessions$/, '/results');
redirect(/^\/arsenal$/, '/bag?view=all');
redirect(/^\/more$/, '/me');
redirect(/^\/patterns$/, '/learn/patterns');
// tab bar / rail
const TABS = [['tonight', 'Tonight'], ['bowl', 'Bowl'], ['results', 'Results'], ['bag', 'Bag'], ['learn', 'Learn']];
const nav = $('#tabs');
nav.innerHTML = TABS.map(([k, l]) => `<a class="tab" href="#/${k}" data-tab="${k}">${icon(k)}<span>${l}</span></a>`).join('');
function setTab(t) { $$('.tab', nav).forEach(a => { if (a.dataset.tab === t) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); document.body.dataset.tab = t || 'none'; }
// first run: skippable onboarding (existing v1 users with saved state skip it automatically)
if (!profile() && !prefs().onboarded && !rawGet('ap_state') && !location.hash) history.replaceState(null, '', '#/welcome');
// Owner bug 2026-10-24 ("the help feature does nothing, I can't find any '?'"): a "?" switch in every app bar (not Welcome).
setDecorate((el, path) => {
  if (path === '/welcome') return;
  const bar = el.querySelector('.appbar'); if (!bar || bar.querySelector('#helpToggle')) return;
  const t = helpToggle(() => go(location.hash || '#/tonight', { replace:true })), acts = bar.querySelector('.appbar-actions');
  if (acts) acts.prepend(t); else bar.append(t);
  // IA P2: "Me" (profile and settings) top-right on every screen; it replaces the More tab.
  if (path !== '/me') { const me = Object.assign(document.createElement('a'), { className:'icon-btn me-btn', id:'meBtn', href:'#/me', innerHTML:icon('me') }); me.setAttribute('aria-label', 'Me: profile and settings'); t.after(me); }
});
start($('#view'), setTab);
startSync();
// v1 event log opens after first paint (IndexedDB; never blocks the lane)
import('./hub.js').then(m => m.ready()).catch(e => console.error(e));
// service worker with prompt-to-update
if ('serviceWorker' in navigator && /^https:|^http:\/\/localhost/.test(location.protocol + '//' + location.host)) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    const prompt = w => toast('A new version is ready.', { ms:15000, action:{ label:'Refresh', run:() => w.postMessage('skip') } });
    if (reg.waiting && navigator.serviceWorker.controller) prompt(reg.waiting);
    reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) prompt(w); }); });
  }).catch(() => {});
  const hadCtl = !!navigator.serviceWorker.controller; let reloaded = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded || !hadCtl) return; reloaded = true; location.reload(); });
}
window.addEventListener('offline', () => toast('Offline. Everything still works; changes sync later.'));
