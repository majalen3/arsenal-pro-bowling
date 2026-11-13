# Strike line review: one screen, and an optional Forgiving line (v76, owner t140u)

Owner, 2026-11-12 (America/Chicago): "we need our strike line to be like optional Miss model or whatever. Where to stand for the highest percentage of success with the smallest miss. And I don't get find my strike line vs on the lane. It seems not important. Review that."

Method: three readers of the same facts. **CEO**: does it earn its place on the spine (Bag, Arsenal, Strike line, Log book) and the 3-tap rule? **Bowling coach**: would a league bowler know what to do with it in 30 seconds? **Dev team**: what does it cost, and what must not break? All numbers below were measured on the v75 build at 360x780 with the sample arsenal (`/workspace/t140-evidence/before/`).

## 1. What exists today (v75)

| Surface | Route | What it does | Words / controls / scroll (360x780) | Taps from Bag |
|---|---|---|---|---|
| **Strike line tab** | `#/tonight` | Where you bowl (event type), the start line in words ("Start with Rattler Big Bite, from feet 17, aim 10½"), two buttons **Find my strike line ›** and **Lane view ›**, the Stand · Aim chip, hand note, Start bowling, More details | 57 / 13 / fits | 1 |
| **Find my strike line** | `#/strike` | The answer: lane picture ending at the pocket, four tiles (Stand, Target, Breakpoint, Ball), "estimate · Pocket 28% (model)", Use this line, Details (why, alternative, "Move it by hand") | 73 / 6 / fits | 2 |
| **Lane view** | `#/lane` | The model's lane: ball header, pattern/surface/oil chips, pin-deck result (Strike, 16.9, "0.6 boards light"), entry/angle/break cards, feet and aim inputs, side views | 125 / 24 / **scrolls 1,152 px** | 2 |
| **Targeting** | `#/target` | Hand adjustment: feet and eyes steppers, drag on the lane, its own Find card (`#tgFind`), tour, box, moves | 260 / 20 / **scrolls 1,612 px** | 2 (via the Stand · Aim chip) |

Also: a second "Find my strike line ›" button inside the Tonight ball card (`#tnFind`) that opens the Targeting version of the same search.

### How they overlap
- **Find, Lane view and Targeting all answer "where do I stand and aim".** Find gives the number from the model's search. Lane view shows the same line drawn through the physics, with inputs to change it. Targeting moves the same two numbers by hand. Three screens, one answer, and Find and Lane sit side by side as equal-looking buttons, which is the confusion the owner describes.
- **Only Find fits the 30-second test.** It has 6 controls and no scroll. Lane view and Targeting scroll 1.5-2 screens and carry 125-260 words.
- **The numbers agree** (the same `lineFor` / `find` code feeds all three), so nothing is lost by pointing people at one of them.
- **Lane view is not a spine screen.** It is the what-if tool: change the pattern, the surface or the ball and watch the line. Coaches like it; a bowler walking to the approach does not need it first.

## 2. Options, scored (1-5; impact, effort, confidence that it is right)

| # | Option | Impact | Effort | Confidence | Verdict |
|---|---|---|---|---|---|
| A | Keep all, rename the buttons | 1 | 1 | 4 | Does not fix "I don't get it" |
| **B** | **One door on the tab ("Your strike line ›"). The answer screen is the single place for the line; Lane view becomes a visible Adjust › button on it** | **4** | **2** | **4** | **Chosen** |
| C | Put the answer (picture + tiles) on the tab itself, zero taps | 5 | 4 | 2 | Next step, not now: `tonight.js` is 74 KB, the where-you-bowl inputs share the page, and no-scroll budgets are tight |
| D | Delete Lane view | 2 | 2 | 1 | No: it is the in-game Lane tool (`GAME_TOOLS`), Learn links to it, deep links, tests |
| E | Add the optional Forgiving line toggle | 3 | 3 | 3 | **Chosen** (owner ask) |
| F | Make Forgiving the default | 3 | 1 | 1 | No: the model's pocket window is one board wide, so it often finds the same line (see section 4); changing what people see by default needs more than that |

## 3. Recommendation: one simple model

1. **Strike line tab: one primary button, "Your strike line ›".** The start line is already in words above it. The id `#tnFindLine` stays, so deep links and tests keep working. The separate "Lane view ›" button is gone.
2. **`#/strike` is the one screen for the answer**: ball, lane picture ending at the pocket, the four tiles, then a **Standard | Forgiving line** switch, the estimate tag with the pocket % and miss room, **Use this line** and **Adjust ›**. Details holds the miss-size setting, the why, and "Move it by hand".
3. **Adjust › opens the Lane view** (still `#/lane`, unchanged). Lane view and Targeting are now plainly the optional tools, one tap from the answer. **Lane is 3 taps from Bag** (tab, Your strike line, Adjust): the 3-tap rule holds. From the Strike line tab it is 2.
4. **Nothing is deleted**: `#/lane`, `#/target`, the in-game Lane and Targeting, and the Stand · Aim chip stay.

