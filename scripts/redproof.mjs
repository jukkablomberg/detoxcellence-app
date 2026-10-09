#!/usr/bin/env node
/**
 * redproof — L16 for listing-readiness. "Plant one breach and watch it go red
 * before trusting it" (NEW-APP-CHECKLIST § 6).
 *
 * A checker nobody has seen fail is a checker nobody should believe. This plants
 * ONE breach per rule into a throwaway copy of the tree, runs listing-readiness
 * against it, and asserts that THAT rule — not merely some rule — reported FAIL.
 * It then asserts the untouched tree is green. Nothing is written inside the
 * template: every mutation happens in a temp directory that is removed after.
 *
 *   node scripts/redproof.mjs [--registry=<path to apps.json>]
 */
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(join(dirname(fileURLToPath(import.meta.url)), ".."));
/**
 * The registry must be resolved from the REAL root and passed down explicitly.
 * Every breach is planted in a copy under the temp dir, where apps.json's
 * relative location no longer holds — without this, R3 reports SKIP in the child
 * run and its breach looks like dead code. (That is how this line came to exist:
 * the exit-2 "unverified is not passed" rule caught it.)
 */
function findRegistry() {
  const explicit = process.argv.slice(2).find((a) => a.startsWith("--registry="));
  if (explicit) return explicit;
  for (const c of ["../apps.json", "../../apps.json", "../../app-stores/apps.json", "../../../app-stores/apps.json"]) {
    const p = resolve(root, c);
    if (existsSync(p)) return `--registry=${p}`;
  }
  return null;
}
const registryArg = findRegistry();

const editJson = (dir, rel, fn) => {
  const p = join(dir, rel);
  const o = JSON.parse(readFileSync(p, "utf8"));
  fn(o);
  writeFileSync(p, JSON.stringify(o, null, 2));
};
const editText = (dir, rel, fn) => {
  const p = join(dir, rel);
  writeFileSync(p, fn(readFileSync(p, "utf8")));
};

/** Minimal PNG writer, so the icon breach is a REAL alpha-channel PNG. */
function writePng(path, w, h, rgb, alpha) {
  const zlib = require("node:zlib");
  const ct = alpha ? 6 : 2;
  const px = Buffer.from(alpha ? [...rgb, 255] : rgb);
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), ...Array.from({ length: w }, () => px)])));
  const chunk = (tag, data) => {
    const c = Buffer.concat([Buffer.from(tag), data]);
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32 ? zlib.crc32(c) >>> 0 : crc32(c));
    return Buffer.concat([len, c, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = ct;
  writeFileSync(path, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]));
}
let TABLE;
function crc32(buf) {
  if (!TABLE) {
    TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; TABLE[n] = c; }
  }
  let c = -1;
  for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
const require = (await import("node:module")).createRequire(import.meta.url);

/**
 * The two breach payloads are ASSEMBLED, never written out.
 * R8 and R10 scan every file in the tree, and this harness is a file in the
 * tree — spelling a production-submit command or a RevenueCat key literally
 * here would make the scanners flag the scanners' own test. The alternative,
 * exempting this file from the secret scan, is a hole in a secret scan. So the
 * payloads are built at runtime and no literal exists on disk.
 */
const PAYLOAD = {
  productionSubmit: ["eas", "submit", "--platform", "all", "--profile", "production"].join(" "),
  revenueCatKey: ["appl", "AbCdEfGhIjKlMnOpQrStUvWx"].join("_"),
};

/**
 * [APPS-TEMPLATE-SDK57 2026-09-28] The fork planted its R8/R12 submit-profile
 * breaches on `submit.production`, which only an instance carrying the Play
 * production profile has. The template ships `internal` only (the lift for any
 * app other than UsePhysics is Jukka's written act, not a template default), so
 * the breach is planted on whichever submit profile the tree actually declares.
 */
const submitProfile = (o) => o.submit.production ?? o.submit.internal;

