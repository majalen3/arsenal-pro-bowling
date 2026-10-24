# Engine B → app port plan (plan only)

**Status (2026-10-24):** **PLAN ONLY — the port is NOT built.**
- Engine B v5 scores **7/10** on the 10-gate physics QA (see `ENGINE_VERIFICATION_REPORT.md` §6b).
- The build gate is ≥ 8/10, and the gate for turning `cc3d` ON is ≥ 9/10 with the sweep passing (`COMMAND_CENTER_PLAN.md`).
- No `js/engine3d/` files exist yet. The live 2-D engine (`js/engine.js`, `simulatePath`) is untouched: `node tests/engine_equivalence.mjs` gives 7,500 comparisons, 0 mismatches.

## 1. What gets ported (when unblocked)

**Source:** `physics/engines/model6.py` (rigid-body slip/roll with migration memory), `oil.py` (oil grid + breakdown), `engine5.py` (inputs → parameters), and `best_v5.npy` + `engine5.json`.

**Existing starting point:** `physics/engines/js/sim.js`, a JS port of model4 (`sim4`, `metrics`, `solveTheta`, `muLookup`, `inertia`). It needs these v5 deltas:

| v5 change | JS work |
|---|---|
| Loft: contact starts at landing (`x_land = loft_ft`); airborne before it | Start the integration at `x = loft`, with lateral drift `y += loft·vy/vx`. |
| Pin-to-PAP inches → α = 90·in/6.75 (MoRich Dual Angle, F) | Pure input mapping. |
| Tilt-track ring geometry `kp/max(cos τ, 0.2)` | One line. Its effect is negligible today (see report). |
| Grid map T = 3.2·U^0.25 (physical units → μ grid) | Grid builder. Empirical, `pexp` near its bound. |
| Breakdown: `oil.shot` deposit/carry-down (DEPL5) | Optional module, only for transition views. |

**New files only (when built):**
- `js/engine3d/sim.js`, `grid.js`, `params.json`, `worker.js`;
- `tests/engine3d.test.mjs`.

**Behind `cc3d` (default OFF):**
- Not imported by any screen while the flag is off.
- A flag-off test asserts that `engine3d` is never loaded and that the outputs equal the 2-D engine.

## 2. Hard invariants
1. `simulatePath`, `analyze`, `sensitivity`, `coachLine` and `phasesOf` stay unchanged. `node tests/engine_equivalence.mjs` must report **0 mismatches** on every commit.
2. Flag OFF: no network or CPU cost (lazy `import()` only when `cc3d` is true).
3. Every 3-D output is labelled **"model estimate"** and shows its per-pattern error once measured data exists (N3: Ruby/LaneTrax measured vs predicted).

## 3. Performance: "Find" ≈ 2,000 sims in < 1.5 s on a phone

**Measured (Node 20 on the shared box, under load average ~8):** the existing `sim4` JS port on a 39×121 grid, 200 runs each.

| dt (s) | ms/sim | steps | 2,000 sims |
|---|---|---|---|
| 0.004 (QA reference) | 4.28 | 771 | 8.6 s |
| 0.008 | 1.25 | 386 | 2.5 s |
| 0.012 | 0.62 | 257 | 1.2 s |

**Phone assumption:** a phone is roughly 2–4× slower than this box. That is an **ASSUMPTION**, to be measured on a device. A straight port therefore fails the budget, so the plan has four layers:
1. **Allocation-free RK4.** Use `Float64Array` state and no per-step arrays or `push`; precompute the μ grid and bilinear lookup. Target ≥ 3× speed-up (to be measured).
2. **dt 0.008–0.012 for search, 0.004 for the final displayed line.**
   - Python step-halving at 0.004/0.002/0.001 gives exit 17.920/17.949/17.949 and entry 4.753/4.722/4.721.
   - A JS step-halving test must show |Δexit| ≤ 0.25 board and |Δentry| ≤ 0.1° at the search dt, across the 709-pattern sweep. Otherwise fall back to a lower dt.
3. **Web worker pool** (`navigator.hardwareConcurrency − 1`, max 4). Split the candidate grid; the UI shows progress, and it can be cancelled.
4. **Reduced-order fallback.** Run a coarse 3-D sweep (~200 sims), then fit a per-session quadratic surrogate over (board, angle) and refine the top 10 with the full sim. This holds the budget even at 4× phone slowdown (200 × 0.6 ms × 4 ≈ 0.5 s, plus the refine).

**Budget test:** `tests/engine3d.perf.mjs` asserts 2,000 sims < 0.4 s on the box. That is a 4× margin for phones and is an ASSUMPTION until device timing exists.

## 4. Migration
1. **M0 (now):** the plan. The report states the score.
2. **M1** (needs QA ≥ 8):
   - Port the sim plus the Python ↔ JS golden test: 50 cases, |Δexit| < 0.05 board, |Δbp_ft| < 0.1 ft.
   - Flag-off test; equivalence test still at 0.
3. **M2:** worker + perf test; reduced-order search.
4. **M3** (needs QA ≥ 9 plus measured-vs-predicted error on N3 data): a `cc3d` ON beta, showing the 3-D line next to the 2-D line with the error band.
5. **M4:** decide whether to replace the 2-D engine. That is a separate ADR, and the owner signs off.

## 5. QA plan
- **Per commit:** equivalence 0 mismatches; flag-off unreachability; golden JS ↔ Python; determinism.
- **Per release:**
  - the physics 10-gate scorecard;
  - the 709-pattern sweep with no NaN, the breakpoint at 30–50 ft and entry within range;
  - step-halving at the search dt;
  - perf on a real low-end phone.
- **Rollback:** the flag stays OFF. The 2-D engine is never modified, so rollback is a flag flip.

## 6. What blocks the build (data, not code)

| Failing gate | Value now | Data that would unblock it |
|---|---|---|
| 7: CV robot hook 0–60 ≤ 1.5 boards | 1.84 (grid CV) | Real per-test robot oil volume/length (the USBC robot pattern is constructed: H = 20 units and 40 ft are ASSUMED). |
| 8: CV human entry ≤ 0.8° | 0.96 | Per-case real house patterns for the human cases (12 library patterns are proxies). |
| 9: Urethane weakest (below pearl) | Urethane hook 24.5 vs pearl 15.6 | Measured urethane on-lane COF / absorption. The earlier refusal stands: there is no fetched number, so none is fitted. |

Also still unknown: tilt → roll distance pairs, and loft → breakpoint pairs. The loft and tilt sensitivities are model-derived.
