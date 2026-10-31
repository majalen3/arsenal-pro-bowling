# Changelog

Versions follow [Semantic Versioning](https://semver.org). The offline build id (`arsenal-pro-vNN` in `sw.js`, shown in Me › About) changes with every deploy.

## 1.1.0 (2026-10-31)

### For bowlers
- **Arsenal Pro is for any bowler.** No team name, no one else's stats: the first run starts empty and asks for your hand, style, speed and revs (or skip).
- **Example arsenal:** on Tonight, load 10 catalog balls and 2 bags marked "example" to look around. Remove them any time on Me → Imports. Or tap "Add my own ball".
- **Optional account (Me → Account):** sign in to keep your balls, profile and games private to you and on every phone. Choose whether this phone's data goes in. Save your recovery key, export your data, or delete the account any time. Everything still works without an account.

## 1.0.0 (2026-10-31)

The first full release. Everything below is in the app today.

### For bowlers
- **Five tabs you can use with one thumb:** Tonight, Bowl, Results, Bag and Learn, with Me in the top right. Old links still open the right screen.
- **Tonight:** say where you are bowling and get the ball to start with (from your own bag only), where to stand and aim, and the ball to switch to next. A line you move on Lane or Targeting is kept for that ball and shown as "your line".
- **Bowl:** strike in 1 tap, spare in 2, leaves and splits, 10th frame, fouls, fix any frame (with Undo), "Add a game total" when you only have the score, league team and Baker scoring with USBC handicap. The screen stays on while a game is open. Nothing extra shows while you score.
- **Results:** the latest night first, every night after it, games CSV export, and My Bowler Card: average, strikes, single-pin spares, the leave to work on and a spare drill.
- **Bag:** one saved bag with "Bring: N", ball status (in my bag, at home, at the pro shop, retired), a 3-step bag builder, compare, Insights, a printable Arsenal sheet, and Add a ball from a 145-row spec catalogue or by typing the specs (works offline).
- **Learn:** 709 oil patterns, the bowling guide and a 114-term glossary. Help bubbles stay off until you turn them on.
- **Lane and Targeting:** a labelled 2-D model of the ball path for your stand and aim, half boards, and Find my strike line.
- **Your data:** saved on the phone first, works offline, syncs under a private backup code, backup file download, CSV and LaneTrax session report import (read on the phone), center memory and your own house pattern.
- **Me › About:** version, a plain privacy note and links.
- Left-handed mirror, light and dark themes, Large and Extra large text.

### Polish in this release
- My Bowler Card no longer shows a stray "null" before you have scored a game.
- My Bowler Card and the night view now have the same side margins as every other screen.
- The 10th frame fits "X X X" on a 360 px phone.
- The app description says what the app does today.

### Under the hood
- No build step; scripts only from the app's own origin (CSP `script-src 'self'`).
- Tests: 259 unit, engine equivalence 7500/0, the UI end-to-end suite, 15 whole-night journeys with visual baselines at 360×780 and 414×896, a release audit (copy, page errors, 404s, axe, side margins, first-load bytes) and Lighthouse. None of them write to the production API.

### Not in 1.0 (next release)
- Ruby sensor CSV import (being finished on its own branch).
- Engine v2 (the 3-D model stays off).
