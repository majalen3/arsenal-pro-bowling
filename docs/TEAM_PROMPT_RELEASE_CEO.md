# Team prompt: v1.0 release — the CEO's mandate

**Owner ask (verbatim, 2026-10-31):**
> "Okay now build a prompt where you are ceo. Clean polish and get this release ready for deployment"

**Mode:** autonomous. The CEO (this worker) writes the mandate, runs it, fixes everything in scope, and ships or holds. Commit small, push each fix, and report once at the end. Nothing is sent or posted on the owner's behalf; the GitHub tag and release are the owner's ask in this prompt.

## Mission
Ship **Arsenal Pro v1.0**: a bowler's league night on one phone. Pick the bag, find where to stand, score the night, see what changed and learn the words, all offline, free and in plain bowler language. v1.0 is **what already works, cleaned and proven**. It adds no new features.

## Release definition of done
v1.0 is done when every line below is true **on the live site** (https://majalen3.github.io/arsenal-pro-bowling/):
1. Every suite is green locally and in CI:
   - unit (`node --test tests/data/*.test.mjs`);
   - engine equivalence (7 500 comparisons / 0 mismatches);
   - e2e (`tests/e2e.py`);
   - journeys J01–J15 at 360×780 and 414×896, with only owner-pending items listed as known;
   - visual baselines.
2. Lighthouse (mobile) on Tonight meets these targets: **Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95**. The PWA checks also pass: manifest, service worker, offline start and installable.
3. The first load (cold, no SW) is **≤ 600 kB transferred** for Tonight. Every file in the SW precache list exists, and the list holds no dead file.
4. Zero dev/debug text, TODOs or console noise on any screen. The Status words are consistent everywhere.
5. Data is safe:
   - an older-schema migration loses nothing;
   - backup → restore round-trips;
   - CSV/JSON export opens;
   - the storage chip says whether the phone may evict data.
6. CSP and security headers are checked, and no secret is in the repo or its history.
7. The API is healthy, CORS allows only the app origins, the rate/size limits answer as documented, and the cold start is measured and explained to the user.
8. CHANGELOG.md, plain-language release notes, the README, an in-app About (version + privacy note) and a rollback plan exist.
9. A go/no-go report is written (`docs/RELEASE_v1.0.md`), and only after a GO is `v1.0.0` tagged and the GitHub release created.

## Ship / no-ship bar
**No-ship (any one blocks the tag):**
- a failing suite;
- equivalence ≠ 7 500/0;
- a page error on any route;
- an axe serious/critical violation;
- data loss in migration or restore;
- any write to the production API from a test;
- a secret in the repo;
- a CSP weaker than `script-src 'self'`;
- anything shown during active scoring that wasn't there before;
- a target under 44 px on a scoring control;
- invented data shown as fact;
- a Lighthouse category under its target by more than 5 points.

**Ship with a listed known issue:**
- owner-pending decisions (they keep their current behaviour);
- cosmetic issues off the scoring path;
- Lighthouse within 5 points of target, with the cause named.

**Never ship:** an unfinished or unreviewed branch (Ruby import) merged to make the date.

## Roles (one worker wears every hat, in this order)
- **Product:** the scope is frozen to what works. Every element passes the usability and applicability test. Owner-pending decisions stay as they are and are listed.
- **Design:** spacing, the type scale, and the empty, loading, error and offline states. Dark-mode contrast meets WCAG AA. Focus order and screen-reader labels are right. The green and gold colours are kept.
- **Engineering:**
  - performance budget and SW cache list;
  - CSP/headers;
  - no secrets;
  - versioning and rollback;
  - small commits; `git pull --rebase`, never force-push.
- **QA:**
  - every suite, the full journeys at both viewports, and wide fonts (DejaVu fallback, no sideways scroll at 360 px);
  - Lighthouse;
  - the production API is blocked in every test.
- **Physics:** `simulatePath` is unchanged and equivalence is 7 500/0. Model limits stay labelled ("° model", the "Model limit" panel). The 3-D flag stays off.
- **Content/education:**
  - plain bowler words, no jargon without a "?" or Guide entry;
  - USBC rules cited;
  - no medical advice;
  - neutral on styles.
- **Data/privacy:**
  - migrations, backup/restore and export are proven;
  - the privacy note says what leaves the phone (the backup-code sync to arsenal-pro-api) and what never does;
  - no live DB deletes without the owner's OK.
- **Support:** the README, the release notes, the About screen and a "what to do if" note (cold start, offline, lost phone → backup code).

## Standing constraints (from DECISIONS.md and the overnight mandate; all still in force)
- **USBC handicap** = floor((basis − avg) × pct). Basis is 200/210/220, and pct defaults to 90% and is league-configurable. Blind and absent scores follow USBC. USBC sources are cited.
- **Provenance labels** on every number: you / LaneTrax / maker / catalog / USBC / model / assumed / team rule. **No invented data, specs, layouts or citations.** Anything not printed reads "spec TBD".
- **No medical advice. Neutral on styles:** "No style is better than another."
- **`simulatePath` is unchanged**, and engine equivalence stays at **7 500 / 0**. Model angles are labelled as model units. The **3-D flag stays off** until it scores at least 8/10 in review.
- **Offline-first** and **free**. **No auth for core data**: the backup code is optional.
- **CSP `script-src 'self'`**, no inline script, no eval, **no build step**.
- **44 px touch targets**, one-handed, thumb zone. **Nothing extra during active scoring.**
- **Colours:** Arsenal Pro #0F4D34, #DAAF37 and black.
- **The raw LaneTrax PDF stays out of the repo.** **No LaneTalk API.** No scraping of third-party apps.
- **Never force-push.** Commit only your own paths.
- **Live DB deletes need the user's explicit OK.** Tests never write to the production API.
- **Never message, post or email on the owner's behalf.**
- **Handedness is explicit only.** Help is off by default.

## Feedback and motivation rules
- **Self-Determination Theory:**
  - **Autonomy:** the bowler chooses; defaults are visible and changeable; non-controlling copy, never "you should".
  - **Competence:** immediate, informational feedback, and the why behind every suggestion.
  - **Relatedness:** team night, league and USBC context, the coach.
- **Non-evaluative feedback:** counts and facts, never praise or judgement. Write "converted 4/6 10-pin leaves" or "Leave to work on: the 10 pin, 4 of 6 made". Never "good job", "bad", "weak" or "poor". Goals are process goals, never score goals.

## The test for every number
Each number on screen must pass both:
1. **Usability:** a bowler reads it at a glance, in their own words, with its source and n.
2. **Applicability:** it changes a real decision (what to bring, where to stand, what to practise).

A number that fails either test goes behind a tap or is cut.

## Release checklist
1. **Copy and jargon sweep.**
   - Plain bowler language.
   - No dev or debug text ("events", "IndexedDB", "v1", "projection", stack traces, ids).
   - No TODO/FIXME/XXX in shipped files.
   - No stray `console.log`.
   - The four Status words are consistent (In my bag / At home / At the pro shop / Retired). "Hall of Fame" stays as an owner-pending item.
2. **Visual polish** at 360×780 and 414×896:
   - spacing and type scale;
   - empty states (no balls, no games, no pattern), loading states, error states (API down, file refused) and offline states;
   - dark-mode contrast at WCAG AA (axe `color-contrast`);
   - focus order and a visible focus ring;
   - every control has an accessible name.
3. **Performance.**
   - Lighthouse mobile on Tonight, Bowl, Bag, Results and Learn, against the targets above.
   - First-load bytes for Tonight.
   - The SW precache list is checked against the files on disk.
   - No 404s.
4. **Data safety.**
   - Migration from older schemas (v1 `ap_*` keys, a v0 backup file).
   - The backup → wipe → restore round trip.
   - CSV and JSON export.
   - The `navigator.storage.persist()` state is shown.
5. **Security.**
   - CSP meta checked (`script-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`).
   - Pages header limits documented (GitHub Pages can't set custom headers).
   - A secret scan of the tree and history (tokens, keys, `.env`).
   - `rel=noopener` on external links.
6. **API (arsenal-pro-api on Render)**, read-only checks only:
   - `/api/health`;
   - a CORS preflight from the Pages origin, plus a refusal from a foreign origin;
   - the documented 413/429 behaviour (read from the code, not by flooding prod);
   - cold-start time, with the app's user-facing message for it.
7. **Journey QA.** Full J01–J15 at 360×780 and 414×896, wide fonts, axe, 44 px, no truncation, and no page errors.
8. **Versioning.**
   - `CHANGELOG.md`.
   - Release notes in plain language.
   - SW cache bump.
   - The `v1.0.0` tag and GitHub release, made only after a GO.
   - **Rollback plan:** the previous SW version and the commit to revert (`git revert <range>` then push; the SW network-first fetch picks it up on next load).
9. **Docs and in-app.**
   - The README describes the real app (five tabs, offline, backup code, privacy).
   - Me › About shows the version, the privacy note and links to the source and the changelog.
10. **Final go/no-go report** (`docs/RELEASE_v1.0.md`): every line of the definition of done with its evidence, the commits, the known issues, the owner decisions pending, and the next release.

## Out of scope for v1.0 (listed, not built)
- **Ruby import** (worktree `/workspace/ruby-wt`, branch `ruby-import`). It is merged only if it is finished, rebased, green on all suites and reviewed; otherwise it is the next release.
- **Owner-pending decisions** (each keeps its current behaviour):
  - the baby-split aim;
  - the retired-shelf name "Hall of Fame";
  - F06, the total-only teammate mode.
- Engine v2 (real launch angle and oil gradient). It needs the owner's approval.

## Output to the owner (≤ 1 screen)
- Go/no-go with reasons.
- Commits, test and Lighthouse results, the SW version.
- The tag/release URL.
- 414×896 screenshots of Tonight, Bowl, Bag, Results and Learn.
- Open items, and what is needed from the owner.
