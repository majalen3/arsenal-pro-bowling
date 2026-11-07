# Launch foundations — current technical validation

## Follow-up: 7 November2026, Europe/Zurich (CET), SW v66 — unreleased

Isolated `/workspace/arsenal-launch-hardening`, branch `launch-recovery-hardening`, based on the inspected OPEN PR4 head `ca65af439f232d8eea7c8301d234b9b8e73f768f`. PR1/2/3/4 and API1 inspected before changes; old worktrees and pushed commits preserved. New branch pushes once, stacked on `launch-foundations-phase1`; no main push/merge/deploy/spend/live data access. [RELEASE_READINESS.md](RELEASE_READINESS.md) is the current no-ship/dependency checklist; [DATABASE_PRESERVATION_OPTIONS.md](DATABASE_PRESERVATION_OPTIONS.md) contains sourced, unapproved options. API repo stayed read-only.

### Current implemented / deferred matrix

| Area | This follow-up | Still deferred / no unsupported claim |
|---|---|---|
|360px full Ball names | Heading wraps; long/unbroken copy text contained; back and action targets retained. Existing J02 clipping probe unchanged. Only visually reviewed360px Ball baseline changed;414px identical, other26 untouched,0.02 tolerance unchanged. | No title shortening, test deletion or hidden meaningful failures. |
| Restore integrity / preservation | Core+preview block bad checksum, invalid/repeated IDs, same-ID/different-content and changes/removal of any existing factual projection row/field; derived health recalculation allowed. Before-event checkpoint persists first; append queue rechecks unchanged local events. Modern and converted-v0 previews use same preservation guard; older files explicitly lack checksum. | Ambiguous restore stages/blocks; no override/automatic merge. Complete prefs/nonempty mirrors, full restore Undo, checkpoint extraction UX/large-file/quota policy deferred. No silent overwrites or snapshot pruning. |
| Recovery evidence | Checkpoints retain before-events/prefs/selected legacy keys and are included in subsequent backup files; no recursive checkpoint nesting. Synthetic extracted checkpoint restores original projection hash in a separate clean fixture. Preview can download current backup first and states sync/preferences/Undo boundaries. | Browser loss/eviction/quota can still lose local-only state. Event checksum is not authorship; auxiliary metadata is unsigned and not auto-applied. No full phone clone or permanent backup promise. |
| Auth/privacy races | Ending invalidates pending login/signup/recover; superseded successful responses do not save/expose keys. Old401 generic/sync requests cannot end a newer session; best-effort unused-token revocation. Existing foreign-account/code-fallback tests retained. | Cannot reverse already-sent authorized server requests. One account per browser remains; no full workspace/rebind, retroactive server cleanup, cross-tab/real-device certification or live account tests. |
| Existing Phase1 |0 fresh owned,165 finite searchable catalog entries, explicit saved physical copies/Bring/Pack, neutral profile, backed-up legacy review/Undo and all existing history contracts retained and rerun. Old Friends/earned-only/no scoring extras unchanged. | Physical/custom QR expansion, owned-first shortcuts, complete restore reconciliation, unknown-style heuristic wording, detail model-caption fallback that can echo a copy nickname, and human60-second validation remain Next. |
| Engine/catalog/backend | No `simulatePath`, engine, catalog numbers or equivalence fixture change; zero baseline regeneration. SW65→66 once. Read-only API CI/config diagnosis +pure specs tests. | No API fix/deploy/live DB export/upgrade. Actual DB expiry/plan/backups unverified; no new deadline claim. |

### Reproduced red evidence (not hidden)

Exact inherited repro before CSS change:
```sh
/workspace/pwenv/bin/python -u tests/journeys/run.py --base http://localhost:8371/ --only J02 --no-visual --out /tmp/t100-title-before --media /tmp/t100-title-before-media --no-video
```
Exit1;8 step passes,0 step failures, **1 failed `probe/ball/truncation`**, full “Radical Rattler Big Bite” clipped (`/tmp/t100-title-before/results.json`). Exact same J02 command after the fix (new `/tmp/t100-title-after` output paths) exits0:8 step passes,0 failed probes; no tolerance/test change. Five new regressions failed on the base (`/tmp/t100-safety-before.log`, exit1): pending-login signout, stale generic401, checksum, profile replacement, ID collision. Then stale sync401 reproduced separately (`/tmp/t100-sync-before.log`, exit1). New long-name smoke additionally exposed unbroken body overflow; fixed in CSS, not the probe. Two initial offline-upgrade runs also failed harness assertions: probing the newly imported module could race the controller-triggered page reload and hub initialization. The test now awaits the actual load/navigation and `hub.ready()` before the unchanged cache/version/data assertions; no timeout/budget was raised. One early smoke failure was a harness-only attempt to inspect nonpublic `window.__apData.meta`; corrected to existing `hub.db.meta`, no app behavior changed to satisfy it.

