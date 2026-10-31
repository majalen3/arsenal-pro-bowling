# Journey QA — Findings 2 (2026-10-31)

**Build tested:** live https://majalen3.github.io/arsenal-pro-bowling/ (sw v52, main `5f7be3f`, after IA P1 + P2 five tabs). The fixes below were re-run locally on v53 (`0c34216`).
**How:** `tests/journeys/run.py --live`: 15 journeys (J01–J15) on a 360×780 phone with seeded personas. Production API writes are blocked and served by a mock. CI `ui-tests` was also re-run with DejaVu Sans (no Roboto) to test wide fonts.
**Results:**

| Run | Passed | Failed | Known | Unknown probe failures |
|---|---|---|---|---|
| Live v52 | 99 | 0 | 9 | 4 |
| Local v53 | 99 | 0 | 9 | **0** |

Visual: 0 over tolerance. e2e: 738/0. Unit tests: 258 pass, 1 skipped. Engine: 7500/0.
**Since FINDINGS_1:**
- F04, F05, F07, F09, F10 and F12-title are fixed.
- J14 and J15 (P1) now pass.
- 12 core tasks went from about 38 taps + 8 scrolls to 30 taps + 0 scrolls.

Findings are ranked by harm to the whole night.

| # | ID | What breaks the flow | Journey step (repro) | Evidence | State |
|---|----|----------------------|----------------------|----------|-------|
| 1 | F01 | **The aim dragged on Lane is not the aim the app keeps.** After dragging to 25/15, Targeting shows 17/10 and Tonight shows 17/11. | J06: 4 → 5 → 7 | `findings-2/F01-J06-05.jpg` | open |
| 2 | F02 | **The top line keeps the old ball after a mid-game change.** It says "Rattler Big Bite Stand 17 · Aim 10½" while the ball in hand is Hy-Road Pearl. | J04: 4 → 5 | `F02-J04-05.jpg` | open |
| 3 | F03 | **Lane opens with a different ball from Tonight's pick**: Rattler Big Bite vs Hy-Road Pearl. | J06: 1 → 2 | `F03-J06-02.jpg` | open |
| 4 | F08 | The Card doesn't name the one leave to work on (the 10 pin), though the recap does. | J07 → J08: 3 | `F08-J08-03.jpg` | open |
| 5 | F06 | No way to add a teammate who only gives a game total. | J05: 3 | `F06-J05-03.jpg` | open (needs owner OK: new scoring mode) |
| 6 | F15 | **Wide phone fonts.** With DejaVu, Tonight was 366 px and Add ball 364 px wide, so the page scrolled sideways. Learn reached 369 px. | e2e `tonight`, `addball` under DejaVu | CI log | **fixed** (`55b7d76`, `a25d9ec`) for overflow. **Open risk:** League Tonight is 1152 px with DejaVu (budget 1110 in Roboto), and the Why-not Pack position and the aimbox/help taps fail under DejaVu. CI now measures in Roboto (`b42b9de`). |
| 7 | F17 | **The Armory title was cut to "Arm…"** because Help, Me, Add ball and Insights took 245 of 328 px. "Bowling Guide" was clipped too. | probe arsenal / glossary truncation | `F17-arsenal-title-after.jpg` | **fixed** (`0c34216`) |
| 8 | F11 | Fold summaries were 28 px, under the 44 px target. This included Bowl **during scoring** ("Bag, lanes and line details", "Why this ball…"). Cause: `details.card summary{min-height:28px}` outranked every per-screen 44 px rule. | probes J01–J09 | `latest/` report | **fixed** (`0c34216`). Only the Target "Model limit" summary is still 38 px. |
| 9 | F16 | "Hall of Fame" still shows on /arsenal (an old Status word; P1.3 says four words). | J13: 1 | `F16-J13-01.jpg` | open (wording: owner to confirm the retired-shelf name) |
| 10 | F12 | Lane's ball name is clipped ("Original Hy-Road"). | probe lane | `latest/` | open |
| 11 | F13 | /me has no "?" when Help is on. | J09: 2 | `F13-J09-02.jpg` | open (minor; Help is off by default since P2) |
| 12 | F14 | The search example "Storm Phaze II" isn't in the catalogue. The offline type-the-specs path now covers it. | J01: 11 | `F14-J01-11.jpg` | open |
| 13 | J04 flake | The ball picker auto-returns before the test taps Done. | J04: 4 | — | **fixed in the test** (`f03e5fb`) |

Lowest screen scores (0–10, reported only):

| Screen | Score |
|---|---|
| Card | 7 (applicability 2) |
| Lane | 7 (min font 10 px) |
| Scoring | 7 |
| Target | 7 |

## Owner decisions
- **Baby splits (2-7 / 3-10).** The BPAA guidance is to aim at the missing pin's spot. The app aims at the front pin. Not changed; it needs the owner's call.
- **F06** total-only teammates (a new scoring mode).
- **F16** what to call the retired shelf instead of "Hall of Fame".
