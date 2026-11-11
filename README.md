# Arsenal Pro

**A free bowling arsenal, lane and scoring app for any bowler.**

**[Open the app →](https://majalen3.github.io/arsenal-pro-bowling/)** (works on any phone; add it to your home screen and it runs offline)

Arsenal Pro is a free bowling companion for league and practice nights. It picks the ball for tonight from your own bag, gives you a place to stand and aim, scores your games one-handed, and turns what you log into a plain recap of the night.

## What it does

| Tab | Use it for |
|---|---|
| **Building** (home) | Your home base. Say where you are bowling (league, tournament, practice, the center, the pattern); it shows the ball to start with from your bag, where to stand and aim, who is bowling, and **Start bowling**. After End night it shows the night you just bowled. |
| **Game** (no tab) | The scoring page you enter from the Building: strike in 1 tap, spare in 2, leaves, splits, 10th frame, fouls, fix any frame, league and team scoring with USBC handicap. No tab bar or extras; **← Building** leaves without ending the night. |
| **Results** | The latest night first, then every night, your lines, lane notes and the Bowler Card (average, strikes, single-pin spares, the leave to work on). |
| **Bag** | Tonight's bag (what you take tonight) and All my balls (everything you own): status (ready to bring, at home, at the pro shop, retired), the 3-step bag builder, compare, add a ball from a 150-row manufacturer spec catalogue or by typing the specs. |
| **Learn** | 709 oil patterns (Kegel library), the bowling guide and a 119-term glossary. Help bubbles are off until you turn them on. |
| **Me** (top right) | Bowler profile (hand, speed, revs), optional account, backup code, backup file, imports (CSV, LaneTrax session report PDF, read on the phone), text size, About. |

Lane and Targeting open from the "Stand · Aim" chip. They open from the Building and the game page and show a labelled 2-D model of the ball path; it is a model, not a measurement.

## Your data and privacy

- Everything is saved on your phone first (IndexedDB) and the app works with no signal.
- A copy syncs to the Arsenal Pro server under your **backup code**, so you can restore on a new phone (Me › Restore from another device). No ads and no tracking.
- **Optional account** (Me › Account): sign in with an email and password to keep your arsenal, profile, games and shots private to you and synced across phones. You choose whether this phone's data goes in. Export or delete the account on the same card. Without an account everything works as before.
- Me › Download backup saves a file you keep. Results › Export games (CSV) gives you your scores.
- LaneTrax PDFs are read on the phone; the file itself is never uploaded.

## For developers

No build step: plain ES modules, served as static files (GitHub Pages). The Content-Security-Policy allows scripts from the app's own origin only.

```
index.html, css/app.css, js/        app (hash router, lazy screens, IndexedDB event log)
sw.js                                offline cache: network first, cache name arsenal-pro-vNN (bump it on every release)
data/                                pattern library and glossary
docs/DECISIONS.md                    why things are the way they are
docs/RELEASE_v1.0.md                 the v1.0 go / no-go record
```

Run locally: `python3 -m http.server 8300`, then open http://localhost:8300/.

Tests (none of them call the production API):

| Suite | Command |
|---|---|
| Unit | `node --test tests/data/*.test.mjs` |
| Engine equivalence | `node tests/engine_equivalence.mjs` |
| UI end-to-end | `python tests/e2e.py http://localhost:8300/` |
| Whole-night journeys + visual | `python tests/journeys/run.py --base http://localhost:8300/` |
| Release audit (copy, errors, axe, bytes) | `python tests/journeys/release_audit.py --base http://localhost:8300/` |
| Lighthouse | `tests/lighthouse.sh http://localhost:8300/#/tonight` |

The Python suites use Playwright (`pip install playwright && python -m playwright install chromium`). CI runs the UI and journey suites on every push.

Backend: [arsenal-pro-api](https://github.com/majalen3/arsenal-pro-api) on Render's free tier (the first call after a quiet spell can take about 30 s; the app keeps working meanwhile).

See [CHANGELOG.md](CHANGELOG.md) for what changed.
