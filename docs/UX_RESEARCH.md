# Arsenal Pro 2.0 — UX research (Phase 0)

Scope: what top-rated sports/tracking and best-in-class consumer apps do, plus the canonical
guidelines, turned into lessons mapped to Arsenal Pro screens. **Only sources actually retrieved
during this run are cited** (retrieved 2026-10-23 via web search result pages or direct fetch;
"fetch" = full page read, "search" = indexed page excerpt). Ratings are as shown on those pages on that date.

## 1. Benchmarks

| App | Signal | What it does well (pattern to emulate) | What hurts (avoid) | Source |
|---|---|---|---|---|
| Strava | 4.8★ / 378K ratings, Editors' Choice, #1 Health & Fitness | 5 labelled bottom tabs (Home, Maps, Record, Groups, You) after a 2021 IA reorg "to make it easier to find features"; one accent colour on a neutral canvas; big tabular numbers; activity search + filters added to "You". | Earlier IA had features scattered across tabs. | apps.apple.com Strava listing (search); Cycling Weekly + Velo/Outside on the redesign (search); community design teardown on GitHub "awesome-ios-design-md/strava" (search) |
| 18Birdies (golf) | 4.9★ / 306K ratings | Category leader in "on-course tracking" (sport-tracking peer). | — | apps.apple.com listing (search) |
| Arccos Golf | 4.6★ / ~33K ratings | 2026 redesign moved from "what happened" to **"tells you what to do"**: a *Where to Focus* card on home, dispersion charts. | Reviewers: fonts too small, new app "busy". | golf.com review + Arccos support page (search) |
| TrackMan (golf launch monitor) | pro standard | **Data tiles**: each metric a big tile, user picks which tiles show and their order; split/table views. | — | trackman.com blog "Shot Analysis", TrackMan help center (search) |
| WHOOP | — | 2025 Home: **three glanceable dials** (Sleep, Recovery, Strain) with colour-coded state; tap a dial for detail; long-term metrics moved to their own tab. | Users lost metrics they relied on when home changed ("Where did my metrics go?"). | whoop.com The Locker + WHOOP community (search) |
| LaneTalk (bowling) | 3.8★ / 2.3K ratings | Automatic score/stat tracking valued. | Complaints: UI bugs, logouts, paywalls. Proof that bowling users reward reliability. | apps.apple.com listing (search) |
| SPECTO (bowling) | — | Gold-standard ball-motion data: launch speed/angle, breakpoint, entry angle, rev rate, 3-D shot view. | Connectivity/session-saving failures in reviews. → *local-first, never lose a save*. | spectobowling.com FAQ, App Store/Play listings (search) |
| Kegel Pattern Library | — | Pattern browse with **filters by length, volume, ratio, difficulty**, favourites, composite/3-D views. | — | kegel.net pattern-library-app, App Store (search) |
| Robinhood | Google Material case study | One dominant number + one clean chart; colour only for meaningful state; long-press scrub; deliberate confirmation for consequential actions. | — | design.google "Robinhood… Material Design", robinhood.com support "advanced charts" (search) |
| Linear | design-led SaaS | Redesign to "reduce visual noise, maintain visual alignment, increase hierarchy"; themes generated from **base, accent, contrast** in LCH so light/dark/high-contrast are consistent; Inter Display for headings. | — | linear.app/now "How we redesigned the Linear UI (part II)" (**fetch**) |
| Things 3 | Apple Design Award | Content-first "white paper" views, restrained decoration, purposeful motion, features rejected if they break coherence. | — | culturedcode.com features, TapSmart (search) |
| Duolingo | growth case studies | **Gradual engagement**: few setup questions → real value (a lesson) before any signup; progress saved locally; "Later" always allowed. ~20% DAU lift reported from delayed signup. | — | First Round Review, Appcues GoodUX, Appcues "gradual engagement" (search) |
| Apple Design Awards 2025 | winners/finalists | Interaction category honours apps whose primary action is obvious and fast (finalists incl. iA Writer, Mela). | — | apple.com newsroom, 9to5Mac (search) |

## 2. Guidelines

* **Apple HIG — Tab bars** (fetch, developer.apple.com JSON of the HIG page): use tab bars for navigation, not actions;
  keep the tab bar visible across sections; avoid overflow tabs; **don't disable or hide tabs — if a section is empty, explain why**;
  include single-word labels; preserve each section's navigation state; reserve badges for critical info;
  on wide layouts a tab bar can adapt to a sidebar.
