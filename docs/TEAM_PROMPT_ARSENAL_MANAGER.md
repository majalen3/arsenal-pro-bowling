# Arsenal Pro — Arsenal Manager Team Prompt

You are a six-role team working on the **Arsenal Manager** feature of **Urbanek Honey Badgers Arsenal Pro**. The roles are Tech Lead, Data Steward, Frontend, Backend, QA and UX/Mobile.

- The plan is `docs/ARSENAL_MANAGER_PLAN.md`.
- The evidence is `docs/ARSENAL_MANAGER_RESEARCH.md`.
- Ship one phase at a time, in small commits.
- A phase merges only when its QA gate passes.
- Push or deploy only with the owner's approval.

## 1. Product
The Arsenal Manager tracks each physical ball the bowler owns:
- status;
- games;
- surface and service history;
- drillings and layout;
- bags.

It reminds the bowler about maintenance using **cited manufacturer intervals counted in games**. It also shows coverage and the user's four named gaps:
- strong sym pearl;
- heavy-oil control benchmark;
- modern urethane;
- high-RG angular.

**Bowler profile:**
- right-handed tweener, 15 mph, 220 rpm;
- PAP 5⅛" (user-reported);
- house benchmark: Rattler Big Bite, with Hy-Road as the secondary.

**Voice:** Breakpoint. Example: "Nova: 61 games, past Storm's 60. Resurface + detox before Saturday."

**Brand:** `#0F4D34` / `#DAAF37` / black.

## 2. Repos & environment
| Piece | Location |
|---|---|
| Frontend (ES modules in `js/`, GitHub Pages) | github.com/majalen3/arsenal-pro-bowling · https://majalen3.github.io/arsenal-pro-bowling/ |
| Backend (Express + Postgres, Render) | github.com/majalen3/arsenal-pro-api |
| Specs reference (not in repo) | `/workspace/physics/ball_specs.csv` (bowlingballvideos.com catalogue); USBC Approved Ball List PDF (weekly) |
| Tests | existing e2e suite (94 checks) + Playwright venv `/workspace/pwenv` |

**Coordination:** another worker may be editing the UI.
- Before every phase: run `git pull`, then `git status`.
- Never commit someone else's uncommitted changes.
- Rebase rather than force-push.

## 3. Architecture
- **Local-first:** new keys `ap_owned`, `ap_events`, `ap_rules`, `ap_bags`, with schema `ap_am_v`.
  - Use the `store.js` `rawGet`/`rawSet` (with memory fallback) and the offline queue.
  - The UI never blocks on the API.
- **Event log** (`ap_events`):
  - append-only;
  - counters such as games since each service type are **derived**, never stored as typed values;
  - editing an event recomputes the counters.
- **Rules engine:** a pure function `due(ownedBall, events, rules, today, nextEventDate)`, returning `[{type, gamesSince, target, source, severity}]`. Unit-testable with no DOM.
- **API** (scoped by `X-Device-Id`, no auth):
  - `/api/ball-events`, `/api/owned`, `/api/bags`;
  - idempotent by client id;
  - the existing `/api/surface-log` keeps working and migrates into events.
- **Export/import:** CSV and JSON, always free.

## 4. Non-negotiable invariants
1. **No invented data.**
   - Every numeric spec needs a `src` (F / S / user) or it stays null and shows **spec TBD**.
   - Every reminder default shows its source.
   - No "cover life %" and no hook-loss curve.
2. **Counting is in games.** Day intervals exist only if the user sets them.
3. **Reminders respect USBC Rule 18.**
   - They say "before competition".
   - They never suggest cleaning or abrading during play.
   - They never suggest prepping only the track (Rule 18/7).
4. **History is never lost.** Retiring a ball and plug/redrill keep all earlier events and drillings.
5. **No balance-hole field.** Weight and static fields carry USBC limits as help text only.
6. All existing invariants in `docs/TEAM_PROMPT.md` §4 still hold: lane orientation, mobile layout, ≥ 44 px targets, saved data survives a refresh, spec honesty.
7. **Statuses are a fixed set:** `inBag`, `benched`, `proShop`, `retired`.

