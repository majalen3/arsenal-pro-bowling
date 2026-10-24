# Product loop — iteration 1 (2026-10-24)

Prompt: `docs/TEAM_PROMPT_PRODUCT_LOOP.md`. Build reviewed: **live** GitHub Pages at commit `6a9b2e7` (SW v18). The bag advisor and Bowler Card weren't live yet: on Tonight, "Where are you headed" and "Bowler card" were not found.

**Method.** Playwright drove the live site at **390×844** and **360×740** (mobile, touch, DPR 2), with fresh throwaway local data. All requests to `arsenal-pro-api.onrender.com` were aborted, so nothing was written to production. Scripts and raw results: `/workspace/ux/loop1/journey.py`, `probe.py`, `result-390x844.json`, `result-360x740.json`. Screenshots: `/workspace/ux-shots/loop1/`. Test game: X · 9/ · 7-10 split then missed (8-) · X · switch to the Stronger ball · 4-pin spare, corrected to X · reload mid-game · X X X X · 10th: X, X by mistake → undo → 9 / → **245** (checked by hand).

**How time is measured.** Seconds are **Keystroke-Level-Model estimates**, not timed humans:
- tap on a seen target P+K = 1.3 s;
- mental prep M = 1.35 s, once per entry moment;
- scroll = 1.0 s (same as `UX_AUDIT.md`).

App latency was measured: 50–73 ms from click to redraw, headless and unthrottled.

**Abbreviations used in the tables:**
- **doc y** = position measured from the top of the page.
- **cy** = vertical centre of an element on screen.
- **Thumb zone** = the bottom third of the viewport (cy > 563 px at 844 px tall).
- The visible area ends at **780 px** at 390×844, because the tab bar takes the bottom 64 px.

## Key measurements

| Measure | 390×844 | 360×740 |
|---|---|---|
| Tonight page height | 2,686 px (3.4 screens of visible area) | 2,743 px |
| Quick log card position on open | doc y 700 (pick card 580 px tall sits above it) | header at 709 px vs 676 px visible: fully below the fold |
| X Strike button | doc y **990**, 158×44, left column. Needs 1 scroll after every open or reload | below the fold |
| After a reload mid-game | scrollY = 0, Strike off-screen, game state exact ("Frame 6 · ball 1") | same |
| Pins | 44×44 circles, 96 px apart horizontally, **48 px row pitch = 4 px gap**. Back row (7-8-9-10) cy ≈ 450–490 at the usual scroll, **outside the thumb zone** | same size |
| Frame strip cells | **31×36 px, 11 px marks and running totals** | same |
| Targets < 44 px on Tonight | 0 (many are exactly 44, none at 48) | 0 |
| axe color-contrast / target-size, Tonight | 0 / 0 (Alley dark and Light) | 0 / 0 |
| Taps: strike frame | **1** (≈ 2.65 s) | 1 |
| Taps: one-pin spare frame (pin → Log 1 standing → / Spare) | **3** (≈ 3.95 s first-ball entry + 2.65 s second = **6.6 s/frame**) | 3 |
| Taps: open frame (7-10 → Log → Missed all) | **4** (≈ 5.25 s + 2.65 s = **7.9 s/frame**) | 4 |
| Weighted average, assuming a 40% strike / 40% spare / 20% open mix (A) | **≈ 5.3 s per frame**, +1.0 s scroll each time the app is reopened | same |
| Fix the last ball | 2 undos + re-enter = **3 taps**. Undo sits at the bottom of the card: 1 scroll; the page jumped 400 px | same |
| Fix an older frame (frame 2 while on frame 6) | no frame edit, so **6 undos + about 9 re-entry taps ≈ 15 taps**. Frame cells aren't tappable | same |
| 10th-frame mistake (X X → X 9 /) | **4 taps** (undo, pin 10, Log, /). Score correct | same |
| Ball switch | 1 tap on "Stronger …" in the pick card, cy 304 (top half). It changes Tonight's **recommendation**; it isn't a "throwing this now" control | same |
| Next game | 1 tap "Start game 2". Game 1 then vanishes from Tonight | same |
| Offline | reload works (SW), the strike logs offline. **No offline/sync indicator on Tonight**; More says "Offline (saved on this phone)" | same |
| Multi-player / team / Baker | **none** | none |
| Spare-conversion or by-ball stats | **none anywhere**: the word "conver" appears on no screen (Tonight, Sessions, Arsenal, Insights, More, Bag, Import) | none |

