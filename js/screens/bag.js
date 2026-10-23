// Bag builder (CC2, COMMAND_CENTER_PLAN §3). Coverage grid, 10 checks (warnings only), swap in 2 taps, lock/exclude,
// "Fill bag" from owned balls only, pack list and ball status. Rules live in js/cc/bag.js (pure); health = fold(events).
import { h, toast, segmented } from '../ui.js';
import { go } from '../router.js';
import { ready, proj, add } from '../hub.js';
import { balls } from '../data.js';
import * as G from '../cc/bag.js';
import { SRC } from '../cc/rank.js';
import { catOf } from '../cc/cats.js';
const short = n => String(n || '').replace(/^(Radical|Storm|Hammer|900 Global|Columbia 300|Roto Grip|Motiv)\s+/, '');
const prov = (p, t) => h('span', { class: 'prov', 'data-prov': p || null, text: t });
const SRC_PROV = { [SRC.assumed]: 'assumed', [SRC.usbc]: 'usbc', [SRC.tag]: 'catalog', [SRC.you]: null };
const FORMATS = [['league3', 'League 3'], ['league4', 'League 4'], ['tournament6', 'Tourn. 6'], ['custom', 'Custom']];
const STATUS = [['inBag', 'In bag'], ['benched', 'Benched'], ['proShop', 'Pro shop'], ['retired', 'Retired']];
const SVC = [['refresh', 'Refresh'], ['resurface', 'Resurface'], ['detox', 'Detox']];
export async function render() {
  await ready();
  const body = h('div', { class: 'stack', id: 'bagBody' });
  const el = h('section', { class: 'screen list-screen', id: 'bag' },
    h('header', { class: 'appbar' }, h('button', { class: 'btn ghost', id: 'bagBack', 'aria-label': 'Back to Tonight', onclick: () => go('#/tonight') }, '\u2039 Tonight'), h('h1', { class: 'title', text: 'Bag' }), h('div', { class: 'appbar-actions' }, h('a', { class: 'btn ghost sm', id: 'bagAdd', href: '#/add-ball' }, 'Add ball'))), body);
  let bagId = null, swapFrom = null, proposal = null, careId = null;
  const itemOf = (P, id) => { const o = P.owned[id]; if (!o) return null; const c = catOf(o.catalogId);
    return { ownedId: id, catalogId: o.catalogId || null, name: short(o.name || (c && c.name)), benchmark: !!o.benchmark, status: o.status || 'inBag', note: o.note || null }; };
  const ownedItems = P => Object.keys(P.owned).sort().map(id => itemOf(P, id));
  const cur = P => { const bags = Object.values(P.bags).sort((a, b) => a.id < b.id ? 1 : -1); return { bags, bag: bags.find(b => b.id === bagId) || bags[0] || null }; };
  async function saveBag(bag, patch) {
    const nb = Object.assign({ name: bag.name, format: bag.format, slots: bag.slots, spare: bag.spare || null, excluded: bag.excluded || [], eventDate: bag.eventDate || null }, patch);
    if (nb.spare && !nb.slots.some(s => s.owned === nb.spare)) nb.slots = nb.slots.concat([{ owned: nb.spare, locked: false }]);
    await add('bag.saved', bag.id, nb); draw();
  }
  function draw() {
    const P = proj(), { bags, bag } = cur(P);
    body.innerHTML = '';
    if (!bag) { body.append(h('div', { class: 'card', id: 'bagNone' }, h('h2', { class: 'card-title', text: 'No bag yet' }), h('p', { class: 'muted', text: 'Load your reported arsenal on Tonight first.' }), h('button', { class: 'btn primary block', onclick: () => go('#/tonight') }, 'Go to Tonight'))); return; }
    bagId = bag.id;
    const all = ownedItems(P), excl = bag.excluded || [], spare = bag.spare ? itemOf(P, bag.spare) : null;
    const inIds = bag.slots.map(s => s.owned).filter(id => id !== bag.spare && P.owned[id]), items = inIds.map(id => itemOf(P, id));
    const locked = bag.slots.filter(s => s.locked).map(s => s.owned);
    const ctx = { format: bag.format, style: (P.bowler || {}).style || 'tweener', health: P.health, eventDate: bag.eventDate || null };
    const ch = G.checks(items, spare, ctx), pack = G.packList(items, spare, ctx);
    const ov = G.overlaps(items), overIds = new Set(ov.flatMap(o => [o.a, o.b])), holes = G.holes(items);
    // ---- status strip
    const n = st => all.filter(x => x.status === st).length, dueN = pack.service.length;
    body.append(h('div', { class: 'chips', id: 'bagStatus', role: 'status' },
      h('span', { class: 'pill gold', text: `${items.length + (spare ? 1 : 0)} packed` }), h('span', { class: 'pill', text: `${n('benched')} benched` }),
      n('proShop') ? h('span', { class: 'pill', text: `${n('proShop')} at pro shop` }) : null,
      h('span', { class: 'pill', 'data-due': dueN, text: dueN ? `${dueN} service due` : 'no service due' })));
    // ---- which bag / format / event date
    const dateIn = h('input', { type: 'date', id: 'bagDate', value: bag.eventDate || '', 'aria-label': 'Event date', onchange: e => saveBag(bag, { eventDate: e.target.value || null }) });
    body.append(h('div', { class: 'card', id: 'bagHead' },
      bags.length > 1 ? h('div', { class: 'fld' }, h('span', { text: 'Bag' }), segmented('Bag', bags.map(x => [x.id, x.name]), bag.id, v => { bagId = v; swapFrom = null; proposal = null; draw(); }, 'wide')) : null,
      h('div', { class: 'fld' }, h('span', { text: 'Format' }), segmented('Format', FORMATS, bag.format, v => saveBag(bag, { format: v }), 'wide')),
      h('label', { class: 'fld' }, h('span', {}, 'Event date ', bag.eventDate ? null : prov('assumed', 'not set')), dateIn)));
    // ---- coverage grid
    const cellBtn = x => h('button', { class: 'btn ghost', 'data-own': x.ownedId, 'aria-pressed': String(swapFrom === x.ownedId), onclick: () => { swapFrom = swapFrom === x.ownedId ? null : x.ownedId; proposal = null; draw(); } }, (x.benchmark ? '\u2605 ' : '') + x.name);
    const dec = items.map(x => Object.assign({}, x, G.cellOf(x.catalogId))), grid = h('div', { class: 'grid5', id: 'bagGrid', role: 'group', 'aria-label': 'Coverage: strength 5 to 1 by shape' },
      h('div', { class: 'hd', 'aria-hidden': 'true', text: 'Lvl' }), ...G.SHAPES.map(s => h('div', { class: 'hd', 'aria-hidden': 'true', text: s[0].toUpperCase() + s.slice(1) })));
    for (let l = 5; l >= 1; l--) {
      grid.append(h('div', { class: 'hd', 'aria-hidden': 'true', title: G.LEVEL_NAME[l], text: String(l) }));
      for (const s of G.SHAPES) { const xs = dec.filter(x => x.level === l && x.shape === s), hole = holes.includes(l);
        grid.append(h('div', { class: 'cell' + (hole ? ' hole' : '') + (xs.some(x => overIds.has(x.ownedId)) ? ' over' : ''), role: 'group', 'aria-label': `Level ${l} ${G.LEVEL_NAME[l]}, ${s}${hole ? ', hole' : ''}`, 'data-l': l, 'data-s': s }, ...xs.map(cellBtn), hole && s === 'medium' ? h('span', { text: 'hole' }) : null)); }
    }
    const tbd = dec.filter(x => x.tbd);
    body.append(h('div', { class: 'card', id: 'bagCover' }, h('h2', { class: 'card-title', text: 'Coverage' }),
      h('p', { class: 'muted small' }, 'Strength 5 (heavy oil) to 1 (dry) from the app oil tag. Shape is an estimate from cover, core and diff. ', prov('catalog', 'app tag'), prov('assumed', 'shape (estimate)')),
      grid, tbd.length ? h('p', { class: 'small', id: 'bagTbd' }, 'Spec TBD: ', ...tbd.map(cellBtn)) : null,
      h('p', { class: 'small', id: 'bagSpare' }, spare ? ['Spare: ', h('b', { text: spare.name })] : 'No spare ball'),
      h('p', { class: 'muted small', text: 'Tap a ball to swap it.' })));
    // ---- swap picker (tap 2)
    if (swapFrom && items.concat(tbd).some(x => x.ownedId === swapFrom)) {
      const from = G.cellOf(itemOf(P, swapFrom).catalogId), fromName = itemOf(P, swapFrom).name;
      const cands = all.filter(x => !inIds.includes(x.ownedId) && x.ownedId !== bag.spare && !['proShop', 'retired'].includes(x.status) && !excl.includes(x.ownedId))
        .map(x => Object.assign({}, x, G.cellOf(x.catalogId))).sort((a, b) => (Math.abs((a.level ?? 9) - (from.level ?? 0)) - Math.abs((b.level ?? 9) - (from.level ?? 0))) || (a.name < b.name ? -1 : 1));
      body.append(h('div', { class: 'card', id: 'bagSwap' }, h('h2', { class: 'card-title', text: `Swap ${fromName} for\u2026` }),
        cands.length ? h('div', { class: 'stack' }, ...cands.map(x => h('button', { class: 'btn ghost block', 'data-cand': x.ownedId, onclick: async () => {
          const slots = bag.slots.map(s => s.owned === swapFrom ? { owned: x.ownedId, locked: false } : s); const was = fromName; swapFrom = null;
          await saveBag(bag, { slots }); toast(`${x.name} in, ${was} out.`); } }, `${x.name} \u00b7 ${x.tbd ? 'spec TBD' : 'L' + x.level + ' ' + x.shape}`)))
          : h('p', { class: 'muted', text: 'No other available ball. Change a ball\u2019s status below.' }),
        h('button', { class: 'btn ghost block', id: 'bagSwapCancel', onclick: () => { swapFrom = null; draw(); } }, 'Cancel')));
    }
    // ---- fill
    const fillCard = h('div', { class: 'card', id: 'bagFillCard' }, h('button', { class: 'btn primary block', id: 'bagFill', onclick: () => {
      const owned = all.map(x => Object.assign({}, x, { note: x.note }));
      const r = G.fill(owned, { format: bag.format, size: bag.format === 'custom' ? Math.max(1, items.length) : null, locked, excluded: excl, spare: bag.spare, current: inIds, ctx: { format: bag.format, style: ctx.style } });
      const d = G.diffBags({ slots: inIds.map(owned => ({ owned })), spare: bag.spare }, r);
      proposal = d.in.length || d.out.length || d.spare !== undefined ? { r, d } : null;
      if (!proposal) toast('Your bag is already the best fit from the balls you own.'); draw(); } }, 'Fill bag from my balls'),
      h('p', { class: 'muted small', text: 'Uses only balls you own. Locked balls stay; excluded, pro-shop and retired balls never go in.' }));
    if (proposal) { const nm = id => itemOf(P, id).name;
      fillCard.append(h('div', { class: 'warn-box', id: 'bagDiff' },
        h('div', {}, h('b', { text: 'In: ' }), proposal.d.in.length ? proposal.d.in.map(nm).join(', ') : 'none'),
        h('div', {}, h('b', { text: 'Out: ' }), proposal.d.out.length ? proposal.d.out.map(nm).join(', ') : 'none'),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', id: 'bagApply', onclick: async () => { const r = proposal.r; proposal = null; await saveBag(bag, { slots: r.slots, spare: r.spare }); toast('Bag updated.'); } }, 'Use this bag'),
          h('button', { class: 'btn ghost', id: 'bagKeep', onclick: () => { proposal = null; draw(); } }, 'Keep mine'))));
    }
    body.append(fillCard);
    // ---- checks
    body.append(h('div', { class: 'card', id: 'bagChecks' }, h('h2', { class: 'card-title', text: `Checks \u00b7 ${ch.filter(c => c.warn).length} to look at` }),
      h('ul', { class: 'why' }, ...ch.map(c => h('li', { 'data-check': c.n, 'data-warn': String(c.warn) }, h('b', { text: c.warn ? '\u26a0 ' : '\u2713 ' }), c.text, prov(SRC_PROV[c.src] || null, c.src))))));
    // ---- balls: lock (in bag) / exclude (out)
    const rowOf = x => { const inB = inIds.includes(x.ownedId) || x.ownedId === bag.spare, c = G.cellOf(x.catalogId), blocked = ['proShop', 'retired'].includes(x.status);
      return h('div', { class: 'row between', 'data-ball': x.ownedId },
        h('div', {}, h('b', { text: x.name }), h('div', { class: 'muted small', text: [x.ownedId === bag.spare ? 'spare' : null, c.tbd ? 'spec TBD' : `L${c.level} ${c.shape}`, x.status !== 'inBag' ? STATUS.find(s => s[0] === x.status)[1] : null].filter(Boolean).join(' \u00b7 ') })),
        inB ? h('button', { class: 'btn ghost', 'data-lock': x.ownedId, 'aria-pressed': String(locked.includes(x.ownedId)), onclick: () => saveBag(bag, { slots: bag.slots.map(s => s.owned === x.ownedId ? { owned: s.owned, locked: !s.locked } : s) }) }, locked.includes(x.ownedId) ? 'Locked' : 'Lock')
          : blocked ? h('span', { class: 'pill', text: x.status === 'proShop' ? 'at pro shop' : 'retired' })
          : h('button', { class: 'btn ghost', 'data-excl': x.ownedId, 'aria-pressed': String(excl.includes(x.ownedId)), onclick: () => saveBag(bag, { excluded: excl.includes(x.ownedId) ? excl.filter(i => i !== x.ownedId) : excl.concat([x.ownedId]) }) }, excl.includes(x.ownedId) ? 'Excluded' : 'Exclude')); };
    body.append(h('div', { class: 'card', id: 'bagBalls' }, h('h2', { class: 'card-title', text: 'Your balls' }),
      h('p', { class: 'muted small', text: 'Lock keeps a ball in when you fill. Exclude keeps it out.' }), h('div', { class: 'stack' }, ...all.map(rowOf))));
    // ---- pack list
    body.append(h('div', { class: 'card', id: 'bagPack' }, h('h2', { class: 'card-title', text: 'Pack list' }),
      h('dl', { class: 'kv' }, ...pack.rows.flatMap(r => [h('dt', { text: r.role }), h('dd', {}, h('b', { text: r.name }), h('div', { class: 'muted small', text: r.why }))])),
      pack.service.length ? h('div', { class: 'warn-box', id: 'bagService' }, h('b', { text: bag.eventDate ? `Service before ${bag.eventDate}` : 'Service due' }),
        ...pack.service.map(s => h('div', {}, `${s.name}: ${s.type} (${s.atLeast ? '\u2265' : ''}${s.n} of ${s.every} games)`, prov(null, s.src))), h('div', { class: 'small', text: 'Before the first ball for score.' })) : null,
      pack.blocked.length ? h('p', { class: 'small', id: 'bagBlocked', text: 'Left off: ' + pack.blocked.map(b => `${b.name} (${b.why})`).join(', ') + '.' }) : null));
    // ---- care + status (writes events; health is recomputed from the log, never typed)
    careId = careId && P.owned[careId] ? careId : (items[0] || all[0]).ownedId;
    const cx = itemOf(P, careId), hl = P.health[careId] || (cx.catalogId && P.health[cx.catalogId]) || null, care = G.careOf(catOf(cx.catalogId));
    const sel = h('select', { id: 'bagCareBall', 'aria-label': 'Ball', onchange: e => { careId = e.target.value; draw(); } }, ...all.map(x => h('option', { value: x.ownedId, selected: x.ownedId === careId ? '' : null, text: x.name })));
    body.append(h('div', { class: 'card', id: 'bagCare' }, h('h2', { class: 'card-title', text: 'Ball status and care' }),
      h('label', { class: 'fld' }, h('span', { text: 'Ball' }), sel),
      h('p', { class: 'small', id: 'bagHealth' }, hl ? `${hl.games} games logged. Since refresh: ${hl.since.refresh ?? 'not logged'}; resurface: ${hl.since.resurface ?? 'not logged'}.` : 'No games logged with this ball yet.', prov(null, 'from your log')),
      h('p', { class: 'muted small' }, `Targets (${care.family === 'none' ? 'no brand guidance' : care.family}): ${SVC.filter(([t]) => care[t]).map(([t, l]) => `${l.toLowerCase()} ${care[t]}`).join(', ')} games.`, prov(null, care.src)),
      h('div', { class: 'fld' }, h('span', { text: 'Status' }), segmented('Status', STATUS, cx.status, async v => { await add('ownedBall.edited', careId, { fields: { status: v } }); draw(); }, 'wide')),
      h('div', { class: 'btn-grid' }, ...SVC.map(([t, l]) => h('button', { class: 'btn', 'data-svc': t, onclick: async () => { await add('ball.serviced', 'svc-' + careId + '-' + Date.now(), { ballId: careId, type: t }); toast(`${cx.name}: ${l.toLowerCase()} logged.`); draw(); } }, 'Log ' + l.toLowerCase())))));
  }
  draw();
  return { el, title: 'Bag' };
}
