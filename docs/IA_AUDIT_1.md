# IA audit 1: live app at 360×740 (2026-10-24)

**Setup**
- Playwright Chromium against https://majalen3.github.io/arsenal-pro-bowling/ (sw v40, HEAD 6238141).
- Viewport 360×740, DPR 2, `is_mobile`, `has_touch`.
- **Every request to `arsenal-pro-api.onrender.com` was aborted.**
- Flow: welcome → Skip → "Load starter arsenal" (22 balls).
- Scripts are on the box at `/workspace/ux/ia1/{map,probe,probe2-5}.py`. Screenshots are at `/workspace/ux-shots/ia1/` (34 PNGs, box only, not in git).
- Taps are counted from the tab bar (P), plus scrolls (S). Seconds use the KLM model (A): 1.3 s per tap, 1.35 s mental prep, 1.0 s per scroll. These are estimates, not measurements.

## 1. Screen map (scroll height at 360 px)
| Route | Height | What's on it (top → bottom) |
|---|---|---|
| Welcome | 1 screen | Skip; Right/Left; Stroker/Tweener/Cranker/Two-handed; Next |
| Tonight `#/tonight` (empty) | 1 | "No balls in your bag yet" → Load starter arsenal / Choose balls on More |
| Tonight (starter loaded) | **2302 px ≈ 3.1 screens** | 1. Outing chips (League/Tournament/Practice/New center/Sport)<br>2. First-ball plan "Feet 17 · eyes 10.7", Find my strike line, Weaker/Stronger, "Why this ball…"<br>3. **Quick log** pad at y≈756 (below the fold)<br>4. Lanes tonight (pattern, center, surface, condition, Bag Tournament 6/League 3, games, Scoring Just me/League team/Baker, goal)<br>5. **Bag builder ›** at y=2161 |
| Tonight after **League** | ≈3.4 screens | 1. Bag suggestion (3 rows with Swap, Pack this, Full bag builder ›, Then A→B, Why this bag, What would change it)<br>2. "Quick-log a game / Import results" at y=786<br>3. The old first-ball card with Weaker/Stronger **still there**<br>4. Pad at y≈1333–1693 |
| Tonight with **League team** | ≈4.5 screens | Team & handicap block; **Add a bowler at y=3028–3174**; Bag builder › at y=3184–3330 |
| Tonight with a game running | — | The pad moves to the top (Strike at y≈597) once a game is open. The bag suggestion moves below it. |
| Bag `#/bag` | **3134 px ≈ 4.2** | 1. Header ‹ Tonight / Bag / Add ball; "6 packed · 4 benched · no service due"<br>2. **Bag: Tournament 6 / League 3** *and* **Format: League 3/League 4/Tourn. 6/Custom**, plus "League night (advisor)"<br>3. Event date<br>4. Coverage grid (Lvl 5→1 × Smooth/Medium/Angular, "app tagshape (estimate)")<br>5. Fill bag from my balls<br>6. Checks (10 rows with source chips)<br>7. Your balls (Lock/Exclude)<br>8. Pack list<br>9. **Ball status and care** at y≈2648 (In bag / Benched / Pro shop / Retired; Log refresh/resurface/detox) |
| Lane `#/lane` | ≈1.5 | Ball chips, conditions, tune-shot pill "17 Stand · lay 10 → 10.7 Aim", Missed Left/High/Light/Right, overlays, How it works |
| Target `#/target` | ≈1.5 | Back to Lane, Ball, Find my strike line, Feet/Eyes ±, Save as my line, Drift / offset / box ± |
| Arsenal `#/arsenal` | **6113 px ≈ 8.3** | Header: Add ball, Insights. Then Armory pedestals, Bench and pro shop (4), Hall of Fame (0), 22-ball catalog by category (Put on lane / Compare each) |
| Add ball `#/add-ball` | 1 | Brand + model field, brand lookup. The maker lookup needs the network; with the API blocked, no catalog match came back for "Phaze" |
| Patterns `#/patterns` | long | Pattern library |
| Sessions `#/sessions` | 1 | Nights / Lines / Lane taps / Notes; My Bowler Card; night rows; **Export games (CSV)** |
| Session `#/session/<id>` | 1–2 | Summary, first-ball strikes, game frames, **Fix a frame in game N**, Details, Card |
| Card `#/card` | 2 | Bowler Card, Share as image |
| More `#/more` | **1866 px ≈ 2.5** | Bowler profile (Edit), My bag: all 22 (Choose), Your data, What's saved, **Help: bubbles Off/On (y=683), Glossary (y=783)**, Appearance, Sync & backup (Download backup), About, Replay welcome |
| Profile edit (sheet) | 1 | Close, **Right/Left**, style, speed ±, rev ± |
| Glossary `#/glossary` | **8889 px** | Search field, categories |

