#!/usr/bin/env node
/**
 * check:label-photos — the Scan chips' reference photos (HEALTH-TRIO-DAY A9) are lawful, complete and small.
 * Shared engine data: CANONICAL in fattonic, copied to sister apps by sync-camera-engine.
 *   every label in labels.json has an entry in label-photos.json — a photo or an explicit null
 *   licence ∈ CC0 / Public domain / PD mark / CC BY <version> (BY-SA, NC, ND and anything else RED); source page always, author for CC BY
 *   each file exists, its sha256 matches, label-photos.ts requires exactly the photos the manifest lists
 *   all photos together ≤ 2.5 MB; any CC BY photo is credited in About (app/about.tsx renders labelPhotoCredits)
 *   node scripts/check-label-photos.mjs [--root <app>]   ·   --redproof  plants 6 defects in a scratch copy, each RED by name
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const self = fileURLToPath(import.meta.url);
const appRoot = resolve(dirname(self), "..");
const MOD = "modules/health-camera";
export const BUDGET = 2_500_000;
const LICENCE = /^(CC0|Public domain|Public Domain|Public domain mark|CC BY [0-9.]+)$/;

export function check(root) {
  const f = [];
  const labels = JSON.parse(readFileSync(join(root, MOD, "labels.json"), "utf8")).labels.map((l) => l.id);
  const manPath = join(root, MOD, "label-photos.json");
  if (!existsSync(manPath)) return ["NO MANIFEST: label-photos.json"];
  const photos = JSON.parse(readFileSync(manPath, "utf8")).photos ?? {};
  const ts = existsSync(join(root, MOD, "label-photos.ts")) ? readFileSync(join(root, MOD, "label-photos.ts"), "utf8") : "";
  let bytes = 0, credited = 0;
  for (const id of labels) {
    if (!(id in photos)) { f.push(`NO ENTRY: ${id} (a photo or an explicit null)`); continue; }
    const p = photos[id];
    if (p === null) { if (ts.includes(`"${id}":`)) f.push(`TS/MANIFEST MISMATCH: ${id} is null but label-photos.ts requires a photo`); continue; }
    if (!LICENCE.test(p.licence ?? "")) f.push(`LICENCE: ${id} is "${p.licence}" — only CC0 / PD / CC BY`);
    if (!p.source_page) f.push(`UNSOURCED: ${id} has no source page`);
    if (/^CC BY/.test(p.licence ?? "") && !p.author) f.push(`UNCREDITED: ${id} is CC BY with no author`); // CC0 / PD need no attribution
    const file = join(root, MOD, p.file ?? "");
    if (!p.file || !existsSync(file)) { f.push(`MISSING FILE: ${id} → ${p.file}`); continue; }
    if (createHash("sha256").update(readFileSync(file)).digest("hex") !== p.sha256) f.push(`SHA MISMATCH: ${id} → ${p.file}`);
    if (!ts.includes(`"${id}": require("./${p.file}")`)) f.push(`TS/MANIFEST MISMATCH: ${id} not required in label-photos.ts`);
    bytes += statSync(file).size;
    if (/^CC BY/.test(p.licence)) credited++;
  }
  for (const id of Object.keys(photos)) if (!labels.includes(id)) f.push(`UNKNOWN LABEL: ${id} is in label-photos.json but not labels.json`);
  if (bytes > BUDGET) f.push(`OVER BUDGET: ${bytes} bytes > ${BUDGET}`);
  const about = join(root, "app/about.tsx");
  if (credited && existsSync(about) && !readFileSync(about, "utf8").includes("labelPhotoCredits")) f.push(`ABOUT CREDIT: ${credited} CC BY photo(s) but app/about.tsx does not render labelPhotoCredits`);
  return { fails: f, bytes, count: Object.values(photos).filter(Boolean).length, nulls: Object.values(photos).filter((p) => p === null).length };
}
const fails = (r) => (Array.isArray(r) ? r : r.fails);

if (process.argv.includes("--redproof")) {
  const base = check(appRoot);
  if (fails(base).length) { console.error("redproof: positive control RED\n  " + fails(base).join("\n  ")); process.exit(1); }
  const tmp = mkdtempSync(join(tmpdir(), "labelphotos-"));
  const ids = Object.keys(JSON.parse(readFileSync(join(appRoot, MOD, "label-photos.json"), "utf8")).photos);
  const plant = (name, expect, mutate) => {
    const d = join(tmp, name);
    cpSync(join(appRoot, MOD), join(d, MOD), { recursive: true, filter: (s) => !s.includes("/model") });
    if (existsSync(join(appRoot, "app/about.tsx"))) cpSync(join(appRoot, "app/about.tsx"), join(d, "app/about.tsx"));
    const mp = join(d, MOD, "label-photos.json"); const m = JSON.parse(readFileSync(mp, "utf8"));
    mutate(m, d); writeFileSync(mp, JSON.stringify(m));
    const got = fails(check(d)); const ok = got.some((g) => g.startsWith(expect));
    console.log(`${ok ? "RED as expected" : "NOT RED"} — ${name}: ${got.slice(0, 2).join(" | ") || "(green)"}`); return ok;
  };
  const first = ids.find((i) => true);
  const res = [
    plant("by-sa", "LICENCE", (m) => { m.photos[first].licence = "CC BY-SA 4.0"; }),
    plant("nc", "LICENCE", (m) => { m.photos[first].licence = "CC BY-NC 2.0"; }),
    plant("missing-file", "MISSING FILE", (m, d) => { m.photos[first].file = "label-photos/nope.jpg"; }),
    plant("no-entry", "NO ENTRY", (m) => { delete m.photos[first]; }),
    plant("over-budget", "OVER BUDGET", (m, d) => { const p = join(d, MOD, m.photos[first].file); const big = Buffer.alloc(BUDGET + 1, 7); writeFileSync(p, big); m.photos[first].sha256 = createHash("sha256").update(big).digest("hex"); }),
    plant("about-credit", "ABOUT CREDIT", (m, d) => { const a = join(d, "app/about.tsx"); if (existsSync(a)) writeFileSync(a, readFileSync(a, "utf8").replaceAll("labelPhotoCredits", "x")); }),
  ];
  rmSync(tmp, { recursive: true, force: true });
  const n = res.filter(Boolean).length;
  console.log(`redproof: ${n}/${res.length} planted defects RED by name; positive control GREEN`);
  process.exit(n === res.length ? 0 : 1);
}

const r = check(appRoot);
if (fails(r).length) { console.error("check:label-photos RED\n  " + fails(r).join("\n  ")); process.exit(1); }
console.log(`check:label-photos GREEN — ${r.count} photos + ${r.nulls} explicit none, ${r.bytes} bytes (≤ ${BUDGET})`);
