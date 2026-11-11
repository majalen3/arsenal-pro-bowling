# Cuts in v73 (owner t125u/t126u/t127u): what moved, and how to put it back

Measured at 360x780 with the sample arsenal on 2026-11-11 (America/Chicago). "Before" is v72 (`origin/main` 8d741c5), "after" is this branch.
The numbers come from `tests/ux/thirty_second.py` (whole screens) and a per-block count of the same kind (visible words and tappable controls inside one block).
Evidence: `/workspace/t120-evidence/before/` and `/workspace/t120-evidence/after/`.

Nothing was deleted from the data or the engine. Almost every cut is a **move** behind a `<details>` (one tap to open). Only labels and explainer
sentences were deleted. The cuts are grouped in four commits, one per screen group, not one commit per cut. To undo a whole group, `git revert` its
commit. To undo one cut, use its "Restore" line.

| Commit | Contents |
|---|---|
| 831d65c | Bag first: Keep toggle, Shake it up, the Tonight/All switch, the explainer, the row why-lines |
| b68037b | Arsenal: shelves and catalogue behind a tap; quieter spec wording; smaller ball hero; routes open at the top |
| 3627d04 | Strike finder screen; Score page no-scroll; Log book key stat and More; Bag no-scroll (checks behind Details) |
| 6404525 | Add a ball miss card |

## Whole screens (360x780)

| Screen | Words before → after | Controls before → after | Page height before → after (px) |
|---|---|---|---|
| Bag `#/bag` | 156 → 73 (−53%) | 25 → 26 | 1476 → 1131. Bag card + Pack fit above the tab bar; the rest is folded |
| Arsenal `#/arsenal` | 499 → 70 (−86%) | 97 → 27 | 5660 → 1020 |
| Find my strike line (`#/target?find=1` → `#/strike`) | 307 → 70 (−77%) | 20 → 6 | 1732 → 780 (no scroll) |
| Strike line `#/tonight` | 57 → 57 | 13 → 13 | 780 → 780 |
| Log book `#/results` (no nights yet) | 33 → 14 (−58%) | 7 → 7 | 780 → 780 |
| Add a ball `#/add-ball` | 53 → 53 | 5 → 5 | 780 → 780 |
| Score page `#/bowl` | 102 → 62 (−39%) | 51 → 51 | 1135 → 780 (no scroll; 844 at 390x844 with a safe area) |
| **Total, 6 spine screens** | **1105 → 337 (−70%)** | **167 → 84** | |

## Each cut

