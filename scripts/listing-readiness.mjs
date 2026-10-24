#!/usr/bin/env node
/**
 * listing-readiness — README § 10 / NEW-APP-CHECKLIST § 6, as executable tests.
 *
 * "Fails RED when: /app/privacy or /app/support is not 200 · icon has alpha or
 *  wrong size · feature graphic missing · a screenshot set is empty (both iOS
 *  sizes, 1320×2868 + 1206×2622, each shot in both) · apps.json
 *  ids differ from the build config · description lacks the endorsement close ·
 *  a declaration in the checklist is unticked. Plant one breach and watch it go
 *  red before trusting it."
 *
 * Every one of those sentences is a rule below with an id, so `redproof.mjs` can
 * plant a breach per rule and prove the rule is alive. Two modes:
 *
 *   --mode=template (default)  structural rules only. This is what a template or
 *                              a half-built app can pass, and what CI runs on
 *                              every commit. No network required.
 *   --mode=launch              adds the rules that only mean something once the
 *                              app exists: live 200s on the two store URLs,
 *                              non-empty screenshot sets, listing fields filled.
 *
 * A rule that cannot be evaluated reports SKIP and the run exits 2 — never 0.
 * "Unverified" is a distinct outcome from "passed"; a checker that quietly
 * downgrades to a pass is how an unticked declaration reaches a store.
 *
 * ZERO DEPENDENCIES on purpose: this must run before `npm install` ever does,
 * on a template whose Expo SDK is declared and deliberately not installed.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(join(dirname(fileURLToPath(import.meta.url)), ".."));
const argv = process.argv.slice(2);
const arg = (n) => argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");
const MODE = arg("mode") ?? "template";
if (!["template", "launch"].includes(MODE)) {
  console.error(`listing-readiness: unknown --mode=${MODE}`);
  process.exit(2);
}

const results = [];
const pass = (id, msg) => results.push({ id, state: "PASS", msg });
const fail = (id, msg) => results.push({ id, state: "FAIL", msg });
const skip = (id, msg) => results.push({ id, state: "SKIP", msg });

const read = (rel) => readFileSync(join(root, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));
const has = (rel) => existsSync(join(root, rel));

function walk(dir, out = []) {
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (["node_modules", ".git", ".expo", "dist"].includes(e.name)) continue;
    const rel = `${dir}/${e.name}`.replace(/^\.\//, "");
    if (e.isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}
const ALL_FILES = walk(".");

/* ---------------------------------------------------------------- R1 */
let venture = null;
try {
  venture = readJson("venture.json");
  const missing = ["slug", "venture", "nativeValue"].filter((k) => !(k in venture));
  if (missing.length) fail("R1-venture-schema", `venture.json is missing ${missing.join(", ")}`);
  else if (!/^[a-z0-9-]+$/.test(venture.slug))
    fail("R1-venture-schema", `venture.slug "${venture.slug}" is not a lowercase slug`);
  else pass("R1-venture-schema", `venture.json describes "${venture.venture}" (${venture.slug})`);
} catch (e) {
  fail("R1-venture-schema", `venture.json unreadable: ${e.message}`);
}