/** One planted breach per rule. */
const BREACHES = [
  ["R1-venture-schema", "venture.json loses a required field", (d) => editJson(d, "venture.json", (o) => { delete o.nativeValue; })],
  ["R2-bundle-id-derived", "the bundle id is hard-coded instead of derived", (d) => editText(d, "app.config.ts", (s) => s.replace("const id = bundleId(venture);", 'const id = "com.usephysics.app";'))],
  ["R3-registry-agreement", "the build config id stops matching apps.json", (d) => editJson(d, "venture.json", (o) => { o.domain = null; })],
  ["R4-native-value-3", "only two native-value features are named", (d) => editJson(d, "venture.json", (o) => { o.nativeValue = o.nativeValue.slice(0, 2); })],
  ["R4-native-value-3", "a third feature is named but not implemented", (d) => editJson(d, "venture.json", (o) => { o.nativeValue[2].evidence = "src/lib/does-not-exist.ts"; })],
  ["R5-endorsement-close", "the description does not end with the endorsement close", (d) => editJson(d, "store/listing.json", (o) => { o.fullDescription = "A physics app."; })],
  ["R6-listing-limits", "the app name exceeds 30 characters", (d) => editJson(d, "store/listing.json", (o) => { o.name = "X".repeat(31); })],
  ["R7-urls-on-venture-domain", "a store URL points at jukkablomberg.com", (d) => editText(d, "app.config.ts", (s) => s.replace("`https://${v.domain}/app/privacy`", "`https://jukkablomberg.com/app/privacy`"))],
  // The gate was lifted for GOOGLE PLAY ONLY by Jukka on 2026-09-09, so "a
  // production submit profile exists" is no longer a breach and is no longer
  // asserted here. What the lift did NOT permit is asserted instead, and the two
  // cases below are strictly narrower than the one they replace.
  // [HEALTH-TRIO-DAY A3 2026-10-07] Apple was lifted 2026-10-05 (forbiddenAppleDestinations: []), so planting an iOS
  // block alone no longer breaches — the probe went GREEN-on-breach ("dead code") although R8 was fine. The breach it
  // stands for is a PARTIAL lift: the gate forbids Apple AND a profile declares iOS. Plant both.
  ["R8-hard-gate", "an Apple submit destination is declared while the gate forbids Apple (a partial lift)", (d) => { editJson(d, "SUBMISSION-GATE.json", (o) => { o.forbiddenAppleDestinations = ["app-store", "testflight"]; }); editJson(d, "eas.json", (o) => { submitProfile(o).ios = { ascAppId: "1234567890" }; }); }],
  ["R8-hard-gate", "an Android beta track is added", (d) => editJson(d, "eas.json", (o) => { submitProfile(o).android.track = "beta"; })],
  ["R8-hard-gate", "CI is taught to submit to production", (d) => { mkdirSync(join(d, ".github/workflows"), { recursive: true }); writeFileSync(join(d, ".github/workflows/release.yml"), `jobs:\n  ship:\n    steps:\n      - run: ${PAYLOAD.productionSubmit}\n`); }],
  // [APPS-READINESS-LAUNCH-MODE 2026-09-11] R9 split into its two independent
  // claims. The pinning leg keeps a planted breach here (it is TRUE IN BOTH
  // MODES and is asserted in both, below); the node_modules leg is
  // template-only and gets its own mode-aware block after the loop, because
  // this loop always runs --mode=template and could not tell the two apart.
  ["R9-pinned", "a dependency version becomes a range", (d) => editJson(d, "package.json", (o) => { o.dependencies.expo = "^51.0.28"; })],
  ["R10-no-secret-values", "a RevenueCat key value is committed", (d) => writeFileSync(join(d, "src/lib/keys.ts"), `export const K = "${PAYLOAD.revenueCatKey}";\n`)],
  ["R11-store-assets", "the store icon gains an alpha channel", (d) => writePng(join(d, "assets/icon.png"), 1024, 1024, [11, 15, 26], true)],
  ["R11-store-assets", "the feature graphic is the wrong size", (d) => writePng(join(d, "assets/feature-graphic.png"), 1024, 512, [11, 15, 26], false)],
  // The old case deleted a top-level "update" block that eas-cli never accepted.
  // These three assert what the schema actually enforces, which is what the
  // deleted case was failing to.
  ["R12-eas-profiles", "an unknown top-level key is added to eas.json", (d) => editJson(d, "eas.json", (o) => { o.update = { production: { channel: "production" } }; })],
  ["R12-eas-profiles", "a comment key is added to a submit profile", (d) => editJson(d, "eas.json", (o) => { submitProfile(o)._gate = "a note eas-cli will reject"; })],
  ["R12-eas-profiles", "an update channel is declared without expo-updates", (d) => editJson(d, "eas.json", (o) => { o.build.production.channel = "production"; })],
  // [BC-APP-V1 2026-10-01] An INSTANCE with a policy edge already carries a filled
  // firstScreenDisclosure (R13 demands it), so planting the edge alone cannot turn
  // the rule red there — the plant blanks the disclosure too, which is the breach
  // the rule exists for in both a template and an instance. (Restored 2026-10-02: the
  // 069f38a R11 copy from the template silently reverted 6901594 in BoomCellar — the
  // template now carries this plant, so the next copy cannot undo it again.)
  ["R13-policy-disclosure", "a health policy edge is declared with no first-screen disclosure", (d) => { editJson(d, "venture.json", (o) => { o.policyEdges = ["apple-1.4.1-health-methodology"]; }); editJson(d, "store/listing.json", (o) => { o.firstScreenDisclosure = ""; }); }],
  ["R14-eas-project-id", "the eas project id can serialise to null", (d) => editText(d, "app.config.ts", (s) => s.replace("...(easProjectId ? { eas: { projectId: easProjectId } } : {}),", "eas: { projectId: venture.easProjectId ?? null },"))],
  ["R14-eas-project-id", "venture.json carries a placeholder project id", (d) => editJson(d, "venture.json", (o) => { o.easProjectId = "TODO-paste-from-eas-init"; })],
  ["R15-play-target-api", "the Expo SDK is rolled back to 51", (d) => editJson(d, "package.json", (o) => { o.dependencies.expo = "51.0.28"; })],
  ["R15-play-target-api", "target API drops below the Play floor", (d) => editText(d, "app.config.ts", (s) => s.replace("targetSdkVersion: 36", "targetSdkVersion: 34"))],
  ["R16-no-generic-claims", "app copy says non-toxic (the Scan front page)", (d) => editText(d, "app/(tabs)/(scan)/index.tsx", (s) => s.replace(">Point. Check.<", ">Point. Non-toxic?<"))],
  ["R16-no-generic-claims", "the store listing says Toxin Free (spaced, capitalised)", (d) => editJson(d, "store/listing.json", (o) => { o.promotionalText = `${o.promotionalText ?? ""} Toxin Free swaps.`; })],
  ["R16-no-generic-claims", "a bundled data row says chemical‑free (non-breaking hyphen)", (d) => editText(d, "src/data/exposures.json", (s) => s.replace('"DIY cleaning basics: vinegar and baking soda"', '"DIY chemical\u2011free cleaning basics"'))],
];

