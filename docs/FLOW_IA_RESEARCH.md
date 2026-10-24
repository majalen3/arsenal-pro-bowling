# Flow & IA research: lessons for Arsenal Pro (2026-10-24)

**Source labels:**
- **F** = page fetched and read this session.
- **S** = search-result excerpt only (paraphrased; verify before quoting).
- **repo** = this codebase or the live app.
- **A** = team judgement.

Where a full URL wasn't kept, the source is given as a domain or page name. Reddit blocks fetching, so Reddit items are S, paraphrased, with no usernames.

## A. Navigation & tabs
1. **Hidden navigation gets used far less.** NN/g's hamburger study found hidden nav used in 57% of cases vs 86% for visible or combo nav. Discoverability dropped by more than 20%, perceived difficulty was 21% higher, and mobile tasks were about 15% slower. NN/g advises showing the top ≤4 links visibly. (F, nngroup.com "Hamburger menus and hidden navigation hurt UX metrics")
   - *Lesson:* Glossary and Help sit behind More › scroll. That is the hidden-nav penalty, and it matches the owner's "can't find the ?".
2. **Tab bars are for navigation, not actions. Use fewer tabs, and avoid a More tab.** Apple: "The More tab makes it harder for people to reach and notice content." Keep the bar visible, use single-word labels, don't hide or disable tabs, and explain empty sections. (F, Apple HIG Tab bars, developer.apple.com …/human-interface-guidelines/tab-bars)
   - *Lesson:* six tabs ending in "More" is the anti-pattern. Go to five or fewer, and drop "More".
3. **Use 3–5 bottom destinations, ordered by frequency.** (S, Material Design 3 navigation bar; S, BBC GEL; S, Visa design system) Bottom-nav items must be destinations, not actions. (S, Material 1)
4. **IA and navigation are different things.** Card-sort the content by the user's mental model before drawing tabs. (S, NN/g "IA vs navigation"; card sorting)
   - *Lesson:* group by the bowler's moment (getting ready / bowling / after / gear / learning), not by data type (sessions, patterns, arsenal).
5. **Benchmark: WHOOP keeps "today" on Home and moved long-term metrics to their own tab** "so the Home screen stays focused on today". Today's 3 dials are on top, and you tap for the deep dive. Nav: Home, Health, Community, More, plus an action (+). (F, whoop.com The Locker, Home screen redesign)
   - *Lesson:* Tonight should answer *tonight*. Scoring and history are their own places.
6. **Benchmark: Strava nav is Home, Maps, Record, Groups, You.** "You" holds profile, activities, stats and gear. Recording is its own destination. (F, triathlete.com 2021 Strava redesign)
   - *Lesson:* recording (our scoring) gets its own focused destination. Profile and settings live under one "you" place.

## B. Disclosure, onboarding, help
7. **Progressive disclosure:** show the core and defer the secondary. Secondary content goes behind a tap, not below the fold of a 3-screen page. (S, NN/g progressive disclosure; S, NN/g "defer secondary content")
   - *Lesson:* Tonight is about 3.1 screens and Bag about 4.2. (repo audit)
8. **Training wheels:** a reduced first-use surface sped up first use (S excerpt: about 26% and 21% faster). It also made later advanced use about 52% faster. (S, NN/g "Training wheels")
9. **Onboarding should be fast, fun and optional.** Teach through interaction, prefer context-specific tips near the UI, keep an optional tutorial easy to find later (help or settings), postpone non-essential setup, and use reasonable defaults. (F, Apple HIG Onboarding)
   - *Lesson:* Welcome **Skip** silently leaves Right-handed. That is a default the user never saw. Show it ("Right-handed · change") where it matters.
10. **Recognition over recall:** keep options visible and labelled in the user's words. (S, NN/g)
11. **Sheets are for one simple task before you return to the parent.** Pair Done with Cancel, allow only one sheet at a time, and use a full-screen modal for complex multistep flows. (F, Apple HIG Sheets)
    - *Lesson:* change-ball, add-a-bowler and handedness are sheets. The bag builder is a full screen.

## C. Gear / "bag" models in sports apps
12. **18Birdies golf bag:**
    - The bag lives at Me › Golf Bag; add with + → type → brand/model → distance.
    - **Retire** keeps tracked shots and the club can be added back; **delete** is permanent.
    - The help article explicitly advises retiring clubs "if you rotate between different clubs depending on the course, weather".
    - There are no multiple bags yet (on their roadmap).
    - Recommendations depend on the bag being accurate, and their "why is it wrong" list says check the bag first.
    - True Distance = the last 10 shots minus the 2 longest and 2 shortest.
    (F, help.18birdies.com articles 63 and 791)
    - *Lesson:* one honest "what's in my bag" list drives the advice. Retire is not delete.
13. **Garmin Golf:** delete is permanent; Edit → **Active** toggle moves the club to an inactive list so it can come back. (F, Garmin forum staff reply)
14. **Arccos:**
    - Smart Distances exclude mishits and outliers, and users can exclude shots.
    - "Compare Clubs … active paired & unpaired clubs … optimize your bag composition"; "data-driven vs ego-driven club selection". (F, arccosgolf.com)
    - Unpair rather than delete, to keep history. (S)
