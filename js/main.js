import { restoreState, startSync, deviceId, prefs, profile, rawGet } from './store.js';
import { route, redirect, start, go, setDecorate } from './router.js';
import { helpToggle } from './screens/help.js';
import { $, $$, toast, icon } from './ui.js';
import { listenInstall, isStandalone, askPersist } from './cc/protect.js';
import { applyTextSize } from './cc/wake.js';
import * as PERF from './perf.js';
import * as UX from './cc/ux.js';   // Now item 5: on-device counts only (localStorage ap_ux, never synced)
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
// Lane and Target are tools (no tab of their own): they open from the Stand · Aim chip in the Building and the game, and from Learn.
route(/^\/lane$/, 'tonight', () => import('./screens/lane.js'));
route(/^\/target$/, 'tonight', () => import('./screens/target.js'));
route(/^\/strike$/, 'tonight', () => import('./screens/strike.js'));   // v73: Find my strike line, picture + tiles
route(/^\/arsenal\/insights$/, 'arsenal', () => import('./screens/insights.js'));
route(/^\/arsenal\/sheet$/, 'arsenal', () => import('./screens/export.js'));
route(/^\/ball\/([\w-]+)$/, 'arsenal', () => import('./screens/ball.js'));
route(/^\/compare$/, 'arsenal', () => import('./screens/compare.js'));
route(/^\/add-ball$/, 'arsenal', () => import('./screens/addball.js'));
route(/^\/team$/, 'bag', () => import('./screens/team.js'));
route(/^\/conduct$/, 'bag', () => import('./screens/conduct.js'));
route(/^\/drill-card$/, 'bag', () => import('./screens/drillscan.js'));
route(/^\/me\/drill-card$/, 'me', () => import('./screens/drillscan.js'));
// Bag tab: the bag builder (front door). Arsenal tab: the Armory (#/arsenal; the old #/bag?view=all still renders it under the Arsenal tab).
route(/^\/arsenal$/, 'arsenal', () => import('./screens/arsenal.js'));   // PRODUCT_SPINE: the arsenal manager is its own place (was #/bag?view=all, still works)
route(/^\/bag$/, (p, q) => (q && q.get('view') === 'all' ? 'arsenal' : 'bag'), () => Promise.all([import('./screens/bag.js'), import('./screens/arsenal.js')]).then(([b, a]) => ({ render: o => (o.query && o.query.get('view') === 'all' ? a : b).render(o) })));
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
route(/^\/me\/usage$/, 'me', () => import('./screens/usage.js'));   // Now item 5: local flags, smoke tests, on-device counts
route(/^\/kit$/, 'me', () => import('./screens/kit.js'));
route(/^\/import$/, 'me', () => import('./screens/import.js'));
route(/^\/welcome$/, null, () => import('./screens/welcome.js'));
route(/^\/tonight$/, 'tonight', () => import('./screens/tonight.js'));
route(/^\/bowl$/, 'bowl', () => import('./screens/tonight.js').then(m => ({ render: o => m.render(Object.assign({}, o, { bowl: true })) })));
// Old hashes land on their new home (IA_PLAN §7 P2).
redirect(/^\/building$/, '/bag');   // PRODUCT_SPINE: the old home now opens the front door (tonight's bag)
redirect(/^\/game$/, '/bowl');
redirect(/^\/sessions$/, '/results');

