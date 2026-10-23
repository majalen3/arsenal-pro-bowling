# Roadmap — Next (after cycle 6)

Written 2026-10-23. Evidence: `FEATURE_DEMAND_RESEARCH.md` (demand), `IMPORTS_RESEARCH.md` (imports), `ARSENAL_MANAGER_PLAN.md` (Arsenal Manager P0–P4, folded in below).

**Labels:**
- **F/S** as in those docs.
- **A** = assumption.
- Effort and score values are **team estimates (A)**, not measurements.

**North star.** The one free, local-first app where a bowler's **ball, pattern, release numbers and results** live together, and where the coach call tells them the next move. Core data is never paywalled and is always exportable. Demand #1, see `FEATURE_DEMAND_RESEARCH.md` §1.

## 1. Expansion map (scored)

**Scales (1–5):**
- Demand: from evidence counts.
- Fit: uses what Arsenal Pro already has (lane model, arsenal, patterns, coach voice).
- Effort: 5 = largest.
- Risk: 5 = riskiest.

| Area | Demand | Fit | Effort | Risk | Call | Why |
|---|---|---|---|---|---|---|
| **Data ownership: full export/import (JSON + CSV)** | 5 | 5 | 2 | 1 | **Now** | Top pain across LaneTalk and LaneTrax reviews (F). Also a prerequisite for imports. |
| **Game and frame scoring with pin leaves (manual)** | 5 | 4 | 4 | 3 | **Now** | Pains #2 and #3. LaneTalk paywalls it and loses games (F). Risk: crowded space, and bugs here destroy trust. |
| **Spare system coach (USBC 3-6-9) on the lane** | 4 | 5 | 2 | 1 | **Now** | Uses the lane renderer and coach voice. Source is a USBC PDF (F). No competitor tells you the move. |
| **Arsenal Manager P0–P4** | 4 | 5 | 3 | 2 | **Now → Next** | Already planned (`ARSENAL_MANAGER_PLAN.md`). |
| **Sensor/tracker import (CSV mapping) + manual release card** | 4 | 5 | 3 | 3 | **Next** | Ruby (CSV, F) and Witsee Premium (CSV, F) export today. Risk: formats UNKNOWN until we have samples; sensor accuracy varies (F reviews). |
| **Sim calibration from measured release data** | 4 | 5 | 3 | 4 | **Next** | Unique to us. Risk: shows our model's error in public. Must be honest (show predicted vs measured, never hide). |
| **Practice sessions and drills (out of average) + adjustment notes** | 4 | 5 | 2 | 1 | **Next** | Pains #6 and #9. The shots log (Left/Right/High/Light) already exists. |
| **Tournament prep: pattern + bag + maintenance due** | 3 | 5 | 2 | 1 | **Next** | Joins AM bags, patterns and reminders. |
| **League / team (Honey Badgers): roster, Baker, recap** | 3 | 3 | 4 | 4 | **Later** | Demand is real (F, S) but needs identity. "No auth for core data" means team features use share files/codes, not accounts. |
| **Video replay** | 4 | 2 | 5 | 4 | **Later / partner** | LaneTrax owns this space (F). Storage and CSP make it costly. Defer. |
| **Center live-scoring integration** | 4 | 3 | 5 | 5 | **Not planned** | Center-side only; partner contracts (IMPORTS §2). |
| **Social feed / leaderboards** | 2 | 2 | 3 | 4 | **Not planned** | Little demand found; privacy risk without accounts. |
| **Monetization** | — | — | — | — | **Policy** | Evidence says bowlers resent subscriptions (F, S). Rule: core data, history and export stay free forever. Options to be decided by the owner: one-time "supporter" unlock, or paid extras (cloud backup, coach tier). No ads in the lane view. |

## 2. Phases

Each phase ships only if its targets and the **QA gate (§3)** pass.

### N0. Data foundation: export and import
- **Export:**
  - "Export all" → one JSON (every `ap_*` key, versioned schema) plus CSV per table (shots, lines, notes, surface log, AM events).
  - Restore from that JSON.
- **Generic CSV importer:**
  - file picker → preview of the first 20 rows → column mapping to the schema in `IMPORTS_RESEARCH.md` §4 → unit choice → dry-run summary → commit;
  - saved mapping presets;
  - every row stamped `source`, `importedAt` and `file`.
- **Manual release card:** speed, RPM, tilt, rotation, PAP, launch angle, entry angle, boards, plus a source dropdown. Stored as a dated "measurement", separate from the profile.
- **Targets:**
  - export → wipe → restore round-trip keeps 100% of records, byte-equal JSON after normalisation;
  - importing a 1,000-row CSV takes < 2 s on a mid phone (A: Playwright with CPU throttle 4×);
  - malformed CSV (bad quotes, BOM, `;` separator, empty file, 10 MB file) → a clear error, 0 partial writes;
  - no presets ship until a real sample file exists, checked in under `tests/fixtures/` with personal data removed.

