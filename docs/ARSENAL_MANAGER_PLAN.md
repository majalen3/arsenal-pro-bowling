# Arsenal Manager — Plan and Direction

Status: **proposal**, 2026-10-23. Evidence: `docs/ARSENAL_MANAGER_RESEARCH.md` (F = fetched, S = search excerpt, A = assumption). No app code is changed by this document.

## 0. North star
The app tells you which balls are healthy, which need service before your next league night or tournament, what is in the bag and why, and where your coverage gaps are. It does this from:
- factual specs, each with a named source;
- your own logged history.

It does not use made-up numbers. Voice stays Breakpoint: short, numbers first.
> "Big Bite: 58 games since resurface. Brunswick-family guide is 60. Resurface + detox before Saturday."

## 1. Data model

### 1.1 Catalog ball (factual, shared, read-only to the user)
This extends the `balls[]` entries in `js/data.js`. Existing fields stay. New fields:

| Field | Type | Rule |
|---|---|---|
| `src` | `{field: {source, label:'F'|'S'|'user', date}}` | Every numeric spec carries its source. A spec with no source renders as **spec TBD** (same as `specOK()` today). |
| `usbcApproved` | ISO date or null | From the USBC Approved Ball List PDF, with the list date. |
| `mfrCondition` | `'Light'…'Heavy'` or null | From the manufacturer card only. |
| `intDiff` | number or null | Only if the manufacturer publishes it; otherwise null. |
| `factoryFinish` | string | Already in data.js as `finish`. Keep the meaning: **factory** finish. |
| `brandFamily` | `'storm'|'brunswick'|'motiv'|'hammer'|'other'` | Picks the reminder defaults (A1–A3). |

### 1.2 Owned ball (personal; one per physical ball, so two of the same model are allowed)
`ap_owned` holds an array of owned balls. Each has these fields:
- **Identity:**
  - `oid` (uuid);
  - `ballId` (catalog id, or `custom` with user-entered name);
  - `nickname`;
  - `color`.
- **Status:** `inBag | benched | proShop | retired`. A fixed set, per the Notion lesson. Retired balls stay visible under a filter.
- **Physical:**
  - `weightLb` (user);
  - `serial` (optional);
  - `purchased` (date);
  - `cover` override (for the Scout and Rack Attack cases).
- **Drilling** (array, newest first; a plug and redrill adds a new entry and keeps the old ones). Each entry has:
  - `date`, `driller`;
  - `layout {system:'VLS'|'PAL'|'2LS'|'manual', pinToPap, angle1, angle2OrBuffer, text}`;
  - `papAtDrill {value, measuredBy, date}`;
  - `grip` (inserts and slugs, free text);
  - `span`, `pitch` (free text, optional).
  - There is **no balance-hole field** (USBC bans balance holes).
