// Display-only physics provenance. A device release input NEVER makes the simulated path measured.
export function releaseSource(field, value) {
  if (field && field.v != null && +field.v === +value) {
    if (field.prov && field.prov.kind === 'device') return ['device', 'measured'];
    return ['user', 'entered'];
  }
  return ['assumed', 'input']; // tune controls / fallback, not a sensor reading
}
export const aboutAngle = n => Number.isFinite(n) ? `about ${Math.round(n)}°` : 'no angle';
export function pathSummary(a) {
  if (!a || !Number.isFinite(a.entryBoard)) return 'No path estimate: specs are unverified.';
  if (a.gutter) return 'This model path leaves the lane before the pins.';
  const end = `reaches the pins near board ${Math.round(a.entryBoard)}`;
  if (!Number.isFinite(a.bpBoard) || !Number.isFinite(a.bpFeet)) return `No breakpoint shown; ${end}.`;
  return `Breaks near board ${Math.round(a.bpBoard)} at ${Math.round(a.bpFeet)} ft; ${end}.`;
}

// Owned instances can contain maker facts or user-entered facts. A numeric value alone never proves a maker source.
export function specSource(cat, key) {
  if (cat?.[key] == null) return ['assumed','unverified'];
  const p = cat.specFields?.[key]?.prov;
  if (p) return [p.kind || 'user', p.kind === 'manufacturer' ? 'maker' : p.kind === 'user' ? 'you reported' : 'catalog'];
  return cat.source ? ['manufacturer','maker'] : ['catalog','catalog'];
}
