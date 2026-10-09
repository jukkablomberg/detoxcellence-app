import { Text, useColorScheme } from "react-native";
import type { StudioTheme } from "../studio/theme";
import { fonts, palettes } from "./theme";

/**
 * Integrity as the studio kit's skin — projects/detoxcellence/repo/DESIGN.md § App (2026-10-07).
 * The only place this app's look enters the studio chrome (design/APP-STANDARD.md § 6).
 */
export function useStudioTheme(): StudioTheme {
  const t = useColorScheme() === "dark" ? palettes.dark : palettes.light;
  return {
    ground: t.ground,
    panel: t.panel,
    ink: t.ink,
    muted: t.muted,
    hairline: t.border,
    link: t.link,
    radius: 16,
    fonts: { display: fonts.display, ui: fonts.semibold, body: fonts.body, mono: fonts.medium, eyebrow: fonts.semibold },
  };
}

export const VENTURE_NAME = "Detoxcellence";

/** The tab-root title in the venture's display face: League Gothic, uppercase (DESIGN.md: display = scores and headings). */
export function DisplayTitle({ title, color }: { title: string; color: string }) {
  return <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 30, letterSpacing: 0.3, textTransform: "uppercase", color }}>{title}</Text>;
}
