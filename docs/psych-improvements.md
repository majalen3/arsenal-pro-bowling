# Psych improvements: rationale per UX decision

**Framework:** Self-Determination Theory (Ryan & Deci): **autonomy**, **competence** and **relatedness**. Plus habit loops (cue → routine → reward) and low cognitive load. This is design reasoning, not medical or clinical advice. Each entry lists the decision, the need it serves, and the copy rule.

## Bag Advisor (Tonight, first card)
- **Autonomy.**
  - The bowler picks the event, and every suggestion has Swap and "Open full bag builder".
  - Copy is non-controlling: "Start with: …", "What would change it", never "You must use".
  - Swaps are remembered as the bowler's choice, not overwritten.
- **Competence.**
  - Each ball shows *why* (level vs demand, benchmark) and the bowler's own evidence ("62% pocket over 4 sessions, n=48").
  - The confidence chip says how much to trust it (specs only / app estimate N of 21 games / your results).
  - Informational, never evaluative.
- **Cognitive load.** One question first, 1 tap to an answer, ≤1 warning per ball, and the plan as A→B→C.
- **Habit cue.** The event is remembered per type, so next league night opens already answered.

## Session results, Bowler Card, Nights (BC)
**SDT.** Competence: informational feedback only ("the 10 pin, 3 of 4 made tonight"), no praise or grades, lost pins framed as a fixable focus. Autonomy: measured numbers never overwrite typed ones without a confirm; the ball tag is the bowler's choice. Relatedness: a shareable card image, made on-device.
**Habit loop.** Cue: the import or the last frame. Routine: one sentence + one focus. Reward: seeing the number that moved. The focus line is the hand-off to the next Tonight (wired in the recap item).

**3-second beginner check** (can a beginner tell what to do in 3 s?):
- Session view: yes. The headline reads first, then "Next focus: …".
- Bowler Card (empty): yes. "Score a game on Tonight or import a LaneTrax report" plus one button.
- Bowler Card (populated): yes. Headline sentence, then a 2×3 grid of labelled numbers.
- Nights: yes. One row per night: date, games, average.

**Usability (U) / applicability (A) scoring per figure.** Keep = both; tap = U only; cut = neither.

| Screen · figure | U | A (decision it changes) | Placement |
|---|---|---|---|
| Session · headline change | ✓ | ✓ what changed | first |
| Session · next focus (worst leave, made/total) | ✓ | ✓ practice focus | first |
| Session · 2 supporting stats | ✓ | ✓ spare approach / line | first |
| Session · comparison table, strike/single/multi/opens, per-leave list | ✓ | partial | Details |
| Session · LaneTrax levels, breakpoint, entry angle, import notes | partial | partial | Details |
| Card · average | ✓ | ✓ handicap, league talk | figure 1 |
| Card · single-pin spares % | ✓ | ✓ spare approach | figure 2 |
| Card · first-ball average | ✓ | ✓ line/ball choice | figure 3 |
| Card · carry % | ✓ | ✓ ball vs line change | figure 4 (only with tags) |
| Card · strikes % | ✓ | ✓ pace | figure 5 |
| Card · speed · revs | ✓ | ✓ ball choice | figure 6 |
| Card · style, match, tilt/rotation/PAP | partial | ✓ ball layout | Details |
| Card · LaneTrax consistency levels | partial | partial | Details |
| Insights · static ratings "8.5/10" | ✗ | ✗ (uncited) | **cut** |

**Pruned along the way:** Insights' static assessment, removed. Sessions segments renamed to plain words ("Lane taps", "Notes").

## Sim-bug fixes: Tonight by moment, night recap, Insights last 10 (2026-10-24)

**Why (SDT).** *Competence:* during a game the screen answers only "what am I throwing, where do I stand, where do I look", and the next tap is the scoring card, so the bowler never has to search mid-approach. *Autonomy:* the recap offers a next focus that the bowler chooses to keep ("Make this my next focus"); nothing is assigned. Lost pins are framed as fixable ("k pins left on misses"), never as a grade. Copy is informational only, with no "good job".

**3-second beginner check:** game open on Tonight shows one line ("Big Bite · feet 17 · aim 10.7"), the scoring card and Weaker/Stronger. A first-timer can tell what to do next within 3 s. Everything else is behind "Bag, lanes and line details".

