# Brand + theming team brief (owner t144u, 2026-11-13)

Owner, verbatim: "Okay so let's look into via promoting the colors and theming and all sorts of branding ect build in."
Read as: prompt a brand and design team to explore colors, theming and branding, then build the winner into the app.
This file is the prompt. The team's output is in [BRAND_TEAM_FINDINGS.md](BRAND_TEAM_FINDINGS.md); what shipped is in DECISIONS, CHANGELOG and CUTS (v79).

## Paste-ready team prompt

> You are a five-person team making **Arsenal Pro** look and feel like one thing. Arsenal Pro is a free, offline-first bowling PWA for any bowler. It is used one-thumbed, often in a dim, loud bowling center, by casual league bowlers and by competitive multi-ball bowlers. The product name stays **Arsenal Pro**.
>
> **Roles** (each writes findings in their own words, then the team argues):
> 1. **CEO** owns the call. Wants one default look that a stranger can describe in a sentence, that nobody outside the owner has to be told about, and that costs almost nothing to run. Decides the default and what is cut.
> 2. **Brand designer** owns the idea: name, palette meaning, ball / pin / lane motifs, the app icon and splash concepts, the voice. Every motif must be drawable with plain shapes, locally, for free.
> 3. **UI + accessibility designer** owns the tokens: light and dark values for every color role, WCAG AA contrast for every text/surface pair that ships, 44 px targets, nothing added during active scoring, no new scroll on Bag, Score or Find my strike line. Computes the ratios, does not eyeball them.
> 4. **Bowling-league player** (right-handed tweener, uses a Ruby sensor, LaneTrax and LaneTalk, bowls Sunday league under bad lights) owns "does it read on a lane": glare, dim light, a glance between shots. Says what feels like a bowling app and what feels like a bank.
> 5. **Red-team reviewer** attacks every direction: trademark and look-alike risk, status colors that collide with the accent, color-only meaning, flash on load, perf and offline cost, the effect on people who already have the app installed, anything that would bite the owner later.
>
> **Do, in this order**
> 1. Audit what exists now (colors, type, icon, splash, manifest) with screenshots at 390x844, light and dark, on Bag, Lane, Score, Arsenal.
> 2. Propose **three distinct directions**. Each gets: a name idea, palette tokens (light and dark), type using system fonts only, ball / pin / lane motifs, an app icon concept, a splash concept, a voice line.
> 3. Score each direction 1-5 on impact, effort and confidence. Check WCAG AA on the real tokens. Pick a default and say why in two sentences. The other two ship as selectable themes.
> 4. Build it in: all colors as CSS custom-property tokens in one theme file; mode (Auto / Light / Dark) and the three directions as themes in Settings, 2-3 taps, remembered offline; icons, manifest colors and splash for the default; every change logged and reversible.
>
> **Hard rules**
> * Keep the name "Arsenal Pro". Do not put "Arsenal" on merch or make any trademark claim (an attorney search is pending). No Urbanek or Honey Badgers branding. No other company's marks, no paid assets, no copied logos, no look-alike of a bowling brand's logo or color pair.
> * System fonts only. No third-party fonts, scripts or images. CSP stays `script-src 'self'`. No build step. No new network requests.
> * Touch targets stay 44 px or more. Nothing is added on the Score page during active scoring. Bag, Score and Find my strike line keep fitting with no scroll.
> * `simulatePath` is unchanged. Engine equivalence stays 7500 / 0.
> * Status meaning never depends on color alone (the labels stay). No coercive gamification, no ranking of bowling styles.
> * The CSS is render-blocking and already near its budget. Consolidating colors into tokens should shrink or barely grow it. Update `tests/perf/budget.json` and `docs/PERF_BUDGET.md` honestly.
> * Existing installs must not lose anything: preferences are additive, and an old `theme` value keeps working.
>
> **Deliver**: findings doc, the build, evidence screenshots of each theme on Bag, Lane, Score and Arsenal at 390x844 (light and dark), one contact sheet comparing the themes, the new icon, and a PR. Say what is unverified.

## What counts as done
* One theme file holds every color. `rg '#[0-9a-fA-F]{6}' css/app.css` finds only print-sheet and ball-orb highlights that are white or black on purpose.
* `tests/brand/contrast.mjs` prints every pair for all 6 theme x mode combinations and exits 1 on any miss.
* Settings: Me -> Appearance -> tap a theme (Me is one tap from the tab bar: 2 taps total).
* Default theme chosen by the team, one constant to change.
* Rollback: set `DEFAULT_BRAND` back, or revert the PR; stored preferences stay valid either way.
