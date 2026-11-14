# Brand + theming: team findings (v79, owner t144u)

Prompt: [BRAND_BRIEF.md](BRAND_BRIEF.md). The five roles (CEO, brand designer, UI + accessibility designer, bowling-league player, red-team reviewer) were run as one working session; each section says whose call it was. Evidence screenshots (390x844) are in `/workspace/t144-evidence/` (`audit/` = before, `final/` = each look on Bag, Lane, Score, Arsenal, light and dark).

## 1. Audit of v78 (before)
| Area | What is there | Finding |
|---|---|---|
| Color tokens | `:root` + `[data-theme=light]` in `css/app.css`: forest `#0F4D34`, gold `#DAAF37`, black, 4 surfaces, 3 text tones, 4 shot tones. One look, light and dark. | Mostly tokenized already, but not in one theme file, and no way to pick another look. |
| Hard-coded colors | CSS: toast (4 colors), the `.sugg` light override, the print and Play sheets (`#0F4D34` / `#DAAF37`, 15 uses with the token definitions). JS: `lane.js` gold in 6 places, `deck.js` in 8, share cards (`cards.js` GREEN/GOLD), `main.js` `theme-color` two literals. | Everything that is "brand" had to change in 5 files. All moved to tokens (`--brand`, `--brand-hi`, `--lane-mark`, `--toast-*`, `--tint`). |
| Type | System stack only: `-apple-system, SF Pro Text, Segoe UI, Roboto, system-ui`. Titles 800, tabular numerals for scores. | Good and free. Kept as one shared stack (see 3). |
| App icon | `icon.svg` and the three PNGs: black circle, gold ring, the letters "AP" set in Arial on pine green. | A generic badge. The letters depend on installed fonts when rendered. Looks like a bank or a club crest, not bowling. |
| Splash | None. No launch image; Android builds one from `background_color` + icon. | `background_color #0B0F0D` against a pine-green icon tile: a visible green square on near-black. iOS shows a blank screen until first paint. |
| Manifest | `theme_color` and `background_color` both `#0B0F0D`. | Fine for the default dark look; never changes with the look. |
| Contrast | axe runs only on the default look. The new checker (282 pairs) found 9 misses in the **light** look of v78: accent as UI (2.6-3.0, needs 3), `text-3` on surface-2 (4.36), white on the gold accent (2.98), `good` on its tint (4.47). Dark was clean. | Fixed in v79 (light only, small value shifts; dark unchanged). |
| Perf | CSS 82,575 B, render-blocking, 124 precache entries. | v79 ends at 84,749 B (+2.6%) after removing 1.4 KB of dead rules. |

## 2. Three directions
Names are theme names inside the app. "Arsenal" is not used on any merch or mark (attorney search pending). None uses another company's mark, color pair or logo shape; the ball-and-pin pictogram is generic bowling iconography.

