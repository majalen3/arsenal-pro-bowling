// Pattern library (Kegel Pattern Library via CarryDown). Loaded on demand only.
let idx = null, steps = null;
export const SOURCE = 'Kegel Pattern Library via CarryDown';
let idxP = null;   // one fetch even when the first touch and the post-paint timer both ask (v80)
export function loadIndex() {
  if (idx) return Promise.resolve(idx);
  return idxP || (idxP = (async () => {
    const r = await fetch('data/patterns-index.json'); if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    idx = j.rows.map(([slug, name, series, ft, ratio, ml, src, len]) => ({ slug, name, series, ft, ratio, ml, src, len }));
    return idx;
  })().catch(e => { idxP = null; throw e; }));
}
export async function loadSteps(slug) {
  if (!steps) { const r = await fetch('data/patterns-steps.json'); if (!r.ok) throw new Error('HTTP ' + r.status); steps = await r.json(); }
  return (steps[slug] || []).map(([dir, bl, br, loads, ft0, ft1, mics]) => ({ dir, bl, br, loads, ft0, ft1, mics }));
}
