# Engine verification report: ball reaction, release → landing → pins (24 Oct 2026)

**Scope**
- Prompt: `docs/TEAM_PROMPT_ENGINE_VERIFY.md`.
- Two engines:
  - **A**: the live app engine (`js/engine.js` `simulatePath`/`analyze`), plus the Find layer `js/cc/strikeline.js` and the `js/cc/addball.js` engine card;
  - **B**: the 3-D research engine in `/workspace/physics` (v4b params).
- **No app code was changed.**
- Harnesses (throwaway, outside the repo) are in `/workspace/physics/verify/`:
  - `a_probe.mjs`, `a_export.mjs`, `a_find.mjs`, `a_miss.mjs` (Node, run on copies of the app at HEAD 42ebd3d and the working tree);
  - `b_verify.py`, `b_extra.py`, `plots.py`.
- Plots are in `docs/engine-verify/`.

**Source tags**
- **(F)**: the page or document was fetched and read.
- **(S)**: only a search-result excerpt was read.
- **ASSUMED**: an engine constant with no published source.
- No new constants were introduced in this report.

**Test ball and lane**
- A RH tweener at 15 mph / 220 rpm.
- Engine A: Rattler Big Bite on the app's `house` preset.
- Engine B: 55° axis rotation / 12° tilt on Kegel *carbon* (42 ft), hybrid 2000, RG 2.50, diff 0.045.
- The 55/12 axis is ASSUMED; it is close to the USBC robot setting of 55° / 13° (F, USBC Ball Motion Study).

## 1. Input map

| Input | Engine A (live app) | Engine B (research) |
|---|---|---|
| Loft | **Not modelled.** The path starts at 0.6 ft with lateral force 0 until the scripted phase start. | **Not modelled.** Contact begins at the foul line. The harness emulated it by setting μ = 0 before a landing point. |
| Grit / roughness | `S.finish` → `getFinishMod` e/h multipliers (500 … polished). Moves skid end 17.0 → 20.5 ft. | grit/polish → Ra (ASSUMED table) → `mu_mult` (Ra^0.12) and `oil_handling` (Ra^−0.35, effective oil thinner when rough). |
| Absorption | **Not modelled.** | Static cover index (solid 1 / hybrid 0.8 / pearl 0.6 / urethane 0). Dynamic rate `ka` = 0 because `engine4.json` is missing. `oil.shot()` uses absorb for lane depletion. |
| Pin-to-PAP | **Not modelled.** | Proxy α: the angle between the spin axis and the low-RG (pin) axis, default 60°. There is no conversion from inches and no user input. |
| PAP | **Not modelled.** | **Not modelled** as a separate input; it is implied by φ, τ and α. |
| RG | `rgEarly = clamp((2.60−RG)·2.2, 0.2, 0.9)` feeds the scripted phase start. | Inertia `k1 = rg²`. |
| Diff | `diffHook = 0.7+12·diff`, a hook magnitude only. | Inertia `k3 = (rg+diff)²`. Produces flare and migration. |
| Int diff | **Not modelled** (asymmetric = flat ×1.12). | Fixed 0.4·diff internally (`k2`). The harness tested it via P[10]. |
| Speed | Only in `revRatio = rev/(speed·14)`. Forward motion is constant; no speed loss; skid length independent of speed. | Initial velocity; loses 15.0 → 11.9 mph over the lane. |
| Rev | Only in `revRatio`. | Initial ω (rpm). Ends at rolling rpm v/R (471). |
| Axis rotation | **Not modelled.** | φ: initial spin-axis orientation, evolves. |
| Axis tilt | **Not modelled.** | τ: initial spin-axis orientation, evolves. |
| Oil volume | `S.oil`: **cancels** (`fr*=oil`, `baseHook/=oil`). | µL per board per 0.5 ft from 709 Kegel sheets. |
| Oil length / pattern | Pattern = a constant lateral `fr` per preset. `OIL_LEN` is used only in the Rule-of-31 text. | Full 2-D pattern grid. |
| Lane surface | — | `mu_dry_mult` per lane surface. |

**Friction after landing**
- **A:** there is no landing.
  - Lateral force = `baseHook·fr(board,pattern)·phase(distance)·0.36`, where `phase` is a fixed curve of lane progress that starts at `0.40−0.18·early`.
  - The oil never sets *where* the hook starts.