### Current local results

| Suite / command above | Result and actual exit | Box evidence |
|---|---|---|
| Unit/data |342 passed,0 failed,1 intentional private LaneTrax sample skip (343 total), **exit0**;16 added cases | `/tmp/t100-unit-final.log` |
| Engine equivalence |7,500 comparisons /0 mismatches, **exit0**, unchanged fixture/catalog/engine | `/tmp/t100-equivalence.log` |
| Full e2e (serial) |763 passed /0 failed, **exit0** | `/tmp/t100-e2e.log` |
| Full20 journeys +visuals |121 step passes,0 failed,1 known C8,0 skipped; **0 failed probes**,28 visual passes at unchanged0.02 tolerance, **exit0** | `/tmp/t100-journeys/results.json`, `/tmp/t100-journeys.log` |
| Release/accessibility |82 route/viewport/empty-or-seeded checks,0 issues, **exit0**;60 cold requests,562,406 bytes (549KiB in harness) | `/tmp/t100-release-audit/audit.json`, `/tmp/t100-accessibility.log` |
| Clutter |38 views at360/414,0 runtime errors, **exit0**; no new active-scoring code/UI | `/tmp/t100-clutter/summary.json`, `/tmp/t100-clutter.log` |
| New hardening smoke |Full long/unbroken title equality, unchanged clipping probe,44px/axe, corrupt/conflicting preview disabled/no event writes, private backup download, additive restore/checkpoint/local-only, **exit0** | `/tmp/t100-hardening-final.log` |
| Foundation +offline cold launch |Search/skip/duplicate/layout/Target/explicit pack/profile/legacy review+Undo/offline, **exit0** | `/tmp/t100-foundation.log` |
| Now S1/S2/S3 +offline |Both arms/chips/default-OFF/earned-only/Old Friends/local counters/no scoring extras, **exit0** | `/tmp/t100-now.log` |
| Real waiting SW65→66 and64→66 |Explicit activation/reload, original IDs/layout/PAP/hand/aims, migration state, direct asset navigation and offline cold launch, **exit0 each after harness synchronization fix** | `/tmp/t100-upgrade65-final.log`, `/tmp/t100-upgrade64-final.log` |
| API pure spec/MOTIV |16 passed /0 failed, **exit0**, no server/network/DB; API repo unchanged | `/tmp/t100-api-specs.log` |
| Current Lighthouse budgets |**exit1 / OPEN gate**: Me performance78<80, other7 routes82–87; all8 accessibility/best-practices100. No unmeasured categories, no lowered thresholds. | `/tmp/t100-lighthouse/summary.json`, `/tmp/t100-lighthouse.log` |

This is **not all-green release readiness**. Me budget failure is inherited and persists on the current branch; no Me production code was changed here. Current Me LCP5.18s is `#acctPitch` (4.73s render delay), TBT0ms, CLS0; source also redraws the full Me body after hub readiness. Those observations motivate an initial-load investigation, not proof of a specific performance cause/fix. Do not optimize by hiding required privacy copy or waiving the80 budget. Existing App1 CI has separate inherited Tonight77/Me79 failures; API1 CI58 tests has16 failures due missing test-only SESSION_PEPPER. No live outage is inferred from CI configuration.

Individual exits from the serial suite are retained in `/tmp/t100-suite-exits.txt`: the **initial** upgrade attempts show1/1 before the harness navigation fix; the final upgrade logs/exits above are the reruns. The final engine/unit/full UI code is unchanged across those reruns. The serial shell wrapper continuing after each command is not itself a claim that every suite passed.

