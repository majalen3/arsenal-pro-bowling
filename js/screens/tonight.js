// Tonight (CC0): pick a ball for tonight's lanes from YOUR bag, say why, and give a starting line. Decision core is
// js/cc/rank.js (pure); the line check is the unchanged engine via js/cc/model.js. Every number shows its source.
import { h, icon, toast, segmented } from '../ui.js';
import { go } from '../router.js';
import { ready, proj, add, addMany, loadStarter } from '../hub.js';
import { on, today, deviceId, prefs, setPrefs } from '../store.js';
import { mkEvent, voidEvent } from '../data/events.js';
import * as Q from '../cc/quicklog.js';
import { balls, specOK } from '../data.js';
import * as R from '../cc/rank.js';
import { modelLine } from '../cc/model.js';
import { loadIndex } from '../patdata.js';
import { catOf } from '../cc/cats.js';
import * as A from '../cc/advisor.js';
import { packList } from '../cc/bag.js';
import { DEFAULTS as TGD } from '../cc/target.js';
const short = n => String(n || '').replace(/^(Radical|Storm|Hammer|900 Global|Columbia 300|Roto Grip|Motiv)\s+/, '');
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const provChip = (prov, label) => h('span', { class: 'prov', 'data-prov': prov || null, text: label });
const SRC_PROV = { [R.SRC.assumed]: 'assumed', [R.SRC.model]: 'model', [R.SRC.spec]: 'manufacturer', [R.SRC.usbc]: 'usbc', [R.SRC.bowl]: 'usbc', [R.SRC.tag]: 'catalog' };
let IDX = null, TERT = null;
// Stand board = laydown + offset − drift (Breakdown Bowling). The model line gives the laydown; offset/drift are the
// bowler's Targeting settings, else the assumed default 7 / 0.
export function standOf(lay) {
  const pt = prefs().target || {}, t = pt.tv === 2 && pt.t ? pt.t : TGD, off = +t.offset || TGD.offset, dr = +t.drift || 0;
  return { feet: Math.round(lay + off - dr), lay, offset: off, drift: dr, assumed: !(pt.tv === 2 && pt.t) };
}
export async function render() {
  const t0 = performance.now();
  await ready();
  const sid = 'tonight-' + today();
  const body = h('div', { class: 'stack', id: 'tonightBody' });
  const el = h('section', { class: 'screen list-screen', id: 'tonight' }, h('header', { class: 'appbar' }, h('h1', { class: 'title', text: 'Tonight' })), body);
  const ql = { leave: new Set(), foul: false, tag: null };   // quick-log taps not yet written
  let swapOpen = null;
  let local = {};   // UI state not yet written (avoids re-render churn while typing)
  const sess = () => Object.assign({ kind: 'tonight', patternSlug: null, ft: null, ml: null, ratio: null, centerId: null, surface: 'unknown', stage: 'fresh', bagId: null, game: 1, pickId: null, reads: [] }, (proj().sessions || {})[sid], local);
  async function save(fields) {
    Object.assign(local, fields);
    const P = proj(), ev = P.sessions[sid] ? mkEvent('session.edited', sid, { fields }, { deviceId: deviceId(), prov: { kind: 'user' } })
      : mkEvent('session.created', sid, Object.assign({ kind: 'tonight', date: today() }, sess(), fields), { deviceId: deviceId(), prov: { kind: 'user' } });
    await addMany([ev]); local = {}; draw();
  }
  function bagOf(P, s) {
    const bags = Object.values(P.bags), bag = bags.find(b => b.id === s.bagId) || bags[0] || null;
    const owned = Object.values(P.owned).filter(o => !['proShop', 'retired'].includes(o.status));
    const ids = bag ? bag.slots.map(x => x.owned) : owned.filter(o => o.status !== 'benched').map(o => o.id);
    const spare = bag ? bag.spare : null;
    const list = ids.filter(id => id !== spare && P.owned[id]).map(id => { const o = P.owned[id]; const c = catOf(o.catalogId);
      return { ownedId: id, catalogId: o.catalogId || null, name: short(o.name || (c && c.name)), benchmark: !!o.benchmark, finish: o.finish || 'factory' }; });
    return { bag, bags, list, spare: spare && P.owned[spare] ? P.owned[spare] : null };
  }
  function draw() {
    const P = proj(), s = sess(), b = bowlerOf(P);
    body.innerHTML = '';
    if (!Object.keys(P.owned).length) {
      body.append(h('div', { class: 'card', id: 'noBag' }, h('h2', { class: 'card-title', text: 'No balls in your bag yet' }),
        h('p', { class: 'muted', text: 'Tonight ranks only balls you own. Load your reported arsenal (10 balls, 2 bags, all marked user-reported) or pick balls on More.' }),
        h('button', { class: 'btn primary block', id: 'loadStarter', onclick: async () => { await loadStarter(); toast('Arsenal loaded. Not yours? Undo it on More \u2192 Imports.'); } }, 'Load starter arsenal'),
        h('button', { class: 'btn block', onclick: () => go('#/more') }, 'Choose balls on More')));
      return;
    }
    body.append(advisorCard(P, s, b));
    const pat = s.ft != null ? { slug: s.patternSlug, name: s.patternName || s.patternSlug, ft: s.ft, ml: s.ml, ratio: s.ratio } : null;
    const center = s.centerId ? P.centers[s.centerId] : null;
    const prevCenters = new Set(Object.values(P.sessions).filter(x => x.id !== sid && x.centerId).map(x => x.centerId));
    const d = R.demandOf({ pattern: pat, tert: TERT, surface: s.surface, stage: s.stage });
    const { bag, bags, list, spare } = bagOf(P, s);
    const bf = R.benchFirstReason({ patternKnown: !!pat, centerKnown: !!center, centerNew: !!center && !prevCenters.has(center.id), tournamentFirstGame: !!bag && bag.format === 'tournament6' && (s.game || 1) === 1 });
    const r = R.rank(list, { demand: d.demand, benchFirst: bf, style: b.style || 'tweener' });
    const cur = r.order.find(x => x.id === s.pickId) || r.pick;
    const ft = pat ? pat.ft : R.HOUSE_ASSUMED.ft, r31 = R.rule31(ft);
    const ml = cur ? modelLine(cur.cat, { speed: num(b.speed) || 15, rev: num(b.rev) || 220, ft, finish: 'factory', target31: r31.target }) : null;
    // ---- coach line (≤ 2 sentences, starts with a ball name)
    const coach = !cur ? 'Add balls to a bag to get a pick.' : cur === r.pick && bf && cur.benchmark ? `${cur.name} first: ${bf}, so start with your benchmark and read it.`
      : `${cur.name} for demand ${d.demand} of 5${cur.level != null ? ' (level ' + cur.level + ')' : ''}.` + (ml && !ml.none ? ` Stand ${standOf(ml.feet).feet}, eyes ${ml.target} at the arrows.` : '');
    // ---- setup
    const patIn = h('input', { id: 'tnPattern', type: 'search', list: 'tnPatList', autocomplete: 'off', placeholder: 'House shot (assumed 38 ft)', 'aria-label': 'Pattern', value: pat ? pat.name : '' });
    const dl = h('datalist', { id: 'tnPatList' }, ...(IDX || []).map(x => h('option', { value: x.name })));
    patIn.onchange = async () => { const v = patIn.value.trim(), row = IDX && IDX.find(x => x.name.toLowerCase() === v.toLowerCase());
      if (!v) await save({ pickId: null, patternSlug: null, patternName: null, ft: null, ml: null, ratio: null }); else if (row) await save({ pickId: null, patternSlug: row.slug, patternName: row.name, ft: row.ft, ml: row.ml, ratio: row.ratio }); else toast('Pick a pattern from the list', { kind: 'bad' }); };
    const cIn = h('input', { id: 'tnCenter', autocomplete: 'off', placeholder: 'Center name', 'aria-label': 'Center', value: center ? center.name : '' });
    cIn.onchange = async () => { const v = cIn.value.trim(); if (!v) return save({ centerId: null }); const id = 'center-' + slug(v);
      if (!P.centers[id]) await add('center.created', id, { fields: { name: v, surface: s.surface } }); await save({ centerId: id }); };
    body.append(h('p', { class: 'coach', id: 'tnCoach', role: 'status', text: coach }));
    const setup = h('div', { class: 'card', id: 'tnSetup' }, h('h2', { class: 'card-title', text: 'Lanes tonight' }),
        h('label', { class: 'fld' }, h('span', {}, 'Pattern ', pat ? provChip('usbc', 'Kegel library') : provChip('assumed', 'assumed house 38 ft')), patIn, dl),
        h('label', { class: 'fld' }, h('span', { text: 'Center' }), cIn),
        h('div', { class: 'fld' }, h('span', {}, 'Lane surface ', s.surface === 'unknown' ? provChip('assumed', 'unknown') : null), segmented('Lane surface', [['unknown', 'Unknown'], ['wood', 'Wood'], ['synthetic', 'Synthetic']], s.surface, v => { save({ surface: v, pickId: null }); if (center) add('center.edited', center.id, { fields: { surface: v } }); })),
        h('div', { class: 'fld' }, h('span', { text: 'Lane condition' }), segmented('Lane condition', [['fresh', 'Fresh'], ['transition', 'Transition'], ['burn', 'Burned']], s.stage, v => save({ stage: v, pickId: null }))),
        bags.length > 1 ? h('div', { class: 'fld' }, h('span', { text: 'Bag' }), segmented('Bag', bags.map(x => [x.id, x.name]), bag.id, v => save({ bagId: v, pickId: null }))) : null,
        h('div', { class: 'fld' }, h('span', { text: 'Game' }), segmented('Game', [[1, '1'], [2, '2'], [3, '3'], [4, '4+']], s.game || 1, v => save({ game: +v }), 'wide')),
        h('button', { class: 'btn ghost block', id: 'tnBagLink', onclick: () => go('#/bag') }, 'Bag builder \u203a'));
    // ---- pick
    if (cur) {
      const alt = (x, lbl) => x ? h('button', { class: 'alt btn', 'data-alt': lbl, onclick: () => save({ pickId: x.id }) }, h('small', { class: 'muted', text: lbl + ' ' }), h('b', { text: x.name })) : h('div', { class: 'alt muted', text: `No ${lbl.toLowerCase()} ball in this bag` });
      const lineBox = !ml || ml.none ? h('p', { class: 'muted small', id: 'tnModel', text: (ml && ml.reason) || 'spec TBD: no model line' })
        : h('dl', { class: 'kv', id: 'tnModel' }, h('dt', { text: 'Feet (stand)' }), h('dd', { id: 'tnFeet' }, String(standOf(ml.feet).feet), provChip(standOf(ml.feet).assumed ? 'assumed' : null, standOf(ml.feet).assumed ? 'offset 7 assumed' : 'your offset')),
          h('dt', { text: 'Laydown' }), h('dd', {}, String(ml.feet), provChip('model', '2-D model')),
          h('dt', { text: 'Eyes (arrows)' }), h('dd', { text: String(ml.target) }),
          h('dt', { text: 'Breakpoint' }), h('dd', { text: `board ${ml.bp} at ${ml.bpFt} ft` }),
          h('dt', { text: 'Holds' }), h('dd', { text: `${ml.holds} of ${ml.of} small misses (\u00b10.5 mph, \u00b120 rpm, \u00b11 board)` }));
      body.append(h('div', { class: 'card pick', id: 'tnPick' },
        h('div', { class: 'row between' }, h('span', { class: 'ball-name', id: 'tnPickName', text: cur.name }), h('span', { class: 'pill gold', text: cur.level != null ? `Level ${cur.level} \u00b7 demand ${d.demand}` : `spec TBD \u00b7 demand ${d.demand}` })),
        h('ul', { class: 'why', id: 'tnWhy' }, ...cur.why.concat(d.why.slice(0, 2)).map(w => h('li', {}, w.t, provChip(SRC_PROV[w.src] || null, w.src)))),
        lineBox,
        ml && !ml.none ? h('button', { class: 'btn primary block', id: 'tnFind', onclick: () => go('#/target?find=1&ball=' + encodeURIComponent(cur.catalogId || '')) }, 'Find my strike line \u203a') : null,
        ml && !ml.none ? h('button', { class: 'btn block', id: 'tnTarget', onclick: () => go('#/target?ball=' + encodeURIComponent(cur.catalogId || '')) }, 'Check feet and eyes on the lane \u203a') : null,
        h('p', { class: 'small', id: 'tnR31' }, r31.text, provChip('usbc', 'bowl.com'), pat ? null : provChip('assumed', 'length assumed')),
        ml && !ml.none ? h('p', { class: 'muted small', text: `Model runs on the nearest preset (${ml.preset}, ${ml.presetLen} ft) with your ${num(b.speed) || 15} mph and ${num(b.rev) || 220} rpm. An estimate, not a promise.` }) : null,
        h('div', { class: 'alts' }, alt(r.weaker && cur === r.pick ? r.weaker : R.readMove(r, cur.id, 'early'), 'Weaker'), alt(r.stronger && cur === r.pick ? r.stronger : R.readMove(r, cur.id, 'weak'), 'Stronger'))));
      body.append(quickLog(P, s, cur, b));
      // ---- read buttons
      body.append(h('div', { class: 'card', id: 'tnReads' }, h('h2', { class: 'card-title', text: 'How did it read?' }),
        h('div', { class: 'btn-grid' }, ...Object.entries(R.READS).map(([k, l]) => h('button', { class: 'btn', 'data-read': k, onclick: async () => {
          const nx = R.readMove(r, cur.id, k), reads = (s.reads || []).concat([{ read: k, ballId: cur.id, ts: Date.now() }]).slice(-6);
          await save({ pickId: nx ? nx.id : cur.id, reads });
          toast(nx ? `${nx.name}: ${k === 'early' || k === 'angular' ? 'one step ' + (k === 'early' ? 'weaker' : 'smoother') : 'one step ' + (k === 'weak' ? 'stronger' : 'more angular')}.` : `${cur.name} is already the ${k === 'early' ? 'weakest' : k === 'weak' ? 'strongest' : 'closest'} fit in this bag. Move feet and eyes instead.`);
        } }, l)))));
      body.append(setup);
      const pl = R.plan(r, ml);
      body.append(h('div', { class: 'card', id: 'tnPlan' }, h('h2', { class: 'card-title', text: 'Plan' }),
        h('dl', { class: 'kv' }, h('dt', { text: 'A' }), h('dd', { text: pl.A ? pl.A.name : '\u2014' }), h('dt', { text: 'B (lanes hook early)' }), h('dd', { text: pl.B ? pl.B.name : 'none weaker in bag' }), h('dt', { text: 'C (later)' }), h('dd', { text: pl.C ? pl.C.name : 'none' })),
        h('p', { class: 'muted small', text: `Triggers (team rule, editable later): 2 of 3 high \u2192 feet 2 ${b.hand === 'left' ? 'right' : 'left'}, eyes 1; 2 of 3 light \u2192 the other way or go stronger; 2 \u201ctoo early\u201d reads \u2192 Plan B.` })));
    }
    if (!cur) body.append(setup);
    // ---- spares 3-6-9
    const sp = R.spares(20, b.hand === 'left' ? 'left' : 'right');
    body.append(h('details', { class: 'card', id: 'tnSpares' }, h('summary', { class: 'card-title', text: `Spares: 3-6-9 from strike board 20${spare ? ' \u00b7 ' + short(spare.name) : ''}` }),
      h('dl', { class: 'kv' }, ...sp.flatMap(x => [h('dt', { text: x.pin }), h('dd', { text: `stand ${x.board} (${x.move === 'none' ? 'no move' : 'move ' + x.move})` })])),
      h('p', { class: 'muted small' }, 'Keep the same target; only your feet move.', provChip('usbc', 'USBC'))));
    // ---- release card
    body.append(releaseCard(P, b));
  }
  // ---- CC1 quick log: strike 1 tap; a one-pin spare 3 taps (pin, Log leave, /). Each tap is one shot.logged event in
  // IndexedDB before the screen moves on, so killing the tab loses nothing already shown.
  function quickLog(P, s, cur, b) {
    const game = s.game || 1, mine = P.shots.filter(x => x.sessionId === sid && x.frame != null && (x.game || 1) === game);
    const st = Q.stateOf(mine.map(x => ({ down: x.down, leave: x.leave || [], foul: !!x.foul })));
    const hand = b.hand === 'left' ? 'left' : 'right', facingLeave = st.standing.length < 10;
    const log = async kind => {
      if (st.done) return;
      const t = Q.throwOf(kind, st.standing, { leave: [...ql.leave], foul: ql.foul });
      const split = !facingLeave && !t.foul && t.leave.length > 0 && Q.leaveHint(t.leave).split;
      await add('shot.logged', sid, { sessionId: sid, game, frame: st.frame, roll: st.roll, down: t.down, leave: t.leave, foul: !!t.foul, split: !!split,
        ballId: cur.id, catalogId: cur.catalogId, miss: !facingLeave ? ql.tag : null });
      ql.leave.clear(); ql.foul = false; ql.tag = null; draw();
    };
    const frames = h('div', { class: 'frames', id: 'qlFrames', role: 'list', 'aria-label': `Game ${game} frames` }, ...Array.from({ length: 10 }, (_, i) => {
      const fr = st.frames[i], cls = 'fr' + (!st.done && i === st.frame - 1 ? ' cur' : '');
      const mk = fr ? fr.marks.join(' ') : '';
      return h('div', { class: cls, role: 'listitem', 'data-f': i + 1, 'aria-label': `Frame ${i + 1}: ${mk || 'not bowled'}${fr && fr.split ? ', split' : ''}${fr && fr.cum != null ? ', ' + fr.cum : ''}` },
        h('span', { class: 'muted', text: String(i + 1) }), h('b', { text: (fr && fr.split ? '\u25CB' : '') + mk }), h('span', { class: 'num', text: fr && fr.cum != null ? String(fr.cum) : '' }));
    }));
    const head = h('div', { class: 'row between' }, h('h2', { class: 'card-title', text: `Quick log \u00b7 game ${game}` }),
      h('span', { class: 'pill', id: 'qlWhere', text: st.done ? `Final ${st.total}` : `Frame ${st.frame} \u00b7 ball ${st.roll}` }));
    const card = h('div', { class: 'card', id: 'tnLog' }, head, frames);
    if (st.done) {
      card.append(h('p', { class: 'coach', text: `${st.total} in game ${game}.` }), h('button', { class: 'btn primary block', id: 'qlNext', onclick: () => save({ game: game + 1 }) }, `Start game ${game + 1}`));
    } else {
      const pins = h('div', { class: 'pins', id: 'qlPins', role: 'group', 'aria-label': facingLeave ? 'Tap the pins still standing' : 'Tap the pins left standing' },
        ...Q.LAYOUT.map(([pin, col]) => { const up = st.standing.includes(pin);
          return h('button', { class: 'pin', 'data-pin': pin, 'aria-pressed': String(ql.leave.has(pin)), disabled: !up, 'aria-label': `Pin ${pin}`, style: { gridColumn: `${col + 1} / span 2`, gridRow: String(pin >= 7 ? 1 : pin >= 4 ? 2 : pin >= 2 ? 3 : 4) },
            onclick: () => { ql.leave.has(pin) ? ql.leave.delete(pin) : ql.leave.add(pin); draw(); } }, String(pin)); }));
      const n = ql.leave.size;
      const btns = h('div', { class: 'btn-grid', id: 'qlBtns' },
        facingLeave ? h('button', { class: 'btn primary', id: 'qlSpare', onclick: () => log('all') }, '/ Spare') : h('button', { class: 'btn primary', id: 'qlStrike', onclick: () => log('all') }, 'X Strike'),
        h('button', { class: 'btn ghost', id: 'qlLeave', disabled: !n, onclick: () => log('leave') }, n ? `Log ${n} standing` : 'Tap pins standing'),
        facingLeave ? h('button', { class: 'btn ghost', id: 'qlMiss', onclick: () => log('none') }, '\u2013 Missed all') : null,
        h('button', { class: 'btn ghost', id: 'qlFoul', 'aria-pressed': String(ql.foul), onclick: () => { ql.foul = !ql.foul; draw(); } }, 'F Foul'));
      card.append(pins, btns);
      if (!facingLeave) card.append(h('div', { class: 'fld' }, h('span', { text: 'First ball hit (optional, for triggers)' }),
        segmented('First ball hit', [['pocket', 'Pocket'], ['high', 'High'], ['light', 'Light']], ql.tag, v => { ql.tag = ql.tag === v ? null : v; draw(); }, 'wide')));
      const hint = Q.leaveHint(facingLeave ? st.standing : [...ql.leave], 20, hand);
      if (hint) card.append(h('p', { class: 'small', id: 'qlHint' }, hint.split ? h('span', { class: 'pill', id: 'qlSplit', text: 'Split' }) : null, ' ',
        `${hint.leave.join('-')}: ` + hint.keys.map(k => `key pin ${k.key} \u2192 stand ${k.board}${k.move === 'none' ? '' : ' (move ' + k.move + ')'}`).join('; or ') + '. Same target.', provChip('usbc', 'USBC 3-6-9')));
    }
    // triggers: first balls + reads this session, newest last
    const seq = P.shots.filter(x => x.sessionId === sid && x.roll === 1 && x.frame != null).map(x => ({ ts: x.ts, miss: x.miss || (x.down === 10 ? 'strike' : null) }))
      .concat((s.reads || []).map(x => ({ ts: x.ts, read: x.read }))).sort((a, b) => a.ts - b.ts);
    const tr = R.trigger(seq, { hand: b.hand === 'left' ? 'left' : 'right' });
    if (tr) card.append(h('div', { class: 'warn-box', id: 'qlTrigger', role: 'status' }, tr.text, provChip('assumed', 'team rule')));
    const last = mine[mine.length - 1];
    if (last) card.append(h('button', { class: 'btn ghost block', id: 'qlUndo', onclick: async () => { await addMany([voidEvent(last.id, { deviceId: deviceId(), prov: { kind: 'user' } })]); draw(); } }, `Undo last ball (frame ${last.frame})`));
    return card;
  }
  // ---- Bag Advisor (TEAM_PROMPT_BAG_ADVISOR.md): event \u2192 packed bag with roles, evidence and a start line.
  function advisorCard(P, s, b) {
    const ap = prefs().advisor || {}, ev = s.event || ap.last || null;
    const card = h('div', { class: 'card adv', id: 'tnAdvisor' }, h('h2', { class: 'card-title', id: 'advTitle', text: 'Where are you bowling?' }));
    const pick = h('div', { class: 'seg wrap', role: 'radiogroup', 'aria-labelledby': 'advTitle', id: 'advEvent' }, ...Object.entries(A.EVENTS).map(([k, e]) =>
      h('button', { class: 'seg-opt', role: 'radio', 'aria-checked': String(k === ev), 'data-event': k, onclick: () => { setPrefs({ advisor: Object.assign({}, prefs().advisor, { last: k }) }); save({ event: k, pickId: null }); } }, e.short)));
    card.append(pick);
    if (!ev) { card.append(h('p', { class: 'muted small', text: 'Pick one: your bag, first ball and where to stand appear here.' })); return card; }
    const mem = ap[ev] || {}, pat = s.ft != null ? { slug: s.patternSlug, name: s.patternName || s.patternSlug, ft: s.ft, ml: s.ml, ratio: s.ratio } : null;
    const ft = pat ? pat.ft : R.HOUSE_ASSUMED.ft, r31 = R.rule31(ft);
    const cur = Object.values(P.bags).find(x => x.format === A.EVENTS[ev].format);
    const a = A.advise(P, { event: ev, pattern: pat, tert: TERT, surface: s.surface, style: b.style || 'tweener', health: P.health, swaps: mem.swaps || {}, current: cur ? cur.slots.map(x => x.owned) : [],
      line: c => modelLine(c, { speed: num(b.speed) || 15, rev: num(b.rev) || 220, ft, finish: 'factory', target31: r31.target }) });
    if (a.none) { card.append(h('p', { class: 'muted', text: a.reason }), h('button', { class: 'btn block', onclick: () => go('#/arsenal') }, 'Open Arsenal \u203a')); return card; }
    const ml = a.line, st = ml && !ml.none ? standOf(ml.feet) : null;
    card.append(h('p', { class: 'coach', id: 'advStart', role: 'status', text: st ? `Start with: ${a.A.name}, from feet ${st.feet}, aim ${ml.target} at the arrows.` : `Start with: ${a.A.name}. ${(ml && ml.reason) || 'spec TBD: no model line'}, so set feet and eyes on Targeting.` },
      st ? provChip('model', st.assumed ? '2-D model \u00b7 offset 7 assumed' : '2-D model') : null));
    const packed = mem.packedTs && P.bags['bag-adv-' + ev];
    const list = h('ul', { class: 'adv-list', id: 'advList' }, ...a.rows.map(r => {
      const conf = provChip(r.confidence.key === 'measured' ? 'device' : r.confidence.key === 'spec' ? 'catalog' : 'assumed', r.confidence.label);
      const li = h('li', { class: 'adv-row', 'data-owned': r.ownedId, 'data-role': r.role },
        h('div', { class: 'adv-head' }, h('b', { text: r.name }), h('span', { class: 'pill' + (r.role === 'benchmark' ? ' gold' : ''), text: r.role }), conf),
        h('p', { class: 'small muted', text: r.reason }),
        r.evidence ? h('p', { class: 'small', 'data-evidence': '' }, r.evidence) : null,
        r.warning ? h('p', { class: 'small adv-warn', 'data-warn': '' }, '\u26a0 ' + r.warning) : null);
      if (r.role !== 'spare') li.append(h('button', { class: 'btn sm ghost', 'data-swap': r.ownedId, 'aria-expanded': String(swapOpen === r.ownedId), 'aria-label': `Swap ${r.name}`, onclick: () => {
        if (!a.bench.length) { toast('No other available ball. Mark one \u201cin bag\u201d on Arsenal.'); return; } swapOpen = swapOpen === r.ownedId ? null : r.ownedId; draw(); } }, 'Swap'));
      if (swapOpen === r.ownedId) li.append(h('div', { class: 'chips', role: 'group', 'aria-label': `Swap ${r.name} for` }, ...a.bench.map(x => h('button', { class: 'btn sm', 'data-swap-to': x.ownedId, onclick: () => {
        const m = Object.assign({}, prefs().advisor), e2 = Object.assign({}, m[ev]); e2.swaps = Object.assign({}, e2.swaps); for (const [k, v] of Object.entries(e2.swaps)) if (v === r.ownedId) delete e2.swaps[k];
        e2.swaps[r.ownedId] = x.ownedId; m[ev] = e2; swapOpen = null; setPrefs({ advisor: m }); draw(); toast(`${x.name} in for ${r.name}.`); } }, x.name))));
      return li; }));
    card.append(list);
    const id = 'bag-adv-' + ev;
    card.append(h('div', { class: 'btn-grid' }, h('button', { class: 'btn primary', id: 'advPack', onclick: async () => {
      const slots = a.slots.concat(a.spare ? [a.spare] : []).map(o => ({ owned: o, locked: false }));
      await add('bag.saved', id, { name: `${A.EVENTS[ev].label} (advisor)`, format: A.EVENTS[ev].format, slots, spare: a.spare || null, excluded: [], eventDate: today(), source: 'advisor', event: ev });
      setPrefs({ advisor: Object.assign({}, prefs().advisor, { [ev]: Object.assign({}, (prefs().advisor || {})[ev], { packedTs: Date.now(), slots: a.slots, spare: a.spare }) }) });
      await save({ bagId: id, pickId: a.A.ownedId }); toast(`Packed: ${a.rows.map(r => r.name).join(', ')}.`); } }, packed ? 'Packed \u2713 Pack again' : 'Pack this'),
      h('button', { class: 'btn ghost', id: 'advBuilder', onclick: () => go('#/bag') }, 'Full bag builder \u203a')));
    if (a.plan.length) card.append(h('p', { class: 'small', id: 'advPlan' }, h('b', { text: 'Then: ' }), a.plan.map(x => `${x.k} ${x.name} (${x.when})`).join(' \u2192 ')));
    card.append(h('p', { class: 'small', id: 'advWhy' }, h('b', { text: 'Why this bag: ' }), a.why),
      h('p', { class: 'small muted', id: 'advChange' }, h('b', { text: 'What would change it: ' }), a.change, ' ', h('a', { class: 'srclink', href: A.MIN_SRC.url, target: '_blank', rel: 'noopener', text: A.MIN_SRC.label })));
    if (a.noData) card.append(h('div', { class: 'row', id: 'advNoData' }, h('button', { class: 'btn sm', onclick: () => document.getElementById('tnLog') && document.getElementById('tnLog').scrollIntoView() }, 'Quick-log a game'), h('button', { class: 'btn sm', onclick: () => go('#/import') }, 'Import results')));
    if (packed) { const pl = packList(a.slots.map(o => ({ ownedId: o, catalogId: P.owned[o] && P.owned[o].catalogId, name: short(P.owned[o] && (P.owned[o].name || (catOf(P.owned[o].catalogId) || {}).name)), benchmark: o === a.A.ownedId, status: P.owned[o] && P.owned[o].status })),
        a.spare ? { ownedId: a.spare, name: short(P.owned[a.spare].name) } : null, { health: P.health });
      card.append(h('details', { class: 'adv-pack', id: 'advPackList', open: true }, h('summary', { text: `Pack list \u00b7 ${pl.rows.length} balls` }),
        h('ol', { class: 'small' }, ...pl.rows.map(x => h('li', {}, h('b', { text: x.name }), ` \u00b7 ${x.role}`))))); }
    return card;
  }
  function bowlerOf(P) { return P.bowler || {}; }
  function num(f) { const v = f && typeof f === 'object' ? f.v : f; return v === '' || v == null || isNaN(+v) ? null : +v; }
  function releaseCard(P, b) {
    const lab = f => { const p = f && f.prov; return p && p.kind === 'device' ? provChip('device', p.label || 'LaneTrax') : f == null ? provChip('assumed', 'not set') : provChip(null, 'you reported'); };
    const val = (f, u) => { if (f == null) return '\u2014'; const v = typeof f === 'object' ? f.v : f; return (f.approx ? '~' : '') + v + (u ? ' ' + u : ''); };
    const rows = [['Hand', b.hand], ['Style', b.style], ['Speed', b.speed, 'mph'], ['Rev rate', b.rev, 'rpm'], ['PAP', b.pap, 'in'], ['Tilt', b.tilt], ['Rotation', b.rotation]];
    const pend = P.measurements.filter(m => !m.accepted && m.source === 'lanetrax');
    return h('div', { class: 'card', id: 'tnRelease' }, h('h2', { class: 'card-title', text: 'Your release' }),
      h('dl', { class: 'kv' }, ...rows.flatMap(([k, f, u]) => [h('dt', { text: k }), h('dd', {}, val(f, u), lab(typeof f === 'object' ? f : f == null ? null : { v: f }))])),
      b.speed && b.speed.at === 'unknown' ? h('p', { class: 'muted small', text: 'Speed measurement point unknown (release or impact).' }) : null,
      pend.length ? h('div', { class: 'stack', id: 'tnMeas' }, h('h3', { class: 'section-title', text: 'From your LaneTrax import' }),
        ...pend.map(m => { const what = m.speed ? `Speed ${m.speed.v} mph (${m.speed.at || 'point unknown'})` : `Rev rate ${m.rev.v} rpm`;
          return h('div', { class: 'row between' }, h('span', {}, what, provChip('device', `LaneTrax \u00b7 ${m.date}`)),
            h('button', { class: 'btn sm', 'data-accept': m.id, onclick: async () => {
              const k = m.speed ? 'speed' : 'rev', f = m.speed ? { v: m.speed.v, unit: 'mph', at: m.speed.at || 'unknown' } : { v: m.rev.v, unit: 'rpm' };
              f.prov = { kind: 'device', ref: 'lanetrax', label: `LaneTrax \u00b7 ${m.date}`, measurementId: m.id };
              await addMany([mkEvent('releaseMeasurement.accepted', m.id, { measurementId: m.id, fields: { [k]: f } }, { deviceId: deviceId(), prov: { kind: 'user' } }),
                mkEvent('bowler.edited', 'me', { fields: { [k]: f } }, { deviceId: deviceId(), prov: { kind: 'device', ref: 'lanetrax', measurementId: m.id } })]);
              toast(`${f.v} ${f.unit} accepted from LaneTrax.`);
            } }, 'Accept')); })) : null);
  }
  draw();
  if (!IDX) loadIndex().then(x => { IDX = x; TERT = R.tertiles(x); draw(); }).catch(() => {});
  const offs = [on('data', () => { if (!body.contains(document.activeElement) || document.activeElement.tagName === 'BUTTON') draw(); })];
  window.__apTonightMs = Math.round(performance.now() - t0);
  return { el, title: 'Tonight', destroy() { offs.forEach(f => f()); } };
}
