# Team prompt: whole-journey QA

## Owner's words (verbatim)

> Let’s get a plan to automatically QA and to end and every page.  Every page and look at it as a whole experience rather than individual pages it has to flow

## Brief given to the QA worker

- **Repo:** `majalen3/arsenal-pro-bowling`.
- **Live site:** https://majalen3.github.io/arsenal-pro-bowling/
- **API:** https://arsenal-pro-api.onrender.com. Production writes are never made by the QA suite. It mocks every API call.

**What the QA worker owns:**

- `tests/journeys/`
- `.github/workflows/journeys.yml`
- `docs/QA_PLAN.md`
- this file
- `docs/qa-reports/`

App code (`js/`, `css/`, `sw.js`) belongs to other workers. QA reports app bugs and does not fix them. `tests/e2e.py` and the unit tests stay as they are; CI calls them.

### Tasks

1. **`docs/QA_PLAN.md`**: a plan built on journeys. It lists each journey's steps, the state carried between pages, and the assertions. Journeys covered:
   - onboarding, with the hand set explicitly, then adding balls
   - home prep: bag builder, Status, export
   - arrival: center memory, pattern, and the Tonight stand/aim
   - solo game: 10th frame, ball change, spare hint, undo/fix
   - league/Baker: handicap, blind/absentee, a total-only teammate, crossing midnight
   - between games: Weaker/Stronger, the drag from 25 to 15, Aim Box
   - recap, then the next session's focus
   - insights, Bowler Card and leave patterns (flat 10)
   - learning: Help "?" on every screen, Guide search, Learn more
   - practice spare drill
   - data trust: offline, reload, storage chip, backup, CSV/JSON export, re-import

   Flow-quality checks:
   - taps and time per task, measured against targets
   - consistency across pages
   - no dead ends, and a working Back on every screen
   - scroll position and state restored
   - nothing extra visible during scoring
   - touch targets of at least 44 px
   - no truncation at 360 px
   - no console errors or failed requests
   - axe with 0 serious violations
   - visual regression at 360x780 and 414x896
   - Lighthouse budgets
   - a usability/applicability score per screen

2. **A Playwright-Python suite under `tests/journeys/`.** It covers:
   - personas: righty, lefty, beginner, league of 4, coach
   - seeded data and state-continuity assertions
   - the flow checks
   - screenshots plus video/trace
   - an HTML report at `docs/qa-reports/latest/index.html`
   - production API writes blocked

3. **A GitHub Actions workflow.**
   - On push/PR to `main` it runs the journeys, the unit tests and the engine-equivalence check.
   - Nightly, it runs against LIVE after Pages deploys.
   - It uploads artifacts and fails on regressions.
   - Visual baselines are kept in the repo.

4. **Run against live** and write `docs/qa-reports/FINDINGS_1.md`. It lists every real bug and flow break, with screenshots and the journey step, ranked by impact on the whole night.

### Standing rules

- Never invent credentials, specs, data or citations.
- The 3-D flag stays off.
- `simulatePath` stays unchanged, and engine equivalence stays at 0 mismatches.
- CSP `script-src 'self'`, no build step.
- Deleting live DB data needs the owner's OK.
- Keep the raw LaneTrax PDF out of the repo.
- No messages are sent on the owner's behalf.
- Usability rule: every number must be readable at a glance AND change an action.
