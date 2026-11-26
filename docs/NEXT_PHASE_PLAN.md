# Next phase: feedback and data without recruited testers (v83 → about Dec 13, 2026)

> **26 November 2026, 4:39 PM America/Chicago.** The current launch document is [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md): six workstreams, a go / no-go list, and owner decisions. This file is the 22 November no-tester plan it builds on. Live check that day: PWA still `arsenal-pro-v83`, API deploy `dep-dc1mk960tbcc73au9ke0` still live, `/api/health` 200 (17.2 s cold, 0.07 s warm), owner-summary totals still all zero.


Written Sunday, Nov 22, 2026 (America/Chicago). Owner asks: t176u "plan and work on what's next for the app", then t177u "I don't have private beta testers, so we need to figure out how to capture feedback and data."

**What this replaces.** The launch plan Page (canvas 69de6976…, Nov 21) had Weeks 2-4 as a private beta with 10-30 recruited Honey Badgers and league bowlers. The owner has no testers to recruit, so that phase is replaced by the **no-tester loop** below: the owner dogfoods every league night, real visitors come only through channels the owner posts to himself, and the app captures what it can with **opt-in, first-party** data. Week 1 (readiness + feedback build) is done in v82. The later phases (wider beta, launch decision) keep their gates, with the readiness numbers in section 5.

**Rules that do not change.** Opt-in only (usage counts and crash reports stay OFF until the bowler taps). No third-party analytics or scripts; CSP `script-src 'self'` unchanged. Nothing is asked during active scoring. No nagging: each ask happens at most once. The bot never posts, messages or contacts anyone; it drafts and the owner posts. Not legal advice.

