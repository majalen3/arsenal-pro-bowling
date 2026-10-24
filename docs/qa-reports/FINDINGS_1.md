# Journey QA — Findings 1 (2026-10-24)

**Build tested:** live https://majalen3.github.io/arsenal-pro-bowling/ (sw v43, main `f0ee1ab`), same build served locally from a clean `origin/main` checkout.
**How:** `tests/journeys/run.py`: 15 whole-night journeys (J01–J15, see `docs/QA_PLAN.md`) on a 360×780 phone with seeded personas. Production API writes are blocked and served by an in-memory mock. Full report: `docs/qa-reports/latest/index.html`.
**Results (J01–J12):** live **77 steps pass, 12 known flow breaks, 0 unexpected**. Local is the same, except F05 (a race) sometimes shows. J13–J15 are written against IA_PLAN §7 P1 and marked PENDING (14 steps) until the Status / Bring: N / bag-builder work ships. Their 4 steps that already pass on main stay green.

The findings are ranked by **harm to the whole night**, not by how bad one screen looks. The top items show the bowler one thing on one screen and something else on the next. That breaks trust in every later number, because the bowler stands where the app says.

| # | ID | What breaks the flow | Journey step (repro) | Evidence |
|---|----|----------------------|----------------------|----------|
| 1 | F01 | **The aim I drag on Lane is not the aim the app keeps.** After dragging to feet 25 / target 15, Targeting shows 17 / 10 and Tonight shows 18 / 11. | J06: 4 drag to 25/15 → 5 open Targeting → 7 back to Tonight | `findings-1/F01-J06-05.jpg`, `F01-J06-07.jpg` |
| 2 | F02 | **The "now" line keeps the old ball after a mid-game ball change.** `#tnNowLine` still says "Rattler Big Bite · feet 17 · aim 10½" after switching on the score-pad chip. | J04: 4 change ball via chip → 5 read now line | `F02-J04-05.jpg` |
| 3 | F03 | **Lane opens with a different ball from Tonight's pick.** Tonight's Stronger pick is Deadly Rattler, but Lane opens with Rattler Big Bite. | J06: 1 pick Stronger on Tonight → 2 open Lane | `F03-J06-02.jpg` |
| 4 | F05 | **Insights sometimes says "Score a game on Tonight…" when games exist.** `js/screens/insights.js` renders from `proj()` without awaiting the store's `ready()`, so a cold load can paint the empty state. Intermittent: seen locally, not on the two live runs. | J08: 1 cold load `#/insights` after J07's games | — (race; rerun J08 a few times) |
| 5 | F04 | **A ball sent to the pro shop is still Tonight's pick.** | J02: 5 set Status pro shop → 6 Tonight | `F04-J02-06.jpg` |
| 6 | F08 | **The Card doesn't name the one leave to work on**, though the session recap just did (flat 10). | J07 recap names it → J08: 3 Card | `F08-J08-03.jpg` |
| 7 | F06 | **No way to add a teammate who only gives a game total.** You have to enter their game frame by frame or skip them. | J05: 3 mark Cal total-only | `F06-J05-03.jpg` |
| 8 | F15 | **Tonight scrolls sideways at 360 px when the phone font is wider than Roboto.** The page grows wider than the screen and the tab bar slides off-screen. Seen on CI before Roboto was installed (DejaVu Sans fallback). A bowler with large text or a wider system font gets the same thing. Probably caused by a no-wrap row (Weaker/Stronger pills or long ball names). The new `hscroll` probe now flags it. | J01: 6 (CI run 40084433538) | `F15-CI-J01-06-hscroll.jpg` |
| 9 | F12 | **Lane's ball name and sub-line are cut off** at 360 px, so you can't confirm which ball you are on. | probe on Lane (J01/J03/J06) | `latest/` report, screen *lane* |
| 10 | F11 | **`<details>` summaries are only 28 px tall** (under the 44 px target) on Arsenal, Card, Session, Glossary and the Target `.card-title`. | probes J01–J09 | `latest/` report, Probes table |
| 11 | F07 | The ball page doesn't show the Status set on the Arsenal (pro shop). | J02: 7 | `F07-J02-07.jpg` |
| 12 | F09 | The bag builder doesn't say what to do (no one-line instruction). | J02: 3 | `F09-J02-03.jpg` |
| 13 | F13 | More has no "?" when Help is on. Every other screen has one. | J09: 2 | `F13-J09-02.jpg` |
| 14 | F10 | No way to export the arsenal to a file. | J02: 8 | `F10-J02-08.jpg` |
| 15 | F14 | The ball search placeholder "Storm Phaze II" isn't in the catalogue, so the example finds nothing. | J01: 11 | `F14-J01-11.jpg` |

Screenshot paths are relative to `docs/qa-reports/`. Every row except F15 is in `known_issues.json`, so CI stays green while it is open. When a fix lands, the report lists it under "Known issues now passing". Remove its entry then.

## Pending IA P1 work (J13–J15, expected to fail until shipped)
| Journey | IA item | Failing on main | Notes from the WIP tree (port 8300, not committed) |
|---|---|---|---|
| J13 Status | P1.3 four Status words | all 7 checks except "never asks to confirm" | Status words, pro shop/home/retired offers and no-dialog already pass. Still failing: the builder's Why-not/Swap section isn't built, and "Hall of Fame" still shows on /arsenal. A retired ball's page still shows **Put on lane**. |
| J14 Bag | P1.1 one bag, P1.2 Bring: N, P1.4 3 steps + why-not | all 7 | — |
| J15 Front | P1.5 Tonight trimmed | "fits in 1.5 screens" (League Tonight is 2,934 px, about 3.8 screens) | Hand line + change (P1.6), Lane mirroring, and Learn-first More all pass. |

## Measured flow cost (live)
Strike: 1 tap, about 3.7 s. Spare with hint: 3 taps, 5.2 s. Mid-game ball change: 2 taps. Fix a frame: 3 taps. Undo: 1 tap. The 247 game scored correctly across Tonight, Sessions and the Card.
Lowest screen usability scores (0–10, reported only): Session 6, Card 6, Lane 7 (min font 10 px), Arsenal-empty 7, Target 7, Insights 7.
