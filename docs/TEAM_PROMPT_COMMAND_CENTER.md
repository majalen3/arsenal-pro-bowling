# Arsenal Pro: Team Prompt, Command Center (Decision Tool + Bag Builder)

You are a seven-person software team working on **Urbanek Honey Badgers Arsenal Pro**:
- Tech Lead
- Frontend
- Backend
- Data/Import Engineer
- QA
- UX/Coach-Voice
- Research Steward

Arsenal Pro is a phone-first bowling tool used at the lane.

Your job is to build the **Command Center**: one home screen that answers, in coach voice:
- "what do I throw tonight";
- "where do I stand";
- "what do I move to next".

It has five parts:
- **Decision tool:** ranked ball pick + starting line + Plan A/B/C;
- **Bag builder:** league 3 / tournament 6 with coverage and gap checks;
- **Arsenal status;**
- **Quick log;**
- **Spare system.**

Every recommendation must explain itself.

Ship small commits to `main`. Never force-push. Never stop at a partial update.

**Read first:**
- `docs/COMMAND_CENTER_PLAN.md` (the spec; section numbers below refer to it)
- `docs/ROADMAP_NEXT.md`
- `docs/ARSENAL_MANAGER_PLAN.md`
- `docs/IMPORTS_RESEARCH.md`
- `docs/FEATURE_DEMAND_RESEARCH.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/TEAM_PROMPT.md` and `docs/TEAM_PROMPT_NEXT.md` (their invariants still apply)

## 1. Product
- **Owner context (2026-10-23):**
  - uses **LaneTrax** and **LaneTalk**;
  - owns a **Ruby** sensor;
  - the app is **free, with no monetization**.
- **Today:**
  - 2-D lane model (`js/engine.js`, `lane.js`, `deck.js`) with Rule of 31, strike check and `sensitivity()`;
  - 22-ball catalog (`js/data.js`; 7 spec TBD) and hard-coded `BAGS`;
  - 709-pattern library (`js/patdata.js`);
  - shots log;
  - profile (hand, style, speed, rev, PAP, tilt).
- **Target:** the "Tonight" screen (plan §4 wireframe) and the bag builder (plan §3), phased CC0–CC4 alongside N0–N4.

## 2. Repos & environment
Same as `TEAM_PROMPT_NEXT.md` §2:
- frontend: github.com/majalen3/arsenal-pro-bowling (GitHub Pages, no build step);
- backend: arsenal-pro-api on Render;
- tests: `tests/e2e.py`, `engine_equivalence.mjs`, `axe.min.js`, `lighthouse.sh`.

Another agent may be editing UI files: `git add` only your paths, and rebase before you push.

## 3. Architecture
- **New pure module `js/decide.js`** (no DOM):
  - `demand(pattern, surface, stage)` → `{level, why[]}`;
  - `ballLevel(ball, owned)` → `{level, why[]}`;
  - `rank(bag, ctx)` → `[{ball, score, why[]}]`;
  - `plan(ctx)` → `{A, triggers, B, C}`.

  Every `why` entry is `{text, label:'F'|'S'|'A'|'user'|'model', src}`. All thresholds live in one exported `RULES` object; each rule carries `label` and `src`, and the user can edit them in Settings.
- **New pure module `js/bag.js`:** `grid(bag)`, `checks(bag, ctx)` (plan §3 checks 1–10), `fill(owned, template, locks, excludes)`.
- **Model use:** only through the existing `analyze()` / `sensitivity()` / `ruleOf31()`, run against the **real pattern ft** for Rule of 31 and the nearest preset for the 2-D path (disclosed).
  - Do not change physics constants (`TEAM_PROMPT_NEXT.md` §9).
  - The 3-D engine stays behind flag `cc3d`, **off**, until the physics QA ≥ 9/10 with the sweep passing.
- **Release source precedence:**
  1. **Ruby import** (once the preset exists and the user confirms);
  2. manual release card;
  3. profile.

  The UI always shows which source is active.
- **Stores:** AM's `ap_owned`, `ap_events`, `ap_bags`; N1's `ap_games`; N3's `ap_measure`; new `ap_cc` (session context: center, pattern slug, surface, stage, format). Each has a `schemaVersion` and pure migrations.
- **Local-first:** works fully offline; no auth for core data. API sync follows the existing `X-Device-Id` pattern.

## 4. Non-negotiable invariants
1. Everything in `TEAM_PROMPT.md` §4 and `TEAM_PROMPT_NEXT.md` §4.
2. **Explainable:**
   - every ranked ball shows ≥ 2 labelled why-lines;
   - "Why" reveals the arithmetic;
   - a test recomputes the order from the why-lines alone.
3. **No invented data:**
   - spec-TBD balls are ranked on tags only, labelled, with no model line;
   - app `oil[]` tags are labelled "app tag";
   - shape is labelled "estimate";
   - a tonight's pattern that isn't known is shown as "unknown", never guessed.
4. **Benchmark first** when the pattern or center is unknown or it is a new block (Motiv F, BTM F).
5. **Conflicts are shown, not hidden**, e.g. Rule of 31 vs the bowl.com length band.
6. **Imports:**
   - **Ruby CSV is the first preset.** It is built only from the owner's real sample (fixture in `tests/fixtures/`, personal data removed).
   - **LaneTrax**: PDF parse (sample needed) plus manual entry second.
   - **LaneTalk**: GDPR export file or manual entry only.
   - No scraping, no reverse-engineering, no stored third-party credentials.
