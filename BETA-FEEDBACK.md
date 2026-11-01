# Detoxcellence — beta feedback log (Android internal track → Apple's Q4 evidence)

Started 2026-10-31. Every note a tester gives becomes one row: what was seen, what changed, and the build or OTA update
that carried the change. This file is the dated record Apple's review asks for — write what happened, never a summary.

| date | tester | note | change | build / OTA |
|---|---|---|---|---|
| 2026-10-31 | Jukka (fleet-wide) | Bottom nav missing on pushed screens | The entry page is a shared route under every tab group `app/(tabs)/(scan,index,score,swaps)/exposure/[slug].tsx` — opens inside the current tab, tab bar stays | next build (1.1.0) |
| 2026-10-31 | Jukka (fleet-wide) | "Way too much text … 80–90 % needs to go" | Index: no count/disclosure/empty-state prose; Scan: one-line hints only; Home Check: question + one sub line; entry page: no arithmetic table, no "evidence behind each rating" prose, no disclaimer; Swaps: switch/day/time/rows; About: one-sentence description + credits only | next build (1.1.0) |
| 2026-10-31 | Jukka (fleet-wide) | "Not up to date with the latest features" | Site [HOME-REFOCUS] 10-31 ported: Index browses by ROOM (export 1.7.0 `room`), PFAS-at-home and Older-homes door chips, Home Check v1 (12 house questions, room-by-room report, "do this first") replaces the lifestyle Exposure Score — scoring parity-tested against the site's quiz.js; swap reminder starts from the worst room; entry pages show the record's guidance steps | next build (1.1.0) |
| 2026-11-01 | Jukka ("apps have their latest icons applied") | Old 10-01…10-16 mark on launcher, splash, Play listing | Studio icon family A (LINE) applied: launcher, adaptive layers, splash mark, notification icon, Play 512 (assets/icon-family) | 1.1.1 — build rolled out to internal testers 2026-11-01 |