## 5. Roles and deliverables
**Tech Lead**
- Phase gating and ADRs: event-log vs counters, migration, rules defaults.
- Writes the release notes.
- Holds the "unknown → ask the user" list.

**Data Steward**
- Runs P0: confirm ownership; resolve the Rack Attack identity (USBC lists only Radical Rack Attack Pearl/Solid, reactive); resolve the year conflicts (Rattler, Hy-Road Pearl, Innovator, Conspiracy Pearl); resolve the Scout and Ice Storm colorways.
- Adds `src` and `usbcApproved` fields.
- Never fills a value without a fetched source or a user statement.

**Frontend**
- Health card, timeline, quick log ("Log league night"), service sheet, coverage grid with gap slots, bag builder warnings, onboarding steps.
- Text output is escaped (use `textContent`).
- CSP `script-src 'self'`: no inline scripts.

**Backend**
- New tables and endpoints, with per-field validation, device scoping, 413/400/429 behaviour and idempotent upserts.
- Migration endpoint support.
- Tests run against real Postgres.

**QA**
- Rules engine unit tests: whichever-first, recalc from last service of that type, lead time, snooze, once-per-session, urethane detox off, symptom trigger, event-date pull-forward.
- Playwright task timings.
- Migration tests.
- Export → import round-trip.
- Spec-honesty test.
- Copy lint for the Rule 18 wording.
- Viewport matrix and axe.

**UX/Mobile**
- One-handed quick log.
- Copy audit against the Breakpoint voice.
- Empty, unknown and offline states. "Don't know" must be a first-class answer.
- Reminders must not nag (at most once per session, then a badge).

## 6. Acceptance criteria (targets)
- **Logging:** "Log league night" takes ≤ 2 taps and ≤ 10 s from the Lane or Arsenal screen.
- **Persistence:**
  - events survive a refresh, offline use and an API outage, and sync later;
  - migration of `profile.owned` and `ap_surface` loses 0 records;
  - export → import keeps 100% of events.
- **Reminders:** all rules unit tests pass. Every reminder shows a source label (F / S / A). There are 0 competition-time cleaning suggestions.
- **Coverage:** the 11 seed balls and the 4 gaps render at 360 px with no overflow. Gap candidates come only from sourced catalog rows.
- **Bags:** each warning (duplicate coverage cell, due before the event date, not on the approved list, status `proShop`/`retired`) has a test. A swap takes ≤ 2 taps.
- **Honesty:** an automated test fails if any owned-ball numeric spec lacks a `src`.
- **Quality:** existing 94 e2e checks green; axe 0 serious or critical; XSS payloads in nicknames and notes render inertly; tap targets ≥ 44 px.

## 7. Test plan
1. **Static:** no `eval` and no inline script. Grep for unescaped `innerHTML` with user text. Run the spec `src` linter.
2. **Unit:** rules engine (`due()`), counter derivation, migration and CSV parsing.
3. **UI (Playwright):**
   - quick log timing;
   - Health card numbers match the log;
   - timeline order;
   - service sheet resets counters;
   - bag warnings;
   - coverage grid;
   - onboarding "Don't know" path.
4. **API:** contract, negative, per-device isolation and idempotency tests.
5. **Resilience:** offline, slow 3G, API 503 and cold start.
6. **Accessibility:** axe on Arsenal, Ball, Bag and Coverage screens; keyboard walk-through.

**QA gate:** a phase ships only when every item in §6 that applies to it passes. If any fails, record it in the phase report and do not merge.

## 8. Phases
- **P0** data audit;
- **P1** owned balls, event log and quick log;
- **P2** reminders;
- **P3** coverage, gaps and bags;
- **P4** drilling and PAP history.

Targets for each phase are in the plan, §5.

## 9. Reporting
Each phase report covers:
- what shipped (commits);
- target results with measured numbers;
- QA gate pass/fail per item;
- new assumptions;
- questions for the owner.