Against the spine: Bag → Arsenal → **Strike line** → Log book is untouched; the Strike line tab now has one question to answer instead of two. Against no-scroll: `#/strike` fits at 360x780 (Details bottom 663 px, tab bar at 716 px) and at 390x844 with the iPhone safe area. Against the 30-second test: still one tap to stand / target / breakpoint / ball with the line ending at the pocket.

## 4. The optional Forgiving line

**What the owner asked:** where to stand for the highest percentage of success with the smallest miss.

**How it works** (`js/cc/strikeline.js`, `forgive()`; the engine is read through `analyze` → `simulatePath`, which are unchanged; equivalence stays 7500/0):
1. **Profile:** the bowler's speed and rev, the ball chosen (specs verified), tonight's oil length (house 38 ft assumed if none).
2. **Sweep:** every stand board 5-30, and for each the aim whose nominal path enters the pocket (entry boards 17-18, the entry angle window 4-6° when any line reaches it), plus the target half a board either side for the eight most central stands.
3. **Sample misses:** each candidate is thrown 200 times with random errors: arrows ±(miss size) boards, laydown ±1 board, speed ±0.5 mph, rev ±20 rpm (1 SD each, assumed values unless LaneTrax data replaces the arrows miss). The same random numbers are used for every candidate and for the Standard line, so the percentages are comparable.
4. **Pick:** the candidate with the highest share of shots that still reach the pocket window; ties go to more miss room. If no candidate beats the Standard line the screen says "already your most forgiving" instead of inventing a gain.
5. **Miss room:** how many boards at the arrows (half-board steps, up to 4) you can miss on each side and still enter the pocket window, left and right in the bowler's own terms (right-hander: higher board numbers are left; left-hander: right).
6. **Cost:** about 60 ms at 4x CPU, run only when the switch is tapped and cached per ball, miss size and conditions; budget 150 ms (`docs/PERF_BUDGET.md`).

**Standard** is unchanged: the bowler's start line (Tonight's line), scored the same way.

**Miss size is adjustable** (Details): Auto (measured LaneTrax value if imported, else the assumed ±1½), ±1, ±1½, ±2, ±3 boards. The default is small. Bigger miss sizes lower every percentage, never raise them (tested).

**Honesty:** it is labelled **estimate**; it shows the model's pocket %, never a strike %, because there is no cited carry curve by board and angle (`strikeline.js` header). The miss sizes are assumptions unless imported; the pocket window is one board wide, so percentages are low in absolute terms (14-42% in the example below) and room is small by nature. The comparison between the two lines is the useful part.

**Example** (Radical Rattler Big Bite, 16 mph, 250 rpm, house shot 38 ft, miss size set to ±1 board at the arrows):
- Standard: stand 17 (laydown board 10), aim 10½ at the arrows → pocket **30%**.
- Forgiving: stand 17, aim **11½** at the arrows, breakpoint board 13 at 37 ft → pocket **42%**. At the default ±1½ the same ball shows room 0 left / ½ right.
- In the app at the default ±1½ (screenshot `/workspace/t140-evidence/after/strike-forgiving.png`): stand 17, target 11½, breakpoint 13 at 37 ft, pocket 31% vs Standard 27%, room 0 left / ½ right.
- Node sweep at the default ±1½: 25% → 30%. At ±3: 14% → 15%. For most other catalog balls the Standard search already finds the best line ("already your most forgiving").

## 5. What would make it better (not done)
- **A cited, wider pocket window.** The 17-18 entry-board window is correct but harsh; a sourced "pocket zone" would give more room and more spread between lines.
- **Option C:** put the picture and tiles on the Strike line tab so the answer is zero taps.
- **Measured miss size from the bowler's own shots** (LaneTrax import already feeds the arrows miss; scoring-pad data could feed it too).

## 6. Follow-up (v77, owner t142u/t143u): "I hate the strike line page. We only need the lane."
The owner rejected option B's answer page. v77 takes the other branch of the review (option D, softened): **the Lane view is the strike page**, the v76 page is no longer in navigation, and **Optimize** (one button) runs the Forgiving sweep on the lane itself.
- Taps: tab -> "Your strike line ›" = the Lane view (Bag 2 taps); Optimize is one more tap (Bag 3).
- Optimize starts from the line on the lane, puts the best stand and target on it, shows pocket % (estimate) against the line it replaced, miss room left/right, and Undo; "Already your best line" when nothing is better.
- The Lane view had been the 1,152 px page with 125 words; it now fits 360x780 and 390x844 with the safe area. Everything else is behind one Details. See docs/DECISIONS.md and docs/CUTS_V73.md #22-25.
- Not deleted: `#/strike` redirects, `js/screens/strike.js` stays (restore steps in CUTS #22).
