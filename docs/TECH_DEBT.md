# Tech-debt register (checklist v1, owner t134u, 2026-11-12)

## Scoring model (v1)
`score = 2 x user impact - effort - risk`, each 1-5 (5 = felt by every bowler / weeks of work / could lose data or change scoring).
**Threshold: score >= 3 is cleaned now; below stays visible.** Impact is judged on measured numbers from `docs/PERF_LEARNINGS.md`, not taste.

## Done (with evidence)
| # | Module | Type | Impact | Effort | Risk | Score | Evidence |
|---|---|---|---|---|---|---|---|
| 1 | data/scoring.js `isSplit` | perf: uncached pure function on every redraw | 5 | 1 | 1 | **8** | Log book render 1,648 -> 454 ms; scoring tap 584 -> 130 ms; Strike line 977 -> 264 ms; game page 485 -> 245 ms (4x CPU, 500 games). Test: `tests/data/perfcache.test.mjs` (all 1,023 leaves equal the uncached rule). |
| 2 | hub.js `proj` / cc/cats.js | perf: re-registering owned balls on 150k lookups | 4 | 1 | 1 | **6** | registerOwned only for a new projection; `legacyLineKey` no longer scans owned balls per ball. Test: `perfcache.test.mjs` (legacyLineKey follows registration; projection identity). |
| 3 | index.html / main.js preloads | tried and **reverted** | 3 | 1 | 1 | **4** | Measured worse (Log book Lighthouse 0.96 -> 0.88); see PERF_LEARNINGS #5. Not shipped. Do not retry without a Lighthouse median of 3+ runs per route. |
| 4 | sw.js | correctness: hand-kept precache list | 4 | 1 | 1 | **6** | `tests/data/sw_precache.test.mjs`: every entry exists, no duplicates, every module and every static import is precached. |
| 5 | (no module) | observability gap | 4 | 2 | 1 | **5** | `js/perf.js`, `tests/perf/*`, `docs/PERF_BUDGET.md`, `tests/perf_budget.py`. |
| 6 | 5 unused functions | dead code | 1 | 1 | 1 | **0 (near-zero cost, done)** | `docs/REMOVED_LOG.md`. |

## Open (kept visible, below threshold or out of scope for a no-behaviour-change pass)
| # | Module | Type | User impact | Effort | Risk | Score | Note |
|---|---|---|---|---|---|---|---|
| 7 | js/screens/tonight.js (74 KB) | monolith: one `draw()` rebuilds the whole page after every tap | 3 | 5 | 4 | -3 | Scoring tap is 130 ms at 4x CPU (~30 ms real) after #1; the redraw is 57 ms of it. Split only if tap latency regresses. |
| 8 | data/project.js | full replay per write | 2 | 4 | 4 | -4 | 35 ms at 4x CPU per tap with 9.9k events (5 ms real). Incremental projection risks drift; the hash-equality test makes it feasible later. |
| 9 | css/app.css (78.6 KB, one file) | 71 KiB unused per route; render-blocking, ~590 ms of Lighthouse FCP/LCP on Tonight | 4 | 4 | 3 | 1 | Splitting needs a critical-CSS strategy compatible with CSP and no build step. Biggest remaining cold-load lever. |
| 10 | screens/sessions.js (Log book) | renders all games, no windowing | 3 | 3 | 2 | 1 | 454 ms at 4x CPU for 500 games; fine below ~200. Revisit past 1,000 games. |
| 12 | cc/advisor.js `evidenceOf` | 19 ms (4x) self time on Bag open | 2 | 3 | 2 | -1 | Bag draw 98 ms at 4x; no action. |
| 13 | exports kept on purpose | 11 unreferenced constants/paths | 1 | 2 | 3 | -3 | `docs/REMOVED_LOG.md`. |
| 14 | tests | `tests/e2e.py` (2,064 lines) takes ~11 min | 2 | 4 | 2 | -2 | Split by area when CI time hurts. |
| 15 | Lighthouse Tonight | 0.79-0.88 run to run | 3 | 3 | 2 | 1 | Depends on #9. CI gate stays 0.80. |

## Review of the scoring model (do after 5-10 cleaned items)
After the first items: estimates of *effort* were accurate (all 1-2). *Impact* was under-estimated for pure-function memoisation (we guessed replay) and over-estimated for the catalog index (deleted). Adjustment for v2: weight impact by a **measured share of a hot path** rather than a guess; require a profile before scoring any perf item.