| | **A. Pine & Brass** | **B. Maple & Copper** | **C. Night Pocket** |
|---|---|---|---|
| One-line idea | Trophy-case green and brass: the app you already know, sharpened. | A wood-lane night: warm walnut, cream paper, a copper highlight. | A dim-alley night: navy glass, ice-blue highlight, pin white. |
| Dark bg / surface / text | `#0B0F0D` / `#131916` / `#EEF2EF` | `#15110D` / `#1E1913` / `#F5EFE6` | `#080D18` / `#0F1626` / `#EAF0FA` |
| Light bg / surface / text | `#F6F5F0` / `#FFFFFF` / `#111814` | `#FAF5EB` / `#FFFDF8` / `#1F160D` | `#F2F5FB` / `#FFFFFF` / `#0C1426` |
| Accent (dark / light) | brass `#DAAF37` / `#8F6A0A` | copper `#F28C45` / `#AE5A12` | ice blue `#5AA9FF` / `#2F6FD0` |
| Main button | brass (dark), pine `#0F4D34` (light) | copper (dark), ink brown `#2B1D10` (light) | ice blue (dark), navy `#14306B` (light) |
| Shot tones | green / amber / coral / sky | green / yellow / rose / sky | green / amber / coral / **violet** (so "info" is not the accent) |
| Lane | pine lane | walnut lane, both modes (phase colors stay readable on it) | blue lane, both modes |
| Type (system fonts only) | Heavy sans titles, tabular numerals (as now) | Same stack; proposal: `ui-serif` for screen titles on Apple, Georgia elsewhere | Same stack; proposal: tighter tracking, condensed look from `system-ui` 700 |
| Ball / pin / lane motifs | Brass ball, cream pin with two brass neck stripes, pine lane | Copper ball, cream pin with two copper stripes, wood grain as 1 px board lines | Ice ball, white pin with two ice stripes, a faint lane glow |
| App icon | **Built:** brass ball about to meet a cream pin on a pine tile (`tools/brand/mark.svg`) | Concept: copper ball and pin on a walnut tile | Concept: ice-blue ball and white pin on a navy tile |
| Splash | **Built:** `#0B0F0D`, the tile, "Arsenal Pro", "Free. Works offline." | Concept: walnut field, tile | Concept: navy field, tile |
| Voice | Plain and steady: "Pack these 3", "Already your best line." | Warm and short: league-night talk, no hype | Calm and exact: numbers first |

Type note: all three share one system stack in the build. Per-direction type is proposed above, not shipped, to protect the no-scroll pages (a serif title is wider) and the CSS budget.

## 3. Scores (1-5; effort 5 = cheapest) and the pick
| Direction | Impact | Effort | Confidence | Why |
|---|---|---|---|---|
| A. Pine & Brass | 3 | 5 | 5 | Existing installs keep the exact dark look they have; the icon is the biggest new brand surface and it is new. Contrast already known-good. Lowest regression risk (visual baselines barely move). |
| B. Maple & Copper | 4 | 3 | 3 | Most "bowling lane" feeling and the warmest in daylight. Copper sits near the rose/amber tones, so labels and icons must carry status (they do). Walnut lane needed its own tuning. |
| C. Night Pocket | 4 | 3 | 4 | Best for dim, glary centers: the blue lane and ice accent pop. Cool navy reads as "cosmic bowling" to some. Violet info tone avoids a collision with the accent. |

**Default: A, Pine & Brass** (CEO call). It scores highest on impact x confidence x ease (75 vs 48 and 36), it changes nothing for the people already using the app, and the new icon plus the picker give the owner the brand work without a surprise on the first launch after update. The other two ship as selectable looks. To change the default, edit `DEFAULT_BRAND` in `js/main.js` (one line).

## 4. WCAG AA contrast (all 3 looks x light and dark; `node tests/brand/contrast.mjs --md`)
Bars: 4.5 for text, 3 for UI and graphics. Every pair passes (282/282). Tints use the same color-mix percentages the CSS uses.

