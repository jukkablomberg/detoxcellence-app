import { Linking, Platform } from "react-native";
import type { StudioApp } from "./registry";

/**
 * Every link the studio blocks open — design/APP-ABOUT-STANDARD.md § 5. One convention for every app-originated
 * link: APP-UTM (each app's src/lib/outbound.ts, Jukka 2026-10-01) — utm_source=app · utm_medium=<os> ·
 * utm_campaign=<slug>-app · utm_content=<placement>. Store links carry it as the Play install referrer.
 * Generated copy: edit projects/app-stores/studio-kit/src/, then run scripts/sync-studio-kit.py.
 */
export const STUDIO_APPS_URL = "https://jukkablomberg.com/apps";

export function appUtm(slug: string, content: string): string {
  return [
    ["utm_source", "app"],
    ["utm_medium", Platform.OS],
    ["utm_campaign", `${slug}-app`],
    ["utm_content", content],
  ]
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
}

export function studioDoor(slug: string, content: string): string {
  return `${STUDIO_APPS_URL}?${appUtm(slug, content)}`;
}

export function openStudio(slug: string, content: string): Promise<unknown> {
  return Linking.openURL(studioDoor(slug, content));
}

/** The store page of another studio app, on THIS device's store only (never the other platform's). */
export function storeUrlFor(app: StudioApp, fromSlug: string): string | null {
  if (Platform.OS === "android" && app.android) {
    return `${app.android.url}&referrer=${encodeURIComponent(appUtm(fromSlug, "about-more-from"))}`;
  }
  if (Platform.OS === "ios" && app.ios) return app.ios.url;
  return null;
}
