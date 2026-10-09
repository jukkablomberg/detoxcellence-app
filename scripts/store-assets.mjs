#!/usr/bin/env node
/**
 * Store and app imagery, DERIVED from one mark — never drawn by hand per size.
 *
 * The mark is the Monitoring Situation Index dial from the site's home (Pulse,
 * DESIGN.md): a half-dial in the five severity colours, cut at 2/4/6/8 exactly as
 * src/lib/severity-band.ts, with a white needle, on the Pulse dark ground. Each
 * asset below is that mark recomposed and rendered by headless Chromium at the
 * store's exact size:
 *
 *   assets/icon.png                     1024×1024, opaque (Play master + iOS; R11)
 *   assets/adaptive-icon-foreground.png 1024×1024, dial inside the 66% safe zone, transparent
 *   assets/adaptive-icon-background.png 1024×1024, flat ground
 *   assets/adaptive-icon-monochrome.png 1024×1024, white dial on transparent (themed icons)
 *   assets/feature-graphic.png          1024×500 (Play feature graphic)
 *   assets/splash-mark.png              640×640, dial on transparent (expo-splash-screen image)
 *   assets/brand-mark.png               512×512, dial on transparent (in-app brand moment)
 *   assets/notification-icon.png        96×96, white dial on transparent (Android small icon)
 *
 *   PORTFOLIO_OS_ROOT=<Operating System> node scripts/store-assets.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launchChromium } from "./browser.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const OUT = join(root, "assets");
mkdirSync(OUT, { recursive: true });

// Pulse tokens (site src/app/globals.css): dark ground + the severity scale (dark-scheme values read on dark).
const GROUND = "#0B1220";
const SEV = ["#34C77B", "#5B9BFF", "#F0A030", "#FF7A45", "#FF5A4E"];
const NEEDLE_AT = 0.41; // where the needle points, 0..1 of the dial — the MSI reading the day the mark was made (4.1, active)

/** The dial in a 64-unit box: centre (32, 40), radius 20, five arcs over the top half. */
function dial({ mono = false } = {}) {
  const cx = 32, cy = 40, r = 20, sw = 7, gap = 4; // gap in degrees between segments
  const pt = (deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const arcs = SEV.map((c, i) => {
    const a0 = 180 + i * 36 + gap / 2;
    const a1 = 180 + (i + 1) * 36 - gap / 2;
    const [x0, y0] = pt(a0);
    const [x1, y1] = pt(a1);
    return `<path d="M ${x0.toFixed(3)} ${y0.toFixed(3)} A ${r} ${r} 0 0 1 ${x1.toFixed(3)} ${y1.toFixed(3)}" fill="none" stroke="${mono ? "#ffffff" : c}" stroke-width="${sw}" stroke-linecap="butt"/>`;
  }).join("");
  const na = 180 + NEEDLE_AT * 180;
  const nx = cx + 15 * Math.cos((na * Math.PI) / 180);
  const ny = cy + 15 * Math.sin((na * Math.PI) / 180);
  const needle = `<line x1="${cx}" y1="${cy}" x2="${nx.toFixed(3)}" y2="${ny.toFixed(3)}" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="4" fill="#ffffff"/>`;
  return arcs + needle;
}
// Visual bounds of the dial in the 64 box: x 8.5–55.5, y 16.5–44 → centre (32, 30.25), 47 wide.
const B = { x: 8.5, y: 16.5, w: 47, h: 27.5 };

/** The dial alone, scaled so its width is `w` px, centred in a `size` box. */
const dialOnly = (size, w, opts) => {
  const s = w / B.w;
  const tx = size / 2 - (B.x + B.w / 2) * s;
  const ty = size / 2 - (B.y + B.h / 2) * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><g transform="translate(${tx} ${ty}) scale(${s})">${dial(opts)}</g></svg>`;
};

const ASSETS = {
  "icon.png": [1024, 1024, `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="${GROUND}"/>${dialOnly(1024, 700).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg>`],
  // Launchers mask to a 66% circle (676 px): the dial's diagonal must sit inside it.
  "adaptive-icon-foreground.png": [1024, 1024, dialOnly(1024, 520)],
  "adaptive-icon-background.png": [1024, 1024, `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${GROUND}"/></svg>`],
  "adaptive-icon-monochrome.png": [1024, 1024, dialOnly(1024, 520, { mono: true })],
  "splash-mark.png": [640, 640, dialOnly(640, 480)],
  "brand-mark.png": [512, 512, dialOnly(512, 440)],
  "notification-icon.png": [96, 96, dialOnly(96, 84, { mono: true })],
  "feature-graphic.png": [1024, 500, (() => {
    const s = 230 / B.w;
    const tx = 1024 - 72 - B.w * s - B.x * s;
    const ty = (500 - B.h * s) / 2 - B.y * s;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <rect width="1024" height="500" fill="${GROUND}"/>
  <text x="72" y="214" fill="#E8EDF5" font-family="InterX" font-weight="800" font-size="64" letter-spacing="-2.2">Monitoring Room</text>
  <text x="72" y="270" fill="#9AA6BA" font-family="Inter" font-size="24">Live situations, ranked by Level.</text>
  <text x="72" y="306" fill="#9AA6BA" font-family="Inter" font-size="24">Free-to-play forecasts on what happens next.</text>
  <g transform="translate(${tx} ${ty}) scale(${s})">${dial()}</g>
</svg>`;
  })()],
};

const fontFace = (family, file) =>
  `@font-face{font-family:"${family}";src:url(data:font/ttf;base64,${readFileSync(join(root, "assets/fonts", file)).toString("base64")}) format("truetype");}`;
const FONT_CSS = fontFace("InterX", "Inter-ExtraBold.ttf") + fontFace("Inter", "Inter-Regular.ttf");

const OPAQUE = new Set(["icon.png", "adaptive-icon-background.png", "feature-graphic.png"]);
const browser = await launchChromium();
try {
  const page = await browser.newPage();
  for (const [name, [w, h, body]] of Object.entries(ASSETS)) {
    await page.setViewportSize({ width: w, height: h });
    const transparent = !OPAQUE.has(name);
    await page.setContent(`<!doctype html><html><head><style>${FONT_CSS}html,body{margin:0;padding:0;background:${transparent ? "transparent" : GROUND};}svg{display:block}</style></head><body>${body}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    const buf = await page.screenshot({ clip: { x: 0, y: 0, width: w, height: h }, omitBackground: transparent, type: "png" });
    writeFileSync(join(OUT, name), buf);
    console.error(`  ${name}: ${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}${transparent ? " (alpha)" : " (opaque)"} ${buf.length} B`);
  }
} finally {
  await browser.close();
}
