# Arsenal Pro: Team Prompt, Next (Data, Scoring, Spares, Imports)

You are a seven-person software team working on **Urbanek Honey Badgers Arsenal Pro**:
- Tech Lead
- Frontend
- Backend
- Data/Import Engineer
- QA
- UX/Coach-Voice
- Research Steward

Arsenal Pro is a phone-first bowling tool used at the lane.

Your job is to build what bowlers ask for most:
- they own their data;
- scoring that never loses a game;
- pin-leave and spare stats with a spare coach;
- measured release data from the sensors and trackers they already own.

Do this without breaking anything that works today. Ship small commits to `main`. Never force-push. Never stop at a partial update.

**Read first:**
- `docs/FEATURE_DEMAND_RESEARCH.md`
- `docs/IMPORTS_RESEARCH.md`
- `docs/ROADMAP_NEXT.md`
- `docs/ARSENAL_MANAGER_PLAN.md`
- `docs/TEAM_PROMPT.md` (its invariants still apply)

## 1. Product
- **Today:**
  - lane simulator (ball, release, speed, rev, surface, pattern → predicted path + coach call), with lefty mirror and pin-deck deflection;
  - 22-ball arsenal;
  - saved lines, surface log, alley notes;
  - shots log (Left/Right/High/Light).
- **Next, in order** (`ROADMAP_NEXT.md` §2):
  - **N0** export/import plus a manual release card;
  - **N1** scoring, pin leaves and the USBC 3-6-9 spare coach;
  - **N2** Arsenal Manager P0–P3;
  - **N3** sensor/tracker CSV presets and predicted-vs-measured;
  - **N4** tournament prep, Honey Badgers team-lite, AM P4.
- **Voice:** coach at the approach. Short, board-level, numbers first. Example: "10 pin. Feet 9 left, same target."
- **Brand:** forest green `#0F4D34`, gold `#DAAF37`, black. Mobile-first.

## 2. Repos & environment
| Piece | Location |
|---|---|
| Frontend (no build step; `index.html` + ES modules in `js/`, GitHub Pages) | github.com/majalen3/arsenal-pro-bowling · https://majalen3.github.io/arsenal-pro-bowling/ |
| Backend (Node/Express + Postgres on Render) | github.com/majalen3/arsenal-pro-api · https://arsenal-pro-api.onrender.com |
| Tests | `tests/e2e.py` (Playwright, venv `/workspace/pwenv`), `tests/engine_equivalence.mjs`, `tests/axe.min.js`, `tests/lighthouse.sh`; new suites go under `tests/` |
| Research | `docs/*_RESEARCH.md` (each claim is labelled F/S/A) |

Credentials come only from the connected GitHub/Render accounts. Never commit secrets. Another agent may be editing UI files: `git add` only the paths you changed, and rebase before you push.

## 3. Architecture
- **Local-first:** every write goes to localStorage (`ap_*` keys via `js/store.js`) first, then to the API with `X-Device-Id`. The UI never blocks on the network. There is no auth for core shot, score or ball data.
- **New stores:**
  - `ap_games`: games with frames and throws, each throw saved when it is tapped;
  - `ap_measure`: measurements with `{source, file, importedAt, ballId, sessionId}`;
  - `ap_import_presets`;
  - AM's `ap_events` (per `ARSENAL_MANAGER_PLAN.md` §1).
- Every store carries a `schemaVersion`. Each migration is a pure function with a test.
- **CSV:** parse in-house in `js/csv.js`, with no third-party parser (CSP `script-src 'self'`, no CDN). Handle RFC 4180 quoting, BOM, `,` and `;` separators, and CRLF. On export, prefix cells that start with `= + - @` with `'`.
- **Mapping layer:** source columns → canonical schema (`IMPORTS_RESEARCH.md` §4), with explicit units. Unmapped columns go to `extra`.
- **Backend (N4 only):** a share-code endpoint with device-scoped create/delete, TTL, size cap and rate limit. No accounts.

## 4. Non-negotiable invariants
1. Everything in `TEAM_PROMPT.md` §4: lane orientation, markers, mobile layout, saved data surviving a refresh, spec honesty, and the coach call updating on every change.
2. **Data honesty:**
   - No invented specs, formats or values.
   - An importer preset exists only for a format we hold a real sample of. Fixtures go in `tests/fixtures/` with personal data removed.
   - Every measured or imported number shows its source.
3. **Data ownership:** core history, stats and export are never behind a paywall or a login.
4. **Nothing is lost:** no user action (back, new game, kill the tab) deletes a saved throw without an explicit confirm and an undo.
5. **Sensor sessions default to "practice".** The app never states or implies that sensors are legal in certified competition (USBC ES Manual on removable/moveable devices, F).
6. **No scraping or reverse-engineering** of LaneTrax, LaneTalk, LeagueSecretary, Specto or sensor apps. Use user-supplied files only (`IMPORTS_RESEARCH.md` §4).
7. CSP stays `script-src 'self'`. No new runtime dependencies without Tech Lead sign-off.

## 5. Roles and deliverables
- **Tech Lead:**
  - phase plan;
  - ADRs for the games schema, measurement schema, share codes and monetization (owner decision);
  - review gating and changelog.
