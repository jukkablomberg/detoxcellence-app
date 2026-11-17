#!/usr/bin/env node
/**
 * Store screenshots, GENERATED from the app's own web export at the two store geometries (scripts/shot-frame.mjs:
 * android 1080×1920; ios 1320×2868 under the caption band from store/listing.json). Nothing staged by hand:
 * 01 is the engine's real result for the public-domain bottle reference photo (assets/demo/bottle-demo.jpg, the
 * web build's stand-in for the camera), 02 the row it opens, 03 the room check's real ranking of that photo,
 * 04 the Exposure Index as bundled, 05 a real run of the Exposure Score (alternating answers 1 and 2), 06 About.
 * The web export has no camera, so the camera view itself is not shown.
 *
 *   npx expo export --platform web --output-dir web-export && node scripts/screenshots.mjs [--platform=android,ios]
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launchChromium } from "./browser.mjs";
import { exportServer, openShotContext, platformsFromArgv } from "./shot-frame.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXPORT = join(root, "web-export");
const quiz = JSON.parse(readFileSync(join(root, "src/data/quiz.json"), "utf8"));
const { server, port } = await exportServer(EXPORT);
const base = `http://127.0.0.1:${port}`;

const browser = await launchChromium();
try {
  for (const platform of platformsFromArgv()) {
    const shot = await openShotContext(browser, { platform, root, exportDir: EXPORT, port, colorScheme: "light" });
    const { page, shoot, errors } = shot;
    // The web build draws NativeTabs as a Radix tab list over the header; the phone draws a native bar at the
    // bottom that the web export cannot show. Hide the web-only list and move between tabs by URL instead.
    await page.addInitScript(() => document.addEventListener("DOMContentLoaded", () => {
      const st = document.createElement("style"); st.textContent = '[role="tablist"]{display:none!important}'; document.head.appendChild(st);
    }));
    await page.route(/detoxcellence\.com|jukkablomberg\.com/, (r) => r.abort());
    const vis = (t) => page.getByText(t, { exact: false }).filter({ visible: true }).first();
    const tid = (id) => page.locator(`[data-testid="${id}"]:visible`).first();
    const settle = async () => page.waitForTimeout(1400); // the brand moment (≤ 1 s) has gone

    await page.goto(`${base}/scan`, { waitUntil: "load" });
    await tid("scan-target").waitFor({ timeout: 30000 });
    await settle();
    await tid("scan-target").click();
    await vis("Is it…").waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);
    await shoot("01-scan");
    await page.getByRole("button", { name: "Plastic water bottle" }).filter({ visible: true }).first().click();
    await tid("ask-bottled-water-plastic").waitFor({ timeout: 10000 });
    await tid("ask-bottled-water-plastic").click();
    await tid("entry-score").waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);
    await shoot("02-entry");

    await page.goto(`${base}/scan`, { waitUntil: "load" });
    await tid("room-check").waitFor({ timeout: 30000 });
    await settle();
    await tid("room-check").click();
    await tid("room-result").waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);
    await shoot("03-room");

    // [DX-MY-HOME 2026-11-06] "/" is My home now; the index moved to /the-index.
    await page.goto(`${base}/the-index`, { waitUntil: "load" });
    await tid("index-search").waitFor({ timeout: 30000 });
    await settle();
    // 2026-11-02: no "all" chip since the 10-31 home refocus — the index opens on all
    await page.waitForTimeout(500);
    await shoot("04-index");

    await page.goto(`${base}/`, { waitUntil: "load" });
    await tid("start-quiz").waitFor({ timeout: 30000 });
    await settle();
    await tid("start-quiz").click();
    for (let i = 0; i < quiz.questions.length; i++) {
      await page.getByText(`${i + 1} of ${quiz.questions.length}`, { exact: false }).filter({ visible: true }).first().waitFor({ timeout: 5000 }); // [DX-ROUND-1117] "n of 12 · room"; answers move on by themselves
      await tid(`answer-${i % 2 === 0 ? 1 : 2}`).click();
    }
    await tid("result").waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);
    await shoot("05-score");

    // [DX-ROUND2-1117] My Progress (the tab is back): the plan with the weekly reminder switched on (local notifications).
    await page.evaluate(() => localStorage.setItem("detoxcellence.reminder.v1", JSON.stringify({ on: true, weekday: 7, hour: 10 })));
    await page.goto(`${base}/swaps`, { waitUntil: "load" });
    await tid("progress").waitFor({ timeout: 30000 });
    await vis("Your plan").waitFor({ timeout: 10000 });
    await settle();
    await shoot("08-progress");

    // [DX-ROUND2-1117] the two reader tools: Is this vermiculite? (EPA photos) and Is my filter certified? (a filter picked)
    await page.goto(`${base}/vermiculite`, { waitUntil: "load" });
    await tid("vermiculite-hero").waitFor({ timeout: 30000 });
    await settle();
    await shoot("09-vermiculite");
    await page.goto(`${base}/water-filter`, { waitUntil: "load" });
    await tid("filter-carbon").waitFor({ timeout: 30000 });
    await settle();
    await tid("filter-carbon").click();
    await tid("filter-row").waitFor({ timeout: 10000 });
    await tid("filter-row").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(600);
    await shoot("10-filter");

    await page.goto(`${base}/about`, { waitUntil: "load" });
    await vis("Detoxcellence").waitFor({ timeout: 30000 }); // About has no "How Scan works" since the trim
    await settle();
    await shoot("06-about");

    if (errors.length) { console.error(`screenshots: ${errors.length} page error(s):\n  ${errors.join("\n  ")}`); process.exitCode = 1; }
    await shot.close();
  }
} finally {
  await browser.close();
  server.close();
}
