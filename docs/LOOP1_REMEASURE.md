# Loop 1 re-measure: time per frame (2026-10-24)

The same 10-frame game was scored on the live app before the scoring fixes (`/workspace/ux-shots/loop1-before/`, script `ux/loop1-mine/journey.py`) and after (live sw v30, `/workspace/ux-shots/loop1-after/`, script `journey_after.py`, today's flows). Viewports: 360×740 and 390×844, with identical results at both.

**Game:** X · 9/ · 7-10 split, missed · X · 6/ (later fixed to X) · X X X X · 10th: X then a mistaken X, fixed to X 9/.

## Per frame (360×740)
"Thumb" = tap centre in the lower third of the screen. "Model s" = taps × 0.9 s + scrolls × 1.2 s.
These are **assumed** constants, used only so before and after can be compared on the same basis. They are not a measurement of a bowler.

| Frame | Before: taps / scrolls / thumb | Model s | After: taps / scrolls / thumb | Model s |
|---|---|---|---|---|
| 1 X | 1 / 0* / 1 | 0.9 | 1 / 1 / 0 | 2.1 |
| 2 9/ | 3 / 0 / 2 | 2.7 | **2** / 0 / 1 | **1.8** |
| 3 7-10, miss | 4 / 0 / 2 | 3.6 | 4 / 0 / 2 | 3.6 |
| 4 X | 1 / 0 / 1 | 0.9 | 1 / 0 / 1 | 0.9 |
| 5 6/ | 3 / 0 / 2 | 2.7 | **2** / 0 / 1 | **1.8** |
| 6 X (after reload) | 1 / **1** / 0 | 2.1 | 1 / **0** / **1** | **0.9** |
| 7–9 X | 1 / 0 / **0** each | 0.9 each | 1 / 0 / **1** each | 0.9 each |
| 10 X X | 2 / 0 / 0 | 1.8 | 2 / 0 / 2 | 1.8 |
| **Game** | **18 taps, 1 scroll, 6 thumb** | **17.4** | **16 taps, 1 scroll, 13 thumb** | **15.6** |

\* The before script had already scrolled the quick log into view before frame 1, so its frame-1 scroll isn't counted. In the after run, the scroll to the pad before the first ball is counted. See "Still open".

## Corrections and interruptions
| Task | Before | After |
|---|---|---|
| Fix the last frame | 3 taps (undo, undo, re-enter) | 3 taps (Fix a frame, 5, X) |
| Fix an older frame (frame 2, after 3 more frames) | Not possible without undoing every later ball | **3 taps** (Fix a frame, 2, X); later frames are kept |
| 10th-frame mistake | 4 taps | **3** (undo, pin, then / spare) |
| Reload mid-game: quick log top | 709 px (below the fold at 740) | **154 px**; the pad is fully on screen |
| Tonight page height after starting | 2,743 px | 2,218 px |
| Targets under 44 px on Tonight | 0 | 0 |

**App-side time** (`window.__apFrameMs`, from the first tap to the frame closing): about 483 ms for a one-tap strike. Of that, 450 ms is the script's own wait (420 ms double-tap guard + 30 ms), so the app adds about 30 ms per frame. The 2-tap and 3-tap frames scale with taps.

## Reading it (U/A)
- Spares save a tap each (3 → 2), and the 8 one-pin and one-throw frames are unchanged. Over the game, that's 18 → 16 taps, or about 1.8 s of the model time.
- The bigger gain is reach. Thumb-zone taps went from 6 to 13 of 16, and a reload no longer hides the pad (709 → 154 px). That removes a scroll in the middle of the game.
- An older frame can now be fixed without losing the frames after it.

## Still open (not changed in this item)
- **Before the first ball**, the quick log starts at 662 px on 360×740, because the pre-game advisor and pick stay open by design (GAP_REVIEW_1 §5 #7). That costs one scroll per night, on frame 1. A candidate fix is a "Start scoring ›" jump link on the pick card, to be weighed against the "nothing extra" rule.
