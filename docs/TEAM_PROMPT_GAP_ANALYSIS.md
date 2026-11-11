# Team prompt: durable arsenal, first-run search, useful assistance

Prepared 6 November 2026 (SGT). Analysis only; not permission to implement or deploy.

## Owner brief, verbatim

> Two steps here one is remember my arsenal two code the intro to select your balls through some kind of search. Also can we build in an ai chat agent or something. Doab full gap analysis review what we have in a prompt to find the best direction.

## Mandate

Act as lead product strategist for Arsenal Pro. Evaluate the real product, not the roadmap as if shipped. Recommend the smallest coherent direction that makes a bowler think “these are my balls, they are still here, and I know what to do next.” Assess whether chat improves that direction or distracts from it. Do not implement app code, merge, deploy, buy services, create live accounts, or alter live data.

Baseline the unmerged app PR #1 `now-list-and-catalog-fixes` and API PR #1 `motiv-lookup`, recording their exact SHAs. Compare them as the proposed current state, explicitly distinguish them from deployed main. Read the existing local checkouts; no clone is required. Produce a docs-only analysis branch based on the app PR branch. Publishing a branch/PR is a separate external action requiring the owner's authorization.

Resources: one owner plus AI assistance, not six staffed teams. Use the following six review lenses; do not claim six independent experts or user interviews occurred. Plan in two-week cycles. Limit implementation work in progress to two substantive items; a prototype/test may run alongside. State estimates as estimates, and flag ongoing maintenance as well as initial engineering.

## Six lenses

1. **UX researcher:** jobs, both user segments, evidence strength, time to first value, SDT (autonomy, competence, relatedness). Distinguish observed code, vendor claims, research findings and hypotheses. No invented adoption, retention, score lift or interview quotes.
2. **Onboarding designer:** current first launch versus Add a ball; reusable search, minimum required data, multi-select, resume, offline/skip, empty and failure states. Give a mobile wireframe description. Evaluate one-handed use, keyboard/screen readers and ≥44px targets.
3. **Data/catalog lead:** event log, real owned instances versus shared catalog, current bag, sources/weights, export/restore, multiple copies of a model, drill and surface history, license/terms/refresh burden. No unofficial database copying, guessed specs or official photos without permission.
4. **AI/ML engineer:** compare rules/intent helper, in-browser LLM, Render-paid-LLM proxy and hybrid. Specify useful tasks, retrieval/action contracts, real device/CSP feasibility, cost scenarios with current primary pricing, and a measurable advantage over existing buttons/glossary.
5. **Privacy/security:** automatic sync versus consent, identity boundaries, shared-phone switching, backup codes, token expiry, account recovery, provider retention, prompt injection, abuse/cost controls. Personal arsenal never becomes public catalog data by default. Never inspect credentials or mutate production to verify a hypothesis.
6. **Physics lead:** unchanged `simulatePath`; 7500 comparisons / 0 mismatches; 3-D off below 8/10 physics QA. Measured/user/maker/model/derived/unknown labels must survive every journey. Explain the model, never let an LLM calculate authoritative shot geometry or invent layout/medical advice.

## Hard constraints

- Offline-first, free core, optional accounts. No login needed to add balls or score. No new extras during active scoring.
- Static PWA, no build step, `script-src 'self'`, no third-party scripts. Self-hosting does not itself prove WASM/WebGPU compatibility. No silent CSP relaxation.
- Both casual/low-tech league bowlers and competitive/multi-ball bowlers must be served, or the unmet need explicitly flagged. Never infer skill from age, style or gear count.
- Nonjudgmental, style-neutral, SDT-supportive copy. Earned milestones only; no loss-based streaks, locked rewards, pressure loops or leaderboards.
- Native share sheet for voluntary sharing. Never auto-post. No provider calls, spend or new paid infrastructure without owner approval.
- No invented facts, specifications, citations, competitor features or quantified lift. Unknown stays unknown. Factual data access is not a blanket copyright/license clearance; respect source terms and robots rules.
- Core data stays private and separate from public catalog and opt-in team shares. “Offline-first” is not “local-only”: audit what actually transmits.

