#!/usr/bin/env node
/**
 * C2 acceptance on the real engine: every photo of the 12 Detox evaluation classes (FatTonic camera-lab
 * eval-manifest.csv, split=eval — 11 objects + strawberries) goes through the SAME path the phone runs —
 * core.ts toTensor + the shipped ONNX encoder (onnxruntime-node standing in for onnxruntime-react-native) + rank(k=8)
 * — and then through THIS app's lens (src/lib/lens.ts offer()). A photo passes when its class is among the three
 * "Is it…" chips; the chip's row must resolve in the bundled Exposure Index. Per class: n, chip top-1, chip top-3.
 *
 *   npm i --no-save onnxruntime-node@1.24.3 && npm run camera:model
 *   node scripts/lens-measure.mjs <camera-lab dir> [--csv=<out.csv>]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";
import * as ort from "onnxruntime-node";
import jpeg from "jpeg-js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
register(pathToFileURL(join(here, "ts-resolve-hook.mjs")));
const { decodeEmbeddings, rank, toTensor } = await import(pathToFileURL(join(root, "modules/health-camera/core.ts")).href);
const { offer, rowsFor } = await import(pathToFileURL(join(root, "src/lib/lens.ts")).href);
const { slugify } = await import(pathToFileURL(join(root, "src/lib/score.ts")).href);

const lab = resolve(process.argv[2] ?? join(root, "../../fattonic/camera-lab"));
const csvOut = process.argv.find((a) => a.startsWith("--csv="))?.slice(6);
const DETOX = ["object:nonstick-pan", "object:cast-iron-pan", "object:stainless-steel-pan", "object:plastic-food-container", "object:glass-food-container", "object:takeout-container", "object:scented-candle", "object:shampoo-bottle", "object:plastic-cutting-board", "object:plastic-water-bottle", "object:canned-food", "food:strawberries"];
const slugs = new Set(JSON.parse(readFileSync(join(root, "src/data/exposures.json"), "utf8")).rows.map((r) => slugify(r.name)));
const manifest = readFileSync(join(lab, "eval-manifest.csv"), "utf8").trim().split("\n").slice(1).map((l) => l.split(","));
const photos = manifest.filter((c) => c[0] === "eval" && DETOX.includes(c[1])).map((c) => ({ cls: c[1], file: join(lab, c[2]) }));

const dir = join(root, "modules/health-camera");
const meta = JSON.parse(readFileSync(join(dir, "model.json"), "utf8"));
const emb = JSON.parse(readFileSync(join(dir, "label-emb.json"), "utf8"));
const session = await ort.InferenceSession.create(join(dir, meta.file));
const labels = decodeEmbeddings(emb);

const per = Object.fromEntries(DETOX.map((c) => [c, { n: 0, top1: 0, top3: 0, rowOk: rowsFor(c).length > 0 && rowsFor(c).every((s) => slugs.has(s)) }]));
const rows = ["file,class,chip1,chip2,chip3,pass"];
let skipped = 0;
for (const p of photos) {
  let raw;
  try { raw = jpeg.decode(readFileSync(p.file), { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 1024 }); } catch { skipped++; continue; }
  const out = await session.run({ pixel_values: new ort.Tensor("float32", toTensor(raw.data, raw.width, raw.height, 4), [1, 3, 224, 224]) });
  const ranked = rank(out.pooler_output.data, labels, emb.ids, 8);
  const { picks } = offer(ranked);
  const s = per[p.cls];
  s.n++;
  if (picks[0]?.label === p.cls) s.top1++;
  const pass = picks.some((c) => c.label === p.cls);
  if (pass) s.top3++;
  rows.push([p.file.slice(lab.length + 1), p.cls, ...[0, 1, 2].map((i) => picks[i]?.label ?? ""), pass ? 1 : 0].join(","));
}
const tot = Object.values(per).reduce((a, s) => ({ n: a.n + s.n, top1: a.top1 + s.top1, top3: a.top3 + s.top3 }), { n: 0, top1: 0, top3: 0 });
for (const [c, s] of Object.entries(per)) console.log(`${c.padEnd(30)} n ${String(s.n).padStart(2)}  chip-1 ${s.top1}/${s.n}  chips-3 ${s.top3}/${s.n}  row ${s.rowOk ? rowsFor(c).join("+") : "MISSING"}`);
console.log(`TOTAL n ${tot.n} · chip-1 ${tot.top1} (${((100 * tot.top1) / tot.n).toFixed(1)} %) · chips-3 ${tot.top3} (${((100 * tot.top3) / tot.n).toFixed(1)} %)${skipped ? ` · ${skipped} non-JPEG skipped` : ""} · rows resolve ${Object.values(per).every((s) => s.rowOk) ? "12/12" : "NO"}`);
if (csvOut) writeFileSync(csvOut, rows.join("\n") + "\n");
process.exit(Object.values(per).every((s) => s.rowOk && s.n > 0) ? 0 : 1);
