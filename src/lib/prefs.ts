import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext } from "react";
import { Appearance, Platform } from "react-native";
import type { SchemePref } from "./theme";

/**
 * [DX-APP-SCHEME-1104] The reader's settings (APP-STANDARD § 8.5; VINCAP's src/lib/prefs.tsx, ported): the scheme —
 * System by default (the app followed the phone before this), Dark or Light by choice. On this phone only (AsyncStorage),
 * no account, nothing sent.
 */
export type Prefs = { scheme: SchemePref };
export const DEFAULT_PREFS: Prefs = { scheme: "system" };
const KEY = "detoxcellence.prefs.v1";

export function parsePrefs(raw: string | null | undefined): Prefs {
  try {
    const p = raw ? (JSON.parse(raw) as Partial<Prefs>) : {};
    return { scheme: p.scheme === "dark" || p.scheme === "light" ? p.scheme : "system" };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function readPrefs(): Promise<Prefs> {
  try {
    return parsePrefs(await AsyncStorage.getItem(KEY));
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function writePrefs(p: Prefs): Promise<void> {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(p)); } catch { /* a refused write keeps the session's choice */ }
}

/** Pins the native surfaces too (status bar, iOS tab-bar material, Android system bars, keyboards): RN's app-level
 *  override, JS-only (no native module). The web export has no such override — the SchemeContext carries it there. */
export function pinNativeScheme(s: SchemePref): void {
  if (Platform.OS === "web") return;
  try { Appearance.setColorScheme(s === "system" ? "unspecified" : s); } catch { /* older runtime: the context still paints */ }
}

/** The root layout owns the choice; Settings reads and sets it through this. */
export const PrefsContext = createContext<{ prefs: Prefs; setScheme: (s: SchemePref) => void }>({ prefs: DEFAULT_PREFS, setScheme: () => {} });
export function usePrefs() {
  return useContext(PrefsContext);
}
