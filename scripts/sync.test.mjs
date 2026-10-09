#!/usr/bin/env node
/**
 * Red-proof (L16) of `npm run check:exposures-sync`: against a throwaway copy of the site, each planted drift must
 * turn the check RED for its own reason, and the untouched copy must be GREEN.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const SITE = process.env.DETOXCELLENCE_SITE_REPO ?? resolve(here, "../../repo");

function run(mutate) {
  const dir = mkdtempSync(join(tmpdir(), "dx-sync-"));
  try {
    for (const rel of ["data/export/exposures.json", "assets/quiz.js"]) cpSync(join(SITE, rel), join(dir, rel), { recursive: true });
    mutate?.(dir);
    const r = spawnSync(process.execPath, [join(here, "sync-exposures.mjs"), "--check"], { env: { ...process.env, DETOXCELLENCE_SITE_REPO: dir }, encoding: "utf8" });
    return { code: r.status, err: r.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const edit = (dir, rel, fn) => writeFileSync(join(dir, rel), fn(readFileSync(join(dir, rel), "utf8")));

test("control: the site as it is → GREEN", () => {
  const r = run();
  assert.equal(r.code, 0, r.err);
});
test("a row's rating changes on the site → RED (index drift)", () => {
  const r = run((d) => edit(d, "data/export/exposures.json", (s) => s.replace('"hazard": 4,', '"hazard": 5,')));
  assert.equal(r.code, 1);
  assert.match(r.err, /exposures\.json differs/);
});
test("a quiz weight changes on the site → RED (quiz drift)", () => {
  const r = run((d) => edit(d, "assets/quiz.js", (s) => s.replace('["A carbon pitcher/tap filter",8,null]', '["A carbon pitcher/tap filter",7,null]')));
  assert.equal(r.code, 1);
  assert.match(r.err, /quiz\.json differs/);
});
test("a scoring rule changes on the site → RED (rule no longer present)", () => {
  const r = run((d) => edit(d, "assets/quiz.js", (s) => s.replace("if(pct>=80)driver='balanced';", "if(pct>=85)driver='balanced';")));
  assert.equal(r.code, 1);
  assert.match(r.err, /pct ≥ 80 → balanced/);
});
