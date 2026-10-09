import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import { Alert } from "react-native";

/**
 * The tester channel — projects/app-stores/RELEASE-PIPELINE.md § 3.
 * One store binary per native change carries the "production" channel: users run what Jukka promoted. Jukka's own
 * phone follows "preview", where the agents publish every day's JS changes (`app-ship.sh <app> update`, free).
 * TESTER_TAPS taps on the About version line switch THIS device between the two channels. The switch is
 * expo-updates' setUpdateRequestHeadersOverride (SDK 54+, persisted natively); the AsyncStorage key only mirrors
 * it so the label can say "preview". It needs a build whose eas.json profile names a channel (EAS embeds the
 * expo-channel-name header) — every profile does since 2026-10-09.
 * Generated copy: edit projects/app-stores/studio-kit/src/, then run scripts/sync-studio-kit.py.
 */
export const TESTER_TAPS = 7;
const KEY = "studio.updates.channel";
const PREVIEW = "preview";

export async function testerOn(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === PREVIEW;
  } catch {
    return false;
  }
}

/** "1.0.1 · 3f9a2c1d · preview" — binary version, the running OTA update (absent on the embedded bundle), tester flag.
 *  The 8-char id is what `app-ship.sh` prints for the update group, so Jukka can see which change he is looking at. */
export function buildLabel(version: string, tester: boolean): string {
  const parts = [version];
  if (Updates.isEnabled && !Updates.isEmbeddedLaunch && Updates.updateId) parts.push(Updates.updateId.slice(0, 8));
  if (tester) parts.push(PREVIEW);
  return parts.filter(Boolean).join(" · ");
}

async function reloadLatest(): Promise<void> {
  try {
    const r = await Updates.checkForUpdateAsync();
    if (r.isAvailable) await Updates.fetchUpdateAsync();
  } catch {
    // offline or no update on this channel yet — the next launch checks again (checkAutomatically: ON_LOAD)
  }
  try {
    await Updates.reloadAsync();
  } catch {
    // reload is unavailable in some states; the next cold start applies the channel
  }
}

/** Toggle preview ⇄ production on this device. Returns the new state, or null when nothing changed. */
export async function toggleTester(): Promise<boolean | null> {
  if (!Updates.isEnabled) {
    Alert.alert("Updates are off in this build", "Development builds, Expo Go and the web cannot switch update channels.");
    return null;
  }
  const next = !(await testerOn());
  try {
    Updates.setUpdateRequestHeadersOverride(next ? { "expo-channel-name": PREVIEW } : null);
    await AsyncStorage.setItem(KEY, next ? PREVIEW : "production");
  } catch (e) {
    Alert.alert("Could not switch channel", String(e));
    return null;
  }
  Alert.alert(
    next ? "Tester mode on" : "Tester mode off",
    next
      ? "This phone now follows the preview channel. The app restarts with the latest preview."
      : "This phone is back on the production channel. The app restarts.",
    [{ text: "OK", onPress: () => void reloadLatest() }],
  );
  return next;
}
