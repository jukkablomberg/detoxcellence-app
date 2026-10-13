import data from "./sister-lines.json";

/**
 * [HT-SISTER-LINES] One trio, three lenses: the ONE line a result card shows when a sister app reads the same thing.
 * Data = sister-lines.json, GENERATED in FatTonic by scripts/build-sister-lines.mjs from the three lenses (labels at
 * least two lenses map) and copied with the engine by sync-camera-engine. Keyed by the app's OWN index row.
 */
export type TrioLens = "fattonic" | "snapstress" | "detoxcellence";
export type SisterLine = { label: string; sister: TrioLens; app: string; text: string; url: string };

const LINES = data.lines as Record<TrioLens, Record<string, SisterLine>>;

export function sisterLine(lens: TrioLens, row: string | null | undefined): SisterLine | null {
  return (row && LINES[lens]?.[row]) || null;
}