- **B:** μ(x, board) = μ_dry·mult·(1−f) + μ_oil·f, with f = 1−exp(−T/T0u).
  - The contact force is slip-dependent (`s0`, `cslip`), with ball-oil memory (`kappa`, `lam`, `kp`, `kr`) and flare-regenerated fresh cover (`gamma`).
  - Skid → hook → roll emerge from integrating that force.

## 2. Matched-pair traces

### Engine A (`engine-verify/A_oil_surface.png`, `engine-verify/A_cover_core_speed.png`)

Real angle = drawn ÷ 4.28 (the lane is drawn stretched sideways).

| Variable changed (all else equal) | Skid end (ft) | Entry board | Notes |
|---|---|---|---|
| `S.oil` 0.6 / 1.0 / 1.5 | 18.8 / 18.8 / 18.8 | 17.41 / 17.41 / 17.41 | **identical** |
| Pattern house / sport / shark / cheetah / dry | 18.8 for all | 17.41 / 17.93 / 16.73 / 25.59 / 27.09 | Length never moves timing |
| Finish 500 / 1000 / 2000 / 3000 / polished | 17.0 / 17.9 / 18.8 / 19.6 / 20.5 | 18.21 / 17.79 / 17.41 / 17.13 / 16.78 | Direction right (scripted) |
| Cover solid / hybrid / pearl / urethane | 17.5 / 18.8 / 20.1 / 17.0 | 17.89 / 17.41 / 16.93 / 16.35 | |
| RG 2.46 / 2.53 / 2.60 | — | 17.41 / 17.36 / 17.36 | |
| Diff 0.015 / 0.035 / 0.055 | — | 16.71 / 17.41 / 18.04 | |
| Speed 12 / 15 / 18 / 21 mph | 18.8 for all | 17.76 / 17.41 / 17.15 / 16.97 | |
| Loft | n/a | n/a | not an input |

- Real entry angle on house is ≈ 1.0° (4.35° drawn).
- A straight ball reaches 1.45°–1.67° (F, Wikipedia Hook (bowling); S, MAA).
- The optimum is ~6° (S, USBC Pin Carry Study 2009 / AIP Advances 2025), and the USBC Core13 robot shots averaged ≈ 5.3° (F).

### Engine B (`engine-verify/B_matched_pairs.png`)

Same launch angle in every row; only one variable changes.

| Variable | Breakpoint ft | Hook onset ft | Roll ft | Hook 0–60 (boards) | Notes |
|---|---|---|---|---|---|
| Loft (emulated) 0 / 3 / 6 / 9 ft | 37.11 / 36.42 / 36.06 / 35.86 | 30.8 / 30.3 / 28.7 / 27.9 | 48.4 / 47.8 / 47.4 / 47.1 | 25.54 → 25.91 | Response advances (harness emulation only) |
| Grit 500 / 2000 / 4000 / polish | 36.09 / 37.11 / 37.80 / 40.02 | | 47.4 / 48.4 / 49.1 / 51.9 | 26.74 / 25.54 / 24.73 / 22.27 | |
| Cover solid / hybrid / pearl / urethane (2000) | 36.74 / 37.11 / 37.21 / 38.14 | | | 25.91 / 25.54 / 25.63 / 24.26 | Pearl ≈ hybrid |
| Oil volume ×0.7 / 1 / 1.3 | 36.23 / 37.11 / 38.07 | 30.2 / 30.8 / 31.3 | | 26.38 / 25.54 / 24.64 | |
| Oil length ×0.88 / 1 / 1.12 | 35.93 / 37.11 / 37.69 | | 46.0 / 48.4 / 51.3 | 27.41 / 25.54 / 23.58 | |
| Speed 15 / 15.5 / 17 mph | 37.11 / 37.46 / 39.58 | | | | Entry 20.04 / 18.85 / 14.91 |
| RPM 180 / 220 / 300 | | | | 22.15 / 25.54 / 30.19 | Entry angle 3.22 / 4.19 / 6.07° |
| RG 2.46 / 2.50 / 2.58 | 37.1 for all | | | 25.18 / 25.54 / 26.23 | |

## 3. Axis rotation and tilt decay, flare, breakpoint, entry (`engine-verify/B_axis_flare_phases.png`)

**Engine A** has no spin axis, so none of these exist. Breakpoint and entry come from the 2-D path.

