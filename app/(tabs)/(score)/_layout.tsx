import { Stack } from "expo-router";
import { DisplayTitle, useStudioTheme, VENTURE_NAME } from "../../../src/lib/chrome";
import { tabRootOptions } from "../../../src/studio/headers";
import { scanHome } from "../../../src/lib/nav";

/** Tab root "My home" ([DX-MY-HOME] 2026-11-06: route "/" = index.tsx → the same screen as score.tsx) — a native Stack header with the "i" (design/APP-STANDARD.md § 2). */
export default function Layout() {
  const t = useStudioTheme();
  return (
    <Stack screenOptions={tabRootOptions(t, VENTURE_NAME, { renderTitle: (title) => <DisplayTitle title={title} color={t.ink} onPress={() => scanHome()} /> })}>
      <Stack.Screen name="index" options={{ title: "My home" }} />
      <Stack.Screen name="score" options={{ title: "My home" }} />
    </Stack>
  );
}
