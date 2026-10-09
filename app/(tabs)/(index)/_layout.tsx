import { Stack } from "expo-router";
import { DisplayTitle, useStudioTheme, VENTURE_NAME } from "../../../src/lib/chrome";
import { tabRootOptions } from "../../../src/studio/headers";
import { scanHome } from "../../../src/lib/nav";

/** Tab root "Index" — a native Stack header with the "i" (design/APP-STANDARD.md § 2). */
export default function Layout() {
  const t = useStudioTheme();
  return (
    <Stack screenOptions={tabRootOptions(t, VENTURE_NAME, { renderTitle: (title) => <DisplayTitle title={title} color={t.ink} onPress={() => scanHome()} /> })}>
      <Stack.Screen name="exposures" options={{ title: "Index" }} />
    </Stack>
  );
}