/* ---------------------------------------------------------------- R2 */
const expectedId = venture
  ? venture.domain
    ? `com.${venture.slug}.app`
    : `com.jukkablomberg.${venture.slug}`
  : null;
{
  const cfg = has("app.config.ts") ? read("app.config.ts") : "";
  if (!cfg) fail("R2-bundle-id-derived", "app.config.ts is missing");
  else {
    // The id must be COMPUTED. A literal `com.<something>.app` anywhere in the
    // config is the failure mode this rule exists to catch: README § 7 calls the
    // identifier permanent, and a permanent value written by hand in several
    // files eventually disagrees with itself.
    const literals = [...cfg.matchAll(/["'`](com\.[a-z0-9.]+)["'`]/g)].map((m) => m[1]);
    if (literals.length)
      fail("R2-bundle-id-derived", `app.config.ts hard-codes ${literals.join(", ")} instead of deriving it from venture.json`);
    else if (!/bundleIdentifier:\s*id\b/.test(cfg) || !/package:\s*id\b/.test(cfg))
      fail("R2-bundle-id-derived", "app.config.ts does not assign the derived id to BOTH ios.bundleIdentifier and android.package");
    else pass("R2-bundle-id-derived", `both platform ids derive to ${expectedId}`);
  }
}

/* ---------------------------------------------------------------- R3 */
let registry = null;
{
  const explicit = arg("registry");
  const candidates = explicit
    ? [explicit]
    : ["../apps.json", "../../apps.json", "../../app-stores/apps.json", "../../../app-stores/apps.json"];
  for (const c of candidates) {
    const p = resolve(root, c);
    if (existsSync(p)) { registry = { path: p, data: JSON.parse(readFileSync(p, "utf8")) }; break; }
  }
  if (!registry) skip("R3-registry-agreement", "apps.json not found — pass --registry=<path>");
  else if (!venture) skip("R3-registry-agreement", "venture.json unreadable");
  else {
    const row = registry.data.apps.find((a) => a.slug === venture.slug);
    if (!row) fail("R3-registry-agreement", `apps.json has no row for slug "${venture.slug}" (NEW-APP-CHECKLIST § 0 requires one)`);
    else if (row.bundle_id !== expectedId || row.package_name !== expectedId)
      fail("R3-registry-agreement", `apps.json ids (${row.bundle_id} / ${row.package_name}) differ from the build config id (${expectedId})`);
    else pass("R3-registry-agreement", `apps.json row and build config agree on ${expectedId}`);
  }
}

/* ---------------------------------------------------------------- R4 */
{
  const nv = venture?.nativeValue ?? [];
  const ids = new Set(nv.map((f) => f?.id));
  if (nv.length < 3)
    fail("R4-native-value-3", `${nv.length} native-value feature(s) named; README § 7 binds every app to >= 3 (Apple 4.2). "If you cannot name three, it is not an app yet."`);
  else if (ids.size !== nv.length)
    fail("R4-native-value-3", "native-value feature ids are not unique");
  else {
    const unevidenced = nv.filter((f) => !f.evidence || !has(f.evidence));
    const trivial = nv.filter((f) => f.evidence && has(f.evidence) && statSync(join(root, f.evidence)).size < 200);
    if (unevidenced.length)
      fail("R4-native-value-3", `named but not implemented: ${unevidenced.map((f) => f.id).join(", ")} — every feature must point at a file that exists (the review notes claim it works)`);
    else if (trivial.length)
      fail("R4-native-value-3", `evidence file is a stub for: ${trivial.map((f) => f.id).join(", ")}`);
    else if (registry && venture) {
      const row = registry.data.apps.find((a) => a.slug === venture.slug);
      const reg = new Set((row?.native_value ?? []).map((s) => s.toLowerCase()));
      const mine = nv.map((f) => f.name.toLowerCase());
      const drift = mine.filter((n) => !reg.has(n));
      if (row && drift.length)
        fail("R4-native-value-3", `named features differ from apps.json: ${drift.join(", ")}`);
      else pass("R4-native-value-3", `${nv.length} native-value features, each implemented and matching the registry`);
    } else pass("R4-native-value-3", `${nv.length} native-value features, each implemented`);
  }
}

/* ---------------------------------------------------------------- R5 */
let studio = null;
{
  try {
    studio = readJson("store/studio.json");
  } catch { /* handled below */ }
  if (!studio) fail("R5-endorsement-close", "store/studio.json is missing or unreadable");
  else if (registry && studio.descriptionClose !== registry.data.studio.description_close)
    fail("R5-endorsement-close", "store/studio.json descriptionClose has drifted from apps.json studio.description_close");
  else {
    let listing = null;
    try { listing = readJson("store/listing.json"); } catch { /* R6 reports */ }
    const full = listing?.fullDescription ?? "";
    if (full && !full.trimEnd().endsWith(studio.descriptionClose.trim()))
      fail("R5-endorsement-close", "fullDescription does not end with the endorsement close required on both stores");
    else pass("R5-endorsement-close", full ? "description ends with the endorsement close" : "endorsement close in sync with the registry (description not yet written)");
  }
}

/* ---------------------------------------------------------------- R6 */
{
  let listing = null;
  try { listing = readJson("store/listing.json"); } catch (e) { fail("R6-listing-limits", `store/listing.json unreadable: ${e.message}`); }
  if (listing) {
    const limits = { name: 30, subtitle: 30, shortDescription: 80, fullDescription: 4000, promotionalText: 170, keywords: 100 };
    const over = Object.entries(limits)
      .filter(([k, max]) => (listing[k] ?? "").length > max)
      .map(([k, max]) => `${k} is ${listing[k].length}/${max}`);
    if (over.length) fail("R6-listing-limits", `store field over the platform limit: ${over.join("; ")}`);
    else pass("R6-listing-limits", "every store field is within its platform limit");
  }
}

/* ---------------------------------------------------------------- R7 */
{
  const cfg = has("app.config.ts") ? read("app.config.ts") : "";
  const urls = [...cfg.matchAll(/https:\/\/\$\{?v?\.?domain\}?[^`"']*/g)].map((m) => m[0]);
  const offDomain = [...cfg.matchAll(/https:\/\/(?!\$\{)([a-z0-9.-]+)/g)].map((m) => m[1]);
  const paths = ["/app/privacy", "/app/support"].every((p) => cfg.includes(p));
  if (!paths)
    fail("R7-urls-on-venture-domain", "app.config.ts does not derive both /app/privacy and /app/support");
  else if (offDomain.includes("jukkablomberg.com"))
    fail("R7-urls-on-venture-domain", "a store URL points at jukkablomberg.com; README § 6b puts marketing, privacy and support on the venture's own domain");
  else if (urls.length < 3)
    fail("R7-urls-on-venture-domain", "marketing / privacy / support URLs are not all derived from venture.domain");
  else pass("R7-urls-on-venture-domain", "marketing, privacy and support URLs all derive from the venture's own domain");
}

/* ---------------------------------------------------------------- R8 */
{
  let gate = null;
  try { gate = readJson("SUBMISSION-GATE.json"); } catch { /* below */ }
  let eas = null;
  try { eas = readJson("eas.json"); } catch { /* below */ }
  const problems = [];
  if (!gate) problems.push("SUBMISSION-GATE.json is missing — the standing hard gate has no machine-readable form");
  if (!eas) problems.push("eas.json is missing or unreadable");
  if (gate && eas) {
    if (gate.productionSubmission !== "locked" && !gate.liftedBy)
      problems.push("the gate claims to be unlocked but names nobody who lifted it; README § 7 requires Jukka in writing");
    const profiles = Object.keys(eas.submit ?? {});
    const notAllowed = profiles.filter((p) => !(gate.allowedSubmitProfiles ?? []).includes(p));
    if (notAllowed.length)
      problems.push(`eas.json declares submit profile(s) the gate does not allow: ${notAllowed.join(", ")}`);
    for (const [name, p] of Object.entries(eas.submit ?? {})) {
      const track = p?.android?.track;
      if (track && (gate.forbiddenAndroidTracks ?? []).includes(track))
        problems.push(`submit profile "${name}" targets the Android "${track}" track`);
      // A PARTIAL lift (Play only, 2026-09-09) makes this check load-bearing for
      // the first time: while nothing could reach production, an Apple block in a
      // submit profile was unreachable anyway. Now that Android production is
      // allowed, the Apple half of the gate is only as strong as this loop.
      const apple = p?.ios;
      const forbiddenApple = gate.forbiddenAppleDestinations ?? [];
      if (apple && forbiddenApple.length)
        problems.push(
          `submit profile "${name}" declares an iOS destination while the gate still forbids ${forbiddenApple.join(", ")}`,
        );
    }
    for (const f of ALL_FILES.filter((f) => /\.(ya?ml|sh|mjs|js|json)$/.test(f) && f !== "SUBMISSION-GATE.json")) {
      const body = read(f);
      const m = body.match(/eas\s+submit[^\n]*/g) ?? [];
      for (const line of m) {
        if (/--profile[= ]production|--(auto-submit|non-interactive)[^\n]*production/.test(line))
          problems.push(`${f} invokes a production submit: ${line.trim()}`);
      }
    }
  }
  if (problems.length) fail("R8-hard-gate", `PRODUCTION SUBMISSION IS BLOCKED and this tree would break that: ${problems.join(" | ")}`);
  else pass("R8-hard-gate", `production submission blocked (gate=${gate.productionSubmission}); only ${JSON.stringify(gate.allowedSubmitProfiles)} submit profile(s), Android track "${eas.submit.internal.android.track}"`);
}

/* ---------------------------------------------------------------- R9

   [APPS-READINESS-LAUNCH-MODE · 2026-09-11] R9 WAS TWO CLAIMS UNDER ONE ID,
   AND THE SECOND ONE MADE --mode=launch UNABLE TO RETURN GREEN FOR ANY REAL APP.

   Measured on 2026-09-11 against usephysics/repo-app at HEAD: in
   --mode=launch, R1-R8 and R10-R14 all pass, the privacy and support URLs
   both answer 200, 6 iOS + 6 Android screenshots are present, the listing is
   filled, and the gate correctly reads "lifted-google-play-only". The ONE
   failure was `R9-pinned-not-installed: node_modules is present` -- fired on a
   tree that MUST have node_modules in order to build at all. A gate that
   cannot return green does not mean anything when it is red, and the
   portfolio's first store submission was sitting behind it with Jukka's
   written lift (2026-09-09) unused.

   The two claims are independent and belong in different scopes:

     R9-pinned        every dependency version is exact. TRUE IN BOTH MODES --
                      app N must build the tree app 1 built, and a range in an
                      instance is the same defect it is in the template.
     R9-not-installed node_modules is absent. A TEMPLATE-HYGIENE claim only.
                      The template ships uninstalled and is validated by static
                      checks; an INSTANCE is a tree somebody is about to build
                      and ship, where an installed tree is the correct state.

   In launch mode the second is reported as an explicit PASS naming the reason,
   never silently dropped: a report that goes quiet about a rule is how a rule
   gets deleted by accident later.                                          */
{
  let pkg = null;
  try { pkg = readJson("package.json"); } catch (e) { fail("R9-pinned", `package.json unreadable: ${e.message}`); }
  if (pkg) {
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    const loose = Object.entries(deps).filter(([, v]) => !/^\d+\.\d+\.\d+$/.test(v));
    if (loose.length)
      fail("R9-pinned", `unpinned version(s): ${loose.map(([k, v]) => `${k}@${v}`).join(", ")} — app N must build the tree app 1 built`);
    else pass("R9-pinned", `${Object.keys(deps).length} dependencies pinned exactly`);

    const installed = has("node_modules");
    if (MODE === "template") {
      if (installed)
        fail("R9-not-installed", "node_modules is present; the template is validated by static checks and ships uninstalled");
      else pass("R9-not-installed", "no node_modules — the template ships uninstalled");
    } else {
      pass(
        "R9-not-installed",
        installed
          ? "instance tree: node_modules required to build — template-hygiene rule not applicable in launch mode"
          : "instance tree: template-hygiene rule not applicable in launch mode (nothing installed yet; `npm ci` before building)",
      );
    }
  }
}

/* ---------------------------------------------------------------- R10 */
{
  const VALUE_PATTERNS = [
    [/\bappl_[A-Za-z0-9]{16,}/, "a RevenueCat iOS key"],
    [/\bgoog_[A-Za-z0-9]{16,}/, "a RevenueCat Android key"],
    [/\bAIza[0-9A-Za-z_-]{30,}/, "a Google/Firebase API key"],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "a private key"],
    [/"private_key"\s*:\s*"/, "a service-account private key"],
  ];
  const SECRET_FILES = /(\.p8|\.p12|\.keystore|\.mobileprovision)$|(^|\/)(google-services\.json|GoogleService-Info\.plist|play-service-account\.json)$/;
  const hits = [];
  for (const f of ALL_FILES) {
    if (SECRET_FILES.test(f)) { hits.push(`${f} is a credential file`); continue; }
    if (/\.(png|jpg|jpeg|gif|ico)$/.test(f)) continue;
    const body = read(f);
    for (const [re, what] of VALUE_PATTERNS) if (re.test(body)) hits.push(`${f} contains ${what}`);
  }
  if (hits.length) fail("R10-no-secret-values", `secrets live in EAS/GitHub secrets only (README § 7): ${hits.join("; ")}`);
  else pass("R10-no-secret-values", `${ALL_FILES.length} files scanned, no key value or credential file in the tree`);
}

/* ---------------------------------------------------------------- R11 */
function pngInfo(rel) {
  const b = readFileSync(join(root, rel));
  if (b.length < 33 || b.readUInt32BE(12) !== 0x49484452) return null;
  return {
    width: b.readUInt32BE(16),
    height: b.readUInt32BE(20),
    colorType: b[25],
    hasAlpha: b[25] === 4 || b[25] === 6 || b.includes(Buffer.from("tRNS")),
  };
}
// Decodes an 8-bit, non-interlaced PNG far enough to count distinct pixel values on a
// sample grid. Zero dependencies (R9 forbids node_modules on the template), so this is
// a deliberately small decoder: IHDR + IDAT inflate + the five scanline filters.
// Added 2026-10-01 after the UsePhysics build day: five single-colour placeholder PNGs
// passed this rule twice (size + opacity only) and a blank square was minutes from the
// Play internal track. A store asset that is one flat colour is a placeholder, not a mark
// (L16 — a check that cannot fail is not a check).
function pngDistinctColours(rel, sampleStep = 8) {
  let zlib;
  try { zlib = process.getBuiltinModule ? process.getBuiltinModule("node:zlib") : null; } catch { zlib = null; }
  if (!zlib) return null;
  const b = readFileSync(join(root, rel));
  if (b.length < 33 || b.readUInt32BE(12) !== 0x49484452) return null;
  const width = b.readUInt32BE(16), height = b.readUInt32BE(20);
  const depth = b[24], colorType = b[25], interlace = b[28];
  if (depth !== 8 || interlace !== 0) return null;
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) return null; // palette images are out of scope for this probe
  const idat = [];
  let off = 8;
  while (off + 8 <= b.length) {
    const len = b.readUInt32BE(off), tag = b.toString("latin1", off + 4, off + 8);
    if (tag === "IDAT") idat.push(b.subarray(off + 8, off + 8 + len));
    if (tag === "IEND") break;
    off += 12 + len;
  }
  let raw;
  try { raw = zlib.inflateSync(Buffer.concat(idat)); } catch { return null; }
  const bpp = channels, stride = width * bpp;
  if (raw.length < height * (stride + 1)) return null;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1, dst = y * stride, prev = (y - 1) * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[dst + x - bpp] : 0;
      const up = y > 0 ? out[prev + x] : 0;
      const c = y > 0 && x >= bpp ? out[prev + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += up;
      else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const pa = Math.abs(up - c), pb = Math.abs(a - c), pc = Math.abs(a + up - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      out[dst + x] = v & 0xff;
    }
  }
  const seen = new Set();
  for (let y = 0; y < height; y += sampleStep)
    for (let x = 0; x < width; x += sampleStep) {
      const i = y * stride + x * bpp;
      seen.add(out.toString("hex", i, i + bpp));
      if (seen.size > 64) return seen.size; // enough: this is not a placeholder
    }
  return seen.size;
}
{
  const problems = [];
  const placeholders = [];
  const REQUIRED = [
    ["assets/icon.png", 1024, 1024, false, 8],
    ["assets/feature-graphic.png", 1024, 500, null, 8],
    ["assets/adaptive-icon-foreground.png", null, null, null, 2],
    ["assets/adaptive-icon-background.png", null, null, null, 1],
    ["assets/adaptive-icon-monochrome.png", null, null, null, 2],
  ];
  for (const [rel, w, h, alphaAllowed, minColours] of REQUIRED) {
    if (!has(rel)) { problems.push(`${rel} is missing`); continue; }
    const info = pngInfo(rel);
    if (!info) { problems.push(`${rel} is not a readable PNG`); continue; }
    if (w && (info.width !== w || info.height !== h))
      problems.push(`${rel} is ${info.width}x${info.height}, must be ${w}x${h}`);
    if (alphaAllowed === false && info.hasAlpha)
      problems.push(`${rel} has an alpha channel; the store master must be opaque`);
    const colours = pngDistinctColours(rel);
    if (colours !== null && colours < minColours)
      placeholders.push(`${rel} is ${colours === 1 ? "one flat colour" : `${colours} colours`} (placeholder, not a mark; needs ≥ ${minColours})`);
  }
  // A flat placeholder is tolerated on the uninstalled template (R9) and FAILS the moment a
  // venture instance is checked for launch: the icon is what the store and the launcher show.
  if (placeholders.length && MODE === "launch") problems.push(...placeholders);
  if (problems.length) fail("R11-store-assets", problems.join("; "));
  else if (placeholders.length)
    pass("R11-store-assets", `sizes/opacity ok; PLACEHOLDER art still in place (${placeholders.length} flat asset(s)) — replace before --mode=launch`);
  else pass("R11-store-assets", "icon 1024x1024 opaque, feature graphic 1024x500, all three Android adaptive layers present, none a flat placeholder");
}

/* ---------------------------------------------------------------- R12 */
{
  let eas = null;
  try { eas = readJson("eas.json"); } catch { /* R8 reported */ }
  if (eas) {
    const problems = [];

    // eas-cli validates eas.json with allowUnknown:false, and the ONLY top-level
    // keys @expo/eas-json accepts are these four. This rule previously required a
    // top-level "update" key, which eas-cli rejects outright — the template had
    // never been run through `eas`, so an invalid file passed the harness for
    // five days and failed on Jukka's first `eas init`. The allowed set is
    // written out rather than imported because the harness runs on a tree with
    // no node_modules (R9), so it cannot ask the real schema.
    const ALLOWED_TOP = ["$schema", "cli", "build", "submit"];
    const unknownTop = Object.keys(eas).filter((k) => !ALLOWED_TOP.includes(k));
    if (unknownTop.length)
      problems.push(`eas.json has top-level key(s) eas-cli will reject: ${unknownTop.join(", ")} (allowed: ${ALLOWED_TOP.join(", ")})`);

    for (const k of ["build", "submit"]) if (!eas[k]) problems.push(`eas.json has no "${k}" profiles`);

    // Same trap one level down: a submit profile takes platform keys only, so a
    // "_gate"-style comment key is a hard validation error, not documentation.
    const ALLOWED_SUBMIT = ["android", "ios"];
    for (const [name, profile] of Object.entries(eas.submit ?? {})) {
      const bad = Object.keys(profile ?? {}).filter((k) => !ALLOWED_SUBMIT.includes(k));
      if (bad.length)
        problems.push(`submit profile "${name}" has key(s) eas-cli will reject: ${bad.join(", ")}`);
    }

    // EAS Update is configured per build profile as `channel`. Requiring one was
    // this rule's own invention and it cost a build: `eas build` refuses to run a
    // channelled profile unless expo-updates is installed, then tries to write an
    // updates url into a dynamic app.config.ts and dies. A channel is OPTIONAL —
    // what is not optional is that declaring one means carrying the package that
    // implements it. That coherence is what gets asserted now, so the failure
    // surfaces here in a second rather than minutes into a build.
    const channelled = Object.entries(eas.build ?? {}).filter(([, p]) => p?.channel);
    if (channelled.length) {
      let pkg = null;
      try { pkg = readJson("package.json"); } catch { /* R9 reported */ }
      const hasUpdates = !!pkg?.dependencies?.["expo-updates"];
      if (!hasUpdates)
        problems.push(
          `build profile(s) ${channelled.map(([n]) => n).join(", ")} declare an update channel but expo-updates is not a dependency — eas build will stop and ask to install it`,
        );
    }

    if (eas.build && !eas.build.production?.autoIncrement)
      problems.push("build.production does not set autoIncrement (README § 7: build numbers auto-increment per platform)");

    if (problems.length) fail("R12-eas-profiles", problems.join("; "));
    else pass("R12-eas-profiles", `Build and Submit profiles present, no key eas-cli rejects, ${channelled.length} update channel(s); production build autoIncrements`);
  }
}

/* ---------------------------------------------------------------- R13 */
{
  const edges = venture?.policyEdges ?? [];
  let listing = null;
  try { listing = readJson("store/listing.json"); } catch { /* R6 reported */ }
  const needsDisclosure = edges.some((e) => /health|financial|money|medical/i.test(e));
  if (!needsDisclosure) pass("R13-policy-disclosure", "no health/financial policy edge declared, no first-screen disclosure required");
  else if ((listing?.firstScreenDisclosure ?? "").length === 0)
    fail("R13-policy-disclosure", `policy edge(s) ${edges.join(", ")} declared but firstScreenDisclosure is empty — README § 7 requires "information, not advice" on the first screen and in the description`);
  else pass("R13-policy-disclosure", "first-screen disclosure present for the declared policy edge");
}

/* ---------------------------------------------------------------- R14 */
{
  // The EAS project id is the third config value in two days to ship in a shape
  // the real tool refuses. Expo's config serializer turns an explicit `null` into
  // `{}`, so eas-cli reads the project as "already linked (ID: [object Object])"
  // and neither init nor build will run. A value that must be a string or absent
  // must therefore never be written as null, and the id itself must look like the
  // UUID EAS issues rather than a placeholder someone meant to replace.
  const problems = [];
  const cfg = read("app.config.ts");
  if (/projectId:[^,\n}]*\bnull\b/.test(cfg))
    problems.push("app.config.ts can emit `projectId: null`; Expo serializes that to {} and eas-cli then refuses to build — omit the `eas` key until a real id exists");

  const id = venture?.easProjectId;
  if (id !== null && id !== undefined) {
    if (typeof id !== "string")
      problems.push(`venture.json easProjectId is ${typeof id}, must be a string or null`);
    else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
      problems.push(`venture.json easProjectId "${id}" is not a UUID — EAS issues one from \`eas init\``);
  }

  if (problems.length) fail("R14-eas-project-id", problems.join("; "));
  else pass("R14-eas-project-id", id ? `easProjectId is a UUID and cannot serialise to null` : "no easProjectId yet, and the eas key is omitted rather than nulled");
}

/* ---------------------------------------------------------------- R15 */
{
  // [APPS-TEMPLATE-SDK57 2026-09-28] The Play floor, as a rule. The template sat
  // on Expo SDK 51 (target API 34) for four weeks after Google Play began
  // REQUIRING target API 36 (2026-08-31), and every structural rule stayed green
  // because none of them read the SDK. A tree that cannot be uploaded is not
  // listing-ready, so the floor is asserted here: the Expo SDK major must be at
  // least the one that ships API 36, and app.config.ts must pin compile/target
  // SDK explicitly (expo-build-properties) so a future bump cannot silently
  // lower it. Raise both constants when Play raises its floor.
  const PLAY_TARGET_API = 36;
  const MIN_EXPO_MAJOR = 57;
  const problems = [];
  let pkg = null;
  try { pkg = readJson("package.json"); } catch { /* R9 reported */ }
  const expoVer = pkg?.dependencies?.expo ?? "";
  const major = Number((expoVer.match(/(\d+)\./) ?? [])[1]);
  if (!expoVer) problems.push("package.json declares no expo dependency");
  else if (!(major >= MIN_EXPO_MAJOR))
    problems.push(`expo ${expoVer} is below SDK ${MIN_EXPO_MAJOR}; older SDKs target an Android API below Play's required ${PLAY_TARGET_API}`);
  const cfg = has("app.config.ts") ? read("app.config.ts") : "";
  if (!/["']expo-build-properties["']/.test(cfg))
    problems.push("app.config.ts does not configure expo-build-properties, so target API is whatever the SDK defaults to");
  for (const k of ["targetSdkVersion", "compileSdkVersion"]) {
    const m = cfg.match(new RegExp(`${k}:\\s*(\\d+)`));
    if (!m) problems.push(`app.config.ts does not pin android ${k}`);
    else if (Number(m[1]) < PLAY_TARGET_API)
      problems.push(`app.config.ts pins ${k} ${m[1]}; Google Play requires ${PLAY_TARGET_API}`);
  }
  if (problems.length) fail("R15-play-target-api", problems.join("; "));
  else pass("R15-play-target-api", `expo ${expoVer} (SDK >= ${MIN_EXPO_MAJOR}); compile and target SDK pinned at >= ${PLAY_TARGET_API}`);
}

/* ---------------------------------------------------------------- R16
   [DX-WORDING-GUARD · HEALTH-TRIO-DAY C1 · 2026-10-09] Detoxcellence's charter and the day's firewall: no
   "non-toxic" or equivalent wording on ANY Detoxcellence surface — Directive (EU) 2024/825 Annex 2a makes a
   generic claim the trader cannot evidence an unfair practice from 2026-09-27, and Jukka's 10-09 `counsel: none`
   made "no non-toxic claims" a standing NO. A surface here is every string a reader can meet: the app's own
   code (app/, src/ — copy lives in TSX), the bundled data the app prints (src/data/*.json, synced from the site),
   and every store field (store/*.json). Matched case-insensitively with any separator, so "Non toxic",
   "toxin‑free" (non-breaking hyphen) and "chemicalfree" all fail. Generated studio files are included: they are
   surfaces too. This file and redproof.mjs are excluded (they must name the words to guard them). */
{
  const BANNED = [/non[\s\-‐‑‒–_]*toxic/i, /toxin[\s\-‐‑‒–_]*free/i, /chemical[\s\-‐‑‒–_]*free/i];
  const surfaces = ALL_FILES.filter((f) =>
    (/^(app|src)\//.test(f) && /\.(tsx?|json)$/.test(f)) || (/^store\//.test(f) && /\.json$/.test(f)));
  const hits = [];
  for (const f of surfaces) {
    const lines = read(f).split("\n");
    lines.forEach((line, i) => {
      for (const re of BANNED) {
        const m = re.exec(line);
        if (m) hits.push(`${f}:${i + 1} "${m[0]}"`);
      }
    });
  }
  if (!surfaces.length) skip("R16-no-generic-claims", "no app, src or store files found to scan");
  else if (hits.length) fail("R16-no-generic-claims", `generic-claim wording (EU 2024/825; Detoxcellence charter) on ${hits.length} line(s): ${hits.slice(0, 8).join(" · ")}${hits.length > 8 ? " …" : ""} — reword to an evidenced property ("PFAS-free per the maker's test report") or drop it; data rows are fixed at the site, then synced`);
  else pass("R16-no-generic-claims", `${surfaces.length} surface file(s) carry no "non-toxic" / "toxin-free" / "chemical-free" wording`);
}

/* ---------------------------------------------------------------- R16
   [APP-TEMPLATE-SHOT-IOS-MEDIUM 2026-10-11] The screenshot geometries are store sizes, not suggestions: shot-frame.mjs
   declares android 1080×1920, ios 1320×2868 (6.9") and ios-medium 1206×2622 (App Store Connect's "iPhone with Dynamic
   Island (medium display)" slot, reused for every iPhone size), and each one's viewport × 3 (+ the caption band × 3)
   must BE its size — a geometry that only resamples into its size is the sips set this item replaced. */
{
  const STORE_SIZES = { android: [1080, 2160], ios: [1320, 2868], "ios-medium": [1206, 2622] };
  if (!has("scripts/shot-frame.mjs")) fail("R16-shot-geometry", "scripts/shot-frame.mjs is missing — every screenshots.mjs frames its shots through it");
  else {
    const sf = await import(pathToFileURL(join(root, "scripts/shot-frame.mjs")).href);
    const problems = [];
    for (const [p, size] of Object.entries(STORE_SIZES)) {
      const g = sf.GEOMETRY?.[p];
      if (!g) problems.push(`geometry ${p} is missing (want ${size.join("×")})`);
      else if (g.size?.join("x") !== size.join("x")) problems.push(`${p} is ${g.size?.join("×")}, the store size is ${size.join("×")}`);
    }
    problems.push(...(sf.geometryProblems ? sf.geometryProblems() : ["geometryProblems() is not exported"]));
    const ios = sf.IOS_PLATFORMS ?? [];
    if (!(ios.includes("ios") && ios.includes("ios-medium"))) problems.push(`IOS_PLATFORMS is [${ios.join(", ")}]; both iOS sizes must be emitted`);
    if (problems.length) fail("R16-shot-geometry", problems.join("; "));
    else pass("R16-shot-geometry", `shot-frame.mjs: ${Object.entries(STORE_SIZES).map(([p, z]) => `${p} ${z.join("×")}`).join(" · ")} — each viewport @3x + band is its store size; iOS emitted at both`);
  }
}

/* --------------------------------------------------------- launch mode */
if (MODE === "launch") {
  const domain = venture?.domain;
  for (const [id, path] of [["L1-privacy-url", "/app/privacy"], ["L1-support-url", "/app/support"]]) {
    if (!domain) { skip(id, "venture.domain is not set"); continue; }
    const url = `https://${domain}${path}`;
    try {
      const res = await fetch(url, { method: "GET", redirect: "follow" });
      if (res.status === 200) pass(id, `${url} -> 200`);
      else fail(id, `${url} -> ${res.status}; both stores require a reachable page and NEW-APP-CHECKLIST § 2 wants a 200, not a diff`);
    } catch (e) {
      skip(id, `${url} could not be reached (${e.message}) — unverified, not passed`);
    }
  }
  // [APP-TEMPLATE-SHOT-IOS-MEDIUM 2026-10-11] both iOS sets: 6.9" (assets/screenshots/ios) and the medium Dynamic
  // Island slot (assets/screenshots/ios-medium, exactly 1206×2622), and every iOS shot present in BOTH — a shot missing
  // from either set is RED by file name.
  const shotsIn = (dir) => (has(dir) ? readdirSync(join(root, dir)).filter((f) => /\.(png|jpg|jpeg)$/i.test(f)).sort() : []);
  const IOS_SETS = { "assets/screenshots/ios": "assets/screenshots/ios-medium", "assets/screenshots/ios-medium": "assets/screenshots/ios" };
  for (const [id, dir] of [["L2-ios-screenshots", "assets/screenshots/ios"], ["L2-ios-medium-screenshots", "assets/screenshots/ios-medium"], ["L2-android-screenshots", "assets/screenshots/android"]]) {
    const files = shotsIn(dir);
    if (files.length === 0) { fail(id, `${dir} is empty; a store listing cannot be submitted without a screenshot set${dir.endsWith("/ios-medium") ? " (App Store Connect's iPhone slot is 1206×2622 — run screenshots.mjs, which emits both iOS sizes)" : ""}`); continue; }
    if (IOS_SETS[dir]) {
      const other = shotsIn(IOS_SETS[dir]);
      const missing = other.filter((f) => !files.includes(f));
      if (missing.length) { fail(id, `${dir} is missing ${missing.join(", ")} (${IOS_SETS[dir]} has ${missing.length === 1 ? "it" : "them"}) — every iOS shot is emitted at both sizes, 1320×2868 and 1206×2622`); continue; }
    }
    if (dir.endsWith("/ios-medium")) {
      const bad = files.filter((f) => { const i = pngInfo(join(dir, f)); return !i || `${i.width}x${i.height}` !== "1206x2622"; });
      if (bad.length) { fail(id, `${bad.length}/${files.length} screenshot(s) in ${dir} are not 1206×2622 (render at the ios-medium geometry, never resample): ${bad.join(", ")}`); continue; }
    }
    if (dir.endsWith("/ios")) {
      // [APPLE-DAY 2026-10-05] App Store Connect rejects a screenshot that is not one of Apple's exact display
      // sizes at upload. Four of five repos carried 1080×1920 copies of the Android set here and this check
      // passed on the file count alone (the L16 class: a counter cannot see what it does not measure).
      // Accepted iPhone portrait sizes: 6.9" 1320×2868 (the one new apps need) · 6.7" 1290×2796 · 6.5" 1284×2778 / 1242×2688.
      const OK = new Set(["1320x2868", "1290x2796", "1284x2778", "1242x2688"]);
      const bad = files.filter((f) => { const i = pngInfo(join(dir, f)); return !i || !OK.has(`${i.width}x${i.height}`); });
      if (bad.length) { fail(id, `${bad.length}/${files.length} iOS screenshot(s) are not an Apple iPhone display size (generate 1320×2868; accepted 1290×2796, 1284×2778, 1242×2688): ${bad.join(", ")}`); continue; }
    }
    pass(id, `${files.length} screenshot(s) in ${dir}`);
  }
  let listing = null;
  try { listing = readJson("store/listing.json"); } catch { /* R6 */ }
  if (listing) {
    const required = ["name", "shortDescription", "fullDescription", "reviewNotes", "categoryPlay", "categoryApple"];
    const blank = required.filter((k) => !(listing[k] ?? "").trim());
    if (blank.length) fail("L3-listing-filled", `unticked declaration(s): ${blank.join(", ")} still blank`);
    else {
      const named = (venture?.nativeValue ?? []).filter((f) => !listing.reviewNotes.toLowerCase().includes(f.name.toLowerCase()));
      if (named.length) fail("L3-listing-filled", `review notes do not name the native features: ${named.map((f) => f.name).join(", ")}`);
      else pass("L3-listing-filled", "every required listing field is filled and the review notes name all three features");
    }
  }
}

/* ------------------------------------------------------------- report */
const failed = results.filter((r) => r.state === "FAIL");
const skipped = results.filter((r) => r.state === "SKIP");
for (const r of results) {
  const mark = r.state === "PASS" ? "ok  " : r.state === "SKIP" ? "SKIP" : " x  ";
  console.error(`  ${mark} ${r.id}: ${r.msg}`);
}
console.error("");
if (failed.length) {
  console.error(`listing-readiness [${MODE}]: ${failed.length} FAILURE(S) — ${failed.map((f) => f.id).join(", ")}`);
  process.exit(1);
}
if (skipped.length) {
  console.error(`listing-readiness [${MODE}]: UNVERIFIED — ${skipped.length} rule(s) could not be evaluated: ${skipped.map((s) => s.id).join(", ")}`);
  process.exit(2);
}
console.error(`listing-readiness [${MODE}]: OK — ${results.length} rule(s) passed.`);
