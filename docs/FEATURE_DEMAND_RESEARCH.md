# Feature Demand Research — what bowlers want next

Compiled 2026-10-23 for Arsenal Pro (Urbanek Honey Badgers). Docs only; no app code changed.

**Source labels**
- **F** = page fetched and read in full.
- **S** = search-engine excerpt only. The page itself was not read; treat it as a lead to verify.
- **A** = our assumption, flagged.

Reddit cannot be fetched from our tools (timeouts / HTML walls), so **every Reddit item is S**.

**How to read the "frequency" column.** We did not run a statistical survey. Counts are the number of **independent sources in this file** that raise the theme: reviews, threads, competitor positioning. A count is a signal, not a market share.

---

## 1. Ranked pain points and wishes

| # | Theme | Sources raising it | Evidence (quotes trimmed) |
|---|---|---|---|
| 1 | **Own my data: free history, free export, no paywall or forced subscription** | 9 | **LaneTalk App Store review (F):** "Now you had to get a pro membership to be able to add your balls into your arsenal and see more than the last two weeks of games… a money grab" (Niklpkl, 11/12/2025). Developer reply (F): "we needed to move personal game tracking and history into the Pro plan." **LaneTalk 4.14.18 release note, 11/03/2025 (F):** "streamlined our plans to focus on the full PRO experience". **LaneTrax review (F):** "most importantly a way to export the data to excel" (Dabino2330). **LaneTrax review (F):** "sick and tired of everything being a subscription… fully local data storage" (Lord Foog). **LaneLogic switch page (F, competitor marketing):** "CSV and PDF exports are free for every user". **r/Bowling F5 thread (S, excerpts; usernames not recorded):** "I would never, ever, pay a subscription"; "yearly membership fees = nonstarter". **LaneTalk review (F):** "Lanetalk has raped the free version of the app" (Ernest keeping it real, 08/28/2024). |
| 2 | **Manual scoring that never loses a game** | 4 | **LaneTalk review (F):** "after my three league games were recorded, I accidentally started a new game. When I backed out of this game… it erased all of my scores… when you press save at the end of a game, it is truly saved" (Yellow Viking, Mar 18). They are switching to "the other bowling app that is only a $9 one-time charge… saves the games as you input them". **LaneTrax dev reply (F):** scoring "will never be a feature in the app", because the camera cannot tell sleeper pins apart. **LaneTalk review (F):** "bugs with the UI that would require a full restart… inexplicably log you out from time to time" (vApathyv, Jan 26). **Reddit "Bowling app" threads (S):** fast pin-by-pin entry is the top ask. **PinPal (S):** one-time price, local backup. |
| 3 | **Pin-leave and spare-conversion stats by leave** | 5 | **LaneTalk Pro listing (F):** "Pin Leave Tracking… spare conversion, strike percentage", paywalled. **PinPal (S):** spare stats. **Reddit (S, paraphrase):** spare conversion by leave, single-pin vs multi-pin. **LaneLogic (F):** positions itself as the free LaneTalk alternative for stats. **Brunswick OpenLane "Pro Metrics" (S):** stats for Sync centers. |
| 4 | **Tag games and shots by ball and pattern ("what works where")** | 5 | **LaneTalk Pro (F):** "Tag your games with bowling balls, oil patterns, centers, leagues". **Witsee (F):** "Pair the Witsee sensor via Bluetooth… then assign it to your bowling ball"; "Unlimited Balls in Equipment". **Specto for All (S, paraphrase):** per-ball evaluation. **BowlSense (S):** sensor data per ball. **Arsenal Manager research (F, `ARSENAL_MANAGER_RESEARCH.md`):** BallRoom / StrikeStack. |
| 5 | **Release metrics: rev rate, speed, axis tilt and rotation, PAP** | 8 | **Accuracy matters (F):** LaneTrax reviewers complain that rev rate is off ("Shirai Family", "I'd say it's just OK"). The LaneTrax dev claims "Specto doesn't directly measure rev rate; it estimates it" (competitor claim, unverified). **Sensor launches in 2026 (all F product pages):** Witsee, Storm/F5, Ruby. BowlSense (S). **Tenpin Doctors "Find My RPM & Tilt" coming soon (S).** **r/Bowling Ruby thread (S):** users ask for swing, loft and impact metrics. **probowling.info (S):** Witsee vs F5 compared on the same ball (15.9 mph both; 325 vs 322 rpm; tilt 8° vs 6°; rotation 68° vs 80°). |
| 6 | **Notes and adjustment logging during practice** | 3 | **LaneTrax review (F):** "A notes section so you can keep track of things you saw as you practice. And a way to not[e] during practice you made an adjustment, feet position or hand or aim point" (Dabino2330, Aug 2). Dev (F): "planning to add notes for sessions and shots". **Ruby 1.1.1 (F, paraphrase):** session notes shipped. **Tenpin Toolkit (S):** arsenal and ball library alongside video tools. |
| 7 | **Video replay tied to shot data** | 3 | **LaneTrax review (F):** "The replay has been the most useful part" (Lord Foog). **LaneTrax review (F):** wants "a button to save the last minute or so of footage in case the shot wasn't tracked" (ltoleary3). **Tenpin Toolkit (S):** manual video speed and rev-rate tools. |
| 8 | **League and team tools: Baker, rosters, standings, recaps** | 5 | **LaneTrax review (F):** asks for a "'team' mode… track others when practicing or in league… without adding to MY stats" (hitdrumhard, 09/25/2025). Dev: a Coach Tier is coming. **LaneLogic, BowlSheet, Spare Me (S):** Baker and team scoring. **LaneTalk League Manager (S).** **LeagueSecretary dashboards (S).** **Reddit (S):** Baker and team scoring requests. |
| 9 | **Practice and spare drills kept separate from averages** | 4 | **Reddit (S, paraphrase):** keep practice and spare-drill tracking out of game averages. **Specto (S, paraphrase):** practice drills. **Tenpin Doctors PinPoint Duo (S):** boards at 7/15/40 ft for practice. **Ruby (F, paraphrase):** sessions tagged league / practice / tournament. |
| 10 | **Easy sensor swapping between balls** (sensor buyers only) | 3 | **r/Bowling Ruby thread (S, paraphrase):** commenters see a ~$250 sensor fixed in one ball as the main drawback; the maker says a swappable mount is in development. **F5 thread (S, paraphrase):** needs custom grips in each ball. **Witsee (F, paraphrase):** grip-hole mount, removable with a screwdriver, no drilling. |
| 11 | **Ball maintenance and arsenal health** | see `ARSENAL_MANAGER_RESEARCH.md` | BallRoom, PinPoint, LaneLogic, StrikeStack (all F). |

