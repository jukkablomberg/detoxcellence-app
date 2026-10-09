#!/usr/bin/env node
/**
 * Store screenshots, GENERATED from the app's own web export rendered by headless Chromium at the two
 * store geometries (scripts/shot-frame.mjs: android 1080×1920 plain; ios 1320×2868 under the caption
 * band from store/listing.json), with LIVE data from monitoringroom.com — the same JSON the phone reads.
 * No mock data. monitoringroom.com sends no CORS headers (the phone needs none), so the harness fetches
 * the API from Node through Playwright routing and hands the browser the real body.
 *
 *   npx expo export --platform web --output-dir web-export
 *   MR_SHOT_SESSION=<a session token> node scripts/screenshots.mjs [--platform=android,ios]
 *     → assets/screenshots/<platform>/*.png
 *
 * MR_SHOT_SESSION (optional) shows the question screen signed in, i.e. with the call control. It is a
 * token from /api/auth/app-exchange for an account that has made NO call on the question shown, so the
 * shot invents nothing; without it the question screen shows its signed-out state.
 */
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launchChromium } from "./browser.mjs";
import { exportServer, openShotContext, platformsFromArgv } from "./shot-frame.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const EXPORT = join(root, "web-export");
const { server, port } = await exportServer(EXPORT);
const SESSION = process.env.MR_SHOT_SESSION ?? "";

const SHOTS = [
  ["01-now", "/", "Live situations"],
  ["02-forecasts", "/forecasts", "Earthquakes"],
  ["03-question", "/question/eq-world-m7-2026-10", "How it resolves"],
  ["04-situation", null, "Level"],
  ["05-leaders", "/leaders", "Brier"],
  ["06-about", "/about", "More from JukkaBlomberg.com"],
];

const platforms = platformsFromArgv();
const browser = await launchChromium();
try {
  for (const platform of platforms) {
    const shot = await openShotContext(browser, { platform, root, exportDir: EXPORT, port, colorScheme: "light" });
    const { page, shoot, errors } = shot;
    await page.route("https://monitoringroom.com/api/**", async (route) => {
      const res = await route.fetch();
      await route.fulfill({ response: res, headers: { ...res.headers(), "access-control-allow-origin": "*" } });
    });
    if (SESSION) await page.addInitScript((t) => window.localStorage.setItem("mr.session", t), SESSION);
    for (const [name, path, mustContain] of SHOTS) {
      if (path) {
        await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: "load" });
      } else {
        // the top situation on the live board, reached the way a reader reaches it
        await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
        await page.getByText("Live situations").filter({ visible: true }).first().waitFor({ timeout: 30_000 });
        await page.waitForTimeout(1500);
        await page.locator('[role="button"]').filter({ hasText: /INTENSE|ESCALATING|ACTIVE|BACKGROUND|CALM/i, visible: true }).first().click();
      }
      // native tabs keep the other tabs mounted (hidden) on web — wait for the VISIBLE copy (2026-10-07, APP-STANDARD)
      await page.getByText(mustContain, { exact: false }).filter({ visible: true }).first().waitFor({ timeout: 30_000 });
      // every board on the screen has painted: no "Loading …" placeholder left (10-07: 01-now was shot mid-load)
      await page.waitForFunction(() => !/Loading /.test(document.body.innerText), null, { timeout: 30_000 });
      await page.waitForTimeout(1400); // the brand moment (≤ 1 s, APP-STANDARD § 1) is gone
      await shoot(name);
    }
    if (errors.length) { console.error(`screenshots: ${errors.length} page error(s):\n  ${errors.join("\n  ")}`); process.exitCode = 1; }
    await shot.close();
  }
} finally {
  await browser.close();
  server.close();
}
