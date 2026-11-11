# Product spine (v71)

Owner, 2026-11-11 (America/Chicago):
- t115: "bag building first. Then arsenal manager. Then the strike finder. Then say like log book."
- t116: "Everything. A max three clicks away."

The four tabs are the spine, in this order. Nothing else is a tab. This builds on [HOME_GAME_FLOW](HOME_GAME_FLOW.md) (v69–v70): scoring is still a focused game page, and in-game Lane and Targeting keep the game chrome.

| # | Tab | Route | What it is for |
|---|---|---|---|
| 1 | **Bag** (front door) | `#/bag` | Packing tonight's bag. Where & lanes, Bring N, tonight's balls with Swap / Always bring, then **Pack these N**. First run lands here, empty. While a night is open it also shows **Back to the game · game N**. |
| 2 | **Arsenal** | `#/arsenal` (old `#/bag?view=all` still works) | The arsenal manager: the Armory shelves (in the bag, at home, Old Friends), Add ball (catalog search or typed specs), a ball's specs page, compare, insights, the printable sheet. |
| 3 | **Strike line** | `#/tonight` (was "the Building") | The strike finder for tonight: where you bowl and the start line, **Find my strike line ›**, **Lane view ›**, the Stand · Aim chip (Targeting), who is bowling, **Start bowling**. Scoring (`#/bowl`) sits inside the night. |
| 4 | **Log book** | `#/results` | Nights, games, series and history: the latest night, every night, lines, lane taps, notes, Bowler Card, Season Wrapped, CSV export. **End night lands here** (`#/results?night=<id>`) with the Night saved card and the one-time share offer. |

**Me** (profile, data, sync, backup, imports, appearance, About, tests and usage) and **Help "?"** stay in the top bar of every spine screen. **Learn**, the **Glossary**, oil patterns and a word search are on Me (the Learn card comes first). Learn screens show the tab bar with no tab highlighted.

## Flow

```
first run: Welcome (search first; Skip is fine) ──► Bag (empty: Find my balls / Add a ball)
Bag: where & lanes · Bring N · tonight's balls ──► Pack these N ──► Strike line
Strike line: start line · Find my strike line · Lane · Stand·Aim ──► Start bowling ──► Game (#/bowl)
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
| Find my strike line | 2 | 2 | 1 | 2 |
| Lane | 2 | 2 | 1 | 2 |
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
| `#/arsenal`, `#/bag?view=all` | Arsenal (Armory) | Arsenal |
| `#/add-ball`, `#/ball/:id`, `#/compare`, `#/arsenal/insights`, `#/arsenal/sheet` | Arsenal screens | Arsenal |
| `#/tonight` (`?night=<id>` still shows Night saved) | Strike line | Strike line |
| `#/lane`, `#/target` (`?find=1` runs Find; `?game=1` = in-game) | Lane / Targeting | Strike line (in game: none) |
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