## 1. Journey evaluation with specific failure points

### Phase A — Before leaving home
**What exists today:**
- Tonight ranks a ball from your own bag with why-lines and provenance chips.
- Bag builder: 2-tap swap, Fill bag, 10 checks and a pack list.
- Arsenal Insights: coverage by oil.

**Failure points:**
- **No recent stats anywhere.** After a full logged game, Sessions shows "No saved lines yet" (`390x844-11-sessions-after.png`). More only says "1 games". There's no average, series, strike % or spare %.
- Insights "Assessment" is static prose ("~15 mph, ~220 rpm…"). It isn't computed from your games.
- "Which balls do I bring" means hopping between the pick card, the Plan card (doc y 1991) and `#/bag`. The bag advisor that answers this in 2 taps is in flight, not live.
- First launch after Skip lands on **Lane**, not Tonight.

| Criterion | Score | Evidence |
|---|---|---|
| One-handed / thumb zone | 6 | Tabs and bag actions are 44 px. The pick card sits in the top half. |
| Speed / friction | 5 | Bag swap is 2 taps, but there's no stats glance, so it takes 3+ screens. |
| Scanability / load | 5 | Tonight is 2,686 px with 8 cards. The pick card alone is 580 px with 4–6 chips. |
| Data trust | 7 | Every number has a source chip. Assumed values are labelled. |
| Likelihood to open | 5 | Strong for gear nerds, nothing for "how am I bowling". |

### Phase B — Arriving and settling in
**What exists today:**
- Solo needs zero setup. The session is created automatically per day, and "Load starter arsenal" is 1 tap.

**Failure points:**
- **No multi-player, team or Baker.** Body-text search for Player, Add bowler, Baker, Solo and Start session all returned false.
- No session type (league / practice / tournament) and no lane-pair field. Practice and league therefore mix in one daily session, against demand #9 ("keep practice out of averages", FEATURE_DEMAND_RESEARCH §1).
- The "Lanes tonight" setup (pattern, center, surface, condition, bag, game) sits at doc y 1374, **below** the quick log. That's a sensible order during play, but it buries setup on arrival.

| Criterion | Score | Evidence |
|---|---|---|
| One-handed | 6 | Setup controls are segmented and 44 px, but mid-page. |
| Speed | 5 | Solo: 0 taps. Anyone else: impossible. |
| Scanability | 5 | Setup needs about 2 scrolls to reach. |
| Data trust | 6 | It's one session per date, so two outings in one day merge. |
| Likelihood | 4 | League bowlers scoring a pair can't use it. |

### Phase C — During bowling
**What works:**
- A strike is **1 tap**, and every tap is persisted before the redraw.
- A reload mid-game restored "Frame 6 · ball 1" exactly. Offline logging worked.
- 10th-frame scoring is correct.
- The 3-6-9 hint and split flag appear automatically.

**Failure points:**
1. **No anchored scoring surface.** The Strike button is at doc y 990, below the 780 px visible area, on every open. After a reload, scrollY is 0 and the quick log header sits at 672 px (390) or 709 px (360). See `390x844-08-after-reload.png`. Every pocket-to-hand cycle starts with a scroll and a search.
2. **Spare entry is 3 taps (≈ 6.6 s per frame).** "Log N standing" is a confirm step between selecting pins and "/". An open frame is 4–5 taps (≈ 7.9 s). Both miss the 1–3 s target. The first-ball entry alone is ≈ 3.95 s for a single-pin leave.
3. **Precision taps.** Pins are exactly 44 px with a **4 px vertical gap**, and the back row is outside the thumb zone. A 7-10 or a 4-7-10 needs reach to the top half.
4. **Glanceability.** Frame marks and running totals are **11 px** in 31×36 px cells (`390x844-05-quicklog-view.png`). At arm's length under alley lighting that's below comfortable reading size. The "Frame 6 · ball 1" pill is the only large status.
5. **Mid-game correction is last-ball-only.** Fixing frame 2 from frame 6 needs about 15 taps. Undo is at the bottom of the card, needed a scroll, and the page jumped 400 px.
6. **Ball switch is the wrong control.** "Weaker/Stronger" changes the *recommendation*. Only adjacent-strength balls can be reached, it sits at cy 304, and there's no "I'm throwing X" chip. **Every shot, including spare shots, is tagged with the current pick's ball id** (`tonight.js` quickLog `ballId: cur.id`), so spares thrown with a spare ball are mis-attributed.
7. **No save-state signal on Tonight.** Offline, nothing says "saved on phone". That only appears on More.