All browser fixtures are fictional/fresh and production API is mocked/blocked; new hardening/foundation/update harnesses block every nonlocal HTTP request. No real account, private inventory or recovery key captured. Automated axe/target/overflow checks are not human screen-reader/real-device validation. Known C8 remains visible; C9 remains an owner choice. See retained historical notes below for the earlier intermittent account-fixture timeout: no threshold was raised and no unproven fix is claimed.

### Reproduce this branch (no build)

Serve on its own port, not the old8370 worktree:
```sh
python3 -m http.server 8371 --bind 127.0.0.1
node --test tests/data/*.test.mjs
node tests/engine_equivalence.mjs
/workspace/pwenv/bin/python tests/e2e.py http://localhost:8371/
/workspace/pwenv/bin/python tests/journeys/run.py --base http://localhost:8371/ --out /tmp/t100-journeys --media /tmp/t100-journeys-media --no-video
/workspace/pwenv/bin/python tests/journeys/lighthouse.py --base http://localhost:8371/ --out /tmp/t100-lighthouse
/workspace/pwenv/bin/python tests/journeys/release_audit.py --base http://localhost:8371/ --out /tmp/t100-release-audit
/workspace/pwenv/bin/python tests/clutter/run_audit.py --base http://localhost:8371/ --out /tmp/t100-clutter
/workspace/pwenv/bin/python tests/hardening_smoke.py http://localhost:8371/ --shots /tmp/shots-launch-hardening
/workspace/pwenv/bin/python tests/foundation_smoke.py http://localhost:8371/ --shots /tmp/shots-launch-hardening/foundation
/workspace/pwenv/bin/python tests/now_smoke.py http://localhost:8371/ --shots /tmp/shots-launch-hardening/now66
# Archive each unchanged old version into a NEW empty temp directory first:
# git archive ca65af439f232d8eea7c8301d234b9b8e73f768f | tar -x -C /tmp/arsenal-hardening-sw65
# git archive 0f40a4af09518656bde980e80af63fe96494541c | tar -x -C /tmp/arsenal-hardening-sw64
/workspace/pwenv/bin/python tests/sw_foundation_upgrade.py --from-version 65 --legacy-root /tmp/arsenal-hardening-sw65 --current-root "$PWD" --shots /tmp/shots-launch-hardening
/workspace/pwenv/bin/python tests/sw_foundation_upgrade.py --from-version 64 --legacy-root /tmp/arsenal-hardening-sw64 --current-root "$PWD" --shots /tmp/shots-launch-hardening
# Read-only API checkout, pure tests only (no server/DB/network):
# cd /workspace/arsenal-pro-api && node --test test/specs.test.mjs
```

For both human segments and S1/S2/S3 use RELEASE_READINESS and the retained scripts below; no participant outcome is claimed. Original v65 screenshots/evidence remain preserved below.

### Current360px screenshots — exact files

Manifest: `/tmp/shots-launch-hardening/manifest.json` (35 PNGs, actual width360 checked, dimensions+SHA256+synthetic fixture labels).01 is before;02–07 after;08/09 offline upgrades; foundation/Now captures rerun on66. All private-code tools stayed closed, no real user inventory or secrets.