## 2. Top-12 tasks: taps and scrolls today
| # | Task | Path today | P + S | ≈s (A) |
|---|---|---|---|---|
| 1 | Log a frame (strike) | Tonight → (before a game) scroll or "Quick-log a game" → Strike. Once the game is open: Strike | 3P+1S first frame; 1P after | 6.2 / 2.7 |
| 2 | Start league night | Tonight → League → Pack this → Quick-log a game (scroll) → first ball | 5P+1S | 8.9 |
| 3 | Add a bowler | Tonight → League → scroll → League team → scroll ×3 → Add a bowler → type name + average | 4P+4S + typing | 11.6+ |
| 4 | Pick tonight's bag | Tonight → League → Pack this (suggestion). Full builder: + Full bag builder → Fill bag → Use this bag (+3S) | 3P (quick) / 5P+3S (full) | 5.3 / 11.9 |
| 5 | Change ball mid-game | "Ball X, change" → pick a ball (inline, replaces the pad) → Back to scoring | 3P | 5.3 |
| 6 | Find stand/aim | Tonight top line "Feet 17 · aim 10.7" (after League), or Lane tab pill | 0–1P | 1.4–2.7 |
| 7 | Look up a term | More → scroll → Glossary → type → scroll results | 2P+2S + typing | 6.0+ |
| 8 | See last night's recap | Sessions → night | 2P | 4.0 |
| 9 | Add a ball | Arsenal → Add ball → type brand/model → lookup → confirm | ≥4P + typing (lookup is online-only) | 6.6+ |
| 10 | Set handedness | Welcome only (Skip = Right, silently), or More → Edit → Left → Close | 4P | 6.6 |
| 11 | Export games | Sessions → Export games (CSV). Not listed under More › Your data, which only offers Download backup | 2P | 4.0 |
| 12 | Fix a past frame | Sessions → night → Fix a frame in game N → frame → re-enter pins | ≥5P | 7.9+ |

**Sum ≈ 38P + 8S** using the quick bag path, or 40P + 11S using the full builder, before typing. Counting starts at the tab tap. Most of the cost is scrolling Tonight (tasks 1–3), plus tasks 7 and 10.

## 3. Duplicated
- **Bag size is set in three places:** Tonight › Lanes tonight "Tournament 6 / League 3"; Bag "Bag: Tournament 6 / League 3"; Bag "Format: League 3 / League 4 / Tourn. 6 / Custom". (The Bag screen also has a "League night (advisor)" option.)
- **Two packed bags disagree.** After Tonight › League › **Pack this** (3 balls: Rattler Big Bite, Ordnance C4, Ice Storm), the Bag screen still says **"6 packed"**. The advisor saves `bag-adv-<event>`, and the Bag screen shows a different saved bag (repo: TEAM_PROMPT_BAG_ADVISOR.md). Biggest single cause of "not intuitive" (A).
- **Two start plans on Tonight after League:**
  - the advisor card ("Then: A Rattler Big Bite → B Ordnance C4");
  - the older first-ball card (Weaker Ordnance C4 / Stronger Super Nova, "Then: Ordnance C4 if it hooks early → Deadly Rattler later").
  - The two backups differ.
- **Coverage grid and Pack list** on Bag say the same thing in two layouts.
- **Lock/Exclude and Status:** Exclude means the same as Status Benched / Pro shop for the fill ("excluded, pro-shop and retired balls never go in"). Two controls for one idea.
- **"Find my strike line"** appears on Tonight, Target and Lane (repo c7008bd: it is one shared answer, which is good, but there are three entry points).
- **Bowler Card** is reachable from More, Sessions, Session and Insights.

## 4. Buried
- **Quick log** sits below the fold before the first ball (y≈756, or y≈1333 after League). The owner wants it off the front page anyway.
- **Add a bowler** is at y≈3028–3174, about 4 screens down Tonight.
- **Bag builder ›** is the last item on Tonight (y=2161 / 3184).
- **Ball Status** sits at the bottom of Bag (y≈2648) behind a ball select.
- **Glossary** is at More y=783. **Help bubbles** are Off by default (DECISIONS #32) at More y=683. A new user will not find either (research #1, #9).
- **Handedness** is only in Welcome and the More › Edit sheet. Skip silently means Right.
- **Export** is only on Sessions, not where "Your data" lives.
- **Bowling Guide** wasn't seen live; it is being built by the other worker.

## 5. Confusing names
| Today | Problem | Bowler words (proposal) |
|---|---|---|
| "bag" = owned balls (More "My bag: all 22"), packed balls ("6 packed"), and the Arsenal chip "My bag" | One word, three meanings | **My balls** (owned) · **Tonight's bag** (packed) · Status **In my bag** |
| Benched | Sounds like a penalty | **At home** |
| Pro shop | OK, but as a status it needs "at" | **At the pro shop** |
| Exclude | Computer word; overlaps Status | **Leave out tonight** (per outing only) |
| Lock | Unclear what it locks | **Always bring** (📌) |
| Lvl 5→1 / Smooth/Medium/Angular / "app tagshape (estimate)" | Spec jargon | "Stronger ↔ weaker" ladder; shape "smooth / in between / sharp"; the estimate note goes behind a tap |
| "same cell (level 2, medium)" | Grid jargon | "Too close to Deadly Rattler: same strength and shape" |
| Armory / Hall of Fame | Fun, but they don't say "my balls" / "retired" | Keep as flavour subtitles under plain headings |
| Feet / eyes / lay / offset | Mixed terms for stand and aim | **Stand** (board your feet start) and **Aim** (arrow you look at), everywhere |
| More | No information scent (research #2) | Gone. Split into Learn and Me |

## 6. Other observations
- Tapping Strike 12 times at 120 ms gaps recorded 4 frames. This looks like an intentional debounce; a human can't log frames that fast. **Not a bug claim**, only a note for e2e timing.
- Once a game is open, Tonight re-orders itself and puts the pad on top. That is good for bowling, but the page "jumps" between modes (A).
- Sessions' empty state ("Go to Tonight") is good (Apple: explain empty sections).
