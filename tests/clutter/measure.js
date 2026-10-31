// Clutter census for one screen (tests/clutter). Runs in the page; read-only. Returns screen totals and per-card counts.
// "Data point" = a numeric token in visible text (scores, mph, boards, %, counts, dates, fractions like 5⅛). Tab bar excluded.
() => {
  const H = innerHeight, W = innerWidth;
  const scr = document.querySelector('main .screen') || document.querySelector('.screen') || document.querySelector('main') || document.body;
  const hiddenByDetails = e => { const cd = e.closest('details:not([open])'); return cd && !(e.closest('summary') && e.closest('summary').parentElement === cd); };
  const vis = e => { if (!e || hiddenByDetails(e) || e.closest('[hidden],.sr-only,[aria-hidden=true],nav,.tabbar')) return false;
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05; };
  const top = e => e.getBoundingClientRect().top + scrollY;
  const inFold = e => { const r = e.getBoundingClientRect(); return r.top + scrollY < H && r.bottom + scrollY > 0; };
  const NUM = /(?:\d+(?:[.,:\/]\d+)*\s*[⅛¼⅜½⅝¾⅞]?|[⅛¼⅜½⅝¾⅞])\s*(?:%|°|"|mph|rpm|ft|in)?/g;
  // text "atoms": elements with their own text nodes
  const atoms = [...scr.querySelectorAll('*')].filter(e => !['SCRIPT','STYLE','svg','OPTION'].includes(e.tagName) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && vis(e));
  const own = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
  // SVG / canvas text counts too (lane diagrams)
  const svgT = [...scr.querySelectorAll('svg text')].filter(e => vis(e));
  const ACT = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=slider], [role=radio], [role=tab], [role=button], label.btn';
  const acts = [...scr.querySelectorAll(ACT)].filter(e => vis(e) && !(e.tagName === 'INPUT' && e.type === 'radio' && e.closest('label.btn')));
  // Number kinds: 'label' = pin numbers and 1..N ordinal runs on one row (frame headers); 'control' = inside a button/choice;
  // 'data' = everything else (the figures a bowler has to read and interpret).
  const CTRL = 'button, [role=radio], [role=tab], label.btn, select, a.btn, [role=radiogroup]';
  const bare = atoms.filter(e => /^\d{1,2}$/.test(own(e)));
  const ordinal = new Set();
  for (const e of bare) { const y = Math.round(e.getBoundingClientRect().top / 30); const row = bare.filter(o => Math.round(o.getBoundingClientRect().top / 30) === y).map(o => +own(o));
    if (row.length >= 5 && [1,2,3,4,5].every(k => row.includes(k))) ordinal.add(e); }
  const kind = e => (e.closest('[data-pin]') || ordinal.has(e)) ? 'label' : e.closest(CTRL) ? 'control' : 'data';
  const tally = (els, svg) => {
    const nums = [], words = []; let wc = 0, nc = 0, ncF = 0, wcF = 0, dc = 0, dcF = 0, lc = 0, cc = 0;
    for (const e of els) { const t = own(e); const m = t.match(NUM) || []; const w = (t.match(/[A-Za-z][A-Za-z'’-]+/g) || []).length; const f = inFold(e);
      const k = kind(e); if (k === 'data') { dc += m.length; if (f) dcF += m.length; } else if (k === 'label') lc += m.length; else cc += m.length;
      nc += m.length; wc += w; if (f) { ncF += m.length; wcF += w; } if (m.length) nums.push({ t: t.slice(0, 80), n: m.length, fold: f, k, y: Math.round(top(e)) }); }
    for (const e of svg) { const t = (e.textContent || '').trim(); const m = t.match(NUM) || []; const f = inFold(e); nc += m.length; if (f) ncF += m.length; dc += m.length; if (f) dcF += m.length; wc += (t.match(/[A-Za-z]{2,}/g) || []).length; if (m.length) nums.push({ t: 'svg:' + t.slice(0, 40), n: m.length, fold: f, k: 'data', y: Math.round(top(e)) }); }
    return { nums: nc, numsFold: ncF, data: dc, dataFold: dcF, labels: lc, controls: cc, words: wc, wordsFold: wcF, numLines: nums };
  };
  const all = tally(atoms, svgT);
  const colors = new Set(), bgs = new Set(), sizes = new Set(), sizesFold = new Set(), colorsFold = new Set();
  for (const e of atoms) { const cs = getComputedStyle(e); colors.add(cs.color); sizes.add(cs.fontSize + '/' + cs.fontWeight); if (inFold(e)) { sizesFold.add(cs.fontSize + '/' + cs.fontWeight); colorsFold.add(cs.color); } }
  for (const e of scr.querySelectorAll('*')) { if (!vis(e)) continue; const cs = getComputedStyle(e); const b = cs.backgroundColor; if (b && b !== 'rgba(0, 0, 0, 0)' && b !== 'transparent') { bgs.add(b); if (inFold(e)) colorsFold.add(b); } }
  const fsOnly = new Set([...sizes].map(s => s.split('/')[0]));
  // cards: .card plus top-level <section>/<details> blocks of the screen that are not inside a card
  let cardEls = [...scr.querySelectorAll('.card')].filter(e => vis(e) && !e.parentElement.closest('.card'));
  if (!cardEls.length) cardEls = [...scr.children].filter(vis);
  const cards = cardEls.map((c, i) => {
    const ats = atoms.filter(a => c.contains(a)); const sv = svgT.filter(a => c.contains(a)); const t = tally(ats, sv);
    const ac = acts.filter(a => c.contains(a)); const r = c.getBoundingClientRect();
    const hd = c.querySelector('h1,h2,h3,.card-title,summary,legend,strong'); const title = ((hd && hd.textContent) || c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 48);
    const chunks = [...c.children].filter(vis).length;
    return { i, id: c.id || '', cls: (typeof c.className === 'string' ? c.className : '').split(' ').slice(0, 3).join('.'), title, y: Math.round(r.top + scrollY), h: Math.round(r.height),
      fold: r.top + scrollY < H, nums: t.nums, numsFold: t.numsFold, data: t.data, dataFold: t.dataFold, words: t.words, actions: ac.length, chunks, numLines: t.numLines.slice(0, 40), text: (c.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 700) };
  });
  const tabs = [...document.querySelectorAll('nav a, .tabbar a, .tabbar button, nav button')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length;
  const docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  return { hash: location.hash, h1: ((document.querySelector('.screen h1, h1') || {}).textContent || '').trim().slice(0, 60), vw: W, vh: H,
    docH, screens: +(docH / H).toFixed(2), nums: all.nums, numsFold: all.numsFold, data: all.data, dataFold: all.dataFold, numLabels: all.labels, numControls: all.controls, words: all.words, wordsFold: all.wordsFold,
    actions: acts.length, actionsFold: acts.filter(inFold).length, tabs, textColors: colors.size, bgColors: bgs.size, colorsFold: colorsFold.size,
    fontSizes: fsOnly.size, fontStyles: sizes.size, fontStylesFold: sizesFold.size, cards, numLines: all.numLines.slice(0, 120),
    actionLabels: acts.slice(0, 80).map(a => ((a.getAttribute('aria-label') || a.textContent || a.value || a.tagName) + '').replace(/\s+/g, ' ').trim().slice(0, 30) + (inFold(a) ? '' : ' ↓')) };
}
