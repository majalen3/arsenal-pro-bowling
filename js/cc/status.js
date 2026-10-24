// One Status per ball (IA_PLAN P1.3 / owner item D, 2026-10-24): where the ball is, in bowler words. The stored keys stay
// the v1 ones (inBag / benched / proShop / retired) so old backups, the API and the event log keep working; only the
// words change. This module is the single source for the labels, who the builder may offer, and the one-line
// "why not this ball?" that the ball page, Arsenal, Tonight's advisor and the bag builder all show. Pure.
import { overlaps, dueOf, cellOfCat } from './bag.js';
import { catOf } from './cats.js';
export const STATUS = [['inBag', 'In my bag'], ['benched', 'At home'], ['proShop', 'At the pro shop'], ['retired', 'Retired']];
export const KEYS = STATUS.map(s => s[0]);
export const LABEL = Object.fromEntries(STATUS);
export const statusOf = o => (o && KEYS.includes(o.status) ? o.status : 'inBag');
export const label = o => LABEL[statusOf(o)];
// The builder, Swap and Bowl's ball chip offer In my bag and At home balls (At home is tagged "grab from home").
export const offered = o => !!o && ['inBag', 'benched'].includes(statusOf(o));
export const inMyBag = o => !!o && statusOf(o) === 'inBag';
export const ALWAYS = '\ud83d\udccc Always bring';
export const HOME_TAG = 'grab from home';
// Migration (excluded → At home, unless already at the pro shop or retired). Returns the events to append, as
// [type, entityId, data]; idempotent: nothing to do once no bag carries an `excluded` list.
export function migrateExcluded(P) {
  const out = [], seen = new Set();
  for (const bag of Object.values((P && P.bags) || {})) {
    const ex = Array.isArray(bag.excluded) ? bag.excluded : [];
    if (!ex.length) continue;
    for (const id of ex) { const o = P.owned[id]; if (!o || seen.has(id)) continue; seen.add(id);
      if (statusOf(o) === 'inBag') out.push(['ownedBall.edited', id, { fields: { status: 'benched' } }]); }
    const nb = Object.assign({}, bag); delete nb.id; delete nb.ts; nb.excluded = [];
    out.push(['bag.saved', bag.id, nb]);
  }
  return out;
}
// Why is this ball not in tonight's bag? One plain sentence from existing rule outputs only (Status, service due,
// At home, overlap, oil-tag level vs tonight's demand, spec TBD), in that order. x: { ownedId, name, status, cat };
// ctx: { bag: [items in the bag, same shape], demand: 1..5 | null, health, size: N }.
export function whyNot(x, ctx = {}) {
  if (!x.cat && x.catalogId) x = Object.assign({}, x, { cat: catOf(x.catalogId) });
  const st = statusOf(x), bag = ctx.bag || [], cell = cellOfCat(x.cat || null);
  if (st === 'retired') return { key: 'retired', text: 'Retired: kept with its history, never packed.', canBring: false };
  if (st === 'proShop') return { key: 'proShop', text: 'At the pro shop: not available until you set it back.', canBring: false };
  if (st === 'benched') return { key: 'home', text: `At home: ${HOME_TAG} if you want it tonight.`, canBring: true };
  const due = x.cat ? dueOf(x.cat, ctx.health && (ctx.health[x.ownedId] || ctx.health[x.catalogId]), 0) : [];
  if (due.length) return { key: 'due', text: `Service due: ${due[0].type} (${due[0].atLeast ? '\u2265' : ''}${due[0].n} of ${due[0].every} games).`, canBring: true };
  const ov = overlaps(bag.concat([x])).find(o => o.a === x.ownedId || o.b === x.ownedId);
  if (ov) { const other = bag.find(b => b.ownedId === (ov.a === x.ownedId ? ov.b : ov.a));
    return { key: 'overlap', text: `Too close to ${other ? other.name : 'a ball you\u2019re bringing'}: ${ov.why}.`, canBring: true }; }
  if (cell.tbd) return { key: 'tbd', text: 'No oil tag yet (spec TBD), so the app can\u2019t place it.', canBring: true };
  if (ctx.demand != null && cell.level != null && cell.level !== ctx.demand) {
    const more = cell.level > ctx.demand;
    return { key: more ? 'stronger' : 'weaker', text: `${more ? 'Stronger' : 'Weaker'} than tonight\u2019s lanes need (level ${cell.level} vs demand ${ctx.demand}).`, canBring: true };
  }
  return { key: 'full', text: ctx.size ? `The bag holds ${ctx.size}; the others fit tonight better.` : 'The others fit tonight better.', canBring: true };
}
// P1.1: the ONE saved bag (tonight's bag) every screen reads: the most recently saved bag.saved (ties: id, newest first).
export const TONIGHT_BAG = 'bag-tonight';
export function currentBag(P) {
  const bags = Object.values((P && P.bags) || {}); if (!bags.length) return null;
  return bags.slice().sort((a, b) => ((b.ts || 0) - (a.ts || 0)) || (a.id < b.id ? 1 : -1))[0];
}
export const shortName = n => String(n || '').replace(/^(Radical|Storm|Hammer|900 Global|Columbia 300|Roto Grip|Motiv|Brunswick|Ebonite|Track|DV8)\s+/, '');
export function itemOfOwned(P, id) {
  const o = P.owned[id]; if (!o) return null; const c = catOf(o.catalogId);
  return { ownedId: id, catalogId: o.catalogId || null, cat: c, name: shortName(o.name || (c && c.name) || 'Ball'), status: statusOf(o), benchmark: !!o.benchmark, finish: o.finish || 'factory', note: o.note || null };
}
export const bagIds = bag => (bag ? bag.slots.map(s => s.owned) : []);
// What actually gets packed: slots whose ball is In my bag, or At home but swapped in on purpose (slot.fromHome).
// Moving a ball to At home / the pro shop / Retired anywhere takes it out of the bag (and the ball chip) at once.
export function packedIds(P, bag) {
  if (!bag) return [];
  return bag.slots.filter(sl => { const o = P.owned[sl.owned]; if (!o) return false; const st = statusOf(o); return st === 'inBag' || (st === 'benched' && sl.fromHome); }).map(sl => sl.owned);
}
// The why-not for one owned ball against tonight's bag (null when it is in the bag). demand: tonight's (or null).
export function whyNotFor(P, ownedId, { demand = null, bag = currentBag(P) } = {}) {
  const ids = packedIds(P, bag); if (ids.includes(ownedId)) return null;
  const x = itemOfOwned(P, ownedId); if (!x) return null;
  return whyNot(x, { bag: ids.map(id => itemOfOwned(P, id)).filter(Boolean), demand, health: P.health, size: ids.length });
}
