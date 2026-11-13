# Changelog

Versions follow [Semantic Versioning](https://semver.org). The offline build id (`arsenal-pro-vNN` in `sw.js`, shown in Me › About) changes with every deploy.

## Performance and cleanup pass — 2026-11-12 America/Chicago; offline build v75
No screens, wording or saved data changed; simulatePath unchanged, equivalence 7500/0. Measured at 4x CPU throttle on 50 balls / 500 games (docs/PERF_LEARNINGS.md):
- **Scoring tap to painted 584 -> 130 ms**, Log book render 1,648 -> 454 ms, Strike line screen 977 -> 264 ms, game page 485 -> 245 ms. Cause: the split check was recomputed for every first ball on every redraw; it is now memoised (all 1,023 leaves tested equal to the old rule).
- Owned balls are registered once per new projection instead of on ~150,000 lookups; `legacyLineKey` no longer scans every owned ball per ball.
- Every route's static module closure is now hinted with `modulepreload` (guarded by a test). Lighthouse effect is within its noise; not claimed as a win.
- New: opt-in local perf marks (`?perf=1`, no network), profiling tools in `tests/perf/`, a budget gate `tests/perf_budget.py` with `docs/PERF_BUDGET.md`, the service-worker precache test, `docs/TECH_DEBT.md`, `docs/REMOVED_LOG.md` (5 proven-dead functions removed), `docs/PERF_LEARNINGS.md`.

## Arsenal grid — 2026-11-12 America/Chicago; offline build v74
- **My balls is a grid**: 3 tiles across at 360-414 px, each only the ball picture (our own preview) and its name. A kept ball has a small pin badge in the corner.
- **Tap a ball, get everything**: the ball page now opens with **Keep in bag** (on/off), then Record (layout, surface, games logged, best game), specs open, status incl. Retired, edit and the surface log. Arsenal then ball is 2 taps; pinning is 2 taps.
- **One Sort control** next to the search: Name, Brand, Strongest to weakest, Newest, Most used. It is remembered.
- Shelf view, milestones and Old Friends are still one tap below. Arsenal screen: 70 → 45 words, 27 → 18 controls, 1020 → 884 px. See docs/CUTS_V73.md (#16-19). simulatePath and saved data unchanged; equivalence 7500/0.

## Bag first, 30-second test — 2026-11-11 America/Chicago; offline build v73
- **Bag** opens with tonight's bag and the oil/lane (Oil & lanes ›, a Lane condition switch), then compact rows (name, role, Swap, **Keep**), Bring, **Shake it up** / Suggest again and Pack. Pack is visible without scrolling. The Tonight/All switch is gone; `#/bag?view=all` opens Arsenal.
- **Keep in bag**: a one-tap on/off toggle (pin icon, aria-pressed, 44 px). Kept balls stay through Bring changes, Suggest again and Shake it up ("Kept: stays when you repack, change Bring or shake it up.").
- **Shake it up**: a random but sensible bag of the same size from balls that are ready or at home. It keeps kept balls, the spare and at least one ball with modeled specs, differs from the current bag when it can, shows In/Out, and has **Undo**.
- **Find my strike line** is its own screen (`#/strike`): a lane picture from stand to target to breakpoint to the 1-3 pocket (1-2 for left-handers), four tiles (stand, target, breakpoint, ball), an "estimate" tag, **Use this line**, and one Details.
- **Compare** draws each ball's line fitted to the pocket (labelled estimate). The table still compares the same line.
- **Arsenal** starts with a search box and one row per ball with Keep. Shelves, milestones, Old Friends, the catalogue and Export are one tap away. **Log book** starts with stat tiles; Bowler Card, Wrapped and CSV are under More.
- **Score page** fits one screen at 360x780 and 390x844 (the step ladder and read are under "Ball change, read and details").
- **Page top**: every route opens at the top (manual scroll restoration). The safe area goes through `--sat`/`--sab`. The ball hero is 44 px (was 96). The title and first content are never under the header (tested).
- **Specs**: "TBD" is now a quiet "not published". 13 Epic rows have RG/diff from the maker. 900 Global Sublime was added from bowlinglife.eu (flagged secondary, not the maker). RG/diff gaps on non-plastic balls went from 23 to 10.
- **Add a ball** lookup: a miss is a card with Retry, the maker page or maker search, and typed specs. An API companion (arsenal-pro-api PR #4) adds a maker-site search fallback.
- Clutter audit: 1105 → 337 words across the six spine screens. See docs/CUTS_V73.md. simulatePath unchanged; equivalence 7500/0; routes and saved data unchanged.

## Strike finder before scoring — 2026-11-11 America/Chicago; offline build v72 (first live build of the product spine; v71 never deployed)
- Strike line (`#/tonight`): **Find my strike line ›** is now the primary button, right under the start line, with **Lane view ›** beside it. **Start bowling** follows as a plain button after Stand · Aim and Who's bowling. The one-time hand question sits under Start bowling.
- Tonight's bag on Strike line folds its rows under one line of ball names (tap to open; Swap is inside). Pack these N and Bag builder stay visible, and the Bag tab is the full builder. League Strike line is back under the 1110 px budget (930), so the 1150 px exception from v71 is reverted.
- Evidence: `/workspace/t119-evidence/04-strike-finder.png` (360 px). Routes and saved data unchanged; equivalence 7500/0.

## Product spine — unreleased (2026-11-11 America/Chicago; offline build v71)
- Four tabs in the order a bowler uses them: **Bag · Arsenal · Strike line · Log book** (were Building · Bag · Results · Learn). The Bag is the front door. No hash, an unknown hash, `#/building` and a finished or skipped welcome all land on `#/bag`. A new profile starts empty there with Find my balls.
- **Arsenal** is its own tab at `#/arsenal` (the Armory). `#/bag?view=all` still opens it. Ball, add-ball, compare, insights and sheet sit under it.
- **Strike line** (`#/tonight`, formerly the Building) adds **Find my strike line ›** (opens Targeting and runs Find) and **Lane view ›**, one tap each, under Start bowling. Lane and Targeting highlight the Strike line tab. The game page's leave button reads **← Strike line**.
- **Log book** (`#/results`): End night lands here (`#/results?night=<id>`) with the Night saved card and the once-per-night share offer (Not now). `#/tonight?night=<id>` still shows the card.
- The Bag shows **Back to the game · game N** while a night is open.
- Learn left the tab bar. **Me** opens with a Learn card: word search, Learn, Glossary, Oil patterns. Help "?" is unchanged.
- Three-click rule: every core action is at most 3 taps from each spine screen, measured by the new `tests/product_spine.py` (worst case 3). Exceptions are in docs/PRODUCT_SPINE.md. Routes and saved data are unchanged; equivalence is 7500/0.

## Building/game follow-up + 404 catalog gaps — unreleased (2026-11-11 America/Chicago; offline build v70)
- Lane and Targeting opened from the game page stay in the game: no tab bar/rail, Help, Me or first-visit tour, and one **← Game** button back to the pad. Opened from the Building or Learn they keep the tab bar. Routes and saved data unchanged.
- The once-per-night share offer after End night is recorded when shown; **Not now** removes it and reopening the return page never brings it back. Native share sheet only.
- 13 catalog rows for the balls whose maker URL 404'd on 2026-11-10: Storm Phaze III, Phaze V, PhysiX, Summit, !Q Tour Edition; Roto Grip Idol; Brunswick Prism Solid, Prism Hybrid, Prism Warp, Prism Warp Hybrid (makers' live pages under new URLs); 900 Global Zen, Honey Badger and Roto Grip Hustle Ink (Wayback copies of the maker's own page, `specStatus: "archive"`). Facts only, source URL + 2026-11-11 read date each; no generic "Prism"; Honey Badger has no printed RG/diff, so they stay "spec TBD". The generator now accepts `archive`, Wikipedia-only `secondary` (with attribution) and name-only `community` rows, and still rejects bowlingballvideos, bowwwl, bowlingball.com and BowlingThisMonth. Existing rows, `simulatePath` and the engine baseline unchanged (equivalence 7500/0).

## Home = the Building, scoring = the game — unreleased (2026-11-10 America/Chicago; offline build v69)
- Home is **the Building** (`#/tonight`); scoring is a focused **game page** (`#/bowl`) with no tab bar, Help or Me, and a ← Building button. Tabs: Building · Bag · Results · Learn. End night returns to the Building with a Night saved card and a once-per-night native share. Deep links and saved data unchanged; `#/building` and `#/game` alias the two. See docs/HOME_GAME_FLOW.md.
- Search lists every catalog match for a partial name (Hy-Road 5/5, Rattler 4/4, Phaze 3/3; II = 2, case and hyphens ignored). A second physical copy sits under the ball it copies.
- 7 maker-sourced catalog rows (Phaze II, Phaze 4, Phaze AI, Attention Star, Black Widow 3.0, Purple Pearl Urethane, Venom Shock), source URL + read date each; existing rows and the engine baseline unchanged (equivalence 7500/0).
- Packing is additive: Bring adds (never swaps a ball out), Bring N fills to N and lowers without dropping the last ball with specs, Suggest again never shrinks to one ball. The `inBag` status now reads "Ready to bring"; the Bag says plainly what tonight's bag is.

## Reviewed local recovery — unreleased (2026-11-08 America/New_York EST; offline build v68)
- Add a separate explicit local-only modern-backup review: validated supported preferences/saved aims and nonempty saved-line/surface/note mirrors, per-value conflicts defaulting to this phone. Non-conflicting physical copies/layouts/games remain additive; no specs or engine changes.
- Persist a private before-state checkpoint and sync hold before applying. Offer guarded append-only Undo, including interrupted apply/Undo repair after reload. New events/queued writes/settings edits block Undo rather than roll them back; explicit Keep preserves current edits and ends Undo. Retain checkpoint history; locally undone event IDs are not silently resurrected.
- Strict durable mirror writes, commit-boundary guards, honest unsupported-field/single-tab/full-phone limits, pending-account/review checks and visible same-account last-write-wins/export protection. Nothing stages/uploads/rebinds an account or backup-code destination. Review targets are 44px and disclosure/focus survives a choice.
- Companion API3 patches only supported body-parser1.20.8→1.20.9 in the lockfile; audit HIGH1→0, isolated hosted PostgreSQL61/0. No production configuration/secrets change or deployment.
- PWA beta candidate only, not public/native launch approval; see RELEASE_READINESS and LAUNCH_FOUNDATION_VALIDATION. No merge/deploy/spend/live DB/account operations.

## Recovery validation + cold-start repair — unreleased (2026-11-07 Europe/Zurich; offline build v67)
- Load only common/selected-route modules up front, defer profile-edit/catalog code until requested and start bulk offline caching after the actual first paint. Preserve unchanged Me privacy text/focus through hydration; no content hiding or Lighthouse budget changes.
- Fail closed on unsupported backup/event schemas, unsafe object keys, stale previews and nonempty legacy mirrors needing reconciliation. Account exports/settings/pending recovery archives are explicitly not full-phone Import formats; automatic restore Undo remains unsupported.
- Initial account recovery reads its bounded stream before any new upload. Conflicting facts/mirrors stage privately with original-data checkpoint and source archive; cursor/data/destination stay unchanged, no override/rebind/wipe. Signout remains authoritative through checkpoint waits. Normal established same-account sync remains event-based LWW, not a full conflict-review/workspace system.
- Run cumulative stacked PR journey/Lighthouse checks rather than treating older red branch checks as current evidence. Companion API2 adds only explicit synthetic fixture tooling/CI and passes hosted PostgreSQL60/0; local PostgreSQL remains blocked and inherited dependency audit is a separate no-ship gate.
- Keep backup scope notes visible as information, not false checksum/preservation warnings; real conflicts still block. Remove the transient unnamed account-export link from the accessibility tree.
- Engine/catalog/equivalence fixture unchanged. No merge, deploy, live accounts/DB, paid changes or launch/legal/store approval.

## Launch recovery hardening — unreleased (2026-11-07 Europe/Zurich; offline build v66)
- Full Ball titles wrap on narrow phones; long copy names stay contained. Existing clipping/44px probes retained, no scoring extras.
- Backup restores block checksum/ID conflicts and replacement of existing facts, retain a before-data checkpoint and recheck at append. Preview includes current-backup download and honest Undo/preferences limits; ambiguous recovery is blocked, not silently merged.
- Signout/cancellation supersedes pending authentication; stale account/sync401 cannot clear a newer session. Local synthetic regressions only; existing single-account privacy boundary retained.
- Added current release gates, dependency order, sourced database preservation/cost options and precise inherited CI diagnosis. No verified DB deadline, merge/deploy/spend or live changes; engine/catalog/baseline untouched.

## Launch foundations Phase 1 — unreleased (2026-11-06; offline build v65)
- New installations start with zero owned balls. Search the shared catalog locally, filter brands, review multiple physical copies and save; skip/manual unknown models remain available. Adding is not packing: start an empty bag and explicitly Bring chosen balls.
- Distinct copy names, layouts/surface notes and saved lines resolve by physical ID; no arbitrary attribution of old model-only history to duplicate copies. Unsupported specs remain unmodeled.
- Backed-up versioned legacy review is append-only, retryable and undoable; explicit older bags and all histories remain. Personal profile fields default unknown, not the owner's values.
- Local-only sync by default; keep-data signout/expiry never falls back to a backup code. Legacy private dual-writes removed. One private account history per browser; foreign account switching is safely blocked, not yet a complete multi-account feature.
- Honest local/retention/server acknowledgement and file recovery wording; no permanent-safety promise. Cold-load Insights and quick-reload physical selection repairs. Atomic offline shell v65; engine/catalog/equivalence fixture unchanged.
- Validation explicitly retains one inherited Ball-title ellipsis flow-probe failure and unrun human/device gates; no blanket all-green/launch-ready claim.
- Reusable CEO/team brief, fresh source audit and technical validation in `docs/TEAM_PROMPT_CEO_LAUNCH.md`, `docs/LAUNCH_FOUNDATION_AUDIT.md`, `docs/LAUNCH_FOUNDATION_VALIDATION.md`. PWA beta foundations only, not a launch/store readiness claim.

## Prior unmerged Now-list work (2026-11-06; offline build v64)

### For bowlers
- Earned starter cards in Armory; Old Friends retained. A single optional Next up idea is off by default.
- Lane explains the model path in one sentence. Model, measured release, entered and input chips distinguish sources without new accuracy claims.
- Weaker/Stronger previews the next ball and suggests trying feet/eyes first, only outside active scoring.
- Manufacturer-only review of all 22 built-ins, with sources/dates; corrected specs and explicit unknowns. Eight identities have no supported model rather than guessed paths. Removed two unverified search rows, not saved equipment.
- Cover guidance rewritten in our own words; MOTIV lookup supported when the companion API PR is deployed.

### Under the hood
- Deliberately frozen v64 catalog-input baseline; unchanged engines pass 7,500/0. Per-ball old/new records: docs/DECISIONS.md.
- Local S1/S2/S3 flag/counter smoke tests and run instructions; no participant lift claims, no outbound telemetry.
- Full regression verification and small accessibility repairs exposed by the audit (null text, contrast, labels, review focus/targets). See docs/NOW64_VALIDATION.md for exact results.
- CSP, offline-first/no-build approach and existing QR/owned data retained. No Engine v2 or product photos; C8/C9 remain owner decisions.

## 1.1.1 (2026-11-02)

### For bowlers
- **Add a ball: every catalogue ball now comes from its maker's own page.** All 145 rows were re-read from the manufacturer's product page (or its tech sheet) on 2026-11-02. Each ball shows the maker as the source with a link and the date read. Values the maker doesn't print show "spec TBD" instead of a number from somewhere else. Two balls with no maker page (Storm Mix Black White, Storm Tropical Surge Purple) are marked unverified; type their specs from the box.

### Under the hood
- `js/data/spec_catalog.js` is generated from `tools/catalog/maker_rows.json` by `tools/build_spec_catalog.mjs` (rows are objects with `source`, `checked`, `specStatus`); no third-party catalogue data. Offline build `arsenal-pro-v62`.

## 1.1.0 (2026-10-31)

### For bowlers
- **Arsenal Pro is for any bowler.** No team name, no one else's stats: the first run starts empty and asks for your hand, style, speed and revs (or skip).
- **Example arsenal:** on Tonight, load 10 catalog balls and 2 bags marked "example" to look around. Remove them any time on Me → Imports. Or tap "Add my own ball".
- **Optional account (Me → Account):** sign in to keep your balls, profile and games private to you and on every phone. Choose whether this phone's data goes in. Save your recovery key, export your data, or delete the account any time. Everything still works without an account.

## 1.0.0 (2026-10-31)

The first full release. Everything below is in the app today.

### For bowlers
- **Five tabs you can use with one thumb:** Tonight, Bowl, Results, Bag and Learn, with Me in the top right. Old links still open the right screen.
- **Tonight:** say where you are bowling and get the ball to start with (from your own bag only), where to stand and aim, and the ball to switch to next. A line you move on Lane or Targeting is kept for that ball and shown as "your line".
- **Bowl:** strike in 1 tap, spare in 2, leaves and splits, 10th frame, fouls, fix any frame (with Undo), "Add a game total" when you only have the score, league team and Baker scoring with USBC handicap. The screen stays on while a game is open. Nothing extra shows while you score.
- **Results:** the latest night first, every night after it, games CSV export, and My Bowler Card: average, strikes, single-pin spares, the leave to work on and a spare drill.
- **Bag:** one saved bag with "Bring: N", ball status (in my bag, at home, at the pro shop, retired), a 3-step bag builder, compare, Insights, a printable Arsenal sheet, and Add a ball from a 145-row spec catalogue or by typing the specs (works offline).
- **Learn:** 709 oil patterns, the bowling guide and a 114-term glossary. Help bubbles stay off until you turn them on.
- **Lane and Targeting:** a labelled 2-D model of the ball path for your stand and aim, half boards, and Find my strike line.
- **Your data:** saved on the phone first, works offline, syncs under a private backup code, backup file download, CSV and LaneTrax session report import (read on the phone), center memory and your own house pattern.
- **Me › About:** version, a plain privacy note and links.
- Left-handed mirror, light and dark themes, Large and Extra large text.

### Polish in this release
- My Bowler Card no longer shows a stray "null" before you have scored a game.
- My Bowler Card and the night view now have the same side margins as every other screen.
- The 10th frame fits "X X X" on a 360 px phone.
- The app description says what the app does today.

### Under the hood
- No build step; scripts only from the app's own origin (CSP `script-src 'self'`).
- Tests: 259 unit, engine equivalence 7500/0, the UI end-to-end suite, 15 whole-night journeys with visual baselines at 360×780 and 414×896, a release audit (copy, page errors, 404s, axe, side margins, first-load bytes) and Lighthouse. None of them write to the production API.

### Not in 1.0 (next release)
- Ruby sensor CSV import (being finished on its own branch).
- Engine v2 (the 3-D model stays off).
