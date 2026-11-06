# Onboarding audit 1 — Your balls, not the owner's starter list

Date: 6 November 2026 (ET). Analysis and proposed work only.

## Decision

A new bowler starts with **zero owned balls** and searches the entire available catalog, regardless of brand. The owner's 22 built-in models remain searchable catalog/demo records, never an auto-owned bag. Preserve the owner's actual stored arsenal and every other existing user's data. “Everywhere” means a brand-neutral discovery flow with maker lookup and manual fallback, not a promise that the current catalog contains every ball ever made.

## Evidence and completion limits

This is a desk audit of the existing, code-grounded `docs/GAP_ANALYSIS_2.md` and `docs/DECISIONS.md`, read on 6 November 2026 ET. Their audited application baseline is app PR #1 (`now-list-and-catalog-fixes`, `0f40a4af09518656bde980e80af63fe96494541c`) plus docs PR #2 (`gap-analysis-2`). They are **not proof of the deployed site's current behavior**. Source paths/line references below are inherited from that review, not newly verified against app source in this pass. Historical ADRs can be superseded; precedence is noted below.

A fresh exhaustive source/runtime audit is **not completed**: the required CloudAgent repository-investigation tool is unavailable in this executor's tool catalog. No app source investigation, app edits, tests, merge, deployment or production write was performed. Do not mark this document an exhaustive security/de-personalization sign-off. A follow-on cloud audit must verify every listed path and search for additional owner-specific values, demo games, aim/PAP defaults and seed paths before implementation/release. This limitation must stay visible when these drafts are added to the repository.

## 1. First-run path documented by the previous audit

| Step | Existing path | Documented behavior / consequence |
|---|---|---|
| Entry | `js/main.js:59–60` | Existing profile or legacy `ap_state` skips first-run; redirection only with no hash. A deep link/QR can bypass the intro. |
| Wizard | `js/screens/welcome.js:19–25,35` | Three steps: hand/style; speed/revs; toggle the 22 built-in models. No search, all selected by default. |
| Legacy ownership | `js/screens/pickers.js:14`; `js/screens/more.js:74` | `ap_profile.owned = []` means “all 22,” not an empty arsenal. |
| Bridge to event log | `js/hub.js:33–38` | Only adds selected ownership, never reconciles removals. An all-selected wizard saves an empty array which does not generate 22 owned events. |
| New ownership system | `js/data/project.js:21–43`; `js/cc/addball.js:ownedEvent` | `ownedBall.created/edited` builds physical instances in `P.owned`; this starts empty. Two competing ownership meanings exist. |
| Discover more balls | `js/cc/addball.js:catalog,search`; `js/screens/addball.js:42–70` | Search already normalizes aliases/Roman numerals and fuzzy tokens. Previous measured inventory: 22 built-ins plus 143 maker rows = 165 searchable records. This is a snapshot, not universal coverage. |
| Pick → confirm | `js/screens/addball.js:80–115,213–220` | Picking may immediately start maker lookup and wait up to 25 seconds; dense specs/comparison/grid before save; newly saved balls are At home. |
| Reopen | `js/screens/ball.js:21–28`; `js/screens/arsenal.js:34–38`; `js/store.js:restoreState,applyLine` | Built-in-only resolution on some paths; added model goes back to Bag; duplicate model detail may pick the first physical instance. |
| Durability | `js/data/idb.js`; `js/data/db.js`; `js/data/backup.js`; `js/data/sync.js` | IndexedDB → localStorage → memory fallback; full event backup exists. Signed-out sync is not automatically local-only. |

**Main defect:** removing a brand from the wizard or adding more checkboxes is insufficient. Discovery, ownership identity, detail/history and persistence must agree before new-user acquisition.

## 2. Owner-specific / legacy assumptions inventory

Status here distinguishes a prior code finding from historical context needing recheck.

