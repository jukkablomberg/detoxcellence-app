import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * [DX-APP-PLAN-1106] The swaps the reader ticked off on the Plan tab — slugs, on this phone only (critic 11-06: a
 * "Done" check per card; done cards drop to the bottom, muted, and leave the reminder schedule).
 */
const KEY = "detoxcellence.swapsdone.v1";

export async function readDone(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function toggleDone(slug: string): Promise<string[]> {
  const cur = await readDone();
  const next = cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug];
  try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage refused: the tick lasts this session */ }
  return next;
}
