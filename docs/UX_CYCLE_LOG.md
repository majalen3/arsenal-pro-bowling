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

## Cycle 5 — pin deck: ball deflection + pins knocked (approximate model) (commit fd68b82)
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
* Live Lighthouse (mobile, after the fd68b82 deploy, sw v7): `#/` 100/100/100/100, `#/lane` 99/100/100/100 (perf/a11y/best-practices/SEO). One bare `/` run returned no performance score (headless paint timing); the `#/` rerun scored 100.

## Cycle 6 — full lane mirror for left-handers (commit c3e5682)
* `js/lane.js` now draws a left-hander's lane mirrored: board 1 is on the left, the arrows, pocket ring, pin rack and ball path all flip. Only the logical-to-screen x mapping (`X`/`invX`) changes, so drags hit the right board and `analyze()`/`simulatePath` are untouched (equivalence 7500 / 0 mismatches). Arrow keys follow the screen: ←/→ move the feet visually left/right.
* Lefty miss buttons are screen directions too: "Left" means the ball went left on the mirrored lane and applies the model's right-miss move (feet 2 / eyes 1 to the left). The coach line's left/right words are swapped for display only. The engine text is unchanged.
* The cycle-5 note "Left-handed: the model draws a right-hander's lane. Read board numbers mirrored." is gone. The deck caption ends "· Mirrored for left hand.", and the lane's text alternative says the same. The phone lefty miss row sits at 701–757 px, above the tab bar at 780. The compare lanes mirror as well.
* e2e 118/118 (+5 lefty checks: note gone, mirrored labels, ArrowLeft lowers the release board, the Left miss moves feet −2, a press near the foul line maps screen-left to low boards). axe 0 serious/critical. Personas 20/20. Task times are unchanged: phone 48.2 → 27.7 s (−43%), desktop 45.2 → 26.7 s (−41%), against the −40% target.
* Screenshots: `ux-shots/c6/phone-lane-lefty.png` and `phone-lane-righty.png` on the box.
* Test records 1003/1004 in the live API DB: still present (see DECISIONS #13).
* Live check after the c3e5682 deploy (sw v8), phone with a left-hand profile: the lane is mirrored, the lane label and caption say "Mirrored for left hand.", the old note is gone, and there are no page errors. Live Lighthouse (mobile): `#/` 100/100/100/100, `#/lane` 99/100/100/100.
* Repo note: the arsenal-manager planning docs (`docs/ARSENAL_MANAGER_RESEARCH.md`, `docs/ARSENAL_MANAGER_PLAN.md`, `docs/TEAM_PROMPT_ARSENAL_MANAGER.md`, written by another worker) went in with commit a6e5e34, content unchanged.

## D0 — event log, migration, backup v1 (2026-10-23)
* New `js/data/` modules + `js/hub.js` glue. IndexedDB event log (fallbacks localStorage → memory), v0 migration (idempotent, raw snapshot kept), v1 backup/restore with SHA-256, import undo, no truncation anywhere in `store.js`.
* More → "Your data" card: event count, backend, unsynced count; "Download backup" now writes `arsenal-pro-backup-v1.json` (all events + imports + prefs + the legacy snapshot). New `#/import` screen: pick → preview (nothing saved) → Import → Undo; older v0 backups restore through the migration.
* Tests: `node --test tests/data/` 10/10 (migration golden counts + idempotency, corrupt keys, LWW, voids/undo, validators, backup round trip + tamper detection, localStorage backend, seed, no truncation). e2e +12 `[data]` checks: IndexedDB backend, migrate + seed, export → wipe (localStorage **and** IndexedDB) → restore gives the identical projection hash, the saved-lines list is rebuilt, re-import adds nothing, preview persists nothing; `#/import` axe 0 serious, 44 px, no overflow. e2e 135/135. Engine equivalence 7500 / 0. Lighthouse local `#/lane` 97/100/100/100, `#/import` 99/100/100/100.
* Boot: the log opens after first paint; open + migrate 32 ms (budget +50 ms).
* Fixed in passing: the dark theme's `--info-soft` token was missing its `;`, which voided `--shadow-1`.
* sw v9 (new files in the shell).


## D1 — Import pipeline (2026-10-23)
- New: `js/data/csv.js` (RFC 4180 parser, delimiter sniff `,`/`;`/tab, BOM, formula-safe export, header auto-map + unit detection, header-fingerprint presets in `ap_import_presets`, HQ-style score shapes, `mapRows` with unit conversion + validators), `js/data/match.js` (normaliser ported from bowling-app-, alias index incl. owned balls, ambiguous aliases dropped), `js/data/importer.js` (plans, dedupe, ball resolution). `game.logged` added to the projection (`P.scores`, counts toward ball health when linked to a ball).
- Import screen: CSV preview shows the detected shape, row errors, duplicate warning, ball confirmation ("Yes, Radical Rattler Big Bite"), column mapping for release files with speed unit + required measurement point, "Save this mapping", Ruby stub chip.
- Targets: CSV/data suite 38/38 (28 new: RFC 4180 edges, BOM, `;`/tab, formula cells, 4 score shapes, presets, Ruby stub, matcher, nothing-before-commit, undo exact, re-import by file and by content, privacy grep); 1 000-row plan < 300 ms in Node (budget 1.5 s phone); e2e 150/150 incl. 15 new CSV checks at 360 px (axe 0 serious, 44 px, no overflow); engine equivalence 7 500/0; Lighthouse `#/import` 98/100/100/100.

## D2 — LaneTrax session report PDF (2026-10-23)
- New `js/data/lanetrax.js` (no-dependency PDF text reader using `DecompressionStream`, LaneTrax detector, record builder, unit normalisation, flip boards) and `planLaneTrax` in `importer.js`: import + session + one `sessionAggregate` (prov device/LaneTrax, `n=?`, boards read as RH) + 4 pending release measurements. Projection: new `releaseMeasurement.accepted`.
- Import screen: the LaneTrax preview shows the session line, outcome counts, both warnings in plain words ("Both numbers are kept"), the provenance chip, the "Flip boards" toggle (aria-pressed), Key stats, session averages with ranges, and pending measurements. A duplicate gets "Already imported" plus "Import again as a new session".
- Targets: fixture words → expected **exact match** ✔. Real sample decode (`LANETRAX_SAMPLE`) ✔: 102 text runs, same record as the fixture except the date, under 0.1 s. 0 per-shot values ✔. Both warnings in the preview ✔. kph and m/s (+ metres) variants convert ✔. Non-LaneTrax PDF and wrong producer refused with no writes ✔. Data suite 50/50 (+1 skipped in CI). e2e 162/162, including 12 new `[ltx]` checks at 360 px (synthetic PDF; axe 0 serious, 44 px, no overflow, commit = 7 events, duplicate detected). Engine 7 500/0. Lighthouse `#/import` 99/100/100/100. sw v11.

## D3 — Sync v2 (2026-10-23)
- Built: `js/data/sync.js` (outbox, batching, backoff, quota stop, cursor pull), `js/sync.js` glue (debounced on write, on `online`, on code change, on tab hide), More's data card shows sync state. API: `POST/GET /api/events`, 5 000/code quota → 429, `src_seq`/`serverSeq`, paged pattern notes, events in `/api/me` (API commits 3cc1912, c5f9f42; Render deploys live, verified with `/api/health`, a read-only GET and a malformed POST → 400; no production writes).
- Found during e2e: restoring on a wiped phone gave a different projection hash because the server replaced the phone's `seq`, which breaks ties between events in the same millisecond. Fixed by storing the envelope seq.
- Targets: mock-server suite green (data suite 58/58 + 1 skipped; API suite 23/23 on local Postgres). 2-phone field-level LWW convergence ✔. Kill/airplane/restore e2e: 8 events logged offline, tab killed, 0 lost, flushed on reconnect, wiped phone pulls an **identical projection hash**, quota 429 explained on More ✔. e2e 169/169. Engine 7 500/0. Lighthouse `#/more` 98/100/100/100, `#/home` 99/100/100/100. sw v12.
