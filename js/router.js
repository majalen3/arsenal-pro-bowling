// Hash router (IA P2): #/tonight, #/bowl, #/results, #/bag, #/learn, #/me, tools #/lane and #/target, details (#/ball/:id, #/session/:id, #/pattern/:slug, ...). Old hashes redirect.
// Browser/Android back works through history; sheets push a history entry so back closes them first.
import { nav, topSheet, closeAllSheets, $ } from './ui.js';
const routes = [];
let cur = null, latest = null, first = true, mountEl = null, onTab = null, decorate = null, popped = false, scrollT = 0;
try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) { /* older browsers */ }
// Called after every screen mounts (main.js adds the top-bar Help "?" switch).
export function setDecorate(fn) { decorate = fn; }
export function route(re, tab, load) { routes.push({ re, tab, load }); }
// IA P2: old hashes land on their new home (replace, so Back does not bounce). to: '/new' or '/new?k=v' (merged with the old query).
const redirects = [];
export function redirect(re, to) { redirects.push({ re, to }); }
// A screen that swaps its own hash (Tonight -> Bowl while a game is open) re-marks the tab.
export function retab(t) { if (cur) cur.tab = t; onTab && onTab(t); }
export function go(hash, { replace = false } = {}) {
  if (nav.pending) { nav.queued = { hash, replace }; return; }
  if (replace) { history.replaceState(null, '', hash); render(); }
  else if (location.hash === hash) render(); else location.hash = hash;
}
export function back(fallback = '#/lane') { if (sessionStorage.getItem('ap_nav')) history.back(); else go(fallback, { replace:true }); }
export const current = () => cur;
export function start(el, tabCb) {
  mountEl = el; onTab = tabCb;
  window.addEventListener('popstate', () => {
    if (nav.pending) { nav.pending--; if (!nav.pending && nav.queued) { const q = nav.queued; nav.queued = null; setTimeout(() => go(q.hash, q)); } return; }
    if (topSheet()) { topSheet().close(true); return; }
    popped = true;   // Back/Forward: the next render puts the list back where it was
  });
  // Each history entry remembers its scroll (in history.state), so Back to a long list (Results -> a night -> Back) keeps the position.
  window.addEventListener('scroll', () => { clearTimeout(scrollT); scrollT = setTimeout(() => {
    try { history.replaceState(Object.assign({}, history.state, { y: Math.round(scrollY) }), ''); } catch (e) {} }, 120); }, { passive: true });
  window.addEventListener('hashchange', () => { clearTimeout(scrollT); sessionStorage.setItem('ap_nav', '1'); if (topSheet()) closeAllSheets(true); render(); });
  return render();
}
async function render() {
  const raw = location.hash.replace(/^#/, '') || '/bag';   // PRODUCT_SPINE (owner 2026-11-11): the front door is packing tonight's bag
  let [path, qs] = raw.split('?'); let query = new URLSearchParams(qs || '');
  const rd = redirects.find(x => x.re.test(path));
  if (rd) {
    const [to, tq] = rd.to.split('?'); new URLSearchParams(tq || '').forEach((v, k) => { if (!query.has(k)) query.set(k, v); });
    path = path.replace(rd.re, to); const q = query.toString();
    history.replaceState(null, '', '#' + path + (q ? '?' + q : ''));
  }
  let m = null, r = routes.find(x => (m = path.match(x.re)));
  if (!r) { r = routes.find(x => x.re.test('/bag')) || routes[0]; m = ['/bag']; }
  const token = {}; latest = token;
  const mod = await r.load();
  if (latest !== token) return;
  const tab = typeof r.tab === 'function' ? r.tab(path, query) : r.tab;   // a route may pick its tab from the query (#/bag?view=all = Arsenal)
  const prev = cur; cur = { token, tab, path };
  const scr = await mod.render({ params:m.slice(1).map(decodeURIComponent), query });
  if (latest !== token) { scr.destroy && scr.destroy(); return; }
  if (prev && prev.scr && prev.scr.destroy) prev.scr.destroy();
  cur.scr = scr;
  mountEl.replaceChildren(scr.el);
  if (decorate) { try { decorate(scr.el, path); } catch (e) { console.error(e); } }
  document.title = scr.title ? `${scr.title} · Arsenal Pro` : 'Arsenal Pro';
  onTab && onTab(tab);
  const back = popped && history.state && history.state.y > 0 ? history.state.y : 0; popped = false;
  if (back) requestAnimationFrame(() => { scrollTo(0, back); if (Math.abs(scrollY - back) > 2) setTimeout(() => scrollTo(0, back), 150); });
  // owner t126u (iPhone: "we can never see the top of the page"): Safari restored the old scroll offset on load and on hash
  // changes. Every route now opens at the top (scrollRestoration is manual; Back still returns to where you were).
  if (first && !back) { window.scrollTo(0, 0); requestAnimationFrame(() => window.scrollTo(0, 0)); }
  if (!first) { if (!back) { window.scrollTo(0, 0); requestAnimationFrame(() => { if (scrollY) window.scrollTo(0, 0); }); } const hd = scr.el.querySelector('h1'); if (hd) { hd.tabIndex = -1; hd.focus({ preventScroll:true }); } }
  first = false;
  scr.mounted && scr.mounted();
}