**Engine B, reference shot**
- Axis rotation 55 → 4.1° (−93%); tilt 12 → 6.2° (−48%).
- At the roll point (48.4 ft), rotation is 5.6° and tilt 5.7°, i.e. **equal at roll**. This matches "roll when rotation = tilt" (F, bowlingball.com *Understanding Bowling Ball Motion*).
- Breakpoint: board 7.0 at 37.1 ft. Entry: board 20.04 at 4.19°.
- Speed 15.0 → 11.9 mph. Revs 220 → 471 (v/R rolling).

| Sweep | Hook 0–60 | Roll ft | Entry angle | Flare (in) | Migration | End tilt |
|---|---|---|---|---|---|---|
| Axis rotation 30 / 55 / 75 | 18.94 / 25.54 / 27.46 | 44.4 / 48.4 / 50.5 | 1.9 / 4.19 / 5.37° | | | |
| Tilt 5 / 12 / 20 | 25.78 / 25.54 / 24.88 | 48.56 / 48.38 / 48.10 | | | | 2.9 / 6.19 / 9.6 |
| Diff 0.015 / 0.035 / 0.055 | 25.14 / 25.45 / 25.52 | | | 1.45 / 2.66 / 3.71 | 19.6 / 35.8 / 50.0° | |
| Pin-axis angle α 30 / 45 / 60 / 75° | 26.76 / 26.36 / 25.54 / 24.63 | | | 2.52 / 2.91 / 3.17 / 3.87 | | |
| Int diff 0 / 0.018 / 0.040 | 25.06 / 25.54 / 26.64 | | | 5.73 / 3.17 / 4.65 (non-monotonic) | | |

## 4. Oil breakdown and carrydown (`engine-verify/B_breakdown.png`)

**Engine A** has no breakdown or carrydown: the friction table is static.

**Engine B (`oil.Lane.shot`)**
- Setup: 0–90 mixed shots on carbon, replaying the same reference throw at the same launch angle.

| Shots | Breakpoint ft | Breakpoint board | Entry board | Track oil boards 8–12 at 8 ft (units) | Carrydown at 44 ft / 50 ft (units) | μ under ball at foul line |
|---|---|---|---|---|---|---|
| 0 | 37.1 | 7.0 | 20.04 | 11.4 | 0 / 0 | 0.022 |
| 30 | 38.0 | 7.28 | 18.82 | 8.9 | 0.7 / 0.6 | 0.037 |
| 60 | 38.9 | 8.2 | 18.14 | 7.5 | 1.2 / 1.2 | 0.068 |
| 90 | 38.0 | 10.05 | 19.16 | 6.9 | 1.6 / 1.5 | 0.102 |

- Center oil at 8 ft: 19.9 → 11.4 units.
- **The "hook onset = 0 ft" at 60 and 90 shots is a metric artefact.** The metric is the first point where lateral acceleration ≥ 20% of its maximum. Once the heads are depleted (μ 0.07–0.10 at the foul line), the early lateral acceleration (0.010–0.015) exceeds 20% of the reduced peak (0.043–0.046). Use breakpoint instead.
- **Questionable direction:**
  - B sends the shot *lower* (entry 20.0 → 18.1 at 60 shots): the ball burns energy in dry heads, and carrydown delays the backend.
  - Kegel says flaring balls deplete the track until a "spark point", where the ball starts to hook more and bowlers move left (S, Kegel *oil-pattern-depletion-lofting*; F, Kegel breakdown article in research.md).
  - Head friction rising 5× in 90 shots is unverified; no head-depletion tape data was fetched.

## 5. The two behaviours under investigation

### 5a. "Fix a high miss" moves opposite to standard house-shot advice: **ENGINE LIMIT in A (not a coordinate bug)**

**Source advice:** when the ball hits high on a house shot:
- move feet 2 boards left and eyes 1 board left;
- "move your feet and target left to get the bowling ball to roll in more oil";
- increase speed to lessen hook (F, NBA *Understanding the House Shot*).

**Coordinates in A check out:** board 1 is on the right, the hook pushes toward higher boards, and positive aim is an outward launch. Moves are applied in the right direction.

**What A produces** (start lay 18, aim −2, entry 20.44, high; `engine-verify/high_miss_A_vs_B.png`):

