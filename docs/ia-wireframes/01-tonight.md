# Wireframe 01: Tonight (get ready). Fits about 1.3 screens before details

_All names and numbers are example values for layout only, not data._

```
┌ Tonight ──────────────────── (Me) ┐
│ Where are you bowling?             │
│ (League) (Tournament) (Practice)   │
│ (New center) (Sport)               │
│ Lanes: House shot · fresh  [edit ›]│  ← one row; pattern/center/surface open a sheet
├────────────────────────────────────┤
│ TONIGHT'S BAG · 3          [edit ›]│  ← "edit" = the Bag builder (wireframe 03)
│ ① Rattler Big Bite   Start ball    │
│ ② Ordnance C4        If it hooks   │
│                      early         │
│ ③ Ice Storm          Spares        │
│ Left at home: 19 · why? ›          │
├────────────────────────────────────┤
│ START LINE   Right-handed · change │  ← handedness visible (autonomy)
│ Stand 17 · Aim 10 at the arrows ›  │  ← opens Lane/Target
├────────────────────────────────────┤
│ WHO'S BOWLING  Just me ▾           │  ← Just me / League team / Baker
│ [+ Add a bowler]                   │  ← only when team/Baker; sheet: name, average, Done
├────────────────────────────────────┤
│ ███████  Start bowling  ███████    │  ← 56 px gold button, thumb zone, goes to Bowl
│ Import results                     │
└────────────────────────────────────┘
More details (games, goal, event date) ▸ collapsed
```

Removed from Tonight: the quick-log pad (moved to Bowl), the older first-ball/Weaker/Stronger card (merged into the bag rows' roles), and the bag-size toggle (lives in the builder).
