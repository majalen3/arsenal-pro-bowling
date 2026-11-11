# Ball catalogue rebuild (maker sources only)

`js/data/spec_catalog.js` is generated from `maker_rows.json` by `node tools/build_spec_catalog.mjs`.
Every row came from the manufacturer's own product page (or a tech-data sheet linked from it), read 2026-11-02.
No third-party catalogue (bowlingballvideos, bowwwl, bowlingball.com, BowlingThisMonth, ...) is used.

Row fields (facts only): `brand`, `name`, `source` (exact maker URL), `checked` (date read), `specStatus`
(`maker` | `unverified`), and where the maker prints them: `coverstock`, `coverType`, `finish`, `core`, `symmetry`,
`rg`, `diff`, `intDiff` (Brunswick-family ASY / Storm PSA / Motiv Int. Differential), `weight` (the lb row the numbers
are for: 15 lb when printed, else 16 lb, else the only weight printed), `release`, `conditionText` (maker wording) and
`condition` (that wording mapped to the app's oil scale). `derived` lists fields read from the maker's wording rather than
a labelled spec cell (e.g. symmetry from a printed ASY row or "Asym" in the core name, cover type from the coverstock
name). A field the maker does not print is absent: the app shows "spec TBD". `unverified` rows keep name and brand only.

Refresh (from a scratch dir with the API repo checked out next to this one):
1. `node -e "…"` to write `map.json` = `[{brand,name,url}]` from `maker_rows.json` (`url` = `page || source`).
2. `node fetch.cjs` (guardedFetch: allowlist, robots.txt, Crawl-delay, honest UA).
3. `node extract.cjs` then `node overrides.cjs` → `final.json`. Review the diff by hand, copy into `maker_rows.json`.
4. `node tools/build_spec_catalog.mjs`, bump the service worker version, run the tests.

## 2026-11-06 review
- Discovery output: **143 maker rows, zero unverified rows**. Mix Black White and Tropical Surge Purple were removed from discovery, not from saved equipment; owned confirmed specs still resolve.
- `builtin_sources.json` separately records the review of all **22 stable built-in identities** in `js/data.js`, checked 2026-11-06. Five have unverified specs; Ice Storm, generic Reactive Scout and Not Urethane NU also lack a supported model family/complete inputs. No source or field is invented for these entries.
- Physics input changes require a deliberate review of `tests/fixtures/engine-inputs.v64.json`, never an automatic refresh to make tests pass. Full per-ball old/new table and caveats: `docs/DECISIONS.md`. The engine code is unchanged.

## 2026-11-10 additions
- 7 rows read 2026-11-10 from the maker's own page (guardedFetch + parseSpecPage, then checked by hand against the page text): Storm Phaze II, Phaze 4, Phaze AI; Roto Grip Attention Star; Hammer Black Widow 3.0, Purple Pearl Urethane; Motiv Venom Shock. Weight row = 15 lb where printed, else the one printed (16 lb). 150 maker rows, zero unverified. No existing row changed.
- Skipped because the maker URL returned 404 on 2026-11-10 (no guessed specs): Storm Phaze III, Phaze 5, IQ Tour, Physix, Summit; Roto Grip Idol, Hustle Ink; 900 Global Zen, Honey Badger.

