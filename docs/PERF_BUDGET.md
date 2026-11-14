# Performance budget (v75, owner t134u)

One place for the numbers a change must not make worse. Machine-readable limits: `tests/perf/budget.json`. Gate: `tests/perf_budget.py`.

## How to run it
| Command | What it checks | Needs |
|---|---|---|
| `python tests/perf_budget.py` | bytes, module count, service-worker list, event-log replay (Node) | Node only, ~1 s, deterministic |
| `python tests/perf_budget.py --browser http://localhost:PORT/ --runs 3` | + cold load per route, route-to-painted, scoring tap, Arsenal sort, Shake it up, Strike finder, long tasks, on the 50-ball / 500-game dataset at 4x CPU | Playwright Chromium, a localhost server (a service worker only registers on localhost/https), ~8 min |
| `python tests/perf_budget.py --lighthouse DIR` | Lighthouse performance per route >= 0.85 | reports from `tests/journeys/lighthouse.py` |
| `python tests/perf_budget.py --measure` | print numbers, never fail (use to set a new limit) | |

Exit code 1 = over budget. **It is a local gate.** Wiring it into CI means editing `.github/workflows/*.yml`; a push that touches workflow files can be rejected for the token's `workflow` scope, so this pass did not touch them. To wire it later: add `python tests/perf_budget.py` (fast form) as a step of `ui.yml`. The fast form is deterministic and safe to run in CI; the `--browser` form is relative to the machine and should stay local.

## The budget (v75)
| Area | Metric | Measured v75 | Limit | Why this limit |
|---|---|---|---|---|
| Bytes | JS under `js/` (excl. lazy OCR vendor) | 1,044,934 B | 1,076,000 | +3% headroom: a new feature fits, a pasted library does not |
| Bytes | CSS (`css/app.css`, theme tokens are the first block of it since v80) | 85,032 B (v80) | 85,500 | v80 folds theme.css into app.css (one request, was 84,749 B in two files; the rest is the no-anim and Team rules). Earlier note: v79 was +2,174 B over v78: the 3 looks x 2 modes cost 4.3 KB of tokens, paid back by moving the old tokens out of app.css, the look picker styles, and 1.4 KB of dead rules deleted (15 rules with no user in `js/` or `index.html`) |
| Modules | `js/*.js` files | 119 | 121 | +2 |
| Service worker | precache entries | 126 (v80: - `css/theme.css`, + `privacy.html`, `terms.html`) | 126 | every one must exist (tested). The launch image `icons/splash-1170x2532.png` is linked, not precached |
| Cold load (empty app, 4x CPU, per route) | JS bytes fetched (measured with the since-reverted preload build; the shipped build fetches ~28 KB less on `#/arsenal`, so these limits have extra room there): `#/bag` 305,929 · `#/arsenal` 293,139 · `#/tonight` 372,717 · `#/results` 301,346 | | +5% each | |
| Cold load | modules fetched | 50 / 49 / 54 / 51 | +2 each | |
| Cold load | first contentful paint | ~100 ms local | 400 ms | local server, relative only |
| Event-log replay | `project()` over 9,890 events (50 balls, 500 games), Node | 5-6 ms (35 ms in Chromium at 4x) | 12 ms | ~2x |
| Event-log replay | small log (659 events) | 0.2 ms | 1.0 ms | |
| Route to painted (50 balls / 500 games, 4x CPU) | Bag 442 · Arsenal 509 · Log book 643 · Strike line 446 · Game 423 ms | | x1.6 | |
| Tap to painted | scoring tap (Strike button), median | 130 ms | 210 ms | x1.6 |
| Tap to settled | Arsenal sort change 5 ms · Shake it up 115 ms (v76: Strike finder 45 ms, retired in v78) | | 25 / 190 ms | |
| Tap to settled (v78) | Lane Optimize tap (the Forgiving sweep) | 43-60 ms | 150 ms | runs only on the tap, cached; the Strike finder row (80 ms) is retired with its screen |
| Long tasks | game page, count | 2 | 4 | |
| Lighthouse | performance per route (mobile defaults) | 0.79-0.96, noisy | **>= 0.85 target** | see below |