redirect(/^\/more$/, '/me');
redirect(/^\/patterns$/, '/learn/patterns');
// tab bar / rail. HOME_GAME_FLOW (owner 2026-11-10: "the building, then the scoring page should be an in-game page"): the Building
// (#/tonight) is home; scoring (#/bowl) is a focused game page with no tab of its own and no tab bar, entered from the Building.
// PRODUCT_SPINE (owner 2026-11-11, t115/t116: "bag building first, then arsenal manager, then the strike finder, then a log book;
// everything a max three clicks away"): the four tabs ARE the spine, in that order. The Bag (#/bag) is the front door. Strike line
// is the old Building (#/tonight: where, start line, Find my strike line, Lane, Start bowling); scoring (#/bowl) sits inside the night.
// Learn and the Glossary moved off the tab bar: Help "?" and Me (top right) on every spine screen, Learn from Me and from Strike line.
// Click-depth map and exceptions: docs/PRODUCT_SPINE.md.
const TABS = [['bag', 'Bag', 'bag'], ['arsenal', 'Arsenal', 'arsenal'], ['tonight', 'Strike line', 'target'], ['results', 'Log book', 'results']];
const nav = $('#tabs');
nav.innerHTML = TABS.map(([k, l, ic]) => `<a class="tab" href="#/${k}" data-tab="${k}">${icon(ic)}<span>${l}</span></a>`).join('');
function setTab(t) { $$('.tab', nav).forEach(a => { if (a.dataset.tab === t) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); document.body.dataset.tab = t || 'none'; }
// first run: skippable onboarding (existing v1 users with saved state skip it automatically)
if (!profile() && !prefs().onboarded && !rawGet('ap_state') && !location.hash) history.replaceState(null, '', '#/welcome');
// Owner bug 2026-10-24 ("the help feature does nothing, I can't find any '?'"): a "?" switch in every app bar (not Welcome).
// HOME_GAME_FLOW v70: Lane and Target opened from the game page stay "in the game": no tab bar, no Help or Me, one "<- Game" button.
// The game context starts on #/bowl (or a ?game=1 deep link to Lane/Target) and ends on any other screen. Opened from the Building
// or Learn, Lane and Target keep the normal tab bar.
const GAME_CTX = 'ap_game_ctx', GAME_TOOLS = new Set(['/lane', '/target']);
let firstDecor = true;
function gameContext(path) {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  // A fresh visit straight to Lane/Target is out of the game; a reload of an in-game tool stays in it.
  if (firstDecor) { firstDecor = false; const nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
    if (GAME_TOOLS.has(path) && q.get('game') !== '1' && nav.type !== 'reload') sessionStorage.removeItem(GAME_CTX); }
  if (path === '/bowl' || (GAME_TOOLS.has(path) && q.get('game') === '1')) sessionStorage.setItem(GAME_CTX, '1');
  else if (!GAME_TOOLS.has(path)) sessionStorage.removeItem(GAME_CTX);
  return GAME_TOOLS.has(path) && sessionStorage.getItem(GAME_CTX) === '1';
}
setDecorate((el, path) => {
  UX.count('screen.' + (path.split('/')[1] || 'tonight'));
  const inGame = gameContext(path);
  document.body.toggleAttribute('data-ingame', inGame);
  if (inGame) {   // in-game tool: its own bar keeps only the tool's controls plus the way back to the game
    const bar = el.querySelector('.appbar');
    if (bar && !bar.querySelector('#gameBack')) {
      const gb = Object.assign(document.createElement('a'), { className:'btn ghost sm game-back', id:'gameBack', href:'#/bowl', textContent:'\u2190 Game' });
      gb.setAttribute('aria-label', 'Back to the game');
      const acts = path === '/lane' && bar.querySelector('.appbar-actions');   // Lane: beside its tools, so the ball header keeps its row
      if (acts) acts.prepend(gb); else bar.prepend(gb);
    }
    return;
  }
  if (path === '/welcome' || path === '/bowl' || location.hash.startsWith('#/bowl')) return;   // the game page keeps only its own Leave button (no Help, no Me)
  const bar = el.querySelector('.appbar'); if (!bar || bar.querySelector('#helpToggle')) return;
  const t = helpToggle(() => go(location.hash || '#/tonight', { replace:true })), acts = bar.querySelector('.appbar-actions');
  if (acts) acts.prepend(t); else bar.append(t);
  // IA P2: "Me" (profile and settings) top-right on every screen; it replaces the More tab.
  if (path !== '/me') { const me = Object.assign(document.createElement('a'), { className:'icon-btn me-btn', id:'meBtn', href:'#/me', innerHTML:icon('me') }); me.setAttribute('aria-label', 'Me: profile and settings'); t.after(me); }
});
// Do not preload Lane + Tonight + their model tools on every Me/Welcome visit.
// These same-origin hints shorten the selected route's graph without fetching unrelated screens.
const routePreloads = { __proto__:null,
  '/me':['screens/more','screens/account','screens/community','cc/community','cc/card'],
  '/welcome':['screens/welcome','cc/addball','data/spec_catalog','data/match','cc/ownership'],
  '/tonight':['screens/tonight','cc/quicklog','cc/rank','cc/model','cc/advisor','cc/bag','cc/target','patdata','cc/line','cc/status','cc/bagedit','cc/card','screens/gametotal'],
  '/arsenal':['screens/bag','screens/arsenal','cc/rank','cc/model','cc/armory','cc/bag','cc/status'],
  '/bag':['screens/bag','screens/arsenal','cc/rank','cc/model','cc/armory','cc/bag','cc/target','cc/status','cc/bagedit','cc/advisor'],
  '/lane':['screens/lane','lane','deck','ctl','labels','screens/pickers'],
  '/target':['screens/target','lane','ctl','cc/target'],
  '/strike':['screens/strike','cc/strikeline','cc/target','cc/line'],
  '/results':['screens/sessions','cc/card'], '/learn':['screens/learn']
};
const initialPath = location.hash.replace(/^#/, '').split('?')[0] || '/bag';
for (const name of routePreloads[initialPath === '/bowl' ? '/tonight' : initialPath] || []) {
  const link = document.createElement('link'); link.rel = 'modulepreload'; link.href = 'js/' + name + '.js'; document.head.append(link);
}
PERF.mark('main.evaluated');
const firstScreen = start($('#view'), setTab);
startSync();
// v1 event log opens after first paint (IndexedDB; never blocks the lane)
import('./hub.js').then(m => m.ready()).catch(e => console.error(e));
// service worker with prompt-to-update
if ('serviceWorker' in navigator && /^https:|^http:\/\/localhost/.test(location.protocol + '//' + location.host)) {
  // Bulk offline caching starts after the actual first screen paints, not while
  // route modules and privacy controls compete for a cold connection.
  firstScreen.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    .then(() => navigator.serviceWorker.register('sw.js')).then(reg => {
    const prompt = w => { if (document.querySelector('#qlPad')) return; toast('A new version is ready.', { ms:15000, action:{ label:'Refresh', run:() => w.postMessage('skip') } }); };
    if (reg.waiting && navigator.serviceWorker.controller) prompt(reg.waiting);
    reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) prompt(w); }); });
  }).catch(() => {});
  const hadCtl = !!navigator.serviceWorker.controller; let reloaded = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded || !hadCtl) return; reloaded = true; location.reload(); });
}
window.addEventListener('offline', () => toast('Offline. Saved data and cached tools work; optional sync waits for a connection.'));