- `/tmp/shots-launch-hardening/01-before-catalog-title.png`
- `/tmp/shots-launch-hardening/02-after-catalog-title.png`
- `/tmp/shots-launch-hardening/03-after-long-copy-title.png`
- `/tmp/shots-launch-hardening/04-after-unbroken-title.png`
- `/tmp/shots-launch-hardening/05-checksum-blocked.png`
- `/tmp/shots-launch-hardening/06-conflict-staged.png`
- `/tmp/shots-launch-hardening/07-safe-additive-restore.png`
- `/tmp/shots-launch-hardening/08-v65-to-v66-offline-upgrade.png`
- `/tmp/shots-launch-hardening/09-v64-to-v66-offline-upgrade.png`
- `/tmp/shots-launch-hardening/foundation/01-empty-search.png`
- `/tmp/shots-launch-hardening/foundation/02-two-copy-review.png`
- `/tmp/shots-launch-hardening/foundation/03-distinct-owned-copies.png`
- `/tmp/shots-launch-hardening/foundation/04-physical-copy-details.png`
- `/tmp/shots-launch-hardening/foundation/05-owned-targeting.png`
- `/tmp/shots-launch-hardening/foundation/06-local-only-status.png`
- `/tmp/shots-launch-hardening/foundation/07-unmodeled-manual-ball.png`
- `/tmp/shots-launch-hardening/foundation/08-legacy-preserved-review.png`
- `/tmp/shots-launch-hardening/foundation/09-offline-owned-arsenal.png`
- `/tmp/shots-launch-hardening/foundation/10-explicitly-packed-copies.png`
- `/tmp/shots-launch-hardening/now66/active-scoring-no-extras.png`
- `/tmp/shots-launch-hardening/now66/armory-earned.png`
- `/tmp/shots-launch-hardening/now66/armory-milestones.png`
- `/tmp/shots-launch-hardening/now66/armory-next-up-line.png`
- `/tmp/shots-launch-hardening/now66/armory-next-up.png`
- `/tmp/shots-launch-hardening/now66/armory-offline.png`
- `/tmp/shots-launch-hardening/now66/ball-maker-model.png`
- `/tmp/shots-launch-hardening/now66/ball-specs.png`
- `/tmp/shots-launch-hardening/now66/compare-model.png`
- `/tmp/shots-launch-hardening/now66/lane-baseline.png`
- `/tmp/shots-launch-hardening/now66/lane-summary-full.png`
- `/tmp/shots-launch-hardening/now66/lane-summary.png`
- `/tmp/shots-launch-hardening/now66/lane-unverified.png`
- `/tmp/shots-launch-hardening/now66/step-preview-planning.png`
- `/tmp/shots-launch-hardening/now66/target-model.png`
- `/tmp/shots-launch-hardening/now66/tests-usage.png`

### Migration / recovery / rollout

No schema/foundation migration change: v1 review snapshot/idempotency and append-only review Undo retained. Fresh empty remains empty, old confirmed bags/IDs/aims/layouts/profile/history are not inferred/replaced. Restore now refuses any change/removal of current factual projections before writing; serialized appends reject stale preview state. Before-event checkpoints are durable-backend-first and exported; quota failure aborts append. No local deletion/whole-key restore or automatic Undo was added. Auth/metadata from incoming files never changes account binding or destination. Preferences/nonempty mirrors remain incomplete rather than silently overwriting user data.

SW v66 precaches the atomic cache-first shell, activates through the explicit Refresh action and removes network caches only, not IndexedDB/localStorage. Waiting-worker tests verify64/65→66, current guard module rather than stale cache, original IDs/layout/PAP/aims, migration state, asset-navigation behavior and offline cold launch. Initial never-loaded installation still needs internet. Rollout remains owner-approved controlled PWA beta only after durability/recovery/human gates, not a merge instruction. On data/privacy failure pause rollout, keep original local/export/checkpoints; prefer a forward corrective release, never blindly roll back to pre-privacyv64 or wipe/rebind data. Manual checkpoint extraction to a clean isolated fixture has event-level test evidence, not a full preferences/device-recovery sign-off.

---

# Historical PR4 Phase 1 evidence (v65)

The following results/commands/screenshots are retained as PR4 history, not current-v66 instructions. Use the current commands above on this branch.

6 November 2026 (historical PR4 evidence; Europe/Zurich). Isolated worktree/branch `launch-foundations-phase1`, stacked on unmerged app PR #1 `now-list-and-catalog-fixes` (`0f40a4a`). Earlier docs PRs #2/#3 are unchanged. Companion API PR #1 remains unmerged; this task changes no API code or live database. No merge, deployment, real account creation, outreach or spend.

This is a **PWA beta foundation**, not a claim of general launch, native-store readiness, physical accuracy or human usability validation. The original owner's browser/inventory was not opened; preservation is demonstrated on synthetic prior-bag/history fixtures, not an asserted inspection of their private device.

## Implemented / deferred matrix