15. **Strava gear:**
    - Found at You › Profile › Gear.
    - A **default gear per sport type**.
    - **Retired** gear stays listed but isn't offered for new activities; you must choose a new default before retiring.
    - You can change gear on a past activity via edit. (F, support.strava.com Gear)
    - *Lesson:* status = "is this offered to me now?", and it applies everywhere at once.
16. **PinPal (bowling):**
    - Archiving for leagues, balls, patterns and houses; archived items are hidden from pick lists unless shown, and in-use items can't be deleted.
    - A **default ball / house / pattern** that can be cleared.
    - Pin or score entry, with an option where pins default to knocked down.
    - Reviews praise logging a frame before the ball returns, and ask for ball change on spares.
    - Version 8.0.0 recently added lane tracking and Miss Analysis. (F, App Store listing)
17. **LaneLogic (bowling):**
    - Pin-by-pin in-game screen; "switch equipment mid-game with real ball chips".
    - On-device "What Should I Throw" recommendations.
    - Frames since last service, and a service log.
    - A swipe-away Coach's Whisper tip, a Lane Sheet, Calendar/History, and Practice and Spare Drill modes.
    - Baker with a lineup optimiser; offline-first; export free on every plan. (F, lanelogic.net)
18. **LaneTalk:**
    - Tag games (league / tournament / practice, pattern, ball per game or per frame, season, center, lane, custom), then filter and "Compare Everything".
    - The arsenal sits under Home › Arsenal, with ball-vs-ball compare. (F, lanetalk.com/tag-games)
19. **Bowly:**
    - Pin-by-pin "under 5 seconds per frame" or quick-score mode.
    - A session recap with a plain-English insight ("Your 10-pin conversion cost you 12 pins tonight."), plus mid-session recaps.
    - Edit frames from past sessions.
    - Dark theme, big buttons, offline, no account. (F, App Store listing)

## D. Bowling domain (bag composition)
20. **Bag sizes:** most league bowlers need 2–3 balls (stronger, medium/benchmark, plastic spare); tournament bowlers need 4–6. (F, bowling.com FAQ)
21. **Arsenal guide:** (F, bowlingballvideos.com arsenal guide)
    - Throw the **benchmark first in practice**. If it hooks too much, go weaker; if too little, go stronger.
    - A 3-ball bag = medium-heavy + benchmark + spare; 4 adds a medium-light ball; 6 covers the spectrum.
    - **Avoid overlap** (same cover, RG and diff) and don't stack aggressive balls. Plan for game 1 vs game 3.
    - "Most league bowlers use 2-3 balls per night."
22. **League bowlers bring about 3 balls,** start practice with the expected game-1 ball, and switch only when the reaction says so. (S, r/Bowling threads, paraphrased)
    - *Lesson:* the builder's language should be **"start ball / if it hooks early / if it stops hooking / spares"**, not "Lvl 5 × Angular".

## E. Decision science & explanation
23. **Defaults are powerful.** Opt-out roughly doubled organ-donor consent. They carry ethical weight, so make them visible and easy to change. (S, Johnson & Goldstein 2003, *Science*, "Do defaults save lives?")
    - *Lesson:* a suggested bag is a default. Show it as "suggested", with Swap one tap away (autonomy).
24. **Choice overload is real but moderated** by set complexity, task difficulty, preference uncertainty and the decision goal. (S, Chernev, Böckenholt & Goodman 2015 meta-analysis)
    - *Lesson:* a 22-ball wall plus a 5×3 grid plus 10 checks is high-complexity. Show 3 picks + reasons, and leave the rest behind a tap.
25. **Explanations have seven aims** (transparency, scrutability, trust, effectiveness, persuasiveness, efficiency, satisfaction), and these can conflict. (S, Tintarev & Masthoff)
26. **Explainable-AI guidance:** explanations should be accurate, visible, actionable, next to the recommendation and in plain language. (S, NN/g Explainable AI)
    - *Lesson:* one line of "why" per ball and one line of "why not" per left-out ball. The source chips ("Bowler's Review (F)") are for scrutiny and go behind a tap.

## F. Ergonomics
27. **Phone grip:** 49% one-handed, 36% cradled, 15% two-handed (1,333 observations). (S, Hoober 2013, UXmatters)
    - *Lesson:* primary scoring actions go in the bottom two-thirds. Rare settings can live top-right.
28. **Timing model (A):** KLM-style estimates of 1.3 s per tap, about 1.35 s mental prep and about 1.0 s per scroll. These are model estimates, not measurements. A frame needs ≤3 s, so it can't include a scroll.

## Top 10 lessons for this app (summary)
1. Use five or fewer visible tabs by moment, with no "More" tab (#2, #3, #4).
2. Learning (Guide + Glossary) must be visible, not buried (#1, #9).
3. Tonight answers tonight only: bag + start line. Scoring is its own focused screen (#5, #6, #7).
4. Use one ball **Status** that applies everywhere; retire is not delete (#12, #13, #15, #16).
5. Bag roles use bowler words: start / if it hooks early / if it stops hooking / spares (#20, #21, #22).
6. Show suggested defaults as suggestions, with one-tap Swap and a visible handedness default (#9, #23).
7. Show 3 picks, not 22 balls; the grid and checks go behind a tap (#24, #7).
8. One plain "why" per pick and one "why not" per left-out ball (#25, #26).
9. Ball change mid-game takes 2 taps with real ball chips, and is allowed on spares (#16, #17).
10. Recap first in Results, with a plain-English insight; editing past frames is easy (#19, #18).
