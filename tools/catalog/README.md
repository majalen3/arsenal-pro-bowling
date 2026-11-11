# Ball catalogue rebuild (maker sources first)

`js/data/spec_catalog.js` is generated from `maker_rows.json` by `node tools/build_spec_catalog.mjs`.
Every row came from the manufacturer's own product page (or a tech-data sheet linked from it), read 2026-11-02.
No third-party catalogue (bowlingballvideos, bowwwl, bowlingball.com, BowlingThisMonth, ...) is used.

Row fields (facts only): `brand`, `name`, `source` (exact maker URL), `checked` (date read), `specStatus`
(`maker` | `archive` | `secondary` | `community` | `unverified`, see below), and where the maker prints them: `coverstock`, `coverType`, `finish`, `core`, `symmetry`,
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


## 2026-11-11 404 gaps (owner t110: a 404 may be filled from an archived maker page or Wikipedia; never from a banned site)
Source order: (1) the maker's own live page, including its archive/retired sections; (2) a Wayback Machine copy of the maker's
own page (`specStatus: "archive"`, `source` = the `web.archive.org/web/<timestamp>/` URL, `original` = the maker URL, `sourceAlso`
= more archived maker pages read for a missing field); (3) Wikipedia/Wikimedia (`secondary`, needs `attribution`, flagged in
the app as not the maker); (4) a public forum, last resort, name/brand/source/date only (`community`). Never bowlingballvideos,
bowwwl, bowlingball.com or BowlingThisMonth (the generator rejects them). Search engines were used only to find maker URLs.

| Ball | Status | Source (read 2026-11-11) | Facts taken |
|---|---|---|---|
| Storm Phaze III | maker | stormbowling.com/products/featured/bowling-balls-archive/bbmtzf-phaze-iii | R3S Hybrid Reactive, 1500-grit Polished, Velocity (symmetrical), Dec 2019, 15 lb RG 2.48 / diff 0.051 |
| Storm Phaze V ("Phaze 5") | maker | …/bowling-balls-archive/bbmvvv-phaze-v | R2S Pearl Reactive, Velocity (symmetrical), Oct 2022, 15 lb 2.48 / 0.051; finish not printed (TBD) |
| Storm PhysiX | maker | …/bowling-balls-archive/bbmtay-physix | NRG Hybrid Reactive, 3000-grit Abralon, Atomic (asymmetrical), Oct 2018, 15 lb 2.48 / 0.053, PSA 0.017 |
| Storm Summit | maker | …/bowling-balls-archive/bbmvnf-summit | TX-23 Hybrid Reactive, 3000-grit Abralon, Centripetal HD-A.I. (symmetrical), Jun 2023, 15 lb 2.46 / 0.056 |
| Storm !Q Tour Edition ("IQ Tour") | maker | stormbowling.com/storm-iq-tour-edition-bowling-ball | R2S Solid, 4000 Grit, C3 Centripetal Control, Symmetrical, 2012-07-10, 16 lb (only weight printed) 2.49 / 0.035 |
| Roto Grip Idol | maker | …/bowling-balls-archive/bbmrid-idol | MicroTrax-S18 Solid Reactive, 2000-Grit Polished, Ikon (symmetric), 2018-03-09, medium to heavy oil, 15 lb 2.49 / 0.052 |
| Brunswick Prism Solid / Prism Hybrid / Prism Warp / Prism Warp Hybrid | maker | brunswickbowling.com/products/balls/retired/prism-solid, -hybrid, -warp, -warp-hybrid | cover, cover type, finish, Portal core, 15 lb RG 2.465 / diff 0.051 / ASY 0.018 (no release date printed). The maker has no plain "Prism" page; none was invented. |
| 900 Global Zen | archive | web.archive.org/web/20220629002043/https://www.stormbowling.com/zen-bbmgzn15 (+ 20210119093057 copy of 900global.com/zen/ for the finish) | S77 Response Pearl, 1500 Polished, Meditate symmetric, 2020-11-27, 15 lb 2.49 / 0.051 |
| Roto Grip Hustle Ink | archive | web.archive.org/web/20210819030959/https://www.stormbowling.com/hustle-ink-bbmrhi15 | Thrilled Solid Reactive (maker wording), Hustle core, light to medium oil, 15 lb 2.53 / 0.030; finish, symmetry and release not printed as text (TBD) |
| 900 Global Honey Badger | archive | web.archive.org/web/20200930193017/https://www.900global.com/honey-badger/ | S71 Pearl, 1,500 Grit Polished, Grapnel asymmetric, medium oil; RG/diff not printed (tech sheet not archived): spec TBD |

Not added: league-only or other family members nobody asked for (Zen Master, Zen U, Honey Badger Intensity/Revival, other Hustles,
!Q Tour Pearl/Emerald/Sapphire). 163 rows: 160 maker, 3 archive, 0 secondary, 0 community, 0 unverified. Existing rows unchanged.