| Requirement | Delivered evidence / boundary |
|---|---|
| General app / empty first install | Fresh projection owns zero; skip stays zero. Whole finite shared catalog (165 distinct entries: 22 references + 143 manufacturer rows) searchable locally with existing fuzzy search and strict brand filtering. It is not every ball ever made. Review multiple selected physical copies, name each, explicit save, or manual name-only unknown. Optional maker/typed and existing scan routes linked, no OCR expansion. |
| Physical copy identity | UUID owned IDs, separate from catalog model IDs. Two copies retain names/layout/surface note, independently saved Target/Lane lines and reopening. Bag has explicit Start empty → Bring → Pack (addition never auto-packs). Games already use owned IDs; retained and regression-tested. Old model-only history remains, not guessed onto duplicate copies; health/results consumers no longer alias it. Unsupported specs have no path; provenance distinguishes maker/user/unknown. |
| Existing users / ambiguity | Foundation v1 saves raw legacy inputs + original event IDs. Explicit old nonempty selection/bag is preserved without forced review. Ambiguous old empty/all22 view is retained pending explicit review, never converted automatically into 22 owned balls. Review adds only a stable import batch; Undo is append-only. No event/key/data wipe; ownership-only mirror writes do not re-label measured bowler facts. |
| Privacy | No private legacy HTTP dual-write. Default local-only; optional code sync is explicit consent in an unbound browser. Signout/expiry keeps local data and pauses; no fallback, identity/destination swap or code copy. One private account binding per browser, recovered from prior account stream; foreign activation/pull/push and conflicting metadata fail closed. Session ends locally before network revocation. In-flight responses are ignored after target/session change; already-sent authorized requests cannot be undone. |
| Full account switching | **Deferred** full namespaced multi-account workspaces. Blocking B from A's browser is the safe Phase1 boundary, not a working switcher. No reset/rebind/wipe shortcut. After account deletion the retained local binding still blocks another account; local core/export remain available pending a reviewed workspace design. |
| Neutral profile | Unknown hand/style/speed/revs/PAP/tilt unless entered. Model controls remain labeled assumptions. Confirmed old profile values and provenance retained. No owner inference from username/UA/global defaults. |
| Recovery status | Local-only/paused/pending/server acknowledged status; retention is not a guarantee. Download backup, Import and existing recovery tools reachable. File date updates only through Download backup, not a copied code; it is not proof an OS file was retained. Foundation snapshot/review evidence included in backup, never session tokens/sync authorization. |
| Recovery completeness | **Deferred** preference application/nonempty local-mirror reconciliation on restore. Export contains prefs/snapshot; restore appends validated events and only fills empty mirrors. Do not market a full preference/device clone. Original event histories remain recoverable; validate specific restore scenarios before widening beta. |
| QR | Existing model/spec QR flow and saved custom-spec lookup remain regression-tested. A QR is not private physical identity or ownership transfer. Unknown name-only models without a shared catalog entry are not fabricated into a known QR; expanded custom/instance QR is deferred. |
| Engine/catalog | `simulatePath`, whole engine, catalog numbers and v64 equivalence fixture unchanged; no baseline regeneration. Source/provenance presentation only. |
| Remaining planning UX | Lane quick strip remains legacy reference models; physical/custom copies use My bag picker/details. Owned-first quick shortcuts and clearer unknown-style wording for legacy Bag/Advisor heuristics are Next. Unknown profile is not filled from those model assumptions. Inherited Ball appbar title ellipsis was open in PR4; fixed in the current follow-up above without changing its probe. |
| Not in this phase | AI chat unnecessary/deferred; no new backend, paid AI, photos, Engine v2, native packaging/submission, legal approval or community operations. Old Friends/earned-only/local flags retained; no scoring extras/streaks/rankings. |

## Fresh findings and evidence standard

[TEAM_PROMPT_CEO_LAUNCH.md](TEAM_PROMPT_CEO_LAUNCH.md) is the reusable brief, with roles/lenses, two-week milestones, impact/effort/confidence 1–5, dependency gates, stop conditions and release checklist. [LAUNCH_FOUNDATION_AUDIT.md](LAUNCH_FOUNDATION_AUDIT.md) records F1–F19 against real source, including rejected inherited claims: the baseline event log did **not** automatically seed22, and PAP/hand were **not** personally prefilled. The actual all22 bug was the empty-profile UI sentinel; actual privacy flaws included both outbox fallback and a separate legacy dual-writer.

New runtime examination also found cold-load Insights readiness, quick-reload debounce/hydration, At-home-only first-bag dead end and custom-number provenance issues. Final diff review also removed redundant HTML-escaping from the plain-text Lane heading; a literal `<copy> &` nickname regression checks both text rendering and escaped button HTML. Fixes retain engine/catalog data. Four intended Ball/Me visual references (360/414) were visually reviewed and refreshed; other24 and the0.02 tolerance are unchanged. The line-equivalence e2e selects a physical ID rather than an ambiguous shortened label, retaining all numeric parity assertions.

