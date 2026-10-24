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
