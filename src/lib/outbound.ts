import { Linking, Platform } from "react-native";
import venture from "../../venture.json";

/**
 * [APP-UTM] Jukka 2026-10-01: every link the app opens on one of the studio's own
 * sites carries UTM tags, so the venture's GA4 property can tell app traffic from
 * web traffic and which placement sent it. Third-party URLs (calendar sources,
 * food sources, exchanges) are opened untouched — we tag our own doors only.
 *
 *   utm_source=app · utm_medium=<android|ios|web> · utm_campaign=<slug>-app ·
 *   utm_content=<placement>  (e.g. about-privacy, push-alert, monitor-issue)
 *
 * Built by hand on purpose: React Native's URL/URLSearchParams are partial.
 */
const OWN_DOMAINS: string[] = [venture.domain, "jukkablomberg.com"];

function isOwn(url: string): boolean {
  const m = /^https?:\/\/([^/?#]+)/i.exec(url);
  if (!m) return false;
  const host = m[1].toLowerCase().replace(/^www\./, "").replace(/:\d+$/, "");
  return OWN_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

export function placement(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "link";
}

export function withUtm(url: string, content: string): string {
  if (!isOwn(url) || /[?&]utm_source=/.test(url)) return url;
  const hashAt = url.indexOf("#");
  const base = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const hash = hashAt >= 0 ? url.slice(hashAt) : "";
  const params = [
    ["utm_source", "app"],
    ["utm_medium", Platform.OS],
    ["utm_campaign", `${venture.slug}-app`],
    ["utm_content", placement(content)],
  ]
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `${base}${base.includes("?") ? "&" : "?"}${params}${hash}`;
}

/** Open a URL in the system browser, tagged when it is ours. */
export function openOutbound(url: string, content: string): Promise<unknown> {
  return Linking.openURL(withUtm(url, content));
}
