import { router } from "expo-router";

/**
 * docs/scan-flow.md rules 3–4, the FatTonic [FT-A4-NAV] pattern. Two moves, used everywhere:
 *  - openEntry: every entry tap opens ONE page, /exposure/<slug> — [BC-APP-NAV-EVERYWHERE 10-31] a shared route under
 *    every tab group (app/(tabs)/(scan,index,score,swaps)/exposure/[slug].tsx), so it opens inside the current tab's
 *    stack with the tab bar still there; back returns to wherever the tap came from.
 *  - scanHome: from any depth, back to the Scan front page in one tap; `camera` opens the camera there. The Scan
 *    screen reads the `go` + `t` params (t makes every call a new event).
 */
export function openEntry(slug: string): void {
  router.push({ pathname: "/exposure/[slug]", params: { slug } } as never);
}

export function scanHome(camera = false): void {
  if (router.canDismiss()) router.dismissAll();
  router.navigate({ pathname: "/scan", params: { go: camera ? "camera" : "home", t: String(Date.now()) } } as never);
}

/** The Index tab on one room (the site's `?room=`), or the older-homes rows, any old search cleared. [HOME-REFOCUS] 10-31. */
export function openRoom(room: string | null, olderHome = false): void {
  router.navigate({ pathname: "/", params: { room: room ?? "", older: olderHome ? "1" : "", t: String(Date.now()) } } as never);
}
/** Kept for the lens aisles: a category still opens the Index on it. */
export function openAisle(cat: string | null): void {
  router.navigate({ pathname: "/", params: { cat: cat ?? "", t: String(Date.now()) } } as never);
}
