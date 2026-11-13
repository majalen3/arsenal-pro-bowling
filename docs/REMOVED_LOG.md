# Removed code log (v75, owner t134u)

Two lists: what was removed (with the evidence), and "removed but later needed" (restore here, then fix the detection rule).

## How a removal is proven
1. **Static**: `node tests/perf/static_audit.mjs` (module graph from `js/main.js`, files nobody names, SW list vs disk) and `node tests/perf/unused_exports.mjs` (exported names with no other mention anywhere: `js/`, `tests/`, `tools/`, `sw.js`, `index.html`, including `Namespace.name` calls).
2. **Runtime**: `python tests/perf/coverage_run.py tests/e2e.py http://localhost:PORT/` (Chromium precise coverage across the whole e2e run: 803 checks, 108 files, 2,807 functions, 2,216 executed).
3. Only a name that is **unreferenced AND never executed** is a candidate. Then: not a user-data, migration, backup, import, recovery or sync path; small enough to review by eye.
4. All suites green after.

## Result of the scan
- Modules unreachable from `main.js`: **0** (the only unreferenced files are the lazily loaded OCR vendor files, which are loaded by `drillocr.js` on demand and runtime-cached).
- Exported names with no outside use: 16 (after the corrected scan). 5 removed; the other 11 are constants or data/backup paths kept on purpose (below).

## Removed in v75
| File | Name | Lines | Evidence |
|---|---|---|---|
| js/cc/drillcard.js | `fracText` | 1 | no mention outside definition; never executed |
| js/cc/line.js | `clearKept` | 1 | same (the Keep-in-bag toggle uses `cc/keep.js`) |
| js/cc/status.js | `bagIds` | 1 | same |
| js/patdata.js | `lenOf` | 1 | same |
| js/screens/welcome.js | `ownedPicker` | 6 | same (nothing imports or calls it) |

Total 10 lines of source. Restore with `git show 9088cb6:<file>` (the v74 tree).

## Kept on purpose (unreferenced, but not removable under the rules)
`store.backupBlob` (backup path), `data/validate.checkFrames` (import validation), `data/privacy.BOUND_MESSAGE`, `data/schema.PROV_KINDS`/`BALL_STATUS`, `data/team.KINDS`, `data/seed.exampleEvents` (data shape documentation, cheap), `cc/ux._resetMem` (test hook), `cc/bag.LEVEL_NAME`, `cc/community.AUTO`, `cc/drillocr.OCR_FILES` (OCR loader). (A helper used only by a test, such as `addball.engineReady`, counts as used and stays.)

## Removed but later needed
| Date | What | Why it was needed | Detection-rule fix |
|---|---|---|---|
| 2026-11-12 (caught before commit) | 22 functions on a first-draft list (`C.toggleTag`, `C.regularOf`, `C.statsShare`, `D.papCompare`, `D.parseWords`, `D.cardRecord`, `K.drawWrapped`, `T.fromLine`, ...) | all were called as `Namespace.fn(...)` from screens, or from tests | `unused_exports.mjs` ignored a name preceded by `.`; now counts it. Always run the full unit suite and grep `\.name` before deleting. |

Nothing has been restored from the 5 real removals so far. When something is, add a row above.
