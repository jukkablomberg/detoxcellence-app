import { useColorScheme, type TextStyle } from "react-native";

/**
 * Integrity — tokens from projects/detoxcellence/repo/DESIGN.md § App and the two token blocks of the site's
 * assets/style.css, nothing invented. Role names, never colour names. The app follows the phone's scheme
 * (DESIGN.md § App: the website's toggle has no app equivalent).
 */
const light = {
  ground: "#FFFFFF",
  panel: "#F4F4F4",
  panel2: "#E6E6E4",
  ink: "#1C1C1C",
  ink2: "#343434",
  muted: "#666666",
  border: "#E2E2E2",
  sage: "#5C7B74",
  link: "#46615B",
  onLink: "#FFFFFF",
  band: { Minimal: "#46615B", Low: "#627A3B", Moderate: "#9A7428", High: "#B25A36", Severe: "#943327" },
};

const dark: typeof light = {
  ground: "#111513",
  panel: "#1A201E",
  panel2: "#2A3330",
  ink: "#ECE9E3",
  ink2: "#CDD0CB",
  muted: "#A0A8A3",
  border: "#27302D",
  sage: "#93B5AB",
  link: "#93B5AB",
  onLink: "#0F1412",
  band: { Minimal: "#7FC2A8", Low: "#A9C07A", Moderate: "#D9B062", High: "#E08A62", Severe: "#E7766A" },
};

export type Palette = typeof light;
export const palettes = { light, dark };

export function useTheme(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
/** Rows and cards are rounded tiles, no borders, no shadows; pills for buttons and inputs (DESIGN.md § Components). */
export const radius = { card: 16, pill: 999 } as const;

/** League Gothic = the one display face (scores, headings, uppercase, sage) — never body. Inter for everything else. */
export const fonts = {
  display: "LeagueGothic-Regular",
  heading: "Inter-ExtraBold",
  semibold: "Inter-SemiBold",
  medium: "Inter-Medium",
  body: "Inter-Regular",
} as const;

export const type = {
  display: (size: number, color: string): TextStyle => ({
    fontFamily: fonts.display,
    fontSize: size,
    lineHeight: Math.round(size * 1.05),
    textTransform: "uppercase",
    letterSpacing: 0.01 * size,
    color,
  }),
  heading: (size: number, color: string): TextStyle => ({
    fontFamily: fonts.heading,
    fontSize: size,
    letterSpacing: -0.02 * size,
    lineHeight: Math.round(size * 1.2),
    color,
  }),
  body: (size: number, color: string): TextStyle => ({
    fontFamily: fonts.body,
    fontSize: size,
    lineHeight: Math.round(size * 1.5),
    color,
  }),
  strong: (size: number, color: string): TextStyle => ({
    fontFamily: fonts.semibold,
    fontSize: size,
    lineHeight: Math.round(size * 1.4),
    color,
  }),
  label: (color: string): TextStyle => ({
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color,
  }),
} as const;

/**
 * [DS-AUDIT 2026-10-21] Colours that do NOT follow the theme — the camera's black ground, text and buttons laid over
 * a photo or a solid ink/accent fill, the photo scrim. One home for them, so no screen types a hex
 * (/design:design-system audit, projects/app-stores/handoffs/DESIGN-SYSTEM-AUDIT-2026-10-21.md).
 */
export const FIXED = {
  /** text / glyphs on a dark photo, on ink or on an accent fill */
  onDark: "#FFFFFF",
  /** text on a white button laid over a photo */
  onLight: "#1C1C1C",
  /** the camera preview's ground */
  camera: "#000000",
  /** the scrim over a demo photo */
  scrim: "rgba(0,0,0,0.5)",
  /** hairline over a photo */
  photoLine: "rgba(255,255,255,0.6)",
} as const;