| Move | Entry | Δ |
|---|---|---|
| 2L1L | 18.51 | −1.93, correct direction |
| Parallel 2L | 22.44 | +2.0, *higher* |
| Parallel 2R | 18.44 | −2.0 |
| Speed +0.5 mph | 20.42 | −0.02, ≈ no effect |

- Over 51 high lines, the mean Δentry was:

  | Move | Mean Δentry |
  |---|---|
  | 2L1L | −0.98 |
  | Parallel 2L | +1.94 |
  | Parallel 2R | −1.68 |
  | Speed +0.5 | −0.02 |

- **Why A does this:**
  - House friction is three flat bands (0.22 for 15 < board < 24, 0.6, 1.55 outside 8/31). The phase is scripted by distance.
  - So a parallel move is nearly a pure sideways translation: moving left just moves the whole shape left.
  - Speed changes only `revRatio`, not timing or forward motion, so it does nothing.
- 2L1L works in A only because of the angle change, not because the ball "finds more oil".
- **Engine B on carbon** (same start: lay 17, arrows 11, entry 20.4):

  | Move | Δentry |
  |---|---|
  | 2L1L | −1.91 |
  | Parallel 2L | −2.43 |
  | 2R1R | +1.41 |
  | Parallel 2R | +2.10 |
  | Speed +0.5 | −1.35 |

  Moving left/toward the miss and adding speed both lower the entry, consistent with NBA (F). The same holds from lay 19 and lay 21.
- **Verdict:** the A advice layer is consistent with real life. The A *engine* cannot reproduce the parallel-left and speed effects, because it has no oil-gradient-driven timing and no speed-dependent skid.

### 5b. Find returns "Stand 18, aim 18" (15 mph / 220 rpm RH tweener, house): **COORDINATE/LABEL BUG at HEAD, on top of an ENGINE LIMIT**

**At HEAD 42ebd3d**, the reproduced output is "Stand 18, aim 18":
- lay 11, entry 17.6, 4.6° drawn (≈ 1.1° real), breakpoint 13.1 at 37 ft, Pocket 60%.
- The arrows label uses the v1 aim (`lay − arr = −7`), but the drawn path crosses 15 ft at **board 11.70**. **The label is ~6.3 boards wrong.**

**In the working tree** (another worker, uncommitted), Find returns "Stand 17, aim 11" (Pocket 27%). The line is still:
- inward;
- breakpoint ≈ 12.5 at 37 ft;
- real entry ≈ 1°.

**Engine limit, separate from the label bug**
- NBA (F) gives a house breakpoint of 8–10 at 39–41 ft.
- A cannot produce that and still enter 17.5 with real angle. Its maximum real angle on house is ~1°, and its skid end is fixed at 18.8 ft.
- Engine B shows a strike line on carbon (42 ft) needs a breakpoint of 7–8 at 37–43 ft and 4.2° (lay 20, arrows 14.6, breakpoint 8.1 at 42.9 ft).
- Also flagged: `geom.js` REACH `arrowsBoard(11, ±8)` gives 10.20 / 11.80, only ±0.8 board.

## 6. Non-Negotiable verdicts

### Engine A (live app)

| # | Non-Negotiable | Verdict | Numbers |
|---|---|---|---|
| 1 | Coverstock dominates; core/layout modulate timing and flare | **FAIL** | Surface spread is entry 16.35–18.21 (1.9 boards) and skid 17.0–20.5 ft, vs core (RG + diff) 1.3 boards — so the *ranking* is right. But both come from scripted multipliers, core never sets flare, and there is no layout. |
| 2 | Axis rotation lost faster than tilt | **NOT MODELLED** | There is no spin axis. |
| 3a | Higher axis rotation → more hook potential | **NOT MODELLED** | — |
| 3b | Higher tilt delays roll | **NOT MODELLED** | — |
| 4 | Longer loft advances response | **NOT MODELLED** | No loft input. |
| 5 | Higher diff and pin-to-PAP → flare/migration | **NOT MODELLED** | Diff scales hook ×(0.7+12·diff) only. Entry 16.71 → 18.04 for diff 0.015 → 0.055. No flare. |
| 6 | Heavier/longer oil delays hook; roughness/absorption/loft advance it | **FAIL** | `S.oil` 0.6/1/1.5 gives an identical path. Skid end is 18.8 ft on 32–45 ft patterns. Roughness: 500 gives skid 17.0, polish 20.5 (PASS, scripted). Absorption and loft are absent. |
| 7 | Phase transitions from the friction–oil interaction after the lofted landing | **FAIL** | Phase start = `0.40−0.18·early` of lane length. Roll = 52 ft ± skid offset. Independent of oil, speed and revs. |
| — | Extra: speed physics | **FAIL** | No speed loss. Skid 18.8 ft at 12–21 mph. Speed +0.5 changes entry by 0.02 board. |
| — | Extra: entry angle | **FAIL** | Real ≈ 1° vs ~6° optimum (S) and 5.3° robot average (F). It is below a straight ball's maximum. |

