import { h, icon, skeleton, emptyState } from '../ui.js';
import { loadIndex, SOURCE } from '../patdata.js';
const st = { q:'', f:'all', n:60 };
export function render() {
  const search = h('input', { type:'search', class:'search', id:'patSearch', placeholder:'Search 700+ patterns, e.g. Shark, Kegel, USBC', 'aria-label':'Search patterns', value:st.q, autocomplete:'off' });
  const chips = h('div', { class:'chips scroll', role:'group', 'aria-label':'Filter by length' });
  const list = h('div', { class:'plist', id:'patList' }, skeleton(6));
  const count = h('p', { class:'muted small', id:'patCount', 'aria-live':'polite' });
  let all = [];
  const opts = [['all', 'All'], ['S', 'Short \u2264 35 ft'], ['M', 'Medium 36\u201341'], ['L', 'Long 42+'], ['pba', 'PBA'], ['usbc', 'USBC']];
  const drawChips = () => { chips.innerHTML = ''; opts.forEach(([v, l]) => chips.append(h('button', { class:'chip', 'aria-pressed':String(st.f === v), onclick:() => { st.f = v; st.n = 60; drawChips(); draw(); } }, l))); };
  const match = p => { const q = st.q.trim().toLowerCase();
    const f = st.f === 'all' || (st.f === 'pba' ? /pba/i.test(p.name + ' ' + p.series) : st.f === 'usbc' ? /usbc/i.test(p.name + ' ' + p.series) : p.len === st.f);
    return f && (!q || q.split(/\s+/).every(w => (p.name + ' ' + p.series + ' ' + (p.ft || '')).toLowerCase().includes(w))); };
  function draw() {
    const res = all.filter(match); list.innerHTML = '';
    count.textContent = `${res.length} pattern${res.length === 1 ? '' : 's'}`;
    if (!res.length) { list.append(emptyState('No patterns match', 'Try a shorter search, or clear the filter.', { label:'Clear', run:() => { st.q = ''; search.value = ''; st.f = 'all'; drawChips(); draw(); } })); return; }
    res.slice(0, st.n).forEach(p => list.append(h('a', { class:'prow', href:`#/pattern/${p.slug}` },
      h('span', { class:'prow-main' }, h('span', { class:'prow-name', text:p.name }), h('span', { class:'prow-meta', text:[p.series, p.ratio ? p.ratio + ':1' : '', p.ml ? p.ml + ' ml' : ''].filter(Boolean).join(' \u00b7 ') })),
      h('span', { class:'prow-len', 'aria-label':`${p.ft} feet` }, h('span', { class:'lenbar' }, h('i', { style:{ width:Math.min(100, (p.ft || 0) / 52 * 100) + '%' } })), h('b', { class:'num', text:`${p.ft}\u2032` })))));
    if (res.length > st.n) list.append(h('button', { class:'btn ghost block', id:'patMore', onclick:() => { st.n += 120; draw(); } }, `Show more (${res.length - st.n} left)`));
  }
  let t; search.oninput = () => { clearTimeout(t); t = setTimeout(() => { st.q = search.value; st.n = 60; draw(); }, 120); };
  drawChips();
  const el = h('section', { class:'screen list-screen' },
    h('header', { class:'appbar' }, h('h1', { class:'title', text:'Patterns' })),
    h('div', { class:'list-tools' }, search, chips, count), list,
    h('p', { class:'muted small source', text:`Data source: ${SOURCE}. Patterns are for reference; the lane model uses the nearest preset.` }));
  return { el, title:'Patterns', mounted() { loadIndex().then(x => { all = x; draw(); }).catch(() => { list.innerHTML = ''; list.append(emptyState('Pattern library unavailable', 'Could not load patterns. Check your connection and try again.', { label:'Retry', run:() => location.reload() })); }); } };
}
