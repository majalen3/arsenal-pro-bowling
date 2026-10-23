# Arsenal Pro: Data System (canonical schema, event log, imports, sync)

Status: **spec, not built**. Written 2026-10-23 for the owner's request: "a more refined and polished data system… I have a bowling HQ which might have some ideas."
Research only. This document changes no app code.

Source labels:
- **F** = fetched or read directly (a file in a repo, a fetched web page, or the user's PDF);
- **S** = search-result excerpt only;
- **A** = assumption or inference; verify before relying on it;
- **UNKNOWN** = not established; do not fill it in.

Related docs:
- `ARSENAL_MANAGER_PLAN.md` (owned balls, events, rules, bags): this doc **supersedes its storage details** and keeps its semantics.
- `COMMAND_CENTER_PLAN.md` and `TEAM_PROMPT_COMMAND_CENTER.md`: the Command Center is the main consumer.
- `IMPORTS_RESEARCH.md`: sources, formats, ToS.
- `TEAM_PROMPT_NEXT.md`: originally specified `ap_games`, `ap_measure` and `ap_import_presets`; they are folded in here.
- Build prompt: `TEAM_PROMPT_DATA_AND_COMMAND_CENTER.md`.

---

## 0. Why: what is wrong with today's data layer (F, `js/store.js`, `arsenal-pro-api/server.js` @ c59bad6)

| # | Problem | Evidence (F) | Consequence |
|---|---|---|---|
| G1 | **Silent history loss** | `shots.slice(-300)`, `surface.slice(-200)`, `notes.slice(-100)` | Usage counters and the ball event log are wrong after a season. |
| G2 | **Backup is incomplete and one-way** | `backupBlob()` exports lines, surfaceLog and patternNotes only. No shots, profile, prefs or `ap_state`. There is no restore-from-file path; "Restore from another device" means `useCode` (device code) only. | A phone loss loses the shot log and the profile. |
| G3 | **No provenance on numbers** | `line.speed`/`rev` are bare numbers. `profile` has no source. | It is impossible to tell a Ruby reading from a guess, which is required by the Command Center "show your inputs" rule. |
| G4 | **Pattern notes have no date or id**; dedupe is by value | `syncAlley` dedupes on `lane+oil+adjustment` | The same note on two nights collapses into one. Notes cannot be edited or deleted. |
| G5 | **Server and client caps disagree** | API `GET /api/pattern-notes … LIMIT 50` vs local 100; server quota 300 lines / 500 surface / 200 notes vs local 200 surface | Notes 51–100 never come back on a new device. |
| G6 | **Ad-hoc schema, no version** | Keys `ap_*` with shapes implied by code; `lsGet` filters non-objects silently | A future shape change has no migration path. |
| G7 | **No import record** | — | No dedupe, undo or "where did this number come from". |
| G8 | **Speed has no measurement point** | `line.speed` | LaneTrax reports launch, average and impact speed (F, PDF). Ruby/Specto/LaneTalk differ. Mixing them silently corrupts the engine inputs. |

---

## 1. Principles

1. **Offline-first, phone is the source of truth.** Every write lands locally first and works with no network.
2. **No auth for core data.** Identity stays the anonymous device code (`X-Device-Id`, 8–64 `[A-Za-z0-9_-]`, F server.js). `useCode` stays the cross-device path.
3. **Append-only event log.** State is a projection of events. Edits and deletes are new events (`*.edited`, `*.voided`). Nothing is silently truncated.
4. **Every number carries provenance** (§3). The UI can always answer "where's that from?".
5. **No invented data.** Unknown means `null` plus a reason, never a default that looks measured. Model outputs are labelled `model`.
6. **Plain JS, no build, CSP `script-src 'self'`.**
   - Data modules are DOM-free ES modules, so `node --test` can import them; Node 20 is on the box (F).
   - `store.js` cannot be imported by Node today (it reads `location` at import, F). The new modules must not.
7. **Engine untouched.**
   - `simulatePath` and `tests/engine_equivalence.mjs` stay at 0 mismatches.
   - The data layer feeds the engine the same parameter shapes it gets today.
8. **Free app, Render free tier.**
   - Request bodies ≤ 20 kB (`express.json({limit:'20kb'})`, F), so sync must batch.

---

## 2. Canonical schema (v1)

**Conventions**
- `id` is a uuid (`crypto.randomUUID()`, with the existing fallback in `deviceId()`).
- `ts` is epoch ms. `date` is `YYYY-MM-DD` in local time.
- Units are explicit: mph, rpm, ft, boards, degrees, inches, oz, lb, mL, s.
  - **Boards** count from the bowler's own gutter side (A, matches LaneTrax "17.5 for right-handers", F docs). Store `hand` alongside, so left-handed data is not mirrored silently.
- Every measured or quoted number is a **Value**: `{v, unit, prov}` (§3).
  - Inside high-volume records (shots), use the compact form: plain numbers plus one record-level `prov`.
- `schemaV: 1` sits on every persisted record.

### 2.1 Entities

| Entity | Key fields | Notes / credit |
|---|---|---|
| **bowler** (one per device) | `hand:'R'|'L'`, `style:'1H'|'2H'|null`, `thumb:'in'|'out'|null`, `pap {over, up, unit:'in', prov}`, `tilt`, `rotation`, `lane side` from `hand` | Fields from `bowling-app-/data/arsenal_profile.json` `bowler_profile` (F). Per-value confidence from Bowling-HQ `docs/MEASUREMENT_STANDARDS.md` ("manually entered … confidence", F). |
| **releaseMeasurement** | `{id, date, sessionId?, source, device, n, metric:'speed'|'rev'|'tilt'|'rotation'|'pap'|…, stat:'mean'|'median'|'range'|'sd'|'single', at:'release'|'launch'|'average'|'impact'|'unknown' (speed only), v, unit, prov}` | One row per number. Speed **must** carry `at` (G8). Credit: `bowling-app-` `ball_speed_measurement:"release"` (F). The "current" profile value is a projection: latest of the highest-trust source the user selected. It never overwrites history. |
| **ballSpec** (catalog, read-only) | `ballId`, `brand`, `model`, `rawName` (as the manufacturer prints it), `coverFamily` (normalised), `coverName`, `coreName`, `coreType`, `factoryFinish {grit, method, raw}`, `rg`, `diff`, `massBias`, `weightLb` (spec weight; 15 lb default), `released`, `status:'active'|'discontinued'|null`, `sources:[{name, url, fieldsUsed[], lastVerified}]` | Today `js/data.js`. Normalised plus raw names: Bowling-HQ MEASUREMENT_STANDARDS (F). `sources[].fields_used` + `last_verified`: `bowling-app-/data/ball_catalog.json` (F). |
| **ownedBall** | `oid`, `ballId|custom`, `nickname`, `color`, `status:'inBag'|'benched'|'proShop'|'retired'`, `weightLb`, `serial?`, `purchased?`, `coverOverride?`, `layouts[]`, `currentFinish` (projection of surface events) | As `ARSENAL_MANAGER_PLAN.md` §1.2. Factory vs current grit both kept (Bowling-HQ MEASUREMENT_STANDARDS, F). |
| **layout** | `{id, oid, date, driller, system:'VLS'|'PAL'|'2LS'|'manual', pinToPap, angle1, angle2OrBuffer, text, papAtDrill:Value}` | AM plan §1.2. A redrill is a new layout plus a `plug` event. |
| **surfaceEvent / maintenanceEvent** | `{id, oid, type:'wipe'|'refresh'|'resurface'|'detox'|'revive'|'plug'|'redrill'|'insertChange'|'weighCheck', date, from?, to?, note}` | AM plan §1.3. Resurfacing history: Bowling-HQ `docs/DATA_NEEDS_FUTURE.md` (F). |
| **center** | `{id, name, city?, laneSurface:'wood'|'synthetic'|'unknown', surfaceBrand?, pairs?:[{lanes:'11-12', note}]}` | `laneSurface` per center: Bowling-HQ `postgres.sql bowling_centers.lane_surface` and `DATA_NEEDS_PHASE_1.md` (F). No ratings or "difficulty" scores (HQ's are unsourced). |
| **pattern** | `{id, name, source:'kegel'|'pba'|'usbc'|'center'|'manual', lengthFt, volumeMl?, ratio?, asym?, revisionDate?, url?, prov}` | Today `js/patdata.js` and `patterns.js`. "Pattern source + revision date": Bowling-HQ MEASUREMENT_STANDARDS (F). Ranges in §5. |
| **session** | `{id, date, type:'league'|'tournament'|'practice'|'casual', centerId?, lanes?, patternId?, patternGuess?:bool, bagId?, note}` | `session_type` values: Bowling-HQ `docs/07_SESSIONS.md` (F). |
| **game** | `{id, sessionId, n (1-based, unique per session), frames[10], score, ballByFrame?:{1..10: oid}, source}` | `UNIQUE(session_id, game_number)`: HQ postgres.sql (F). Per-game equipment: HQ 07_SESSIONS (F). |
| **frame** | `{n:1..10, throws:[pinsDown…], marks:'X'|'/'|null, leave?:pinMask}` | Scoring incl. 10th frame: port the **algorithm** of HQ `services/games.py` `parse_throws_to_frames`/`_score_game` (F), **plus** the validation HQ misses (frame pins ≤ 10, §5). |
| **shot** | `{id, sessionId, gameId?, frame?, ball:1|2|3, oid?, ts, laneN?, leave?:pinMask (10-bit), result:'strike'|'spare'|'open'|'leave'|'split'|null, miss?:'high'|'light'|'flush'|'early'|'late'|…, metrics?:{launchSpeed, averageSpeed, impactSpeed, rev, foulLine, arrows, breakpointBoard, breakpointDistance, entryBoard, launchAngle, impactAngle, hookBoards, speedLoss, shotTime}, prov}` | Metric names = LaneTrax tile names (F docs, see §6.2). Result classes flush/light/high: HQ `DATA_NEEDS_PHASE_1.md` (F). Today's `ap_shots {t, ballId, pattern, miss, before, after}` migrates here (§4). |
| **leave** | 10-bit pin mask (bit 0 = pin 1). Helpers `isSplit(mask)`, `label(mask)` ("7-10") | Pure function. Split rules need a cited source (UNKNOWN which; USBC rule book to be fetched). Until then the app shows only the pin list. |
| **sessionAggregate** | `{id, sessionId, source:'lanetrax-pdf'|…, n, metrics:{key:{mean, range, unit, n?}}, kpis[], outcomes{}, warnings[]}` | What a LaneTrax PDF actually provides (§6). It is **not** shots. |
| **line** (saved line) | today's `{ballId, name, release, aim, speed, rev, oil, finish, pattern, note}` + `oid?`, `prov` | Kept for API compatibility (§4.2). |
| **bag** | `{id, name, format:'league3'|'tournament6'|'custom', eventDate?, slots:[{role, oid, rationale?}]}` | AM plan §1.5. `slot_order` + `rationale`: HQ `tournament_bag_lineups` (F). Slot taxonomy with desired counts: `bowling-app-` `arsenal_slots` (F). |
| **recommendation** (Command Center output, stored for review) | `{id, ts, engineV, inputs:{…ids and Values}, pick:{oid, line}, alternatives:[…], confidence:'known'|'likely'|'low'|'unknown', trace:[…]}` | "Every prediction includes engine version + inputs": HQ `DATA_VALIDATION_RULES.md` (F). Confidence vocabulary: `bowling-app-/scoring/confidence.py` (F; vocabulary only, not its thresholds). Why-trace: `bowling-app-/scoring/decision_trace.py` (F). Enables actual-vs-predicted (HQ DATA_NEEDS_FUTURE, F). |
| **import** | `{id, ts, kind:'csv'|'lanetrax-pdf'|'ruby-csv'|'backup', fileName, size, sha256, preset?, mapping?, rowsIn, rowsAccepted, rowsRejected, warnings[], eventIds[], reverted?:bool}` | Provenance root for every imported Value. |

### 2.2 Provenance (§3 detail) is required on: every Value, release measurements, ball specs, pattern specs, imported shots and aggregates, and recommendations.

---

## 3. Provenance labels

`prov = {kind, ref?, device?, n?, method?, importId?, confidence?}`

| `kind` | Meaning | UI chip | Example |
|---|---|---|---|
| `manufacturer` | Printed by the ball/pattern maker | "Storm spec" | RG 2.48 from storm.net |
| `usbc` | From USBC (approved list, rule book, research) | "USBC" | spec limits |
| `catalog` | Third-party database, not the maker | "catalog" | today's `ball_specs.csv` lineage |
| `device` | Measured by a device; `device` + `n` required | "LaneTrax · n=51" | session avg launch speed |
| `user` | Typed by the bowler or pro shop; `confidence:'high'|'med'|'low'` optional | "you" | PAP from pro shop card |
| `model` | Computed by our engine; `ref` = engine version | "estimate" | breakpoint prediction |
| `derived` | Arithmetic over other Values; `ref` = input ids | "calc" | games since resurface |

**Rules**
- A `model` or `derived` value is never shown with more precision than its inputs.
- A `device` value without `n` is displayed as "n unknown".
- The chip is ≤ 1 word plus the number, and stays under the coach-voice limit.

---

## 4. Storage, event log and migrations

### 4.1 Storage

- **Backend for the new data:** IndexedDB database `arsenal-pro`, version 1.
- **Fallback:** today's `localStorage` / memory shim (`rawGet`/`rawSet`, F). It is only used when IndexedDB is unavailable.
  - This fallback is an assumption (A). Its quota behaviour is UNKNOWN per browser; QA must test iOS Safari private mode.
- **Why move off localStorage:**
  - A 90-shot LaneTrax-sized session is about 30 kB of events (A, estimate).
  - A season of this exceeds what localStorage comfortably holds.
  - IndexedDB needs no library and works under `script-src 'self'`.

**Object stores**

| Store | Key | Indexes |
|---|---|---|
| `events` | `id` | `seq` (local monotonic), `entity`, `ts`, `synced` |
| `snap` | `entity` | — |
| `imports` | `id` | `sha256` |
| `meta` | key | — |

- `snap` holds the projected current state, rebuilt from `events` on version bump or corruption.
- `meta` holds `schemaV`, `migratedFrom`, `lastSyncCursor` and `deviceId`.

**Small, hot keys stay in localStorage for synchronous boot:**
- `ap_state`, `ap_prefs`, `ap_device`, `ap_nav`;
- `ap_snap_profile`, a mirror of the bowler projection.

### 4.2 Event envelope (append-only)

```
{ id, seq, ts, deviceId, schemaV:1, type:'<entity>.<verb>', entity, entityId, data:{…}, prov?, importId?, synced:false }
```

- **Verbs:** `created | edited | voided | statusChanged | logged`, plus domain verbs such as `ball.resurfaced`.
- **Undo:** `voided` points at an event id. Projections skip voided events.
- **Import undo** = void all `eventIds` of the import. It is one action, and nothing is deleted.
- **Conflicts:** events are immutable, so conflicts can only be in projections.
  - Same entity edited on two devices: last `ts` wins per field.
  - The losing value stays in the log (visible under "history").
  - This replaces today's whole-record last-write-wins on `updatedAt` (F, `syncLines`).

### 4.3 Versioned migrations (pure functions, idempotent, tested)

Migrations are a pure function `migrations[n](input) → {events, warnings}`. A runner applies them in order and records `meta.schemaV`. **The legacy keys are copied to `meta.legacySnapshot` and never deleted** until the user has downloaded a v1 backup (§8).

**v0 → v1 (localStorage → events)**

| Source (F) | Becomes |
|---|---|
| `ap_lines[] {ballId,name,release,aim,speed,rev,oil,finish,pattern,note,updatedAt,synced,id}` | `line.created` (with `serverId=id`). `speed` → Value `{at:'unknown', prov:{kind:'user'}}`. `rev` → `{prov:'user'}`. |
| `ap_surface[] {ballId,date,finish,synced}` | `ball.surfaceLogged` with `to:finish`. Mapping to `refresh`/`resurface` is **not guessed**: type `surfaceChange`, and the user can reclassify. If no `ownedBall` exists for `ballId`, create a placeholder `ownedBall` with `status:'benched'` and flag it for confirmation. |
| `ap_notes[] {lane,oil,adjustment,synced}` | `patternNote.created` with `date:null`, `note:'migrated (no date)'`. **No dedupe of identical notes** (G4). |
| `ap_shots[] {t,ballId,pattern,miss,before,after}` | `shot.logged` with `ts=t` and `miss`. `before`/`after` engine states go in `data.engine`. `sessionId` = synthetic per local calendar day (`date(t)`), with `type:null` and a flag. |
| `ap_profile` (object; owned ids etc.) | `bowler.edited`, plus `ownedBall.created` per owned id (status `inBag`, as AM plan). |
| `ap_dels[]` (pending server deletes) | Kept as the sync outbox (`line.voided` with `serverId`). |

**API tables → v1 (when a device joins via `useCode`)**

| Source | Becomes |
|---|---|
| `GET /api/lines` | `line.created` per row. Rows match by `(ballId,name)` as today. |
| `GET /api/surface-log` | `ball.surfaceLogged`, deduped by `(ballId,date,finish)`. |
| `GET /api/pattern-notes` | `patternNote.created`. Server-side ids are available, so dedupe is by id. **Note:** the server returns only the newest 50 (G5); the API change in §7 fixes this. |
| `GET /api/me` | Full export. Prefer it for the first join. |

**Tests:**
- every migration has golden in/out fixtures, including empty, corrupt JSON and over-cap arrays;
- running a migration twice yields no new events.

---

## 5. Validators (plain JS, `js/data/validate.js`)

A validator is `validate(entity, record) → {ok, errors:[{field, code, msg}], warnings:[…]}`. There are no exceptions and no dependencies.

- **Hard errors** block commit: wrong type, impossible values, a frame with pins > 10.
- **Soft warnings** are shown in the import preview and the user can accept them: out-of-typical-range values.

| Field | Hard | Warn outside | Source |
|---|---|---|---|
| speed mph | 0–40 | 10–24 | warn range: HQ `DATA_VALIDATION_RULES.md` (F). Hard bound is A. LaneTrax artefacts of 1–3 mph exist in the sample (F, charts), so a warning is needed, not an error. |
| rev rpm | 0–1000 | 100–650 | HQ DATA_VALIDATION_RULES (F) |
| axis rotation ° | 0–90 | — | HQ (F) |
| RG in | 2.3–2.9 | outside 2.447–2.813 = "not USBC-legal spec" | HQ docs say 2.40–2.80 and HQ pydantic says ≤2.65 (F, they **disagree**). USBC limits per `physics/research.md` #12 (S). |
| diff | 0–0.1 | > 0.060 | HQ docs 0–0.080 (F); USBC 0.060 (S, physics/research.md) |
| mass bias | 0–0.1 | > 0.040 | HQ docs 0.040 vs HQ model 0.080 (F, **disagree**) |
| grit | 50–5000 | — | HQ docs 500–5000 vs model 80–4000 (F, **disagree**). Storm steps 180…4000 (AM plan). Hard range is A. |
| pattern length ft | 20–60 | 30–52 | HQ (F) |
| pattern volume mL | 5–60 | 10–40 | HQ (F) |
| boards | −5–45 | 0–39 | A (39 boards + gutters) |
| frame | each throw 0–10; frames 1–9 sum ≤ 10; 10th frame rules | — | Bowling rules (A; cite the USBC rule book when fetched). HQ lacks the sum check (F). |
| game score | 0–300 and = recomputed score | — | |
| date | valid ISO, not in the future by > 1 day | — | |

**Where the ranges came from:** HQ's ranges were reconciled by taking the docs as "warn" and USBC as the legality warning. HQ's own disagreement between docs and pydantic is listed in §11.

---

## 6. Import pipeline

```
file → sniff (ext + magic bytes + header fingerprint) → parser → rows[] in canonical shape
     → validate → match balls (alias index) → dedupe → PREVIEW (diff, warnings, n accepted/rejected)
     → user commits → events (importId) → projections → backup prompt
```

**Shared rules**
- Nothing is written before the preview is committed.
- Undo = void the import (§4.2).
- The raw file is never stored, only `sha256`, name and size.
- Files are user-supplied only: no scraping, no logins (LaneTrax ToS §8 forbids scraping, `IMPORTS_RESEARCH.md`, F).

### 6.1 Generic CSV mapper (`js/data/csv.js`)

- **Parser:** RFC 4180 (quotes, embedded commas and newlines, CRLF, BOM). It sniffs the delimiter (`,`, `;`, tab).
- **Mapping UI:** column → canonical field, with a unit picker and a speed `at` picker (required when speed is mapped). Unmapped columns go to `extra`.
- **Presets:** `ap_import_presets` saves `{fingerprint: sorted lower-case headers hash, mapping}`, so the second import is one tap.
- **Score shapes:** recognise the same shapes as HQ `parse_csv_scores_with_errors` (F):
  - wide "Game 1..N" columns;
  - frame/shot rows;
  - a single score column;
  - plain numbers.
  - Collect row errors; **do not throw**.
- **Ball names:** match through a normaliser. Strip weight, "used", "single drill", span etc., and map colour variants to the model.
  - Ported **as an algorithm** from `bowling-app-/model_normalizer.py` + `ball_alias_index.json` (F).
  - Alias data for our catalog is built from `js/data.js` names only; the bowwwl-derived catalog is not copied (§10).
  - Matching is always confirmed in the preview: "Phaze II?", with Yes/pick.

### 6.2 LaneTrax PDF parser (`js/data/lanetrax.js`): spec from the user's real sample (F)

**Sample:** "LaneTrax Session Report", 5 pages US-Letter, 2.6 MB.

**File facts (F, `pdfinfo`/`pdffonts`/raw inspection)**
- Producer jsPDF 3.0.4, PDF 1.3. All streams FlateDecode.
- Text uses an embedded **Inter** font (Type0/Identity-H, glyph ids written as hex `<…> Tj`) with **ToUnicode CMaps** (bfchar).
- Positions are set by `x y Td`. No annotations or links.
- Charts and lane diagrams are **raster PNG images**.

**Feasibility, proven:** a 60-line Node prototype using only `inflate` + ToUnicode `bfchar/bfrange` + a `Tf/Td/Tj` scan recovers all 102 text runs exactly. Browser equivalents:
- `DecompressionStream('deflate')` (zlib-wrapped, A: verify on iOS Safari 16.4+);
- `TextDecoder('latin1')`;
- regexes.
No pdf.js is needed. **Fallback** if a future LaneTrax version changes encoding: vendor pdf.js under `'self'`. That is a new dependency and needs Tech Lead sign-off. The prototype lives outside the repo (`/workspace/imports/proto/`).

**What is in the PDF (F)**

| Page | Content | Text-extractable |
|---|---|---|
| 1 | "LaneTrax Session Report", `Date: October 18, 2026`, `Total Shots: 90`. "Key Performance Stats": radar chart (image) + table `label · metric · value · Level n` | Yes (not the radar) |
| 2 | "View by Shots": 4 lane diagrams (images) captioned `6 strikes (12.8%)`, `41 leaves (87.2%)`, `8 made spares (20.5%)`, `31 missed spares (79.5%)` | Captions only. Red dots on the diagrams: meaning UNKNOWN. Colours match the app's legend: green strike, blue missed strike, black spare attempt (LaneTrax docs, F). |
| 3 | "View by Stats" → "Summary": two tables, each with header row, `Range` row and `Average` row, 7 + 6 columns | Yes. Headers wrap onto two lines ("Breakpoint / Board"). |
| 3–5 | "Graph by Stats": 13 per-shot line charts (PNG 1064×200), one per metric | **No**. Titles only. |

**Fields extracted, with units as printed**

| Key | Printed | Value in sample | Unit | Meaning (LaneTrax docs, F, `docs.lanetrax.app/ios/newsessions/classic-mode`) |
|---|---|---|---|---|
| `date` | `Date: October 18, 2026` | 2026-10-18 | — | session date |
| `totalShots` | `Total Shots: 90` | 90 | shots | |
| KPI `conversionRate` | Conversion Rate | 20.5, Level 1 | % | spare conversion |
| KPI `revRate` | Average Rev Rate | 231.43, Level 2 | rpm | "calculated by LOOKING at your ball" |
| KPI `impactSpeed` | Average Impact Speed | 13.93, Level 1 | mph | |
| KPI `arrowsDifference` | Arrows · Average Difference | 1.45, Level 4 | bds | "discards the top 50% of arrow differences… average of the remaining 50%" (past-sessions doc, F) |
| outcomes | strikes / leaves / made spares / missed spares | 6 / 41 / 8 / 31 | n (%) | |
| summary `arrows` | Range 15.9 · Average 14.6 | | board | board at the arrows |
| `averageSpeed` | 19.6 / 13.5 | | mph | release → pin impact |
| `breakpointBoard` | 21.7 / 11.8 | | board | max lateral deviation |
| `breakpointDistance` | 50.1 / 30.5 | | ft | foul line → breakpoint |
| `entryBoard` | 36.7 / 20.4 | | board | board entering the pocket ("ideal 17.5 for right-handers") |
| `impactSpeed` | 19.3 / 13.0 | | mph | at the pins |
| `foulLine` | 7.5 / 14.5 | | board | board at the foul line |
| `hookBoards` | 28.6 / 10.0 | | board | breakpoint → entry |
| `impactAngle` | 13.0 / 3.4 | | ° | entry angle ("optimal 6°") |
| `launchAngle` | 2.5 / 0.9 | | ° | angle off the boards at release |
| `launchSpeed` | 19.8 / 14.0 | | mph | at release |
| `shotTime` | 3.5 / 2.5 | | s | release → pins |
| `speedLoss` | 1.4 / 1.0 | | mph | release → pins (14.0 − 13.0 = 1.0, consistent) |

**Levels**

LaneTrax defines Levels 1–5 on the *standard deviation* of impact speed and RPM, on the arrows difference, and on the conversion rate (past-sessions doc, F):

| Level | Impact speed SD | Arrows | RPM SD | Conversion |
|---|---|---|---|---|
| 5 | ≤ 0.3 mph | ≤ 1 | ≤ 10 | ≥ 90% |
| 4 | ≤ 1 | ≤ 2 | ≤ 25 | ≥ 80% |
| 3 | ≤ 1.5 | ≤ 3 | ≤ 50 | ≥ 65% |
| 2 | ≤ 2 | ≤ 5 | ≤ 100 | ≥ 40% |
| 1 | > 2 | > 5 | > 100 | < 40% |

- The sample is consistent with this: 20.5% → 1, and 1.45 → 4.
- The parser stores the level and does **not** recompute it, because the SDs are not in the PDF.

**Per-shot data: NO (F).** The 13 charts plot per-shot values, but only as pixels.
- The charted point count is **51** for most metrics: Entry Board 49, Breakpoint Distance 30, Breakpoint Board 28. Total Shots is 90.
- The x-axis is a shot index only. There is no frame, game, ball, result or pin-leave per point.
- There is no per-shot rev chart.
- **Decision: v1 imports session aggregates only.**
- Digitising charts would give approximate values with no shot→frame mapping. If ever built, it must be labelled `prov.kind:'model', method:'chart-digitized'`. It is not planned.
- Better route: ask LaneTrax for the CSV export, which is "on our roadmap" (dev reply, F in IMPORTS_RESEARCH).

**Anchors and algorithm**
1. Decode text runs `{page, x, y, text}`.
2. Page 1: regex `^Date: (\w+) (\d{1,2}), (\d{4})$` and `^Total Shots: (\d+)$`. KPI rows are the 4-cell rows under "Key Performance Stats", grouped by equal `y`, ordered by `x`: label, metric, `value unit`, `Level n`.
3. Page 2: `^(\d+) (strikes|leaves|made spares|missed spares) \(([\d.]+)%\)$`.
4. Page 3:
   - for each `Stat` cell, the header cells are on the same y ±8 pt; merge wrapped headers whose x differs by < 25 pt;
   - `Range` and `Average` rows are the next two rows below;
   - assign each value to the nearest header column by x;
   - parse `^(-?\d+(\.\d+)?)\s*(%|rpm|mph|kph|m/s|ft|m|°|s|bds)?$`.
   - LaneTrax lets users switch speed to mph/kph/m/s and distance to ft/m (settings doc, F). **Read the unit from the cell and convert. Never assume mph.**
5. Unknown labels go to `extra` with a warning. They are not dropped.
6. **Fingerprint:** the title equals "LaneTrax Session Report" **and** the producer is jsPDF. On a mismatch, refuse with "This doesn't look like a LaneTrax Session Report; send it to us" (no partial import).

**Validations (warnings shown in preview)**
- Recompute the percentages:
  - 6/(6+41) = 12.8% ✓
  - 8/(8+31) = 20.5% ✓
  - conversion KPI = made-spare % ✓
- **`SHOT_COUNT_GAP`:** 6 + 41 + 8 + 31 = 86 ≠ Total Shots 90 (F). Cause UNKNOWN. Hypothesis (A): shots with no classification, or deleted shots.
- **`IMPACT_SPEED_KPI_VS_TABLE`:** KPI "Average Impact Speed 13.93" vs Summary Impact Speed average 13.0 (F). Cause UNKNOWN. Hypothesis (A): the KPI covers strike shots only ("rankings for your strike shots", past-sessions doc, F) while the table covers all tracked shots.
- **"Range" = max − min** (A, strongly supported): chart extremes read off the Arrows chart (~25.2 / ~9.3) and the Average Speed chart (~21 / ~1.4) reproduce 15.9 and 19.6.
- **Tracking artefacts:** charted speeds of about 1–3 mph and breakpoint distances of about 0–3 ft on a few shots (F, charts). They inflate the ranges. LaneTrax's default confidence threshold is 40% and it warns about "false shots" (settings doc, F). Show "range includes likely tracking errors" when range > 2 × typical (A, heuristic).
- **`n` per metric is UNKNOWN from text** (the chart counts are 28–51). Store `n:null` and the note "LaneTrax charted ~51 shots" only as a comment, not as data.

**Output**
- One `session` (type null until the user picks one; center, lane and pattern are not in the PDF).
- One `sessionAggregate` with `prov:{kind:'device', device:'LaneTrax', method:'session-report-pdf'}`.
- Optional `releaseMeasurement` rows:
  - `speed at:'launch' stat:'mean'`;
  - `speed at:'average'`;
  - `speed at:'impact'`;
  - `rev stat:'mean'` from the KPI.
- Each row is flagged for the user to accept into the bowler profile. The profile is never auto-overwritten.

**Dedupe:** `sha256(file)`, then the semantic key `(source, date, totalShots, hash(summary))`. A second import of the same report produces "Already imported on <date>", with an option to re-import as a new session.

**Legal:** LaneTrax ToS §2.2 forbids reverse engineering (`IMPORTS_RESEARCH.md`, F).
- Reading the text of a report the user exported is (A) not reverse-engineering the app, but this is **an owner/legal call. Open question.**
- The parser never contacts LaneTrax.

### 6.3 Ruby CSV (`presets/ruby.js`): stub

- Columns are **UNKNOWN**; there is no sample yet (IMPORTS_RESEARCH, F).
- The stub registers `{kind:'ruby-csv', status:'awaiting-sample', fingerprint:null}` and routes to the generic mapper.
- When a sample arrives:
  - record the headers, units and speed measurement point;
  - add a fingerprint and an anonymized derived fixture (as §9);
  - set `prov.device:'Ruby'`.
- Do not guess the columns from marketing pages.

### 6.4 Other imports
- **Backup restore:** v1 JSON (§8) → validate → preview → events.
- **Legacy `arsenal-pro-backup.json`:** runs migration v0→v1.

---

## 7. Sync (offline-first, no auth)

- The **outbox** is events with `synced:false`.
- Flush the outbox in batches of ≤ 15 kB serialized (under the 20 kB body cap, F). Use today's backoff:
  - 15 s / 45 s / 120 s / 300 s;
  - honour `Retry-After` (F, `retryLater`).
- **API v2** (additive; old endpoints stay so old clients keep working):
  - `POST /api/events` `{events:[…]}`. Idempotent: `INSERT … ON CONFLICT (device_id, id) DO NOTHING`. Returns `{accepted, cursor}`.
  - `GET /api/events?after=<cursor>&limit=500`. Paged, ordered by server `seq`.
  - Table: `events(device_id TEXT, id UUID, seq BIGSERIAL, ts BIGINT, type TEXT, entity TEXT, entity_id TEXT, schema_v INT, data JSONB, PRIMARY KEY(device_id,id))`. Index `(device_id, seq)`.
  - `GET /api/me` and `DELETE /api/me` must include `events` (data rights; today they cover only 3 tables, F).
  - **Quota:** per-device event cap. The number is UNKNOWN and is an owner decision, sized against Render free Postgres limits (verify). On hitting it, return 429 with a clear message. The client keeps everything locally regardless.
  - Fix `GET /api/pattern-notes LIMIT 50` → paged (G5).
- **Dual-write during transition:** `line.*` events also call the old `/api/lines` so other devices on old builds still see lines. Drop this after one release.
- No PII on the server beyond what the user types. The LaneTrax file never leaves the phone; only parsed numbers sync.

---

## 8. Export and backup

- **Backup v1 file** `arsenal-pro-backup-v1.json`:
  ```
  {app:'arsenal-pro', format:'backup', schemaV:1, exportedAt, deviceId, events:[…], imports:[…], prefs, legacy?:{…}}
  ```
  - It contains **everything**, fixing G2.
  - It has a SHA-256 of `events` for an integrity check.
- **Restore** happens through the import pipeline: preview → commit. Events dedupe by id, so a restore is safe to repeat.
- **CSV export** per entity (games, shots, aggregates, ball events) for spreadsheets. Units go in the header (`launch_speed_mph`).
- **Prompts:**
  - after every import;
  - after migration;
  - "backup older than 30 days" badge in More.
  - Each is one tap, not a nag.

---

## 9. QA tests (all runnable with `node --test`, no build; plus the existing `tests/e2e.py`)

| Suite | Cases (minimum) |
|---|---|
| `tests/data/validate.test.mjs` | Each range row in §5: in / warn / error. Frame sum > 10 rejected. 10th-frame (X X X, 9 / X, 7 2) scoring. 300 and 0 games. |
| `tests/data/migrate.test.mjs` | v0 fixtures: empty, typical, over-cap, corrupt JSON, identical notes ×2 (must give 2 events), legacy backup. Idempotent rerun = 0 new events. |
| `tests/data/project.test.mjs` | Projection = fold(events). Void works. Import undo restores the prior projection exactly. |
| `tests/data/csv.test.mjs` | RFC 4180 edge cases. Delimiter sniff. HQ-style score shapes (4). Unit conversions. Preset fingerprint reuse. |
| `tests/data/lanetrax.test.mjs` | (a) **Layout → record:** `tests/fixtures/lanetrax/session-report.words.json` → must equal `session-report.expected.json` (both committed, derived, anonymized). (b) **Decode:** if the env var `LANETRAX_SAMPLE` points to a real PDF, decode → words → compare to the words fixture except the date. Otherwise `skip`. (c) Units mph→kph variant (synthetic edit of the words fixture). (d) Missing table column → warning, not a crash. (e) Non-LaneTrax PDF refused. |
| `tests/data/sync.test.mjs` | Outbox batching ≤ 15 kB. Retry-After honoured. Idempotent re-POST (mock server). Two-device field-level LWW. |
| `tests/data/backup.test.mjs` | Round trip export → wipe → restore = identical projection hash. |
| Existing | `node tests/engine_equivalence.mjs` = 0 mismatches. `tests/e2e.py` green. axe 0 serious. |

**Fixture privacy.** This repo is **public**.
- The raw PDF is never committed. It stays at `/workspace/imports/samples/` on the box.
- The committed fixture contains only decoded text runs with the **date replaced by "January 1, 2000"** and the footer removed.
- There are no images and no name, center or lane (none are present in the text, F).

---

## 10. Credits and what we did **not** take

**From `majalen3/Bowling-HQ`** (MIT, public; read at clone 2026-10-23, F)
- Measurement standards: pattern source and revision date, normalised + raw ball names, factory vs current grit, bowler confidence, engine version + inputs on predictions (`docs/MEASUREMENT_STANDARDS.md`, `docs/DATA_VALIDATION_RULES.md`).
- Phase-1 data needs: result classes, center lane surface, ball status (`docs/DATA_NEEDS_PHASE_1.md`).
- Future data needs: resurfacing history, carrydown, actual-vs-predicted (`docs/DATA_NEEDS_FUTURE.md`).
- Schema ideas: `UNIQUE(session,game)`, frames, bag lineup slot order + rationale, recommendation reasoning (`database/schemas/postgres.sql`).
- Score parsing shapes and the "collect errors, don't throw" approach (`backend/src/services/games.py`).
- Score entry modes: list / throws / CSV paste (`frontend/src/pages/SessionsPage.tsx`).
- Session types (`docs/07_SESSIONS.md`).

**From `majalen3/bowling-app-`** (private; ideas only, no data copied, F)
- `sources[]{name,url,fields_used}` + `last_verified` per catalog record; nullable specs instead of guesses (`data/ball_catalog.json`).
- Alias index + name normaliser (`data/ball_alias_index.json`, `model_normalizer.py`, `ball_knowledge.py`).
- `ball_speed_measurement` point and slot taxonomy with desired counts (`data/arsenal_profile.json`).
- Confidence vocabulary (`scoring/confidence.py`) and decision trace (`scoring/decision_trace.py`).
- JSONL append-only metrics events (`metrics_events.py`).

**Not taken, and why (F unless marked)**
- **HQ `_parse_lanetrax`:** it parses an **invented LaneTrax CSV** (`Game,Frame,Shot,Pins`), its test uses that fabricated format, and its `source` argument is ignored. LaneTrax ships PDF, with CSV only "on the roadmap".
- **HQ `database/seeds/seed.sql`:** it inserts columns that do not exist in `bowling_balls` (e.g. `coverstock_type`, `hook_potential`, `backend`), so it would fail. Its specs and 1–10 ratings are unsourced.
- **HQ feature docs with fictional examples** (named sample bowlers, % match scores, "Digital Twin"): aspirational, with no data behind them.
- **HQ stack** (FastAPI + React/Vite + Postgres/Mongo/Redis, login, fixed demo user id): it conflicts with no-build and no-auth.
- **HQ internal inconsistencies:**
  - validation ranges in the docs vs the pydantic model (§5);
  - README links to doc files that don't exist;
  - migrations 001/002 duplicate the schema;
  - the throws validator allows frame totals > 10.
- **`bowling-app-` catalog data:**
  - scraped (bowwwl.com, eBay), licence UNKNOWN, private repo, so it must not go into this public repo;
  - coverage is uneven (Storm 3 records; Motiv 60 of 176 without specs);
  - `coverstock_type` holds truncated scraped prose.
- **`bowling-app-` hard-coded completeness numbers** in `decision_trace.py`, and the marketplace scraping pipelines (ToS risk; out of scope).

---

## 11. Open questions (owner)

1. **Ruby CSV sample:** the stub cannot become a preset without it.
2. **LaneTrax:**
   - OK to parse your own exported PDFs given ToS §2.2? (A: probably fine; owner call.)
   - Will you ask LaneTrax for the CSV export (it would give per-shot data)?
   - The 86 vs 90 shot gap and the 13.93 vs 13.0 impact speed: can LaneTrax support explain them?
   - Confirm LaneTrax's handedness setting matches you (team docs assume RH). It changes the board numbers (settings doc, F).
3. **Chart digitising:** confirm "not in v1".
4. **Fixture:** OK with the derived, date-anonymized words fixture in the public repo, or prefer it gitignored?
5. **Server event quota and Render Postgres limits:** pick a number.
6. **Owned-ball list, home center (lane surface) and league pattern:** none are in any file we have.
7. **LaneTalk GDPR export:** still wanted?
8. **Split definitions and frame rules:** fetch the USBC rule book before the leave labels ship.
