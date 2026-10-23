# Arsenal Pro 2.0 — UX cycle log

Each cycle: change → test → independent review → commit+push. Scores are 1–10 from the design-review rubric
(visual appeal, ease, consistency, accessibility, performance).

## Cycle 0 — research + baseline (2026-10-23)
* Research: `docs/UX_RESEARCH.md` (Strava, 18Birdies, Arccos, TrackMan, WHOOP, LaneTalk, SPECTO, Kegel, Robinhood, Linear, Things 3, Duolingo, Apple HIG, Material 3, NN/g, BBC GEL).
* Audit: `docs/UX_AUDIT.md`, screenshots `/workspace/ux-shots/before/`.
* Baseline task total (KLM est.): phone 48.2 s, desktop 45.2 s. Target ≥ 40 % faster, every job ≤ 3 taps.
* Baseline review score (heuristic, reviewer pass on before shots): visual 4, ease 4, consistency 5, a11y 5, perf 8.

## Cycle 1 — 2.0 shell (commits 2839b3c, 75d05e3)
* ES-module app shell: tabs Lane / Arsenal / Patterns / Sessions / More, onboarding, ball detail, compare, Kegel pattern library (via CarryDown), light + dark themes, PWA.
* Fixes after first screenshots: compare crash, grey ball orbs, focus ring on route titles, cramped lane board labels, pattern sort, oil-graph caption.
* Rubric review (executor, against the research heuristics; not an independent human panel): visual 8 · ease 8 · consistency 8.5 · a11y 8 (axe still had issues) · perf 10.

## Cycle 2 — pin deck redesign + test suite (commit b7fc977)
* User feedback: “pin display too small, doesn’t help visualise the pocket”. New true-scale deck close-up (12 in pin spacing, numbered pins, 1-3 / 1-2 pocket band, 4–6° entry wedge into board 17.5, ball path to first contact, contact dots on 1 / pocket pin / 5 pin, readout coloured strike / light / high, full text alternative). Main lane view keeps the true 60 ft geometry. Verdict and coach line merged into the deck card to keep the miss buttons above the fold on a 390 px phone.
* `tests/e2e.py` (94 checks) + CI; found and fixed: compare tray off-screen on phones (page was 568 px wide because screen-reader-only text escaped a scroller), label/visible-name mismatches (axe serious), 36 px chips on desktop.
* Rubric review: visual 9 · ease 8.5 · consistency 9 · a11y 9.5 · perf 10.

## Cycle 3 — measurements + polish
* Compare header names wrap to two lines instead of “Origin…”.
* Lighthouse (mobile, live GitHub Pages): `/` 100/100/100/100; `#/lane` 100/100/100/100 (LCP 1.8 s, TTI 1.8 s, TBT 30 ms, CLS 0); `#/arsenal` 99/100/100/100. Shell ≈ 55 KB gzipped (budget 200 KB).
* axe: 0 serious/critical on 10 routes × phone + desktop. No horizontal overflow on any route.
* 20 scripted personas (`tests/ux/personas.py`): 20/20 reach their goal in ≤ 3 taps with no errors or dead ends.
* Task time (KLM model, `tests/ux/audit_after.py`, same 5 jobs as baseline):

| Job | Before taps → after | Phone KLM s before → after | Desktop KLM s before → after |
|---|---|---|---|
| 1 pick ball, see line | 1 → 2 | 3.7 → 5.3 | 3.7 → 5.3 |
| 2 adjust after miss | 1 (+drag) → 1 | 5.2 → 2.7 | 5.2 → 2.7 |
| 3 save + recall line (incl. a line change) | 4 + 13 typed chars → 4 | 16.7 → 11.6 | 15.7 → 11.6 |
| 4 compare two balls | 4 → 2 | 13.6 → 6.3 | 11.6 → 6.3 |
| 5 pick next ball (light oil) | 3 → 3 | 9.0 → 8.0 | 9.0 → 8.0 |
| **Total** | | **48.2 → 33.9 (−30 %)** | **45.2 → 33.9 (−25 %)** |

* Target of −40 % **not yet met**. Job 1 got slower (the ball list now opens in a sheet rather than sitting on the lane screen). Every job’s core is ≤ 3 taps; job 3 is 4 only because it includes the line change between save and recall.
* Rubric review: visual 9 · ease 8.5 · consistency 9 · a11y 9.5 · perf 10. Ease is under 9, so the loop is still open (3 of 6 cycles used).