* **Material 3 — Navigation bar** (search, m3.material.io + Android developer refs): 3–5 top-level destinations,
  active indicator + filled icon for the selected item; use rail/side navigation on larger windows; don't combine with top tabs.
* **NN/g — Basic Patterns for Mobile Navigation** (search): tab bars are persistent and best for 4–5 frequent destinations;
  labelled icons beat icon-only. NN/g on hamburger menus: hidden navigation lowers discoverability.
* **NN/g — Bottom sheets** (search) + "Accidental dismissal of overlays": use sheets for short contextual tasks; never stack sheets;
  visible Close; support Back gesture; long flows deserve a page.
* **NN/g — Empty states in complex apps** (search): never leave a panel blank — say what goes there and give one direct action to fill it;
  distinguish loading vs error vs empty.
* **BBC GEL — bottom navigation** (search): one item always selected, fixed positions, labels that make sense alone.
* **Nielsen's 10 usability heuristics** (fetch, nngroup.com/articles/ten-usability-heuristics; used as the audit rubric in UX_AUDIT.md): visibility of status, match with real world,
  user control & freedom (undo), consistency, error prevention, recognition over recall, flexibility/efficiency, aesthetic & minimalist design,
  error recovery, help.
* **Bowling adjustment convention — the "2-and-1 rule"** (search: National Bowling Academy, BOWL.com "Making in-game adjustments",
  Bowling This Month): move feet two boards and target one board **in the direction of the miss**.

## 3. Lessons learned → Arsenal Pro screens

| # | Lesson (source) | Arsenal Pro 2.0 application |
|---|---|---|
| L1 | Persistent 5-tab bottom bar, labelled, fixed order, rail on desktop (HIG, M3, NN/g, GEL, Strava) | Tabs: **Lane · Arsenal · Patterns · Sessions · More**; side rail ≥ 900 px; tab state preserved per section; deep links per screen. |
| L2 | "Tell me what to do" beats "what happened" (Arccos *Where to Focus*) | Lane readout leads with the **coach line** (Breakpoint voice, numbers first) and one-tap **miss buttons** that *apply* the move (2-and-1 rule) with Undo. |
| L3 | Big glanceable tiles with state colour (TrackMan tiles, WHOOP dials, Robinhood hero number) | Readout = 3 big tiles: **Breakpoint (board @ ft)**, **Entry angle °**, **Entry board** with green/gold/red state vs strike target 17.5 @ 4–6°, plus execution range (± speed/rev). |
| L4 | Fonts too small / busy screens get punished (Arccos reviews; audit) | Min 13 px text, 16 px body, labels on canvas drawn at fixed CSS px (not scaled with the lane); one accent (gold) for primary/active, green for success state. |
| L5 | Value first, setup optional (Duolingo gradual engagement) | Onboarding = 1 skippable sheet-style flow (hand, style, speed, revs, PAP, tilt, bag); defaults let the lane work instantly; editable later in More → Profile. |
| L6 | Filters by length/volume/ratio (Kegel app) + search (Strava You tab) | Patterns tab: search + length-class chips + sort; Arsenal and Sessions lists get search + chips too. |
| L7 | Reliability is the feature (LaneTalk, SPECTO reviews) | Local-first saves, visible sync status, offline queue retained, one-tap save (no typing), undo on delete, backup code. |
| L8 | Sheets for short tasks, pages for real flows; Back always works (NN/g, HIG) | Ball picker + Tune controls as bottom sheets with Close + Back; Ball detail, Compare, Pattern detail as routed pages. |
| L9 | Empty states explain + one action (NN/g, HIG "explain why a section is empty") | Sessions with no lines: "Save a line from the Lane — it shows up here" + **Go to Lane** button. |
| L10 | Calm, consistent theming from a few variables incl. contrast (Linear) | Tokens built from base (alley black), brand (forest #0F4D34), accent (gold #DAAF37); dark default + light theme, both AA. |
| L11 | Restrained decoration, purposeful motion (Things 3, Linear) | 150–250 ms ease-out transitions only on state change; all motion off under `prefers-reduced-motion`. |
| L12 | Confirm consequential actions deliberately (Robinhood) | Destructive actions (delete line, restore from code, reset) use confirm sheet or undo toast. |
