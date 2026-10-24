# Wireframe 04: Bag tab (My balls, one Status)

_All names and numbers are example values for layout only, not data._

```
┌ Bag ───────────────── [+ Add ball] ┐
│ Tonight's bag: 3 packed   [Build ›]│
│ (All 22) (In my bag 6) (At home 12)│  ← filter chips = Status
│ (At the pro shop 3) (Retired 1)    │
├────────────────────────────────────┤
│ ● Rattler Big Bite   In my bag  ▾  │  ← tap ▾ = Status sheet (4 choices), 2 taps
│   58 games · service in 12         │
│ ● Super Nova         At home    ▾  │
│ ● Hy-Road Pearl      At the pro    │
│                      shop ▾        │
│ …                                  │
├────────────────────────────────────┤
│ Compare balls ›   Insights ›       │
│ Armory view ›  (pedestals, flavour)│
└────────────────────────────────────┘
```

**Status** (one field, used everywhere):

| Status | Offered by the builder? | Offered in Bowl's ball chip? |
|---|---|---|
| In my bag | yes | yes |
| At home | yes, marked "grab from home" | yes |
| At the pro shop | no; shown in Why not | no |
| Retired | no; history kept, can be restored | no |
