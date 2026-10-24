# Team prompt: Education research (Help bubbles, glossary, AI coach chat)

*Saved 2026-10-24. Outputs: `docs/EDUCATION_RESEARCH.md`, `docs/HELP_BUBBLES_V1.md`, `docs/AI_COACH_CHAT_RULES.md`, `data/glossary.json`.*

> **Note on verbatim text.** The user asked for this prompt to be saved verbatim. Part B below is the user's exact text from "fit, cleaning, when to change balls…" to the end. **Part A is not verbatim:** the opening part of the message could not be recovered word for word, so it is a summary of what it asked for, taken from working notes. Paste the original opening over Part A if you have it.

## Part A: opening (summary, NOT verbatim)

The prompt begins "You are a research and content agent for a bowling app education system…" and asks for:
- content for an optional Help toggle with "?" bubbles, a searchable glossary organised in trees, and an optional AI chat;
- research into real bowler questions (Reddit, coaching sites, pro shops), with evidence noted and the asker's skill level;
  - Beginner: 1–3 seasons or an average under ~160;
  - Intermediate: a league bowler confused by equipment, oil or style;
  - Advanced: already knows the vocabulary;
- per topic: topic name; tree; skill level + why; evidence note; bubble text (1–2 sentences) or "Glossary only"; short glossary entry; placement; priority (High/Medium/Low).

Its tree list starts:
1. Scoring & League Basics
2. Equipment — Balls, covering weight, cover types, core/RG/differential, surface, fit, … (Part B continues mid-list).

## Part B: remainder (verbatim)

fit, cleaning, when to change balls, lane shine, storage

3. Equipment — Shoes, Approach & Accessories
   - Slide sole numbers, heels, approach differences, slide foot, starting position, shammy/towel and what people actually use, other common accessories

4. Styles & Approaches
   - One-handed (thumb), two-handed, no-thumb
   - Practical differences people ask about
   - 4-step vs 5-step (and other common step counts)
   - Common misconceptions by level

5. Lane & Oil
   - What oil does, why reaction changes during a session, dry/oily/breaking down, house vs sport shot, oil rings/flare, heads/midlane/backend

6. Ball Motion
   - Skid-Hook-Roll, speed vs revs, why the ball isn’t hooking, burning up/dying/early hook, simple axis rotation and tilt

7. Targeting & Spares
   - Aim at arrows not pins, common leaves, basic spare system idea

### Output for Each Topic
- Topic name
- Tree
- Skill level + why
- Evidence note
- Bubble text (1–2 sentences) or “Glossary only”
- Short glossary entry
- Placement (Bubble + Glossary or Glossary only)
- Priority (High / Medium / Low)

### AI Chat Agent Rules
Define:
- What the agent should answer directly
- What it should redirect to the glossary or refuse
- Tone and length rules
- Neutrality requirements (especially on style and approach)
- Example good and bad responses for:
  - “Why isn’t my ball hooking?”
  - A one-handed vs two-handed question
  - A shoe slide sole question
  - A “what ball should I buy?” question

The agent must not invent layouts, give medical advice, or claim one style is superior.

### Final Deliverables
- Full trees with the output format above
- Ranked Top 15–20 items recommended for v1 Help bubbles
- Short research summaries on styles (1H/2H/no-thumb) and approaches (4-step/5-step)
- Notes on shammy and common accessories
- List of topics that should stay out of bubbles
- Complete AI chat agent guidance

Keep language clear and non-condescending. Prioritize what actually confuses people.
