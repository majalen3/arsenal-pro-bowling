# Arsenal Manager — Research Notes

Research for the Arsenal Manager in Arsenal Pro (Urbanek Honey Badgers). Compiled 2026-10-23. This file is docs only. No app code was changed.

**Source labels.**
- **F**: we fetched the page or PDF and read it directly.
- **S**: we only saw a search-engine excerpt. We did not read the page, so treat S items as leads to verify, not facts.
- **A**: our own assumption. Each one is flagged so it can be verified.

Some URLs are shortened to host plus file name where the full path is long. The full paths are in the research log at `/workspace/am_research/` (outside the repo).

---

## 1. Maintenance intervals (factual inputs for reminders)

| Source | Label | What it says |
|---|---|---|
| Storm, *Bowling Ball Care & Maintenance Guide* (stormbowling.com/storm-bowling-ball-care-and-maintenance-guide) | F | Resurface every 60–80 games. Detox (oil extraction) every 60–80 games, or sooner if the backend weakens or oil rings darken. Grit steps 180/360/500/1000/2000/3000/4000 plus Power Edge. Typical life 100–300 games; replacement around 300–600+. Condition stages: Fresh, Unmaintained, Neglected. Warning signs: loss of backend, over-skid, dark oil rings, inconsistent motion. Urethane needs less detox. |
| Storm Surface Factory (via bowlingball.com BowlVersity) | S | Finishing step every 20–30 games; full sequence every 60–80. |
| Brunswick *Reaction Comparison Poster* 0619-49 (brunswickbowling…cdn…/Reaction_Comparison_Poster_0619-49.pdf) | F | **Shiny** balls: re-polish every 10 games, scuff and re-polish every 30. **Dull** balls: scuff every 10, light scuff every 30. **Every 60 games:** complete resurface plus detox. |
| Brunswick Revivor research (innovativebowling.com/BrunswickResearchRevivorResults.pdf) | S (the PDF would not download; HTML came back) | Particle covers lost reaction by 60 games (about a 1-and-0 or 2-and-1 move). All covers lost reaction by 90 games (2-and-1 or 3-and-1). Cleaner, a light resurface and a Haas machine resurface did **not** restore it; oven revival did. Revive every 30–50 games (particle) or 60–80 games (reactive). |
| Motiv, *Ball Maintenance* (motivbowling.com/resources/ball-maintenance.html) | F | Resurface after about 50 games; polished balls need it less often. On a sanded ball the track goes glossy; on a polished ball the track gets nicked. |
| Motiv blog posts | S | Spinner refresh about every 12 games for balls under 3000 grit. Refinish dull balls every 15–25 games. "Sweating" oil means extract. 50+ games means resurface. |
| Hammer blog | S | Resurface every 40–60 games; a ball takes 3–4 resurfaces. |
| bowlingball.com | S | Refresh every 10 games. Resurface and replace finger inserts every 60. Purge oil every 75–100. |
| Bowling This Month (Boomershine) | S | Aggressive resurface every 60 games. No home-oven revival. |
| **Radical, 900 Global, Columbia 300** | gap | No official schedule found. **A:** Radical and Hammer are Brunswick-family brands, so use Brunswick numbers for Radical (verify). 900 Global is made at the Storm plant (S), so use Storm numbers (A). Columbia 300 has no source, so use the most conservative default (Brunswick 10/30/60) and label it "no brand guidance". |

**What this means for reminders.** Every source counts in **games**. None gives a time-based (days) interval. So the app must not invent day intervals; a days rule can only come from the user.

## 2. Ball life and decay (USBC)

- **USBC, Siefers 2007, *Bowling ball performance and resulting ball life*** (images.bowl.com/…/Bowlingballperformanceandresultingballlife.pdf). Label: F.
  - Ball life depends on two things: surface wear and oil absorption.
  - A 100-game ball showed less friction and less hook in C.A.T.S. testing.
  - Performance never fully returns to 100%.
  - Resurfacing fixes wear; rejuvenation recovers part of the loss.
- **USBC Equipment Specifications & Certifications Manual**, last updated 03/26 (images.bowl.com/…/26_231-26-march-es-manual.pdf). Label: F.
  - Lower limit for oil absorption is **2:15 (min:sec)**.
  - Balls with absorption under 4:00 get extra testing.
