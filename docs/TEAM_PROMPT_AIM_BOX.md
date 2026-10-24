# Team prompt: Aim Box (the "Baker Box" concept)

**Queue position:** after the scoring fixes, before the Armory. Relayed by the parent agent on 2026-10-24.

## Spec (as relayed)
- **The overlay.**
  - Upgrade the Targeting break box into a toggleable **Aim Box** overlay, **default OFF**, with zero render cost when off.
  - Put the toggle in a lane-view **overlays menu** (add one if needed), next to entry angle, oil pattern and feet.
  - Show it on all lane views, and register it to the lane in any video overlay if one exists.
- **Style:** semi-transparent amber/gold with a dashed outline that doesn't hide the path. Use Honey Badgers tokens, no new hex.
- **Baseline (supplied, to verify):** boards 4.5–9.5 (RH, mirrored for LH) at 42–46 ft, for a ~6° entry with 4–6° optimal.
  - **Verify** it against Mark Baker's own description and the USBC entry-angle research, citing fetched vs excerpt.
  - If they disagree, use the cited values and note it in DECISIONS.
- **Presets:** House / Sport (shorter) / Custom. Edges and distance center/depth are adjustable and saved in prefs.
- **Auto-position:** from the Rule of 31 when a pattern is loaded, labelled "starting point".
- **Feedback:** when the path goes through the box, show a green outline and a "through zone" indicator, consistent with the pocket readout and Find.
- **Tooltip:** "Optional visual target zone for the ball's breakpoint. Best used on house shots to help achieve optimal pocket entry angle."
- **Angles** are engine/drawn units, so they are labelled "° model" (ENGINE_VERIFICATION_REPORT 5b). `simulatePath` is unchanged.
- **Tests:**
  - unit: toggle off renders nothing, intersection, mirroring, persistence;
  - axe 0 serious; Lighthouse ≥95.
- **Ship:** push, live verify, log (`overnight-log.md`) and a phone screenshot.
