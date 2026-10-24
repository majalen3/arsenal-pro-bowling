// Tonight (CC0): pick a ball for tonight's lanes from YOUR bag, say why, and give a starting line. Decision core is
// js/cc/rank.js (pure); the line check is the unchanged engine via js/cc/model.js. Every number shows its source.
// Sim fixes (docs/user-simulations.md): one line source (cc/line.js), nights not days (cc/night.js), the bowler's own hand
// and stand for spare hints, 400 ms double-tap guard, and a game-open layout that shows only what you need mid-game.
import { fmtHalf } from '../labels.js';
import { h, icon, toast, segmented } from '../ui.js';
import { go } from '../router.js';
import { ready, proj, add, addMany, loadStarter } from '../hub.js';
import { on, today, deviceId, prefs, setPrefs, profile } from '../store.js';
import { mkEvent, voidEvent } from '../data/events.js';
import { playOrder } from '../data/scoring.js';
import * as Q from '../cc/quicklog.js';
import * as FX from '../cc/fix.js';
import * as R from '../cc/rank.js';
import { loadIndex } from '../patdata.js';
import { catOf } from '../cc/cats.js';
import * as A from '../cc/advisor.js';
import { packList } from '../cc/bag.js';
import { standOf, lineFor } from '../cc/line.js';
import { openNight, newNightId, dayKey } from '../cc/night.js';
import { sessionsOf, recapOf } from '../cc/card.js';
import * as LG from '../cc/league.js';
import * as PR from '../cc/protect.js';
import * as WK from '../cc/wake.js';
import * as CM from '../cc/center.js';
import * as OP from '../cc/ownpat.js';
import * as DR from '../cc/drill.js';
import * as hub from '../hub.js';
import * as ST from '../cc/status.js';
import * as BE from '../cc/bagedit.js';
import { helpDot, withHelp } from './help.js';
import * as HAND from '../cc/hand.js';
import { handAsk, handLine } from './hand.js';
export { standOf };
const short = n => String(n || '').replace(/^(Radical|Storm|Hammer|900 Global|Columbia 300|Roto Grip|Motiv)\s+/, '');
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const provChip = (prov, label) => h('span', { class: 'prov', 'data-prov': prov || null, text: label });
const SRC_PROV = { [R.SRC.assumed]: 'assumed', [R.SRC.model]: 'model', [R.SRC.spec]: 'manufacturer', [R.SRC.usbc]: 'usbc', [R.SRC.bowl]: 'usbc', [R.SRC.tag]: 'catalog' };
export const TAP_GUARD_MS = 400;   // sim bug 2: a second tap on a log button within this window is ignored
let IDX = null, TERT = null;
// The bowler's hand: only what they told us (cc/hand.js; owner 2026-10-24: no auto-detection). Unset reads boards right-handed.
export const handOf = () => HAND.handOr();
export async function render() {
  const t0 = performance.now();
  await ready();
  let sid = openNight(proj()) || newNightId(proj());
  // The current night: stays put across midnight; a new one only after "End night" (or 4 h idle on the next open).
  const curSid = () => { const s = proj().sessions[sid]; if (s && s.ended) sid = openNight(proj()) || newNightId(proj()); return sid; };
  const body = h('div', { class: 'stack', id: 'tonightBody' });
  const net = h('span', { class: 'pill net-chip', id: 'netChip', role: 'status', hidden: navigator.onLine, text: 'Offline \u00b7 saved on this phone' });
  const el = h('section', { class: 'screen list-screen', id: 'tonight' }, h('header', { class: 'appbar' }, h('h1', { class: 'title', text: 'Tonight' }), net), body);
  const setNet = () => { net.hidden = navigator.onLine; };
  window.addEventListener('online', setNet); window.addEventListener('offline', setNet);
  const ql = { leave: new Set(), foul: false, tag: null };   // quick-log taps not yet written
  let drillOpen = false, swapOpen = null, lastTap = 0, busy = false, moreOpen = false, savedMsg = '', frameT0 = 0, edit = null, lastEdit = null, pickFix = false, ballOpen = false, teamOpen = null;
  let local = {};   // UI state not yet written (avoids re-render churn while typing)
  const sess = () => Object.assign({ kind: 'tonight', patternSlug: null, ft: null, ml: null, ratio: null, centerId: null, surface: 'unknown', stage: 'fresh', bagId: null, game: 1, pickId: null, reads: [] }, (proj().sessions || {})[curSid()], local);
  async function save(fields) {
    const id = curSid(); fields = Object.assign({ editTs: Date.now() }, fields);
    Object.assign(local, fields);
    const P = proj(), ev = P.sessions[id] ? mkEvent('session.edited', id, { fields }, { deviceId: deviceId(), prov: { kind: 'user' } })
      : mkEvent('session.created', id, Object.assign({ kind: 'tonight', date: dayKey(Date.now()) }, sess(), fields), { deviceId: deviceId(), prov: { kind: 'user' } });
    await addMany([ev]); local = {}; draw();
  }
  const swapIn = (P, bag, from, to) => add('bag.saved', bag.id, BE.swap(P, bag, from, to));
  function bagOf(P, s) {
    // P1.1: ONE saved bag. Tonight, the builder and the ball chip all read the latest bag.saved (status.js currentBag).
    const bags = Object.values(P.bags), bag = ST.currentBag(P);
    // P1.3: only what is actually packed (status.js) — a ball moved to At home / the pro shop / Retired drops out at once.
    const ids = bag ? ST.packedIds(P, bag) : Object.values(P.owned).filter(ST.inMyBag).map(o => o.id);
    const spare = bag && ids.includes(bag.spare) ? bag.spare : null;
    const list = ids.filter(id => id !== spare && P.owned[id]).map(id => { const o = P.owned[id]; const c = catOf(o.catalogId);
      return { ownedId: id, catalogId: o.catalogId || null, name: short(o.name || (c && c.name)), benchmark: !!o.benchmark, finish: o.finish || 'factory' }; });
    return { bag, bags, list, spare: spare && P.owned[spare] ? P.owned[spare] : null };
  }
  const gameOf = (P, s, who = 'me') => { const game = s.game || 1, src = who === 'me' ? P.shots : (P.teamShots || []).filter(x => x.who === who), mine = playOrder(src.filter(x => x.sessionId === curSid() && x.frame != null && (x.game || 1) === game));
    return { game, who, mine, st: Q.stateOf(mine.map(x => ({ down: x.down, leave: x.leave || [], foul: !!x.foul }))) }; };
  function draw() {
    const P = proj(), s = sess(), b = bowlerOf(P), hand = handOf(P);
    const keepOpen = document.getElementById('tnMore'); if (keepOpen) moreOpen = keepOpen.open;
    body.innerHTML = '';
    if (!Object.keys(P.owned).length) {
      body.append(h('div', { class: 'card', id: 'noBag' }, h('h2', { class: 'card-title', text: 'No balls in your bag yet' }),
        h('p', { class: 'muted', text: 'Tonight ranks only balls you own. Load your reported arsenal (10 balls, 2 bags, all marked user-reported) or pick balls on More.' }),
        h('button', { class: 'btn primary block', id: 'loadStarter', onclick: async () => { await loadStarter(); toast('Arsenal loaded. Not yours? Undo it on More \u2192 Imports.'); } }, 'Load starter arsenal'),
        h('button', { class: 'btn block', onclick: () => go('#/more') }, 'Choose balls on More')));
      return;
    }
    const pat = s.ft != null ? { slug: s.patternSlug, name: s.patternName || s.patternSlug, ft: s.ft, ml: s.ml, ratio: s.ratio } : null;
    const center = s.centerId ? P.centers[s.centerId] : null;
    const prevCenters = new Set(Object.values(P.sessions).filter(x => x.id !== curSid() && x.centerId).map(x => x.centerId));
    const d = R.demandOf({ pattern: pat, tert: TERT, surface: s.surface, stage: s.stage });
    const { bag, list, spare } = bagOf(P, s);
    const bf = R.benchFirstReason({ patternKnown: !!pat, centerKnown: !!center, centerNew: !!center && !prevCenters.has(center.id), tournamentFirstGame: !!bag && bag.format === 'tournament6' && (s.game || 1) === 1 });
    const r = R.rank(list, { demand: d.demand, benchFirst: bf, style: b.style || 'tweener' });
    const cur = r.order.find(x => x.id === s.pickId) || r.pick;
    const L = cur ? lineFor(cur.cat, { speed: num(b.speed), rev: num(b.rev), ft: pat ? pat.ft : null }) : null;
    const ml = L ? L.ml : null, stand = L ? L.stand : null;
    // Scoring fix 4: league team (frames in lineup order) or Baker (one team game). One pad; the pill says who is up.
    const team = teamOf(P, s), g = team ? team.g : gameOf(P, s);
    const gameOpen = (team ? team.started : g.mine.length > 0) && !g.st.done;
    WK.keepAwake(WK.shouldHold(gameOpen, prefs().wakeLock));
    // ---- coach line (≤ 2 sentences, starts with a ball name)
    const coach = !cur ? 'Add balls to a bag to get a pick.' : cur === r.pick && bf && cur.benchmark ? `${cur.name} first: ${bf}, so start with your benchmark and read it.`
      : `${cur.name} for demand ${d.demand} of 5${cur.level != null ? ' (level ' + cur.level + ')' : ''}.` + (stand ? ` Stand ${stand.feet}, eyes ${fmtHalf(ml.target)} at the arrows.` : '');
    // ---- setup
    const patIn = h('input', { id: 'tnPattern', type: 'search', list: 'tnPatList', autocomplete: 'off', placeholder: 'House shot (assumed 38 ft)', 'aria-label': 'Pattern', value: pat ? pat.name : s.patternOwn ? s.patternName || '' : '' });
    const dl = h('datalist', { id: 'tnPatList' }, ...(IDX || []).map(x => h('option', { value: x.name })));
    patIn.onchange = async () => { const v = patIn.value.trim(), row = IDX && IDX.find(x => x.name.toLowerCase() === v.toLowerCase());
      if (!v) await save({ pickId: null, patternOwn: false, patternSlug: null, patternName: null, ft: null, ml: null, ratio: null }); else if (row) await save({ pickId: null, patternOwn: false, patternSlug: row.slug, patternName: row.name, ft: row.ft, ml: row.ml, ratio: row.ratio }); else { const o = OP.ownPattern(v); if (!o) return toast('Type a pattern name', { kind: 'bad' }); await save(o); toast(`Saved as your own pattern. Length not entered, so 38 ft is assumed: add details if you know them.`); } };
    // M2 (Sim2 #9): your own / house pattern. Any name is kept; length, volume and ratio are optional, behind one tap.
    const ownDet = s.patternOwn ? (() => { const f = (id, lbl, val, ph) => h('label', { class: 'fld' }, h('span', { text: lbl }), h('input', { id, autocomplete: 'off', inputmode: 'decimal', placeholder: ph, value: val == null ? '' : String(val) }));
      const d = h('details', { class: 'tn-more', id: 'tnOwnPat' }, h('summary', { text: s.ft != null ? 'Pattern details' : 'Add details (length, volume, ratio)' }),
        f('tnOwnFt', 'Length (ft)', s.ft, 'e.g. 41'), f('tnOwnMl', 'Volume (mL, optional)', s.ml, 'e.g. 24'), f('tnOwnRatio', 'Ratio (optional)', s.ratio, 'e.g. 3:1'),
        h('button', { class: 'btn block', id: 'tnOwnSave', onclick: async () => { const q = id => d.querySelector('#' + id).value; const o = OP.ownPattern(s.patternName, { ft: q('tnOwnFt'), ml: q('tnOwnMl'), ratio: q('tnOwnRatio') });
          if (q('tnOwnFt').trim() && o.ft == null) return toast('Length as feet, e.g. 41', { kind: 'bad' }); await save(o); toast(o.ft != null ? `${o.patternName}: ${o.ft} ft, used for the pick and line.` : 'Saved. Length still assumed 38 ft.'); } }, 'Save details'));
      return d; })() : null;
    const cIn = h('input', { id: 'tnCenter', autocomplete: 'off', placeholder: 'Center name', 'aria-label': 'Center', value: center ? center.name : '' });
    cIn.onchange = async () => { const v = cIn.value.trim(); if (!v) return save({ centerId: null }); const id = 'center-' + slug(v);
      if (!P.centers[id]) await add('center.created', id, { fields: { name: v, surface: s.surface } }); await save({ centerId: id }); };
    const cList = h('datalist', { id: 'tnCenterList' }, ...Object.values(P.centers).filter(c => c.name).map(c => h('option', { value: c.name })));
    cIn.setAttribute('list', 'tnCenterList');
    // M1: optional lane pair (kept on the night; shown next time at this center).
    const lpIn = h('input', { id: 'tnLanes', autocomplete: 'off', placeholder: 'e.g. 15-16', 'aria-label': 'Lane pair (optional)', value: s.lanePair || '' });
    lpIn.onchange = async () => { const v = lpIn.value.trim(), c = CM.cleanPair(v); if (v && !c) return toast('Lane pair like 15-16', { kind: 'bad' }); await save({ lanePair: c }); };
    const setup = h('div', { class: 'card', id: 'tnSetup' }, withHelp(h('h2', { class: 'card-title', text: 'Lanes tonight' }), 'ln-house', 'Lanes tonight'),
        h('label', { class: 'fld' }, h('span', {}, 'Pattern ', s.patternOwn ? provChip(s.ft != null ? 'user' : 'assumed', OP.ownLabel(s)) : pat ? provChip('usbc', 'Kegel library') : provChip('assumed', 'assumed house 38 ft')), patIn, dl),
        ownDet,
        h('label', { class: 'fld' }, h('span', { text: 'Center' }), cIn, cList),
        center ? h('label', { class: 'fld' }, h('span', { text: 'Lane pair (optional)' }), lpIn) : null,
        h('div', { class: 'fld' }, h('span', {}, 'Lane surface ', s.surface === 'unknown' ? provChip('assumed', 'unknown') : null), segmented('Lane surface', [['unknown', 'Unknown'], ['wood', 'Wood'], ['synthetic', 'Synthetic']], s.surface, v => { save({ surface: v, pickId: null }); if (center) add('center.edited', center.id, { fields: { surface: v } }); })),
        h('div', { class: 'fld' }, h('span', { text: 'Lane condition' }), segmented('Lane condition', [['fresh', 'Fresh'], ['transition', 'Transition'], ['burn', 'Burned']], s.stage, v => save({ stage: v, pickId: null }))),
        h('div', { class: 'fld' }, h('span', { text: 'Game' }), segmented('Game', [[1, '1'], [2, '2'], [3, '3'], [4, '4+']], s.game || 1, v => save({ game: +v }), 'wide')),
        h('div', { class: 'fld' }, h('span', { text: 'Scoring' }), segmented('Scoring', [['solo', 'Just me'], ['league', 'League team'], ['baker', 'Baker']], s.mode || 'solo', v => save({ mode: v }), 'wide')),
        (s.mode || 'solo') !== 'solo' ? teamSetup(s) : null,
        goalField(s),
        h('button', { class: 'btn ghost block', id: 'tnBagLink', onclick: () => go('#/bag') }, 'Bag builder \u203a'));
    const alt = (x, lbl) => x ? h('button', { class: 'alt btn', 'data-alt': lbl, onclick: () => save({ pickId: x.id, throwId: null }) }, h('small', { class: 'muted', text: lbl + ' ' }), h('b', { text: x.name })) : h('div', { class: 'alt muted', text: `No ${lbl.toLowerCase()} ball in this bag` });
    const alts = cur ? h('div', { class: 'alts' }, alt(r.weaker && cur === r.pick ? r.weaker : R.readMove(r, cur.id, 'early'), 'Weaker'), alt(r.stronger && cur === r.pick ? r.stronger : R.readMove(r, cur.id, 'weak'), 'Stronger')) : null;
    const pl = cur ? R.plan(r, ml) : null;
    const thenLine = pl && (pl.B || pl.C) ? h('p', { class: 'small', id: 'tnThen' }, h('b', { text: 'Then: ' }), [pl.B ? `${pl.B.name} if it hooks early` : null, pl.C ? `${pl.C.name} later` : null].filter(Boolean).join(' \u2192 ')) : null;
    // ---- pick card: name + stand/eyes up front; the why, specs and model numbers behind one tap (GAP §2c).
    let pick = null;
    if (cur) {
      const lineBox = !ml || ml.none ? h('p', { class: 'muted small', id: 'tnModel', text: (ml && ml.reason) || 'spec TBD: no model line' })
        : h('dl', { class: 'kv', id: 'tnModel' }, h('dt', { text: 'Feet (stand)' }), h('dd', { id: 'tnFeet' }, String(stand.feet), provChip(stand.assumed ? 'assumed' : null, stand.assumed ? 'offset 7 assumed' : 'your offset')),
          h('dt', { text: 'Laydown' }), h('dd', {}, String(ml.feet), provChip('model', '2-D model')),
          h('dt', { text: 'Eyes (arrows)' }), h('dd', { text: String(ml.target) }),
          h('dt', { text: 'Breakpoint' }), h('dd', { text: `board ${ml.bp} at ${ml.bpFt} ft` }),
          h('dt', { text: 'Holds' }), h('dd', { text: `${ml.holds} of ${ml.of} small misses (\u00b10.5 mph, \u00b120 rpm, \u00b11 board)` }));
      pick = h('div', { class: 'card pick', id: 'tnPick' },
        h('div', { class: 'row between' }, h('span', { class: 'ball-name', id: 'tnPickName', text: cur.name })),
        stand ? h('p', { class: 'tn-line', id: 'tnStand', text: `Feet ${stand.feet} \u00b7 eyes ${fmtHalf(ml.target)} at the arrows` }) : null,
        stand ? h('button', { class: 'btn primary block', id: 'tnFind', onclick: () => go('#/target?find=1&ball=' + encodeURIComponent(cur.catalogId || '')) }, 'Find my strike line \u203a') : null,
        gameOpen ? null : alts,
        h('details', { class: 'tn-more', id: 'tnPickMore' }, h('summary', { text: 'Why this ball, specs and model' }),
          h('span', { class: 'pill gold', id: 'tnLevel', text: cur.level != null ? `Level ${cur.level} \u00b7 demand ${d.demand}` : `spec TBD \u00b7 demand ${d.demand}` }),
          h('ul', { class: 'why', id: 'tnWhy' }, ...cur.why.concat(d.why.slice(0, 2)).map(w => h('li', {}, w.t, provChip(SRC_PROV[w.src] || null, w.src)))),
          lineBox,
          stand ? h('p', { class: 'muted small', text: `Model runs on the nearest preset (${ml.preset}, ${ml.presetLen} ft) with your ${num(b.speed) || 15} mph and ${num(b.rev) || 220} rpm. An estimate, not a promise.` }) : null));
    }
    const reads = cur ? h('div', { class: 'card', id: 'tnReads' }, withHelp(h('h2', { class: 'card-title', text: 'How did it read?' }), 'tg-hit', 'How did it read'),
      h('div', { class: 'btn-grid' }, ...Object.entries(R.READS).map(([k, l]) => h('button', { class: 'btn', 'data-read': k, onclick: async () => {
        const nx = R.readMove(r, cur.id, k), rd = (s.reads || []).concat([{ read: k, ballId: cur.id, ts: Date.now() }]).slice(-6);
        await save({ pickId: nx ? nx.id : cur.id, throwId: null, reads: rd });
        toast(nx ? `${nx.name}: ${k === 'early' || k === 'angular' ? 'one step ' + (k === 'early' ? 'weaker' : 'smoother') : 'one step ' + (k === 'weak' ? 'stronger' : 'more angular')}.` : `${cur.name} is already the ${k === 'early' ? 'weakest' : k === 'weak' ? 'strongest' : 'closest'} fit in this bag. Move feet and eyes instead.`);
      } }, l)))) : null;
    const pend = P.measurements.filter(m => !m.accepted && m.source === 'lanetrax');
    const measNudge = pend.length ? h('a', { class: 'btn ghost block', id: 'tnMeasNudge', href: '#/card' }, `${pend.length} LaneTrax ${pend.length === 1 ? 'number' : 'numbers'} to review on your Bowler Card \u203a`) : null;
    if (gameOpen) {
      // ---- game open (sim bug 4): ball \u00b7 feet \u00b7 aim, the ball-change line, the scoring card, Weaker/Stronger. The rest behind one tap.
      body.append(h('div', { class: 'card tn-now', id: 'tnNow' },
        h('p', { class: 'tn-line', id: 'tnNowLine' }, h('b', { text: cur ? cur.name : 'No ball' }), stand ? ` \u00b7 feet ${stand.feet} \u00b7 aim ${fmtHalf(ml.target)}` : ''),
        thenLine), quickLog(P, s, cur, b, hand, stand, g, team), alts || '',
        h('details', { class: 'card tn-more', id: 'tnMore', open: moreOpen, ontoggle: e => { moreOpen = e.target.open; } }, h('summary', { text: 'Bag, lanes and line details' }),
          advisorCard(P, s, b), h('p', { class: 'coach', id: 'tnCoach', text: coach }), pick || '', reads || '', setup));
      requestAnimationFrame(padToThumb);
      return;
    }
    // ---- before a game / between games
    body.append(advisorCard(P, s, b));
    const lastCard = lastTimeCard(P, s, center); if (lastCard) body.append(lastCard);
    const fc = prefs().focus;
    if (fc && fc.text && fc.from !== curSid()) body.append(h('div', { class: 'row between tn-focus', id: 'tnFocus' }, h('p', { class: 'small', text: fc.text.replace(/^Next focus: /, 'Your focus: ') }),
      h('button', { class: 'icon-btn', 'aria-label': 'Clear focus', html: icon('close'), onclick: () => { setPrefs({ focus: null }); draw(); } })));
    body.append(h('p', { class: 'coach', id: 'tnCoach', role: 'status', text: coach }));
    body.append(handAsk() || handLine());   // P1.6: "Right-handed \u00b7 change"; asks once while unset (never during a game)
    if (thenLine) body.append(thenLine);
    if (pick) body.append(pick);
    if (s.event === 'practice') body.append(drillCard(P, s));
    body.append(quickLog(P, s, cur, b, hand, stand, g, team));
    if (reads) body.append(reads);
    body.append(setup);
    if (measNudge) body.append(measNudge);
  }
  // ---- M3 spare drill (practice nights, no game open): your most-missed leaves, Made / Missed per try, one line of totals.
  // Attempts sit on the night (session.edited {drill}); they never touch a score or an average.
  function drillCard(P, s) {
    const L = DR.drillLeaves(P), st = DR.drillStats(s.drill), by = Object.fromEntries(st.byLeave.map(x => [x.leave, x]));
    const tap = (leave, made) => async () => { if (Date.now() - lastTap < TAP_GUARD_MS) return; lastTap = Date.now(); drillOpen = true; await save({ drill: DR.addAttempt(s.drill, leave, made) }); };
    const d = h('details', { class: 'card tn-more', id: 'tnDrill', open: drillOpen, ontoggle: e => { drillOpen = e.target.open; } },
      h('summary', { text: st.n ? `Spare drill · ${st.made} of ${st.n} made` : 'Spare drill' }),
      h('p', { class: 'small muted', id: 'tnDrillFrom', text: L.from === 'your misses' ? 'Your most-missed leaves from your scored games.' : 'No misses logged yet, so the two corner pins.' }),
      ...L.list.map(x => { const b = by[x.leave]; return h('div', { class: 'drill-row', 'data-leave': x.leave },
        h('p', { class: 'small' }, h('b', { text: x.leave.includes('-') ? x.leave : x.leave + ' pin' }), ` · ${x.why}` + (b ? ` · tonight ${b.made} of ${b.n}` : '')),
        h('div', { class: 'btn-grid' }, h('button', { class: 'btn', 'data-drill': 'made', onclick: tap(x.leave, true) }, 'Made'), h('button', { class: 'btn', 'data-drill': 'miss', onclick: tap(x.leave, false) }, 'Missed'))); }),
      h('p', { class: 'muted small', text: 'Practice only: drill tries never count in a score or your average.' }));
    return d;
  }
  // ---- M3 one process goal (optional, chosen before a game; read on the recap with its n). Spares made, never a score.
  function goalField(s) {
    const g = DR.cleanGoal(s.goal), k = g ? g.k : 'none';
    const tgt = h('select', { id: 'tnGoalN', 'aria-label': 'Goal: how many of 10' }, ...Array.from({ length: 10 }, (_, i) => h('option', { value: String(i + 1), text: `${i + 1} of 10`, selected: g ? g.target === i + 1 : i === 7 })));
    tgt.onchange = () => save({ goal: { k, target: +tgt.value } });
    return h('div', { class: 'fld', id: 'tnGoal' }, h('span', { text: 'One goal for tonight (optional)' }),
      segmented('Goal', [['none', 'None'], ['single', 'Single-pin spares'], ['drill', 'Drill spares']], k, v => save({ goal: v === 'none' ? null : { k: v, target: g ? g.target : 8 } }), 'wide'),
      g ? tgt : null);
  }
  // ---- M1 center memory: before the first ball of a night only. One line (numbers first), the note you left, one button;
  // older visits behind a tap. Nothing here is a recommendation: it is what you did last time.
  function lastTimeCard(P, s, center) {
    if (!center || g0(P)) return null;
    const vs = CM.visitsOf(P, center.id, curSid()), note = CM.noteOf(P, center.id); if (!vs.length && !note) return null;
    const nameOf = id => { const o = P.owned[id]; return o ? short(o.name || (catOf(o.catalogId) || {}).name) : null; };
    const v = vs[0], f = v ? CM.setupOf(v) : null, same = f && Object.keys(f).every(k => k === 'pickId' || (s[k] ?? null) === (f[k] ?? null));
    return h('div', { class: 'card', id: 'tnLast' }, h('h2', { class: 'card-title', text: `Last time at ${center.name}` }),
      v ? h('p', { class: 'small', id: 'tnLastLine', text: CM.lineOf(v, nameOf) }) : null,
      note ? h('p', { class: 'small', id: 'tnLastNote' }, h('b', { text: 'Your note: ' }), note) : null,
      f && !same ? h('button', { class: 'btn block', id: 'tnUseLast', onclick: async () => { await save(f); toast('Last setup copied. The pick is worked out again for it.'); } }, 'Use last setup') : null,
      vs.length > 1 ? h('details', { class: 'tn-more', id: 'tnLastAll' }, h('summary', { text: `All ${vs.length} visits` }), h('ul', { class: 'plain small' }, ...vs.slice(0, 10).map(x => h('li', { text: CM.lineOf(x, nameOf) })))) : null);
  }
  const g0 = P => P.shots.some(x => x.sessionId === curSid()) || (P.teamShots || []).some(x => x.sessionId === curSid());
  // ---- CC1 quick log: strike 1 tap; a one-pin spare 3 taps (pin, Log leave, /). Each tap is one shot.logged event in
  // IndexedDB before the screen moves on, so killing the tab loses nothing already shown.
  function teamOf(P, s) {
    const mode = s.mode || 'solo'; if (mode === 'solo') return null;
    const lg = Object.assign({}, LG.DEFAULTS, prefs().league || {}), lineup = LG.lineupOf(lg);
    if (mode === 'baker') { const bg = gameOf(P, s, 'baker'); return { mode, lg, lineup, games: { baker: bg }, g: bg, started: bg.mine.length > 0, up: bg.st.done ? null : LG.bakerOwner(bg.st.frame, lineup) }; }
    const games = {}; for (const x of lineup) if (x.status === 'in') games[x.who] = gameOf(P, s, x.who);
    const done = {}; for (const [k, v] of Object.entries(games)) done[k] = v.st.done ? 10 : v.st.frame - 1;
    const up = LG.nextUp(lineup, done);
    return { mode, lg, lineup, games, g: up ? games[up.who] : games.me, started: Object.values(games).some(v => v.mine.length > 0), up };
  }
  // League settings (behind one tap, never during a frame): the bowler's average, handicap basis / %, up to 3 teammates.
  function teamSetup(s) {
    const lg = Object.assign({}, LG.DEFAULTS, prefs().league || {}), tm = (lg.team || []).slice(0, 3);
    const setLg = patch => { setPrefs({ league: Object.assign({}, prefs().league || {}, patch) }); draw(); };
    const setTm = (i, patch) => setLg({ team: tm.map((x, j) => j === i ? Object.assign({}, x, patch) : x) });
    const numIn = (id, label, val, on) => h('input', { id, type: 'number', inputmode: 'numeric', min: 0, max: 300, 'aria-label': label, value: val == null ? '' : String(val), onchange: e => on(e.target.value === '' ? null : Math.trunc(+e.target.value)) });
    return h('details', { class: 'tn-more', id: 'tnTeam', open: teamOpen == null ? !tm.length : teamOpen, ontoggle: e => { teamOpen = e.target.open; } }, h('summary', { text: 'Team and handicap' }),
      h('label', { class: 'fld' }, h('span', { text: 'Your league average' }), numIn('lgMyAvg', 'Your league average', lg.myAvg, v => setLg({ myAvg: v }))),
      h('div', { class: 'fld' }, h('span', { text: 'Handicap basis' }), segmented('Handicap basis', LG.BASES.map(x => [x, String(x)]), lg.basis, v => setLg({ basis: +v }), 'wide')),
      h('div', { class: 'fld' }, h('span', { text: 'Handicap percent' }), segmented('Handicap percent', LG.PCTS.map(x => [x, x + '%']), lg.pct, v => setLg({ pct: +v }), 'wide')),
      h('p', { class: 'muted small', id: 'lgRule', text: `Handicap = (basis \u2212 average) \u00d7 percent, fractions dropped. USBC uses ${LG.USBC_PCT}% unless your league rule says otherwise (Rule 100d-2).` }),
      ...tm.map((t, i) => h('div', { class: 'lg-mate', 'data-mate': i },
        h('div', { class: 'lg-row' },
          h('label', { class: 'fld' }, h('span', { text: `Bowler ${i + 2}` }), h('input', { id: `lgName${i}`, autocomplete: 'off', value: t.name || '', disabled: t.status === 'vacancy', onchange: e => setTm(i, { name: e.target.value.trim().slice(0, 24) }) })),
          h('label', { class: 'fld' }, h('span', { text: 'Average' }), numIn(`lgAvg${i}`, `Bowler ${i + 2} average`, t.avg, v => setTm(i, { avg: v }))),
          h('button', { class: 'icon-btn', 'aria-label': `Remove bowler ${i + 2}`, html: icon('close'), onclick: () => setLg({ team: tm.filter((_, j) => j !== i) }) })),
        segmented(`Bowler ${i + 2} status`, [['in', 'Bowling'], ['absent', 'Absent'], ['vacancy', 'Vacancy']], t.status || 'in', v => setTm(i, { status: v }), 'wide'))),
      tm.length < 3 ? h('button', { class: 'btn ghost block', id: 'lgAdd', onclick: () => setLg({ team: tm.concat([{ who: 'tm-' + Date.now().toString(36), name: '', avg: null, status: 'in' }]) }) }, 'Add a bowler') : null,
      h('p', { class: 'muted small', text: `Only your own frames count in your stats.${(s.mode || 'solo') === 'baker' ? ' Baker games are not in averages (USBC Rule 3a).' : ''}` }));
  }
  // Team board (behind one tap): scratch, handicap and total per spot, absentee / vacancy per USBC Rule 112.
  function teamBoard(team, game) {
    const run = st => { const c = st.frames.map(f => f.cum).filter(v => v != null); return c.length ? `${c[c.length - 1]} so far` : '\u2014'; };
    const cfg = team.lg, rows = [];
    let tt;
    if (team.mode === 'baker') {
      const st = team.games.baker.st, hd = team.lineup.reduce((a, b) => a + (b.status === 'in' ? LG.handicap(b.avg, cfg) || 0 : 0), 0);
      rows.push(['Team game', st.done ? String(st.total) : run(st), String(hd), st.done ? String(st.total + hd) : '\u2014']);
      tt = null;
    } else {
      const spots = team.lineup.map(b => { const g = team.games[b.who], x = LG.spotScore(b, g && g.st.done ? g.st.total : null, cfg);
        rows.push([b.name, x.kind === 'bowled' ? (x.scratch != null ? String(x.scratch) : g ? run(g.st) : '\u2014') : `${x.scratch} (${x.kind === 'vacancy' ? 'vacancy' : 'absentee'})`, x.hdcp == null ? 'no average' : String(x.hdcp), LG.total(x) != null ? String(LG.total(x)) : '\u2014']); return x; });
      tt = LG.teamTotal(spots);
    }
    return h('details', { class: 'tn-more', id: 'qlBoard', open: !!(team.g.st.done) }, h('summary', { text: `Team board \u00b7 game ${game}` }),
      h('table', { class: 'bc-tbl', id: 'qlBoardTbl' }, h('thead', {}, h('tr', {}, h('th', { text: 'Bowler' }), h('th', { text: 'Scratch' }), h('th', { text: 'Hdcp' }), h('th', { text: 'Total' }))),
        h('tbody', {}, ...rows.map(r => h('tr', {}, h('th', { text: r[0] }), ...r.slice(1).map(v => h('td', { text: v })))),
          tt ? h('tr', { class: 'tot' }, h('th', { text: 'Team' }), h('td', { text: tt.done ? String(tt.scratch) : '\u2014' }), h('td', { text: String(tt.hdcp) }), h('td', { text: tt.done ? String(tt.total) : '\u2014' })) : null)),
      h('p', { class: 'muted small', text: `Handicap ${cfg.pct}% of ${cfg.basis}, fractions dropped (USBC Rule 100d-2). ${team.mode === 'baker' ? 'Baker games are not in averages (Rule 3a); team handicap here is the sum of each bowler\u2019s, check your league rule.' : 'Absentee = average \u2212 10, vacancy = 120 (Rule 112).'}` }));
  }
  function quickLog(P, s, cur, b, hand, stand, g, team) {
    const sid = curSid();
    if (edit && (edit.game !== g.game || edit.sid !== sid || (team && !team.games[edit.who]))) edit = null;
    // sim2 #3: a fix works on the frame owner's game (mine or a teammate's), whoever is up now.
    if (edit && team && team.games[edit.who]) g = team.games[edit.who];
    const { game, mine, st: live, who } = g, meUp = edit ? who === 'me' : !team || (team.mode !== 'baker' && (!team.up || team.up.who === 'me'));
    const whoF = who && who !== 'me' ? { who } : {};
    const league = !!(team && team.mode === 'league'), nameOf = w => league ? ((team.lineup.find(x => x.who === (w || 'me')) || {}).name || 'Teammate') : null;
    const tagOf = w => league ? ` \u00b7 ${nameOf(w)}` : '';
    const st = edit ? Q.editState(edit.f, edit.throws) : live, facingLeave = st.standing.length < 10;
    // Scoring fix 3: "Throwing this ball" chip. The pick is advice; this is the ball the throws are credited to. With the
    // spare-ball rule on (More > off by default), a delivery at a leave is credited to the bag's spare ball.
    const bg = bagOf(P, s), mk = (id, name) => ({ id, catalogId: (P.owned[id] || {}).catalogId || null, name });
    const balls = bg.list.map(x => mk(x.ownedId, x.name)).concat(bg.spare ? [mk(bg.spare.id, short(bg.spare.name || (catOf(bg.spare.catalogId) || {}).name || 'Spare ball'))] : []);
    const thrown = balls.find(x => x.id === s.throwId) || (cur ? mk(cur.id, cur.name) : null);
    const spareBall = bg.spare && prefs().spareRule ? balls[balls.length - 1] : null;
    const credit = facingLeave && spareBall ? spareBall : thrown;
    // Writes one or more throws (the two-tap spare writes two) as shot.logged events, then shows "Saved".
    const write = async throws => {
      // sim bug 2: a repeat tap inside 400 ms (or while the last write is still in flight) is a double tap, not a second ball.
      const now = performance.now(); if (live.done || busy || now - lastTap < TAP_GUARD_MS) return; lastTap = now; busy = true; lastEdit = null; pickFix = false;
      try {
        if (!proj().sessions[sid]) await addMany([mkEvent('session.created', sid, Object.assign({ kind: 'tonight', date: dayKey(Date.now()) }, sess(), { editTs: Date.now() }), { deviceId: deviceId(), prov: { kind: 'user' } })]);   // first throw opens the night
        let seq = mine.map(x => ({ down: x.down, leave: x.leave || [], foul: !!x.foul })), at = live;
        for (const t of throws) {
          const facing = at.standing.length < 10, split = !facing && !t.foul && t.leave.length > 0 && Q.leaveHint(t.leave).split;
          const cb = meUp ? (facing && spareBall ? spareBall : thrown || {}) : {};
          await add('shot.logged', sid, Object.assign({ sessionId: sid, game, frame: at.frame, roll: at.roll, down: t.down, leave: t.leave, foul: !!t.foul, split: !!split,
            ballId: cb.id || null, catalogId: cb.catalogId || null, miss: !facing && meUp ? ql.tag : null }, whoF));
          seq = seq.concat([t]); at = Q.stateOf(seq);
        }
        if (at.frame !== live.frame || at.done) { const tf = Date.now(); if (frameT0) (window.__apFrameMs = window.__apFrameMs || []).push(tf - frameT0); frameT0 = tf; }
        savedMsg = (at.done ? `Saved \u2713 game ${game}` : `Saved \u2713 frame ${live.frame}`) + tagOf(who);
      } finally { busy = false; }
      ql.leave.clear(); ql.foul = false; ql.tag = null; draw();
    };
    // Scoring fix 2: fix any frame. The frame is re-entered on the same pad; when it is complete the old shots are voided and
    // the new ones written in one append, so the log keeps both and "Undo fix" puts the old frame back.
    const editPush = async throws => {
      const now = performance.now(); if (busy || now - lastTap < TAP_GUARD_MS) return; lastTap = now;
      edit.throws.push(...throws); ql.leave.clear(); ql.foul = false;
      if (!Q.editState(edit.f, edit.throws).closed) return draw();
      busy = true;
      try {
        const f = edit.f, o = { deviceId: deviceId(), prov: { kind: 'user' } };
        const x = FX.fixEvents({ sid, game, f, old: mine.filter(z => z.frame === f), throws: edit.throws, who, fallback: thrown && meUp ? thrown : null }, o);
        await addMany(x.events); lastEdit = x.undo;
        savedMsg = `Saved \u2713 frame ${f} fixed` + tagOf(who); edit = null;
      } finally { busy = false; }
      draw();
    };
    const undoFix = async () => { const u = lastEdit; if (!u) return; lastEdit = null; const o = { deviceId: deviceId(), prov: { kind: 'user' } };
      await addMany(FX.undoEvents(u, o)); savedMsg = `Saved \u2713 frame ${u.f} restored` + tagOf(u.who); draw(); };
    const startFix = (f, w = who) => { edit = { f, game, sid, who: w, throws: [] }; ql.leave.clear(); ql.foul = false; ql.tag = null; pickFix = false; draw(); };
    const push = throws => edit ? editPush(throws) : write(throws);
    const log = kind => push([Q.throwOf(kind, st.standing, { leave: [...ql.leave], foul: ql.foul })]);
    // Two-tap spare (scoring fix 1): pins left on ball 1, then one tap writes the leave and the spare.
    const spareNow = () => { const t1 = Q.throwOf('leave', st.standing, { leave: [...ql.leave] }); return push([t1, { down: t1.leave.length, leave: [], foul: false }]); };
    const frames = h('div', { class: 'frames', id: 'qlFrames', role: 'list', 'aria-label': `Game ${game} frames` }, ...Array.from({ length: 10 }, (_, i) => {
      const fr = live.frames[i], fixable = fr && fr.marks.length && (live.done || i < live.frame - 1);
      const cls = 'fr' + ((edit ? i === edit.f - 1 : !live.done && i === live.frame - 1) ? ' cur' : '') + (fixable ? ' fixable' : '');
      const mk = fr ? fr.marks.join(' ') : '';
      return h('div', { class: cls, role: 'listitem', 'data-f': i + 1, onclick: fixable && !edit ? () => startFix(i + 1) : null, 'aria-label': `${league ? nameOf(who) + ', f' : 'F'}rame ${i + 1}: ${mk || 'not bowled'}${fr && fr.split ? ', split' : ''}${fr && fr.cum != null ? ', ' + fr.cum : ''}` },
        h('span', { class: 'muted', text: String(i + 1) }), h('b', { text: (fr && fr.split ? '\u25CB' : '') + mk }), h('span', { class: 'num', text: fr && fr.cum != null ? String(fr.cum) : '' }));
    }));
    const head = h('div', { class: 'row between' }, h('h2', { class: 'card-title', text: `Quick log \u00b7 game ${game}` }),
      h('span', { class: 'pill', id: 'qlWhere', text: edit ? `Fixing ${league ? (who === 'me' ? 'your ' : nameOf(who) + '\u2019s ') : ''}frame ${edit.f} \u00b7 ball ${st.roll}` : st.done ? `Final ${st.total}` : team && team.up ? `Up: ${team.up.name} \u00b7 frame ${st.frame}` : `Frame ${st.frame} \u00b7 ball ${st.roll}` }));
    const saved = h('p', { class: 'ql-saved small', id: 'qlSaved', role: 'status', text: savedMsg });
    const chip = credit && meUp && !(live.done && !edit) ? h('button', { class: 'chip ql-ball', id: 'qlBall', 'aria-expanded': String(ballOpen), 'aria-controls': 'qlBallPick', onclick: () => { ballOpen = !ballOpen; draw(); } },
      h('span', { class: 'chip-k', text: credit === spareBall && facingLeave ? 'Spare ball ' : 'Ball ' }), credit.name, h('span', { class: 'sr-only', text: ', change' })) : null;
    const pickBall = ballOpen && chip ? h('div', { class: 'ql-ballpick', id: 'qlBallPick', role: 'group', 'aria-label': 'Throwing this ball' },
      ...balls.map(x => h('button', { class: 'btn ghost', 'data-ball': x.id, 'aria-pressed': String(thrown && x.id === thrown.id), onclick: () => { ballOpen = false; save({ throwId: x.id }); } }, x.name)),
      bg.spare ? h('button', { class: 'btn ghost ql-rule', id: 'qlSpareRule', 'aria-pressed': String(!!prefs().spareRule), onclick: () => { setPrefs({ spareRule: !prefs().spareRule }); draw(); } },
        `Spares with ${balls[balls.length - 1].name}: ${prefs().spareRule ? 'on' : 'off'}`) : null,
      h('button', { class: 'btn ghost ql-rule', id: 'qlBallDone', onclick: () => { ballOpen = false; draw(); } }, 'Back to scoring')) : null;
    const card = h('div', { class: 'card', id: 'tnLog' }, head, frames, h('div', { class: 'row between ql-sub' }, saved, chip || ''));
    if (live.done && !edit) {
      card.append(h('p', { class: 'coach', text: `${team && team.mode === 'baker' ? 'Team ' : ''}${st.total} in game ${game}.` }));
      if (team) card.append(teamBoard(team, game));
      const rc = nightRecap(P, sid);
      if (rc) card.append(rc);
      card.append(h('button', { class: 'btn primary block', id: 'qlNext', onclick: () => save({ game: game + 1 }) }, `Start game ${game + 1}`),
        h('button', { class: 'btn ghost block', id: 'qlEnd', onclick: async () => { await save({ ended: true, endedTs: Date.now() }); toast('Night saved. It is on Past sessions.'); go('#/session/' + encodeURIComponent(sid)); } }, 'End night'));
      const pn = protectNudge(P); if (pn) card.append(pn);
    } else {
      const pins = h('div', { class: 'pins', id: 'qlPins', role: 'group', 'aria-label': facingLeave ? 'Tap the pins still standing' : 'Tap the pins left standing' },
        ...Q.LAYOUT.map(([pin, col]) => { const up = st.standing.includes(pin);
          return h('button', { class: 'pin', 'data-pin': pin, 'aria-pressed': String(ql.leave.has(pin)), disabled: !up, 'aria-label': `Pin ${pin}`, style: { gridColumn: `${col + 1} / span 2`, gridRow: String(pin >= 7 ? 1 : pin >= 4 ? 2 : pin >= 2 ? 3 : 4) },
            onclick: () => { ql.leave.has(pin) ? ql.leave.delete(pin) : ql.leave.add(pin); draw(); } }, String(pin)); }));
      const n = ql.leave.size;
      // sim2 #5: two rows in a 6-column grid. Row 1 logs the ball; row 2 is Foul, Undo and Fix (or Cancel fix), all in thumb reach.
      const tools = tl();
      const cancel = edit ? h('button', { class: 'btn ghost', id: 'qlFixCancel', onclick: () => { edit = null; ql.leave.clear(); ql.foul = false; draw(); } }, 'Cancel fix', h('span', { class: 'btn-sub', text: `${league ? nameOf(who) + ' \u00b7 ' : ''}frame ${edit.f} unchanged` })) : null;
      const row1 = [facingLeave ? h('button', { class: 'btn primary', id: 'qlSpare', onclick: () => log('all') }, '/ Spare') : n ? null : h('button', { class: 'btn primary', id: 'qlStrike', onclick: () => log('all') }, 'X Strike'),
        !facingLeave && n && !ql.foul && (st.roll === 1 || (st.frame === 10 && st.roll === 2)) ? h('button', { class: 'btn primary', id: 'qlSpareNow', onclick: spareNow }, `${n === 1 ? 'Pin' : n + ' pins'} left, then / spare`) : null,
        h('button', { class: 'btn ghost', id: 'qlLeave', disabled: !n, onclick: () => log('leave') }, n ? `Log ${n} standing` : 'Tap pins standing'),
        facingLeave ? h('button', { class: 'btn ghost', id: 'qlMiss', onclick: () => log('none') }, '\u2013 Missed all') : null].filter(Boolean);
      const row2 = [h('button', { class: 'btn ghost', id: 'qlFoul', 'aria-pressed': String(ql.foul), onclick: () => { ql.foul = !ql.foul; draw(); } }, 'F Foul')].concat(cancel ? [cancel] : tools.row);
      const span = (row, x) => { x.style.gridColumn = `span ${6 / row.length}`; return x; };
      const btns = h('div', { class: 'btn-grid ql-btns', id: 'qlBtns' }, ...row1.map(x => span(row1, x)), ...row2.map(x => span(row2, x)));
      // sim2 #5: the spare hint sits on top of the pad, so it shows without scrolling.
      // sim bug 1: hints from the bowler's own hand and strike stand (the same stand as the start line), 20 only when unknown.
      const base = stand ? stand.feet : 20;
      const hint = edit || !meUp ? null : Q.leaveHint(facingLeave ? st.standing : [...ql.leave], base, hand);
      const hintEl = hint ? h('p', { class: 'small ql-hint', id: 'qlHint' }, hint.split ? h('span', { class: 'pill', id: 'qlSplit', text: 'Split' }) : null, ' ',
        `${hint.leave.join('-')}: ` + hint.keys.map(k => `key pin ${k.key} \u2192 stand ${k.board}${k.move === 'none' ? '' : ' (move ' + k.move + ')'}`).join('; or ') + '. Same target.',
        provChip(stand ? null : 'assumed', stand ? `${hand === 'left' ? 'lefty' : 'righty'} \u00b7 strike stand ${base}` : `${hand === 'left' ? 'lefty' : 'righty'} \u00b7 board 20 assumed`), provChip(null, '3-6-9 spare system')) : null;
      // the ball picker (or the frame picker) takes the pad's place while open, so the sticky pad never covers it
      card.append(pickBall || (pickFix && tools.picker ? h('div', { class: 'ql-pad', id: 'qlPad' }, tools.picker)
        : h('div', { class: 'ql-pad', id: 'qlPad' }, hintEl, pins, btns)));
      if (!facingLeave && !edit && meUp) card.append(h('div', { class: 'fld' }, h('span', { text: 'First ball hit (optional, for triggers)' }),
        segmented('First ball hit', [['pocket', 'Pocket'], ['high', 'High'], ['light', 'Light']], ql.tag, v => { ql.tag = ql.tag === v ? null : v; draw(); }, 'wide')));
    }
    // triggers: first balls + reads this session, newest last
    const seq = P.shots.filter(x => x.sessionId === sid && x.roll === 1 && x.frame != null).map(x => ({ ts: x.ts, miss: x.miss || (x.down === 10 ? 'strike' : null) }))
      .concat((s.reads || []).map(x => ({ ts: x.ts, read: x.read }))).sort((a, b) => a.ts - b.ts);
    const tr = R.trigger(seq, { hand });
    if (tr) card.append(h('div', { class: 'warn-box', id: 'qlTrigger', role: 'status' }, tr.text, provChip('assumed', 'team rule')));
    if (team && !(live.done && !edit) && !edit) card.append(teamBoard(team, game));
    if (edit || !live.done) return card;
    // between games: the same Undo / Fix as blocks under the recap
    const t2 = tl();
    for (const x of t2.row) { x.classList.add('block'); card.append(x); }
    if (pickFix && t2.picker) card.append(t2.picker);
    return card;
    // Undo last ball / Undo fix, and Fix a frame with whose frame it is (sim2 #3: my frames any time, a teammate's by name).
    function tl() {
      const row = [];
      const pool = team ? Object.values(team.games).flatMap(v => v.mine) : mine;
      const last = pool.slice().sort((a, b) => (a.ts || 0) - (b.ts || 0))[pool.length - 1];
      if (lastEdit && lastEdit.game === game && lastEdit.sid === sid) { const t = `${league ? nameOf(lastEdit.who) + ' \u00b7 ' : ''}frame ${lastEdit.f}`; row.push(h('button', { class: 'btn ghost', id: 'qlUndoFix', onclick: undoFix }, 'Undo fix', h('span', { class: 'btn-sub', text: t }))); }
      else if (last) row.push(h('button', { class: 'btn ghost', id: 'qlUndo', onclick: async () => { await addMany([voidEvent(last.id, { deviceId: deviceId(), prov: { kind: 'user' } })]); draw(); } }, 'Undo ball', h('span', { class: 'btn-sub', text: `${league ? nameOf(last.who) + ' \u00b7 ' : ''}frame ${last.frame}` })));
      const rows = (league ? team.lineup.filter(x => team.games[x.who]).map(x => ({ who: x.who, name: x.name, st: team.games[x.who].st })) : [{ who, name: null, st: live }])
        .map(r => Object.assign(r, { frames: r.st.frames.filter(fr => fr.marks.length && (r.st.done || fr.f < r.st.frame)).map(fr => fr.f) })).filter(r => r.frames.length);
      if (!rows.length) return { row, picker: null };
      row.push(h('button', { class: 'btn ghost', id: 'qlFix', 'aria-expanded': String(pickFix), onclick: () => { pickFix = !pickFix; draw(); } }, 'Fix a frame'));
      const own = r => r.who === 'me' ? 'your' : `${r.name}\u2019s`;
      const picker = h('div', { class: 'fix-pick', id: 'qlFixPick', role: 'group', 'aria-labelledby': 'qlFixQ' }, h('p', { class: 'small muted', id: 'qlFixQ', text: league ? 'Fix whose frame?' : 'Fix which frame?' }),
        ...rows.map(r => h('div', { class: 'fix-row', 'data-who': r.who }, league ? h('p', { class: 'small', text: r.who === 'me' ? 'You' : r.name }) : null,
          h('div', { class: 'fix-grid' }, ...r.frames.map(f => h('button', { class: 'btn ghost', 'data-fix': f, 'data-who': r.who, 'aria-label': league ? `Fix ${own(r)} frame ${f}` : `Fix frame ${f}`, onclick: () => startFix(f, r.who) }, String(f)))))),
        h('button', { class: 'btn ghost block', id: 'qlFixBack', onclick: () => { pickFix = false; draw(); } }, 'Back to scoring'));
      return { row, picker };
    }
  }
  // ---- GAP (a), between games only: one install offer (once ever), else a backup nudge (no file and >3 games, or file >14 days old).
  function protectNudge(P) {
    const pf = prefs(), db = hub.db; if (!db) return null;
    if (!PR.isStandalone() && !pf.installAsked) {
      const done = async inst => { setPrefs({ installAsked: true }); PR.askPersist(); if (inst && await PR.promptInstall()) toast('Installed.'); draw(); };
      const how = PR.installHow();
      return h('div', { class: 'tn-recap', id: 'tnProtect', role: 'note' },
        h('p', { class: 'small', text: 'Your games are stored in this browser. Safari can clear website data after 7 days without a visit; apps on the Home Screen are exempt.' }),
        how ? h('p', { class: 'small', id: 'tnInstallHow', text: how }) : h('button', { class: 'btn ghost block', id: 'tnInstall', onclick: () => done(true) }, 'Install the app'),
        h('button', { class: 'btn ghost block', id: 'tnInstallLater', onclick: () => done(false) }, how ? 'Got it' : 'Not now'));
    }
    const at = PR.lastBackupAt(db.meta);
    if (!PR.needsBackup({ games: P.games.length, lastBackupAt: at, snoozeUntil: pf.backupSnooze || 0 })) return null;
    return h('div', { class: 'tn-recap', id: 'tnBackup', role: 'note' },
      h('p', { class: 'small', text: `${PR.lastBackupText(at)} ${P.games.length} ${P.games.length === 1 ? 'game' : 'games'} saved; a backup file restores them on any phone.` }),
      h('button', { class: 'btn ghost block', id: 'tnBackupNow', onclick: async () => { await PR.saveBackupFile(db, prefs()); toast('Backup file saved.'); draw(); } }, 'Download backup'),
      h('button', { class: 'btn ghost block', id: 'tnBackupLater', onclick: () => { setPrefs({ backupSnooze: Date.now() + PR.NUDGE_DAYS * PR.DAY }); draw(); } }, 'Remind me in 14 days'));
  }
  // ---- between games / end of night (sim bug 7): series vs average, strikes, spares with pins left, one focus.
  function nightRecap(P, sid) {
    const lgAvg = (P.sessions[sid] || {}).event === 'league' ? (prefs().league || {}).myAvg : null;   // sim2 #8
    const list = sessionsOf(P), r = recapOf(list, sid, { myAvg: lgAvg }); if (!r) return null;
    const box = h('div', { class: 'tn-recap', id: 'tnRecap' }, h('p', { class: 'bc-headline', id: 'tnRecapHead', text: r.head }),
      r.support.length ? h('dl', { class: 'bc-figs' }, ...r.support.map(x => h('div', { class: 'bc-fig', 'data-k': x.k }, h('dt', { text: x.label }), h('dd', { text: x.text })))) : null);
    if (r.focus) { const fc = prefs().focus, set = fc && fc.from === sid && fc.text === r.focus.text;
      box.append(h('p', { class: 'bc-focus', id: 'tnRecapFocus', text: r.focus.text }),
        h('button', { class: 'btn ghost block', id: 'tnSetFocus', 'aria-pressed': String(!!set), onclick: () => { setPrefs({ focus: set ? null : { text: r.focus.text, from: sid, ts: Date.now() } }); toast(set ? 'Focus cleared.' : 'Saved. It shows on Tonight next time.'); draw(); } }, set ? 'Next-time focus saved \u2713' : 'Make this my next focus')); }
    const gr = DR.goalResult(P, sid, (P.sessions[sid] || {}).goal); if (gr) box.append(h('p', { class: 'small', id: 'tnGoalResult', text: 'Your goal: ' + gr.text }));
    box.append(h('a', { class: 'btn ghost block', id: 'tnRecapAll', href: '#/session/' + encodeURIComponent(sid) }, 'Whole night, game by game \u203a'));
    return box;
  }
  // ---- Bag Advisor (TEAM_PROMPT_BAG_ADVISOR.md): event \u2192 packed bag with roles, evidence and a start line.
  function advisorCard(P, s, b) {
    const ap = prefs().advisor || {}, ev = s.event || ap.last || null;
    const card = h('div', { class: 'card adv', id: 'tnAdvisor' }, withHelp(h('h2', { class: 'card-title', id: 'advTitle', text: 'Where are you bowling?' }), 'bm-matchup', 'Ball choice'));
    const pick = h('div', { class: 'seg wrap', role: 'radiogroup', 'aria-labelledby': 'advTitle', id: 'advEvent' }, ...Object.entries(A.EVENTS).map(([k, e]) =>
      h('button', { class: 'seg-opt', role: 'radio', 'aria-checked': String(k === ev), 'data-event': k, onclick: () => { setPrefs({ advisor: Object.assign({}, prefs().advisor, { last: k }) }); save({ event: k, pickId: null }); } }, e.short)));
    card.append(pick);
    if (!ev) { card.append(h('p', { class: 'muted small', text: 'Pick one: your bag, first ball and where to stand appear here.' })); return card; }
    const mem = ap[ev] || {}, pat = s.ft != null ? { slug: s.patternSlug, name: s.patternName || s.patternSlug, ft: s.ft, ml: s.ml, ratio: s.ratio } : null;
    const ft = pat ? pat.ft : R.HOUSE_ASSUMED.ft, r31 = R.rule31(ft);
    // P1.1/P1.2: when the saved bag is for this event, Tonight shows exactly that bag (its Bring N); else a fresh suggestion.
    const cur = ST.currentBag(P), mine = cur && cur.event === ev ? cur : null, bring = (mine && A.bringOf(mine.bring)) || A.EVENTS[ev].bring;
    const a = A.advise(P, { event: ev, bring, fixed: mine ? { slots: ST.packedIds(P, mine), spare: mine.spare } : null, pattern: pat, tert: TERT, surface: s.surface, style: b.style || 'tweener', health: P.health, swaps: mine ? {} : mem.swaps || {}, current: cur ? cur.slots.map(x => x.owned) : [],
      line: c => lineFor(c, { speed: num(b.speed), rev: num(b.rev), ft: pat ? pat.ft : null }).ml });
    if (a.none) { card.append(h('p', { class: 'muted', text: a.reason }), h('button', { class: 'btn block', onclick: () => go('#/arsenal') }, 'Open Arsenal \u203a')); return card; }
    const ml = a.line, st = ml && !ml.none ? standOf(ml.feet) : null;
    card.append(h('p', { class: 'coach', id: 'advStart', role: 'status', text: st ? `Start with: ${a.A.name}, from feet ${st.feet}, aim ${fmtHalf(ml.target)} at the arrows.` : `Start with: ${a.A.name}. ${(ml && ml.reason) || 'spec TBD: no model line'}, so set feet and eyes on Targeting.` },
      st ? provChip('model', st.assumed ? '2-D model \u00b7 offset 7 assumed' : '2-D model') : null));
    const packed = !!(mine && mine.packedTs);
    const list = h('ul', { class: 'adv-list', id: 'advList' }, ...a.rows.map(r => {
      const conf = provChip(r.confidence.key === 'measured' ? 'device' : r.confidence.key === 'spec' ? 'catalog' : 'assumed', r.confidence.label);
      const li = h('li', { class: 'adv-row', 'data-owned': r.ownedId, 'data-role': r.role },
        h('div', { class: 'adv-head' }, h('b', { text: r.name }), h('span', { class: 'pill' + (r.role === 'benchmark' ? ' gold' : ''), text: r.label || r.role }), conf),
        h('p', { class: 'small muted', text: r.reason }),
        r.evidence ? h('p', { class: 'small', 'data-evidence': '' }, r.evidence) : null,
        r.warning ? h('p', { class: 'small adv-warn', 'data-warn': '' }, '\u26a0 ' + r.warning) : null);
      if (r.role !== 'spare') li.append(h('button', { class: 'btn sm ghost', 'data-swap': r.ownedId, 'aria-expanded': String(swapOpen === r.ownedId), 'aria-label': `Swap ${r.name}`, onclick: () => {
        if (!a.bench.length) { toast('No other ball in your bag or at home. Change a ball\u2019s Status on its page.'); return; } swapOpen = swapOpen === r.ownedId ? null : r.ownedId; draw(); } }, 'Swap'));
      if (swapOpen === r.ownedId) li.append(h('div', { class: 'chips', role: 'group', 'aria-label': `Swap ${r.name} for` }, ...a.bench.map(x => h('button', { class: 'btn sm', 'data-swap-to': x.ownedId, onclick: async () => {
        if (mine) { swapOpen = null; await swapIn(P, mine, r.ownedId, x.ownedId); toast(`${x.name} in for ${r.name}.`); return; }
        const m = Object.assign({}, prefs().advisor), e2 = Object.assign({}, m[ev]); e2.swaps = Object.assign({}, e2.swaps); for (const [k, v] of Object.entries(e2.swaps)) if (v === r.ownedId) delete e2.swaps[k];
        e2.swaps[r.ownedId] = x.ownedId; m[ev] = e2; swapOpen = null; setPrefs({ advisor: m }); draw(); toast(`${x.name} in for ${r.name}.`); } }, x.home ? `${x.name} \u00b7 ${ST.HOME_TAG}` : x.name))));
      return li; }));
    card.append(list);
    const n = a.rows.length;
    card.append(h('div', { class: 'btn-grid' }, h('button', { class: 'btn primary', id: 'advPack', onclick: async () => {
      const ids = a.slots.concat(a.spare ? [a.spare] : []), slots = ids.map(o => Object.assign({ owned: o, locked: !!(mine && (mine.slots.find(x => x.owned === o) || {}).locked) }, a.fromHome.includes(o) ? { fromHome: true } : {}));
      await add('bag.saved', ST.TONIGHT_BAG, { name: `${A.EVENTS[ev].label}`, format: BE.formatOfBring(bring), bring, slots, spare: a.spare || null, excluded: [], eventDate: (mine && mine.eventDate) || today(), source: 'advisor', event: ev, packedTs: Date.now() });
      const m = Object.assign({}, prefs().advisor), e2 = Object.assign({}, m[ev], { packedTs: Date.now(), swaps: {} }); m[ev] = e2; setPrefs({ advisor: m });
      await save({ bagId: ST.TONIGHT_BAG, pickId: a.A.ownedId }); toast(`Packed: ${a.rows.map(r => r.name).join(', ')}.`); } }, packed ? 'Packed \u2713 Pack again' : `Pack these ${n}`),
      h('button', { class: 'btn ghost', id: 'advBuilder', onclick: () => go('#/bag') }, `Bag builder \u00b7 Bring ${bring} \u203a`)));
    if (a.left.length) card.append(h('details', { class: 'why-not-list', id: 'advLeft' }, h('summary', { text: `Why not the others? (${a.left.length})` }),
      h('ul', { class: 'plain' }, ...a.left.map(x => h('li', { class: 'small', 'data-why-not': x.ownedId, 'data-why': x.key }, h('b', { text: x.name + ': ' }), x.text)))));
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
  // Scoring fix 1: keep the pad in the lower half (thumb reach) while a game is open, unless "details" is open.
  function padToThumb() {
    const pad = document.getElementById('qlPad'); if (!pad || moreOpen) return;
    const r = pad.getBoundingClientRect(), tb = document.getElementById('tabs'), tr = tb ? tb.getBoundingClientRect() : null;
    const room = (tr && tr.top > innerHeight / 2 ? tr.top : innerHeight) - 8;
    if (r.bottom > room || r.top < innerHeight * 0.3) window.scrollBy(0, r.bottom - room);
    // sim2 #5: a taller pad (hint, Undo, Fix) must not sit over the Saved line / ball chip above it while pinned.
    const prev = pad.previousElementSibling, pb = prev ? prev.getBoundingClientRect().bottom : 0, pt = pad.getBoundingClientRect().top;
    if (pb > pt + 1) window.scrollBy(0, pb - pt);
  }
  function bowlerOf(P) { return P.bowler || {}; }
  function num(f) { const v = f && typeof f === 'object' ? f.v : f; return v === '' || v == null || isNaN(+v) ? null : +v; }
  draw();
  if (!IDX) loadIndex().then(x => { IDX = x; TERT = R.tertiles(x); draw(); }).catch(() => {});
  const offs = [on('data', () => { if (!body.contains(document.activeElement) || document.activeElement.tagName === 'BUTTON') draw(); })];
  window.__apTonightMs = Math.round(performance.now() - t0);
  return { el, title: 'Tonight', mounted() { if (document.getElementById('tnNow')) padToThumb(); },
    destroy() { WK.keepAwake(false); offs.forEach(f => f()); window.removeEventListener('online', setNet); window.removeEventListener('offline', setNet); } };
}
