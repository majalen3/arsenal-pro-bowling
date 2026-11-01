# Team prompt: the community hub ("My Team") and the five community tactics — the senior director's mandate

**Owner ask (verbatim, 2026-10-31):**
> "We need like a my team page to share balls and stats or something like a community hub like hey these are the. Alls I'm bringing Execute all five with a well refined prompt and team as you are the senior director"

"All five" = tactics 1–5 of the community playbook (canvas "Community playbook", 2026-10-31): league mode, shareable artifacts, the pro shop partner kit, identity tags and Center Regulars.

**Mode:** autonomous. The senior director (this worker) writes this mandate, runs it with the squad below, ships each piece in small pushed commits, and reports once at the end. Nothing is sent, posted or emailed on the owner's behalf, and no pro shop is contacted. No live test account is created: live checks are read-only, and every journey runs against an in-browser mock of the API.

## Mission
Give a bowler's **team night** a home on the phone: a private space where teammates see **"Tonight I'm bringing:"**, the balls each person chose to share, with plain counts that **describe and never grade**. Then give the bowler four small, opt-in ways to belong: a share card, a pro shop kit, identity tags and a "Regular at <center>" badge.

The theory, in one line each (sources in the playbook):
- **Sense of community** (McMillan & Chavis, 1986): membership, influence, shared emotional connection. A small, closed group with a name and a night.
- **Relatedness without ranking** (Self-Determination Theory, Deci & Ryan): belonging comes from being seen, not from being sorted. No leaderboards, ever.
- **Social identity** (Tajfel & Turner, 1979): bowlers say who they are ("lefty", "two-hander", "league bowler") side by side, never as a hierarchy.
- **Showing up is the badge** (Strava Local Legends counts efforts, not speed): Center Regulars counts nights at a center, regardless of score.
- **Year-end recaps** (Spotify Wrapped) work because they are personal, visual and opt-in to share.

