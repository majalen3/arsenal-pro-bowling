# League scoring: team, Baker, handicap (scoring fix 4)

Pure logic is in `js/cc/league.js` (unit tests: `tests/data/league.test.mjs`). The UI is in Tonight: setup → Scoring
(Just me / League team / Baker) → "Team and handicap" (behind a tap). During a game the only addition is the pill
"Up: Name · frame N". The team board sits behind one tap under the pad.

## Rules used (USBC Playing Rules, bowl.com)
| What the app does | USBC source |
|---|---|
| Handicap = (basis − average) × percent; fractions dropped (average truncated, then handicap truncated toward zero) | Rule 100d-2g ("When figuring handicap or averages, fractions are to be dropped") |
| Basis 200 / 210 / 220, chosen by the league; the basis should be above the highest average | Rule 100d-2, Q&A 100d/1 and 100d/2 |
| Percent 80 / 90 / 100. The app defaults to 90% of 220 (a common league setting) and shows that the USBC default is 100% unless the league rule says otherwise | Rule 100d-2a |
| No limit on handicap; a negative handicap only if the league allows it (setting `allowNeg`, off by default) | Rule 100d-2d; League Operations Handbook (negative handicap is an option) |
| Absentee score = absent member's average − 10; handicap on the average | Rule 112e-1 |
| Absent member without an established average: 120, handicap on 120 | Rule 112e-3 |
| Vacancy score = 120 (adult); handicap on 120 at the league's percent | Rule 112d-1, Q&A 112/1 |
| Baker games are not counted in averages, so Baker throws never feed the bowler's stats | Rule 3a |
| Ball care: no abrasive, cleaner or foreign material once competition starts (first ball thrown for score) | Rule 18, Q&A 18/1–18/5 (shown on Bag → Ball status and care) |

## Data
- Teammates' throws and Baker throws are ordinary `shot.logged` events with `who` (a teammate id, or `baker`). The
  projection routes them to `P.teamShots`, so `P.games`, the recap, Bowler Card, by-ball tables and the games CSV only
  see the bowler's own frames. Old clients ignore `who` and keep working (backward compatible). No new server table:
  the events sync and export/delete with the rest of the log.
- The lineup (names, averages, status) and basis / percent are device settings (`prefs.league`), included in the backup file.
- Not modelled (league rules vary): team-method handicap, handicap caps, Baker team handicap rules (the board shows
  the sum of each bowler's handicap and says to check the league rule), points, and substitutes.
