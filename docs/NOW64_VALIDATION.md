# Now list / v64 verification — 2026-11-06 (SGT)

Local review branch only. No live DB writes, deployment or merge; API tests use an isolated local PostgreSQL database. App e2e/journeys/audits abort or mock all production API traffic.

| Suite | Result | Local artifact |
|---|---|---|
| Unit (`node --test tests/data/*.test.mjs`) | 307 passed, 0 failed; 1 optional private LaneTrax sample skipped (`LANETRAX_SAMPLE` not set) | `/tmp/now-unit-final.log` |
| Equivalence (`node tests/engine_equivalence.mjs`) | **7,500 comparisons / 0 mismatches** | `/tmp/now-equivalence-final.log` |
| Full app e2e | **763 passed, 0 failed** (offline, accessibility, targets, data, QR and core jobs) | `/tmp/now-e2e-release.log` |
| 20 cross-page journeys | **123 passed, 0 new failures; 1 known F06** (Cal total-only, owner C8 still open); 0 skipped; all accessibility/target probes clean | `/tmp/now-journeys-release/index.html` |
| Visual regression | **28/28 within unchanged 0.02 tolerance** | `/tmp/now-journeys-release/visual/` |
| Clutter | 38 views at 360×780 / 414×896, 0 evaluation errors; descriptive counts, not an engagement win | `/tmp/now-clutter-release/` |
| Additional all-route release audit | **82 route/state checks, 0 issues** | `/tmp/now-release-audit-final/audit.json` |
| Focused Now UI | Earned-only/Old Friends, default-off/one Next up, S1 layouts, source chips, S2 counters, 44 px targets, no preview/hint in active scoring, unknown-spec guard and offline v64 pass | `/tmp/now-ui-final-captures.log` |
| Companion API | **58/58 passed**, no skips, local DB/server only | `/tmp/now-api-clean-final.log` |

## Scope of the physics baseline

No changes to `js/engine.js` or `tests/legacy/app.v1.js`. The new independent `engine-inputs.v64.json` freezes reviewed manufacturer input facts; the harness checks both unchanged implementations on those facts. This is implementation equivalence, **not physical accuracy**. The complete 22-ball old/new table is in DECISIONS. Five identities have unverified specs; eight total have no supported path (including polyester Ice Storm, generic Reactive Scout and Not Urethane NU). No guessed model/grid placement replaces the missing facts.

Five intentional visual references were inspected/refreshed (Lane/Armory at both widths; Ball at 414 px). No failure threshold was relaxed. The visual runner now waits for the requested route to mount instead of accepting a blank load-race screenshot. Six pre-existing accessibility probes and literal null text exposed by the full audit were minimally repaired, without new scoring features.

## 360 px review screenshots

Final captures and the run-owned manifest: `/tmp/shots-now/results.json` (other older files in that shared directory are not part of this run's manifest).

- Earned cards / Old Friends: `/tmp/shots-now/armory-milestones.png`, `armory-earned.png`
- Opt-in line: `/tmp/shots-now/armory-next-up-line.png`, `armory-next-up.png`
- Lane: `/tmp/shots-now/lane-summary.png`, `lane-summary-full.png`, `lane-baseline.png`, `lane-unverified.png`
- Ball maker/model sources: `/tmp/shots-now/ball-specs.png`, `ball-maker-model.png`
- Compare / Targeting: `/tmp/shots-now/compare-model.png`, `target-model.png`
- Preview vs scoring: `/tmp/shots-now/step-preview-planning.png`, `active-scoring-no-extras.png`
- Local flags / offline: `/tmp/shots-now/tests-usage.png`, `armory-offline.png`

These are synthetic test records, not participant sessions. Run S1/S2/S3 through Me → Tests and usage; exact arm/flag procedures, durations, counts and pre-set criteria are in [SMOKE_TESTS.md](SMOKE_TESTS.md). No human comprehension, follow-through, logging or pressure outcome has been claimed.

Companion MOTIV API PR: https://github.com/majalen3/arsenal-pro-api/pull/1 — deploys only through the normal merge flow. C8 total-only teammates and C9 existing private score milestones remain owner decisions. No Engine v2, photos, streaks, leaderboards, locked awards, progress bars or telemetry were added. SW bumped once: **v63 → v64**.
