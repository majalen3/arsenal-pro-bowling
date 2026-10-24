// UI kit: element helper, icons, bottom sheet, toast (with undo), confirm, segmented, stepper.
export const $ = (s, r=document) => r.querySelector(s);
export const $$ = (s, r=document) => [...r.querySelectorAll(s)];
export function h(tag, attrs={}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith('--')) e.style.setProperty(sk, sv); else e.style[sk] = sv; }
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}
const P = {
  lane:'<path d="M8 3h8l2 18H6L8 3z"/><path d="M12 3v18" opacity=".45"/><circle cx="12" cy="7" r="1.3" fill="currentColor" stroke="none"/>',
  arsenal:'<circle cx="12" cy="12" r="8.5"/><circle cx="10" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="13.5" cy="8.4" r="1" fill="currentColor" stroke="none"/><circle cx="12.4" cy="11.6" r="1" fill="currentColor" stroke="none"/>',
  patterns:'<path d="M4 20V10M9 20V5M14 20v-8M19 20V8"/>',
  sessions:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  tonight:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  more:'<circle cx="6" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18" cy="12" r="1.4" fill="currentColor"/>',
  tune:'<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  save:'<path d="M6 3h12v18l-6-4-6 4V3z"/>', saved:'<path d="M6 3h12v18l-6-4-6 4V3z" fill="currentColor"/>',
  down:'<path d="M6 9l6 6 6-6"/>', back:'<path d="M15 5l-7 7 7 7"/>', close:'<path d="M6 6l12 12M18 6L6 18"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>', check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  left:'<path d="M14 6l-6 6 6 6"/>', right:'<path d="M10 6l6 6-6 6"/>', up:'<path d="M6 14l6-6 6 6"/>', downArrow:'<path d="M6 10l6 6 6-6"/>',
  compare:'<path d="M8 4v16M16 4v16M4 8h8M12 16h8"/>', plus:'<path d="M12 5v14M5 12h14"/>', target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>', minus:'<path d="M5 12h14"/>',
  trash:'<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>', edit:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/>', info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v6M12 7.5v.5"/>',
  sync:'<path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3M18 3v4h-4M6 21v-4h4"/>', cloudOff:'<path d="M3 3l18 18M7 18h10a4 4 0 0 0 1.3-7.8A6 6 0 0 0 8 8"/>',
  star:'<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6L12 4z"/>', bag:'<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  undo:'<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12" transform="translate(0 -6)"/>', sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
};
export const icon = (n, cls='') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${P[n]||''}</svg>`;

export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- toast
let toastT = null;
export function toast(msg, opts={}) {
  const host = $('#toast'); host.innerHTML = '';
  const t = h('div', { class:'toast ' + (opts.kind || '') , role:'status' }, h('span', { class:'toast-msg', text:msg }));
  if (opts.action) t.append(h('button', { class:'toast-act', onclick:() => { hide(); opts.action.run(); } }, opts.action.label));
  host.append(t); requestAnimationFrame(() => t.classList.add('in'));
  clearTimeout(toastT); const hide = () => { t.classList.remove('in'); setTimeout(() => t.remove(), 220); };
  toastT = setTimeout(hide, opts.ms || (opts.action ? 5000 : 2600));
}

// ---- bottom sheet (modal dialog, focus-trapped, Esc / scrim / back closes)
let sheetStack = [];
export const nav = { pending:0, queued:null };
export function sheet({ title, body, onClose, wide=false, id='' }) {
  const prev = document.activeElement;
  const scrim = h('div', { class:'scrim' });
  const panel = h('div', { class:'sheet' + (wide ? ' wide' : ''), role:'dialog', 'aria-modal':'true', 'aria-label':title, id:id||null, tabindex:'-1' },
    h('div', { class:'sheet-grab', 'aria-hidden':'true' }),
    h('div', { class:'sheet-head' }, h('h2', { class:'sheet-title', text:title }), h('button', { class:'icon-btn', 'aria-label':'Close', html:icon('close'), onclick:() => close() })),
    h('div', { class:'sheet-body' }, body));
  const root = h('div', { class:'sheet-root' }, scrim, panel);
  document.body.append(root); document.body.classList.add('has-sheet');
  $('#app').setAttribute('inert', '');
  requestAnimationFrame(() => root.classList.add('open'));
  scrim.onclick = () => close();
  const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } else if (e.key === 'Tab') trap(e, panel); };
  root.addEventListener('keydown', key);
  let closed = false;
  function close(fromPop) {
    if (closed) return; closed = true;
    root.classList.remove('open'); setTimeout(() => root.remove(), reduced() ? 0 : 240);
    sheetStack = sheetStack.filter(s => s !== api);
    if (!sheetStack.length) { document.body.classList.remove('has-sheet'); $('#app').removeAttribute('inert'); }
    if (!fromPop && history.state && history.state.sheet) { nav.pending++; history.back(); }
    onClose && onClose();
    if (prev && prev.focus && document.contains(prev)) try { prev.focus({preventScroll:true}); } catch(e) {}
  }
  const api = { close, panel, root };
  sheetStack.push(api);
  history.pushState({ sheet:true }, '', location.hash);   // Android/browser back closes the sheet
  setTimeout(() => { const f = panel.querySelector('[autofocus]') || panel.querySelector('.sheet-body input,.sheet-body button,.sheet-body [tabindex="0"]') || panel; f.focus({preventScroll:true}); }, 30);
  return api;
}
export const topSheet = () => sheetStack[sheetStack.length - 1];
export function closeAllSheets(fromPop) { [...sheetStack].reverse().forEach(s => s.close(fromPop)); }
function trap(e, panel) {
  const f = $$('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])', panel).filter(x => !x.disabled && x.offsetParent !== null);
  if (!f.length) return; const a = f[0], z = f[f.length - 1];
  if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
}
export function confirmSheet({ title, text, confirm='Delete', danger=true }) {
  return new Promise(res => {
    let done = false;
    const body = h('div', { class:'confirm' }, h('p', { class:'muted', text }),
      h('div', { class:'row gap' },
        h('button', { class:'btn ghost grow', onclick:() => { done = true; s.close(); res(false); } }, 'Cancel'),
        h('button', { class:'btn grow ' + (danger ? 'danger' : 'primary'), onclick:() => { done = true; s.close(); res(true); } }, confirm)));
    const s = sheet({ title, body, onClose:() => { if (!done) res(false); } });
  });
}
// ---- segmented control (radio group semantics)
export function segmented(label, opts, value, onPick, cls='') {
  const g = h('div', { class:'seg ' + cls, role:'radiogroup', 'aria-label':label });
  const draw = v => { const bs = $$('button', g); bs.forEach(b => { const on = b.dataset.v === String(v); b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }); if (bs.length && !bs.some(b => b.tabIndex === 0)) bs[0].tabIndex = 0; };   // nothing preselected: still reachable by Tab
  opts.forEach(([v, l]) => g.append(h('button', { role:'radio', 'data-v':String(v), class:'seg-opt', onclick:() => { draw(v); onPick(v); } }, l)));
  g.addEventListener('keydown', e => { const bs = $$('button', g), i = bs.indexOf(document.activeElement); if (i < 0) return; const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (!d) return; e.preventDefault(); const n = bs[(i + d + bs.length) % bs.length]; n.focus(); n.click(); });
  draw(value); return g;
}
// ---- slider + stepper row
export function stepper({ id, label, unit='', min, max, step, value, fmt=v=>v, onChange, hint='' }) {
  const out = h('output', { class:'step-val num', for:id, id:id + 'Val' }, fmt(value) + (unit ? ' ' + unit : ''));
  const rng = h('input', { type:'range', id, min, max, step, value, 'aria-label':label, class:'range' });
  const set = v => { v = Math.max(min, Math.min(max, Math.round(v / step) * step)); v = +v.toFixed(2); rng.value = v; paint(); out.textContent = fmt(v) + (unit ? ' ' + unit : ''); onChange(v); };
  const paint = () => rng.style.setProperty('--pct', ((rng.value - min) / (max - min) * 100) + '%');
  rng.oninput = () => set(+rng.value); paint();
  const row = h('div', { class:'stepper' },
    h('div', { class:'step-head' }, h('label', { for:id, class:'step-label' }, label), out),
    hint ? h('div', { class:'step-hint', text:hint }) : null,
    h('div', { class:'step-ctl' },
      h('button', { class:'icon-btn round', 'aria-label':'Decrease ' + label, html:icon('minus'), onclick:() => set(+rng.value - step) }), rng,
      h('button', { class:'icon-btn round', 'aria-label':'Increase ' + label, html:icon('plus'), onclick:() => set(+rng.value + step) })));
  row.setValue = v => { rng.value = v; paint(); out.textContent = fmt(+rng.value) + (unit ? ' ' + unit : ''); };
  return row;
}
export function emptyState(title, text, action) {
  return h('div', { class:'empty' }, h('div', { class:'empty-art', html:icon('lane') }), h('h2', { text:title }), h('p', { class:'muted', text }), action ? h('button', { class:'btn primary', onclick:action.run }, action.label) : null);
}
export function skeleton(n=3) { return h('div', { class:'skel-list', 'aria-busy':'true', 'aria-label':'Loading' }, ...Array.from({length:n}, () => h('div', { class:'skel' }))); }
