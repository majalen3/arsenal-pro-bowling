# CEO + development team execution brief: launch foundations

Release baseline: app PR #1 `0f40a4a`, unmerged; companion API PR #1 `8691719`, unmerged. Read docs PR #2 (`gap-analysis-2`) and #3 (`launch-plan-1`) as hypotheses/plans, not fresh evidence or authorization to merge. Work in an isolated worktree based on `now-list-and-catalog-fixes`; do not rewrite those branches. This is an actionable reusable team prompt, not a simulated meeting or a claim of staffed departments.

## Mission / product contract
Build a useful general app for **any bowler**: “Your balls. Your league night. Saved on your phone.” A new installation owns **zero** balls. The shared factual catalog is discoverable equipment, never universal personal ownership. The owner's 22 models are not a starter inventory for other people. A physical owned instance has a stable private ID, while its catalog ID identifies a reusable model; two copies can have different names, weights, drill/layout and surface histories.

One owner plus AI assistance; plan in two-week milestones, at most two implementation items in progress. Cut feature breadth before privacy, recovery, accessibility or data integrity. First correct owned ball within 60 seconds is a **formative smoke-test target**, not a result, researched benchmark or marketing promise.

## Assignments / required evidence
| Lens / accountable work | Examine and deliver |
|---|---|
| Product lead / CEO | Define both casual/low-tech league and competitive/multi-ball jobs; prioritize dependencies, not feature count. Publish implemented/deferred matrix, owner decisions and release gates. No fabricated ROI or launch date. |
| UX / accessibility | Search-first multi-select, visible selection/review/save, skip, manual/not-found, optional advanced details and clear local/backup/account status. Test 360px, keyboard, screen-reader names/focus, large text and 44px one-handed targets. Add nothing to active scoring. |
| Frontend / offline / data | Trace welcome, profile defaults, catalog vs owned resolution, bag/details/targeting/games/QR, restore and caches. Implement append-only/versioned backed-up migrations, idempotency, interrupted-save recovery and offline parity. Preserve IDs, histories, aims and confirmed values. No destructive reset. |
| Backend / security / privacy | Trace every write destination, auth loss/signout/switch, legacy mirror dual-writes and recovery. Keep-data signout must be explicitly local-only, never silently upload into a backup-code stream or another account. Test locally/mocked only. Preserve existing remote copies; no live cleanup, accounts or new infrastructure. |
| Bowling physics / data integrity | Keep factual sources, weight provenance and explicit unknowns; catalog facts separate from private fields. Unsupported inputs are unmodeled. Do not change catalog numbers, `simulatePath`, engine or equivalence baseline. No style superiority, fitting/layout prescriptions, medical advice or accuracy claims. |
| QA | Reproduce inherited audit claims from current source and runtime; record exact paths/root cause/severity/acceptance. Run unit, 7,500/0 equivalence, e2e, journeys, offline/update/storage failure, accessibility and clutter; API locally if touched. Label skips/known issues and distinguish code-tested from human-validated. Capture fictional 360px inventory only, never recovery keys/tokens. |
| Release / compliance | PWA private beta is the current scope, not native-store readiness. Check source/license inventory and truthful recovery copy. Record DB expiry as a blocker pending owner-confirmed durable plan; do not upgrade/spend. Native signing/SDKs/domain verification, support/privacy/deletion resources, UGC operations and store declarations remain separately gated. Do not publish placeholder legal policies as approved documents or assert trademark clearance. |

## Required examination before implementation
Confirm or reject, line by line, claims in prior audits against real `welcome.js`, `pickers.js`, `more.js`, `hub.js`, `ball.js`, `store.js`, `data/sync.js`, account modules, migration/backups and consumers. For every finding record baseline SHA/path/lines, reproduction, root cause, severity, source/runtime/test evidence and an acceptance test. Do not infer anything personal from username, user agent, global defaults or presence of history. A previously saved owner's bag is immutable evidence to preserve, not permission to seed another installation.

