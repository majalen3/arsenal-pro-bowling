# Overnight log (2026-10-24)

Each entry covers what shipped, why it matters and the test results. Newest entries go at the bottom.

## 1. Bag Advisor: a36776e (sw v21)
- **What shipped:**
  - Tonight opens on "Where are you bowling?" (5 events). One tap builds an owned-only bag: role, confidence, reason, ≤1 warning, your evidence or "no results logged yet", and Swap in 2 taps.
  - Start line ("Start with: Rattler Big Bite, from feet 17, aim 10.7 at the arrows"), Pack this (saved as a bag), A→B→C plan, why / what would change it.
  - Results re-order the spec ranking only past 21 games (USBC Rule 319a minimum, cited).
  - Feet now shows the real stand (laydown + offset). Pins are 48 px with no 360 px overflow.
- **Why it matters:** the first question of the night ("what do I bring?") is answered in 1 tap, with no ball the bowler doesn't own and no fake stats. Autonomy: Swap and Open full bag builder are real choices; copy says "Start with", not "You must".
- **Tests:** e2e 299/0; unit 154/0; engine 7 500/0; Lighthouse `#/tonight` 94–98/100/100/100 (perf noisy on the local python server); axe 0 serious.
- **Live check:** sw v21, advisor.js 200, /api/health ok, spec GET 200, malformed POST 400.

## 2. Gap review 1 + user simulations (sim1), docs only
- **What shipped:**
  - `docs/user-simulations.md`: 6 personas plus a midnight edge case, run on the live build `a36776e` / sw v21. The API was blocked, so nothing was written to production.
  - `docs/GAP_REVIEW_1.md` revised with the simulation findings, a session-data section (§2b) and a data-overload keep/tap/cut list (§2c).
- **Found live:**
  - Lefty quick-log spare hints use right-hand boards.
  - A double-tap on X logs 2 strikes.
  - A league game crossing midnight disappears on reload (the shots stay stored under the old date).
  - The Tonight scoring card sits 1.3–2.4 screens down, and a reload scrolls it away.
  - Sessions and Insights show nothing about the night after 3 games.
- **Why it matters:** trust on the scoring path, and the owner's "not drowning in data" rule.
- **Tests:** 8 simulated games, all scored correctly (10th frames included). App latency 61–104 ms mean, 194 ms max. Screenshots are in `/workspace/ux-shots/sim1/`. App code was not changed.

## 3. Bowler Card + import results + Nights (BC)
- **What shipped:**
  - Import done card → "See results" → session view: one headline, ≤2 stats, one next focus. Games come with frame marks; comparison, single/multi spares, LaneTrax levels and import notes sit behind Details.
  - "Which ball was this?" tags a LaneTrax session to a ball, so it counts in Bag Advisor.
  - Sessions → Nights lists scored, imported and logged sessions (iteration-1 W2 "Sessions empty after a game").
  - `#/card` My Bowler Card: headline + 4–6 figures with source and n, trend sparkline, collapsed sections, measured rev/speed only after confirm (≥30 shots, app estimate), PNG share; the empty state says what to import.
  - Insights' static assessment was removed (GAP f) and replaced by one computed line.
- **Why it matters:** "what happened tonight and what do I work on" is one sentence, with no data dump.
- **Tests:** see the commit entry below.
- **Tests:** e2e 335/0 (new `card` cycle, 24 checks); unit 162/0; engine 7 500/0; axe 0 serious; Lighthouse `#/card` 93/100/100/100 and `#/sessions` 91–94/100/100/100. Perf is noisy: box load average was 14, and `#/tonight` scored 94 in the same run. Fixed along the way: a heading-order a11y issue in the shared empty state (h3 → h2). Screenshots: `/workspace/ux-shots/bowler-card/phone-card-*.png`, `phone-session-*.png`.

## 4. Engine B v5 realism fixes (physics QA 5/10 → 7/10)
- **What changed (physics repo, model only):**
  - Loft is a real input: friction starts at landing.
  - Pin-to-PAP inches are an input (α = 90·in/6.75, MoRich, F).
  - Breakdown direction is fixed: the breakpoint now moves earlier with shots, and the reduced held-out day is within ±3.
  - Grid map recalibrated by CV: carbon breakpoints 26–35 ft → 32–43 ft.
  - Tilt-track term added (negligible effect: FAIL, reported honestly).
  - Dynamic absorption wired in but unidentifiable from the data, so ka = 0.
  - The urethane refusal is kept.
- **QA:** 7/10. Sweep and held-out breakdown now pass. CV robot hook / human entry and the urethane order still fail.
- **Why it matters:** 7 is below the port gate of 8, so Engine B is **not ported**. `docs/ENGINE_PORT_PLAN.md` holds the plan, including measured JS timing (4.3 ms/sim at dt 0.004 → worker + reduced-order search needed).
- **Not changed:** `simulatePath`; equivalence 7,500/0.
- **Details:** `ENGINE_VERIFICATION_REPORT.md` §6b.

## 5. Honest label: pin-deck read-out
- **What changed:** `js/deck.js`. The pin-deck text alternative now starts "Model estimate: Enters board …". The on-screen angle already says "model".
- **Why it matters:** the 2-D numbers are labelled as model output.
- **Left for the lane-screen owner:** the lane canvas aria-label and the Entry/Break pt tiles in `js/screens/lane.js` (edits in progress by another worker) should get the same "(model)" note.
