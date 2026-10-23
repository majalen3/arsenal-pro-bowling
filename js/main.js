import { restoreState, startSync, deviceId, prefs, profile, rawGet } from './store.js';
import { route, start, go } from './router.js';
import { $, $$, toast, icon } from './ui.js';
// theme: dark (alley) default, light, or system
export function applyTheme(t = prefs().theme || 'dark') {
  const dark = t === 'system' ? matchMedia('(prefers-color-scheme: dark)').matches : t !== 'light';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#0B0F0D' : '#F6F5F0';
}
applyTheme(); matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme());
restoreState(); deviceId();
route(/^\/lane$/, 'lane', () => import('./screens/lane.js'));
route(/^\/arsenal$/, 'arsenal', () => import('./screens/arsenal.js'));
route(/^\/arsenal\/insights$/, 'arsenal', () => import('./screens/insights.js'));
route(/^\/ball\/([\w-]+)$/, 'arsenal', () => import('./screens/ball.js'));
route(/^\/compare$/, 'arsenal', () => import('./screens/compare.js'));
route(/^\/patterns$/, 'patterns', () => import('./screens/patterns.js'));
route(/^\/pattern\/([\w.-]+)$/, 'patterns', () => import('./screens/pattern.js'));
route(/^\/sessions$/, 'sessions', () => import('./screens/sessions.js'));
route(/^\/more$/, 'more', () => import('./screens/more.js'));
route(/^\/welcome$/, null, () => import('./screens/welcome.js'));
route(/^\/import$/, 'more', () => import('./screens/import.js'));
route(/^\/tonight$/, 'tonight', () => import('./screens/tonight.js'));
route(/^\/bag$/, 'tonight', () => import('./screens/bag.js'));
// tab bar / rail
const TABS = [['tonight', 'Tonight'], ['lane', 'Lane'], ['arsenal', 'Arsenal'], ['patterns', 'Patterns'], ['sessions', 'Sessions'], ['more', 'More']];
const nav = $('#tabs');
nav.innerHTML = TABS.map(([k, l]) => `<a class="tab" href="#/${k}" data-tab="${k}">${icon(k)}<span>${l}</span></a>`).join('');
function setTab(t) { $$('.tab', nav).forEach(a => { if (a.dataset.tab === t) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); document.body.dataset.tab = t || 'none'; }
// first run: skippable onboarding (existing v1 users with saved state skip it automatically)
if (!profile() && !prefs().onboarded && !rawGet('ap_state') && !location.hash) history.replaceState(null, '', '#/welcome');
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
