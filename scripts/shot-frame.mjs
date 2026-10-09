/**
 * shot-frame.mjs — the two store geometries behind every screenshots.mjs. Lives in
 * projects/app-stores/repo-template/scripts/ and is copied VERBATIM into each repo-app
 * (never edited per venture; per-venture facts come from venture.json + store/listing.json).
 *
 *   android  360×640 CSS px @3x → 1080×1920 PNG, no band (the Play phone size; unchanged since 10-01)
 *   ios      440×836 CSS px @3x app shot (1320×2508) composed UNDER a 120 CSS px caption band
 *            → 440×956 @3x = 1320×2868 PNG, the iPhone 6.9" App Store size (APPLE-DAY-2026-10-06.md § 2 step 1)
 *
 * The band: venture `colors.primary` ground, headline ≤ 5 words + subline ≤ 60 chars, both from
 * store/listing.json `screenshots.captions[<shot name>]` — one concrete feature per shot, nothing the
 * listing does not say (BRAND.md § 8 applies). The 06-about band always reads "Built by JukkaBlomberg.com".
 * Type: the display face the app bundles when `screenshots.displayFontFile` names one of its .ttf files
 * (found inside the web export, so the band uses the very file the app ships), else the system sans.
 * Ink is white on a dark ground and near-black on a light one (SaunaHash's cream) — a white headline on
 * cream is not a headline.
 *
 * Usage inside a screenshots.mjs (see the template's usephysics/boomcellar examples):
 *   const platforms = platformsFromArgv();                       // ["android","ios"] or --platform=ios
 *   for (const platform of platforms) {
 *     const shot = await openShotContext(browser, { platform, root, exportDir, port, colorScheme });
 *     ... drive shot.page ...; await shot.shoot("01-home"); ...
 *     await shot.close();
 *   }
 * Every PNG is size-asserted before it is written; a wrong size throws instead of producing a file
 * the store rejects (the 10-05 lesson: four repos uploaded Android copies as iOS sets).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export const GEOMETRY = {
  android: { viewport: { width: 360, height: 640 }, band: 0, size: [1080, 1920] },
  ios: { viewport: { width: 440, height: 836 }, band: 120, size: [1320, 2868] },
};

export const ABOUT_HEADLINE = "Built by JukkaBlomberg.com";
const HEADLINE_MAX_WORDS = 5;
const SUBLINE_MAX_CHARS = 60;

export function platformsFromArgv(argv = process.argv) {
  const arg = argv.find((a) => a.startsWith("--platform="));
  const list = arg ? arg.slice("--platform=".length).split(",").map((s) => s.trim()).filter(Boolean) : Object.keys(GEOMETRY);
  for (const p of list) if (!GEOMETRY[p]) throw new Error(`shot-frame: unknown platform "${p}" (android|ios)`);
  return list;
}

export function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) throw new Error("shot-frame: not a PNG");
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

/** Per-venture band inputs: colours from venture.json, captions + display font from store/listing.json. */
export function loadBandSpec(root) {
  const venture = JSON.parse(readFileSync(join(root, "venture.json"), "utf8"));
  const listing = JSON.parse(readFileSync(join(root, "store/listing.json"), "utf8"));
  const s = listing.screenshots ?? {};
  return {
    venture: venture.venture,
    primary: venture.colors?.primary ?? "#000000",
    captions: s.captions ?? {},
    displayFontFile: s.displayFontFile ?? null,
  };
}

