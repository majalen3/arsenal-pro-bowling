# Journey QA: the whole league night, end to end

These tests treat the app as one experience, not as a set of pages. Each journey is one stretch of a real night. It carries state from page to page: hand, ball, line, Status, night id, focus and average. It checks that every page agrees with the one before it. The plan is in [docs/QA_PLAN.md](../../docs/QA_PLAN.md), and open findings are in [docs/qa-reports/](../../docs/qa-reports/).

## Run it

```bash
python -m http.server 8350 --bind 127.0.0.1 &        # from the repo root; use localhost so the service worker registers
python tests/journeys/run.py                          # all journeys + visual, report -> docs/qa-reports/latest/index.html
python tests/journeys/run.py --only J04,J06 --no-visual
python tests/journeys/run.py --base https://majalen3.github.io/arsenal-pro-bowling/ --live   # against production
python tests/journeys/run.py --only VISUAL --update-baselines                                 # refresh pixel baselines
python tests/journeys/lighthouse.py --base http://localhost:8350/ --out /tmp/lh              # Lighthouse budgets
```

You need Python 3.10+ and `pip install playwright pillow`, then `python -m playwright install chromium`. Videos and traces go to `$TMPDIR/arsenal-qa-media`, which you can change with `--media`. They never go into git.

**Exit code.**
- `0`: every step passed, or failed only as a known issue listed in `known_issues.json`. Visual diffs are within tolerance (2 % of pixels by default, set with `--visual-tolerance`).
- `1`: there is a new failure.

When a known issue starts passing, the run prints "Known issues now passing". Remove that entry from `known_issues.json` so it is guarded from then on.

## Production safety

Every request to `arsenal-pro-api.onrender.com` is routed to `MockAPI` in `lib.py`, an in-memory stand-in for the sync, backup and spec-lookup endpoints. This holds on `--live` too, so the suite never writes to the production database. Requests the mock does not model are still answered locally: `GET` returns `[]` and anything else returns `201`, so nothing reaches the server.

The service worker ignores cross-origin requests (`sw.js` checks `u.origin !== location.origin`), so API calls stay page-level and the route catches them even in J11, the one journey where the service worker is on.

## Files

| file | what |
|---|---|
| `run.py` | Runner. Each journey gets a fresh phone-sized context (360x780, touch, mobile), a video and a trace. It writes the report and sets the exit code. |
| `journeys.py` | J01–J12: steps, the state carried between steps, and the assertions. |
| `personas.py` | Personas: righty (the owner), lefty, beginner, league of 4, coach. Seeded nights (flat-10 games) and the boot/wipe helpers. |
| `lib.py` | `Journey` / `Step`, the tap counter and KLM time estimate, the per-screen flow probes (touch targets, truncation, dead ends, numbers above the fold, axe), and the API mock. |
| `visual.py` | Pixel comparison of 13 screens at 360x780 and 414x896 against `baselines/`. |
| `report.py` | `results.json` and `index.html`: storyboard per journey, taps and time per task, flow score per screen, probe failures, visual diffs. |
| `lighthouse.py` | Lighthouse budgets: performance ≥ 80, accessibility ≥ 95, best practices ≥ 90. |
| `known_issues.json` | Failing step or probe → finding id in `docs/qa-reports/FINDINGS_*.md`. |

## Adding a journey step

```python
async with j.step('What the bowler is trying to do', task='frame', target_taps=1, target_s=4, carry='ball') as s:
    await j.tap('#qlStrike')                   # j.tap counts a tap; j.type counts characters; j.drag counts a drag
    s.check(await mark(j, 1) == 'X', 'X shown')
```

- **`task`** groups the step in the "taps and time per task" table.
- **`target_taps` and `target_s`** turn the targets into checks.
- **`carry`** names the state the step must keep from earlier pages.
- **`critical=True`** skips the rest of the journey when the step fails.
- **`j.audit('<screen>')`** runs the flow probes on the current screen, once per journey.
