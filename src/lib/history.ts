import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Driver } from "./quiz";

/**
 * NATIVE VALUE 3 of 3 ("score history"), declared in venture.json and named in the store review notes.
 *
 * Every completed Exposure Score is kept on this phone — date, score, profile and the answers — in the app's own
 * storage and nowhere else, so the reader sees the score move as they make swaps. Nothing is sent anywhere (the
 * site's email form is not in the app). Uninstalling, clearing the app's storage, or Clear history erases it.
 */
export type HistoryEntry = { at: number; pct: number; driver: Driver; answers: number[] };

const KEY = "detoxcellence.score.history.v1";
const MAX_ENTRIES = 365;

export async function readHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is HistoryEntry => !!e && typeof e.at === "number" && typeof e.pct === "number" && typeof e.driver === "string");
  } catch {
    return [];
  }
}

export async function appendHistory(entry: HistoryEntry): Promise<HistoryEntry[]> {
  const list = [...(await readHistory()), entry].slice(-MAX_ENTRIES);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* storage refused: the result is still on screen */ }
  return list;
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch { /* no-op */ }
}

export const newestFirst = (list: HistoryEntry[]) => [...list].sort((a, b) => b.at - a.at);

/** The latest profile, or null before the first score — the swap reminder starts from it. */
export async function latestDriver(): Promise<Driver | null> {
  const l = newestFirst(await readHistory());
  return l[0]?.driver ?? null;
}
