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
 * next step opens the Index on that area · Swaps lists the next 8 swaps · the "i" opens About · tabs with labels.
 * C2 checks (docs/scan-flow.md rules 1–4, stated before running): the front page is the target, ≥ 35 % of the
 * screen, above the fold, ≤ 25 words above it, aisles below · "Is it…" chips with a reference photo and a header
 * back · a two-row label asks its question, then opens the entry; back returns to the question · header back, the
 * Scan tab, the brand and Scan another each land on the front page · all 12 Detox evaluation classes resolve to
 * their row through the chips (?demo=<label>, web only) · the room check lists rows highest burden first with a top
 * swap · an aisle opens the Index on that category.
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
const { rowsFor } = await import(pathToFileURL(path.join(here, "../src/lib/lens.ts")).href);
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

/* ---------------- C2: the scan flow (docs/scan-flow.md) ---------------- */
const H = 844;
const target = () => tid("scan-target");
const atHome = async () => (await target().count()) === 1 && (await vis("Is it…").count()) === 0;
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await target().waitFor({ timeout: 20000 });
await page.getByLabel("Detoxcellence, built by JukkaBlomberg.com").waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
await page.screenshot({ path: `${out}/0-scan-home.png` });
const box = await target().boundingBox();
facts.target = box;
facts.copyAboveTarget = await page.evaluate((top) => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const words = [];
  while (w.nextNode()) { const n = w.currentNode; if (!n.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); if (b.width && b.bottom <= top && b.top >= 0) words.push(n.textContent.trim()); }
  return words;
}, box.y);
await step("r1TargetAboveFold", () => box.y >= 0 && box.y + box.height <= H);
await step("r1TargetBig", () => box.height >= 0.35 * H);
await step("r1LittleAboveTarget", () => facts.copyAboveTarget.join(" ").split(/\s+/).filter(Boolean).length <= 25);
await step("r1HasAisles", async () => (await vis("Browse the aisles").count()) === 1);
await page.screenshot({ path: `${out}/0b-scan-home-full.png`, fullPage: true });

await target().click();
await vis("Is it…").first().waitFor({ timeout: 10000 });
await page.screenshot({ path: `${out}/0c-pick.png` });
await step("r2ChipsWithPhoto", async () => (await page.locator('[data-testid="chip-photo"]:visible').count()) >= 1);
await step("r4PickHasBack", async () => (await tid("scan-back").count()) === 1);
await page.getByRole("button", { name: "Plastic water bottle" }).filter({ visible: true }).first().click();
await vis("Bought bottled water, or a bottle you refill?").first().waitFor({ timeout: 5000 });
await step("r2AskQuestion", async () => (await tid("ask-bottled-water-plastic").count()) === 1 && (await tid("ask-canned-reused-plastic-bottles").count()) === 1);
await tid("ask-bottled-water-plastic").click();
await page.waitForURL(/\/exposure\/bottled-water-plastic$/, { timeout: 10000 });
await step("r3OneEntryPage", async () => (await tid("entry-score").count()) === 1);
await step("r4EntryEndsScanAnother", async () => (await tid("scan-another").count()) === 1);
await backCtl().first().click();
await vis("Bought bottled water, or a bottle you refill?").first().waitFor({ timeout: 10000 }).catch(() => {});
await step("r3BackReturnsToQuestion", async () => pathname() === "/" && (await vis("Bought bottled water, or a bottle you refill?").count()) >= 1);
await tid("scan-back").click();
await step("r4HeaderBackHome", atHome);
await target().click();
await vis("Is it…").first().waitFor({ timeout: 10000 });
await tab("Scan").click();
await page.waitForTimeout(400);
// NativeTabs on the WEB is a Radix tab list, which does not fire on re-selecting the active tab, so the Scan tab's
// "press me again → home" (tabPress, emitted by the native tab bars on iOS + Android) cannot be driven here. Recorded,
// not counted: it is on the phone-check list (scan-flow rule 5 — native-only paths go to the phone).
facts.r4ScanTabHomeWeb = (await atHome()) ? "home" : "not driveable on web (Radix ignores re-selecting the active tab) → phone check";
if (!(await atHome())) await tid("scan-back").click();
// Scan another, from an entry page three deep
await target().click();
await vis("Is it…").first().waitFor({ timeout: 10000 });
await page.getByRole("button", { name: "Shampoo bottle" }).filter({ visible: true }).first().click();
await page.waitForURL(/\/exposure\/conventional-shampoo$/, { timeout: 10000 });
await tid("scan-another").click();
await page.waitForTimeout(500);
await step("r4ScanAnotherHome", async () => pathname() === "/" && (await atHome()));

