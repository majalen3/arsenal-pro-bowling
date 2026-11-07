# Release readiness — no public launch / no merge authorization

7 November 2026, Europe/Zurich (CET). This is technical evidence plus owner gates, not a legal/privacy/security certification. One owner + AI, two-week milestones; no added infrastructure or operations. Current scope is a **PWA beta foundation**, not native-store readiness. No merge, deployment, paid change, live account/DB write, production-data export or store submission performed.

## PR stack and CI snapshot

| PR | Base → head / current state at inspection | Merge dependency / gate |
|---|---|---|
| [App1](https://github.com/majalen3/arsenal-pro-bowling/pull/1) | main → now-list-and-catalog-fixes `0f40a4a`, OPEN; ui green, journeys red | Technical base. Inherited Lighthouse tonight77/me79 below80; do not hide/waive budgets. |
| [App2](https://github.com/majalen3/arsenal-pro-bowling/pull/2) | now-list-and-catalog-fixes → gap-analysis-2 `f9b20af`, OPEN; ui green | Review after1; analysis branch, not deployed feature proof. |
| [App3](https://github.com/majalen3/arsenal-pro-bowling/pull/3) | gap-analysis-2 → launch-plan-1 `1b6fd7b`, OPEN; ui green | Depends on2; planning is not native/legal approval. |
| [App4](https://github.com/majalen3/arsenal-pro-bowling/pull/4) | now-list-and-catalog-fixes → launch-foundations-phase1 `ca65af4`, OPEN; ui green | Depends on1, not on docs2/3. |
| Current hardening follow-up | launch-foundations-phase1 → launch-recovery-hardening | Stacked on actual4 head, not main; new PR/check status recorded in delivery. |
| [API1](https://github.com/majalen3/arsenal-pro-api/pull/1) | main → motiv-lookup `8691719`, OPEN; api-tests red | Separate MOTIV deployment dependency, **not merged/deployed**. CI must be fixed/re-run in a separately reviewed API change. |

Every merge/deployment still needs owner approval. After each approved dependency merge, retarget the next PR as appropriate without rewriting pushed commits, then re-run integration checks on the resulting stack. Docs2/3 are a parallel review chain, not prerequisites to modify4. Do not merge4/follow-up to bypass1’s red gate. The journeys workflow currently filters PRs to main: stacked ui-green is not proof hosted journeys/Lighthouse ran on4 or this follow-up.

API red cause is verified from run42235100294:58 tests,42 pass/16 fail, account/team requests503 with “SESSION_PEPPER missing”. `server.js:330,347` intentionally gates those routes; `.github/workflows/test.yml:18` starts without it. Proposed **test-only** CI env: synthetic SESSION_PEPPER of≥32 characters, `RL_SIGNUP=1000 RL_TEAM_CREATE=1000 RL_TEAM_JOIN=1000 RL_TEAM_JOIN_IP=1000 EVENT_QUOTA=50`, local Postgres only; preserve login-rate assertions and add `pg_isready -U u -d t`. Do not change live pepper or weaken production rate limits. API repo stayed read-only. Pure local MOTIV/spec tests16/0, exit0; this does not make the58-test integration suite green. App1 run42236497923 separately failed Lighthouse; its budgets were not loosened.

## Ship / no-ship gates

| Gate | Current disposition / next owner action |
|---|---|
| Empty/search/private identity | Locally tested0 owned /165 finite searchable models, distinct copies, neutral profile, explicit Bring/Pack; no auto-owner seed. Not a universal catalog or human60-second result. |
| Existing data and privacy | Versioned PR4 snapshot/review/append-only Undo retained. New guards block destructive/corrupt/conflicting restores and stale auth resurrection/401; synthetic fixtures only. No real owner inventory opened. One account per browser, foreign switch blocked; no rebind/reset shortcut. |
| Recovery | **NO full-device recovery claim.** Events can restore additively; preferences/nonempty mirrors are incomplete. Conflicts stay staged. Before-data checkpoints are retained/exportable but no automatic restore Undo; checkpoint extraction/reconciliation, large-file/quota behavior and human recovery rehearsal remain gates before widening beta. Never delete local data to resolve a conflict. |
| Backend durability | **BLOCKED** until actual workspace/plan/creation/expiry verified and owner chooses authorized preservation + hosting/recovery. Prior15 November date is **unverified**, not a newly established deadline. |
| Regressions | **OPEN performance gate:** current Lighthouse Me78<80 (exit1); other7 routes82–87, all8 a11y/best-practices100. Unit342/0+1 skip, equivalence7,500/0, e2e763/0, journeys121/0+1 known/0 failed probes/28 visuals, a11y82/0 and clutter38/0 pass. Exact exits in LAUNCH_FOUNDATION_VALIDATION. Remote checks remain separate; parity is not physical accuracy. |
| Real users/devices | Both segment scripts below, iOS Safari/installed PWA and Android, screen readers/keyboard/large text, storage eviction/quota/OS kill, cross-tab auth and two-phone recovery remain human/device gates. |
| Open product choices | **C8** total-only teammate entry remains a known limitation; **C9** private earned score milestones vs dropping them needs owner decision. No new milestone/leaderboard/streak scope. |
| Legal/privacy/community | Owner must approve actual support identity/resources, privacy/retention/deletion disclosures, source/dependency terms and My Team moderation scope/operations. Existing availability/compliance not newly certified. No placeholder policy is marked approved; no trademark clearance assertion. |
| Native stores | Deferred: packaging/signing, SDK/bridge/CSP, origin/storage transfer, platform deletion/support/privacy declarations and UGC requirements. Current policies must be checked when that separate track starts; no store enrollment/submission now. AI chat is unnecessary for Phase1 and deferred. |

## Database decision — blocker

Read-only API config declares Free DB/web; **live plan/creation/expiry/backups unverified**. Prior15 November date is not confirmed. Public Render docs opened7 November2026 (Europe/Zurich): Free PG expires30 days after creation,14-day upgrade grace then deletion; no platform backups/PITR. No production records/credentials accessed.

Options, all **unapproved**: keep a limited local-only beta without cloud-durability promises; authorize a private manual full-DB export/rehearsal while accessible (not durable hosting); or paid PG from$6/month **plus$0.30/provisioned GB/month**, Hobby workspace$0, paid3-day PITR/logical exports. Optional always-on web+$7/month; Pro workspace+$25 for7-day PITR, not required just to pay for DB. Current size/minimum/tax/usage not verified; no fixed total quote. Per-account export is not a full DB backup or tested app Import format. See [DATABASE_PRESERVATION_OPTIONS.md](DATABASE_PRESERVATION_OPTIONS.md) for precise repo coverage, sourced formulas and authorization/recovery sequence. No purchase/change/export performed.

## Both-segment smoke / recovery acceptance (human NOT RUN)

- Casual/low-tech: fresh0, skip0; find exact model with a typo/brand, review/save one copy (≤60s **target**, record actual failure/time); Bring/Pack; score with no overlays; reopen offline. Explain “saved here” vs downloaded file vs optional account; private export → separate clean fixture restore. Corrupt/conflicting backup must remain disabled; original bag/history unchanged.
- Competitive/multi-ball: three models +two physical copies, different names/layout/surface/aims, explicit bag packing, correct ID in details/Target/game; legacy fixture captures all original22/IDs/layouts/history before upgrade/review/Undo. Long names readable at360px. In mocks sign out while login is delayed, return old401 after new session, try foreign B: no resurrection, code fallback or data copy. Nonempty conflict stages/no writes; download before-data, recover in a separate clean local fixture without applying identity/prefs silently.
- Retained S1/S2/S3: `#/me/usage`, one local flag at a time; S1 Lane summary both arms keep chips; S2 next-ball preview outside scoring +feet/eyes hint; S3 Next up defaultOFF, ≤one opt-in idea/earned-only/Old Friends. Run `tests/now_smoke.py`; [SMOKE_TESTS.md](SMOKE_TESTS.md) has flag/reset/counter procedures. Counters local, no participant outcomes/telemetry.

Recovery is conservative: retain original local data/files/checkpoints; blocked restore needs no Undo because no events are written. For an additive restore, download backup and retain `restoreCheckpoints[n].backup` as the before-event copy; extraction into standard backup-v1 and any preference/whole-key application is a separately reviewed recovery step in a **clean isolated profile**, not a one-click destructive rollback. Never use a wipe/rebind to force recovery, never promise cross-account migration. Pause rollout on privacy/data mismatch; prefer a forward corrective SW release rather than returning to pre-privacyv64. Owner approval remains required for all merges, deployments, spend and live operations.
