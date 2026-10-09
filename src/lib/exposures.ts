import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import bundled from "../data/exposures.json";

/**
 * NATIVE VALUE 1 of 3 ("exposure lookup offline"), declared in venture.json and named in the store review notes.
 *
 * The whole Exposure Index ships inside the app (src/data/exposures.json, a byte copy of the site's published
 * /data/export/exposures.json — scripts/sync-exposures.mjs, drift-checked), so every entry, its Detox Score,
 * swap, studies and sources work in airplane mode. When online the app refreshes from that same export and keeps
 * the last good copy. The score and band are COMPUTED here exactly as the site's build.js computes them
 * (scoreItem / band) — the export does not store them; scripts/exposures.test.mjs checks all rows against the
 * site's CSV (`detox_score`, `band`, `id`).
 */
export type Study = { doi?: string; pmid?: string; input: "hazard" | "exposure" | "persistence"; locator: string; claim: string; accessed: string };
export type Source = { name: string; url: string; retrieved: string };
export type Row = {
  name: string;
  category: string;
  context: string;
  hazard: number;
  exposure: number;
  persistence: number;
  evidence: 1 | 2 | 3;
  swap: string;
  note: string;
  studies?: Study[];
  sources?: Source[];
  unsourced?: { input: string; searched: string; reason: string }[];
};
export type IndexDoc = { dataset: string; version: string; released: string; licence: { name: string; url: string }; citation: string; methodology: string; rows: Row[] };

import { band, scoreItem, slugify, type BandLabel } from "./score";
export { band, burdenFirst, EVIDENCE, hasSwap, INPUTS, scoreItem, slugify, type BandLabel } from "./score";

export type Entry = Row & { slug: string; score: number; band: BandLabel; verb: string };

export function entries(doc: IndexDoc): Entry[] {
  return doc.rows.map((r) => {
    const score = scoreItem(r);
    const b = band(score);
    return { ...r, slug: slugify(r.name), score, band: b.label, verb: b.verb };
  });
}

export const SITE = "https://detoxcellence.com";
export const EXPORT_URL = `${SITE}/data/export/exposures.json`;
export const entryUrl = (slug: string) => `${SITE}/exposure/${slug}.html`;
export const studyUrl = (s: Study) => (s.doi ? `https://doi.org/${s.doi}` : s.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/` : null);

/** The Index categories, water and air first (the quiz calls them the fastest upgrades). */
export const CATEGORIES = ["Water", "Air", "Kitchen", "Plastics", "Food", "Personal Care", "Home", "Environment"] as const;

/* ---------------- the live copy: bundled, then the last good refresh ---------------- */
const CACHE_KEY = "detoxcellence.index.v1";
const BUNDLED = bundled as unknown as IndexDoc;

function valid(d: unknown): d is IndexDoc {
  const x = d as IndexDoc;
  return (
    !!x && typeof x.version === "string" && Array.isArray(x.rows) && x.rows.length > 100 &&
    x.rows.every((r) => typeof r?.name === "string" && typeof r.hazard === "number" && typeof r.exposure === "number" && typeof r.persistence === "number")
  );
}
const newer = (a: string, b: string) => {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return false;
};

let current: { doc: IndexDoc; list: Entry[]; from: "bundled" | "cached" | "live" } = { doc: BUNDLED, list: entries(BUNDLED), from: "bundled" };
const listeners = new Set<() => void>();
function set(doc: IndexDoc, from: "bundled" | "cached" | "live") {
  current = { doc, list: entries(doc), from };
  listeners.forEach((l) => l());
}

let started = false;
/** Called once at launch: the cached copy if it is newer than the bundle, then one GET to the site. */
export async function startIndex(): Promise<void> {
  if (started) return;
  started = true;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const cached: unknown = raw ? JSON.parse(raw) : null;
    if (valid(cached) && newer(cached.version, BUNDLED.version)) set(cached, "cached");
  } catch { /* the bundle stands */ }
  try {
    const res = await fetch(EXPORT_URL, { headers: { Accept: "application/json" } });
    if (!res.ok) return;
    const live: unknown = await res.json();
    if (!valid(live) || newer(current.doc.version, live.version)) return;
    set(live, "live");
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(live));
  } catch { /* offline: the bundled or cached copy stands */ }
}

export function getIndex() {
  return current;
}

export function useIndex() {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return current;
}

export function bySlug(slug: string): Entry | undefined {
  return current.list.find((e) => e.slug === slug);
}

/** Search the name, context and category — case- and accent-insensitive, every word must match. */
export function search(list: Entry[], q: string): Entry[] {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return list;
  return list.filter((e) => {
    const hay = norm(`${e.name} ${e.context} ${e.category}`);
    return words.every((w) => hay.includes(w));
  });
}

