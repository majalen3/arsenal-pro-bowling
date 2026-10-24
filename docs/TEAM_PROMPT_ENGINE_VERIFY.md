# Team prompt: ball-reaction engine verification (physics and bowling domain)

This is the owner's prompt, verbatim (24 Oct 2026). `[PASTE HERE]` is filled at the end with a description of both engines as they stand. Findings: `docs/ENGINE_VERIFICATION_REPORT.md`; plots: `docs/engine-verify/`.

---

You are a specialized physics and bowling domain team. Verify that the ball reaction engine behaves like real life from the moment the ball leaves the hand until it hits the pins. Friction, oil, coverstock properties, and loft are continuous interacting elements — not separate toggles.

### Real-Life Ball Reaction Model (research-aligned)
A real shot is the continuous interaction of:

**Delivery at release**
- Ball speed
- Rev rate
- Axis rotation (side roll)
- Axis tilt (spin)
- PAP location relative to the grip
- Loft distance and trajectory (typical range ~6 inches to 3 feet). Loft determines the first-contact point on the oil pattern and therefore shifts the entire friction timeline.

**Ball properties (coverstock is dominant per USBC Ball Motion Study)**
- Surface roughness / grit (primary driver of early friction)
- On-lane and dry-lane coefficient of friction
- Oil absorption rate (porous reactive covers absorb oil; plastic does not)
- Coverstock family: plastic, urethane, solid reactive, pearl reactive, hybrid
- Core: RG, total differential, intermediate differential (asymmetric)
- Layout: pin-to-PAP distance (controls flare potential and transition timing)

**Lane and oil (dynamic interaction)**
- Oil volume, length, and distribution create a friction map that varies board-to-board and front-to-back.
- Friction is a continuous function of local oil thickness + coverstock roughness + absorption.
- Heavy oil = low friction / long skid; thinning or dry boards = rising friction / earlier hook.
- Oil breaks down and is carried down the lane across successive shots.
- Once the ball lands (after loft), friction reduces linear speed, increases rev rate, and drives axis migration.

**Resulting motion (must emerge from the interaction)**

1. Skid — after the lofted landing point, high oil / low friction, speed dominates.
2. Hook — friction rises, axis rotation converts into direction change; breakpoint forms.
3. Roll — axis rotation and tilt equalize toward end-over-end; significant hooking stops.

### Non-Negotiable Real-Life Behaviors
- Coverstock surface and friction dominate overall path (USBC finding); core and layout modulate timing and flare.
- Axis rotation is lost faster than axis tilt while hooking.
- Higher axis rotation increases hook potential; higher axis tilt delays roll transition.
- Longer loft skips more of the heavy front oil and typically advances the point where the ball begins to respond.
- Higher differential and appropriate pin-to-PAP increase flare / axis migration.
- Heavier or longer oil delays hook; higher roughness, higher absorption, or more loft advances it.
- Phase transitions must be produced by the friction–oil interaction that begins at the lofted landing point.

### Your Tasks — End-to-End Verification

1. Map every input (including loft, surface roughness, oil absorption, pin-to-PAP) and how friction is calculated after the landing point.
2. Trace multiple shots from release → lofted landing → pins. Isolate loft, coverstock friction, and oil volume in matched pairs.
3. Show axis rotation/tilt decay, flare/migration, breakpoint, and entry angle.
4. Test oil breakdown/carrydown if supported.
5. Flag anything that contradicts USBC Ball Motion Study priorities or real-life behavior. Rank gaps by impact on realism.

Current engine description, code, parameters, or observed behavior:

<!-- [PASTE HERE] — filled 2026-10-24 from the code at 42ebd3d (engine.js is unchanged in the working tree) and /workspace/physics (v4b). Measured with throwaway harnesses in /workspace/physics/verify/. -->

#### Engine A: live app engine (`js/engine.js` `simulatePath` / `analyze`, used by `js/cc/strikeline.js` Find and the `js/cc/addball.js` engine card)

**Type**
- A 2-D, screen-space kinematic path with 240 steps.
- It has no mass, no inertia, no spin vector and no velocity loss.
- `vy = −5.6 px/step` is constant, so ball speed never changes forward motion.
- The start velocity is `vx = sin(aim°)·0.85`.