| pair | pine dark | pine light | maple dark | maple light | night dark | night light | bar |
|---|---|---|---|---|---|---|---|
| text on bg | 17.07 | 16.52 | 16.43 | 16.39 | 16.97 | 16.81 | 4.5 |
| text-2 on bg | 9.10 | 6.92 | 9.42 | 8.35 | 8.97 | 7.39 | 4.5 |
| text-3 on bg | 5.51 | 5.10 | 5.92 | 5.58 | 5.59 | 4.90 | 4.5 |
| accent-ink on bg | 11.42 | 5.60 | 9.36 | 6.69 | 9.95 | 7.24 | 4.5 |
| accent (UI, focus ring) on bg | 9.34 | 4.54 | 7.70 | 4.52 | 7.91 | 4.47 | 3 |
| good text on bg | 8.56 | 5.52 | 8.87 | 5.64 | 9.29 | 5.52 | 4.5 |
| warn text on bg | 9.44 | 4.97 | 11.06 | 5.32 | 10.10 | 4.96 | 4.5 |
| bad text on bg | 7.00 | 5.99 | 7.50 | 6.21 | 7.05 | 5.99 | 4.5 |
| info text on bg | 8.45 | 6.10 | 8.78 | 6.13 | 8.49 | 6.81 | 4.5 |
| text on surface | 15.77 | 18.03 | 15.26 | 17.52 | 15.77 | 18.36 | 4.5 |
| text-2 on surface | 8.41 | 7.55 | 8.75 | 8.93 | 8.34 | 8.07 | 4.5 |
| text-3 on surface | 5.09 | 5.56 | 5.50 | 5.96 | 5.20 | 5.35 | 4.5 |
| accent-ink on surface | 10.55 | 6.11 | 8.69 | 7.16 | 9.25 | 7.91 | 4.5 |
| accent (UI, focus ring) on surface | 8.63 | 4.96 | 7.16 | 4.84 | 7.35 | 4.88 | 3 |
| good text on surface | 7.91 | 6.02 | 8.24 | 6.03 | 8.63 | 6.02 | 4.5 |
| warn text on surface | 8.72 | 5.42 | 10.27 | 5.69 | 9.39 | 5.42 | 4.5 |
| bad text on surface | 6.47 | 6.54 | 6.96 | 6.63 | 6.55 | 6.54 | 4.5 |
| info text on surface | 7.80 | 6.66 | 8.15 | 6.55 | 7.90 | 7.44 | 4.5 |
| text on surface-2 | 14.39 | 15.66 | 13.89 | 15.05 | 14.19 | 15.78 | 4.5 |
| text-2 on surface-2 | 7.67 | 6.56 | 7.97 | 7.67 | 7.51 | 6.94 | 4.5 |
| text-3 on surface-2 | 4.64 | 4.83 | 5.00 | 5.12 | 4.68 | 4.59 | 4.5 |
| accent-ink on surface-2 | 9.62 | 5.31 | 7.91 | 6.14 | 8.32 | 6.80 | 4.5 |
| accent (UI, focus ring) on surface-2 | 7.87 | 4.31 | 6.51 | 4.15 | 6.62 | 4.19 | 3 |
| good text on surface-2 | 7.21 | 5.23 | 7.49 | 5.18 | 7.77 | 5.18 | 4.5 |
| warn text on surface-2 | 7.95 | 4.71 | 9.34 | 4.89 | 8.44 | 4.66 | 4.5 |
| bad text on surface-2 | 5.90 | 5.68 | 6.34 | 5.70 | 5.90 | 5.62 | 4.5 |
| info text on surface-2 | 7.12 | 5.78 | 7.42 | 5.62 | 7.10 | 6.39 | 4.5 |
| text on surface-3 | 12.58 | 14.03 | 12.13 | 13.26 | 12.14 | 14.36 | 4.5 |
| text-2 on surface-3 | 6.71 | 5.88 | 6.96 | 6.75 | 6.42 | 6.31 | 4.5 |
| on-primary on primary (main button) | 9.13 | 9.85 | 7.69 | 16.33 | 7.74 | 12.61 | 4.5 |
| on-accent on accent | 9.13 | 4.96 | 7.69 | 4.92 | 7.74 | 4.88 | 4.5 |
| accent-ink on accent-soft/surface (chip, pill) | 8.14 | 5.10 | 6.87 | 5.94 | 7.34 | 6.57 | 4.5 |
| accent-ink on accent-soft/bg | 9.08 | 4.70 | 7.54 | 5.59 | 8.12 | 6.06 | 4.5 |
| good on good-soft/surface | 6.32 | 4.99 | 6.50 | 5.00 | 6.86 | 4.99 | 4.5 |
| warn on warn-soft/surface | 6.87 | 4.54 | 7.76 | 4.75 | 7.41 | 4.54 | 4.5 |
| bad on bad-soft/surface | 5.39 | 5.27 | 5.65 | 5.34 | 5.50 | 5.27 | 4.5 |
| info on info-soft/surface | 6.23 | 5.48 | 6.44 | 5.40 | 6.32 | 6.07 | 4.5 |
| bg on bad (danger button) | 7.00 | 5.99 | 7.50 | 6.21 | 7.05 | 5.99 | 4.5 |
| toast text on toast | 12.95 | 16.43 | 12.63 | 16.23 | 12.66 | 16.73 | 4.5 |
| toast action on toast | 8.41 | 8.73 | 6.91 | 8.63 | 7.12 | 8.89 | 4.5 |
| toast text on bad toast | 11.02 | 15.03 | 10.57 | 15.17 | 11.02 | 15.03 | 4.5 |
| lane mark on lane top (canvas, graphic) | 6.08 | 4.77 | 9.03 | 7.67 | 10.61 | 10.61 | 3 |
| lane mark on lane bottom | 3.86 | 3.14 | 6.25 | 4.97 | 6.17 | 6.17 | 3 |
| brand-hi on brand (share card, print) | 4.77 | 4.77 | 6.90 | 6.90 | 6.14 | 6.14 | 4.5 |
| brand-hi on black (card band) | 10.17 | 10.17 | 10.17 | 10.17 | 10.17 | 10.17 | 4.5 |
| white on brand (print facts) | 9.85 | 9.85 | 14.25 | 14.25 | 12.68 | 12.68 | 4.5 |
| brand on white (print headings) | 9.85 | 9.85 | 14.25 | 14.25 | 12.68 | 12.68 | 4.5 |

