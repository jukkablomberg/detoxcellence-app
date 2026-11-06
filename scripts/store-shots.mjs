#!/usr/bin/env node
/**
 * store-shots.mjs — the Play phone set to design/APP-STORE-SHOTS-STANDARD.md (v1, 2026-11-06). Identical in every
 * repo-app; per-app facts live in store/shots.json (order, headlines, callouts, alt text, canvas).
 *
 *   npx expo export --platform web --output-dir web-export
 *   node scripts/store-shots.mjs                 → assets/screenshots/android/0N-*.png (1080×2160) + assets/feature-graphic.png (1024×500)
 *   node scripts/store-shots.mjs --compose-only  → recompose from the last raw capture (web-export/_shots-raw/)
 *
 * Pass (a) CAPTURE: this repo's own scripts/screenshots.mjs (its routes, seeds and must-contain anchors) runs at the
 * standard's full phone viewport — 360×720 CSS px @3x, no caption band — registered here as the extra geometry
 * "play-raw", so the seeding logic is never duplicated. Raw PNGs are parked in web-export/_shots-raw/ (gitignored).
 * Pass (b) COMPOSE: the ONE studio compositor, projects/app-stores/studio-kit/shots/compose.mjs (brand canvas,
 * verb-first headline, the raw screen in a phone frame, ≤ 1 zoomed callout), writes the store set and moves stale
 * PNGs to _to_delete/ (the Mac mount cannot unlink). iOS sets are untouched: run screenshots.mjs for those.
 * No npm script on purpose — package.json is part of the native fingerprint.
 */
import { existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const RAW = join(root, "web-export", "_shots-raw");
const KIT = process.env.STUDIO_SHOTS ?? resolve(root, "../../app-stores/studio-kit/shots");

if (!process.argv.includes("--compose-only")) {
  const sf = await import("./shot-frame.mjs");
  sf.GEOMETRY["play-raw"] = { viewport: { width: 360, height: 720 }, band: 0, size: [1080, 2160] };
  process.argv = [...process.argv.filter((a) => !a.startsWith("--platform=")), "--platform=play-raw"];
  await import("./screenshots.mjs");
  if (process.exitCode) { console.error("store-shots: the capture pass reported errors — not composing"); process.exit(process.exitCode); }
  const captured = join(root, "assets/screenshots/play-raw");
  if (existsSync(RAW)) renameSync(RAW, `${RAW}-${Date.now()}`);
  mkdirSync(dirname(RAW), { recursive: true });
  renameSync(captured, RAW);
}
const { composeApp } = await import(pathToFileURL(join(KIT, "compose.mjs")).href);
await composeApp({ root, rawDir: RAW });
