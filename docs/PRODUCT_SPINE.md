# Product spine (v71)

Owner, 2026-11-11 (America/Chicago):
- t115: "bag building first. Then arsenal manager. Then the strike finder. Then say like log book."
- t116: "Everything. A max three clicks away."

The four tabs are the spine, in this order. Nothing else is a tab. This builds on [HOME_GAME_FLOW](HOME_GAME_FLOW.md) (v69–v70): scoring is still a focused game page, and in-game Lane and Targeting keep the game chrome.

| # | Tab | Route | What it is for |
|---|---|---|---|
| 1 | **Bag** (front door) | `#/bag` | Packing tonight's bag. Where & lanes, Bring N, tonight's balls with Swap / Always bring, then **Pack these N**. First run lands here, empty. While a night is open it also shows **Back to the game · game N**. |
| 2 | **Arsenal** | `#/arsenal` (old `#/bag?view=all` still works) | The arsenal manager: a 3-across grid of your balls (picture + name, sortable; tap one for all its data and Keep in bag), the Armory shelves (in the bag, at home, Old Friends) folded below, Add ball (catalog search or typed specs), a ball's specs page, compare, insights, the printable sheet. |
| 3 | **Strike line** | `#/tonight` (was "the Building") | The strike finder for tonight. In order: where you bowl and the start line; **Your strike line ›** (the one primary button; since v77 it opens the **Lane view**, which is the strike page: lane picture, pin deck, stand/aim and one **Optimize** button); the Stand · Aim chip (Targeting); who is bowling; then **Start bowling** (a plain button, v72). Tonight's bag folds under one line of ball names. Scoring (`#/bowl`) sits inside the night. |
| 4 | **Log book** | `#/results` | Nights, games, series and history: the latest night, every night, lines, lane taps, notes, Bowler Card, Season Wrapped, CSV export (v73: these three sit under **More** below the stat tiles). **End night lands here** (`#/results?night=<id>`) with the Night saved card and the one-time share offer. |

**Me** (profile, data, sync, backup, imports, appearance, About, tests and usage) and **Help "?"** stay in the top bar of every spine screen. **Learn**, the **Glossary**, oil patterns and a word search are on Me (the Learn card comes first). Learn screens show the tab bar with no tab highlighted.

## Flow

```
first run: Welcome (search first; Skip is fine) ──► Bag (empty: Find my balls / Add a ball)
Bag: where & lanes · Bring N · tonight's balls ──► Pack these N ──► Strike line
Strike line: start line · Your strike line (primary, opens the Lane view: Optimize) · Stand·Aim · who ──► Start bowling ──► Game (#/bowl)
Game: no tab bar, no Help/Me/badges/share/bag tools. "← Strike line" leaves (the night stays open);
      Lane/Targeting from the game keep the game chrome ("← Game").
Strike line or Bag while a night is open: "Back to the game · game N"
End night ──► Log book (#/results?night=…): Night saved · Open the night · share once (Not now)
```

## The three-click rule

**Rule.** From any of the four spine screens, every core action is at most **3 taps**. The tab tap counts. Typing and Enter do not count. The count is to the control that does the action, or to the screen where it starts. Targets are ≥ 44 px, and the tab bar sits at the bottom for one-handed use.

`tests/product_spine.py` measures every pair (core action × start screen) on each run. It writes the table to `manifest.json` (`click_depth`). Measured 2026-11-11, worst case 3:

| Core action | Bag | Arsenal | Strike line | Log book |
|---|---|---|---|---|
| Pack tonight's bag | 1 | 2 | 2 | 2 |
| Bring N | 1 | 2 | 2 | 2 |
| Swap a packed ball (opens the choices) | 1 | 2 | 2 | 2 |
| Where & lanes | 1 | 2 | 2 | 2 |
| Add a ball (catalog search) | 2 | 1 | 2 | 2 |
| Open a ball's specs | 2 | 1 | 2 | 2 |
| Start a compare (first pick) | 2 | 1 | 2 | 2 |
| Arsenal insights | 2 | 1 | 2 | 2 |
| Your strike line = the Lane view (v77) | 2 | 2 | 1 | 2 |
| Optimize (v77: stand, target, pocket %, miss room) | 3 | 3 | 2 | 3 |
| Targeting (Stand · Aim) | 2 | 2 | 1 | 2 |
| Log a ball (Start bowling, then the pad) | 3 | 3 | 2 | 3 |
| Open last night | 2 | 2 | 2 | 1 |
| Fix a frame | 2 | 2 | 2 | 1 |
| Bowler Card | 2 | 2 | 2 | 1 |
| Season Wrapped | 2 | 2 | 2 | 1 |

Secondary actions sit off the main chrome (top bar). They are measured too, and every one is within 2 taps from each spine screen:

