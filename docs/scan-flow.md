# Scan flow — Detoxcellence's implementation

The rules are FatTonic's and live there: **`projects/fattonic/repo-app/docs/scan-flow.md`** (canonical with the engine,
`docs/camera-engine.md` beside it). This file says how Detoxcellence meets each rule and what only the phone can check.
Engine: a byte copy of FatTonic's `modules/health-camera` (`npm run check:camera-sync`); lens: `src/data/lens-detoxcellence.json`
(26 labels → Exposure Index rows; rows + ask = one follow-up tap); screen: `app/(tabs)/(scan)/index.tsx`.

| rule | here | proof (`scripts/app-render.mjs`, web export 390×844, detoxcellence.com blocked) |
|---|---|---|
| 1 front page = the camera | Scan is the first tab and `/`; the target is 358 pt (42 % of 844) above the fold; tips + privacy line, Room check, search, recent scans, Browse the aisles below | `r1TargetAboveFold` `r1TargetBig` `r1LittleAboveTarget` `r1HasAisles` |
| 2 never a silent single answer | up to three "Is it…" chips with the A9 reference photo; an off-lens best guess is named; a two-row label asks one question; search under the chips; Scan again | `r2ChipsWithPhoto` `r2AskQuestion` |
| 3 one item page per row | every tap → `/exposure/<slug>` on the root stack, platform back returns to the chips / the question | `r3OneEntryPage` `r3BackReturnsToQuestion` |
| 4 always a way home | header back on every non-home state; the brand in every tab header; Scan another at the end of each entry; Android back; the Scan tab | `r4PickHasBack` `r4HeaderBackHome` `r4BrandHome` `r4ScanAnotherHome` |
| 5 acceptance is a script | 31 named checks, 0 page errors; all 12 Detox evaluation classes resolve to their row (`c2TwelveDetoxClassesResolve`, `?demo=<label>` — web only) | `c1-render-result.json` |

**Engine measured through this lens** (`scripts/lens-measure.mjs`, the 84 Detox evaluation photos of camera-lab, same
ONNX file, rank k = 8 → `offer()`): the right label is among the three chips for **77/84 (91.7 %)**, first chip 60/84
(71.4 %); every class's row resolves. Per class: `projects/fattonic/camera-lab/c2-detox-lens-2026-10-09.csv`.

**Phone-check list (native only):** the live camera and permission prompt · pressing the Scan tab while on the chips
returns home (the web tab list ignores re-selecting the active tab) · Android hardware back · a room photo on a real
kitchen shelf · the shutter on iOS (capture before unmount, FatTonic 10-07).
