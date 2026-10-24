# Gap review 1 — what Arsenal Pro is still missing (2026-10-24)

Prompt: owner message "what do you think we are missing. What does the team say". Roles from `docs/TEAM_PROMPT_PRODUCT_LOOP.md`. Inputs: `PRODUCT_LOOP_ITERATION_1.md`, `ROADMAP_NEXT.md`, `COMMAND_CENTER_PLAN.md`, `DATA_SYSTEM.md`, `FEATURE_DEMAND_RESEARCH.md`, `IMPORTS_RESEARCH.md`, `ENGINE_VERIFICATION_REPORT.md`, `DECISIONS.md`, the education docs, and the code at `cdb36b3`. **Revised after the sim1 baseline simulations** (`docs/user-simulations.md`: 6 personas plus a midnight edge case, run on the live build `a36776e` / sw v21). §2 now includes the simulation findings, §2b is the session-data recommendation, and §2c is the data-overload pruning.

**Source labels** (same as the other research docs):
- **F** = page fetched and read.
- **S** = search excerpt only; a lead, not verified. Reddit can't be fetched, so every Reddit item is S, paraphrased, with no usernames.
- **repo** = read in this repo (doc or code, with file and line).
- **A** = team assumption.
- Effort (S/M/L) and impact are **team estimates (A)**. No statistics are invented; "sources" counts are just how many independent sources here raise the point.

## 0. Already built or queued — NOT counted as gaps

- Bag Advisor in Tonight.
- Bowler Card + import-results view.
- Scoring fixes: bottom scoring pad, frame edit, ball attribution, Games view, league/Baker mode, Tonight as the default screen.
- Aim Box.
- Armory/trophy redesign.
- **Help bubbles + glossary wiring** (`data/glossary.json` → app). The owner asked to "add wiring into the list": it is on the queued list and is treated as covered here.
- Engine B fixes and the 3-D port (behind a flag, off).
- AI chat (deferred).

Owner constraints every item below respects: free; offline-first; one-handed scoring in 1–3 s; no LaneTalk API; no auth for core data; **no added load during active scoring**; neutral on styles.

## 1. Each role's top gaps

