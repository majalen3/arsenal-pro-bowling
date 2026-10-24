// Bag builder, 3 steps (IA_PLAN P1.1 / P1.2 / P1.4, docs/ia-wireframes/03-bag-builder.md). One saved bag (status.js
// currentBag) that Tonight and the ball chip read; "Bring: N" (N counts the spare) is the only size control.
// Step 1 where & lanes + Bring; step 2 the bag in role words (Swap / 📌 Always bring; ladder and 10 checks behind a
// tap); step 3 every other owned ball with its "why not" and [Bring]. Edits save at once; "Pack these N" confirms.
// Rules stay in js/cc (bag.js checks/fill, advisor.js roles, bagedit.js edits); health = fold(events).
import { h, toast, segmented, sheet } from '../ui.js';
import { go } from '../router.js';
import { ready, proj, add } from '../hub.js';
import { prefs, setPrefs } from '../store.js';
import * as G from '../cc/bag.js';
import * as R from '../cc/rank.js';
import * as A from '../cc/advisor.js';
import * as BE from '../cc/bagedit.js';
import { openNight } from '../cc/night.js';
import { loadIndex } from '../patdata.js';
import { catOf } from '../cc/cats.js';
import { helpDot } from './help.js';
import * as ST from '../cc/status.js';
import { statusButton } from './status.js';
const short = ST.shortName;
const prov = (p, t) => h('span', { class: 'prov', 'data-prov': p || null, text: t });
const SRC_PROV = { [R.SRC.assumed]: 'assumed', [R.SRC.usbc]: 'usbc', [R.SRC.tag]: 'catalog', [R.SRC.you]: null };
const SVC = [['refresh', 'Refresh'], ['resurface', 'Resurface'], ['detox', 'Detox']];
const STAGE = { fresh: 'fresh', transition: 'in transition', burn: 'burned' };
const LEFT_SHOWN = 4;
let TERT = null;
export async function render() {
  await ready();
  const body = h('div', { class: 'stack', id: 'bagBody' });
  const el = h('section', { class: 'screen list-screen', id: 'bag' },
    h('header', { class: 'appbar' }, h('button', { class: 'btn ghost', id: 'bagBack', 'aria-label': 'Back to Tonight', onclick: () => go('#/tonight') }, '\u2039 Tonight'), h('h1', { class: 'title', text: 'Bag' }), h('div', { class: 'appbar-actions' }, h('a', { class: 'btn ghost sm', id: 'bagAdd', href: '#/add-ball' }, 'Add ball'))), body);
  let proposal = null, careId = null, otherOpen = false;
  if (!TERT) loadIndex().then(x => { TERT = R.tertiles(x); if (el.isConnected) draw(); }).catch(() => {});
  const itemOf = (P, id) => ST.itemOfOwned(P, id);
  const ownedItems = P => Object.keys(P.owned).sort().map(id => itemOf(P, id));
  const evOf = bag => { const last = (prefs().advisor || {}).last;
    return bag.event && A.EVENTS[bag.event] ? bag.event : last && A.EVENTS[last] ? last : bag.format === 'tournament6' ? 'tournament' : 'league'; };
  const bringOfBag = (P, bag, ev) => A.bringOf(bag.bring) || (bag.event ? A.EVENTS[ev].bring : ST.packedIds(P, bag).length || A.EVENTS[ev].bring);
  const night = P => { const sid = openNight(P), s = sid ? P.sessions[sid] : null;
    return { s, pat: s && s.ft != null ? { slug: s.patternSlug, name: s.patternName || s.patternSlug, ft: s.ft, ml: s.ml, ratio: s.ratio } : null }; };
  const opts = (P, ev, bring) => { const n = night(P);
    return { event: ev, bring, pattern: n.pat, tert: TERT, surface: (n.s && n.s.surface) || 'unknown', style: (P.bowler || {}).style || 'tweener', health: P.health }; };
  async function saveBag(bag, data, ev, bring) {
    const nb = Object.assign({}, data, { event: ev, bring, format: BE.formatOfBring(bring) });
    if (nb.spare && !nb.slots.some(s => s.owned === nb.spare)) nb.slots = nb.slots.concat([{ owned: nb.spare, locked: false }]);
    delete nb.packedTs; await add('bag.saved', bag.id, nb); draw();
  }
  async function setBring(P, bag, ev, n) {
    const locked = bag.slots.filter(s => s.locked).map(s => s.owned), packed = ST.packedIds(P, bag);
    const a = A.advise(P, Object.assign(opts(P, ev, n), { locked, current: packed }));
    if (a.none) return toast(a.reason);
    await saveBag(bag, BE.fromAnswer(P, bag, a), ev, n);
    const got = a.slots.length + (a.spare ? 1 : 0);
    toast(got < n ? `Bring ${n}: ${got} balls are In my bag or pinned. Bring more from Left out.` : `Bring ${n}: bag refilled, \ud83d\udccc Always bring kept.`);
  }
  // [Swap]: In my bag first, then At home ("grab from home"), each with one line on what changes.
  function swapSheet(P, bag, ev, bring, fromId) {
    const from = itemOf(P, fromId), fc = G.cellOf(from.catalogId), packed = ST.packedIds(P, bag);
    const cands = ownedItems(P).filter(x => !packed.includes(x.ownedId) && ST.offered(x)).map(x => Object.assign({}, x, { c: G.cellOf(x.catalogId) }))
      .sort((a, b) => (Math.abs((a.c.level ?? 9) - (fc.level ?? 0)) - Math.abs((b.c.level ?? 9) - (fc.level ?? 0))) || (a.name < b.name ? -1 : 1));
    const what = x => x.c.tbd || fc.tbd ? 'Spec TBD: the app can\u2019t say how it differs.' : x.c.level > fc.level ? `Stronger (level ${x.c.level} vs ${fc.level}): more hook on heavier oil.`
      : x.c.level < fc.level ? `Weaker (level ${x.c.level} vs ${fc.level}): less hook, for drier lanes.` : x.c.shape !== fc.shape ? `Same strength, ${x.c.shape} shape instead of ${fc.shape}.` : 'Same strength and shape: little changes.';
    const btn = x => h('button', { class: 'btn ghost block swap-cand', 'data-cand': x.ownedId, onclick: async () => { s.close(); await saveBag(bag, BE.swap(P, bag, fromId, x.ownedId), ev, bring); toast(`${x.name} in, ${from.name} out.`); } },
      h('b', { text: x.name + (x.status === 'benched' ? ` \u00b7 ${ST.HOME_TAG}` : '') }), h('span', { class: 'small muted', text: what(x) }));
    const mine = cands.filter(x => x.status === 'inBag'), home = cands.filter(x => x.status === 'benched');
    const s = sheet({ title: `Swap ${from.name} for\u2026`, id: 'bagSwap', body: h('div', { class: 'stack' },
      cands.length ? null : h('p', { class: 'muted', text: 'No other ball In my bag or At home. Change a ball\u2019s Status on its page.' }),
      mine.length ? h('h3', { class: 'small', text: 'In my bag' }) : null, ...mine.map(btn),
      home.length ? h('h3', { class: 'small', text: 'At home' }) : null, ...home.map(btn),
      h('button', { class: 'btn ghost block', id: 'bagSwapCancel', onclick: () => s.close() }, 'Cancel')) });
  }
  function draw() {
    const P = proj(), bag = ST.currentBag(P);
    body.innerHTML = '';
    if (!bag) { body.append(h('div', { class: 'card', id: 'bagNone' }, h('h2', { class: 'card-title', text: 'No bag yet' }), h('p', { class: 'muted', text: 'Load your reported arsenal on Tonight first.' }), h('button', { class: 'btn primary block', onclick: () => go('#/tonight') }, 'Go to Tonight'))); return; }
    const ev = evOf(bag), E = A.EVENTS[ev], bring = bringOfBag(P, bag, ev), n0 = night(P);
    const all = ownedItems(P), packed = ST.packedIds(P, bag), locked = bag.slots.filter(s => s.locked).map(s => s.owned);
    const a = A.advise(P, Object.assign(opts(P, ev, bring), { fixed: { slots: packed, spare: bag.spare } }));
    const rows = a.none ? [] : a.rows, inIds = rows.map(r => r.ownedId);
    // ---- step 1: where & lanes + Bring N
    const pick = BRING_VALUE(bring, otherOpen);
    const seg = segmented('Bring', A.BRING_OPTS.map(x => [String(x), String(x)]).concat([['other', 'Other']]), pick, v => { if (v === 'other') { otherOpen = true; draw(); return; } otherOpen = false; setBring(proj(), ST.currentBag(proj()), ev, +v); }, 'wide');
    seg.setAttribute('data-size-control', ''); seg.id = 'bagBring';
    const nIn = pick === 'other' ? h('label', { class: 'fld' }, h('span', { text: 'How many balls (with the spare)' }), h('input', { id: 'bagBringN', type: 'number', inputmode: 'numeric', min: '1', max: '20', step: '1', value: String(bring),
      onchange: e => { const v = A.bringOf(e.target.value); if (!v) return toast('Type a number of balls, e.g. 7', { kind: 'bad' }); setBring(proj(), ST.currentBag(proj()), ev, v); } })) : null;
    body.append(h('div', { class: 'card', id: 'bagWhere' }, h('h2', { class: 'card-title', text: '1 \u00b7 Where & lanes' }),
      h('div', { class: 'row between' }, h('p', { id: 'bagWhereLine' }, `${E.short} \u00b7 ${n0.pat ? n0.pat.name : `House shot (assumed ${R.HOUSE_ASSUMED.ft} ft)`} \u00b7 ${STAGE[(n0.s && n0.s.stage) || 'fresh'] || 'fresh'}`),
        h('button', { class: 'btn ghost sm', id: 'bagWhereChange', onclick: () => go('#/tonight') }, 'change \u203a')),
      h('div', { class: 'fld' }, h('span', { text: 'Bring' }), seg), nIn,
      h('p', { class: 'muted small', text: 'Counts the spare. Changing it refills the bag; \ud83d\udccc Always bring stays in.' })));
    // ---- step 2: your bag for tonight
    const step2 = h('div', { class: 'card', id: 'bagTonight' }, h('div', { class: 'card-h' }, h('h2', { class: 'card-title', text: '2 \u00b7 Your bag for tonight' }), h('span', { class: 'pill gold', id: 'bagCount', text: `${rows.length} packed` })));
    if (a.none) step2.append(h('p', { class: 'muted', text: a.reason }));
    if (rows.length < bring) step2.append(h('p', { class: 'small', id: 'bagShort', text: `Bring ${bring}: ${rows.length} packed. Bring more from Left out below, or set a ball In my bag.` }));
    step2.append(h('ul', { class: 'plain stack', id: 'bagRows' }, ...rows.map(r => h('li', { class: 'bb-row', 'data-own': r.ownedId, 'data-ball': r.ownedId, 'data-role': r.role },
      h('div', { class: 'adv-head' }, h('b', { text: r.name }), h('span', { class: 'pill' + (r.role === 'benchmark' ? ' gold' : ''), 'data-role-label': '', text: r.label }), r.home ? h('span', { class: 'pill', text: ST.HOME_TAG }) : null),
      h('p', { class: 'small muted', text: r.line }),
      r.warning ? h('p', { class: 'small adv-warn', 'data-warn': '' }, '\u26a0 ' + r.warning) : null,
      h('div', { class: 'row' }, h('button', { class: 'btn sm ghost', 'data-swap': r.ownedId, 'aria-haspopup': 'dialog', 'aria-label': `Swap ${r.name}`, onclick: () => swapSheet(proj(), ST.currentBag(proj()), ev, bring, r.ownedId) }, 'Swap'),
        h('button', { class: 'btn sm ghost', 'data-pin': r.ownedId, 'aria-pressed': String(locked.includes(r.ownedId)), onclick: () => saveBag(bag, BE.pin(bag, r.ownedId, !locked.includes(r.ownedId)), ev, bring) }, ST.ALWAYS))))));
    // ladder + checks behind a tap
    const items = rows.filter(r => r.role !== 'spare').map(r => itemOf(P, r.ownedId)), spare = rows.find(r => r.role === 'spare') ? itemOf(P, rows.find(r => r.role === 'spare').ownedId) : null;
    const ctx = { format: BE.formatOfBring(bring), style: (P.bowler || {}).style || 'tweener', health: P.health, eventDate: bag.eventDate || null };
    const ch = G.checks(items, spare, ctx), warnN = ch.filter(c => c.warn).length;
    const lad = items.map(x => Object.assign({}, x, G.cellOf(x.catalogId))).sort((x, y) => (x.tbd ? 9 : x.level) - (y.tbd ? 9 : y.level) || (x.name < y.name ? -1 : 1));
    step2.append(h('details', { class: 'tn-more', id: 'bagLadder' }, h('summary', { text: 'Weaker \u2194 stronger \u203a' }),
      h('ol', { class: 'ladder small', 'aria-label': 'Weaker to stronger' }, ...lad.map(x => h('li', { 'data-ladder': x.ownedId }, h('b', { text: x.tbd ? 'TBD' : `L${x.level}` }), ` ${x.name}`, x.tbd ? '' : ` \u00b7 ${x.shape}`))),
      h('p', { class: 'muted small' }, 'Strength 5 (heavy oil) to 1 (dry) from the app oil tag; shape is an estimate. ', prov('catalog', 'app tag'), prov('assumed', 'shape (estimate)'))),
      h('details', { class: 'tn-more', id: 'bagChecksD' }, h('summary', { id: 'bagChecksSum', text: warnN ? `\u26a0 ${warnN} thing${warnN === 1 ? '' : 's'} to check \u203a` : '\u2713 Nothing to check \u203a' }),
        h('ul', { class: 'why', id: 'bagChecks' }, ...ch.map(c => h('li', { 'data-check': c.n, 'data-warn': String(c.warn) }, h('b', { text: c.warn ? '\u26a0 ' : '\u2713 ' }), c.text, prov(SRC_PROV[c.src] || null, c.src))))));
    // suggest again (diff, then confirm)
    const fillBtn = h('button', { class: 'btn block', id: 'bagFill', onclick: () => {
      const r = A.advise(P, Object.assign(opts(P, ev, bring), { locked, current: packed }));
      if (r.none) return toast(r.reason);
      const d = G.diffBags({ slots: packed.map(owned => ({ owned })), spare: bag.spare }, { slots: r.slots.concat(r.spare ? [r.spare] : []).map(owned => ({ owned })), spare: r.spare });
      proposal = d.in.length || d.out.length || d.spare !== undefined ? { r, d } : null;
      if (!proposal) toast('Your bag is already the best fit from the balls you own.'); draw(); } }, 'Suggest again from my balls');
    step2.append(fillBtn);
    if (proposal) { const nm = id => (itemOf(P, id) || { name: id }).name;
      step2.append(h('div', { class: 'warn-box', id: 'bagDiff' },
        h('div', {}, h('b', { text: 'In: ' }), proposal.d.in.length ? proposal.d.in.map(nm).join(', ') : 'none'),
        h('div', {}, h('b', { text: 'Out: ' }), proposal.d.out.length ? proposal.d.out.map(nm).join(', ') : 'none'),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', id: 'bagApply', onclick: async () => { const r = proposal.r; proposal = null; await saveBag(bag, BE.fromAnswer(P, bag, r), ev, bring); toast('Bag updated.'); } }, 'Use this bag'),
          h('button', { class: 'btn ghost', id: 'bagKeep', onclick: () => { proposal = null; draw(); } }, 'Keep mine'))));
    }
    body.append(step2);
    // ---- step 3: left out (why not), every other owned ball once
    const left = all.filter(x => !inIds.includes(x.ownedId)).map(x => Object.assign({ x }, ST.whyNotFor(P, x.ownedId, { demand: a.demand ? a.demand.demand : null, bag: { slots: inIds.map(o => ({ owned: o })) } })
      || ST.whyNot(x, { bag: items, demand: a.demand ? a.demand.demand : null, health: P.health, size: rows.length })));
    const leftRow = w => h('li', { class: 'ball-row', 'data-ball': w.x.ownedId, 'data-why-not': w.x.ownedId, 'data-why': w.key },
      h('div', {}, h('b', { text: w.x.name }), h('p', { class: 'small muted why-not', text: w.text })),
      h('div', { class: 'row' }, w.canBring ? h('button', { class: 'btn sm', 'data-bring': w.x.ownedId, 'aria-label': `Bring ${w.x.name}`, onclick: async () => {
        const P2 = proj(), b2 = ST.currentBag(P2), r = BE.bringIn(P2, b2, w.x.ownedId, bring);
        if (r.blocked) return toast(r.blocked === 'pinned' ? 'Every ball is \ud83d\udccc Always bring: unpin one or raise Bring.' : 'Set it In my bag or At home first.');
        await saveBag(b2, r.data, ev, bring); toast(r.out ? `${w.x.name} in, ${itemOf(P2, r.out).name} out.` : `${w.x.name} in.`); } }, 'Bring') : null,
        statusButton(P, w.x.ownedId, { onDone: draw, text: w.canBring ? null : 'Change where it is \u203a' })));
    const shown = left.slice(0, LEFT_SHOWN), rest = left.slice(LEFT_SHOWN);
    body.append(h('div', { class: 'card', id: 'bagLeft' }, h('div', { class: 'card-h' }, h('h2', { class: 'card-title', text: `3 \u00b7 Left out (why not) \u00b7 ${left.length}` }), helpDot('ap-why-not', 'Why not this ball?')),
      left.length ? h('ul', { class: 'plain stack', id: 'bagBalls' }, ...shown.map(leftRow)) : h('p', { class: 'muted', id: 'bagBalls', text: 'Every ball you own is in the bag.' }),
      rest.length ? h('details', { class: 'tn-more', id: 'bagLeftAll' }, h('summary', { text: `Show all (${left.length})` }), h('ul', { class: 'plain stack' }, ...rest.map(leftRow))) : null));
    // ---- sticky Pack these N (saves THE bag Tonight shows)
    body.append(h('div', { class: 'bag-dock', id: 'bagDock' }, h('button', { class: 'btn primary block', id: 'bagPackGo', disabled: rows.length ? null : '', onclick: async () => {
      const P2 = proj(), b2 = ST.currentBag(P2), nb = Object.assign({}, b2); delete nb.id; delete nb.ts;
      await add('bag.saved', b2.id, Object.assign(nb, { event: ev, bring, format: BE.formatOfBring(bring), packedTs: Date.now() }));
      setPrefs({ advisor: Object.assign({}, prefs().advisor, { last: ev, [ev]: Object.assign({}, (prefs().advisor || {})[ev], { packedTs: Date.now(), swaps: {} }) }) });
      toast(`Packed: ${rows.map(r => r.name).join(', ')}.`); go('#/tonight'); } }, `Pack these ${rows.length}`)));
    // ---- pack list + event date (details) and care (writes events; health is recomputed from the log, never typed)
    const pack = G.packList(items, spare, ctx);
    const dateIn = h('input', { type: 'date', id: 'bagDate', value: bag.eventDate || '', 'aria-label': 'Event date', onchange: e => { const nb = Object.assign({}, bag, { eventDate: e.target.value || null }); delete nb.id; delete nb.ts; saveBag(bag, nb, ev, bring); } });
    body.append(h('details', { class: 'card tn-more', id: 'bagMore' }, h('summary', { text: `Pack list and event date \u00b7 ${pack.service.length ? pack.service.length + ' service due' : 'no service due'}` }),
      h('div', { id: 'bagPack' }, h('div', { class: 'card-h' }, h('h2', { class: 'card-title', text: 'Pack list' }), helpDot('eq-spareball', 'Spare ball')),
        h('dl', { class: 'kv' }, ...pack.rows.flatMap(r => [h('dt', { text: r.role }), h('dd', {}, h('b', { text: r.name }), h('div', { class: 'muted small', text: r.why }))])),
        pack.service.length ? h('div', { class: 'warn-box', id: 'bagService' }, h('b', { text: bag.eventDate ? `Service before ${bag.eventDate}` : 'Service due' }),
          ...pack.service.map(s => h('div', {}, `${s.name}: ${s.type} (${s.atLeast ? '\u2265' : ''}${s.n} of ${s.every} games)`, prov(null, s.src))), h('div', { class: 'small', text: 'Before the first ball for score.' })) : null),
      h('label', { class: 'fld', id: 'bagHead' }, h('span', {}, 'Event date ', bag.eventDate ? null : prov('assumed', 'not set')), dateIn)));
    careId = careId && P.owned[careId] ? careId : ((items[0] || all[0]) || {}).ownedId;
    if (!careId) return;
    const cx = itemOf(P, careId), hl = P.health[careId] || (cx.catalogId && P.health[cx.catalogId]) || null, care = G.careOf(catOf(cx.catalogId));
    const sel = h('select', { id: 'bagCareBall', 'aria-label': 'Ball', onchange: e => { careId = e.target.value; draw(); } }, ...all.map(x => h('option', { value: x.ownedId, selected: x.ownedId === careId ? '' : null, text: x.name })));
    body.append(h('div', { class: 'card', id: 'bagCare' }, h('div', { class: 'card-h' }, h('h2', { class: 'card-title', text: 'Ball status and care' }), helpDot('ap-status', 'Ball status'), helpDot('eq-cleaning', 'Cleaning')),
      h('label', { class: 'fld' }, h('span', { text: 'Ball' }), sel),
      h('p', { class: 'small', id: 'bagHealth' }, hl ? `${hl.games} games logged. Since refresh: ${hl.since.refresh ?? 'not logged'}; resurface: ${hl.since.resurface ?? 'not logged'}.` : 'No games logged with this ball yet.', prov(null, 'from your log')),
      h('p', { class: 'muted small' }, `Targets (${care.family === 'none' ? 'no brand guidance' : care.family}): ${SVC.filter(([t]) => care[t]).map(([t, l]) => `${l.toLowerCase()} ${care[t]}`).join(', ')} games.`, prov(null, care.src)),
      h('div', { class: 'fld' }, h('span', { text: 'Status' }), segmented('Status', ST.STATUS, cx.status, async v => { await add('ownedBall.edited', careId, { fields: { status: v } }); draw(); }, 'wide')),
      h('div', { class: 'btn-grid' }, ...SVC.map(([t, l]) => h('button', { class: 'btn', 'data-svc': t, onclick: async () => { await add('ball.serviced', 'svc-' + careId + '-' + Date.now(), { ballId: careId, type: t }); toast(`${cx.name}: ${l.toLowerCase()} logged.`); draw(); } }, 'Log ' + l.toLowerCase()))),
      // Scoring fix 4 / education: USBC Rule 18 (and 18/2: competition starts with the first ball thrown for score).
      h('p', { class: 'muted small', id: 'bagRule18' }, 'Sand, polish or clean before league or tournament play starts. Once any bowler throws a ball for score, no abrasive, cleaner, rosin or powder on any ball; a dry towel is fine.', prov('usbc', 'USBC Rule 18'))));
  }
  draw();
  return { el, title: 'Bag' };
}
const BRING_VALUE = (n, other) => !other && A.BRING_OPTS.includes(n) ? String(n) : 'other';
