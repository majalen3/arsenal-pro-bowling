// Pattern library (Kegel Pattern Library via CarryDown). Loaded on demand only.
let idx = null, steps = null;
export const SOURCE = 'Kegel Pattern Library via CarryDown';
export async function loadIndex() {
  if (idx) return idx;
  const r = await fetch('data/patterns-index.json'); if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  idx = j.rows.map(([slug, name, series, ft, ratio, ml, src, len]) => ({ slug, name, series, ft, ratio, ml, src, len }));
  return idx;
}
export async function loadSteps(slug) {
  if (!steps) { const r = await fetch('data/patterns-steps.json'); if (!r.ok) throw new Error('HTTP ' + r.status); steps = await r.json(); }
  return (steps[slug] || []).map(([dir, bl, br, loads, ft0, ft1, mics]) => ({ dir, bl, br, loads, ft0, ft1, mics }));
}
export const lenOf = ft => ft == null ? '' : ft < 36 ? 'Short' : ft <= 41 ? 'Medium' : 'Long';