## Phase 1 scope / dependencies
1. Safe ownership and sync transition contract first; snapshot old state before any bridge migration.
2. Empty installation and reusable whole-catalog search-first multi-selection; strict brand filter, visible selected copies, local review/save, skip, manual name-only unknown ball. Online maker enrichment is optional/non-blocking. Link existing card scan after ownership; do not expand OCR.
3. Stable owned-instance resolution across detail, bag, targeting, saved games and QR. Preserve model links for catalog discovery and old records; never reassign historical events between duplicate copies by guess.
4. Neutral/unknown personal fields until entered. Existing confirmed fields stay unchanged; model starting controls are assumptions, not a profile measurement.
5. Honest local persistence, paused sync, authorized target and file recovery UI. No unsupported “safe forever” claim.
6. Validation, rollout/recovery documentation and review PR only.

AI chat is deferred: stable identity, local facts and deterministic UI already serve the Phase 1 jobs. Paid AI/vision, new backend services, native packaging/store submission, new community/moderation operations, public feed, photos, rankings/streaks/locked awards, monetization, outreach and legal/trademark assertions are non-goals. Keep free core, optional accounts, Old Friends and earned-only milestones.

## Prioritization rubric
Score Impact, Effort and evidence Confidence 1–5; Effort 1 ≤1 day, 2 2–3 days, 3 4–6 days, 4 7–10 days, 5 >10 days/uncertain infrastructure. Advisory value = Impact × Confidence / Effort; dependency/privacy gates override arithmetic. Label **Now** (cohesive Phase 1), **Next** (next two-week cycle after evidence), **Later** (separate approval/infrastructure). Give estimates as planning judgments, not measured ROI. Any spillover must be explicit, with a safe cohesive stopping point and no “launch-ready” claim.

## Acceptance / stop conditions
- New empty, skip, search typo/brand/variant, manual unknown and offline all save only reviewed physical copies; refresh does not duplicate them. Catalog search remains available without owning anything.
- Duplicate models retain distinct owned IDs, names, layouts/surfaces, game attribution and reopen behavior. Missing specs never block storage or cause invented physics.
- Existing logs/profile/bags/games/drills/surface/aims are preserved byte-for-byte or semantically with original IDs; migration rerun is a no-op and rollback uses a versioned snapshot. Ambiguous empty-means-all legacy state needs explicit review, never automatic 22-ball inference.
- Auth loss/signout keep-data pauses network writes; account switch cannot upload old private data to a new identity. Changing a sync target requires explicit authorization and honest destination/status. Backup and restore exclude auth/recovery secrets.
- No serious/critical accessibility issues in changed flows, no horizontal overflow at 360px, targets ≥44px, no scoring clutter, no CSP relaxation or third-party scripts/build step. Engine baseline stays 7,500/0.
- **Stop and request separate owner approval** before spend/upgrades, destructive migration/data deletion, live account/data writes or tests, native/store enrollment/submission, public deployment/merge, outreach or new legal commitments. Never use a stale free DB as evidence of durable backup.

## Rollout / recovery / release checklist
1. Audit exact unmerged base and dependencies; preserve docs PRs and unrelated worktrees.
2. Implement/test on isolated local fixtures. Freeze catalog/engine; snapshot migration input before modification. Add stale-SW and interrupted-upgrade tests; bump from latest base SW once.
3. Require technical zero-loss/zero-cross-identity-upload gate before user testing. Keep all old data/copies; no server cleanup. Document rollback code plus snapshot restore and any non-reversible boundary; never auto-delete to roll back.
4. Owner reviews PR/dependencies; no merge/deploy without approval. Controlled PWA beta only after durable-service decision and recovery rehearsal. If privacy/migration fails, pause rollout, retain local data/export access and return to prior code using the preserved snapshot—not a wipe.
5. Human smoke study separately: five casual/low-tech and five competitive/multi-ball consenting bowlers, matched tasks, no real credentials/screenshots. Measure correct first ball ≤60s, three balls/duplicate/offline, recovery comprehension and pressure ≤2/5. Report denominators, failures and uncertainty; no retention/accuracy lift claim.
6. Native-store track later: real device/lifecycle/storage-origin transfer, signed build/SDK/CSP bridge review, current store policies, developer identity, support/privacy/deletion resources and community scope/operations. A tested PWA or generated wrapper does not pass these gates automatically.
7. Deliver audit, implementation matrix, tests/known issues, safe screenshot manifest, migrations/privacy evidence, rollback and unresolved owner decisions in `LAUNCH_FOUNDATION_VALIDATION.md`; open one stacked PR based on `now-list-and-catalog-fixes`, push once, never main/merge/force push.
