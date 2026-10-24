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