| Secondary action | Path | Taps |
|---|---|---|
| Me | Me | 1 |
| Help bubbles on/off | ? | 1 |
| Look up a bowling word | Me › search field | 2 |
| Learn / Glossary / Oil patterns | Me › link | 2 |
| Import or restore a backup | Me › Import a file | 2 |
| Tests and usage | Me › Tests and usage | 2 |

### Exceptions (documented)
- **The game page has no tab bar.** That is deliberate, so scoring stays focused. From `#/bowl`, add one tap (**← Strike line**, or **← Game** from in-game Lane/Targeting) to reach the spine. Logging the next ball while in the game is 1 tap.
- **Multi-pick and typed tasks.** A compare needs a second pick and **Compare** after the first pick (counted at the first pick). Adding a ball needs typing and a confirm. Account sign-in, a backup code, file pickers and the drill-card scan need typing or the OS picker.
- **Deep subpages** are one step past a counted screen, such as one session's frame editor or a pattern's detail. They count from that screen.

## Route map (deep links kept)

| Hash | Lands on | Tab |
|---|---|---|
| (none), unknown | `#/bag` | Bag |
| `#/bag` | Bag | Bag |
| `#/building` | redirect → `#/bag` | Bag |
| `#/arsenal`, `#/bag?view=all` | Arsenal (Armory): the ball grid | Arsenal |
| `#/add-ball`, `#/ball/:id`, `#/compare`, `#/arsenal/insights`, `#/arsenal/sheet` | Arsenal screens | Arsenal |
| `#/tonight` (`?night=<id>` still shows Night saved) | Strike line | Strike line |
| `#/strike` (`?ball=<id>`) | **Redirects to `#/lane`** (v77; the v73/v76 strike page is retired from navigation, see CUTS_V73 #22) | Strike line |
| `#/lane` (`?ball=<id>`, `?game=1` = in-game) | **Your strike line**: lane picture, pin deck, stand/aim, **Optimize** (Forgiving sweep, pocket % estimate, miss room, Undo), miss buttons; Details holds conditions, quick balls, numbers and the miss size | Strike line (in game: none) |
| `#/target` (`?find=1` runs Find; `?game=1` = in-game) | Targeting | Strike line (in game: none) |
| `#/bowl`, `#/game` (redirect) | Game page | none (no tab bar) |
| `#/results`, `#/sessions` (redirect), `#/session/:id`, `#/card`, `#/wrapped` | Log book screens | Log book |
| `#/me`, `#/me/usage`, `#/kit`, `#/import`, `#/more` (redirect) | Me | none (tab bar shown) |
| `#/learn`, `#/learn/patterns`, `#/patterns` (redirect), `#/pattern/:slug`, `#/glossary`, `#/guide` | Learn | none (tab bar shown) |
| `#/team`, `#/conduct`, `#/drill-card` | Bag screens | Bag |
| `#/welcome` | Welcome (first run, Find my balls) | none |

Saved data does not change. No migration was needed: tabs and routes are UI only. Existing arsenals and bags load as before. A new profile starts empty.

## Tests
- `tests/product_spine.py URL --shots DIR`: default home, the four tabs, first run, Bag → Strike line → Find → game → End night → Log book, game chrome, deep links, and the click-depth audit (core ≤ 3, secondary reported). It writes the screenshots and `manifest.json`.
- `tests/home_game_flow.py`, `tests/e2e.py` (ia5, task12, tonightfold, advisor, …) and `tests/journeys` were updated for the spine labels and routes.

## v73: 30-second test (owner t125u)
- Each spine screen has one job and one primary action that is visible at 360x780 without scrolling. Bag, the Score page and the Lane view (`#/lane`, the strike page since v77) do not scroll at 360x780 or at 390x844 with an iOS safe area. This is checked by `tests/ux/thirty_second.py`.
- Timed scripts: Bag (tonight's bag + oil on screen, Shake it up + Pack) takes 2 taps. Arsenal (find a ball, Keep in bag) takes 2 taps. Strike line → the Lane view takes 1 tap; Optimize is the 2nd tap and puts stand, target, pocket % and miss room on screen (the line ends at the pocket). Log book → games + key stat takes 1 tap.
- Everything that moved is listed with restore steps in `docs/CUTS_V73.md`. The tap counts above still hold, except Export games (CSV), which is now Log book › More › Export (+1).

## v74: Arsenal grid (owner t129u)
- `#/arsenal` opens on My balls: search, one Sort control (Name, Brand, Strongest to weakest, Newest, Most used), then a 3-across grid of picture + name tiles. A tile opens `#/ball/<id>`, which holds all of the ball's data and the Keep in bag toggle.
- Taps: find and open a ball = 2 (Arsenal, the ball); pin it = 2 (Arsenal tile, Keep in bag). Shelves, milestones and Old Friends are folded under the grid. Restore steps are in docs/CUTS_V73.md (#16-19).
