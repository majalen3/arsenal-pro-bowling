// Bag builder core (CC2, COMMAND_CENTER_PLAN §3). Pure: owned balls + catalog + projection in, grid/checks/fill out.
// Strength = app oil tag (rank.js levelOf). Shape = cover + core + diff proxy (rank.js angularity), an ESTIMATE (A).
import { balls, coverKind } from '../data.js';
import { levelOf, angularity, demandOf, bandOf, SRC } from './rank.js';
const catOf = id => (id ? balls.find(b => b.id === id) || null : null);
export const SHAPES = ['smooth', 'medium', 'angular'];
export const LEVEL_NAME = { 5: 'Heavy', 4: 'Med-heavy', 3: 'Medium', 2: 'Med-light', 1: 'Light' };
export const SIZE = { league3: 2, league4: 3, tournament6: 5, custom: null };   // balls besides the spare
export function cellOf(catalogId) {
  const cat = catOf(catalogId), level = levelOf(cat), a = angularity(cat);
  return { cat, level, shape: a == null ? null : a <= 1 ? 'smooth' : a === 2 ? 'medium' : 'angular', tbd: level == null };
}
// item: {ownedId, catalogId, name, benchmark, status}
const decorate = it => Object.assign({}, it, cellOf(it.catalogId));
export function overlaps(items) {
  const xs = items.map(decorate).filter(x => !x.tbd), out = [];
  for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) {
    const a = xs[i], b = xs[j];
    if (a.level === b.level && a.shape === b.shape) out.push({ a: a.ownedId, b: b.ownedId, why: `same cell (level ${a.level}, ${a.shape})` });
    else if (a.cat.coreName && a.cat.coreName === b.cat.coreName && coverKind(a.cat) === coverKind(b.cat)) out.push({ a: a.ownedId, b: b.ownedId, why: `same core (${a.cat.coreName}) and cover (${coverKind(a.cat)})` });
  }
  return out;
}
export function holes(items) {
  const lv = [...new Set(items.map(decorate).filter(x => !x.tbd).map(x => x.level))];
  if (lv.length < 2) return [];
  const lo = Math.min(...lv), hi = Math.max(...lv), out = [];
  for (let l = lo + 1; l < hi; l++) if (!lv.includes(l)) out.push(l);
  return out;
}
// Ball care rules (ARSENAL_MANAGER_PLAN §1.4, cited defaults, editable later). Lead = 6 games (A).
const FAMILY = { Radical: 'Brunswick', Brunswick: 'Brunswick', DV8: 'Brunswick', Storm: 'Storm', '900 Global': 'Storm', 'Roto Grip': 'Storm', Motiv: 'Motiv', Hammer: 'Hammer', Ebonite: 'Brunswick' };
export const CARE = { Brunswick: { refresh: 10, resurface: 60, detox: 60, src: 'Brunswick poster (F)' }, Storm: { refresh: 25, resurface: 60, detox: 60, src: 'Storm guide (F)' },
  Motiv: { refresh: null, resurface: 50, detox: null, src: 'Motiv (F/S)' }, Hammer: { refresh: null, resurface: 50, detox: null, src: 'Hammer blog (S, unverified)' },
  none: { refresh: 10, resurface: 60, detox: 60, src: 'no brand guidance (conservative = Brunswick)' } };
