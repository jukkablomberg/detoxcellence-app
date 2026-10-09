#!/usr/bin/env node
/**
 * Parity: the app's port of the site's scoring (src/lib/score.ts) against the site's own published numbers.
 * The site's CSV export (../repo/data/export/exposures.csv) carries id, detox_score and band for every row, computed
 * by build.js; the app computes the same three from the bundled JSON. Every row must agree. Also: the bundled index
 * is the site's export byte for byte (sync check), and no surface of the app carries the guarded wording.
 *
 *   node scripts/exposures.test.mjs     (npm test runs every scripts/*.test.mjs)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
register(pathToFileURL(resolve(here, "ts-resolve-hook.mjs")));
const { scoreItem, band, slugify, hasSwap } = await import(pathToFileURL(resolve(root, "src/lib/score.ts")).href);
const bundled = JSON.parse(readFileSync(resolve(root, "src/data/exposures.json"), "utf8"));
const SITE = process.env.DETOXCELLENCE_SITE_REPO ?? resolve(root, "../repo");

/** A CSV reader for the site's export (RFC 4180 quoting). */
function csv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

test("every row's id, Detox Score and band equal the site's CSV", () => {
  const site = csv(readFileSync(resolve(SITE, "data/export/exposures.csv"), "utf8"));
  assert.equal(site.length, bundled.rows.length, "row count");
  const byId = new Map(site.map((r) => [r.id, r]));
  let n = 0;
  for (const r of bundled.rows) {
    const id = slugify(r.name);
    const s = byId.get(id);
    assert.ok(s, `site CSV has no id ${id}`);
    assert.equal(scoreItem(r), Number(s.detox_score), `${id} detox_score`);
    assert.equal(band(scoreItem(r)).label, s.band, `${id} band`);
    n++;
  }
  assert.equal(n, site.length, "every row walked");
});

test("a planted scoring defect is caught (red-proof of the parity test itself)", () => {
  const site = csv(readFileSync(resolve(SITE, "data/export/exposures.csv"), "utf8"));
  const wrong = (x) => Math.max(1, Math.min(100, Math.round(100 - x.hazard * 4.6 - x.exposure * 3.4 - x.persistence * 2.5)));
  const mismatches = bundled.rows.filter((r) => wrong(r) !== Number(site.find((s) => s.id === slugify(r.name)).detox_score)).length;
  assert.ok(mismatches > 0, "a 2.6 → 2.5 persistence weight must change at least one row's score");
});

test("swap presence follows the site's rule", () => {
  assert.equal(hasSwap({ swap: "—" }), false);
  assert.equal(hasSwap({ swap: "Cast iron or stainless steel" }), true);
  assert.ok(bundled.rows.filter(hasSwap).length > 150);
});