/* 🔴 spawnSync, NOT execFileSync, and the reason is a latent bug this commit
   had to fix in order to be testable at all.

   listing-readiness writes its whole report to STDERR. execFileSync RETURNS
   stdout and only exposes stderr on the throw path, so `out` was populated
   exactly when the child FAILED and was empty when it succeeded. Every case in
   this harness was a planted breach — i.e. always a failure — so nothing ever
   noticed. The first case that needed to read a PASSING report (the launch-mode
   case below) got an empty string and read as a miss.

   A harness that can only see output when the thing it runs fails is a harness
   that cannot check a green. */
function run(dir, mode) {
  const args = [join(dir, "scripts/listing-readiness.mjs"), `--mode=${mode}`];
  if (registryArg) args.push(registryArg);
  const r = spawnSync(process.execPath, args, { encoding: "utf8" });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

const scratch = mkdtempSync(join(tmpdir(), "redproof-"));
/* A second scratch root so the mode-aware cases below cannot collide with a
   planted-breach directory name. Both are removed at the end. */
const scratch2 = mkdtempSync(join(tmpdir(), "redproof-mode-"));
let bad = 0;
console.error("PLANTED BREACHES — each must turn its OWN rule red\n");
for (const [rule, what, mutate] of BREACHES) {
  const dir = join(scratch, `${rule}-${Math.random().toString(36).slice(2, 8)}`);
  cpSync(root, dir, { recursive: true, filter: (s) => !s.includes("node_modules") });
  mutate(dir);
  const { code, out } = run(dir, "template");
  const line = out.split("\n").find((l) => l.trim().startsWith("x ") && l.includes(rule));
  const ok = code === 1 && Boolean(line);
  if (!ok) bad++;
  console.error(`  ${ok ? "RED " : "MISS"}  ${rule} — ${what}`);
  if (line) console.error(`        ${line.trim().replace(/^x\s+/, "")}`);
  else console.error(`        !! exit ${code}; ${rule} did NOT report FAIL — the rule is dead code`);
  rmSync(dir, { recursive: true, force: true });
}

/* ═══════════════════════════════════════════════════════════════════════════
   [APPS-READINESS-LAUNCH-MODE · 2026-09-11] THE MODE-AWARE CASES.

   NAME THE FAILURE FIRST, twice over:
     (i)  "a TEMPLATE ships with an installed dependency tree and nobody
           notices" — the claim R9-not-installed exists to make impossible;
     (ii) "--mode=launch cannot return green for any real app, so a red launch
           report means nothing" — the defect this item fixed, which no
           template-mode run could ever have exposed, because the loop above
           runs every planted breach in template mode only.

   These three cases are the proof that the split did not simply delete a rule.
   A launch mode made green by removing R9 would pass case (b) and FAIL case
   (a) and case (c), which is exactly why all three are here.
   ═══════════════════════════════════════════════════════════════════════════ */
console.error("\nMODE-AWARE CASES — R9's two claims land in the right scopes\n");

const modeCases = [
  {
    what: "(a) node_modules planted in a TEMPLATE-mode tree",
    mode: "template",
    mutate: (d) => { mkdirSync(join(d, "node_modules/.bin"), { recursive: true }); writeFileSync(join(d, "node_modules/.package-lock.json"), "{}\n"); },
    expectRed: "R9-not-installed",
  },
  {
    /* The instance in launch mode, with node_modules exactly as a buildable
       tree has it. The planted-breach loop above cannot express this case: it
       copies with a node_modules filter and always runs --mode=template. */
    what: "(b) an INSTANCE tree in LAUNCH mode, node_modules present",
    mode: "launch",
    /* INSTANCE TREES ONLY, and the reason is not a convenience. Launch mode
       also asserts L1-L3 — reachable privacy and support URLs, screenshots,
       a filled listing — and a TEMPLATE has none of those by design. Running
       this case in the template would demand that an unlaunchable tree pass a
       launch gate, which is the same category error, pointed the other way,
       as the one this commit fixes. Skipped WITH a reason, never silently. */
    instanceOnly: true,
    mutate: (d) => { mkdirSync(join(d, "node_modules/.bin"), { recursive: true }); writeFileSync(join(d, "node_modules/.package-lock.json"), "{}\n"); },
    expectGreenRule: "R9-not-installed",
  },
  {
    what: "(c) an unpinned dependency in LAUNCH mode — pinning is not template-only",
    mode: "launch",
    mutate: (d) => editJson(d, "package.json", (o) => { o.dependencies.expo = "^51.0.28"; }),
    expectRed: "R9-pinned",
  },
  {
    /* [BUILD DAY 2026-10-01] The breach that shipped: an icon that is ONE flat
       colour passed R11 twice (size + opacity only) and a blank square was minutes
       from the Play internal track. In template mode a flat asset is a tolerated
       placeholder (named in the PASS line); in LAUNCH mode it must be RED. This
       plants a flat, opaque, correctly-sized icon — the exact file that got
       through — and asserts R11 names it. */
    what: "(d) a flat single-colour icon in LAUNCH mode — a placeholder is not a mark",
    mode: "launch",
    mutate: (d) => writePng(join(d, "assets/icon.png"), 1024, 1024, [12, 20, 36], false),
    expectRed: "R11-store-assets",
  },
];

const isInstanceTree = existsSync(join(root, "node_modules"));
for (const c of modeCases) {
  if (c.instanceOnly && !isInstanceTree) {
    console.error(`  N/A   ${c.what}`);
    console.error("        template tree: launch mode also requires L1-L3 (URLs, screenshots, filled listing), which a template has none of by design");
    continue;
  }
  const dir = join(scratch2, `mode-${Math.random().toString(36).slice(2, 8)}`);
  cpSync(root, dir, { recursive: true, filter: (s) => !s.includes("node_modules") });
  c.mutate(dir);
  const { code, out } = run(dir, c.mode);
  let ok;
  let detail;
  let unverified = false;
  if (c.expectRed) {
    const line = out.split("\n").find((l) => l.trim().startsWith("x ") && l.includes(c.expectRed));
    ok = code === 1 && Boolean(line);
    detail = line ? line.trim().replace(/^x\s+/, "") : `exit ${code}; ${c.expectRed} did NOT report FAIL`;
  } else {
    const line = out.split("\n").find((l) => l.trim().startsWith("ok ") && l.includes(c.expectGreenRule));
    /* Both halves matter: the rule must PASS *and* say why. A green rule inside
       a red report is not an unblocked gate.

       🔴 EXIT 2 IS NOT A FAILURE, AND CONFLATING THE TWO IS ITS OWN DEFECT.
       listing-readiness exits 2 for UNVERIFIED — a rule it could not evaluate,
       in practice an L1 URL it could not reach. A launch gate that a network
       blip turns red is a gate whose red means nothing, which is the same
       class of mistake as the rule this commit fixed. So: exit 1 is a real
       miss, exit 2 is reported as UNVERIFIED, loudly and by name, and is not
       counted against the harness. */
    ok = code !== 1 && Boolean(line) && /not applicable in launch mode/.test(line);
    unverified = ok && code === 2;
    detail = line ? line.trim().replace(/^ok\s+/, "") : `exit ${code}; ${c.expectGreenRule} did not pass with a stated reason`;
    if (unverified) {
      const skipped = out.split("\n").filter((l) => l.trim().startsWith("SKIP ")).map((l) => l.trim().slice(5).split(":")[0]);
      detail += `  [UNVERIFIED, exit 2 — could not evaluate: ${skipped.join(", ") || "unknown"}]`;
    }
  }
  if (!ok) bad++;
  console.error(`  ${ok ? (c.expectRed ? "RED " : unverified ? "UNVER" : "GREEN") : "MISS"}  ${c.what}`);
  console.error(`        ${detail}`);
  rmSync(dir, { recursive: true, force: true });
}

/* CONTROL. Which mode is correct here is decided by the tree, not by a flag:
   an installed node_modules IS the definition of an instance, which is the
   same fact R9-not-installed tests. A template tree must be green in template
   mode; an instance must be green in LAUNCH mode — and before 2026-09-11 the
   instance could not be, in either. */
const isInstance = isInstanceTree;
const controlMode = isInstance ? "launch" : "template";
console.error(`\nCONTROL — the untouched tree must be green (${isInstance ? "instance" : "template"})\n`);
const control = run(root, controlMode);
/* Same three-way verdict as above, for the same reason: exit 2 means a rule
   could not be EVALUATED. Saying "the tree is not green" when the truth is
   "an L1 URL did not answer" is how a transient network failure gets filed as
   a product defect — which has happened in this portfolio before. */
const controlOk = control.code !== 1;
const controlUnver = control.code === 2;
if (!controlOk) bad++;
const controlSkips = control.out.split("\n").filter((l) => l.trim().startsWith("SKIP ")).map((l) => l.trim().slice(5).split(":")[0]);
console.error(`  ${controlOk ? (controlUnver ? "UNVER" : "GREEN") : "FAIL "}  unmodified tree, --mode=${controlMode} (exit ${control.code})`);
if (controlUnver) console.error(`        UNVERIFIED — could not evaluate: ${controlSkips.join(", ") || "unknown"}. NOT a rule failure.`);

rmSync(scratch, { recursive: true, force: true });
rmSync(scratch2, { recursive: true, force: true });
console.error("");
if (bad) {
  console.error(`redproof: ${bad} rule(s) did not behave — listing-readiness is not trustworthy yet.`);
  process.exit(1);
}
console.error(
  `redproof: OK — ${BREACHES.length} planted breach(es) each turned their own rule RED, ` +
  `${modeCases.length} mode-aware case(s) landed in the right scope, and the clean ` +
  `${isInstance ? "instance" : "template"} is ${control.code === 0 ? "GREEN" : "UNVERIFIED (exit 2 — see above; not a rule failure)"}.`,
);
