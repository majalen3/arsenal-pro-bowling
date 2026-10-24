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
