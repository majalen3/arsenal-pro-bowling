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