- **USBC cover study** (from the earlier physics workstream). Label: F.
  - Reactive covers absorbed oil in 4.7–6.95 min. Urethane did not absorb.
  - This supports turning detox reminders off by default for urethane, which Storm's guide also suggests.
- **No fetched source gives a numeric hook-loss curve** (e.g. "% of hook at game N"). The Revivor board-move numbers are S only. **Decision:** show *games since service* plus the cited guidance. Do **not** show a made-up "cover life %".

## 3. USBC rules the tracker must respect

| Rule | Label | Why it matters for the tracker |
|---|---|---|
| USBC Playing Rules 2025–26, **Rule 18** (bowl.com/getmedia/…/USBC_Playing_Rules_2025_2026.pdf) | F | During competition you may not alter the surface with an abrasive, clean with any liquid or cleaning agent, or add any foreign material. This applies to every ball in competition, including balls not yet thrown. Competition starts when any bowler throws for score. You may sand, polish or clean **before** competition. An approved cleaner is allowed only with an officer's consent, to remove residue. **Rule 18/7:** working only on the track is not allowed; the whole surface must be prepared the same way. |
| USBC ES Manual 03/26: **holes** | F | Balance holes are not allowed. A gripping hole not used throughout the approach counts as a balance hole. Each finger or thumb hole may have one vent hole, no more than ¼ in. One mill hole is allowed (≤ 5/8 in diameter, ≤ 1/8 in deep). A bowler with no thumb hole must mark a "+" on the palm side. |
| USBC ES Manual 03/26: **static imbalance** | F | Balls of 10 lb and up: no more than 3 oz difference top/bottom, side to side, and thumb/finger. Balls of 8–10 lb: 2 oz top/bottom; ¾ oz side and thumb/finger. Under 8 lb: ¾ oz for all. |
| **USBC Approved Ball List** (bowl.com/approved-ball-list, PDF dated **10/20/2026**, updated weekly) | F | Lists brand, ball name and approval date. A ball must be on the list to be used in USBC-certified competition. Balls made before Jan 1991 are allowed at the tournament director's discretion. |

**What this means for the app.**
- Maintenance reminders must say "**before** league/tournament". The app must never suggest cleaning mid-block.
- A redrill or plug event should record that the old holes were plugged, and should not offer a "balance hole" field.
- The bag builder can flag a ball that is not on the approved list.

## 4. Layout and drill sheet data

**Spectre wiki, layout step** (wiki.spectrebowling.com/…/615-step-5…). Label: F. Pro-shop software records the layout in one of these systems:

| System | Fields |
|---|---|
| **VLS** | pin-to-PAP, VAL angle, mass-bias distance |
| **2LS** | pin buffer, CG |
| **PAL** | pin-to-PAP, pin angle, MB angle |
| **Manual** | free entry |

The same source also says:
- The layout is stored with the drilling history.
- A backup ball can be drilled as a clone of an existing layout.
- Span and pitch are recorded next.
- Use one system consistently.
- Measure PAP; don't estimate it.

**A:** We could not fetch Storm's own 2LS definition. The 2LS field names above are as Spectre describes them.

**What this means for the app.**
- Layout entries are typed by system.
- PAP is stored with a "measured by / date" note.
- The profile's PAP 5⅛" stays as entered by the user. It must be marked user-reported, not measured.

## 5. How bowlers track arsenals today