## Test results (local, production API mocked/blocked)

Results below are from local runs in this workstream. Unit/foundation/full e2e were rerun after ownership/provenance and nickname corrections; the final SW direct-asset follow-up reruns its upgrade regression and the journey report. Diagnostic failures during implementation exposed actual bugs and obsolete identity/sync contracts; they were not treated as passed results.

| Suite | Final result | Evidence on this box |
|---|---|---|
| Unit/data | 326 passed,0 failed,1 skipped (327 total); private LaneTrax sample intentionally absent | `/tmp/launch-unit-final.log` |
| Engine equivalence | 7,500 comparisons /0 mismatches; baseline unchanged | `/tmp/launch-equivalence-final.log` |
| Full e2e | 763 passed /0 failed (serial; earlier timeout disclosed below) | `/tmp/launch-e2e-serial.log` |
| Journeys + visual | 121 step passes,0 step failures,1 known C8,0 skipped; **1 open failed flow probe** (inherited Ball title ellipsis), so suite exit1/not fully green;28 visual comparisons pass unchanged0.02 tolerance | `/tmp/launch-journeys-release.log`, `/tmp/launch-journeys-release/index.html` |
| Release/a11y | 82 route/viewport/empty-or-seeded checks,0 issues;60 cold requests /548 kB (local uncompressed harness) | `/tmp/launch-release-audit-release/audit.json` |
| Clutter | 38 views at360/414px,0 runtime errors; no new active-score-pad content | `/tmp/launch-clutter-release/` |
| New foundation acceptance | PASS: empty/strict search/review/two copies/edit/explicit pack/Target/save/reload/manual/neutral/local-only/legacy undo/offline;44px/360px/axe checks clean | `/tmp/launch-foundation-release.log` |
| Local S1/S2/S3 | PASS both rendering arms, earned-only/Old Friends, default-off Next up, local counters, no pad extras, offline v65 | `/tmp/launch-now-release.log` |
| Actual v64→v65 waiting-worker update | PASS explicit activation/reload, original IDs/layout/PAP/hand/aims retained, review/local-only status, then offline cold launch | `/tmp/launch-sw-upgrade.log` |
| API | Not touched; no new API test claim. Companion MOTIV PR remains separate and unmerged | Existing API PR #1 |

Accessibility evidence is automated axe serious/critical, target bounds and horizontal overflow checks at360px; it is **not** a screen-reader or physical-device certification. Foundation captures check each changed flow, duplicate editing/Target, manual unknown, legacy undo and local-only status. Full e2e includes offline/scoring/export/QR. No participant experiment or real account test was run. One parallel full e2e run reported755 passes and an account-fixture15s second-device wait timeout. Its isolated account re-run passed19/0; the serial full re-run is reported above. The journey text footer excludes flow-probe failures: the prior JSON had3 (inherited Ball title ellipsis plus J11 console/request404s). Fresh tracing found overly broad SW navigation fallback serving HTML at the wipe harness asset URL; scope was corrected and a direct-asset upgrade assertion added. Final JSON confirms J11 console/request probes are clean and only `probe/ball/truncation` remains (`h1.title` Radical Rattler Big Bite, inherited `css/app.css:76` ellipsis). Suite exit1 is reported honestly; this probe is not silently relabeled as passed or added to allowed known issues. Root cause of that intermittent account timeout is not proven; do not call it a fixed production defect or hide it by increasing thresholds. Keep real-device/account validation gated.

### Reproduce

Serve the static tree locally (no build): `python3 -m http.server 8370 --bind 127.0.0.1`. Use local isolated browser profiles. Existing harnesses intercept the production API; the new foundation/update harnesses block all nonlocal HTTP. Never run against a real account or reuse private browser storage.

