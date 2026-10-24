# User simulations: baseline round (sim1), 2026-10-24

This round ran six personas through full sessions on the **live** app (https://majalen3.github.io/arsenal-pro-bowling/, build `a36776e`, service worker v21).

**How it was run**
- Tool: Playwright (Chromium) with mobile emulation (`is_mobile`, touch, DPR 2), at 390×844 and 360×740.
- Every storage context started fresh, so each persona is a first-time install.
- **Every request to `arsenal-pro-api.onrender.com` was aborted** (9 to 31 per persona). Nothing was written to production.
- App code was read-only. Scripts and raw JSON are in `/workspace/ux/sim1/`:
  - `sim.py <persona>`: the full sessions.
  - `overload.py`: the per-screen audit.
  - `midnight2.py` and `lefty2.py`: the two bug repros.
- Screenshots are in `/workspace/ux-shots/sim1/` (79 files). Paths below are relative to that folder.

**Time per frame** uses the same KLM model as iteration 1:
- M = 1.35 s of mental prep per ball;
- P+K = 1.3 s per tap;
- +1.0 s per scroll that's needed.

The model numbers are the human cost. Measured app latency (click until the DOM settles) is reported separately. Model times are estimates (A), not observed humans.

**Labels:** F = page fetched; S = search excerpt; repo = read in this repo; A = team judgment.

## 1. Headline findings (ranked)

| # | Finding | Evidence | Severity |
|---|---|---|---|
| 1 | **Lefty spare hints are the right-hander's numbers.** The profile is saved as `hand:"left"`. Leaving the 7 still shows "key pin 7 → stand 11 (move 9 right)", and the 10 shows "stand 29 (move 9 left)". These are exactly the right-hander's values. The app's own `quicklog.leaveHint(...,'left')` returns 29 for the 7 and 11 for the 10, so the Tonight quick log isn't passing the profile hand. | `lefty2.py` output; `lefty-06-lefty-hint.png`, `lefty-welcome-left-selected.png`; node check of `js/cc/quicklog.js` (repo) | **High**: every spare hint is on the wrong side for every lefty. Fix is S. |
| 2 | **A league night crossing midnight loses the game in progress.** Clock mocked to 23:50 (America/Chicago); 5 frames logged ("Frame 6 · ball 1"); clock moved to 00:10; reload. Tonight shows **"Frame 1 · ball 1"** and an empty sheet. The 5 shots stay in IndexedDB under `tonight-2026-10-27`, but the new day reads `tonight-2026-10-28`. This reproduces GAP_REVIEW_1 QA #2. | `midnight2.py`; `midnight-after-0010.png` | **High** for late leagues. |
| 3 | **A double-tap on X Strike logs two strikes.** One accidental `dblclick` in frame 7 moved the sheet from "Frame 7 · ball 1" to "Frame 9 · ball 1". There's no debounce. Undo recovered it in 1 tap, but only if the bowler notices. | `beginner-07-after-double-tap.png`, `beginner-08-FAIL.png` | **High** trust risk; S fix: ignore a second tap within about 400 ms on the same button (A threshold). |
| 4 | **Tonight is drowning the scoring card.** The quick log starts **983–1,809 px** down the page, which is 1.3–2.4 screens (beginner 360 px: 983; league 390 px: 1,504–1,560; advanced with a pattern: 1,809). The page is **3,625 px (4.9 screens)** with an event picked. After a reload mid-game, `scrollY` goes back to 0 and the scoring card is off-screen. Above the card sit the advisor (787 px) and a pick card (641 px) with RG/diff, "Level 4 · demand 3", Motiv (F), Laydown, Breakpoint, "Holds 4 of 6" and Rule of 31. | `overload.json`; `overload-tonight-league-top.png`, `league-07-after-reload.png` | **High**: the bottom scoring pad is queued, but **pruning** the cards above it is not. See §3. |
| 5 | **After 3 games, nothing shows the night.** Sessions says "No saved lines yet" (it lists Lane lines, not games). Insights shows only arsenal coverage, RG/diff and static prose. Series, average and game 1's score appear nowhere once game 2 starts. | `league-10-sessions-after-3.png`, `league-11-insights.png`, `coach-06-review-sessions.png` | **High** for the payoff loop. The Games view is queued; a recap is not (see GAP_REVIEW_1 §2b). |
| 6 | **Every ball is credited to the current pick, spares included.** Roll-2 shots carry `own-rattler-big-bite` or `own-super-nova`, never the spare ball (Ice Storm). The quick log has no "spare ball" control. Weaker/Stronger switch the pick, and every later shot follows it. | `league.json` → `spare_shot_ballIds` | Medium. It confirms the **queued** "ball attribution" item, so it isn't a new gap. |
| 7 | **Multi-pin leaves are slow.** Each standing pin is a tap. A beginner's 2-4-7 then 7 costs about 10.5 s; a 5-pin leave then 1 costs about 13.1 s. Only strikes (2.65 s) meet the 1–3 s rule. | per-frame KLM in `beginner.json`, `family.json` | Medium; it hits beginners hardest. |
| 8 | **You can't enter your own pattern.** "Brunswick Kingpin Retro 41" + Enter shows the toast "Pick a pattern from the list" and stays "assumed house 38 ft". | `advanced-06-pattern-custom.png` | Medium; confirms GAP_REVIEW_1 #5. |
| 9 | **Lane and Tonight show different stand numbers for the same ball.** After Skip, Lane shows **Feet 12 → Target 12.4**; Tonight and Targeting show **feet 17, aim 10.7** for the same Rattler Big Bite on the house shot. A beginner can't tell which one to use. This may be Lane's own saved state rather than a model error; it needs reconciling or labelling. | `overload-landing-after-skip(lane).png` vs `overload-tonight-league-top.png`, `overload-target.png` | Medium (trust). |
| 10 | **Jargon with no help for a beginner.** On Tonight: RG, diff, Level, demand, Laydown, Breakpoint, Rule of 31, PAP, benchmark. There are 0 help affordances on Tonight. | `beginner.json` → `jargon_on_tonight`, `help_affordances` | Medium. Help bubbles are **queued**; pruning (§3) still applies. |
| 11 | **Offline scoring works, but nothing says you're offline.** Reload while offline loaded Tonight and kept "Frame 5 · ball 1", and the game finished 162 = expected. There's no offline cue on Tonight. More said "waiting to sync", which is partly an artifact of blocking the API. | `family-02-offline-tonight.png` | Low. |
| 12 | **There is no multi-bowler mode** (no Add bowler or Baker). The family's only workaround is bowler B as "game 2", which merges both bowlers' stats into one session. | `family-04-sessions-merged.png` | It's **queued** (league/Baker mode), so it isn't a new gap. |

**What worked:**
- Scoring was correct in every simulated game: 134, 206, 223, 300, 206, 162, 162, 134 all equalled the independent scorer. That includes 10th frames (X X X, X 9/ X, 9/ 5) and a 10th-frame fix by Undo (4 taps).
- Reload mid-game kept the state ("Frame 6 · ball 1").
- Switching to the Stronger ball mid-game didn't disturb the frame.
- Slow taps (2.5 s pauses) caused no timeouts.
- The Bag Advisor already turns logged shots into a visible, sample-labelled line: "Rattler Big Bite: 100% pocket, 54% strikes over 1 session (n=13 first balls); app estimate (2 of 21 games)" (`league-07-after-reload.png`).

## 2. Personas: journey, timing, failures, SDT and cognitive load

SDT scores are 1–5, where 5 means fully supported. Cognitive load (CL) is 1–5, where 5 is overloaded. Both are team judgments (A) based on what the run observed. Time per frame is the KLM mean over frames 1–9. Latency is measured app latency per tap (mean / max).

| Persona | Viewport | What they did | Frames | KLM s/frame (mean, max) | Latency ms | Failures | Autonomy | Competence | Relatedness | CL |
|---|---|---|---|---|---|---|---|---|---|---|
| **Beginner** (120–150) | 360×740 | Full welcome (4 taps) → landed on **Lane**, not Tonight → Tonight empty state → Load starter → 1 game with slow taps, one double-tap → Sessions / Insights / More | 10 | **7.9**, 13.1 | 104 / 194 | Double-tap = 2 strikes; Sessions empty; jargon | 2 | 2 | 1 | **5** |
| **Intermediate league** | 390×844 | Welcome (tweener) → League → 3 games; Stronger ball after G2 F3; reload at G2 F5; 10th-frame XX → undo → X 9/ | 29 | 4.1, 9.2 | 83 / 142 | Spares credited to the strike ball; game 1 hidden in G2; no series/average; quick log off-screen after reload | 3 | 3 | 2 | 4 |
| **Advanced** (sport) | 390×844 | Welcome (cranker) → Sport → pattern search, custom pattern rejected → Targeting → Find my strike line → 300 game + 206 → Insights | 20 | 3.7, 9.2 | 61 / 110 | Own pattern rejected; no lane-pair field; no carry, pocket or per-pattern stats from their games | 2 | 3 | 1 | 3 |
| **Lefty** | 390×844 | Welcome (Left) → League → leave hints for 7 and 10 → 1 game → Targeting → Lane | 10 | 5.4, 7.9 | 84 / 121 | **Spare hints are right-handed** | 3 | **1** | 2 | 4 |
| **Family / league night, one phone** | 390×844 | Skip → League → bowler A 4 frames → **offline** + reload → finish (162) → bowler B as "game 2" (134) → Sessions | 20 | 6.6, 13.1 | 86 / 153 | No Add bowler / Baker; stats merged; no offline cue | **1** | 2 | 2 | 4 |
| **Coach reviewing** | 390×844 | Welcome → Practice → student game (223) → Sessions (Lines/Shots/Alley notes) → Insights → More → Download backup | 10 | 4.7, 7.9 | 93 / 190 | Only a JSON backup (`arsenal-pro-backup-v1.json`, keys: events, imports, prefs…); no games CSV, no per-bowler view; Sessions → Shots says "No shots logged yet" after 10 frames (Shots means Lane taps); practice isn't labelled as excluded anywhere | 2 | 2 | 2 | 3 |
| *(edge) Midnight* | 390×844 | League from 23:50, reload at 00:10 | 5 | 4.4 | 69 / 97 | **Game in progress gone from view** | – | – | – | – |

KLM cost by frame type, the same for every persona:

| Frame type | Example | Taps | KLM time |
|---|---|---|---|
| Strike | X | 1 | 2.65 s |
| One-pin spare | 10 then / | 3 | 6.6 s |
| Two-pin spare | 3-6 then / | 4 | 7.9 s |
| Partial open | 2-4-7 then 7 | 6 | 10.5 s |
| Big leave | 1-2-4-7-10 then 4 | 8 | 13.1 s |

Add +1.0 s for each needed scroll.

**What each persona actually looks at and asks** (the basis for §3; A, informed by the sources noted):
- **Beginner:** "Where do I stand? What's my score? Am I getting better?" They don't know RG, PAP or breakpoint. Each unknown term is extraneous load: under cognitive-load theory, unfamiliar terms compete with the task (A, theory not fetched this run).
- **League bowler:** "Which ball? Did I move? What's my series against my average? Did I miss my 10s again?"
  - A league note-taker says it's "hard to keep track during league play" (r/Bowling, S).
  - High-school coaches track spare leaves, first-ball average, open %, single-pin % (r/Bowling, S).
- **Advanced:** "Is it transitioning? When do I change ball or move? What does this pattern want?" They want numbers, but numbers *about their own throws*, not specs.
- **Lefty:** "Are these numbers for my side?" One wrong-side hint breaks trust in all the hints.
- **Family:** "Whose turn is it, and what did each of us bowl?"
- **Coach:** "What does my bowler leave and miss, game over game? What should they practice?"

## 3. Data-overload audit: every element on every screen

Owner rule: *"Make sure we aren't drowning in data. It needs to be intuitive."*

Each element gets two scores:
- **U (usability):** understood within seconds, in plain bowling language. 3 = yes, 2 = with effort, 1 = no (for a beginner).
- **A (applicability):** it changes a real decision (ball, feet/target, spare, practice focus) **for that persona at that moment**.
  - B = beginner, L = league, V = advanced.
  - ● = changes a decision, ◐ = sometimes, ○ = never.

There's no fixed number limit. The test is whether each element earns its place. Verdicts:
- **KEEP** = up front;
- **TAP** = behind a tap or disclosure;
- **CUT** = remove from this screen.

The screen measurements (doc height, element positions) come from `overload.json` at 360×740 unless noted.

### 3a. Tonight, during a game (worst screen: `overload-tonight-league-top.png`, `league-07-after-reload.png`, `beginner-05-tonight-top.png`)
**The one takeaway should be:** "Here's your ball and where to stand; log this ball." Right now that line is one sentence buried in a 4.9-screen page.

| Element | U | A (B/L/V) | Verdict | Reason |
|---|---|---|---|---|
| "Start with: *ball*, from feet 17, aim 10.7 at the arrows" | 3 | ●/●/● | **KEEP**, as a sticky one-liner above the scoring card | It's the only line that answers "where do I stand". |
| Provenance chip "2-D model · offset 7 assumed" | 1 | ○/○/◐ | **TAP** (ⓘ on the line) | Honest, but it's metadata, not a decision. |
| Event chips (League … Sport) | 3 | ●/●/● pre-game, ○ in game | **KEEP pre-game**; after ball 1, collapse to one chip "League ▾" | Answered once per night. |
| Bag list with Swap and "specs only" / "benchmark" chips | 2 | ◐/●/● pre-game, ○ in game | **TAP** once scoring starts ("Bag (3) ›") | A packing decision; it's done by frame 1. |
| "Then: A → B (lanes hook early …)" | 2 | ○/●/● | **KEEP**, one line under the start line | It's the ball-change plan, the main mid-game decision. |
| "Why this bag" / "What would change it" | 2 | ○/◐/◐ | **TAP** | Reasoning, not action. Valuable for trust, so keep it one tap away. |
| Pick card: "Level 4 · demand 3", "Hybrid · symmetric · RG 2.48 / diff 0.035", Motiv (F), "38 ft = medium pattern → base 3", "Volume unknown → length only" | **1** | ○/○/◐ | **TAP** ("Why this ball ›") | Spec jargon. It duplicates the start line. |
| Feet / Laydown / Eyes / Breakpoint tiles | 2 | ●(feet, eyes)/●/● | **KEEP feet + eyes** in the start line; **TAP** laydown and breakpoint | Laydown vs feet is a second "board" number that beginners confuse with feet. |
| "Holds 4 of 6 small misses (±0.5 mph, ±20 rpm, ±1 board)" | 1 | ○/◐/● | **TAP** (or plain words: "forgiving line") | It's a margin, not an action. |
| "Find my strike line ›" / "Check feet and eyes on the lane ›" | 3 | ●/◐/◐ | **KEEP one** ("Fine-tune ›"); **CUT** the other | Two links to similar places. |
| "Rule of 31: 38 ft → board 7" | 1 | ○/◐/● | **CUT from Tonight**; keep it in Targeting's sources | It's a rule of thumb that the model line already includes. |
| Model footnote ("Model runs on the nearest preset … An estimate, not a promise") | 2 | ○/○/○ | **TAP** | — |
| Weaker / Stronger buttons | 3 | ◐/●/● | **KEEP**, next to the scoring card | It's the mid-game ball change. |
| Quick log (frame strip, pins, X / Log / Foul, Undo) | 3 | ●/●/● | **KEEP; first thing on screen while a game is open** | It's the job. |
| "First ball hit: Pocket / High / Light" | 2 | ○/◐/● | **KEEP** (optional, compact); for beginners, hide until they turn it on | It feeds triggers; for a beginner it's another decision per ball. |
| "How did it read? Too early / weak / angular / smooth" | 2 | ○/●/● | **KEEP below the log**, collapsed by default for beginners | It's the adjustment input. |
| Lanes tonight (pattern, center, surface, condition, bag size, game format) | 2 | ●/●/● pre-game | **TAP after ball 1** ("Setup ›") | It's set once. |
| Plan A/B/C + trigger rule text | 2 | ○/●/● | **CUT the card**: merge it into the "Then:" line; show triggers only as the live warning when they fire | It duplicates the advisor plan. |
| Spares card "3-6-9 from strike board 20 · Ice Storm" | 2 | ●/●/● (but **wrong** for lefties and anyone not on 20) | **CUT the card**: the leave hint inside the quick log already covers it; fix board and hand first | The numbers are wrong for many bowlers (finding #1; GAP_REVIEW_1 #2). |
| "Your release" (hand, style, speed, rev, PAP, tilt, rotation, "you reported") | 2 | ○/○/○ in game | **CUT from Tonight** (it lives in More → profile) | It never changes a decision at the lane. |

Result: during a game, Tonight becomes the start line, the plan line, the scoring card and Weaker/Stronger, with everything else one tap away. That cuts about 10 cards to 1 card plus 2 lines and puts the quick log within the first screen. The queued bottom pad then covers thumb reach.

### 3b. Lane, the landing screen after the welcome (`overload-landing-after-skip(lane).png`)
**Takeaway should be:** "Strike / pocket, and here's where to stand." The page currently shows **27 numbers** above the fold for a first-time user.

| Element | U | A (B/L/V) | Verdict | Reason |
|---|---|---|---|---|
| Result headline "Strike" / "Right in the pocket" | 3 | ●/●/● | **KEEP** | — |
| "17.4, sweeping the 5", "deflects 13° right", "Pin action: approximate 2-D model, assumed 15 lb ball, no spin" | 1 | ○/○/◐ | **TAP** ("How it works" already exists) | Physics prose. |
| Entry 17.4 / Angle 4.4° (need 4–6°) / Break 13.3 @ 37 ft tiles | 1 | ○/◐/● | **TAP** for beginner and league; show by default only when the profile says advanced (or a "Details" toggle remembers it) | Advanced bowlers use entry angle; beginners can't act on it. |
| Feet 12 → Target 12.4, mph, rpm | 2 | ●/●/● | **KEEP feet + target**; mph and rpm behind the sliders icon | Conflicts with Tonight's 17 / 10.7 (finding #9). Reconcile, or label as "what-if". |
| Margin "4 of 6 small misses still…" | 2 | ○/◐/● | **TAP** | — |
| Pattern / Surface / Oil ×1.0 chips | 2 | ◐/●/● | **KEEP** (one row) | — |

The beginner should land on Tonight, not Lane. That's queued ("Tonight as the default screen") but not yet live: the welcome still ends at `#/lane`.

### 3c. Targeting (`overload-target.png`, `advanced-08-target-find.png`, 46 numbers on the page)
- **KEEP:**
  - Feet / Eyes steppers.
  - Find my strike line.
  - The ball picker.
- **TAP:**
  - "Pocket 16.9 · 5.3° model".
  - "In the box".
  - The speed/rpm "your profile" chips.
  - The model-limit line.
  - The tour ("1 of 3"): show it once only.
- **Rewrite the Find result** to lead with the action. Today it reads: "Stand 17, aim 11 at the arrows. Pocket 27% (model estimate, assumed accuracy ±1.5 bds, … 200 simulated shots). Not higher mostly because a 1.5-board miss at the arrows moves the entry about 2.8 boards, and the window is 1 board wide." Proposed:
  1. "Stand 17, aim 11."
  2. One plain line: "Tight line: a 1–2 board miss leaves the pocket."
  3. The numbers behind a tap.
- Applicability is high for V and L, and medium for B (only feet and eyes).

### 3d. Sessions and Insights, after games (`league-10-sessions-after-3.png`, `league-11-insights.png`, `overload-arsenal-insights.png`)
- **Sessions: applicability fails.** After 3 games it says "No saved lines yet" and points to the Lane bookmark. The tab name promises games and nights.
  - **Fix:** show tonight's games first: scores, series, and one line of what cost pins. Lane lines go below.
  - This is the session recap; see GAP_REVIEW_1 §2b.
- **Insights: no element is about the bowler's own throws.**
  - Coverage by oil 8/17/8: U2. A is ○ after a game and ◐ when shopping for balls.
  - Core map RG vs diff: U1 for B and L; useful for V when ball shopping.
  - Assessment prose: static, already proposed for removal.
  - **Verdict:** move all three under "Arsenal ›" (TAP). Lead Insights with the bowler's own trend:
    - average over the last N games, with n;
    - single-pin %;
    - first-ball pocket %;
    - practice excluded.

### 3e. More (`overload-more.png`, `beginner-12-review-more.png`)
- "Your data: 37 events on this phone (indexedDB). 10 owned balls, 1 games, 0 tracker sessions. 37 waiting to sync… No v1 backup downloaded yet: your pre-2.1 data is kept as a snapshot until you download one."
  - U1: "events", "indexedDB", "v1", "pre-2.1" and "tracker sessions" are developer words.
  - **Replace** with: "Your games are saved on this phone. Last backup: never. [Back up]". Counts and storage go behind a tap.
- The device backup code shown in full: **TAP**. It's sensitive ("anyone with it can see your lines") and doesn't need to be on screen.
- Fix the "1 games" grammar.

### 3f. Bag and Arsenal (`overload-bag.png` 4.1 screens, `overload-arsenal.png` 7.6 screens)
These are home and pro-shop planning screens, where detail is fine and time pressure is low. Keep them, but:
- source chips such as "Bowler's Review (F)" and "app tag" / "shape (estimate)" on every row go **TAP** (one ⓘ per section);
- the "Ball status and care" lines ("Since refresh: not logged; resurface: not logged") show only when there's data.

### 3g. Welcome (`overload-welcome.png`, `beginner-01..03`)
- It's clear: 2 numbers, one primary Next button.
- Questions such as hand and style are KEEP. Hand is essential (finding #1 shows how much depends on it).
- Speed, rev and PAP can move to the moment they matter (GAP_REVIEW_1 Behavioral #3).

### Worst screens, ranked
1. **Tonight during a game.** The scoring card is 1.3–2.4 screens down, with about 10 cards of spec, model and setup text around it.
2. **Lane as the first screen.** It shows physics numbers to someone who hasn't thrown yet, and its feet number differs from Tonight's.
3. **Sessions / Insights after a night.** Lots of arsenal data and no data about the night.
4. **More → Your data.** Developer vocabulary in the trust-critical place.

## 4. Edge-case matrix

| Edge case | Result | Screenshot |
|---|---|---|
| 10th frame: X X X, X 9/ X, 9/ 5, X X → Undo → 9/ | ✅ All scored correctly; the fix took 4 taps | `league-09-g3-10th-fixed.png` |
| Baker / multi-bowler | ❌ Not available (queued) | `family-04-sessions-merged.png` |
| Offline: reload and continue | ✅ Works; ⚠ no offline cue on Tonight | `family-02-offline-tonight.png` |
| Reload mid-game | ✅ State kept; ⚠ scrolls to top, so the quick log is off-screen | `league-07-after-reload.png` |
| Wrong ball credit | ⚠ Every roll goes to the current pick; no spare-ball control (queued: ball attribution) | `league.json` |
| Slow taps (2.5 s) | ✅ No timeouts | `beginner-06-quicklog.png` |
| Double tap | ❌ Logs 2 strikes | `beginner-08-FAIL.png` |
| Midnight crossover | ❌ Game in progress disappears | `midnight-after-0010.png` |
| Lefty mirroring | ❌ Quick-log spare hints use right-hand boards | `lefty-06-lefty-hint.png` |

## 5. Not done in this round
- No real humans were involved; all times are KLM model estimates (A). Real-person timing is the next round.
- No VoiceOver/TalkBack pass, and no 200% zoom pass.
- Safari/WebKit was not run, so ITP storage eviction was not reproduced; it's sourced in GAP_REVIEW_1 QA #1.
- Coach import of another bowler's backup was not tried, because it would overwrite the coach context.