**Inputs actually used**
- Speed and rev, but only through `revRatio = rev/(speed·14)`.
- Release board and aim angle.
- Ball cover string, through `getCoverMod`:

  | Cover | e | h |
  |---|---|---|
  | Solid | 0.75 | 1.15 |
  | Hybrid | 0.52 | 1.05 |
  | Pearl | 0.30 | 0.95 |
  | Urethane | 0.85 | 0.65 |
  | default | 0.5 | 1 |

- `S.finish`, through `getFinishMod`:

  | Finish | e | h |
  |---|---|---|
  | 500 | 1.25 | 1.15 |
  | 1000 | 1.12 | 1.08 |
  | 2000 | 1 | 1 |
  | 3000 | 0.88 | 0.95 |
  | polished | 0.72 | 0.88 |

- RG: `rgEarly = clamp((2.60−RG)·2.2, 0.2, 0.9)`.
- Diff: `diffHook = 0.7 + 12·diff`.
- Asymmetric core: ×1.12.
- `S.pattern` and `S.oil`.

**Friction calculation**
- The lateral "friction" `fr` is a constant per pattern:
  - **house:** 1.55 if board < 8 or > 31; 0.22 for 15 < board < 24; otherwise 0.6;
  - **cheetah** 1.6; **dry** 1.8; **shark** 0.42; **sport/scorpion** 0.58.
- `fr` is then multiplied by `S.oil`. `baseHook = hookPot·(0.55+0.45·revRatio)/S.oil`, so **`S.oil` cancels exactly**.
- The lateral force is `baseHook·fr·phase·0.36`.
- `phase` is a scripted function of lane progress: it starts at `prog > 0.40 − 0.18·early`, where `early = (0.5·cover.e + 0.35·rgEarly + 0.15·fin.e)·fin.e`.
- The force does not depend on oil volume, oil length, or distance down the pattern. A lateral damping of `vx·0.983` applies after 80% of the lane.
- `analyze` derives phases:
  - skid = the scripted phase start;
  - roll = a nominal 52 ft, shifted by (skid − 20).
- Entry board and angle are read at 60 ft.
- Angles are measured on the **drawn** lane. It is stretched sideways ×4.28 (12.97 px/ft vs 4.92 px/board), so a drawn 4.35° is 1.02° real.

**Not present**
- Loft, axis rotation, axis tilt, PAP, pin-to-PAP, intermediate diff, absorption, oil length, depletion and carrydown.
- Speed loss, and any speed effect on skid length.
- `OIL_LEN` is used only for the Rule-of-31 text.

**Observed (harness `verify/a_export.mjs`, Rattler Big Bite, lay 12, aim −4)**
- Skid end is **18.8 ft on every pattern** (house, sport, scorpion, cheetah, shark, dry) and at every speed (12–21 mph).
- `S.oil` 0.6 / 1 / 1.5 gives identical paths (entry 17.41).
- Finish moves skid end: 500 → 17.0 ft, polished → 20.5 ft.
- Cover moves skid end: solid 17.5, hybrid 18.8, pearl 20.1, urethane 17.0 ft.
- Diff 0.015 → 0.055 moves entry 16.71 → 18.04.
- RG 2.46 → 2.60 moves entry by 0.05 board.
- Real entry angle on house is ≈ 1°.

**strikeline.js / Find**
- Find searches lay and aim on Engine A for entry ≈ 17.5.
- At HEAD it returns "Stand 18, aim 18" for 15 mph / 220 rpm on house: lay 11, entry 17.6, 4.6° drawn, breakpoint 13.1 at 37 ft.
- It labels the aim as arrows board 18, but the drawn path really crosses the arrows at board 11.70, about 6.3 boards away.
- Cause: the v1 aim convention (`aim = lay − arr = −7`) is mixed with the new arrows label.
- The working tree (another worker, uncommitted) returns "Stand 17, aim 11".

**addball.js engine card**
- Runs `analyze` at factory finish with `S.oil` = 1 on the preset for the chosen length.
- Reports skid, hook and roll lengths, breakpoint, entry and angle against the benchmark.
- It inherits all of Engine A's limits: the "ft longer/earlier" wording comes only from the cover/finish/RG `early` term.