7. **Sensor data defaults to practice** and carries the USBC note. Tournament mode hides sensor-based suggestions.
8. **Warnings, never blocks**, in the bag builder (except proShop/retired leaving the pack list, with a reason).
9. **No monetization, ads, affiliate or purchase links.**
10. Coach copy: ≤ 2 sentences, starting with a number or the ball/pin name. Honey Badgers tokens only. 44 px targets.

## 5. Roles and deliverables
- **Tech Lead:**
  - ADRs: `decide.js` rules format; release-source precedence; `cc3d` flag gate; `ap_cc` schema;
  - phase plan CC0–CC4;
  - review gating.
- **Frontend:**
  - Tonight screen: session chips, Throw card with read buttons, Line card, Plan A/B/C, Spares panel, Bag strip, sticky quick log;
  - bag builder grid with lock/exclude, Fill bag diff and pack list;
  - LH mirror everywhere.
- **Backend:** sync endpoints for `ap_cc` and bags (device-scoped, size cap, rate limit). No contract changes to existing endpoints.
- **Data/Import Engineer:**
  - `decide.js` and `bag.js` with unit tests;
  - pattern demand from `patterns-index.json` (mL tertiles computed from the library, not hard-coded);
  - **Ruby preset** once the owner's CSV arrives;
  - **LaneTrax PDF** extraction once a sample arrives (else the manual board-entry form);
  - **LaneTalk** GDPR file mapping if one arrives.
- **QA:**
  - ≥ 20 golden ranking scenarios;
  - trigger sequences;
  - overlap/hole fixtures (≥ 12);
  - 3-6-9 × RH/LH;
  - tap counts (read → pick ≤ 1, swap ≤ 2, strike 1, spare ≤ 3);
  - viewport matrix 360/390/768/1280;
  - axe;
  - offline;
  - XSS in pattern names, ball nicknames, imported cells;
  - flag-off test for `cc3d`.
- **UX/Coach-Voice:**
  - copy for every card state (empty, unknown pattern, spec TBD, offline, conflict);
  - one-handed reach for quick log;
  - contrast AA;
  - wireframe → component mapping from `DESIGN_SYSTEM.md`.
- **Research Steward:**
  - owns `RULES` labels and sources;
  - signs off the golden scenarios against the cited sources;
  - collects the owner's Ruby CSV, LaneTrax PDF and house-shot name/surface;
  - blocks any uncited rule.

## 6. Acceptance criteria (targets in plan §5)
- **CC0:**
  - Tonight renders < 1 s at CPU 4× throttle, offline;
  - 20/20 golden scenarios pass;
  - 100% why-coverage;
  - 0 model lines for spec-TBD balls.
- **CC1:**
  - read → new pick ≤ 1 tap;
  - triggers unit-tested;
  - 3-6-9 matches the USBC PDF (10 pins × RH/LH);
  - 0 throws lost on tab kill.
- **CC2:**
  - swap ≤ 2 taps;
  - 12/12 overlap/hole fixtures;
  - status/health counts equal the event log;
  - Fill bag uses owned balls only.
- **CC3:**
  - Ruby preset only with a fixture;
  - each imported value shows source, n, median and IQR;
  - no suggestion at n < 10;
  - Ruby values applied only after user confirm;
  - predicted-vs-measured error (LaneTrax boards) published in `docs/`.
- **CC4:**
  - tournament mode hides sensor suggestions;
  - `cc3d` unreachable while off;
  - when on, per-pattern error is shown beside each prediction.

## 7. Test plan
1. **Unit:** `decide.js`, `bag.js`, rules editing, migrations, importer mappings.
2. **Golden:** scenario table (pattern slug × surface × stage × bag × style → expected top 3 + why labels), committed as JSON.
3. **UI (Playwright):** tap counts, LH mirror, reload/kill persistence, offline, conflict display.
4. **Security:** hostile pattern/ball names, CSV formula cells, oversize files.
5. **Review and simulation:** as in `TEAM_PROMPT.md` §9–10. Personas include:
   - the owner (RH, Ruby + LaneTrax + LaneTalk, house league);
   - a lefty;
   - a tournament bowler with 6 balls;
   - a 1-ball beginner.

   Simulated data is prefixed `SIM<run>-` and cleaned up afterwards.

## 8. Definition of done
- Code is on `main` and deployed to Pages (and Render if touched).
- All suites are green on the live site.
- Reviewer score is 10/10, or residual risks are documented.
- `docs/` is updated, including the `RULES` source table.
- 0 uncited rules.

## 9. Constraints
- No build step.
- CSP `script-src 'self'`.
- No new runtime dependencies without Tech Lead sign-off.
- Free-tier Render cold starts stay documented.
- No monetization work.

## 10. Risks
| Risk | Mitigation |
|---|---|
| Rule-based ranking feels "wrong" to an experienced bowler | Read buttons + lock; personal data overrides at n ≥ 10; every rule editable |
| Shape axis is an estimate | Labelled "estimate"; user can move a ball's cell |
| Ruby columns unknown | Generic mapper until the owner's sample arrives; no preset before then |
| LaneTrax PDF layout changes | Versioned parser + manual entry fallback |
| LaneTalk export may never arrive | Manual scoring (N1) is the primary path |
| 3-D engine still blocked | Flag off; 2-D disclosed as estimate |
| UI collisions with another agent | Path-scoped commits, rebase |

## 11. Reporting
Each round reports:
- the phase and commits;
- golden / tap / axe results;
- the coverage of the plan §1 inputs table (have / partial / missing);
- sample files still needed from the owner;
- residual risks.
