# Arsenal Pro launch plan 1

Analysis date: 6 November 2026 (ET). Planning only: no app changes, store enrollment, submissions, spend, accounts, outreach, PR publication, merges, deployments or live database changes.

Page: [Arsenal Pro launch plan](https://cursor.com/canvas/store-bbdd68de-0378-45ea-8dd5-de6713a0279f/811a0b03-5201-4dc5-991a-29f0cd6b7d7f).

## 1. Recommendation — launch the useful bag, not another feature list

**Fix ownership/privacy and search-first setup → private league PWA beta → iOS TestFlight with a bundled Capacitor/WKWebView app → controlled App Store release.** Add Google Play through PWABuilder/Bubblewrap Trusted Web Activity (TWA) once the PWA and domain verification work, or prioritize Android first if the consenting beta cohort predominantly uses Android. Keep the PWA as the free, installable route throughout. Do not require AI chat, universal ball coverage, paid model services or video reconstruction to launch.

The current public web URL is an early-access distribution route, not evidence of broad launch readiness. Owner's t98u clarifies that the initial 22 balls are his setup; new bowlers need a brand-neutral whole-catalog picker and a real empty bag, not his checklist. The launch promise should be: **“Your balls. Your league night. Saved on your phone.”** Only make stronger cloud/offline claims once the gates below pass.

**Preliminary schedule:** roughly 4–5 weeks to a meaningful private PWA beta and 10–12 weeks to a store/public launch decision after implementation approval, for one owner plus AI assistance. This is a planning estimate, not a launch-date promise; enrollment, D-U-N-S, review rejection or data/migration failures can extend it. The database deadline is much sooner and cannot wait for this timeline.

## Evidence status

- App findings are inherited from `docs/GAP_ANALYSIS_2.md` (app PR #1 baseline `0f40a4af09518656bde980e80af63fe96494541c`, API PR #1 baseline `869171948f7783f8624e66b66ff2cfcfc111ca34`) and `docs/DECISIONS.md`. They are not fresh runtime/source validation or evidence those PRs are live. The detailed companion onboarding draft identifies missing audit work.
- A fresh exhaustive repo investigation and repository writes require a CloudAgent under the coding workflow; that tool is unavailable to this executor. Draft files were therefore saved outside the checkout. No branch or PR was created. Do not report a completed new source audit or published PR.
- Primary platform pages below were opened this turn on 6 November 2026 ET. Apple's opened guideline page was last updated 16 October 2026. Packaging documentation establishes a route, not a passing build or guaranteed store approval.
- Render connector reported **no selected workspace** and requires user confirmation before a workspace-scoped retry. No workspace was guessed. Therefore the prior owner-context expiry of **15 November 2026, 9:08 PM ET** is **not reverified against the account** here. General Render expiration rules and prices were verified from public docs.
- No real-device tests, user interviews, new trademark clearance, store listing availability checks, signed build or live account deletion tests were performed. All acceptance targets below are directional planning choices unless a platform source is cited.

## 2. What we have / what launch still needs

| Area | Existing, documented capability | Launch gap |
|---|---|---|
| Core PWA | GitHub Pages, ES modules/no web build, offline cached shell, optional accounts, Render API | Prove fresh/returning/upgrade behavior on actual devices, truthful offline and storage claims |
| Discovery | Previous audit measured 165 searchable entries: 22 built-ins + 143 maker rows; fuzzy search and guarded maker lookup | Welcome still all-22; finite catalog, gaps/brand filter/manual fallback; no universal-catalog claim |
| Ownership | Event log with physical owned instances, bag/status, layout/surface, exports | Legacy profile ownership disagrees; non-built-in/duplicate detail and restore paths incomplete |
| Privacy/recovery | Optional auth, account export/delete, JSON backup, local usage counters | Keep-data signout copies account events into backup-code stream; legacy dual-writes; deletion scope needs end-to-end check |
| Modeling | Source/model labels, known model limits, unchanged engine with parity harness | No accuracy/score-improvement marketing; 7,500/0 is code parity, not physical validation |
| Community | Private My Team, opt-in per-item sharing, native share cards, kit, tags, Center Regulars | Moderation review is a store gate; reporting/removal alone may not satisfy filtering/blocking expectations |
| Catalog sourcing | Maker-factual sources/dates, no official photos/retailer table copying in reviewed PR | Per-source permissions/terms and weight variants still require maintenance; attribution is not blanket licensing |
| AI | Guardrail docs, proposed offline rules helper, no chat runtime at prior audit | Not a launch blocker; paid AI requires separate owner approval, consent/budget/backend operations |

## 3. Distribution options and architecture

| Route | Fit with this app | Added work / constraints | Recommendation |
|---|---|---|---|
| PWA-only (iOS Safari + Android browsers) | Keeps GitHub Pages, plain ES modules, `script-src 'self'`, free/offline core and optional accounts | Add-to-Home-Screen instructions; browser storage can be cleared/evicted; first visit needs network; no store discovery | **First beta and permanent fallback**. No store fee; not an App Store listing. |
| PWABuilder / Bubblewrap TWA → Google Play | Browser renders the existing hosted PWA; PWABuilder uses Bubblewrap [S10–S11] | Signed Android App Bundle, target API 36+, Play account/review, verified root `/.well-known/assetlinks.json`, icons/splash/back behavior, first-install offline limitation | **Lowest-drift Android route**. Reuse PWA; no new JS app framework. |
| Capacitor with bundled web assets / WKWebView → iOS | Existing static app copied to an isolated `www`/webDir and shipped inside app; native share/files can add meaningful mobile utility [S12–S13] | Mac/Xcode/signing/native build workflow, audited native bridges, storage origin transfer, CSP/plugin tests, native lifecycle/accessibility; App Store 4.2 review | **Preferred iOS store route after PWA gate**, not a remote-page launcher. |
| Handwritten WKWebView shell | Avoids Capacitor framework dependency | Must implement/maintain share, files, navigation, storage, bridge security, permissions and lifecycle in Swift yourself | Only if a spike shows Capacitor cannot meet unchanged CSP. Not automatically cheaper or safer. |
| Full native rewrite | Could specialize every interaction | Two UIs, migrations, ongoing parity burden; no evidence current web core needs replacing | Reject for this launch; don't spend months to obtain an icon. |

### Android: domain verification is a concrete dependency

TWA requires domain ownership proof through Digital Asset Links at the **origin root** [S11]. The app currently lives at `https://majalen3.github.io/arsenal-pro-bowling/`, a project subpath. Putting the file at `/arsenal-pro-bowling/.well-known/assetlinks.json` is **not** root verification. Determine whether the owner can publish `https://majalen3.github.io/.well-known/assetlinks.json` via the user-site repo, or choose an owner-approved custom domain/host with root control. No new repo/domain/hosting was created here. Include the **Play App Signing** certificate fingerprint, not only the local upload/debug signature. If verification fails it falls back to a Custom Tab with browser UI; a build that merely opens the page is not success.

Changing domain also changes local storage origin. Export/restore or optional account transfer is required; never assume the old PWA's IndexedDB follows a redirect. TWA generally uses the selected browser's site storage; test the actual browser/container rather than promising all existing Chrome/PWA data appears.

As of the opened policy, new phone apps and updates must target **Android 16 / API 36** from 31 August 2026; the cited extension date of 1 November 2026 has already passed [S9]. Do not use a stale PWABuilder package blindly. Verify generated SDKs, App Bundle signing, policy declarations, Android device verification and pre-launch report before closed testing.

### iOS: packaging does not mean acceptance

Capacitor documents `package.json`, a separate web-assets directory and a root `index.html`; `cap sync` copies those assets to the native project [S12]. Current iOS docs specify WKWebView and Xcode 26+ [S13]; pin and recheck the selected version and Apple's submission SDK requirement when building. Keep the existing no-build **web** deployment; a separate native staging/copy/sign/build step is unavoidable for App Store distribution and needs owner agreement. Do not introduce a bundler into the web app merely to package it, and never copy private fixtures, source secrets, git metadata or development endpoints into the shipped asset directory.

Bundle the actual app and offline catalog, not just `server.url` pointing to GitHub Pages. Use reviewed release assets in binaries; native feature changes ship through normal store review. Don't use service-worker or remote-code updates to bypass Apple's 2.5.2 restrictions [S1]. Define whether the native build disables web SW registration and relies on bundled assets; test catalog/import/OCR assets accordingly. First-launch airplane mode should work only if required resources are actually bundled; the optional OCR download may still need an internet-first message.

A wrapper has its own storage container/origin. Existing Safari/PWA data does **not** automatically appear. Provide an explicit backup file import or account recovery path; test duplicates, preferences and errors. Render's current account CORS allowlist covers the Pages origin according to the ADR; native scheme/origin changes require a narrowly scoped API review and staging test. CORS is not authentication. Do not use `*`, disable CSP, allow mixed content, insert remote scripts or permit arbitrary URL navigation to make the wrapper work. Native bridges must satisfy `script-src 'self'` without eval/inline exceptions; if not, stop the native spike and retain the PWA while resolving it.

Native utility should serve actual bowling jobs: persistent offline arsenal and scoring, share/export via system UI, import via Files, optional reviewed card capture, safe keyboard/safe-area/navigation. These demonstrate utility; they are not a checkbox guarantee of 4.2 approval. Camera/photo permissions only at the requested action, minimal scope, typed/file-picker alternative; purpose strings and privacy manifests/required-reason API declarations audited for selected dependencies.

## 4. Store rules, identity, privacy and review

### Apple

- **4.2 Minimum Functionality:** more than a repackaged website; useful, app-like lasting utility. A thin launcher risks rejection; no automatic exception just because PWABuilder/Capacitor generated it [S1].
- **5.1.1(v):** core access without login when no significant account-based requirement; if account creation exists, offer in-app initiation of deletion of account and associated data [S1,S2]. Arsenal has an account-delete UI per prior audit, but that does not close the gate: verify team footprint, queued events, phone-retention choice, legacy copies, deletion completion and no automatic re-upload. A retention policy must match actual behavior. Apple says a non-regulated app cannot require a support email/call/chat to complete its deletion flow, so the Google-allowed email web fallback below must not replace the existing Apple in-app deletion path [S2]. No test deletes against live data without approval.
- **4.8 Login Services:** own email/password-only sign-in is an explicit exemption. Do **not** add Sign in with Apple just because this is an iOS app. If Google/Facebook/social login is later used for the primary account, provide an equivalent privacy-preserving login meeting the guideline; Sign in with Apple is the usual implementation, but the rule is expressed as capabilities/exemptions, not an unconditional Apple-button mandate [S1].
- **Privacy labels:** declare actual off-device collection even if accounts are optional; locally processed-only data is treated differently from server sync [S5]. Inventory email/account IDs, event/bag/history/note data, team shares, maker search requests, logs/IPs, processor retention, and future SDKs. Do not label the whole app “Data Not Collected” because usage counters or OCR stay local. Labels and the privacy policy are distinct deliverables; nutrition labels do not replace consent.
- **Support/privacy/metadata:** working support contact and policy URL in app and listing; complete review notes, honest age rating, IP rights and app-in-use screenshots [S1,S4]. If reviewer needs account-only features, owner must explicitly approve a test account or compliant demo/review access. Nothing created here.
- **TestFlight:** included with membership; up to 100 internal App Store Connect users and 10,000 external testers, builds usable for 90 days. First external build goes to beta review; subsequent builds may not require full review [S3]. Actual league testers are external, not pretend internal team members.
- **Review time:** Apple's opened page says at least 50% reviewed in <24 hours and 90% in <48 hours; not a guaranteed SLA or an enrollment/beta/appeals estimate [S4]. Reserve schedule buffer, not a fixed “24-hour launch.”
- **Developer identity/fee:** **US$99 per membership year**. Individuals/sole proprietors display the legal personal name as seller. Organizations require a real legal entity, D-U-N-S (except government), authority, domain-linked email and functional organization website [S6]. A brand/DBA alone is not an organization. Choose with owner before enrollment; don't create a shell organization just to disguise identity.

### Google Play

- **Fee:** **US$25 one-time**; identity verification and personal-account Android device verification apply [S7]. Play uses Android App Bundles; package names are permanent, so choose only after branding/ownership review [S8].
- **New personal-account closed testing:** personal developer accounts created **after 13 November 2023** must have at least **12 testers opted in continuously for the preceding 14 days**, then apply for production access [S14]. Meaningful engagement and feedback matter; the page says review usually ≤7 days but can take longer or require more testing. Each qualifying tester needs their own continuous period; one dropout does not reset everyone else's elapsed time. This rule is not automatically required for every account or all organizations. No fake/incentivized ratings or purchased sham testers.
- **Data safety:** form required for closed/open/production tracks even if no collection; internal-only test track exempt [S15]. Includes controlled WebView traffic and pseudonymous data; store definitions differ from Apple's, so do not copy answers blindly. Optional sync is still disclosed. Review actual ephemeral processing/logging rather than assume it is invisible to declarations.
- **Deletion:** in-app path **and functional web deletion-request resource**, usable by someone who uninstalled the app [S16]. Existing in-app delete alone is insufficient. A named support-email request path can meet the web resource policy if genuinely operable and clear; a static policy that only sends them back into the app cannot. Prefer a public dedicated page with secure request/identity verification and retention/completion expectations. Existing account/recovery service may be reused; don't add an unauthenticated delete endpoint.
- **Organization:** D-U-N-S, legal name/address/site/phone/contact verification; number requested free; obtaining one can take up to 30 days per Play's page [S17]. Legal/public contact implications differ between individual and organization. Genuine entity choice only, not an evasion of testing.
- **Remaining submission gate:** complete content rating, target audience, ads declaration (truthful even if none), access instructions, privacy/support/deletion URLs, target SDK and generated package compliance; account/device verification and current Console checks must pass. Review/production access is not guaranteed after a 14-day timer.

### Newly important community blocker: UGC moderation

The existing community ADR explicitly says **no profanity filter**, reports go to a league secretary, and members can be removed. Apple 1.2 requires a method for filtering objectionable material, reporting with timely responses, user blocking and published contact [S1]. A profanity list is not necessarily the required filtering method, but “private groups + remove member” is not proof of a compliant solution, and secretary removal may not equal a personal block. Google defines UGC as visible to at least a subset of users, so private groups are in scope. It requires accepted terms before contribution, defined objectionable behavior, effective ongoing moderation and appropriate in-app reporting/blocking. Its full policy distinguishes verified closed communities, one-to-one interactions and public UGC; determine which actually applies rather than assert every private group has identical controls [S23]. Do not assume Apple compliance covers Google.

Choose before store submission:
1. **Recommended smallest safe launch:** ship personal/offline bag/scoring + explicit system share sheet; defer My Team's hosted notes/shares in the initial store build **only if the owner approves that scope change**. This is not implemented or silently disabled here.
2. Or audit and implement suitable filtering/report/block controls, published support and developer escalation, clear acceptable-use terms, timely incident response, retention/deletion and abuse tests. Existing team tables may be reused; backend/UI changes and **ongoing human moderation** are still real work. No public feed, direct messaging, follower economy or leaderboard is needed.

## 5. Launch gates — evidence required, not just a checked document

| Gate | Pass evidence | Scope / decision |
|---|---|---|
| G0 — Approval and exact baseline | Owner reviews existing app/API PR #1 and docs chain; no new features declared live until approved deploy verified | No merges authorized by this analysis |
| G1 — Empty/search-first onboarding | No all-22 auto-ownership; all sources share picker; explicit manual/offline/skip; both segment usability tests | Companion audit; preliminary 10–16 engineering days inclusive of G2/G3 client work |
| G2 — Ownership/privacy | One physical owned ID everywhere; duplicate history survives; signout/expiry never silently downgrades to backup-code stream; legacy writes resolved | Launch blocker, not a copy fix |
| G3 — Recovery and durable service | Local/backup/account states truthful; file restore and optional account transfer verified; owner-approved DB plan + restore rehearsal | Expiring free Postgres cannot underpin launch promises |
| G4 — Rights/brand | Name/similar-name/App Store/Play/common-law/trademark checks incl. software and merch; maker-source inventory/terms and dependency licenses | No clearance performed; no merch until owner resolves name. USPTO search is a starting point, not legal clearance [S20] |
| G5 — Privacy/support/legal | Public support URL/contact, privacy policy, terms/conduct, data attribution, deletion request URL; accurate labels/data-safety + actual deletion tests | Existing page availability/content not verified in this pass; audit rather than declare absent |
| G6 — Community scope/moderation | Owner chooses initial My Team scope; either compliant filtering/report/block/escalation or approved deferral | New backend work/manual operations if retained |
| G7 — Functional/accessibility | Crash-free core journeys, offline/update/cold-start/failure tests; ≥44 px, screen readers/large text/keyboard, no scoring clutter | No regressions; physical accuracy claims excluded |
| G8 — Native build policy | iOS CSP/bridge/data transfer/signing/required SDK; Play root asset links, AAB/API 36+, real device verification | Packaging spike, not yet done |
| G9 — Beta / listing | Two useful league nights, all critical issues resolved, correct screenshots and complete access/review notes; Play testing where applicable | Platforms can request further review/testing |

**Database:** owner context says expires **15 November 2026, 9:08 PM ET**. Verify the selected Render workspace/account and exact deadline promptly with owner confirmation. Render's opened Free docs say 30-day expiry, inaccessible after expiry; 14-day post-expiry upgrade grace, then deletion; **no backups for Free Postgres** [S18]. The grace period is not service continuity. Prefer approved upgrade of existing DB with backup/restore plan rather than churn disposable free databases. No upgrade/export involving private user records or live migration was performed. Export authorization and safe secret-handling/access route must be reviewed separately.

Render's free API sleeps after 15 minutes without inbound traffic and can take about a minute to wake; Render explicitly advises against free instances for production [S18]. Local core must not wait for the API; store review needs working account/lookup backends and honest loading states. An always-on service and paid durable DB are the recommended public-launch baseline, subject to owner OK and sizing evidence.

## 6. Phased release plan

Assumption: one owner plus AI assistance, at most two work items in progress; two-week planning cycles. Week 1 begins **after implementation authorization**, not automatically today. Capacity/estimates are directional. Do not claim the dates or acceptance tests are completed.

| Phase | Planning window | Exit / control |
|---|---|---|
| 0 — Decision/readiness | Now / before DB expiry | Confirm workspace/deadline and hosting choice; choose first store/platform/entity/name path; assign support/catalog/moderation owners; review prior PRs separately |
| 1 — Stabilize product | Weeks 1–3 | Fresh source audit, owner-safe migration, G1–G3 implemented/tested; no destructive live cleanup; roughly 10–16 engineering days, so may spill beyond three weeks |
| 2 — Private league PWA | Weeks 4–5 | Owner invites consenting bowlers separately; two league nights; 10-person balanced task study plus technical restore/privacy matrix; paper/consented count feedback; no paid ads |
| 3 — Store packaging spike | Weeks 6–7, only with approval | Prioritize iOS if cohort calls for it; test bundled build/CSP/files/share/transfer; prove Android root domain route; verified developer enrollment/metadata/privacy/support/moderation choice |
| 4 — TestFlight / Play closed | Weeks 8–9 or later | iOS external beta review first; Android 12 continuous opted-in testers for 14 days if new personal account, plus real feedback; invite a voluntary buffer above minimum, e.g. 15–20 total (planning choice) |
| 5 — Soft launch | Week 10 onward | Small owner-selected geography/community; manually controlled release after approval, no promise of percentage rollout support for an initial release; support and retention observations for two nights |
| 6 — Public launch decision | Weeks 11–12+ | All gates pass; accurate listing assets; owner explicitly approves release and any announcement; broaden outreach only after retained usefulness, never bought rankings |

Native work estimate in addition to onboarding: **7–12 engineering days** for one iOS wrapper plus basic Android TWA, followed by **5–8 days** of device QA, listing/privacy/support work; these are provisional until the packaging spikes and existing tests are examined. Entity enrollment, D-U-N-S, 14-day test and review waits can overlap paperwork but not substitute for engineering. If one owner cannot sustain two release trains, launch **one store first** and keep the other on PWA; cut platform breadth before cutting privacy/recovery gates.

If Apple rejects 4.2, preserve the PWA, examine the actual review feedback, improve legitimate utility or defer iOS. Do not resubmit the same thin wrapper repeatedly or hide features. If Play declines production access, continue meaningful closed testing and address feedback; never fake testers.

## 7. Positioning and ASO draft (not submitted)

**Audience:** league bowlers who want their actual equipment and the next useful action handy; advanced equipment users get optional depth. Sports primary category is the starting hypothesis, not a verified category assignment. No claim of USBC endorsement, official manufacturer partnership, exact shot recreation or guaranteed score improvement.

| Field | Draft | Note |
|---|---|---|
| Name | Arsenal Pro | Provisional; trademark/name availability unresolved. Apple/Play name limit 30 [S8,S19]. |
| Apple subtitle | Your balls. Your league night. | Under 30 characters; test comprehension, no unsupported superlative. |
| Apple keyword candidates | bowling,ball,bag,league,score,tracker,layout,offline,practice | Under 100 characters total; prune duplicates of chosen title/subtitle; no competitor or maker trademark stuffing [S19]. |
| Play short description | Keep your bowling balls, league nights and notes together, even offline. | Under 80 characters; qualify offline after first PWA/TWA load where applicable [S8]. |
| Lead description | Bring your own bowling balls into one clear bag. Save equipment and league-night records on your phone, with backup and account sync as optional choices. | Only publish after privacy/default-local contract and restore gate actually pass. |
| Feature bullets | Find your balls; choose what you bring; log a night; keep layout/surface records; export a backup | Only tested features in submitted build; no future AI/Ruby/video promises. |

Store pages should mention finite catalog coverage + manual entry, no camera required, core without account, where data lives, and that modeling is approximate. “Free core” is a standing product promise, not a license to conceal potential future paid extras. No paid launch feature is planned; reassess store payment rules if monetization changes later.

### Real screenshot plan

Capture from the actual approved release build on real/simulator devices using clearly fictional demo fixtures, never the owner's personal name, serial, account, private team or real league stats. Current repo references under `docs/qa-reports/latest/visual/` (Bag, Tonight, Results/session, card, Lane) are **QA references**, not proof of native release/store-sized assets and not to be stretched into compliance.

| Order | Image / message | Capture gate |
|---|---|---|
| 1 | “Your balls, ready for tonight” — one clear real Bag | Non-built-in and built-in owned instances work identically |
| 2 | “Find the balls you own” — actual new search/multi-select | **Blocked until implemented**; no invented mock used as a release screenshot |
| 3 | “A night, without the clutter” — actual scoring/session | No new scoring extras; fictional score data visibly normal app UI |
| 4 | “Keep layout and surface notes” — actual owned detail | Optional detail; all numbers sourced/entered/model labeled |
| 5 | “Saved here. Backup when you choose.” — real recovery status | Privacy and durability gate passed; no false Protected/forever claim |
| 6 optional | “Share what you're bringing” — share preview, not fake conversation | System share action only; hosted Team shown only if approved/compliant in submitted build |

Include a real dark-mode image and large-text QA before export. Apple allows up to 10 screenshots and requires app-in-use views; verify currently accepted device sizes and iPad requirement from [S21] at capture time. Google requires its own 512×512 PNG icon, 1024×500 feature graphic, and at least two screenshots; up to eight screenshots per device type. Four 1080×1920 portrait app screenshots are a recommendation-eligibility target, not the minimum to publish [S24]. Google listing uses its own asset rules; no clone of an Apple store/interface, no brand photos without rights, no generated UI disguised as a screenshot. Optional short screen-capture preview after stable UX; no cinematic concept video standing in for the product.

## 8. Community-first launch, matching the existing playbook

The league is the community. Use the five existing tactics from `docs/TEAM_PROMPT_COMMUNITY_DIRECTOR.md` without turning the app into a public social feed:

1. **League night:** owner-led voluntary private beta anchored to two real nights. Observe setup/packing before play and recap after, not prompts during scoring. No invitations sent in this task.
2. **Shareable artifacts:** opt-in native share sheet for “These are the balls I'm bringing,” Old Friends or a non-evaluative recap. Preview data; no auto-posting, contact scraping, auto-invites or score ranking. Ask once after a session at most, respect dismissal.
3. **Pro shop kit:** prepare a factual, printable QR-to-model selection sheet for later owner-approved pilot. Owner chooses the recipient and exact outreach separately. No merch/Arsenal printing or official ball images until rights/name clearance; QR never auto-owns a ball.
4. **Identity tags:** optional left/right/one-/two-handed and league identity, presented equally. No style leaderboard or inferences of ability.
5. **Center Regulars:** optional descriptive night count/recognition; threshold/season are app rules pending owner review. No streak that can be lost, geolocation tracking requirement, locked badge or attendance pressure.

Proposed initial organic sequence: one league → one neighboring league invited by a consenting human → optional pro-shop demonstration → broader listing/social announcement approved separately. Do not send drafts or outreach in this phase, buy installs/reviews, pay for TestFlight participation, promise affiliations or publish a user roster. Apple explicitly prohibits compensated TestFlight testing in its guidelines [S1]. Support feedback is not public content by default.

## 9. Metrics and decision thresholds

**All numbers in this table are directional product targets, not researched industry benchmarks, causal lift estimates or results.** Use 10-person formative task testing to find defects, not to claim statistical retention lift.

| Metric | Proposed gate | Collection / interpretation |
|---|---|---|
| Correct first-ball activation | ≥8/10 add their correct ball ≤60 sec; ≥4/5 each segment | Observed study, no personal specs recorded without consent |
| Multi-ball setup | ≥8/10 save three correct physical balls ≤120 sec | Include typo, variant and manual/offline task |
| Ownership/data integrity | Zero lost/duplicated instances, false ownership or silent cross-stream uploads | Local/mocked regression matrix and separately approved staging; any incident stops expansion |
| Recovery understanding | ≥7/8 can explain phone/account/file state; find restore ≤30 sec | Consenting four per segment; not a benchmark |
| Actual league usefulness | ≥6/10 voluntary beta participants use their bag on both of two eligible nights | Denominator excludes those who did not bowl; no daily streak or shame notification |
| Return/use | Track return on next eligible league night, not just generic D1/D7 | Consented check-in/local exported counters; no automatic server analytics |
| Core reliability | Zero release-blocking crashes/write failures in agreed test matrix | This is not a population crash-free percentage; later store diagnostics interpreted with n |
| Pressure | Every study participant rates felt pressure/judgment ≤2/5 | Stop coercive badge/share prompts even if taps increase |
| Support | Proposed acknowledge ≤2 business days; privacy/moderation incidents same-day triage | Owner must agree and staff this before promising it publicly |
| Catalog ops | Count not-found requests, wrong variant/spec reports and time to verify | Private submissions reviewed; measure labor before coverage promises |

Current `ap_ux` counters are local-only per prior docs. App Store Connect/Play Console offer platform-level downloads, conversion and some diagnostics; use aggregate views without embedding third-party scripts. A new telemetry endpoint/identifiers/automatic upload would be **new backend work and a privacy change**, not assumed part of launch. Voluntary count export should exclude names, model lists, exact scores, free text and tokens. Never turn private notes into analytics data to improve a funnel.

## 10. Budget — every paid item needs owner OK

USD public prices checked this turn. No purchase or billing change authorized. Taxes, region, future pricing and actual resource sizing can differ.

| Item | Current published / planning cost | Approval and scope |
|---|---|---|
| Existing PWA on Pages | No additional store enrollment fee | No new paid service assumed; existing hosting terms/quotas still apply |
| Apple Developer Program | **$99/year** [S6] | **Owner OK required**, identity/entity and renewal choice before enrollment |
| Google Play account | **$25 one-time** [S7] | **Owner OK required**, genuine account type and verification |
| Both store memberships | **$124 first membership year** | Fees only, not total launch cost; owner OK required |
| Durable Render Postgres | Entry paid compute **$6/month**, storage **$0.30/GB-month** [S22] | **Owner OK required**; sizing/storage and backup retention verified before plan choice; no upgrade done |
| Always-on Render API | Entry paid compute **$7/month** [S22] | **Owner OK required**; recommended for dependable public account/lookup service |
| API + DB baseline | **$13/month compute + storage/overages/taxes** | Scenario, not a quote for this account. No $25 Pro workspace purchase assumed; workspace tier and compute are separate |
| Domain / organization support email | Not priced; provider/domain unselected | **Owner OK required**, ongoing; domain needed only if root control cannot otherwise be secured / entity email requirements |
| Mac, signing build access, iPhone/Android testing | $0 incremental only if owner already has suitable access; otherwise quote first | **Owner OK required** for hardware/hosted Mac/build service; do not assume Linux can sign an iOS release |
| D-U-N-S request | Standard request free per Play [S17]; legal entity costs not estimated | Owner handles/approves entity choice; no paid intermediary assumed |
| Trademark/legal/privacy review | Quote not obtained | **Owner OK required** before paid counsel/filing; no filing-price guess |
| Support/moderation/catalog work | Owner time; labor budget not measured | Assign an owner; outsourced paid help needs **owner OK** |
| Paid AI, ads, PR agency, ball photos | **$0 proposed allocation for launch** | Deferred, not purchased. Any later paid pilot/provider/outreach needs separate explicit approval |

Public launch does not require Kubernetes, a queue, vector database, new agent service, push infrastructure or paid growth stack. It does require durable existing backend operations if accounts/teams are advertised.

## 11. Operations, backend changes and risks

### New backend/infrastructure flags
- **Required existing-backend work:** stop silent sync stream downgrade and legacy dual-write leakage; test deletion and recovery consistently; maintain account isolation and rate limits. No new separate service needed merely for first-run search.
- **Native:** narrowly allow vetted native origin/scheme if needed; keep bearer authorization, no wildcard CORS; test external navigation/deep links. This is a backend config/release change, not a free wrapper toggle.
- **Public deletion:** dedicated web request page/support process; secure auth verification can reuse account APIs. Recovery email provider remains an owner decision. A contact form/email creates ongoing manual response work if not automated.
- **Teams:** filter/block/report/escalation controls may need schema/UI/API additions and incident queues; existing role removal alone not verified sufficient. Ongoing moderator is needed if retained.
- **Domain:** root assetlinks hosting may need user-site repo/custom-domain configuration and a local-data transfer plan. None performed.
- **Service continuity:** approved paid DB/API compute, backup retention and restore drills, error/support triage. Render free DB is not a durable production tier.
- **Catalog:** per-maker parser/source/terms check, product retirements/new colorways and weight-specific facts; track source date and unknowns. Proposed initial maintenance allocation 30–60 minutes/week plus requested/new-ball review is a planning budget inherited from prior analysis, not measured staffing. No website grants blanket photo/text permission because specs are factual.
- **No new cloud AI for launch.** If later cloud AI uses personal context, Apple's opened 5.1.2(i) explicitly calls for disclosure and explicit permission before sharing with third-party AI [S1]; provider budget/retention/abuse handling are separate.

### Risk register

| Risk | Likelihood / impact (judgment, not measured) | Mitigation / trigger |
|---|---|---|
| Wrong/ambiguous ownership migration | Material / high | Versioned no-loss preview, immutable IDs, backup and idempotent fixtures; zero data-loss tolerance |
| Expired DB during beta/review | Known deadline from owner context / high | Confirm account deadline, choose durable hosting before expiry; do not rely on grace |
| Apple thin-wrapper rejection | Material / high | Bundle useful app, prove offline/native files/share/lifecycle; review notes; preserve PWA fallback |
| Team UGC inadequately moderated | Material / high | Owner approves defer or funds/assigns compliance controls and operational response |
| Android domain verification / stale SDK | Material / medium-high | Root control + signing fingerprint proof; target API 36+, current package audit |
| Catalog misses and changing maker pages | Expected / medium | Manual save always possible, no universality claim, provenance and maintainer |
| “No data collected” marketing contradicts sync | Material / high | Inventory real network/retention; fix fallback; accurate labels/policy |
| PWA→wrapper/domain storage separation | Expected if migrating / high | Explicit file/account transfer with previews; no browser-secret extraction |
| Brand conflict after asset production | Unassessed / high | Clearance before store ID/domain/merch; name remains provisional |
| One-owner support/dual-store workload | Material / medium-high | One store first, 2-WIP cap, gates over dates, no new social feed or paid AI |

## 12. Owner decisions — in order

1. **Authorize implementation scope** separately: durable owned-instance/privacy fixes + search-first setup; this analysis does not change app code or authorize merging existing PRs.
2. **Confirm Render workspace and hosting continuity** before the owner-context expiry (15 November 2026, 9:08 PM ET); approve/reject quoted compute/storage budget and backup plan. If spending is declined, revise account/team availability and promises rather than run an expiring production DB.
3. **PWA-first then which store?** Default iOS first if league device mix supports it, Android TWA next; agree native build-only tooling exception while retaining no-build web app and unchanged CSP. Confirm access to Mac/test devices; quote any purchase first.
4. **Individual or real organization?** Accept personal seller-name visibility or use an existing eligible legal entity with D-U-N-S/domain email/site. No accounts/enrollment done.
5. **Name:** trademark/common-law/store-name clearance and willingness to rename before store IDs/merch. No name availability/clearance verdict implied.
6. **Initial My Team scope:** defer hosted community in first native release, or authorize filtering/block/report/developer escalation and staff moderation. No silent rollback of the earlier community decision.
7. **Support/privacy owner:** public support address/URL, deletion requests, terms/policy retention, email-recovery provider if desired; no contact details invented.
8. **Owner bag migration:** preserve actual saved 22-ball setup; if only ambiguous legacy state exists, owner confirms a preview. Other users never inherit it; do not identify the owner by “has app history.”
9. **Beta recruitment and store access:** owner chooses consenting league testers, Android tester availability and any review test account/demo. No accounts or outreach authorized here.
10. **Catalog maintainer and release freeze:** finite verified coverage, manual fallback, no photos without rights; approve a realistic maintenance allocation and two-night stability freeze before public launch.
11. **Publication/release authorization:** approve the exact docs PR if desired, existing app/API merges separately, store submissions and exact public announcements separately. Analysis authority is not permission to publish externally visible changes or send messages.

## Sources opened 6 November 2026 (ET)

S1. Apple App Review Guidelines (page last updated 16 October 2026), §§1.2, 2.1, 2.3, 2.5.2, 4.2, 4.8, 5.1, 5.2: https://developer.apple.com/app-store/review/guidelines/
S2. Apple account deletion guidance: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/
S3. Apple TestFlight overview: https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/
S4. Apple App Review process/timing: https://developer.apple.com/distribute/app-review/
S5. Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
S6. Apple enrollment, individual vs organization and fee: https://developer.apple.com/programs/enroll/
S7. Google Play Console setup, $25 fee/device verification: https://support.google.com/googleplay/android-developer/answer/6112435?hl=en
S8. Google create/setup app, metadata limits/App Bundles/package names/support: https://support.google.com/googleplay/android-developer/answer/9859152?hl=en
S9. Google Play target API requirements: https://support.google.com/googleplay/android-developer/answer/11926878
S10. PWABuilder Android platform (dated October 2021; use for architecture, not current SDK policy): https://blog.pwabuilder.com/docs/android-platform/
S11. Chrome TWA quick start, Bubblewrap/PWABuilder/root asset links: https://developer.chrome.com/docs/android/trusted-web-activity/quick-start
S12. Capacitor existing-web-app requirements and sync: https://capacitorjs.com/docs/getting-started
S13. Capacitor iOS/WKWebView/current environment: https://capacitorjs.com/docs/ios
S14. Google testing requirements for new personal accounts (12/14 plus access review): https://support.google.com/googleplay/android-developer/answer/14151465?hl=en
S15. Google Data safety disclosure scope/tracks: https://support.google.com/googleplay/android-developer/answer/10787469?hl=en
S16. Google deletion in-app and web resource: https://support.google.com/googleplay/android-developer/answer/13327111?hl=en
S17. Google personal/organization identity, D-U-N-S and public information: https://support.google.com/googleplay/android-developer/answer/13628312?hl=en
S18. Render Free limitations, expiration/no backups/cold start: https://render.com/docs/free.md
S19. Apple product page, names/subtitle/keywords/screenshots: https://developer.apple.com/app-store/product-page/
S20. USPTO trademark search and clearance starting points: https://www.uspto.gov/trademarks/search
S21. Apple screenshot specifications (recheck at release): https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
S22. Render current compute/storage pricing: https://render.com/pricing
S23. Google Play User Generated Content full policy: https://support.google.com/googleplay/android-developer/answer/9876937?hl=en
S24. Google preview assets requirements/recommendations: https://support.google.com/googleplay/android-developer/answer/9866151?hl=en

Internal evidence read: `docs/GAP_ANALYSIS_2.md`, `docs/DECISIONS.md`, `docs/TEAM_PROMPT_COMMUNITY_DIRECTOR.md`. Public PWABuilder GitHub Asset-links fetch returned an empty source view; no claim relies on it, and S11 supplies the root-verification rule. Render account deadline remains unverified because workspace confirmation is required. No legal advice, trademark clearance, data license or store acceptance guarantee is supplied by this plan.