/** The caption for a shot, validated against the band rules. */
export function captionFor(spec, name) {
  const raw = spec.captions[name];
  if (!raw) throw new Error(`shot-frame: store/listing.json screenshots.captions["${name}"] is missing — every iOS shot needs headline + subline`);
  const [headline, subline] = Array.isArray(raw) ? raw : [raw.headline, raw.subline];
  if (typeof headline !== "string" || !headline.trim()) throw new Error(`shot-frame: ${name}: empty headline`);
  if (typeof subline !== "string" || !subline.trim()) throw new Error(`shot-frame: ${name}: empty subline`);
  const words = headline.trim().split(/\s+/).length;
  if (words > HEADLINE_MAX_WORDS) throw new Error(`shot-frame: ${name}: headline is ${words} words (max ${HEADLINE_MAX_WORDS}): "${headline}"`);
  if (subline.length > SUBLINE_MAX_CHARS) throw new Error(`shot-frame: ${name}: subline is ${subline.length} chars (max ${SUBLINE_MAX_CHARS}): "${subline}"`);
  if (/^06-/.test(name) && headline.trim() !== ABOUT_HEADLINE) throw new Error(`shot-frame: ${name}: the About band must read "${ABOUT_HEADLINE}", got "${headline}"`);
  return { headline: headline.trim(), subline: subline.trim() };
}

/** Relative luminance of a #rrggbb colour (sRGB → linear), for the ink decision. */
export function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const c = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function findFile(dir, predicate) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) { const hit = findFile(p, predicate); if (hit) return hit; }
    else if (predicate(entry)) return p;
  }
  return null;
}

/** The URL (on the screenshot server) of the display font the export bundles, or null. */
export function bandFontUrl(spec, exportDir, port) {
  if (!spec.displayFontFile) return null;
  const stem = spec.displayFontFile.replace(/\.ttf$/i, "").toLowerCase();
  const hit = findFile(exportDir, (f) => f.toLowerCase().includes(stem) && /\.(ttf|otf)$/i.test(f));
  if (!hit) throw new Error(`shot-frame: displayFontFile "${spec.displayFontFile}" is not in the web export (${exportDir}) — is it in app.config.ts expo-font assets?`);
  return `http://127.0.0.1:${port}/${relative(exportDir, hit).split("\\").join("/")}`;
}

function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