| Product | Label | Loved | Hated / missing |
|---|---|---|---|
| **LaneTalk** (App Store listing) | F | Tagging games with ball and pattern. | 3.8★ from about 2.3K ratings. Arsenal is Pro-only (paywall). Manual scores get lost. Unwanted logouts. |
| LaneTalk (other reports) | S | — | Older balls are missing from the catalogue. Tagged balls can't be removed. |
| **The BallRoom** (theballroom.bowlbrain.com) | F | — | Features: PAP history; several drillings per ball (plug and redrill kept); surface change log; reminder as the game count goes up; arsenal health grade A–F from 6 sub-metrics; dry→heavy coverage view; tabs per ball; "enter once, cascades"; public card off by default. |
| **PinPoint** (product site) | F | — | Features: mileage per ball; alerts to clean, resurface or retire; offline sync; CSV import. |
| **LaneLogic** (product site) | F | — | Features: frames since last service; logs resurface, oil extraction and full service with notes; free export; offline-first; data stays on the device. |
| **StrikeStack** (product site) | F | — | Features: spec, surface and layout notes; maintenance log; virtual bags (league, sport, tournament); 3-ball lineup suggestions. |
| **Bowling This Month** reviews (bowlingthismonth.com/bowling-ball-reviews/ball-comparison-graph/) | F | Measured on-lane ratings: Total Hook, Length, Torque, Back End. Comparison graph of hook vs length. | Subscriber only. Cannot be redistributed. **A:** do not copy BTM numbers into the app; link to them only. |
| Shared Google Sheets (r/Bowling) | S | A SUMIF of games per ball. | Lesson: count practice games the same way every time. Lane shine shows within 3–6 games. Big asym balls are sensitive to surface changes. |

Reddit could not be fetched (WebFetch timed out; JSON came back as HTML). All Reddit items are S.

## 6. Patterns from outside bowling

| Product | Label | Pattern to reuse |
|---|---|---|
| **Strava**, gear/shoe alerts (help page) | F | Default alert at 250 mi, adjustable up to 800. The alert repeats each activity until the gear is retired or the alert is turned off. Retiring keeps the history. → Use games as the "mileage"; retiring a ball keeps its history. |
| **Drivvo**, vehicle maintenance (drivvo.com/en/vehicle-maintenance/) | F | Reminder fires on whichever comes first: date or distance. It recalculates from the **last service of that type**. One-off vs repeating reminders. Adjustable lead time. Notifications that don't nag. Suggested starter reminders. Preventive, predictive and corrective maintenance. Measurements go in notes. Spreadsheets fail because they don't remind. |
| **Sortly**, date-based alerts (help.sortly.com/date-based-alerts) | F | Alerts hang off a date custom field: a condition, an amount, and a time period ("1 week before"). → A "before event date" alert for tournament prep. |
| **Notion**, status property guide (notion.com/help/guides/status-property-gives-clarity-on-tasks) | F | Three fixed groups (To Do / In Progress / Complete) with custom sub-statuses. A fixed set stops "Started vs In Progress" sprawl. Board grouped by status. → A fixed set of ball statuses. |
| **Linear**, workflow history | S (docs URLs returned 404) | History records from-state, to-state, actor and timestamp. → An append-only activity log per ball. |

## 7. Data audit: app data vs fetched sources

**USBC Approved Ball List (10/20/2026, F) compared with `js/data.js` `year`.**
- An approval date is not exactly a release date (**A**: it is usually close).
- Differences to confirm with the user. **Do not auto-edit data.js**; this task was docs only.

| data.js ball | data.js year | USBC approval | Note |
|---|---|---|---|
| Rattler Big Bite | 2024 | June 25, 2024 | ok |
| Deadly Rattler | 2023 | Sept 19, 2023 | ok |
| Rattler | 2023 | **Sept 20, 2022** | mismatch |
| Rattler NU | 2024 | May 28, 2024 | ok |
| Super Nova | 2022 | Aug 2, 2022 | ok |
| Original Hy-Road | 2008 | Oct 2008 | ok |
| Hy-Road Pearl | **2010** | **May 2013** | mismatch (only one Hy-Road Pearl entry on the list) |
| Hy-Road Solid | 2014 | Apr/May 2014 | ok |
| Hy-Road X | 2018 | Sept 11, 2018 | ok |
| Hy-Road 40 | 2025 | May 6, 2025 | ok |
| AstroPhysiX | 2019 | May 7, 2019 | ok |
| Ice Storm | **2015** | Apr 2007 (all colors); later colors 2010, 2011, 2023 | which colorway? |
| Guru Supreme | 2015 | Sept 2015 | ok |
| Innovator | **2020** | **Sept 20, 2022** | mismatch |
| Bigfoot Hybrid | 2022 | Oct 18, 2022 | ok |
| Trail Blazer | 2021 | Sept 21, 2021 | ok |
| Counter Attack Solid | 2019 | May 21, 2019 | ok |
| Conspiracy Pearl | **2025** | **Feb 7, 2019** (the plain "Radical Conspiracy" was re-approved Mar 5, 2024) | mismatch |
| Ordnance C4 | 2020 | Oct 13, 2020 | ok |
| Raw Hammer Black | 2021 | Apr 13, 2021 | ok |
| Scout Reactive | 2012 | many colorways, 2007–2018 | colorway unknown, which affects the cover |
| **Rack Attack Pro Line Urethane (Sports Tec)** | 2020 | **Not on the list.** The list has *Radical Rack Attack Pearl / Solid* (Apr 2015), which are reactive, not urethane. | **Must confirm the physical ball.** If it is the Radical one, the cover in data.js is wrong. |

