#!/usr/bin/env node
/**
 * health-camera — scripted acceptance: classify photos through the SAME core.ts the phones run (toTensor + rank),
 * with onnxruntime-node standing in for onnxruntime-react-native (same ONNX file, same CPU kernels family).
 * Expected label = the photo's folder name (food__avocado → food:avocado) or --expect=<id>.
 *
 *   node --experimental-strip-types scripts/camera-classify.mjs <photo.jpg|folder> [...]   (exit 1 if any expected label is not in the top 3)
 *   --csv=<file>   also write file,expected,top1,top2,top3 rows (batch measurement through the shipped code path)
 *   --quiet        print only FAILs and the total
 * Phones only ever feed JPEG (expo-image-manipulator re-encodes), so a non-JPEG input is SKIPPED here, not scored.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as ort from "onnxruntime-node";
import jpeg from "jpeg-js";
import { decodeEmbeddings, rank, toTensor } from "../modules/health-camera/core.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(root, "modules/health-camera");
const meta = JSON.parse(readFileSync(join(dir, "model.json"), "utf8"));
const embFile = JSON.parse(readFileSync(join(dir, "label-emb.json"), "utf8"));
const modelPath = process.env.CAMERA_MODEL_FILE ?? join(dir, meta.file);
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const forced = process.argv.find((a) => a.startsWith("--expect="))?.split("=")[1];
const files = args.flatMap((a) => (statSync(a).isDirectory() ? readdirSync(a, { recursive: true }).map((f) => join(a, String(f))).filter((f) => /\.jpe?g$/i.test(f)) : [a]));
if (!files.length) { console.error("camera-classify: no photos given"); process.exit(2); }

const session = await ort.InferenceSession.create(modelPath);
const labels = decodeEmbeddings(embFile);
const csvOut = process.argv.find((a) => a.startsWith("--csv="))?.slice(6);
const quiet = process.argv.includes("--quiet");
const rows = ["file,expected,top1,top2,top3"];
let fails = 0, skipped = 0;
for (const f of files) {
  let raw;
  try { raw = jpeg.decode(readFileSync(f), { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 1024 }); }
  catch { skipped++; console.log(`SKIP  ${basename(f)}  not a JPEG`); continue; }
  const x = toTensor(raw.data, raw.width, raw.height, 4);
  const out = await session.run({ pixel_values: new ort.Tensor("float32", x, [1, 3, 224, 224]) });
  const top = rank(out.pooler_output.data, labels, embFile.ids, 3);
  const expect = forced ?? basename(dirname(f)).replace("__", ":");
  const ok = top.some((t) => t.label === expect);
  if (!ok) fails++;
  rows.push([f, expect, ...top.map((t) => t.label)].join(","));
  if (!quiet || !ok) console.log(`${ok ? "PASS" : "FAIL"}  ${basename(f)}  expect ${expect}  →  ${top.map((t) => `${t.label} ${t.score.toFixed(3)}`).join(" · ")}`);
}
if (csvOut) writeFileSync(csvOut, rows.join("\n") + "\n");
const n = files.length - skipped;
console.log(`camera-classify: ${n - fails}/${n} expected label in top 3${skipped ? ` (${skipped} non-JPEG skipped)` : ""}`);
process.exit(fails ? 1 : 0);
