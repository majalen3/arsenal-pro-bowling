// #/add-ball (docs/TEAM_PROMPT_ADD_BALL.md). Type a name → catalogue match → maker-site lookup (server, allowlisted,
// cached) → confirm every field with its source chip → engine card vs the benchmark on tonight's pattern → grid placement
// → save as a benched owned ball. Nothing is saved until the user taps Add. Unknown fields read "spec TBD".
import { h, toast, segmented } from '../ui.js';
import { go } from '../router.js';
import { ready, proj, add } from '../hub.js';
import { API_BASE, today } from '../store.js';
import { chip } from '../data/schema.js';
import { norm } from '../data/match.js';
import * as A from '../cc/addball.js';
import * as G from '../cc/bag.js';
import { HOUSE_ASSUMED } from '../cc/rank.js';
const prov = (p, t) => h('span', { class: 'prov', 'data-prov': p || null, text: t });
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const WEIGHTS = [16, 15, 14, 13, 12];
const LABEL = { rg: 'RG', diff: 'Differential', intDiff: 'Int. diff / mass bias', coverstock: 'Coverstock', coverType: 'Cover type', finish: 'Finish / grit',
  core: 'Core', symmetry: 'Core symmetry', releaseDate: 'Release date', year: 'Year', usbc: 'USBC approval', condition: 'Condition' };
