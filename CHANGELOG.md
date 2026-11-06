# Changelog

Versions follow [Semantic Versioning](https://semver.org). The offline build id (`arsenal-pro-vNN` in `sw.js`, shown in Me › About) changes with every deploy.

## Unreleased (2026-11-06; offline build v64)

### For bowlers
- Earned starter cards in Armory; Old Friends retained. A single optional Next up idea is off by default.
- Lane explains the model path in one sentence. Model, measured release, entered and input chips distinguish sources without new accuracy claims.
- Weaker/Stronger previews the next ball and suggests trying feet/eyes first, only outside active scoring.
- Manufacturer-only review of all 22 built-ins, with sources/dates; corrected specs and explicit unknowns. Eight identities have no supported model rather than guessed paths. Removed two unverified search rows, not saved equipment.
- Cover guidance rewritten in our own words; MOTIV lookup supported when the companion API PR is deployed.

### Under the hood
- Deliberately frozen v64 catalog-input baseline; unchanged engines pass 7,500/0. Per-ball old/new records: docs/DECISIONS.md.
- Local S1/S2/S3 flag/counter smoke tests and run instructions; no participant lift claims, no outbound telemetry.
- Full regression verification and small accessibility repairs exposed by the audit (null text, contrast, labels, review focus/targets). See docs/NOW64_VALIDATION.md for exact results.
- CSP, offline-first/no-build approach and existing QR/owned data retained. No Engine v2 or product photos; C8/C9 remain owner decisions.

## 1.1.1 (2026-11-02)

### For bowlers
- **Add a ball: every catalogue ball now comes from its maker's own page.** All 145 rows were re-read from the manufacturer's product page (or its tech sheet) on 2026-11-02. Each ball shows the maker as the source with a link and the date read. Values the maker doesn't print show "spec TBD" instead of a number from somewhere else. Two balls with no maker page (Storm Mix Black White, Storm Tropical Surge Purple) are marked unverified; type their specs from the box.

### Under the hood
- `js/data/spec_catalog.js` is generated from `tools/catalog/maker_rows.json` by `tools/build_spec_catalog.mjs` (rows are objects with `source`, `checked`, `specStatus`); no third-party catalogue data. Offline build `arsenal-pro-v62`.

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