### Engine B (research)

| # | Non-Negotiable | Verdict | Numbers |
|---|---|---|---|
| 1 | Coverstock dominates; core/layout modulate | **PASS (caveat)** | Hook 0–60 spread: grit/polish 4.47 boards, cover type 1.65, RG 1.05, int diff 1.58, diff 0.38. Breakpoint moves 3.9 ft with surface vs 0 ft with RG. Caveats: pearl ≈ hybrid (25.63 vs 25.54); diff barely changes hook; the Ra and cover multipliers are ASSUMED. |
| 2 | Rotation lost faster than tilt | **PASS** | Rotation −93% (55 → 4.1°) vs tilt −48% (12 → 6.2°). Equal (5.6 / 5.7°) at roll. |
| 3a | Higher axis rotation → more hook | **PASS** | 30/55/75° gives hook 18.9/25.5/27.5 boards and entry 1.9/4.2/5.4°. Roll is also later (44.4/48.4/50.5 ft): more rotation skids further (S, bowlingball.com, bowlingworld). |
| 3b | Higher tilt delays roll | **FAIL** | Tilt 5/12/20° gives roll at 48.56/48.38/48.10 ft (slightly *earlier*). Breakpoint is unchanged (37.11/37.11/37.17). Hook falls 25.78 → 24.88 (correct direction for "tilt promotes skid": S, bowlersreference). |
| 4 | Loft advances response | **NOT MODELLED** | Harness emulation only: loft 0 → 9 ft moves breakpoint 37.11 → 35.86 ft and onset 30.8 → 27.9 ft. The direction matches the prompt and O'Keefe/ITRC ("starts its motion later" relative to the foul line, shorter effective lane: F), but loft is not an engine input. BTM says the effect depends on head oil (S). |
| 5 | Higher diff / appropriate pin-to-PAP → flare | **PASS** | Diff 0.015 → 0.055: flare 1.45 → 3.71 in, migration 19.6 → 50.0°. α 30 → 75°: flare 2.52 → 3.87 in. Pin-to-PAP in inches is not an input. The "appropriate" optimum is unverified. |
| 6 | Heavier/longer oil delays; roughness/absorption/loft advance | **PASS (partial)** | Volume ×0.7 → 1.3: breakpoint 36.23 → 38.07 ft. Length ×0.88 → 1.12: breakpoint 35.93 → 37.69, roll 46.0 → 51.3 ft. Grit 500 → polish: breakpoint 36.09 → 40.02. Absorption: static order only (solid 36.74 < hybrid 37.11 < pearl 37.21), dynamic `ka` = 0. Loft: not modelled. |
| 7 | Phase transitions from the friction–oil interaction after the lofted landing | **PARTIAL** | Skid → hook → roll emerge from integrated slip friction on μ(x, board): μ 0.02 in oil → 0.17 at 43 ft, slip → 0 at 48.4 ft. But the interaction starts at the foul line, not at a lofted landing. |
| — | Extra: strength calibration | **FAIL** | On carbon 42 ft, entry 17.5 at 15/220 needs lay 20 / arrows 14.6 (breakpoint 8.1 at 42.9 ft). Lines from lay 11–18 break at boards −0.1 to 4.2 at 24–34 ft: too strong and too early. |
| — | Extra: breakdown direction | **QUESTIONABLE** | Entry drops 20.0 → 18.1 at 60 shots; head μ rises 5× (see §4). |

### 6b. Engine B v5 fixes: before/after (2026-10-24)