const ORDER = ['rg', 'diff', 'intDiff', 'coverstock', 'coverType', 'finish', 'core', 'symmetry', 'releaseDate', 'usbc', 'condition'];
const LEVEL_OIL = { 5: ['heavy'], 4: ['heavy', 'medium'], 3: ['medium'], 2: ['medium', 'light'], 1: ['light'] };
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
    h('header', { class: 'appbar' }, h('button', { class: 'btn ghost', id: 'abBack', 'aria-label': 'Back to Arsenal', onclick: () => go('#/arsenal') }, '\u2039 Arsenal'), h('h1', { class: 'title', text: 'Add a ball' })), body);
  const st = { q: '', brand: '', pick: null, look: null, lookState: 'idle', lookMsg: '', weight: 15, weightSet: false, level: null, ctl: null, makerCands: null, saving: false };
  const q = h('input', { type: 'search', class: 'search', id: 'abQ', placeholder: 'e.g. Storm Phaze II', 'aria-label': 'Ball brand and model', autocomplete: 'off', enterkeyhint: 'search' });
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
    if (!st.q.trim()) { results.append(h('p', { class: 'muted small', text: `${A.catalog().length} balls in the catalogue. Specs come from the maker\u2019s page when we can read it.` })); return; }
    const row = (e, score) => h('button', { class: 'brow-main', 'data-pick': e.id, onclick: () => pick(e) },
      h('span', { class: 'brow-text' }, h('span', { class: 'brow-name', text: `${e.brand} ${e.name}` }),
        h('span', { class: 'brow-meta', text: (e.src === 'app' ? 'app catalogue' : 'catalogue') + (score != null ? ` \u00b7 match ${Math.round(score * 100)}%` : ' \u00b7 exact match') })));
    const list = h('div', { class: 'blist', id: 'abList' });
    if (r.exact) list.append(h('div', { class: 'brow' }, row(r.exact, null)));
    r.candidates.forEach(c => list.append(h('div', { class: 'brow' }, row(c.entry, c.score))));
    if (!r.exact && !r.candidates.length) results.append(h('p', { class: 'small', id: 'abNoMatch', text: 'Not in the catalogue.' }));
    results.append(list);
    const can = brand && A.LOOKUP_BRANDS.includes(brand);
    results.append(h('button', { class: 'btn ghost block', id: 'abMaker', disabled: can ? null : true, onclick: makerOnly },
      can ? `Look up \u201c${st.q.trim()}\u201d on the ${brand} site` : brand && A.UNSUPPORTED[brand] ? A.UNSUPPORTED[brand] : 'Pick a brand to look it up on the maker site'));
  }
  function makerOnly() {
    const r = A.search(st.q), brand = brandOf(r); if (!brand || !A.LOOKUP_BRANDS.includes(brand)) return;
    // Keep what the user typed (minus the brand words); title-case only an all-lowercase entry; roman numerals upper.
    const raw = st.q.trim().replace(/\s+/g, ' '), bw = A.detectBrand(raw).brand ? raw.split(' ').slice(norm(A.detectBrand(raw).brand === brand ? brand : A.detectBrand(raw).brand).split(' ').length).join(' ') : raw;
    let name = bw || raw; if (name === name.toLowerCase()) name = name.replace(/\b\w/g, c => c.toUpperCase());
    name = name.replace(/\b(i{2,3}|iv|vi{0,3})\b/gi, m => m.toUpperCase());
    pick({ id: null, brand, name, src: 'maker', fields: {} });
  }
  function pick(e) { st.pick = e; st.look = null; st.makerCands = null; st.level = null; runLookup({ brand: e.brand, name: e.name }); }
  async function runLookup(qs) {
    if (st.ctl) st.ctl.abort();
    const e = st.pick, supported = A.LOOKUP_BRANDS.includes(e.brand);
    if (!supported) { st.lookState = 'skip'; st.lookMsg = A.UNSUPPORTED[e.brand] || `No maker lookup for ${e.brand} yet; showing catalogue values.`; draw(); return; }
    const ctl = st.ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 25000), t0 = performance.now();
    st.lookState = 'busy'; st.lookMsg = `Looking up ${e.brand} ${e.name} on the maker site\u2026`; draw();
    try {
      const res = await lookup(qs, ctl.signal); if (ctl !== st.ctl) return;
      const ms = Math.round(performance.now() - t0);
      if (res.status === 'found') { st.look = res; st.lookState = 'found'; st.lookMsg = `Found on ${res.source.host} in ${(ms / 1000).toFixed(1)} s${res.cached ? ' (cached)' : ''}.`; }
      else if (res.status === 'candidates') { st.makerCands = res.candidates || []; st.lookState = 'cands'; st.lookMsg = `${st.makerCands.length} pages on the ${e.brand} site could be this ball. Pick one.`; }
      else { st.lookState = 'miss'; st.lookMsg = (res.why || 'No maker page found.') + (e.src === 'maker' ? '' : ' Showing catalogue values.'); }
    } catch (err) {
      if (ctl !== st.ctl) return; st.lookState = 'miss'; st.lookMsg = err && err.name === 'AbortError' ? 'The lookup server is waking up or offline. Try again in a minute.' : 'Offline: showing catalogue values only.';
    } finally { clearTimeout(timer); if (ctl === st.ctl) { st.ctl = null; draw(); } }
  }
  function current() {
    const e = st.pick, made = st.look ? A.fromLookup(st.look, st.weight) : null, base = e.fields || {};
    const { fields, conflicts } = made ? A.merge(base, made.fields) : { fields: Object.assign({}, base), conflicts: [] };
    if (st.level && !(fields.oil && fields.oil.v && fields.oil.v.length)) fields.oil = { v: LEVEL_OIL[st.level], prov: { kind: 'user' } };
    const id = e.src === 'app' ? e.id : 'add-' + slug(e.brand + ' ' + e.name);
    const cat = A.toCat(fields, { id, brand: e.brand, name: e.name });
    return { fields, conflicts, made, cat };
  }
  function draw() {
    detail.innerHTML = ''; const e = st.pick; if (!e) return;
    const P = proj(), { fields, conflicts, made, cat } = current();
    detail.append(h('p', { class: 'small', id: 'abStatus', role: 'status', 'data-state': st.lookState }, st.lookMsg,
      st.lookState === 'miss' && e.brand && A.LOOKUP_BRANDS.includes(e.brand) ? h('button', { class: 'btn ghost sm', id: 'abRetry', style: { marginLeft: '8px' }, onclick: () => runLookup({ brand: e.brand, name: e.name }) }, 'Retry') : null));
    if (st.lookState === 'cands') detail.append(h('div', { class: 'card', id: 'abMakerCands' }, h('h2', { class: 'card-title', text: 'Which page?' }),
      h('div', { class: 'blist' }, ...st.makerCands.map(c => h('div', { class: 'brow' }, h('button', { class: 'brow-main', 'data-url': c.url, onclick: () => runLookup({ url: c.url }) },
        h('span', { class: 'brow-text' }, h('span', { class: 'brow-name', text: c.label }), h('span', { class: 'brow-meta', text: new URL(c.url).host }))))))));
    if (st.lookState === 'busy') return;
    // ---- 2. confirm
    const wts = [...new Set([...WEIGHTS, ...(made ? made.weights : [])])].sort((a, b) => a - b); // always offer 12-16; printed weights add to it
    const dl = h('dl', { class: 'kv', id: 'abFields' });
    for (const k of ORDER) {
      const x = fields[k]; if (!x && (k === 'year' || k === 'condition' || k === 'intDiff' && !made)) continue;
      dl.append(h('dt', { text: LABEL[k] }), h('dd', { 'data-f': k }, x ? fmt(k, x.v) : h('span', { class: 'muted', text: 'spec TBD' }),
        x && x.note ? h('span', { class: 'muted small', text: ' ' + x.note }) : null, x ? prov(x.prov && x.prov.kind, chip(x.prov)) : null,
        x && x.weightMismatch ? prov('assumed', 'other weight') : null));
    }
    const lvl = G.cellOfCat(cat).level;
    const src = made && made.source.url ? h('p', { class: 'small', id: 'abSource' }, 'Source: ', h('a', { class: 'srclink', href: made.source.url, target: '_blank', rel: 'noopener noreferrer', text: made.source.ref }), ` \u00b7 read ${made.source.date}`) : null;
    detail.append(h('div', { class: 'card', id: 'abConfirm' }, h('h2', { class: 'card-title', text: `2. Check ${e.brand} ${e.name}` }),
      h('div', { class: 'fld' }, h('span', {}, 'Ball weight ', st.weightSet ? null : prov('assumed', 'assumed 15 lb')),
        segmented('Ball weight', wts.map(w => [String(w), w + ' lb']), String(st.weight), v => { st.weight = +v; st.weightSet = true; draw(); }, 'wide')),
      dl, src, e.flag ? h('p', { class: 'small', id: 'abFlag', text: e.flag }) : null,
      conflicts.length ? h('div', { id: 'abConflicts' }, h('p', { class: 'small' }, h('b', { text: 'Sources disagree; maker value used.' })),
        h('ul', { class: 'plain small' }, ...conflicts.map(c => h('li', { 'data-conflict': c.field, text: `${LABEL[c.field]}: maker ${fmt(c.field, c.maker)}${c.note ? ' (' + c.note + ')' : ''} vs ${chip(c.otherProv)} ${fmt(c.field, c.other)}` })))) : null,
      lvl == null ? h('div', { class: 'fld', id: 'abLevel' }, h('span', { text: 'No oil condition printed. Where would you use it?' }),
        segmented('Oil strength', [['5', 'Heavy'], ['4', 'Med-hvy'], ['3', 'Medium'], ['2', 'Med-lt'], ['1', 'Light']], st.level ? String(st.level) : null, v => { st.level = +v; draw(); }, 'wide')) : null));
    // ---- 3. engine card
    const b = P.bowler || {}, num = f => { const v = f && typeof f === 'object' ? f.v : f; return v == null || isNaN(+v) ? null : +v; };
    const s = (P.sessions || {})['tonight-' + today()] || {}, ft = s.ft != null ? s.ft : HOUSE_ASSUMED.ft, patName = s.ft != null ? (s.patternName || s.patternSlug || 'Tonight') : 'House shot (assumed)';
    const speed = num(b.speed) || 15, rev = num(b.rev) || 220, eng = h('div', { class: 'card', id: 'abEngine' }, h('h2', { class: 'card-title', text: '3. Ball motion vs the benchmark' }));
    const miss = A.missing(fields);
    if (miss.length) eng.append(h('p', { class: 'small', id: 'abNoEngine', text: `Spec TBD: no engine run. Missing ${miss.join(', ')}.` }));
    else {
      const c = A.compare(cat, { speed, rev, ft });
      if (c.none) eng.append(h('p', { class: 'small', text: c.reason }));
      else {
        const bar = (r, who) => { const tot = Math.max(1, (r.skid || 0) + (r.hook || 0) + (r.roll || 0)), seg = (cls, v, t) => h('i', { class: cls, style: { width: (100 * (v || 0) / tot) + '%' }, title: `${t} ${v} ft` });
          return h('div', { class: 'phbar', role: 'img', 'aria-label': `${who}: skid ${r.skid} ft, hook ${r.hook} ft, roll ${r.roll} ft` }, seg('sk', r.skid, 'Skid'), seg('hk', r.hook, 'Hook'), seg('rl', r.roll, 'Roll')); };
        const tr = (lab, a2, b2, d) => h('tr', {}, h('th', { scope: 'row', text: lab }), h('td', { class: 'num', text: a2 }), h('td', { class: 'num', text: b2 }), h('td', { class: 'num muted', text: d == null ? '' : (d > 0 ? '+' : '') + d }));
        const v = (x, u = '') => (x == null ? '\u2014' : x + u);
        eng.append(h('p', { class: 'small', id: 'abCoach', text: c.coach }),
          h('p', { class: 'muted small' }, `${patName} ${ft} ft \u2192 ${c.preset} preset (${c.presetLen} ft) \u00b7 ${speed} mph \u00b7 ${rev} rpm \u00b7 feet ${c.release.feet}, target ${v(c.release.target)}`,
            b.speed ? null : prov('assumed', 'speed/rev assumed'), s.ft != null ? null : prov('assumed', 'pattern assumed')),
          h('div', { class: 'phrow' }, h('span', { class: 'small', text: e.name }), bar(c.ball, e.name)), h('div', { class: 'phrow' }, h('span', { class: 'small', text: c.benchName }), bar(c.bench, c.benchName)),
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
    const bag = Object.values(P.bags || {}).sort((x, y) => (x.id < y.id ? 1 : -1))[0];
    const items = bag ? bag.slots.map(x => x.owned).filter(id => id !== bag.spare && P.owned[id]).map(id => ({ ownedId: id, catalogId: P.owned[id].catalogId || null, name: P.owned[id].name }))
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
      h('p', { class: 'muted small', text: 'Saved as benched with the values above and their sources. Edit status in Bag.' })));
  }
  async function save(fields, conflicts, cat, made) {
    st.saving = true;
    const e = st.pick, data = A.ownedEvent(cat, fields, { weight: st.weightSet ? st.weight : null, src: made ? made.source.url : e.src, entryId: e.id, conflicts });
    if (!st.weightSet) data.weightAssumed = st.weight;
    if (JSON.stringify(data).length > 7800) { delete data.spec.fields; }
    const id = 'own-' + slug(cat.id) + '-' + Date.now().toString(36);
    await add('ownedBall.created', id, data, { prov: made ? { kind: 'manufacturer', ref: made.source.ref, url: made.source.url } : { kind: 'user' } });
    toast(`${e.name} added to your arsenal (benched).`); go('#/bag');
  }
  drawResults();
  const pre = new URLSearchParams((location.hash.split('?')[1] || '')).get('q');
  if (pre) { q.value = st.q = pre; drawResults(); }
  return { el, title: 'Add a ball' };
}
