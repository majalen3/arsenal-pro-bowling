# Launch checklist (compartmentalized)

Written Thursday, 26 November 2026, about 4:39 PM America/Chicago. Owner ask t178u: "Compartmentalize and let's get this thing launched." This replaces the recruited private-beta weeks (Weeks 2–4) in the earlier launch plan. The no-tester loop in [NEXT_PHASE_PLAN.md](NEXT_PHASE_PLAN.md) is still how people find the app: the owner posts and dogfoods; the app captures only what a bowler opts into.

**Checked this turn.** Live PWA cache is `arsenal-pro-v83`. API deploy `dep-dc1mk960tbcc73au9ke0` (commit `9b9435d`) is still **live**. `GET /api/health` was 200 after a cold start of 17.2 s, then 200 in 0.07 s when warm (`ok`, `db` and `ready` all true). `GET /api/owner/summary` without a token is 401. Owner-summary totals since 21 November 2026 (and all stored rows) are all zero: 0 feedback, 0 screenshots, 0 survey answers, 0 usage counts, 0 crash clusters. No personal data is in this document.

**Rules that do not change.** No spend without the owner's approval. The bot does not merge, deploy, post or contact anyone from this document. Opt-in only; no third-party analytics; CSP `script-src 'self'` stays. Name and mark stay off merch until an attorney search. Not legal advice.

Sizes: **S** under half a day, **M** 1–2 days, **L** 3+ days.

## 1. Name and brand — Owner, then bot (one pass)

A rename is pending. "Strike Time" is being checked separately and is not scored here. Until the owner picks a name and an attorney search is done, the live app, the QR card and the post drafts stay **Arsenal Pro**.

| | Item | Size | Who | Status |
|---|---|---|---|---|
| Done | Live app, legal drafts, QR card and post drafts all still say Arsenal Pro | — | — | Done |
| Done | High trademark risk of keeping Arsenal Pro for a public launch is already on the record (not legal advice) | — | — | Done |
| Left | Pick a name (or explicitly keep Arsenal Pro for this launch) | S | Owner | Open |
| Left | Attorney / common-law search on the chosen name and the icon | M | Owner (paid counsel needs its own OK) | Open |
| Left | One rename pass after the pick and the search: visible strings, icons if needed, legal pages, QR card, post drafts. No drip of half-renamed screens | M | Bot, after the owner says go | Gated |

## 2. Legal — Owner answers, then bot fills, then attorney review

