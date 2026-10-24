# Team prompt — Targeting + "Find my strike line"

**Owner ask:** "I need to be able to adjust my feet and aim point and see if my ball hits the break box and pocket. We need it to be useful and helpful and see how it works." Added later: "I click a button, it says stand here, aim here, and a percentage of strike chance."

**Route:** `#/target` (Lane tab). Linked from Tonight ("Find my strike line ›" and "Check feet and eyes on the lane ›") and from the Lane app bar.

**Hard rules**
- `simulatePath` and `analyze` are unchanged; `tests/engine_equivalence.mjs` must report 0 mismatches.
- `js/lane.js` changes are renderer-only (state getter, overlay hook, optional Baker box).
- Never invent specs, stats or thresholds. A value without a source is labelled **assumed** or **model estimate**.
- Use Honey Badgers tokens only (no new hex values). Layout is 360 px first with 44 px targets. CSP `script-src 'self'`: no build step, inline scripts or eval.
- Coach voice: ≤2 sentences, numbers first ("Through the box…", "High by…").

## 1. What the screen does
1. **Controls.**
   - Feet, Eyes, Drift, Ball-from-foot offset, box board and box distance.
   - The ◀ ▶ buttons sit in a sticky dock in the thumb zone. You can also drag on the lane: near the foul line moves the laydown, further up moves the eyes.
   - Aim at the arrows (15 ft) or the dots (7.5 ft).
2. **Engine run.** The shot runs on the unchanged engine for the selected ball, using tonight's preset (`presetFor(ft)`) and the bowler's speed and rev, with a source chip on each.
3. **Break box.**
   - Size: ±1.5 boards × ±1 ft.
   - Centre: tonight's model strike line breakpoint, or the bowler's own box, or the Rule of 31 when there is no model line.
   - It turns green when the shot's breakpoint is inside it and gold when it isn't.
