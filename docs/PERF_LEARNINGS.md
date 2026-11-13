# What the data taught us (v75 performance pass, owner t134u)

Tools: `?perf=1` marks (`js/perf.js`), `tests/perf/profile.py` (hot paths), `tests/perf/cpuprof.py` (where one route spends time), `tests/perf/replay_bench.mjs`, `tests/perf/static_audit.mjs`. Dataset: 50 owned balls, 500 games, 100 nights, 9,890 events (`tests/perf/synth.mjs`). All timings Chromium at 4x CPU throttle unless stated.

## Surprises (what we guessed vs what the trace said)
1. **Event-log replay was not the problem.** Guess: replaying the whole log on every write is the cost. Data: `project()` over 9,890 events takes 5-6 ms in Node, 35 ms at 4x CPU. The scoring tap spent 584 ms; replay was ~40 of it.
2. **The real cost was a pure function with no cache.** `isSplit()` (is this leave a split?) recomputed pin geometry for every first ball of every game on every redraw: 749 ms of one 2.3 s Log book render. It is a function of 10 bits. Memoised: Log book 1,648 -> 454 ms, scoring tap 584 -> 130 ms, Strike line screen 977 -> 264 ms, game page 485 -> 245 ms.
3. **150,000 cached-projection lookups per page**, each running `registerOwned()` (rebuild the owned map). The projection is already cached, so the lookups are cheap, but the re-registration on every one was not. Now only when the projection object is new.
4. **The catalog index we planned was pointless.** The catalog has 22 rows; `balls.find` is free. We wrote the index, measured, and deleted it before committing (prefer deleting code over adding abstraction).
5. **Preloading more made things worse, so it was reverted.** Hinting the whole static import closure of each route (`modulepreload`) looked like a free flatter waterfall. Lighthouse medians of 3 runs, v74 vs the preload build: Log book route 0.96 -> 0.88 (FCP 1.9 -> 2.4 s, LCP 2.6 -> 3.5 s), Bowl 0.88 -> 0.84, Me equal, Tonight inconclusive (bimodal). The extra hints compete with the modules the first screen needs for the same slow-4G bandwidth. Cold `#/arsenal` also fetched 5 more modules (+28 KB). Commit d8ac2df was reverted (54316f8); nothing from it ships. The earlier "LCP 4.8 -> 4.0 s on Tonight" was within the noise of #6 and should not have been read as a win.
6. **Lighthouse varies by +-0.05 between identical runs**, more than any change here. Use medians of 3-5 runs, and use the in-page marks for decisions.
7. **My first dead-code scan was wrong.** It ignored `Namespace.fn()` calls and listed 87 "unused" exports; 71 of them were in use (see REMOVED_LOG.md). Fixed the scan before deleting anything.
8. **A profile harness bug looked like a result.** The first route timings were identical for every route because only a `#hash` changed between page loads (no reload). Always sanity-check that two different things produced two different numbers.

## Instrumentation overhead
Off (default): a span start+end costs ~4.5 ns in Node (2 million calls measured); the longest instrumented path (a scoring tap) makes about 6 such calls. On: `performance.mark/measure` plus an array push, only with `?perf=1` or `localStorage.ap_perf = '1'`. No network, no third-party code, CSP unchanged. (The before and after columns in the report were both taken with marks ON, so they compare like with like.)

## Checklist for the next cleanup (v1)
- Take the baseline before touching code; run the harness against a dataset the size a long-time user has.
- Profile the slowest route (`cpuprof.py`); fix the top self-time function first.
- Prefer a memo on a pure function over a cache on shared state.
- Every cache gets a correctness test (exact vs uncached) and a statement of how it is invalidated.
- Before deleting an export: grep for `Namespace.name`, tests and tools; check Chromium coverage; never touch migration/backup/recovery.
- Run the Lighthouse comparison 3-5 times per variant.