| Surface | Evidence | Classification and target |
|---|---|---|
| All-22 selection/default | `welcome.js`; `pickers.js`; `more.js`; `hub.js` above | Prior source finding, launch-blocking. Empty must mean empty everywhere. Use a versioned explicit setup-complete flag, not array emptiness. |
| 22-model definition | `js/data.js`; catalog review in `DECISIONS.md` “Now list + built-in manufacturer review” | Catalog facts are allowed; membership in this array proves neither ownership nor a usable model. Five models unverified; eight of 22 unsupported for model paths at audited baseline. |
| Owner benchmark / fallback comparisons | `js/screens/addball.js`; ADR #24 says benchmark is Rattler Big Bite and fallback 15 mph / 220 rpm | Historical implementation description; recheck current source. Replace any owner benchmark with the bowler's explicitly chosen owned benchmark; otherwise omit the comparison. Do not infer a benchmark just because a built-in exists. |
| Old personal seed | ADR #17 describes `seed-owner-2026-10-23`, reported bags and owner release/PAP | Superseded by de-brand ADR. Verify runtime imports no longer auto-load this seed for “has history + no owned balls.” Existing history is not proof this phone belongs to the owner. Existing saved seed data must not be erased. |
| Example arsenal | De-brand ADR; `tests/data/fixtures/sample_arsenal.mjs` named as test fixture | Documented current design: explicit example import with 10 catalog balls and two Example bags, undoable and tagged example. This is different from the 22-model catalog. Prefer an isolated read-only demo projection for new onboarding so demo balls never become owned. Existing example imports require review, not automatic deletion. |
| Hand/style/release | De-brand ADR; explicit-hand ADR; `js/cc/hand.js`; `js/engine.js:START` | Documents say style unset; speed/rev fallbacks 16 mph / 250 rpm are generic assumed model inputs, not the owner's 15/220. Hand only set by an explicit touch; unset board convention labeled RH. Verify all entry points preserve that. Ask only when needed for modeling. |
| PAP / tilt / rotation | ADR #7, #17; `js/screens/drillscan.js`; `js/cc/drillcard.js`; bowler projection | Runtime default absence not freshly verified. Unknown stays null; imports/card fields need review and acceptance. Never seed the owner's PAP, tilt or rotation into another bowler. A grip card may not identify a ball at all. |
| Aim / stand / strike line | `js/cc/line.js`; `js/store.js:restoreState,applyLine`; ADR “Aim: feet and target…” | Preserve entered/saved lines. Documented generic start is 12/−4; spare fallback board 20 is an assumption, not personal calibration. Verify owner-specific saved line examples cannot become new-user targets. These are not authorizations to change the frozen engine. |
| Demo games, centers, names, session results | Historical docs and synthetic test-fixture policy | No fresh full-source inventory. Follow-on audit must inspect runtime seeds and import paths, not just text labels. Fresh app must have no games, scores, center or team membership belonging to the owner; test data stays in fixtures/isolated demo. |
| Brand/old owner/team identifiers | De-brand ADR; root assets/manifest/history described there | Current docs say visible owner/team branding removed; older git history retained by owner choice. Verify active UI, exports, manifest, screenshots, sample imports and public support assets; do not rewrite history or delete docs as part of onboarding. |
| My Team, tags, home center, pro shop | `DECISIONS.md` community section | Nothing shared or joined by default. Identity tags are optional side-by-side, never style rankings. These cannot prefill from the owner. |
| Account privacy | `js/data/sync.js:6–8,32–34,80–83`; `js/store.js` legacy dual-writes; `tests/data/account.test.mjs:66–72` | Prior local reproduction: keep-data signout copies account events into backup-code stream. Pause on auth loss; do not silently downgrade. Fix before promising “private account” or default-local behavior. No live cleanup without explicit owner approval. |
| Profile restore | `js/data/backup.js`; `js/hub.js:54–67`; `js/screens/import.js:14–33` | Prior finding: preferences not fully applied; nonempty mirrors may be stale. Define exact restored fields; never restore session secrets/device identity from a backup. |

## 3. Target flow — two simple screens, optional depth

### Entry
- Fresh user: “Add your balls.” One labeled search field, “Brand or ball name.” No account, PAP or rev-rate question first.
- Returning device: visible “Restore my data / Sign in.” Existing installs go directly to their bag, without replaying setup.
- Deep link/kit QR: open the suggested model but never claim it is owned; Save still required. If no arsenal, offer the same short review/save path.
- “Skip for now” opens a useful empty Tonight/Bag state with Add balls and optional Example mode; it does not seed ownership or auto-pack demo balls.

### Search / selection
1. Search the combined built-in + maker catalog locally first, using existing fuzzy matching. A true All brands / one-brand filter constrains results; today's brand selector guides online lookup rather than hard-filtering local results.
2. Show six or fewer results at a time: brand, exact model/colorway, optional release distinction, Add/Selected. Add a route to browse more, so top-six search ranking is not the entire catalog. No unexplained confidence percentage or spec wall.
3. Multi-select across queries and brands; keep selected count and editable tray. Selection is a draft, not a database write. “Add another copy” is explicit because one model may have two physical instances.
4. Optional weight, with Not sure. Unknown weight stays null; never silently apply a 15 lb numeric fact to a different or unknown weight.
5. Not found: explicit “Look on the maker's site” if supported, with time/error/candidate states. Existing Render allowlist/cache/robots controls remain. Never block local save on enrichment; no open URL fetcher or third-party catalog scraping.
6. Always-visible “Add by name”: manual brand/model, unknown specs accepted. Unsupported maker, discontinued product, offline or robots refusal must all terminate in this useful path. Private submissions do not auto-publish to the shared catalog.
7. Scan drill card is optional enrichment after identifying or creating a physical ball. Existing on-device OCR and typed fallback can be reused; it is not promised to recognize brand/model, and handwriting needs manual verification. Do not require a camera permission or 5 MB OCR download to finish onboarding.

