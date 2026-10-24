# Gap review 1 — what Arsenal Pro is still missing (2026-10-24)

Prompt: owner message "what do you think we are missing. What does the team say". Roles from `docs/TEAM_PROMPT_PRODUCT_LOOP.md`. Inputs: `PRODUCT_LOOP_ITERATION_1.md`, `ROADMAP_NEXT.md`, `COMMAND_CENTER_PLAN.md`, `DATA_SYSTEM.md`, `FEATURE_DEMAND_RESEARCH.md`, `IMPORTS_RESEARCH.md`, `ENGINE_VERIFICATION_REPORT.md`, `DECISIONS.md`, the education docs, and the code at `cdb36b3`.

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

## 2. Merged, ranked top 8

| # | Gap | What to build (all outside active scoring unless noted) | Impact | Effort | Roles | Sources |
|---|---|---|---|---|---|---|
| 1 | **Data can vanish on iOS Safari** | `navigator.storage.persist()`; "Protected / Not protected" in More; one-time install prompt after the first saved game; backup nudge on the recap; "Last backup" line | **Blocker-class trust**: a weekly bowler in a Safari tab can lose everything with no warning | S | QA, UX | webkit.org/tracking-prevention (F); WebKit storage-policy post (S); repo grep (no `persist`, no last-backup) |
| 2 | **Spare hints assume strike board 20** | Strike position from tonight's line or Targeting feet, or a once-a-night "I stand on __" stepper; 3-6-9 recomputed from it, mirrored for lefties | High: every spare hint is currently wrong for most bowlers | S | Domain | repo `tonight.js:128`; USBC 3-6-9 PDF (F, via FDR §3) |
| 3 | **Games can't leave the app** | "Export games CSV" (game, frame and roll rows) on More with the existing `toCSV`; formula-injection guard; later a PinPal importer once a sample file exists | High: demand #1, and the switching path from PinPal | S (CSV) / M (PinPal) | QA, Strategy | FDR §1 #1 (repo, 9 sources); LaneLogic free export + PinPal import (F); Tournament Sense imports (S); r/Bowling PinPal threads (S) |
| 4 | **Centers and lane pairs remember nothing** | Center profile: lane pair (optional), last pattern, surface, bag, line and moves, and one carry-forward note. Shown on arrival; pre-fills setup | High: the moat (arsenal + pattern + center), and the habit loop | M | Domain, Behavioral, Strategy | Victory Bowling lane-pair notes (S); LaneTalk center/lane tags (S); StrikeMaster lane pairs (S); LaneLogic per-center stats (F); repo `rank.js:75` |
| 5 | **Can't enter your own or house pattern** | "My house shot": name plus optional ft, mL and ratio; "Unknown — typical house" default; Brunswick names allowed; saved per center; nearest-preset mapping labelled as today | High for league bowlers off the Kegel list | M | Domain, UX | repo `tonight.js:78–80`; Brunswick Pattern Library (S); r/Bowling "refused the pattern sheet" (S); BowlersMart ranges (S); Tournament Sense library (S) |
| 6 | **Alley mode: screen awake + bigger text** | Wake lock while a game is open (auto-release); Large / Extra-large text setting for the scoring surface and recap | Medium-high: removes unlocks from the 1–3 s loop; glanceability; accessibility | S | UX | WebKit bug 254545 / MDN (S); repo css (13 fixed 10–11 px rules); WCAG 1.4.4 (A) |
| 7 | **Session boundaries are calendar days** | `night-<date>-<n>`, "End night", 4 h idle auto-close; required spec for the queued league mode; practice excluded from averages | Medium-high: series split at midnight, mixed outings | S | QA, Domain | repo `tonight.js:31`, `store.js:128`; FDR §1 #9 (repo) |
| 8 | **Spare drill mode + one process goal** | Pick a leave and shoot reps, kept out of averages, with conversion by leave and ball. One optional personal goal (e.g. single-pin %) shown on the recap and on the drill screen | Medium: practice → progress loop; serious-bowler table stakes | M | Domain, Behavioral, Strategy | LaneLogic Spare Drill/Practice (F); Pinlytics goals (S); Bowly milestones (S); r/Bowling drill threads (S); FDR §1 #9 (repo) |

Just below the line:
- **Onboarding trim to hand-only** (Behavioral #3). S, no external source.
- **"What works where" compare** (Strategy #3). M, and it depends on #4 and the queued Games view.

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

**Not found:** no fetched or search source this run for LaneTrax or Ruby adding center memory, goals or pattern entry. Ruby's session tagging is as recorded in FDR §1 #9.
