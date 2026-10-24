# QA plan: the whole league night, end to end

> Owner, verbatim: "Let's get a plan to automatically QA and to end and every page. Every page and look at it as a whole experience rather than individual pages it has to flow"

**What this plan tests.** Arsenal Pro is tested the way a bowler uses it: one night, from the couch to the car park. The unit of testing is a **journey**, a stretch of the night that crosses several screens. A journey passes only when:

- each screen works;
- **the next screen agrees with the last one**. The hand, ball, line, Status, night, focus and average the bowler set must be the same wherever they appear;
- the bowler is never stranded.

**Where the parts live.**
- Code: `tests/journeys/` (how to run it is in its [README](../tests/journeys/README.md)).
- CI: `.github/workflows/journeys.yml`.
- Reports: `docs/qa-reports/latest/index.html`.
- Findings: `docs/qa-reports/FINDINGS_*.md`.

## 1. Principles

1. **State is carried, then checked.** Each journey keeps a `state` dict, for example `hand=left`, `ball1`, `feet/eyes`, `status=proShop`, `night id`, `focus`, `average`. Later steps assert against it, on a different screen and often after a reload.
2. **The tap counts and times are real.** `j.tap / j.type / j.drag` count every interaction. Time is a keystroke-level model (KLM) estimate, so it is the same on any machine:

   | action | seconds |
   |---|---|
   | mental prep M | 1.35 per tap |
   | point P | 1.1 per tap |
   | key K | 0.2 per tap |
   | scroll | 1.0 |
   | typed character | 0.28 |
   | drag | 1.5 |

   Each step names a `task` and may set `target_taps` and `target_s`. Going over the target fails the step.
3. **Production is never written.** All `arsenal-pro-api.onrender.com` traffic is answered by an in-browser mock, including on the nightly live run.
4. **Known bugs don't hide new ones.** A failing step that matches a finding in `tests/journeys/known_issues.json` is reported as *known*, and the run stays green. Anything else fails CI. When a known issue starts passing, the report says so, and the entry is removed so the step guards from then on.
5. **Never fake data.** Personas seed games through the app's own event store (`personas.py`). Catalogue balls come from the shipped catalogue, and specs are never invented.

## 2. Personas

| id | who | why |
|---|---|---|
| `righty` | the owner: right-handed league bowler with a 3-ball bag (Rattler Big Bite, Deadly Rattler, Super Nova) | the main night |
| `lefty` | fresh install, chooses Left | mirroring and hand carry |
| `beginner` | fresh install, Help on | the learning path |
| `league4` | owner plus Ann, Bo (absent) and Cal (total-only) | league and Baker scoring |
| `coach` | empty phone that imports the bowler's backup | the review path |

**Seeded history.** `seed_history(n)` writes *n* past league nights. Each has three games with a known flat-10 pattern (single 10-pin leaves in game 1), so the Card, Insights and Session page have real data to agree on.

## 3. Journeys

Each line below is a step. Its assertion is the step name. **(c)** marks a critical step, which stops the journey if it fails. *carry* names the state that must match the earlier screens.

### J01 First run and onboarding (`lefty`)
Welcome (c) → choose Left explicitly (c) → speed and revs → pick owned balls and start (≤ 12 taps) → onboarding total ≤ 10 taps → hand carries to More → hand carries to Lane, mirrored → hand survives a reload and Welcome does not show again → Tonight with no bag offers the next step (c) → add a ball from the catalogue (≤ 6 taps) → the search box's example ball exists in the catalogue → Tonight picks a ball for a lefty.

*carry: hand=left.*

### J02 Home prep (`righty`)
Tonight → League, and the advisor bag shows (c) → open the bag builder (≤ 2 taps) → the bag builder explains what to do in one glance → send a ball to the Pro shop (≤ 3 taps) → that Status shows on Arsenal, on Tonight (ball no longer suggested) and on the ball page → export the arsenal to a file (≤ 3 taps).

*carry: status=proShop.*

### J03 Arrival (`righty`)
Type the center and the last-time card appears (c) → use the last setup in 1 tap → Tonight gives stand/aim and a ball → Lane shows the same ball and line → Targeting shows the same line → Back returns to Tonight with the setup kept.

*carry: feet, eyes, ball.*

### J04 Solo game (`righty`)
Open the score pad (c) → strike in 1 tap, ≤ 4 s → 10-pin leave shows a spare hint from the strike stand (≤ 3 taps, ≤ 5.5 s) → change ball mid-game (≤ 3 taps) → **the "now" line follows the ball change** → frames 3–5 → fix frame 3 (≤ 4 taps) → undo (1 tap) → nothing extra visible while scoring → finish the 10th (X, 9/ fill) → the game shows on Sessions with the same score.

*carry: ball in hand, night id, score.*

### J05 League/Baker night (`league4`)
Set up 4 bowlers (c) → Bo absent (1 tap) → Cal total-only (1 tap) → frame 1 rotates You → Ann, skipping Bo → team board shows USBC handicap and the absentee score → crossing midnight continues the same night → teammates never feed my stats → switch to Baker and frames rotate per frame.

*carry: night id.*

### J06 Between games (`righty`)
Tap Stronger after a read (≤ 2 taps) (c) → **Lane opens with the new ball** → drag to stand 25 / aim 15 → the line survives a reload → **Targeting shows the dragged line** → Aim Box is the same on Lane and Targeting → **back on Tonight, the line is the one I set**.

*carry: ball, feet=25, eyes=15.*

### J07 Recap → focus → next session (`righty`)
Bowl a game with three 10-pin leaves (c) → the recap names the flat-10 pattern → save the focus (1 tap) → End night lands on the session page → the session focus matches the recap → next week, Tonight shows the carried focus.

