# Education research: Help bubbles, glossary and AI coach content

*Arsenal Pro, research pass 2026-10-24. Content only: `data/glossary.json` is **not** wired into the app. Prompt: `docs/TEAM_PROMPT_EDUCATION.md`.*

## 1. Scope, method and labels

**Goal.** This pass supplies content for three features:
- an optional **Help toggle** that shows "?" bubbles;
- a **searchable glossary** grouped into 7 trees;
- an optional **AI coach chat**, whose rules are in `docs/AI_COACH_CHAT_RULES.md`.

**What was researched:**
- Real questions bowlers ask, from r/Bowling search excerpts, coaching sites (USBC, USA Bowling, BowlVersity, National Bowling Academy, Kegel) and pro-shop or retailer guides (Dexter, BowlersMart, Storm, Motiv, bowling.com).
- The repo's own cited research, reused rather than redone:
  - `docs/FEATURE_DEMAND_RESEARCH.md` (USBC 3-6-9 table, Reddit demand);
  - `docs/TEAM_PROMPT_TARGETING.md` (move rules, drift, breakpoint, laydown);
  - `docs/ARSENAL_MANAGER_RESEARCH.md` (USBC ES Manual 03/26, Rule 18, Siefers ball-life study, brand maintenance intervals);
  - `docs/ENGINE_VERIFICATION_REPORT.md` (USBC Ball Motion Study);
  - `docs/DECISIONS.md` (#22 split and foul reading).

**Source labels** (used on every evidence item):

| Label | Meaning |
|---|---|
| **F** | Fetched and read in this pass (page or PDF text). |
| **S** | Search-engine excerpt, paraphrased. The page itself was not opened. **All Reddit items are S**: Reddit blocked the fetcher with a 403. No quotes or usernames are reproduced; thread URLs are given so a human can check them. |
| **A** | Assumption, stated as one. |
| **repo** | Taken from a repo doc, which keeps its own F/S label for the original source. |

**Skill levels** follow the prompt:
- **Beginner:** 1–3 seasons or an average under ~160.
- **Intermediate:** a league bowler confused by equipment, oil or style.
- **Advanced:** already knows the vocabulary.

"Level" means *who asks the question*, judged from who posts it (new bowler, league bowler or tournament bowler) and how the source frames it. It is not a measured statistic.

**House rules applied to the content:**
- No invented statistics, layouts or rules.
- Numbers that conflict between sources are shown side by side and kept out of bubbles.
- Bubbles use the app's coach voice: short, plain, numbers first. Each is at most 2 sentences.
- Directions are written for right-handers with the left-hand mirror noted where it matters.

**Headline findings**
1. **The most-asked beginner questions are about hook, aim and spares.**
   - The top ones are "why isn't my ball hooking", "where do I stand and aim", and "what spare system and ball should I use".
   - These map onto content the app already has (Tonight read buttons, Targeting, 3-6-9), so bubbles can sit right where the answer is.
2. **League bowlers are most confused by the equipment ladder, slide soles and the mid-session lane change.**
   - Equipment ladder: plastic → urethane → reactive; solid, pearl and hybrid covers; grit.
   - Slide soles: what the numbers mean, and why the slide changes from week to week.
   - Lane change: the burn, early hook, when to switch balls.
3. **Style questions are mostly "is it legal" and "is it better".**
   - The evidence supports neutral answers: two-handed is legal in USBC play and is a trade-off, and the 4-step is the most used approach at every level.
   - The single rule people trip on is "every hole must be gripped" (USBC ES Manual).
4. **Some numbers people want are not settled.** Entry-angle degrees, rev and speed "matching" numbers and RPM figures conflict between sources or come only from retailers, so they stay in the glossary at most.


## 2. Topic counts

| Tree | Topics | With bubble | Glossary only | High priority |
|---|---|---|---|---|
| Scoring & League Basics | 13 | 8 | 5 | 2 |
| Equipment — Balls | 21 | 18 | 3 | 11 |
| Equipment — Shoes, Approach & Accessories | 19 | 11 | 8 | 5 |
| Styles & Approaches | 15 | 8 | 7 | 5 |
| Lane & Oil | 12 | 9 | 3 | 4 |
| Ball Motion | 16 | 10 | 6 | 4 |
| Targeting & Spares | 10 | 8 | 2 | 7 |
| **Total** | **106** | **72** | **34** | **38** |

## 3. Full trees

Every topic has the eight requested fields. ⚠ marks weak evidence (see §7). "Placement" names the app screen the bubble would sit on (screens per docs/TEAM_PROMPT_PRODUCT_LOOP.md). It is a suggestion only; nothing is wired up.

### Tree 1: Scoring & League Basics (13 topics)

#### Strike scoring  `sc-strike`
- **Tree:** Scoring & League Basics
- **Skill level:** Beginner. People in their first seasons ask how the bonus works because the scorer does it for them.
- **Evidence:** Scoring rules agree across the IBF rules and USBC lingo (S). 'How does scoring work' threads come from new bowlers (S). Sources: [IBF Universal Playing Rules ch. 2 (scoring)](https://bowling.sport/universal-playing-rules-chapter-2) (S); [r/Bowling: how scoring works](https://www.reddit.com/r/Bowling/comments/mfcb9d/) (S); [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Strike = 10 + your next 2 balls. X then 7-2 = 19 for that frame.
- **Glossary:** A strike knocks down all 10 pins on the first ball. The frame scores 10 plus the pins from your next two balls.
- **Placement:** Bubble (Tonight › Quick log (frame strip / rack)) + Glossary
- **Priority:** Medium

#### Spare scoring  `sc-spare`
- **Tree:** Scoring & League Basics
- **Skill level:** Beginner. Same askers as strike scoring.
- **Evidence:** Same sources as strike scoring (S). Sources: [IBF Universal Playing Rules ch. 2 (scoring)](https://bowling.sport/universal-playing-rules-chapter-2) (S); [r/Bowling: how scoring works](https://www.reddit.com/r/Bowling/comments/mfcb9d/) (S)
- **Bubble:** Spare = 10 + your next 1 ball. A spare, then an 8 on the next ball = 18.
- **Glossary:** A spare is all 10 pins down using both balls of a frame. The frame scores 10 plus the pins from your next ball.
- **Placement:** Bubble (Tonight › Quick log (frame strip / rack)) + Glossary
- **Priority:** Medium

#### 10th frame  `sc-tenth`
- **Tree:** Scoring & League Basics
- **Skill level:** Beginner. New bowlers are often unsure whether they get a third ball.
- **Evidence:** Consistent across the scoring sources (S). Sources: [IBF Universal Playing Rules ch. 2 (scoring)](https://bowling.sport/universal-playing-rules-chapter-2) (S); [r/Bowling: how scoring works](https://www.reddit.com/r/Bowling/comments/mfcb9d/) (S)
- **Bubble:** Strike in the 10th = 2 more balls; spare = 1 more. That's 3 balls max.
- **Glossary:** The 10th frame gives bonus balls to finish the count: two after a strike, one after a spare. Otherwise it's two balls, like any frame.
- **Placement:** Bubble (Tonight › Quick log (frame strip / rack)) + Glossary
- **Priority:** Low

#### Foul  `sc-foul`
- **Tree:** Scoring & League Basics
- **Skill level:** Beginner. Beginners slide over the line and don't know what happens next.
- **Evidence:** PBA lingo (F) and the app's own rule in DECISIONS.md #22. Sources: [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F); [Repo: #22 split reading (USBC Rule 2h), first-ball foul respot](docs/DECISIONS.md) (repo)
- **Bubble:** Over the foul line = 0 for that ball. A foul on ball 1 gets you a fresh rack for ball 2.
- **Glossary:** Touching or crossing the foul line during a delivery. That ball scores zero. After a first-ball foul the pins are reset, so knocking all 10 down with ball 2 counts as a spare.
- **Placement:** Bubble (Quick log (– Miss / foul)) + Glossary
- **Priority:** Medium

#### Split  `sc-split`
- **Tree:** Scoring & League Basics
- **Skill level:** Beginner. Beginners and intermediates are often surprised that a 2-8 isn't a split.
- **Evidence:** The app uses the USBC Rule 2h reading (DECISIONS.md #22). PBA (F) lists the baby splits (2-7, 3-10), defines a sleeper (2-8, 3-9), and treats a washout (headpin standing) as not a split. Sources: [Repo: #22 split reading (USBC Rule 2h), first-ball foul respot](docs/DECISIONS.md) (repo); [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Split = headpin down, plus a gap between pins left standing. 3-10 and 2-7 count; 2-8 doesn't.
- **Glossary:** A leave after the first ball where the headpin is down and pins are standing with a gap between them, e.g. 7-10, 4-6, 3-10. A pin directly behind another (2-8, a 'sleeper') is not a split.
- **Placement:** Bubble (Quick log rack (split flag)) + Glossary
- **Priority:** Medium

#### Handicap  `sc-handicap`
- **Tree:** Scoring & League Basics
- **Skill level:** Beginner. Bowlers new to league ask how many pins they get and why.
- **Evidence:** USBC's rules-to-consider PDF (F): without a league rule, use 100%, and the base should be above the highest average. Repeated 'ELI5 handicap' threads (S). Sources: [USBC, Rules to consider (league handicap, averages, absentee)](https://images.bowl.com/bowl/media/assets/usbc/rules/general%20pdfs/060624_rules-to-consider-loh-06-01-2024.pdf) (F); [r/Bowling: handicaps ELI5](https://www.reddit.com/r/Bowling/comments/1b3iknh/handicaps_explain_it_like_im_5/) (S); [r/Bowling: how handicap is calculated](https://www.reddit.com/r/Bowling/comments/1jt5a6q/) (S)
- **Bubble:** Handicap = (base − your average) × the league %. Example only: 90% of 220 with a 170 average = 45 pins. Your league sets the base and %.
- **Glossary:** Pins added to your score so bowlers of different averages can compete. Each league sets its own base and percentage. USBC says to use 100% if the league has no rule.
- **Placement:** Bubble (Tonight › Quick log score total (handicap line)) + Glossary
- **Priority:** High (v1 bubble #7)

#### Average (entering / establishing)  `sc-average`
- **Tree:** Scoring & League Basics
- **Skill level:** Beginner. New league bowlers ask why their first night counts so much.
- **Evidence:** USBC rules-to-consider (F). Sources: [USBC, Rules to consider (league handicap, averages, absentee)](https://images.bowl.com/bowl/media/assets/usbc/rules/general%20pdfs/060624_rules-to-consider-loh-06-01-2024.pdf) (F)
- **Bubble:** Glossary only
- **Glossary:** Your total pins divided by games bowled. Leagues usually start you on last season's average. Without one, you establish it on your first night unless league rules say otherwise. USBC youth: switching between 2H and 1H means establishing a new average.
- **Placement:** Glossary only
- **Priority:** Medium

#### Scratch  `sc-scratch`
- **Tree:** Scoring & League Basics
- **Skill level:** Beginner. A term on league sheets.
- **Evidence:** PBA lingo (F). Sources: [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Glossary only
- **Glossary:** Scoring with no handicap added. A 'scratch league' or 'scratch tournament' uses raw scores only.
- **Placement:** Glossary only
- **Priority:** Low

#### Blind / absentee score  `sc-blind`
- **Tree:** Scoring & League Basics
- **Skill level:** Beginner. League sheets show it without explaining it.
- **Evidence:** USBC rules-to-consider (F): average − 10 by default. PBA lingo (F) describes a blind as simply the average. Sources differ, so the league rule decides. Sources: [USBC, Rules to consider (league handicap, averages, absentee)](https://images.bowl.com/bowl/media/assets/usbc/rules/general%20pdfs/060624_rules-to-consider-loh-06-01-2024.pdf) (F); [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Glossary only
- **Glossary:** The score credited for a missing bowler. USBC's default absentee score is the bowler's average minus 10 pins, unless the league rule says otherwise. Some glossaries describe it as just the average, so check your league's rules.
- **Placement:** Glossary only
- **Priority:** Low

#### Baker format  `sc-baker`
- **Tree:** Scoring & League Basics
- **Skill level:** Intermediate. League and tournament bowlers meet it in team events.
- **Evidence:** PBA lingo (F). GLDBA sheet and Reddit (S). Sources: [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F); [GLDBA Baker format sheet](https://www.gldba-gldwba.org/pdfs/baker.pdf) (S); [r/Bowling: what is Baker](https://www.reddit.com/r/Bowling/comments/1icshjn/) (S)
- **Bubble:** Glossary only
- **Glossary:** A team format where 5 bowlers share one game: bowler 1 bowls frames 1 and 6, bowler 2 bowls frames 2 and 7, and so on. Matches are often 2 Baker games of total pins, but formats vary by event.
- **Placement:** Glossary only
- **Priority:** Low

#### Approach etiquette  `sc-etiquette`
- **Tree:** Scoring & League Basics
- **Skill level:** Beginner. First-league bowlers worry about who goes first.
- **Evidence:** USBC Etiquette and Lingo (F). Sources: [USBC, Etiquette and Lingo](https://bowl.com/welcome/etiquette-and-lingo) (F)
- **Bubble:** If you and the bowler next to you are both ready, the one on the right goes first. Stay off the approach until it's your turn, and keep food and drink off it.
- **Glossary:** Courtesy rules: one bowler per pair of lanes at a time, and the bowler to the right goes first when in doubt. Celebrate on your own lane. No street shoes, food or drink on the approach. Be ready when it's your turn.
- **Placement:** Bubble (Welcome tour / Glossary) + Glossary
- **Priority:** Medium

#### Pocket  `sc-pocket`
- **Tree:** Scoring & League Basics
- **Skill level:** Beginner. Coaches and the app say 'pocket' constantly, so beginners need it.
- **Evidence:** PBA lingo (F). Sources: [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Pocket = between the 1 and 3 pins (right-handers) or the 1 and 2 (left-handers). It's the strike target.
- **Glossary:** The gap between the headpin and the 3 pin (RH) or the 2 pin (LH). Hitting it at an angle gives the best chance of a strike.
- **Placement:** Bubble (Tonight › Quick log (frame strip / rack)) + Glossary
- **Priority:** High

#### Brooklyn (crossover)  `sc-brooklyn`
- **Tree:** Scoring & League Basics
- **Skill level:** Beginner. Common slang.
- **Evidence:** PBA lingo (F): also called a 'Jersey'. Sources: [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Glossary only
- **Glossary:** A shot that hits the 'wrong' pocket, the 1-2 for a right-hander or the 1-3 for a left-hander.
- **Placement:** Glossary only
- **Priority:** Low

### Tree 2: Equipment — Balls (21 topics)

#### Ball weight  `eq-weight`
- **Tree:** Equipment — Balls
- **Skill level:** Beginner. One of the most common first-ball questions.
- **Evidence:** Repeated threads (S). The 10% rule appears in retailer FAQs (S). The 16 lb maximum is a known USBC spec, but the spec page wasn't fetched in this pass (S). Sources: [r/Bowling: 10% body weight rule](https://www.reddit.com/r/Bowling/comments/8zpdox/10_percent_body_weight_up_to_16_pounds_for_a_ball/) (S); [r/Bowling: what weight ball](https://www.reddit.com/r/Bowling/comments/1dz3w4j/what_weight_ball_should_i_use/) (S); [bowling.com, the 10% rule (retailer)](https://www.bowling.com/knowledge-hub/questions/bowling-balls/ball-weight-choice/question_24_what-is-the-10-rule-for-choosing-a-bowling-ball-weight) (S)
- **Bubble:** Pick the heaviest ball you can swing smoothly for a whole session, not the heaviest you can lift. 10% of body weight is only a rough starting point; 16 lb is the max.
- **Glossary:** Balls run up to 16 lb. Control and a free swing matter more than mass. Many adults land at 14–15 lb, but that's a pattern people report, not a rule.
- **Placement:** Bubble (Arsenal › ball detail and Add ball spec rows) + Glossary
- **Priority:** High (v1 bubble #19)

#### Plastic (polyester) ball  `eq-plastic`
- **Tree:** Equipment — Balls
- **Skill level:** Beginner. Most house balls are plastic, and beginners ask why they won't hook.
- **Evidence:** BowlVersity cover article (F). Spare-ball threads and retailer FAQ (S). Sources: [bowlingball.com BowlVersity, Solid vs pearl vs hybrid (retailer)](https://www.bowlingball.com/BowlVersity/simple-differences-between-solid-pearl-and-hybrid-bowling-balls) (F); [bowling.com, Choosing a spare ball (retailer)](https://www.bowling.com/knowledge-hub/questions/bowling-balls/choosing-a-spare-ball) (S); [r/Bowling: are spare balls worth it](https://www.reddit.com/r/Bowling/comments/u0l9ar/are_spare_balls_worth_the_money/) (S)
- **Bubble:** Plastic barely hooks, even on dry lanes. That's why it's the go-to spare ball.
- **Glossary:** The hardest, least grippy cover type. It goes nearly straight, which makes it ideal for corner-pin spares. Most house balls are plastic.
- **Placement:** Bubble (Arsenal › ball detail and Add ball spec rows) + Glossary
- **Priority:** Medium

#### Urethane ball  `eq-urethane`
- **Tree:** Equipment — Balls
- **Skill level:** Intermediate. League bowlers hear 'urethane is back' and don't know when to use it.
- **Evidence:** Lab result in the repo (F): urethane did not absorb oil, while reactive covers did. On-lane 'smooth, early, less backend' comes from search excerpts (S). Sources: [Repo: USBC ES Manual 03/26, Rule 18, Siefers ball-life study, brand maintenance intervals (F there)](docs/ARSENAL_MANAGER_RESEARCH.md) (repo); [r/Bowling: plastic or urethane for spares](https://www.reddit.com/r/Bowling/comments/1gm7mwx/should_i_get_a_plastic_or_urethane_ball_for_spares/) (S)
- **Bubble:** Urethane hooks earlier and more smoothly than reactive, with less backend snap. Useful when lanes are short, dry or tricky.
- **Glossary:** A mid-grip cover between plastic and reactive resin. It reads the lane early with a smooth, arcing motion and doesn't soak up oil like reactive covers.
- **Placement:** Bubble (Arsenal › ball detail and Add ball spec rows) + Glossary
- **Priority:** Medium

#### Reactive resin ball  `eq-reactive`
- **Tree:** Equipment — Balls
- **Skill level:** Beginner. The usual answer to 'how do I get it to hook'.
- **Evidence:** Repo (F): reactive covers absorbed oil in 4.7–6.95 min. Hook threads point beginners to an entry-level reactive (S). Sources: [Repo: USBC ES Manual 03/26, Rule 18, Siefers ball-life study, brand maintenance intervals (F there)](docs/ARSENAL_MANAGER_RESEARCH.md) (repo); [r/Bowling: ball won't hook (beginner)](https://www.reddit.com/r/Bowling/comments/18zk9zf/) (S); [r/Bowling: first ball to buy](https://www.reddit.com/r/Bowling/comments/19dig7r/) (S); [r/Bowling: first reactive ball](https://www.reddit.com/r/Bowling/comments/13f4fgk/) (S)
- **Bubble:** Reactive resin grips the lane more than plastic, so it hooks more. A drilled entry-level reactive is the usual first step for a hook.
- **Glossary:** The most common modern cover. It's porous and grippy, so it creates more hook and backend motion. It also absorbs oil over time, which is why it needs regular cleaning and maintenance.
- **Placement:** Bubble (Arsenal › ball detail and Add ball spec rows) + Glossary
- **Priority:** High

#### Spare ball  `eq-spareball`
- **Tree:** Equipment — Balls
- **Skill level:** Beginner. Often recommended as the second ball. Many people ask whether it's worth it.
- **Evidence:** Repeated threads (S) and a retailer FAQ (S). A retail blog (F) says two-handers almost always carry one. Sources: [r/Bowling: are spare balls worth it](https://www.reddit.com/r/Bowling/comments/u0l9ar/are_spare_balls_worth_the_money/) (S); [r/Bowling: plastic or urethane for spares](https://www.reddit.com/r/Bowling/comments/1gm7mwx/should_i_get_a_plastic_or_urethane_ball_for_spares/) (S); [bowling.com, Choosing a spare ball (retailer)](https://www.bowling.com/knowledge-hub/questions/bowling-balls/choosing-a-spare-ball) (S); [Bowling Addicts, Thumbless vs two-handed (retailer blog; RPM figures not verified)](https://www.bowlingaddicts.com/thumbless-vs-two-handed/) (F)
- **Bubble:** A plastic ball goes nearly straight, so corner pins (7 and 10) stop depending on the oil. Get the same weight and fit as your strike ball.
- **Glossary:** A second ball, usually plastic, used for spares. It takes the lane condition out of the shot. Commonly recommended as the second ball people buy.
- **Placement:** Bubble (Bag builder (#/bag) spare-ball slot) + Glossary
- **Priority:** High (v1 bubble #6)

#### Solid / pearl / hybrid  `eq-cover-types`
- **Tree:** Equipment — Balls
- **Skill level:** Intermediate. League bowlers buying a second or third ball get stuck here.
- **Evidence:** BowlVersity (F): solids have more microscopic pores and are typically matte, for heavier oil. Pearl's mica gives longer skid and a quicker reaction at friction. Hybrid sits between them. Sources: [bowlingball.com BowlVersity, Solid vs pearl vs hybrid (retailer)](https://www.bowlingball.com/BowlVersity/simple-differences-between-solid-pearl-and-hybrid-bowling-balls) (F)
- **Bubble:** Solid = earlier, smoother, made for more oil. Pearl = longer skid and a sharper reaction at the dry backend. Hybrid = in between.
- **Glossary:** The three common reactive cover families. Surface prep changes all of them, so a sanded pearl can act like a hybrid.
- **Placement:** Bubble (Add ball spec rows (cover)) + Glossary
- **Priority:** High (v1 bubble #8)

#### RG (radius of gyration)  `eq-rg`
- **Tree:** Equipment — Balls
- **Skill level:** Intermediate. Spec sheets show RG and the app displays specs, but few people know what it means.
- **Evidence:** PBA (F): RG is how fast the ball begins to rotate. Retailer and USBC core paper (S). Retail pages disagree on which oil each RG suits, so this entry doesn't map RG to oil. Sources: [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F); [bowling.com, What do RG and differential mean (retailer)](https://www.bowling.com/knowledge-hub/questions/bowling-balls/ball-cores/question_173_what-do-rg-and-differential-mean-in-bowling-ball-cores) (S); [USBC, Core properties paper (not fetched)](https://images.bowl.com/bowl/media/legacy/internap/bowl/equipandspecs/pdfs/CoreProperties042207.pdf) (S); [r/Bowling: what do RG and diff mean](https://www.reddit.com/r/Bowling/comments/8xss9u/) (S)
- **Bubble:** Lower RG revs up sooner; higher RG skids longer before it turns. It's one factor; the cover usually matters more.
- **Glossary:** A measure of where the core's mass sits. Low RG means mass near the center, so the ball revs up sooner. High RG means mass toward the cover, so it gets more length.
- **Placement:** Bubble (Add ball spec rows / RG-diff chart) + Glossary
- **Priority:** High

#### Differential  `eq-diff`
- **Tree:** Equipment — Balls
- **Skill level:** Intermediate. Same as RG. Shown on every spec sheet.
- **Evidence:** Retailer FAQs and the USBC core paper (S). The flare definition is from PBA (F). Sources: [bowling.com, What do RG and differential mean (retailer)](https://www.bowling.com/knowledge-hub/questions/bowling-balls/ball-cores/question_173_what-do-rg-and-differential-mean-in-bowling-ball-cores) (S); [USBC, Core properties paper (not fetched)](https://images.bowl.com/bowl/media/legacy/internap/bowl/equipandspecs/pdfs/CoreProperties042207.pdf) (S); [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Higher differential = more flare = more hook potential. Low differential = smoother and more controllable.
- **Glossary:** The gap between a core's highest and lowest RG. It tells you how much the ball can flare (migrate its track), which drives hook potential.
- **Placement:** Bubble (Add ball spec rows / RG-diff chart) + Glossary
- **Priority:** High

#### Symmetric vs asymmetric core ⚠  `eq-asym`
- **Tree:** Equipment — Balls
- **Skill level:** Intermediate. A frequent 'what's the difference' question.
- **Evidence:** Storm anatomy guide, retailer FAQs (S). Sources: [Storm, Ball anatomy guide](https://www.stormbowling.com/ball-anatomy-guide) (S); [bowling.com, What do RG and differential mean (retailer)](https://www.bowling.com/knowledge-hub/questions/bowling-balls/ball-cores/question_173_what-do-rg-and-differential-mean-in-bowling-ball-cores) (S)
- **Bubble:** Asymmetric cores tend to look more angular at the breakpoint; symmetric cores tend to be smoother and more predictable.
- **Glossary:** Symmetric cores have matching RG on two axes. Asymmetric cores add an intermediate differential and a PSA (preferred spin axis), which gives the driller more options and usually a sharper motion.
- **Placement:** Bubble (Arsenal › ball detail and Add ball spec rows) + Glossary
- **Priority:** Medium

#### Cover vs core: which matters more  `eq-cover-dominance`
- **Tree:** Equipment — Balls
- **Skill level:** Intermediate. Intermediates often shop by core numbers.
- **Evidence:** USBC Ball Motion Study (F, via repo): 'top 5 factors affecting the ball path are related to coverstock'. Sources: [Repo: USBC Ball Motion Study (top 5 path factors are coverstock-related, F there)](docs/ENGINE_VERIFICATION_REPORT.md) (repo)
- **Bubble:** USBC found that the top 5 factors in a ball's path are all about the coverstock. Cover and surface usually matter more than core numbers.
- **Glossary:** USBC's Ball Motion Study ranked cover roughness, on-lane friction, oil absorption and similar cover properties ahead of core numbers. Low RG was among the significant factors.
- **Placement:** Bubble (Arsenal › ball detail and Add ball spec rows) + Glossary
- **Priority:** Medium

#### Surface / grit  `eq-surface`
- **Tree:** Equipment — Balls
- **Skill level:** Intermediate. League bowlers hear '1000 vs 3000' and don't know which way is stronger.
- **Evidence:** Storm burn article (F): 2000 and 4000 grit add length. NBA test (F). A surface video says 500–1000 adds traction (S). Sources: [Storm, Cracking the code of the burn (manufacturer)](https://www.stormbowling.com/read/cracking-the-code-of-the-burn) (F); [National Bowling Academy x Creating the Difference, Lane shine test (vendor-run, one ball)](https://www.nationalbowlingacademy.com/video/lane-shine-important-017681) (F); [National Bowling Academy, Surface adjustments](https://www.nationalbowlingacademy.com/video/ball-reaction-surface-adjustments-016738) (S)
- **Bubble:** Lower grit (500–1000) = more friction and an earlier hook. Higher grit or polish (2000+) = more length and a sharper backend.
- **Glossary:** The texture of the cover, set by sanding pads (numbered grits) or polish. It's one of the easiest ways to change a ball's reaction without changing the ball.
- **Placement:** Bubble (Lane surface chip / Log service grit field) + Glossary
- **Priority:** High (v1 bubble #17)

#### Lane shine ⚠  `eq-laneshine`
- **Tree:** Equipment — Balls
- **Skill level:** Intermediate. People notice their ball 'quit' after a few games.
- **Evidence:** One vendor-run test (F, NBA/CtD): a 2500-grit ball read about 4300 after 13 shots that never touched the lane. Reddit says shine shows within 3–6 games (S, via repo). Sources: [National Bowling Academy x Creating the Difference, Lane shine test (vendor-run, one ball)](https://www.nationalbowlingacademy.com/video/lane-shine-important-017681) (F); [Repo: USBC ES Manual 03/26, Rule 18, Siefers ball-life study, brand maintenance intervals (F there)](docs/ARSENAL_MANAGER_RESEARCH.md) (repo); [r/Bowling: polish vs lane shine](https://www.reddit.com/r/Bowling/comments/1can4oo/polish_vs_lane_shine/) (S); [r/Bowling: lane shine](https://www.reddit.com/r/Bowling/comments/1faguv9/lane_shine/) (S)
- **Bubble:** One test: a 2500-grit ball read about 4300 after 13 shots, without touching the lane. Shine means longer skid and a later hook.
- **Glossary:** The cover getting smoother from use, partly from the ball return. Re-sanding to your chosen grit restores the surface. Rule 18 says do it before competition, not during.
- **Placement:** Bubble (Arsenal › ball health counts) + Glossary
- **Priority:** Medium

#### Ball fit (span, pitch, thumb)  `eq-fit`
- **Tree:** Equipment — Balls
- **Skill level:** Beginner. A common complaint is thumb soreness or having to squeeze the ball.
- **Evidence:** Repeated threads and retailer article (S). Kept non-medical. Sources: [r/Bowling: fit advice](https://www.reddit.com/r/Bowling/comments/13vb69a/fit_advice/) (S); [r/Bowling: thumb issues](https://www.reddit.com/r/Bowling/comments/1l81k8r/thumb_issues/) (S); [bowlingball.com, Your thumb hole is too big (retailer)](https://www.bowlingball.com/BowlVersity/grip-pressure-your-thumb-hole-is-too-big-) (S)
- **Bubble:** If you have to squeeze to hold the ball, the fit is off. A pro shop can fix span, pitch or thumb size; tape is a short-term patch.
- **Glossary:** How the holes match your hand: span (distance between holes), pitch (hole angles) and hole size. A good fit lets you hold the ball with a relaxed grip.
- **Placement:** Bubble (Arsenal › ball detail and Add ball spec rows) + Glossary
- **Priority:** High (v1 bubble #18)

#### Conventional vs fingertip grip  `eq-grip`
- **Tree:** Equipment — Balls
- **Skill level:** Beginner. Explains why a house ball won't hook.
- **Evidence:** PBA lingo (F). Hook threads (S). Sources: [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F); [r/Bowling: ball won't hook (beginner)](https://www.reddit.com/r/Bowling/comments/18zk9zf/) (S); [r/Bowling: how to hook (beginner)](https://www.reddit.com/r/Bowling/comments/1hdpcbn/) (S)
- **Bubble:** Conventional = fingers in to the 2nd knuckle (house balls). Fingertip = in to the 1st joint, giving more rotation; it's the usual drill for a reactive ball.
- **Glossary:** Two finger-hole styles. Conventional grips are harder to hook. Fingertip lets the fingers stay in longer for more rotation.
- **Placement:** Bubble (Arsenal › ball detail and Add ball spec rows) + Glossary
- **Priority:** High

#### Cleaning (and Rule 18)  `eq-cleaning`
- **Tree:** Equipment — Balls
- **Skill level:** Intermediate. People ask what's legal during league and what cleaner to use.
- **Evidence:** USBC Rule 18 (F, via repo): no liquid cleaner, abrasive or foreign material during competition. USBC approved cleaners list (F): rubbing alcohol, Simple Green Original, Windex. USBC Fundamentals (F). Sources: [USBC Playing Rules 2025-26, Rule 18 (fetched for docs/ARSENAL_MANAGER_RESEARCH.md)](https://bowl.com/getmedia/64039e31-a0bb-42f1-94cb-81cb3b5fe6e9/USBC_Playing_Rules_2025_2026.pdf) (repo); [USBC approved cleaner list (rubbing alcohol, Simple Green Original, Windex)](https://images.bowl.com/bowl/media/assets/usbc/equipment%20specs/approved%20cleaners/082626_approved-cleaner-list-for-website-current.pdf) (F); [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F); [Repo: USBC ES Manual 03/26, Rule 18, Siefers ball-life study, brand maintenance intervals (F there)](docs/ARSENAL_MANAGER_RESEARCH.md) (repo); [r/Bowling: best ball cleaner](https://www.reddit.com/r/Bowling/comments/1bjlrzr/whats_the_best_ball_cleaner/) (S); [r/Bowling: cleaning with alcohol](https://www.reddit.com/r/Bowling/comments/ixvy9n/cleaning_ball_with_alcohol/) (S)
- **Bubble:** Clean after every session, not during it. Rule 18 bans liquid cleaner and sanding once competition starts; a dry towel is fine.
- **Glossary:** Wipe lane oil and dirt off after bowling. USBC lists rubbing alcohol, Simple Green (Original) and Windex as approved cleaners. Competition rules limit cleaning to dry wiping, unless league officers give special permission for an approved cleaner.
- **Placement:** Bubble (Arsenal › Log service / ball health) + Glossary
- **Priority:** High (v1 bubble #15)

#### Resurface / detox schedule  `eq-maintenance`
- **Tree:** Equipment — Balls
- **Skill level:** Intermediate. People ask how often, and whether it's worth it.
- **Evidence:** Manufacturer intervals (F, via repo): Storm 60–80 games, Motiv about 50, Brunswick 10/30/60. USBC Siefers study (F, via repo): performance doesn't fully return to 100%. Sources: [Repo: USBC ES Manual 03/26, Rule 18, Siefers ball-life study, brand maintenance intervals (F there)](docs/ARSENAL_MANAGER_RESEARCH.md) (repo)
- **Bubble:** Brands say every ~50–80 games: Storm 60–80, Motiv about 50. A tired ball skids longer and has less backend.
- **Glossary:** Periodic re-sanding (resurface) and oil extraction (detox or revive) on reactive balls. Intervals vary by brand. USBC research found performance never fully returns to new.
- **Placement:** Bubble (Arsenal › ball health counts) + Glossary
- **Priority:** Medium

#### When to change balls (during a session)  `eq-when-change`
- **Tree:** Equipment — Balls
- **Skill level:** Intermediate. A common league question.
- **Evidence:** Reddit transition threads (S). USBC Fundamentals (F): if lanes are hooking, use a softer release or less aggressive equipment. Sources: [r/Bowling: struggling with the transition](https://www.reddit.com/r/Bowling/comments/17ftwxy/struggling_with_the_transition/) (S); [r/Bowling: what makes you switch balls](https://www.reddit.com/r/Bowling/comments/erwua2/what_is_it_that_makes_you_switch_balls_in_the/) (S); [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F); [Storm, Cracking the code of the burn (manufacturer)](https://www.stormbowling.com/read/cracking-the-code-of-the-burn) (F)
- **Bubble:** Switch when good shots stop carrying, not after one bad shot. Usually move first; change balls when moving can't fix it.
- **Glossary:** Reasons to switch include the ball hooking early and dying, flat 10s on pocket hits, or running out of room to move. A common house-shot plan is to start smoother or earlier, then go cleaner or longer as the lanes break down.
- **Placement:** Bubble (Tonight › Pick card (why-lines)) + Glossary
- **Priority:** High

#### Storage & temperature  `eq-storage`
- **Tree:** Equipment — Balls
- **Skill level:** Beginner. People ask if the car trunk is OK.
- **Evidence:** Motiv warranty (F) excludes damage above 125°F or below 40°F. Storm's similar exclusion is a search excerpt (S). Sources: [Motiv, Ball warranty (temperature exclusion)](https://www.motivbowling.com/company/ball-warranty.html) (F)
- **Bubble:** Don't leave balls in a hot or freezing car. Motiv's warranty excludes damage above 125°F or below 40°F.
- **Glossary:** Keep balls at room temperature. Extreme heat or cold can crack covers, and manufacturers exclude it from warranties.
- **Placement:** Bubble (Arsenal › ball detail) + Glossary
- **Priority:** Medium

#### Holes & balance holes (rules)  `eq-holes-rule`
- **Tree:** Equipment — Balls
- **Skill level:** Advanced. Drilling detail. Older articles are out of date.
- **Evidence:** USBC ES Manual 03/26 (F, via repo): balance holes are not allowed, and a gripping hole not used throughout the approach counts as a balance hole. PBA lingo still mentions balance holes, which is outdated. Sources: [Repo: USBC ES Manual 03/26, Rule 18, Siefers ball-life study, brand maintenance intervals (F there)](docs/ARSENAL_MANAGER_RESEARCH.md) (repo); [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Glossary only
- **Glossary:** USBC no longer allows balance holes. Each finger or thumb hole may have one vent hole. No-thumb balls are marked with a '+' on the palm side.
- **Placement:** Glossary only
- **Priority:** Low

#### Layout (pin / CG placement)  `eq-layout`
- **Tree:** Equipment — Balls
- **Skill level:** Advanced. Pro-shop territory.
- **Evidence:** PBA lingo (F): pin-in = more control, pin-out = more hook and flip. The app must not invent layouts. Sources: [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Glossary only
- **Glossary:** Where the driller places the pin and the holes relative to your PAP. Layout changes the timing and shape of the motion. Ask a pro shop; the app does not recommend layouts.
- **Placement:** Glossary only
- **Priority:** Low

#### Benchmark ball  `eq-benchmark`
- **Tree:** Equipment — Balls
- **Skill level:** Intermediate. Used in arsenal talk and in this app.
- **Evidence:** Bowling This Month (S). Sources: [Bowling This Month, The benchmark ball](https://www.bowlingthismonth.com/quick-tips/the-benchmark-ball/) (S)
- **Bubble:** Glossary only
- **Glossary:** Your middle-of-the-road ball, thrown first to read the lanes before you go stronger or weaker.
- **Placement:** Glossary only
- **Priority:** Medium

### Tree 3: Equipment — Shoes, Approach & Accessories (19 topics)

#### Slide sole numbers  `sh-slide-sole`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Intermediate. Owners of performance shoes ask which pad to use. Beginners in rentals rarely need this.
- **Evidence:** Dexter guide (F): S2 = least slide up to S12 = most. BowlersMart (F): go up a number if you stick, down if you slide too far. Threads (S): S8 feels tacky until broken in; many carry 6/8/10. Numbers are brand-specific. Sources: [Dexter, Sole and heel guide](https://www.dexterbowling.com/en/sole-and-heel-guide) (F); [BowlersMart, Soles and heels explained (retailer)](https://www.bowlersmart.com/learn/shoes/soles-and-heels/) (F); [r/Bowling: which slide sole](https://www.reddit.com/r/Bowling/comments/1kav7if/) (S); [r/Bowling: sticking on approach](https://www.reddit.com/r/Bowling/comments/14ejgt9/) (S); [r/Bowling: S8 vs S10](https://www.reddit.com/r/Bowling/comments/1hj0365/) (S)
- **Bubble:** Higher number = more slide (Dexter: S2 least, S12 most). Sticking? Go up one. Sliding past the line? Go down one.
- **Glossary:** Swappable pads under the slide shoe. Most brands number them low = grip, high = glide, but the numbers are brand-specific. Change one pad at a time.
- **Placement:** Bubble (More › Bowler profile (equipment)) + Glossary
- **Priority:** High (v1 bubble #4)

#### Heels (brake)  `sh-heel`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Intermediate. A follow-up question once people own swappable shoes.
- **Evidence:** BowlersMart (F): H5 Saw Tooth is the common default, low numbers brake hardest, H7 leather is softer. Dexter guide (F). Sources: [BowlersMart, Soles and heels explained (retailer)](https://www.bowlersmart.com/learn/shoes/soles-and-heels/) (F); [Dexter, Sole and heel guide](https://www.dexterbowling.com/en/sole-and-heel-guide) (F); [Dexter, Bowling heels](https://www.dexterbowling.com/en/bowling-heels/) (S)
- **Bubble:** The heel controls how fast your slide stops. H5 rubber is the usual start; H7 leather glides a little more for a softer finish.
- **Glossary:** The swappable heel on a performance slide shoe. Change the heel for fine-tuning the finish; change the sole for slide length.
- **Placement:** Bubble (More › Bowler profile (equipment)) + Glossary
- **Priority:** Medium

#### Traction sole  `sh-traction`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Intermediate. Rarely asked.
- **Evidence:** BowlersMart (F). Sources: [BowlersMart, Soles and heels explained (retailer)](https://www.bowlersmart.com/learn/shoes/soles-and-heels/) (F)
- **Bubble:** Glossary only
- **Glossary:** The rubber sole on the push-off foot. It grips so your steps stay stable.
- **Placement:** Glossary only
- **Priority:** Low

#### Slide foot  `sh-slide-foot`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Beginner. Rental shoes slide on both feet, so new bowlers ask which foot.
- **Evidence:** BowlersMart (F). USBC Bowling Styles (F). Sources: [BowlersMart, Soles and heels explained (retailer)](https://www.bowlersmart.com/learn/shoes/soles-and-heels/) (F); [USBC, Bowling Styles (4-step, 5-step, two-handed, spinner)](https://bowl.com/welcome/bowling-styles) (F)
- **Bubble:** Right-handers slide on the left foot; left-handers on the right. Performance shoes only slide on that foot.
- **Glossary:** The foot that slides on your last step: the opposite foot to your bowling hand.
- **Placement:** Bubble (More › Bowler profile (equipment)) + Glossary
- **Priority:** Medium

#### Why your slide changes day to day  `sh-slide-changes`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Intermediate. A common league complaint: 'I was fine last week'.
- **Evidence:** BowlersMart (F): humidity, the approach surface, foot traffic and a dirty sole. Threads (S): humidity calls for a higher number. Sources: [BowlersMart, Soles and heels explained (retailer)](https://www.bowlersmart.com/learn/shoes/soles-and-heels/) (F); [r/Bowling: sticking on approach](https://www.reddit.com/r/Bowling/comments/14ejgt9/) (S)
- **Bubble:** Humidity, the approach surface and a dirty sole change your slide more than your feet do. Brush the sole first, then swap the pad.
- **Glossary:** Humid air makes approaches tacky. Synthetic approaches tend to be slicker than older wood. Dirt picked up off the approach makes the slide unpredictable.
- **Placement:** Bubble (More › Bowler profile (equipment)) + Glossary
- **Priority:** High

#### Shoe covers  `sh-shoe-covers`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Beginner. Simple fix, often missed.
- **Evidence:** BowlersMart (F): the most common reason a slide goes inconsistent. USBC etiquette (F). Sources: [BowlersMart, Soles and heels explained (retailer)](https://www.bowlersmart.com/learn/shoes/soles-and-heels/) (F); [USBC, Etiquette and Lingo](https://bowl.com/welcome/etiquette-and-lingo) (F)
- **Bubble:** Wear covers whenever you step off the approach. Dirt and drinks on the sole are the most common cause of a sudden stick.
- **Glossary:** Slip-on covers for bowling shoes. Wear them whenever you walk off the approach area.
- **Placement:** Bubble (More › Bowler profile (equipment)) + Glossary
- **Priority:** Medium

#### Breaking in / brushing soles  `sh-break-in`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Beginner. New shoes stick.
- **Evidence:** USBC Fundamentals (F): new slide soles must be broken in. Brush lightly from toe back with a soft wire brush; side-to-side roughs the sole up. Sources: [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F); [BowlersMart, Soles and heels explained (retailer)](https://www.bowlersmart.com/learn/shoes/soles-and-heels/) (F)
- **Bubble:** New slide soles need breaking in. Brush lightly from toe to heel with a wire brush; side to side makes it rough.
- **Glossary:** Slide soles don't slide well straight out of the box. Light brushing in the direction of the slide, before and after sessions, keeps them consistent.
- **Placement:** Bubble (More › Bowler profile (equipment)) + Glossary
- **Priority:** Medium

#### Slide powder vs rosin  `sh-powder-rosin`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Beginner. People put rosin on their shoes.
- **Evidence:** USBC Fundamentals (F): rosin can have the opposite effect on a sole. Use slide powder sparingly and knock off the excess, because powder on the approach is technically defacing it. Sources: [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F)
- **Bubble:** Rosin makes a sole stick, not slide. If you use slide powder, use a tiny amount and never put it on the approach.
- **Glossary:** Slide powder is made for soles; rosin is for your hand. Loose powder on the approach is a hazard to other bowlers, and USBC treats it as defacing the approach.
- **Placement:** Bubble (More › Bowler profile (equipment)) + Glossary
- **Priority:** Medium

#### Wood vs synthetic approach ⚠  `sh-approach-surface`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Intermediate. Travelers notice centers feel different.
- **Evidence:** BowlersMart (F, retailer): newer synthetic tends to be slick, older wood tackier. No independent measurement found. Sources: [BowlersMart, Soles and heels explained (retailer)](https://www.bowlersmart.com/learn/shoes/soles-and-heels/) (F)
- **Bubble:** Glossary only
- **Glossary:** Approach surfaces differ by center. Synthetic is often slicker and older wood tackier, but humidity and maintenance can outweigh the material.
- **Placement:** Glossary only
- **Priority:** Low

#### Starting position  `sh-start-position`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Beginner. 'Where do I stand' is a top beginner question.
- **Evidence:** USBC Fundamentals (F) and Bowling Styles (F): heels at the foul line, 4½ steps (4-step) or 5½ (5-step), then turn. Reddit agrees (S). Sources: [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F); [USBC, Bowling Styles (4-step, 5-step, two-handed, spinner)](https://bowl.com/welcome/bowling-styles) (F); [r/Bowling: where do you start your approach](https://www.reddit.com/r/Bowling/comments/293b2e/where_do_you_start_and_end_your_approach/) (S)
- **Bubble:** Heels at the foul line, take 4½ normal steps back (5½ for a 5-step), and turn around. That's your start.
- **Glossary:** Where you stand to begin your approach, both distance from the line and board. Adjust if you finish short of the line or foul.
- **Placement:** Bubble (Targeting (#/target) Feet control) + Glossary
- **Priority:** High (v1 bubble #20)

#### Boards & approach dots  `sh-dots-boards`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Beginner. Needed before any move rule makes sense.
- **Evidence:** PBA (F): 39 boards; the first arrow is on board 5; seven arrows start 16 ft past the foul line, and the dots on the lane are 7 ft out. USBC Fundamentals (F): line up using the inside of the slide shoe and count boards from your gutter. Sources: [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F); [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F); [USBC, Approach position for entry-level bowlers (Learn, 2009)](https://bowl.com/news/approach-position-for-entry-level-bowlers) (F)
- **Bubble:** 39 boards, counted from your gutter side; the arrows sit every 5 boards (5, 10, 15…). Note the board under the inside edge of your slide foot so you can repeat it.
- **Glossary:** The lane is 39 boards wide. Dots on the approach and arrows on the lane line up with boards, so you can stand and aim on the same numbers every shot.
- **Placement:** Bubble (Targeting (#/target) Feet / Eyes controls) + Glossary
- **Priority:** High

#### Shammy / towel  `sh-shammy`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Beginner. Asked once people see others wiping their ball between shots.
- **Evidence:** Threads (S): leather shammy between shots, microfiber with cleaner after. NBA (F): wipe with a dry towel after every shot. Rule 18 (F, via repo): liquid cleaner is banned during competition. Sources: [r/Bowling: shammy vs microfiber](https://www.reddit.com/r/Bowling/comments/by35ha/) (S); [r/Bowling: what towel do you use](https://www.reddit.com/r/Bowling/comments/13eoia7/) (S); [r/Bowling: shammy care](https://www.reddit.com/r/Bowling/comments/1so0bz2/) (S); [BowlersMart, Towels and shammies (retailer)](https://www.bowlersmart.com/learn/accessories/towels-and-shammies) (S); [National Bowling Academy x Creating the Difference, Lane shine test (vendor-run, one ball)](https://www.nationalbowlingacademy.com/video/lane-shine-important-017681) (F); [USBC Playing Rules 2025-26, Rule 18 (fetched for docs/ARSENAL_MANAGER_RESEARCH.md)](https://bowl.com/getmedia/64039e31-a0bb-42f1-94cb-81cb3b5fe6e9/USBC_Playing_Rules_2025_2026.pdf) (repo); [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F)
- **Bubble:** Wipe the ball dry between shots to keep oil off it. A dry shammy or towel is fine during competition; liquid cleaner isn't.
- **Glossary:** A leather or synthetic pad (shammy) or towel for wiping oil off between shots. Hand-wash it. USBC suggests a grease-fighting dish soap for towels.
- **Placement:** Bubble (Bag builder (#/bag) accessories / Glossary) + Glossary
- **Priority:** High (v1 bubble #16)

#### Microfiber pad ⚠  `sh-microfiber`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Intermediate. 'Shammy or microfiber?' threads.
- **Evidence:** Threads (S): microfiber can smear oil when dry; many use it with cleaner after the session. Retailer (S). Sources: [r/Bowling: shammy vs microfiber](https://www.reddit.com/r/Bowling/comments/by35ha/) (S); [BowlersMart, Towels and shammies (retailer)](https://www.bowlersmart.com/learn/accessories/towels-and-shammies) (S)
- **Bubble:** Glossary only
- **Glossary:** A cleaning pad usually used with an approved cleaner after bowling. Some bowlers also use one dry during play.
- **Placement:** Glossary only
- **Priority:** Low

#### Bowler's tape ⚠  `sh-tape`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Intermediate. Thumb fit changes from night to night.
- **Evidence:** Retailer and Reddit (S) only. Sources: [bowling.com, 5 essential accessories (retailer)](https://www.bowling.com/knowledge-hub/bowling-accessories/5-most-essential-bowling-accessories) (S); [r/Bowling: bag must-haves](https://www.reddit.com/r/Bowling/comments/1fd65rd/bag_must_haves/) (S); [bowlingball.com, Your thumb hole is too big (retailer)](https://www.bowlingball.com/BowlVersity/grip-pressure-your-thumb-hole-is-too-big-) (S)
- **Bubble:** Tape inside the thumb hole tightens the fit on nights your thumb shrinks. Needing lots of tape every week means it's time for the pro shop.
- **Glossary:** Thin tape applied inside a hole to fine-tune the fit. A short-term adjustment, not a fix for a bad drill.
- **Placement:** Bubble (Bag builder (#/bag) accessories / Glossary) + Glossary
- **Priority:** Medium

#### Rosin bag / grip sack ⚠  `sh-rosin`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Beginner. A common accessory question.
- **Evidence:** Retailer and Reddit (S). USBC (F): keep rosin off your soles. Sources: [bowling.com, 5 essential accessories (retailer)](https://www.bowling.com/knowledge-hub/bowling-accessories/5-most-essential-bowling-accessories) (S); [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F)
- **Bubble:** Glossary only
- **Glossary:** A small bag that dries your hand for a consistent grip. Keep it off your slide sole.
- **Placement:** Glossary only
- **Priority:** Low

#### Wrist support ⚠  `sh-wrist`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Intermediate. Often asked. Medical-adjacent.
- **Evidence:** Retailer and Reddit (S) only. Medical-adjacent, so it stays out of bubbles. Sources: [bowling.com, 5 essential accessories (retailer)](https://www.bowling.com/knowledge-hub/bowling-accessories/5-most-essential-bowling-accessories) (S); [r/Bowling: bag must-haves](https://www.reddit.com/r/Bowling/comments/1fd65rd/bag_must_haves/) (S)
- **Bubble:** Glossary only
- **Glossary:** A brace some bowlers wear to keep the wrist position steady. Whether you need one is a coach or health question, not something the app recommends.
- **Placement:** Glossary only
- **Priority:** Low

#### Finger inserts / thumb slug  `sh-inserts`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Intermediate. Pro-shop add-ons.
- **Evidence:** USBC Fundamentals (F): replace inserts each season because they wear out. Sources: [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F)
- **Bubble:** Glossary only
- **Glossary:** Rubber or urethane liners in the holes. They give a consistent feel and wear out over time.
- **Placement:** Glossary only
- **Priority:** Low

#### Rental, athletic or performance shoes  `sh-shoe-types`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Beginner. An upgrade question.
- **Evidence:** BowlersMart (F, retailer). Sources: [BowlersMart, Soles and heels explained (retailer)](https://www.bowlersmart.com/learn/shoes/soles-and-heels/) (F)
- **Bubble:** Glossary only
- **Glossary:** Rental and athletic shoes have fixed soles. Performance shoes have swappable slide soles and heels, so you can adjust to the approach.
- **Placement:** Glossary only
- **Priority:** Low

#### What's usually in the bag ⚠  `sh-bag`
- **Tree:** Equipment — Shoes, Approach & Accessories
- **Skill level:** Beginner. 'What do I actually need' threads.
- **Evidence:** Reddit and retailer lists (S). The popularity of each item is not measured. Sources: [r/Bowling: bag must-haves](https://www.reddit.com/r/Bowling/comments/1fd65rd/bag_must_haves/) (S); [r/Bowling: go-to bowling stuff](https://www.reddit.com/r/Bowling/comments/119om0u/go_to_bowling_stuff_you_feel_like_is_necessary/) (S); [bowlingball.com, What's in your bag (retailer)](https://www.bowlingball.com/BowlVersity/whats-in-your-bowling-bag) (S); [bowling.com, 5 essential accessories (retailer)](https://www.bowling.com/knowledge-hub/bowling-accessories/5-most-essential-bowling-accessories) (S)
- **Bubble:** Glossary only
- **Glossary:** What people commonly report carrying: towel or shammy, tape, rosin bag, shoe covers, a shoe brush, spare soles, and a cleaner for after the session. None is required.
- **Placement:** Glossary only
- **Priority:** Low

### Tree 4: Styles & Approaches (15 topics)

#### One-handed (thumb in)  `st-1h`
- **Tree:** Styles & Approaches
- **Skill level:** Beginner. The default style; beginners ask how it's 'supposed' to work.
- **Evidence:** USA Bowling Quick Reference (F): RH thumb at 11 o'clock, fingers at 5. USBC Fundamentals (F): handshake position, thumb exits first. Retail blog (F): most league bowlers throw this way. Sources: [USA Bowling Coaching Quick Reference, Fundamentals Phase 2](https://images.bowl.com/bowl/media/legacy/internap/bowl/youthresourcecenter/usa-bowling/coaching/USA_Bowling_Coaching_QuickReference_FundamentalsP2.pdf) (F); [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F); [Bowling Addicts, Thumbless vs two-handed (retailer blog; RPM figures not verified)](https://www.bowlingaddicts.com/thumbless-vs-two-handed/) (F)
- **Bubble:** Thumb plus two fingers in the ball; the thumb comes out first and the fingers add the turn. It's the most common style, not the 'right' one.
- **Glossary:** The traditional delivery: thumb and two fingers in the ball, one hand. Gives the most direct control, especially for spares.
- **Placement:** Bubble (Onboarding style step and More › Bowler profile) + Glossary
- **Priority:** High

#### Two-handed  `st-2h`
- **Tree:** Styles & Approaches
- **Skill level:** Beginner. Asked by beginners ('is it allowed?') and intermediates ('should I switch?').
- **Evidence:** USBC Bowling Styles (F): chosen for faster speed and more revs, with a shorter backswing and quicker tempo; thumb optional. Reddit (S): not 'better', just different; timing is harder; many carry a spare ball. NBA (S). Sources: [USBC, Bowling Styles (4-step, 5-step, two-handed, spinner)](https://bowl.com/welcome/bowling-styles) (F); [r/Bowling: one-handed vs two-handed](https://www.reddit.com/r/Bowling/comments/195h4hs/) (S); [r/Bowling: switching to two-handed](https://www.reddit.com/r/Bowling/comments/1ppur2d/) (S); [r/Bowling: is two-handed better](https://www.reddit.com/r/Bowling/comments/1qa9fk3/) (S); [National Bowling Academy, Two-handed advantages and disadvantages](https://www.nationalbowlingacademy.com/video/two-handed-bowling-advantages-disadvantages-025341) (S); [r/Bowling: two-hand delivery USBC rule](https://www.reddit.com/r/Bowling/comments/th02zx/two_hand_delivery_vs_two_hand_approach_usbc_rule/) (S)
- **Bubble:** Two-handed is legal in USBC play. It usually adds revs; the trade-offs are timing and spares, so many two-handers carry a plastic spare ball.
- **Glossary:** A delivery with the non-bowling hand on the ball until just before release. Usually no thumb in the ball. It has a shorter backswing and a quicker tempo than the traditional approach.
- **Placement:** Bubble (Onboarding style step) + Glossary
- **Priority:** High (v1 bubble #9)

#### One-handed, no thumb ⚠  `st-nothumb`
- **Tree:** Styles & Approaches
- **Skill level:** Intermediate. A niche style that comes up in 'should I drop my thumb' threads.
- **Evidence:** Weak: Reddit (S) and one retail blog (F). Rule fact from the USBC ES Manual (F, via repo): no thumb hole, '+' marked on the palm side. Wrist-strain comments are medical-adjacent and excluded. Sources: [Repo: USBC ES Manual 03/26, Rule 18, Siefers ball-life study, brand maintenance intervals (F there)](docs/ARSENAL_MANAGER_RESEARCH.md) (repo); [r/Bowling: one-handed thumbless bowlers](https://www.reddit.com/r/Bowling/comments/tj20tz/onehanded_thumbless_bowlers/) (S); [r/Bowling: thumbless one-handed](https://www.reddit.com/r/Bowling/comments/4ad26z/thumbless_onehanded_bowling/) (S); [r/Bowling: no-thumb advice](https://www.reddit.com/r/Bowling/comments/qmmzx6/advice_regarding_nothumb_bowling/) (S); [Bowling Addicts, Thumbless vs two-handed (retailer blog; RPM figures not verified)](https://www.bowlingaddicts.com/thumbless-vs-two-handed/) (F)
- **Bubble:** Legal: drilled with finger holes only and a '+' on the palm side. Many find it harder to repeat; it's a choice, not an upgrade.
- **Glossary:** One hand, fingers in, no thumb. It adds revs, but many bowlers report it's harder to repeat. USBC requires that every hole be gripped, so a no-thumb ball has no thumb hole.
- **Placement:** Bubble (Onboarding style step and More › Bowler profile) + Glossary
- **Priority:** Medium

#### Every hole must be gripped  `st-holes-rule`
- **Tree:** Styles & Approaches
- **Skill level:** Intermediate. Comes up when people switch styles.
- **Evidence:** USBC ES Manual 03/26 (F, via repo): a gripping hole not used throughout the approach counts as a balance hole, which is illegal. Reddit rule threads (S). Sources: [Repo: USBC ES Manual 03/26, Rule 18, Siefers ball-life study, brand maintenance intervals (F there)](docs/ARSENAL_MANAGER_RESEARCH.md) (repo); [r/Bowling: two-hand delivery USBC rule](https://www.reddit.com/r/Bowling/comments/th02zx/two_hand_delivery_vs_two_hand_approach_usbc_rule/) (S); [r/Bowling: USBC league two-handed question](https://www.reddit.com/r/Bowling/comments/1fa8wak/bowling_league_usbc_2handed_question/) (S); [r/Bowling: switching styles legality](https://www.reddit.com/r/Bowling/comments/1oermic/league_ruleslegality_question_switching_styles/) (S)
- **Bubble:** USBC rule: every hole in the ball must be gripped on every shot. A ball with a thumb hole means thumb in; no-thumb balls are drilled without one.
- **Glossary:** Since balance holes were removed, an unused thumb hole is illegal. Switching between thumb and no-thumb styles usually means a separate ball or a redrill.
- **Placement:** Bubble (Onboarding style step and More › Bowler profile) + Glossary
- **Priority:** Medium

#### 4-step approach  `st-4step`
- **Tree:** Styles & Approaches
- **Skill level:** Beginner. 'How many steps' is a top beginner question.
- **Evidence:** USBC Bowling Styles (F): the 4-step is 'the most used by any level player'; push away and first step together. USA Bowling Quick Reference (F). Sources: [USBC, Bowling Styles (4-step, 5-step, two-handed, spinner)](https://bowl.com/welcome/bowling-styles) (F); [USA Bowling Coaching Quick Reference, Fundamentals Phase 2](https://images.bowl.com/bowl/media/legacy/internap/bowl/youthresourcecenter/usa-bowling/coaching/USA_Bowling_Coaching_QuickReference_FundamentalsP2.pdf) (F); [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F)
- **Bubble:** Ball and first step move together. It's the most common approach at every level (USBC).
- **Glossary:** Step 1: push the ball away. Step 2: the ball swings down. Step 3: the ball reaches the top of the backswing. Step 4: slide and release.
- **Placement:** Bubble (Onboarding / Bowler profile approach) + Glossary
- **Priority:** High

#### 5-step approach  `st-5step`
- **Tree:** Styles & Approaches
- **Skill level:** Beginner. Same askers. People think it's a different technique.
- **Evidence:** USBC Bowling Styles (F): a 5-step 'simply includes a step before the ball and ball-side foot move together'. USBC Fundamentals (F): a short first step with the non-ball-side foot. Reddit (S): neither is better; pick the one you can time. Sources: [USBC, Bowling Styles (4-step, 5-step, two-handed, spinner)](https://bowl.com/welcome/bowling-styles) (F); [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F); [USA Bowling Coaching Quick Reference, Fundamentals Phase 2](https://images.bowl.com/bowl/media/legacy/internap/bowl/youthresourcecenter/usa-bowling/coaching/USA_Bowling_Coaching_QuickReference_FundamentalsP2.pdf) (F); [r/Bowling: 4 vs 5 steps](https://www.reddit.com/r/Bowling/comments/1dtrt8p/4_vs_5_steps/) (S); [r/Bowling: 4 vs 5 step approach](https://www.reddit.com/r/Bowling/comments/bm1zan/4_vs_5_step_approach/) (S); [r/Bowling: 4 vs 5 step approach](https://www.reddit.com/r/Bowling/comments/8vrleo/4_vs_5_step_approach/) (S); [r/Bowling: step count question](https://www.reddit.com/r/Bowling/comments/1pa6o4s/) (S); [Nick the Bowling Coach, 4-step vs 5-step](https://nickthebowlingcoach.com/mastering-your-bowling-approach-4-step-vs-5-step-guide/) (S)
- **Bubble:** A 5-step is a 4-step with one small starter step first, ball still. Same delivery; pick the one you can time.
- **Glossary:** Step 1 is a small step with the slide-side foot while the ball stays still. The rest matches the 4-step.
- **Placement:** Bubble (Onboarding / Bowler profile approach) + Glossary
- **Priority:** High (v1 bubble #10)

#### Other step counts ⚠  `st-other-steps`
- **Tree:** Styles & Approaches
- **Skill level:** Intermediate. Occasional 'is 3 or 6 steps OK' questions.
- **Evidence:** USA Bowling (F): multiple steps are allowed before the ball moves; a one-step drill is used for teaching. No data on how common 3, 6 or 7 steps are. Sources: [USA Bowling Coaching Quick Reference, Fundamentals Phase 2](https://images.bowl.com/bowl/media/legacy/internap/bowl/youthresourcecenter/usa-bowling/coaching/USA_Bowling_Coaching_QuickReference_FundamentalsP2.pdf) (F)
- **Bubble:** Glossary only
- **Glossary:** Bowlers use other counts. Extra steps before the push away act like starter steps, and the one-step is a teaching drill. What matters is that the swing and feet arrive together.
- **Placement:** Glossary only
- **Priority:** Low

#### Timing  `st-timing`
- **Tree:** Styles & Approaches
- **Skill level:** Intermediate. 'I feel rushed' and 'early or late' questions.
- **Evidence:** USBC Fundamentals (F): match ball height in the stance to your tempo. PBA (F): definition of early timing. Sources: [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F); [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Timing = where the ball is when your feet arrive. Fast feet? Hold the ball lower. Slow feet? Hold it higher (USBC).
- **Glossary:** How the arm swing and footwork line up. USBC Coaching recommends adjusting the swing to your natural tempo rather than slowing your feet.
- **Placement:** Bubble (Onboarding style step and More › Bowler profile) + Glossary
- **Priority:** Medium

#### Push away  `st-pushaway`
- **Tree:** Styles & Approaches
- **Skill level:** Beginner. A building block of the approach.
- **Evidence:** USBC Fundamentals (F). Sources: [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F)
- **Bubble:** Glossary only
- **Glossary:** Moving the ball out to start the swing. Push it toward your target and keep the first step short.
- **Placement:** Glossary only
- **Priority:** Low

#### Handshake release (learning a hook)  `st-handshake`
- **Tree:** Styles & Approaches
- **Skill level:** Beginner. The direct fix for 'how do I hook it'.
- **Evidence:** USBC Fundamentals (F). USA Bowling Quick Reference (F). Hook threads (S). Sources: [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F); [USA Bowling Coaching Quick Reference, Fundamentals Phase 2](https://images.bowl.com/bowl/media/legacy/internap/bowl/youthresourcecenter/usa-bowling/coaching/USA_Bowling_Coaching_QuickReference_FundamentalsP2.pdf) (F); [r/Bowling: how to hook (beginner)](https://www.reddit.com/r/Bowling/comments/1hdpcbn/) (S)
- **Bubble:** Thumb at 11 o'clock (right-handers; 1 o'clock for lefties) and keep that 'handshake' through release. The thumb exits first, then the fingers add side roll.
- **Glossary:** USBC's simplest way to learn a curve: hold the hand position from stance to finish, with the thumb releasing before the fingers.
- **Placement:** Bubble (Onboarding style step and More › Bowler profile) + Glossary
- **Priority:** High

#### Stroker / tweener / cranker ⚠  `st-labels`
- **Tree:** Styles & Approaches
- **Skill level:** Intermediate. Labels people hear but rarely see defined.
- **Evidence:** Book lines cited in the repo's targeting doc (S). Definitions vary by source, and none ranks one above another. Sources: [Repo: move rules, 2-and-1, drift, breakpoint 8-10 @ 39-41 ft (sources and labels listed there)](docs/TEAM_PROMPT_TARGETING.md) (repo)
- **Bubble:** Glossary only
- **Glossary:** Loose style labels. A stroker has lower revs and a smooth release; a cranker has high revs and more hand action; a tweener is in between. They're descriptions, not levels.
- **Placement:** Glossary only
- **Priority:** Medium

#### Spinner  `st-spinner`
- **Tree:** Styles & Approaches
- **Skill level:** Intermediate. A recognisable style.
- **Evidence:** USBC Bowling Styles (F): lighter ball, lots of spin, palm faces down at release. Sources: [USBC, Bowling Styles (4-step, 5-step, two-handed, spinner)](https://bowl.com/welcome/bowling-styles) (F)
- **Bubble:** Glossary only
- **Glossary:** A style with heavy spin and little forward roll. USBC notes it can be very accurate for spares.
- **Placement:** Glossary only
- **Priority:** Low

#### Switching styles ⚠  `st-switching`
- **Tree:** Styles & Approaches
- **Skill level:** Intermediate. 'Should I switch to 2H?' threads.
- **Evidence:** Weak. Retail blog (F): expect your average to drop for months. Reddit (S): many say 1H to 2H is easier than the reverse. USBC (F): youth must establish a new average after changing. Sources: [Bowling Addicts, Thumbless vs two-handed (retailer blog; RPM figures not verified)](https://www.bowlingaddicts.com/thumbless-vs-two-handed/) (F); [r/Bowling: switching to two-handed](https://www.reddit.com/r/Bowling/comments/1ppur2d/) (S); [USBC, Rules to consider (league handicap, averages, absentee)](https://images.bowl.com/bowl/media/assets/usbc/rules/general%20pdfs/060624_rules-to-consider-loh-06-01-2024.pdf) (F)
- **Bubble:** Glossary only
- **Glossary:** A switch changes your release, timing and spares at once. People report a temporary drop in average. It's a personal choice, and a coach helps.
- **Placement:** Glossary only
- **Priority:** Medium

#### Finish position / follow-through  `st-finish`
- **Tree:** Styles & Approaches
- **Skill level:** Beginner. Building block.
- **Evidence:** USBC Bowling Styles (F). USA Bowling Quick Reference (F). Sources: [USBC, Bowling Styles (4-step, 5-step, two-handed, spinner)](https://bowl.com/welcome/bowling-styles) (F); [USA Bowling Coaching Quick Reference, Fundamentals Phase 2](https://images.bowl.com/bowl/media/legacy/internap/bowl/youthresourcecenter/usa-bowling/coaching/USA_Bowling_Coaching_QuickReference_FundamentalsP2.pdf) (F)
- **Bubble:** Glossary only
- **Glossary:** Balanced on the slide foot with the other leg behind, and the arm extended toward the target, elbow finishing above the shoulder.
- **Placement:** Glossary only
- **Priority:** Low

#### Common style misconceptions  `st-myths`
- **Tree:** Styles & Approaches
- **Skill level:** Beginner. They come up in threads at every level.
- **Evidence:** Reddit (S). USBC rules (F) for legality. Sources: [USBC, Bowling Styles (4-step, 5-step, two-handed, spinner)](https://bowl.com/welcome/bowling-styles) (F); [r/Bowling: two-hand delivery USBC rule](https://www.reddit.com/r/Bowling/comments/th02zx/two_hand_delivery_vs_two_hand_approach_usbc_rule/) (S); [r/Bowling: one-handed vs two-handed](https://www.reddit.com/r/Bowling/comments/195h4hs/) (S); [r/Bowling: 4 vs 5 steps](https://www.reddit.com/r/Bowling/comments/1dtrt8p/4_vs_5_steps/) (S)
- **Bubble:** Glossary only
- **Glossary:** Common misconceptions: 2H is illegal (it isn't, in USBC play); 2H or no-thumb is 'better' (it's a trade-off); you need 5 steps to be good (the 4-step is the most used at every level); pros all throw one way (styles vary).
- **Placement:** Glossary only
- **Priority:** Medium

### Tree 5: Lane & Oil (12 topics)

#### What lane oil does  `ln-oil`
- **Tree:** Lane & Oil
- **Skill level:** Beginner. The root of 'it hooked last week but not today'.
- **Evidence:** USBC Fundamentals (F): oily lanes mean a straighter line, the outside is generally drier. BowlVersity (F): longer patterns lengthen skid. Reddit (S). Sources: [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F); [bowlingball.com BowlVersity, Three phases of ball motion (retailer)](https://www.bowlingball.com/BowlVersity/the-three-phases-of-bowling-ball-motion) (F); [r/Bowling: same ball hooks one night, not the next](https://www.reddit.com/r/Bowling/comments/1ll5n5s/) (S)
- **Bubble:** Oil = less friction = less hook. Most house shots have more oil in the middle than outside, so the ball skids through the middle and grabs on the outside.
- **Glossary:** Conditioner applied to protect the lane and shape ball motion. Where it is, how much and how far it goes decide where your ball hooks.
- **Placement:** Bubble (Lane (#/lane) pattern / oil chips) + Glossary
- **Priority:** High

#### House shot  `ln-house`
- **Tree:** Lane & Oil
- **Skill level:** Beginner. League bowlers hear 'house shot' constantly.
- **Evidence:** USBC (F): typically 8:1 or higher, averaging about 40 ft. Kegel (F): house patterns give a defined 'ridge' to play against. Sources: [USBC, Sport Bowling information (pattern ratios)](https://bowl.com/sport-bowling/information) (F); [Kegel, Reading composite oil pattern graphs](https://www.kegel.net/articles/oil-pattern-kosi-graphs) (F); [r/Bowling: ELI5 sport shot vs house shot](https://www.reddit.com/r/Bowling/comments/16t742q/) (S)
- **Bubble:** A house shot has far more oil in the middle than outside: about 8:1 or more (USBC). The drier outside helps steer misses back toward the pocket.
- **Glossary:** The everyday league pattern. A high ratio gives you more room for error than sport patterns.
- **Placement:** Bubble (Lane (#/lane) pattern / oil chips) + Glossary
- **Priority:** High (v1 bubble #12)

#### Sport shot  `ln-sport`
- **Tree:** Lane & Oil
- **Skill level:** Intermediate. Intermediates ask why their average drops in sport leagues and tournaments.
- **Evidence:** USBC sport page (F): typically 4:1 or lower. 2014 USBC Tech Manual (S): 3:1 maximum. The two sources conflict, so both are noted. Sources: [USBC, Sport Bowling information (pattern ratios)](https://bowl.com/sport-bowling/information) (F); [USBC 2014 Sport Bowling Technical Manual (search excerpt: 3:1 max, L18-R18 vs 3-7; conflicts with "4:1 or lower" on the bowl.com page)](https://images.bowl.com/bowl/media/legacy/internap/bowl/sportbowling/pdfs/2014SportBowlingTechManual.pdf) (S); [Kegel, Reading composite oil pattern graphs](https://www.kegel.net/articles/oil-pattern-kosi-graphs) (F)
- **Bubble:** Sport patterns are much flatter: about 4:1 or lower (USBC), against 8:1 or more on a house shot. Misses don't get steered back, so scores drop.
- **Glossary:** A flatter oil pattern used in sport leagues and many tournaments. USBC's sport page says 4:1 or lower; its 2014 technical manual says 3:1 maximum.
- **Placement:** Bubble (Lane (#/lane) pattern / oil chips) + Glossary
- **Priority:** Medium

#### Oil ratio  `ln-ratio`
- **Tree:** Lane & Oil
- **Skill level:** Intermediate. Shows up on pattern sheets.
- **Evidence:** Kegel (F): oil on boards L18–R18 divided by oil on boards 3–7. A lower ratio is harder. Sources: [Kegel, Reading composite oil pattern graphs](https://www.kegel.net/articles/oil-pattern-kosi-graphs) (F); [USBC, Sport Bowling information (pattern ratios)](https://bowl.com/sport-bowling/information) (F)
- **Bubble:** Glossary only
- **Glossary:** How much more oil is in the middle than outside. A high ratio is forgiving; a low ratio is demanding.
- **Placement:** Glossary only
- **Priority:** Medium

#### Pattern length  `ln-length`
- **Tree:** Lane & Oil
- **Skill level:** Intermediate. Shows up on pattern sheets.
- **Evidence:** Kegel (F): a 43 ft pattern leaves 17 ft of dry lane. PBA (F): long vs short patterns. Sources: [Kegel, Reading composite oil pattern graphs](https://www.kegel.net/articles/oil-pattern-kosi-graphs) (F); [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Pattern length = how far the oil goes. 43 ft of oil leaves 17 ft of dry lane before the pins.
- **Glossary:** Distance from the foul line where the oil stops. Longer patterns push the hook later.
- **Placement:** Bubble (Lane (#/lane) pattern / oil chips) + Glossary
- **Priority:** Medium

#### Breakdown / transition (the burn)  `ln-breakdown`
- **Tree:** Lane & Oil
- **Skill level:** Intermediate. A top league question: 'it worked game 1, not game 3'.
- **Evidence:** Storm (F): as the pattern breaks down, move deeper (left for RH), add speed or axis rotation, or go pearl or higher grit. Reddit (S). Sources: [Storm, Cracking the code of the burn (manufacturer)](https://www.stormbowling.com/read/cracking-the-code-of-the-burn) (F); [r/Bowling: burned-out lanes](https://www.reddit.com/r/Bowling/comments/bv8ndn/how_to_play_on_burned_out_lanes/) (S); [r/Bowling: early hook when lanes burn up](https://www.reddit.com/r/Bowling/comments/dzibfq/struggling_with_early_hook_when_lanes_burnup/) (S); [r/Bowling: struggling with the transition](https://www.reddit.com/r/Bowling/comments/17ftwxy/struggling_with_the_transition/) (S)
- **Bubble:** Balls push oil out of the track as the night goes on. Expect an earlier hook; usually move deeper (left for right-handers) and keep the same breakpoint.
- **Glossary:** The pattern changing during play: the track dries (the burn) and oil moves elsewhere. Adjust your line, speed or ball as it happens.
- **Placement:** Bubble (Tonight › read buttons (hooking early / late)) + Glossary
- **Priority:** High (v1 bubble #13)

#### Carrydown  `ln-carrydown`
- **Tree:** Lane & Oil
- **Skill level:** Intermediate. Explains a weaker backend later in the night.
- **Evidence:** PBA (F): oil carried down the lane can reduce backend hook. Kegel (S). Sources: [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F); [Kegel, Oil pattern breakdown and carrydown](https://www.kegel.net/articles/oil-pattern-breakdown-and-carrydown) (S)
- **Bubble:** Balls also drag oil past the end of the pattern (carrydown), so the backend can get weaker even as the front dries up.
- **Glossary:** Oil moved toward the pins by balls rolling through the pattern. It can make the ball hook less late in the lane.
- **Placement:** Bubble (Lane (#/lane) pattern / oil chips) + Glossary
- **Priority:** Medium

#### Reading dry vs oily  `ln-reading`
- **Tree:** Lane & Oil
- **Skill level:** Beginner. The beginner version of transition.
- **Evidence:** USBC Fundamentals (F): if the lanes are oily, play straighter; if they're hooking, soften your release or use a less aggressive ball. Reddit (S): the same ball behaves differently on different nights. Sources: [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F); [r/Bowling: same ball hooks one night, not the next](https://www.reddit.com/r/Bowling/comments/1ll5n5s/) (S)
- **Bubble:** Hooking early? That part of the lane is drier. Move, or use a weaker ball. Going straight? There's more oil. Play straighter or use a stronger ball.
- **Glossary:** Use your ball's reaction to read the lane. Watch where it starts to turn, and watch bowlers with a similar style.
- **Placement:** Bubble (Tonight › read buttons) + Glossary
- **Priority:** High

#### Heads / midlane / backend  `ln-zones`
- **Tree:** Lane & Oil
- **Skill level:** Intermediate. Coaches use these words without defining them.
- **Evidence:** PBA (F): the heads are about the first 20 ft. BowlVersity (F): skid usually lasts the first 20–30 ft, and roll happens in the back third. Sources: [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F); [bowlingball.com BowlVersity, Three phases of ball motion (retailer)](https://www.bowlingball.com/BowlVersity/the-three-phases-of-bowling-ball-motion) (F)
- **Bubble:** Heads = about the first 20 ft, midlane after that, backend = the last part, past the oil. The ball skids in the heads, hooks in the mid and back, and rolls into the pins.
- **Glossary:** The three zones of the lane, and how ball motion maps to them.
- **Placement:** Bubble (Lane (#/lane) pattern / oil chips) + Glossary
- **Priority:** Medium

#### Oil rings (flare)  `ln-oil-rings`
- **Tree:** Lane & Oil
- **Skill level:** Intermediate. 'What do the rings on my ball mean' threads.
- **Evidence:** PBA (F): flare is track migration. Reddit (S): spacing matters more than the number of rings. Sources: [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F); [r/Bowling: track and flare](https://www.reddit.com/r/Bowling/comments/1egypii/track_and_flare_questions/) (S); [r/Bowling: what do the oil tracks mean](https://www.reddit.com/r/Bowling/comments/1nr5gco/what_do_the_oil_tracks_mean/) (S); [Repo: USBC ES Manual 03/26, Rule 18, Siefers ball-life study, brand maintenance intervals (F there)](docs/ARSENAL_MANAGER_RESEARCH.md) (repo)
- **Bubble:** Each oil ring is a new track as the ball flares. Rings spread farther apart = more fresh cover touching the lane = more hook potential.
- **Glossary:** Lines of oil left on the ball. The spacing shows how much it flared. Dark rings that won't wipe off are a sign the ball needs cleaning or a detox.
- **Placement:** Bubble (Lane (#/lane) pattern / oil chips) + Glossary
- **Priority:** Medium

#### Lane topography  `ln-topography`
- **Tree:** Lane & Oil
- **Skill level:** Advanced. Rarely asked; advanced.
- **Evidence:** Kegel (F): topography can be more dominant than the oil pattern. Sources: [Kegel, Reading composite oil pattern graphs](https://www.kegel.net/articles/oil-pattern-kosi-graphs) (F)
- **Bubble:** Glossary only
- **Glossary:** Small tilts and dips in the lane surface. They can affect ball motion as much as oil.
- **Placement:** Glossary only
- **Priority:** Low

#### Reading a pattern sheet  `ln-graph`
- **Tree:** Lane & Oil
- **Skill level:** Advanced. Tournament bowlers.
- **Evidence:** Kegel (F): look at length, volume, ratio and shape. A graph shows how a pattern may play, not where to stand. Sources: [Kegel, Reading composite oil pattern graphs](https://www.kegel.net/articles/oil-pattern-kosi-graphs) (F)
- **Bubble:** Glossary only
- **Glossary:** Composite graphs show oil per board. Use them to judge difficulty, not to pick an exact line.
- **Placement:** Glossary only
- **Priority:** Low

### Tree 6: Ball Motion (16 topics)

#### Skid → hook → roll  `bm-shr`
- **Tree:** Ball Motion
- **Skill level:** Intermediate. The framework behind most motion questions.
- **Evidence:** BowlVersity (F): skid lasts about the first 20–30 ft; an early roll deflects and a late roll hits light. PBA (F): every ball skids first. Sources: [bowlingball.com BowlVersity, Three phases of ball motion (retailer)](https://www.bowlingball.com/BowlVersity/the-three-phases-of-bowling-ball-motion) (F); [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Every ball skids, then hooks, then rolls. Skid usually lasts the first 20–30 ft; you want the roll to start just before the pins.
- **Glossary:** The three phases of ball motion. Surface, speed, revs and oil change how long each one lasts.
- **Placement:** Bubble (Lane (#/lane) ball path and phase labels) + Glossary
- **Priority:** High (v1 bubble #11)

#### Why isn't my ball hooking?  `bm-not-hooking`
- **Tree:** Ball Motion
- **Skill level:** Beginner. Probably the most common beginner question in the sources.
- **Evidence:** Several Reddit threads from beginners (S). Retailer FAQ (S). USBC Fundamentals (F): handshake release, oily lanes. PBA (F): a conventional grip is harder to hook. Sources: [r/Bowling: ball won't hook (beginner)](https://www.reddit.com/r/Bowling/comments/18zk9zf/) (S); [r/Bowling: how to hook (beginner)](https://www.reddit.com/r/Bowling/comments/1hdpcbn/) (S); [r/Bowling: same ball hooks one night, not the next](https://www.reddit.com/r/Bowling/comments/1ll5n5s/) (S); [bowling.com, Why isn't my ball hooking (retailer)](https://www.bowling.com/knowledge-hub/questions/bowling-tips/hooking-a-bowling-ball/question_10_why-isn-t-my-bowling-ball-hooking-even-when-i-try-to-rotate-my-wrist) (S); [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F); [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Most common causes: a plastic or house ball, a conventional grip, a thumb that doesn't come out first, or heavy oil. A drilled reactive ball fixes the first two.
- **Glossary:** Hook needs grip on the lane (cover and surface), rotation (release) and some friction (oil). Fix the cause you can control first.
- **Placement:** Bubble (Tonight › read buttons ("not hooking") and Lane) + Glossary
- **Priority:** High (v1 bubble #1)

#### Ball speed  `bm-speed`
- **Tree:** Ball Motion
- **Skill level:** Intermediate. 'Am I too fast?' threads.
- **Evidence:** BowlVersity (F): higher speed lengthens skid. Bowling This Month (S): about 0.5–1 mph change from a shorter or lower setup. Sources: [bowlingball.com BowlVersity, Three phases of ball motion (retailer)](https://www.bowlingball.com/BowlVersity/the-three-phases-of-bowling-ball-motion) (F); [Bowling This Month, Generating less ball speed](https://www.bowlingthismonth.com/quick-tips/generating-less-ball-speed/) (S); [r/Bowling: ball speed / rev rate](https://www.reddit.com/r/Bowling/comments/9dvv2h/advice_on_ball_speedrev_rate/) (S)
- **Bubble:** More speed = longer skid and less hook. Slowing down a little is a common fix when the ball won't turn.
- **Glossary:** How fast the ball travels. Speed trades off against hook. A consistent speed matters more than a high one.
- **Placement:** Bubble (Lane (#/lane) ball path and phase labels) + Glossary
- **Priority:** Medium

#### Rev rate  `bm-revs`
- **Tree:** Ball Motion
- **Skill level:** Intermediate. People compare their rev rate to others'.
- **Evidence:** BowlVersity (F): more revs and rotation mean more hook. Reddit (S). Sources: [bowlingball.com BowlVersity, Three phases of ball motion (retailer)](https://www.bowlingball.com/BowlVersity/the-three-phases-of-bowling-ball-motion) (F); [r/Bowling: speed / matched / rev-dominant ranges](https://www.reddit.com/r/Bowling/comments/1p9pxot/speed_matched_rev_dominant_ranges/) (S)
- **Bubble:** More revs = more hook potential. Revs and speed work as a pair; the match matters more than the rev number.
- **Glossary:** How many times the ball rotates per minute. More revs give the ball more hook potential, but no rev rate is the 'right' one.
- **Placement:** Bubble (Lane (#/lane) ball path and phase labels) + Glossary
- **Priority:** Medium

#### Speed / rev match ⚠  `bm-matchup`
- **Tree:** Ball Motion
- **Skill level:** Advanced. Advanced bowlers talk about being 'speed dominant'.
- **Evidence:** Weak. One Reddit rule of thumb (S), about 350 rpm at 15 mph, has no independent source. Kept out of bubbles. Sources: [r/Bowling: speed / matched / rev-dominant ranges](https://www.reddit.com/r/Bowling/comments/1p9pxot/speed_matched_rev_dominant_ranges/) (S); [Bowling Addicts, Thumbless vs two-handed (retailer blog; RPM figures not verified)](https://www.bowlingaddicts.com/thumbless-vs-two-handed/) (F)
- **Bubble:** Glossary only
- **Glossary:** Speed-dominant bowlers get more length and less hook. Rev-dominant bowlers hook more and earlier. 'Matched' is in between. There's no verified number for a match.
- **Placement:** Glossary only
- **Priority:** Low

#### Early hook / burning up  `bm-early-hook`
- **Tree:** Ball Motion
- **Skill level:** Intermediate. A top league complaint.
- **Evidence:** Storm (F): move deeper, add speed, or use pearl, higher grit or a higher-RG ball. Reddit (S). Sources: [Storm, Cracking the code of the burn (manufacturer)](https://www.stormbowling.com/read/cracking-the-code-of-the-burn) (F); [r/Bowling: burned-out lanes](https://www.reddit.com/r/Bowling/comments/bv8ndn/how_to_play_on_burned_out_lanes/) (S); [r/Bowling: early hook when lanes burn up](https://www.reddit.com/r/Bowling/comments/dzibfq/struggling_with_early_hook_when_lanes_burnup/) (S)
- **Bubble:** Hooking early and dying? Move deeper and keep your breakpoint, add a little speed, or switch to a pearl or polished ball.
- **Glossary:** The ball reads the dry track too soon, uses up its energy and has nothing left at the pins. Usually a sign the lane has broken down.
- **Placement:** Bubble (Tonight › read buttons ("hooking early")) + Glossary
- **Priority:** High (v1 bubble #14)

#### Ball 'dies' / hits weak  `bm-dying`
- **Tree:** Ball Motion
- **Skill level:** Intermediate. Common league phrasing.
- **Evidence:** BowlVersity (F): an early roll deflects. Repo (F): more entry angle carries better. Sources: [bowlingball.com BowlVersity, Three phases of ball motion (retailer)](https://www.bowlingball.com/BowlVersity/the-three-phases-of-bowling-ball-motion) (F); [Repo: move rules, 2-and-1, drift, breakpoint 8-10 @ 39-41 ft (sources and labels listed there)](docs/TEAM_PROMPT_TARGETING.md) (repo)
- **Bubble:** A ball that rolls out early has no energy left and deflects, often leaving the 10 pin (right-handers). Try a later-reacting ball or a deeper line.
- **Glossary:** The ball reaches its roll phase too soon and deflects off the pins instead of driving through them.
- **Placement:** Bubble (Lane (#/lane) ball path and phase labels) + Glossary
- **Priority:** Medium

#### Over/under ⚠  `bm-over-under`
- **Tree:** Ball Motion
- **Skill level:** Intermediate. A classic league frustration.
- **Evidence:** Weak. Retail blog (F) and common usage. No authoritative definition fetched. Sources: [Bowling Addicts, Thumbless vs two-handed (retailer blog; RPM figures not verified)](https://www.bowlingaddicts.com/thumbless-vs-two-handed/) (F)
- **Bubble:** Glossary only
- **Glossary:** One shot hooks too much, the next not enough, from what feels like the same delivery. Often a matchup or consistency issue rather than the lanes.
- **Placement:** Glossary only
- **Priority:** Low

#### Axis rotation  `bm-axis-rotation`
- **Tree:** Ball Motion
- **Skill level:** Intermediate. Shows up in coaching talk.
- **Evidence:** BowlVersity (F): 0° is end over end, 90° is all side roll, and most bowlers fall in 10–45°. Sources: [bowlingball.com BowlVersity, Axis tilt and axis of rotation (retailer)](https://www.bowlingball.com/BowlVersity/bowling-ball-axis-tilt-and-axis-of-rotation) (F)
- **Bubble:** Axis rotation = how much side roll. 0° is end over end; most bowlers are 10–45°. More rotation = longer skid and more backend.
- **Glossary:** The horizontal angle of the ball's spin axis. Your release controls it.
- **Placement:** Bubble (Lane (#/lane) ball path and phase labels) + Glossary
- **Priority:** Medium

#### Axis tilt  `bm-axis-tilt`
- **Tree:** Ball Motion
- **Skill level:** Intermediate. Shows up in coaching talk.
- **Evidence:** BowlVersity (F): spinners, with more tilt, go farther before hooking. PBA (F): tilt ranges 0–90°; less tilt rolls sooner. Sources: [bowlingball.com BowlVersity, Axis tilt and axis of rotation (retailer)](https://www.bowlingball.com/BowlVersity/bowling-ball-axis-tilt-and-axis-of-rotation) (F); [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Axis tilt = how 'spinny' the ball is. More tilt = longer skid and a later hook; less tilt = it rolls sooner.
- **Glossary:** The vertical angle of the spin axis. A high tilt means a smaller track, farther from the holes.
- **Placement:** Bubble (Lane (#/lane) ball path and phase labels) + Glossary
- **Priority:** Medium

#### Breakpoint  `bm-breakpoint`
- **Tree:** Ball Motion
- **Skill level:** Intermediate. The app's targeting uses it.
- **Evidence:** Repo targeting doc: NBA house-shot breakpoint about board 8–10 at 39–41 ft. Human Kinetics breakpoint area of about 3 boards. Sources: [Repo: move rules, 2-and-1, drift, breakpoint 8-10 @ 39-41 ft (sources and labels listed there)](docs/TEAM_PROMPT_TARGETING.md) (repo)
- **Bubble:** Breakpoint = where the ball turns hardest toward the pocket. On a typical house shot that's around board 8–10, near 40 ft.
- **Glossary:** The farthest point from the pocket on your ball path, where the hook takes over. The app uses it for its targeting.
- **Placement:** Bubble (Targeting (#/target) break box) + Glossary
- **Priority:** High

#### Entry angle  `bm-entry-angle`
- **Tree:** Ball Motion
- **Skill level:** Advanced. Advanced carry talk.
- **Evidence:** Repo (F): IBPSIA and USBC say more angle carries better; the repo uses a 4–6° window. BowlVersity (F) cites 6–7°. The sources conflict, so it stays out of bubbles. Sources: [Repo: move rules, 2-and-1, drift, breakpoint 8-10 @ 39-41 ft (sources and labels listed there)](docs/TEAM_PROMPT_TARGETING.md) (repo); [bowlingball.com BowlVersity, Three phases of ball motion (retailer)](https://www.bowlingball.com/BowlVersity/the-three-phases-of-bowling-ball-motion) (F)
- **Bubble:** Glossary only
- **Glossary:** The angle the ball enters the pocket at. More angle (within limits) generally carries better. Sources disagree on the ideal number.
- **Placement:** Glossary only
- **Priority:** Low

#### 'Throw harder = more pins'  `bm-myth-harder`
- **Tree:** Ball Motion
- **Skill level:** Beginner. A recurring beginner assumption.
- **Evidence:** Reddit threads (S). BowlVersity (F): speed reduces hook. Sources: [r/Bowling: does throwing harder help](https://www.reddit.com/r/Bowling/comments/4mwput/does_rolling_the_ball_harder_increase_the_odds_of/) (S); [r/Bowling: downsides of throwing too fast](https://www.reddit.com/r/Bowling/comments/175hwn2/any_downsides_to_throwing_the_ball_too_fast/) (S); [bowlingball.com BowlVersity, Three phases of ball motion (retailer)](https://www.bowlingball.com/BowlVersity/the-three-phases-of-bowling-ball-motion) (F)
- **Bubble:** Harder isn't better: extra speed cuts the hook and the angle into the pocket. Accuracy and a repeatable speed knock down more pins.
- **Glossary:** A common misconception. Pin action depends on hitting the pocket at an angle more than on raw speed.
- **Placement:** Bubble (Lane (#/lane) ball path and phase labels) + Glossary
- **Priority:** Medium

#### Flare  `bm-flare`
- **Tree:** Ball Motion
- **Skill level:** Intermediate. Spec-sheet word.
- **Evidence:** PBA (F). Sources: [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Glossary only
- **Glossary:** The ball's track migrating from its first axis toward its final one as it travels, which exposes fresh cover. It's linked to differential.
- **Placement:** Glossary only
- **Priority:** Low

#### PAP (positive axis point)  `bm-pap`
- **Tree:** Ball Motion
- **Skill level:** Advanced. Drilling term.
- **Evidence:** PBA (F). Sources: [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Glossary only
- **Glossary:** The pole of the bowler's starting spin axis, used by pro shops to lay out a ball.
- **Placement:** Glossary only
- **Priority:** Low

#### Loft  `bm-loft`
- **Tree:** Ball Motion
- **Skill level:** Intermediate. Seen on dry lanes.
- **Evidence:** PBA (F). Sources: [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Glossary only
- **Glossary:** Releasing the ball past the foul line so it lands a little way down the lane.
- **Placement:** Glossary only
- **Priority:** Low

### Tree 7: Targeting & Spares (10 topics)

#### Aim at the arrows, not the pins  `tg-arrows`
- **Tree:** Targeting & Spares
- **Skill level:** Beginner. The first tip most coaches give.
- **Evidence:** USBC (F): use the dots and arrows. PBA (F): seven arrows in a triangle starting 16 ft past the foul line. Reddit (S) agrees. Sources: [USBC, Approach position for entry-level bowlers (Learn, 2009)](https://bowl.com/news/approach-position-for-entry-level-bowlers) (F); [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F); [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F); [r/Bowling: how exactly do you aim](https://www.reddit.com/r/Bowling/comments/1c7ahpx/how_exactly_do_you_aim/) (S); [r/Bowling: aiming tips](https://www.reddit.com/r/Bowling/comments/1dv2csv/general_aiming_advicetips/) (S)
- **Bubble:** Look at the arrows (about 15–16 ft away), not the pins (60 ft). A small miss at the arrows becomes a big miss at the pins.
- **Glossary:** The seven arrows on the lane are your aiming marks. They're closer than the pins, so they're easier to hit consistently.
- **Placement:** Bubble (Targeting (#/target)) + Glossary
- **Priority:** High (v1 bubble #2)

#### Beginner starting line  `tg-start-target`
- **Tree:** Targeting & Spares
- **Skill level:** Beginner. 'Where do I stand and aim' is a top beginner question.
- **Evidence:** USBC Fundamentals (F): stand on board 20 using the inside of the slide shoe and aim at the 2nd arrow from your gutter. USBC entry article (F). Sources: [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F); [USBC, Approach position for entry-level bowlers (Learn, 2009)](https://bowl.com/news/approach-position-for-entry-level-bowlers) (F)
- **Bubble:** Start with the inside of your slide foot on board 20 (the center dot) and aim at the 2nd arrow from your gutter. Adjust from there.
- **Glossary:** USBC's suggested first setup for most beginners. It leaves room for error on both sides.
- **Placement:** Bubble (Targeting (#/target)) + Glossary
- **Priority:** High

#### Move toward the miss  `tg-move-miss`
- **Tree:** Targeting & Spares
- **Skill level:** Beginner. The basic adjustment.
- **Evidence:** USBC Fundamentals (F): 'the Golden Rule', keeping the same target. Repo targeting doc. Sources: [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F); [Repo: move rules, 2-and-1, drift, breakpoint 8-10 @ 39-41 ft (sources and labels listed there)](docs/TEAM_PROMPT_TARGETING.md) (repo)
- **Bubble:** Missed left? Move your feet left. Missed right? Move right. Keep the same target.
- **Glossary:** USBC's Golden Rule: keep your target as the pivot and shift your feet in the direction the ball missed.
- **Placement:** Bubble (Targeting (#/target) move suggestions) + Glossary
- **Priority:** High (v1 bubble #3)

#### 2-and-1 move  `tg-2and1`
- **Tree:** Targeting & Spares
- **Skill level:** Intermediate. League bowlers hear it from teammates.
- **Evidence:** bowl.com via the repo targeting doc. Reddit (S): 3-and-1 and 4-and-2 variants. Sources: [Repo: move rules, 2-and-1, drift, breakpoint 8-10 @ 39-41 ft (sources and labels listed there)](docs/TEAM_PROMPT_TARGETING.md) (repo)
- **Bubble:** Feet 2 boards, eyes 1 board, both in the same direction. That changes your angle while keeping the breakpoint close.
- **Glossary:** A paired adjustment that moves your feet twice as far as your target. Other ratios exist.
- **Placement:** Bubble (Targeting (#/target) move suggestions) + Glossary
- **Priority:** High

#### Drift  `tg-drift`
- **Tree:** Targeting & Spares
- **Skill level:** Intermediate. People worry they 'walk crooked'.
- **Evidence:** bowl.com via the repo: 1–2 boards is fine if consistent. PBA (F). Sources: [Repo: move rules, 2-and-1, drift, breakpoint 8-10 @ 39-41 ft (sources and labels listed there)](docs/TEAM_PROMPT_TARGETING.md) (repo); [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Drift = how far you walk left or right on the approach. 1–2 boards is fine if it's the same every time.
- **Glossary:** Sideways movement during the approach. Consistency matters more than walking perfectly straight.
- **Placement:** Bubble (Targeting (#/target)) + Glossary
- **Priority:** Medium

#### Key pin  `tg-key-pin`
- **Tree:** Targeting & Spares
- **Skill level:** Beginner. The first step of any spare system.
- **Evidence:** USBC Fundamentals (F). Sources: [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F)
- **Bubble:** Key pin = the pin closest to you, usually the lowest number. Hit it and the rest usually follow.
- **Glossary:** The pin to aim at in a spare leave: the single standing pin, or the front pin of a cluster.
- **Placement:** Bubble (Quick log leave) + Glossary
- **Priority:** High

#### 3-6-9 spare system  `tg-369`
- **Tree:** Targeting & Spares
- **Skill level:** Beginner. The most-cited basic spare system.
- **Evidence:** USBC Fundamentals (F) and the repo's USBC 3-6-9 table (F there). Sources: [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F); [Repo: USBC 3-6-9 table (F there); Reddit items S there](docs/FEATURE_DEMAND_RESEARCH.md) (repo)
- **Bubble:** Same target; move your feet 3 boards per column the key pin is from the headpin, opposite the pin. 10 pin = 9 boards left (right-handers).
- **Glossary:** USBC's spare system for straighter or slight-hook bowlers. Know your strike board, find the key pin, move 3, 6 or 9 boards, and roll across the lane at it.
- **Placement:** Bubble (Targeting (#/target) spare mode / Quick log leave) + Glossary
- **Priority:** High (v1 bubble #5)

#### 10 pin (RH) / 7 pin (LH)  `tg-10pin`
- **Tree:** Targeting & Spares
- **Skill level:** Beginner. The most-asked single spare.
- **Evidence:** Reddit threads (S). Retailer article (S). The 3-6-9 move is from USBC (F). Sources: [r/Bowling: picking up the 10 pin](https://www.reddit.com/r/Bowling/comments/11gtz57/tips_for_picking_up_10_pin/) (S); [r/Bowling: 10 pin as a righty](https://www.reddit.com/r/Bowling/comments/98dqrf/tips_for_getting_the_10_pin_as_a_righty/) (S); [bowlingball.com, Converting the 10 pin (retailer)](https://www.bowlingball.com/BowlVersity/how-to-convert-the-ten-pin-spare) (S); [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) (F)
- **Bubble:** Shoot across the lane at it with a flatter release or a plastic ball, so it can't hook into the gutter. Right-handers: move 9 boards left (3-6-9).
- **Glossary:** The corner pin on the far side from your hand. It's hard because a hooking ball tends to curve away from it.
- **Placement:** Bubble (Quick log leave (10 / 7 pin)) + Glossary
- **Priority:** High

#### Common leave names  `tg-leaves`
- **Tree:** Targeting & Spares
- **Skill level:** Beginner. Slang people hear on the lanes.
- **Evidence:** PBA (F): baby split, Big Four, sleeper and washout definitions. Sources: [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) (F)
- **Bubble:** Glossary only
- **Glossary:** Baby split: 2-7 or 3-10. Big Four: 4-6-7-10. Sleeper: a pin hidden behind another, like the 2-8. Washout: a leave with the headpin standing plus other pins, like 1-2-10. It isn't a split.
- **Placement:** Glossary only
- **Priority:** Medium

#### Laydown & geometry  `tg-laydown`
- **Tree:** Targeting & Spares
- **Skill level:** Advanced. The app's Find tool uses it.
- **Evidence:** Repo targeting doc: Breakdown Bowling (laydown = feet − offset + drift) and Human Kinetics (Rule of 31). Sources: [Repo: move rules, 2-and-1, drift, breakpoint 8-10 @ 39-41 ft (sources and labels listed there)](docs/TEAM_PROMPT_TARGETING.md) (repo)
- **Bubble:** Glossary only
- **Glossary:** Laydown is the board where the ball lands. Feet, offset and drift set it. The Rule of 31 is one book's way to estimate a target from the breakpoint.
- **Placement:** Glossary only
- **Priority:** Low

## 4. Styles summary: one-handed, two-handed, no-thumb

Write about all three neutrally. No source we fetched ranks one style above another; the rule facts are the only hard facts.

| | One-handed (thumb in) | Two-handed | One-handed, no thumb |
|---|---|---|---|
| **What it is** | Thumb and two fingers in the ball. USBC's handshake release puts the thumb at 11 o'clock for RH and 1 o'clock for LH, and the thumb exits first ([USA Bowling QR](https://images.bowl.com/bowl/media/legacy/internap/bowl/youthresourcecenter/usa-bowling/coaching/USA_Bowling_Coaching_QuickReference_FundamentalsP2.pdf), F; [USBC Fundamentals](https://bowl.com/coaching/fundamental), F). | The non-bowling hand stays on the ball until just before release. USBC calls it the "most popular new technique", chosen for faster speed and more revs; it has a shorter backswing and a quicker tempo, and the thumb is optional ([USBC Bowling Styles](https://bowl.com/welcome/bowling-styles), F). | Fingers only, one hand. It's described as adding revs but harder to repeat (Reddit S; [Bowling Addicts](https://www.bowlingaddicts.com/thumbless-vs-two-handed/), F, retail blog). |
| **Legal?** | Yes. | Yes, in USBC play (USBC Styles F; r/Bowling rule threads S). | Yes. The ball must be drilled with no thumb hole and is marked "+" on the palm side, because every hole must be gripped (USBC ES Manual 03/26 via `docs/ARSENAL_MANAGER_RESEARCH.md`, F there). |
| **Trade-offs people report** | Most direct control and the easiest spare shooting. Usually needs a fingertip reactive ball to get a strong hook. | More revs. Timing is harder, and spares often go to a plastic spare ball (Reddit S; retail blog F). | Hard to repeat. Wrist load is reported, which is medical-adjacent, so it stays out of the app. Evidence is weak ⚠. |
| **Switching** | A switch changes release, timing and spares together. People report a temporary average drop (retail blog F; Reddit S). USBC youth bowlers who switch between 2H and 1H must establish a new average ([USBC rules-to-consider](https://images.bowl.com/bowl/media/assets/usbc/rules/general%20pdfs/060624_rules-to-consider-loh-06-01-2024.pdf), F). | | |

**What the app should say:**
- "Two-handed is legal, and it's a trade-off, not an upgrade."
- "A thumb hole means thumb in; a no-thumb ball is drilled without one."

**What it should never say:**
- that any style is "better", "correct" or "the modern way";
- anything about wrist or injury risk; route those questions to a coach.

## 5. Approaches summary: 4-step and 5-step (and others)

- **4-step.** The pushaway and the first step move together. USBC Bowling Styles (F) calls it "without a doubt the most used by any level player". To set your start, put your heels at the foul line, take 4½ steps back and turn around (USBC Fundamentals F; USBC Styles F).
- **5-step.** USBC (F) says it "simply includes a step before the ball and ball-side foot move together".
  - That first step is a small step with the non-ball-side foot (the slide foot), and the ball stays still (USBC Fundamentals F; USA Bowling QR F).
  - Measure 5½ steps instead of 4½.
- **Which to use.** Coaches and Reddit agree: use the one whose timing you can repeat (Reddit S; Nick the Bowling Coach S). No fetched source ranks one above the other.
  - USBC Fundamentals (F) suggests changing ball height to match your natural tempo rather than forcing your feet: hold the ball lower if your feet are fast, higher if they're slow.
- **Other counts.** USA Bowling (F) allows "multiple steps" before the ball moves, and uses a one-step drill to teach the release. There's no data on how common 3, 6 or 7 steps are. ⚠
- **Common misconception:** "5 steps is the advanced version." It is the same delivery with one starter step.

## 6. Shammy, towel and accessories notes

**What's well supported (F):**
- **Wipe the ball every shot.** Wiping during play is a dry wipe; once competition starts, USBC Rule 18 bans liquid cleaner, abrasives and other foreign material on the ball (Rule 18 via the repo; [USBC approved cleaners](https://images.bowl.com/bowl/media/assets/usbc/equipment%20specs/approved%20cleaners/082626_approved-cleaner-list-for-website-current.pdf), F).
  - Cleaners that don't change surface roughness may be used during competition only with special permission.
  - The approved list includes rubbing alcohol, Simple Green (Original) and Windex.
- **USBC's season checklist** (Fundamentals, F): check fit, replace inserts, clean with rubbing alcohol or a ball cleaner, resurface, and hand-wash your towel with a grease-fighting detergent.
- **The vendor test** ([NBA/CtD](https://www.nationalbowlingacademy.com/video/lane-shine-important-017681), F, a single test): a 2500-grit ball read about 4300 after 13 shots that never touched the lane. Its advice is to dry-wipe every shot, clean after bowling, and resurface every 3–6 games. That interval is the vendor's advice, not USBC's, so it isn't used in bubbles.
- **Shoes** (USBC Fundamentals F; BowlersMart F):
  - Wear shoe covers whenever you step off the approach.
  - Break in new slide soles with a soft wire brush, toe to heel.
  - Never put rosin on a slide sole.
  - Slide powder is used sparingly and never on the approach (USBC: technically defacing it).

**Shammy vs microfiber** (S only):
- Common practice is a leather shammy between shots and a microfiber pad with cleaner after the session.
- Some say a dry microfiber smears oil.
- Treat it as habit, not rule. ⚠

**Accessories people report carrying** (S only; how popular each item is was not measured ⚠):
- towel or shammy;
- tape;
- rosin bag;
- shoe covers;
- shoe brush;
- spare soles and heels (BowlersMart F suggests 3–5 soles and 2 heels);
- cleaner for after the session;
- wrist support: a health-adjacent choice, so the app doesn't recommend it.

**Tape** is a short-term fit patch. If you need a lot of it every week, the ball needs a pro-shop fit (S).

## 7. Weak or conflicting evidence (flagged ⚠ in the trees)

| Topic | Problem | How it's handled |
|---|---|---|
| One-handed no-thumb (`st-nothumb`) | Reddit S plus one retail blog. Wrist claims are medical. | Bubble covers the rule fact only. Neutral glossary entry. |
| Step counts other than 4 or 5 (`st-other-steps`) | Only "multiple steps allowed" (USA Bowling F). | Glossary only. |
| Switching styles (`st-switching`), "1H→2H is easier than the reverse" | Anecdotal (S, retail blog). | Glossary only, no claim about which direction is easier. |
| Stroker / tweener / cranker (`st-labels`) | Definitions vary by source. | Glossary only, framed as descriptions, not levels. |
| Slide-sole numbers across brands | Dexter's scale is F; other brands differ, and Epic pads are cross-brand (BowlersMart F). | Bubble names Dexter explicitly and says the numbers are brand-specific. |
| Wood vs synthetic approach (`sh-approach-surface`) | One retailer (F) only. | Glossary only. |
| Accessories, microfiber, tape, rosin, wrist support, bag contents | S or retail only; popularity not measured. | Glossary only (tape has a bubble that makes no popularity claim). |
| Lane shine numbers (`eq-laneshine`) | A single vendor test (F). | Bubble says "one test". |
| Asymmetric core "more angular" (`eq-asym`) | Retailer and manufacturer only (S). | Bubble hedged ("tend to"). Medium priority. |
| Speed/rev match (`bm-matchup`) | The "~350 rpm at 15 mph" rule of thumb is a single Reddit post (S). | Glossary only, no numbers. |
| Over/under (`bm-over-under`) | No authoritative definition fetched. | Glossary only. |
| **Entry angle** (`bm-entry-angle`) | Repo uses a 4–6° window; BowlVersity (F) cites 6–7°; the repo engine report notes real house entry angles around 1° vs the drawn ~4°. | Glossary only, no degrees. |
| **Sport-pattern ratio** (`ln-sport`) | The bowl.com sport page (F) says 4:1 or lower; the 2014 USBC Sport Bowling Technical Manual (S) says 3:1 maximum. | Bubble quotes the bowl.com figure. Glossary notes both. |
| **RG and oil** (`eq-rg`) | Retail pages disagree on whether low-RG balls suit dry or oily lanes. | Bubble only says low RG revs up sooner. No oil mapping. |
| Blind / absentee score (`sc-blind`) | USBC (F): average − 10 by default. PBA lingo (F): just the average. | Glossary says "check your league rule". |
| Ball weight 10% rule and 16 lb max (`eq-weight`) | Retailer and Reddit (S). The USBC spec page was not opened in this pass. | Bubble calls 10% "only a rough starting point". |
| Arrow distance | PBA (F): arrows start 16 ft past the foul line. Reddit (S) says ~15 ft. | Bubble says "about 15–16 ft". |
| Bubbles backed by S evidence only | `eq-weight` (S plus retail), `sh-tape`, `tg-10pin` (technique S; the 3-6-9 move is F). | Kept conservative. Verify before release if possible. |

## 8. Keep these out of bubbles

These are glossary only at most, or AI chat with a redirect:
- **Layouts and pin/CG placement** (`eq-layout`). Pro-shop decision; the app must not invent layouts.
- **Balance holes** (`eq-holes-rule`). Banned under the current ES Manual. Older pages, including PBA's lingo, still describe them, so a bubble would invite confusion.
- **Entry-angle degrees, RPM targets, speed/rev match numbers.** Sources conflict or are unverified (§7).
- **Wrist braces, injuries, soreness and pain.** Medical. The fit bubble stops at "the fit is off, see a pro shop".
- **Topography and KOSI pattern-graph reading** (`ln-topography`, `ln-graph`). Advanced and easy to over-read; Kegel says graphs show how a pattern plays, not where to stand.
- **Rule of 31 / laydown math** (`tg-laydown`). The Targeting screen already shows the numbers; a bubble would duplicate it.
- **Brand or product recommendations** of any kind, and brand-to-brand sole-number conversions.
- **Exact maintenance intervals as rules.** Show them as "brands say…", as in the repo's Arsenal Manager research.
- **Style superiority.** No bubble compares styles except on rule facts.

### Bubble voice checklist
- Number or rule first, then the fix: "Higher number = more slide."
- At most 2 sentences, plain words, no "simply" or "just" aimed at the reader, no exclamation marks.
- Say "right-handers" or "lefties" when direction matters; never assume the hand silently.
- Say where the number comes from when it's a single source ("one test", "USBC", "brands say").
- Present choices as trade-offs ("usually adds revs; the trade-off is timing"), never as better or worse.


## 9. All sources

| Key | Label | Source |
|---|---|---|
| addicts_thumbless | F | [Bowling Addicts, Thumbless vs two-handed (retailer blog; RPM figures not verified)](https://www.bowlingaddicts.com/thumbless-vs-two-handed/) |
| baker_pdf | S | [GLDBA Baker format sheet](https://www.gldba-gldwba.org/pdfs/baker.pdf) |
| bcom_acc | S | [bowling.com, 5 essential accessories (retailer)](https://www.bowling.com/knowledge-hub/bowling-accessories/5-most-essential-bowling-accessories) |
| bcom_hook | S | [bowling.com, Why isn't my ball hooking (retailer)](https://www.bowling.com/knowledge-hub/questions/bowling-tips/hooking-a-bowling-ball/question_10_why-isn-t-my-bowling-ball-hooking-even-when-i-try-to-rotate-my-wrist) |
| bcom_rg | S | [bowling.com, What do RG and differential mean (retailer)](https://www.bowling.com/knowledge-hub/questions/bowling-balls/ball-cores/question_173_what-do-rg-and-differential-mean-in-bowling-ball-cores) |
| bcom_spare | S | [bowling.com, Choosing a spare ball (retailer)](https://www.bowling.com/knowledge-hub/questions/bowling-balls/choosing-a-spare-ball) |
| bcom_wt | S | [bowling.com, the 10% rule (retailer)](https://www.bowling.com/knowledge-hub/questions/bowling-balls/ball-weight-choice/question_24_what-is-the-10-rule-for-choosing-a-bowling-ball-weight) |
| bmart_soles | F | [BowlersMart, Soles and heels explained (retailer)](https://www.bowlersmart.com/learn/shoes/soles-and-heels/) |
| bsmart_towel | S | [BowlersMart, Towels and shammies (retailer)](https://www.bowlersmart.com/learn/accessories/towels-and-shammies) |
| btm_bench | S | [Bowling This Month, The benchmark ball](https://www.bowlingthismonth.com/quick-tips/the-benchmark-ball/) |
| btm_speed | S | [Bowling This Month, Generating less ball speed](https://www.bowlingthismonth.com/quick-tips/generating-less-ball-speed/) |
| bv_10pin | S | [bowlingball.com, Converting the 10 pin (retailer)](https://www.bowlingball.com/BowlVersity/how-to-convert-the-ten-pin-spare) |
| bv_axis | F | [bowlingball.com BowlVersity, Axis tilt and axis of rotation (retailer)](https://www.bowlingball.com/BowlVersity/bowling-ball-axis-tilt-and-axis-of-rotation) |
| bv_bag | S | [bowlingball.com, What's in your bag (retailer)](https://www.bowlingball.com/BowlVersity/whats-in-your-bowling-bag) |
| bv_cover | F | [bowlingball.com BowlVersity, Solid vs pearl vs hybrid (retailer)](https://www.bowlingball.com/BowlVersity/simple-differences-between-solid-pearl-and-hybrid-bowling-balls) |
| bv_phases | F | [bowlingball.com BowlVersity, Three phases of ball motion (retailer)](https://www.bowlingball.com/BowlVersity/the-three-phases-of-bowling-ball-motion) |
| bv_thumb | S | [bowlingball.com, Your thumb hole is too big (retailer)](https://www.bowlingball.com/BowlVersity/grip-pressure-your-thumb-hole-is-too-big-) |
| dexter | F | [Dexter, Sole and heel guide](https://www.dexterbowling.com/en/sole-and-heel-guide) |
| dexter_heels | S | [Dexter, Bowling heels](https://www.dexterbowling.com/en/bowling-heels/) |
| ibf_rules | S | [IBF Universal Playing Rules ch. 2 (scoring)](https://bowling.sport/universal-playing-rules-chapter-2) |
| kegel_carry | S | [Kegel, Oil pattern breakdown and carrydown](https://www.kegel.net/articles/oil-pattern-breakdown-and-carrydown) |
| kegel_kosi | F | [Kegel, Reading composite oil pattern graphs](https://www.kegel.net/articles/oil-pattern-kosi-graphs) |
| motiv_warr | F | [Motiv, Ball warranty (temperature exclusion)](https://www.motivbowling.com/company/ball-warranty.html) |
| nba_2h | S | [National Bowling Academy, Two-handed advantages and disadvantages](https://www.nationalbowlingacademy.com/video/two-handed-bowling-advantages-disadvantages-025341) |
| nba_shine | F | [National Bowling Academy x Creating the Difference, Lane shine test (vendor-run, one ball)](https://www.nationalbowlingacademy.com/video/lane-shine-important-017681) |
| nba_surface | S | [National Bowling Academy, Surface adjustments](https://www.nationalbowlingacademy.com/video/ball-reaction-surface-adjustments-016738) |
| nick_45 | S | [Nick the Bowling Coach, 4-step vs 5-step](https://nickthebowlingcoach.com/mastering-your-bowling-approach-4-step-vs-5-step-guide/) |
| pba_lingo | F | [PBA, Bowling Lingo](https://www.pba.com/about/bowling-lingo) |
| r_10pin1 | S | [r/Bowling: picking up the 10 pin](https://www.reddit.com/r/Bowling/comments/11gtz57/tips_for_picking_up_10_pin/) |
| r_10pin2 | S | [r/Bowling: 10 pin as a righty](https://www.reddit.com/r/Bowling/comments/98dqrf/tips_for_getting_the_10_pin_as_a_righty/) |
| r_2h1 | S | [r/Bowling: one-handed vs two-handed](https://www.reddit.com/r/Bowling/comments/195h4hs/) |
| r_2h2 | S | [r/Bowling: switching to two-handed](https://www.reddit.com/r/Bowling/comments/1ppur2d/) |
| r_2h3 | S | [r/Bowling: is two-handed better](https://www.reddit.com/r/Bowling/comments/1qa9fk3/) |
| r_2hrule1 | S | [r/Bowling: two-hand delivery USBC rule](https://www.reddit.com/r/Bowling/comments/th02zx/two_hand_delivery_vs_two_hand_approach_usbc_rule/) |
| r_2hrule2 | S | [r/Bowling: USBC league two-handed question](https://www.reddit.com/r/Bowling/comments/1fa8wak/bowling_league_usbc_2handed_question/) |
| r_2hrule3 | S | [r/Bowling: switching styles legality](https://www.reddit.com/r/Bowling/comments/1oermic/league_ruleslegality_question_switching_styles/) |
| r_45a | S | [r/Bowling: 4 vs 5 steps](https://www.reddit.com/r/Bowling/comments/1dtrt8p/4_vs_5_steps/) |
| r_45b | S | [r/Bowling: 4 vs 5 step approach](https://www.reddit.com/r/Bowling/comments/bm1zan/4_vs_5_step_approach/) |
| r_45c | S | [r/Bowling: 4 vs 5 step approach](https://www.reddit.com/r/Bowling/comments/8vrleo/4_vs_5_step_approach/) |
| r_45d | S | [r/Bowling: step count question](https://www.reddit.com/r/Bowling/comments/1pa6o4s/) |
| r_aim1 | S | [r/Bowling: how exactly do you aim](https://www.reddit.com/r/Bowling/comments/1c7ahpx/how_exactly_do_you_aim/) |
| r_aim2 | S | [r/Bowling: aiming tips](https://www.reddit.com/r/Bowling/comments/1dv2csv/general_aiming_advicetips/) |
| r_bag1 | S | [r/Bowling: bag must-haves](https://www.reddit.com/r/Bowling/comments/1fd65rd/bag_must_haves/) |
| r_bag2 | S | [r/Bowling: go-to bowling stuff](https://www.reddit.com/r/Bowling/comments/119om0u/go_to_bowling_stuff_you_feel_like_is_necessary/) |
| r_baker | S | [r/Bowling: what is Baker](https://www.reddit.com/r/Bowling/comments/1icshjn/) |
| r_burn1 | S | [r/Bowling: burned-out lanes](https://www.reddit.com/r/Bowling/comments/bv8ndn/how_to_play_on_burned_out_lanes/) |
| r_burn2 | S | [r/Bowling: early hook when lanes burn up](https://www.reddit.com/r/Bowling/comments/dzibfq/struggling_with_early_hook_when_lanes_burnup/) |
| r_clean1 | S | [r/Bowling: best ball cleaner](https://www.reddit.com/r/Bowling/comments/1bjlrzr/whats_the_best_ball_cleaner/) |
| r_clean2 | S | [r/Bowling: cleaning with alcohol](https://www.reddit.com/r/Bowling/comments/ixvy9n/cleaning_ball_with_alcohol/) |
| r_first1 | S | [r/Bowling: first ball to buy](https://www.reddit.com/r/Bowling/comments/19dig7r/) |
| r_first2 | S | [r/Bowling: first reactive ball](https://www.reddit.com/r/Bowling/comments/13f4fgk/) |
| r_first3 | S | [r/Bowling: beginner ball recommendation](https://www.reddit.com/r/Bowling/comments/1m8be60/) |
| r_fit1 | S | [r/Bowling: fit advice](https://www.reddit.com/r/Bowling/comments/13vb69a/fit_advice/) |
| r_fit2 | S | [r/Bowling: thumb issues](https://www.reddit.com/r/Bowling/comments/1l81k8r/thumb_issues/) |
| r_harder1 | S | [r/Bowling: does throwing harder help](https://www.reddit.com/r/Bowling/comments/4mwput/does_rolling_the_ball_harder_increase_the_odds_of/) |
| r_harder2 | S | [r/Bowling: downsides of throwing too fast](https://www.reddit.com/r/Bowling/comments/175hwn2/any_downsides_to_throwing_the_ball_too_fast/) |
| r_hdcp1 | S | [r/Bowling: handicaps ELI5](https://www.reddit.com/r/Bowling/comments/1b3iknh/handicaps_explain_it_like_im_5/) |
| r_hdcp2 | S | [r/Bowling: how handicap is calculated](https://www.reddit.com/r/Bowling/comments/1jt5a6q/) |
| r_hook1 | S | [r/Bowling: ball won't hook (beginner)](https://www.reddit.com/r/Bowling/comments/18zk9zf/) |
| r_hook2 | S | [r/Bowling: how to hook (beginner)](https://www.reddit.com/r/Bowling/comments/1hdpcbn/) |
| r_hook3 | S | [r/Bowling: same ball hooks one night, not the next](https://www.reddit.com/r/Bowling/comments/1ll5n5s/) |
| r_nt1 | S | [r/Bowling: one-handed thumbless bowlers](https://www.reddit.com/r/Bowling/comments/tj20tz/onehanded_thumbless_bowlers/) |
| r_nt2 | S | [r/Bowling: thumbless one-handed](https://www.reddit.com/r/Bowling/comments/4ad26z/thumbless_onehanded_bowling/) |
| r_nt3 | S | [r/Bowling: no-thumb advice](https://www.reddit.com/r/Bowling/comments/qmmzx6/advice_regarding_nothumb_bowling/) |
| r_oil | S | [r/Bowling: ELI5 sport shot vs house shot](https://www.reddit.com/r/Bowling/comments/16t742q/) |
| r_rg | S | [r/Bowling: what do RG and diff mean](https://www.reddit.com/r/Bowling/comments/8xss9u/) |
| r_rings1 | S | [r/Bowling: track and flare](https://www.reddit.com/r/Bowling/comments/1egypii/track_and_flare_questions/) |
| r_rings2 | S | [r/Bowling: what do the oil tracks mean](https://www.reddit.com/r/Bowling/comments/1nr5gco/what_do_the_oil_tracks_mean/) |
| r_score | S | [r/Bowling: how scoring works](https://www.reddit.com/r/Bowling/comments/mfcb9d/) |
| r_shammy1 | S | [r/Bowling: shammy vs microfiber](https://www.reddit.com/r/Bowling/comments/by35ha/) |
| r_shammy2 | S | [r/Bowling: what towel do you use](https://www.reddit.com/r/Bowling/comments/13eoia7/) |
| r_shammy3 | S | [r/Bowling: shammy care](https://www.reddit.com/r/Bowling/comments/1so0bz2/) |
| r_shine1 | S | [r/Bowling: polish vs lane shine](https://www.reddit.com/r/Bowling/comments/1can4oo/polish_vs_lane_shine/) |
| r_shine2 | S | [r/Bowling: lane shine](https://www.reddit.com/r/Bowling/comments/1faguv9/lane_shine/) |
| r_sole1 | S | [r/Bowling: which slide sole](https://www.reddit.com/r/Bowling/comments/1kav7if/) |
| r_sole2 | S | [r/Bowling: sticking on approach](https://www.reddit.com/r/Bowling/comments/14ejgt9/) |
| r_sole3 | S | [r/Bowling: S8 vs S10](https://www.reddit.com/r/Bowling/comments/1hj0365/) |
| r_spare1 | S | [r/Bowling: are spare balls worth it](https://www.reddit.com/r/Bowling/comments/u0l9ar/are_spare_balls_worth_the_money/) |
| r_spare2 | S | [r/Bowling: plastic or urethane for spares](https://www.reddit.com/r/Bowling/comments/1gm7mwx/should_i_get_a_plastic_or_urethane_ball_for_spares/) |
| r_speed1 | S | [r/Bowling: ball speed / rev rate](https://www.reddit.com/r/Bowling/comments/9dvv2h/advice_on_ball_speedrev_rate/) |
| r_speed2 | S | [r/Bowling: speed / matched / rev-dominant ranges](https://www.reddit.com/r/Bowling/comments/1p9pxot/speed_matched_rev_dominant_ranges/) |
| r_start | S | [r/Bowling: where do you start your approach](https://www.reddit.com/r/Bowling/comments/293b2e/where_do_you_start_and_end_your_approach/) |
| r_trans1 | S | [r/Bowling: struggling with the transition](https://www.reddit.com/r/Bowling/comments/17ftwxy/struggling_with_the_transition/) |
| r_trans2 | S | [r/Bowling: what makes you switch balls](https://www.reddit.com/r/Bowling/comments/erwua2/what_is_it_that_makes_you_switch_balls_in_the/) |
| r_wt1 | S | [r/Bowling: 10% body weight rule](https://www.reddit.com/r/Bowling/comments/8zpdox/10_percent_body_weight_up_to_16_pounds_for_a_ball/) |
| r_wt2 | S | [r/Bowling: what weight ball](https://www.reddit.com/r/Bowling/comments/1dz3w4j/what_weight_ball_should_i_use/) |
| repo_amr | repo | [Repo: USBC ES Manual 03/26, Rule 18, Siefers ball-life study, brand maintenance intervals (F there)](docs/ARSENAL_MANAGER_RESEARCH.md) |
| repo_dec | repo | [Repo: #22 split reading (USBC Rule 2h), first-ball foul respot](docs/DECISIONS.md) |
| repo_evr | repo | [Repo: USBC Ball Motion Study (top 5 path factors are coverstock-related, F there)](docs/ENGINE_VERIFICATION_REPORT.md) |
| repo_fdr | repo | [Repo: USBC 3-6-9 table (F there); Reddit items S there](docs/FEATURE_DEMAND_RESEARCH.md) |
| repo_tpt | repo | [Repo: move rules, 2-and-1, drift, breakpoint 8-10 @ 39-41 ft (sources and labels listed there)](docs/TEAM_PROMPT_TARGETING.md) |
| storm_anatomy | S | [Storm, Ball anatomy guide](https://www.stormbowling.com/ball-anatomy-guide) |
| storm_burn | F | [Storm, Cracking the code of the burn (manufacturer)](https://www.stormbowling.com/read/cracking-the-code-of-the-burn) |
| usab_qr | F | [USA Bowling Coaching Quick Reference, Fundamentals Phase 2](https://images.bowl.com/bowl/media/legacy/internap/bowl/youthresourcecenter/usa-bowling/coaching/USA_Bowling_Coaching_QuickReference_FundamentalsP2.pdf) |
| usbc_clean | F | [USBC approved cleaner list (rubbing alcohol, Simple Green Original, Windex)](https://images.bowl.com/bowl/media/assets/usbc/equipment%20specs/approved%20cleaners/082626_approved-cleaner-list-for-website-current.pdf) |
| usbc_core | S | [USBC, Core properties paper (not fetched)](https://images.bowl.com/bowl/media/legacy/internap/bowl/equipandspecs/pdfs/CoreProperties042207.pdf) |
| usbc_entry | F | [USBC, Approach position for entry-level bowlers (Learn, 2009)](https://bowl.com/news/approach-position-for-entry-level-bowlers) |
| usbc_etiq | F | [USBC, Etiquette and Lingo](https://bowl.com/welcome/etiquette-and-lingo) |
| usbc_fund | F | [USBC Coaching, Fundamental tips](https://bowl.com/coaching/fundamental) |
| usbc_loh | F | [USBC, Rules to consider (league handicap, averages, absentee)](https://images.bowl.com/bowl/media/assets/usbc/rules/general%20pdfs/060624_rules-to-consider-loh-06-01-2024.pdf) |
| usbc_rules | repo | [USBC Playing Rules 2025-26, Rule 18 (fetched for docs/ARSENAL_MANAGER_RESEARCH.md)](https://bowl.com/getmedia/64039e31-a0bb-42f1-94cb-81cb3b5fe6e9/USBC_Playing_Rules_2025_2026.pdf) |
| usbc_sport | F | [USBC, Sport Bowling information (pattern ratios)](https://bowl.com/sport-bowling/information) |
| usbc_styles | F | [USBC, Bowling Styles (4-step, 5-step, two-handed, spinner)](https://bowl.com/welcome/bowling-styles) |
| usbc_techman | S | [USBC 2014 Sport Bowling Technical Manual (search excerpt: 3:1 max, L18-R18 vs 3-7; conflicts with "4:1 or lower" on the bowl.com page)](https://images.bowl.com/bowl/media/legacy/internap/bowl/sportbowling/pdfs/2014SportBowlingTechManual.pdf) |
| pba_lingo (note) | F | Re-fetched 2026-10-24 via curl: confirms boards, arrows at 16 ft, dots at 7 ft, conventional vs fingertip, PAP, tilt, sleeper, washout, Baker, pocket, Brooklyn. Its balance-hole entry is out of date (see eq-holes-rule). |