**Scope.**
- Code is in the `physics` repo: `engines/model6.py`, `engine5.py`, `oil.py` (clamp), `calib_oil_v5.py`, `calib_grid5.py`, `calib_absorb5.py`, `fit5.py`, `eval5.py`, `qa5.py`, `sweep5.py`, `transition5.py` and `verify/b_verify5.py`.
- v4b is kept unchanged as the regression path.
- Every v5 number below is a **model output**.
- Plots:
  - `engine-verify/engine-b-v5-strikelines.png`;
  - `engine-verify/engine-b-v5-breakdown-loft.png`.

| # | Item | v4b | v5 | Numbers (v4b → v5) | Mechanism / source |
|---|---|---|---|---|---|
| a | Tilt delays roll | FAIL | **FAIL** | Roll at tilt 5/12/20°: 48.56/48.38/48.10 → 51.97/51.80/51.60 ft. With the track term OFF: 51.97/51.80/51.60. | Added a ring-geometry track term `kp/max(cos τ,0.2)` (track circumference 2πR·cos τ, no new constant). Its effect is negligible because core migration (`kr`) dominates. Searched for measured tilt → roll pairs: none found (S-tier qualitative claims only; the USBC studies use a fixed 13°). No constant is fitted to force the ordering. |
| b | Dry/carbon strength | FAIL | **PARTIAL** | Carbon strike lines, lay 12/15/18: bp 25.9/30.2/35.0 ft → lay 11–20: 32.5–43.4 ft. Board at 42 ft: 6.2/5.4/4.7 → 4.3–8.3; the target band is 8–12 (bowl.com, S) / ~11 (Rule of 31, S). | Grid map T = s·U^p refit by CV on robot + human tables: (0.79, 1) → **(3.2, 0.25)**, chosen in 2 of 4 folds. Grid-CV: robot hook60 3.11 → **1.84** boards; human entry 1.04 → **0.96°**. `p` is at its lower bound (oil presence matters more than volume): an empirical result. The robot pattern is **constructed** (USBC core3/core4, F); its H = 20 units and 40 ft length are **ASSUMED**. The (4.0, 0.1) map had a lower train loss (8.40 vs 10.49) but a worse CV (2.33) and is a near step function, so it was rejected. Dynamics refit (`fit5`): loss 8.38 → 6.66. Analytic CV with the original map: robot hook60 2.58 → 2.19; human entry 1.12 → 1.17. |
| c | Breakdown direction | QUESTIONABLE | **PASS (bp) / PARTIAL (hook)** | Fixed aim, 0/30/60/90 shots: bp 37.1/38.0/38.9/38.0 ft (later, wrong) → **40.2/40.0/39.0/37.4 ft (earlier)**. Hook60 25.4 → 20.5–21.7 boards. Carrydown at 44–50 ft goes 0 → 1.4 units. | Deposit/carrydown refit (`calib_oil_v5`) with a physical clamp: the unclamped run gave a negative ring load (DE exploited it). Held-out reduced day: 23.35 (✗) → **25.42** vs observed 27.8 (±3 ✔). Kegel (F): flaring balls deplete equal % along the pattern and balanced balls deplete the first 16 ft. v5 heads/mid: flaring 1.25, balanced 1.39 ✔ direction. The target ratio of 1.0 is not met. Net hook falls because carrydown is stronger than head depletion. Published advice says the ball "reads earlier": the direction is reproduced, the magnitude is not. |
| d | Dynamic absorption | ka = 0 | **ka = 0 (unidentifiable)** | Scan over ka 0…1000: the reduced/reactive hook ratio reaches 0.53 → 0.61 at most, against a target of 0.904 (USBC 5-person study). The fit is unreached, and ka = 1000 is unstable. | Wired in (`dm/dt −= ka·absorb·|v|·m`), but the data cannot identify it, so it is left at **0**. The gap comes from cover friction, not absorption. |
| e | Loft = where friction starts | NOT MODELLED | **PASS (input; model-derived)** | bp at loft 0/1/3/5 ft: 40.24/40.32/40.55/40.86 ft; hook60 25.4 → 23.8. v4b's emulated time shift went the opposite way (37.11 → 36.42). | Contact begins at x = loft (airborne before it). The sign matches O'Keefe/ITRC (F: "starts its motion later") and BTM (S: depends on head oil). **No measured loft → bp data was found, so the magnitudes are model-derived.** |
| f | Pin-to-PAP inches | not an input | **PASS (input)** | 2/3.375/4.5/5.5 in: entry 5.00/4.95/4.75/4.52°; bp 40.3/40.1/40.2/40.7 ft. | α = 90·in/6.75 (MoRich Dual Angle, F). Robot 3.375 in → 45° (USBC Ball Motion Study, F). Human default 4.5 in is **ASSUMED**. |
| — | Oil volume / length | PASS | **PASS** | Volume ×0.7/1/1.3: bp 39.1/40.2/41.2 ft. Length ×0.88/1/1.12: bp 38.3/40.2/40.8 ft, roll 48.7/51.8/55.2 ft. | Sensitivity gate 8/8. |
| — | Urethane friction | refused | **refused (kept)** | QA covers: urethane hook60 24.5 vs pearl 15.6. | No fetched urethane on-lane COF, so nothing is fitted. |

