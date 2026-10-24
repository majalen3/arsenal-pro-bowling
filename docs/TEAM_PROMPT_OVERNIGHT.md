# Team prompt: overnight mandate (2026-10-24)

> **Summary form:** the owner's verbatim overnight text was not available to this worker. This is the parent agent's relay of it, condensed and labelled as such.

**Mode:** overnight and autonomous. Act, ship, report; don't stop to ask. Keep the queue order and apply the rules below to every item.

1. **Highest priority: a full multi-bowler league/Baker night on one phone.** That means:
   - a scoring pad within thumb reach;
   - any-frame edit and correct ball credit;
   - a Games view;
   - sessions that persist through reload and offline use and feed stats, the Bowler Card, the advisor and strike-line accuracy.
   - Target: under 3–4 s per frame.
2. **USBC accuracy.**
   - Handicap = floor((basis − avg) × pct), with selectable basis 200/210/220, pct (90% default) and a league-configurable option.
   - Handle averages and blind scores correctly.
   - Include Rule 18 in education, and cite USBC sources in the docs.
3. **Post-session recap screen.**
   - Show what changed vs. recent sessions.
   - Give informational competence feedback ("converted 4/6 10-pin leaves", never "good job").
   - Set ONE next practice focus that carries into the next session's Tonight.
4. **Aim Box.** Defaults from the Baker/USBC entry-angle research, with presets, lefty mirror and path-intersection feedback (spec: `TEAM_PROMPT_AIM_BOX.md`).
5. **Self-Determination Theory, applied explicitly.**
   - Autonomy: real choices and non-controlling copy.
   - Competence: progress plus immediate informational feedback.
   - Relatedness: team, league and USBC context.
   - Also habit loops and low cognitive load.
   - Rationale per major UX decision goes in `docs/psych-improvements.md`.
6. **After each item:** run e2e, commit only your own paths, push, confirm the live GitHub Pages site updated, and append a short entry to `docs/overnight-log.md` (what shipped, why it matters, tests).
7. Save this prompt (this file).

**Limits:** no invented layouts, medical advice or style ranking. Report after each two items, or when the queue is done, with commits and live checks.

**Queue (merged from relays):**
1. Bag Advisor ✓
2. Bowler Card + Import results view + Sessions/Games visible
3. Scoring fixes 1–4 + league/Baker + handicap + recap, plus the GAP_REVIEW_1 items:
   - (a) storage safety/install;
   - (b) real strike board for spares;
   - (c) games CSV;
   - (d) wake lock + text size;
   - (e) numbered nights / End night;
   - (f) computed or removed Insights assessment.
4. Aim Box
5. Armory
6. Education wiring (Help toggle + glossary; AI chat stays out)
7. M items: center/lane-pair memory, own/house pattern entry, spare drill mode + one optional process goal