4. **Pocket call.** Pocket means |entry − 17.5| ≤ 0.7 (the engine's strike rule). Otherwise the call is High or Light (Gutter is separate). The angle is OK at 4–6°.
5. **One-tap move.**
   - The app tries the cited move families (parallel 1, 2-and-1, parallel 2, 3-and-1, 4-and-2) in both directions on the engine.
   - The smallest move that improves the grade wins.
   - The card shows "Model after the move: …" and **Apply move**.
6. **Other parts of the screen:**
   - a bird's-eye summary (Feet → Laydown → Arrows/Dots → Break → Entry);
   - a pin-deck read;
   - **Save as my line** / **Back to saved line**;
   - lefty mirroring (bowler's own board numbering, mirrored lane and words);
   - a 3-step walkthrough plus a "?" button to replay it.

## 2. Sources
All are search excerpts from 2026-10-24 unless marked as fetched.

| Rule | Source |
|---|---|
| Laydown = feet − ball offset + drift. Offset 7 in their example. | Breakdown Bowling, https://www.breakdownbowling.com/targeting-with-a-bowling-line/ |
| "About a three-board area" at the breakpoint; Rule of 31; flatter patterns: high = breakpoint missed inside | Human Kinetics, https://us.humankinetics.com/blogs/excerpt/determining-the-breakpoint-using-the-rule-of-31 |
| House shot breakpoint 8–10 at 39–41 ft; high → feet 2 left, eyes 1 left; parallel moves | National Bowling Academy, https://www.nationalbowlingacademy.com/post/understanding-the-house-shot |
| Move in the direction of the miss; 2-and-1 | bowl.com, https://bowl.com/making-in-game-adjustments |
| Target-line adjustment fundamentals | Bowling This Month, https://www.bowlingthismonth.com/bowling-tips/the-fundamentals-of-target-line-adjustments/ |
| 3-and-1, 4-and-2 (community, not official) | r/Bowling, https://www.reddit.com/r/Bowling/comments/11gnv9z/what_does_2_and_1_mean/ |
| Drift within 1–2 boards is consistent | bowl.com, https://bowl.com/dealing-with-drift |
| **Find window:** the entry board decides strike vs leave "regardless of entry angle". 17.5 → 85% strike / 15% single pin; 17–18 → strike or single pin 70–85%; 15–16.5 or 18.5 → 50%. | USBC "I Left What Where?", via National Bowling Academy, https://www.nationalbowlingacademy.com/post/aiming-for-the-pocket-why-didnt-i-strike |
| More entry angle carries better (6° > 4° > 2° at most offsets) | USBC charts via IBPSIA, https://ibpsia.com/entry-angle-part-1/ ; USBC Ball Motion paper, Fig. 2, https://images.bowl.com/bowl/media/legacy/internap/bowl/equipandspecs/pdfs/BallMotionASQ.pdf |
| Strike types (qualitative) | USBC Pin Carry Study 2009 (already in DEFLECTION.md S3) |

**Disclosed disagreement.** The engine treats a high shot like a flatter pattern (HK): the fix moves feet and eyes right for a right-hander. House-shot coaching (bowl.com, NBA) says move toward the miss, i.e. left. When the engine's pick goes against the house rule (`againstHouseRule`), the suggestion card says so in plain words.

## 3. Assumptions (labelled in the UI)
- **Ball offset 7, drift 0.** The Breakdown Bowling example. The bowler can set both under "Drift, ball offset, your box".
- **Engine aim = laydown − arrows board.** This is the app's v1 rule: 1 board per aim unit, so the engine's arrows crossing can differ by about a board.
- **Dots → arrows** are joined by a straight line from the laydown.

## 4. Find my strike line (`js/cc/strikeline.js`)
1. **Grid.**
   - Laydown 5–30 (1-board steps) × arrows target within ±8 of the laydown (0.25-board steps).
   - Each line runs through the unchanged `analyze` with the ball, tonight's preset and the bowler's speed and rev.
   - Keep the lines whose nominal entry is in the **window**: entry board 17–18 **and** 4–6°.
   - If no line reaches 4–6° with this ball on this preset, fall back to the board-only window (cited: "regardless of entry angle") and say so.
   - Keep one line per laydown (the one closest to 17.5), with the target snapped to a half board so it can be aimed at.
2. **Miss room.** For each candidate, find the largest arrows miss (0.5 steps, up to 4) on *both* sides that stays in the window. The 10 lines with the most room go to step 3.
3. **Monte Carlo.**
   - 200 shots per candidate, seeded mulberry32 (seed 31). Every candidate uses the same random numbers, so the comparison is fair.
   - Each shot perturbs the laydown, arrows, speed and rev with a normal distribution (values are 1 SD):

     | Input | Spread | Source |
     |---|---|---|
     | Arrows | Measured: LaneTrax "Arrows: Average Difference", **read** as the mean \|miss\| at the arrows (LaneTrax does not document it; the search found no definition), converted SD = mean·√(π/2). Otherwise assumed ±1.5 bds. | LaneTrax import |
     | Laydown | ±1 board | assumed, bowl.com: 1–2 boards is consistent |
     | Speed | ±0.5 mph | assumed |
     | Rev | ±20 rpm | assumed |

   - **Pocket %** = the share of shots that land in the window.
4. **Pick.**
   - The highest Pocket % wins. Within 3 points, the line with more room wins.
   - Second option: "More room" is a line ≥2 boards away with more room. If there is none, the second option is "Next best".
5. **Output (coach voice).** "Stand 18, aim 18 at the arrows. Pocket 60% (model estimate, assumed accuracy ±1.5 bds, no LaneTrax import; 200 simulated shots)."
   - With an import: "your accuracy ±1.45 bds, n=90".
   - A why line: "Not higher mostly because a 1.5-board miss at the arrows moves the entry about 0.4 boards, and the window is 1 board wide." The biggest 1-SD driver is computed, not guessed.
   - "Inputs and method" lists the release (with sources), the preset, every spread with its source, the counts, the seed and the time taken, plus "not a guarantee".
   - "Use stand N, aim N" is one tap. It sets feet and eyes and moves the box to that line's breakpoint, so the lane shows the line through the box.
   - Stand = laydown + offset − drift; dots mode converts the target.
6. **No strike %.** The only published carry number we found is 85% strikes at board 17.5. That is not a carry curve by board and angle, so multiplying the pocket share by it would be invented precision. The UI says this.
7. **Speed.** About 4,000 engine calls. It took 70 ms at 4× CPU throttle in e2e (budget < 1.5 s), so it runs synchronously after a paint and needs no worker. If a slower engine ever pushes it past 1.5 s, move `find()` into `js/cc/strikeline.worker.js` (a module worker from 'self', CSP-safe).

## 5. QA gates
- **Unit tests:** `node --test tests/data/targeting.test.mjs`. They cover the laydown/dots math, lefty words, box ±1.5×±1, the house line as pocket in the box with S restored, a cited move that the engine says improves the shot (with mirrored lefty words), the coach format, Find being deterministic per seed, Pocket % non-increasing as the arrows spread goes 0.5→5 (a drop of ≥20 points), measured vs assumed spread, the text carrying "model estimate", its basis and n with no strike %, and a spec-TBD ball returning none.
- **e2e:** `python3 tests/e2e.py URL --only target` covers the walkthrough, pocket, high + move, save/back, dots, the Lane entry, lefty, Find from Tonight (format, <1.5 s at 4× throttle, window and source, second option, apply → pocket in the box), lefty Find, axe 0 serious, 44 px and no overflow at 360.
- **Also:** engine equivalence 0 mismatches; Lighthouse `#/target` ≥95.
- **Screenshots:** `phone-target-pocket`, `phone-target-high-move`, `phone-target-walkthrough`, `phone-target-find`, `phone-target-find-applied`.

## 6. Known gaps
- Lane's older MISSES buttons ("left/high → feet 2 left") follow the house rule, which is the opposite of the engine's direction (see the disclosure).
- Tonight's "Start feet N" is the engine laydown. Targeting's Feet is laydown + offset.
- The high suggestion can be 4-and-2, which comes from a community source (labelled as such).