| # | Screen | What was removed (R) or hidden (H) | Words / controls before → after | How to restore |
|---|---|---|---|---|
| 1 | Bag | R: the Tonight / All my balls switch (`#bagView`). `#/bag?view=all` now opens the Arsenal tab. | 5 / 2 → 0 / 0 | Revert the `bagView` block in `js/screens/bag.js` and `js/screens/arsenal.js` from 831d65c, and the ia5 check in `tests/e2e.py`. |
| 2 | Bag | R: the explainer sentence under the title (`#bagExplain`). | 25 / 0 → 0 / 0 | Re-add the `h('p',{id:'bagExplain'…})` line from v72 `js/screens/bag.js` (831d65c). |
| 3 | Bag | H: each row's "why" line now sits in the ball name's tooltip (title attribute). The rows are compact: name, role, Swap, Keep. | 50 / 6 → 19 / 6 (the row why-lines were 28 words) | Restore the old row markup (`.adv-head` and the why line) in `rowView` from v72. `tests/e2e.py` onebag reads `.bb-name`. |
| 4 | Bag | H: Strength ladder and Bag checks are inside one closed `<details id="bagDetailsCard">` "Strength and checks". | 104 / 1 → 3 / 1 (closed) | Make `#bagDetailsCard` a `div.card` again, or add the `open` attribute (3627d04, `js/screens/bag.js`). |
| 5 | Bag | Moved: Bring (with the Other box) went from its own card into the bag card, under the rows. Its label is just "Bring"; "counts the spare" is the tooltip. | 36 / 6 → 33 / 6, now inside `#bagTonight` | Move `#bagWhere` back above `#bagTonight` in `draw()`, and set the label back to 'Bring (with the spare)'. |
| 6 | Arsenal | H: the shelf view (pedestals, milestones, Old Friends) is in `<details id="armShelvesD">`. The page starts with a search box and one row per ball (dot, name, In bag, Keep). | 89 / 7 (+ Hall) → 5 / 1 (closed). Cost: sharing an Old Friends card takes 1 more tap (J17 is still within its 3-tap target). | Take `armory(P)` out of the `armShelvesD` wrapper in `js/screens/arsenal.js` (b68037b). |
| 7 | Arsenal | H: Export, the full catalogue grid, chips, search and the catalogue reference are in `<details id="armMoreD">` "More: export, catalog reference". | 285 / 66 → 4 / 1 (closed) | Take those nodes out of `armMoreD` (b68037b). The e2e phone/desktop/export cycles open `#armMoreD summary` first; remove those clicks. |
| 8 | Find my strike line | R/H: the Targeting find card's paragraphs. The new `#/strike` shows a lane picture to the pocket, 4 tiles (stand, target, breakpoint, ball), an "estimate" tag, one primary button "Use this line", and one "Details" (why, alternative, window, inputs, Targeting by hand). | 307 / 20 → 70 / 6 (paragraph words 128 → 0) | `#tnFindLine` on Strike line points to `#/strike?find=1`. Pointing it back to `#/target?find=1` (`js/screens/tonight.js`) brings the old screen back; Targeting is unchanged. |
| 9 | Score page | H: the Weaker / Stronger step ladder and "How did it read?" moved into the closed `#tnMore`, now titled "Ball change, read and details". | 23 + 12 words → 0 visible. Cost: Weaker/Stronger after a read is 3 taps instead of 2 (journey J06 target 2 → 3). | Move `alts` and `reads` back into the BOWL `h()` list in `js/screens/tonight.js` (3627d04). |
| 10 | Score page | R: the "First ball hit" label. The control says "First ball hit (optional)" and "Hit: Pocket / High / Light". | 3 → 4 words, 3 buttons unchanged | Re-add the label `h('p',…'First ball hit')` and drop the `ql-hit` class. |
| 11 | Score page | Layout: pin rack max width 248 → 216 px; no tab-bar padding in the game; tighter `#tnNow` / `#tnLog` padding. | height 1135 → 780 px | Revert the "game-screen tightening" block at the end of `css/app.css` (3627d04). |
| 12 | Log book | H: Bowler Card, Season Wrapped and Export games (CSV) are in `<details id="lbMore">` "More: Bowler Card, Season Wrapped, CSV". The Nights tab starts with stat tiles (games, average or strikes). With no nights it shows "Score a game". Export games now takes 4 taps from the game page instead of 3 (task 11 plan 2 → 3). | 33 / 7 → 14 / 7 (empty state) | Move `#goCard`, `#goWrapped2` and `#gamesCsv` out of `lbMore` in `js/screens/sessions.js` (3627d04). |
| 13 | All screens | R: "TBD" chips. Missing specs say "not published", with one quiet note per ball ("Some specs not published by the maker…"). | Ball page: one TBD chip per missing field → 1 line | `rgTxt`/`diffTxt`/`specNote` in `js/data.js` (b68037b). |
| 14 | Ball page and hero | Size: `.ball-orb.xl` 96 → 44 px, so the ball no longer pushes the page title down (owner t126u). | — | `css/app.css` `.ball-orb.xl` (b68037b). |
| 15 | Add a ball | Layout, not a cut: a failed lookup is now a card (`#abMiss`) with the message, Retry, a link to the maker page or maker search, and "type the specs". Missing fields show "—" plus one "Not published" line. | 53 / 5 → 53 / 5 | 6404525. |

## Not cut, on purpose
- Strike line `#/tonight` was already one screen (57 words). Its only change is that Find my strike line opens `#/strike`.
- In the game, `#tnFind` still opens Targeting (`#/target?find=1`) so the v70 in-game chrome and its tests stay the same.