// every Detox evaluation class → its row, through the chips
const DETOX = ["object:nonstick-pan", "object:cast-iron-pan", "object:stainless-steel-pan", "object:plastic-food-container", "object:glass-food-container", "object:takeout-container", "object:scented-candle", "object:shampoo-bottle", "object:plastic-cutting-board", "object:plastic-water-bottle", "object:canned-food", "food:strawberries"];
facts.classes = {};
for (const label of DETOX) {
  try {
    await page.goto(`${BASE}/?demo=${encodeURIComponent(label)}`, { waitUntil: "networkidle" });
    await vis("Is it…").first().waitFor({ timeout: 10000 });
    const want = rowsFor(label)[0];
    const name = (await import(pathToFileURL(path.join(here, "../src/lib/lens.ts")).href)).displayName(label);
    await page.getByRole("button", { name, exact: true }).filter({ visible: true }).first().click();
    if (rowsFor(label).length > 1) await tid(`ask-${want}`).click();
    await page.waitForURL(new RegExp(`/exposure/${want}$`), { timeout: 10000 });
    await tid("entry-score").waitFor({ timeout: 5000 });
    facts.classes[label] = want;
  } catch (e) { facts.classes[label] = `FAIL ${String(e).slice(0, 120)}`; }
}
await step("c2TwelveDetoxClassesResolve", () => DETOX.every((l) => facts.classes[l] === rowsFor(l)[0]));

// the room check (web: the demo photo's real ranking)
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await tid("room-check").click();
await tid("room-result").waitFor({ timeout: 10000 });
await page.screenshot({ path: `${out}/0d-room.png`, fullPage: true });
facts.room = await page.locator('[data-testid^="room-"]:visible').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")).filter((id) => !["room-result", "room-top-swap", "room-check"].includes(id)).map((id) => id.slice(5)));
await step("roomOrderedByBurden", () => { const sc = facts.room.map((s) => scoreItem(rows.find((r) => slugify(r.name) === s))); return sc.length >= 2 && sc.every((v, i) => i === 0 || sc[i - 1] <= v); });
await step("roomTopSwap", async () => (await tid("room-top-swap").count()) === 1);
await tid("scan-back").click();
await page.getByRole("button", { name: /^Kitchen, \d+ entries$/ }).filter({ visible: true }).first().click();
await tid("index-search").waitFor({ timeout: 10000 });
await page.waitForTimeout(300);
await step("aisleOpensIndexCategory", async () => (await vis(`${rows.filter((r) => r.category === "Kitchen").length} of ${rows.length}`).count()) >= 1);
// On the web the native tab bar is drawn as a floating pill over the header (web-only); press the brand directly.
await page.getByRole("button", { name: "Index — go to Scan" }).filter({ visible: true }).first().dispatchEvent("click");
await page.waitForTimeout(500);
await step("r4BrandHome", async () => pathname() === "/" && (await atHome()));

/* ---------------- C1: Index, entry, quiz, swaps, About ---------------- */
await tab("Index").click();
await tid("index-search").waitFor({ timeout: 20000 });
await tid("cat-all").click();
await page.screenshot({ path: `${out}/1-index.png` });

await step("tabsFourLabelled", async () => (await Promise.all(["Scan", "Index", "Score", "Swaps"].map(async (n) => (await tab(n).count()) >= 1))).every(Boolean));
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
await step("backReturnsToIndex", () => pathname() === "/exposures");

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
fs.writeFileSync(`${out}/render-result.json`, JSON.stringify({ ok, checks, facts }, null, 2));
console.log(JSON.stringify({ ok, checks, facts }, null, 2));
await browser.close();
server.close();
process.exit(ok ? 0 : 1);