### N1. Scoring, pin leaves and the spare coach
- Frame-by-frame entry with a 10-pin leave grid. Each throw is saved to localStorage the moment it is tapped (fixes the LaneTalk failure, F).
- Game, series and session; ball and pattern tag per game.
- Stats: strike %, spare %, conversion by leave, single-pin vs multi-pin, splits, first-ball average, filters by ball, pattern, center, season and session type.
- **Spare coach (USBC 3-6-9, F):**
  - Tapping a leave shows the key pin, the feet move from **your** strike position, and the target. Mirrored for lefties (cycle 6 mirror).
  - Coach call example: "10 pin. Feet 9 left, same target."
  - Practice sessions are excluded from averages by default.
- **Targets:**
  - a strike frame is ≤ 1 tap; a spare frame is ≤ 3 taps (Playwright tap count);
  - scoring rules unit tests: 300, 0, all spares, 10th-frame bonuses, fouls; ≥ 30 known games compared with hand-scored results;
  - kill the tab mid-game → 0 throws lost (test);
  - 3-6-9 table test: all 10 key pins × RH/LH match the PDF table.

### N2. Arsenal Manager P0–P3
As written in `ARSENAL_MANAGER_PLAN.md` §5, with its targets unchanged. New link: games from N1 drive the games-based reminders. Each game logged with a ball counts toward that ball's maintenance interval.
- **Target:** reminder counts equal the games logged per ball (test).

### N3. Measured data → better predictions
- **Import presets:** Ruby, then Witsee, then LaneTrax CSV, each only once a sample is held.
- Measurements attach to ball and session.
- **Profile suggestions:** "Your last N Ruby shots: median ‹speed› mph / ‹rpm› rpm. Use these in the sim?" (template; real values only) Values are never auto-applied.
- **Predicted vs measured panel** where tracker data has boards (LaneTrax arrows, breakpoint and entry; Specto by hand). Shows the error in boards.
- **Targets:**
  - each imported number displays its source label;
  - median, IQR and n are shown for every suggestion; no suggestion with n < 10;
  - the predicted-vs-measured error is logged per pattern and published in `docs/` (even when bad);
  - sensor sessions are tagged practice by default with the USBC devices note (ES Manual, F).

### N4. Tournament prep, team-lite, AM P4
- **Tournament prep card:** pattern (from `patdata.js`) + chosen bag (AM P3) + maintenance due before the event date + spare plan.
- **Honey Badgers team-lite:** roster and Baker scoring entry on one device; share the team night as an export file or a short code through the existing API. No accounts. Device-scoped; the owner can delete.
- AM P4 (drilling and PAP history).
- **Targets:**
  - Baker game scoring tests;
  - a share code expires (A: 30 days) and can be deleted by its creator;
  - 0 personal names leave the device unless the user opts in for that share.

### Later (needs owner decision or partner)
- Video replay.
- LaneTalk GDPR-file import (format UNKNOWN).
- CDE/Conqueror files from a friendly center.
- Kegel KOSI import (needs a sample and permission).
- Accounts.
- Monetization model.

## 3. QA gate (every phase)
1. Existing `tests/e2e.py` suite stays green, plus the new tests for the phase.
2. axe: 0 serious or critical issues. Viewports 360/390/768/1280: no horizontal overflow; tap targets ≥ 44 px.
3. XSS payloads in every imported field (CSV cells, file names, notes) render inertly. CSV formula injection (`=`, `+`, `-`, `@`) is neutralised on export.
4. Offline: all N0–N3 features work with the API down.
5. Spec and data honesty: 0 invented values. Every imported or measured value carries a `source`. Unknown formats ship no preset.
6. CSP unchanged: `script-src 'self'`, no new third-party runtime code, no build step.
7. Coach copy is ≤ 2 sentences and starts with a number or the ball/pin name.
8. Reviewer score 10/10, or residual risks documented (as in `TEAM_PROMPT.md` §9).

## 4. Open questions for the owner
1. Which sensor or tracker do you own or plan to buy: Ruby, Witsee, F5, LaneTrax? Can you share one real export (CSV/PDF)?
2. What is your center's scoring system (Brunswick Sync / Qubica Conqueror or BES X / Steltronic)? Does the league post to LeagueSecretary or LeaguePals?
3. Do you pay for LaneTalk Pro? Would you file a GDPR export request so we can see the format?
4. Monetization: always free, a one-time supporter unlock, or paid cloud extras?
5. Should Honey Badgers team features use share codes (no accounts), or is it time for accounts?
