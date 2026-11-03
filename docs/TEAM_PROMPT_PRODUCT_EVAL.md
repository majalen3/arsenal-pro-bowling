# Team prompt: Arsenal Pro product evaluation (owner prompt [pt91u] + tightening addendum)

Saved 2026-11-02 (America/New_York). Output of the first run: `docs/PRODUCT_EVAL_1.md` and the Page "Arsenal Pro product evaluation".

## Part 1. Owner prompt

> **Provenance note.** The owner's message arrived through the parent agent. The opening of the prompt (its title, the
> scope, the 7 feature areas and the first line of the scoring block) was cut off in the copy that reached this run, so it
> is **reconstructed below from the delegated brief and marked [reconstructed]**. Everything from "- Effort (1–5)" to the
> end is the **verbatim** text. The owner should paste the exact opening over the reconstructed part if wording matters.

### [reconstructed] Updated Full Prompt

Act as a cross-functional product team evaluating Arsenal Pro, a bowling arsenal, targeting and scoring app. Evaluate
and improve these 7 feature areas with evidence:

1. Achievements: badges, challenges and unlocks (early wins, layered difficulty, time-bound challenges).
2. Trophy Room: the arsenal shown as a trophy case, including locked items with progress bars.
3. Streaks and leaderboards (streaks with recovery, small-group challenges).
4. Social sharing and community (native sharing at peak moments).
5. Physics clarity: making the ball-motion model understandable.
6. Arsenal Builder: search for a ball and add it to the arsenal.
7. Controls and navigation: step up / step down, a persistent shortcut to the Targeting line, and bottom buttons that can be hidden.

Score every recommendation on:
- Impact (1–5)

### Verbatim from here

- Effort (1–5)
- Confidence in research (1–5)
Then assign Now / Next / Later based on the scores and dependencies.

## Evaluation Process
Convene and synthesize input from these teams for every major feature area:
- Product & UX
- Psychology & Behavioral Design
- Engagement & Retention
- Community & Social
- Technical & Physics
- Data & Experimentation

Apply research anchors on early wins, layered difficulty, time-bound challenges, streaks with recovery, native sharing at peak moments, small-group challenges, meaningful unlocks, and the goal-gradient effect.

## Validation Requirement
For the top 3 highest-impact recommendations, propose a specific smoke test or experiment (prototype, survey, limited build, or metric) that can validate the core assumption in ≤2 weeks.

## Explicit Non-Goals
- Do not propose features that turn the app into a pure social network.
- Do not recommend full real-time multiplayer bowling simulation.
- Do not assume unlimited engineering resources.

## Required Output for Each Feature Area
1. Current gaps and risks.
2. Multi-team discussion summary.
3. Refined, specific recommendation.
4. Psychology & engagement rationale.
5. Success metrics.
6. Priority: Now / Next / Later + impact/effort/confidence scores.
7. Shareability and community tie-in.
8. Suggested smoke test or experiment (required for top recommendations).
9. Open questions.

## Final Deliverables
- Prioritized refined feature backlog with scores.
- Concrete starter set of badges, challenges, and unlocks.
- Social sharing guidelines.
- Physics clarity recommendations.
- Arsenal Builder search-and-add design specification.
- Instrumentation and experiment plan.
- Top 3 smoke-test proposals.

Begin the full evaluation now. Convene the teams, improve every feature with evidence, resolve trade-offs under the constraints above, flag what not to build, and produce a clear, actionable, research-backed synthesis ready for implementation and validation.

---

## Part 2. Tightening addendum (closes the owner's "Remaining Minor Gaps")

These rules apply on top of Part 1. Where they conflict with Part 1, the addendum wins and the conflict is shown to the owner.

### A. Resources and timeline
- Team: **1 owner plus AI build agents.** No hires, no agencies.
- **No paid services** unless the item is flagged `PAID` with its cost and the free alternative.
- **2-week cycle.** "Now" must fit one cycle (with review), "Next" the cycle after, and "Later" anything bigger or anything waiting on an owner decision.
- Effort scale: 1 = under half a day of agent work, 2 = 1–2 days, 3 = 3–5 days, 4 = a full cycle, 5 = more than one cycle.

### B. Catalog data and licensing (stress test)
- Give every data source a **risk level (Low / Med / High)**, with its Terms of Service **checked live and cited** (URL plus the date checked).
- Sources to check at minimum: CarryDown, the manufacturer sites (Storm/Roto Grip/900 Global, Brunswick/DV8/Radical, Hammer/Ebonite/Track/Columbia 300, Motiv), bowlingball.com, BowlingThisMonth, the USBC approved ball list, and every source the code already uses (`js/data/spec_catalog.js` ← bowlingballvideos.com; `js/data.js` links → bowwwl.com).
- Product photos are copyrighted. State whether written permission is needed, and give the no-photo fallback.
- This is not legal advice. Flag anything High for the owner before shipping it.

### C. Expected lift
- Give lift only as a **sourced range from comparable studies**, and name the study and its context (for example a field study, a lab study or vendor data).
- Otherwise write **"directional, unmeasured"**. **Never invent percentages.**

### D. Hard feasibility check against the actual code
- Read `js/` (screens, `cc/`, `data/`), `js/engine.js`, `arsenal-pro-api` (`lib/specfetch.js`, `specparse.js`, `teams.js`, `auth.js`), `docs/DECISIONS.md`, `docs/qa-reports/FINDINGS_*`, `docs/CLUTTER_AUDIT_1.md`, `docs/IA_PLAN.md`, the community playbook Page and the brand Pages.
- For each feature, say whether it **exists, partially exists or is new**, and **cite file paths**.

### E. Reconcile with the owner's standing decisions and flag conflicts explicitly
- SDT and non-evaluative, process-only feedback (M3); no coercive gamification.
- No ranking of scores or styles (#28, community). Streaks raise usage through stress and people quit after breaking one (community playbook; Silverman & Barasch 2023), so streaks and leaderboards need an **opt-in, recovery-first** design or go on the **"don't build"** list.
- Milestones shown **only when earned** (#31), versus Part 1's "locked items with progress bars". Show this conflict and let the owner decide.
- The usability/applicability test: understood in seconds, and it changes what the bowler does next. Don't drown people in data (CLUTTER_AUDIT_1).
- Nothing extra during scoring; the 5-tab IA (Tonight, Bowl, Results, Bag, Learn) plus Me; Help off by default (#32); offline-first; CSP `script-src 'self'`.
- A free core. Ruby/LaneTrax data labelled **measured** versus **model**.
- The Old Friends shelf name. The trademark caution on "Arsenal" merch.

### F. "Step up / step down"
- It probably means the **Weaker/Stronger** one-step ball ladder and the **surface** step controls. Find the real controls in code and audit them, rather than designing new ones from scratch.

### G. Required extras
- Write the six teams as written perspectives, not as imaginary data.
- Give real, findable citations (with DOIs where they exist) for self-efficacy, loss aversion, goal-gradient, social comparison, identity signaling and peak-end.
- Add an explicit **"Do not build"** list.
- Instrumentation must be privacy-respecting and local-first, with **no third-party trackers**.
- Deliver a Page titled "Arsenal Pro product evaluation" and `docs/PRODUCT_EVAL_1.md`. Don't change app code in the evaluation run.
