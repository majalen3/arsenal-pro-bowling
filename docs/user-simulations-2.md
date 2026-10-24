# User simulations, round 2 (sim2)

Run on 2026-10-24 against the **live** build (https://majalen3.github.io/arsenal-pro-bowling/, sw v32 / commit 577dc5f at start; the Armory commit 5d64434 landed while the run was in progress). It used Playwright Chromium in mobile mode (touch, DPR 2, America/Chicago).

**API and data safety:**
- Every call to `arsenal-pro-api.onrender.com` was routed to abort (10–26 per persona), so nothing reached the production DB.
- Each persona got a fresh browser profile. No live data was read, written or deleted.

**Code:**
- Harness: /workspace/ux/sim2/sim2.py, with an independent scorer (fouls and 10th-frame racks) and the `Sim` class.
- Personas: /workspace/ux/sim2/run.py
- Probes: /workspace/ux/sim2/probe3.py (Shark pattern, lefty profile) and probe4.py (button positions).

**Raw results:** /workspace/ux/sim2/<persona>.json and out-<persona>.txt.

**Screenshots:** /workspace/ux-shots/sim2/<persona>-NN-<label>.png.

**Timing method:** the same KLM model as sim1 (M 1.35 s per ball looked at, P+K 1.3 s per tap, +1.0 s per scroll). These are **model estimates (A)**, not timings of real people. App latency comes from the real tap-to-update wait (≤163 ms everywhere).

## 0. Score verification: 19 of 19 games correct

The harness scorer and the app's "Final N" matched for every game, and so did each frame's running total.

| Persona (viewport) | G1 | G2 | G3 | Extra |
|---|---|---|---|---|
| Beginner (360×740) | 134 (double tap at f7) | 118 (2 fouls; f3 entered wrong, then fixed) | 139 (2 splits) | |
| League team (390×844) | 206 | 223 (reload mid-game) | 204 | Ann 134 / 139 / 118 on the board; Baker game 226 |
| Lefty (390×844) | 162 | 139 | 206 | |
| Advanced (390×844) | **300** | 206 (ball change + spare rule) | 232 (X 6/ 10th) | |
| Coach (360×740, Practice) | 223 | 134 | 204 | CSV scores 223, 134, 204 ✓ |
| Midnight (390×844) | 206 (23:20) | 223 (crossed 00:00, reloaded) | 204 (offline reload) | |

**League board check (90% of 220), all ✓:**
- Me: avg 180, handicap 36.
- Ann: avg 150, handicap 63.
- Bo: absent, avg 160. Absentee score 150 with handicap 54 (avg−10, handicap on the average, 112e-1).
- Vacancy: 120 with handicap 90 (112d).
- Team G1: 610 scratch + 243 handicap = 853.

**Baker check, all ✓:**
- Frames alternated You/Ann 1–10.
- Team handicap was 99 (36 + 63; absent and vacancy spots don't bowl Baker).
- Baker balls are kept out of my averages: the projection still has 3 personal games.

**No scoring or data-loss bug was found:**
- 0 page errors.
- 0 taps that changed nothing.
- Each of these kept the game exactly where it was: reload mid-game, reload after midnight, and reload while offline (Frame 5 restored, then finished correctly).

## 1. Ranked new fixes

Impact runs H/M/L. Effort runs S (under 1 h), M (half a day) and L. "Scoring?" asks whether the fix touches the screen during active scoring. Every fix below removes or clarifies something; none adds a step while scoring.

| # | Finding (evidence) | Sev | Effort | Scoring? |
|---|---|---|---|---|
| 1 | **Three different answers to "where do I stand?"** On 2026 PBA Shark (Sport), Tonight says "feet 23, aim 15.3", Find my strike line says "stand 18, aim 12", and the Sport Aim Box says board 14 at 47–49 ft. With the box on, the app's own line shows **"Outside zone"**. On House it is the same: Find's 17/11 line is "Outside zone" of Baker's box (4.5–9.5 at 45 ft) for both the lefty and the righty. (probe3 log; lefty-09, advanced-06) | **H** | M | No |
| 2 | **Aim Box Sport ignores tonight's pattern length.** `aimbox.boxOf` uses the engine preset `OIL_LEN.shark = 45` instead of the length the user picked (index: 2026 PBA Shark 48 ft, and Targeting itself says "shark preset (48 ft)"). The Rule of 31 then gives board **14** instead of **17**, and the box sits 3 ft short. This is a wrong number in a "mechanically traceable" feature. (probe3-*-shark-target) | **H** | S | No |
| 3 | **League "Fix a frame" edits whoever is up, unnamed.** After my frame 4, Ann is up. Fix offered frames 1–3, which were *Ann's*, and "Fixing frame 2" opened Ann's frame. Nothing names whose game it is, so my own frame 4 can't be fixed until my next turn. "Saved ✓ frame 4" (mine) sits right above Ann's empty, highlighted frame 4. Undo is named correctly ("Undo last ball (You, frame 4)"). (league-06, league-07) | **M-H** | S–M | Yes (label only, no new step) |
| 4 | **Finished games can't be fixed anywhere.** After "Start game 2" or "End night", earlier games are read-only (the session page has no edit). A wrong frame that someone spots on the house monitor after game 1 is wrong for good. This is a data-trust gap. (beginner `can_fix_previous_game: false`, beginner-10) | **M-H** | M | No (between games / post) |
| 5 | **Small phone: Undo, Fix and the spare hint are below the fold.** At 360×740 in game, `#qlUndo` is at 823–867 px, `#qlFix` at 875–919 and the hint "key pin 10 → stand…" at 777–815; the viewport is 740. The hint is the spare guidance and Undo is the trust control, and neither is visible without scrolling. At 390×844 the hint just fits but Fix doesn't. (probe4-360-*-pad-with-pin) | **M** | S | Yes (layout only) |
| 6 | **Team nights double the scoring load.** Entering a teammate costs **7.0 s per frame** (KLM, 3.4 taps; beginner-level leaves) on top of my 4.6 s. That's about 116 s of tapping per 2-bowler game and about 4× that with a full lineup, all under league-night time pressure. An option to enter only a teammate's game total at the end would cut steps without hurting my own data (handicap only needs their total). | **M** | M | Yes (removes steps) |
| 7 | **Practice is counted in one place and not the other.** After 3 Practice games, Insights says "Score a game on Tonight or import scores to see your last 10 games here." That is false and mildly invalidating. Meanwhile the Bowler Card shows **Average 187, "your games · 3 games"**, which *includes* practice. USBC averages are certified-play only, so the Card should match Insights and say "practice nights left out". (coach-07, coach-08) | **M** | S | No |
| 8 | **The recap ignores the league average typed in Team setup.** On a first night, with avg 180 entered, the recap shows "206 average over 1 game" but no "vs your 180 average" or "series 633 vs 540 expected". The comparison comes only from other sessions' games. That number would earn its place: it is the league bowler's main question. (league-05) | **M** | S | No |
| 9 | **Custom pattern names are still rejected** (sim1 #8, still open). "Brunswick Kingpin Retro 41" + Enter shows the toast "Pick a pattern from the list" and stays on "assumed house 38 ft". (advanced-03) | M | M | No |
| 10 | **"pocket N of N tagged" is shown when nothing was tagged.** Strikes count as pocket tags, so the beginner (0 tags) sees "pocket 4 of 4 tagged" and the 300 game shows "12 of 12 tagged". The number is fully redundant with strikes, so it doesn't earn its place. Show it only when there are non-strike tags (`tagged > strikes`). (recaps in every persona) | L-M | S | No (recap) |
| 11 | **Defaults are labelled as user data.** A beginner who only accepts the welcome defaults sees "15 mph · 220 rpm, **you reported**" on the Card and "15 mph your profile 220 rpm your profile" in Targeting. These should read "default (not entered)" until the user changes them. That follows the owner's rule to label model or assumed values versus real data. (beginner-13) | L-M | S | No |
| 12 | **The Find my strike line footer is hard-coded:** "A real *tweener* house line usually starts wider…" appears for a lefty stroker and a righty cranker alike (target.js:84). It should name the user's style or say "a typical house line", to stay neutral on styles. | L | S | No |
| 13 | **The offline cue treats "server unreachable" as "Offline".** With Wi-Fi on but the API unreachable, the chip says "Offline · saved on this phone" and More says "80 changes waiting to back up (offline, will retry)". Wording like "Not backed up yet · saved on this phone" is accurate in both cases. (Caveat: the sim blocks the API on purpose, so this matches what a user sees when Render is asleep or down.) | L | S | No |
| 14 | **Pre-game: the pad is still 1.4–2.3 screens down** (Strike at y=1064 px at 740 px tall, and 1603–1908 at 844), with a 2.2–3.1 k px page. That costs one scroll per night. The pre-game first screen holds 18 numbers and 97 words, including "Level", "demand" and "benchmark", while help dots are off by default and absent on Tonight by design. In game it's fixed: the pad starts at 308–341 px. | L | S | No |
| 15 | **The spare hint attributes "USBC 3-6-9".** 3-6-9 is a widely taught spare system, not a USBC rule. Cite the source or drop "USBC" so the bowler doesn't read it as a rule. | L | S | No |

**Domain notes (no bug):**
- Baker handicap = the sum of the bowlers' handicaps. USBC leaves Baker handicap to league rules, so label it "your league's rule (A)" next to the 99.
- The handicap note correctly says USBC uses 100% unless the league rule differs (Rule 100d-2), while the default selected is 90%. That's fine, since it's the common league setting and is labelled.

## 2. Before/after against sim1 (v21 → live)

| Sim1 finding | Sim2 result |
|---|---|
| Lefty spare hints were mirrored wrong (High) | **Fixed.** Lefty 7 → "stand 26 (move 9 right)", 10 → "stand 8 (move 9 left)". |
| Midnight split the night and lost the game (High) | **Fixed.** Game 2 started before midnight (23:2x) and resumed at 00:10 on "Frame 6 · ball 1"; there is one session id (`night-2026-10-27-1`). With no "End night", the next evening starts a fresh game 1. |
| Double tap logged 2 strikes (High) | **Fixed.** A dblclick on Strike moved Frame 7 → Frame 8 only. |
| Scoring card was 1.3–2.4 screens down (High) | **Fixed in game** (pad top 308/341 px). Still present pre-game (#14). |
| No night recap (High) | **Fixed.** Recap after every game ("Next focus: the 6-10 leave, 0 of 2 made tonight" is informational and non-evaluative), plus the session page and series. |
| Ball credited to the pick (Med) | **Fixed.** The ball chip changed to Super Nova at frame 4, and the spare rule credited every spare ball to Ice Storm (projection checked). It costs 5 taps between frames. |
| Multi-pin leaves slow (Med) | **Partly fixed.** See below. |
| Custom pattern rejected (Med) | **Open** (#9). |
| Lane vs Tonight stand mismatch (Med) | **Fixed for Lane, but the problem moved to newer tools** (#1). |
| Jargon, no help (Med) | Help bubbles + Glossary shipped (off by default; none on Tonight by design). Pre-game jargon remains. |
| No offline cue (Low) | **Fixed** (`#netChip`); the wording is ambiguous (#13). |
| No multi-bowler (queued) | **Shipped** (League team + Baker); the math is correct (§0). |

**Leave timings, sim1 → sim2 (KLM, model estimate):**

| Frame type | Sim1 | Sim2 |
|---|---|---|
| Strike | 2.65 s | 2.65 s |
| 1-pin spare | 6.6 s | **5.3 s** (2-tap "spare now") |
| 2-pin spare | 7.9 s | **6.6 s** |
| Open via Miss | — | 6.6 s |
| Big leave (5 pins, then 1) | 13.1 s | 13.1 s, unchanged |

Per-persona averages (model):

| Persona | s/frame | Taps/frame | Scrolls in 30 frames |
|---|---|---|---|
| Beginner | 7.1 | 3.4 | 2 (1st frame of the night) |
| League, me | 4.6 | 1.9 | 2 |
| League, Ann | 7.0 | 3.4 | 0 |
| Lefty | 5.5 | 2.4 | 0 |
| Advanced | 4.0 | 1.6 | 0 |
| Coach | 5.7 | 2.5 | 2 |
| Midnight | 4.8 | 2.0 | 1 |

## 3. Personas: journey, taps and time, SDT and cognitive load

**Beginner casual (360×740, right hand, accepted defaults).**
- **Journey:**
  - Welcome took 4 taps and landed on Tonight.
  - There is no "Open bowling" event, so the closest choice is League or Practice.
  - The first ball needs a scroll.
- **What worked:**
  - The double tap and both fouls were handled ("F 8", "F /" both correct).
  - Fix a frame took 3 taps and showed "Saved ✓ frame 3 fixed".
  - Recaps were short.
- **Friction:**
  - The first screen shows 18 numbers.
  - "Bag, lanes and line" and "Why this ball, specs" are 28 px tall, under the 44 px target, though they aren't scoring controls.
- **SDT:**
  - Competence is fed by the recap facts ("Spares made 10 of 26").
  - "Spare conversion: Level 1 of 5" on Insights and the Card could read as a grade. Phrase it as a step ("next level at 50%").
- **Cognitive load:** fine in game; high pre-game.

**League team night (390×844, Tweener, with Ann, absent Bo and a vacancy).**
- **Setup:** about 14 taps + 12 characters, once per night if the lineup is reused (persistence across weeks not tested).
- **What worked:**
  - Turn order, board math, reload and Baker are all correct.
  - "Up: Ann · frame 4" is clear.
- **Friction:**
  - Fix on the current bowler is unnamed (#3).
  - Entering Ann's balls is the dominant cost (#6).
  - The recap has no league-average line (#8).
- **SDT (relatedness):** the team board is a good shared moment between games.
- **Cognitive load:** the stress case needs the "teammate total only" path.

**Lefty (390×844, Stroker).**
- **What worked:**
  - Hints, scoring and the recap are correct.
  - Find my strike line ran (Stand 17, aim 11, 27% pocket, labelled as a model estimate with assumed accuracy ±1.5 boards and no LaneTrax import). This is honest labelling, which is good.
- **Friction:**
  - The footer says "tweener" (#12).
  - The House Aim Box says "Outside zone" for the line just recommended (#1).

**Advanced / tournament (390×844, Cranker, Sport, Shark).**
- **What worked:**
  - The 300 and the X 6/ tenth were correct.
  - Ball chip and spare rule both worked.
- **Friction:**
  - Three conflicting start lines (#1).
  - The Rule of 31 uses the wrong length (#2).
  - No custom pattern (#9).
  - No per-pattern split in Insights (the word "pattern" doesn't appear).
- **SDT (autonomy):** an expert loses trust when the tools disagree. One source of truth matters more than more tools.

**Coach / data exporter (360×740, Practice).**
- **What worked:**
  - CSV export: one row per game with date, session, source, score, balls, strikes, spares and a frames string. The scores matched.
  - Backup JSON: `arsenal-pro-backup-v1.json` with events, prefs and sha256.
- **Friction:**
  - The Insights empty state contradicts the Card average (#7).
  - The CSV `balls` column holds the ball name. That's fine, but the header could read `ball`.

**Midnight / reload / offline (390×844, 23:20 CDT start).**
- **What worked:**
  - Everything held: crossing midnight, reload, offline reload with the chip shown, and the finished game.
  - The next evening, an un-ended night didn't block a fresh game 1.
- **Friction:** only #13.

## 4. Not done this round
- Whether the league lineup persists into week 2, and team-method handicap, caps and points (not modelled; see LEAGUE_SCORING.md).
- Glossary content review and help bubble text on each screen.
- Armory (shipped mid-run) and LaneTrax import accuracy feeding Find my strike line (no LaneTrax file used, so ±1.5 boards was assumed).
- Real-human timing. All seconds above are KLM model estimates.