| Moment · screen · figure | U | A (decision it changes) | Placement |
|---|---|---|---|
| During game · ball · feet · aim | ✓ | ✓ where to stand and look | first line |
| During game · "Then: B if it hooks early → C later" | ✓ | ✓ ball change | under the line |
| During game · scoring card + spare hint (own hand, own strike stand) | ✓ | ✓ spare stand | second |
| During game · Weaker / Stronger | ✓ | ✓ ball change | third |
| During game · bag advisor, coach, why/specs/model, reads, setup | partial | partial | behind one tap |
| Between games · pick: name, feet · eyes, Find | ✓ | ✓ start line | pick card |
| Between games · level/demand, why-lines, laydown, breakpoint, holds | partial | partial | behind one tap (cut for beginners' first view) |
| Between games · 3-6-9 card, Plan A/B/C, Your release, Rule of 31 | partial | ✗ duplicate of other figures | **cut** from Tonight (3-6-9 lives in the spare hint; release on the Bowler Card; Rule of 31 in Targeting) |
| After session · series vs your average (B×N) | ✓ | ✓ league talk / handicap | recap head |
| After session · first-ball strikes s of f, pocket p of t tagged | ✓ | ✓ line/ball | recap |
| After session · spares made m of n, k pins left on misses | ✓ | ✓ spare practice | recap |
| After session · per game: score, balls, moves | partial | ✓ what changed in game 2/3 | session Details |
| After session · next focus (opt-in), carries to Tonight | ✓ | ✓ practice | recap, then Tonight top |
| Insights · last 10 games avg/high/low, strikes, spares, n | ✓ | ✓ trend check | first card |
| Insights · oil coverage, core map, bag builder | partial | partial | behind one tap |
| More · Your data counts | partial | ✗ | behind "What's saved"; the line shown is safety status in plain words |

## Scoring fix 1: pad within thumb reach, two-tap spare, Saved line (2026-10-24)
- **Competence.** The "Saved ✓ frame N" line gives immediate, informational feedback that the frame is on the phone. It never praises.
- **Low cognitive load.** A one-pin spare now takes 2 taps (pin, then "Pin left, then / spare"). The X button hides once pins are tapped, so the screen never offers two contradictory actions. The pad stays in the lower part of the screen while a game is open.
- **U/A (during game):**
  - Saved line: U = yes, one glance confirms the write. A = yes, the bowler acts on it by moving to the next frame.
  - Two-tap spare: U = yes. A = yes, it is the most common frame shape.
  - Nothing new was added outside the pad.

## Scoring fix 2: fix any frame, with undo (2026-10-24)
- **Autonomy and competence.** A mistyped frame is a fixable entry, not a failure. "Fix a frame", then the frame number, then the corrected throw: a strike takes 3 taps and a spare 3–4. One tap on "Undo fix" restores the old frame. Tapping a frame cell is a pointer shortcut to the same flow.
- **Quiet by default.** Fix mode replaces the pad in place and shows "Fixing frame N". Hints and the first-ball tag are hidden while fixing. Nothing was added to the scoring screen except one ghost button under Undo.
- **U/A (during game):**
  - Fix a frame: U = yes, it reaches any closed frame in ≤4 taps. A = yes, the bowler acts on it right away (the score is correct again).
  - Undo fix: U = yes. A = yes, it guards against a wrong correction.

## Scoring fix 3: "Throwing this ball" chip, spare-ball rule, games by ball/leave, games CSV (2026-10-24)
- **Informational, not evaluative.** The chip states a fact ("Ball Rattler Big Bite"). It shows "Spare ball …" only when the bowler has opted into the spare rule and is facing a leave. Nothing on it judges the bowler.
- **Quiet during the game.** The chip is one line next to Saved. The picker opens only on tap and takes the pad's place, so the screen offers one action at a time. "Back to scoring" closes it. The spare rule is off by default (an autonomy choice).
- **After session only.** The "By ball" (strikes x of n, spares) and "By leave" (made m of n) tables sit inside session Details, one tap deep. The recap head is unchanged.
- **Ownership (autonomy).** "Export games (CSV)" on Sessions gives the bowler their own games in a spreadsheet. Cells that start with = + - @ are prefixed so the file cannot run formulas (GAP c).
- **U/A:**
  - Chip, during game: U = yes, one glance. A = yes, the ball credit is correct for later stats.
  - By ball, after session: U = yes. A = yes, which ball carried.
  - By leave, after session: U = yes. A = yes, which spares to practise.
  - CSV, after session: U = yes. A = yes, league secretary / own records.
- **3-second beginner check:** a new bowler sees only the pad plus one chip. They can ignore the chip and still score.

## Scoring fix 4: league team, Baker, USBC handicap (2026-10-24)
- **Relatedness without comparison.** The bowler can score the whole team on one phone, so the night stays social. Teammates' frames are kept apart from the bowler's own stats. The board shows plain numbers (scratch, handicap, total) and never ranks bowlers or uses words like best or worst.
- **Low load during the game.** The only addition while bowling is the pill "Up: Ann · frame 3". The ball chip, first-ball tag and spare hints show only on the bowler's own frames, because they describe the bowler's own stand and hand. The team board sits behind one tap. Setup lives with the other lane settings and is never shown mid-frame.
- **Autonomy and transparency.** Basis and percent are the league's choice. The rule line says plainly that USBC's default is 100%. Absentee and vacancy figures name their rule (112).
- **U/A:**
  - "Up:" pill, during game: U = yes, one glance. A = yes, it tells the scorer whose ball to enter.
  - Team board, between games: U = yes, 4 columns. A = yes, a handicap total to check against the house sheet.
  - Setup, before the game: U = yes. A = yes, it is needed for the handicap.
- **3-second beginner check:** "Just me" is the default, so a solo bowler sees nothing new.

## GAP (a): storage protection, install offer, backup nudge (2026-10-24)
- **Competence through information.** WebKit can clear a site's data after 7 days without a visit (webkit.org/tracking-prevention), and a once-a-week bowler is right at that edge. The app now says this in one sentence, without alarm words, and offers the fix: install, or a backup file. More shows one chip, "Protected" or "Not protected", and a "Last backup file: N days ago" line. The why and the buttons sit behind "Keep it safe".
- **Never during scoring.** The install offer appears once ever, after the first finished game, below "Start game N". The backup nudge appears only between games, and only when there is no file and more than 3 games, or the file is more than 14 days old (team thresholds, GAP_REVIEW_1 §2). One nudge at a time: the install offer first, then the backup nudge.
- **Autonomy.** "Not now" / "Got it" ends the install offer for good, and "Remind me in 14 days" snoozes the backup nudge. Nothing is automatic except the browser's own silent persist() grant for installed apps.
- **U/A:**
  - Install offer, between games: U = yes, 1 sentence + 1–2 buttons. A = yes, installing exempts the data from the 7-day clean-up.
  - Backup nudge, between games: U = yes. A = yes, one tap saves the file.
  - More chip + last-backup line, after session: U = yes, one word / one line. A = yes, it tells the bowler whether to act.
- **3-second beginner check:** mid-game, nothing changed. After game 1 they see one short note under the next-game button, and can skip it.

## GAP (d): screen stays on during a game, Large / Extra large text (2026-10-24)
- **Zero taps, less friction.** The screen stays awake only while a game is open, so a frame no longer starts with Face ID. The lock is released at the final frame, when the bowler leaves Tonight, or after 10 idle minutes. Nothing appears on the scoring screen.
- **Autonomy.** More → Appearance has "Keep the screen on during a game: On / Off" (default On, per GAP_REVIEW_1 §5 #4, battery trade-off) and "Text size: Normal / Large / Extra large". Where the browser can't hold the screen on, the note says so and points to Auto-Lock. It never pretends.
- **Readable at arm's length.** The whole type scale is rem-based. The 13 fixed 10–11 px labels (frame strip, tiles, chips) became rem, so Large (112.5%) and XL (125%) scale the scoring pad, the frame strip and the recap together. Checked at 360 px with XL: no sideways scroll on 8 screens, the pad still fits, targets ≥44 px, axe 0 (WCAG 1.4.4).
- **U/A:**
  - Wake lock, during game: U = invisible. A = yes, it removes an unlock per frame.
  - Text size, before the game: U = yes, 3 choices. A = yes, for alley lighting and older eyes.
- **3-second beginner check:** nothing new on Tonight. The two settings live in More → Appearance.

## Loop 1 re-measure (2026-10-24)
- This item measures the app and changes no UI. The tap and reach gains above support **competence**: fewer taps, the pad stays under the thumb, and a mistake can be fixed. The one remaining friction point (a scroll before frame 1) is logged as open rather than patched with something extra.

## Aim Box (2026-10-24)
- **SDT:**
  - **Autonomy:** it's off by default, the bowler chooses to turn it on, and there are three presets plus Custom.
  - **Competence:** one concrete visual target, and "Through zone / Outside zone" feedback in the same tones as the pocket read. The feedback is informational, never praise or blame.
  - **Relatedness:** the box is named for its source (Mark Baker), the coach-style reference a league bowler will recognise.
- **U/A:**
  - **Usability:** one chip ("Overlays"), then one switch; the default preset needs no setup. The 3-second beginner check: a gold dashed box on the lane, and the pill says whether the line goes through it.
  - **Applicability:** between games / practice planning only. It is never shown during active scoring.
  - Tooltip text as specified.

## Armory (2026-10-24)
- **SDT:**
  - **Relatedness:** the team line "Urbanek Honey Badgers" sits on top, and the screen reads as the bowler's own armory, not a store shelf. No name is shown unless one is on file; none is made up.
  - **Competence:** marks ("First game logged", "10+ games", "212 best", "300 game") appear only after games logged frame by frame with that ball. They are facts from the bowler's own log, never praise or ratings, and never compared with anyone else.
  - **Autonomy:** the bowler sets the shelves (In bag / Benched / Pro shop / Retired in Bag). Retiring a ball moves it to the Hall of Fame with its record intact, so letting go of a ball isn't a loss.
- **U/A:**
  - **Usability:** one takeaway, what's in the bag, shown on a lit shelf with gold nameplates (name, role, RG and Diff from the catalog). Bench and Hall of Fame are folded behind a tap. An empty pedestal is the Add ball button. Targets are ≥44 px, 360 px with no sideways scroll, axe 0.
  - **Applicability:** used between sessions and when packing. It isn't on the scoring screen, and the tab stays "Arsenal" (no new tab).
- **3-second beginner check:** "these are my balls; the gold-ringed one is on the lane."

## Help bubbles + Glossary (2026-10-24)
- **SDT:**
  - **Autonomy:** off by default and switched on by the bowler. Nothing explains itself unless asked, and the glossary is a place to browse, not a lesson.
  - **Competence:** each bubble is one or two plain sentences (the v1 text), with "Glossary ›" for depth and sources the bowler can check (F/S labels). It's informational and never grades the bowler.
  - **Relatedness:** sources are the ones bowlers already trust (USBC, coaches, r/Bowling threads), named in the entry.
- **U/A:**
  - **Usability:** one "?" per card at most, and a 44 px round target in the card header. A tap opens a sheet with one takeaway, and details are one more tap away. The glossary has search plus a count ("2 of 106 terms").
  - **Applicability:** placed only where a beginner gets stuck while choosing or planning: the lane drawing, targeting, ball care, the spare ball, the cover on add-ball. Never on the scoring pad.
- **3-second beginner check:** "the ? tells me what this card's word means."

## M1 Center / lane-pair memory (2026-10-24)
- **SDT:**
  - **Competence:** "Last time at Test Lanes: Oct 17 · lanes 15-16 · 2026 PBA Badger 52 ft · 2 games, 185 avg · mostly Phaze II". These are the bowler's own numbers with the date first, so the bowler starts from what they already know about the house. It isn't a verdict.
  - **Autonomy:** the bowler chooses whether to copy last time's setup ("Use last setup"), and the pick is worked out again from it. The note for next time is the bowler's own words, written from the session page.
  - **Relatedness:** the memory is tied to the bowler's own center and pair, the place they bowl with their league.
- **U/A:**
  - **Usability:** one card with one line and at most one button. Older visits are behind "All N visits", and the lane pair is optional and only asked once a center is set. Your centers are offered as you type. Targets are ≥44 px, 360 px with no overflow, axe 0.
  - **Applicability:** shown only before the first ball of a night at a center visited before. It's gone once a ball is logged (nothing new during scoring). Practice nights are listed but never averaged (USBC averages are certified play).
- **3-second beginner check:** "last time here I bowled on 15-16 on Badger, and I can copy that."

## M2 Own-pattern entry (Sim2 #9) (2026-10-24)
- **SDT:**
  - **Autonomy:** the bowler's own name for the shot ("Fridays house") is kept as typed. There's no "pick from the list" dead end, and length, volume and ratio are optional.
  - **Competence:** the chip says exactly what the pick runs on: "your entry · length not entered, 38 ft assumed", or "your entry · 50 ft" once entered. A known length visibly changes the demand.
  - **Relatedness:** a league's own house shot counts as much as a Kegel pattern, and it's remembered per center through "Use last setup".
- **U/A:**
  - **Usability:** one field (the same one as before). Details are behind "Add details". Targets are ≥44 px, 360 px with no overflow, axe 0.
  - **Applicability:** set before or between games in Lanes tonight. Nothing changes on the scoring pad.
- **3-second beginner check:** "I typed our house shot and it kept it, and it says it's guessing 38 ft."

## M3 Spare drills + one process goal (2026-10-24)
- **SDT:**
  - **Competence:** the drill uses the bowler's own most-missed leaves ("10 pin · missed 4 of 10"). Each try is one tap (Made / Missed), and the totals carry their n ("1 of 2 made"). The goal is a process goal (spares made), never a score, and it's read back with its n: "10 of 10 single-pin spares made (100%) · goal 7 of 10 (70%)." That's informational, never "good job".
  - **Autonomy:** the goal is optional, and the bowler chooses its kind and number. The drill is behind one tap and only on practice nights.
  - **Relatedness:** spare shooting is what league teammates talk about. The goal matches the USBC spare-system focus (3-6-9, already shown on Tonight) without ranking anyone.
- **U/A:**
  - **Usability:** one collapsed card, with each leave as a row of 2 buttons (44 px). The goal is one segmented control plus one select inside Lanes tonight, which is already behind a tap while a game is open. The result is one line on the recap, and drill tries are listed in session Details. 360 px with no overflow, axe 0.
  - **Applicability:** the drill shows only when the night is set to Practice and no game is open, so nothing is added to the scoring pad. Drill tries never become a game, a score or an average.
- **3-second beginner check:** "these are the spares I miss; I tap Made or Missed."

## Help bubbles everywhere + Bowling Guide + explicit handedness (2026-10-24)
- **SDT:**
  - **Competence:** each "?" explains exactly the number beside it in 1–2 plain sentences, and the Guide is one tap further. Learning happens where the question comes up.
  - **Autonomy:** Help stays off by default. A top-bar "?" turns it on and off on any screen. The hand is the bowler's answer, never a guess, and "Not now" is respected.
  - **Relatedness:** the bubbles use league words (house shot, breakpoint, spare system) with sources, and rank no one.
- **U/A:**
  - **Usability:** the gold "?" has a 44 px tap area, opens a bottom sheet and does no navigation until "Learn more". The hand question is inline, never a modal, and never shown during an open game.
  - **Applicability:** for right-handers nothing changes except one quiet "Right-handed · change" line. Left-handers no longer depend on a hidden default.
- **3-second beginner check:**
  - "Tap ? to see what this number means."
  - "Tonight says Right-handed; I can change it."

## One Status per ball + "Why not this ball?" (D / P1.3, 2026-10-24)
- **SDT:**
  - **Competence:** each ball left out gets one plain reason ("At the pro shop", "Weaker than tonight needs") from the same source on every screen, so the bowler learns how the builder decides instead of guessing.
  - **Autonomy:** the bowler sets where a ball is. 📌 Always bring overrides the builder, and Swap can still bring an At home ball, marked "grab from home". Nothing is hidden or ranked.
  - **Relatedness:** the words match how bowlers talk ("it's at the pro shop", "it's at home"), and nothing is judged.
- **U/A:**
  - **Usability:** one 4-way control on the ball page and a 2-tap sheet in Bag. The why-not line sits under the ball. Every target is 44 px, with no overflow at 360 and axe 0.
  - **Applicability:** applies to every bowler with more than one ball. Nothing is added during scoring, and the ball chip just stops offering balls that aren't in the bag.
- **3-second beginner check:** "My Ice Storm is at the pro shop, so it's not in tonight's bag, and the app says so."

## One bag, "Bring: N", 3-step builder (P1.1 / P1.2 / P1.4, 2026-10-24)
- **SDT:**
  - **Competence:** each ball has a job in bowler words ("If it hooks early") and one line of why. The ladder and the 10 checks are there for learning, behind a tap. Every ball left out says why, so the bowler can predict the builder.
  - **Autonomy:** the bowler picks how many to bring, swaps any role, pins balls with 📌 Always bring and can bring any left-out ball. The builder suggests; it never overrides a choice.
  - **Relatedness:** "Bring 3" is how league bowlers talk about their bag; the same bag shows on Tonight, in Bag and on the ball chip, so there is one shared picture.
- **U/A:**
  - **Usability:** one size control instead of three, one sticky "Pack these N" button always inside 360×740, Swap in 2 taps, 44 px targets, no horizontal scroll, axe 0.
  - **Applicability:** applies to anyone with 2+ balls; a one-ball bowler sees one row and "Bring more from Left out". Nothing changes during scoring.
- **3-second beginner check:** "Bring 3: start with Big Bite, Hy-Road if it hooks early, Ice Storm for spares. Pack."
