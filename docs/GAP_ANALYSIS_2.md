# Arsenal Pro gap analysis 2: arsenal, onboarding, AI chat

**Audit date:** 6 November 2026 (SGT). **Status:** analysis and proposals only; no app changes, deployment, paid calls or live test accounts.

**Decision Page:** [Arsenal Pro gap analysis: arsenal, onboarding, AI chat](https://cursor.com/canvas/store-bbdd68de-0378-45ea-8dd5-de6713a0279f/15461147-24ab-4637-a148-df2812b9ecf1).

## Executive decision

**Make the arsenal trustworthy and easy to start before adding a general AI chat.** Reuse the search and storage already built. The missing product is not a new database: it is one consistent owned-ball experience, a short first-run picker, and an honest recovery/privacy promise. Then test an offline “Ask the app” helper that explains existing decisions; only pay for generative chat if it demonstrably answers valuable questions the helper cannot.

- **A / Remember:** use the existing event log and owned-instance IDs everywhere, including new catalog balls, current bag, drill and surface records. Make “Saved here / copied to account / backup file” explicit. Fix account-to-device fallback before stronger privacy promises.
- **B / Intro:** replace “start with all 22” with an empty, searchable multi-select list, reusing Add a ball. Save a useful owned ball without asking for speed, revs, PAP, model comparison or an account. “Bag in 60 seconds” is a test target, not a marketing claim yet.
- **C / AI:** start with a plainly labeled, offline rules/data helper, not a pretend LLM. Four jobs: show my bag; explain a number; explain the app's next-ball suggestion; prepare for league. General generative chat is a gated Next experiment, not a prerequisite.

### Baseline and evidence discipline

| Baseline | Audited state |
|---|---|
| App | `now-list-and-catalog-fixes`, `0f40a4af09518656bde980e80af63fe96494541c` (unmerged app PR #1) |
| API | `motiv-lookup`, `869171948f7783f8624e66b66ff2cfcfc111ca34` (unmerged API PR #1) |
| Deployed website | Not runtime-audited in this review; do not call these PR features live |
| Method | Existing local source inspection, primary public pages, existing targeted tests, and one in-memory sync reproduction |
| Team | One analyst using six review lenses; no independent staffed teams, new interviews or real-user study results |
| Capacity | One owner plus AI assistance; two-week cycles, two implementation items in progress at most |

Evidence labels below: **exists** = code plus named path; **verified contract** = automated local test; **risk** = code-grounded consequence needing runtime/product resolution; **proposal** = not implemented. Confidence scores are not retention forecasts.

## A. Does the app remember my arsenal?

### Existing capability: more than it first appears

| Area | What actually exists | Evidence and limitation |
|---|---|---|
| Local persistence | IndexedDB `arsenal-pro` event log; localStorage fallback; memory last resort | `js/data/idb.js:3–49`; `js/hub.js:init`; `js/data/db.js:append`. Memory fallback is not durable. Writes await backend completion before appending in-memory. |
| Ownership | `ownedBall.created/edited` builds `P.owned`; each instance has its own ID, status and optional `spec`, `weight`, `drill` | `js/data/project.js:21–43`; `js/cc/addball.js:ownedEvent`; `js/screens/addball.js:213–220`. Add supports a second physical copy; shared model ID must not replace instance ID. |
| Armory / Old Friends | In bag, at home/pro shop, retired shelves; earned-only milestones | `js/cc/armory.js:shelves, records, starterBadges`; `js/screens/arsenal.js:34–64`. Old Friends preserves records; it is not deletion. |
| Current bag | Latest `bag.saved`; packed IDs honor status and explicit “from home”; pin/swap/pack | `js/cc/status.js:52–74`; `js/screens/bag.js:saveBag`; `js/screens/tonight.js`. A current bag exists; named reusable multiple bags are not surfaced as a library. |
| Across devices | Event outbox, idempotent batches, pull cursor, field-level last-writer-wins; optional bearer-auth account streams; older capability-code stream remains | `js/data/sync.js:createSync`; `js/sync.js:startOutbox`; API `server.js:304–305,321–415`. 20,000 account events / 5,000 device events by default. Not unlimited backup. |
| Account onboarding | Optional account; choose whether to add local data; recovery key (no email reset); export/delete | `js/data/account.js`; `js/screens/account.js:chooseMigration, signOutSheet`; API `lib/auth.js` and `server.js`. Configuration and production two-phone success not verified here. |
| Full backup/restore | JSON of all events, checksum, preview, dedupe; restore rebuilds projection | `js/data/backup.js:buildBackup, readBackup, restoreBackup`; `js/screens/import.js:14–33`; `tests/data/d0.test.mjs`. Already implemented, not a new feature to build. |
| Exports | Arsenal CSV, print/PDF sheet, bag/Old Friends PNG through native share sheet, full JSON backup | `js/screens/export.js`; `js/cc/export.js`; `js/screens/cards.js`. CSV/image/PDF are not full restore formats. |
| Storage protection | Persist request, install help, backup nudge and sync status under Me | `js/cc/protect.js`; `js/screens/more.js:28–94`; `js/main.js`. Installed/persisted storage is not an off-device backup. |
| Surface/service history | Append-only surface, service, games events; per-ball health; recent surface display | `js/data/project.js:33–35,65–87`; `js/store.js:logFinish`; `js/screens/ball.js:34,56`. Some paths still key by catalog model rather than physical owned ID. |
| Drill card | On-device OCR, editable fields, low-confidence review, confirmed data saved on owned ball; handwritten cards can be typed | `js/screens/drillscan.js`; `js/cc/drillcard.js`; `js/cc/drillocr.js`. Photo transient, not uploaded/saved; reader about 5 MB after first use. This is grip/layout enrichment, not ball-brand recognition. |
| Kit QR | Printed catalog-ID QR opens Add a ball with selection prefilled; still requires confirmation | `js/cc/kit.js`; `js/screens/kit.js`; `js/screens/addball.js:225–230`. Not a personal backup, bag transfer or ownership proof. |

### Important gaps and trust risks

**A1 — Two ownership systems disagree (high priority, static-code finding).** First run and Me still use `ap_profile.owned`, where an empty array means “all 22”; the event model starts empty. `js/screens/welcome.js:19–25,35`, `js/screens/more.js:74`, `js/screens/pickers.js:14`, and `js/hub.js:33–38` show why. The bridge only adds new selections, never removes them. Thus “I picked my balls” and “My Armory remembers my balls” are not one reliable contract. An all-selected first run saves `owned:[]`, which the bridge does not turn into 22 owned events. Do not solve this by auto-seeding everyone with examples.

**A2 — Added balls are not first-class throughout the app (high priority, static-code finding).** `js/cc/cats.js` resolves user-added specs for Bag/advisor, but `js/screens/ball.js:21–22` resolves only the 22 built-ins. Armory deliberately routes a non-built-in pedestal to `#/bag` (`js/screens/arsenal.js:34–38`) instead of its own detail. `js/store.js:restoreState, applyLine` also searches only `balls`. The UI can save and rank a new ball yet cannot offer the same detail/history/reopen journey. A drilled-card action on an added model is correspondingly hard to discover. Same-model duplicates select the first matching instance at `ball.js:28`; surface logging by model cannot distinguish two copies. Fix owned-instance navigation and resolver use before bulk onboarding.

**A3 — Account-only privacy is not currently a safe promise (locally reproduced).** Signed-out event sync runs automatically under a backup code; it is not local-only. `createSync.run` marks all events unsynced on stream changes; after sign-out or token loss it falls back to the device-code stream (`js/data/sync.js:6–8,32–34,80–83`). The existing account test explicitly expects this fallback (`tests/data/account.test.mjs:66–72`). `store.js` also dual-writes older line/surface/note endpoints using the device code even while signed in.

An entirely local `mockApi` reproduction in this review produced: account A events=1, device-code events=0; keep-data sign-out then sync -> device-code events=1. Signing into account B and explicitly confirming the same local data -> B events=1. The latter is an intentional merge, not proof of unauthorized account access; it demonstrates why shared-phone switching needs an isolated profile or clearly separated migration. Account server streams are scoped; the client stream-transition promise is the problem. Do not delete legacy live copies or migrate them without owner approval. Proposed default: on auth loss keep data local and pause account sync, do not silently downgrade privacy; old anonymous-copy cleanup is a separate opt-in action.

**A4 — Reinstall/eviction recovery is possible, not guaranteed.** Same browser/origin normally reopens the log. A cleared browser, private mode ending, a new origin/domain, or some reinstall paths can lose local storage [R4]. Recovery then needs a backup file or a surviving server stream plus code/account credentials. A PWA install does not create a second independent copy. Existing “Protected”/“A backup file always works” wording overstates guarantees (`js/cc/protect.js:18–20`; `js/screens/more.js:45–49`). Prefer “Browser storage kept / backup saved [date] / account sync [date]” with a plain recovery action. Memory mode must say “Only until this tab closes” for owned-ball saves too; an existing fallback is not proof all screens disclose it.

**A5 — Restore completeness and drift.** Full JSON includes preferences, but the backup import handler only restores events and hydrates empty legacy mirrors; it does not apply `backup.prefs`. `ap_state`, UI-only preferences and import presets are not equivalent to owned-event history. `hydrateMirror()` only fills empty keys (`js/hub.js:54–67`), so remote edits can leave a nonempty profile/legacy mirror stale. Checksum mismatch is a visible warning, not a hard reject. Backups are plaintext; checklist: explicitly describe what restores, warn before merging another bowler, and offer native-file sharing only at the bowler's request. Do not silently restore account tokens or device identity from files.

**A6 — Layout history exists in the log, not a usable timeline.** Each drill save replaces the projected `drill` field, although earlier edits remain in events. No surfaced version history or “this layout from [date]” selector. Surface/service events are richer, but per-instance identity and export provenance are incomplete. `js/cc/export.js:19–24` classifies all owned snapshots as “you,” even if fields originally came from a maker; source URL/weight are absent in the simple CSV. Useful Next work: a compact per-owned-ball timeline and weight/source-aware exports, not more dashboard numbers.

**A7 — Multiple bowlers on one phone are not supported as isolated profiles.** One DB, one bowler projection, one account key. League teammates/Baker throws are scoring participants, not private local arsenals. For now say “One bowler per browser profile” and do not advertise account switching as a profile switch. Proper multiple profiles needs storage/sync namespace design and migration; significant Next scope.

**A8 — Hosting durability is a dependency.** API README documents idle cold starts and free-Postgres expiry. A durable cross-device promise needs an owner-approved hosting/backup plan, not another client screen. The previously reported database deadline is an owner-context warning, not reverified from Render in this analysis. No upgrade, new database or live migration was performed.

### Recommended “remembers my bag” contract

1. One physical `ownedId` is the primary identity, a shared `catalogId` supplies factual defaults, and owned weight/layout/surface/nickname/status stay private.
2. Add, pack, reopen offline, inspect detail, and recover must work for built-in, maker-catalog, manual and duplicate-model balls alike. Unknown specs must not block ownership storage.
3. Show one quiet status after setup: “Saved on this phone.” Secondary choices: “Save a backup file” and “Use on another phone” (optional account). No forced login or storage prompt before first value.
4. Separate explicit states: local-only, opted-in server copy, account copy paused, and backup file date. Preserve existing copies while any migration policy is reviewed.
5. Do not infer the owner's real arsenal from all 22 built-ins, example seed, or Ruby nicknames. The review has no owner-confirmed complete list; “Yea” must remain editable/unconfirmed. If “remember” also means bot memory, save only an owner-confirmed inventory, never this sample catalog as their possessions.

## B. Intro: select your balls through search

### What is already built

- `js/screens/welcome.js` is a skippable three-step wizard: hand/style -> speed/revs -> toggle 22 built-in balls (all selected by default). No search there. `js/main.js:59–60` skips first-run on existing profile/state and only redirects when no hash, so QR/deep-link entry also needs an empty-arsenal path.
- `js/cc/addball.js:catalog, search` already provides normalized exact/alias matching, Roman numeral normalization, token edit distance/prefix matching, top six candidates. `js/screens/addball.js:42–70` redraws results on input. **Search-as-you-type and fuzzy matching already exist.**
- Measured catalog counts: 22 built-ins + 143 maker rows = **165 searchable entries** at this SHA. “143-row catalog” is not the whole searchable set. Five built-ins are marked unverified; keep their numbers absent, not guessed.
- Brand select currently guides **maker lookup**, not a hard local-result filter (`addball.js:43–53`). Typed brand changes ranking, not strict exclusion (`cc/addball.js:107`). A genuine “Brand: all / Storm / …” local filter is a small gap.
- Maker lookup is existing guarded Render work: allowlisted hosts, robots/crawl limits, size/time controls, cache (found 30 days; misses/candidates 1 day), candidate confirmation. MOTIV is included in the audited API PR. Evidence: API `lib/specfetch.js`, `lib/specparse.js`, `server.js:419–471` and app `LOOKUP_BRANDS`.
- The current Add flow has four dense sections: confirm weight/specs, model versus benchmark, coverage grid, save. Selecting a ball triggers live lookup even if a local catalog row exists and can hide confirmation while waiting up to 25 seconds (`screens/addball.js:80–115`). Saved balls default to **At home**, not packed. Those are reasonable expert tools but a poor first-value prerequisite.
- Offline catalog selection/manual specs exist; online “not found” for an unsupported brand can dead-end because `makerOnly` requires a supported maker, while `typeCard` appears only after a pick. Online and offline manual paths need the same visible escape. Probe `Phaze 2` in the present local catalog returned no candidates; the 50-name fixture passed 50/50, but that is not broad market coverage.

### Alternatives and direction

| Option | Casual/low-tech league bowler | Competitive/multi-ball bowler | Decision |
|---|---|---|---|
| Keep profile-first wizard, link Add later | Delays seeing their own ball; asks unfamiliar revs | Still slow repeated single-ball entry | Reject as default |
| Reusable search-first list, multi-select | Add one known ball, skip details | Rapid 3–6+ selection, explicit duplicates/weight | **Recommended** |
| Drill-card-first | Needs camera/card; handwriting uncertain | Valuable later for known owned instance | Secondary optional path |
| Login-first cloud wizard | Auth/recovery friction before value | Helpful returning-device restore | Only explicit “I already have data” path |
| Universal AI image ball recognition | Unverified identity/specs; new cost/privacy | Can confuse colorways and years | Later research, not a dependency |

### Mobile wireframe description (proposal, not shipped)

**Screen 1: “Add your balls.”** One sentence: “Find a ball you own. You can add more later.” Search field with visible label “Brand or ball name”; six or fewer text rows showing brand + exact model/colorway, plus a clear Add/Selected state. Optional “Filter brand.” No match percentages (they are string scores, not factual confidence). Below: “Can't find it? Add by name”; “Restore my data / sign in”; “Skip for now.” Existing users reach the same picker from Bag; do not replay onboarding.

**Screen 1 continued:** selecting a result adds it to a review tray, not saved ownership yet. Show selected names and count, clear Remove, optional “Add another copy” behind that row; do not demand photos or dozens of specs. A ball row can ask weight with a “Not sure” choice; weight-specific facts keep their provenance. Unknown weight stores null, not a hidden 15 lb fact. Offer “More details” only on request. Catalog snapshots are sufficient for immediate save; live enrichment is an explicit action, not a blocking wait.

**Screen 2: “These are mine.”** Review selected identities/weights. Primary “Save my balls”; secondary “Keep choosing”; after successful durable append, “Saved on this phone.” A separate simple choice “Bring these tonight?” creates/confirms the actual bag; owning and packing are not conflated. For a one-ball owner this is one obvious action; advanced roles/coverage can wait. If no save or storage fails, retain draft in-session, explain the failure and offer retry/export; never claim success. Persist the setup draft only if local storage works and clear only after commit/cancel. Reopening must be idempotent, not add duplicates.

**After first value:** open Bag with the saved balls; show “Add layout or surface” and backup/account choices as secondary actions. Ask hand/speed/revs only when a user requests Targeting/model advice, explaining why and labeling defaults if skipped. A “scan drill card” action enriches a selected owned ball and always retains manual review. Do not try to extract ball model from a grip card that has none.

**Offline/skip/not found:** local catalog works after shell cached; manual brand/name only can be saved with specs TBD; maker lookup says it needs internet without blocking save. Skip leads to a useful Tonight state, and an explicitly labeled Example mode must not be mistaken for ownership. Unknown catalog balls can later attach to a verified maker entry with explicit merge confirmation; never auto-publish personal submissions into the shared catalog.

**Accessibility:** ≥44px targets; one-handed bottom primary; persistent labels, screen-reader live result count, keyboard selection and focus restoration; rows must not shift while typing. Test at 360px, large text and with a visible keyboard. No new scoring controls.

### Psychology: evidence, not invented lift

NN/g recommends skipping instructional onboarding where possible and retaining customization only when necessary for immediate value [R1]. Picking a ball is relevant customization; forcing knowledge of rev rate before adding it is not. Progressive disclosure puts advanced information behind a clearly labeled second layer, avoiding both clutter and excessive navigation [R2]. It does not mean hiding essential ownership or backup controls.

SDT supports autonomy (skip, unknown, edit, explicit opt-in), competence (a real saved bag and explainable next action, not “you're bad at matching”), and relatedness (optional native share after setup/session, not a leaderboard) [R3]. These principles support the direction, but **do not establish a numeric Arsenal Pro activation lift**. Expected benefit is directional until the smoke test. Casual and competitive users get the same clean entry, with speed and depth optional rather than a forced “beginner/expert” identity.

## C. Can we build in an AI chat agent?

**Yes, but there is no chat runtime today.** `docs/AI_COACH_CHAT_RULES.md` contains content/guardrails and says “nothing is wired up.” `docs/DECISIONS.md:136` says no AI chat for the current glossary implementation. Existing ranker/advisor, targeting, glossary and one-line explanations are the building blocks, not an agent backend. This owner request authorizes evaluating a change, not a paid integration.

### Four architectures

| Architecture | Feasibility against actual constraints | Costs, privacy and segment fit | Verdict |
|---|---|---|---|
| 1. Local intent/rules + own data/glossary, no LLM | Plain ES modules, existing event projection and pure advisor/rank/model outputs. Works offline; no CSP change, dependency download, new backend or model API key. Needs a small intent router, clarification and cited answer renderer. | No marginal model fee; engineering and glossary maintenance remain. Strong for both segments' repeated short jobs, weak for arbitrary phrasing/multi-turn questions. Label honestly “Ask the app — offline helper.” | **Now prototype; first shipped helper only if useful** |
| 2. In-browser LLM (WebLLM/WebGPU) | WebLLM supports workers/caching [R5–R6]; WebGPU still device/adapter dependent [R8]. Runtime/model must be pinned and self-hosted to respect no third-party scripts; prebuilt ESM could preserve no-build, so npm is not automatically required. Direct WASM compilation conflicts with current page `script-src 'self'` [R7]. Actual worker policy/inheritance must be audited; do not silently weaken worker policy to dodge the constraint. Off-origin models need approved connect hosts or self-hosted assets. | Big first download, memory, heat/battery and storage contention. web.dev gives Gemma 2B at 1.3 GB as a scale example [R9], not a measured download for a selected WebLLM build. At 10 Mbps that is about 17 minutes idealized; hardware memory is extra. No API fee is not zero distribution/support cost. Casual phones hardest hit. | **Later; cannot approve as drop-in under unchanged policy without a device/CSP spike** |
| 3. Render proxy to paid LLM | Existing API origin is already in CSP connect-src, so browser can call a new API endpoint without external scripts or relaxing script-src. Existing Node backend can perform server fetch; no frontend build needed. Needs provider secret, read-only retrieval, auth/consent, budget and security controls. | Network and cold starts; sends selected personal context to another processor. Paid per token; costs below. More flexible language, still hallucination risk. Free offline core must remain. Significant backend/ops work, not “add a chat widget.” | **Next only after owner approves spend/privacy and test shows incremental value** |
| 4. Local-first hybrid, optional cloud | Deterministic local tools answer owned-data/jobs first; opt-in cloud handles unsupported explanatory wording. Online never silently used after local failure; label which answered. Cloud outage falls back to local. | Same paid-backend work plus two paths to maintain; limits data/tokens if local tool coverage is high. Broadest segment fit without making network the core. | **Recommended longer-term architecture, rules-only first** |

A local helper is not a general AI model; present it accordingly. Do not add a floating chat bubble while scoring. Entry under Learn/Me and contextual “Why this?” before/after play; no sixth tab. First test can use a read-only prototype, not production code.

### Useful jobs and their source contract

| Bowler asks | Answer source / permitted result | Boundary |
|---|---|---|
| “What am I bringing?” | `currentBag(P)` / `packedIds(P)`, owned names/status; link Bag | Report saved facts, not a fresh unconfirmed packing mutation |
| “Which ball next?” | Existing weaker/stronger step and advisor outputs for **owned available** balls; show conditions + estimate label | One observation question if needed (early/late or miss); suggest feet/eyes first. Never let model invent a ball/spec or overrule missing inputs. No purchase advice. |
| “What do my numbers mean?” | Saved measurement/aggregate with device, units, measurement point, sample size + glossary ID | Do not compare impact speed to release speed as if identical; model path is not observed trajectory |
| “What is this layout?” | User-confirmed `owned.drill` fields with date and provenance + glossary concepts | Explain written values only; no new pin-to-PAP/drill/VAL numbers or fitting advice |
| “Get me ready for league” | Saved bag, center's last setup, notes, health logs | Summarize, not diagnose equipment or promise a score gain. Respect Rule 18 context and current authoritative sources. |
| “My wrist hurts / is 2H best?” | Safety response or neutral sourced trade-offs | No medical advice, style ranking or inferred skill |

**Proposed answer envelope:** answer text (2–4 sentences), data-as-of time, source IDs/links, fact types (maker/user/device/model/derived/unknown), assumptions/missing data, and one explicit UI action link. For numeric values the renderer pulls validated tool fields; it must not trust a generated number merely because the model cites a source. “Spec not on file” is a successful answer, not an invitation to guess. Keep the current coach rules but re-audit legacy example wording before reusing it; an example in a doc is not independently validated current guidance.

### Minimum privacy and reliability gates

- Read-only v1: no event writes, account actions, sharing, internet browsing, purchases or autonomous tool execution. Any future write needs a visible preview + user confirmation + undo.
- Retrieve only the active bowler's selected fields plus a few curated glossary/catalog passages. Never send the full event log, emails, device codes, bearer tokens, recovery keys, contact fields or card photos. Show “What is sent” before cloud opt-in.
- User notes, imports, maker prose and chat content are untrusted data, not instructions. Allowlist tool names/fields, cap context, validate citations against retrieval IDs, render text (no model HTML/JS), and test prompt injection/exfiltration.
- Do not train on or publish personal arsenals. No cross-user prompt cache. Transient client transcript by default; clear history control. Server logs contain outcome/latency/token counts and a nonreversible scoped identifier, not prompts or notes. Review provider retention separately: “not used for training” does not mean “not retained.”
- For paid path: require authenticated cloud entitlement (core remains signed out), 5 requests/minute and proposed 60/month/user pilot cap, input 3,000 tokens and total billable output cap, bounded history, one in-flight call/user, no unbounded retry loop, timeouts/cancel, exact model allowlist and no expensive tool escalation.
- Use durable atomic per-account and global budget reservations; an in-memory rate limiter resets on restarts and cannot enforce a monthly dollar cap. Include provider project limits where supported and a hard application kill switch. Do not rely on CORS for authorization or on a backup code as a paid entitlement.
- Abuse/free signup farm handling, verified invitations for the pilot, model version/deprecation testing, and a regression suite are ongoing work. No user API keys in a PWA or repo; secrets only in sanctioned Render secret/env storage if later approved.
- Device tests: at least older iPhone Safari + installed PWA, current iPhone, low-memory Android Chrome, desktop; online, airplane mode, GPU unavailable/lost, interrupted download and browser eviction. No claims that these were run here.

### Published price scenarios (USD, checked 6 November 2026 SGT)

Text-only, no caching discounts, no search/image/audio/tools. Scenario: **2,000 input tokens + 400 total billed output tokens per question**, including any billed thinking. Costs are arithmetic scenarios, not measured consumption; a short visible answer can still incur thinking output. Use provider usage counters, and reject a model if billable output cannot be bounded.

| Published model | Input / output per 1M | One question | 60 questions/user/month | 1,000 such users/month |
|---|---|---:|---:|---:|
| Gemini 3.5 Flash-Lite [R10] | $0.30 / $2.50 | $0.00160 | $0.096 | $96 |
| Gemini 3.8 Flash, current promotional rates through 31 Dec 2026 [R10] | $0.75 / $3.75 | $0.00300 | $0.180 | $180 |
| Gemini 3.8 Flash, announced rates from 1 Jan 2027 [R10] | $1.50 / $7.50 | $0.00600 | $0.360 | $360 |
| Grok 4.3, short context [R11] | $1.25 / $2.50 | $0.00350 | $0.210 | $210 |
| Grok 4.7, short context [R11] | $2.00 / $6.00 | $0.00640 | $0.384 | $384 |

Formula: `(input × input_rate + billed_output × output_rate) / 1,000,000`. At 100 users the last column is divided by ten. Prices exclude Render service/database upgrades, durable budget counters, retries/failures, taxes, support and engineering. No provider chosen or called; access/quotas/quality not verified. Deprecated Gemini 2.5 Flash is not a new-integration recommendation: the opened pricing page says it reroutes from 1 December 2026.

A hypothetical **20-user, 14-day pilot, 30 questions each** is 600 calls: $0.96 Flash-Lite, $1.80 promotional Flash, $2.10 Grok 4.3 or $3.84 Grok 4.7 at the stated tokens. With **3,000 input + 600 total output**, 600 calls would cost $5.76 on Grok 4.7; this is a token scenario, not a spend guarantee. Proposed pilot ceiling **$10 model usage**, hard stop, no automatic top-ups; this is a decision request, **not authorization**.

Google's published page distinguishes free-tier use for product improvement from paid-tier “No” [R10]; do not quietly fund private arsenal chat with a free tier. xAI's API security page states no training without permission and default encrypted 30-day retention; ZDR is a separate team setting with feature constraints [R12]. Review legal terms, processing region and retention for the selected account before any real-user pilot. The owner's personal chat subscription does not supply app API credits.

### New infrastructure (not required for local helper)

Proxy endpoint, provider secret/billing project, consent state, durable usage/budget records, read-only context validation, cancellation/timeouts, redacted observability and evaluation harness. Existing Postgres could hold counters after a reviewed schema migration; a vector DB, queue, agent framework, WebSocket or new service is **not necessary** for this small curated corpus. Shared catalog refresh and glossary upkeep remain human review work. If the existing expiring database is replaced/upgraded, that is separate owner-approved cost.

## D. Broader competitive gaps: learn, integrate, do not imitate everything

These are public product/developer claims opened in this review, not hands-on competitor QA or independent validation. Absence from a page is not proof a feature does not exist.

| Product / primary source | Verified public claim | Arsenal Pro direction / gap |
|---|---|---|
| LaneTalk [R13–R14] | Ball/condition/season/center tagging, frame-level first-ball attribution, filtering and Compare; league scoring/live stats/social competitions | Existing scoring/card/import covers part of the job. More flexible condition/ball filtering and low-effort capture are gaps; do not copy leaderboards. Automatic center score ingestion needs an authorized integration, not scraping. |
| LaneTrax [R15] | iPhone + tripod shot analysis, speed/arrows/breakpoint/revs, sessions, trends and web reports | Current `js/data/lanetrax.js` + importer is report/aggregate ingestion, not video tracking. Keep measured-import provenance and work toward shot/session linkage. Do not build a vision tracker as an “AI chat” subtask or repeat “same precision” marketing as fact. |
| Ruby [R16] | Sensor-based automatic shots; sessions/trends; CSV export, notes, PAP insights in app release history | Prioritize a real, confirmed CSV mapper/ball alias workflow in its own branch. At audited SHA `js/data/csv.js:68` still says `awaiting-sample`; generic mapping exists, finished Ruby support does not. Device-derived metrics are not automatically accurate or exact trajectories. |
| bowwwl [R17–R18] | Ball database apps for iOS/Android, catalog discovery and serial-date lookup with caveats | Breadth/current-release coverage is a gap. Keep maker-factual provenance and personal-owned details as differentiation; link out rather than ingest restricted database/photos. Serial decoding not a priority without licensed/verified rules. Terms restrict copying/redistribution; no blanket clearance assumed. |
| Bowlero / MoneyBowl [R19] | Participating-lane connection, tracked performance, challenges and cash/points rewards; 18+ listing | Frictionless score capture is worth learning from. Cash, boosted play odds, unlock pressure and venue contests conflict with the free-core/noncoercive direction. Public listing does not establish availability at every center or a usable API. |
| BowlingThisMonth [R20] | Type-ahead select up to 12 balls; side-by-side specs and ratings comparison | Clear comparison/search UX is useful. Pro's comparison and shape/strength heuristics are not BTM tested ratings. No copying ratings, reviews or catalog. Broader multi-ball comparisons are Next only if they change packing, not to match a feature count. |

**Broader product gaps worth keeping:** source/weight-aware per-instance history; after-session ball/condition comparisons with sample counts and missing-data warnings; import continuity; first-run/recovery clarity; better confidence labels where metadata is currently “maker” versus an actual device read. **Non-goals:** a public social feed, score rankings, cash rewards, real-time video/sensor hardware, catalog photos without permission, and a universal autonomous bowling coach.

## E. Ranked direction and validation

### Scoring and ranking

Impact/Effort/Confidence are 1–5, higher Effort = harder. Advisory score = I × C / E. Effort estimates: 1 ≤1 day, 2 2–3 days, 3 4–6 days, 4 7–10 days, 5 >10 days/new uncertain infrastructure. These are one-owner planning estimates, not commitments or measured ROI. Dependencies and privacy gates override arithmetic.

| Rank / stage | Work item | I | E | C | Score | Why this order |
|---|---|---:|---:|---:|---:|---|
| 1 Now | Owned-instance consistency + privacy transition contract: remove all-22 ownership assumption, full added-ball detail/reopen, no silent account fallback | 5 | 3 | 5 | 8.3 | Gate: acquisition into inconsistent identity/privacy is not success |
| 2 Now | Reusable search-first, review-and-save picker with real local brand filter, manual/offline/skip and multiple selection | 5 | 2 | 4 | 10.0 | Reuses proven search; blocked on rank 1's identity contract |
| 3 Now | Make recovery/status discoverable after save, truthful storage copy; rehearse file/account restore | 5 | 2 | 5 | 12.5 | Existing recovery code; copy/UI needs the same privacy contract |
| 4 Now — prototype only | Four-job offline helper versus existing buttons/glossary | 4 | 1 | 3 | 12.0 | Test before shipping a runtime or promising language coverage |
| 5 Next | Ship constrained offline helper only if smoke test 3 passes | 4 | 2 | 3 | 6.0 | Ground in stable identity and audited sources |
| 6 Next | Real Ruby CSV mapping/session linkage, import provenance and editable alias confirmation | 4 | 3 | 4 | 5.3 | Coordinate existing Ruby work; do not call stub complete |
| 7 Next | Per-owned-ball layout/surface timeline + weight/source-aware export | 4 | 3 | 4 | 5.3 | Useful for competitive users; optional depth for casual users |
| 8 Next | Optional cloud/hybrid text pilot, only after spend/privacy approval and incremental-value gate | 3 | 4 | 2 | 1.5 | New backend operations and evaluation, not just UI |
| 9 Next discovery / Later build | Multiple private bowlers on one phone + named bag presets | 3 | 4 | 3 | 2.3 | Segment demand unknown; real namespace/migration work |
| 10 Later | In-browser LLM feasibility/quality spike | 2 | 5 | 2 | 0.8 | Mobile download/device/CSP constraints outweigh early value |
| 11 Later | Authorized score integrations or video shot reconstruction | 3 | 5 | 2 | 1.2 | Partnerships/vision QA; no invented API availability |

**Sequence:** Cycle 1: rank 1 plus rank 2 prototype and tests; rank 3 recovery rehearsal/copy can be included only within capacity. Cycle 2: finish rank 2/3, test rank 4 helper, no automatic cloud build. The total Now implementation estimate is 8–13 owner-days plus recruiting/QA, so do **not** promise every item shipped inside one two-week cycle. Stop feature work if privacy/data identity tests fail. Review existing app/API PRs separately; this analysis does not authorize their merge.

### Top three smoke tests (planned, not run with users)

**S1 — “These are my balls,” first value (≤14 days).**
- Hypothesis: search-first beats the current profile-first flow without creating false ownership.
- Recruit 10 consenting bowlers: 5 casual/low-tech league, 5 competitive/multi-ball. Counterbalance baseline versus prototype order; use different but matched catalogs/tasks to reduce learning effects. Owner recruits separately; no invitations sent here.
- Task: add one owned ball, then a bag of three; include typo, wrong colorway, unknown model and offline scenario. Do not supply rev/PAP data. Use test fixtures rather than real personal accounts.
- Primary: first correctly saved ball within 60 seconds for ≥8/10 and ≥4/5 in each segment; three-ball bag within 120 seconds for ≥8/10. Correct selection/removal and skip recognized in ≥9/10; zero silent all-22 ownership or duplicate-save errors. Compare medians with baseline as directional evidence, not a lift claim.
- Stop if a wrong ball saves without review, missing specs block ownership, online live lookup blocks local save, or a scoring screen gains extras. If competitive users need more detail, add optional expansion, not a longer mandatory flow.

**S2 — “It is still mine,” durability/privacy (≤14 days).**
- Technical matrix: at least 8 recovery scenarios across Safari browser/PWA and Android Chrome using disposable local profiles and mock/local API: reopen offline; storage fallback/failure; full JSON restore on clean profile; second-device sync; interrupted sync; token expiry; keep-data signout/account switch; same model twice with distinct surface/drill data. Include added/manual balls. Real reinstall cannot be assumed equivalent to clearing storage; record each tested platform path.
- Gate: 8/8 scenarios preserve expected owned IDs, bag, source/weight and drill/surface history without silent cross-identity upload; zero false “saved/backed up” states on failed writes. Persisted projection comparison may exclude deliberately device-local preferences but must document that exception.
- Comprehension: 8 bowlers (4/segment) find backup/restore in ≤30 seconds and ≥7/8 explain whether another phone can recover; no participant confuses installation with backup. Test only after identity policy is explicit. No new live accounts or production wipes; owner-approved live two-phone staging check is separate.
- Current implementation is expected to fail the no-downgrade gate: the reproduction above is the baseline, not a passing result.

**S3 — “Ask” earns its place (≤14 days, no paid API required).**
- Read-only clickable/locally served helper prototype; 8 bowlers (4/segment), four tasks each (bag, next-ball explanation, numbers, league prep). Counterbalance helper versus existing UI/glossary. Record whether each answer changes a next action and whether the user can identify its source/estimate status.
- Gate: ≥26/32 tasks correct and actionable, ≥13/16 in each segment; median task time no worse than baseline; ≥7/8 distinguish model from measured. Pressure/feeling judged ≤2/5 for every participant. Preference alone is insufficient.
- Also 40 fixture prompts: 10 known-data, 10 missing/ambiguous, 10 medical/layout/style boundary, 10 injection/cross-user/exfiltration. Zero invented specs/layout prescriptions, medical advice, foreign-user data, writes or uploads; every factual numeric answer traceable to tool output. Abort on any critical violation.
- If the helper adds no value, ship contextual explanations, not chat. Cloud pilot is considered only if unsupported useful phrasings exceed 20% of logged test tasks after one rules iteration; this threshold is a product decision, not research-backed law. User data/free text stays local; share only consented counts via native share sheet. No retention-lift inference from this sample.

### Decisions needed from owner (not blockers to this analysis)

1. **Direction:** approve implementation of durable-arsenal/search-first as priority; this report changes no application code. Confirm whether “remember my arsenal” also means this bot should save an exact personal inventory; the complete list is not available/confirmed here.
2. **Privacy semantics:** pause account sync on expiry versus automatic backup-code fallback; explicit local-only option and opt-in anonymous server copy; how to handle existing duplicate server streams. Default recommendation: pause, preserve copies, ask before live migration/deletion.
3. **Durable backend:** choose/approve hosting beyond expiring free Postgres before promising indefinite cross-device recovery. No price is invented; current Render plan/state was not queried here.
4. **AI:** approve or reject rules-only helper test first. Keep paid AI off; if later requested, select provider/retention/region and a hard budget (proposed $10 model-only pilot), plus any Render/database spend. Never charge core users to recover their own arsenal.
5. **Shared phone / bag presets:** how common is this among intended bowlers? Prioritize only after discovery; one profile remains the honest current limit.
6. **Catalog operations:** name a maintainer and accepted source/terms process. Proposed 30–60 min/week sampling plus time per newly requested ball is a planning allocation, not measured labor; log actual effort for two weeks before expanding catalog promises. No official images without permission.
7. **Existing PRs:** separate review/merge decision; app PR #1 and API PR #1 remain unmerged in this analysis. Publishing this docs branch/PR is also separate from merging code.

### Conflicts reconciled

- Earlier “no AI chat” decision vs new request -> evaluate openly, do not silently reverse it or imply a runtime already exists. Rules helper first; owner can authorize a later change.
- Optional accounts vs “remember forever/every phone” -> no mandatory login; honest local persistence plus optional recoverable copies, with hosted-service caveat.
- Private account vs code-stream fallback -> real contradiction, not resolved by marketing copy; stop downgrade and audit legacy dual-write design.
- “All 22” vs personal ownership -> empty means empty, examples clearly separated; never migrate catalog membership into ownership without confirmation.
- “Bag in 60 seconds” vs required spec confirmation -> identity/weight review stays, advanced model/grid moves later; unknown facts remain TBD.
- Free/offline core vs paid cloud -> cloud optional, gated and budgeted; no secret paid dependency. Do not insert a third-party chat script.
- SDT vs competitors' rankings/rewards -> explain decisions and support choice; no streaks, leaderboards, locked-item pressure or cash loops.
- “Recreate shot” vs imported metrics -> measured aggregates/sensor values do not uniquely identify a full path. Label reconstructed/model estimates and leave `simulatePath` untouched; 3-D remains off below 8/10 QA.

## Validation performed in this review

1. `node --test tests/data/addball.test.mjs tests/data/account.test.mjs tests/data/d0.test.mjs tests/data/d3.test.mjs tests/data/drillcard.test.mjs tests/data/status.test.mjs tests/data/protect.test.mjs` -> **54 passed, 0 failed**. Search fixture top-1/top-6 50/50, zero false exact; does not prove all current balls are searchable.
2. `node tests/engine_equivalence.mjs` -> **7,500 comparisons, 0 mismatches**. No engine/data rebaseline or code changes.
3. Inline Node imports of `balls`, `SPEC_ROWS`, `catalog()` -> **22 / 143 / 165**; five built-ins unverified. Search probe `Phaze 2` -> no local candidates, illustrating coverage not matcher correctness.
4. Local `mockApi` + `createAccount/createSync` reproduction -> one account event copied to capability-code stream after keep-data signout; subsequent B migration after explicit confirm includes it. No external calls/accounts/data mutations.
5. No browser/mobile runtime audit, production sync/restore verification, competitor hands-on tests, paid model eval, or real-user smoke study. No API integration suite run against production.

## Sources opened in this review

Accessed 6 November 2026 (SGT); older research remains dated evidence, not newly conducted 2026 studies. Sources describe their own products unless noted. Marketing accuracy, data permissions and actual app availability are not implied by a product page.

- **R1** NN/g, *Mobile-App Onboarding* (2020): https://www.nngroup.com/articles/mobile-app-onboarding/
- **R2** NN/g, *Progressive Disclosure* (2006): https://www.nngroup.com/articles/progressive-disclosure/
- **R3** Self-Determination Theory overview, autonomy/competence/relatedness: https://selfdeterminationtheory.org/the-theory/
- **R4** MDN, storage persistence, private mode, quotas and eviction: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- **R5** WebLLM current docs: https://webllm.mlc.ai/docs/
- **R6** WebLLM loading/workers/cache: https://webllm.mlc.ai/docs/user/basic_usage.html and https://webllm.mlc.ai/docs/user/advanced_usage.html
- **R7** MDN, `script-src` and WebAssembly: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src
- **R8** MDN, WebGPU availability/adapter/secure context: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
- **R9** web.dev, model sizes/download/performance/fallbacks (updated 2024): https://web.dev/articles/client-side-ai-performance
- **R10** Google official Gemini pricing, future rates and paid/free data-use distinction: https://ai.google.dev/gemini-api/docs/pricing (public page read via curl after fetch timeouts; redirected content also references https://aistudio.google.com/docs/pricing). No provider purchase/API call.
- **R11** xAI official pricing: https://docs.x.ai/developers/pricing
- **R12** xAI API security/retention/ZDR: https://docs.x.ai/developers/faq/security
- **R13** LaneTalk tagging/filtering: https://lanetalk.com/tag-games/
- **R14** LaneTalk league features: https://lanetalk.com/bowling-score-tracker-features/ (public feature page opened; not a live app test)
- **R15** LaneTrax: https://lanetrax.app/
- **R16** Ruby developer App Store listing and version notes: https://apps.apple.com/us/app/ruby-bowling/id6762580021
- **R17** bowwwl app/catalog/serial lookup: https://www.bowwwl.com/
- **R18** bowwwl terms: https://www.bowwwl.com/terms-and-conditions (risk reading, not legal advice; no content licensed by this review)
- **R19** MoneyBowl by Bowlero developer listing: https://apps.apple.com/us/app/moneybowl-by-bowlero/id1639597575
- **R20** BowlingThisMonth public comparison UI: https://www.bowlingthismonth.com/ball-comparison/ (WebFetch 403; ordinary public curl fallback succeeded; no ratings/database imported).
