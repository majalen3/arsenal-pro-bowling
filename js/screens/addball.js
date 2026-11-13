// #/add-ball (docs/TEAM_PROMPT_ADD_BALL.md). Type a name → catalogue match → maker-site lookup (server, allowlisted,
// cached) → confirm every field with its source chip → engine card vs the benchmark on tonight's pattern → grid placement
// → save as an owned ball At home (status key `benched`). Nothing is saved until the user taps Add. Unknown fields read "spec TBD".
import { catOf } from '../cc/cats.js';
import { uuid } from '../data/schema.js';
import { START } from '../engine.js';
import { h, toast, segmented } from '../ui.js';
import { go } from '../router.js';
import { ready, proj, add } from '../hub.js';
import { API_BASE, today } from '../store.js';
import { chip } from '../data/schema.js';
import { norm } from '../data/match.js';
import { catFromHash } from '../cc/kit.js';
import * as A from '../cc/addball.js';
import * as G from '../cc/bag.js';
import { HOUSE_ASSUMED } from '../cc/rank.js';
import { openNight } from '../cc/night.js';
import { helpDot } from './help.js';
import { currentBag, packedIds } from '../cc/status.js';
const prov = (p, t) => h('span', { class: 'prov', 'data-prov': p || null, text: t });
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const WEIGHTS = [16, 15, 14, 13, 12];
const LABEL = { rg: 'RG', diff: 'Differential', intDiff: 'Int. diff / mass bias', coverstock: 'Coverstock', coverType: 'Cover type', finish: 'Finish / grit',
  core: 'Core', symmetry: 'Core symmetry', releaseDate: 'Release date', year: 'Year', usbc: 'USBC approval', condition: 'Condition' };
