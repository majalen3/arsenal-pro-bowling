# Arsenal Pro: Team Prompt, Data System + Command Center (D0–D2, CC0–CC2)

You are a seven-person software team working on **Urbanek Honey Badgers Arsenal Pro**. Arsenal Pro is a free, phone-first bowling tool used at the lane. The team:
- Tech Lead (TL)
- Frontend (FE)
- Backend (BE)
- Data/Import Engineer (DI)
- QA
- UX/Coach-Voice (UX)
- Research Steward (RS)

The job has two parts, done in this order:

1. **Build the data system first.** It is offline-first and append-only, with provenance on every number, versioned migrations, a full backup, an import pipeline, and the LaneTrax PDF parser.
2. **Then build the Command Center on top of it:** CC0 Tonight, CC1 Quick log + spares, CC2 Bag builder + arsenal status.

**Rules for the work**
- Ship small, path-scoped commits to `main`.
- `git fetch && git pull --rebase` before every push. **Never force-push.**
- Another agent may be editing UI files, so add only the paths you own.
- Never stop at a partial update.

**Read first, in this order**
1. `docs/DATA_SYSTEM.md`: the data spec. § numbers below marked "DS§" refer to it.
2. `docs/COMMAND_CENTER_PLAN.md` and `docs/TEAM_PROMPT_COMMAND_CENTER.md`: the CC spec, invariants and targets.
3. `docs/ARSENAL_MANAGER_PLAN.md`: owned balls, events, rules, bags (semantics).
4. `docs/IMPORTS_RESEARCH.md`, `docs/DESIGN_SYSTEM.md`, `docs/TEAM_PROMPT.md`, `docs/TEAM_PROMPT_NEXT.md`. Their invariants still apply.
5. Fixtures: `tests/fixtures/lanetrax/` (README inside).

---

## 1. Owner context (2026-10-23)

- **Devices:** the owner bowls with LaneTrax (PDF session reports) and LaneTalk, and owns a Ruby.
- **Ruby** is the intended primary release-data source. **No Ruby CSV sample is held yet.**
- **The app is free:** no monetization, ads, affiliate or purchase links.
- **The owner pointed us at his `Bowling-HQ` repo for ideas.** Adopted ideas are credited in DS§10. Do **not** copy its seed data, fictional examples or invented LaneTrax CSV parser.
- **The user's LaneTrax sample PDF is private.**
  - It lives only on the box at `/workspace/imports/samples/lanetrax-2026-10-18.pdf`.
  - It must **never** be committed; this repo is public.
  - The committed fixture is derived and date-anonymized.

## 2. Repos & environment

| Repo | Role | Rules |
|---|---|---|
| `majalen3/arsenal-pro-bowling` (PUBLIC) | App | No-build ES modules + `index.html`. GitHub Pages. |
| `majalen3/arsenal-pro-api` (PUBLIC) | API | Express + pg on Render free tier, `https://arsenal-pro-api.onrender.com`. Body limit 20 kB. Per-device rate limits. `X-Device-Id`. |
| `majalen3/Bowling-HQ`, `majalen3/bowling-app-` | Reference | **Read-only. Never push.** |

Node 20 is available for `node --test`.

## 3. Non-negotiable invariants (QA blocks a merge on any failure)

1. **Engine untouched.**
   - `simulatePath` code and signature are unchanged.
   - `node tests/engine_equivalence.mjs` reports **0 mismatches** on every commit.
2. **e2e suite green:** `tests/e2e.py`, axe 0 serious/critical, Lighthouse a11y ≥ the current score.
3. **No build step. CSP stays `script-src 'self'`.**
   - No inline scripts, no CDN, no `eval`/`new Function`.
   - A new vendored dependency (for example pdf.js) needs TL sign-off in `docs/DECISIONS.md`.
4. **No invented data.**
   - Unknown = `null` + reason.
   - Every number shown carries a provenance chip (DS§3).
   - Model outputs are labelled "estimate".
   - No per-shot LaneTrax values (they are not in the PDF text, DS§6.2).
5. **Offline-first, no auth for core data.** The device code remains the identity. Every write works in airplane mode.
6. **Append-only.**
   - No `.slice(-N)` truncation of user history.
   - Delete = `voided` event.
   - Import undo = void the import.
