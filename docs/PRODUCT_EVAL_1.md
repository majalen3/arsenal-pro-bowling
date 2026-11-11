# Arsenal Pro product evaluation 1

Run: 2026-11-02 (America/New_York). Prompt: `docs/TEAM_PROMPT_PRODUCT_EVAL.md` (owner prompt [pt91u] + tightening addendum).
Page: "Arsenal Pro product evaluation". The original evaluation changed no app code; implementation status below was updated **2026-11-06 (SGT)**.

**Current implementation:** all six Now items are complete on main or the review branch (Now 3/5 were already on main). The catalog is manufacturer-sourced, with explicit unknowns; S1/S2/S3 are runnable locally but have no participant outcomes yet. C8/C9 stay open. The dated licensing research in §2 is historical evidence, not the current catalog source inventory.

**How to read the scores.** Impact (I), Effort (E) and Confidence in research (C) each run from 1 to 5. Effort: 1 = under half a day of agent work, 2 = 1–2 days, 3 = 3–5 days, 4 = one 2-week cycle, 5 = more than one cycle. **Value = I × C ÷ E.** Now = it fits this 2-week cycle (1 owner plus AI agents, no paid services) and has no unresolved owner conflict. Next = the next cycle. Later = bigger work or waiting on an owner decision.
**Lift rule.** A lift figure is a sourced range from a comparable study, with its context named. Anything else says *directional, unmeasured*.
**Feasibility tags.** EXISTS / PARTIAL / NEW, with file paths.

## 0. Verdict in one screen

- The app already has more of the "engagement" layer than the prompt assumes. The trophy room, earned milestones, share cards, Center Regulars, identity tags, Season Wrapped, the step ladder and source chips are all in the code. Most of the work is **clarity and honesty, not new mechanics**.
- **Catalog rebuild complete:** the former third-party discovery data was replaced with manufacturer facts; 143 verified discovery rows remain after removing two unverified identities. All 22 built-ins were re-reviewed, and unknown/unsupported specs do not produce model paths. No permission or accuracy claim is implied.
- Badges, challenges and unlocks can be built in a values-safe way. They must be earned-only, process-based and opt-in, with no loss framing. Streak counters and leaderboards go on the do-not-build list.
- Weaker/Stronger now previews the next ball and suggests feet/eyes first in planning/between games; no new content is added during active scoring.

## 1. Feasibility map (what is really in the code)

| Feature in the prompt | Status | Where |
|---|---|---|
| Trophy room / arsenal as a case | EXISTS | `js/cc/armory.js` `shelves()` (bag / bench / Old Friends hall), Bag › All my balls; DECISIONS #31 |
| Milestones | EXISTS (earned-only) | `js/cc/armory.js` `milestones()`: 300 game, 200+ best, 1/10/25/50/100+ games |
| Locked items with progress bars | NEW, and it **conflicts** with #31 | not in the code (no "locked", "unlock" or "progress" in `js/`) |
| Badges beyond milestones | EXISTS | Four earned starter cards in `js/cc/armory.js`; Center Regular (4 nights in 90 days) in `js/cc/community.js`; identity tags in `js/screens/community.js` |
| Challenges (time-bound) | NEW | none |
| Streaks | NEW, **conflicts** with the playbook | none |
| Leaderboards | NEW, **conflicts** with #28 and community rules | none (team members listed in join order, `js/screens/team.js`) |
| Native sharing | EXISTS | `navigator.share` with a PNG fallback: `js/screens/cards.js` `sharePng` (bag, Old Friends, Wrapped), `js/screens/card.js` (Bowler Card), `js/screens/wrapped.js` |
| Small groups | EXISTS | My Team `#/team`: `js/screens/team.js`, `js/data/team.js`, API `lib/teams.js`; plain counts, rates only at 30+ chances (`MIN_SHOTS = 30`, `js/cc/card.js:15`) |
| Step up / step down (ball) | EXISTS | Tonight's Weaker/Stronger buttons, `js/screens/tonight.js` (~l.162, ~l.189) → `js/cc/rank.js` (one-step alternatives, Plan B); `js/cc/status.js:48` (stronger/weaker than the lanes need); Bag ladder "Weaker ↔ stronger ›", L1–L5, `js/screens/bag.js:64,109`; roles `js/cc/advisor.js` |
| Step controls (surface and release) | EXISTS | Surface segmented picker `js/screens/pickers.js:50` (FINISHES); steppers for oil ×, speed 12–22 by 0.5, rev 100–500 by 10, feet 1–39, target by 0.5 (hint: "The model reaches only about 0.8 board…"); Ball page "Log <finish> today", `js/screens/ball.js:55` |
| Persistent Targeting shortcut | EXISTS (Now 3 on main) | `#tnAimChip` opens `#/target?ball=…` in one tap; Find keeps its `find=1` deep link |
| Bottom buttons that hide | PARTIAL | sticky docks sit above the tab bar with safe-area padding: `.tg-dock` (`css/app.css:522`), `.ql-pad` (591), `.bag-dock` (675), `.tray` (287). No hide-on-scroll. The clutter audit counted 22 actions on Bowl while scoring |
| Physics model | EXISTS (frozen port) | `js/engine.js` `simulatePath` (equivalence 7,500/0); coach line `engine.js:116-117`; "° model" labels `js/screens/ball.js:43`, `js/screens/lane.js:46-108`; model disclaimer `js/screens/target.js:102`; limits: a near-straight line, 3 flat oil zones |
| Measured vs model | EXISTS | `js/cc/provenance.js`, Lane/Ball/Compare/Targeting chips; measured release inputs stay distinct from the model path. Supported LaneTrax import remains the measured source; no new accuracy claim |
| Arsenal Builder search-and-add | EXISTS | `js/screens/addball.js`, `js/cc/addball.js`; 22 stable app identities (`js/data.js`) + 143 maker discovery rows (`js/data/spec_catalog.js`, built by `tools/build_spec_catalog.mjs`); canonical then fuzzy match; `GET /api/spec-lookup` (`arsenal-pro-api/lib/specfetch.js`, `specparse.js`) on allowlisted maker hosts with robots.txt and crawl-delay; source chips, "spec TBD", maker value wins; engine card compare; drill card OCR (`js/cc/drillocr.js`, vendored Tesseract); pro shop kit QR `?cat=` prefill (`js/screens/kit.js`) |
| Local instrumentation | EXISTS (Now 5 on main) | `js/cc/ux.js`, localStorage `ap_ux`; deliberately outside the synced/backed-up IndexedDB log |

