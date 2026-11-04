import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { Platform, View, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { startIndex } from "../src/lib/exposures";
import { installForegroundHandler, refillReminder } from "../src/lib/reminders";
import { fonts, palettes, resolveScheme, SchemeContext, type SchemePref } from "../src/lib/theme";
import { pinNativeScheme, PrefsContext, readPrefs, writePrefs, type Prefs } from "../src/lib/prefs";
import { BrandMoment, holdNativeSplash } from "../src/studio/BrandMoment";
import { useStudioTheme } from "../src/lib/chrome";

// design/APP-STANDARD.md § 1: the native splash stays up until the brand moment draws the same picture.
holdNativeSplash();

/** Opened by tapping a swap reminder → straight to the entry, no brand moment (APP-STANDARD § 1.6). */
const openedFromReminder = (): Promise<boolean> =>
  Platform.OS === "web" ? Promise.resolve(false) : Notifications.getLastNotificationResponseAsync().then((r) => !!r);

export default function RootLayout() {
  const system = useColorScheme();
  // [DX-APP-SCHEME-1104] Settings → Scheme (System · Dark · Light). Read before the navigator mounts so a pinned reader
  // never sees the other scheme flash; a change repaints live (context + RN's app-level override for native surfaces).
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  useEffect(() => { void readPrefs().then((p) => { pinNativeScheme(p.scheme); setPrefs(p); }); }, []);
  const setScheme = useCallback((s: SchemePref) => {
    const next = { scheme: s };
    pinNativeScheme(s);
    setPrefs(next);
    void writePrefs(next);
  }, []);
  const pinned = prefs && prefs.scheme !== "system" ? prefs.scheme : null;
  const scheme = resolveScheme(prefs?.scheme ?? "system", system);
  const t = scheme === "dark" ? palettes.dark : palettes.light;
  const [fontsLoaded] = useFonts({
    [fonts.display]: require("../assets/fonts/LeagueGothic-Regular.ttf"),
    [fonts.heading]: require("../assets/fonts/Inter-ExtraBold.ttf"),
    [fonts.semibold]: require("../assets/fonts/Inter-SemiBold.ttf"),
    [fonts.medium]: require("../assets/fonts/Inter-Medium.ttf"),
    [fonts.body]: require("../assets/fonts/Inter-Regular.ttf"),
  });
  const [brandDone, setBrandDone] = useState(false);
  const studioTheme = useStudioTheme();

  // The index: the cached copy if newer than the bundle, then one GET to detoxcellence.com. Then refill the
  // weekly swap plan so the reminders never run out while the app is in use.
  useEffect(() => {
    void startIndex().then(() => refillReminder());
  }, []);

  // A tapped reminder opens its entry. Native only.
  useEffect(() => {
    if (Platform.OS === "web") return;
    installForegroundHandler();
    const open = (r: Notifications.NotificationResponse | null) => {
      const url = (r?.notification.request.content.data as { url?: string } | undefined)?.url;
      if (r && typeof url === "string" && url.startsWith("/exposure/")) router.push(url as never);
    };
    const cold = setTimeout(() => void Notifications.getLastNotificationResponseAsync().then(open), 900);
    const tap = Notifications.addNotificationResponseReceivedListener(open);
    return () => {
      clearTimeout(cold);
      tap.remove();
    };
  }, []);

  if (!fontsLoaded || !prefs) return <View style={{ flex: 1, backgroundColor: t.ground }} />;

  const header = {
    headerStyle: { backgroundColor: t.ground },
    headerTintColor: t.ink,
    headerShadowVisible: false,
    headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 17, color: t.ink },
    headerBackButtonDisplayMode: "minimal" as const,
    contentStyle: { backgroundColor: t.ground },
  };

  return (
    <SafeAreaProvider>
      <SchemeContext.Provider value={pinned}>
      <PrefsContext.Provider value={{ prefs, setScheme }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={header}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "Detoxcellence" }} />
        <Stack.Screen name="about" options={{ title: "About" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
      {/* Overlay, not a replacement: the navigator is mounted underneath, so a tapped reminder lands. */}
      {!brandDone ? (
        <BrandMoment
          venture="Detoxcellence"
          ground={t.ground}
          mark={require("../assets/splash-mark.png")}
          lockupColor={t.muted}
          ready={fontsLoaded}
          skip={openedFromReminder}
          onDone={() => setBrandDone(true)}
        />
      ) : null}
      {/* First-use intro (PNF-8) — OFF since [APP-INTRO-OFF] 2026-11-02 (Jukka: the intro screenshots are stale; the app
          opens on the Index instead). Re-mount <FirstUseIntro …/> once assets/intro is re-shot from this UI. */}
      </PrefsContext.Provider>
      </SchemeContext.Provider>
    </SafeAreaProvider>
  );
}