**QA 10-gate scorecard (v4b 5/10 → v5 7/10).** Gates 1–5 are unchanged; gates 6 and 10 now pass.

| # | Gate | v4b | v5 |
|---|---|---|---|
| 1 | Energy (no step increase) | ✔ | ✔ |
| 2 | Step-halving (exit 17.920/17.949/17.949) | ✔ | ✔ |
| 3 | Determinism | ✔ | ✔ |
| 4 | Sensitivity 8/8 | ✔ | ✔ |
| 5 | Transition: worst 15-shot jump ≤ 5 boards | ✔ | ✔ (4.57) |
| 6 | 709-pattern sweep: bp 30–50 ft, no NaN | ✗ | **✔** (31.1–46.8 ft, 0 errors) |
| 7 | CV robot hook60 ≤ 1.5 boards | ✗ 2.58 | ✗ 1.84 (grid-CV) / 2.19 (analytic) |
| 8 | CV human entry ≤ 0.8° | ✗ 1.12 | ✗ 0.96 / 1.17 |
| 9 | Urethane weakest (below pearl) | ✗ | ✗ |
| 10 | Reduced day held-out ±3 | ✗ 23.35 | **✔** 25.42 vs 27.8 |

**Verdict: 7/10. Below the port build gate (8) and the `cc3d` gate (9).**
- The port is **plan only**: see `ENGINE_PORT_PLAN.md`.
- CV caveat: the grid-CV selects (s, p) per fold, but its dynamics come from the train-split fits. That is a mild leak, flagged here.
- Data that would unblock gates 7–9:
  - real robot oil volume/length;
  - per-case human patterns;
  - urethane COF;
  - tilt → roll and loft → bp pairs.

## 7. Ranked gaps (impact on realism)

| Rank | Gap | Engine | Impact | Fix plan | Data needed |
|---|---|---|---|---|---|
| 1 | Hook timing is scripted by lane distance, not by friction vs oil. `S.oil` cancels and pattern length never moves the skid point. | A | **Critical.** Every pattern and oil amount gives the same skid point. House-shot moves (parallel left, speed) give the wrong direction or no effect, so the advice layer fights the engine. | Replace `phase(prog)` with a friction integral over a per-board/per-foot oil grid. The simplest correct port is B's μ(x, board) grid with the slip state (`js/sim.js` already exists in physics/engines). Delete the `S.oil` cancellation. | Pattern grids are already available (709 Kegel sheets in `patterns.json`). Engine B needs a strength calibration first (gap 5). |
| 2 | No spin axis: axis rotation, tilt, flare, PAP, pin-to-PAP, int diff and absorption are absent. | A (axis/flare/PAP), B (pin-to-PAP in inches, `ka`) | **High.** Core and layout cannot modulate timing or flare. Bowler profile inputs (axis rotation, tilt) have no effect. | Adopt B's rigid-body state in the app (or a reduced 3-DOF port). In B: convert pin-to-PAP inches + PAP to α. Recover or recalibrate `ka` (`calib_absorb.py` → `engine4.json`). | User inputs: PAP (2 coords), pin-to-PAP, axis rotation/tilt (default robot 55/13 per USBC, F). Ball int diff from maker specs. Absorption times per cover (USBC 5-person study values are cited in `engine4.py`). |
| 3 | No loft in either engine. | A, B | **High** for the prompt's model. Landing point sets where friction begins; pros loft 3–4 ft (F, O'Keefe). | Add `loft_ft`: no contact (or airborne kinematics) before landing; the slip state starts at landing. Validate that the sign of the effect depends on head oil (S, BTM). | Measured loft vs breakpoint shift pairs. None fetched — **unknown**; needs robot or tracking data (e.g. Specto/LaneTrax pairs). |
| 4 | Units and geometry: A's angles are drawn-space (real ≈ 1°), REACH is ±0.8 board, Find's HEAD arrows label is wrong by ~6.3 boards, and Find lines are inward with breakpoint ≈ 12.5. | A, Find | **High** for user trust. Strike-line advice is unrealistic, and the label bug sends the bowler to the wrong arrow. | Report real angles (÷4.28) and recalibrate the strike window to real 4–6°. Fix the arrows label (the working tree already changes it; verify against the 11.70 crossing). Widen reach. | None beyond the code. Target windows from NBA (F: house breakpoint 8–10 at 39–41 ft) and the Pin Carry Study (S: 6°). |
| 5 | Strength and breakdown calibration (B too strong/early on carbon; diff barely changes hook; pearl ≈ hybrid; breakdown lowers entry; tilt does not delay roll). No speed loss in A. | B (A for speed) | **Medium–High.** B is the candidate replacement, so its biases would ship. | Refit `mu_dry`/`T0u`/`s0`/`cslip` on fresh-pattern breakpoint data. Add a tilt-dependent contact-radius/track term so tilt delays roll. Fit head-depletion on tapes. Fix the hook-onset metric (use a sustained curvature threshold). | Fresh and broken-down tapes (Kegel Turnpike tapes in hand; others **unknown**). Robot breakpoint/entry tables per cover/grit/diff (USBC Ball Motion Study appendix (F) has 18 X-vars). The tilt→roll distance pairs are **unknown** (only S-tier qualitative). |