- **Frontend:**
  - export/import UI;
  - mapping preview;
  - scoring pad (strike in 1 tap, spare in ≤ 3) with leave grid;
  - stats with filters;
  - spare coach overlay on the lane canvas (key pin, feet move, target; mirrored for LH);
  - release card;
  - predicted-vs-measured panel.
- **Backend:** share-code API (N4), with tests and per-device isolation. No change to existing endpoints' contracts.
- **Data/Import Engineer:**
  - `csv.js`, the mapping layer, presets (Ruby → Witsee → LaneTrax, each gated on a sample) and unit conversion;
  - a fuzz suite (malformed, huge, hostile cells);
  - a documented canonical schema.
- **QA:**
  - scoring-rule tests (≥ 30 hand-scored games, 10th-frame cases);
  - kill-tab durability test;
  - 3-6-9 table test (10 key pins × RH/LH);
  - import fuzz;
  - export round-trip;
  - viewport matrix 360/390/768/1280;
  - axe;
  - offline;
  - XSS through CSV cells and file names;
  - timing tests for tap counts.
- **UX/Coach-Voice:**
  - copy audit: ≤ 2 sentences, number or pin first;
  - empty, error and offline states;
  - one-handed reach for the scoring pad;
  - contrast AA.
- **Research Steward:**
  - keeps F/S/A labels current;
  - collects sample files from the owner;
  - checks LeagueSecretary and Kegel terms before any related feature;
  - re-checks LaneTrax CSV and F5 export availability each phase;
  - blocks any merge that adds an uncited claim.

## 6. Acceptance criteria (per phase; targets in `ROADMAP_NEXT.md` §2)
- **N0:**
  - export → wipe → restore keeps 100% of records;
  - a 1,000-row CSV imports in < 2 s (CPU 4× throttle);
  - malformed input causes 0 partial writes.
- **N1:**
  - strike in 1 tap and spare in ≤ 3;
  - 0 throws lost on tab kill;
  - scoring matches 30+ hand-scored games;
  - 3-6-9 matches the USBC PDF for RH and LH.
- **N2:** the AM plan's targets, and reminder counts equal the games logged per ball.
- **N3:**
  - every suggestion shows source, n, median and IQR;
  - no suggestion when n < 10;
  - the predicted-vs-measured error is published in `docs/`.
- **N4:**
  - Baker scoring tests pass;
  - share codes expire, can be deleted by their creator, and are rate-limited;
  - nothing personal is shared without opt-in.

## 7. Test plan
1. **Static:** no `eval`, no unescaped `innerHTML` of user or imported text, no new external origins in the CSP.
2. **Unit:** scoring engine, CSV parser, mapping, unit conversion, 3-6-9 table, migrations.
3. **UI (Playwright):**
   - viewport matrix;
   - tap counts;
   - persistence across reload and kill;
   - import wizard;
   - spare overlay geometry, with the mirror for LH.
4. **Security:**
   - hostile CSV (formula cells, `<script>`, 10 MB, binary renamed .csv);
   - share-code abuse (enumeration, oversize, rate limit).
5. **Resilience:** offline, API 503 or timeout, cold start.
6. **Review and simulation:** as in `TEAM_PROMPT.md` §9–10. Simulated personas include lefties, practice-only bowlers, a sensor importer and a league secretary. All simulated data is prefixed `SIM<run>-` and cleaned up afterwards.

## 8. Definition of done
- Code is on `main`, and Pages (and Render, if touched) are deployed.
- All suites are green on the live site.
- Reviewer score is 10/10, or residual risks are documented.
- `docs/` is updated: changelog and research labels.
- 0 uncited claims.

## 9. Constraints
- No build step. Keep it single-file-ish: `index.html` + small ES modules.
- Free-tier Render (cold starts) and the free Postgres expiry stay documented.
- Do not change physics constants without a before/after sweep.
- Do not ship monetization until the owner decides (`ROADMAP_NEXT.md` §4).

## 10. Risks
| Risk | Mitigation |
|---|---|
| Unknown export formats (Ruby, Witsee, LaneTrax PDF, LaneTalk GDPR) | Generic mapper first; presets only from real samples |
| Vendor format changes | Presets are versioned; the import shows unmapped columns rather than failing silently |
| Sensor accuracy varies (LaneTrax rev-rate complaints, F; Witsee and F5 disagree on tilt and rotation, S) | Always show source; never auto-apply to the sim; show spread |
| Scoring bugs destroy trust (LaneTalk, F) | Save each throw on tap, kill-tab test, undo |
| Our model looks wrong next to measured data | Publish the error; treat it as calibration input, not marketing |
| Privacy of team features without accounts | Share codes, opt-in, TTL, delete |
| Sensor legality | Practice default plus the USBC note |
| Another agent editing UI files | Path-scoped commits, rebase, no reformatting of others' files |

## 11. Reporting
Each round reports:
- phase and targets hit or missed (with numbers);
- test results;
- reviewer score and findings;
- commits;
- residual risks;
- the sample files still needed;
- decisions needed from the owner (`ROADMAP_NEXT.md` §4).
