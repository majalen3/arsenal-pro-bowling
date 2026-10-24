// M2: your own / house pattern (Sim2 #9). Any name is accepted; length, volume and ratio are optional ("Add details"),
// and an unknown length stays "not entered", with the house 38 ft assumption labelled wherever it is used. Pure.
const num = (v, lo, hi) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
export const slugOf = v => String(v).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
// Ratio as typed ("3:1", "3", "3.5 to 1") -> 3 / 3.5 (a number, like the Kegel index); nonsense -> null.
export const cleanRatio = v => { const m = /^\s*(\d{1,2}(?:\.\d)?)\s*(?::|to)?\s*1?\s*$/i.exec(String(v == null ? '' : v)); const n = m ? +m[1] : NaN; return n >= 1 && n <= 15 ? n : null; };
// Sanity ranges only (not claims about real patterns): length 20-70 ft, volume 5-50 mL.
export function ownPattern(name, d = {}) {
  const nm = String(name == null ? '' : name).replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!nm || !slugOf(nm)) return null;
  const ft = num(d.ft, 20, 70), ml = num(d.ml, 5, 50);
  return { pickId: null, patternSlug: 'own-' + slugOf(nm), patternName: nm, ft: ft == null ? null : Math.round(ft), ml: ml == null ? null : Math.round(ml * 10) / 10, ratio: cleanRatio(d.ratio), patternOwn: true };
}
// The pattern object the rest of Tonight uses: own names keep their label even with no length (then 38 ft is assumed, labelled).
export function patOf(s) {
  if (!s) return null;
  if (s.ft != null) return { slug: s.patternSlug, name: s.patternName || s.patternSlug, ft: s.ft, ml: s.ml, ratio: s.ratio, own: !!s.patternOwn };
  return null;
}
export const ownLabel = s => s && s.patternOwn ? (s.ft != null ? `your entry \u00b7 ${s.ft} ft` : 'your entry \u00b7 length not entered, 38 ft assumed') : null;