## Audit tasks and output

### A. Remember my arsenal

Trace IndexedDB/localStorage/memory, event fold, owned instances, status/Armory/Old Friends, saved bag, accounts/device sync, QR kit and drill import to file paths and relevant symbols/lines. Answer separately for reopen, another device, reinstall/eviction, restore, same model twice, new catalog ball, layout/surface changes, multiple bowlers on one phone. Verify recovery already present before proposing new storage. Treat built-in examples and Ruby aliases as unconfirmed ownership, not the owner's actual arsenal. Identify any need for an owner-confirmed list without blocking this analysis.

### B. Intro: select balls by search

Count actual catalog rows and deduped searchable entries. Audit fuzzy search, brand control, live maker lookup, manual/offline path and confirm/save. Assess reuse versus rebuild. Design “bag in 60 seconds” as a falsifiable hypothesis, not an established result. Put ball identity before optional speed/rev/PAP/style. Offer drill card as enrichment, never a mandatory or reliable handwriting-identification path. Include restore/sign-in entry for returning bowlers; never confuse all catalog balls with owned balls.

### C. Assistance

For each of four architectures report segment fit; offline/network; download/memory; exact CSP/no-build implications; quality/grounding; privacy; setup/run/maintenance cost; backend additions; owner decisions. Use current published pricing with links and explicit input/output tokens, requests/user/month, user scale and exclusions. Do not equate the owner's chat subscription with an app API entitlement. Define allowed jobs: show my packed bag, explain my saved numbers, explain an existing next-ball suggestion, prepare for league and read/explain an existing layout card. No prescribing drilling numbers, medical advice, buying recommendations, style ranking, invented missing specs or autonomous mutation.

### D. Broader gaps

Compare LaneTalk, LaneTrax, Ruby, bowwwl, Bowlero and BowlingThisMonth using primary public sources opened in this review. Vendor marketing is not independent accuracy evidence. Note which gaps to integrate/import, which to differentiate on, and which not to chase. Do not scrape their catalog into ours.

### E. Synthesis

Rank Now/Next/Later. Score Impact, Effort and Confidence 1–5, with higher Effort meaning harder. Advisory priority = Impact × Confidence / Effort; explain dependency/privacy gates that override arithmetic. Impact: 1 cosmetic, 3 repeated-task improvement, 5 core-job/data-trust improvement. Effort estimate: 1 ≤1 day; 2 2–3 days; 3 4–6 days; 4 7–10 days; 5 >10 days or significant uncertain infrastructure. Confidence: 1 conjecture, 3 code plus indirect research, 5 clear code/reproducible contract; confidence in a bug is not proof of business lift.

Give top three ≤14-day smoke tests with hypothesis, segment quotas, task, baseline, numerator/denominator, pass/stop rule, privacy/pressure guardrails and decision. Small samples are directional, not statistically powered lift estimates. Include evidence ledger, feasibility paths, trade-offs, non-goals, conflict log and owner decisions, especially spend and hosting durability.

## Deliverables and acceptance

- `docs/TEAM_PROMPT_GAP_ANALYSIS.md` (this refined prompt).
- `docs/GAP_ANALYSIS_2.md` (executed, research-backed synthesis).
- A private deliverable Page titled “Arsenal Pro gap analysis: arsenal, onboarding, AI chat” with the decisions, evidence and test plan.
- Separate “exists”, “partial”, “missing”, “proposed” and “not runtime-verified.” Never call unmerged PR work live.
- Run targeted existing offline tests and engine equivalence; report actual commands/results and scope. Do not call a mock-account test a production sync verification.
- No application/API code changes or deployment. Draft publication metadata separately if authorization to publish is absent.