### Mobile UX Specialist
1. **The screen sleeps between frames.** Nothing keeps the display awake during a game, so every frame can start with an unlock (Face ID or passcode) on top of the 1–3 s budget. `navigator.wakeLock` appears nowhere in `js/` (repo). The Screen Wake Lock API works in Safari, and in iOS Home Screen web apps from iOS 18.4 (WebKit bug 254545 and MDN, S). Hold it only while a game is open; release it at the final frame or after 10 idle minutes. Zero taps.
2. **No install path, so no installed-app benefits.** The app never offers "Add to Home Screen". That matters for wake lock (above), storage protection (QA #1) and full-screen thumb reach. Offer it once, after the first saved game, never during scoring.
3. **Text size is not user-controllable.** The scale is rem-based (`--fs-*`, repo `css/app.css:5`), but 13 rules are fixed at 10–11 px (repo grep), including frame-strip-class labels, and there's no in-app text-size control. For "readable at arm's length under alley light" (Principle 2), add a Large / Extra-large setting that scales the scoring surface and the recap. WCAG 1.4.4 Resize Text is the reference (A: not fetched this run).

### Bowling Domain Expert
1. **Every spare hint assumes you stand on board 20.** `tonight.js:128` calls `R.spares(20, hand)`, and the card title says "from strike board 20" (repo). The USBC 3-6-9 table is an *example* from board 20 (USBC PDF, F, in `FEATURE_DEMAND_RESEARCH.md` §3). Anyone who stands on 30 or 12 gets wrong feet numbers on every spare. The fix is to take strike position from tonight's line (Targeting feet), or one "I stand on __" stepper set once per night. Effort S, and the highest accuracy-per-hour fix in the app.
2. **You can't enter your own pattern.** The Tonight pattern field only accepts a name from the 709 Kegel patterns. Anything else gets "Pick a pattern from the list" (repo `tonight.js:78–80`). Three problems with that:
   - Brunswick centers run Crown/Pattern Editor patterns that aren't in a Kegel library (Brunswick Pattern Library, S).
   - Many league bowlers are never told their pattern; one r/Bowling thread describes being refused the pattern sheet (S).
   - A pattern sheet gives length, volume and ratio (Brunswick sheet via NCAA, S). A typical house shot is about 38–42 ft, 18–24 mL, 8:1–10:1 (BowlersMart, S).

   Allow "My house shot" with name plus optional length, volume and ratio, and an "Unknown — typical house" default. Remember it per center (next item). Competitor: Tournament Sense added a 50+ pattern library with import from URL (App Store, S).
3. **Centers and lane pairs remember nothing.** A center is stored as a name only (`center.created` with name and surface, repo `tonight.js:82–84`). It's used just for the "new center → benchmark first" rule (repo `rank.js:75–77`). There's no lane pair field, and the next visit doesn't recall last time's ball, line, pattern or moves. Competitors that do this:
   - Victory Bowling: notes per lane pair per center, editable mid-session (App Store, S).
   - LaneTalk Pro: tags center and lanes (lanetalk.com, S).
   - StrikeMaster: results by lane pair (S).
   - LaneLogic: per-center stats (F).
4. **No spare practice mode.** There's nowhere to shoot one leave rep after rep outside a game.
   - Evidence: demand #9 "keep practice out of averages" (repo FDR §1); r/Bowling threads on spare drills and single-pin challenges (S).
   - Competitor: LaneLogic ships Spare Drill Mode and frame-less Practice Mode (F).

### Behavioral Psychologist
1. **Nothing carries forward to next week.** The habit loop breaks between nights. The one lesson from tonight ("moved 2 left by game 3", "10-pin cost me") isn't shown on the next arrival. Add one carry-forward line, written once on the recap and shown at the top of Tonight next time at that center. It isn't shown during scoring.
   - Evidence: LaneTrax reviewer asking for adjustment notes (repo FDR §1 #6, F); Tournament Sense "Game Notes … lane conditions, adjustments, what worked" (S).
2. **No goals, and no sense of progress.** There's no target and nothing to watch move. Make goals process goals (single-pin %, clean games, first-ball average), not just score. Show progress only post-session.
   - Competitors: Pinlytics "Create goals" and milestone tracking (S); Bowly "200+ count, season milestones" (S); LaneTalk "benchmark … the next average tier" (App Store, S); LaneLogic tiered benchmarks (F).
   - r/Bowling (S): an "80% on single pins" style challenge.
3. **Onboarding asks before it gives.** The welcome asks for hand, style, speed, rev, optional PAP/tilt and owned balls before the first frame (repo `TEAM_PROMPT_PRODUCT_LOOP.md` app state). Ask hand only, go straight to a scoreable game, and ask the rest in context: speed and rev when Targeting is opened, balls when the bag is opened. ("Tonight default" is queued; the *length* of the welcome is not.) A: no external source; this is behavioural reasoning.

### End-to-End QA
1. **Silent total data loss on iOS Safari (not installed).** WebKit's ITP deletes IndexedDB, LocalStorage, and the service worker registration and cache after **7 days of Safari use with no interaction** with the site. Home Screen web apps are exempt (webkit.org/tracking-prevention, **F**). A once-a-week league bowler is right at that edge.
   - The app never calls `navigator.storage.persist()` (repo grep). WebKit grants it by heuristics such as being a Home Screen app (WebKit "Updates to Storage Policy", S).
   - Backup is manual with no reminder. There's no "last backup" anywhere (repo grep).
   - Fix: request `persist()`, show "Protected / Not protected" in More, show the install prompt (UX #2), and add a backup nudge on the recap when there's no backup and more than 3 games, or the last backup is older than 14 days (A thresholds).
2. **Session boundaries are calendar days.** The session id is `'tonight-' + today()` (repo `tonight.js:31`), with local date from `store.js:128`. So:
   - a league night from 21:00 to 00:30 splits into two sessions mid-series, and game numbering restarts;
   - two outings on one day merge (iteration 1).

   This needs to be a stated requirement of the queued league/Baker mode: `night-<date>-<n>`, an explicit "End night", and auto-close after 4 h idle (A).
3. **You can't take your games out.** `toCSV` exists (`js/data/csv.js`), but More only offers a JSON backup. There's no game or frame CSV in the UI (iteration 1 §1E, repo). Demand #1 is "own my data … free export" (repo FDR §1, 9 sources). Add round-trip tests: export → CSV opens in a spreadsheet with formula injection neutralised (ROADMAP QA gate 3), and JSON backup → wipe → restore.

### Product Strategist
1. **"Free and local" is no longer unique.** It's the floor.
   - Bowly: "Free to use. Your data stays on your device. No account required." It offers spare conversion by leave, session recaps, and claims "under 5 seconds per frame" (App Store, S).
   - LaneLogic: CSV/PDF export "Free on every plan. We'll never paywall your data" (F).

   Our moat is the join of **arsenal + pattern + center + the lane model**, which none of them has (FDR §2 gaps, repo). The gaps that build that join (center memory, own pattern, personal strike position) beat more generic stats.
2. **No way to switch to us.** PinPal is the tracker r/Bowling recommends most (several threads, S), and LaneLogic points out "PinPal hasn't shipped an update since 2023" (F). LaneLogic imports PinPal; Tournament Sense imports PinPal, Bowlr and BowlSheet (S). A PinPal importer onto the existing CSV pipeline converts the most loyal manual scorers. Per ROADMAP N0, no preset ships without a real sample file.
3. **"What works where" compare is LaneTalk's paid hook, and we could give it free.** LaneTalk's Pro "Compare Everything" covers ball × pattern × center × lane (lanetalk.com, S). This is the payoff of center memory plus ball attribution, so it comes after the Games view.
4. **Practice mode is table stakes for serious bowlers.** LaneLogic (F) and Victory Bowling (free-frame practice, S) have it. Same item as Domain #4.

## 1b. What the simulations added (sim1, live app, all evidence in `docs/user-simulations.md`)

- **QA, new bug:**
  - Lefty spare hints use right-hand boards. With the profile set to left, the 7-pin hint says "stand 11 (move 9 right)". The app's own `leaveHint(…,'left')` gives 29, so the quick log isn't passing the profile hand (`lefty-06-lefty-hint.png`).
- **QA, reproduced:**
  - Midnight split. Set the clock to 23:50, log 5 frames, move to 00:10 and reload: the game in progress shows as "Frame 1 · ball 1". The shots are still stored under yesterday's session (`midnight-after-0010.png`).
- **QA, new bug:**
  - A double-tap on X Strike logs two strikes. There's no debounce (`beginner-08-FAIL.png`).
- **UX, new:**
  - Tonight is overloaded. The scoring card starts 983–1,809 px down the page (1.3–2.4 screens), and the page is 4.9 screens long with about 10 cards of spec, model and setup text.
  - Reload resets the scroll, so the scoring card is off-screen mid-game.
  - Lane (the post-welcome landing screen) shows a different stand number from Tonight for the same ball: Feet 12 → 12.4 versus feet 17 / aim 10.7.
- **Behavioral, confirmed:**
  - After 3 games, Sessions says "No saved lines yet", and nowhere shows the series, the average or game 1's score.
- **Domain, confirmed:**
  - A custom pattern is rejected ("Pick a pattern from the list").
  - Every roll, spares included, is credited to the current pick. That's queued as ball attribution, so it isn't counted as a new gap.
- **Timing (KLM):**

  | Frame | Time |
  |---|---|
  | Strike | 2.65 s |
  | One-pin spare | 6.6 s |
  | 2-4-7 then 7 | 10.5 s |
  | 5-pin leave | 13.1 s |

  Measured app latency is 61–104 ms mean and 194 ms max. The tap count, not the app, is the cost.

## 2. Merged, ranked top 8 (revised with the simulation findings)

| # | Gap | What to build (all outside active scoring unless noted) | Impact | Effort | Roles | Sources |
|---|---|---|---|---|---|---|
| 1 | **Scoring-path correctness** | (a) Pass the profile hand to the quick-log leave hint; (b) strike position from tonight's line or Targeting feet instead of board 20; (c) ignore a second tap on the same scoring button within about 400 ms (A threshold) | **High**: every lefty and every non-board-20 bowler gets wrong spare numbers today; a double-tap silently adds a strike | S | QA, Domain | sim1 `lefty-06`, `beginner-08` (repo, live); `tonight.js:128` (repo); USBC 3-6-9 PDF (F, via FDR §3) |
| 2 | **Data can vanish on iOS Safari** | `navigator.storage.persist()`; "Protected / Not protected"; one install prompt after the first saved game; backup nudge on the recap; "Last backup" line written in plain words (see §2c More) | **Blocker-class trust** | S | QA, UX | webkit.org/tracking-prevention (F); WebKit storage-policy post (S); repo grep |
| 3 | **Alley-first Tonight: prune, then keep the screen awake** | While a game is open: start line (ball · feet · eyes) + "Then" line + scoring card + Weaker/Stronger, and everything else behind a tap (§2c); restore scroll to the scoring card after a reload; wake lock while a game is open; Large text option; one stand number across Lane / Tonight / Targeting | **High**: the scoring card is 1.3–2.4 screens down; reload hides it; unlocks between frames | S–M | UX, Behavioral, QA | sim1 `overload.json`, `league-07-after-reload.png`; WebKit bug 254545 / MDN wake lock (S) |
| 4 | **Sessions are nights, with a recap** | Session = night (`night-<date>-<n>`, "End night", 4 h idle close), not the calendar date; a post-session recap as the payoff (§2b) | **High**: the midnight loss is reproduced; there's no payoff after 3 games | M | QA, Behavioral, Domain | sim1 `midnight-after-0010.png`, `league-10-sessions-after-3.png`; `tonight.js:31`, `store.js:128` (repo); Bowly recap (S); FDR §1 #9 (repo) |
| 5 | **Games can't leave the app** | "Export games CSV" (game, frame and roll rows) using the existing `toCSV`; formula-injection guard; PinPal importer later, once a sample file exists | High: demand #1; the coach persona got only a JSON backup | S | QA, Strategy | FDR §1 #1 (repo, 9 sources); LaneLogic free export (F); sim1 coach |
| 6 | **Centers and lane pairs remember nothing** | Center profile: lane pair, last pattern, surface, bag, line and moves, plus one carry-forward note, shown on arrival | High: the moat and the habit loop | M | Domain, Behavioral, Strategy | Victory Bowling (S); LaneTalk (S); LaneLogic per-center stats (F); repo `rank.js:75`; sim1 (no lane-pair field) |
| 7 | **Can't enter your own or house pattern** | "My house shot": name plus optional ft / mL / ratio; "Unknown — typical house" default; saved per center | High for league bowlers off the Kegel list | M | Domain, UX | sim1 `advanced-06-pattern-custom.png`; `tonight.js:78–80` (repo); Brunswick library (S); BowlersMart (S) |
| 8 | **Spare drill mode + one process goal** | Drill a chosen leave, kept out of averages; one optional goal (e.g. single-pin %) shown on the recap with n | Medium: the practice → progress loop | M | Domain, Behavioral, Strategy | LaneLogic Spare Drill (F); Pinlytics goals (S); r/Bowling drill threads (S) |

**Changes from the pre-simulation list:**
- The old #2 (board 20) is folded into the new #1, together with the two scoring-path bugs found live.
- Old #6 (alley mode) and the new Tonight overload finding merge into #3.
- Old #7 (session boundaries) moves up to #4, because the midnight loss is reproduced and the recap is attached to it.

**Just below the line:**
- Faster multi-pin entry for beginners. Each standing pin costs 1.3 s, so a 5-pin leave is about 13 s. One option to test (A): a "count" fallback for leaves of 4+ pins. It trades leave detail for speed, so Domain wants it opt-in.
- An offline cue on Tonight.
- Trimming onboarding to hand only.
- The "what works where" compare.

## 2b. Session data: what to do with it

What the app already has:
- **What exists:** every ball is a `shot.logged` event with game, frame, roll, leave, foul, split, ball, and an optional Pocket/High/Light tag. Reads (Too early …) are stored too.
- **What already uses it:** the Bag Advisor shows per-ball first-ball results with n, and gates on 21 games ("100% pocket, 54% strikes over 1 session (n=13 first balls); app estimate (2 of 21 games)"; sim1 `league-07-after-reload.png`).
- **What doesn't:** Sessions shows Lane lines, not nights. Insights shows the arsenal, not the bowler. No series, average, recap or trend exists.

**1. The recap: shown once after the last game, or on "End night". Never during scoring.** Plain language, one screen:
- Games and series, vs your average over the last N nights (with n; hidden until there are 3 or more nights).
- First-ball: strikes, pocket %, and the most-left pin.
- Spares: made/attempted, single-pin %, and "pins left on the lane by missed spares" (the Bowly-style plain insight, S).
- Ball by game, and the moves you made (feet/eyes changes and ball switches, which already come from the trigger and read events).
- **One** takeaway sentence and **one** optional "focus for next time" pick. That pick becomes the carry-forward line on the next arrival.
- A backup nudge if the data isn't protected (top-8 #2).

**2. Insights: from sessions to trends.**
- Insights leads with *your* numbers over the last 10 games or 5 nights:
  - average;
  - first-ball pocket %;
  - single-pin %;
  - open %.
- These are the stats r/Bowling coaches say they track (S).
- Practice and drills are excluded from averages (FDR #9).
- Every number shows n. Advice that re-orders anything waits for the same 21-game minimum the advisor uses.
- Arsenal analytics move under "Arsenal ›".

**3. Goals.**
- Make goals process goals (single-pin %, first-ball pocket %, clean game), not just score.
- Progress shows on the recap and the drill screen only.
- No streaks or badges in v1 (§5).

**4. Adjustments.**
- Per center and lane pair, keep "what worked": the ball, feet/eyes after the moves, and the reads.
- Pre-fill the next visit (#6). Later, compare measured vs predicted lines once a Ruby/LaneTrax CSV exists (ROADMAP N3).

**5. Plumbing that makes it trustworthy.**
- Night-based session ids (#4).
- Correct ball credit, which is queued (attribution).
- A games CSV (#5).
- Durable storage (#2).

## 2c. Data overload: what to keep up front, what goes behind a tap, what to cut

The owner rule is "not drowning in data; intuitive". There's no number cap. Every element was scored for **usability** (understood within seconds, in plain bowling language) and **applicability** (it changes a real decision: ball, feet/target, spare, practice focus) per persona. The full element tables are in `docs/user-simulations.md` §3.

Up front, while a game is open:
- **KEEP:** start line (ball · feet · eyes), "Then" ball-change line, scoring card, Weaker/Stronger, leave hint (once fixed).
- **TAP:**
  - pick-card specs (Level/demand, RG/diff, Motiv source);
  - laydown and breakpoint;
  - "Holds 4 of 6";
  - provenance chips;
  - bag list after ball 1;
  - Lanes-tonight setup after ball 1;
  - "Why this bag";
  - Lane physics tiles (entry, angle, deflection) for beginners and league bowlers;
  - Targeting's model readouts;
  - More's data counts and the backup code.
- **CUT:**
  - the standalone Spares 3-6-9 card (the quick-log hint covers it);
  - the Plan A/B/C card (it duplicates the advisor's "Then" line; triggers show only when they fire);
  - "Your release" on Tonight (it lives in the profile);
  - Rule of 31 on Tonight;
  - one of the two "Find / Check" links;
  - static Insights "Assessment" prose;
  - developer words in More: "events", "indexedDB", "v1", "pre-2.1", "tracker sessions".

**Worst screens:**
1. Tonight during a game.
2. Lane as the first screen.
3. Sessions / Insights after a night.
4. More → Your data.

## 3. Cut or defer

- **Defer: scoreboard photo OCR.** Pinlytics and Tournament Sense sell it (S), and Bowly pulls live scores only from ComputerScore centres (S). Offline OCR accuracy on house monitors is unknown. Keep iteration 1's "attach a photo" idea; OCR only after an accuracy test on real photos.
- **Cut: leaderboards, social feed, live share.** No demand found (FDR §1), and a privacy risk with no accounts.
- **Defer: money and side-pot tracking.** Victory Bowling and Tournament Sense have it (S). It's off-mission.
- **Cut: center finder or maps** (LaneLogic, F). Needs network and maps; free-text center plus memory (#4) is enough.
- **Defer: handicap calculator.** StrikeMaster has it (S). Do it with league mode, using the league's formula, not before.
- **Defer: haptics.** Bowly has them (S), but iOS Safari has no Vibration API (A: not verified this run), so it would be Android-only polish.
- **Defer: score-only "count mode".** Strategy wants it for casual users (Victory, Bowly, Pinlytics offer it, S). Domain objects: no leave data means no spare stats. Revisit after the scoring pad ships.
- **Cut or replace: the static Insights "Assessment" prose** ("~15 mph, ~220 rpm…", iteration 1 §1A). Static text dressed as analysis undermines trust (Behavioral, QA). Compute it from games, or remove it.
- **Keep deferred:** engine 3-D (flag off), video, AI chat, accounts (ROADMAP "Later").

## 4. What each role most wants the owner to hear

- **Mobile UX:** "Keep the screen awake and get the app onto the Home Screen. Those two remove the unlock from every frame and unlock everything else."
- **Bowling Domain:** "Every spare number the app gives assumes you stand on board 20. Fix that first, then let people type in their own house pattern."
- **Behavioral:** "Give next week's arrival one line from last week (what moved, what cost pins). That is the habit loop; goals come second."
- **QA:** "On an iPhone in a Safari tab, a once-a-week bowler can lose every game after seven days of Safari use without visiting, and the app never warns them."
- **Strategy:** "Free and on-device is now the floor (Bowly, LaneLogic). Our edge is arsenal + pattern + center + lane model together, so build center memory and own-pattern entry before more generic stats."

## 5. Disagreements

1. **Install prompt** (UX vs QA). UX: no nags. QA: it's the only real protection on iOS. *Resolved:* one prompt after the first saved game; after that only a passive "Not protected" chip in More and the backup nudge on the recap. Never during scoring.
2. **Goals** (Behavioral vs Strategy). Strategy: streaks, badges and benchmarks risk the gamification no source asked for. Behavioral: process goals drive practice. *Resolved:* one optional, personal, process goal, shown post-session only. No streak counters, no badges in v1.
3. **Pattern entry depth** (Domain vs UX). Domain wants ft, mL and ratio; UX wants one field. *Resolved:* name first; numbers behind "Add details"; "Unknown — typical house" as the default.
4. **Wake lock and battery** (UX vs QA). QA: an always-on screen drains battery over a three-game night. *Resolved:* hold the lock only while a game is open; auto-release at the final frame or after 10 idle minutes; toggle in Appearance.
5. **Count mode** (Strategy vs Domain). Unresolved, so deferred (§3).
6. **PinPal import** (Strategy vs QA). Strategy wants it now; QA and the ROADMAP rule say no preset without a real sample file. *Resolved:* ship CSV export now; ask the owner or a tester for a PinPal export file before building the importer.

7. **What stays up front on Tonight** (Domain vs UX/Behavioral, sim1). Domain wants the pick card's specs and "Holds 4 of 6" visible, because they justify the line. UX and Behavioral: during a game they push the scoring card 1.3–2.4 screens down and change no decision. *Resolved:* the start line stays; the specs move behind "Why this ball ›"; pre-game, the full advisor stays open.
8. **Lane physics for beginners** (Domain vs UX, sim1). *Resolved:* entry, angle and deflection go behind a tap by default and stay up front when the profile says advanced, or once the user opens Details (the choice is remembered).
9. **Count-mode fallback for big leaves** (UX vs Domain). UX: a 5-pin leave is about 13 s. Domain: count entry loses the leave data that spare stats need. *Unresolved:* test an opt-in fallback with real beginners before building it.

## 6. Source list

**Fetched (F):**
- https://webkit.org/tracking-prevention/ (7-day cap; Home Screen exemption)
- https://lanelogic.net/ (free CSV/PDF export, Spare Drill and Practice modes, per-center stats, PinPal import, benchmarks)
- USBC 3-6-9 PDF and the LaneTalk / LaneTrax App Store reviews, as fetched earlier and recorded in `FEATURE_DEMAND_RESEARCH.md`

**Search excerpts (S):**
- WebKit "Updates to Storage Policy" (webkit.org/blog/14403)
- WebKit bug 254545 and MDN Screen Wake Lock
- lanetalk.com/tag-games and the LaneTalk App Store description
- Bowly App Store (id6759820168)
- Pinlytics (nvdatatech.com/pinlytics)
- Victory Bowling App Store (id6759615643)
- Tournament Sense App Store (id6747322744)
- StrikeMaster stats page
- Bowlytics GitHub README (dlaskowski23/BowlingApp: ball + venue/lane tracking, league mode)
- Brunswick Pattern Library and an NCAA Brunswick pattern sheet
- BowlersMart oil-pattern guide
- r/Bowling threads: "Best bowling apps" (2024), "Best bowling tracker app?" (2025–26), "Best way to track individual frames?", "Are the league president or secretary supposed to tell us what the pattern is…", spare-drill and practice-routine threads

**Simulations (repo, live):** `docs/user-simulations.md`; scripts and JSON in `/workspace/ux/sim1/`; screenshots in `/workspace/ux-shots/sim1/`.

**Not found:** no fetched or search source this run for LaneTrax or Ruby adding center memory, goals or pattern entry. Ruby's session tagging is as recorded in FDR §1 #9.