## 8. Sources

| Tag | Source | Used for |
|---|---|---|
| F | USBC *Ball Motion Study* (`images.bowl.com/bowl/media/legacy/internap/bowl/equipandspecs/pdfs/08ballmotionstudy.pdf`, local text copy) | 18 X-variables; "top 5 factors affecting the ball path are related to coverstock"; Ra, on-lane COF, Rs, dry COF, oil absorption, low RG most significant; robot 55° rotation / 13° tilt |
| F | Storm *Bowling Ball Surface Guide* (stormbowling.com/storm-bowling-ball-surface-guide) | Surface is the #1 factor; rougher = earlier traction; higher grit = later |
| F | bowlingball.com *Understanding Bowling Ball Motion* | Rotation lost faster than tilt; roll when rotation = tilt |
| F | bowlingball.com, Bill O'Keefe (ITRC), loft article | Loft shortens the lane; pros loft 3–4 ft |
| F | National Bowling Academy *Understanding the House Shot* | 10:1, 39–41 ft; breakpoint 8–10; high → feet 2L, eyes 1L; more speed = less hook |
| F | USBC Core13 summary (in research.md) | Average entry ≈ 5.33°; COF in oil 0.036–0.046, dry 0.194–0.218 |
| F | Kegel oil-pattern breakdown article (in research.md) | Depletion and carrydown direction |
| F | Wikipedia *Hook (bowling)* | Straight-ball entry max ≈ 1.45° |
| S | bowlersreference.com *Tilt* | Tilt promotes skid, more tilt = later roll |
| S | bowlingball.com axis tilt vs rotation; bowlingworld.com *Hook Variables* | More rotation skids further, hooks harder late |
| S | BTM *LASER Adjustment*; BTM *Lofty Goals* | Loft effect depends on head oil; 2/4/6 ft loft |
| S | Kegel *oil-pattern-depletion-lofting* | Flaring balls deplete track; spark point |
| S | USBC Pin Carry Study 2009; AIP Advances 2025 doi:10.1063/5.0247761 | ~6° optimum entry |
| S | MAA bowling modelling article | Straight-ball max ≈ 1.67° |

**Assumptions and unknowns flagged**
- B's Ra-per-grit table, cover multipliers and absorption indices are ASSUMED (stated in `surface.py`/`engine4.py`).
- B's `ka` = 0 (calibration file missing).
- The test bowler's axis (55/12) is ASSUMED.
- The loft results are a harness emulation.
- No loft→breakpoint, tilt→roll or head-depletion measurements were found. These magnitudes are **unknown**, not estimated.
