# Detoxcellence — beta feedback log (Android internal track → Apple's Q4 evidence)

Started 2026-10-31. Every note a tester gives becomes one row: what was seen, what changed, and the build or OTA update
that carried the change. This file is the dated record Apple's review asks for — write what happened, never a summary.

| date | tester | note | change | build / OTA |
|---|---|---|---|---|
| 2026-10-31 | Jukka (fleet-wide) | Bottom nav missing on pushed screens | The entry page is a shared route under every tab group `app/(tabs)/(scan,index,score,swaps)/exposure/[slug].tsx` — opens inside the current tab, tab bar stays | next build (1.1.0) |
| 2026-10-31 | Jukka (fleet-wide) | "Way too much text … 80–90 % needs to go" | Index: no count/disclosure/empty-state prose; Scan: one-line hints only; Home Check: question + one sub line; entry page: no arithmetic table, no "evidence behind each rating" prose, no disclaimer; Swaps: switch/day/time/rows; About: one-sentence description + credits only | next build (1.1.0) |
| 2026-10-31 | Jukka (fleet-wide) | "Not up to date with the latest features" | Site [HOME-REFOCUS] 10-31 ported: Index browses by ROOM (export 1.7.0 `room`), PFAS-at-home and Older-homes door chips, Home Check v1 (12 house questions, room-by-room report, "do this first") replaces the lifestyle Exposure Score — scoring parity-tested against the site's quiz.js; swap reminder starts from the worst room; entry pages show the record's guidance steps | next build (1.1.0) |
| 2026-11-01 | Jukka ("apps have their latest icons applied") | Old 10-01…10-16 mark on launcher, splash, Play listing | Studio icon family A (LINE) applied: launcher, adaptive layers, splash mark, notification icon, Play 512 (assets/icon-family) | 1.1.1 — build rolled out to internal testers 2026-11-01 |

## 2026-11-02 — fleet feedback round 2 (Jukka, CoS session) → `c12ad1c`, OTA preview `01a19cb9`
**Jukka:** "huge amount of useless text… all of it that doesn't add tremendous value for the user needs to go… confusing… are the apps aligned with the venture charter, reader groups and website?" (said on CoinBucha, applies to every app).
**Alignment findings:** the app opened on Scan while the site's header (HOME-REFOCUS-IA 10-31) and the readers (PFAS households → older-home owners) open on the record; Scan's "Rooms" list duplicated the Index chips; the first-use intro carried stale screenshots.
**Changed:** tabs Scan · Index · Home Check · Swaps → **Index ("/") · Home Check · Scan (/scan) · Swaps**; Rooms list off Scan; Home Check empty tile one phrase; `[APP-INTRO-OFF]` (re-mount after a re-shoot from this UI).
**Word counts (visible strings):** scan 116→115 · index 24→24 · score 14→14 · swaps 30→30 · entry 13→13 — the 10-31 pass had already cut the copy; this round is IA.
**Open (out of this round):** `src/data/quiz.json` drifts from the site's `assets/quiz.js` (0122ff4) — `npm run sync:exposures` + commit; the sync control test is red until then. A `.git/refs/stash.lock` + one stash entry were left by a failed stash on the mount — drop once deletion is allowed.

## 2026-11-04 — About + Settings, the fleet rule (Jukka, CoS session; APP-STANDARD § 8.5) → OTA preview pending
**Jukka (on CoinBucha, applies to every app incl. Detoxcellence):** "same Jukka branding elements as VinCap … settings, dark/light".
**Changed:** About = VINCAP's — two lines on what it is + "Built and kept by Jukka Blomberg, Helsinki.", the policy line (listing `firstScreenDisclosure`) as the category line, **Settings** first in Help & legal (in-app ›). **Settings** (pushed): Scheme **System (default) · Dark · Light** — repaints live (context + RN app-level `Appearance.setColorScheme`, JS-only, no native change), stored on this phone (`detoxcellence.prefs.v1`); the weekly swap reminder shows its state there and opens Swaps (it stays on Swaps). Nothing removed. Sheet: both pinned schemes over a light phone.

**2026-11-04 shipped (CoS):** About + Settings (Scheme) — independent critic HOLD (web-only tab pill) → fixed 9c97001 · OTA preview `01a1a6fb` (android, 16:1x–16:3x EET). Production promote = Jukka's command. Phone check owed: switch scheme, relaunch, every tab repaints.

## 2026-11-06 — phone round (Jukka, CoS session; APP-STANDARD § 8.6 + § 8.7) → OTA preview pending (CoS ships)
**Jukka:** "Why is there some photo credits and open data & records in about section?" · "I don't understand what the 'Swaps' tab is supposed to be?" · (all apps) "we don't want the user to go to external website" · "few days ago, we wrote some good practices for all apps. Those should be also implemented now".
**Changed:** About = what it is + "Built and kept by" + policy line, then Settings (shows "Scheme: System/Dark/Light") · Privacy · Support. Photo credits, Methodology, Open data and detoxcellence.com moved (not cut) to **Settings › Credits & data** (`app/credits.tsx`, the last Settings row); `scripts/check-label-photos.mjs` now accepts credits.tsx (green + redproof 6/6). **Swaps → "Plan"** (route stays `/swaps`): one line "One safer swap a week, your worst room first.", the 8 coming swaps first, "Remind me weekly" (switch · day · time) under them; listing review note updated. Entry page: studies, sources and the sister line print as plain text (DOI/PMID selectable); the detoxcellence.com ↗ line went (the site is in Credits & data). § 8.6: reminder times in the phone's 12/24 h clock (`src/lib/locale.ts`); dates were already locale; reduce-motion already honoured by the kit's BrandMoment; scheme System default ✓.
**Sheet:** cloud `/root/w/sheets/detoxcellence-1106.png` (before · after light · after dark). **Tests:** 17/18 (the known quiz drift); word budget red only on scan.tsx (untouched).
