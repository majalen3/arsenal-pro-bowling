# Release readiness — PWA beta candidate, no public/native launch approval

8 November2026, America/New_York (EST), unreleased SW68. One owner + AI; no new infrastructure or operating team assumed. This is tested-source evidence, not human validation or legal/security certification. No merge, deploy, store submission, spend, live account/DB operation or actual production backup performed.

## Current disposition

- **Software candidate for a bounded local-first PWA beta:** fresh empty arsenal/165 searchable shared models, distinct physical copies, preserved legacy review, neutral profile, offline core, explicit supported local recovery/checkpoint Undo. Engine/catalog/baseline unchanged7,500/0. Exact current suites/limits in [validation](LAUNCH_FOUNDATION_VALIDATION.md).
- **Not public-launch ready; not native-ready.** Owner approval/integration CI and real-device rehearsal still required even for beta. Accounts/Team must not be represented as durable backup until hosting/preservation verified. Full-phone, all-preference, account/team archive recovery and multi-tab coordinated recovery are not supported.
- The inherited HIGH body-parser advisory is **fixed in candidate API3, not deployed**:1.20.8→1.20.9, npm audit1HIGH→0, both hosted isolated PostgreSQL16 suites61 passed/0failed. No production auth/config/secret change. App has no npm manifest/tree; npm audit is not applicable, not evidence that vendored assets are security-certified.

## Actual stack / forward-only integration proposal (NOT executed)

