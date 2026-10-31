# Arsenal Pro 1.0 release record

Mandate: [TEAM_PROMPT_RELEASE_CEO.md](TEAM_PROMPT_RELEASE_CEO.md). Date: 2026-10-31. Offline build: `arsenal-pro-v56`. Rollback build: `arsenal-pro-v54` (or `v53` at 889f814).

## Decision: GO for 1.0.0 (Ruby import not included)

All the gates below are green on the commit that gets the tag. Ruby sensor import is not finished, so it stays on its own branch and is the next release.

## Gates and evidence

| Gate | Result |
|---|---|
| Unit tests (`node --test tests/data/*.test.mjs`) | 259 pass, 0 fail, 1 skipped |
| Engine equivalence (`node tests/engine_equivalence.mjs`) | 7500 comparisons, 0 mismatches (`simulatePath` unchanged) |
| UI end-to-end (`tests/e2e.py`) | 739 pass, 0 fail |
| Whole-night journeys + visual (`tests/journeys/run.py`) | 15 journeys, 108 steps pass, 0 fail, 2 known (owner-pending, below); 0 probe failures; visual 0 over tolerance at 360×780 and 414×896 |
| Release audit (`tests/journeys/release_audit.py`) | 82 route checks, 0 issues (no dev words, no page/console errors, no 404s or failed requests, axe 0 serious/critical, side margins); Tonight cold load 57 requests, 504 kB (budget 600 kB) |
| Lighthouse mobile (`tests/lighthouse.sh`, production API blocked) | Live v56: Performance 98–100, Accessibility 100, Best practices 100, SEO 100 on Tonight, Bowl, Bag, Results and Learn; transfer 140–182 kB (compressed). Local server: 100 in all four categories, 358–442 kB uncompressed |
| CI (ui-tests, journeys) | green on the tagged commit |
| Live site | `sw.js` serves `arsenal-pro-v56` |
| Security | CSP unchanged (`script-src 'self'`), no secrets in the repo, user text escaped, external links `rel=noopener`, no build step |
| Data safety | migration, backup export/restore and sync restore are covered by e2e and journey J11; no live DB data deleted; tests block the production API and never write to it |
| Owner rules | 3-D flag off; no medical advice; neutral on styles; free; raw LaneTrax PDF not in the repo |

## Fixed in the release pass

- My Bowler Card printed "null" before the first game.
- My Bowler Card and the night view had no side margins.
- The 10th frame clipped "X X X" at 360 px.
- Me › About said "Version 2.0.0" and showed the server host. It now says 1.0.0, has a plain privacy note, and has 44 px What's new and Source code buttons.
- Lighthouse runs now block the production API.
- A regression from the margin fix (the sticky "Pack these N" button in Bag scrolled off screen) was caught by e2e and fixed before tagging.
- README, CHANGELOG, app description and manifest describe the app as it is today.

## Known issues (shipped as is)

- **J05 "Mark Cal total-only"** (F06): there is no "total only" option for a teammate yet. Owner decision pending; behaviour unchanged.
- **J13 ball Status words**: the only word it still finds is "Hall of Fame" on the Armory screen. That name is an owner decision; unchanged.
- **API CORS `*`**: by design (no accounts, data keyed by backup code); the 20 kB body limit and rate limits are in `arsenal-pro-api/server.js`.

## Waiting on the owner

1. Baby-splits aim: keep the current suggestion or change it.
2. The name "Hall of Fame" for retired balls.
3. F06 total-only mode for Mark Cal.

## Next release

- Ruby sensor CSV import (branch `ruby-import`; not finished, not merged).
- Engine v2 (the 3-D model stays off until then).

## Rollback

Every change in this pass is a small commit after `adce76d`. To roll back: `git revert --no-edit adce76d..HEAD` (newest first), set `CACHE` in `sw.js` to a new number above the current one, and push. Do not force-push. The tag `v1.0.0` stays as a record.
