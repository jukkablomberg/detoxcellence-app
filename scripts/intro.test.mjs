#!/usr/bin/env node
/**
 * [APP-INTRO-ON-1106] The first-use intro, re-mounted (design/APP-INTRO-STANDARD.md; Jukka 2026-11-06: "The apps don't
 * have intro screens currently. They need to have them and the screens need to be super simple highlighting the key
 * things where the apps/ventures add value."). Checks the REAL app/intro.json, the REAL images and the REAL layout.
 * Rule source: src/studio/intro.ts (studio kit, byte copy of the c8be30b3+ master: 8-word/48-char cap, enabled,
 * prior_use_keys, imageAspect, Skip ≥ 44 pt, Android Back, replayIntro). Each refusal asserts its own message; the shipped
 * config is the positive control. Run: node --test scripts/intro.test.mjs (node ≥ 22.18 strips the .ts types).
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const intro = await import(join(root, "src/studio/intro.ts"));
const cfg = JSON.parse(read("app/intro.json"));
const files = [];
const walk = (d) => { for (const e of readdirSync(join(root, d), { withFileTypes: true })) { const r = `${d}/${e.name}`; if (e.isDirectory()) walk(r); else if (/\.(tsx|ts)$/.test(e.name)) files.push(r.slice(4)); } };
walk("app");
const routes = files.map(intro.routeOf).filter((r) => r !== null);
const bundled = (img) => existsSync(join(root, "assets", img));
const clone = (o) => JSON.parse(JSON.stringify(o));
const problems = (c, f) => intro.introProblems(c, routes, bundled, f);
// APP-INTRO-STANDARD § 1 rules 3, 5, 7: ≤ 8 words and ≤ 48 chars (the kit's introProblems), value only — no welcome,
// sign-in, permission or disclaimer card; FatTonic's retired framing (research/APP-READER-FIRST-2026-11-06.md) never comes
// back through the intro (this app's own word list, on top of the kit).
const BANNED = /welcome|sign.?in|log.?in|account|permission|allow|notification|not medical advice|fat.?burn|insulin/i;
const lineProblems = (c) => c.cards.flatMap((card, i) => (BANNED.test(card.line) ? [`card ${i + 1} line carries a banned word: ${card.line}`] : []));

test("positive control: the shipped intro.json is GREEN, 3 cards, enabled, ends on a real tab", () => {
  assert.deepEqual(problems(cfg), []);
  assert.deepEqual(lineProblems(cfg), []);
  assert.equal(cfg.cards.length, 3);
  assert.notEqual(cfg.enabled, false, "the kill switch is off — the intro would never mount");
  assert.ok(routes.includes(cfg.core_action_route), "the intro ends on a real tab");
});

test("a 4th card, a missing line, a missing or unbundled image are RED", () => {
  const c4 = clone(cfg); while (c4.cards.length < 4) c4.cards.push(clone(c4.cards[0]));
  assert.match(problems(c4).join("; "), /has 4 cards — at most 3/);
  const c = clone(cfg); c.cards[0].line = "  "; c.cards[1].image = ""; c.cards[2].image = "intro/nope.png";
  const p = problems(c).join("; ");
  assert.match(p, /card 1 has no line/);
  assert.match(p, /card 2 has no image/);
  assert.match(p, /card 3 image intro\/nope\.png is not bundled/);
});

test("a line over 8 words, over 48 chars or with a banned word is RED", () => {
  assert.equal(intro.INTRO_MAX_WORDS, 8);
  assert.equal(intro.INTRO_MAX_CHARS, 48);
  const c = clone(cfg);
  c.cards[0].line = "one two three four five six seven eight nine";
  c.cards[1].line = "Supercalifragilisticexpialidocious and more words";
  c.cards[2].line = "Get its fat-burning score";
  const p = problems(c).join("; ");
  assert.match(p, /card 1 line is 9 words — at most 8/);
  assert.match(p, /card 2 line is 49 chars — at most 48/);
  assert.match(lineProblems(c).join("; "), /card 3 line carries a banned word/);
});

test("kill switch, prior-use keys and image shape are typed (kit API)", () => {
  assert.match(problems({ ...clone(cfg), enabled: "no" }).join(), /enabled must be true or false/);
  assert.match(problems({ ...clone(cfg), prior_use_keys: [""] }).join(), /prior_use_keys must be a list of storage keys/);
  assert.match(problems({ ...clone(cfg), imageAspect: 9 }).join(), /imageAspect must be/);
});

test("an image older than the store screenshots is RED (stale cards switched the intro off on 11-02)", () => {
  const stale = { imageMtime: () => 1, shotsMtime: 2 };
  assert.match(problems(cfg, stale).join(), /card 1 image .* is older than the store screenshots — re-shoot it/);
  assert.deepEqual(problems(cfg, { imageMtime: () => 3, shotsMtime: 2 }), [], "a fresh image passes");
});

test("the intro never ends on an account wall or a route that does not exist", () => {
  assert.match(problems({ ...clone(cfg), core_action_route: "/sign-in" }).join(), /is an account wall/);
  assert.match(problems({ ...clone(cfg), core_action_route: "/nowhere" }).join(), /\/nowhere is not a route in app\//);
  assert.match(problems({ ...clone(cfg), core_action_route: undefined }).join(), /core_action_route is missing/);
});

test("shown once: never when the flag is set; the key carries no version (OTA-proof)", () => {
  assert.equal(intro.shouldShowIntro(null), true);
  assert.equal(intro.shouldShowIntro(intro.INTRO_SEEN), false, "intro shown when the flag is set");
  assert.equal(intro.shouldShowIntro(null, true), false, "intro shown to a reader with prior use");
  assert.doesNotMatch(intro.INTRO_FLAG_KEY, /\d|version|update|build/i);
  const ui = read("src/studio/FirstUseIntro.tsx");
  assert.match(ui, /shouldShowIntro\(v, prior\)/, "the component gates on the flag and prior use through the tested function");
  assert.match(ui, /config\.enabled !== false/, "the kit honours the kill switch too");
  assert.match(ui, /skip: \{ minHeight: 44, minWidth: 44/, "Skip hit area ≥ 44 pt");
  assert.match(ui, /BackHandler\.addEventListener\("hardwareBackPress"/, "Android Back = previous card / Skip");
  assert.match(ui, /export async function replayIntro\(/, "the intro can be replayed (rule 10)");
  assert.match(ui, /setItem\(INTRO_FLAG_KEY, INTRO_SEEN\)/, "Done/Skip write the flag");
  assert.match(ui, /router\.replace\(config\.core_action_route/, "Done/Skip land on the core action");
  assert.match(ui, /onPress=\{finish\}[^]*\{word\("Skip"\)\}/, "Skip is on the cards and finishes the intro");
  assert.doesNotMatch(ui, /Animated|LayoutAnimation|setTimeout|setInterval/, "no motion and no auto-advance (reduce-motion, WCAG 2.2.2)");
  assert.doesNotMatch(ui, /requestPermission|Notifications|Location|Camera/, "the intro never asks for a permission");
});

test("fresh installs only: a reader who used the app before is marked seen silently (rule 11)", () => {
  const gate = read("src/lib/intro-gate.ts");
  assert.match(gate, /enabled === false\) return false/, "intro.json enabled:false is the OTA kill switch");
  assert.match(gate, /multiGet/, "the gate reads the app's own keys");
  assert.match(gate, /setItem\(INTRO_FLAG_KEY, INTRO_SEEN\)/, "prior use writes the flag without showing");
  assert.ok(Array.isArray(cfg.prior_use_keys) && cfg.prior_use_keys.length >= 2, "intro.json names the app's own storage keys");
  const src = files.map((f) => read(`app/${f}`)).join("\n") + readdirSync(join(root, "src/lib")).map((f) => read(`src/lib/${f}`)).join("\n");
  for (const k of cfg.prior_use_keys) assert.ok(src.includes(`"${k}"`), `prior_use_keys: ${k} is not a key this app writes`);
});

test("re-mounted: the layout mounts <FirstUseIntro/> after the gate, with this scheme's images", () => {
  const layout = read("app/_layout.tsx");
  assert.doesNotMatch(layout, /OFF since \[APP-INTRO-OFF\]/, "the intro is still switched off");
  assert.match(layout, /introMayShow\(/, "the layout runs the fresh-install gate");
  assert.match(layout, /\{introOk \? \(?\s*<FirstUseIntro/, "FirstUseIntro mounts only once the gate said yes");
  assert.match(layout, /introImages\(/, "the images follow the app's scheme");
});

test("every card has a light and a dark image, mapped for Metro, a real crop ≤ 250 KB", () => {
  const src = read("src/lib/intro-images.ts");
  const light = [...src.matchAll(/"(intro\/[^"]+)": require\("\.\.\/\.\.\/assets\/(intro\/[^"]+)"\)/g)];
  const keys = cfg.cards.map((c) => c.image).sort();
  assert.deepEqual([...new Set(light.map((m) => m[1]))].sort(), keys, "every intro.json image is mapped and every mapping is used");
  for (const k of keys) {
    for (const p of [`assets/${k}`, `assets/${k.replace("intro/", "intro/dark/")}`]) {
      assert.ok(existsSync(join(root, p)), `${p} is missing`);
      assert.ok(src.includes(`require("../../${p}")`), `${p} is not required in intro-images.ts`);
      assert.ok(statSync(join(root, p)).size <= 250 * 1024, `${p} is over 250 KB`);
    }
  }
});
