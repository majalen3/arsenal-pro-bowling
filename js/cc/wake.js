// GAP (d): keep the screen awake only while a game is open (Screen Wake Lock API; Safari incl. iOS Home Screen apps from 18.4,
// WebKit bug 254545 / MDN). Released at the final frame, when leaving Tonight, or after 10 idle minutes (GAP_REVIEW_1 §5 #4).
export const IDLE_MS = 10 * 60 * 1000;
let lock = null, wanted = false, timer = null, hooked = false;
export const supported = () => typeof navigator !== 'undefined' && !!(navigator.wakeLock && navigator.wakeLock.request);
export const held = () => !!lock;
async function acquire() {
  if (!supported() || lock || document.visibilityState !== 'visible') return;
  try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } catch (_) { lock = null; }
}
function drop() { if (lock) { try { lock.release(); } catch (_) {} } lock = null; }
// Call on every Tonight draw: on = a game is open and the setting allows it. Each call while on counts as activity.
export function keepAwake(on) {
  wanted = !!on; clearTimeout(timer);
  if (!wanted) { drop(); return; }
  if (!hooked) { hooked = true; document.addEventListener('visibilitychange', () => { if (wanted && document.visibilityState === 'visible') acquire(); }); }
  acquire(); timer = setTimeout(() => { wanted = false; drop(); }, IDLE_MS);
}
// Pure: should we hold the lock? (pref default on; only while a game is open)
export const shouldHold = (gameOpen, pref) => !!gameOpen && pref !== false;
// Text size: rem-based scale on <html>. Normal 100%, Large 112.5%, Extra large 125% (WCAG 1.4.4 resize text).
export const TEXT_SIZES = { normal: '100%', large: '112.5%', xl: '125%' };
export function applyTextSize(v) { const k = TEXT_SIZES[v] ? v : 'normal'; document.documentElement.dataset.text = k; return k; }
