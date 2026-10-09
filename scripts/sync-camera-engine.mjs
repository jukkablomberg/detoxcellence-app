#!/usr/bin/env node
/**
 * ONE camera engine (the BoomCellar → CoinBucha rule). The canonical engine lives in projects/fattonic/repo-app;
 * SnapStress and Detoxcellence carry byte-identical COPIES because EAS uploads only the project root (a file:../..
 * dependency would not build). Lenses (src/data/lens-<app>.json) are app-owned and never synced.
 *
 *   node scripts/sync-camera-engine.mjs             (in FatTonic) copy the engine into every sister repo-app that exists
 *   node scripts/sync-camera-engine.mjs --check     exit 1 on ANY drift or missing file. In FatTonic: checks every
 *                                                   existing sister. In a sister: checks itself against FatTonic.
 *   node scripts/sync-camera-engine.mjs --redproof  plants a one-byte drift and a missing file in a scratch copy and
 *                                                   proves --check goes red NAMING each (positive control first).
 * Env: CAMERA_ENGINE_SOURCE (canonical repo-app), CAMERA_ENGINE_TARGETS (comma-separated repo-app paths).
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const FILES = [
  "modules/health-camera/core.ts",
  "modules/health-camera/classify.ts",
  "modules/health-camera/classify.native.ts",
  "modules/health-camera/index.ts",
  "modules/health-camera/assets.d.ts",
  "modules/health-camera/labels.json",
  "modules/health-camera/label-emb.json",
  "modules/health-camera/model.json",
  "scripts/fetch-camera-model.mjs",
  "scripts/patch-ort-native.mjs",
  "scripts/camera-classify.mjs",
  "scripts/sync-camera-engine.mjs",
  "scripts/check-native-link.mjs",
  "react-native.config.js",
  "modules/health-camera/label-photos.json",
  "modules/health-camera/label-photos.ts",
  "scripts/check-label-photos.mjs",
];
// A9: every reference photo the manifest lists travels with the engine (shared engine data).
{
  const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const src = existsSync(join(here, "../../fattonic/repo-app/modules/health-camera/label-photos.json")) ? join(here, "../../fattonic/repo-app") : here;
  const man = join(src, "modules/health-camera/label-photos.json");
  if (existsSync(man)) for (const p of Object.values(JSON.parse(readFileSync(man, "utf8")).photos)) if (p) FILES.push(`modules/health-camera/${p.file}`);
}

const self = fileURLToPath(import.meta.url);
const root = resolve(dirname(self), "..");
const canonical = resolve(process.env.CAMERA_ENGINE_SOURCE ?? (existsSync(join(root, "../../fattonic/repo-app")) ? join(root, "../../fattonic/repo-app") : root));
const isCanonical = canonical === root;
const sisters = (process.env.CAMERA_ENGINE_TARGETS?.split(",") ?? [join(canonical, "../../snapstress/repo-app"), join(canonical, "../../detoxcellence/repo-app")]).map((p) => resolve(p));
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

function drift(target) {
  const out = [];
  for (const f of FILES) {
    const a = join(canonical, f), b = join(target, f);
    if (!existsSync(a)) out.push(`CANONICAL MISSING ${f}`);
    else if (!existsSync(b)) out.push(`MISSING ${f}`);
    else if (sha(a) !== sha(b)) out.push(`DRIFT ${f}`);
  }
  return out;
}

const mode = process.argv.includes("--redproof") ? "redproof" : process.argv.includes("--check") ? "check" : "copy";

if (mode === "redproof") {
  const tmp = mkdtempSync(join(tmpdir(), "camsync-"));
  const target = join(tmp, "sister-app");
  for (const f of FILES) { mkdirSync(dirname(join(target, f)), { recursive: true }); cpSync(join(canonical, f), join(target, f)); }
  const run = () => spawnSync(process.execPath, [self, "--check"], { env: { ...process.env, CAMERA_ENGINE_SOURCE: canonical, CAMERA_ENGINE_TARGETS: target }, encoding: "utf8" });
  const results = [];
  let r = run();
  results.push(["positive control (identical copy) is GREEN", r.status === 0 && /in sync/.test(r.stdout)]);
  const emb = join(target, "modules/health-camera/label-emb.json");
  const buf = readFileSync(emb); buf[buf.length - 3] = buf[buf.length - 3] === 0x41 ? 0x42 : 0x41; writeFileSync(emb, buf);
  r = run();
  results.push(["one-byte drift in label-emb.json is RED and named", r.status === 1 && /DRIFT modules\/health-camera\/label-emb\.json/.test(r.stderr)]);
  rmSync(join(target, "modules/health-camera/core.ts"));
  r = run();
  results.push(["missing core.ts is RED and named", r.status === 1 && /MISSING modules\/health-camera\/core\.ts/.test(r.stderr)]);
  rmSync(tmp, { recursive: true, force: true });
  for (const [name, ok] of results) console.log(`${ok ? "✓" : "✗"} ${name}`);
  const bad = results.filter(([, ok]) => !ok).length;
  console.log(bad ? `redproof: ${bad} probe(s) did NOT behave` : "redproof: all probes behaved (check goes red for the named reason)");
  process.exit(bad ? 1 : 0);
}

const targets = process.env.CAMERA_ENGINE_TARGETS ? sisters : isCanonical ? sisters.filter((t) => existsSync(t)) : [root];
if (isCanonical && !process.env.CAMERA_ENGINE_TARGETS) for (const t of sisters) if (!existsSync(t)) console.log(`sync-camera-engine: ${t} does not exist yet — skipped`);

if (mode === "check") {
  let bad = 0;
  for (const t of targets) {
    const d = drift(t);
    if (d.length) { bad += d.length; for (const x of d) console.error(`sync-camera-engine: ${x} in ${t}`); }
    else console.log(`sync-camera-engine: ${t} in sync (${FILES.length} files)`);
  }
  if (!targets.length) console.log("sync-camera-engine: no sister repo-app yet — nothing to check");
  process.exit(bad ? 1 : 0);
}

if (!isCanonical) { console.error("sync-camera-engine: copy runs only in the canonical repo (projects/fattonic/repo-app)"); process.exit(2); }
for (const t of targets) {
  for (const f of FILES) { mkdirSync(dirname(join(t, f)), { recursive: true }); cpSync(join(canonical, f), join(t, f)); }
  console.log(`sync-camera-engine: copied ${FILES.length} files → ${t}`);
}
