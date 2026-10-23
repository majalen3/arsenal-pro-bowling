# LaneTrax Session Report fixture (derived, anonymized)

- `session-report.words.json`: positioned text runs `{p, x, y, t}`.
  - They were decoded from **one** LaneTrax "Session Report" PDF (jsPDF 3.0.4, 5 pages) supplied by the owner.
  - Decoding used Flate inflate + the embedded font's ToUnicode CMap. Coordinates are PDF points (origin bottom-left).
- `session-report.expected.json`: the canonical record the parser must produce from the words (see `docs/DATA_SYSTEM.md` §6.2), including the two expected warnings.

**Removed or changed vs the original**
- The session date was replaced by `January 1, 2000`.
- The repeating page footer was removed.
- All images (radar chart, lane diagrams, the 13 per-shot charts) were dropped.

The original contains no bowler name, center or lane in its text. **The raw PDF is not in this repo and must never be committed** (the repo is public).

The real-file decode test runs only when `LANETRAX_SAMPLE=/path/to/file.pdf` is set; otherwise it is skipped.