282/282 pairs pass across 3 brands x 2 modes

## 5. Red-team findings and what was done
| Finding | Action |
|---|---|
| Brass and the amber "warn" tone are close (A, since v68). | Unchanged; status always has a word (Strike, Light, High...). Not color-only. |
| Copper accent is near the rose "bad" (B). | `bad` moved to a pink-red `#FF7A86` (dark) / `#B0203A` (light); labels carry meaning. |
| Blue accent vs the blue "info" tone (C). | `info` is violet in C. |
| Flash of the default look on load for someone who picked B or C. | **Not fixed.** The look is applied by `main.js`; an inline script is forbidden by the CSP and a blocking script file would add a request and delay first paint. Same behavior light-mode users already had. Measured locally: first paint ~100 ms. |
| Existing installs. | `brand` is a new, additive pref. No `brand` (or a bad value) means the default. `theme` keeps its values. The restore validator accepts `brand`; a bad value is refused like any other pref. |
| Light look values changed (A). | Accent `#B8901F` -> `#8F6A0A`, `text-3` `#66726B` -> `#5F6B64`, `good` `#167A4C` -> `#12714A` to pass AA. Dark unchanged. |
| Look-alike and trademark. | No clearance search was run for the new mark; the attorney search in progress covers "Arsenal" only. Nothing from `/workspace/brand*` (the Honey Badgers work) was used. The mark is a ball and a pin drawn from plain shapes. Do not put the name or mark on merch before the search. |
| Splash on iOS. | One launch image (iPhone 390x844 @3x) is linked; other sizes fall back to the OS default. Not precached (48 KB, fetched by iOS at add-to-home time). |
| Print sheet and share cards now follow the look. | Intended; they use `--brand` and `--brand-hi`, pine by default (same colors as before). |
| Cost. | +2,174 B CSS net (one extra same-origin stylesheet, precached), +1 precache entry (125 of 126), no new JS module, no external request (checked in `brand_smoke.py`). |

## 6. What shipped, what did not
Shipped: `css/theme.css`; look picker (Me > Appearance, Bag > Me > a look = 2 taps) beside Mode (Dark / Light / Auto); lane, pin deck, share cards, print sheet and `theme-color` on tokens; new mark, icons, launch image; tests (`tests/brand/*`).
Not shipped: per-direction type; icons and splash for B and C (concepts only); an iOS launch image for other devices; any change to merch or naming.
