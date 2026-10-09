#!/usr/bin/env node
/**
 * Acceptance as a script, not a look (docs/scan-flow.md rule 5; the FatTonic A4 harness pattern,
 * projects/fattonic/camera-lab/a4-render/app-render.mjs). Runs the web export at 390×844 with detoxcellence.com
 * BLOCKED (the offline claim), every check named, exit 1 on any failed check or any page error.
 *
 *   npx expo export --platform web --output-dir web-export && \
 *   LD_LIBRARY_PATH=<OS>/_meta/render-audit/.browsers/lib node scripts/app-render.mjs web-export <out-dir>
 *
 * C1 checks (stated before running, HEALTH-TRIO-DAY § 5 C1): the Index lists every bundled entry offline · search
 * narrows it · an entry page opens at /exposure/<slug> with the site's own Detox Score · back returns to the list ·
 * the quiz runs 15 questions to a result whose score equals scoreQuiz() and lands in the history · the result's
 * next step opens the Index on that area · Swaps lists the next 8 swaps · the "i" opens About · 3 tabs with labels.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";
import { launchChromium } from "./browser.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(here, "ts-resolve-hook.mjs")));
const { scoreItem, slugify } = await import(pathToFileURL(path.join(here, "../src/lib/score.ts")).href);
const { scoreQuiz, QUESTIONS } = await import(pathToFileURL(path.join(here, "../src/lib/quiz.ts")).href);
const rows = JSON.parse(fs.readFileSync(path.join(here, "../src/data/exposures.json"), "utf8")).rows;

const [root, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".ttf": "font/ttf", ".json": "application/json" };
const server = http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, "index.html");
  res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
}).listen(0);
await new Promise((r) => server.once("listening", r));
const BASE = `http://localhost:${server.address().port}`;
const browser = await launchChromium();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error" && !/detoxcellence\.com|ERR_FAILED|Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
let siteCalls = 0;
await page.route("https://detoxcellence.com/**", (r) => { siteCalls++; return r.abort(); });
const vis = (t) => page.getByText(t, { exact: false }).filter({ visible: true });
const tid = (id) => page.locator(`[data-testid="${id}"]:visible`);
const tab = (name) => page.getByRole("tab", { name }).or(page.getByRole("link", { name })).filter({ visible: true }).last();
const pathname = () => new URL(page.url()).pathname;
/** The native-stack back on web: expo-router renders the header back as a link/button whose name says "back". */
const backCtl = () => page.getByRole("link", { name: /back/i }).or(page.getByRole("button", { name: /back/i })).filter({ visible: true });
const checks = {}, facts = {};
const step = async (name, fn) => { try { checks[name] = !!(await fn()); } catch (e) { checks[name] = false; facts[`${name}:error`] = String(e).slice(0, 300); } };

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await tid("index-search").waitFor({ timeout: 20000 });
await page.getByLabel("Detoxcellence, built by JukkaBlomberg.com").waitFor({ state: "detached", timeout: 5000 }).catch(() => {}); // the brand moment (≤ 1 s)
await page.screenshot({ path: `${out}/1-index.png` });

await step("tabsThreeLabelled", async () => (await Promise.all(["Index", "Score", "Swaps"].map(async (n) => (await tab(n).count()) >= 1))).every(Boolean));
await step("indexListsAllOffline", async () => (await vis(`${rows.length} of ${rows.length}`).count()) >= 1 && (await vis("bundled with the app").count()) >= 1);
await step("disclosureOnFirstScreen", async () => (await vis("Information, not medical advice").count()) >= 1);