Time limits are specific to this box: 4x CPU throttle against python's `http.server` (HTTP/1.0). Compare before/after on the same machine. Numbers on GitHub Pages differ; the ratios are what carry over.

### Lighthouse: target 0.85, CI gate stays 0.80
Lighthouse is noisy here: the same build scored 0.79, 0.86, 0.88, 0.79, 0.79 on five consecutive Tonight runs (LCP either ~3.5 s or ~4.8 s). A hard 0.85 gate would fail good builds at random, so 0.85 is the **target** (reported by `perf_budget.py --lighthouse`) and the CI journeys gate remains 0.80 (`tests/journeys/lighthouse.py`). Tonight is the weak route: its largest paint is a text line that appears only after the Tonight module chain has loaded, behind 78 KB of render-blocking CSS (Lighthouse estimates 590 ms).

## Budget changelog
| Version | Change | Reason |
|---|---|---|
| v75 | Budget created from the v75 measurements above | first budget |
| v75 | Tighten `#/arsenal` cold JS to 5% over its pre-preload measurement (265,464 B, 44 modules) | the preload experiment was reverted |
| v80 (measured) | Lighthouse 12 mobile defaults, CI serving (`python -m http.server`), 5 runs each. **Tonight** before 0.82 / 0.86 / 0.86 / 0.86 / 0.85, after 0.86 / 0.87 / 0.87 / 0.87 / 0.86. **Bowl** before 0.87 / 0.83 / 0.82 / 0.86 / 0.78, after 0.87 / 0.87 / 0.87 / 0.86 / 0.86. FCP 1.7-2.1 s, LCP 3.9-4.1 s, TBT 0, CLS 0 | CI gate is 0.80; the target is 0.85. Floor now 0.86 in 10 of 10 runs, was 0.78 |
| v80 | JS limit 1,076,000 -> 1,082,000 (measured 1,075,629); CSS limit 85,000 -> 85,500 (measured 85,032) | My Team moderation UI (Hide, Block, report-an-item) and the paint-gating helper in `js/perf.js`. Nothing else moved |
| v80 | Perf changes: one stylesheet (theme.css folded into app.css), the favicon is an inline data URI, the first-paint modulepreload list is exactly main.js's static closure and everything else is hinted after the first paint, the screen fade-in is skipped on the first route, the sync outbox and `patterns-index.json` wait for `PERF.painted` (900 ms after the first route mounts) | These requests were being counted before the simulated first paint. Remaining cost is bytes and request count (~448 KB, 54 requests before LCP); more headroom needs bundling, which this app does not do (no build step, CSP `script-src 'self'`) |
| v79 (measured) | `--browser --runs 3`: 29/29 within budget; cold FCP 92-96 ms; Bag 411 ms, Arsenal 412, Log book 652, Strike line 378, Game 402; Optimize tap 47 ms; JS 1,066,756 B, 119 modules | no regression from the look tokens |
| v79 | CSS limit 83,500 -> 85,000; precache 125 | owner t144u: `css/theme.css` (3 looks x light/dark as tokens). Second render-blocking stylesheet on the same origin, parallel with app.css; no JS module added |
| v78 | The Forgiving row became the Lane Optimize tap row (150 ms, same sweep); removed the Strike finder (80 ms) row because `#/strike` is retired |
| v76 | Added the Forgiving line sweep row (150 ms) | owner t140u optional miss model; the Strike finder limit (80 ms) is unchanged because the sweep never runs on load |

Rules for editing: tighten after a release if the number has room (record the new baseline here); loosen only with a line saying what feature bought the bytes or milliseconds.

## Review loop (after each release)
1. Run the fast gate and the `--browser` gate; paste the new measured column.
2. Which limit was tightest (smallest headroom)? Is it still a path a bowler feels? If not, drop it; if a new path matters, add it.
3. Add a line to the changelog above.