- **Surface:** `currentFinish` (e.g. "2000 Abralon"; free text plus a grit picker using Storm's 180…4000 steps and Power Edge).
- **Counters** (derived, never typed): `gamesTotal`, and `gamesSince[type]` for each service type.

### 1.3 Ball event log (append-only; the single source of truth)
`ap_events` holds events of the form `{id, oid, type, date, games?, from?, to?, measure?, note, origin:'manual'|'session'|'import'}`.

Event types:
- `games` (+N) and `session` (from a Sessions screen record);
- `wipe`, `refresh` (polish or scuff), `resurface`, `detox`, `revive`;
- `redrill`, `plug`, `insertChange`, `weighCheck`;
- `statusChange`, `note`;
- `symptom` (Storm's list: lost backend, over-skid, dark oil ring, inconsistent motion; plus "sweating oil", S).

Counters are computed from the log: games since the **last event of that type** (Drivvo, F). Editing or deleting an event recomputes everything.

The existing `ap_surface` / `/api/surface-log` records `{ballId,date,finish}` migrate into `refresh` or `resurface` events. Keep the old endpoint working.

### 1.4 Reminder rules
`ap_rules` holds rules of the form `{id, scope:'brandFamily'|'oid', type, everyGames, everyDays?, leadGames, repeat:true, source}`.

**Cited defaults** (the user can edit all of them; the source is shown on every reminder):

| Family | Refresh | Mid service | Full resurface | Detox | Source |
|---|---|---|---|---|---|
| Brunswick (and Radical, A1) | 10 (shiny: re-polish; dull: scuff) | 30 | 60 | 60 | Brunswick poster F |
| Storm (and 900 Global, A2) | 20–30 → 25 | — | 60–80 → 60 | 60–80 → 60 | Storm guide F; Surface Factory S |
| Motiv | — | — | 50 | sooner if sweating (symptom-driven) | Motiv F / S |
| Hammer | — | — | 40–60 → 50 | — | Hammer blog S (marked "unverified") |
| No guidance (Columbia 300, A3) | 10 | 30 | 60 | 60 | conservative = Brunswick, labelled "no brand guidance" |
| Any urethane cover | as family | as family | as family | **off by default** | Storm guide F; USBC cover study F (urethane does not absorb) |

**Rules engine behaviour:**
- Fires on whichever comes first, games or days (days only if the user sets them; no source gives day intervals).
- Fires `leadGames` early (default 6 games, about two league nights, A).
- Shows **once per session**, then sits as a badge (no nagging).
- Can be snoozed for one league night.
- A `symptom` event raises a "consider detox" suggestion no matter what the counter says.
- A tournament date set on a bag brings due items forward so they land **before** the event (Rule 18, F).
- The app never suggests cleaning during competition. Copy: "Before the first ball for score."

### 1.5 Bags
`ap_bags` holds bags of the form `{id, name, format:'league3'|'tournament6'|'custom', eventDate?, slots:[{role, oid}]}`.

The existing `BAGS` constant (Tournament 6 and House league 3) becomes the seed.

## 2. Screens and interactivity

1. **Arsenal (existing):**
   - adds a status chip and a "due" badge to each card;
   - adds "My bag / In bag / Benched / Retired" to the existing filter chips;
   - "My bag" moves from `profile.owned` to `ap_owned`, with migration.
2. **Ball detail (existing `ball.js`):** new **Health** card at the top:
   - games total;
   - games since refresh, resurface and detox, each next to the cited target, e.g. "58 / 60 · Brunswick";
   - one next action;
   - "Log" button.
   - Below the Health card: **Timeline** (Linear/Strava style) of all events, newest first, with each event's details.
   - Then the **Drilling** card, with history and layout fields typed by system.
3. **Quick log (the most important interaction):**
   - "Log league night": pick balls used (defaults to the bag) and games (default 3), then save. This should be 2 taps from Lane or Arsenal.
   - When the Sessions screen already records shots by ball, the app offers to count games automatically (`origin:'session'`). This is opt-in, to avoid double counting (Reddit lesson: count consistently).
4. **Service sheet:**
   - choose type, finish (grit picker), date and note;
   - one tap for "Resurface + detox at pro shop", which logs both events and sets status back from `proShop` to `inBag`.
5. **Coverage and gaps** (Insights or Arsenal tab):
   - a grid with columns for oil volume (Light / Medium / Heavy, from the user's own `oil` tags and `mfrCondition`) and rows for strength and shape (cover kind × core symmetry);
   - owned in-bag balls show as filled cells; benched balls as outlined cells;
   - the user's **4 named gaps** show as dashed slots: strong sym pearl, heavy-oil control benchmark, modern urethane, high-RG angular;
   - each gap slot shows its criteria (A5, editable):
     - sym pearl = Pearl + Symmetric + `mfrCondition ≥ Medium`;
     - heavy-oil control benchmark = Solid + `mfrCondition = Heavy` + Symmetric (user to confirm);
     - modern urethane = Urethane cover + USBC approval ≥ 2020 (user to confirm);
     - high-RG angular = Pearl + RG ≥ 2.54 + diff ≥ .040;
   - each gap slot lists **catalog candidates that match the criteria**, with their source labels. These are information, not a sales pitch;
   - the RG/diff chart still includes only `specOK` balls.
6. **Bag builder:**
   - The 6-ball tournament roles are Benchmark, Strong, Strong-hybrid, Cleaner pearl, Control/transition, Spare. The 3-ball league roles are Benchmark, Cleaner pearl, Spare (from the current `BAGS`).
   - Checks, shown as warnings only (never blocking):
     - two balls in the same coverage cell;
     - a ball due for service before `eventDate`;
     - a ball not on the USBC approved list (by name match; flag "check" when unsure);
     - a ball whose status is `proShop` or `retired`.
   - Output is a "Pack list" plus "Service before {date}".

### Personalization
- nicknames, colours, statuses;
- edit reminder rules per ball;
- choose the house benchmark (currently Rattler Big Bite primary, Hy-Road secondary);
- coach lines use these settings.

### Onboarding (adds to `welcome.js`; keeps the existing owned-ball picker)
1. Confirm which balls you own. The existing picker is reused, but defaults to **none** for Arsenal Manager so it doesn't assume all 22.
2. For each owned ball, give games since last resurface: a number, or "Don't know".
   - "Don't know" sets the state to **Unknown** and gives one suggestion: "Baseline service, then we count from there".
   - The app does not guess.
3. Optionally add weight, drill date and layout. Each can be skipped, and the app shows a "Fill later" checklist.

## 3. Storage and API (local-first, no auth for core data)
- **Local:** new keys `ap_owned`, `ap_events`, `ap_rules`, `ap_bags`.
  - Same `rawGet`/`rawSet` + memory fallback as `store.js`.
  - Offline queue as today.
  - Schema version key `ap_am_v`, with a migration from `profile.owned` and `ap_surface`.
- **Server** (`arsenal-pro-api`, scoped by `X-Device-Id`, same validation, 20 kB cap and rate limits):
  - `POST/GET/DELETE /api/ball-events` (idempotent by client `id`);
  - `POST/GET /api/owned`;
  - `POST/GET /api/bags`.
  - Tables are `ball_events`, `owned_balls` and `bags`. Each has an index on `(device_id, oid)`.
- **Export/import:** CSV (one row per event) plus JSON (full), always available and free. Import is idempotent by `id`.
- **Privacy:** no public card. If sharing is added later, it is off by default (BallRoom pattern).

## 4. Seed: known arsenal (from memory and `data.js`; personal fields unknown)

| Ball | Factual specs in data.js | Verification | Personal fields |
|---|---|---|---|
| Radical Rattler Big Bite (primary benchmark) | 2.480 / .035, HK22 SHARP Hybrid, 500/1500/3000 Siaair | USBC June 2024 | weight, drill, layout, games: **unknown** |
| Storm Hy-Road (secondary benchmark) | 2.570 / .046, R2S Hybrid | USBC Oct 2008 | unknown |
| Storm Super Nova | 2.490 / .052 | USBC Aug 2022 | unknown |
| Radical Guru Supreme | 2.501 / .044 | USBC Sept 2015 | unknown |
| 900 Global Ordnance C4 | 2.490 / .041 | USBC Oct 2020 | unknown |
| Storm Hy-Road Pearl | 2.570 / .046 | **year conflict:** 2010 in data.js vs USBC May 2013 | unknown |
| Radical Deadly Rattler | 2.480 / .035 | USBC Sept 2023 | unknown |
| Hammer Raw Hammer Black | 2.540 / .038; finish missing | USBC Apr 2021 | unknown |
| Rack Attack (urethane per memory) | 2.600 / .015 | **Not on the USBC list** as Sports Tec urethane; Radical Rack Attack Pearl/Solid are reactive. **Identity must be confirmed.** | unknown |
| Storm Ice Storm (spare) | 2.550 / .040; coverName and finish missing | colorway unknown | unknown |
| Columbia 300 Scout Reactive | 2.65 / .02; cover solid or pearl unconfirmed | colorway unknown | unknown |

**How to fill unknown fields:**
1. Manufacturer spec card or web page, labelled F.
2. USBC approved list, for the approval date.
3. Pro-shop drill sheet, for layout and PAP: photograph it, then type the values in.
4. The user, for weight, games and dates.

Every filled value records who supplied it and when. Nothing is filled by estimation.

## 5. Phased roadmap

**P0. Data audit** (docs and data, no UI)
- Resolve the 6 open data questions: ownership list; Rack Attack identity; Hy-Road Pearl, Innovator, Rattler and Conspiracy Pearl years; Scout and Ice Storm colorways.
- Add `src` and `usbcApproved` fields.
- Targets:
  - 100% of numeric specs on owned balls have a source or are null;
  - 0 invented values (checked automatically).

**P1. Owned balls, event log and quick log**
- Targets:
  - "Log league night" in ≤ 2 taps and ≤ 10 s (measured with Playwright task timing);
  - events survive a refresh and offline use, and sync when back online;
  - CSV export → import round-trip keeps 100% of events;
  - migration from `profile.owned` and `ap_surface` loses 0 records.

**P2. Reminders**
- Targets:
  - rules unit tests cover whichever-first, recalc-from-last-service-of-type, lead time, snooze, once-per-session and urethane detox off;
  - every reminder shows its source label;
  - 0 reminders suggest action during competition (copy lint).

**P3. Coverage, gaps and bag builder**
- Targets:
  - the grid renders the 11 seed balls and the 4 gaps at 360 px with no overflow;
  - every bag validation rule has a test;
  - swapping a ball in a bag takes ≤ 2 taps;
  - gap candidates come only from sourced catalog rows.

**P4. Drilling and PAP history**
- Targets:
  - plug and redrill keeps prior drillings (test);
  - layout fields are validated per system;
  - the PAP shows "user-reported" until it has a measured source.

### QA gate (every phase must pass before merge)
1. Existing e2e suite (94 checks) stays green.
2. New tests are green.
3. axe: 0 serious or critical issues.
4. 360/390/768/1280 viewports: no horizontal overflow; tap targets ≥ 44 px.
5. XSS payloads in nicknames and notes render inertly.
6. Offline save works, then syncs.
7. The spec-honesty test passes.
8. Coach copy is ≤ 2 sentences and starts with a number or the ball name.

If any item fails, the phase does not ship.

## 6. Non-goals
- No "cover life %" or hook-loss curve. There is no fetched numeric source.
- No copying of BTM subscriber data.
- No accounts.
- No auto-buy or affiliate recommendations.