const pan = rows.find((r) => /nonstick/i.test(r.name));
const panSlug = slugify(pan.name);
facts.panEntry = { name: pan.name, slug: panSlug, score: scoreItem(pan) };
await tid("index-search").fill("nonstick");
await page.waitForTimeout(300);
await step("searchNarrows", async () => (await tid(`row-${panSlug}`).count()) === 1 && (await vis(`${rows.length} of ${rows.length}`).count()) === 0);
await tid(`row-${panSlug}`).click();
await page.waitForURL(new RegExp(`/exposure/${panSlug}$`), { timeout: 10000 });
await tid("entry-score").waitFor();
await page.screenshot({ path: `${out}/2-entry.png`, fullPage: true });
await step("entryUrl", () => pathname() === `/exposure/${panSlug}`);
await step("entryScoreIsSites", async () => (await tid("entry-score").innerText()).includes(String(scoreItem(pan))));
await step("entrySections", async () => { for (const h of ["How the score is built", "Evidence behind each rating", "Cleaner swap"]) if ((await vis(h).count()) < 1) return false; return true; });
facts.headerControls = await page.evaluate(() => [...document.querySelectorAll("a,button,[role=button],[role=link]")].filter((e) => { const r = e.getBoundingClientRect(); return r.top < 64 && r.left < 80 && r.width > 0 && r.height > 0; }).map((e) => `${e.tagName}|${e.getAttribute("role")}|${e.getAttribute("aria-label")}`));
await step("entryHasPlatformBack", async () => (await backCtl().count()) >= 1);
await backCtl().first().click();
await tid("index-search").waitFor({ timeout: 10000 });
await step("backReturnsToIndex", () => pathname() === "/");

// the quiz: all-worst answers, compared with scoreQuiz()
await tab("Score").click();
await tid("start-quiz").waitFor({ timeout: 10000 });
await page.screenshot({ path: `${out}/3-score-intro.png` });
await tid("start-quiz").click();
const answers = QUESTIONS.map((q) => q.answers.length - 1);
for (let i = 0; i < answers.length; i++) {
  await vis(`Question ${i + 1} of ${QUESTIONS.length}`).first().waitFor({ timeout: 5000 });
  await tid(`answer-${answers[i]}`).click();
}
await tid("result").waitFor({ timeout: 10000 });
await page.screenshot({ path: `${out}/4-result.png`, fullPage: true });
const expected = scoreQuiz(answers);
facts.quizExpected = { pct: expected.pct, profile: expected.profile.title };
await step("quizResultEqualsPort", async () => { const t = await tid("result").innerText(); return t.includes(String(expected.pct)) && t.includes(expected.profile.title); });
await step("historySaved", async () => (await tid("score-history").count()) === 1 && (await tid("score-history").innerText()).includes(String(expected.pct)));
await tid("result-next").click();
await tid("index-search").waitFor({ timeout: 10000 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/5-next.png` });
facts.nextDriver = expected.driver;
await step("resultNextFiltersIndex", async () => {
  const cat = { water: "Water", air: "Air", plastic: "Plastics", food: "Food", care: "Personal Care", home: "Home" }[expected.driver];
  if (!cat) return true;
  const n = rows.filter((r) => r.category === cat).length;
  return (await vis(`${n} of ${rows.length}`).count()) >= 1;
});

await tab("Swaps").click();
await tid("reminder-switch").waitFor({ timeout: 10000 });
await page.screenshot({ path: `${out}/6-swaps.png`, fullPage: true });
await step("swapsListsEight", async () => (await page.locator('[data-testid^="swap-"]:visible').count()) === 8);

await page.getByRole("button", { name: "About Detoxcellence" }).or(page.getByRole("link", { name: "About Detoxcellence" })).filter({ visible: true }).first().click();
await vis("More from JukkaBlomberg.com").first().waitFor({ timeout: 10000 }).catch(() => {});
await page.screenshot({ path: `${out}/7-about.png`, fullPage: true });
await step("infoOpensAbout", () => pathname() === "/about");

facts.siteCallsBlocked = siteCalls;
facts.pageErrors = errors;
const ok = Object.values(checks).every(Boolean) && errors.length === 0;
fs.writeFileSync(`${out}/c1-render-result.json`, JSON.stringify({ ok, checks, facts }, null, 2));
console.log(JSON.stringify({ ok, checks, facts }, null, 2));
await browser.close();
server.close();
process.exit(ok ? 0 : 1);
