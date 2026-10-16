# Arsenal Pro — Interactive Bowling Ball Dossier & Motion Simulator

**CEO / Product Owner:** Grok (acting)  
**Repository:** https://github.com/majalen3/arsenal-pro-bowling  
**Status:** Sprint 1 complete — production-ready single-file interactive app  
**Target User:** 15 lb bowler, ~15 mph, ~220 RPM, house-shot + tournament play  
**Primary Benchmark:** Radical Rattler Big Bite  
**Transition Ball:** Radical Deadly Rattler

## Product Vision
An interactive digital arsenal book that lets a bowler select any ball from their bag, read a clean dossier with personalized recommendation, and then simulate top-down ball motion on a lane so they can slide release and aim until they hit the pocket.

## Team Structure (Virtual)
- **CEO / PM** — Overall direction, prioritization, user outcomes
- **Lead Developer** — Frontend, physics model, UI
- **Data Engineer** — ball specs from bowwwl.com, manufacturer data, recommendations
- **UI/UX Designer** — Dark bowling aesthetic, card layout, modal dossiers
- **Physics Specialist** — Simplified but responsive hook model (RG/Diff/cover type + rev/speed ratio + pattern friction)
- **QA Lead** — Iterative testing of path accuracy, UI, mobile-ish responsiveness
- **Content** — Personalized recommendations for 15 mph / 220 RPM style
- **DevOps** — GitHub deployment, single-file simplicity for easy hosting

## Current Deliverable (Sprint 1)
- `index.html` — Fully self-contained interactive app
- 24-ball arsenal with real product photos (where available)
- Live top-down lane canvas with house / sport / dry patterns
- Adjustable speed, rev rate, release board, aim angle
- Instant path simulation + pocket zone highlight
- Clean dossiers with specs + personalized recommendations

### How to Run
1. Open `index.html` in any modern browser (no build step required).
2. Or host the repo on GitHub Pages.
3. Images live in `ball_images/` — add the folder if not already present for full visual experience.

## Roadmap & Iterative Plan

### Sprint 1 (DONE)
- Data foundation from bowwwl.com
- Interactive simulator prototype
- Dossiers + recommendations
- Real product photos integrated
- QA: functional path, visual polish, recommendation accuracy for the target style

### Sprint 2 (Next)
- Deeper physics (axis tilt/rotation influence, more accurate early vs late read)
- Full ball_images folder committed
- Multi-ball overlay comparison
- Oil volume slider
- Saved shot presets

### Sprint 3
- Layout effects (dual-angle, VLS approximations)
- PBA / sport pattern library
- Entry angle and board-at-arrows metrics
- Export shot chart

### Sprint 4+
- User accounts / multiple arsenals
- Surface adjustment modeling
- Mobile-first responsive redesign
- Optional backend for shared arsenals

## Data Sources
- Primary: [bowwwl.com](https://www.bowwwl.com) bowling ball database
- Manufacturer descriptions and known 15 lb RG/Diff numbers
- Real product photography (public sources)

## Physics Model Notes
Approximate and educational. Hook strength is driven by:
- Ball-specific `hookFactor` and `early` bias (derived from Diff, coverstock type, RG)
- User rev/speed ratio
- Pattern-dependent friction (house shot has more oil in the middle)
- Progress down the lane (skid → hook phase)

Real results depend on surface, layout, oil volume, and lane surface. The model is designed to be responsive and useful for practice, not a scientific simulator.

## QA Process Used
- Iterative visual and functional testing during build
- Path sanity checks against expected early/late behavior
- Recommendation review for the stated bowler profile
- UI consistency pass

## License
MIT — use, modify, and share freely.

---

**Built as a complete product.** Open an issue or PR for the next sprint.