## 2. Catalog data and licensing (checked live 2026-11-02)

Not legal advice. Under US law, bare facts such as RG, differential and approval dates are not copyrightable (*Feist v. Rural*, 499 U.S. 340, 1991). Text, photos, the selection and arrangement of a compilation, and contract terms (ToS) still bind.

| Source | How the app uses it | What the terms say (checked live) | Risk |
|---|---|---|---|
| **bowlingballvideos.com** | 145 rows in `js/data/spec_catalog.js` (brand, model, condition, cover, core symmetry, RG, diff), saved 2026-10-22 | Terms updated 2026-03-31: no "automated systems (bots, scrapers) … without written permission"; content is for "personal, non-commercial use only. You may not reproduce, distribute, modify, create derivative works … without prior written consent." https://bowlingballvideos.com/terms/ | **High** |
| bowwwl.com | 22 "more info" links in `js/data.js` (links only, no copied content seen) | Copying and republishing are forbidden. Linking without approval is limited to listed organization types, and they "reserve the right to request that you remove all links". https://www.bowwwl.com/terms-and-conditions | **Low** for plain links (no logo, no framing) |
| CarryDown | not used | No ToS page found (/terms/ and /legal/ return 404). robots.txt allows all crawlers, AI included. llms.txt asks for citation of ball page URLs. Specs and images come "from each manufacturer's own website"; uses affiliate links. https://www.carrydown.com/attributions/ , https://www.carrydown.com/llms.txt | **Med**: no licence is granted, and the images aren't theirs. Link and cite only; ask before any bulk use |
| bowlingball.com | not used | "Articles may not be reproduced in any way for commercial purposes"; "Site Scrapers, Article Crawlers … expressly forbidden unless permission has been specifically granted." https://www.bowlingball.com/popup.aspx?TopicName=BB_intellectual-property.html | **High** for content; Low for links |
| BowlingThisMonth | not used | "You shall not republish, widely circulate, or enable anyone else to widely circulate any content of the Site in whole or part"; subscription content. https://www.bowlingthismonth.com/terms-conditions/ (WebFetch got 403; read with curl) | **High** for content; Low for links |
| Storm / Roto Grip / 900 Global | maker lookup, one ball at a time on user request, parsed values cached (`specfetch.js`) | "You may not … distribute, modify, transmit, reuse, re-post, or use the content of the Site for public or commercial purposes, including the text, images … without Storm Products, Inc.'s written permission." Storm Products, Inc. terms as published at https://stormlightningdrops.com/terms-of-service (stormbowling.com/legal returned 404 on 2026-11-02) | **Med** for spec facts used on request (facts, robots respected, attributed); **High** for images and text |
| Brunswick / DV8 / Radical (+ Brunswick Corp.) | maker lookup | Copying is for personal, noncommercial use; modification, distribution and "creation of derivative works" are prohibited; you may not "use any illustrations, photographs … separately from the accompanying text". https://www.brunswick.com/terms-of-use , https://brunswickbowling.com/company/service-terms | **Med** facts; **High** images and text |
| Hammer / Ebonite / Track / Columbia 300 | maker lookup | Terms page not found at the tested URLs (hammerbowling.com/policies/terms-of-service → 404). **Unverified** | **Med** (unverified) |
| Motiv | unsupported (its site returns 403) | not checked: the site blocks fetches | n/a |
| USBC approved ball list | DECISIONS #24 approval dates on the 22 app balls | A public PDF, updated weekly (latest 10/27/2026), https://bowl.com/approved-ball-list . ToS updated May 13, 2026: USBC owns site materials and the "selection, coordination" of its collective work; no commercial activity "except as expressly permitted". https://bowl.com/terms-of-service | **Low** for facts (brand, name, date) with a link and date; Med if the PDF is mirrored |
| Product photos (any maker or retailer) | none today (Add ball draws a skid/hook/roll bar and a colour swatch) | Storm and Brunswick terms above require written permission. Storm offers dealer media downloads (https://www.stormbowling.com/spi-downloads), which is a permission route, not a licence | **High** without written permission |
| User-entered data, drill card OCR, own LaneTrax/Ruby files | Add ball by hand, `#/drill`, imports | The user's own data | **Low** |

**Licensing verdict.** (1) Replace or license the bowlingballvideos-derived rows before any wider launch. Rebuild those rows from maker pages fetched on user request plus the USBC list, or get written permission. Asking for permission means sending an email, which needs the owner's approval. (2) No product photos without written permission. Keep the drawn ball glyph. (3) Links and cited facts are fine. Never mirror articles from bowlingball.com, BowlingThisMonth or bowwwl.

## 3. Research anchors (real citations)

| Principle | Source | What it means here |
|---|---|---|
| Self-efficacy | Bandura, A. (1977). Self-efficacy: toward a unifying theory of behavioral change. *Psychological Review* 84(2), 191–215. doi:10.1037/0033-295X.84.2.191 | Mastery experiences build belief. Early wins should be real actions (a logged night, a made spare), not gifts |
| SDT | Ryan, R. M. & Deci, E. L. (2000). *American Psychologist* 55(1), 68–78. doi:10.1037/0003-066X.55.1.68; Deci, Koestner & Ryan (1999) meta-analysis, *Psychological Bulletin* 125(6), 627–668. doi:10.1037/0033-2909.125.6.627 | Expected, tangible, performance-contingent rewards undermine intrinsic motivation; informational feedback supports it. Badges must inform, not control |
| Loss aversion | Kahneman, D. & Tversky, A. (1979). Prospect theory. *Econometrica* 47(2), 263–291. doi:10.2307/1914185; Tversky & Kahneman (1991), *QJE* 106(4), 1039–1061. doi:10.2307/2937956 | Losses weigh about twice as much as gains. This is why streak-loss framing drives stress, so don't use it |
| Broken streaks | Silverman, J. & Barasch, A. (2023). On or off track: how (broken) streaks affect consumer decisions. *Journal of Consumer Research* 49(6), 1095–1117 | Intact streaks raise engagement; broken ones lower it below baseline, less so when the streak can be repaired. Recovery-first, or don't build |
| Goal-gradient / endowed progress | Kivetz, R., Urminsky, O. & Zheng, Y. (2006). *Journal of Marketing Research* 43(1), 39–58. doi:10.1509/jmkr.43.1.39; Nunes, J. C. & Drèze, X. (2006). *JCR* 32(4), 504–512. doi:10.1086/500480 | Effort rises near a goal. In a car-wash field study, a 2-stamps-given card was completed by 34% versus 19% for a blank card |
| Social comparison | Festinger, L. (1954). *Human Relations* 7(2), 117–140. doi:10.1177/001872675400700202; Zhang, J. et al. (2016). Support or competition? *Preventive Medicine Reports* 3, 453–458 (PMC5008041) | People compare with similar others. In one RCT, comparison raised class attendance about 90% while support alone did not. Use small, similar groups, with no global ranks |
| Identity signaling | Berger, J. & Heath, C. (2007). Where consumers diverge from others. *JCR* 34(2), 121–134. doi:10.1086/519142 | People share what signals who they are: bag, style, retired favourite. Not raw scores |
| Peak-end | Kahneman, D., Fredrickson, B., Schreiber, C. & Redelmeier, D. (1993). *Psychological Science* 4(6), 401–405. doi:10.1111/j.1467-9280.1993.tb00589.x; Redelmeier & Kahneman (1996). *Pain* 66(1), 3–8. doi:10.1016/0304-3959(96)02994-6 | Memory is shaped by the peak and the end. Put the recap and share offer at the end of the session, never mid-game |
| Badges in the field | Hamari, J. (2017). Do badges increase user activity? *Computers in Human Behavior* 71, 469–478. doi:10.1016/j.chb.2015.03.036 | Badges raised several activity measures in a peer-to-peer trading service. Its effect sizes don't transfer here: *directional* |
| Virality of content | Berger, J. & Milkman, K. (2012). What makes online content viral? *JMR* 49(2), 192–205. doi:10.1509/jmr.10.0353 | High-arousal positive emotion drives sharing. Retirement and milestone moments qualify |
| Explanations and mental models | Kulesza, T. et al. (2013). Too much, too little, or just right? *IEEE VL/HCC*. doi:10.1109/VLHCC.2013.6645235 | Sound, complete-enough explanations improve mental models more than terse ones. Explain the model's "why" in one line |
| Choice overload / working memory | Scheibehenne et al. (2010) *JCR* 37(3), 409–425; Cowan (2001) *BBS* 24(1) | Already used in CLUTTER_AUDIT_1. Keep about 4 chunks per glance |

## 4. Feature areas

Each area covers: 1 gaps and risks · 2 team discussion · 3 recommendation · 4 rationale · 5 metrics · 6 priority and scores · 7 sharing and community tie-in · 8 smoke test · 9 open questions.

### 4.1 Achievements: badges, challenges, unlocks
1. **Gaps and risks.** Only volume and score milestones exist (`armory.js milestones()`). There are no process badges, no challenges, and nothing marks a "first". Risk: score badges (300, 200+) are evaluative. They are allowed because they are private and earned, but they are the edge of M3.
2. **Teams.** *Product & UX:* badges must live where people already look (Armory, after the session), never on the Bowl pad. *Psychology:* Deci, Koestner & Ryan say performance-contingent rewards that are expected undermine motivation. Make badges informational ("50 games with Phaze II") and unexpected, not announced ahead. *Engagement:* early wins matter most in the first two weeks, when the first night logged and the first ball added happen. *Community:* team-shared badges should be presence-based (Center Regular). *Technical:* everything can be computed from the event log offline; no server needed. *Data:* count badge views and share taps locally, nothing more.
3. **Recommendation.** Ship the starter set in §5 as earned-only cards in the Armory and in the end-of-session recap. Include process badges and equipment-story badges. No "locked" grid.
4. **Rationale.** Self-efficacy through mastery experiences (Bandura 1977); informational, not controlling, feedback (SDT); identity signals (Berger & Heath 2007).
5. **Metrics.** % of new bowlers who log a second night within 14 days; badge-card opens; guardrail: no rise in Help opens or mid-game abandon.
6. **Priority. Now.** I4 E2 C3 → value 6.
7. **Sharing.** The badge appears on the existing share cards as an optional line.
8. **Smoke test.** Part of S3.
9. **Open.** Should score milestones (300, 200+) stay? They're private today. The team says keep them.

### 4.2 Trophy Room (Armory) and "locked items with progress bars"
1. **Gaps and risks.** The Armory exists, with an earned-only policy (#31). The prompt asks for locked items with progress bars, which is a **direct conflict**. Locked grids turn the room into a to-do list, and it fails the applicability test (it doesn't change the next shot).
2. **Teams.** *Psychology:* goal-gradient is real (Kivetz 2006; Nunes & Drèze 34% vs 19%), but those are purchase-loyalty contexts. In a hobby with weekly rhythm, a visible deficit grid adds pressure. *Product:* the honest goal-gradient is the data-maturity line the app already uses ("rates at 30+ chances"). *Engagement:* one "next" item is enough; a grid of 20 is drowning. *Community:* the Old Friends shelf is the emotional core, so keep its name.
3. **Recommendation.** Keep earned-only. Add at most **one opt-in "Next up" line behind a tap**, for example "Pocket % shows after 30 shots · 12 so far". It is informational and it unlocks a real function. No locked silhouettes. *Owner decides* (conflict C1).
4. **Rationale.** Goal-gradient without loss framing; SDT competence; the data-maturity unlock already exists (`MIN_SHOTS`).
5. **Metrics.** "Next up" tap rate; whether shots logged per night rise while the line is enabled (*directional, unmeasured* until S3).
6. **Priority.** Earned-shelf polish **Now** (I3 E1 C4, value 12). "Next up" line **Next**, after the owner decides (I3 E2 C3, value 4.5).
7. **Sharing.** The Old Friends retirement card already exists (`cards.js`).
8. **Smoke test.** S3.
9. **Open.** C1: does the owner accept one opt-in "Next up" line, or stay strictly earned-only?

### 4.3 Streaks and leaderboards
1. **Gaps and risks.** Neither exists. Both conflict with standing decisions: no ranking, and the streak stress finding in the playbook.
2. **Teams.** *Psychology:* broken streaks push engagement below baseline (Silverman & Barasch 2023); loss aversion makes the break feel about twice as bad as the gain felt good. *Engagement:* bowling is weekly and league-bound, so a daily streak is the wrong unit. *Community:* Strava Local Legends counts efforts, not pace; the app already has the Center Regular equivalent. *Data:* any leaderboard leaks scores. *Product:* ranking breaks #28.
3. **Recommendation.** **Don't build** daily streaks or score/style leaderboards. Optionally (*owner decides*, C2), add a **season count** ("Nights bowled this season: 9") with **no break state, no flame and no "don't lose it"**. It is shown only in Results › Season and Wrapped. Recovery-first by construction: there is nothing to lose.
4. **Rationale.** Gains framing only; weekly rhythm; self-comparison only.
5. **Metrics.** Nights per month per active bowler (local); guardrail: zero notifications about missing a night.
6. **Priority.** Season count **Later** (I2 E1 C3, value 6, needs the owner); streaks and leaderboards: **Do not build**.
7. **Sharing.** The season count goes on Wrapped.
8. **Smoke test.** Not a top-3 item.
9. **Open.** C2, C3.

### 4.4 Social sharing and community
1. **Gaps and risks.** Cards and My Team exist. The gap is timing: sharing is buried in export sheets, and there is no offer at peak moments. Risks: auto-posting, scores leaking, minors' location.
2. **Teams.** *Psychology:* peak-end means the end-of-session moment shapes the memory; the share offer belongs there (Kahneman et al. 1993). *Community:* identity signals travel (bag, style tag, retirement), not raw scores (Berger & Heath 2007). *Product:* must not add anything during scoring (DECISIONS). *Technical:* `navigator.share` with a PNG fallback already works offline. *Data:* count offers shown versus share sheet opened, on the device.
3. **Recommendation.** A once-per-moment **end-of-session share offer**, shown only when something card-worthy happened: a milestone earned, a ball retired to Old Friends, the season's Wrapped. Dismiss once and it stays quiet for that moment. Guidelines in §7.
4. **Rationale.** Peak-end; identity signaling; virality of positive arousal (Berger & Milkman 2012).
5. **Metrics.** Share-sheet opens ÷ offers; guardrail: offer dismiss rate, and no offer while a game is in progress.
6. **Priority. Next.** I3 E2 C3 → 4.5. It depends on 4.1 to create moments worth sharing.
7. **Sharing.** This is the sharing item.
8. **Smoke test.** Optional S4 (it isn't in the top 3).
9. **Open.** C4: is an end-of-session offer "extra"? It comes after scoring, but the owner should confirm.

### 4.5 Physics clarity
1. **Gaps and risks.** The engine is a frozen port with known limits (a near-straight line, 3 flat oil zones, "° model" units). The Lane screen is the most cluttered (entropy 2.13, 19 numbers, CLUTTER_AUDIT_1). The words "° model" don't explain themselves. Measured versus model labels exist only in Targeting.
2. **Teams.** *Technical & Physics:* don't over-promise. The model is good for direction (which way the breakpoint moves) and weak for magnitude; show ranges, not decimals. Engine v2 waits for owner approval. *Product:* lead with one sentence ("Skids to about 38 ft, breaks near board 8, enters high · model"). *Psychology:* explanations that are sound and complete enough build better mental models (Kulesza 2013). *Data:* every number gets a source chip: measured / model / maker / catalog. *Engagement:* clarity is what makes the step ladder trustworthy.
3. **Recommendation.** (a) Source chips on every physics number across Lane, Ball and Targeting, reusing the Add ball chip styles. (b) A one-line plain-language path summary at the top of Lane, with the 19 numbers behind a tap. (c) Show changes as "breakpoint moves about 2 boards left", not a new decimal. (d) Show measured LaneTrax/Ruby overlays as a separate line when imported.
4. **Rationale.** Usability/applicability; ~4 chunks (Cowan); honest uncertainty.
5. **Metrics.** 5-second test: can a bowler say where the ball breaks and whether it's model or measured? Lane numbers per screen (target ≤ 6).
6. **Priority. Now.** I4 E2 C4 → 8. Engine v2 **Later** (I5 E5 C3, value 3, needs the owner).
7. **Sharing.** None on purpose. Physics stays a private tool.
8. **Smoke test.** **S1.**
9. **Open.** C5, engine v2 approval.

### 4.6 Arsenal Builder (search-and-add)
1. **Gaps and risks.** Manufacturer rebuild is complete (143 discovery rows, plus the 22 reviewed built-ins). MOTIV live lookup is added in the companion API PR, deployed only after merge. A USBC-list fallback and offline lookup queue remain future work; unavailable facts are never filled in by guesswork.
2. **Teams.** *Product:* three result groups make the source obvious. *Technical:* `specfetch.js` already follows robots.txt and an allowlist; rebuild the catalog from on-request maker fetches plus the cached results. *Data:* keep the "maker value wins" rule and the chips. *Psychology:* adding a ball is an identity moment, so end on "Where it fits in your bag". *Community:* the pro shop kit QR prefill is the intermediary channel (playbook).
3. **Recommendation.** See the spec in §9. Catalog rebuild **Now**; spec polish **Next**.
4. **Rationale.** Lower effort to the first win (the first ball added); trust through sources.
5. **Metrics.** Search-to-save completion; the share of saves with "spec TBD"; time to add.
6. **Priority.** Licensing rebuild **Now** (I5 E2 C4 → 10). Builder polish **Next** (I4 E3 C4 → 5.3).
7. **Sharing.** "New ball day" → the bag card (it exists).
8. **Smoke test.** A coverage audit (see §10).
9. **Open.** C6: do we ask bowlingballvideos for permission (an outbound email, needs approval), or rebuild?

### 4.7 Controls and navigation: step up/down, Targeting shortcut, bottom buttons
1. **Gaps and risks.** Weaker/Stronger moves one level on the 1–5 oil tag with a shape proxy. That is a **discrete jump the bowler can't preview**. The toast tells them after the fact ("one step weaker…", or "already the weakest… Move feet and eyes instead"). The coach line in `engine.js:116` says "Move feet left N boards or go stronger", so the order of adjustment is implicit. Targeting is two taps from Bowl (chip → Lane → icon). The sticky docks stack above the tab bar, and Bowl shows 22 actions while scoring.
2. **Teams.** *Product:* the preview ("Next weaker: Deadly Rattler · pearl, cleaner fronts") belongs on the button itself. *Bowling domain/Technical:* the standard order is feet and eyes first, then surface, then ball, and the app should say so. *Psychology:* predictable controls support competence. *Data:* log taps followed by a logged shot with the new ball. *Engagement:* a one-tap Targeting chip cuts friction on league night.
3. **Recommendation.** (a) Label the buttons with the next ball's name and a 3-word reason, and show "Try feet/eyes first: move 2 left" when a move is cheaper. (b) Make the Bowl and Tonight chip open **Targeting** directly when a stand exists; Lane is one tap back. (c) Don't auto-hide the bottom docks (hidden controls hurt discoverability, and the Bag "Pack these" fix proved it). Instead, take actions off Bowl during scoring as the clutter audit's top-10 says.
4. **Rationale.** Applicability (it changes the next shot); one-handed reach (Hoober, S. 2013, "How do users really hold mobile devices?", UXmatters).
5. **Metrics.** % of Weaker/Stronger taps followed by a shot with that ball within 3 shots; taps to reach Targeting (2 → 1).
6. **Priority.** Step-ladder preview **Now** (I4 E2 C3 → 6). Targeting one tap **Now** (I3 E1 C3 → 9). Hide-on-scroll: **Do not build**.
7. **Sharing.** None.
8. **Smoke test.** **S2.**
9. **Open.** Should the surface picker show "about 1 board earlier" per grit step? That needs engine evidence (§8).

## 5. Starter set: badges, challenges, unlocks

All of these are earned-only, computed on the device from the event log, use descriptive names (no praise words, M3) and never show while scoring.

**Badges (process and story)**
| Badge | Earned when | Type |
|---|---|---|
| First night | the first session is saved | early win |
| First ball in the bag | the first `ownedBall.created` | early win |
| Spare system set | every spare role is filled in the bag builder | craft |
| Line saved | the first saved line on Lane | craft |
| Surface logged | the first "Log <finish> today" | craft |
| 30 spare attempts | 30 logged spare chances (a count, no %) | craft |
| One move, three shots | a logged adjustment followed by 3 logged shots | craft |
| Measured night | the first LaneTrax or Ruby import | data |
| Ball's 25th / 50th game | per-ball game count | story |
| Into Old Friends | the first ball retired | story |
| 1 / 10 / 25 / 50 / 100 games; 200+ game; 300 | already in `armory.js` | existing |
| Center Regular | 4 nights in 90 days (already exists) | presence |
| Season opener | the first night after Aug 1 | season |

**Challenges (opt-in, time-bound, process-only; they expire silently, never "failed")**
- *10-pin night:* log every 10-pin attempt tonight.
- *One adjustment:* make one written move (feet, eyes or ball) and log 3 shots after it.
- *Surface week:* log your surface before each session this week.
- *Team bag check (small group):* every teammate shares a bag card before week 1. Team progress shows as names in join order, never a ranking.

**Unlocks (functional, tied to data maturity; never paywalled)**
- Pocket % appears at 30+ chances (already `MIN_SHOTS`).
- Ball compare appears once 2+ balls have logged games.
- Season Wrapped appears after 10 games.
- The measured line overlay appears after a LaneTrax import.

## 6. Prioritized backlog

| # | Item | Area | I | E | C | Value | Bucket | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | Rebuild or license the 145 catalog rows (bowlingballvideos) | 4.6 | 5 | 2 | 4 | 10.0 | **Now** | DONE in review branch: 143 maker discovery rows; 22 built-ins reviewed, explicit unknowns |
| 2 | Earned-shelf polish and starter badge cards | 4.1/4.2 | 3 | 1 | 4 | 12.0 | **Now** | DONE in review branch |
| 3 | Targeting in one tap from the chip | 4.7 | 3 | 1 | 3 | 9.0 | **Now** | DONE on main (1fa4781), preserved |
| 4 | Physics source chips and a one-line path summary | 4.5 | 4 | 2 | 4 | 8.0 | **Now** | DONE in review branch |
| 5 | Local-first UX counters and feature flags | §10 | 4 | 2 | 4 | 8.0 | **Now** | DONE on main (0d456c4; localStorage, not synced event log) |
| 6 | Step-ladder preview with a feet/eyes-first hint | 4.7 | 4 | 2 | 3 | 6.0 | **Now** | DONE in review branch |
| 7 | Process badges from §5 | 4.1 | 4 | 2 | 3 | 6.0 | Next | NEW |
| 8 | Builder: grouped results, USBC fallback, offline queue | 4.6 | 4 | 3 | 4 | 5.3 | Next | PARTIAL |
| 9 | End-of-session share offer | 4.4 | 3 | 2 | 3 | 4.5 | Next | NEW |
| 10 | "Next up" opt-in line | 4.2 | 3 | 2 | 3 | 4.5 | Next (C1) | NEW |
| 11 | Opt-in challenges | 4.1 | 3 | 3 | 2 | 2.0 | Next | NEW |
| 12 | Season night count (no break state) | 4.3 | 2 | 1 | 3 | 6.0 | Later (C2) | NEW |
| 13 | Team challenges in My Team | 4.4 | 3 | 3 | 3 | 3.0 | Later | NEW |
| 14 | Engine v2 (true curve, oil zones) | 4.5 | 5 | 5 | 3 | 3.0 | Later (owner) | NEW |

The Now list (items 1–6) adds up to about 10 agent-days of effort, which fits one 2-week cycle with review.

## 7. Social sharing guidelines
1. Everything is made on the device as a PNG and goes through the native share sheet (`sharePng`). Nothing is ever auto-posted, and contacts are never read.
2. No scores by default. The bowler adds them. Never include another person's data; teammates appear only if they opted in to team sharing.
3. Offer sharing only at the end: after the session, a milestone earned, a ball retired, the season Wrapped. Once per moment. Never during scoring.
4. Use identity-first content: the bag, a style tag, the Old Friends story. No comparisons with others and no ranks.
5. For minors: no center or location on cards, and team views by invitation only (playbook code of conduct).
6. Use a small, removable Arsenal Pro mark. Don't use "Arsenal" alone as a merch or wordmark (trademark caution). Don't use maker logos or photos without permission.
7. Every card gets alt text and passes 4.5:1 contrast. Brand colors are #0F4D34 and #DAAF37.
8. Label model numbers on cards as "model". Measured data gets its own chip.

## 8. Physics clarity recommendations
1. Lead with one plain sentence on Lane: skid length, breakpoint board and entry, each tagged *model* or *measured*.
2. Put every number behind a source chip. Show ranges or whole boards, not 0.1 decimals the model can't support.
3. Explain changes as a direction and size ("about 2 boards earlier").
4. Keep the existing limit hint ("The model reaches only about 0.8 board…") next to the stepper it applies to.
5. Show measured LaneTrax/Ruby lines as a separate line and never blend them into the model.
6. Rename "° model" to "about N° · model".
7. Engine v2 waits for owner approval. Until then, nothing claims more than the frozen port supports.

## 9. Arsenal Builder search-and-add spec
**What it already does:** 167 entries; canonical, then fuzzy match; source chips; "spec TBD"; `/api/spec-lookup` maker fetch on an allowlist (robots.txt, crawl-delay, https, public IPs, cached in `spec_cache`); the maker value wins; an engine card compares with the bag; save writes `ownedBall.created`; drill card OCR; pro shop kit QR prefill.
**Spec (changes):**
1. **Search box** (offline-first): brand and model, tolerant of typos (it exists).
2. **Results in 3 groups:** *Maker spec* (fetched or cached from the maker) · *Name only, specs to fetch* (USBC list name and approval date, Low risk) · *Not found → Add by hand / scan drill card*.
3. **Row:** brand, name, cover, core symmetry, RG and diff, each with a source chip. No photo; a drawn glyph in the ball's colour.
4. **Ball card:** an engine preview against the bag; "Where it fits: between X (weaker) and Y (stronger)" on the step ladder; a status picker (In my bag / At home / At the pro shop / Retired); Save.
5. **Offline:** catalog matches work offline; a maker lookup queues until online and the chip shows "spec pending".
6. **Catalog data:** remove the bowlingballvideos rows and rebuild from maker fetches plus USBC names, unless permission is granted (§2).
7. **Live lookup:** Motiv joins Storm/Brunswick-family makers in the companion API PR. Failed/unavailable pages still offer factual manual entry, never guessed specs. Deployment follows merge.

## 10. Instrumentation and experiment plan (local-first)
- **Implemented store (Now 5):** flags/counters in localStorage `ap_ux`, NOT `ux.*` events in the synced/backed-up IndexedDB log. Counts/timestamps plus a capped opaque local ball-key tap window for S2 follow-through; keys never enter the shareable summary.
- **No third-party trackers.** CSP stays `script-src 'self'`. Nothing goes to the network. `ap_ux` is never queued to sync/backup. No telemetry endpoint exists.
- **Flags:** feature flags in local settings. Testers get an A or B arm from install-ID parity.
- **Read-out:** Me › Tests and usage shows a counts-only JSON summary; the tester may use the native share sheet after the session. No automatic send. Exact procedures: [SMOKE_TESTS.md](SMOKE_TESTS.md).
- **Design:** small N (owner plus a few league testers), so use pre-set pass thresholds, counts and short interviews. No significance claims.
- **Guardrails:** Help opens, mid-game abandon, actions per frame on Bowl, offer dismissals.
- **Catalog validation complete:** 143 maker discovery rows; two unverified discovery identities removed. The 22 built-in reviews and explicit missing sources/specs are documented in DECISIONS and `builtin_sources.json`.

## 11. Top 3 smoke tests (≤ 2 weeks each)
| # | Recommendation | Core assumption | Test | Pass if (set before the test) | Lift reference |
|---|---|---|---|---|---|
| **S1** | Physics clarity (one-line summary and source chips) | Bowlers misread model numbers today | Two Lane variants as static prototypes; 5-second test plus "what will you change?" with 5–8 bowlers; also count Lane numbers | ≥ 4 of 5 name the breakpoint and "model" correctly on the new variant, versus the baseline | directional, unmeasured |
| **S2** | Step-ladder preview | Previewing the next ball makes the step usable | Flagged build for testers over 2 league nights; local counters: a tap followed by 3 shots with that ball; a 3-question exit survey | More taps are followed through on the preview arm than on control, and no rise in mid-game Help opens | directional, unmeasured |
| **S3** | Earned badges plus an opt-in "Next up" line | Informational progress raises logging without pressure | A/B by install parity over 2 weeks: earned-only versus earned plus Next up; count nights and shots logged; ask "did this feel like pressure?" (1–5) | Logging is no worse, and the mean pressure score is ≤ 2 | Endowed progress: 34% vs 19% completion (Nunes & Drèze 2006, car-wash field study). That context doesn't transfer, so expect less |

## 12. Conflicts that need the owner
- **C1 resolved:** earned-only; no locks or progress bars; at most one optional Next up line, OFF by default.
- **C2 resolved:** no streaks; non-breakable season night count is OK.
- **C3 resolved:** no leaderboards or style rankings. Center Regulars and join-order lists stay.
- **C4 resolved:** share offer only after a session, via native share sheet; no active-scoring addition.
- **C5 resolved for this work:** no Engine v2 or new accuracy claims.
- **C6** Catalog: rebuild versus asking bowlingballvideos.com for written permission (an outbound email, needs approval). **Done 2026-11-02: rebuilt from maker pages (DECISIONS, "Ball catalogue rebuilt from maker pages only").**
- **C7 resolved for this work:** no product photos or permission requests.
- **C8** F06 total-only teammate mode is still open (FINDINGS_2).
- **C9** Score milestones (300, 200+) are evaluative. Keep them private and earned, or drop them?

## 13. Do not build
- Daily streaks, streak flames, "don't lose your streak" messages, and any guilt or "we miss you" notifications.
- Global, center or score leaderboards, and any ranking of styles or of teammates.
- A grid of locked badges with silhouettes or progress bars. Only one optional informational Next up line is permitted.
- Product photos scraped from makers or retailers; mirrored articles from bowlingball.com, BowlingThisMonth or bowwwl.
- More scraping of bowlingballvideos.com.
- Badges or offers shown during scoring; hide-on-scroll bottom docks.
- Paywalled core features or community features; paid OCR or vision services; third-party analytics SDKs.
- A pure social feed, real-time multiplayer simulation (non-goals), and "Arsenal" alone as merch.

## 14. Caveats
- The 2026-11-02 terms-fetch limitations in §2 are historical; they are not current spec-status labels. MOTIV support and the 2026-11-06 maker review are described above; no general license or physical-accuracy claim is made.
- Scores are planning judgments, not measurements.
- The opening of the owner prompt was reconstructed (see the provenance note in the prompt doc).

## 2026-11-06 implementation read-out
Now 1/2/4/6 completed on the review branch; Now 3/5 already landed on main. S1/S2/S3 are runnable locally, not validated with participants yet. Both S1 arms keep provenance chips as a safety floor. The five unverified built-ins, polyester Ice Storm and unsupported Scout/NU covers have no model path. See DECISIONS for all 22 source reviews, the deliberate 7,500/0 input rebaseline, and the unchanged-engine caveat. C8/C9 remain open. Earlier feasibility/research limitations above are historical, not a current blanket inability to fetch MOTIV.
