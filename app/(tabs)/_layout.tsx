import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";
import { useStudioTheme } from "../../src/lib/chrome";
import { ICONS } from "../../src/studio/icons";
import { alpha } from "../../src/studio/theme";

/**
 * The platform's own tab bar — design/APP-STANDARD.md § 2: iOS draws its real tab bar with SF Symbols, Android the
 * Material 3 navigation bar with Material Symbols; an icon + a label on every tab. The venture enters only as the
 * selected tint (the link tint, DESIGN.md § App). Each tab is its own Stack, so every tab root has the "i".
 * Glyphs from APP-STANDARD § 3: Scan = "Scan (camera)", Index = "an index", Score = "Score", Swaps = "Tips / nudges".
 * Scan is the first tab and the landing route (HEALTH-TRIO-DAY C2, docs/scan-flow.md rule 1).
 */
export default function TabsLayout() {
  const t = useStudioTheme();
  const android = Platform.OS === "android";
  return (
    <NativeTabs
      tintColor={t.link}
      labelVisibilityMode="labeled"
      backgroundColor={android ? t.panel : undefined}
      indicatorColor={android ? alpha(t.link, 0.15) : undefined}
      iconColor={android ? { default: t.muted, selected: t.link } : undefined}
    >
      <NativeTabs.Trigger name="(scan)">
        <NativeTabs.Trigger.Icon sf={ICONS.scan.sf} md={ICONS.scan.md} />
        <NativeTabs.Trigger.Label>Scan</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(index)">
        <NativeTabs.Trigger.Icon sf={ICONS.index.sf} md={ICONS.index.md} />
        <NativeTabs.Trigger.Label>Index</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(score)">
        <NativeTabs.Trigger.Icon sf={ICONS.score.sf} md={ICONS.score.md} />
        <NativeTabs.Trigger.Label>Score</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(swaps)">
        <NativeTabs.Trigger.Icon sf={ICONS.tips.sf} md={ICONS.tips.md} />
        <NativeTabs.Trigger.Label>Swaps</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
