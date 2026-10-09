/**
 * The site's scoring, ported line for line from projects/detoxcellence/repo/build.js (scoreItem, band, slugify,
 * CONF). Pure — no React Native imports — so scripts/exposures.test.mjs runs it under Node against every row of
 * the site's published CSV (detox_score, band, id).
 */
export type BandLabel = "Minimal" | "Low" | "Moderate" | "High" | "Severe";

/** build.js scoreItem — 100 − 4.6×hazard − 3.4×exposure − 2.6×persistence, rounded, clamped 1–100. Higher = lower burden. */
export function scoreItem(x: { hazard: number; exposure: number; persistence: number }): number {
  let s = 100;
  s -= x.hazard * 4.6;
  s -= x.exposure * 3.4;
  s -= x.persistence * 2.6;
  return Math.max(1, Math.min(100, Math.round(s)));
}

/** build.js band — the site's five bands and verbs, word for word. */
export function band(s: number): { label: BandLabel; verb: string } {
  if (s >= 80) return { label: "Minimal", verb: "imposes minimal avoidable burden on your detox systems" };
  if (s >= 60) return { label: "Low", verb: "is a relatively low-burden choice" };
  if (s >= 40) return { label: "Moderate", verb: "adds a moderate, reducible exposure" };
  if (s >= 20) return { label: "High", verb: "is a significant avoidable exposure" };
  return { label: "Severe", verb: "is a major avoidable exposure worth cutting first" };
}

/** build.js slugify — the entry's id on the site (/exposure/<slug>.html). */
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** build.js CONF — evidence strength words. */
export const EVIDENCE = ["", "emerging", "moderate", "strong"] as const;
export const INPUTS = [
  ["hazard", "Chemical hazard", 4.6],
  ["exposure", "Everyday exposure", 3.4],
  ["persistence", "Persistence", 2.6],
] as const;

/** build.js `const hasSwap = x.swap && x.swap !== '—'` — a "—" swap means the entry is already the low-burden choice. */
export const hasSwap = (e: { swap: string }) => !!e.swap && e.swap !== "—";


/** Highest burden first (lowest Detox Score), then name — the site's `sort=burden`. */
export const burdenFirst = (a: { score: number; name: string }, b: { score: number; name: string }) => a.score - b.score || a.name.localeCompare(b.name);
