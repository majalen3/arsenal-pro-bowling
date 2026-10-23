# Arsenal Pro 2.0 — Design system

Source of truth: `css/app.css` (`:root` tokens). Brand: Honey Badgers forest/gold/black. Dark is default; light theme via `[data-theme=light]` (More → Appearance, or system).
All text/surface pairs below meet WCAG AA (4.5:1 body, 3:1 large/UI) — verified by axe in `tests/e2e.py` on every route.

## Tokens
| Group | Tokens |
|---|---|
| Brand | `--forest #0F4D34`, `--forest-2 #17694A`, `--gold #DAAF37`, `--black #000` |
| Surfaces (dark) | `--bg #0B0F0D`, `--surface #131916`, `--surface-2 #1A221E`, `--surface-3 #232D28`, hairlines `--line`/`--line-2` |
| Text (dark) | `--text #EEF2EF`, `--text-2 #A9B5AE`, `--text-3 #7F8C85` |
| Accent | dark: gold `--accent`, ink `--accent-ink #E6C45F`; light: `--accent #B8901F`, ink `#7A5E0E`, primary = forest |
| Status (shot tone) | `--good` strike, `--warn` angle, `--info` light, `--bad` high/gutter (+ `-soft` fills) |
| Type scale | xs .75 · sm .8125 · md .9375 · lg 1.0625 · xl 1.375 · 2xl 1.75 rem · `--fs-num` 1.625 rem (tabular numerals `.num`) |
| Space | 4 · 8 · 12 · 16 · 20 · 24 · 32 px (`--s1…--s8`) |
| Radius | 10 · 14 · 20 · pill |
| Motion | `--t-fast 120ms`, `--t-med 220ms`, ease `cubic-bezier(.2,.8,.2,1)`; all motion off under `prefers-reduced-motion` |
| Touch | `--tap 44px` minimum for every interactive control; tab bar 64 px |
| Lane | `--lane-top/-bottom/-approach/-gutter/-ink` (lane + pin-deck canvases read these) |

## Components
* **App shell** — bottom tab bar on phones (Lane, Arsenal, Patterns, Sessions, More); left rail ≥ 900 px. Active tab = gold pill + `aria-current=page`.
* **Appbar** — screen title (route `h1`, focus target after navigation), optional back, trailing icon buttons.
* **Buttons** — `.btn` (primary gold / forest in light, ghost, sm, lg), `.icon-btn` (44×44 round). Every icon-only button has an `aria-label` that matches its purpose.
* **Chips** — conditions (Pattern / Surface / Oil / Tune) and filters; scrollable rows never widen the page.
* **Segmented control** (`role=radiogroup`) and **stepper** (− range +) for numeric inputs.
* **Cards** — `.card`, ball tile (orb, name, brand·year, role, RG/Diff/Cover/Reads specs, Put on lane, Compare), line card, pattern row.
* **Sheet** — bottom sheet (phone) / centred dialog (desktop); `role=dialog`, focus trapped, Esc and Back close it first.
* **Toast** — polite live region, optional action (Undo).
* **Verdict + pin deck** — tone-coloured card: call (Strike/Angle/Light/High/Gutter), coach line, true-scale deck close-up and its text readout.
* **Tiles** — Entry / Angle / Break pt with target hint and tone.
* **Compare tray** — fixed above tab bar once a ball is picked; “Compare 2” → side-by-side table.
* **Empty/error states** — always one recovery action (no dead ends).
* **Skeletons** for async lists.

## Pin deck (lane screen)
True geometry in inches: board 41.5/39 in, pin Ø 4.766 in, ball Ø 8.5 in, pins 12 in centre-to-centre (rows 10.392 in apart).
Shows: numbered pins in the real triangle; gold 1-3 pocket band (1-2 and mirrored drawing for left-handers); a gold 4–6° entry wedge into board 17.5; the ball path (tone colour, ball-width swath) up to first contact, then a dashed straight projection; orange contact dots on the head pin, pocket pin and 5 pin; readout coloured by result. The canvas has `role=img` and a full sentence `aria-label`; the same text is visible beside it.

## Voice
Coach voice from v1 is kept verbatim (engine `call`/coach strings). UI copy: short, verb-first, numbers with units, no jargon without a hint.