/** Compose the band above an app screenshot; returns the 1320×2868 PNG. */
export async function frameIos(ctx, appPng, caption, spec, fontUrl) {
  const geo = GEOMETRY.ios;
  const [w, h] = pngSize(appPng);
  const want = [geo.viewport.width * 3, geo.viewport.height * 3];
  if (w !== want[0] || h !== want[1]) throw new Error(`shot-frame: app shot is ${w}x${h}, expected ${want.join("x")} (viewport ${geo.viewport.width}×${geo.viewport.height} @3x)`);
  const dark = luminance(spec.primary) < 0.4;
  const ink = dark ? "#ffffff" : "#141414";
  const sub = dark ? "rgba(255,255,255,0.78)" : "rgba(20,20,20,0.72)";
  const face = fontUrl ? `@font-face{font-family:"BandDisplay";src:url("${fontUrl}");font-display:block}` : "";
  const family = fontUrl ? `"BandDisplay", ` : "";
  // The viewport meta matters: the context emulates a phone, and without it Chromium lays the shell out at 980 px and scales it down.
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
    ${face}
    html,body{margin:0;padding:0;background:#000}
    body{width:${geo.viewport.width}px;height:${geo.viewport.height + geo.band}px;overflow:hidden}
    .band{box-sizing:border-box;height:${geo.band}px;background:${spec.primary};color:${ink};display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 28px;gap:7px}
    .h{font-family:${family}-apple-system,"SF Pro Display","Helvetica Neue",Inter,Roboto,sans-serif;font-weight:${fontUrl ? 400 : 600};font-size:28px;line-height:1.1;letter-spacing:-0.01em;max-width:100%}
    .s{font-family:-apple-system,"SF Pro Text","Helvetica Neue",Inter,Roboto,sans-serif;font-weight:400;font-size:15px;line-height:1.25;color:${sub};max-width:100%}
    img{display:block;width:${geo.viewport.width}px;height:${geo.viewport.height}px}
  </style></head><body>
    <div class="band"><div class="h">${esc(caption.headline)}</div><div class="s">${esc(caption.subline)}</div></div>
    <img src="data:image/png;base64,${appPng.toString("base64")}" alt="">
  </body></html>`;
  const page = await ctx.newPage();
  try {
    await page.setViewportSize({ width: geo.viewport.width, height: geo.viewport.height + geo.band });
    await page.setContent(html, { waitUntil: "load" });
    if (fontUrl) {
      // The bundled face IS the weight (Oswald-Medium, Fraunces_600SemiBold…): load it explicitly, then prove it is in.
      const loaded = await page.evaluate(async () => { await document.fonts.load('28px "BandDisplay"'); return document.fonts.check('28px "BandDisplay"'); });
      if (!loaded) throw new Error(`shot-frame: band font did not load from ${fontUrl}`);
    }
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    const out = await page.screenshot({ type: "png", fullPage: false });
    const [ow, oh] = pngSize(out);
    if (ow !== geo.size[0] || oh !== geo.size[1]) throw new Error(`shot-frame: framed shot is ${ow}x${oh}, expected ${geo.size.join("x")}`);
    return out;
  } finally {
    await page.close();
  }
}

/**
 * A browser context at the platform's phone geometry plus a `shoot(name)` that writes
 * assets/screenshots/<platform>/<name>.png at exactly the store size (band composed for ios).
 */
export async function openShotContext(browser, { platform, root, exportDir, port, colorScheme = "light" }) {
  const geo = GEOMETRY[platform];
  if (!geo) throw new Error(`shot-frame: unknown platform "${platform}"`);
  const outDir = join(root, "assets/screenshots", platform);
  mkdirSync(outDir, { recursive: true });
  const spec = platform === "ios" ? loadBandSpec(root) : null;
  const fontUrl = platform === "ios" ? bandFontUrl(spec, resolve(exportDir), port) : null;
  const ctx = await browser.newContext({ viewport: geo.viewport, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const shoot = async (name) => {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    let buf = await page.screenshot({ type: "png", fullPage: false });
    let note = "";
    if (platform === "ios") {
      const caption = captionFor(spec, name);
      buf = await frameIos(ctx, buf, caption, spec, fontUrl);
      note = ` — "${caption.headline}" / "${caption.subline}"`;
    }
    const [w, h] = pngSize(buf);
    if (w !== geo.size[0] || h !== geo.size[1]) throw new Error(`shot-frame: ${platform}/${name}.png is ${w}x${h}, expected ${geo.size.join("x")}`);
    writeFileSync(join(outDir, `${name}.png`), buf);
    console.error(`  ${platform}/${name}.png ${w}x${h}${note}`);
  };
  return { platform, ctx, page, errors, outDir, shoot, close: () => ctx.close() };
}

/** Serve the web export (static route → .html → SPA fallback), as every screenshots.mjs did inline. */
export function exportServer(exportDir) {
  if (!existsSync(join(exportDir, "index.html"))) {
    console.error(`screenshots: ${exportDir}/index.html missing — run \`npx expo export --platform web --output-dir web-export\` first`);
    process.exit(2);
  }
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".ttf": "font/ttf", ".otf": "font/otf", ".css": "text/css", ".svg": "image/svg+xml" };
  return import("node:http").then(({ createServer }) => new Promise((done) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      let file = join(exportDir, decodeURIComponent(url.pathname));
      if (!existsSync(file) || statSync(file).isDirectory()) {
        const html = `${file.replace(/\/$/, "")}.html`;
        file = existsSync(html) ? html : join(exportDir, "index.html");
      }
      const ext = file.slice(file.lastIndexOf("."));
      // CORS: the band page is composed from about:blank and loads the bundled display font cross-origin.
      res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream", "Access-Control-Allow-Origin": "*" });
      res.end(readFileSync(file));
    });
    server.listen(0, "127.0.0.1", () => done({ server, port: server.address().port }));
  }));
}
