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

## Cycle 4 — speed: 1-tap ball pick, back to saved line (commit a6e5e34)
* Quick-ball strip on the lane screen: recent balls, then owned balls, then catalogue order; it skips the current ball and ends with an "All N" button. **1 tap** switches ball.
* "Back to saved" chip appears whenever the line has moved off the last saved/applied line for this ball. One tap restores it, then the chip hides.
* Desktop ≥ 1100 px: the compare table sits beside the two lanes, so it needs no scroll. Desktop ≥ 900 px: the strip and the conditions share one row.
* Lane toasts now appear at the top of the screen. Before, the save toast covered the miss buttons for 5 s, which was a real tap blocker and also forced a hidden 313 px scroll in J3. Trade-off: the toast briefly covers the quick-ball row.
* Phone: the 5-pin line is hidden (it stays in the canvas text alternative) and gaps are tighter, so the miss row stays above the tab bar.
* Portable tests: `tests/ux/*` take `--out` / `--data` / `AP_BASE` and are relative to the repo. `tests/lighthouse.sh` uses `npx`. `tests/ux/out/` is gitignored.
* Task time (KLM, same 5 jobs). **Job definitions changed:** J1 is now a strip tap, and J3 is now save → miss → back, replacing save → change → recall from the sheet.

| Job | Phone KLM s before → after | Desktop KLM s before → after |
|---|---|---|
| 1 pick ball, see line | 3.7 → 2.7 | 3.7 → 2.7 |
| 2 adjust after miss | 5.2 → 2.7 | 5.2 → 2.7 |
| 3 save + get back to the line | 16.7 → 8.0 | 15.7 → 8.0 |
| 4 compare two balls | 13.6 → 6.3 | 11.6 → 5.3 |
| 5 pick next ball (light oil) | 9.0 → 8.0 | 9.0 → 8.0 |
| **Total** | **48.2 → 27.7 (−43 %)** | **45.2 → 26.7 (−41 %)** |

* **−40 % target met on both devices.** Phone J4 still needs one scroll, because the compare table is 706 px tall. The harness was not changed to hide this.
* Engine equivalence 7500 / 0 mismatches. e2e 108/108. axe 0 serious/critical on 10 routes × 2 devices. Personas 20/20.
* Lighthouse (mobile, live): `/` 100/100/100/100, `#/lane` 100/100/100/100. Local Lighthouse runs returned NO_FCP/NO_LCP; `tests/lighthouse.sh` now uses `--headless=new`, which fixes this for live URLs.

## Cycle 5 — pin deck: ball deflection + pins knocked (approximate model)
* New `js/pinsim.js`: a top-down 2-D frictionless impulse model of the ball and 10 pins, using the Kickertz (UC Davis) / Stronge method. Inputs are the USBC pin weight target 3 lb 8 oz, COR 0.670 and dimensions, plus an **assumed** 15 lb ball. No spin, pin tipping or kickbacks, and a struck pin counts as down. Sources, assumptions and the validation table are in `docs/DEFLECTION.md`; DECISIONS #11 is updated.
* Deck: solid approach to first contact, then the model's deflected path. The no-deflection straight line stays faint for comparison. Knocked pins show a × on their spot plus their path; standing pins stay solid white. The animation is 1.1 s and is skipped with reduced motion.
* Readout and text alternative: "Model: the ball deflects N° right through the pins; all 10 pins down / leaves the 7-10". Caption: "Pin action: approximate 2-D model, assumed 15 lb ball, no spin. How it works" links to the doc. On phone, the contact sentence moved to the text alternative only, so the miss row stays above the tab bar (683–739 px vs tab bar at 780).
* Validated qualitatively against the USBC Pin Carry Study (2009), with e2e checks:
  * pocket = strike, the ball takes 1-3-5 and exits just left of the 9 spot;
  * light = the ball exits right of the 9 spot;
  * high = the ball goes left off the deck.
  * Known gap: the ball does not reach the 9 itself in the model.
* `simulatePath`/`analyze()` untouched: engine equivalence 7500 / 0 mismatches.
* e2e 113/113 (+5 deck/model checks). axe 0 serious/critical. Personas 20/20. Task times unchanged from cycle 4 (27.7 s phone, 26.7 s desktop).
* The e2e lane 44 px check now waits 600 ms after route entry. Once, it measured mid-render and saw 43.x px chips.
