import { Stack } from "expo-router";
import { DisplayTitle, useStudioTheme, VENTURE_NAME } from "../../../src/lib/chrome";
import { tabRootOptions } from "../../../src/studio/headers";

/** Tab root "Score" — a native Stack header with the "i" (design/APP-STANDARD.md § 2). */
export default function Layout() {
  const t = useStudioTheme();
  return (
    <Stack screenOptions={tabRootOptions(t, VENTURE_NAME, { renderTitle: (title) => <DisplayTitle title={title} color={t.ink} /> })}>
      <Stack.Screen name="score" options={{ title: "Score" }} />
    </Stack>
  );
}
