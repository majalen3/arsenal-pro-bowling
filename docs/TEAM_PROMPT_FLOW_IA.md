# Team prompt: Flow & IA ("make it flow and be organised")

**Owner ask (verbatim, 2026-10-24):**
> "Bag builder isn't intuitive either. Go ahead and build and run similar extensive prompts to get this thing to flow and be organized better. Deep research and lessons on app and user usage and interface"

**Earlier owner complaints, as the parent relayed them (paraphrased, not verbatim):**
- The Help "?" can't be found, and the glossary is buried.
- The app sets lefty/righty by itself. The owner wants to choose.
- "Bench / Pro shop / Exclude" are confusing.
- The bag builder isn't intuitive.
- Quick log shouldn't be on the front page.
- The aim drag won't allow stand 25 / aim 15. This is being fixed in code by another worker.

## Mission
Re-organise Arsenal Pro around **the bowler's moment**, so every screen answers one question:
- Getting ready: "What do I bring, and where do I start?"
- Bowling: "Log this ball."
- After: "How did it go, and what changes?"
- My gear: "What do I own, and where is it?"
- Learning: "What does this word mean, and how does this work?"

## Standing rules (owner)
- **Usability:** each element is understood in seconds, in bowler language.
- **Applicability:** each element changes a real decision. Any element that fails either test is a TAP (hidden behind a tap) or a CUT.
- No arbitrary caps on numbers.
- Self-Determination Theory:
  - autonomy: the bowler chooses, and defaults are visible and changeable;
  - competence: explain the why;
  - relatedness: team night, coach.
- One-handed and thumb-zone first.
  - Targets are 44–48 pt.
  - A frame takes 1–3 s.
  - **Nothing extra during active scoring.**
- Offline-first and free.
- No invented data. Neutral on bowling styles.
- Colours: Honey Badgers #0F4D34, #DAAF37 and black.
- CSP `script-src 'self'`, no build step.

## Steps (run in order; each produces a file)
0. **This prompt:** `docs/TEAM_PROMPT_FLOW_IA.md`.
1. **Research:** `docs/FLOW_IA_RESEARCH.md`.
   - Concrete lessons, each tied to a source.
   - Label every source: F = fetched page, S = search excerpt, repo = this codebase, A = team judgement.
   - No sources from memory.
2. **Audit:** `docs/IA_AUDIT_1.md`.
   - Run Playwright on the live site at 360×740 (DPR 2, touch) with **every request to `arsenal-pro-api.onrender.com` aborted**.
   - Map every screen and its scroll height.
   - Count taps and scrolls for the top-12 tasks:
     1. log a frame
     2. start league night
     3. add a bowler
     4. pick tonight's bag
     5. change ball mid-game
     6. find stand/aim
     7. look up a term
     8. see last night's recap
     9. add a ball
     10. set handedness
     11. export games
     12. fix a past frame
   - List what is duplicated, buried and confusingly named.
   - Screenshots go to `/workspace/ux-shots/<run>/` on the box, not into git.
3. **Plan:** `docs/IA_PLAN.md` plus `docs/ia-wireframes/`.
   - Tabs by moment, with the rationale.
   - Screen-by-screen keep / move / merge / cut.
   - A full bag-builder redesign:
     - outing and conditions → a suggested bag with plain reasons;
     - "why not" for every left-out ball;
     - swap and keep;
     - one ball Status feeding it.
   - A UI label glossary.
   - Where Help "?" and the Bowling Guide fit.
   - The 12 tasks re-counted.
   - Phases P1/P2/P3, each with acceptance criteria and e2e checks.
   - Respect work already in progress.
4. **Review:** five roles and the personas, written inside IA_PLAN.md.
   - Roles: Mobile UX, Bowling Domain Expert, Behavioural Psychologist, E2E QA, Product Strategist.
   - Personas: Beginner, Intermediate league, Advanced sport, Lefty, Family one-phone league night, Coach, plus the midnight/offline edge case.
   - Walk each persona through the new flows.
   - Write each disagreement and how it was resolved.
   - Name any DECISIONS.md entry the plan overrides; the owner must approve the override.

## Guard rails
- If another worker is editing `js/`, `css/` or `sw.js`, this prompt is **docs-only**.
- `git add` your own paths only, `git pull --rebase`, and never force-push.
- Don't post or send anything on the owner's behalf.
- Don't invent specs, studies or numbers. If a figure is a model estimate (e.g. KLM seconds), say so (A).

## Output to the owner (≤1 screen)
- The proposed tabs.
- The bag builder in 5–8 lines.
- The top 10 lessons with sources.
- Tap counts before → after.
- The P1 list with acceptance criteria.
- The commit hash.