| Criterion | Score | Evidence |
|---|---|---|
| One-handed | 4 | Strike/Spare start out of view. The back pin row and ball switch are in the top half. |
| Speed | 5 | 1 tap per strike (≈ 2.65 s), but ≈ 6.6 s per spare and ≈ 7.9 s per open frame. Average ≈ 5.3 s plus a scroll on reopen. |
| Scanability | 5 | 11 px frame strip. The pick card, read buttons and trigger box compete above and below. |
| Data trust | 7 | Each tap is persisted, reload is exact, offline works, the 10th is correct. But there's no frame edit and spare shots get the wrong ball. |
| Likelihood | 5 | It works for a solo practice game. It's too slow to keep up across a league night. |

### Phase D — Between games
**What works:** "Start game 2" is 1 tap and appears at the final score.

**Failure points:**
- **Game 1 disappears** (`390x844-10-game2.png`). There's no series total, no game-1 recap, and getting it back means the Game control at doc y ≈ 1374.
- No "what to change for game 2" prompt that ties the read buttons and triggers to the game just bowled.

| Criterion | Score | Evidence |
|---|---|---|
| One-handed | 5 | The Start button is at cy 252 after the final. |
| Speed | 7 | 1 tap. |
| Scanability | 4 | No series or recap. |
| Data trust | 5 | The data exists but is hidden, which feels like loss (FEATURE_DEMAND_RESEARCH §1 #2: a LaneTalk review describes games erased by starting a new game). |
| Likelihood | 5 | |

### Phase E — After bowling
**Failure points:**
- **No session review at all.** Sessions → Shots shows "No shots logged yet" after 22 logged balls, because it reads only the Lane miss log. That's two different "shots" concepts.
- There are no trends, no spare conversion by leave, no ball performance and no game list.
- No game CSV export in the UI. `toCSV` exists in `js/data/csv.js`, but More only offers a JSON "Download backup". That's demand #1 (FEATURE_DEMAND_RESEARCH §1).
- Sync status is only on More.

| Criterion | Score | Evidence |
|---|---|---|
| One-handed | 5 | |
| Speed | 2 | Can't get the answers. |
| Scanability | 2 | Nothing to scan. |
| Data trust | 4 | Data is stored, but invisible and partly mis-attributed (the spare ball). |
| Likelihood | 2 | No reason to come back after the night. |

### Phase F — League-night stress case
**Result: blocked.**
- 3–4 bowlers on one phone isn't possible. One bowler and one session per day.
- The 10th-frame fix itself works (4 taps). But for anyone except the owner it would land in the owner's game.
- "Which ball converted the most spares" has **no UI**. Even computed from the data, it would credit the strike ball.

| Criterion | Score | Evidence |
|---|---|---|
| One-handed | 2 | Only a single bowler, with the same scroll problem. |
| Speed | 1 | Impossible for more than one bowler. |
| Scanability | 2 | |
| Data trust | 3 | Other bowlers would pollute the owner's stats. Spare attribution is wrong. |
| Likelihood | 1 | |

### Per-phase scores (1–10)

| Phase | One-handed | Speed | Scanability | Trust | Open/keep |
|---|---|---|---|---|---|
| A Before home | 6 | 5 | 5 | 7 | 5 |
| B Arriving | 6 | 5 | 5 | 6 | 4 |
| C During bowling | 4 | 5 | 5 | 7 | 5 |
| D Between games | 5 | 7 | 4 | 5 | 5 |
| E After bowling | 5 | 2 | 2 | 4 | 2 |
| F League stress | 2 | 1 | 2 | 3 | 1 |

### How each role reads it
- **Mobile UX:** the scoring controls live in a scrolling card, not a dock. Pins sit at the 44 px floor with 4 px gaps, and the frame strip is 11 px.
- **Bowling domain:**
  - Strengths: correct 10th-frame scoring, split flag, and 3-6-9 per leave, which nobody else does (FEATURE_DEMAND_RESEARCH §2 "Gaps").
  - Gaps: the spare ball isn't modelled, and there's no league or Baker.
- **Behavioral:** the expensive moments come first (scroll, search, read a 580 px pick card), and there's no payoff after the game. Nothing builds a habit loop: no series, no "you converted 8/10 single pins".
- **QA:**
  - Event-log persistence passed every test: reload, offline and the 10th.
  - Integrity defects: spare shots get the pick's ball id; one session per date merges two outings; quick-log games are absent from Sessions.
- **Strategy:**
  - LaneTalk paywalls pin-leave and spare stats, and history (FEATURE_DEMAND_RESEARCH §1 #1 and #3, §2).
  - LaneTrax says scoring "will never be a feature" (§1 #2).
  - Baker and team scoring are asked for (§1 #8).
  - Arsenal Pro already *stores* the data that would win here; it just doesn't show it.

## 2. Top 7 highest-impact weaknesses

| # | Weakness | Concrete example | Why it matters | Severity |
|---|---|---|---|---|
| W1 | **No multi-bowler, league or Baker mode** | No "Add bowler" anywhere. One `tonight-YYYY-MM-DD` session per day. | The stress case can't be done at all. Principle 6. Demand #8. | **Blocker** |
| W2 | **No post-session or history view of scored games** | After a 245 game, Sessions is empty, Shots says "No shots logged yet", and game 1 vanishes once game 2 starts. | Principle 4 (insights teach), retention, and perceived data loss (the LaneTalk "erased all my scores" pain, §1 #2). | **Blocker** |
| W3 | **Scoring controls aren't anchored in the thumb zone** | Strike at doc y 990 vs 780 visible. scrollY 0 after a reload. At 360×740 the whole card is below the fold. | Every frame starts with a scroll and a search. Principles 1 and 7. | **High** |
| W4 | **Spare and open entry is too slow** | 3 taps ≈ 6.6 s for a one-pin spare; 4 taps ≈ 7.9 s for an open; average ≈ 5.3 s vs a 1–3 s target. | It breaks rhythm on 60% of frames (A: mix). | **High** |
| W5 | **Ball attribution is wrong, and there's no in-game ball chip** | `ballId: cur.id` on every roll, so spares thrown with the spare ball are credited to the strike ball. Switching means "Weaker/Stronger" at cy 304. | Makes "which ball converts spares" and per-ball stats untrustworthy (demand #4). | **High** |
| W6 | **Corrections are last-ball-only** | Fixing frame 2 from frame 6 takes ≈ 15 taps. Undo is at the card bottom with a 400 px jump. | Principle 3. Fear of mistakes stops people logging. | **High** |
| W7 | **Glanceability and save state** | 11 px frame marks and totals. No offline or "saved" signal on Tonight (only on More). | Principles 2 and 3 in bright or dark alley light. | **Medium** |

Accessibility notes:
- Contrast passes axe in both themes.
- Targets meet 44 px, but none reach 48, and pins have 4 px gaps. That's motor-load risk while standing.
- 11 px text fails the "readable at a glance" bar even though axe doesn't flag it.

## 3. Concrete improvements (with trade-offs)

Items marked **⚑ adds a step / cognitive load during scoring** are flagged as the prompt requires.

1. **Scoring dock** (fixes W3, W7). Tapping the quick log or a "Score" FAB opens a full-height scoring view:
   - The frame strip is on top, with 18 px marks and a 22 px running total.
   - The pin rack goes in the lower-middle with 52 px pins and ≥ 8 px gaps. At 390 px wide, four 52 px pins plus three 8 px gaps fit easily.
   - X / ⁄ / Miss / Undo sit as a fixed row in the bottom 120 px, above the tab bar.
   - It reopens straight to the scoring view when a game is in progress (persist `ap_prefs.lastScreen`).
   - Show "Saved ✓ on phone" for 1 s after each tap, plus a persistent "Offline · N not synced" pill.
   - *Trade-off:* the pick card is hidden while scoring. Show a one-line ball chip and a "Coach" chevron (progressive disclosure). Removes 1 scroll per reopen, adds nothing.
2. **Two-tap spares** (W4). When pins are selected, "/ Spare" logs the first-ball leave **and** the conversion in one tap. "Leave open" does the same for a missed spare. One-pin spare: 3 → **2 taps (≈ 3.95 s)**. A strike stays 1 tap.
   - *Trade-off:* one tap writes two `shot.logged` events, so Undo must work at frame level ("Undo frame 5") with a ball-level option in the edit sheet.
   - Optional **count mode** in More (0–9 buttons, no pins) for casual users, for about 2 taps per frame. *Trade-off:* no leave data, so no spare-by-leave stats. Label that.
3. **Tap any frame to edit** (W6). Frame cells become 44×48 buttons. That opens a sheet with that frame's balls as pin racks, a Save button, and an append-only `shot.edited` / void pair so history is kept. A 10th-frame-aware validator rejects impossible frames. Fixing frame 2 from frame 6: ≈ 15 → **3–4 taps**.
   - *Trade-off:* small cells invite mis-taps. Make the sheet open on tap and the save explicit, so a mis-tap costs one back gesture. No added steps in the normal flow.
4. **Ball chip, plus a spare-ball rule** (W5). A sticky "Throwing: Big Bite ▾" chip in the dock: one tap shows your bag as 48 px chips. On first use, a one-time setting asks "Spare ball for: all spares / single pins only / never". Second-ball shots then auto-tag the bag's spare ball.
   - Keep "Weaker/Stronger" as recommendation only, and rename it "Suggest weaker/stronger".
   - *Trade-off:* ⚑ the one-time setting is 1 extra decision, made before the first spare and never again. A wrong default is fixable per frame in the edit sheet.
5. **Night recap and Games history** (W2). After the final frame, show a recap card: game score, series so far, and 3 teaching lines computed from the event log, e.g. "Single pins 4/5. 10-pin missed twice: stand 29, same target (USBC 3-6-9)".
   - Sessions gets a **Games** tab (night → games → frames) with strike %, single- vs multi-pin spare %, and a **Spares by ball** table, which answers the league question directly.
   - Add **Export games CSV** on More, using the existing `toCSV` (demand #1).
   - Rename the old Sessions "Shots" tab to "Lane misses".
   - *Trade-off:* none during scoring. Everything sits after the game or on another tab. Offline-computed.
6. **League mode as its own flow** (W1, Principle 6). "Start league night" leads to:
   - a lineup of 3–5 names, reused weekly, offline;
   - optionally the lane pair;
   - auto-advance to the next bowler when a frame completes;
   - a team total row;
   - **Baker** as a mode that rotates frames across the lineup.
   - Only the owner's frames feed personal stats, as asked for in a LaneTrax review (FEATURE_DEMAND_RESEARCH §1 #8, hitdrumhard). Share the lineup by code or file, with no accounts (ROADMAP_NEXT "no auth for core data").
   - *Trade-off:* ⚑ +0 taps per frame when auto-advance is right; +1 tap ("Bowler ▾") when it's wrong. That's the most complex build here, so it comes after items 1–5.
7. **Session type and multiple sessions per day** (Phase B). In the dock header: "League · Practice · Tournament", defaulting to the last used. Session ids become `night-<date>-<n>`, so two outings in one day don't merge. Practice is excluded from averages by default.
   - *Trade-off:* one segmented control, set once per night, outside active scoring.
8. **Photo backup of the scoring monitor**, offline. A camera button on the recap card attaches a photo of the house monitor to the game as evidence, stored locally in IndexedDB and included in backups.
   - OCR auto-entry is **later**, and only if an accuracy test on real monitor photos passes. Never use any LaneTalk or center API.
   - *Trade-off:* storage size. Downscale to about 200 KB.

## 4. Prioritized next changes (ranked by impact on the core scoring loop and retention)

1. **Scoring dock with two-tap spares and a save-state pill** (improvements 1 + 2). Targets:
   - strike 1 tap, one-pin spare 2 taps, average ≤ 3.5 s per frame (KLM);
   - 0 scrolls on reopen;
   - pins ≥ 48 px with ≥ 8 px gaps;
   - frame marks ≥ 18 px.
   - e2e: reload mid-frame → dock reopens on the same ball.
2. **Edit any frame + frame-level undo** (3). Target: any past frame fixed in ≤ 4 taps, 10th-frame validator, append-only history. e2e: fix frame 2 from frame 7 and recheck the total.
3. **Correct ball attribution + Night recap + Games tab with Spares by ball + CSV export** (4 + 5). Targets: second-ball shots tagged per the spare-ball rule; "which ball converted the most spares" answered in ≤ 2 taps from Sessions; recap lines computed, never invented.
4. **League mode** (6 + 7): lineup, auto-advance, Baker, owner-only stats, session type. Target: 4 bowlers × 10 frames scored on one phone, with a 10th-frame mistake on bowler 3 fixed in ≤ 4 taps and no leak into the owner's stats.
5. **Before-home glance on Tonight**: last night's series, single-pin spare %, and the bag advisor (already in flight) above the pick card. Open Tonight by default after onboarding.

## 5. Previous issues: resolved or open

This is the first run of this loop, so it's compared against `docs/UX_AUDIT.md` (baseline audit, build `9189745`):

| UX_AUDIT item | Status now | Evidence |
|---|---|---|
| H1 readout below the fold; sync status 11 px grey | **Lane: resolved.** Entry/Angle/Break-pt tiles and the coach line are above the fold (`390x844-15-lane.png`). **Sync: still open on Tonight.** Only More shows status. | screenshots / probe |
| H2 board numbers illegible; "Aim °" jargon | **Partly resolved.** Feet → Target boards are shown as numbers. Lane-canvas board labels are still tiny and not checked in this pass. | `390x844-15-lane.png` |
| H3 no undo or back routing | **Resolved for Lane** (miss Undo, hash router + back). **Open for scoring:** last ball only (W6). | DECISIONS 3, router.js |
| H4 inconsistent controls | **Resolved.** Shared segmented, chip and button styles. | screenshots |
| H5 delete without confirm; restore overwrites | **Resolved.** Confirm sheet + Undo toast on lines. Restore rebuilds only empty keys (DECISIONS 16). | sessions.js |
| H6 ball strip shows 2 of 22 | **Resolved.** 6 quick balls + "All 22". | `390x844-15-lane.png` |
| H7 no one-tap miss; save needs typing; compare is slow | **Resolved.** Miss buttons, back-to-saved chip, compare table (cycle 4). | UX_CYCLE_LOG |
| H8 Arsenal text walls | **Resolved.** Moved to Insights. New concern: **Tonight** is now the long page (2,686 px, 8 cards). | measured |
| H9 offline/API errors are tiny strings | **Partly resolved.** More shows "Offline (saved on this phone)" and "N waiting to sync". Not on Tonight. | probe |
| H10 no onboarding | **Resolved.** 3-step skippable welcome. It lands on Lane, not Tonight (open, minor). | journey |
| No light theme / PNG icons / deep links | **Resolved.** Alley dark / Light / System; icons/; hash routes. | More, router |
| 44 px targets (cycle 2.0) | **Resolved at 44 px.** Not at 48 (prompt ≈ 44–48). | measured |

---

## Previous iteration summary (paste into iteration 2)

```
Iteration 1 (2026-10-24, live build 6a9b2e7, SW v18; Playwright 390x844 + 360x740, API blocked).
Scores (one-handed/speed/scan/trust/keep, 1-10): Before home 6/5/5/7/5 · Arriving 6/5/5/6/4 · During 4/5/5/7/5 · Between games 5/7/4/5/5 · After 5/2/2/4/2 · League stress 2/1/2/3/1.
Measured: strike 1 tap (~2.65 s KLM); one-pin spare 3 taps (~6.6 s); open 4 taps (~7.9 s); weighted ~5.3 s/frame + 1 scroll per reopen.
X Strike at doc y 990 vs 780 px visible (390x844); after reload scrollY=0; at 360x740 the quick log is fully below the fold.
Pins 44x44 with 4 px row gap, back row outside the thumb zone; frame strip 31x36 px with 11 px text. axe contrast 0 in both themes; 0 targets < 44 px.
Fix last ball 3 taps; fix an older frame ~15 taps (no frame edit); 10th-frame fix 4 taps; scoring correct (245 test).
Reload/offline: state exact, offline logging works, no sync indicator on Tonight.
Open weaknesses:
- W1 Blocker: no multi-bowler/league/Baker.
- W2 Blocker: no game history/recap; Sessions empty after a game; game 1 hidden after game 2.
- W3 High: scoring not anchored in the thumb zone.
- W4 High: spare/open entry too slow.
- W5 High: every roll tagged with the pick's ball id (spare ball mis-attributed); no in-game ball chip.
- W6 High: last-ball-only undo.
- W7 Medium: 11 px frame strip; no save/offline pill on Tonight.
Planned next: (1) scoring dock + 2-tap spares + save pill; (2) edit any frame + frame-level undo; (3) ball chip + spare-ball rule + night recap + Games tab with Spares by ball + CSV export; (4) league mode (lineup, auto-advance, Baker, owner-only stats, session type); (5) before-home glance + Tonight as the default screen.
In flight at the time: bag advisor at the head of Tonight, Bowler Card + import results, targeting polish.
Re-measure next time: taps and KLM s/frame, scrolls on reopen, pin size/gap, frame-strip font size, older-frame fix taps, league stress end-to-end, "which ball converted most spares" taps.
```