The live [Privacy](https://majalen3.github.io/arsenal-pro-bowling/privacy.html) and [Terms](https://majalen3.github.io/arsenal-pro-bowling/terms.html) pages are drafts with a banner and yellow blanks. Fill these before any public post, or explicitly accept leaving the draft banner up for a limited first post. This is not legal advice.

**Questions only the owner (sometimes with an attorney) can answer.** The same answer can be reused where a blank appears on both pages.

1. What date should the Privacy and Terms pages take effect?
2. What name should appear as the operator of the app (the person or business legally running it)?
3. What email should people use to contact you about privacy, terms, or deleting data? (This blank is on both pages.)
4. How long should the server keep feedback notes, screenshots, survey answers, usage totals and crash reports?
5. Should the app gain a button that deletes the optional backup-code copy on the server, or is "email us with the code" enough for this launch?
6. How long do Render's database backups last after someone asks us to delete their account? (Paid Render Postgres point-in-time recovery is 3 days on a Hobby workspace and 7 days on Pro or higher, per [Render's backup docs](https://render.com/docs/postgresql-backups), checked 26 November 2026. Confirm the wording with an attorney and with the current workspace plan.)
7. What is the minimum age for an account and for My Team? (The draft currently talks about children under 13 and leaves the age rule blank.)
8. If someone lives in another country or state, do we need to add region-specific rights or legal bases to the Privacy page?
9. How will you tell people about a material change to what the app collects (for example, a note in the app, an email to account holders, or only an updated date on the page)?
10. Which state's or country's law governs the Terms, and where would a dispute be heard?
11. For the Terms: the trademark-search note, the warranty section, and the limit-of-responsibility section are marked for an attorney to replace with enforceable language for that region.

| | Item | Size | Who | Status |
|---|---|---|---|---|
| Done | Draft Privacy and Terms are live, written from what the app actually does, with a draft banner | — | — | Done |
| Left | Answer the questions above | S | Owner | Open |
| Left | Fill the yellow blanks from those answers and remove the draft banner only when the owner says the pages are ready | S | Bot | Gated |
| Left | Attorney review of both pages | M | Owner (counsel needs its own OK) | Open |

## 3. App readiness — mixed

The product spine (bag, arsenal, strike finder, log book), feedback tools, the one-time opt-in offer and the theme-boot fix are already in live v83. No launch-blocking bug was found in the live health check this turn. There is also no new crash or feedback data to triage.

| | Item | Size | Who | Status |
|---|---|---|---|---|
| Done | v83 live: feedback sheet, post-game question, one-time opt-in offer, funnel counts, Share the app, theme applied before first paint | — | — | Done |
| Done | Hide / Report / Block are in the live code (a human check on a real team is still open) | — | — | Done |
| Left | Real-phone smoke: iPhone Safari and the installed PWA, plus Android if one can be borrowed — cold start, airplane-mode reopen, add-to-home-screen, pack a bag, Optimize, score a game offline | S | Owner | Open, launch-blocking |
| Left | Hide, Report and Hide/Undo on the owner's existing My Team after a real share (no new live test account) | S | Owner | Open if My Team is advertised |
| Left | Re-check the Storm Mix Platinum catalog row from the maker page and correct it only from printed numbers (live row still weight 12, RG 2.72, diff 0.005 as of 2 November 2026). Needs a separate OK to change the catalog | S | Bot, after OK | Open |
| Left | Icons for the Maple and Night looks (the manifest icon cannot follow the look at runtime; only a home-screen icon could). Polish, not a launch blocker for a PWA-only launch | M | Bot | Later |
| Left | CSS split and splitting `js/screens/tonight.js` (74 KB). Not bowler-felt on current Lighthouse scores. The locked scoring-rules file is not part of this | M / L | Bot | After launch |
| Left | Ruby CSV import (old branch needs a rebase). Useful for the owner's dogfood, not a launch blocker | L | Bot | After launch |

## 4. Server and infra — Owner decisions on spend; bot ready on PR #21

Checked 26 November 2026 against the live Render account and [render.com/pricing](https://render.com/pricing) and [Render Postgres backups](https://render.com/docs/postgresql-backups). Prices are Render's published monthly rates, prorated by the second. This is not a quote and not an approval to spend.

| What | Live plan | Published price | Notes |
|---|---|---|---|
| API web service `arsenal-pro-api` (`srv-db9cl3m7bikc73fhsf4g`) | **Free** (512 MB) | $0 / month | Sleeps after 15 idle minutes. This turn's first `/api/health` took **17.2 s**; the next one took **0.07 s**. Render's free-service docs say wake is "about one minute"; the 17 s wait is what we measured. 750 free instance-hours per workspace per month |
| Always-on web, smallest paid plan (`0.5c-512mb`, legacy name Starter) | Not in use | **$7 / month** | "Never spin down" (Render Node.js hosting and pricing pages, 26 November 2026). No spend without approval |
| Next web size (`1c-2g`, legacy Standard) | Not in use | **$25 / month** | Also always on. Not needed unless the $7 plan runs out of memory |
| Postgres `arsenal-pro-db` (`dpg-db9cksfavr4c73dik090-a`) | **Paid** `0.1c-256mb`, 1 GB disk, Postgres 16, available, Oregon | **$6 / month** compute + **$0.30 / GB / month** storage (1 GB provisioned → $0.30). About **$6.30 / month** before tax | Already paid, so Render point-in-time recovery and logical exports are included. Recovery window is **3 days** on a Hobby workspace and **7 days** on Pro or higher. Logical backups are kept 7 days. The workspace plan was not re-read as a named field this turn, so confirm the window in the dashboard before writing a number into the Privacy page |
| Hobby workspace | Typical for a one-person project | **$0 / month** + compute | Pro workspace is $25 / month + compute and is not required for an always-on web instance |

| | Item | Size | Who | Status |
|---|---|---|---|---|
| Done | API deploy `dep-dc1mk960tbcc73au9ke0` live; owner read returns 401 without a token | — | — | Done |
| Done | Postgres is already on a paid plan, so platform backups (PITR + logical exports) are on | — | — | Done |
| Left | Merge [app PR #21](https://github.com/majalen3/arsenal-pro-bowling/pull/21) (wake the API on Add a ball, sign-in, or My Team). Softens the 17 s sleep without spend. Still open; not part of the v83 approval | S | Owner OK, then bot merges | Open, recommended before a public post |
| Left | Keep the API on the free plan (it will keep sleeping) or approve the $7 / month always-on plan before advertising accounts or My Team as always available | S | Owner (spend OK) | Open |
| Left | A tested restore rehearsal of Postgres into an empty isolated database. Not started. Needs a separate OK; never restore over live data | M | Bot, after OK | Later |

## 5. Feedback and data loop — Owner runs the digest; bot already shipped the tools

Capture is live in v83: the feedback sheet, the post-game question, and the one-time opt-in (after the first packed bag, or after a 4 or 5 on the post-game question). Usage counts and crash reports stay off until the bowler taps. There is still **no data**: 0 notes, 0 survey answers, 0 opted-in counts, 0 crash clusters as of 4:39 PM America/Chicago on 26 November 2026, four days after v83 went live. That is expected if nobody outside the owner's own phones has used the opt-in offer, and if the owner has not posted yet.

Weekly digest, from `arsenal-pro-api`:

```
FEEDBACK_ADMIN_TOKEN=$(cat /home/box/secrets/arsenal-feedback-admin-token) node scripts/feedback-digest.mjs --days 7 --out digest.md
```

The token is read from the environment and is never printed. The digest includes an activation funnel and a readiness scorecard.

| Signal | Target before a wider launch | This turn |
|---|---|---|
| Owner dogfood | 4 league nights in a row with no data-loss bug | Not recorded here |
| Real phones | iPhone (Safari + installed) and Android pass the smoke once | Not run |
| Opted-in phones (`usage.on`) | 10+ from outside the owner's phones (cumulative) | **0** |
| Funnel | Most opted-in phones reach a first bag; a visible share reach a first game | No funnel yet |
| Crashes | No cluster repeating across builds; clusters per week shrinking | **0** reports |
| Post-game question | Average 4+ of 5 over at least 10 answers | **0** answers |
| Must-have (only if that survey ships) | 40%+ "very disappointed" (Sean Ellis leading indicator; can be a false positive early) | Not asked |
| Feedback | Every bug answered with a fix or a "won't fix" in the next week | **0** notes |
| Legal + name | Placeholders filled; name decided or Arsenal Pro kept for this launch only | Open |

Zero reports also means we have not seen real-world crashes or praise. Do not treat "nothing in the digest" as proof the app is ready. It only means no opted-in data has arrived. The owner's own dogfood notes, sent through the speech bubble, are the first reliable input.

| | Item | Size | Who | Status |
|---|---|---|---|---|
| Done | v83 capture + API funnel + digest script, live | — | — | Done |
| Left | Send the owner's own league-night notes through the in-app button so they show up in the digest | S, each night | Owner | Open |
| Left | Run the weekly digest and pick one fix | S, weekly | Owner | Open |
| Left | Optional: the Sean Ellis "how would you feel if you could no longer use it?" question, only for people who logged 2+ nights | S | Bot, after OK | Proposed |

## 6. Channels and go-to-market — Owner posts; bot already drafted

Drafts and a printable QR card (the QR decodes to the public app URL) are in [docs/owner-kit/](owner-kit/OWNER_POSTS.md). **Nothing has been posted or printed by the bot.** Fill the legal blanks, or explicitly accept the draft banner, before the first public post. Read each community's rules first. Do not contact pro shops, creators or press from these drafts.

Suggested order, slowest and closest first:

1. The owner's own league night, in person, with the QR card (ask first; no pressure to opt in).
2. The Urbanek Honey Badgers and the league's own chat, only with the secretary's OK.
3. The bowling center, only after asking the manager.
4. One bowling subreddit whose rules allow it, posted as the owner, once (Reddit's spam policy: post where you have a personal interest and be thoughtful about frequency; moderators decide). Our automated read of r/Bowling's rules was blocked, so check them by hand.
5. Facebook bowling groups whose rules allow a post or a promo thread; ask the admin when the rules are silent.

App Store and Google Play stay a separate, later decision (both are paid developer programs). A first launch is the existing PWA URL.

| | Item | Size | Who | Status |
|---|---|---|---|---|
| Done | Post drafts and printable QR card in `docs/owner-kit/` | — | — | Done |
| Left | Legal blanks (stream 2) before the first public post | S | Owner | Open, launch-blocking for a public post |
| Left | Choose the first channel and post or hand out cards | S | Owner | Open |
| Left | PWA-only for this launch, or a later store path | S | Owner | Open, not required to go live |

## Launch day: go / no-go

There is no calendar date on this page. A launch day is the first day the owner puts the public URL in front of people who are not already on the app, whether that is a league-night card or a Reddit post. Do this the morning of that day, in America/Chicago time.

**Go only if all of these are true:**

1. Live PWA still serves `arsenal-pro-v83` or a later agreed cache (check with `curl -A Mozilla` on `sw.js?nocache=$RANDOM`).
2. API deploy is live; `GET /api/health` returns 200 with `db` and `ready` true (allow up to about 20 s if the free plan has been asleep).
3. Privacy and Terms either have no yellow blanks and the draft banner is gone, or the owner has explicitly accepted leaving the draft banner up for this first post only.
4. The owner has done the real-phone smoke (stream 3) on at least iPhone Safari or the installed PWA, including a scored game and an offline reopen, with no data-loss bug.
5. The owner has dogfooded at least one recent league night with no data-loss or privacy incident.
6. If accounts or My Team will be described as always available, either the $7 / month always-on plan is approved and live, or the post honestly says the API may take a short while to wake. Merging PR #21 is the no-spend way to shorten that wait.
7. The name on the posts and the card matches the decision in stream 1 (Arsenal Pro is fine if that is the pick for this launch).
8. The owner has chosen the first channel and has the draft in front of them. The bot still does not post.
9. The owner says go.

**No-go, or pause after go, if any of these is true:** a data-loss or privacy incident; a crash that stops packing, Optimize or scoring; legal blanks still open and no explicit accept of the draft banner; the live app or API is down; or the owner wants to wait for the name or the attorney search.

**The morning-of list (about 20 minutes):** confirm the cache name and `/api/health`; open Privacy and Terms once; install from the public URL on the owner's phone and pack a bag; if PR #21 or an always-on plan was approved earlier, confirm it is actually live; then post or hand out cards. The same day, watch for feedback in the owner summary (counts only). The next morning, run the digest.

A wider announcement (more channels, or calling it a public launch rather than a first post) should wait until the readiness table in stream 5 has some real numbers, not a second week of zeros, and until the legal blanks are filled rather than only accepted as a draft.
