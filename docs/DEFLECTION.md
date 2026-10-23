# Pin deck: ball deflection and pin action (cycle 5)

**Status: approximate model, clearly labelled in the app.** No published source we found gives
numeric ball-deflection angles or pin-by-pin trajectories we could replay. So the deck uses a simple
2-D physics model whose inputs come from published specs, and we check its outputs against the
qualitative results of USBC's high-speed-video study. `simulatePath` / `analyze()` are unchanged. The
model only runs *after* the engine's entry board and angle at the head pin.

## Sources fetched (copies in the research workspace, not in this repo)

| # | Source | What we used |
|---|---|---|
| S1 | USBC, *Equipment Specifications and Certifications Manual*, March 2026 — https://images.bowl.com/bowl/media/assets/usbc/equipment%20specs/26_231-26-march-es-manual.pdf | Tenpin: weight target **3 lb 8 oz** (min 3 lb 6 oz, max 3 lb 10 oz); coefficient of restitution target **0.670** (0.605–0.735); max diameter **4.766 in** (4½ in above base). Ball: diameter **8.500–8.595 in**, weight **≤ 16.00 lb** |
| S2 | Kickertz, UC Davis Sports Biomechanics Lab, *Simulations – Pin*, "Pin-0.2 2D frictionless circles" — https://research.engineering.ucdavis.edu/biosport/wp-content/uploads/sites/24/2014/06/Impact-mechanics.pdf | The method: ball + 10 pins as circles on a plane, impulse collisions (after Stronge, *Impact Mechanics*): `v0 = (V0 − V0')·n`, `Vf = V0 − (m v0 / M)(1+e) n`, `Vf' = V0' + (m v0 / M')(1+e) n`, `m = M M'/(M+M')`. That report's own pinfall-vs-position/angle experiment (64 runs, 0–7°) is shown only as charts, so we used none of its numbers |
| S3 | USBC, Benner, Mours & Ridenour, *Pin Carry Study*, Bowl Expo 2009 — https://images.bowl.com/bowl/media/legacy/uploadedfiles/Equipment_Specs/Information/pinCarryStudy(1).pdf | Qualitative strike types from 208 high-speed videos. **Solid pocket:** the ball takes out 1-3-5-9 and exits just left of the 9-pin spot. **Light pocket:** 3 goes into 9 and 9 into 10; the ball exits right of the 9-pin spot. **High pocket:** the head pin takes out the 5 before the ball can, and the ball goes left off the deck |
| S4 | USBC news release, "USBC begins research on bowling ball entry, exit angles", 10/15/08 (bowl.com) | Context only. Pins are "3-plus pound, 15-inch tall", and USBC filmed entry/exit at 250 fps |

## Model (js/pinsim.js)

- Top-down 2-D. The ball radius is 4.25 in and the pin radius is 2.383 in (the pin belly, S1). Pins sit on the true 12 in triangle.
- Masses: pin 3.5 lb (S1 target). **Ball 15 lb: an assumption** (the app does not know the bowler's ball weight). The S1 limit is 16 lb.
- Restitution: e = 0.670 (S1 pin COR target). **We assume the same e for ball–pin and pin–pin impacts.**
- Frictionless (S2's Pin-0.2), with no ball spin or hook on the deck, no pin tipping or flight, and no kickback, pit or gutter walls. A pin counts as **down once it is struck**.
- Speed does not matter in this model: the directions it predicts don't depend on ball speed, so no speed number is needed.
- The ball enters on the engine's entry board and angle. Fixed-step integration, 0.08 in steps.

## Check against S3 (right-hander) — tested in tests/e2e.py

| Entry board | Angle | Ball hits | Ball deflection | Exit x at 7-10 row (9 spot = +6 in) | Down | Left standing |
|---|---|---|---|---|---|---|
| 15.5 | 3° | 1-3-6 | -5.9° | 9.2 in | 8 | 4-7 |
| 15.5 | 5° | 1-3-6 | -12.3° | 8.6 in | 8 | 4-7 |
| 16.5 | 3° | 1-3 | -15.7° | 8.5 in | 9 | 5 |
| 16.5 | 5° | 1-3-5 | -21.4° | 9.3 in | 8 | 7-10 |
| 17.5 | 3° | 1-3-5 | -14.6° | 7.5 in | 10 | — |
| 17.5 | 5° | 1-3-5 | -11° | 5.6 in | 10 | — |
| 18.5 | 3° | 1-3-9 | -1.5° | -0.4 in | 9 | 7 |
| 18.5 | 5° | 1-3 | +1.1° | -1.5 in | 8 | 7-9 |
| 19.5 | 3° | 1-3 | +8.3° | -4.1 in | 7 | 4-6-7 |
| 19.5 | 5° | 1-3-8 | +0.6° | -3.8 in | 7 | 4-7-10 |

A negative deflection means toward board 1 (right). These outputs come from the model; they are **not measured data**.

- **Matches S3, qualitatively:**
  - Pocket: strike; the ball takes 1-3-5 and exits just left of the 9 spot.
  - Light: the ball exits right of the 9 spot.
  - High: the ball goes left off the deck.
- **Does not match S3:**
  - In the model the ball does not reach the 9 on a pocket hit (the 9 falls from a pin). With no hook on the deck, the ball deflects more than a real rolling ball would.
- **Not validated:**
  - The exact leaves. Real leaves depend on pin tipping, deck friction and kickbacks, none of which are modelled.

## UI

The deck draws:
- the approach line, solid, to first contact;
- the model's deflected ball path, with the straight no-deflection line kept faint and dashed for comparison;
- knocked pins as an empty ring with a × on their spot, plus their path;
- standing pins solid.

The text alternative and readout say "Model: the ball deflects N° right through the pins; leaves the …". The caption reads "Pin action: approximate 2-D model, assumed 15 lb ball, no spin. How it works →" and links here. Lefty mirroring keeps the same physics and mirrors the drawing and pin numbers.