7. **No raw third-party files in git.** Fixtures are derived and anonymized, with a README stating what was removed.
8. **Brand and voice.**
   - Honey Badgers tokens only: green `#0F4D34`, gold `#DAAF37`, black. Use them via the `DESIGN_SYSTEM.md` tokens, with no new hex values.
   - Mobile-first at 360 px width, 44 px targets.
   - Coach voice: ≤ 2 sentences, starting with a number or the ball/pin name. Example: "14 mph launch, 0.5 slower than last week. Stay with the Phaze II."
9. **`cc3d` flag stays OFF.** The 3-D output stays unreachable (test).
10. **Render API:**
    - changes are additive, and old endpoints keep working for old clients;
    - `/api/me` export and delete cover every new table;
    - no secrets in the client.
11. **Ref repos are read-only.** LaneTrax and LaneTalk: user-supplied files only. No scraping, no logins, no stored third-party credentials.

## 4. Roles

| Role | Owns | Deliverables |
|---|---|---|
| **TL** | `js/data/` architecture, DECISIONS.md, merge gate | Module map. IndexedDB vs localStorage decision recorded. pdf.js decision (default: not needed). Review of every migration. |
| **DI** | `js/data/{schema,validate,migrate,project,events,csv,lanetrax,match}.js`, `js/data/presets/*` | DS§2–6 implemented as DOM-free ES modules. LaneTrax parser passing the fixture. Ruby stub. Ball-name matcher. |
| **BE** | `arsenal-pro-api` | DS§7: `POST/GET /api/events`, events in `/api/me`, paged pattern notes, quota with 429 message, tests in `test/`. |
| **FE** | `js/store.js` adapter, import preview screen, backup/restore UI, CC screens | `store.js` becomes a thin adapter over `js/data/`, keeping its exports so the engine and existing screens are unaffected. CC0–CC2 UI. |
| **QA** | `tests/data/*.test.mjs`, e2e additions, gate | DS§9 suites. 8-item gate (§7). Device matrix: iOS Safari, Android Chrome, desktop Chrome, private mode. |
| **UX** | copy, chips, preview layout | Provenance chips. Import preview (counts, warnings, matches). Coach-voice strings ≤ 2 sentences. |
| **RS** | sources, ranges, LaneTrax semantics | Cited source for every validator range and split/frame rule (fetch the USBC rule book). Keeps DS§11 open questions current. |

## 5. Phases, deliverables and measurable targets

| Phase | Build | Targets (all must pass) |
|---|---|---|
| **D0 Data core** | `js/data/` schema, events, projections, validators, IndexedDB store with localStorage fallback; migration v0→v1 (DS§4.3) with `legacySnapshot`; backup v1 export **and restore** (DS§8); `store.js` adapter | Migration golden fixtures 100% pass and are idempotent (0 new events on rerun). Backup round trip gives an identical projection hash. Boot to first paint no slower than today **+50 ms** on a mid Android at 4× CPU throttle (measure before/after). 0 history truncation (grep test for `.slice(-` in `js/data` and `store.js` persistence). Engine equivalence 0. |
| **D1 Import pipeline** | Sniff → parse → validate → match → dedupe → **preview** → commit → undo (DS§6). Generic CSV mapper + presets. Ruby stub. Ball-name matcher. | CSV suite: ≥ 25 cases incl. RFC 4180 edges, BOM, `;`/tab, formula-injection cells (`=`,`+`,`-`,`@` shown as text, never evaluated). 1 000-row CSV preview in < 1.5 s on mid Android (A target). Re-import of the same file is detected 100%. Undo restores the prior projection exactly. Nothing is persisted before commit (test). |
| **D2 LaneTrax PDF** | `js/data/lanetrax.js` per DS§6.2: inflate via `DecompressionStream`, ToUnicode, positioned words, anchors, unit-aware parse, validations, fingerprint refusal | `session-report.words.json` → `expected.json` **exact match**. Local decode test passes on the real sample (`LANETRAX_SAMPLE=…`, skipped in CI). 0 per-shot values created. Preview shows both warnings (`SHOT_COUNT_GAP`, `IMPACT_SPEED_KPI_VS_TABLE`). kph/m/s variants convert correctly. Non-LaneTrax PDF refused with no writes. Parse of a 2.6 MB file in < 2 s on mid Android (A target). |
| **D3 Sync v2** | BE events endpoints; FE outbox ≤ 15 kB batches, backoff + Retry-After, dual-write to `/api/lines` | Mock-server suite green. 2-device field-level last-write-wins test. 0 events lost across a kill/airplane/restore cycle (e2e). `/api/me` includes events. |
| **CC0 Tonight** | As `COMMAND_CENTER_PLAN.md` CC0, reading the projections. The release card shows provenance + `at` for speed. | As CC plan: < 1 s offline, 20/20 golden, 100% why-coverage, 0 model lines for spec-TBD. **Plus:** every number on the card has a chip. A LaneTrax aggregate shows "LaneTrax · date", never as the profile value until the user accepts it. |
| **CC1 Quick log + spares** | Quick log writes `shot.logged` / `game` events; Plan A/B; 3-6-9 | As CC plan: read → pick ≤ 1 tap, triggers unit-tested, 3-6-9 = USBC PDF, **0 throws lost on tab kill** (now via IndexedDB). 10th-frame scoring tests pass. |
| **CC2 Bag builder + status** | `ownedBall`/`bag`/maintenance events (DS§2); coverage grid; checks; fill bag; status strip | As CC plan: swap ≤ 2 taps, 12/12 overlap/hole fixtures, **health counts = fold(event log)**, fill bag uses owned balls only. |

