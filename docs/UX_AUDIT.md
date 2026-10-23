# Arsenal Pro — baseline UX audit (Phase 1)

Build audited: `9189745` (live GitHub Pages). Screens captured at **390×844** (phone) and **1280×800** (desktop):
`/workspace/ux-shots/before/{phone,desktop}-{lane,lane-full,alley-notes-full,dossier,arsenal,arsenal-full,compare}.png`.
API was pointed at an unreachable host to audit the offline/local path deterministically.

## Core jobs — baseline (scripted in Playwright, `/workspace/ux/audit_before.py`)
Time = Keystroke-Level-Model estimate (tap 2.65 s incl. visual search+point, scroll 1.0 s, typed char 0.28 s, drag 1.5 s).
These are **model estimates, not timed humans**.

| Job | Phone taps / scrolls / drags / chars | Phone est. s | Desktop est. s |
|---|---|---|---|
| J1 Pick a ball and see its line | 1 / 1 / 0 / 0 | 3.7 | 3.7 |
| J2 Adjust after a miss | 1 / 1 / 1 / 0 | 5.2 | 5.2 |
| J3 Save a line and recall it | 4 / 1 / 1 / 13 | 16.7 | 15.7 |
| J4 Compare two balls | 4 / 3 / 0 / 0 | 13.6 | 11.6 |
| J5 Pick the next ball (oil going light) | 3 / 1 / 0 / 0 | 9.0 | 9.0 |
| **Total** | | **48.2** | **45.2** |

J2 note: the baseline has no "I missed" control — the bowler must interpret the coach text and drag a raw slider themselves.
J3 note: saving requires typing a name.

## Heuristic evaluation (Nielsen's 10; severity 0 = none … 4 = catastrophe)

| Heuristic | Finding | Sev |
|---|---|---|
| 1 Visibility of status | Readout (breakpoint/entry) is a paragraph in an info panel **below the fold** on phone; sync status is 11 px grey text. | 3 |
| 2 Match real world | Board numbers/arrows on canvas render at ~3–5 CSS px — unreadable; "Aim °" is engine jargon (bowlers think in target board). | 3 |
| 3 Control & freedom | No undo for slider moves or deletes; no back-button routing (Arsenal/Lane is a toggle, dossier a modal without history). | 3 |
| 4 Consistency | Native blue sliders clash with gold/green brand; three different chip styles; header toggle is a segmented control acting as navigation. | 2 |
| 5 Error prevention | Delete line has no confirm/undo; restore-from-code overwrites without warning. | 3 |
| 6 Recognition vs recall | Ball strip shows 2 balls; finding a ball = horizontal scroll through 22; no search. | 3 |
| 7 Flexibility/efficiency | No one-tap miss adjustments; save needs typing; compare needs mode switch + checkboxes + scroll. | 3 |
| 8 Aesthetic/minimal | Arsenal opens with three text walls (gaps, assessment, bag builder) above the balls; header spends 72 px on team name. | 3 |
| 9 Error recovery | Offline/API errors are tiny status strings; no retry affordance. | 2 |
| 10 Help | No onboarding; model assumptions (speed ~15 mph, rev ~220) are implicit. | 2 |

## Visual audit summary
* **Lane (phone):** lane occupies a thin centre strip of a large dark box (≈ 25 % of width); markings and pin numbers illegible; controls start at y≈890 (off-screen).
* **Arsenal (phone):** chip filter rows scroll horizontally and wrap inconsistently; ball cards are long text blocks; compare checkbox mode is hidden.
* **Desktop:** content is a phone column stretched — large unused areas, no side navigation.
* No light theme, no installable-icon PNGs, no deep links.