#### Engine B: 3-D research engine (`/workspace/physics`: `engines/engine4.py` → `model5.py` dynamics, `engines/oil.py` lane, `engines/surface.py` cover; params `best_v4b.npy`)

**Type**
- A 3-D rigid ball: RK4 integration, `dt` 0.004 s, quaternion orientation.
- Inertias are `k1=rg²`, `k2=(rg+intdiff)²`, `k3=(rg+diff)²`. Int diff is internally fixed at 0.4·diff; the harness overrode it to test it.
- A COM offset `delta_in` is applied.
- The contact force is slip-dependent friction. Speed, revs, axis rotation and tilt all evolve, and roll is reached when slip → 0.

**Inputs**

| Input | How it enters |
|---|---|
| speed (mph), rpm, axis rotation φ, axis tilt τ, laydown board b0, launch angle θ | Initial conditions (θ is solved for a breakpoint target if not given) |
| rg, diff | Inertias |
| α | Angle from the spin axis to the pin (low-RG) axis: a pin-to-PAP *proxy*, default 60°, not converted from inches |
| cover | Absorption index (solid 1.0 / hybrid 0.8 / pearl 0.6 / urethane 0); cover μ multiplier; pearl × `pearl_f` |
| grit/polish | Ra (μin) → `mu_mult`, `oil_handling` (Ra values ASSUMED, `surface.py`) |
| Lane | Any of 709 Kegel-library patterns, as µL per board per 0.5 ft, plus a lane-surface μ multiplier |

**Friction calculation**
- `T` = oil thickness × `oil_handling(Ra)`.
- `f = 1 − exp(−T/T0u)`.
- `μ = μ_dry·mult·(1−f) + μ_oil·f` on a 39 × 121 grid.
- The engine then applies slip dependence (`s0`, `cslip`), friction memory / ball-oil loading (`kappa`, `lam`, `kp`, `kr`), and flare regeneration of fresh cover (`gamma`).
- Absorption rate `ka` = **0**, because `engine4.json` with the calibrated value is missing. Absorption therefore acts only through the static cover index.
- `oil.Lane.shot()` depletes oil along a path:
  - pickup limited by flare;
  - absorption `kabs·absorb`;
  - re-deposit (carrydown) downlane.

**Fitted parameters (best_v4b)**

| Parameter | Value |
|---|---|
| μ_oil | 0.0179 |
| μ_dry | 0.1726 |
| T0u | 2.73 |
| s0 | 0.759 |
| cslip | 0.863 |
| pearl_f | 1.099 |
| kappa | 0.615 |
| delta_in | 0.029 |
| gamma | 4.63 |
| lam | 0.182 |
| kp | 22.2 |
| kr | 579 |

- The Ra-per-grit table, cover multipliers and absorption indices are ASSUMED or reconstructed (stated in `surface.py` and `engine4.py`).
- The v4 QA verdict was BLOCK 5/10.

**Not present**
- **Loft**: contact starts at the foul line. The harness emulated it by setting μ = 0 before a landing point.
- Pin-to-PAP in inches, and PAP as a user input.
- Dynamic absorption (`ka` = 0).

**Observed** (carbon 42 ft, hybrid 2000, 15 mph / 220 rpm, rotation 55° / tilt 12°, lay 17, θ 1.9°)

| Metric | Value |
|---|---|
| Arrows | 11.8 |
| Breakpoint | board 7.0 at 37.1 ft |
| Entry | board 20.04 at 4.19° |
| Roll | 48.4 ft (rotation 5.6° ≈ tilt 5.7° at roll) |
| Axis rotation | 55 → 4.1° |
| Axis tilt | 12 → 6.2° |
| Migration / flare | 42.7° / 3.17 in |
| Speed | 15.0 → 11.9 mph |
| rpm | 220 → 471, the rolling value v/R |

- Oil volume, oil length, grit, axis rotation and diff all move the path in the real-life direction.
- Tilt does **not** delay roll.
- On carbon the engine is too strong and early: an entry of 17.5 needs a lay of 20 for a breakpoint of 8 at 43 ft.

Treat the engine as a real bowling ball on a real lane. Loft sets where the friction–oil interaction begins. Every significant change in direction or timing after landing must be produced by that interaction. Reject “close enough” unless the mechanics are traceable from release through lofted landing to the pins.
