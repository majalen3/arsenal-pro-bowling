// Hash router: #/lane, #/arsenal, #/arsenal/insights, #/ball/:id, #/compare?ids=a,b, #/patterns, #/pattern/:slug, #/sessions, #/more, #/welcome
// Browser/Android back works through history; sheets push a history entry so back closes them first.
import { nav, topSheet, closeAllSheets, $ } from './ui.js';
const routes = [];
let cur = null, latest = null, first = true, mountEl = null, onTab = null, decorate = null;
// Called after every screen mounts (main.js adds the top-bar Help "?" switch).
export function setDecorate(fn) { decorate = fn; }
export function route(re, tab, load) { routes.push({ re, tab, load }); }
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
  });
  window.addEventListener('hashchange', () => { sessionStorage.setItem('ap_nav', '1'); if (topSheet()) closeAllSheets(true); render(); });
  render();
}
async function render() {
  const raw = location.hash.replace(/^#/, '') || '/tonight';   // Tonight is the home screen (GAP §2c: don't open on Lane)
  const [path, qs] = raw.split('?'); const query = new URLSearchParams(qs || '');
  let m = null, r = routes.find(x => (m = path.match(x.re)));
  if (!r) { r = routes.find(x => x.re.test('/tonight')) || routes[0]; m = ['/tonight']; }
  const token = {}; latest = token;
  const mod = await r.load();
  if (latest !== token) return;
  const prev = cur; cur = { token, tab:r.tab, path };
  const scr = await mod.render({ params:m.slice(1).map(decodeURIComponent), query });
  if (latest !== token) { scr.destroy && scr.destroy(); return; }
  if (prev && prev.scr && prev.scr.destroy) prev.scr.destroy();
  cur.scr = scr;
  mountEl.replaceChildren(scr.el);
  if (decorate) { try { decorate(scr.el, path); } catch (e) { console.error(e); } }
  document.title = scr.title ? `${scr.title} · Arsenal Pro` : 'Arsenal Pro';
  onTab && onTab(r.tab);
  if (!first) { window.scrollTo(0, 0); const hd = scr.el.querySelector('h1'); if (hd) { hd.tabIndex = -1; hd.focus({ preventScroll:true }); } }
  first = false;
  scr.mounted && scr.mounted();
}
