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
 *   node scripts/check-native-link.mjs --redproof  plant each defect in a scratch copy; each must go RED by name
 * CANONICAL in fattonic (camera engine); copied to sister apps by sync-camera-engine.
 *
 * WHAT IS REQUIRED IS PER APP ([HT-CAMERA-SYNC-REQUIRED] 2026-10-21). This file is a byte copy across the trio, so
 * it names no package: each app's venture.json "nativeRequired" maps the native packages that app calls to the class
 * its Android package instance must construct. A package named there but missing from package.json dependencies is
 * RED — it used to be skipped as "the app does not use it", which let a dropped dependency pass silently.
 *
 * WHERE IT LIVES ([FT-UX-CLEANUP] 2026-10-21): <root>/native-required.json {"nativeRequired": {...}}, NOT venture.json.
 * app.config.ts imports venture.json, so expo-fingerprint hashes that file: adding the key there moved every trio app's
 * runtime (FatTonic d26885eea9d1 → 3288ded6946e) and blocked the OTA path to the binaries on the phones. A sidecar
 * no config reads keeps the runtime still. venture.json "nativeRequired" is read only as a fallback.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const self = fileURLToPath(import.meta.url);
const appRoot = resolve(dirname(self), "..");

/** package → the class its Android package instance must construct: <root>/native-required.json, else venture.json. */
export function requiredOf(root) {
  for (const f of ["native-required.json", "venture.json"]) {
    const p = join(root, f);
    if (!existsSync(p)) continue;
    const r = JSON.parse(readFileSync(p, "utf8")).nativeRequired;
    if (r && typeof r === "object" && !Array.isArray(r) && Object.keys(r).length) return r;
  }
  return null;
}
const ENGINE = "modules/health-camera/classify.native.ts";

export function check(root) {
  const fails = [];
  const required = requiredOf(root);
  if (!required) return [`NO nativeRequired: native-required.json must map each native package this app calls to its Android package class, e.g. {"onnxruntime-react-native": "OnnxruntimePackage"}`];
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const deps = { ...pkg.dependencies };
  const bin = join(appRoot, "node_modules/.bin/expo-modules-autolinking");
  const r = spawnSync(bin, ["react-native-config", "--platform", "android", "--json", "--project-root", root], { cwd: root, encoding: "utf8" });
  if (r.status !== 0) return [`AUTOLINKING FAILED: ${(r.stderr || r.stdout).slice(0, 300)}`];
  const linked = JSON.parse(r.stdout).dependencies ?? {};
  for (const [name, cls] of Object.entries(required)) {
    if (!deps[name]) { fails.push(`REQUIRED BUT NOT A DEPENDENCY: ${name} — native-required.json names it, package.json dependencies does not`); continue; }
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
    for (const f of ["package.json", "app.config.ts", "venture.json", "native-required.json", "react-native.config.js", ENGINE]) if (existsSync(join(appRoot, f))) cpSync(join(appRoot, f), join(d, f));
    symlinkSync(join(appRoot, "node_modules"), join(d, "node_modules"));
    mutate(d);
    const got = check(d);
    const ok = got.some((g) => g.startsWith(expect));
    console.log(`${ok ? "RED as expected" : "NOT RED"} — ${label}: ${got.join(" | ") || "(green)"}`);
    return ok;
  };
  const a = plant("no-rn-config", (d) => rmSync(join(d, "react-native.config.js")), "NOT AUTOLINKED (android): onnxruntime-react-native");
  const b = plant("top-level-import", (d) => { const p = join(d, ENGINE); writeFileSync(p, 'import { InferenceSession } from "onnxruntime-react-native";\n' + readFileSync(p, "utf8")); }, "TOP-LEVEL IMPORT");
  const first = Object.keys(requiredOf(appRoot))[0];
  const c = plant("required-not-a-dependency", (d) => { const p = join(d, "package.json"); const j = JSON.parse(readFileSync(p, "utf8")); delete j.dependencies[first]; writeFileSync(p, JSON.stringify(j, null, 2)); }, `REQUIRED BUT NOT A DEPENDENCY: ${first}`);
  const e = plant("no-nativeRequired", (d) => { for (const f of ["native-required.json", "venture.json"]) { const p = join(d, f); if (!existsSync(p)) continue; const j = JSON.parse(readFileSync(p, "utf8")); delete j.nativeRequired; writeFileSync(p, JSON.stringify(j, null, 2)); } }, "NO nativeRequired");
  rmSync(tmp, { recursive: true, force: true });
  const ok = a && b && c && e;
  console.log(ok ? "redproof: 4/4 planted defects RED by name; positive control GREEN" : "redproof: FAILED");
  process.exit(ok ? 0 : 1);
}

const fails = check(appRoot);
if (fails.length) { console.error("check:native-link RED\n  " + fails.join("\n  ")); process.exit(1); }
console.log(`check:native-link GREEN — ${Object.keys(requiredOf(appRoot)).join(", ")} (native-required.json) registered on Android; engine loads ONNX Runtime lazily`);
