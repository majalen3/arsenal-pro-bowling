# IA plan: organise Arsenal Pro by the bowler's moment (2026-10-24)

**Inputs:**
- Owner ask: TEAM_PROMPT_FLOW_IA.md (verbatim).
- Research: FLOW_IA_RESEARCH.md (lessons are cited as R#).
- Audit: IA_AUDIT_1.md.
- Wireframes: `ia-wireframes/00–05`.

**Status: proposal.** It overrides DECISIONS #28, #31 and #32 in part (see §9). The owner must approve.

**Work in progress elsewhere:** another worker is editing code for the aim drag, Help bubbles, the Bowling Guide, handedness and ball Status. Every phase below starts after that work merges and builds on it, not over it.

## 1. Tabs: five moments, no "More"
| Tab | Moment | Answers | Today's content that moves here |
|---|---|---|---|
| **Tonight** | Get ready (prepare) | "What do I bring, and where do I start?" | Outing chips, lanes tonight, the advisor bag, the start line, scoring mode and team |
| **Bowl** | Bowling | "Log this ball." | The quick-log pad, the ball chip, fix-frame, the between-games read |
| **Results** | After (review) | "How did it go, and what changes?" | Sessions (Nights / Lines / Lane taps / Notes), the recap, the Card, Export |
| **Bag** | My gear | "What do I own, and where is it?" | Arsenal (Armory, catalog, compare, insights), the Bag builder, Status and care, Add ball |
| **Learn** | Learning | "What does this mean, and how does it work?" | Bowling Guide, Glossary, Patterns library, Lane "How it works", the Help "?" switch, replay welcome |

- **Me** is a header button (top-right) on every tab. It holds the bowler profile (handedness, style, speed, revs), appearance, text size, keep screen on, sync & backup, and about. These are rare settings (R27: rare items may sit off the thumb zone; R6: Strava "You").
- **Lane / Target** stay as full-screen routes. They open from the "Stand · Aim" chip on Tonight and Bowl, and from Learn. They are tools, not a moment.
- **Rationale:**
  - Apple says avoid a More tab and keep tabs few and single-word (R2).
  - Use 3–5 destinations (R3).
  - Hidden nav costs about 20%+ discoverability (R1). The Glossary and Help being in More is the owner's "can't find" complaint.
  - "Today" is its own place, and recording is its own focused destination (R5, R6).
  - Grouping is by mental model, not data type (R4).
- **Order** follows the night (prepare → bowl → review), then gear and learning. Tonight is the default tab, except while a game is open, when Bowl opens first.

## 2. Screen by screen: keep / move / merge / cut
| Element (today) | Verdict | Where / how |
|---|---|---|
| Tonight outing chips | KEEP | Tonight, first |
| Tonight "Lanes tonight" (pattern, center, surface, condition) | MOVE + MERGE | One summary row "Lanes: House shot · fresh [edit ›]" that opens a sheet. Stays near the top |
| Tonight advisor bag card | KEEP, simplify | 3 rows with role words. "Left at home · why?" link. "edit ›" opens the builder |
| Tonight older first-ball card (Weaker/Stronger, its own Then) | **MERGE → CUT** | The roles in the bag rows replace it. One plan, not two (audit §3) |
| Tonight "Why this bag / What would change it" | TAP | Behind "Why these balls?" in the builder (R26: near, but not in the way) |
| Tonight quick-log pad | **MOVE** | To the Bowl tab (owner: not on the front page) |
| "Quick-log a game" button | REPLACE | One gold **Start bowling** button. It saves tonight's bag and opens Bowl |
| Tonight Bag size toggle (Tournament 6 / League 3) | MOVE | To the builder only (one control) |
| Tonight scoring mode + team/handicap + Add a bowler | MOVE UP | A "Who's bowling" row above Start bowling. Handicap settings go in the team sheet |
| Tonight games count, goal, event date | TAP | "More details ▸" |
| Bag `#/bag` two size controls + "League night (advisor)" | MERGE | One "Bring: 2 / 3 / 4 / 6 / other" control. The default comes from the outing. No cap: "other" takes any number (owner: no arbitrary caps) |
| Bag coverage grid | REPLACE | A weaker ↔ stronger ladder. The 5×3 grid goes behind "See coverage chart" |
| Bag Checks (10 rows with source chips) | TAP | Only ⚠ rows show inline. All checks and sources open behind a tap (R24, R26) |
| Bag Lock / Exclude | **REPLACE** | 📌 **Always bring** (per outing). "Leave out" is replaced by Status, or by Swap for tonight only |
| Bag Pack list | MERGE | Into the "Your bag for tonight" rows (one list, not two) |
| Bag "Ball status and care" at the bottom | **MOVE** | Status goes on each ball row of the Bag tab (2 taps). Care goes on the ball page |
| Arsenal Armory / Bench and pro shop / Hall of Fame | KEEP as views | Status filter chips: In my bag / At home / At the pro shop / Retired. Armory stays as a flavour view; Hall of Fame = Retired |
| Arsenal 22-ball catalog wall | TAP | "Browse catalog" from + Add ball |
| Sessions | RENAME → Results | The last night's recap card is first |
| Export games (CSV) | KEEP + duplicate link | In Results and in Me › Your data (one feature, two entry points, the same function) |
| More › Help switch, Glossary, Replay welcome | MOVE | To Learn |
| More › Bowler profile, Appearance, Sync | MOVE | To Me |
| More › "My bag: all 22 · Choose" | CUT | It is the Bag tab |
| More tab | **CUT** | — |
| Patterns tab | MOVE | Library → Learn. The pattern picker stays in Tonight's lanes sheet |
| Lane tab | MOVE | A route opened from the Stand/Aim chip and from Learn |

## 3. Bag builder redesign (wireframes 03, 04)

**Mental model:** "My balls → where are they → what do I bring tonight → why".

1. **One Status per ball:** In my bag / At home / At the pro shop / Retired.
   - Set it on the Bag tab row in 2 taps, or on the ball page.
   - It replaces Benched, Exclude, "Bench & pro shop" and the bottom-of-page Status select.
   - The builder and Bowl's ball chip offer only In my bag and At home balls. At home ones are tagged "grab from home".
   - Pro shop and Retired balls are never offered. Their history is kept (R12, R13, R15, R16).
2. **Step 1, Where & lanes:** the outing (from Tonight) and the lanes row. **Bring: N** is the only size control.
   - The default comes from the outing: League 3, Tournament 6, Practice 3, New center 3, Sport 6. These are today's bag.js SIZE plus R20 and R21.
   - "Other" takes any number.
3. **Step 2, Your bag for tonight:** N rows. Each row has:
   - a **role in bowler words**: Start ball / If it hooks early / If it stops hooking / For heavy oil / Spares (R21, R22);
   - **one plain "why" sentence**, built from the specs and the user's results with the existing advisor logic and labels;
   - **[Swap]** (a sheet of eligible balls, each with "what changes");
   - **[📌 Always bring]**, which is remembered per outing type.
   - A weaker ↔ stronger ladder shows the spread at a glance.
4. **Step 3, Left out (why not):** every other owned ball, with one reason:
   - "Too close to Rattler Big Bite: same strength and shape" (today's overlap check);
   - "Stronger than tonight's lanes need" (rank / demand);
   - "At the pro shop" or "Retired" (Status);
   - "Service due" (dueOf).
   - **[Bring]** swaps the ball into the closest role. Reasons come only from existing rule outputs; no new data is invented.
5. **Sticky "Pack these N":** saves **the** bag. Tonight, the Bag tab header, Bowl's ball chip and the Card all read this same saved bag. This fixes the "3 vs 6 packed" split (audit §3).
6. **Scrutiny on demand:** "⚠ 1 thing to check ›" shows only warnings inline. "All checks & sources ›" shows the 10 checks with their F/A/USBC chips, unchanged (R25, R26).
7. **Autonomy:** the bag is labelled "Suggested". Every pick can be swapped or pinned. Swapping never asks "are you sure" (R23).

## 4. UI label glossary (bowler language)
| Use | Means | Replaces |
|---|---|---|
| My balls | Every ball you own | "My bag: all 22", Arsenal catalog |
| Tonight's bag | The balls you're bringing tonight | "6 packed", advisor "Pack this" |
| In my bag / At home / At the pro shop / Retired | Where a ball is (Status) | In bag / Benched / Pro shop / Retired, Exclude, Bench & pro shop, Hall of Fame |
| Always bring 📌 | Keep this ball in tonight's suggestion | Lock |
| Start ball | Throw it first in practice and read it (benchmark) | benchmark pill |
| If it hooks early / If it stops hooking | Your weaker / stronger backup | weaker-control / stronger |
| Spares | Your straight spare ball | spare |
| Stand | The board your feet start on | Feet, stand, laydown-as-feet |
| Aim | The arrow/board you look at | Eyes, aim, target |
| Bring: N | How many balls go in tonight's bag | Bag size / Format / Tournament 6 / League 3 |
| Start bowling | Begin scoring tonight | Quick-log a game |
| Fix a frame | Change a frame you already logged | (same, keep) |
| Results | Your nights, recaps and exports | Sessions |
| Learn | Guide, words, patterns, how-it-works | More › Help / Glossary |
| Me | Your profile and app settings | More |

"Benchmark", "RG", "differential" stay in the Glossary and in the ? bubbles, linked from the plain words. They are not removed, only moved one layer down.

## 5. Help "?" and the Bowling Guide
- **Learn tab:**
  - Search is on top (one field over the Glossary and the Guide).
  - **Bowling Guide** is the first card: the other worker's guide, linked as is.
  - Then Glossary, Oil patterns, How the lane model works, the Help "?" switch, and Replay the welcome tour.
- **Help "?" default:**
  - **On for new installs** on Tonight, the Bag builder, Lane/Target and Add ball.
  - **Never on Bowl**, which keeps the owner's "nothing extra during active scoring".
  - Training wheels (R8): after 3 logged nights, a one-time line asks "Hide the ? bubbles? You can turn them back on in Learn." The bowler chooses (autonomy).
  - Users who already have the app keep their current setting.
- Each "?" opens the Glossary entry for that word in a sheet with Done (R11). It is placed next to the word (R9).

## 6. Top-12 tasks: before → after
Counting starts with the tab tap. Seconds are KLM estimates (A).

| # | Task | Before (audit) | After (plan) | After path |
|---|---|---|---|---|
| 1 | Log a frame | 3P+1S (first) / 1P | 2P / 1P | Bowl → Strike |
| 2 | Start league night | 5P+1S | 4P | Tonight → League → Start bowling → Strike |
| 3 | Add a bowler | 4P+4S + typing | 4P + typing | Tonight → Team → + Add a bowler → Done |
| 4 | Pick tonight's bag | 3P (quick) / 5P+3S (full) | 3P / 4P | Tonight → League → Start bowling (saves the bag) / … → edit › → Pack these 3 |
| 5 | Change ball mid-game | 3P | 2P | Ball chip → ball (auto-returns) |
| 6 | Find stand/aim | 0–1P | 0P | On Tonight's start line and Bowl's chip |
| 7 | Look up a term | 2P+2S + typing | 1–2P + typing | Learn → search; or the ? next to the word (1P) |
| 8 | See last night's recap | 2P | 1P | Results (recap on top) |
| 9 | Add a ball | ≥4P + typing | 4P + typing | Bag → + Add ball → pick → Save (Status defaults to In my bag) |
| 10 | Set handedness | 4P (and Skip silently = Right) | 3P, visible | Tonight → "Right-handed · change" → Left |
| 11 | Export games | 2P | 2P | Results → Export (also Me › Your data) |
| 12 | Fix a past frame | ≥5P | 4P | Results → Fix a frame (last night) → frame → pins |
| | **Total** | **≈38P + 8S** (≈58 s) | **≈31P + 0S** (≈40 s) | −7 taps, −8 scrolls |

The win is less about the tap total and more about **zero scrolling on core tasks**, plus findability for 7 and 10. Today those depend on knowing that More hides them.

## 7. Phases, acceptance criteria and e2e checks
Every phase is measured at 360×740 with the API blocked. It must:
- keep 44 px targets;
- produce no horizontal scroll;
- pass axe with 0 serious issues;
- keep Lighthouse ≥95 on touched routes;
- keep CSP `script-src 'self'`;
- bump sw if files change.

### P1: fix the bag and the front page (no tab change yet)
| ID | Change | Acceptance criteria | e2e check |
|---|---|---|---|
| P1.1 | **One saved bag.** Tonight's suggestion, the `#/bag` header and the ball chip all read the same `bag.saved` | Packing 3 on Tonight makes `#/bag` say "3 packed" with the same 3 names | `onebag`: League → Pack → `#/bag` shows the same 3 names and count |
| P1.2 | **One size control** ("Bring: N", default from the outing, "other" takes any number) | Tonight's Tournament 6/League 3 and the Bag's second "Format" row are gone. Typing 7 is allowed | `bagsize`: exactly 1 size control on Tonight + Bag; 7 accepted |
| P1.3 | **Status wording + single source.** In my bag / At home / At the pro shop / Retired. Exclude is replaced (data migration: excluded → At home, unless the ball is already pro shop/retired). Lock → 📌 Always bring | No string "Exclude", "Benched" or "Lock" in the UI. Changing Status on any screen updates the builder and the ball chip without a reload | `status`: set a ball to At the pro shop → it is absent from Swap and the ball chip and present in Why not |
| P1.4 | **Builder 3 steps + Why not** (wireframe 03). Roles in bowler words; one "why" per pick; a Why not row with [Bring] for every other owned ball; checks show only ⚠ inline | Every owned ball appears in either the bag or Why not, with a non-empty reason. Pack is visible without scrolling (sticky) | `whynot`: count(bag)+count(why not) == count(owned, not retired) + retired; Pack's bounding box is inside 740 |
| P1.5 | **Tonight trimmed.** Pad moved off Tonight to `#/bowl` via **Start bowling**; the older first-ball card removed; Who's bowling + Add a bowler above Start bowling; extras behind "More details" | Tonight with League ≤ 1.5 screens (≤1110 px). Add a bowler y < 740 after picking Team. Start bowling y < 740 | `tonightfold`: scrollHeight ≤ 1110; Start bowling and Add a bowler inside the first viewport |
| P1.6 | **Handedness visible.** "Right-handed · change" on the Tonight start line; Welcome has no preselected hand (must choose or Skip; Skip shows the chip "Right-handed (default) · change") | 3 taps to switch from Tonight; the Lane mirrors immediately | `hand`: Tonight → change → Left → Lane shows a left-handed line |
| P1.7 | **Learn entry now.** Until P2, More's first card is "Learn: Bowling Guide · Glossary · ?" (above Bowler profile) | Glossary reachable in 2 taps with no scroll | `learnfirst`: More → Glossary visible in the first viewport |

P1 depends on the other worker's ball Status and Help bubble fixes. Start P1.3 and P1.7 only after those merge.

### P2: five tabs
- Tabs become Tonight / Bowl / Results / Bag / Learn, plus the Me header sheet. Old hashes redirect: `#/sessions`→`#/results`, `#/arsenal`→`#/bag`, `#/more`→`#/me`, `#/patterns`→`#/learn/patterns`.
- Bowl shows a badge only while a game is open. The app opens on Bowl when a game is open.
- Help "?" defaults to on for new installs (never on Bowl), with the 3-night prompt.
- Results shows the last night's recap first, with Fix a frame.
- **Acceptance:**
  - Tab bar has 5 items.
  - Every old hash lands on its new home.
  - Top-12 counts match §6 within ±1.
  - Bowl has 0 help bubbles and 0 cards other than the pad.
- **e2e:** `tabs5`, `redirects`, `task12` (a scripted count of all 12 against §6), `bowlclean`.

### P3: depth
- Saved bags per league or center (18Birdies lists multiple bags as a roadmap item; R12).
- Why-not reasons with the user's evidence once at least 21 games are logged (the existing USBC 319a rule).
- Coach view: read-only shared Card.
- Bowl "between games" read with one plain insight (R19).
- Ball chip on spares (R16).
- **Acceptance:** each item has its own team prompt; nothing changes Bowl's frame time (≤3 s KLM).

## 8. Five-role review
| Role | Verdict | Concern | Resolution |
|---|---|---|---|
| **Mobile UX** | Approve | Me at top-right is out of thumb reach | It holds rare settings only (R27). Handedness, the only frequent one, is also on Tonight |
| | | Five tabs is the maximum | It is within 3–5 (R3). Lane does not get a tab |
| **Bowling Domain Expert** | Approve with change | "If it hooks early" assumes a right/left framing, and backups vary by bowler | Role words come from the existing advisor roles (benchmark/weaker/stronger/spare). The Glossary links to "benchmark". The role text never names a style (neutral rule) |
| | | Tournament bowlers want all 6 visible | Bring: 6 shows 6 rows. Why not still lists the rest |
| **Behavioural Psychologist** | Approve | A suggested bag may anchor beginners (R23) | It is labelled "Suggested", Swap is 1 tap, and there is no confirm nag (autonomy) |
| | | Competence comes from "why" lines | — |
| | | Help on by default could feel patronising to advanced users | The 3-night opt-out prompt plus the Learn switch. Existing users keep their setting |
| **E2E QA** | Approve with change | Moving the pad breaks the existing tonight/quicklog/scoring e2e steps | P1.5 keeps `#/tonight` scoring working through a redirect to `#/bowl` until the tests migrate |
| | | Status migration needs a unit test (excluded → At home) | P1.3 adds `status.test.mjs` |
| | | Strike debounce seen at 120 ms taps | Tests wait ≥200 ms between balls |
| **Product Strategist** | Approve | Overrides DECISIONS #28, #31 and #32; risky churn | Phase it. P1 has no tab change. P2 goes to the owner as one decision. Competitors (LaneLogic, PinPal) win on a focused in-game screen and recommendations, so P1.4 and P1.5 are the differentiators |

**Disagreement 1: Help default.**
- UX and Psych want it on for new users.
- DECISIONS #32 says off.
- *Resolved:* on everywhere except Bowl, with an opt-out after 3 nights. This keeps #32's real goal (nothing on the scoring pad). It needs the owner's OK.

**Disagreement 2: Bag vs Arsenal naming.**
- The Domain Expert prefers "Arsenal", the common bowling word.
- UX prefers "Bag" (shorter, and it matches "Tonight's bag").
- *Resolved:* tab label **Bag**, screen title "My balls (arsenal)". The Armory view keeps the flavour.

**Disagreement 3: Patterns.**
- The Domain Expert wants the pattern library one tap away for sport bowlers.
- *Resolved:* the Tonight lanes sheet keeps the picker (1 tap). The library browse moves to Learn.

## 9. Personas walked through (mental, against the wireframes)
| Persona | Walk | Result |
|---|---|---|
| **Beginner** | Welcome → picks Right → Tonight → League → sees 3 balls with "Start ball…" → taps ? on "Start ball" → Glossary sheet → Start bowling | Understands the bag in seconds. No jargon on the first screen. ✔ |
| **Intermediate league** | Tonight → League → Swap Ordnance C4 for Hy-Road → "what changes: weaker, smoother" → Start bowling → mid-game ball chip → Super Nova | 2-tap ball change. The bag is consistent everywhere. ✔ |
| **Advanced sport** | Tonight → Sport → Bring 6 → builder → pins 2 balls → reads Why not → checks sources behind ⚠ | Full scrutiny is still there, behind 1 tap. ✔ Wants saved bags per event → P3 |
| **Lefty** | Skipped welcome → Tonight shows "Right-handed (default) · change" → Left | No longer silently wrong (owner complaint). ✔ |
| **Family / one-phone league night** | Tonight → Team → + Add a bowler ×3 (sheets) → Start bowling → Bowl rotates "Up: Sam · frame 4" | Add a bowler is above the fold. The pad stays clean. ✔ Needs the rotation label large on Bowl (P2 AC) |
| **Coach** | Results → a night → Card → Share | Works today. A read-only coach view → P3 |
| **Midnight / offline** | Airplane mode → all tabs → Learn search → Add ball | Everything works offline except the maker lookup in Add ball, which already needs the network. Add ball must say "Can't reach the maker list offline. Type the name and specs." → P1 note (audit §1) |

## 10. DECISIONS.md impact (needs owner approval)
- **#28 (no new tab for Nights):** honoured. Nights live in Results.
- **#31 (no new top-level tabs; Armory top of Arsenal):** **overridden in P2.** The total goes down from 6 tabs to 5, but Bowl and Learn are new and More/Lane/Patterns go away. Armory survives as a view of the Bag tab.
- **#32 (Help off by default, ? on 5 cards only):** **changed in P2.** Help is on for new installs, never on Bowl, and opt-out after 3 nights. The same 5 card locations, plus Tonight's bag rows.
- No DECISIONS.md edit is made in this docs pass. Record the outcome there once the owner decides.
