#!/usr/bin/env node
/**
 * health-camera — fetch the 95 MB image encoder (not in git) and verify it byte-for-byte against model.json.
 * Runs on the EAS builder as `eas-build-post-install`, so Metro bundles a verified file; run it locally once
 * (`npm run camera:model`) before a native dev build. CANONICAL in projects/fattonic/repo-app (synced copies).
 *
 *   node scripts/fetch-camera-model.mjs           download if missing or wrong, then verify (exit 1 on mismatch)
 *   node scripts/fetch-camera-model.mjs --check   verify only (exit 1 if missing or sha256 differs)
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(root, "modules/health-camera");
const meta = JSON.parse(readFileSync(resolve(dir, "model.json"), "utf8"));
const target = resolve(dir, meta.file);
const check = process.argv.includes("--check");
const sha = (b) => createHash("sha256").update(b).digest("hex");

function verify() {
  if (!existsSync(target)) return `missing ${meta.file}`;
  const b = readFileSync(target);
  if (b.length !== meta.bytes) return `size ${b.length} ≠ ${meta.bytes}`;
  const h = sha(b);
  return h === meta.sha256 ? null : `sha256 ${h.slice(0, 12)}… ≠ ${meta.sha256.slice(0, 12)}…`;
}

let err = verify();
if (!err) { console.log(`camera-model: OK ${meta.file} (${meta.bytes} bytes, sha256 ${meta.sha256.slice(0, 12)}…)`); process.exit(0); }
if (check) { console.error(`camera-model: FAIL ${err}`); process.exit(1); }
const local = process.env.CAMERA_MODEL_FILE; // offline mirror (e.g. the camera-lab copy) — still sha-verified
let buf;
if (local) buf = readFileSync(local);
else {
  console.log(`camera-model: downloading ${meta.url}`);
  const r = await fetch(meta.url, { redirect: "follow" });
  if (!r.ok) { console.error(`camera-model: HTTP ${r.status}`); process.exit(1); }
  buf = Buffer.from(await r.arrayBuffer());
}
if (sha(buf) !== meta.sha256) { console.error(`camera-model: FAIL downloaded file sha256 ${sha(buf).slice(0, 12)}… ≠ model.json`); process.exit(1); }
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target + ".part", buf);
renameSync(target + ".part", target);
err = verify();
if (err) { console.error(`camera-model: FAIL after write: ${err}`); process.exit(1); }
console.log(`camera-model: OK fetched ${meta.file} (${meta.bytes} bytes)`);
