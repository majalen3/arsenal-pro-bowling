# Locks: what is frozen and how to unlock it

Part of the zone design ([ARCHITECTURE_ZONES.md](ARCHITECTURE_ZONES.md)). Some files define behavior the owner has said must not drift: the physics engine, the scoring rules and the event-log schema. They are **locked**: the SHA-256 of each file is pinned in `tools/zones/locks.manifest.json`, and `tests/data/zones.test.mjs` (which CI already runs with the unit tests) fails when a locked file no longer matches its pin.

## Locked files

| Zone | Files | Why |
|---|---|---|
| ENGINE | `js/engine.js` | `simulatePath` and the Breakpoint analysis, moved verbatim from v1. Owner rule: `simulatePath` stays unchanged. |
| ENGINE (oracle) | `tests/engine_equivalence.mjs`, `tests/fixtures/engine-inputs.v64.json`, `tests/legacy/app.v1.js` | The v1 function, the input set and the comparer that prove 7500 comparisons / 0 mismatches. Locked too, so the equivalence cannot be quietly re-baselined. |
| SCORING | `js/data/scoring.js` | USBC 2a-2h ten-pin scoring. |
| EVENT_LOG | `js/data/schema.js`, `js/data/events.js`, `js/data/migrate.js` | The append-only event schema, envelope and the migrations. Existing phones and backups depend on them. |

`js/data/project.js` (the projection) is in the EVENT_LOG zone, which always runs the full suite when it changes, but it is not hash-locked because it changes with features.

## How to unlock (deliberate change)

1. Make the change. The lock test now fails and names the file.
2. Run `node tools/zones/locks.mjs --unlock <file> --reason "why, in a sentence"`. It re-pins the file's hash in the manifest **and** appends a row below with the reason, today's date and the new hash (first 12 hex).
3. Commit the code change, `tools/zones/locks.manifest.json` and this file together. The PR shows the reason; the lock test passes only when the manifest hash, the file and the latest log row agree.
4. A locked-zone change runs the **full** suite (`tools/check.mjs` escalates automatically; CI always runs it). For `js/engine.js` or the oracle files that includes `node tests/engine_equivalence.mjs`: it must stay at **7500 comparisons, 0 mismatches** unless the change is a documented re-baseline (say so in the reason and in `docs/DECISIONS.md`).

Editing only the manifest, or only the log, fails: the file, the pin and the latest row must all agree. Removing a file from a zone's `locked` list is a lock change as well and needs a row here.

`node tools/zones/locks.mjs --status` lists each locked file, its pin and its latest entry.

## Unlock log

The newest row for a file is the one that counts.

| File | Reason | Date | sha256 (12) |
|---|---|---|---|
| `js/data/events.js` | Baseline: initial lock when the zones were drawn | 2026-11-13 | `93425818992c` |
| `js/data/migrate.js` | Baseline: initial lock when the zones were drawn | 2026-11-13 | `ec4dcbddce55` |
| `js/data/schema.js` | Baseline: initial lock when the zones were drawn | 2026-11-13 | `5cf221d888ad` |
| `js/data/scoring.js` | Baseline: initial lock when the zones were drawn | 2026-11-13 | `3ed3b29ba987` |
| `js/engine.js` | Baseline: initial lock when the zones were drawn | 2026-11-13 | `5a88672c9f17` |
| `tests/engine_equivalence.mjs` | Baseline: initial lock when the zones were drawn | 2026-11-13 | `84749c886dab` |
| `tests/fixtures/engine-inputs.v64.json` | Baseline: initial lock when the zones were drawn | 2026-11-13 | `b78c27e81df2` |
| `tests/legacy/app.v1.js` | Baseline: initial lock when the zones were drawn | 2026-11-13 | `8249ad9bd7c7` |
