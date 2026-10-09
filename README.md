# Detoxcellence — the app (`com.detoxcellence.app`)

The Exposure Index on the phone. Built 2026-10-09 by HEALTH-TRIO-DAY track C (`projects/fattonic/HEALTH-TRIO-DAY-2026-10-07.md`
§ 3 C1–C3). Charter: the 10-06 block at the top of `projects/fattonic/README.md` (mobile-first; one camera engine built in
FatTonic, reused here — the Detox lens is C2). Shell = the studio standard (`design/APP-STANDARD.md`,
`design/APP-ABOUT-STANDARD.md`), look = `../repo/DESIGN.md` § App (Integrity).

## The three native features (venture.json → apps.json → review notes)

| feature | where | what proves it |
|---|---|---|
| exposure lookup offline | `src/lib/exposures.ts`, Index tab, `app/exposure/[slug].tsx` | the whole index bundled (`src/data/exposures.json`); `scripts/app-render.mjs` runs with detoxcellence.com blocked |
| swap reminders | `src/lib/reminders.ts` + `src/lib/swap-plan.ts`, Swaps tab | local notifications, 8 dated weeks ahead, refilled on launch; `scripts/reminders.test.mjs` |
| score history | `src/lib/history.ts`, Score tab | every Exposure Score kept on the phone with its date |

## Data spine (the site is the single source)

`npm run sync:exposures` copies `../repo/data/export/exposures.json` (the CC BY 4.0 `/data/` door) byte for byte and
generates `src/data/quiz.json` from the site's `assets/quiz.js` literals; `npm run check:exposures-sync` fails on any
drift and on any change to the five scoring rules the site keeps in code (red-proofed in `scripts/sync.test.mjs`).
A row is fixed AT THE SITE, released (version bump in `data/index-meta.json`), then synced — never edited here.
When online the app refreshes from the same export and keeps the last good copy.

## Checks

```
npm test                       # parity: every row's id/score/band vs the site CSV; the quiz vs the site's own quiz.js
                               # (fixed vectors + 400 random); the swap plan; the sync red-proof
npm run check:exposures-sync
npm run check:listing          # R1–R16; R16 = no "non-toxic" / "toxin-free" / "chemical-free" on any surface
npm run redproof               # every rule planted RED once, the clean tree GREEN
node ../../app-stores/scripts/app-standard-check.mjs .
npx expo export --platform web --output-dir web-export && \
  LD_LIBRARY_PATH="<OS>/_meta/render-audit/.browsers/lib" node scripts/app-render.mjs web-export <out>
```

`node_modules` is not kept on the mount (template rule R9): install from the lockfile in a scratch copy
(`rsync` the tree to the VM, `npm ci`), run `typecheck` / `export:web` / EAS there.

## Firewall

Information, not medical advice. No diagnosis or treatment claims; no detox-tea or supplement framing; no generic
claims (EU 2024/825, R16). Ratings are editorial and say so; every study and source is shown, and an input with no
study says "unsourced input". Publisher on every surface = Detoxcellence, not the Oy.

## Icon (provisional)

`scripts/store-assets.py` renders the site's own mark (❋, the glyph that leads the wordmark on detoxcellence.com) in
the Integrity sage — derived, not redrawn. The app icon is Jukka's word before the first store submission.
