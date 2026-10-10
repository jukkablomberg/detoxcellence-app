#!/usr/bin/env node
/**
 * health-camera — make onnxruntime-react-native build on Expo SDK 57 (Gradle 9) and pin its native runtime.
 * Runs as `postinstall` (so npm ci on the EAS builder applies it before prebuild + gradle). Idempotent; exits 1
 * if an anchor moved (a new ORT release changed the file — re-read it, never guess). CANONICAL in fattonic.
 *
 * Why (EAS probe build a401fe01, 2026-10-07, ERRORED): android/build.gradle:250 calls VersionNumber.parse, which
 * Gradle 9 removed → "Could not get unknown property 'VersionNumber'". And the package pulls the native runtime as
 * `latest.integration` (Android) / an unversioned pod (iOS) — a build-to-build drift the pinned-versions rule forbids.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = resolve(root, "node_modules/onnxruntime-react-native");
if (!existsSync(pkgDir)) { console.log("patch-ort-native: onnxruntime-react-native not installed — nothing to do"); process.exit(0); }
const VERSION = JSON.parse(readFileSync(resolve(pkgDir, "package.json"), "utf8")).version; // native runtime = the JS package's own release

const edits = [
  {
    file: "android/build.gradle",
    from: 'if (VersionNumber.parse(REACT_NATIVE_VERSION) < VersionNumber.parse("0.71")) {',
    to: 'if (REACT_NATIVE_VERSION.tokenize(".")[0].toInteger() == 0 && REACT_NATIVE_VERSION.tokenize(".")[1].toInteger() < 71) { // patched: Gradle 9 has no VersionNumber',
  },
  {
    file: "android/build.gradle",
    from: 'extractLibs "com.microsoft.onnxruntime:onnxruntime-android:latest.integration@aar"',
    to: `extractLibs "com.microsoft.onnxruntime:onnxruntime-android:${VERSION}@aar" // patched: pinned`,
  },
  {
    // Play Console 2026-10-10 (SnapStress vc 3 production draft): "Your app does not support 16 KB memory page sizes".
    // Read in the vc 3 AAB: 28/29 arm64 libs align 16384; libonnxruntimejsi.so (this package's own CMake target,
    // built by RN 0.86's NDK 27 with no page-size flag) aligns 4096. Link it with 16 KB max page size.
    file: "android/CMakeLists.txt",
    from: 'find_library(log-lib log)\n',
    to: 'find_library(log-lib log)\ntarget_link_options(onnxruntimejsi PRIVATE "-Wl,-z,max-page-size=16384") # patched: Play 16 KB page sizes\n',
  },
  {
    file: "onnxruntime-react-native.podspec",
    from: 'spec.dependency "onnxruntime-c"\n',
    to: `spec.dependency "onnxruntime-c", "${VERSION}" # patched: pinned\n`,
  },
];

let bad = 0;
for (const e of edits) {
  const p = resolve(pkgDir, e.file);
  const s = readFileSync(p, "utf8");
  if (s.includes(e.to)) { console.log(`patch-ort-native: already patched — ${e.file}`); continue; }
  if (!s.includes(e.from)) { console.error(`patch-ort-native: ANCHOR MOVED in ${e.file}: ${e.from.trim()}`); bad++; continue; }
  writeFileSync(p, s.replace(e.from, e.to));
  console.log(`patch-ort-native: patched ${e.file}`);
}
process.exit(bad ? 1 : 0);
