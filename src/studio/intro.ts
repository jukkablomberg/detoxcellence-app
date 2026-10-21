/**
 * First-use intro — the pure half (NEW-APP-CHECKLIST PNF-8; Jukka 2026-10-17 `intro-cards: yes`; [APP-INTRO-CARDS-TEMPLATE]).
 * ≤ 3 cards, shown once after install, ending in the app's first core action — never an account wall (YK-4).
 * The rules here are the ones `check:listing:launch` enforces and `npm test` proves; FirstUseIntro.tsx renders them.
 * Generated copy: edit projects/app-stores/studio-kit/src/, then run scripts/sync-studio-kit.py.
 */
export type IntroCard = { image: string; line: string };
/**
 * layout — the intro's composition, chosen per app so no two sister apps open the same way (Apple 4.3, design
 * critique 2026-10-21): "framed" = image in a hairline frame, centred line · "bleed" = image edge to edge, line
 * left-aligned under it · "editorial" = big left-aligned line first, image below. Default "framed".
 * buttonCaps — set the app's own button voice (VINCAP/FatTonic caps). Buttons always take theme.radius, never a pill.
 */
export type IntroLayout = "framed" | "bleed" | "editorial";
export const INTRO_LAYOUTS: IntroLayout[] = ["framed", "bleed", "editorial"];
export type IntroConfig = { cards: IntroCard[]; core_action_route: string; layout?: IntroLayout; buttonCaps?: boolean };

export const INTRO_MAX_CARDS = 3;
export const INTRO_MAX_LINE = 90;
/** Version-independent on purpose: no app version, no OTA id, no build number — once seen, never again on this install. */
export const INTRO_FLAG_KEY = "studio:intro_seen";
export const INTRO_SEEN = "1";
const ACCOUNT_WALL = /(^|\/)(sign-?in|sign-?up|log-?in|register|account|auth|onboard)(\/|$)/i;

/** Show only when the flag was never written. A read error (null passed by the caller after catch) shows it — once. */
export function shouldShowIntro(stored: string | null | undefined): boolean {
  return stored !== INTRO_SEEN;
}

/** Expo Router: a file under app/ → its route ("(tabs)/(signals)/index.tsx" → "/"). Layouts and +files are not routes. */
export function routeOf(appRelPath: string): string | null {
  const p = appRelPath.replace(/\\/g, "/").replace(/\.(web\.)?(tsx|ts|jsx|js)$/, "");
  const parts = p.split("/");
  const last = parts[parts.length - 1];
  if (last === "_layout" || last.startsWith("+")) return null;
  const segs = parts.filter((s) => !/^\(.*\)$/.test(s));
  if (segs[segs.length - 1] === "index") segs.pop();
  return "/" + segs.join("/");
}

/** Every problem as a sentence; [] = GREEN. `routes` = routeOf() over app/**; `assetExists(key)` = the image is bundled. */
export function introProblems(cfg: unknown, routes: string[], assetExists: (image: string) => boolean): string[] {
  const out: string[] = [];
  const c = cfg as Partial<IntroConfig> | null;
  if (!c || typeof c !== "object") return ["intro.json is not an object"];
  if (!Array.isArray(c.cards) || c.cards.length === 0) out.push("intro.json has no cards");
  else {
    if (c.cards.length > INTRO_MAX_CARDS) out.push(`intro.json has ${c.cards.length} cards — at most ${INTRO_MAX_CARDS}`);
    c.cards.forEach((card, i) => {
      const n = i + 1;
      if (!card || typeof card.line !== "string" || !card.line.trim()) out.push(`card ${n} has no line`);
      else if (card.line.length > INTRO_MAX_LINE) out.push(`card ${n} line is ${card.line.length} chars — at most ${INTRO_MAX_LINE}`);
      if (!card || typeof card.image !== "string" || !card.image.trim()) out.push(`card ${n} has no image`);
      else if (!assetExists(card.image)) out.push(`card ${n} image ${card.image} is not bundled`);
    });
  }
  if (c.layout !== undefined && !INTRO_LAYOUTS.includes(c.layout)) out.push(`layout ${String(c.layout)} is not one of ${INTRO_LAYOUTS.join(", ")}`);
  const r = c.core_action_route;
  if (typeof r !== "string" || !r.startsWith("/")) out.push("core_action_route is missing");
  else if (ACCOUNT_WALL.test(r)) out.push(`core_action_route ${r} is an account wall — the intro ends in the first core action`);
  else if (!routes.includes(r)) out.push(`core_action_route ${r} is not a route in app/`);
  return out;
}
