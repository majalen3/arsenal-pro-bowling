# Urbanek Honey Badgers — Arsenal Pro

**Fearless. Relentless. Always Hunting Strikes.**

<div align="center">

## 🎳 Launch the App

[![Launch Arsenal Pro](https://img.shields.io/badge/Launch%20App-Live%20Demo-DAAF37?style=for-the-badge&logo=github&logoColor=black)](https://majalen3.github.io/arsenal-pro-bowling/)

**[Open Live App →](https://majalen3.github.io/arsenal-pro-bowling/)**

</div>

---

**Status:** Final polish complete  
**Target:** 15 lb bowler, ~15 mph, ~220 RPM, house + tournament  
**Primary Benchmark:** Radical Rattler Big Bite  
**Transition Ball:** Radical Deadly Rattler

## Features
- Honey Badgers branding (forest green #0F4D34, gold #DAAF37, black)
- Lane simulator: pins top, board 1 right, ball hooks left to the 17.5 pocket; markers at real distances (dots 7.5 ft, arrows 15 ft, range 37 ft, Baker boards 5-8 at 42-46 ft)
- Coach-voice call under the lane (strike = entry board 16.8-18.2 and 4-6 degree entry); Rule of 31; sensitivity line
- Drag the lane (release near the foul line, aim farther up), arrow keys on the lane, or sliders
- Save Line / load in one tap, surface log, pattern notes; localStorage first, synced to the Render API (per-device code, backup/restore)
- Arsenal view: 22 balls in 11 classes, filters, sort, compare (max 3), RG-vs-diff chart, bag builder, gaps
- Installable PWA (manifest + service worker); works offline

## Repo map
- `index.html` single-file app; `sw.js`, `manifest.webmanifest`, `icon.svg`
- `docs/TEAM_PROMPT.md` team prompt; `tests/` Playwright suites (`review.py`, `test_ui.py`, `test_arsenal.py`), `sim.py` (scripted-user simulation), `run_all.sh`, `run_sim.sh`, `lighthouse.sh`
- Backend: https://github.com/majalen3/arsenal-pro-api (Render free tier: first call after idle can take ~30 s; free Postgres expires ~30 days after creation)
