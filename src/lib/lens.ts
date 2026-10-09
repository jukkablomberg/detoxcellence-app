import lensFile from "../data/lens-detoxcellence.json";
import labelsFile from "../../modules/health-camera/labels.json";
import type { Scored } from "../../modules/health-camera/core";
import { burdenFirst, hasSwap } from "./score";

/**
 * The Detox lens (HEALTH-TRIO-DAY C2): engine label → Exposure Index row(s). Pure — no React Native — so the scan
 * screen, scripts/lens.test.mjs and scripts/lens-measure.mjs run the same code. The engine (modules/health-camera,
 * a byte copy of FatTonic's) ranks all 99 labels; this file decides what Detoxcellence offers from that ranking.
 * No new numbers: every row, score and swap shown comes from the Exposure Index.
 */
export type LensEntry = { row?: string; rows?: string[]; ask?: string };
export const LENS = lensFile.map as Record<string, LensEntry>;
type LabelMeta = { id: string; name: string; lens?: string[] };
const META = new Map((labelsFile.labels as LabelMeta[]).map((l) => [l.id, l]));

/** "a non-stick frying pan" → "Non-stick frying pan". */
export function displayName(label: string): string {
  const n = (META.get(label)?.name ?? label.split(":")[1].replace(/-/g, " ")).replace(/^(a|an) /, "");
  return n.charAt(0).toUpperCase() + n.slice(1);
}

export const rowsFor = (label: string): string[] => {
  const e = LENS[label];
  return e ? (e.rows ?? (e.row ? [e.row] : [])) : [];
};

export type Candidate = { label: string; score: number; name: string; rows: string[]; ask: string | null; inLens: boolean };

export function toCandidate(s: Scored): Candidate {
  const e = LENS[s.label];
  return { label: s.label, score: s.score, name: displayName(s.label), rows: rowsFor(s.label), ask: e?.ask ?? null, inLens: !!e };
}

/**
 * docs/scan-flow.md rule 2 — never a silent single answer: up to three lens candidates from the engine's ranking,
 * best first; when the engine's best guess is not something Detoxcellence rates (an avocado, a coffee), that guess,
 * named honestly.
 */
export function offer(ranked: Scored[]): { offTopic: Candidate | null; picks: Candidate[] } {
  const all = ranked.map(toCandidate);
  const offTopic = all[0] && !all[0].inLens ? all[0] : null;
  return { offTopic, picks: all.filter((c) => c.inLens).slice(0, 3) };
}

/**
 * ROOM CHECK — one photo of a room or a shelf → what the camera may have seen → the matching rows ordered by the
 * Index's own Detox Score (highest burden first) → the top swap. No room score (no new math). "May have seen" =
 * the lens labels among the engine's top ROOM_K. A label with a follow-up (rows + ask) contributes its FIRST row,
 * the default reading (nonstick → PTFE, a can → BPA lining, strawberries → conventional) — the reader opens it to
 * choose. Each row appears once.
 */
export const ROOM_K = 8;
export function roomCheck<E extends { slug: string; score: number; name: string; swap: string }>(ranked: Scored[], bySlug: (s: string) => E | undefined) {
  const seen: { label: string; name: string; entry: E }[] = [];
  for (const s of ranked.slice(0, ROOM_K)) {
    const slug = rowsFor(s.label)[0];
    const entry = slug ? bySlug(slug) : undefined;
    if (entry && !seen.some((x) => x.entry.slug === entry.slug)) seen.push({ label: s.label, name: displayName(s.label), entry });
  }
  seen.sort((a, b) => burdenFirst(a.entry, b.entry));
  const top = seen.find((x) => hasSwap(x.entry)) ?? null;
  return { seen, top };
}
