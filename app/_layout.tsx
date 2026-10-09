import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Platform, View, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { startIndex } from "../src/lib/exposures";
import { installForegroundHandler, refillReminder } from "../src/lib/reminders";
import { fonts, palettes } from "../src/lib/theme";
import { BrandMoment, holdNativeSplash } from "../src/studio/BrandMoment";

// design/APP-STANDARD.md § 1: the native splash stays up until the brand moment draws the same picture.
holdNativeSplash();

/** Opened by tapping a swap reminder → straight to the entry, no brand moment (APP-STANDARD § 1.6). */
const openedFromReminder = (): Promise<boolean> =>
  Platform.OS === "web" ? Promise.resolve(false) : Notifications.getLastNotificationResponseAsync().then((r) => !!r);

export default function RootLayout() {
  const scheme = useColorScheme();
  const t = scheme === "dark" ? palettes.dark : palettes.light;
  const [fontsLoaded] = useFonts({
    [fonts.display]: require("../assets/fonts/LeagueGothic-Regular.ttf"),
    [fonts.heading]: require("../assets/fonts/Inter-ExtraBold.ttf"),
    [fonts.semibold]: require("../assets/fonts/Inter-SemiBold.ttf"),
    [fonts.medium]: require("../assets/fonts/Inter-Medium.ttf"),
    [fonts.body]: require("../assets/fonts/Inter-Regular.ttf"),
  });
  const [brandDone, setBrandDone] = useState(false);

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

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: t.ground }} />;

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
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={header}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "Detoxcellence" }} />
        <Stack.Screen name="exposure/[slug]" options={{ title: "Entry" }} />
        <Stack.Screen name="about" options={{ title: "About" }} />
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
    </SafeAreaProvider>
  );
}
