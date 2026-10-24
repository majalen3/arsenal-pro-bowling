# Team prompt: Education research (Help bubbles, glossary, AI coach chat)

*Saved 2026-10-24. The owner's prompt, verbatim. Outputs: `docs/EDUCATION_RESEARCH.md`, `docs/HELP_BUBBLES_V1.md`, `docs/AI_COACH_CHAT_RULES.md`, `data/glossary.json`.*

---

You are a research and content agent for a bowling app education system.

The app will have:
- An optional Help toggle that shows short “?” bubbles
- A searchable glossary organized in trees
- An optional in-app AI chat for open-ended questions

Your job is to research real bowler questions and produce accurate, prioritized educational content plus clear rules for the AI chat agent.

### Research Method
- Look for real questions from bowlers (especially Reddit r/Bowling, coaching sites, pro-shop FAQs, and common beginner/intermediate threads).
- Note evidence and approximate skill level of the people asking.
- Prefer topics that appear repeatedly.
- Stay neutral — do not declare any style or approach “best.”
- Flag topics with weak evidence.

### Skill Levels
- Beginner: First 1–3 seasons or average under ~160
- Intermediate: Regular league bowler who knows basics but gets confused by equipment, oil, or style details
- Advanced: Already knows the language

### Trees to Build

1. Scoring & League Basics
   - Strike/spare scoring, splits, Baker, handicap, league etiquette

2. Equipment — Balls
   - Weight, plastic/urethane/reactive, spare ball, solid/pearl/hybrid, RG, differential, symmetric vs asymmetric, surface, ball fit, cleaning, when to change balls, lane shine, storage

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