**Ordering and hand-offs**
- D0 must merge before any CC work writes data. D1 and D2 can run in parallel after D0. D3 can trail CC0.
- CC phases may ship UI behind existing data while D3 is in progress, because local data is the source of truth.

## 6. Data-specific acceptance (from DS)

- **Provenance:** 100% of rendered numbers carry `prov.kind` (test walks rendered DOM data-attributes).
- **Speed:** every stored speed has `at ∈ {release, launch, average, impact, unknown}`. Mixing points in one average is a test failure.
- **Validators:** every range row in DS§5 is covered by in / warn / error tests. Each range has a source note in code comments.
- **Ball match:** the preview always asks for confirmation on fuzzy matches. Exact alias matches are auto-filled but editable.
- **Privacy:** no file contents leave the phone. `sha256`, name and size only in `imports`. A grep test confirms no `.pdf` and no raw CSV under `tests/fixtures/` except the documented derived files.

## 7. QA gate (all 8 must pass on every merge to `main`)

1. `node tests/engine_equivalence.mjs` → **0 mismatches**; `simulatePath` diff empty.
2. `node --test tests/data/` → all green.
3. `tests/e2e.py` → green on the deployed Pages URL.
4. axe → 0 serious/critical; tap targets ≥ 44 px; 360 px layout without horizontal scroll.
5. CSP unchanged (`script-src 'self'`); no inline script; no new network origins except the Render API.
6. Offline: airplane-mode e2e (log, import, backup) passes. Reload/kill loses 0 events.
7. Data integrity:
   - migration idempotent;
   - backup round trip hash-equal;
   - import undo exact;
   - no `.slice(-N)` on history.
8. Content:
   - coach copy ≤ 2 sentences, starting with a number or ball name;
   - Honey Badgers tokens only;
   - no invented values (RS spot-checks 10 random numbers back to their source);
   - `cc3d` off.

## 8. Test fixtures

- **LaneTrax:** `tests/fixtures/lanetrax/session-report.words.json` (derived text runs, date → 2000-01-01, footer removed) and `session-report.expected.json` (the layout→record mapping, including the 2 expected warnings).
- **Ruby:** none until the owner provides a sample. Then add a derived, anonymized fixture with a README listing what was removed.
- **Migrations:** craft v0 `ap_*` fixtures by hand from the current shapes in `js/store.js` (DS§4.3). No real user data.

## 9. Risks

| Risk | Mitigation |
|---|---|
| IndexedDB quirks (iOS private mode, eviction) | localStorage/memory fallback. "Backup older than 30 days" badge. `navigator.storage.persist()` request (A: check support). |
| LaneTrax changes its PDF layout | Fingerprint + versioned parser. Refusal instead of partial import. Manual entry fallback. |
| LaneTrax ToS §2.2 (reverse engineering) | Parse only user-exported files, never the app or its servers. Owner confirms (DS§11). |
| `DecompressionStream` missing on older iOS | Feature-detect. Message "Update iOS or enter the numbers manually". pdf.js only with TL sign-off. |
| Migration corrupts data | `legacySnapshot` kept. Legacy keys not deleted until a v1 backup is downloaded. |
| UI collisions with another agent | Path-scoped `git add`, rebase, no force-push. |
| Render free-tier limits | Quota + 429 copy. Client keeps everything locally regardless. |

## 10. Reporting (each round)

- Phase and commits (hashes).
- Gate results 1–8.
- Perf numbers vs targets.
- Fixtures added.
- Open owner questions (DS§11): Ruby CSV sample, LaneTrax ToS/CSV/handedness, fixture policy, event quota, owned balls/center/pattern.
- Residual risks.
