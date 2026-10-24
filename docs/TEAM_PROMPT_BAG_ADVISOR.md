# Team prompt: Bag Advisor ("Tonight answers 'which balls do I bring?'")

**Owner ask (relayed 2026-10-24):** the first element on Tonight is an event selector. Picking an event builds the bag in ≤2 taps, explains each ball, and says where to start.

**Route:** Tonight (`#/tonight`), card `#tnAdvisor`, first element. Code: `js/cc/advisor.js` (pure, unit-tested). UI: `js/screens/tonight.js` (`advisorCard`). Rules reused: `js/cc/bag.js` (fill, dueOf, overlaps, packList) and `js/cc/rank.js` (rank, demandOf, benchFirstReason).

## Hard rules
- Use **OWNED, available** balls only: status `inBag`. Benched, pro-shop and retired balls are never suggested, including through Swap.
- Never invent results or thresholds. Evidence is computed from the user's own `shot.logged` / `game.logged` events. When there is none, the card says **"based on specs + your release, no results logged yet"** and offers Quick-log / Import.
- Results may re-order the spec ranking only when both balls have **≥21 games**. The minimum is borrowed from USBC Rule 319a (21 games for a certified average; bowl.com, search excerpt) and shown as a source link. Below that the confidence chip reads **"app estimate (N of 21 games)"**.
- At most **one warning per ball** (service due first, then overlap).
- `simulatePath` is unchanged. Honey Badgers tokens only. 360 px, 44 px targets. CSP `script-src 'self'`.
- Coach voice: ≤2 sentences, ball name or number first.

## Events → bag size
| Event | Format | Strike balls + spare | Source |
|---|---|---|---|
| League night | league3 | 2 + spare (3) | bag.js SIZE (team rule) |
| Tournament | tournament6 | 5 + spare (6) | bag.js SIZE (team rule) |
| Practice | custom | 2 + spare | app choice |
| New center | league3 | 2 + spare, benchmark first ("new center") | rank.js benchFirstReason |
| Sport pattern | tournament6 | 5 + spare | app choice, labelled |

## Each row
Shows the name, a role pill (benchmark / stronger / weaker-control / spare), a confidence chip (specs only / your results (N games) / app estimate), a one-line reason, evidence when present ("Big Bite: 62% pocket, 48% strikes over 4 sessions (n=48 first balls); most left: 10"), ≤1 warning, and **Swap** (2 taps: Swap → pick an owned in-bag ball).

## Card
- "Start with: X, from feet N, aim T at the arrows." N is the **stand** = laydown + ball-from-foot offset − drift (prefs from Targeting; otherwise 7/0, chipped "assumed"). The Pick card's "Feet" is the stand too, with Laydown shown separately (fixes the old laydown-as-feet bug).
- A→B→C plan, "Why this bag" and "What would change it" (source link).
- **Pack this** saves `bag.saved` id `bag-adv-<event>` (source 'advisor') and shows the pack list. **Open full bag builder** → `#/bag`.
- The last answer per event type (event, swaps, packed slots) is remembered in prefs.

## Acceptance
- Unit `tests/data/advisor.test.mjs`: sizes, owned-only, roles, ≤1 warning, no-data label, evidence math, 21-game rule, swap, determinism, none-case.
- e2e `advisor`: selector first, 5 events, start line, Pack button above 740 px at 360×740, no horizontal scroll, 44 px, axe 0 serious, swap in 2 taps, reload memory, tournament 6 rows.
- Lighthouse `#/tonight` ≥95; engine equivalence 0.
- Screenshots: `ux-shots/advisor/tonight-before-360.png`, `tonight-after-*.png` (box only, not in git).

## Gaps / next
- LaneTrax aggregates carry no ball id, so they can't be evidence yet. Bowler Card adds "tag this session to a ball".
- Sport/practice sizes are app choices, not a cited standard.
