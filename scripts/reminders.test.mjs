#!/usr/bin/env node
/** The weekly swap plan (src/lib/swap-plan.ts): dates land on the chosen weekday/hour, weeks are distinct, the
 *  reader's own area comes first, worst-first, and no "—" entry is ever sent as a swap. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
register(pathToFileURL(resolve(here, "ts-resolve-hook.mjs")));
const { plan, swapQueue, nextDates, WEEKS_AHEAD } = await import(pathToFileURL(resolve(root, "src/lib/swap-plan.ts")).href);
const { scoreItem, slugify } = await import(pathToFileURL(resolve(root, "src/lib/score.ts")).href);
const rows = JSON.parse(readFileSync(resolve(root, "src/data/exposures.json"), "utf8")).rows.map((r) => ({ ...r, slug: slugify(r.name), score: scoreItem(r) }));

test("dates: the chosen weekday and hour, strictly after now, one week apart", () => {
  const from = new Date(2026, 9, 9, 10, 30); // Fri 9 Oct 2026 10:30 local
  const ds = nextDates(from, { on: true, weekday: 7, hour: 10 }, 3); // Sundays 10:00
  assert.deepEqual(ds.map((d) => [d.getDay(), d.getHours(), d.getDate()]), [[0, 10, 11], [0, 10, 18], [0, 10, 25]]);
  const fri = nextDates(from, { on: true, weekday: 5, hour: 10 }, 1)[0]; // Friday 10:00 already passed today → next week
  assert.equal(fri.getDate(), 16);
  const friLater = nextDates(from, { on: true, weekday: 5, hour: 18 }, 1)[0]; // Friday 18:00 still ahead today
  assert.equal(friLater.getDate(), 9);
});

test("plan: WEEKS_AHEAD distinct swaps, never a '—' entry", () => {
  const p = plan(rows, null, { on: true, weekday: 1, hour: 9 }, new Date(2026, 9, 9));
  assert.equal(p.length, WEEKS_AHEAD);
  assert.equal(new Set(p.map((x) => x.entry.slug)).size, WEEKS_AHEAD);
  assert.ok(p.every((x) => x.entry.swap !== "—"));
});

test("queue: the profile's own area first, worst first", () => {
  const q = swapQueue(rows, "water");
  const firstNonWater = q.findIndex((e) => e.category !== "Water");
  assert.ok(firstNonWater > 0);
  assert.ok(q.slice(0, firstNonWater).every((e) => e.category === "Water"));
  for (let i = 1; i < firstNonWater; i++) assert.ok(q[i - 1].score <= q[i].score);
  const plastic = swapQueue(rows, "plastic");
  assert.equal(plastic[0].category, "Plastics");
});
