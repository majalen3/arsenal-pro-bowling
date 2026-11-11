# Home = the Building, scoring = the game (2026-11-10, offline build v69)

Owner, 2026-11-10: "We should have like the building then the scoring page should be an in game page."
Live eval the same day (360 px, fresh profile): search hid most of a ball family, packing tonight's bag was confusing, and the
5-tab bar made the score pad (Bowl) look like a second home.

## The flow a stranger should read

```
arrive ──> Building (home) ──> Bag: pack tonight ──> Building: Start bowling ──> Game page: score ──> End night ──> Building
              │   ▲                                                         │  ▲
              │   └──────────────── ← Building (Leave; the night stays open) ─┘  │
              └── Back to the game · game N ──────────────────────────────────────┘
```

1. **Arrive.** A new phone opens on the search-first Welcome (empty arsenal, nothing preloaded). Save or Skip lands in the Building.
   A returning bowler opens straight into the Building, or straight into the game if a night is in progress.
2. **The Building** (`#/tonight`, tab "Building", house icon) is home base: where you are bowling, the start ball and line,
   your hand, who is bowling, tonight's bag, and **Start bowling**. With an empty arsenal it says so and offers
   **Find my balls** (catalog search), **Add a ball with its specs**, or an example arsenal; it never preloads anyone's balls.
   The tab bar has four rooms: **Building · Bag · Results · Learn** (Me stays top-right).
3. **Pack.** The Bag tab is your locker: *Tonight's bag* (what you take tonight) vs *All my balls* (everything you own),
   with one plain line saying so. Bring N fills to N; Bring on a ball adds it. Packing never removes a ball from the arsenal.
4. **Enter the game.** Start bowling opens `#/bowl`, the **game page**: title "Game", an "In the game" pill and a
   **← Building** button. No tab bar or rail, no Help or Me buttons, no badges, share offers, test panels, bag advisor or
   Bag builder link. In reach: the score pad, the ball chip, Stand · Aim (Lane/Targeting), Weaker/Stronger, and one fold with
   ball, lane and scoring details. Between games the same page offers Start game N+1 or End night.
5. **Leave and come back.** ← Building keeps the night open. The Building then leads with **Back to the game · game N**.
   Re-opening the app during a night lands back in the game (unless you just left it in this tab).
6. **Return.** End night saves the night and returns to the Building with a **Night saved** card (games, series), a link to
   the full night on Results and, once per night and only where the phone has a native share sheet, **Share this night**.

## What changed (this PR)

| Area | Before | Now |
|---|---|---|
| Tabs | Tonight · Bowl · Results · Bag · Learn | **Building** · Bag · Results · Learn (Bowl is a page, not a tab) |
| Home title | "Tonight" | "The building" |
| Score pad | `#/bowl` tab page with tab bar, Help, Me | Game page: no tab bar, Help or Me; ← Building; no bag advisor mid-game |
| End night | to the session page | back to the Building with Night saved + one-time native share |
| Empty home | "Load example arsenal" first | "Find my balls" (search) first; example last |
| Deep links | — | `#/tonight`, `#/bowl`, `#/session/…` unchanged; new aliases `#/building`, `#/game` |
| Status word | "In my bag" (read like tonight's bag) | "Ready to bring" (stored key `inBag` unchanged) |

Saved data is untouched: no event, key or schema changes; the stored status key, bag ids and routes are the same.

### Live-eval fixes bundled here
- **Search lists every match** (`cc/addball.js` `browse`): each typed word must start a word of brand + name (case,
  hyphen and II = 2 ignored) or the squashed text must appear inside it; the exact alias stays first, fuzzy candidates follow.
  "Hy-Road" now lists all 5, "Rattler" all 4, "Phaze" all 3. Used by Welcome, Add a ball and the QR kit.
- **Catalog:** 7 maker-sourced rows (Storm Phaze II, Phaze 4, Phaze AI; Roto Grip Attention Star; Hammer Black Widow 3.0,
  Purple Pearl Urethane; Motiv Venom Shock), each with its maker URL and the 2026-11-10 read date. Existing rows unchanged.
- **Second physical copy** is inserted directly under the ball it copies and named "#2", so nicknames land on the right ball.
- **Packing is additive** (`cc/bagedit.js`): Bring on a ball adds it (a full bag grows to N + 1) and never swaps a ball out.
  Raising Bring N keeps every packed ball and adds Ready, then At-home balls (balls with specs first). Lowering it takes out
  balls without specs first and never the last ball with specs, the spare or a pinned ball. Suggest again tops up to Bring N.

## Not in this version
- Lane and Targeting opened from the game still show the tab bar (they are shared tools, also reached from the Building and Learn).
- No new "building" artwork or brand photos: the house icon and the words do the work.
- The Building and Bag remain two tabs rather than one long screen, to keep the League Building within its 1110 px budget.
