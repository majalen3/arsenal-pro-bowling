# Arsenal Pro clutter audit #1

*Measured 2026-10-31 (America/New_York) against the live build at https://majalen3.github.io/arsenal-pro-bowling/ (repo head b084d06). No app code was changed for this audit. The scripts are in `tests/clutter/`.*

Question from the owner: *how cluttered are some of the pages; what does the psychology say about the most data per page or per card; what are bowlers actually using and doing?*

The rubric is the owner's rubric, with no fixed number caps. Every element is scored on:

- **Usability (U):** a bowler understands it in seconds, in bowler language.
- **Applicability (A):** it changes what the bowler does next (stand, aim, ball, spare, practice, bag).

An element that passes both stays. An element that passes U only goes behind a tap. An element that fails both is cut. During active scoring, nothing extra appears.

---

## 1. Top 5 findings

1. **Lane is the most cluttered screen by every measure.**
   - It has the highest subband entropy (2.13 at 360 px, against a median of 1.42 across screens), 13 distinct font styles above the fold, and 19 data numbers above the fold.
   - The pin-deck card alone carries a verdict sentence plus two model-caveat sentences: "Model: the ball deflects 17° right…" and "Pin action: approximate 2-D model, assumed 15 lb ball, no spin."
   - The three tiles (Entry / Angle / Break) are the applicable part. They mirror the data points Kegel Specto reports to bowlers. The caveat prose is not applicable.