*carry: night id, focus.*

### J08 Insights, Card, leave patterns (`righty`)
Seed 8 nights (c) → Bowler Card has a headline and few figures → the Card names the 10-pin leave as the thing to work on → Insights agrees with the Card average → **Insights cold load (×4) always shows my games** → the session page lists 10-pin leaves by count → Sessions → a night → Back keeps the list position.

*carry: average.*

### J09 Learning (`beginner`)
Turn Help on in More (≤ 2 taps) (c) → every screen has a "?" → no "?" on the score pad while scoring → a "?" gives a plain answer, and Learn more opens the Guide → the Guide is reachable from any screen in ≤ 2 taps → the top-bar "?" toggles Help from Lane → Guide search finds "breakpoint" → Help off means no "?" anywhere.

### J10 Practice night (`righty`)
Choose Practice (c) → the drill lists my most-missed leave (the 10 pin) first → log 3 made and 1 missed (≤ 4 taps) → practice stays out of the average.

### J11 Data trust (`righty`, service worker on)
Score 3 frames, then go offline (c) → keep scoring → reload mid-game offline and get the same frame and scores → back online, everything syncs → More shows a readable storage chip and last backup → download a JSON backup (1 tap) → export games CSV (≤ 2 taps) → wipe the phone, restore, and the projection hash matches → re-import the same backup, duplicates are detected and nothing doubles.

*carry: night id, frames, projection hash.*

### J12 Coach review (`coach`)
Import the bowler's backup (c) → Sessions → a night → Card in ≤ 3 taps → share the Bowler Card (1 tap).

## 4. Flow-quality checks (every screen a journey visits)

`j.audit(screen)` runs once per screen per journey. "Fail" means CI fails unless the item is listed in `known_issues.json` as `probe/<screen>/<kind>`.

| # | check | how | gate |
|---|---|---|---|
| 4.1 | taps and time per task within target | tap counter + KLM, per step | fail |
| 4.2 | consistency across screens | carried state asserted on the next screens and after a reload | fail |
| 4.3 | no dead ends | every screen except Welcome has a tab bar or Back | fail (`dead-end`) |
| 4.4 | Back goes where the bowler came from, with state kept | J03, J06, J08 Back steps | fail |
| 4.5 | scroll position and state restore | J08 list round trip (±80 px), J11 reload mid-game | fail |
| 4.6 | nothing extra while scoring | J04: no prep cards visible during the game (advisor, reads, last time, drill, protect, install, measure nudge); the usability score also caps the scoring view at 24 numbers above the fold | fail |
| 4.7 | touch targets ≥ 44 px | every button, link, input, slider, radio and `summary`, < 43.5 px either way | fail (`targets`) |
| 4.8 | no truncation at 360 px | ellipsis, clipped or off-screen text (horizontal carousels allowed) | fail (`truncation`) |
| 4.9 | no console errors or failed requests | per journey (the deliberate J11 offline errors are ignored) | fail (`console`, `requests`) |
| 4.10 | accessibility | axe-core: 0 serious or critical violations | fail (`axe`) |
| 4.11 | visual regression | 13 screens at 360x780 and 414x896, fixed clock, seeded data, > 2 % of pixels changed | fail |
| 4.12 | usability score per screen (0–10) | **usability** (heading; action above the fold; text ≥ 12 px; targets; no truncation) + **applicability** (a next step in words; ≤ 12 numbers above the fold; numbers carry a source; not a dead end; scoring view stays lean) | reported, trend only |
| 4.13 | Lighthouse budgets | performance ≥ 0.80, accessibility ≥ 0.95, best practices ≥ 0.90 on welcome, tonight, lane, arsenal, sessions, more (mobile) | fail (push/PR only) |

**Why 4.12 is not a gate.** It is a proxy for the house rule that every number must be readable at a glance and must change an action. Screens that score low are reviewed by a person and become findings. The score itself does not block a merge.

## 5. Automation

**`journeys.yml` triggers.**

| trigger | target | runs |
|---|---|---|
| push / PR to `main` | this commit, served on `localhost:8350` | engine equivalence (must stay 0 mismatches), `node --test tests/data/`, all journeys + visual, Lighthouse |
| nightly 09:17 UTC | live GitHub Pages | engine + unit tests + journeys + visual |
| after a GitHub Pages deploy succeeds (`deployment_status`) | live GitHub Pages | engine + unit tests + journeys + visual |
| manual (`workflow_dispatch`) | local or live | same; can also rewrite visual baselines |

**Artifacts** (14 days): `qa-report/` and `qa-media/`.
- `qa-report/` holds `index.html`, `results.json`, the step screenshots, and visual current/diff images.
- `qa-media/` holds a video and a Playwright trace per journey (`npx playwright show-trace`).

The job summary shows the counts, the new failures and the Lighthouse table.

**Baselines.** `tests/journeys/baselines/<viewport>/<screen>.png` are kept in the repo. To refresh them after an intended UI change:
1. Run the workflow manually with `update_baselines=true`, or run `run.py --only VISUAL --update-baselines` locally.
2. Commit the PNGs.
3. Review the diff images in the PR.

**Existing CI.** `ui.yml` (`tests/e2e.py`) and the unit tests are unchanged and still run.

## 6. Triage loop

1. A red run gives a new failure with a screenshot, video and trace at the failing step.
2. If it is a real bug:
   - file it in the next `FINDINGS_n.md`, ranked by its impact on the whole night: does it break a carried promise, cost taps during scoring, or strand the bowler?
   - add the key to `known_issues.json` with the finding id;
   - fix it, which removes the entry.
3. If it is a test bug, fix the journey. Selectors live in `journeys.py`. Prefer ids and roles.
