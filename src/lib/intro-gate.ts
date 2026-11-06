import AsyncStorage from "@react-native-async-storage/async-storage";
import { INTRO_FLAG_KEY, INTRO_SEEN } from "../studio/intro";

/**
 * [APP-INTRO-ON-1106] design/APP-INTRO-STANDARD.md rule 11 + 12, app-side (no kit change): the intro is for FRESH
 * installs only. Resolves true only when the intro may mount: intro.json is enabled (the OTA kill switch), the flag
 * was never written, and none of the app's own storage keys exist. A reader who used the app before this OTA (any key
 * present) is marked seen silently — no ambush after an update. Storage unreadable → false (never trap the reader).
 * Mount <FirstUseIntro/> only after this resolves: the kit reads the flag once, on mount.
 */
export async function introMayShow(enabled: unknown, priorUseKeys: readonly string[]): Promise<boolean> {
  if (enabled === false) return false;
  try {
    if ((await AsyncStorage.getItem(INTRO_FLAG_KEY)) === INTRO_SEEN) return false;
    const got = await AsyncStorage.multiGet([...priorUseKeys]);
    if (got.some(([, v]) => v != null)) {
      await AsyncStorage.setItem(INTRO_FLAG_KEY, INTRO_SEEN);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
