import { router } from "expo-router";

/**
 * docs/scan-flow.md rules 3–4, the FatTonic [FT-A4-NAV] pattern. Two moves, used everywhere:
 *  - openEntry: every entry tap opens ONE page, /exposure/<slug>, pushed on the root stack — it carries the platform
 *    back, and back returns to wherever the tap came from (the scan's chips, the Index, a swap, the room check).
 *  - scanHome: from any depth, back to the Scan front page in one tap; `camera` opens the camera there. The Scan
 *    screen reads the `go` + `t` params (t makes every call a new event).
 */
export function openEntry(slug: string): void {
  router.push({ pathname: "/exposure/[slug]", params: { slug } } as never);
}

export function scanHome(camera = false): void {
  if (router.canDismiss()) router.dismissAll();
  router.navigate({ pathname: "/", params: { go: camera ? "camera" : "home", t: String(Date.now()) } } as never);
}

/** The Index tab on one category (an aisle), any old search cleared. */
export function openAisle(cat: string | null): void {
  router.navigate({ pathname: "/exposures", params: { cat: cat ?? "", t: String(Date.now()) } } as never);
}
