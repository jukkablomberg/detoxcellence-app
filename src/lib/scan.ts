import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Recent scans, on the phone only: the label the reader confirmed, the row it opened, when. Never a photo.
 * Uninstalling or clearing the app's storage erases it.
 */
export type ScanRecord = { label: string; slug: string | null; name: string; at: number };
const KEY = "detoxcellence.scan.history.v1";
const MAX = 30;

export async function readScans(): Promise<ScanRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? (v as ScanRecord[]) : [];
  } catch {
    return [];
  }
}

export async function recordScan(r: ScanRecord): Promise<ScanRecord[]> {
  const list = [r, ...(await readScans()).filter((x) => !(x.slug && x.slug === r.slug))].slice(0, MAX);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* storage refused: the scan still opened its entry */ }
  return list;
}