## 1. Where things stand (verified Nov 22, 2026, ~2:45 PM CT)
| Check | Result |
|---|---|
| Live PWA | `CACHE = 'arsenal-pro-v82'` on GitHub Pages |
| API deploy `dep-dc170ad9fdbs739vtbbg` | **live** (Render: started 10:31:37 PM CT Nov 21, finished 10:32:01 PM CT, commit 9af5171, trigger api) |
| `GET /api/owner/summary` with no token | **401** twice (so the owner read is on, the token is set on Render; it would be 404 if it were not) |
| The four "in progress" UX todos | **Already shipped in v73** (PR #10): tonight's bag + oil/lane on top of Bag, the 📌 pin renamed **Keep in bag** with the line "Kept: stays when you repack, change Bring or shake it up.", **Shake it up** with Undo. Nothing to build; the todo list was stale |
| Spec TBD rows | Researched in v77 (`SPEC_FILL_2026-11-12.md`): 54 rows still lack RG or differential, 10 excluding plastic spare balls, and the remaining gaps have no legal printed source. Only Storm Mix Platinum is a known suspect row |
| Open app PR | #21 wake the API on user intent (review only) |
| Feedback v82 capture | Feedback sheet (speech bubble + Me), post-game "How useful was tonight?" 1-5 (every 3 finished games, once a night), opt-in usage counts and crash reports **found only in Me › Privacy** |

**Audit of v82 capture (t177u a).** Nothing ever told a bowler the two switches exist: they sit in the middle of the Me screen, so without testers the expected number of opted-in phones is close to zero, and the usage table could not show *where* new bowlers stop (it had totals, but no first-time steps and no denominator). The post-game question needs 3 finished games, so a visitor who never bowls a game is never asked anything. v83 fixes these (section 3).

## 2. Plan, in priority order
Sizes: **S** under half a day, **M** 1-2 days, **L** 3+ days. "Beta-blocking" = we cannot learn anything from real visitors without it.

| # | Item | Why (rationale) | Size | Who | When | Status |
|---|---|---|---|---|---|---|
| 1 | **One-time opt-in offer + activation funnel + Share the app** (app v83) | Without testers, the only data comes from strangers who opt in. Research says ask in context, explain the benefit, let people say no and reverse it (NN/g, web.dev, §4). Funnel steps show where a new bowler stops | S | Bot | Week 1 | **Built, PR open** |
| 2 | **API: accept funnel keys, say which keys it stored, digest funnel + scorecard** (arsenal-pro-api PR #10) | The v82 API ignores unknown keys; v83 holds new counts on the phone until the API lists them, so nothing is lost, but nothing arrives either until this deploys | S | Bot builds; **owner OKs deploy** | Week 1 | **Built, PR open** |
| 3 | **Theme flash fix** (app v83) | Bowlers who picked Maple, Night or Light saw one frame of the default look on every open. First impressions are all we get with strangers | S | Bot | Week 1 | **Built, PR open** |
| 4 | **Owner dogfooding loop** (section 3c) | One right-handed tweener with a Ruby sensor, every league night, is the only guaranteed user. A written checklist turns it into data | S per week | Owner | Weekly | Checklist below |
| 5 | **Fill the legal placeholders before any public post** | Strangers from Reddit/Facebook will read privacy.html; it still has yellow `[OWNER/ATTORNEY]` blanks (operator, contact, retention, age rule) | S (owner) / attorney optional | Owner | Before the first post | Owner decision |
| 6 | **Owner-posted organic channels** (section 3b, drafts in `docs/owner-kit/`) | Free; the owner's league, center, Honey Badgers and bowling communities are where the users are. Reddit and Facebook groups each have their own rules | S per post | Owner | Week 2 onward | Drafts ready |
| 7 | **Merge PR #21 (wake the API on intent)** | Free plan sleeps after idle; first lookup measured 17.2 s. Strangers will not wait | S | Owner OK | Week 1 | Open PR |
| 8 | **Real-phone smoke + Hide/Report live check** | Still NOT RUN on a real iPhone/Android. Folded into the first dogfood night | S | Owner | Week 1-2 | Open |
| 9 | **Storm Mix Platinum row** re-check from the maker page | A visibly wrong spec costs trust with exactly the bowlers who know balls | S | Bot (after OK to change catalog) | Week 2 | Open |
| 10 | **"How would you feel if you could no longer use it?"** as an occasional survey variant | The Sean Ellis question is a cheap must-have signal (§4); asked only of people who logged 2+ nights | S | Bot | Week 2 | Proposed |
| 11 | **Ruby CSV import** (rebase the old `ruby-import` branch, v50 era, onto v83) | The owner owns a Ruby; it makes dogfooding richer (release spread per ball) | L | Bot | Week 3 | Proposed |
| 12 | Combined team endpoint for first open of My Team | Speed for team users; less urgent with no team testers | M | Bot + deploy OK | Week 3 | Later |
| 13 | Icons for the Maple and Night looks | Polish; the manifest icon cannot switch at runtime, so only the apple-touch icon could follow the look | M | Bot | Later | Later |
| 14 | CSS split (86 KB) and splitting `js/screens/tonight.js` (74 KB) | Lighthouse already 0.86-0.93; no bowler-felt problem right now. The scoring rules file (`js/data/scoring.js`) is locked and is not part of this | M / L | Bot | After launch decision | Later |
| 15 | Render plan for always-on API | Only matters once accounts/teams are advertised to strangers; spend needs owner OK | - | Owner | Week 3 decision | Owner decision |

## 3. The no-tester loop
### a. In-app capture (built in v83)
- **One ask, ever, at a good moment.** After the **first packed bag** a quiet toast ("Help make Arsenal Pro better? Anonymous counts, your choice.", 7 s, a *Choose* button). Or, if that never happened, right after a **4 or 5** on the post-game question, a small sheet. Never on the game page, never over another sheet, never on Welcome. Once shown, never again (`ap_fb.optAsked`).
- **The sheet** says what each switch sends in plain words, in a benefit-first sentence ("Two switches tell us what to fix next"), with *Turn on both*, *Crash reports only* and *No thanks* as equal choices and "Change it any time in Me › Privacy". Both switches stay OFF until tapped (NN/g: explain why, time it in context, allow reversal, no dark patterns).
- **Me › Feedback** gains *Share the app* (the phone's own share sheet with the public link only; no ids, no referral codes) and *Help improve it* (opens the same sheet; hidden once both switches are on). This is an engaged-user spot, like web.dev's "navigation menu" pattern.
- **Funnel counts** (opt-in totals only, same privacy as v82): `usage.on` (one per opt-in: the denominator), `first.bag`, `first.ball`, `first.optimize`, `first.game` (each 0 or 1 per phone), plus `ball.added`, `app.installed`, `app.shared`. A first step that happened before the opt-in is never sent, so funnel ratios are "of phones that opted in, after opting in". privacy.html section 3a lists every new item.
- **Safe rollout order.** The v82 API stores only the 12 old keys and does not say which it stored. v83 marks only those 12 as sent unless the API answers with `keys`, so the new counts wait on the phone until the API PR is deployed. Either deploy order is safe.
- **PWA install nudge** already exists (one offer after the first saved game, never mid-game; Me › Your data has Install). web.dev's guidance matches it (wait for an interest signal, dismissible, remembered); no change.

### b. Organic, free channels the owner runs himself (drafts: `docs/owner-kit/OWNER_POSTS.md`, card: `docs/owner-kit/league-night-card.html`)
| Channel | How | Watch out |
|---|---|---|
| Own league + Urbanek Honey Badgers | Show it on your phone on league night; hand out the QR card | Ask first; consenting people only. No pressure to opt in |
| Bowling center | Ask the manager before leaving cards or a poster | Center's permission; nothing on merch until the attorney search |
| Reddit (bowling subreddits) | One honest "I built a free app, roast it" post, as yourself, in subs whose rules allow it | Reddit's spam policy: post where you have a personal interest, be thoughtful about frequency, and moderators decide what is spam in their community (Reddit Help: Spam). Read each sub's rules first; our automated fetch of r/Bowling's rules was blocked, so check them by hand |
| Facebook bowling groups | Only groups whose rules allow it, or a promo thread; ask the admin when rules are silent | Admins can require post approval and remove posts |
| Install from the link | The card and every post link to the PWA; the app's own install offer does the rest | iOS needs Share → Add to Home Screen (the app explains it) |

### c. Owner dogfooding: weekly self-review (about 15 minutes after each league night)
1. **Version.** Me › About shows the version you bowled with.
2. **The spine, timed:** built tonight's bag in under 60 s? Optimize gave a line you would actually try? Scoring needed zero fixes? Log book shows the night correctly?
3. **Ruby.** Note speed/rev/axis from the Ruby next to what you entered in Me › Bowler profile; anything the app's line got clearly wrong goes in as a Bug with a screenshot.
4. **Taps.** Anything that took more than 3 taps, or a screen you had to scroll on Bag, Score or Strike line? Send it as a Bug.
5. **Moments.** One thing that helped, one that got in the way: send each through the speech bubble (Praise / Idea) so it shows in the digest with everything else.
6. **Phones.** Once on iPhone Safari and the installed app, once on Android if you can borrow one: cold start, airplane-mode reopen, a scored game.
7. **Digest.** Run the weekly digest (d) and skim the funnel and the crash table.
8. **Decide one fix** for the coming week and tell the bot.

### d. Weekly owner digest and what "ready" means
Run locally: `FEEDBACK_ADMIN_TOKEN=$(cat /home/box/secrets/arsenal-feedback-admin-token) node scripts/feedback-digest.mjs --days 7 --out digest.md` in `arsenal-pro-api` (the token is read from the environment and never printed). The API PR adds a **Funnel** table (opt-ins → first bag → first ball → first Optimize → first game, each as a share of opt-ins) and a **Readiness scorecard**.

**Readiness scorecard (owner's targets, not research numbers, except where a source is named).** Small numbers are noisy; read the trend, not one week.
| Signal | Target before a wider launch | Basis |
|---|---|---|
| Owner dogfood | 4 league nights in a row with no data-loss bug and no blocker in the checklist | owner target |
| Real phones | iPhone (Safari + installed) and Android pass the smoke once | launch plan gate |
| Opted-in phones (`usage.on`) | at least 10 from outside the owner's own phones | owner target; small-sample caution (Faulkner 2003: sets of 5 users found 55-99% of problems) |
| Funnel | most opted-in phones reach first bag; a visible share reach first game | owner target; the funnel shows *where*, not *why* |
| Crashes | no crash cluster repeating across builds; crash clusters per week shrinking | Google Play calls ≥1.09% of daily users with a crash "bad behavior" (Android vitals). We cannot compute that rate (we have no user count), so we use clusters |
| Post-game question | average 4+ of 5 over at least 10 answers | owner target |
| Must-have (if item 10 ships) | 40% or more "very disappointed" | Sean Ellis' leading indicator (pmfsurvey.com); Kromatic warns it can give false positives early |
| Feedback | every Bug answered with a fix or a "won't fix" in the next weekly cycle | owner target |
| Legal + name | placeholders filled; name decided or Arsenal Pro kept for beta only | launch plan gate |

## 4. Sources (opened Nov 22, 2026)
- NN/g, Maria Rosala, "3 Design Considerations for Effective Mobile-App Permission Requests" (2019): explain the benefit; context-related timing; let users reverse the decision; avoid dark patterns. Cites Tan et al., CHI 2014 (reasons made people 12% more likely to grant). https://www.nngroup.com/articles/permission-requests/
- web.dev, "Patterns for promoting PWA installation": keep promotions out of the user's journey, allow dismiss and remember it, wait for interest signals, snackbar for 4-7 s, promote after a conversion. https://web.dev/articles/promote-install
- Reddit Help, "Spam" (updated Oct 30, 2026): post authentic content where you have a personal interest; be thoughtful about posting frequency for something you run; moderators decide what is spam in their community. https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam
- Google Play Console Help, Android vitals: user-perceived crash rate bad-behavior threshold 1.09% of daily users overall, 8% per device model. https://support.google.com/googleplay/android-developer/answer/9844486
- Sean Ellis / GoPractice, Product/Market fit survey: 40% "very disappointed" as a leading indicator. https://pmfsurvey.com/ ; caution: Kromatic, "Why the 40% test gives false positives". https://kromatic.com/blog/false-positives-and-product-market-fit/
- Nielsen, "Why You Only Need to Test with 5 Users" (2000): about 85% of problems with 5 users, run many small tests. https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/ ; Faulkner (2003), "Beyond the five-user assumption", sets of 5 found 55-99%. https://doi.org/10.3758/bf03195514

## 5. Decisions only the owner can make
1. Merge app PR v83 and API PR #10 (merging the API PR auto-deploys it on Render). Either order is safe.
2. Merge PR #21 (wake the API on intent).
3. Fill the privacy/terms placeholders (operator name, contact email, effective date, governing law, age rule, retention) before any public post.
4. Which channels to post to, and when; the drafts are in `docs/owner-kit/OWNER_POSTS.md`. The bot does not post or contact anyone.
5. Keep "Arsenal Pro" for this phase or switch names first (posts and the QR card say Arsenal Pro; the URL stays the same either way).
6. Render: stay on the free plan (sleeps; PR #21 softens it) or approve an always-on plan before advertising accounts/teams.
7. OK to change the catalog for the Mix Platinum re-check (item 9).
