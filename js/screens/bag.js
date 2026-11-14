// Bag builder, 3 steps (IA_PLAN P1.1 / P1.2 / P1.4, docs/ia-wireframes/03-bag-builder.md). One saved bag (status.js
// currentBag) that Tonight and the ball chip read; "Bring: N" (N counts the spare) is the only size control.
// v73: tonight's bag + lane condition first (Swap / Keep in bag / Shake it up), Pack docked, then Bring; ladder and 10 checks behind a
// tap); step 3 every other owned ball with its "why not" and [Bring]. Edits save at once; "Pack these N" confirms.
// Rules stay in js/cc (bag.js checks/fill, advisor.js roles, bagedit.js edits); health = fold(events).
import * as PERF from '../perf.js';
import { h, toast, segmented, sheet, icon } from '../ui.js';
import { go } from '../router.js';
import { ready, proj, add, addMany } from '../hub.js';
import { prefs, setPrefs, deviceId } from '../store.js';
import { mkEvent } from '../data/events.js';
import * as G from '../cc/bag.js';
import * as R from '../cc/rank.js';
import * as A from '../cc/advisor.js';
import * as BE from '../cc/bagedit.js';
import { openNight, newNightId, dayKey } from '../cc/night.js';
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
// IA P2 / PRODUCT_SPINE: tonight's bag (this builder, Bag tab) and All my balls (the Armory, Arsenal tab #/arsenal); this switch links the two.
// (v73) the Tonight's bag | All my balls switch is gone: Arsenal is its own tab; #/bag?view=all still opens it.
export async function render() {
  OPEN.care = false; OPEN.left = false;
  await ready();
  const body = h('div', { class: 'stack', id: 'bagBody' });
  const el = h('section', { class: 'screen list-screen', id: 'bag' },
    h('header', { class: 'appbar' }, h('h1', { class: 'title', text: 'Bag' }), h('div', { class: 'appbar-actions' }, h('a', { class: 'btn ghost sm', id: 'bagTeam', href: '#/team' }, 'Team'), h('a', { class: 'btn ghost sm', id: 'bagAdd', href: '#/add-ball' }, 'Add ball'))), body);
  let proposal = null, careId = null, otherOpen = false, undoBag = null, shakeMsg = '';
  if (!TERT) PERF.painted.then(loadIndex).then(x => { TERT = R.tertiles(x); if (el.isConnected) draw(); }).catch(() => {});
  const itemOf = (P, id) => ST.itemOfOwned(P, id);
  const ownedItems = P => Object.keys(P.owned).sort().map(id => itemOf(P, id));
  const evOf = bag => { const last = (prefs().advisor || {}).last;
    return bag.event && A.EVENTS[bag.event] ? bag.event : last && A.EVENTS[last] ? last : bag.format === 'tournament6' ? 'tournament' : 'league'; };
  const bringOfBag = (P, bag, ev) => A.bringOf(bag.bring) || (bag.event ? A.EVENTS[ev].bring : ST.packedIds(P, bag).length || A.EVENTS[ev].bring);
  const night = P => { const sid = openNight(P), s = sid ? P.sessions[sid] : null;
    return { s, pat: s && s.ft != null ? { slug: s.patternSlug, name: s.patternName || s.patternSlug, ft: s.ft, ml: s.ml, ratio: s.ratio } : null }; };
  const opts = (P, ev, bring) => { const n = night(P);
    return { event: ev, bring, pattern: n.pat, tert: TERT, surface: (n.s && n.s.surface) || 'unknown', style: (P.bowler || {}).style || 'tweener', health: P.health }; };
  // Lane condition right on the Bag top (owner t120 "oil or lanes"): the same night session field Strike line edits.
  async function setStage(v) {
    const P = proj(), id = openNight(P) || newNightId(P), fields = { stage: v, pickId: null, editTs: Date.now() };
    const evt = P.sessions[id] ? mkEvent('session.edited', id, { fields }, { deviceId: deviceId(), prov: { kind: 'user' } })
      : mkEvent('session.created', id, Object.assign({ kind: 'tonight', date: dayKey(Date.now()), patternSlug: null, ft: null, ml: null, ratio: null, centerId: null, surface: 'unknown', bagId: null, game: 1, pickId: null, reads: [] }, fields), { deviceId: deviceId(), prov: { kind: 'user' } });
    await addMany([evt]); draw();
  }
  async function saveBag(bag, data, ev, bring) {
    const nb = Object.assign({}, data, { event: ev, bring, format: BE.formatOfBring(bring) });
    if (nb.spare && !nb.slots.some(s => s.owned === nb.spare)) nb.slots = nb.slots.concat([{ owned: nb.spare, locked: false }]);
    delete nb.packedTs; await add('bag.saved', bag.id, nb); draw();
  }
  // Bring N is additive (live eval 2026-11-10): going up keeps every packed ball and adds; going down takes out balls without specs
  // first and never the last ball with specs, the spare or a Keep in bag ball (cc/bagedit.js resize).
  async function setBring(P, bag, ev, n) {
    const locked = bag.slots.filter(s => s.locked).map(s => s.owned), packed = ST.packedIds(P, bag);
    const a = packed.length < n ? A.advise(P, Object.assign(opts(P, ev, n), { locked, current: packed })) : null;
    const r = BE.resize(P, bag, n, a && !a.none ? a : null), nm = id => (itemOf(P, id) || { name: id }).name;
    await saveBag(bag, r.data, ev, n);
    toast(r.added.length ? `Bring ${n}: added ${r.added.map(nm).join(', ')}.` + (r.size < n ? ` Only ${r.size} ready; mark more balls ${ST.LABEL.inBag} or Bring one from home.` : '')
      : r.removed.length ? `Bring ${n}: took out ${r.removed.map(nm).join(', ')}.` + (r.size > n ? ` ${r.size} stay (spare or ${ST.ALWAYS}).` : '')
      : r.size < n ? `Bring ${n}: all ${r.size} ready balls are packed. Mark more balls ${ST.LABEL.inBag} or Bring one from home.` : `Bring ${n}.`);
  }
  // [Swap]: In my bag first, then At home ("grab from home"), each with one line on what changes.
  function swapSheet(P, bag, ev, bring, fromId) {
    const from = itemOf(P, fromId), fc = G.cellOf(from.catalogId), packed = ST.packedIds(P, bag);
    const cands = ownedItems(P).filter(x => !packed.includes(x.ownedId) && ST.offered(x)).map(x => Object.assign({}, x, { c: G.cellOf(x.catalogId) }))
      .sort((a, b) => (Math.abs((a.c.level ?? 9) - (fc.level ?? 0)) - Math.abs((b.c.level ?? 9) - (fc.level ?? 0))) || (a.name < b.name ? -1 : 1));
    const what = x => x.c.tbd || fc.tbd ? 'Specs not published: the app can\u2019t say how it differs.' : x.c.level > fc.level ? `Stronger (level ${x.c.level} vs ${fc.level}): more hook on heavier oil.`
      : x.c.level < fc.level ? `Weaker (level ${x.c.level} vs ${fc.level}): less hook, for drier lanes.` : x.c.shape !== fc.shape ? `Same strength, ${x.c.shape} shape instead of ${fc.shape}.` : 'Same strength and shape: little changes.';
    const btn = x => h('button', { class: 'btn ghost block swap-cand', 'data-cand': x.ownedId, onclick: async () => { s.close(); await saveBag(bag, BE.swap(P, bag, fromId, x.ownedId), ev, bring); toast(`${x.name} in, ${from.name} out.`); } },
      h('b', { text: x.name + (x.status === 'benched' ? ` \u00b7 ${ST.HOME_TAG}` : '') }), h('span', { class: 'small muted', text: what(x) }));
    const mine = cands.filter(x => x.status === 'inBag'), home = cands.filter(x => x.status === 'benched');
    const s = sheet({ title: `Swap ${from.name} for\u2026`, id: 'bagSwap', body: h('div', { class: 'stack' },
      cands.length ? null : h('p', { class: 'muted', text: 'No other ball Ready to bring or At home. Change a ball\u2019s Status on its page.' }),
      mine.length ? h('h3', { class: 'small', text: ST.LABEL.inBag }) : null, ...mine.map(btn),
      home.length ? h('h3', { class: 'small', text: 'At home' }) : null, ...home.map(btn),
      h('button', { class: 'btn ghost block', id: 'bagSwapCancel', onclick: () => s.close() }, 'Cancel')) });
  }
  function draw() {
    const endDraw = PERF.span('bag.draw');
    const P = proj(), bag = ST.currentBag(P);
    body.innerHTML = '';
    if (!bag) { const have = Object.keys(P.owned || {}).length; body.append(h('div', { class:'card', id:'bagNone' }, h('h2', { class:'card-title', text:have ? 'Your arsenal is saved' : 'No balls owned yet' }), h('p', { class:'muted', text:have ? 'Start an empty bag, then choose Bring for each physical ball you want tonight. Owning a ball does not pack it automatically.' : 'Search the shared catalog and save only the physical balls you own. You can skip and keep using the app.' }), have ? h('button', { class:'btn primary block', id:'bagStartEmpty', onclick:async () => { await add('bag.saved', ST.TONIGHT_BAG, { name:'Tonight', slots:[], spare:null, format:'league3', event:'league', bring:3 }); draw(); } }, 'Start an empty bag') : h('a', { class:'btn primary block', id:'bagFindBalls', href:'#/welcome' }, 'Find my balls'), have ? null : h('a', { class:'btn ghost block', id:'bagAddOwn', href:'#/add-ball' }, 'Add a ball with its specs'))); return; }
    const ev = evOf(bag), E = A.EVENTS[ev], bring = bringOfBag(P, bag, ev), n0 = night(P);
    // PRODUCT_SPINE: the Bag is the front door, so an open night is one tap from here too (the game is kept until End night).
    const openSid = openNight(P);
    if (openSid && n0.s && !n0.s.ended && (P.games || []).some(g => g.sessionId === openSid)) body.append(h('button', { class: 'btn primary block', id: 'bagBackGame', 'data-back': '', onclick: () => go('#/bowl') }, `Back to the game \u00b7 game ${n0.s.game || 1}`));
    const all = ownedItems(P), packed = ST.packedIds(P, bag), locked = bag.slots.filter(s => s.locked).map(s => s.owned);
    const a = A.advise(P, Object.assign(opts(P, ev, bring), { fixed: { slots: packed, spare: bag.spare } }));
    const rows = a.none ? [] : a.rows, inIds = rows.map(r => r.ownedId);
    // ---- owner t120 "tonight's bag is number one; oil or lanes with it": the packed balls and the lane condition come first,
    // Pack these N stays docked at the bottom, then Bring N, then the details.
    const lane = `${E.short} \u00b7 ${n0.pat ? n0.pat.name : `House shot (assumed ${R.HOUSE_ASSUMED.ft} ft)`}`;
    const stage = (n0.s && n0.s.stage) || 'fresh';
    const top = h('div', { class: 'card', id: 'bagTonight' }, h('div', { class: 'card-h' }, h('h2', { class: 'card-title', text: 'Tonight\u2019s bag' }), h('span', { class: 'pill gold', id: 'bagCount', text: `${rows.length} packed` })),
      h('div', { class: 'row between bag-lane' }, h('p', { id: 'bagWhereLine' }, h('b', { text: 'Oil: ' }), lane),
        h('a', { class: 'btn ghost sm', id: 'bagWhereChange', href: '#/tonight?lanes=1' }, 'Oil & lanes \u203a')),
      h('div', { class: 'fld' }, segmented('Lane condition', [['fresh', 'Fresh'], ['transition', 'Transition'], ['burn', 'Burned']], stage, v => setStage(v), 'wide')));
    top.querySelector('[role=radiogroup], .seg') && (top.querySelector('[role=radiogroup], .seg').id = 'bagStage');
    if (a.none) top.append(h('p', { class: 'muted', id: 'bagEmptyNote', text: packed.length ? a.reason : 'Nothing packed yet. Choose Bring below to fill the bag, or tap Bring on a ball under \u201cWhy not the others?\u201d. Balls At home are packed as \u201cgrab from home\u201d.' }));
    if (rows.length < bring) top.append(h('p', { class: 'small', id: 'bagShort', text: `Bring ${bring}: ${rows.length} packed. Bring more from Why not the others, or mark a ball ${ST.LABEL.inBag}.` }));
    const keepBtn = r => { const on = locked.includes(r.ownedId);
      return h('button', { class: 'btn sm ghost keep-btn', 'data-pin': r.ownedId, 'data-keep': on ? 'on' : 'off', 'aria-pressed': String(on), 'aria-label': `Keep ${r.name} in bag: ${on ? 'on' : 'off'}`,
        onclick: () => saveBag(bag, BE.pin(bag, r.ownedId, !on), ev, bring) }, h('span', { html: icon('pin', on ? 'pin-on' : 'pin-off') }), on ? 'Kept' : 'Keep'); };
    top.append(h('ul', { class: 'plain stack', id: 'bagRows' }, ...rows.map(r => h('li', { class: 'bb-row', 'data-own': r.ownedId, 'data-ball': r.ownedId, 'data-role': r.role },
      h('div', { class: 'bb-main' }, h('b', { class: 'bb-name', text: r.name, title: r.line }), h('span', { class: 'bb-role small' }, h('span', { 'data-role-label': '', text: r.label }), r.home ? ` \u00b7 ${ST.HOME_TAG}` : '')),
      h('button', { class: 'btn sm ghost', 'data-swap': r.ownedId, 'aria-haspopup': 'dialog', 'aria-label': `Swap ${r.name}`, onclick: () => swapSheet(proj(), ST.currentBag(proj()), ev, bring, r.ownedId) }, 'Swap'), keepBtn(r),
      r.warning ? h('p', { class: 'small adv-warn', 'data-warn': '' }, '\u26a0 ' + r.warning) : null))));
    // one short line for what Keep means (owner t121u), shown once when any ball is kept
    if (rows.some(r => locked.includes(r.ownedId))) top.append(h('p', { class: 'small keep-hint', id: 'bagKeepHint', text: ST.KEEP_HINT }));
    // Shake it up (owner t120): a different random-but-sensible bag of the same size from your own balls; Kept balls stay; Undo.
    const shakeBtn = h('button', { class: 'btn ghost', id: 'bagShake', 'aria-label': 'Shake it up: pack a different random bag', onclick: async () => {
      const P2 = proj(), b2 = ST.currentBag(P2), r = BE.shakeUp(P2, b2, Math.max(bring, ST.packedIds(P2, b2).length));
      if (r.same) { toast(r.ids.length ? 'No other mix to shake to: every ball you can bring is already in (or kept).' : 'Add balls you own first.'); return; }
      const nm = id => (itemOf(P2, id) || { name: id }).name, prev = Object.assign({}, b2); delete prev.id; delete prev.ts;
      undoBag = prev; shakeMsg = `In: ${r.added.map(nm).join(', ') || 'none'} \u00b7 Out: ${r.removed.map(nm).join(', ') || 'none'}`; proposal = null;
      await saveBag(b2, r.data, ev, bring); } }, 'Shake it up');
    top.append(h('div', { class: 'btn-grid', id: 'bagShuffleRow' }, shakeBtn, null));
    if (undoBag) top.append(h('div', { class: 'row between bag-undo', id: 'bagShakeMsg', role: 'status' }, h('span', { class: 'small', text: shakeMsg }),
      h('button', { class: 'btn sm ghost', id: 'bagShakeUndo', onclick: async () => { const u = undoBag; undoBag = null; shakeMsg = ''; await saveBag(ST.currentBag(proj()), u, ev, bring); toast('Bag put back.'); } }, 'Undo')));
    // suggest again (diff, then confirm)
    const fillBtn = h('button', { class: 'btn ghost', id: 'bagFill', onclick: () => {
      const r0 = A.advise(P, Object.assign(opts(P, ev, bring), { locked, current: packed }));
      if (r0.none) return toast(r0.reason);
      const r = Object.assign({}, r0, BE.topUp(P, r0, Math.max(bring, packed.length), packed));   // never shrink to one ball when you own more
      const d = G.diffBags({ slots: packed.map(owned => ({ owned })), spare: bag.spare }, { slots: r.slots.concat(r.spare ? [r.spare] : []).map(owned => ({ owned })), spare: r.spare });
      proposal = d.in.length || d.out.length || d.spare !== undefined ? { r, d } : null; undoBag = null;
      if (!proposal) toast('Your bag is already the best fit from the balls you own.'); draw(); } }, 'Suggest again');
    top.querySelector('#bagShuffleRow').append(fillBtn);
    if (proposal) { const nm = id => (itemOf(P, id) || { name: id }).name;
      top.append(h('div', { class: 'warn-box', id: 'bagDiff' },
        h('div', {}, h('b', { text: 'In: ' }), proposal.d.in.length ? proposal.d.in.map(nm).join(', ') : 'none'),
        h('div', {}, h('b', { text: 'Out: ' }), proposal.d.out.length ? proposal.d.out.map(nm).join(', ') : 'none'),
        h('div', { class: 'row' }, h('button', { class: 'btn primary', id: 'bagApply', onclick: async () => { const r = proposal.r; proposal = null; await saveBag(bag, BE.fromAnswer(P, bag, r), ev, bring); toast('Bag updated.'); } }, 'Use this bag'),
          h('button', { class: 'btn ghost', id: 'bagKeep', onclick: () => { proposal = null; draw(); } }, 'Keep mine'))));
    }
    body.append(top);
    // ---- Bring N (counts the spare)
    const pick = BRING_VALUE(bring, otherOpen);
    const seg = segmented('Bring', A.BRING_OPTS.map(x => [String(x), String(x)]).concat([['other', 'Other']]), pick, v => { if (v === 'other') { otherOpen = true; draw(); return; } otherOpen = false; setBring(proj(), ST.currentBag(proj()), ev, +v); }, 'wide');
    seg.setAttribute('data-size-control', ''); seg.id = 'bagBring';
    const nIn = pick === 'other' ? h('label', { class: 'fld' }, h('span', { text: 'How many balls (with the spare)' }), h('input', { id: 'bagBringN', type: 'number', inputmode: 'numeric', min: '1', max: '20', step: '1', value: String(bring),
      onchange: e => { const v = A.bringOf(e.target.value); if (!v) return toast('Type a number of balls, e.g. 7', { kind: 'bad' }); setBring(proj(), ST.currentBag(proj()), ev, v); } })) : null;
    // Bring sits in the bag card (v73 no-scroll rule, owner t127u); its explainer moved to the "?" bubble.
    top.querySelector('#bagShuffleRow').before(h('div', { class: 'fld bag-bring', id: 'bagWhere' }, h('span', { class: 'small', text: 'Bring', title: 'Counts the spare' }), seg, nIn));
    // ladder + checks behind a tap
    const items = rows.filter(r => r.role !== 'spare').map(r => itemOf(P, r.ownedId)), spare = rows.find(r => r.role === 'spare') ? itemOf(P, rows.find(r => r.role === 'spare').ownedId) : null;
    const ctx = { format: BE.formatOfBring(bring), style: (P.bowler || {}).style || 'tweener', health: P.health, eventDate: bag.eventDate || null };
    const ch = G.checks(items, spare, ctx), warnN = ch.filter(c => c.warn).length;
    const lad = items.map(x => Object.assign({}, x, G.cellOf(x.catalogId))).sort((x, y) => (x.tbd ? 9 : x.level) - (y.tbd ? 9 : y.level) || (x.name < y.name ? -1 : 1));
    body.append(h('details', { class: 'card tn-more', id: 'bagDetailsCard' }, h('summary', { text: warnN ? `Strength and checks \u00b7 \u26a0 ${warnN}` : 'Strength and checks' }), h('details', { class: 'tn-more', id: 'bagLadder' }, h('summary', { text: 'Weaker \u2194 stronger \u203a' }),
      h('ol', { class: 'ladder small', 'aria-label': 'Weaker to stronger' }, ...lad.map(x => h('li', { 'data-ladder': x.ownedId }, h('b', { text: x.tbd ? '\u2013' : `L${x.level}` }), ` ${x.name}`, x.tbd ? ' \u00b7 specs not published' : ` \u00b7 ${x.shape}`))),
      h('p', { class: 'muted small' }, 'Strength 5 (heavy oil) to 1 (dry) from the app oil tag; shape is an estimate. ', prov('catalog', 'app tag'), prov('assumed', 'shape (estimate)'))),
      h('details', { class: 'tn-more', id: 'bagChecksD' }, h('summary', { id: 'bagChecksSum', text: warnN ? `\u26a0 ${warnN} thing${warnN === 1 ? '' : 's'} to check \u203a` : '\u2713 Nothing to check \u203a' }),
        h('ul', { class: 'why', id: 'bagChecks' }, ...ch.map(c => h('li', { 'data-check': c.n, 'data-warn': String(c.warn) }, h('b', { text: c.warn ? '\u26a0 ' : '\u2713 ' }), c.text, prov(SRC_PROV[c.src] || null, c.src)))))));
    // ---- step 3: left out (why not), every other owned ball once
    const left = all.filter(x => !inIds.includes(x.ownedId)).map(x => Object.assign({ x }, ST.whyNotFor(P, x.ownedId, { demand: a.demand ? a.demand.demand : null, bag: { slots: inIds.map(o => ({ owned: o })) } })
      || ST.whyNot(x, { bag: items, demand: a.demand ? a.demand.demand : null, health: P.health, size: rows.length })));
    const leftRow = w => h('li', { class: 'ball-row', 'data-ball': w.x.ownedId, 'data-why-not': w.x.ownedId, 'data-why': w.key },
      h('div', {}, h('b', { text: w.x.name }), h('p', { class: 'small muted why-not', text: w.text })),
      h('div', { class: 'row' }, w.canBring ? h('button', { class: 'btn sm', 'data-bring': w.x.ownedId, 'aria-label': `Bring ${w.x.name}`, onclick: async () => {
        const P2 = proj(), b2 = ST.currentBag(P2), r = BE.bringIn(P2, b2, w.x.ownedId, bring);
        if (r.blocked) return toast(`Set it ${ST.LABEL.inBag} or At home first.`);
        await saveBag(b2, r.data, ev, r.grew || bring); toast(r.grew ? `${w.x.name} added. Tonight\u2019s bag is now ${r.grew}.` : `${w.x.name} added to tonight\u2019s bag.`); } }, 'Bring') : null,
        statusButton(P, w.x.ownedId, { onDone: draw, text: w.canBring ? null : 'Change where it is \u203a' })));
    const shown = left.slice(0, LEFT_SHOWN), rest = left.slice(LEFT_SHOWN);
    // Clutter audit C9: Left out collapses to one row, as on Tonight; it stays open across redraws once opened.
    body.append(h('details', { class: 'card tn-more', id: 'bagLeft', open: OPEN.left ? '' : null, ontoggle: e => { OPEN.left = e.target.open; } },
      h('summary', {}, h('span', { class: 'card-title', text: `Why not the others? (${left.length})` })), h('div', { class: 'row' }, h('span', { class: 'muted small', text: 'Why not this ball?' }), helpDot('ap-why-not', 'Why not this ball?')),
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
    const cx = itemOf(P, careId), hl = P.health[careId] || null, care = G.careOf(catOf(cx.catalogId));
    const sel = h('select', { id: 'bagCareBall', 'aria-label': 'Ball', onchange: e => { careId = e.target.value; draw(); } }, ...all.map(x => h('option', { value: x.ownedId, selected: x.ownedId === careId ? '' : null, text: x.name })));
    // Clutter audit C9: status and care (brand targets, USBC Rule 18) collapsed by default; one warning line when service is due.
    if (pack.service.length) body.append(h('p', { class: 'small warn-line', id: 'bagCareDue', text: `Service due: ${pack.service.map(x => `${x.name} (${x.type})`).join(', ')}. Open Ball status and care.` }));
    body.append(h('details', { class: 'card tn-more', id: 'bagCare', open: OPEN.care ? '' : null, ontoggle: e => { OPEN.care = e.target.open; } },
      h('summary', {}, h('span', { class: 'card-title', text: 'Ball status and care' })), h('div', { class: 'row' }, helpDot('ap-status', 'Ball status'), helpDot('eq-cleaning', 'Cleaning')),
      h('label', { class: 'fld' }, h('span', { text: 'Ball' }), sel),
      h('p', { class: 'small', id: 'bagHealth' }, hl ? `${hl.games} games logged. Since refresh: ${hl.since.refresh ?? 'not logged'}; resurface: ${hl.since.resurface ?? 'not logged'}.` : 'No games logged with this ball yet.', prov(null, 'from your log')),
      h('p', { class: 'muted small' }, `Targets (${care.family === 'none' ? 'no brand guidance' : care.family}): ${SVC.filter(([t]) => care[t]).map(([t, l]) => `${l.toLowerCase()} ${care[t]}`).join(', ')} games.`, prov(null, care.src)),
      h('div', { class: 'fld' }, h('span', { text: 'Status' }), segmented('Status', ST.STATUS, cx.status, async v => { await add('ownedBall.edited', careId, { fields: { status: v } }); draw(); }, 'wide')),
      h('div', { class: 'btn-grid' }, ...SVC.map(([t, l]) => h('button', { class: 'btn', 'data-svc': t, onclick: async () => { await add('ball.serviced', 'svc-' + careId + '-' + Date.now(), { ballId: careId, type: t }); toast(`${cx.name}: ${l.toLowerCase()} logged.`); draw(); } }, 'Log ' + l.toLowerCase()))),
      // Scoring fix 4 / education: USBC Rule 18 (and 18/2: competition starts with the first ball thrown for score).
      h('p', { class: 'muted small', id: 'bagRule18' }, 'Sand, polish or clean before league or tournament play starts. Once any bowler throws a ball for score, no abrasive, cleaner, rosin or powder on any ball; a dry towel is fine.', prov('usbc', 'USBC Rule 18'))));
    endDraw();
  }
  draw();
  return { el, title: 'Bag' };
}
const OPEN = { care: false, left: false };   // C9 disclosure state for this visit
const BRING_VALUE = (n, other) => !other && A.BRING_OPTS.includes(n) ? String(n) : 'other';