const ORDER = ['rg', 'diff', 'intDiff', 'coverstock', 'coverType', 'finish', 'core', 'symmetry', 'releaseDate', 'usbc', 'condition'];
const LEVEL_OIL = { 5: ['heavy'], 4: ['heavy', 'medium'], 3: ['medium'], 2: ['medium', 'light'], 1: ['light'] };
const OFFLINE_MSG = 'Can\u2019t reach the maker list offline. Type the name and specs.';
// "Found on the maker page" / "Found in a saved copy of the maker page" / "Found from USBC and a public reference (not the maker)".
const TYPE_WORDS = { maker: 'the maker page', 'archived-maker': 'a saved copy of the maker page', usbc: 'the USBC list', secondary: 'a public reference (not the maker)' };
const foundWhere = res => { const t = (res.sourceTypes && res.sourceTypes.length ? res.sourceTypes : ['maker']); return 'Found on ' + (t.length === 1 && t[0] === 'maker' && res.source && res.source.host ? res.source.host : t.map(x => TYPE_WORDS[x] || x).join(' and ')); };
const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
// Typed specs (offline or no maker page). USBC limits: RG 2.430-2.890, differential up to 0.060; outside them it is a typo.
const TYPE = { rg: { lab: 'RG', min: 2.43, max: 2.89, ph: 'e.g. 2.50' }, diff: { lab: 'Differential', min: 0, max: 0.06, ph: 'e.g. 0.045' } };
const fmt = (k, v) => (typeof v === 'number' ? (k === 'rg' ? v.toFixed(3) : v.toFixed(3).replace(/^0/, '')) : String(v));
async function lookup(qs, signal) {
  const r = await fetch(API_BASE + '/api/spec-lookup?' + new URLSearchParams(qs), { cache: 'no-store', signal });
  if (r.status === 400) return { status: 'bad' };
  if (r.status === 429) return { status: 'busy', why: 'Too many lookups for now. Try again in a few minutes.' };
  return r.json();
}
export async function render() {
  await ready();
  const body = h('div', { class: 'stack', id: 'abBody' });
  const el = h('section', { class: 'screen list-screen', id: 'addBall' },
    h('header', { class: 'appbar' }, h('button', { class: 'btn ghost', id: 'abBack', 'aria-label': 'Back to Bag', onclick: () => go('#/bag') }, '\u2039 Bag'), h('h1', { class: 'title', text: 'Add a ball' })), body);
  const st = { q: '', brand: '', pick: null, look: null, lookState: 'idle', lookMsg: '', weight: 15, weightSet: false, level: null, ctl: null, makerCands: null, saving: false, manual: {} };
  const q = h('input', { type: 'search', class: 'search', id: 'abQ', placeholder: 'e.g. Storm Hy-Road Pearl', 'aria-label': 'Ball brand and model', autocomplete: 'off', enterkeyhint: 'search' });
  const brandSel = h('select', { id: 'abBrand', 'aria-label': 'Brand for the maker lookup' }, h('option', { value: '', text: 'Brand: detect from name' }),
    ...A.LOOKUP_BRANDS.concat(Object.keys(A.UNSUPPORTED)).map(b => h('option', { value: b, text: b })));
  const results = h('div', { id: 'abResults', 'aria-live': 'polite' }), detail = h('div', { class: 'stack', id: 'abDetail' });
  body.append(h('div', { class: 'card', id: 'abSearch' }, h('h2', { class: 'card-title', text: '1. Find it' }),
    h('label', { class: 'fld' }, h('span', { text: 'Brand and model' }), q), h('label', { class: 'fld' }, h('span', { text: 'Brand' }), brandSel), results), detail);
  q.addEventListener('input', () => { st.q = q.value; drawResults(); });
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { const r = A.search(st.q); if (r.exact) pick(r.exact); else makerOnly(); } });
  brandSel.addEventListener('change', () => { st.brand = brandSel.value; drawResults(); });
  const brandOf = r => st.brand || r.brand || null;
  function drawResults() {
    results.innerHTML = ''; const r = A.search(st.q), brand = brandOf(r);
    if (!st.q.trim()) { results.append(h('p', { class: 'muted small', text: `${A.catalog().length} balls in the catalogue. ${A.CATALOG_NOTE}` })); return; }
    const row = (e, score) => h('button', { class: 'brow-main', 'data-pick': e.id, onclick: () => pick(e) },
      h('span', { class: 'brow-text' }, h('span', { class: 'brow-name', text: `${e.brand} ${e.name}` }),
        h('span', { class: 'brow-meta', text: (e.src === 'app' ? 'app catalogue' : 'catalogue') + (typeof score === 'string' ? ` \u00b7 ${score}` : score != null ? ` \u00b7 match ${Math.round(score * 100)}%` : ' \u00b7 exact match') })));
    const list = h('div', { class: 'blist', id: 'abList' });
    // Every catalogue entry that contains the typed name (A.browse), the exact alias first; fuzzy-only rows keep their match %.
    const scoreOf = new Map(r.candidates.map(c => [c.entry.id, c.score]));
    A.browse(st.q).forEach(e => list.append(h('div', { class: 'brow' }, row(e, r.exact && e.id === r.exact.id ? null : A.matches(e, st.q) ? 'name match' : scoreOf.get(e.id)))));
    if (!list.childElementCount) results.append(h('p', { class: 'small', id: 'abNoMatch', text: 'Not in the catalogue.' }));
    results.append(list);
    if (offline()) {   // IA_PLAN §6 midnight/offline: the catalogue still works; the maker lookup needs the network
      results.append(h('p', { class: 'small', id: 'abOffline', role: 'status', text: OFFLINE_MSG }),
        h('button', { class: 'btn ghost block', id: 'abMaker', onclick: makerOnly }, `Add \u201c${st.q.trim()}\u201d and type the specs`));
      return;
    }
    const can = brand && A.LOOKUP_BRANDS.includes(brand);
    results.append(h('button', { class: 'btn ghost block', id: 'abMaker', disabled: can ? null : true, onclick: makerOnly },
      can ? `Look up \u201c${st.q.trim()}\u201d on the ${brand} site` : brand && A.UNSUPPORTED[brand] ? A.UNSUPPORTED[brand] : 'Pick a brand to look it up on the maker site'));
  }
  function makerOnly() {
    const r = A.search(st.q), brand = brandOf(r) || ''; if (!offline() && (!brand || !A.LOOKUP_BRANDS.includes(brand))) return;
    // Keep what the user typed (minus the brand words); title-case only an all-lowercase entry; roman numerals upper.
    const raw = st.q.trim().replace(/\s+/g, ' '), bw = brand && A.detectBrand(raw).brand ? raw.split(' ').slice(norm(A.detectBrand(raw).brand === brand ? brand : A.detectBrand(raw).brand).split(' ').length).join(' ') : raw;
    let name = bw || raw; if (name === name.toLowerCase()) name = name.replace(/\b\w/g, c => c.toUpperCase());
    name = name.replace(/\b(i{2,3}|iv|vi{0,3})\b/gi, m => m.toUpperCase());
    pick({ id: null, brand, name, src: 'maker', fields: {} });
  }
  function pick(e) { st.pick = e; st.look = null; st.makerCands = null; st.level = null; st.manual = {}; runLookup({ brand: e.brand, name: e.name }); }
  async function runLookup(qs) {
    if (st.ctl) st.ctl.abort();
    const e = st.pick, supported = A.LOOKUP_BRANDS.includes(e.brand);
    if (offline()) { st.ctl = null; st.lookState = 'miss'; st.lookMsg = OFFLINE_MSG; draw(); return; }
    // t139u: the server runs the whole legal source chain (maker page, archived maker page, USBC list, public reference), so a brand
    // without a maker route (e.g. KR Strikeforce, Epic) is still looked up; the server says 'unsupported' when nothing at all was found.
    if (!supported && !e.brand) { st.lookState = 'skip'; st.lookMsg = A.UNSUPPORTED[e.brand] || `No maker lookup for ${e.brand} yet; showing catalogue values.`; draw(); return; }
    const ctl = st.ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 35000), t0 = performance.now();
    st.missSource = null; st.missSearch = null; st.chainText = null;
    st.lookState = 'busy'; st.lookMsg = `Looking up ${e.brand} ${e.name}: maker page, archived copy, USBC list\u2026`; draw();
    try {
      const res = await lookup(qs, ctl.signal); if (ctl !== st.ctl) return;
      const ms = Math.round(performance.now() - t0);
      st.chainText = A.chainSummary(res);
      if (res.status === 'found') { st.look = res; st.lookState = 'found'; st.lookMsg = `${foundWhere(res)} in ${(ms / 1000).toFixed(1)} s${res.cached ? ' (cached)' : ''}.`; }
      else if (res.status === 'usbc-only') { st.look = res; st.lookState = 'miss'; st.missSearch = res.searchUrl || null;
        st.lookMsg = `No maker page or saved copy lists specs for this ball. The USBC list approves it (${res.usbc.v}).` + (e.src === 'maker' ? '' : ' Showing catalogue values.'); }
      else if (res.status === 'unsupported' && !(res.chain || []).some(x => x.outcome === 'found')) { st.lookState = 'skip'; st.lookMsg = A.UNSUPPORTED[e.brand] || res.why || `No maker lookup for ${e.brand} yet; showing catalogue values.`; }
      else if (res.status === 'candidates') { st.makerCands = res.candidates || []; st.lookState = 'cands'; st.lookMsg = `${st.makerCands.length} pages on the ${e.brand} site could be this ball. Pick one.`; }
      else { st.lookState = 'miss'; st.missSource = res.source && res.source.url || null; st.missSearch = res.searchUrl || null;
        st.lookMsg = (res.noSpecs || (res.source && res.source.url) ? 'Found the maker page, but it lists no RG or differential for this ball.' : res.why || 'No maker page found.') + (e.src === 'maker' ? '' : ' Showing catalogue values.'); }
    } catch (err) {
      if (ctl !== st.ctl) return; st.lookState = 'miss'; st.lookMsg = err && err.name === 'AbortError' ? 'The lookup server is waking up or offline. Try again in a minute.' : OFFLINE_MSG;
    } finally { clearTimeout(timer); if (ctl === st.ctl) { st.ctl = null; draw(); } }
  }
  function current() {
    const e = st.pick, made = st.look ? A.fromLookup(st.look, st.weight) : null, base = e.fields || {};
    const { fields, conflicts } = made ? A.merge(base, made.fields) : { fields: Object.assign({}, base), conflicts: [] };
    for (const [k, v] of Object.entries(st.manual)) if (!fields[k]) fields[k] = { v, prov: { kind: 'user' } };   // typed: never over a catalogue or maker value
    if (st.level && !(fields.oil && fields.oil.v && fields.oil.v.length)) fields.oil = { v: LEVEL_OIL[st.level], prov: { kind: 'user' } };
    const id = e.src === 'app' ? e.id : 'add-' + slug(e.brand + ' ' + e.name);
    const cat = A.toCat(fields, { id, brand: e.brand, name: e.name });
    return { fields, conflicts, made, cat };
  }
  function draw() {
    detail.innerHTML = ''; const e = st.pick; if (!e) return;
    const P = proj(), { fields, conflicts, made, cat } = current();
    // t123u: a miss is a card with next steps (retry, the maker's own search or page, type the specs), not a loose line + cramped Retry.
    if (st.lookState === 'miss' && e.brand && A.LOOKUP_BRANDS.includes(e.brand)) {
      const ms = A.makerSearch(e.brand, e.name), page = st.missSource;
      detail.append(h('div', { class: 'card ab-miss', id: 'abMiss' },
        h('p', { class: 'small', id: 'abStatus', role: 'status', 'data-state': st.lookState, text: st.lookMsg }),
        h('div', { class: 'btn-grid' }, h('button', { class: 'btn ghost', id: 'abRetry', onclick: () => runLookup({ brand: e.brand, name: e.name }) }, 'Retry'),
          page ? h('a', { class: 'btn ghost', id: 'abMakerPage', href: page, target: '_blank', rel: 'noopener noreferrer' }, 'Maker page \u2197')
            : ms ? h('a', { class: 'btn ghost', id: 'abMakerSearch', href: st.missSearch || ms.url, target: '_blank', rel: 'noopener noreferrer' }, 'Maker search \u2197') : null),
        h('p', { class: 'small muted', text: 'Or type the specs from the box or the maker\u2019s spec card below.' })));
    } else detail.append(h('p', { class: 'small', id: 'abStatus', role: 'status', 'data-state': st.lookState }, st.lookMsg));
    if (st.lookState === 'cands') detail.append(h('div', { class: 'card', id: 'abMakerCands' }, h('h2', { class: 'card-title', text: 'Which page?' }),
      h('div', { class: 'blist' }, ...st.makerCands.map(c => h('div', { class: 'brow' }, h('button', { class: 'brow-main', 'data-url': c.url, onclick: () => runLookup({ url: c.url }) },
        h('span', { class: 'brow-text' }, h('span', { class: 'brow-name', text: c.label }), h('span', { class: 'brow-meta', text: new URL(c.url).host }))))))));
    if (st.lookState === 'busy') return;
    if (st.lookState === 'miss' || st.lookState === 'skip') detail.append(typeCard());
    // ---- 2. confirm
    const wts = [...new Set([...WEIGHTS, ...(made ? made.weights : [])])].sort((a, b) => a - b); // always offer 12-16; printed weights add to it
    const dl = h('dl', { class: 'kv', id: 'abFields' });
    for (const k of ORDER) {
      const x = fields[k]; if (!x && (k === 'year' || k === 'condition' || k === 'intDiff' && !made)) continue;
      dl.append(h('dt', { text: LABEL[k] }), h('dd', { 'data-f': k }, x ? fmt(k, x.v) : h('span', { class: 'muted', 'data-missing': '', title: 'not published', text: '\u2014' }),
        x && x.note ? h('span', { class: 'muted small', text: ' ' + x.note }) : null, x ? prov(x.prov && (x.prov.archived ? 'archived' : x.prov.secondary ? 'secondary' : x.prov.kind), A.sourceLabel(x.prov) || chip(x.prov)) : null,
        x && x.weightMismatch ? prov('assumed', 'other weight') : null));
    }
    const gone = ORDER.filter(k => !fields[k] && !(k === 'year' || k === 'condition' || k === 'intDiff' && !made)).map(k => LABEL[k]);
    const specNote = gone.length ? h('p', { class: 'small muted', id: 'abSpecNote', text: `Not published: ${gone.join(', ')}. Type them from the box if you have them.` }) : null;
    const nonMaker = A.nonMakerFields(fields), lvl = G.cellOfCat(cat).level;
    const srcOf = made && made.source.url ? { url: made.source.url, ref: made.source.ref, date: made.source.date } : e.source ? { url: e.source, ref: e.specStatus === 'archive' && e.original ? `archived copy of ${new URL(e.original).host.replace(/^www\./, '')} (Wayback Machine)` : e.specStatus === 'secondary' && e.attribution ? e.attribution : new URL(e.source).host.replace(/^www\./, ''), date: e.checked } : null;
    const src = srcOf ? h('p', { class: 'small', id: 'abSource' }, 'Source: ', h('a', { class: 'srclink', href: srcOf.url, target: '_blank', rel: 'noopener noreferrer', text: srcOf.ref }), srcOf.date ? ` \u00b7 read ${srcOf.date}` : '') : null;
    detail.append(h('div', { class: 'card', id: 'abConfirm' }, h('div', { class: 'card-h' }, h('h2', { class: 'card-title', text: `2. Check ${e.brand} ${e.name}` }), helpDot('eq-cover-types', 'Cover types')),
      h('div', { class: 'fld' }, h('span', {}, 'Ball weight ', st.weightSet ? null : prov('assumed', 'assumed 15 lb')),
        segmented('Ball weight', wts.map(w => [String(w), w + ' lb']), String(st.weight), v => { st.weight = +v; st.weightSet = true; draw(); }, 'wide')),
      dl, specNote, src,
      st.chainText ? h('p', { class: 'small muted', id: 'abChain', text: 'Checked: ' + st.chainText }) : null,
      nonMaker.length ? h('p', { class: 'small', id: 'abNonMaker', role: 'note', text: `${nonMaker.map(k => LABEL[k]).join(', ')}: not from the maker\u2019s current page (see each chip). Check against the box, then tap Add.` }) : null,
      e.flag ? h('p', { class: 'small', id: 'abFlag', text: e.flag }) : null,
      conflicts.length ? h('div', { id: 'abConflicts' }, h('p', { class: 'small' }, h('b', { text: 'Sources disagree; maker value used.' })),
        h('ul', { class: 'plain small' }, ...conflicts.map(c => h('li', { 'data-conflict': c.field, text: `${LABEL[c.field]}: ${c.newProv && (c.newProv.archived || c.newProv.secondary) ? (A.sourceLabel(c.newProv)) : 'maker'} ${fmt(c.field, c.maker)}${c.note ? ' (' + c.note + ')' : ''} vs ${chip(c.otherProv)} ${fmt(c.field, c.other)}` })))) : null,
      lvl == null ? h('div', { class: 'fld', id: 'abLevel' }, h('span', { text: 'No oil condition printed. Where would you use it?' }),
        segmented('Oil strength', [['5', 'Heavy'], ['4', 'Med-hvy'], ['3', 'Medium'], ['2', 'Med-lt'], ['1', 'Light']], st.level ? String(st.level) : null, v => { st.level = +v; draw(); }, 'wide')) : null));
    // ---- 3. engine card
    const b = P.bowler || {}, num = f => { const v = f && typeof f === 'object' ? f.v : f; return v == null || isNaN(+v) ? null : +v; };
    const s = (P.sessions || {})[openNight(P) || ''] || {}, ft = s.ft != null ? s.ft : HOUSE_ASSUMED.ft, patName = s.ft != null ? (s.patternName || s.patternSlug || 'Tonight') : 'House shot (assumed)';
    const speed = num(b.speed) || START.speed, rev = num(b.rev) || START.rev, eng = h('div', { class: 'card', id: 'abEngine' }, h('h2', { class: 'card-title', text: '3. Ball motion vs the benchmark' }));
    const miss = A.missing(fields);
    if (miss.length) eng.append(h('p', { class: 'small', id: 'abNoEngine', text: `No engine run until ${miss.join(', ')} ${miss.length === 1 ? 'is' : 'are'} known.` }));
    else {
      const ownBench = Object.values(P.owned).find(o => o.benchmark), bench = ownBench && catOf(ownBench.catalogId);
      const c = bench ? A.compare(cat, { bench, speed, rev, ft }) : { none:true, reason:'No owned benchmark chosen. Add without a comparison; no benchmark or ownership is assumed.' };
      if (c.none) eng.append(h('p', { class: 'small', text: c.reason }));
      else {
        const bar = (r, who) => { const tot = Math.max(1, (r.skid || 0) + (r.hook || 0) + (r.roll || 0)), seg = (cls, v, t) => h('i', { class: cls, style: { width: (100 * (v || 0) / tot) + '%' }, title: `${t} ${v} ft` });
          return h('div', { class: 'phbar', role: 'img', 'aria-label': `${who}: skid ${r.skid} ft, hook ${r.hook} ft, roll ${r.roll} ft` }, seg('sk', r.skid, 'Skid'), seg('hk', r.hook, 'Hook'), seg('rl', r.roll, 'Roll')); };
        const tr = (lab, a2, b2, d) => h('tr', {}, h('th', { scope:'row' }, lab, prov('model','model')), h('td', { class: 'num', text: a2 }), h('td', { class: 'num', text: b2 }), h('td', { class: 'num muted', text: d == null ? '' : (d > 0 ? '+' : '') + d }));
        const v = (x, u = '') => (x == null ? '\u2014' : x + u);
        eng.append(h('p', { class: 'small', id: 'abCoach', text: c.coach }),
          h('p', { class: 'muted small' }, `${patName} ${ft} ft \u2192 ${c.preset} preset (${c.presetLen} ft) \u00b7 ${speed} mph \u00b7 ${rev} rpm \u00b7 feet ${c.release.feet}, target ${v(c.release.target)}`,
            b.speed ? null : prov('assumed', 'speed/rev assumed'), s.ft != null ? null : prov('assumed', 'pattern assumed')),
          h('div', { class: 'phrow' }, h('span', { class: 'small' }, e.name, prov('model','model')), bar(c.ball, e.name)), h('div', { class: 'phrow' }, h('span', { class: 'small' }, c.benchName, prov('model','model')), bar(c.bench, c.benchName)),
          h('p', { class: 'muted small phkey' }, h('i', { class: 'sk' }), 'skid ', h('i', { class: 'hk' }), 'hook ', h('i', { class: 'rl' }), 'roll'),
          h('table', { class: 'abtable small', id: 'abTable' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col', text: '' }), h('th', { scope: 'col', text: 'New' }), h('th', { scope: 'col', text: 'Bench' }), h('th', { scope: 'col', text: '\u0394' }))),
            h('tbody', {}, tr('Skid', v(c.ball.skid, ' ft'), v(c.bench.skid, ' ft'), c.delta.skid), tr('Hook', v(c.ball.hook, ' ft'), v(c.bench.hook, ' ft'), c.delta.hook), tr('Roll', v(c.ball.roll, ' ft'), v(c.bench.roll, ' ft'), null),
              tr('Breakpoint', `${v(c.ball.bpFt, ' ft')} / ${v(c.ball.bpBoard)}`, `${v(c.bench.bpFt, ' ft')} / ${v(c.bench.bpBoard)}`, c.delta.bpBoard), tr('Entry angle (model)', v(c.ball.angle, '\u00b0'), v(c.bench.angle, '\u00b0'), c.delta.angle),
              tr('Model call', c.ball.call || '\u2014', c.bench.call || '\u2014', null))),
          h('p', { class: 'muted small' }, prov('model', 'estimate'), ` 2-D engine, same release for both \u00b7 ${c.ms} ms`, h('span', { id: 'abMs', hidden: true, text: String(c.ms) })));
      }
    }
    detail.append(eng);
    // ---- 4. grid placement against the balls in the bag
    const bag = currentBag(P);   // P1.1: the one saved bag
    const items = bag ? packedIds(P, bag).filter(id => id !== bag.spare && P.owned[id]).map(id => ({ ownedId: id, catalogId: P.owned[id].catalogId || null, name: P.owned[id].name }))
      : Object.keys(P.owned).filter(id => (P.owned[id].status || 'inBag') === 'inBag').map(id => ({ ownedId: id, catalogId: P.owned[id].catalogId || null, name: P.owned[id].name }));
    const pl = A.placement(cat, items), dec = items.map(x => Object.assign({}, x, G.cellOf(x.catalogId)));
    const over = new Set(pl.overlaps.flatMap(o => [o.a, o.b]));
    const grid = h('div', { class: 'grid5', id: 'abGrid', role: 'group', 'aria-label': 'Where it lands: strength 5 to 1 by shape' },
      h('div', { class: 'hd', 'aria-hidden': 'true', text: 'Lvl' }), ...G.SHAPES.map(x => h('div', { class: 'hd', 'aria-hidden': 'true', text: x[0].toUpperCase() + x.slice(1) })));
    for (let l = 5; l >= 1; l--) { grid.append(h('div', { class: 'hd', 'aria-hidden': 'true', text: String(l) }));
      for (const sh of G.SHAPES) { const xs = dec.filter(x => x.level === l && x.shape === sh), mine = pl.level === l && pl.shape === sh, hole = pl.holesLeft.includes(l);
        grid.append(h('div', { class: 'cell' + (hole ? ' hole' : '') + (mine && pl.overlaps.length ? ' over' : ''), 'data-l': l, 'data-s': sh, role: 'group', 'aria-label': `Level ${l}, ${sh}${mine ? ', new ball' : ''}${hole ? ', hole' : ''}` },
          ...xs.map(x => h('span', { class: 'gtag' + (over.has(x.ownedId) ? ' over' : ''), text: String(x.name || '').replace(/^(Radical|Storm|Hammer|900 Global|Columbia 300|Roto Grip|Motiv)\s+/, '') })),
          mine ? h('span', { class: 'gtag new', id: 'abNew', text: '\u2605 ' + e.name }) : null)); } }
    const why = [];
    if (pl.tbd) why.push(`${e.name} has no strength yet: pick one above to place it.`);
    else {
      pl.overlaps.forEach(o => { const other = items.find(x => x.ownedId === (o.a === '__new' ? o.b : o.a)); why.push(`${e.name} overlaps ${other ? other.name : 'a bag ball'}: ${o.why}.`); });
      if (pl.fills.length) why.push(`${e.name} fills the level ${pl.fills.join(', ')} hole.`);
      else if (pl.holesLeft.length) why.push(`${pl.holesLeft.length} hole${pl.holesLeft.length > 1 ? 's' : ''} left at level ${pl.holesLeft.join(', ')}.`);
      if (!pl.overlaps.length && !pl.fills.length) why.push(`${e.name} sits at level ${pl.level}, ${pl.shape}, with no overlap.`);
    }
    detail.append(h('div', { class: 'card', id: 'abPlace' }, h('h2', { class: 'card-title', text: '4. Where it lands in your bag' }),
      h('p', { class: 'muted small' }, bag ? `Against ${bag.name || 'your bag'}. ` : 'Against the balls marked in bag. ', prov('assumed', 'shape (estimate)')), grid,
      h('ul', { class: 'plain small', id: 'abWhy' }, ...why.map(t => h('li', { text: t })))));
    // ---- 5. save
    const dup = Object.values(P.owned).some(o => o.catalogId === cat.id);
    detail.append(h('div', { class: 'card', id: 'abSaveCard' },
      h('button', { class: 'btn primary block', id: 'abSave', disabled: st.saving ? true : null, onclick: () => save(fields, conflicts, cat, made) }, dup ? `Add another ${e.name}` : `Add ${e.name} to my arsenal`),
      h('p', { class: 'muted small', text: 'Saved as At home with the values above and their sources. Change its Status on its page or in Bag.' })));
  }
  function typeCard() {
    // Only the four the 2-D engine needs, and only where nothing is on file. Values come from the ball's box or the maker's card.
    const base = current().fields, need = k => !base[k] || st.manual[k] != null, card = h('div', { class: 'card ab-type', id: 'abType' },
      h('h2', { class: 'card-title', text: 'Type the specs' }), h('p', { class: 'muted small', text: 'From the box, the hang tag or the maker\u2019s spec card. Leave any you don\u2019t have: they show as not published.' }));
    for (const k of ['rg', 'diff']) if (need(k)) {
      const t = TYPE[k], inp = h('input', { type: 'text', inputmode: 'decimal', id: 'abType-' + k, 'aria-label': t.lab, placeholder: t.ph, autocomplete: 'off', value: st.manual[k] != null ? String(st.manual[k]) : '' });
      inp.addEventListener('change', () => {
        const raw = inp.value.trim().replace(',', '.'), v = raw === '' ? null : +raw;
        if (v != null && (isNaN(v) || v < t.min || v > t.max)) { toast(`${t.lab} is between ${t.min.toFixed(3)} and ${t.max.toFixed(3)} (USBC). Check the box.`); inp.value = ''; delete st.manual[k]; draw(); return; }
        if (v == null) delete st.manual[k]; else st.manual[k] = v; draw();
      });
      card.append(h('label', { class: 'fld' }, h('span', { text: t.lab }), inp));
    }
    if (need('coverType')) card.append(h('div', { class: 'fld' }, h('span', { text: 'Cover type' }),
      segmented('Cover type', ['Solid', 'Pearl', 'Hybrid', 'Urethane', 'Plastic'].map(x => [x, x]), st.manual.coverType || null, v => { st.manual.coverType = v; draw(); }, 'wide wrap')));
    if (need('symmetry')) card.append(h('div', { class: 'fld' }, h('span', { text: 'Core' }),
      segmented('Core symmetry', [['Symmetric', 'Symmetric'], ['Asymmetric', 'Asymmetric']], st.manual.symmetry || null, v => { st.manual.symmetry = v; draw(); }, 'wide')));
    return card.children.length > 2 ? card : '';
  }
  async function save(fields, conflicts, cat, made) {
    st.saving = true;
    const e = st.pick, data = A.ownedEvent(cat, fields, { weight: st.weightSet ? st.weight : null, src: made ? made.source.url : (e.source || e.src), entryId: e.id, conflicts });
    if (!st.weightSet) data.weightAssumed = st.weight;
    if (JSON.stringify(data).length > 7800) { delete data.spec.fields; }
    const id = 'own-' + uuid();
    await add('ownedBall.created', id, data, { prov: made ? { kind: 'manufacturer', ref: made.source.ref, url: made.source.url } : { kind: 'user' } });
    toast(`${e.name} added to your arsenal (At home).`); go('#/bag');
  }
  drawResults();
  const pre = new URLSearchParams((location.hash.split('?')[1] || '')).get('q');
  if (pre) { q.value = st.q = pre; drawResults(); }
  // Pro shop kit (owner 2026-10-31, tactic 3): a printed QR opens #/add-ball?cat=<catalogue id> with that ball picked.
  // Nothing saves until the bowler taps Add, same as a search.
  const catId = catFromHash(location.hash), fromQR = catId && A.entryById(catId);
  if (fromQR) { q.value = st.q = `${fromQR.brand} ${fromQR.name}`; drawResults(); pick(fromQR);
    results.prepend(h('p', { class: 'small', id: 'abFromKit', role: 'status', text: 'Opened from a pro shop code. Check it is your ball, then add it.' })); }
  else if (catId) results.prepend(h('p', { class: 'small', id: 'abFromKit', role: 'status', text: 'That code names a ball this app does not know yet. Search for it by name.' }));
  // IA P2 task 9: the search field is the first step, so it takes focus (a tap fewer on the way to a saved ball).
  if (!q.value && !catId) setTimeout(() => { if (document.body.contains(q)) q.focus({ preventScroll: true }); }, 0);
  return { el, title: 'Add a ball' };
}