2. **Headline statistics come from tiny samples.**
   - Results → "Latest night" leads with **"Strikes: 100%, up 33.3 points from last session"** after 2 first balls.
   - Tonight (league) says **"100% pocket, 60% strikes … (n=40 first balls)"**.
   - A 2-ball percentage fails applicability: it should not change anything the bowler does (Tversky & Kahneman, law of small numbers). It also shows too much precision ("33.3 points"; Few, pitfall #3).
3. **Bowl (active scoring) carries extras.**
   - Above the fold at 360 px: 22 actions, 13 font styles, and 6 information lines/chips besides the frame strip and pins:
     - "Then: Hy-Road Pearl if it hooks early"
     - "Saved ✓ frame 2"
     - "Frame 3 · ball 1"
     - the spare-advice line
     - "righty · strike stand 17"
     - "3-6-9 spare system"
   - The two chips visibly overlap the spare-advice line (see `docs/clutter-img/bowl-360.jpg`).
   - This breaks the owner's "nothing extra during scoring" rule. Bowlers complain about exactly this in other apps: LaneTalk reviews cite pop-ups during live scoring (anecdote).
4. **The same fact appears on several screens, and some copies disagree.** Each repeat costs attention, and each disagreement costs trust:
   - Speed/revs: Me says **15.0 mph, 300 rpm**. Bowler Card ("you reported"), Lane and Targeting ("your profile") say **15 mph · 220 rpm**. Ball says "~15 mph / ~220 rpm".
   - Refresh threshold: Tonight (league) says **"≥4/10 games"**. Bag says **"≥5/10 games"**.
   - Entry board for the same ball (Rattler Big Bite) on the house shot:
     - Lane: **16.9**, 5.3°
     - Ball: **17.4**, 4.4°, breakpoint 13.3
     - Targeting: **16.3**, 5.6°
     - The inputs may differ (factory surface, presets), but the screens don't say so.
   - First balls: Insights says "32 of 48". Bowler Card says "Strikes 68% … 50 first balls".
   - "Spare conversion: Level 4 of 5 (14/16 spares made (87.5%))." appears on both Bowler Card and Insights, with nested parentheses.
   - Session recap: "446 series over 2 games: right on your 223 average (446)." The 446 appears twice in one sentence, and again in the card title.
5. **Density isn't the problem; unfamiliar density is.**
   - The Session scoresheet shows 50 numbers on one screen. It still reads cleanly, because a bowling scoresheet is one familiar chunk to a bowler (expertise chunking; Chase & Simon).
   - Tonight (no league) is the model screen: 6 data numbers, 1 screen tall, the lowest entropy of any working screen (0.98).
   - The clutter is in model output, provenance sub-lines and inventory specs: RG/Diff on 22 balls in Armory (70 numbers in the catalog), 305 numbers on Patterns, and 14.5 screens of Guide. Reference lists may be long, but they should be search-first, with specs on a tap.

## 2. Top 10 recommended changes (not implemented; for the app workstream)

| # | Screen | Change | Rubric reason |
|---|---|---|---|
| 1 | Lane | Keep the verdict word ("Strike"), the 3 tiles (Entry/Angle/Break) and the stand/aim line. Move the "Model: …" and "Pin action: …" sentences behind the existing **How it works** link. Drop the numbers repeated between the verdict sentence and the tiles. | Caveats pass U for curious users, fail A. |
| 2 | Results, Tonight (league) | When the sample is small, show **counts, not rates or deltas**: "2 strikes on 2 first balls", not "100%, up 33.3 points". Use the app's existing sample/confidence rules to decide when a % or a delta is shown. Round to whole numbers. | A tiny-sample % fails A (law of small numbers); excess precision (Few). |
| 3 | Bowl (scoring) | During an open frame, show only the frame strip, pins, primary log buttons, the ball/stand chip, and the spare line **only when a spare is up**. Move "Then: Hy-Road Pearl…", the "righty · strike stand 17" and "3-6-9 spare system" chips, and "Saved ✓" (use a transient toast or the strip itself) to between games or behind the ball chip. Fix the chip overlap. | Nothing extra during scoring; one-handed use. |
| 4 | All | Keep **one source of truth for speed/revs** (and similar inputs), with one consistent provenance word: *you reported* / *assumed* / *measured*. | Contradiction fails U. Flag for the de-personalization work: 300 vs 220 looks like a default leaking. |
| 5 | Bowler Card | Keep 4 outcome tiles (Average, Strikes, Single-pin spares, First-ball average). Move the **Speed · revs** tile (an input, not an outcome) into the Release section. Put the per-tile provenance sub-lines ("your scored games · 50 first balls") behind the existing **Sources and thresholds** section. Fix the double parentheses and round 87.5% → 88%. | Provenance is U-only. |
| 6 | Insights | Replace the "Your game" card (a duplicate of the Bowler Card headline) with just the **My Bowler Card** link. Align the first-ball denominators with the Card (48 vs 50). | Duplicates fail A the second time. |
| 7 | Tonight (league) | In "Your bag · Bring 3", each ball row shows its name, role chip and one reason. The performance stats ("100% pocket, 60% strikes, n=40"), the "app estimate (4 of 21 games)" chip and "2-D model · offset 7 assumed" go behind **More details**. Use one refresh threshold everywhere. | Model provenance is U-only; the role is A. |
| 8 | Ball | Keep "On House, your line", "Use when" and "Leave in the bag". Put the **RG, Differential, Core and Cover tiles** behind a "Specs" disclosure; they are for Compare and Armory. | Specs are U for enthusiasts but don't change tonight's shot. |
| 9 | Bag | Collapse **Ball status and care** (Brunswick targets, USBC Rule 18) by default, leaving one warning line when maintenance is due. Collapse "Left out (why not)" to a single "Why not the others? (7)" row, as on Tonight. Bag is 3.0 screens tall at 360 px. | Rules text is U-only until a ball is due. |
| 10 | Armory, Patterns, Guide, Export, Target | **Armory:** search and filter first; catalog rows show name + "fits" chip, with RG/Diff on tap or in Compare. **Patterns:** name + length on the row; ratio/volume on tap. **Guide:** search first (it already has search; consider collapsed sections). **Target:** show the 1-of-3 tour card on first visit only. **Export:** keep it dense, since it's a print document, but fix the horizontal overflow at 360 px and the truncated "Sh…" title. | Reference screens can be long if findable; per-row specs are U-only. |

The old team name still appeared (fixed in the 2026-10-31 de-brand) on the Export sheet and the Armory header in the live build. The other workstream is removing it; it's noted here only.

---

## 3. Method

- **Harness:** `tests/clutter/run_audit.py` (Python Playwright), run with `/workspace/pwenv/bin/python tests/clutter/run_audit.py --base https://majalen3.github.io/arsenal-pro-bowling/ --out /tmp/clutter`.
- **Data:** the production API (`**/arsenal-pro-api.onrender.com/**`) was **blocked and mocked** using the existing journey harness (`tests/journeys/lib.py`: MockAPI, `boot`, `seed_history`). The seeded bowler is right-handed, with two prior league nights and the clock set to Thu 2026-10-22 18:30.
- **Screens:** 19 routes, at viewports **360×780** and **414×896**. The Tonight (league) setup taps League; the Bowl setup starts a game, logs two strikes and taps pin 10, so a spare is up.
- **In-page census** (`tests/clutter/measure.js`), run for each screen and each top-level `.card`:
  - Numbers, split into **data** (metrics), **label** (pin numbers, 1..N ordinals) and **control** (numbers inside buttons/tabs). Only *data* numbers count as density, so the pin deck and frame headers don't inflate the counts.
  - Words, actions (buttons, links, tabs), distinct text colours, background colours, font sizes and font styles, above the fold and in total.
  - Document height in screens.
- **Image clutter** (`tests/clutter/imgclutter.py`, numpy only), run on the above-the-fold screenshot:
  - **Subband entropy:** an approximation of Rosenholtz et al. 2007, using CIELab and a 3-level Haar wavelet, with entropy weighted L 0.84 / a 0.08 / b 0.08.
  - **Edge density:** the share of Sobel gradients above 0.08, a proxy for Mack & Oliva.
  - These numbers rank this app's screens against each other only. They are not calibrated to Rosenholtz's published scale.
- **Scoring:** each data line on each screen was read and scored U/A by hand against the owner's rubric (Section 5).
- **Limits:**
  - One seeded profile.
  - A dark theme only.
  - Counts are heuristics (a "data number" is any numeric token outside a label or control context).
  - No bowlers were tested. The behaviour evidence is published research, product documentation and labelled anecdotes.
- **Raw results:** `tests/clutter/results-2026-10-31.json`. Screenshots (above the fold, 360 px) are in `docs/clutter-img/`.

## 4. Screen table (360×780)

"Data" counts are data numbers above the fold / total. "Actions" are above the fold / total. "Screens" is document height ÷ viewport height. SE is subband entropy and ED is edge density, both above the fold. Higher means more cluttered.

| Screen | Data | Actions | Words | Screens | Font styles (fold) | SE | ED | Verdict |
|---|---|---|---|---|---|---|---|---|
| Tonight | 6/6 | 11/11 | 43 | 1.0 | 7 | 0.98 | 0.068 | Model screen |
| Tonight (league) | 16/23 | 15/20 | 109 | 1.48 | 8 | 1.40 | 0.093 | Trim bag card |
| **Bowl (scoring)** | 14/15 | 22/26 | 81 | 1.37 | **13** | 1.48 | 0.080 | **Extras during scoring** |
| **Results** | 14/14 | 13/13 | 47 | 1.0 | 8 | 1.25 | 0.074 | **Small-sample headline** |
| Session | 50/50 | 7/10 | 70 | 1.44 | 8 | 1.64 | 0.104 | Dense but familiar; fix recap |
| **Bowler Card** | 21/21 | 4/11 | 79 | 1.83 | 8 | 1.42 | 0.100 | **Provenance sub-lines, input tile** |
| Bag | 5/18 | 18/39 | 243 | **3.0** | 8 | 1.50 | 0.095 | Collapse care card |
| Armory | 20/92 | 16/95 | 544 | **8.1** | 9 | 1.53 | 0.093 | Specs per row |
| Ball | 10/12 | 7/9 | 109 | 2.03 | 10 | 1.41 | 0.090 | Specs behind tap |
| Compare (empty) | 0/0 | 4/4 | 23 | 1.0 | 4 | 0.61 | 0.037 | Clean |
| Insights | 17/17 | 6/6 | 58 | 1.0 | 8 | 1.36 | 0.092 | Duplicate card |
| Export (print sheet) | 68/84 | 4/4 | 292 | 1.55 | **15** | 1.80 | **0.180** | OK for print; overflow at 360 |
| Learn | 0/0 | 10/10 | 51 | 1.0 | 6 | 1.22 | 0.069 | Clean |
| Guide (= Glossary) | 3/17 | 17/126 | 493 | **14.5** | 6 | 1.33 | 0.080 | Reference: search first |
| Patterns | 37/305 | 18/70 | 383 | 5.5 | 6 | 1.65 | 0.114 | Ratio/volume on tap |
| Me | 6/10 | 11/25 | 213 | 2.32 | 7 | 1.42 | 0.081 | OK (settings) |
| **Lane** | **19/30** | 18/23 | 104 | 1.56 | **13** | **2.13** | 0.126 | **Most cluttered** |
| Target | 12/35 | 16/22 | 180 | 2.29 | 9 | 1.67 | 0.124 | Tour card first-run only |

At 414×896 the ranking is the same. Lane is still highest (SE 2.13), followed by Export (1.80), Target (1.63), Patterns (1.58) and Session (1.55). Tonight is lowest of the working screens (0.82).

### Worst offenders (screenshots in `docs/clutter-img/`)

- `lane-360.jpg`: three model sentences next to the pin deck, 3 tiles, a 5-ball chip row and 3 condition chips.
- `bowl-360.jpg`: chips overlapping the spare line, and the "Then:" line above the pins.
- `results-360.jpg`: "Strikes: 100%, up 33.3 points" after 2 balls.
- `card-360.jpg`: double parentheses, 5 tiles each with a provenance sub-line, and the speed/revs tile saying 220 rpm while Me says 300.
- `tonight-league-360.jpg`: the bag card with app-estimate and model chips.
- `bag-360.jpg`, `target-360.jpg`, `export-360.jpg`, `armory-360.jpg` and `session-360.jpg` for reference. `tonight-360.jpg` is the clean baseline.

## 5. Per-screen keep / behind a tap / cut

Elements already behind a disclosure are not listed.

| Screen | Keep (U + A) | Behind a tap (U only) | Cut (fails both or duplicate) |
|---|---|---|---|
| Tonight | Event chooser, "Start with: ball, feet 17, aim 10½", Start bowling | "2-D model · offset 7 assumed" chip | — |
| Tonight (league) | Ball name + role chip ("Start ball", "If it hooks early"), Pack these 3, refresh-due warning (one threshold) | "100% pocket, 60% strikes… n=40", "app estimate (4 of 21 games)", "Level 3 vs demand 3" | Second copy of stand/aim if shown twice |
| Bowl (scoring) | Frame strip, pins, log buttons, ball + stand/aim chip, spare line when a spare is up | "Then: Hy-Road Pearl if it hooks early", "3-6-9 spare system" chip, "righty · strike stand 17" chip | "Saved ✓ frame 2" as a persistent line (use a transient confirmation) |
| Results | Night list (date · games · avg · series), Full recap, Fix a frame | — | "Strikes: 100%, up 33.3 points" while the sample is tiny (show the count instead) |
| Session | Scoresheet (familiar gestalt), "Next focus: the 10 pin, 2 of 3", Make this my next focus | "10 pin alone on 3 of 24 first balls", first-ball/spare tiles | The duplicate "(446)" in the recap sentence |
| Bowler Card | Spare level headline (rounded), drill line, 4 outcome tiles | Tile provenance sub-lines, Speed·revs tile (→ Release), sources | Nested parentheses |
| Insights | Last 4 games line, first-ball strikes, spares made, "Why, and what to try" | "4 games, 4 scored ball by ball; practice nights left out." | "Your game" duplicate of the Card headline (keep the link) |
| Ball | On House, your line (verdict, entry, breakpoint); Use when; Leave in the bag; where-is-it chooser | RG, Differential, Core, Cover, Factory finish tiles | — |
| Bag | Where & lanes; Your bag for tonight; Pack these 3 | "Why not" list (one row), Ball status and care detail | — |
| Lane | Verdict word, Entry / Angle / Break tiles, stand/aim, Missed Left/High/Light/Right adjustments | "Model: deflects 17°…", "Pin action: approximate 2-D model…", Rule of 31 line, oil zone labels | Numbers repeated in the verdict sentence and the tiles |
| Target | Feet/eyes steppers, the move instruction ("Move feet 2 right, eyes 2 right") | Model-after-move numbers, rule/source text, tour (first run only) | Repeated "your profile" chips once provenance is unified |
| Armory | Search/filter, ball name, "In my bag" state, "fits tonight" chip | RG/Diff per row, "Why not" reasons | — |
| Patterns | Name, length (ft), filter by length | Ratio, volume (ml), source line | — |
| Guide | Search, term → plain answer | Sources per term (already per term) | — |
| Me | Profile line (single source of truth for speed/revs) | Appearance, Sync & backup, About | — |
| Export | Whole sheet (print artefact) | — | The team header (other workstream) |

## 6. What the research says about density

These are guidelines with sources, not caps. The rubric decides; the research explains why the rubric works.

**Working memory and chunks.**
- Cowan (2001) puts the central capacity limit at about **4 chunks** and calls Miller's "7 ± 2" a rough estimate and rhetorical device.
  - https://doi.org/10.1017/S0140525X01003922 (PDF: https://memory.psych.missouri.edu/assets/doc/articles/2001/cowan-bbs-2001.pdf)
  - Miller 1956: https://doi.org/10.1037/h0043158
- What counts as a chunk depends on expertise. Chess masters recall real positions in larger familiar chunks, and the advantage disappears for random positions (Chase & Simon 1973): http://matt.colorado.edu/teaching/highcog/readings/cs73.pdf
- So a bowling scoresheet is one chunk to a bowler. Model outputs ("deflects 17°", "offset 7 assumed") are several unfamiliar ones.

**Visual clutter.**
- Rosenholtz, Li & Nakano (2007) measure clutter through **feature congestion**: too many colours, sizes and shapes "clamoring for attention".
- They find that **organization and redundancy reduce it**, and that edge density tracks it.
  - https://doi.org/10.1167/7.2.17 and https://persci.mit.edu/research/clutter/
- This is why Lane (13 font styles, 10 colours above the fold) scores highest here.

**Cognitive load.**
- NN/g separates intrinsic load (the information itself) from extraneous load ("different font styles that don't convey any unique meaning").
- It advises avoiding visual clutter and offloading tasks such as remembering and deciding.
  - https://www.nngroup.com/articles/minimize-cognitive-load/
  - https://www.nngroup.com/articles/working-memory-external-memory/

**Progressive disclosure.**
- Show the few most important things first and the specialised ones on request.
- This improves learnability, efficiency and error rate, and "the very fact that something appears on the initial display tells users that it's important" (Nielsen): https://www.nngroup.com/articles/progressive-disclosure/
- On mobile, defer secondary content: https://www.nngroup.com/articles/defer-secondary-content-for-mobile/
- Accordions add interaction cost, so use them for secondary material, not for what most people need: https://www.nngroup.com/articles/accordions-complex-content/

**Cards.**
- NN/g: a card is "a container for a few short, related pieces of information", a short linked representation of something fuller: https://www.nngroup.com/articles/cards-component/
- Material 3: cards should be "easy to scan for relevant and actionable information". It also says "Don't force content into cards when spacing, headlines, or dividers would create a simpler visual hierarchy": https://m3.material.io/components/cards/guidelines

**Dashboards and glance screens.**
- Stephen Few defines a dashboard as the most important information "consolidated and arranged on a single screen so the information can be monitored at a glance".
- His Common Pitfalls paper lists #1 *Exceeding the boundaries of a single screen* and #3 *Displaying excessive detail or precision*: https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf
- Length and position encodings are the most accurately read: https://www.nngroup.com/articles/dashboards-preattentive/

**Small samples.**
- People treat small samples as if they were representative (Tversky & Kahneman 1971, "Belief in the law of small numbers"): https://doi.org/10.1037/h0031322
- A "100%, up 33.3 points" headline after two balls invites exactly that error.

**Choices.**
- Hick's law argues for fewer choices when response time matters, and for highlighting the recommended one: https://www.oreilly.com/library/view/laws-of-ux/9781098146955/ch04.html
- But a CHI 2020 review warns that it is often over-applied and that visual search matters more: https://doi.org/10.1145/3313831.3376878
- A meta-analysis of 50 choice-overload experiments (N = 5,036) found a mean effect of virtually zero (Scheibehenne et al. 2010): https://academic.oup.com/jcr/article/37/3/409/1821130
- Implication: cut for **relevance** (the rubric), not to hit a count.

**Motivation (SDT).**
- Self-determination theory names autonomy, competence and relatedness (Ryan & Deci 2000): https://doi.org/10.1037//0003-066x.55.1.68
- "Level 4 of 5" with a drill supports competence. Letting the bowler choose which tiles appear (as Apple Fitness, Garmin and WHOOP do) supports autonomy.
- In an activity-tracker field study, glanceable feedback built into routine checks raised engagement (Gouveia et al., UbiComp 2016): https://doi.org/10.1145/2971648.2971754

**One-handed use.**
- In 1,333 observations, 49% of people held the phone one-handed (Hoober 2013): https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php
- At the lane, the other hand often holds a towel or ball, which supports a short Bowl screen with big targets. That last point is an inference, not a study.

### Derived guidance for Arsenal Pro

1. **Glance screens** (Tonight, Bowl, Results top card, Bowler Card front) should fit one screen and lead with the few things the bowler acts on. In practice the comparable apps settle on 3–4 lead items: WHOOP's 3 dials, Apple's 3 rings, Arccos's 4 strokes-gained facets. That convergence matches Cowan's ~4 chunks. Treat it as a pattern to check against, not a cap.
2. **Familiar formats may be dense.** The scoresheet, frame strip and pin deck carry many numbers but are single chunks to bowlers.
3. **Unfamiliar model output gets one line plus a tap.** Show the result in bowler words ("Light by 1.2 boards; move feet 2 right") and put the model and its caveats behind "How it works". Keep an "estimate" marker on modelled numbers so they are not over-trusted.
4. **Counts before rates while samples are small; whole numbers; no deltas on tiny samples.**
5. **Say a fact once,** on the screen where it changes a decision, and link to it from elsewhere. Use one source of truth for inputs.
6. **During scoring, nothing extra:** scoring controls plus the one piece of advice for the ball being thrown.
7. **Reference and inventory screens may be long** if they are search- and filter-first, with specs on a tap.

## 7. What comparable apps do

These are taken from product documentation; marketing claims are labelled as such.

- **WHOOP:**
  - Three fixed dials (Sleep, Recovery, Strain) at the top of Home, each tapped for a deep dive, with a customizable dashboard below.
  - The 2025 redesign moved long-term metrics to a Health tab "so the Home screen stays focused on today". Metrics can be hidden.
  - https://www.whoop.com/us/en/thelocker/the-all-new-whoop-home-screen/
- **Apple Fitness:**
  - Activity rings up top (Move, plus Exercise and Stand with a Watch); tap the rings for details.
  - Users can add, edit, move and delete the summary metrics.
  - Trends start only after 180 days of data, a built-in minimum-sample rule.
  - https://support.apple.com/guide/iphone/see-your-activity-summary-iph4c34a8a95/ios
- **Garmin Connect:**
  - "My Day" shows today's stats in "easily digestible cards" that users customize. Tap a card for details or Reports for longer trends.
  - https://www.garmin.com/en-MY/blog/general/unlocking-the-potential-of-garmin-connect/
  - Forum on editing My Day: https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-mobile-andriod/263826/edit-my-day-options
- **Strava (run activity page):**
  - A persistent, collapsible summary. Deeper analysis (pace, heart rate, segments, laps) sits in a navigation panel, and values link to glossary definitions.
  - https://support.strava.com/en-us/articles/15401883-run-activity-pages
- **Arccos Golf:**
  - The round card shows course/date, score vs par, strokes vs goal, FWY%/GIR%/UP&DN%/Putts and a 4-facet strokes-gained bar.
  - Tap **Stats** for the scorecard plus 7 swipeable stat cards, then a practice focus.
  - https://support.arccosgolf.com/hc/en-us/articles/50226886161428-How-Do-I-View-My-Round-Stats
  - Arccos marketing says the analytics are "as advanced, or as simple as you like", and an ambassador quote says tour benchmarks are "overwhelming if you're a 20 handicap" (marketing): https://www.arccosgolf.com/pages/strokes-gained-analytics
- **18Birdies:**
  - The round summary shows a condensed scorecard with "View Full Scorecard"; benchmarks and hole insights sit behind "More Stats".
  - https://help.18birdies.com/article/32-round-summary
- **LaneTalk (bowling):**
  - Stats live under Profile: strike %, spare %, most common leaves.
  - The default is the last 30 games; filters are a Pro feature.
  - https://lanetalk.com/faq/ and flyer https://lanetalk.com/wp-content/uploads/2022/05/Flyer_get-started-with-lanetalk.pdf
- **Kegel Specto (pro/coach tracking):**
  - Reports arrows, breakpoint board and distance, and entry board at 59.5 ft (pocket 16.5–17.5), plus launch speed. RPM is shown "only as a reference point".
  - https://www.spectobowling.com/data-points
  - The 2019 report moved to impact angle and an accuracy score combining 4 locations: https://www.spectobowling.com/specto-ranking-report-dec-2019
- **Ruby (sensor):**
  - The app is organised as Stats / Sessions / Trends: https://apps.apple.com/us/app/ruby-bowling/id6762580021
- **Hudl:**
  - Stats reports in which underlined metrics open the matching video, so the detail is a tap away. This is per Hudl's support article, which timed out on fetch, so it was not re-verified: https://support.hudl.com/s/article/stats-reports-hudl-v3

## 8. What bowlers say they use

These are anecdotes: individual reviews and posts, not representative samples.

- **Stats bowlers ask for:**
  - BowlReport's "which stats matter most" table lists average, strike %, spare and single-pin % (90%+ is expected of competitive bowlers), clean-game % and pocket %: https://www.bowlreport.com/advanced-statistics-terminology/
  - Reddit post bodies (comments could not be retrieved) ask for average, strike %, spare %, split %, Brooklyn % and 10-pin %: https://www.reddit.com/r/Bowling/comments/4gewec/
  - A 210-average bowler asks for spare % goals: https://www.reddit.com/r/Bowling/comments/9twk9m/
- **LaneTalk App Store reviews** (https://apps.apple.com/us/app/lanetalk-bowling/id493763132?see-all=reviews):
  - One reviewer "only wanted to see a recap of the current week and the previous week to compare".
  - Another wants first-game average, clean games and 10-pins left vs picked up, and calls stats filtering clunky.
- **Aggregated negative LaneTalk reviews** (https://appsupports.co/493763132/lanetalk-bowling/negative-reviews):
  - Stats "have no explanation on how they calculate".
  - A subscription pop-up every minute during live scoring.
  - Constant ads.
  - Another reviewer valued the spare ratio and pocket-hit ratio.

**Read-across:**
- Bowlers use a short, stable set: average, strikes, spares and single pins (especially the 10), pocket %, and week-over-week.
- They want an explanation available, behind a tap, not on the face.
- They punish interruptions during live scoring.
- Arsenal Pro already computes most of this. The clutter comes from showing provenance and model detail next to it.

## 9. Reproduce

```bash
cd /workspace/arsenal-pro-bowling
/workspace/pwenv/bin/python tests/clutter/run_audit.py \
  --base https://majalen3.github.io/arsenal-pro-bowling/ --out /tmp/clutter
# single screens: add --only lane,bowl
```

Outputs: `/tmp/clutter/<viewport>/<screen>.json`, `.fold.png` and `.full.png`, plus `summary.json`. The production API is blocked by the harness's MockAPI route.