### Review / save
- “These are mine”: review names, duplicates and weights; Remove and Keep choosing.
- “Save my balls” commits stable physical `ownedId`s via the existing event log only after write success. A retry/reopen uses an idempotent transaction/import identifier, not fresh instance IDs every attempt. Partial failure must not masquerade as an empty result or double-save; inspect existing append semantics before choosing the implementation.
- Show “Saved on this phone” only for durable storage. Memory-only fallback says “Only until this tab closes” with retry/download options.
- Separate ownership from packing: “Bring these tonight?” is a simple optional next step. Do not auto-promise every newly owned ball is in the active bag.
- Add layout/surface, model inputs, backup file and optional account are secondary after first value. No new element while scoring.

### Both segments, one flow

| Segment | First value | Optional later depth |
|---|---|---|
| Casual / low-tech / one-ball | Type name, pick one, save; can skip weight/specs | File backup, photo/card review, simple night total |
| Competitive / multi-ball | Multi-select across brands, distinguish variants and duplicates, review packing | Weight-specific specs, owned-instance layout/surface history, benchmark, bag roles, imports |

No forced beginner/expert identity, no ranking styles, no “complete your arsenal” shopping pressure, no streaks or locked badges. Targets ≥44 px; bottom action reachable one-handed; persistent labels, keyboard/screen-reader feedback, 360 px and large-text tests.

## 4. No-loss migration proposal

1. **Snapshot before any reconciliation.** Reuse full JSON backup and keep raw legacy snapshot; obtain explicit authority before any live-server transformation. Do not run deletion/migration in this analysis.
2. Introduce a versioned, explicit setup/ownership schema. `catalogId` is shared facts; `ownedId` is a physical item; `bag.saved` references owned IDs. New empty array is literally zero owned balls.
3. Existing valid event-owned instances win as records. Preserve IDs, spec snapshots/source, weight, nickname, status, drill, surface/service history, bag slots, sessions and references. Don't merge two copies merely because the model matches.
4. Legacy explicit nonempty owned selections can be proposed for import with deterministic migration IDs and a preview. Existing events for the same migration identity are not duplicated; ambiguous catalog-only history needs review, not a name-only destructive merge.
5. **Legacy `owned:[]` is ambiguous**: it can mean all-22 selected, skip, new, or no preference. Never reinterpret it as all owned or wipe it. Preserve the snapshot and any events. If no reliable owned records exist, ask “Which balls are yours?” with the old 22 available in a clearly labeled review, not pre-saved ownership.
6. **Owner keeps his bag.** t98u identifies the 22-ball startup as his personal setup. If his device already has valid events, preserve them; if it only has ambiguous legacy state, offer an explicit preview/import of his 22 after he confirms. Do not identify him by generic `hasHistory`, account email guesses, hardware fingerprint or an embedded privileged code. Confirm actual colors/weights/duplicates only when relevant; unknown remains unknown.
7. Demo imports stay distinguishable and undoable. Never erase an example import that a user may have edited without a review; offer a Keep/Review path. New demo mode must not leak into personal stats, sync or owned counts.
8. Fix account transition/legacy dual-write semantics before connecting migration to sync. On token expiry keep data local and show account copy paused; moving data to a new account needs an explicit preview. Preserve existing server copies pending a separately approved cleanup plan.
9. Run migration idempotently in mock/local fixtures, then owner-approved staging. Export and compare projections before/after; reinstall/import and PWA-to-wrapper transfer need separate restore tests. No new live accounts are authorized here.

## 5. Edge cases / failure policy

