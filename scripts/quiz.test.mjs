#!/usr/bin/env node
/**
 * Parity: the app's Home Check ([HOME-REFOCUS] 2026-10-31; src/lib/quiz.ts over src/data/quiz.json) against the SITE'S
 * OWN quiz.js, run as written. The site's file is executed in a sandbox with a minimal fake DOM; each fixed answer set is clicked
 * through it, and the score and profile it renders are compared with scoreQuiz(). Nothing is re-typed here.
 *
 * Vectors: all-best, all-worst, each single-room-heavy pattern, a tie between two rooms (sort order decides), the
 * room-70 "nothing first" boundary, and 400 seeded random answer sets — pct, the title and every room's number.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
register(pathToFileURL(resolve(here, "ts-resolve-hook.mjs")));
const { QUESTIONS, ROOMS, ROOM_ORDER, scoreQuiz, MAX } = await import(pathToFileURL(resolve(root, "src/lib/quiz.ts")).href);
const SITE = process.env.DETOXCELLENCE_SITE_REPO ?? resolve(root, "../repo");
const QUIZ_JS = readFileSync(resolve(SITE, "assets/quiz.js"), "utf8");

/** Run the site's quiz.js once with these answers; return what its result screen shows. */
function siteResult(answers) {
  const els = {};
  const mk = (id) => (els[id] ??= { id, innerHTML: "", style: {}, dataset: {}, parentNode: { setAttribute() {} }, setAttribute() {}, querySelectorAll: () => [], querySelector: () => ({}), classList: { add() {} } });
  let pending = [];
  const stage = mk("qstage");
  stage.querySelectorAll = () => {
    const n = (stage.innerHTML.match(/class="qopt"/g) || []).length;
    return Array.from({ length: n }, (_, i) => ({ dataset: { i: String(i) }, classList: { add() {} }, set onclick(f) { pending[i] = f; } }));
  };
  const sandbox = {
    document: { getElementById: mk, addEventListener() {}, visibilityState: "visible" },
    window: { matchMedia: () => ({ matches: true }), addEventListener() {} },
    setTimeout: (f) => f(),
    clearTimeout() {},
    location: { pathname: "/quiz.html" },
    fetch: () => new Promise(() => {}),
    Array, Math, JSON, String, Object,
  };
  sandbox.window.document = sandbox.document;
  vm.runInNewContext(QUIZ_JS, sandbox);
  for (const a of answers) {
    const click = pending[a];
    assert.ok(click, "site quiz rendered no such option");
    pending = [];
    click();
  }
  const html = stage.innerHTML;
  const pct = Number(/<span class="big"[^>]*>(\d+)<\/span>/.exec(html)?.[1]);
  const title = /<p class="rprofile">([^<]*)<\/p>/.exec(html)?.[1];
  const first = /<div class="rfix"><strong>Do this first:<\/strong><br>([\s\S]*?)<\/div>/.exec(html)?.[1];
  // the room report: one <a class="frow hc-<band>"> per room, in ROOM_ORDER, with its number
  const rooms = [...html.matchAll(/<a class="frow hc-(\w+)" [^>]*><span class="fscore [^"]*">(\d+)<\/span>/g)].map((m) => ({ band: m[1], pct: Number(m[2]) }));
  return { pct, title, first, rooms };
}

function check(answers, label) {
  const site = siteResult(answers);
  const app = scoreQuiz(answers);
  assert.equal(app.pct, site.pct, `${label}: pct`);
  assert.equal(app.title, site.title, `${label}: title`);
  assert.equal(app.first, site.first, `${label}: do this first`);
  assert.equal(app.report.length, site.rooms.length, `${label}: rooms`);
  app.report.forEach((r, i) => {
    assert.equal(r.pct, site.rooms[i].pct, `${label}: room ${r.k} pct`);
    assert.equal(r.band, site.rooms[i].band, `${label}: room ${r.k} band`);
  });
}

test("the bundled questions are the site's (count, MAX, rooms)", () => {
  assert.equal(QUESTIONS.length, 12);
  assert.equal(MAX, 120);
  assert.equal(Object.keys(ROOMS).length, 6);
  assert.deepEqual(ROOM_ORDER, ["older", "water", "kitchen", "structure", "living", "cleaning"]);
});

test("fixed vectors match the site's quiz.js", () => {
  const n = QUESTIONS.length;
  check(Array(n).fill(0), "all best");
  check(Array(n).fill(3), "all worst");
  check(Array(n).fill(1), "all second");
  check(Array(n).fill(2), "all third");
  for (const dom of ROOM_ORDER) {
    check(QUESTIONS.map((q) => (q.dom === dom ? 3 : 0)), `${dom}-heavy`);
  }
  // a tie between two rooms at the same (bad) number — the site's sort keeps ROOM_ORDER, so the earlier room wins
  check(QUESTIONS.map((q) => (q.dom === "kitchen" || q.dom === "cleaning" ? 3 : 0)), "kitchen/cleaning tie");
  // every room exactly at 70 → "nothing to worry about first"
  check(QUESTIONS.map((q) => q.answers.findIndex((a) => a.weight === 7) >= 0 ? q.answers.findIndex((a) => a.weight === 7) : 0), "rooms at the 70 line");
});

test("400 seeded random answer sets match the site's quiz.js", () => {
  let seed = 20261009;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let k = 0; k < 400; k++) check(QUESTIONS.map((q) => Math.floor(rnd() * q.answers.length)), `random #${k}`);
});

test("the comparison can fail (red-proof): a planted off-by-one answer is caught", () => {
  const answers = Array(QUESTIONS.length).fill(0);
  const site = siteResult(answers);
  const app = scoreQuiz(answers.map((a, i) => (i === 0 ? 3 : a)));
  assert.notEqual(app.pct, site.pct);
});