export const LEAD = 6;
export function careOf(cat) {
  const fam = cat ? FAMILY[cat.brand] || 'none' : 'none', r = Object.assign({ family: fam }, CARE[fam]);
  if (cat && coverKind(cat) === 'Urethane') r.detox = null;   // urethane does not absorb oil (USBC cover study F)
  return r;
}
// health: P.health entry {games, since:{refresh,resurface,detox}} (= fold of the event log). gamesAhead: games until the event.
export function dueOf(cat, health, gamesAhead = 0) {
  const r = careOf(cat), out = [];
  if (!health) return out;
  for (const t of ['refresh', 'resurface', 'detox']) {
    const every = r[t]; if (!every) continue;
    const known = health.since && health.since[t] != null, n = known ? health.since[t] : health.games;
    if (n + gamesAhead + LEAD >= every) out.push({ type: t, n, every, atLeast: !known, src: r.src, over: n >= every });
  }
  return out;
}
// The 10 checks (all warnings; none blocks). ctx: {format, pattern, tert, surface, style, health, eventDate, gamesAhead}
export function checks(items, spare, ctx = {}) {
  const xs = items.map(decorate), real = xs.filter(x => !x.tbd), out = [];
  const add = (n, ok, text, src, warn = !ok) => out.push({ n, ok, warn, text, src });
  // 1 benchmark: exactly one, in the middle
  const bm = xs.filter(x => x.benchmark), lv = real.map(x => x.level);
  if (bm.length !== 1) add(1, false, bm.length ? `${bm.length} benchmarks marked; keep one.` : 'No benchmark in this bag.', SRC.motiv);
  else { const b = bm[0], hi = Math.max(...lv), lo = Math.min(...lv);
    const mid = b.tbd || real.length < 3 ? null : b.level < hi && b.level > lo;
    add(1, mid !== false, mid === false ? `${b.name} is your ${b.level === hi ? 'strongest' : 'weakest'} ball; a benchmark sits in the middle.` : real.length < 3 ? `${b.name} is the benchmark (too few balls to have a middle).` : `${b.name} is the benchmark, in the middle.`, SRC.motiv); }
  // 2 spare ball
  const needSpare = ctx.format === 'tournament6' || ctx.format === 'league3' || ctx.format === 'league4';
  add(2, !!spare || !needSpare, spare ? `Spare ball: ${spare.name}.` : needSpare ? 'No spare ball in this bag.' : 'No spare ball (custom bag).', SRC.br);
  // 3 overlap, 4 hole
  const ov = overlaps(items), names = id => (xs.find(x => x.ownedId === id) || {}).name;
  add(3, !ov.length, ov.length ? 'Overlap: ' + ov.map(o => `${names(o.a)} + ${names(o.b)} (${o.why})`).join('; ') + '.' : 'Overlap: none.', SRC.br);
  const hs = holes(items);
  add(4, !hs.length, hs.length ? `Hole: nothing at level ${hs.join(', ')} between your strongest and weakest.` : 'Hole: none.', SRC.team);
  // 5 pattern fit (only when a pattern is set)
  if (ctx.pattern && ctx.pattern.ft != null) {
    const near = st => { const d = demandOf({ pattern: ctx.pattern, tert: ctx.tert, surface: ctx.surface, stage: st }).demand; return { d, ok: lv.some(l => Math.abs(l - d) <= 1) }; };
    const f = near('fresh'), t = near('transition'), b = near('burn'), miss = [f.ok ? null : `fresh (demand ${f.d})`, t.ok ? null : `transition (${t.d})`, b.ok ? null : `burn (${b.d})`].filter(Boolean);
    add(5, !miss.length, miss.length ? `${ctx.pattern.name || 'Pattern'}: no ball within 1 level for ${miss.join(', ')}.` : `${ctx.pattern.name || 'Pattern'}: covered fresh (${f.d}), transition (${t.d}) and burn (${b.d}).`, SRC.team);
  } else add(5, true, 'Pattern fit: set an event pattern to check it.', SRC.assumed, false);
  // 6 sym/asym mix by player type
  const cores = real.map(x => x.cat.core), asym = cores.filter(c => c === 'Asymmetric').length, sym = cores.length - asym, style = ctx.style || 'tweener';
  const ok6 = style === 'stroker' ? asym > 0 : style === 'cranker' ? sym > 0 : real.length < 3 || (asym > 0 && sym > 0);
  add(6, ok6, `${sym} symmetric, ${asym} asymmetric` + (ok6 ? ` fits a ${style}.` : style === 'stroker' ? ': a stroker usually wants one asymmetric.' : style === 'cranker' ? ': a cranker usually wants one symmetric.' : ': a mix covers more shapes.'), SRC.br);
  // 7 control option for short or flat patterns (flat = ratio ≤ 3:1, A)
  if (ctx.pattern && (bandOf(ctx.pattern.ft) === 'short' || (ctx.pattern.ratio != null && ctx.pattern.ratio <= 3))) {
    const ctrl = real.some(x => coverKind(x.cat) === 'Urethane' || x.level <= 2);
    add(7, ctrl, ctrl ? 'Control option packed for a short or flat pattern.' : 'Short or flat pattern: pack a control ball (urethane or level 1–2).', SRC.br);
  } else add(7, true, 'Control option: not needed for this pattern.', SRC.br, false);
  // 8 health before the event
  const due = xs.map(x => ({ x, d: dueOf(x.cat, ctx.health && (ctx.health[x.ownedId] || ctx.health[x.catalogId]), ctx.gamesAhead || 0) })).filter(y => y.d.length);
  add(8, !due.length, due.length ? `Service${ctx.eventDate ? ' before ' + ctx.eventDate : ''}: ` + due.map(y => `${y.x.name} (${y.d.map(d => `${d.type} ${d.atLeast ? '\u2265' : ''}${d.n}/${d.every}`).join(', ')})`).join('; ') + '.' : 'No service due.', due.length ? due[0].d[0].src : SRC.team);
  // 9 status
  const blocked = xs.filter(x => x.status === 'proShop' || x.status === 'retired');
  add(9, !blocked.length, blocked.length ? blocked.map(x => `${x.name} is ${x.status === 'proShop' ? 'at the pro shop' : 'retired'}; left off the pack list.`).join(' ') : 'Every ball is available.', SRC.you);
  // 10 USBC approved list: we can only say "check" when the ball is not matched to the catalog
  const unk = xs.filter(x => !x.catalogId);
  add(10, !unk.length, unk.length ? `Check the USBC approved list for ${unk.map(x => x.name).join(', ')} (not matched to a catalog ball).` : 'Every ball is matched to the catalog by name.', SRC.usbc, !!unk.length);
  return out;
}
// Fill bag: the best set from OWNED balls only (never proShop/retired/excluded; locked always in). Deterministic.
export function fill(owned, { format = 'tournament6', size = null, locked = [], excluded = [], spare = null, current = [], ctx = {} } = {}) {
  const n = size || SIZE[format] || 5;
  const pool = owned.filter(o => !['proShop', 'retired'].includes(o.status) && !excluded.includes(o.ownedId));
  const sp = (spare && pool.find(o => o.ownedId === spare)) || pool.find(o => /spare/i.test(o.note || '')) || null;
  const cand = pool.filter(o => o !== sp).sort((a, b) => a.ownedId < b.ownedId ? -1 : 1), must = cand.filter(o => locked.includes(o.ownedId));
  const free = cand.filter(o => !must.includes(o)), k = Math.max(0, Math.min(n, cand.length) - must.length);
  let best = null;
  const score = set => { const c = checks(set, sp, Object.assign({}, ctx, { health: null }));
    const lv = set.map(decorate).filter(x => !x.tbd).map(x => x.level), span = lv.length ? Math.max(...lv) - Math.min(...lv) : 0;
    return c.filter(x => x.warn).length * 10 + overlaps(set).length * 3 + holes(set).length * 2 - span - (set.some(x => x.benchmark) ? 5 : 0) + set.filter(x => decorate(x).tbd).length * 4 - set.filter(x => current.includes(x.ownedId)).length * 0.5; };   // tie-break: keep what you carry
  const rec = (i, pick) => {
    if (pick.length === k) { const set = must.concat(pick), s = score(set); if (!best || s < best.s) best = { s, set }; return; }
    for (let j = i; j < free.length; j++) rec(j + 1, pick.concat([free[j]]));
  };
  rec(0, []);
  const set = best ? best.set : must;
  return { slots: set.map(o => ({ owned: o.ownedId, locked: locked.includes(o.ownedId) })), spare: sp ? sp.ownedId : null, score: best ? best.s : null };
}
export function diffBags(a, b) {
  const A = new Set(a.slots.map(s => s.owned)), B = new Set(b.slots.map(s => s.owned));
  return { in: [...B].filter(x => !A.has(x)), out: [...A].filter(x => !B.has(x)), spare: a.spare !== b.spare ? b.spare : undefined };
}
// Pack list: role → ball → why, then service items and blocked balls.
export function packList(items, spare, ctx = {}) {
  const xs = items.map(decorate), ok = xs.filter(x => !['proShop', 'retired'].includes(x.status)), bm = ok.find(x => x.benchmark);
  const role = x => x.benchmark ? 'Benchmark' : x.tbd || !bm || bm.tbd ? 'Ball' : x.level > bm.level ? 'Stronger' : x.level < bm.level ? 'Weaker / cleaner' : 'Shape change';
  const rows = ok.slice().sort((a, b) => (b.level ?? -1) - (a.level ?? -1)).map(x => ({ role: role(x), ownedId: x.ownedId, name: x.name,
    why: x.tbd ? 'spec TBD: no level' : `level ${x.level} (${SRC.tag}), ${x.shape} shape (estimate)` }));
  if (spare) rows.push({ role: 'Spare', ownedId: spare.ownedId, name: spare.name, why: 'straight at spares' });
  const service = xs.flatMap(x => dueOf(x.cat, ctx.health && (ctx.health[x.ownedId] || ctx.health[x.catalogId]), ctx.gamesAhead || 0).map(d => ({ name: x.name, ...d })));
  const blocked = xs.filter(x => !ok.includes(x)).map(x => ({ name: x.name, why: x.status === 'proShop' ? 'at the pro shop' : 'retired' }));
  return { rows, service, blocked };
}