| Head | Inspected status | Dependency |
|---|---|---|
| App1 `0f40a4a` [PR1](https://github.com/majalen3/arsenal-pro-bowling/pull/1) | OPEN; old ui green/journeys job red | main base; exact old journeys assertions passed, Lighthouse Tonight77/Me79 failed80 budget |
| App4 `ca65af4` [PR4](https://github.com/majalen3/arsenal-pro-bowling/pull/4) | OPEN/ui green | App1 |
| App5 `8c4d648` [PR5](https://github.com/majalen3/arsenal-pro-bowling/pull/5) | OPEN/both ui green | App4 |
| App6 `7275ac4` [PR6](https://github.com/majalen3/arsenal-pro-bowling/pull/6) | OPEN/all3 hosted checks green | App5 |
| Current `restore-review-undo` | Isolated follow-up on actual App6; exact new PR/head/hosted status in delivery, not presumed green before push | App6 |
| Docs2 `f9b20af` → Docs3 `1b6fd7b` | OPEN/green | Parallel analysis/planning branch on App1, not feature prerequisite |
| API1 `8691719` [PR1](https://github.com/majalen3/arsenal-pro-api/pull/1) | OPEN; historical red missing TEST SESSION_PEPPER | main base |
| API2 `a4fe0b3` [PR2](https://github.com/majalen3/arsenal-pro-api/pull/2) | OPEN/both PG16 checks green60/0 | API1 |
| API3 `7b59422` [PR3](https://github.com/majalen3/arsenal-pro-api/pull/3) | OPEN/both PG16 checks green61/0, audit0 | API2 |

After explicit owner approval only: new app follow-up→6→5→4→1, retaining commits by forward merges into feature branches; API3→2→1 similarly. Then full fresh **main-target PR1** CI on each updated cumulative head, review any conflicts, obtain separate main-merge/deployment approval, and run new-main CI/recovery smoke after integration. Alternatively owner may choose a reviewed cumulative integration PR retaining history. Never merge an unchanged historical red head on the strength of a descendant green run. No retarget/merge/force/rewrite/old-CI masking was done. Current fetched app main `1fa4781` is an ancestor of6; local merge-tree against main is clean. Final candidate ancestry/diff check is recorded in delivery/evidence.

## Supported recovery, not a blanket recovery promise

- Standard backup path is still additive event-only; no implicit settings or destination switch. New optional modern-file local review adds validated allowlisted preferences/saved aims and nonempty line/surface/note mirrors. Projected existing facts must survive exactly. Conflict values default **keep this phone**; explicit file choices only for reviewed mirrors/preferences. Original IDs/physical copies/layouts/games remain intact. A confirmed profile mirror conflicting with new event facts blocks for separate review; neutral/unentered fields may fill, never guess. Raw snapshots never prove ownership.
- Requires durable storage, signed out (including pending identity), code sync OFF, resolved privacy/legacy review, **one Arsenal tab only** and file authorization confirmation. Pure preview makes no writes/uploads. Persist checkpoint/journal+hold before apply; strict writes fail rather than pretend memory is durable. No account/code rebind or server mutation.
- Guarded Undo is local append-only compensation, not deletion: original raw keys restored only if every key still matches before/after and no later/queued events or synced recovered IDs. Interrupted apply/Undo reload repair is tested. Later edits block Undo; explicit **Keep current data** ends completed Undo without touching later edits. Checkpoint history remains exportable. A prepared partial restore plus later edits stays paused for separate review, not a destructive force-repair.
- Locally undone event IDs cannot be reinstated by the same file in the same profile; keep it for separate clean-profile review. Unknown preferences, account/team exports, lane-control/auxiliary snapshots and older miss-shot mirror additions remain unsupported. Same-account sync is still **last-write-wins**, not server conflict review/Undo; Me visibly says export before sign-in/device change. Cross-tab/large-file/OS eviction and real-device behavior are gates, not inferred from single-tab tests.

## Ship / no-ship gates

| Gate | Current state / actual next decision |
|---|---|
| Dependency + software regressions | Candidate patch/audit and supported recovery evidence recorded in validation; no budget/audit/probe suppressed. Exact head hosted results must pass; old immutable red statuses are historical, not rewritten. |
| Source integration/release | Owner must approve stack integration, updated main-target CI, then merge/deploy separately. Nothing deployed here. |
| Real devices / both segments | Human NOT RUN: iOS Safari + installed PWA, Android, screen reader/keyboard/large text, tab/OS kill, quota/eviction and private-file recovery rehearsal. Synthetic original22 preservation is not the owner's actual device confirmation. |
| Database durability | **Unverified live plan/creation/expiry/backup.** Prior15 November date NOT reconfirmed. Desired YAML still Free Oregon PG/web; owner must authorize preservation/isolated rehearsal and choose hosting/scope. No actual DB export taken. See [options](DATABASE_PRESERVATION_OPTIONS.md); its prices are dated research, not a fresh quote/approved spend. |
| Product C8/C9 | C8 total-only teammate entry known limitation; C9 private earned-score milestone policy remains owner choice. No coercion/streak/leaderboard/style-superiority features added. Decide public scope; not a reason to build unrelated features now. |
| Public privacy/legal/support/Team operations | Owner approves actual retention/deletion/support identity/resources, source/dependency terms and UGC/moderation scope before public claims. No placeholder policy is approved launch-ready, no trademark/legal guarantee. |
| Native stores | Separate deferred packaging/signing/storage-origin transfer, platform privacy/deletion/support and UGC obligations; check then-current policies at that time. No enrollment/submission. AI chat is unnecessary for Phase1 and deferred. |

## Acceptance smoke — human NOT RUN

1. **Casual:** fresh0 owned→skip stays0→search exact/typo/brand→review/save one real physical copy→explicitly Bring/Pack→score without extra overlays→cold offline reopen. First correct ball within60s is a target, not a measured claim. Explain local save vs private downloaded file vs optional sync.
2. **Competitive:** create two copies of one model with distinct IDs/names/layouts/surfaces/aims; verify details/Target/bag/game references; legacy fixture22 review/Undo retains every original ID/history. At360px long names and controls remain readable/tappable. Export before any account/device change; use only mocked identity tests in automation.
3. **Recovery (both):** use a private synthetic modern backup with new copy/history and supported settings; over nonempty local lists, preview default-keeps every conflict and writes nothing. Choose a single explicit value, acknowledge one-tab/source authorization, apply locally→inspect copies/list entries/aims→download checkpoint→reload→Undo before later edits. Repeat with later edit and verify Undo refuses; Keep preserves it. Corrupt/stale/unsupported file must explain block. Never clear data or use account export as an app-import shortcut.
4. **Now tests:** `#/me/usage`; S1 both Lane summary arms retain chips, S2 next-ball/feet-eyes hint outside active scoring, S3 Next up defaultOFF/one opt-in line/earned-only/Old Friends. [SMOKE_TESTS.md](SMOKE_TESTS.md), `tests/now_smoke.py`; counters stay local.

## Rollout / recovery

No rollout performed. After approvals: retain private pre-upgrade exports; ship a small opt-in local-first beta, run both-segment/device/offline scripts, inspect actual installed SW68 and pause on any privacy/data mismatch. Prefer forward corrective SW release; do not roll backward to pre-privacy workers or wipe/rebind storage to force recovery. Preserve source/checkpoints; unsupported recovery needs separate authorized review, not a success toast. Never restore production over nonempty/live data. Public accounts/Team durability, public/legal and native gates remain separate from the local software candidate.
