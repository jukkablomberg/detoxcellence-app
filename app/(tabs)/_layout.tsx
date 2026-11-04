import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";
import { useStudioTheme } from "../../src/lib/chrome";
import { useScheme, useTheme } from "../../src/lib/theme";
import { ICONS } from "../../src/studio/icons";
import { alpha } from "../../src/studio/theme";

/**
 * [DX-APP-READER] 2026-11-02: tab order = the site's header (PFAS at home · Older homes · The Index · … · Home Check)
 * and the 10-31 readers: Index (route "/", the PFAS/Older doors as chips) → Home Check (north star) → Scan (the lens,
 * the phone's own way into the Index) → Swaps. Scan was the front page before.
 * The platform's own tab bar — design/APP-STANDARD.md § 2: iOS draws its real tab bar with SF Symbols, Android the
 * Material 3 navigation bar with Material Symbols; an icon + a label on every tab. The venture enters only as the
 * selected tint (the link tint, DESIGN.md § App). Each tab is its own Stack, so every tab root has the "i".
 * Glyphs from APP-STANDARD § 3: Scan = "Scan (camera)", Index = "an index", Score = "Score", Swaps = "Tips / nudges".
 * Scan is the first tab and the landing route (HEALTH-TRIO-DAY C2, docs/scan-flow.md rule 1).
 */
export default function TabsLayout() {
  const t = useStudioTheme();
  const android = Platform.OS === "android";
  // [DX-APP-SCHEME-1104] The web export draws expo-router's own tab pill (#272727 by default, whatever the scheme) —
  // give it the scheme's tokens there (critic 11-04). Phones keep the platform's own bar, tinted as before.
  const web = Platform.OS === "web";
  const p = useTheme();
  const dark = useScheme() === "dark";
  const webBg = dark ? p.panel : p.panel2;
  const webChip = dark ? p.panel2 : p.ground;
  return (
    <NativeTabs
      tintColor={t.link}
      labelVisibilityMode="labeled"
      labelStyle={web ? { default: { color: dark ? p.muted : p.ink }, selected: { color: dark ? "#B5D4CA" : p.link } } : undefined}
      backgroundColor={android ? t.panel : web ? webBg : undefined}
      indicatorColor={android ? alpha(t.link, 0.15) : web ? webChip : undefined}
      iconColor={android ? { default: t.muted, selected: t.link } : undefined}
    >
      <NativeTabs.Trigger name="(index)">
        <NativeTabs.Trigger.Icon sf={ICONS.index.sf} md={ICONS.index.md} />
        <NativeTabs.Trigger.Label>Index</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(score)">
        <NativeTabs.Trigger.Icon sf={ICONS.score.sf} md={ICONS.score.md} />
        <NativeTabs.Trigger.Label>Home Check</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(scan)">
        <NativeTabs.Trigger.Icon sf={ICONS.scan.sf} md={ICONS.scan.md} />
        <NativeTabs.Trigger.Label>Scan</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(swaps)">
        <NativeTabs.Trigger.Icon sf={ICONS.tips.sf} md={ICONS.tips.md} />
        <NativeTabs.Trigger.Label>Swaps</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
