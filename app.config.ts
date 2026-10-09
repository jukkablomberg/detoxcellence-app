import type { ExpoConfig } from "expo/config";
import venture from "./venture.json";

/**
 * The bundle identifier is DERIVED, never typed. README section 7 fixes the
 * convention as `com.<venture>.app`, with `com.jukkablomberg.<slug>` for a
 * venture that has no domain of its own, and calls the identifier permanent.
 * Computed here from `venture.json` and asserted against `apps.json` by
 * scripts/listing-readiness.mjs.
 */
export function bundleId(v: { slug: string; domain?: string | null }): string {
  return v.domain ? `com.${v.slug}.app` : `com.jukkablomberg.${v.slug}`;
}

/** Both store URLs live on the venture's own domain (README section 6b). */
export const privacyUrl = (v: { domain: string }) => `https://${v.domain}/app/privacy`;
export const supportUrl = (v: { domain: string }) => `https://${v.domain}/app/support`;
export const marketingUrl = (v: { domain: string }) => `https://${v.domain}`;

const id = bundleId(venture);

/**
 * The EAS project id must be a STRING or ABSENT — never null (Expo serialises a
 * null to {} and eas-cli then refuses to build). Spread in only once it exists.
 */
const easProjectId: string | undefined =
  (typeof venture.easProjectId === "string" && venture.easProjectId) ||
  process.env.EAS_PROJECT_ID ||
  undefined;

/** Integrity dark ground (DESIGN.md § App) — the splash follows the phone's scheme like the app does. */
const DARK_GROUND = "#111513";

const config: ExpoConfig = {
  name: venture.venture,
  slug: venture.slug,
  version: "1.0.0",
  orientation: "portrait",
  scheme: venture.slug,
  // Integrity ships light and dark (the site's two token blocks); the app follows the phone (DESIGN.md § App).
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: {
    bundleIdentifier: id,
    // iPhone-only for v1 (APPLE-DAY 2026-10-05): true would make Apple require a 13-inch iPad screenshot set.
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: id,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon-foreground.png",
      backgroundImage: "./assets/adaptive-icon-background.png",
      monochromeImage: "./assets/adaptive-icon-monochrome.png",
    },
    // Runtime permissions: CAMERA (expo-camera's plugin), asked only when the reader taps the
    // scan target, and POST_NOTIFICATIONS (expo-notifications), asked only when the reader turns the
    // weekly swap reminder on (Swaps tab). The reminder is a LOCAL notification —
    // no push token, no server. The Exposure Index is bundled; quiz results and
    // score history stay in app storage on the phone.
    permissions: [],
    blockedPermissions: [
      "android.permission.ACCESS_ADSERVICES_ATTRIBUTION_ID",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
    ],
  },
  plugins: [
    "expo-router",
    // health-camera (HEALTH-TRIO-DAY C2): the studio's one engine (a byte copy of FatTonic's, scripts/sync-camera-engine.mjs
    // --check) — SigLIP 2 in ONNX Runtime on the phone; scripts/patch-ort-native.mjs makes it build on Gradle 9.
    "onnxruntime-react-native",
    [
      // Scan + room check: the camera recognises everyday products ON the phone. Photos are classified and deleted;
      // nothing is stored or sent (modules/health-camera). No microphone: stills only.
      "expo-camera",
      {
        cameraPermission: "Detoxcellence uses the camera to recognise everyday products on your phone. Photos are not stored or sent.",
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      // Local notifications only (the weekly swap reminder, src/lib/reminders.ts). The small
      // icon is white-on-transparent, derived from the mark by scripts/store-assets.mjs.
      "expo-notifications",
      { icon: "./assets/notification-icon.png", color: venture.colors.accent, defaultChannel: "swaps" },
    ],
    [
      // Google Play has required target API 36 (Android 16) since 2026-08-31.
      "expo-build-properties",
      { android: { compileSdkVersion: 36, targetSdkVersion: 36, minSdkVersion: 24 } },
    ],
    [
      "expo-splash-screen",
      {
        // The launch image is the mark on the ground and nothing else (ENDORSEMENT-SYSTEM.md § 2.4).
        image: "./assets/splash-mark.png",
        imageWidth: 160,
        resizeMode: "contain",
        backgroundColor: venture.colors.primary,
        dark: { image: "./assets/splash-mark.png", backgroundColor: DARK_GROUND },
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    ventureSlug: venture.slug,
    privacyUrl: privacyUrl(venture),
    supportUrl: supportUrl(venture),
    marketingUrl: marketingUrl(venture),
    ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
  },
};

export default config;