```sh
node --test tests/data/*.test.mjs
node tests/engine_equivalence.mjs
/workspace/pwenv/bin/python tests/e2e.py http://localhost:8370/
/workspace/pwenv/bin/python tests/journeys/run.py --base http://localhost:8370/ --out /tmp/launch-journeys --media /tmp/launch-journey-media --no-video
/workspace/pwenv/bin/python tests/journeys/release_audit.py --base http://localhost:8370/ --out /tmp/launch-release-audit
/workspace/pwenv/bin/python tests/clutter/run_audit.py --base http://localhost:8370/ --out /tmp/launch-clutter
/workspace/pwenv/bin/python tests/foundation_smoke.py http://localhost:8370/ --shots /tmp/shots-launch-foundation
/workspace/pwenv/bin/python tests/now_smoke.py http://localhost:8370/ --shots /tmp/shots-launch-now65
# Archive the unchanged v64 base into an EMPTY temporary directory, never a shared worktree:
mkdir -p /tmp/arsenal-launch-sw64
git archive 0f40a4af09518656bde980e80af63fe96494541c | tar -x -C /tmp/arsenal-launch-sw64
/workspace/pwenv/bin/python tests/sw_foundation_upgrade.py --legacy-root /tmp/arsenal-launch-sw64 --current-root "$PWD" --shots /tmp/shots-launch-foundation
```

## Migration / privacy guarantees and limits

1. `data/foundation.js` stamps `foundationV:1` last, retains the first `foundationSnapshot` of legacy raw keys/event IDs, and never mutates existing events. Re-running is a no-op. Explicit old22 fixtures retain the same projection hash, IDs, bag and layout/history. No permission was assumed to inspect, rewrite or infer the actual owner's inventory.
2. `cc/ownership.js` uses stable reviewed owned/event IDs within envelope/API limits. Failed backend append cannot acknowledge ownership; retry dedupes. UI verifies event presence before success. Partial save remains reviewable/retryable; local memory fallback warns it lasts only this tab. A hard OS/browser kill or cleared/quota-exhausted storage cannot be promised safe.
3. `hub.undoOwnershipReview()` appends `import.voided` only for the confirmed review batch, restores only the old ownership mirror (no bowler edit or provenance churn), keeps current confirmed PAP/hand/profile fields, games/layouts/history/aims. No deleting events or replacing the whole database. Older snapshot metadata remains in downloaded backup even after reversal.
4. Account binding is a privacy boundary, not a login hint. UI auth waits for initialization; foreign login is rejected before saving its session and unused token revocation is mocked. Core tests prove no foreign event fetch, account→code fallback, retargeting on401/signout or in-flight response acknowledgement. Conflicting binding metadata pauses all destinations.
5. Prior releases may already have copied data to legacy code streams or mixed records. This branch does **not** prove retroactive cleanup or untangle ambiguous data. No remote copy was deleted, no DB mutation/test account made. Owner-approved inventory/export/remediation is separate.
6. Backup files contain private history and may contain legacy preference/snapshot text. Keep them private. They exclude session credentials and never authorize/restore a sync target. Event checksum does not certify unsigned auxiliary prefs/snapshot metadata; inspect and validate before any future preference-apply feature.

## SW / rollout / recovery

SW bumped exactly once v64→**v65**. Install precaches a complete cache-first shell using reload requests; UI/migration modules stay within that installed release. API calls are excluded. Activation deletes only old `arsenal-pro-` network caches, not IndexedDB/localStorage. Update is explicit Refresh, no offer on an active score pad; no automatic deployment occurred. First-ever loading still needs a connection; cached local tools/catalog then work offline. OCR remains separately lazy and may need re-download after a version change.

Release sequence: review stacked PR and dependencies → owner approval → durable-service/recovery gates → controlled PWA beta → real-device/human validation. Do not merge/deploy merely because tests pass. If migration/privacy fails, pause rollout and retain local export access. Prefer a forward corrective release with new SW version; **do not blindly roll back to v64**, which has automatic legacy sync/privacy behavior. Roll back the explicit review via Undo, not by wiping storage. Snapshot/whole-key restoration requires a separately reviewed recovery operation; no automatic destructive rollback is supplied.

## Acceptance smoke scripts (human validation NOT YET RUN)

Use fictional inventory and disposable local/mocked contexts. Do not collect real recovery keys. Record actual times/errors; ≤60 seconds is only a target.

**Segment A — casual / low-tech league bowler**
1. Fresh360px install shows0 owned; explain catalog≠ownership. Skip and reopen Add balls from Me; skip must remain empty.
2. Time finding one correct brand/variant (include a typo), select/review/save. First correct physical ball≤60s target; ask what was saved and where. Add is At home, not packed.
3. Bag → Start empty → open Why not the others → Bring chosen ball → Pack. Start scoring; verify no new cards/coach overlays during the active pad. Save/reopen a game locally.
4. Me says local only; download a backup, restore into a separate clean local fixture and inspect the ball/game. Explain incomplete preference/mirror recovery; do not claim a complete phone clone.
5. Reload offline after initial cache; catalog/search/manual add and prior history work. Ask how they would recover after phone loss and whether account is required (it is not). Record comprehension/pressure, not a score against other bowlers.

