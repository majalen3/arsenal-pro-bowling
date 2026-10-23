# Arsenal Pro 2.0 — Team Prompt, Cycles 4–6

Same five-role team, invariants and QA gates as [`TEAM_PROMPT.md`](TEAM_PROMPT.md) (Tech Lead, Frontend, Backend, QA, UX/Mobile). This prompt closes the gaps left after cycle 3 (see `UX_CYCLE_LOG.md`). Work on `main` in small commits, one cycle per commit group, no force pushes.

## Non-negotiables (carry over, never regress)
- Lane geometry and orientation (pins at top, board 1 on the right for a right-hander, dots 7.5 ft, arrows 15 ft, range 37 ft, Baker box 5–8 at 42–46 ft).
- Honey Badgers colours: forest `#0F4D34`, gold `#DAAF37`, black. Mobile-first at 390 px.
- Coach voice: result first, a number, ≤ 2 short sentences.
- `simulatePath` / `analyze` behaviour unchanged: `node tests/engine_equivalence.mjs` must report **0 mismatches**.
- CSP `script-src 'self'`; no third-party runtime code; no build step.
- localStorage keys and record shapes unchanged; offline queue, backup code and API endpoints unchanged.
- Never invent ball specs, physics constants, study numbers or citations. Anything approximated is labelled as approximate in the UI and in `DECISIONS.md`.
- Tests never write to the production API (route-block `arsenal-pro-api.onrender.com`).

## Goals and measurable targets
| # | Goal | Target (pass/fail) | Owner |
|---|---|---|---|
| G1 | Task-time cut | Sum of KLM job times for the 5 baseline jobs (`tests/ux/audit_after.py`) ≥ **40 % below** the v1 baseline on **both** phone (≤ 28.9 s of 48.2) and desktop (≤ 27.1 s of 45.2) | UX + Frontend |
| G1a | 1-tap ball pick | A visible quick-ball strip on the Lane screen: switching to a recent / bag ball is **1 tap**, ≥ 44 px targets, current ball not duplicated, "All balls" entry still opens the full picker | Frontend |
| G1b | Back to saved line | After any change away from the most recently saved or loaded line for the ball on the lane, a **1-tap** "Back to saved line" control appears (named, labelled, hidden when already on it). Save → miss → back = **3 taps** | Frontend |
| G2 | Pin deflection on the deck | After first contact the deck shows a deflected ball path and the pin-to-pin action (pins knocked) with numbered pins; method and sources documented; approximation clearly labelled; text alternative lists the pins the model knocks down | Frontend + Tech Lead |
| G3 | Lefty mirror | With hand = left, the full lane canvas is mirrored (board 1 on the left, ball hooks right), board labels read correctly for a lefty, drag and arrow keys still move feet/target the right way; `analyze()` inputs/outputs unchanged | Frontend |
| G4 | Portable UX scripts | `tests/ux/*.py` run from any checkout: no absolute `/workspace` paths; base URL, output dir via args/env with repo-relative defaults; baseline data committed in `tests/ux/` | QA |
| G5 | Test data cleanup | Lines **1003** and **1004** (written by an early test run) removed from the live DB; nothing else touched; removal verified. **Done 2026-10-23** (api bdd2d81 → 669e71a; DECISIONS #13) | Backend |

## Research brief (G2)
Read primary or authoritative sources first (USBC Equipment Specifications / research publications on pin carry and ball deflection, published bowling-physics papers). Record each source fetched, what it actually says, and whether it gives usable numbers. If no usable quantitative deflection data is found, use plain 2-D rigid-body collision (equal-mass-ratio impulse along the line of centres, pin 3 lb 8 oz and COR 0.670 from the USBC spec, cited; ball weight is not known to the app, so an assumed 15 lb (USBC max 16 lb) is labelled as an assumption) as a **labelled approximation**, and say so in the UI caption and `DECISIONS.md`. No fitted numbers without a source.

## QA gates per cycle (all must pass before commit/push)
1. `node tests/engine_equivalence.mjs` → 0 mismatches.
2. `python tests/e2e.py <base> --shots <dir>` → all checks pass (phone 390×844 and desktop 1280×800), including new checks for G1a, G1b, G2, G3.
3. axe-core: **0 serious/critical** on every route, phone and desktop; no horizontal overflow.
4. Lighthouse mobile (`tests/lighthouse.sh`): Performance ≥ 95, Accessibility 100, Best Practices ≥ 95, SEO ≥ 95; shell ≤ 200 KB gzipped; TTI < 2 s.
5. `tests/ux/personas.py` → 20/20 pass (core job ≤ 3 taps, no errors, no dead ends).
6. `tests/ux/audit_after.py` → task-time table; report the phone and desktop % vs baseline.
7. Screenshots at 390 px: lane (right + lefty), pin deck with deflection (strike, light, high).

## Review loop
After each cycle score 1–10 on visual appeal, ease, consistency, accessibility, performance (self-review against the research heuristics; say so). Stop when all ≥ 9 for two consecutive cycles or after cycle 6. Log every cycle in `docs/UX_CYCLE_LOG.md`: changes, commits, measurements, scores, open issues.

## Plan
- **Cycle 4 — speed:** G1a, G1b, re-measure (G1), G4.
- **Cycle 5 — deck physics:** G2 research + implementation, tests, screenshots.
- **Cycle 6 — lefty + cleanup:** G3, G5, final live verification on GitHub Pages.

## Reporting
Per cycle: changes, commit hashes, task-time table vs the 40 % target, e2e / Lighthouse / axe results, scores, remaining gaps, screenshot paths. Anything not done is stated plainly with the reason.
