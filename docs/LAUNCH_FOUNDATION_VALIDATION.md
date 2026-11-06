# Launch foundations Phase 1 — technical validation

6 November 2026 ET. Isolated worktree/branch `launch-foundations-phase1`, stacked on unmerged app PR #1 `now-list-and-catalog-fixes` (`0f40a4a`). Earlier docs PRs #2/#3 are unchanged. Companion API PR #1 remains unmerged; this task changes no API code or live database. No merge, deployment, real account creation, outreach or spend.

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
| Remaining planning UX | Lane quick strip remains legacy reference models; physical/custom copies use My bag picker/details. Owned-first quick shortcuts and clearer unknown-style wording for legacy Bag/Advisor heuristics are Next. Unknown profile is not filled from those model assumptions. Inherited Ball appbar title ellipsis at360px remains an open visual probe; full accessible title is retained, visual wrapping is Next. |
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