**Not supported by evidence found:**
- Social feeds and leaderboards. LaneTalk's comparison is praised once (F, vApathyv), but no source asks for more social.
- AI coaching chat.

We will not prioritize either without new evidence.

## 2. What competitors charge for (Oct 2026)

| Product | Free | Paid | Source |
|---|---|---|---|
| LaneTalk | Live scoring and league standings | Pro: history, manual entry, tags, pin leaves. IAPs listed: Pro $7.99, Pro $49.99, Basic Yearly $24.99, Pro Yearly USBC $29.99, Yearly (Pro) USBC $39.99 | App Store (F). LaneLogic states "$4.99/mo or $29.99/yr" (F, competitor claim; **conflicts** with the App Store, so the App Store figures win). |
| LaneTrax (phone camera) | App download | $9.99/mo or $89.99/yr | App Store (F) |
| Witsee (sensor) | Core metrics; only 3 saved sessions | $319 sensor; Premium $89.99/yr or $9.99/mo (unlimited sessions, **CSV export**) | witsee.com (F) |
| Storm F5 (sensor) | — | $199 kit with 1-year subscription; renewal price not published | r/Bowling (S). Not on the Storm page (F). |
| Ruby (sensor) | App free; "no subscription" | Sensor $249.99 | App Store (F, app free). Price is S (search synthesis); maker page showed no price (S, AthleteRX). |
| BowlSense Pro (sensor) | App | $199.99, no subscription (paraphrase) | bowlsense.io/shop (S) |
| Tenpin Doctors PinPoint | — | $3.99/mo or $19.99/yr | App Store (S) |
| LaneLogic | Scoring, history, CSV/PDF export | Optional premium (price not read) | lanelogic.net (F) |
| PinPal | Lite: 1 league, 4 weeks | One-time purchase | App Store (S) |

**Gaps they leave:**
- No product joins **lane-path prediction**, **arsenal specs and maintenance**, **oil pattern** and **measured release data** in one free, local-first app.
- Export is often paywalled: Witsee CSV is Premium; LaneTalk has none (F, per LaneLogic); LaneTrax CSV is "on our roadmap" (F, dev reply).
- **Spare system coaching** (where to stand) is absent from score trackers. They count leaves but do not tell you the move.

## 3. Coaching content to build on

- **USBC 3-6-9 Spare Conversion System PDF** (images.bowl.com/…/369 Spare Conversion System.pdf), F. The PDF's table has a right-hand and left-hand column:

  | Key pin | Move | RH start board | LH start board |
  |---|---|---|---|
  | 1 or 5 | none | 20 | 20 |
  | 2 or 8 | 3 boards right | 17 | 23 |
  | 4 | 6 right | 14 | 26 |
  | 7 | 9 right | 11 | 29 |
  | 3 or 9 | 3 left | 23 | 17 |
  | 6 | 6 left | 26 | 14 |
  | 10 | 9 left | 29 | 11 |

  - **Note:** the PDF is a table of example starting boards when the strike position is board 20.
  - **A:** we treat the rule as "same target, move feet by N boards from your own strike position".

## 4. Rules that limit sensor features

**USBC Equipment Specifications Manual 03/26** (F):
- "Moveable devices are not permitted for use in a bowling ball at any time."
- Removable devices are allowed only to change span, pitch or grip-hole size; they must be non-metallic, locked during delivery and ≤ 1.5 g/mL.

**AthleteRX (S):** the USBC approved removable-devices list (Oct 2026) "listed interchangeable thumb and finger grips but no electronic sensors."

**A:** treat sensor data as **practice-only**. Arsenal Pro must not imply that sensors are legal in certified play.

## 5. Source list

**Fetched (F):**
- https://apps.apple.com/us/app/lanetalk/id493763132 (reviews, release notes, IAP list)
- https://apps.apple.com/us/app/lanetrax/id6475736816?see-all=reviews
- https://apps.apple.com/us/app/ruby-bowling/id6762580021
- https://rubybowling.com
- https://www.witsee.com/mobile-app/
- https://www.stormbowling.com/f5-bowling-sensor
- https://lanelogic.net/from-lanetalk (competitor marketing)
- USBC 3-6-9 Spare Conversion System PDF (images.bowl.com)
- USBC Equipment Specifications Manual 03/26 (bowl.com)

**Search excerpts (S):**
- r/Bowling threads on F5, Ruby and bowling apps (reddit.com)
- Google Play LaneTalk listing
- lanetalk.com
- AthleteRX sensor round-up
- bowlsense.io
- Tenpin Doctors / PinPoint and Tenpin Toolkit App Store listings
- PinPal App Store listing
- Kegel Specto pages and FAQ
- probowling.info Witsee vs F5
- LeagueSecretary
- Brunswick OpenLane / Performance Index
- F5 Bowling App Store listing (id6805571218)