**Segment B — competitive / multi-ball bowler**
1. Select three models and a second physical copy of one. Review distinct names; save and set different layout/surface notes. Unknown specs stay unknown; no layout physics is inferred.
2. Bring only chosen copies, Pack; confirm distinct owned IDs through details, Bag, Target/Lane and saved game attribution. Save different aims per copy, quick reload and reopen; old catalog-only history is labeled separately, never assigned by guess.
3. Open existing QR for a shared model: it pre-fills model facts only, does not clone private ownership. A manual unknown ball must show no model path and no invented shared QR identity.
4. In mocks only, sign into A with explicit local-data choice; keep-data signout/expiry must say local-only and issue no code-stream request. Attempt B on the same browser must be blocked; A history remains. A separate clean browser/account is a different test, not proof of same-device workspace support.
5. On a legacy fixture, capture IDs/hash/profile/aims → upgrade → review additions → Undo. Original bag/history/layouts/PAP/aims stay. Repeat initialization/retry without duplicates. Download backup before any separately approved recovery experiment.

**Retained S1/S2/S3**: Me→Tests and usage (`#/me/usage`), opt into one local test at a time or set the exposed local flag; no participant results exist. S1 compare Lane summary vs baseline with chips in both, open numeric fold. S2 compare next-ball preview vs short controls outside scoring, tap a switch and inspect local counts; active pad stays short. S3 Next up stays off by default; opt in to at most one idea after an earned starter action and undo it. Full procedures/arm assignment/reset/metrics: [SMOKE_TESTS.md](SMOKE_TESTS.md). `tests/now_smoke.py` checks both rendering arms offline; local counters are not telemetry.

## Screenshots / exact files

All final phone captures use a360×800 viewport (full-page image heights vary), fictional test inventory, no real credentials/recovery keys. No screenshot of an open backup-code section. Manifest: `/tmp/shots-launch-foundation/manifest.json`.

- `/tmp/shots-launch-foundation/01-empty-search.png`
- `/tmp/shots-launch-foundation/02-two-copy-review.png`
- `/tmp/shots-launch-foundation/03-distinct-owned-copies.png`
- `/tmp/shots-launch-foundation/04-physical-copy-details.png`
- `/tmp/shots-launch-foundation/05-owned-targeting.png`
- `/tmp/shots-launch-foundation/06-local-only-status.png`
- `/tmp/shots-launch-foundation/07-unmodeled-manual-ball.png`
- `/tmp/shots-launch-foundation/08-legacy-preserved-review.png`
- `/tmp/shots-launch-foundation/09-offline-owned-arsenal.png`
- `/tmp/shots-launch-foundation/10-explicitly-packed-copies.png`
- `/tmp/shots-launch-foundation/11-v64-upgrade-offline.png`

Additional retained Now screens: `/tmp/shots-launch-now65/` (S1/S2/S3); journey and clutter media are local QA artifacts, not human evidence.

## Remaining owner gates

- Confirm Render workspace/deadline and a durable DB/backup plan; inherited owner context says15 November2026,9:08 PM ET, **not reverified** here. No upgrade/spend. Cross-device/service durability remains a release blocker.
- Accept or change Phase1's one-account-per-browser boundary; prioritize full namespaces and safe recovery/rebinding after deletion, not data wiping.
- Complete preference/restore reconciliation and real iOS Safari/PWA/Android lifecycle, storage/quota, screen-reader/keyboard and offline/update rehearsals. Formative≤60s/comprehension/pressure tests remain unrun.
- Address the inherited Ball title-ellipsis flow probe before claiming clean journey validation; no threshold/known-issue waiver was added.
- C8 total-only teammate entry is a known journey limitation; C9 private earned score milestones remains an owner decision. Earned-only shelf/Old Friends retained, no expansion.
- Review earlier app/API/docs PRs separately, catalog unknowns, source terms and eventual native/legal/support/deletion/community obligations. No generated policy here is approved launch-ready. AI chat is not a Phase1 dependency.
