#!/usr/bin/env node
/** The Detox lens (src/lib/lens.ts + src/data/lens-detoxcellence.json) against the engine's labels and the bundled
 *  Index: every label the engine tags 'detoxcellence' is mapped, every mapped row exists, a multi-row entry carries
 *  its question, offer() never answers silently, and the room check orders by the Index's own score. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
register(pathToFileURL(resolve(here, "ts-resolve-hook.mjs")));
const { LENS, offer, roomCheck, rowsFor } = await import(pathToFileURL(resolve(root, "src/lib/lens.ts")).href);
const { scoreItem, slugify } = await import(pathToFileURL(resolve(root, "src/lib/score.ts")).href);
const labels = JSON.parse(readFileSync(resolve(root, "modules/health-camera/labels.json"), "utf8")).labels;
const rows = JSON.parse(readFileSync(resolve(root, "src/data/exposures.json"), "utf8")).rows.map((r) => ({ ...r, slug: slugify(r.name), score: scoreItem(r) }));
const bySlug = (s) => rows.find((r) => r.slug === s);

test("every engine label with lens 'detoxcellence' is mapped, and nothing else", () => {
  const detox = labels.filter((l) => (l.lens ?? []).includes("detoxcellence")).map((l) => l.id).sort();
  assert.deepEqual(Object.keys(LENS).sort(), detox);
});
test("every mapped row resolves in the bundled Index; multi-row entries ask one question", () => {
  for (const [label, e] of Object.entries(LENS)) {
    const rs = rowsFor(label);
    assert.ok(rs.length >= 1, label);
    for (const s of rs) assert.ok(bySlug(s), `${label} → ${s}`);
    if (rs.length > 1) assert.ok(e.ask && e.ask.endsWith("?"), `${label} has rows but no question`);
  }
});
test("offer: ≤ 3 lens chips, an off-lens best guess named, never a silent single answer", () => {
  const o = offer([{ label: "food:avocado", score: 0.2 }, { label: "object:nonstick-pan", score: 0.1 }, { label: "object:cast-iron-pan", score: 0.09 }, { label: "object:stainless-steel-pan", score: 0.08 }, { label: "object:canned-food", score: 0.07 }]);
  assert.equal(o.offTopic.label, "food:avocado");
  assert.deepEqual(o.picks.map((c) => c.label), ["object:nonstick-pan", "object:cast-iron-pan", "object:stainless-steel-pan"]);
});
test("room check: each row once, highest burden (lowest Detox Score) first, top swap = first with a swap", () => {
  const ranked = [{ label: "object:glass-food-container", score: 0.2 }, { label: "object:nonstick-pan", score: 0.19 }, { label: "object:scented-candle", score: 0.18 }, { label: "drink:cola", score: 0.17 }, { label: "object:nonstick-pan", score: 0.1 }];
  const { seen, top } = roomCheck(ranked, bySlug);
  assert.equal(new Set(seen.map((x) => x.entry.slug)).size, seen.length);
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i - 1].entry.score <= seen[i].entry.score);
  assert.equal(top.entry.slug, seen.find((x) => x.entry.swap !== "—").entry.slug);
  assert.ok(!seen.some((x) => x.label === "drink:cola"));
});
