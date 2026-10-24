# Team prompt: Bowler Card + import results + Sessions (BC)

**Goal.** After any import or scored game, the bowler sees what happened in one plain sentence, can open every past session from Sessions, and has a "My Bowler Card" that fills itself from their own data. Every number shows its source, n and dates.

**Owner rules that bind this work:**
- One plain-language takeaway first; details behind a tap.
- Every figure must pass usability (understood at a glance, in bowling language) and applicability (changes a decision: ball, feet or target, spare approach, practice focus). League-bowler order: average, spares (single pin), first-ball average, carry, strikes.
- No style ranking; no invented thresholds. Anything not cited is labelled "app estimate".
- Measured values replace typed ones only after the user confirms, and only with n ≥ the minimum.
- No new top-level tab. Nothing new appears during active scoring.

**Scope:**
1. Import done card: "See results" → `#/session/<id>`.
2. Session view (`#/session/<id>`): one headline change, ≤2 supporting stats, one next focus; games with frame marks. Behind Details: comparison (tonight / last / your avg), strikes / single / multi / opens / leaves, LaneTrax levels and import notes, and "Which ball was this?" (ball tag through `session.edited`, so it feeds Bag Advisor).
3. Sessions tab: a "Nights" segment listing scored, imported and logged sessions (newest first).
4. Bowler Card (`#/card`): a headline, 4–6 figures with sources, a trend sparkline, and collapsed sections (coach notes, spares, release and style, consistency, accuracy, sources). An on-device PNG share. The empty state says what to import for each section.
5. Insights: remove the static v1 "Assessment" (fixed profile text, uncited ratings) and show one computed line from the card.

**Thresholds and sources** (F = fetched, S = search excerpt):

| What | Value | Source |
|---|---|---|
| Consistency levels | speed SD 0.3/1/1.5/2 mph; rpm SD 10/25/50/100; arrows 1/2/3/5 boards; conversion 90/80/65/40 % (levels 5→2; worse = level 1) | LaneTrax Levels table (F) |
| Style ranges | stroker 200–300, tweener 300–400, cranker 400+ rpm | bowling.com (S) |
| Style caveat | labels are not definitive (2010 study examples: 220/325/520 rpm) | USBC (S) |
| Speed–rev match | 17 mph ↔ 300–350 rpm balanced; ±50 rpm per mph | MOTIV (S) |
| Results minimum | 21 games | USBC Rule 319a (S) |
| Measured replaces typed | 30 shots | app estimate |
| Carry | strikes ÷ (strikes + tagged non-strike pocket hits); shown only once non-strike first balls are tagged and n ≥ 5 | app definition |
| Coach drill per leak | team rule | app estimate |

**Tests:** unit `tests/data/card.test.mjs` (anonymised LaneTrax fixture plus synthetic test sessions); e2e `card` cycle (empty → scored game → Nights → session → LaneTrax import → See results → ball tag → card → confirm measured rev → Insights → reload).
