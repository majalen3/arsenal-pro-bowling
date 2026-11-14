// Share cards (owner 2026-10-31, tactic 2): drawn on this phone, never posted for you. Share sheet when the phone has one,
// else a PNG download. Three cards share one frame: the bag card (js/screens/export.js), Old Friends and Season Wrapped.
// Non-evaluative: counts and the bowler's own words; no averages, no "best", no comparisons.
import { toast } from '../ui.js';
export const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif';
export const W = 1080, H = 1350, PAD = 72;
// v79: share cards wear the chosen look's brand pair (css/app.css (THEME TOKENS block) --brand / --brand-hi); frame() refreshes them, so a theme change shows on the next card.
export let GREEN = '#0F4D34', GOLD = '#DAAF37';
function brandColors() { const cs = getComputedStyle(document.documentElement); GREEN = cs.getPropertyValue('--brand').trim() || GREEN; GOLD = cs.getPropertyValue('--brand-hi').trim() || GOLD; }
export function fit(ctx, t, w) { t = String(t || ''); if (ctx.measureText(t).width <= w) return t; while (t.length > 1 && ctx.measureText(t + '\u2026').width > w) t = t.slice(0, -1); return t + '\u2026'; }
// Header band (eyebrow + title), subtitle, footer with the app name and a source note. Returns the 2d context.
export function frame(canvas, { eyebrow, title, sub, note }) {
  brandColors(); canvas.width = W; canvas.height = H; const c = canvas.getContext('2d');
  c.fillStyle = GREEN; c.fillRect(0, 0, W, H);
  c.fillStyle = '#000'; c.fillRect(0, 0, W, 210); c.fillStyle = GOLD; c.fillRect(0, 210, W, 8);
  c.textBaseline = 'alphabetic'; c.fillStyle = GOLD; c.font = `800 34px ${FONT}`; c.fillText(fit(c, String(eyebrow || '').toUpperCase(), W - 2 * PAD), PAD, 92);
  c.fillStyle = '#fff'; c.font = `800 64px ${FONT}`; c.fillText(fit(c, title, W - 2 * PAD), PAD, 170);
  if (sub) { c.font = `600 30px ${FONT}`; c.fillStyle = 'rgba(255,255,255,.82)'; c.fillText(fit(c, sub, W - 2 * PAD), PAD, 280); }
  c.fillStyle = '#000'; c.fillRect(0, H - 96, W, 96); c.fillStyle = GOLD; c.font = `700 28px ${FONT}`; c.fillText('Arsenal Pro', PAD, H - 38);
  if (note) { c.fillStyle = 'rgba(255,255,255,.7)'; c.font = `500 24px ${FONT}`; const n = fit(c, note, W - 2 * PAD - 220); c.fillText(n, W - PAD - c.measureText(n).width, H - 38); }
  return c;
}
export function panel(c, x, y, w, hh) { c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.roundRect ? c.roundRect(x, y, w, hh, 22) : c.rect(x, y, w, hh); c.fill(); }
export function orb(c, x, y, r, color) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = color || '#6b7a72'; c.fill(); c.lineWidth = 4; c.strokeStyle = GOLD; c.stroke(); }
const pl = (n, s) => `${n} ${s}${n === 1 ? '' : 's'}`;

// Old Friends: the retired balls with the games you bowled together and the milestones they earned. No averages.
export function drawOldFriends(m, canvas = document.createElement('canvas')) {
  const list = m.hall || [];
  const c = frame(canvas, { eyebrow: 'Old Friends', title: (m.name ? m.name + '\u2019s ' : 'My ') + 'retired friends', sub: list.length ? `${pl(list.length, 'ball')} on the shelf` : '', note: 'Games from the bowler\u2019s own log' });
  const shown = list.slice(0, 6), rowH = 148, top = 330;
  if (!shown.length) { c.fillStyle = '#fff'; c.font = `600 40px ${FONT}`; c.fillText('No retired balls yet.', PAD, top + 80); }
  shown.forEach((r, i) => {
    const y = top + i * rowH, cy = y + 62, x = PAD + 112, w = W - x - PAD;
    panel(c, PAD - 16, y, W - 2 * PAD + 32, rowH - 18); orb(c, PAD + 44, cy, 40, r.color);
    c.fillStyle = '#fff'; c.font = `800 40px ${FONT}`; c.fillText(fit(c, r.name, w), x, cy - 8);
    c.fillStyle = GOLD; c.font = `600 28px ${FONT}`; c.fillText(fit(c, [r.brand, r.added ? 'with you since ' + r.added : ''].filter(Boolean).join(' \u00b7 ') || 'An old friend', w), x, cy + 30);
    const line = [r.games ? pl(r.games, 'game') + ' together' : '', ...(r.earned || []).filter(e => e.id !== 'g200').map(e => e.text)].filter(Boolean).join(' \u00b7 ');
    if (line) { c.fillStyle = 'rgba(255,255,255,.78)'; c.font = `500 26px ${FONT}`; c.fillText(fit(c, line, w), x, cy + 64); }
  });
  if (list.length > shown.length) { c.fillStyle = '#fff'; c.font = `600 30px ${FONT}`; c.fillText(`+ ${list.length - shown.length} more`, PAD, top + shown.length * rowH + 30); }
  return canvas;
}
// Season Wrapped: plain counts (js/cc/community.js wrappedLines). Rates only with MIN_SHOTS chances.
export function drawWrapped(w, lines, { name = null } = {}, canvas = document.createElement('canvas')) {
  const c = frame(canvas, { eyebrow: 'Season Wrapped', title: (name ? name + '\u2019s ' : 'My ') + w.season, sub: `${w.from} to ${w.to}`, note: 'Counts from the bowler\u2019s own log' });
  if (!lines.length) { c.fillStyle = '#fff'; c.font = `600 40px ${FONT}`; c.fillText('No nights logged this season yet.', PAD, 410); return canvas; }
  const top = 330, rowH = 112, shown = lines.slice(0, 8);
  shown.forEach(([k, v], i) => {
    const y = top + i * rowH; panel(c, PAD - 16, y, W - 2 * PAD + 32, rowH - 16);
    c.fillStyle = GOLD; c.font = `700 26px ${FONT}`; c.fillText(fit(c, k.toUpperCase(), W - 2 * PAD), PAD + 8, y + 38);
    c.fillStyle = '#fff'; c.font = `800 38px ${FONT}`; c.fillText(fit(c, v, W - 2 * PAD - 16), PAD + 8, y + 82);
  });
  return canvas;
}
// Share sheet with the PNG when the phone supports files; otherwise download it. Never posts anywhere by itself.
export async function sharePng(canvas, name, title, savedMsg = 'Card saved as an image.') {
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png')); if (!blob) { toast('Could not draw the card.', { kind: 'bad' }); return 'failed'; }
  const file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast(savedMsg); return 'saved';
}
