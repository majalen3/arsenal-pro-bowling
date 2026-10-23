# Imports Research — can Arsenal Pro bring in tracking, sensor and scoring data?

Compiled 2026-10-23. Labels:
- **F** = fetched and read;
- **S** = search excerpt only;
- **A** = assumption.

**Rule for this doc:** we never invent a file format. Where no sample or spec was seen, the format is **UNKNOWN** and the importer step is "get a real sample file from the user first".

## 0. Name check: what the user's words map to

| User said | Product it most likely is | Confidence | Evidence |
|---|---|---|---|
| "LaneTrax" | **LaneTrax**: iPhone-on-tripod camera tracker by **LaneTrax Inc.**, Evanston IL. **Not** a Kegel product (Specto is Kegel's). | High | App Store (F), Terms (F) |
| "Ruby" | **Ruby Bowling**: in-ball sensor plus iPhone app by **Ruby Creative Holdings Inc.**; support@rubybowling.com | High | App Store id6762580021 (F), rubybowling.com (F) |
| "witse" | **Witsee** ("Witsee Shot Insight" / "Witsee Sensor QuickFit"): in-ball sensor by **Witsee Tech, UAB** (Lithuania) | High (no other bowling product with a close name found) | witsee.com product and app pages (F); company code (S) |
| "F5" | **F5 Bowling Sensor**: "built by F5 Sports alongside the experts at Storm"; app "F5 Bowling", seller **F5 Sports, Inc.** | High | stormbowling.com/f5-bowling-sensor (F), App Store (S excerpt of listing) |
| "F5" (other meaning) | **F5 Sports** also makes **pitchLogic** (smart baseball/softball, which has CSV export). This is not bowling, but it hints at the company's export culture. **A:** unconfirmed for the bowling app. | — | SportsBusinessJournal / pitchlogic.com (S) |

## 1. Bowling sensors and trackers

**Metric legend:**
- RPM = rev rate
- Spd = speed
- Tilt / Rot = axis tilt / rotation
- LA = launch angle
- Bds = board positions
- EA = entry angle

| Product (maker) | How it measures | Metrics (from maker) | Export / API | Import feasibility for us | Effort |
|---|---|---|---|---|---|
| **Ruby Bowling** (Ruby Creative Holdings) | In-ball sensor. Currently glued under a finger grip; the maker is working on a swappable mount (Reddit, S). iPhone only, iOS 16.4+ (F). | "Over 50 stats": setup, pushaway, loft, swing, timing, **RPM, Spd, PAP, Tilt, Rot, breakpoint**, lane transition (rubybowling.com F; Reddit S). Does **not** give boards at arrows or entry angle in the listing; breakpoint is listed. | **CSV export: "Share shot, session, or full-day data as CSV files"** (v1.1.1 notes, F). No public API found. | **Yes, via user-shared CSV.** Column names are **UNKNOWN**; need one real export. ToS not read (**gap**). | S–M |
| **Witsee** (Witsee Tech, UAB) | Removable in-ball sensor ("QuickFit") in a grip-hole mount, removable with a screwdriver, no drilling. 2.1 g, CR1025 battery, ~1,000+ throws (S, product page excerpt). iOS and Android (F). iOS and Android. | **RPM, release Spd, Tilt, Rot**, loft, loft angle, release height, swing height, total bounce, **PAP** (F). No lane-board data. | **"Session export to CSV file" is Premium only** ($89.99/yr) (F). "Session sharing" is "coming soon" (F). No API found. | **Yes, via CSV, if the user has Premium.** Columns **UNKNOWN**. | S–M |
| **F5 Bowling Sensor** (F5 Sports, Inc., presented by Storm) | Removable sensor in the finger hole (Storm F). Reddit (S): needs custom grips, phone close by. | **Spd, RPM, Tilt, Rot, track flare, rev/speed ratio** (F). The app also logs **scores and pin leaves** (App Store, S excerpt). | **No export documented** (Storm page F, App Store S). Membership after year 1 (S). | **Not now.** Manual entry of session averages only. Re-check when export ships. | — |
| **BowlSense Pro** (bowlsense.io) | IMU puck in a thumb slug, Bluetooth (S). $199.99, no subscription (S). | Spd, RPM, Tilt, Rot (S). AthleteRX mentions phone-video speed and revs (S). Blog mentions "data export" in a TestFlight build (S). | Format **UNKNOWN** | Possible later; need a sample. | — |
| **LaneTrax** (LaneTrax Inc.) | iPhone camera on a tripod behind the approach; records replay video (F). | **Board at arrows, breakpoint, entry, Spd, RPM, LA, EA** (F). Web dashboard: shots, sessions, launch speed, conversion rate (docs, S). | **PDF report export** (App Store listing, F). **CSV "on our roadmap"** (dev reply, F). The docs index lists an OpenAPI spec (S), but the URL returned **404/empty** when fetched. No public API is confirmed. | **PDF parse is possible but brittle**: layout UNKNOWN, need a sample PDF. ToS (F, lanetrax.app/terms): the user keeps ownership of their content but grants LaneTrax a broad licence. §8 prohibits unauthorized scraping and data mining; §2.2 prohibits reverse engineering. So: no scraping of bowl.lanetrax.app; user-supplied files only. | M (PDF), S (when CSV lands) |
| **Specto / Specto GO** (Kegel; Angular Velocity) | Center-mounted lidar; one unit reads up to 6 lanes (GO: up to 5) (S FAQ). | The mobile app shows 10 data points; the Coach's App up to 35 (S FAQ). Glossary (F): arrows board, breakpoint board/distance, **entry angle (51–55 ft), impact angle (57–59.5 ft), entry board (59.5 ft)**, launch speed/angle, RPM, rev/speed ratio, skid/hook/roll, speed loss by zone, pin-deck deflection. | Data lives in the cloud (S). Reports exist (S). **No user CSV/API documented**; Specto's API feeds broadcasters "in various formats" (S). | **No self-serve import.** Options: manual entry from the report, or a **partner deal** with Kegel/Angular Velocity. Most valuable data for **calibrating our lane model** (entry angle, breakpoint). | Partner = L |
| **Tenpin Doctors PinPoint + PinPoint Duo** | Bluetooth lane sensors at 7/15/40 ft; PAP from photo (S). | Spd, boards at 7/15/40 ft, PAP, layout (S). | UNKNOWN | Need a sample | — |
| **Tenpin Toolkit** | Manual video timing (S) | Spd, RPM (tap-counted), tilt/rotation (photo guide) | UNKNOWN | Manual entry | — |
| **Brunswick** | No consumer ball sensor found. Performance Index uses Specto to rate balls (S). OpenLane app "Pro Metrics" for Sync centers (S). | — | — | Performance Index **ball ratings** could be catalog data **if fetched per ball** (A). | — |

**Legality.** USBC ES Manual (F) does not allow moveable devices in a ball, and allows removable devices only for grip sizing. So sensor sessions import as **practice** by default. Flagged A: not a USBC ruling on sensors.

## 2. Scoring and league data

| Source | What exists | How to get it | Bowler-reachable? | Legal / ToS | Verdict |
|---|---|---|---|---|---|
| **LaneTalk** | Frame-by-frame games from connected centers; tags; pin leaves (F) | No user export. LaneLogic says "No export available" (F, competitor claim). **GDPR Art. 20 data-portability request** to LaneTalk AB, Stockholm (LaneLogic F; legal claim not independently verified, **A**). Center integrations: Pulse built-in (S); League Manager supports Qubica Conqueror X v14+, with Sync/Steltronic "on roadmap" (S). | Only via GDPR request | B2B ToS (S) covers centers; no scraping | **Accept whatever file a GDPR request returns.** Format UNKNOWN. |
| **Brunswick Sync** | League scores | Front Desk → More → Export Scores → "CDE Today" / "CDE All", sent to LeaguePals (LeaguePals help, F) | **No**: center staff only | Center's data | Out of scope for bowlers. Get scores via league software output. |
| **QubicaAMF Conqueror / BES X** | Games with pin positions | "Print Games" → **XML** export (Buffa Bowling help, S). LeaguePals Cloud Scoring (S). | Center only | — | A center-supplied XML importer is possible later; need a sample. |
| **Steltronic Focus** | League sessions | BLS (CDE) ↔ Focus import/export (S) | Center only | — | Out of scope. |
| **CDE BLS → LeagueSecretary.com** | Public league and bowler pages: standings, recaps, bowler history (S) | Public web; LaneLogic imports "your bowler page URL" (F) | **Yes, public pages** | **LeagueSecretary ToS not read: GAP.** Do not scrape until checked. | Prefer **user paste/CSV**. A URL import needs a ToS check or permission. |
| **CDE-format league standing PDFs** | Weekly standing sheets | LaneLogic accepts "CDE-format league standing sheets" (F) | Yes (secretaries hand them out) | User's own sheet | PDF parse feasible; need a sample. |
| **PinPal backup file** | Games, pin data, equipment (LaneLogic F) | In-app backup | Yes | — | Format UNKNOWN. LaneLogic proves it is parseable. Low priority. |
| **USBC averages** | Certified averages | "Find a Member" lookup, **login required** (S) | Yes, manual | Behind login: **no automated import** | Manual "certified average" field with date and source. |
| **Bowlero** | — | **No source found (GAP)** | — | — | Ask the user what they need from Bowlero. |

## 3. Oil patterns

**Kegel Pattern Library** (kegel.net/pattern-library-app, F):
- Pattern pages offer a **PDF pattern sheet** and a **"KOSI text file to load to your machines"**, plus a QR code and share links.
- **KOSI file structure is not publicly documented** in what we read (**UNKNOWN**).
- **Verdict:** keep the app's curated `patdata.js`. Add a "pattern from PDF/KOSI" import only after we have a real sample and confirm Kegel allows reuse. **A:** Kegel pattern data is Kegel's content.

## 4. Recommendation: a realistic import path

1. **Universal importer** (evidence-backed; LaneLogic imports LeagueSecretary, PinPal backups, CDE PDFs and LeaguePals, F):
   - The user picks a CSV.
   - The app shows a **preview plus column mapping** onto our schema: `date, session, ball, shot#, speed, rpm, tilt, rotation, pap, launchAngle, arrowsBoard, breakpointBoard, breakpointDist, entryBoard, entryAngle, score, leave, note, source`.
   - Units are explicit (mph vs km/h).
   - Unmapped columns are kept as raw `extra`.
   - Mappings are saved as **presets**, so a "Ruby preset" or "Witsee preset" is only added once we hold a real file.
   - Everything runs locally (CSP `script-src 'self'`, no third-party parser CDN).
   - Each imported row keeps `source` and the file name, so measured values are never mixed up with simulated ones.
2. **Order of presets:**
   1. **Ruby CSV** (available now, free app);
   2. **Witsee CSV** (Premium users);
   3. **LaneTrax CSV** (when it ships; until then manual entry from its PDF);
   4. **F5**, once an export exists.
3. **Manual "session averages" card:** speed, RPM, tilt, rotation, PAP, with a source dropdown (Ruby / Witsee / F5 / LaneTrax / Specto / pro shop / self). It covers every product today in under 30 s of typing.
4. **Scores:** manual entry first (demand #2). CDE PDF, Conqueror XML or GDPR files only once real samples exist.
5. **Never:**
   - scraping (LaneTrax ToS forbids it; LeagueSecretary ToS unread);
   - reverse-engineering apps or BLE protocols (LaneTrax ToS §2.2 forbids reverse engineering);
   - storing third-party credentials.

**What we need from the user:**
1. One real **Ruby CSV** export (shot and session).
2. Whether they have **Witsee Premium** or an F5; one CSV if available.
3. One **LaneTrax PDF** report.
4. Their center's scoring system: Brunswick Sync / Qubica Conqueror or BES X / Steltronic / other.
5. Whether their league posts to LeagueSecretary.

## 5. Source list

**Fetched (F):**
- LaneTrax App Store id6475736816 (listing and reviews)
- https://lanetrax.app/terms
- Ruby Bowling App Store id6762580021 and rubybowling.com
- https://www.witsee.com/mobile-app/
- https://www.stormbowling.com/f5-bowling-sensor
- Specto Terms glossary (Kegel)
- LaneTalk App Store id493763132
- https://lanelogic.net/from-lanetalk
- LeaguePals help: Brunswick Sync CDE export
- https://www.kegel.net/pattern-library-app
- USBC ES Manual 03/26

**Search excerpts (S):**
- docs.lanetrax.app (llms.txt lists an OpenAPI spec; fetching openapi.json returned 404/empty)
- Witsee shop and about pages (company Witsee Tech, UAB)
- F5 Bowling App Store id6805571218
- r/Bowling F5 and Ruby threads
- AthleteRX
- bowlsense.io
- Tenpin Doctors / Toolkit listings
- Specto FAQ / Angular Velocity
- lanetalk.com integrations
- Buffa Bowling (Conqueror XML)
- Steltronic BLS
- LeagueSecretary
- USBC Find a Member
- pitchLogic / F5 Sports

**Not found / gaps:**
- LeagueSecretary ToS
- Ruby ToS
- F5 export
- KOSI format
- Bowlero data