| Edge case | Required behavior |
|---|---|
| First ever visit offline | Cannot fetch a never-cached PWA; say offline use starts after first load. Bundled iOS can support first-install offline if assets actually bundled and tested. |
| Cached shell but catalog not cached | Manual add/skip works; do not show empty results as “no such ball.” |
| API asleep / expired DB / no network | Save local selected/manual item immediately; lookup/sync status honest; retry explicit. |
| Ambiguous name, Roman numeral, colorway/year | Fuzzy candidate, never silent ownership. Exact identity reviewed; no fabricated specs. |
| Source removed / weight absent | Keep saved private snapshot; display source date/unverified/other-weight flag; no guessed physics. |
| Two identical models | Different owned IDs, weights/layout/surface histories; bag/detail/export maintain separation. |
| Double tap, back, refresh, update mid-draft | Retain local draft when possible; no duplicate ownership; canceled drafts create no events. |
| Skip/profile exists/deep link | Setup flag and actual ownership independent; model advice not derived from the owner's bag. |
| Shared phone / account switch | Current limitation one bowler per browser profile; signout not profile isolation. Never claim private multi-profile support. |
| Storage full / private mode / eviction | Do not claim durable save if only memory; explain backup limits and file restore. |
| Custom domain / WKWebView migration | Different storage origin/container; explicit file/account transfer, no automatic browser data access. |
| Card photo contains name/serial | On-device only; no upload by default; manual confirmation and file-picker alternative. |
| Retired/pro-shop/manual ball | Can be owned, but packed/advisor eligibility follows explicit status; unknown specs do not block ownership. |

## 6. Validation and ship gates (planned, not executed)

### Automated/local
- Fresh app: `P.owned` empty; profile owned empty; no games, centers, personal release/PAP, team or saved line seeded. Explicit demo never counts as mine.
- Empty/unset/explicit legacy selection; old owner seed present; saved event-only bag; demo-edited ball; multiple identical models; missing catalog entry; repeated migration → zero extra events.
- Search typo, alias, Roman numeral, exact colorway, brand filter, >6 results, mixed-brand multi-select, unknown maker, removed source, offline catalog/manual path.
- Add → detail → drill/surface edit → pack → close → reopen offline → JSON restore preserves physical IDs, sources and histories for built-in, maker/manual and duplicate balls.
- Durability failure and partial append tests: no false save, no duplicate retries. Stale mirror and preference-restore tests explicitly define expected behavior.
- Account expiration/signout with keep-data: **zero silent upload to capability-code stream**; A→B only after explicit migration. Legacy line/note writes included.
- API/local mocks only; never mutate production. Keep existing regression gates including unchanged `simulatePath`, 7,500/0 parity and 3-D off below 8/10 physics QA. This document has not rerun those suites.

### Real-device and usability
- iPhone Safari tab + installed PWA, current/older supported iPhone, Android Chrome with lower-memory device; 360 px, keyboard, large text, screen reader, network loss, storage failure.
- Proposed directional sample: 10 consenting bowlers, five casual/low-tech and five competitive/multi-ball. Owner recruits separately. First correct owned ball ≤60 seconds for ≥8/10 and ≥4/5 each segment; three-ball setup ≤120 seconds for ≥8/10; ≥9/10 find skip and correct a wrong variant. These are product acceptance targets, not sourced benchmarks or measured lift.
- Zero false-ownership or privacy incidents and zero data-loss/duplicate-instance defects. Any failure blocks beta expansion.
- Two league nights: people reopen their real bag and choose what they bring without operator assistance. Observe after/before games only, not new prompts during scoring.

## 7. Effort and dependencies

Assume one owner plus AI help, two-week cycles, at most two work items in progress. Estimates are preliminary until the missing fresh code audit and migration spike complete; no delivery commitment.

| Work | Estimated owner/engineering days |
|---|---:|
| Verify source inventory + write migration fixtures / contract | 1–2 |
| Unify ownership IDs/resolvers, no-loss reconciliation and privacy transition | 4–6 |
| Reusable multi-select search-first setup, real brand filter, manual/skip/offline | 2–3 |
| Truthful storage/recovery + automated/real-device regression | 3–5 |
| **Total critical onboarding package** | **10–16 days**, plus recruitment/calendar time |

This is a broader allowance than the previous 8–13-day Now estimate because it explicitly includes owner/legacy migration and source verification. Existing local search/OCR/storage are reused. No new backend service is required for the picker. Privacy fixes touch API/client behavior; migration/schema changes, persistent hosting, moderation and native origins need separately reviewed work. Catalog breadth and maker page/parsing maintenance are ongoing operations, not a one-time “search everywhere” feature. Paid AI/chat and video reconstruction are not launch dependencies.

## Required follow-on audit brief

Against `gap-analysis-2`/the actual stacked baseline, verify the exact first-run call chain and all runtime seeds/defaults; search all shipped assets for old owner/team identifiers and personal profile/aim/PAP/demo-game data; inspect migration and sync behavior for every entry path; update inherited path/line claims and this evidence-limit section. Produce findings only unless separately authorized to implement. Do not change app code, rebaseline the engine, publish/merge a PR, spend, create accounts or touch live records as part of that audit.
