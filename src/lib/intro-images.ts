import type { ImageSourcePropType } from "react-native";

/**
 * app/intro.json card.image → bundled asset (Metro needs static require). [APP-INTRO-ON-1106] one crop per scheme, both
 * cut from today's screens (design/APP-INTRO-STANDARD.md rule 4); scripts/intro.test.mjs checks every key is in intro.json.
 */
const LIGHT: Record<string, ImageSourcePropType> = {
  "intro/01-index.png": require("../../assets/intro/01-index.png"),
  "intro/02-plan.png": require("../../assets/intro/02-plan.png"),
  "intro/03-pan.png": require("../../assets/intro/03-pan.png"),
};
const DARK: Record<string, ImageSourcePropType> = {
  "intro/01-index.png": require("../../assets/intro/dark/01-index.png"),
  "intro/02-plan.png": require("../../assets/intro/dark/02-plan.png"),
  "intro/03-pan.png": require("../../assets/intro/dark/03-pan.png"),
};

/** The intro's images for the scheme the app is showing (the reader's Settings choice). */
export function introImages(scheme: "light" | "dark"): Record<string, ImageSourcePropType> {
  return scheme === "dark" ? DARK : LIGHT;
}
