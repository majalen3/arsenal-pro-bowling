# Arsenal Pro — Interactive Bowling Ball Dossier & Motion Simulator

**Status:** All sprints complete  
**Repository:** https://github.com/majalen3/arsenal-pro-bowling  
**Target:** 15 lb bowler, ~15 mph, ~220 RPM, house + tournament  
**Primary Benchmark:** Radical Rattler Big Bite  
**Transition:** Radical Deadly Rattler

## All Sprints Executed
- Deeper responsive physics model
- Multi-ball compare mode (overlay second path)
- Oil volume, surface strength, and layout strength sliders
- Expanded patterns: House, Sport/Flat, Cheetah, Scorpion, Shark, Dry/Transition
- Metrics: entry board, board at arrows, approximate entry angle
- Local browser presets (Save / Load)
- Export current shot as PNG
- Mobile-responsive layout
- Full 24-ball dossiers with personalized recommendations
- Real product photos (place images in `ball_images/` folder)

## How to Run
Open `index.html` in any modern browser. No build required. Enable GitHub Pages for easy hosting.

## Controls
- Select ball from left (or second ball in Compare Mode)
- Adjust Speed, Rev Rate, Release Board, Aim Angle
- Tune Oil Volume, Surface Strength, Layout Strength
- Choose pattern
- Simulate, Compare, Save/Load Preset, Export Shot

## Physics Model
Educational approximation. Hook scales with ball-specific factors, rev/speed ratio, surface, layout, and inverse oil volume. Pattern friction differs (house has more oil mid-lane). Real performance still depends on actual surface, layout, and lane conditions.

## Data
Primary source: bowwwl.com database + manufacturer descriptions.

MIT license. Product complete and ready for use.
