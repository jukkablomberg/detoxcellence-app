#!/usr/bin/env node
/**
 * The Exposure Index and the Exposure Score questionnaire are BUNDLED into the app from the site repo, so
 * every entry, its swap, its studies and the quiz work offline (native value "exposure lookup offline").
 * The site is the single source (HEALTH-TRIO-DAY § 1, data spine first); this script copies, and
 * `npm run check:exposures-sync` fails the tree when the copy drifts — the FatTonic `sync:foods` pattern.
 *
 *   src/data/exposures.json  ← ../repo/data/export/exposures.json   (the published /data/ door, CC BY 4.0, byte copy)
 *   src/data/quiz.json       ← ../repo/assets/quiz.js               (the Q / ROOMS / ROOM_ORDER literals, evaluated —
 *                                                                     never retyped, so the app's questions, weights
 *                                                                     and profile copy cannot differ from the site's)
 *
 *   node scripts/sync-exposures.mjs           write both copies
 *   node scripts/sync-exposures.mjs --check   exit 1 if either copy differs from what the site would produce
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = process.env.DETOXCELLENCE_SITE_REPO ?? resolve(root, "../repo");
const check = process.argv.includes("--check");

const die = (msg, code = 1) => { console.error(`sync-exposures: ${msg}`); process.exit(code); };

/* ---- the index ---- */
const XSRC = resolve(SITE, "data/export/exposures.json");
const XDST = resolve(root, "src/data/exposures.json");
if (!existsSync(XSRC)) die(`source not found at ${XSRC}`, 2);
const xsrc = readFileSync(XSRC, "utf8");
const doc = JSON.parse(xsrc);
if (!doc || !Array.isArray(doc.rows) || doc.rows.length === 0) die("export has no rows");
if (!/^\d+\.\d+\.\d+$/.test(doc.version ?? "")) die("export has no semver version");
for (const r of doc.rows) {
  for (const k of ["name", "category", "context", "swap", "note", "room"]) if (typeof r[k] !== "string") die(`row "${r.name}" ${k} is not a string`);
  for (const k of ["hazard", "exposure", "persistence"]) if (typeof r[k] !== "number" || r[k] < 0 || r[k] > 10) die(`row "${r.name}" ${k} is not a 0-10 number`);
  if (![1, 2, 3].includes(r.evidence)) die(`row "${r.name}" evidence is not 1-3`);
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
if (new Set(doc.rows.map((r) => slug(r.name))).size !== doc.rows.length) die("two rows share a slug");

/* ---- the quiz: evaluate the site's literals in a sandbox that has no DOM, so nothing else in the file runs ---- */
const QSRC = resolve(SITE, "assets/quiz.js");
const QDST = resolve(root, "src/data/quiz.json");
if (!existsSync(QSRC)) die(`source not found at ${QSRC}`, 2);
const qjs = readFileSync(QSRC, "utf8");
function literal(name) {
  const at = qjs.indexOf(`var ${name}=`);
  if (at < 0) die(`assets/quiz.js has no "var ${name}=" — the site's quiz changed shape; update this extractor`);
  const open = qjs.indexOf(name === "Q" || name === "ROOM_ORDER" ? "[" : "{", at);
  let depth = 0, inStr = null;
  for (let i = open; i < qjs.length; i++) {
    const c = qjs[i];
    if (inStr) { if (c === "\\") i++; else if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === "[" || c === "{") depth++;
    if (c === "]" || c === "}") { depth--; if (depth === 0) return vm.runInNewContext(`(${qjs.slice(open, i + 1)})`, {}); }
  }
  die(`unbalanced literal for ${name}`);
}
const Q = literal("Q"), ROOMS = literal("ROOMS"), ROOM_ORDER = literal("ROOM_ORDER");
/* [HOME-REFOCUS] 2026-10-31: the site's quiz is the Home Check v1 — twelve house questions, each tagged with a ROOM
   (dom), scored room by room. The scoring rules that live in code, not data, are pinned here and asserted against
   the site's source text. If the site changes one, --check goes red instead of the app silently scoring differently. */
const RULES = [
  ["max = 10 per question", "var MAX=Q.length*10;"],
  ["pct = round(score / MAX * 100)", "var pct=Math.round(state.score/MAX*100);"],
  ["room pct = round(sum / (n × 10) × 100), 100 when unanswered", "var rp=r[1]?Math.round(r[0]/(r[1]*10)*100):100;"],
  ["room band 70 / 40 (fine · worth a look · worry)", "function bandOf(pct){return pct>=70?[\"Fine\",\"fine\"]:pct>=40?[\"Worth a look\",\"look\"]:[\"Worry \\u2014 do this first\",\"worry\"];}"],
  ["driver = the worst room when it is below 70, else balanced", "var driver=worst&&worst.pct<70?worst.k:'balanced';"],
  ["band colour cut-offs 75 / 55 / 35 / 20", "return pct>=75?'#46615B':pct>=55?'#5A7236':pct>=35?'#8A6420':pct>=20?'#A5512F':'#943327';"],
];
for (const [what, text] of RULES) if (!qjs.includes(text)) die(`the site's quiz rule "${what}" is no longer in assets/quiz.js — re-port the scoring before syncing`);
const quiz = {
  _note: "GENERATED by scripts/sync-exposures.mjs from the site's assets/quiz.js (the Home Check v1, [HOME-REFOCUS] 2026-10-31) — do not edit. Scoring rules: src/lib/quiz.ts (asserted against the site's source text at sync time).",
  questions: Q.map((x) => ({ q: x.q, sub: x.sub, dom: x.dom, answers: x.a.map(([label, weight, tag]) => ({ label, weight, tag })) })),
  rooms: Object.fromEntries(Object.entries(ROOMS).map(([k, [label, href, first, linkLabel]]) => [k, { label, href, first, linkLabel }])),
  roomOrder: ROOM_ORDER,
};
for (const x of quiz.questions) {
  if (x.answers.length < 2) die(`question "${x.q}" has fewer than 2 answers`);
  if (!(x.dom in quiz.rooms)) die(`question "${x.q}" names a room "${x.dom}" that ROOMS does not hold`);
  for (const a of x.answers) if (typeof a.weight !== "number" || a.weight < 0 || a.weight > 10) die(`answer "${a.label}" weight out of 0-10`);
}
for (const k of quiz.roomOrder) if (!(k in quiz.rooms)) die(`ROOM_ORDER names "${k}" that ROOMS does not hold`);
const qout = JSON.stringify(quiz, null, 1) + "\n";

if (check) {
  const bad = [];
  if ((existsSync(XDST) ? readFileSync(XDST, "utf8") : "") !== xsrc) bad.push("src/data/exposures.json differs from ../repo/data/export/exposures.json");
  if ((existsSync(QDST) ? readFileSync(QDST, "utf8") : "") !== qout) bad.push("src/data/quiz.json differs from ../repo/assets/quiz.js");
  if (bad.length) die(`--check: ${bad.join("; ")} — run \`npm run sync:exposures\``);
  console.error(`sync-exposures --check: in sync (index ${doc.version}, ${doc.rows.length} entries; Home Check ${quiz.questions.length} questions, ${Object.keys(quiz.rooms).length} rooms)`);
} else {
  writeFileSync(XDST, xsrc);
  writeFileSync(QDST, qout);
  console.error(`sync-exposures: index ${doc.version} (${doc.rows.length} entries) → src/data/exposures.json; quiz (${quiz.questions.length} questions) → src/data/quiz.json`);
}
