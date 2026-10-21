import type { ImageSourcePropType } from "react-native";

/** app/intro.json card.image → bundled asset (Metro needs static require). */
export const INTRO_IMAGES: Record<string, ImageSourcePropType> = {
  "intro/01-scan.png": require("../../assets/intro/01-scan.png"),
  "intro/02-index.png": require("../../assets/intro/02-index.png"),
  "intro/03-swaps.png": require("../../assets/intro/03-swaps.png"),
};
