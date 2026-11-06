/**
 * First-use intro — the pure half (NEW-APP-CHECKLIST PNF-8; Jukka 2026-10-17 `intro-cards: yes`; [APP-INTRO-CARDS-TEMPLATE]).
 * ≤ 3 cards, shown once after install, ending in the app's first core action — never an account wall (YK-4).
 * Binding spec: design/APP-INTRO-STANDARD.md (v1 2026-11-06 — ≤ 8 words a line, real screen crops, fresh installs only).
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
/**
 * [APP-INTRO-STANDARD v1 2026-11-06] (all optional — an older intro.json stays valid):
 * enabled — false = never mount (the OTA kill switch, § 3.4). Default true.
 * prior_use_keys — app-owned AsyncStorage keys that mean "not a fresh install" (watchlist, holdings, history): when one
 *   is present and the flag is not, the intro is marked seen silently — no ambush after an OTA (rule 11).
 * imageAspect — width / height of the card images (3/4 for the § 2 crops). Set = each image is drawn at exactly that
 *   shape, fitted to the space the layout gives it (no letterbox inside the frame). Unset = the 10-21 drawing.
 */
export type IntroConfig = {
  cards: IntroCard[];
  core_action_route: string;
  layout?: IntroLayout;
  buttonCaps?: boolean;
  enabled?: boolean;
  prior_use_keys?: string[];
  imageAspect?: number;
};

export const INTRO_MAX_CARDS = 3;
/** APP-INTRO-STANDARD rule 3: one line, ≤ 8 words, ≤ 48 characters (2 lines at the display size). */
export const INTRO_MAX_WORDS = 8;
export const INTRO_MAX_CHARS = 48;
/** @deprecated the 10-18 character cap (90) — kept so older callers still import; introProblems() uses the two above. */
export const INTRO_MAX_LINE = 90;
/** Version-independent on purpose: no app version, no OTA id, no build number — once seen, never again on this install. */
export const INTRO_FLAG_KEY = "studio:intro_seen";
export const INTRO_SEEN = "1";
const ACCOUNT_WALL = /(^|\/)(sign-?in|sign-?up|log-?in|register|account|auth|onboard)(\/|$)/i;

/** Show only when the flag was never written. A read error (null passed by the caller after catch) shows it — once. */
export function shouldShowIntro(stored: string | null | undefined, priorUse = false): boolean {
  return stored !== INTRO_SEEN && !priorUse;
}

/** The words of a card line as the reader counts them ("0–100" is one word; a lone dash is none). */
export function introWords(line: string): number {
  return line.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
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

/** Freshness inputs (rule 4), passed in so the function stays pure: a card image's mtime and the newest store shot's. */
export type IntroFreshness = { imageMtime: (image: string) => number | null; shotsMtime: number | null };

/** Every problem as a sentence; [] = GREEN. `routes` = routeOf() over app/**; `assetExists(key)` = the image is bundled;
 * `fresh` (optional) = an image older than the newest store screenshot is RED. */
export function introProblems(cfg: unknown, routes: string[], assetExists: (image: string) => boolean, fresh?: IntroFreshness): string[] {
  const out: string[] = [];
  const c = cfg as Partial<IntroConfig> | null;
  if (!c || typeof c !== "object") return ["intro.json is not an object"];
  if (!Array.isArray(c.cards) || c.cards.length === 0) out.push("intro.json has no cards");
  else {
    if (c.cards.length > INTRO_MAX_CARDS) out.push(`intro.json has ${c.cards.length} cards — at most ${INTRO_MAX_CARDS}`);
    c.cards.forEach((card, i) => {
      const n = i + 1;
      if (!card || typeof card.line !== "string" || !card.line.trim()) out.push(`card ${n} has no line`);
      else {
        const w = introWords(card.line);
        if (w > INTRO_MAX_WORDS) out.push(`card ${n} line is ${w} words — at most ${INTRO_MAX_WORDS}`);
        if (card.line.length > INTRO_MAX_CHARS) out.push(`card ${n} line is ${card.line.length} chars — at most ${INTRO_MAX_CHARS}`);
      }
      if (!card || typeof card.image !== "string" || !card.image.trim()) out.push(`card ${n} has no image`);
      else if (!assetExists(card.image)) out.push(`card ${n} image ${card.image} is not bundled`);
      else if (fresh && fresh.shotsMtime !== null) {
        const m = fresh.imageMtime(card.image);
        if (m !== null && m < fresh.shotsMtime) out.push(`card ${n} image ${card.image} is older than the store screenshots — re-shoot it`);
      }
    });
  }
  if (c.enabled !== undefined && typeof c.enabled !== "boolean") out.push("enabled must be true or false");
  if (c.prior_use_keys !== undefined && (!Array.isArray(c.prior_use_keys) || c.prior_use_keys.some((k) => typeof k !== "string" || !k)))
    out.push("prior_use_keys must be a list of storage keys");
  if (c.imageAspect !== undefined && !(typeof c.imageAspect === "number" && c.imageAspect > 0.3 && c.imageAspect < 3))
    out.push("imageAspect must be a width/height ratio between 0.3 and 3");
  if (c.layout !== undefined && !INTRO_LAYOUTS.includes(c.layout)) out.push(`layout ${String(c.layout)} is not one of ${INTRO_LAYOUTS.join(", ")}`);
  const r = c.core_action_route;
  if (typeof r !== "string" || !r.startsWith("/")) out.push("core_action_route is missing");
  else if (ACCOUNT_WALL.test(r)) out.push(`core_action_route ${r} is an account wall — the intro ends in the first core action`);
  else if (!routes.includes(r)) out.push(`core_action_route ${r} is not a route in app/`);
  return out;
}