## Definition of done
Done means every line below is true **on the live site** (https://majalen3.github.io/arsenal-pro-bowling/) and on arsenal-pro-api:
1. **My Team** (league mode):
   - create a team; join by invite link or code;
   - "Tonight I'm bringing:" cards: ball names, role and one reason (the clutter rules);
   - shared stats: plain counts, opt-in per item, no ranking;
   - lane-pair notes ("the pair hooked early on 5-6");
   - the league secretary invites, removes, revokes invites, sets the league night and handles reports;
   - leave a team; the secretary deletes a team;
   - offline: the last synced view with an "Offline" chip;
   - a short Code of conduct, linked from My Team.
2. **Share cards**, made on the phone and never auto-posted (system share sheet or PNG download): the bag card (refined), the Old Friends card and Season Wrapped (non-evaluative, with a sample-size guard).
3. **Pro shop kit:** a printable one-page sheet with QR codes that open Add ball with the ball prefilled from the catalog, plus an optional "My pro shop" field on Me. The QR encoder is vendored (MIT, with its licence) and runs same-origin.
4. **Identity tags** on Me, shown side by side on the profile and on team cards; optional, never ranked or filtered.
5. **Center Regulars:** an opt-in home center and a "Regular at <center>" badge from nights logged there in the last 90 days, regardless of score; on team cards only if the bowler shares it.
6. **API:** additive tables, server-side authorisation on every route, expiring and revocable invite codes, rate and size limits, team data in account export and delete. Pushed, deployed on the existing free resources and verified read-only.
7. **Every suite green:** unit, API (local Postgres), engine 7 500/0, e2e, journeys (plus the new community journeys), and the clutter audit re-run on the new screens.
8. **Docs:** DECISIONS.md (placement, the regular threshold, sharing defaults), the privacy note, the Help bubbles and the CHANGELOG. The sw is bumped.

## Ship / no-ship bar
**No-ship (any one blocks the push of that piece):**
- a failing suite, or equivalence ≠ 7 500/0;
- a page error on any route, or an axe serious/critical violation;
- **any team data visible to a non-member, or anything shared that the bowler did not switch on;**
- a team route without a server-side membership or role check;
- an invite code that works after it expires or is revoked;
- a rank, leaderboard, "best", "top" or comparison of scores or styles anywhere in the community features;
- any write to the production API from a test, or a new live account;
- a secret in the repo or in output;
- a CSP weaker than `script-src 'self'`, or a third-party script or font;
- anything new shown during active scoring;
- a target under 44 px;
- invented data shown as fact;
- "Arsenal" on a printable or merch-like item beyond the app name.

**Ship with a listed known issue:** owner-pending decisions (they keep the conservative default), and cosmetic issues off the scoring path.

## The squad (one worker wears every hat, in this order)
- **Product:**
  - one entry point, no new tab unless the IA research justifies it;
  - every element passes the usability and applicability test;
  - sharing is opt-in per item and per team; the default is "nothing shared";
  - the feature degrades to a clear signed-out and offline state.
- **Design:**
  - the 5-tab IA stays; My Team lives under Bag (it is about the balls you bring), with links from Bag and Me;
  - the house cards, `details.tn-more` disclosures and 44 px targets;
  - the empty, loading, error, offline and signed-out states;
  - the green and gold palette; dark-mode contrast at AA.
- **API:**
  - Express and pg in the existing service; `CREATE TABLE IF NOT EXISTS` only, no change to existing tables or rows;
  - every team route behind `needUser` and the account CORS allowlist, with a membership check and a role check for secretary actions;
  - invite codes are random and stored only as an HMAC, expire (1–14 days) and can be revoked;
  - text caps, body-size caps, per-user rate limits, and member, team and note caps;
  - team data in export; leave, remove and delete paths; account delete removes the user's team footprint.
- **Privacy/safety:**
  - members see only what each person chose to share; nothing about a bowler is computed server-side;
  - a display name per team (not the email); emails are never shown to teammates;
  - report → the secretary sees it → remove member or note;
  - the Code of conduct; the privacy note says what a team sees;
  - no profanity filter (owner scope).
- **QA:**
  - unit tests for the pure helpers (shares, tags, regular, wrapped guard, QR);
  - API tests on a local Postgres: team isolation, a non-member can't read, the secretary's powers, invite expiry and revoke, export and delete;
  - journeys against the mock API: create → invite → share bag → teammate sees it; a share card; the QR prefill; tags; the regular badge;
  - the clutter audit on the new screens; the full suites; the production API is blocked in every test.
- **Content:**
  - the Armory brand voice: warm, plain, non-evaluative, style-neutral;
  - short Help bubbles for My Team, shared items, tags, Center Regular, Season Wrapped and the pro shop kit;
  - a Code of conduct a bowler reads in 20 seconds.

## Standing constraints (from DECISIONS.md and TEAM_PROMPT_RELEASE_CEO.md; all still in force)
- **USBC handicap** = floor((basis − avg) × pct). USBC sources are cited.
- **Provenance labels** on every number: you / LaneTrax / maker / catalog / USBC / model / assumed / team rule / teammate. **No invented data, specs, layouts or citations.**
- **No medical advice. Neutral on styles:** "No style is better than another."
- **`simulatePath` is unchanged**, and engine equivalence stays at **7 500 / 0**. The **3-D flag stays off**.
- **Offline-first** and **free** (no new paid service). **Accounts stay optional for core data**: My Team needs an account; nothing else does.
- **CSP `script-src 'self'`**, no inline script, no eval, **no build step**, no third-party scripts.
- **44 px touch targets**, one-handed. **Nothing extra during active scoring.**
- **The raw LaneTrax PDF stays out of the repo.** **No LaneTalk API.**
- **Never force-push.** Commit small and often; `git pull --rebase`.
- **No deleting live DB data**; live DB deletes need the owner's explicit OK. Tests never write to the production API, and no new live test account is made.
- **Never message, post or email on the owner's behalf**; no pro shop is contacted.
- **Never print or commit a secret** (the session pepper stays out of the repo and the output).
- The free Postgres expires on Nov 15. Do not upgrade it; the owner has a reminder.

## Feedback and motivation rules
- **Self-Determination Theory:**
  - **Autonomy:** each share is a switch the bowler flips; nothing is shared by default; leave any time.
  - **Competence:** counts and facts with their source and n.
  - **Relatedness:** the team, the night, the lane pair. No ranking of people.
- **Non-evaluative:** "12 nights logged", "converted 4/6 10-pin leaves". Never "good", "bad", "best", "top", "beat".
- **Small samples** (fewer than 30 shots) show counts only, never a rate.

## The test for every number
1. **Usability:** a bowler reads it at a glance, in their own words, with its source and n.
2. **Applicability:** it changes a real decision. For a teammate, the questions are "what is the pair doing tonight?", "what are they throwing?" and "who's here?".

A number that fails either test goes behind a tap or is cut.

## Build order (commit and push after each)
1. This prompt.
2. API: tables, routes, limits, export/delete, tests → push (Render auto-deploys) → read-only live check.
3. App core: `js/data/team.js` (the client and pure share builders), `js/cc/community.js` (tags, regular, wrapped), with unit tests.
4. My Team screen, the Code of conduct, Help bubbles, privacy note, DECISIONS.
5. Me: tags, home center, my pro shop. Regular badge.
6. Share cards (Old Friends, Season Wrapped; the bag card refined).
7. Pro shop kit with the vendored QR encoder; the Add ball `?cat=` prefill.
8. Journeys (mock API), the clutter audit, all suites, the sw bump, live verification.

## Out of scope (listed, not built)
- Public profiles, public leaderboards, a feed, follows, likes, comments outside a team, push notifications and chat.
- Contacting pro shops or league secretaries; printed merch.
- A profanity filter for display names (owner scope).
- Upgrading the free Postgres.

## Output to the owner (≤ 1 screen)
- The prompt path, what shipped per item, the commits in both repos, the tests and sw version, the deploy status.
- 414×896 screenshots: the My Team hub, a teammate's card, the Old Friends card, Season Wrapped, the pro shop kit, tags and the regular badge.
- The clutter numbers, and the owner decisions needed.
