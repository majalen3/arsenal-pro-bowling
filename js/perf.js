// Opt-in, local-only performance marks (v75, owner t134u). OFF by default: when off every export is a no-op, so the cost on the
// normal path is one function call. Turn it on with `?perf=1` in the address (this tab only) or localStorage ap_perf = '1'.
// Uses the browser's own performance.mark/measure (visible in DevTools > Performance > Timings). Nothing is sent anywhere;
// no third-party script, no network. Read the results in the console: __perf.table(), or __perf.entries.
const ON = (() => { try { return /[?&]perf=1\b/.test(location.search + location.hash) || localStorage.getItem('ap_perf') === '1'; } catch (e) { return false; } })();
const NOOP_END = () => 0;
const entries = [];                       // { name, ms, at, info }
const counts = Object.create(null);       // cache effectiveness: counts['cache.x.hit'] / '.miss'
function span(name, info) {
  if (!ON) return NOOP_END;
  const t0 = performance.now(); let done = false;
  return extra => { if (done) return 0; done = true; const ms = performance.now() - t0;
    entries.push({ name, ms: Math.round(ms * 100) / 100, at: Math.round(t0), info: extra === undefined ? info : extra });
    try { performance.measure('ap:' + name, { start: t0, end: t0 + ms }); } catch (e) { /* old engines */ }
    return ms; };
}
function timed(name, fn, info) { if (!ON) return fn(); const end = span(name, info); try { return fn(); } finally { end(); } }
// From the tap until the screen has been redrawn and painted: call at the start of the handler, then call the returned function once
// the DOM is updated (it waits two frames, i.e. until the browser has painted). Returns a no-op when perf is off.
function tapToPaint(name) { if (!ON) return NOOP_END; const end = span(name); return () => requestAnimationFrame(() => requestAnimationFrame(() => end())); }
// A point in time, measured from navigation start (cold-load milestones such as first screen painted).
function mark(name) { if (!ON) return; const t = performance.now(); entries.push({ name, ms: Math.round(t), at: Math.round(t), info: 'since navigation start' }); try { performance.mark('ap:' + name); } catch (e) { /* old engines */ } }
function count(name, n = 1) { if (ON) counts[name] = (counts[name] || 0) + n; }
function summary() {
  const by = {};
  for (const e of entries) { const b = by[e.name] || (by[e.name] = { name: e.name, n: 0, total: 0, max: 0 }); b.n++; b.total += e.ms; b.max = Math.max(b.max, e.ms); }
  return Object.values(by).map(b => ({ name: b.name, n: b.n, avg: Math.round(b.total / b.n * 100) / 100, max: Math.round(b.max * 100) / 100, total: Math.round(b.total * 100) / 100 }));
}
const api = { on: ON, span, timed, tapToPaint, mark, count, entries, counts, summary, table() { console.table(summary()); console.table(counts); return summary(); } };
if (ON) { window.__perf = api; try { new PerformanceObserver(l => { for (const e of l.getEntries()) entries.push({ name: 'longtask', ms: Math.round(e.duration), at: Math.round(e.startTime), info: null }); }).observe({ type: 'longtask', buffered: true }); } catch (e) { /* not supported */ } }
export { ON, span, timed, tapToPaint, mark, count, summary };
export default api;