**`/workspace/physics/ball_specs.csv`** (bowlingballvideos.com catalogue, 145 rows):
- It covers **none** of the 11 owned balls exactly. It only has newer Raw Hammer colorways (2.53 / .038), compared with Raw Hammer Black 2.540 / .038 in data.js. These are different colorways, so the gap is not proven to be a conflict.
- It is still useful for gap-candidate lists:
  - **sym pearl, Medium or heavier:** Hammer Blacklist 2.545/.047; Storm Typhoon 2.53/.042; Motiv Raptor Pursuit 2.48/.055 (Heavy); Radical Evil Eye Pearl 2.495/.046 (Heavy);
  - **heavy solid:** Hammer Reckoning, 900 Global Portal, Motiv Jackal Ghost V2, Radical Vexed Variant, Roto Grip Perfect Gem.
- **Data quality flag:** the CSV marks *Storm Mix* as "Urethane" with 2.69/.006. Storm Mix is a spare ball; its cover type must be checked against Storm before using it as a "urethane" candidate.

## 8. Lessons (ranked)

1. **Count games, not days.**
   - Every manufacturer interval is in games: Brunswick 10/30/60 (F); Storm 60–80 (F); Motiv about 50 (F).
   - Use Drivvo's "recalculate from last service of that type" (F).
   - Days apply only if the user sets them.
2. **Logging has to be easier than not logging.**
   - Spreadsheets fail because they don't remind (Drivvo F) and because practice games get counted inconsistently (Reddit S).
   - LaneTalk's lost manual scores are its top complaint (F).
   - Logging must be local-first and take very few taps.
3. **Keep the history forever.**
   - Retiring keeps history (Strava F).
   - Plug and redrill keeps the earlier drilling (BallRoom F).
   - Log every change with from-state, to-state and timestamp (Linear S).
4. **Use a fixed set of statuses** (Notion F). In bag / Benched / At pro shop / Retired.
5. **Be honest about decay.**
   - USBC says performance never fully returns (F).
   - No fetched source gives a numeric decay curve.
   - Show games since service and cite the guidance; never show an invented "cover life %".
6. **Time maintenance around the rules.** Rule 18 bans cleaning or abrading during competition, and Rule 18/7 bans prepping only part of the surface (F). Reminders target "before your next league or tournament".
7. **Layouts are structured and tied to a drilling.** VLS/PAL/2LS fields; measured PAP; clone for a backup ball (Spectre F).
8. **Don't paywall or lock in.**
   - The LaneTalk Pro paywall is a complaint (F).
   - LaneLogic offers free export and on-device data (F).
   - CSV/JSON export always works, with no account.

## 9. Assumptions and gaps (open)

- **A1.** Radical uses Brunswick intervals. Hammer has its own blog figure (S, 40–60), so Hammer is less of an issue. Not confirmed by Radical.
- **A2.** 900 Global uses Storm intervals (made at the Storm plant, S).
- **A3.** Columbia 300 has no guidance. Default to Brunswick 10/30/60.
- **A4.** Approval date is close to release year.
- **A5.** The gap thresholds in the plan (e.g. "high RG ≥ 2.54") are our proposals, not industry definitions.
- **Gaps:**
  - official Radical and 900 Global schedules;
  - LaneTalk Google Play reviews;
  - full Linear docs page;
  - Storm 2LS definition;
  - Revivor PDF (S only);
  - all Reddit content (S only).
