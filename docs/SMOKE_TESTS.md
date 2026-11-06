# Local smoke tests — S1 / S2 / S3

These are runnable prototypes and local counters, not measured product wins. No participant sessions/interviews have been conducted by this change. Recruit/run them separately; never claim lift from the automated regressions.

## Setup / privacy

1. Serve the repository with `python3 -m http.server 8364` and open it on a phone (360 px captures are the review reference). Install/reload once online for SW **v64**, then it works offline. No build step or third-party script.
2. Me → **Tests and usage** (`#/me/usage`). Each test toggle is OFF by default. Enabling S1/S2/S3 assigns A/B from a stable hash of this install's random seed and the test name. Reloading does not reassign it. To preview both layouts manually, turn that test OFF and set its feature flag; an enabled test overrides a manual flag.
3. At enrollment and the end, save/read the **counts-only summary**. Counters/flags are `localStorage.ap_ux`, not synced events or backup content. Local S2 tap windows (max 60) contain an opaque owned-ball key; the summary omits it. Counts are renders/taps, not unique people. The existing session projection supplies read-only nights/games/first-ball counts. Nothing is sent automatically.
4. Any sharing is the bowler's explicit choice after the session, through the native share sheet. This change adds no active-scoring share offer. Do not transmit backups to collect usage: that is unnecessary personal data.
5. Keep current C8 total-only teammates and C9 private score marks out of new success criteria. No style/score rankings, locked badges, progress bars, streaks or coercive prompts.

## S1 — path comprehension (5–8 bowlers; one short session)

- Enable **S1 · Lane screen variants**. A = baseline layout, B = one-line summary / folded phase numbers. **Both arms keep model/source chips as a safety floor**; this is not an unlabelled-model control. Manual flag: `Lane` → Before / Summary.
- Use a manufacturer-verified, model-supported ball, the same release/pattern/hand in both layouts. Do not use an unverified/unsupported entry; those correctly show no model path.
- For 5–8 bowlers, compare both prototypes with order counterbalanced (test OFF, manual Before/Summary flags); each sees both. Install-parity enrollment is available for a separate between-install comparison, but needs at least five summary-arm exposures before applying the criterion. Show Lane for **5 seconds**, hide it, ask “Where is the breakpoint?” and “Is that measured or a model?” Then ask “What, if anything, would you change?” Record answers without coaching. Counter snapshots include `lane.view.baseline`, `lane.view.summary`, `lane.numbers.open` and Help opens; the interview answers are recorded by the test runner, not uploaded by the app.
- Pre-set pass criterion: **at least 4 of the first 5** in the new-layout group identify the breakpoint and model provenance correctly, with comparison to baseline described directionally. No significance or physical-accuracy claim. Accepted LaneTrax speed/revs remain **measured release inputs**; the path remains **model**.

## S2 — next-ball follow-through (two league nights)

- Carry at least two **model-supported** verified balls so a next ball exists; unverified specs must not be made up for the test. Enable **S2 · Step-ladder preview**. A = short Weaker/Stronger labels; B = next-ball names + “Try feet/eyes first” hint in planning/between games. Manual flag: preview On / Off.
- Open Tonight or Bowl before the first shot / between games; inspect both choices. During a game, there must be **no new name/hint content** on the active-scoring pad. Existing short switching controls remain.
- Read `step.weaker`, `step.stronger`, `help.open.midgame` and the summary's `s2.A/B` tap/followed counts. “Followed” means the same ball is used for **3 first balls after the tap, within 3 hours**. Repeated taps may share follow-through shots; this is a descriptive local window, not causal attribution. Compare start/end snapshots per install/arm; do not compare raw lifetime totals.
- After each night ask: (1) Did the next-ball name help you choose? (2) Did you try feet/eyes before changing balls? (3) Did anything interrupt scoring? Keep replies separate and voluntary.
- Pass if follow-through proportion is directionally higher with preview **and** mid-game Help opens do not rise. Report denominators; no significance claim or score/accuracy claim.

## S3 — earned-only vs one opt-in idea (two weeks)

- Enable **S3 · Badges + Next up line** only with the tester opting in to the comparison. A = earned-only; B = earned-only plus at most **one** optional Next up line. Outside test enrollment the Next up default stays **OFF**. Manual flag: Next up Off / On.
- Armory (`#/bag?view=all`) shows starter cards only after their source action exists: owned ball, ended night with actual logged shots/totals, saved line, surface note. Undo removes cards when their evidence disappears. Old Friends remains. No empty/locked cards, progress bars, urgency or loss state.
- Record baseline/end counts: `badge.view/open`, `nextup.view/open`, nights, first balls and non-breakable season-night count. Use changes over the same two-week window, not lifetime totals. Ask “Did this feel like pressure?” **1–5** (1 none, 5 a lot); no reminder is required to retain anything.
- Pass if logging is **no worse** in the opt-in-idea arm and mean pressure is **≤ 2/5**. Report the small sample and any opt-outs honestly. No badge should rate a bowling style or make a skill judgment.

## Automated checks (local only)

```sh
node --test tests/data/*.test.mjs
node tests/engine_equivalence.mjs   # 7,500 comparisons, 0 mismatches; unchanged engine, reviewed input baseline
python tests/now_smoke.py http://localhost:8364/ --shots /tmp/shots-now
python tests/e2e.py http://localhost:8364/
python tests/journeys/run.py --base http://localhost:8364/ --out /tmp/now-journeys-final --no-video
python tests/clutter/run_audit.py --base http://localhost:8364/ --out /tmp/now-clutter-final
```

Use a Python environment with Playwright + Chromium (and Pillow for visual/clutter). All automated production API traffic is aborted/mocked. The focused regression checks the UI safety floors, local counters, 44 px earned cards/switches, no sideways overflow, no active-scoring extras, explicit unknown specs and offline cache. It is **not** a human smoke-test outcome. Visual baseline updates must be reviewed, not accepted just to turn a test green.
