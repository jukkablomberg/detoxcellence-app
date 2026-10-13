#!/usr/bin/env node
/**
 * check:native-link — every native module the app CALLS is REGISTERED in the Android binary (HEALTH-TRIO-DAY A12).
 *
 * Play vc 9 crashed at start-up on Android while iOS build 8 worked: onnxruntime-react-native was linked as a gradle
 * project but React Native autolinking never put `OnnxruntimePackage` into `PackageList`, and the package calls its
 * native module at import. This reads the SAME autolinking result the EAS build uses (expo-modules-autolinking
 * react-native-config --platform android) and fails, by name, when a required package is absent or has no package
 * instance. It also fails when the camera engine imports ONNX Runtime at module top level (start-up must not depend
 * on a native module the first screen never uses until the first scan).
 *
 *   node scripts/check-native-link.mjs             check this app
 *   node scripts/check-native-link.mjs --redproof  plant both defects in a scratch copy; each must go RED by name
 * CANONICAL in fattonic (camera engine); copied to sister apps by sync-camera-engine.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const self = fileURLToPath(import.meta.url);
const appRoot = resolve(dirname(self), "..");

/** package → the class its Android package instance must construct. */
export const REQUIRED = { "onnxruntime-react-native": "OnnxruntimePackage", "react-native-purchases": "RNPurchasesPackage" }; // + purchases: [FT-MENU-TIER] 2026-10-10
const ENGINE = "modules/health-camera/classify.native.ts";

export function check(root) {
  const fails = [];
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const deps = { ...pkg.dependencies };
  const bin = join(appRoot, "node_modules/.bin/expo-modules-autolinking");
  const r = spawnSync(bin, ["react-native-config", "--platform", "android", "--json", "--project-root", root], { cwd: root, encoding: "utf8" });
  if (r.status !== 0) return [`AUTOLINKING FAILED: ${(r.stderr || r.stdout).slice(0, 300)}`];
  const linked = JSON.parse(r.stdout).dependencies ?? {};
  for (const [name, cls] of Object.entries(REQUIRED)) {
    if (!deps[name]) continue; // the app does not use it
    const a = linked[name]?.platforms?.android;
    if (!a) fails.push(`NOT AUTOLINKED (android): ${name} — PackageList will not register it`);
    else if (!String(a.packageInstance ?? "").includes(cls)) fails.push(`NO PACKAGE INSTANCE (android): ${name} — expected new ${cls}(), got ${a.packageInstance}`);
  }
  const engine = join(root, ENGINE);
  if (existsSync(engine)) {
    const src = readFileSync(engine, "utf8");
    if (/^\s*import\s+(?!type\b)[^;]*from\s+["']onnxruntime-react-native["']/m.test(src))
      fails.push(`TOP-LEVEL IMPORT: ${ENGINE} imports onnxruntime-react-native at module load — require it lazily in load()`);
  }
  return fails;
}

if (process.argv.includes("--redproof")) {
  const fresh = check(appRoot);
  if (fresh.length) { console.error("redproof: positive control is RED:\n  " + fresh.join("\n  ")); process.exit(1); }
  const tmp = mkdtempSync(join(tmpdir(), "nativelink-"));
  const plant = (label, mutate, expect) => {
    const d = join(tmp, label);
    for (const f of ["package.json", "app.config.ts", "venture.json", "react-native.config.js", ENGINE]) if (existsSync(join(appRoot, f))) cpSync(join(appRoot, f), join(d, f));
    symlinkSync(join(appRoot, "node_modules"), join(d, "node_modules"));
    mutate(d);
    const got = check(d);
    const ok = got.some((g) => g.startsWith(expect));
    console.log(`${ok ? "RED as expected" : "NOT RED"} — ${label}: ${got.join(" | ") || "(green)"}`);
    return ok;
  };
  const a = plant("no-rn-config", (d) => rmSync(join(d, "react-native.config.js")), "NOT AUTOLINKED (android): onnxruntime-react-native");
  const b = plant("top-level-import", (d) => { const p = join(d, ENGINE); writeFileSync(p, 'import { InferenceSession } from "onnxruntime-react-native";\n' + readFileSync(p, "utf8")); }, "TOP-LEVEL IMPORT");
  rmSync(tmp, { recursive: true, force: true });
  console.log(a && b ? "redproof: 2/2 planted defects RED by name; positive control GREEN" : "redproof: FAILED");
  process.exit(a && b ? 0 : 1);
}

const fails = check(appRoot);
if (fails.length) { console.error("check:native-link RED\n  " + fails.join("\n  ")); process.exit(1); }
const used = Object.keys(REQUIRED).filter((n) => JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8")).dependencies?.[n]); // a sister without purchases does not claim it
console.log(`check:native-link GREEN — ${used.join(", ")} registered on Android; engine loads ONNX Runtime lazily`);
