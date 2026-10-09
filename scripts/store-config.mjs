#!/usr/bin/env node
/**
 * store.config.json for EAS Metadata — the Apple App Store listing — GENERATED from
 * the same files the Play listing reads, so nothing is typed twice:
 *
 *   venture.json            slug, venture, domain
 *   app.config.ts           version (the string Apple shows; must equal the build's)
 *   store/listing.json      name, subtitle, fullDescription, keywords, promotionalText,
 *                           releaseNotes, reviewNotes, categoryApple
 *   store/studio.json       publicEmail, legalEntity (copyright)
 *   store/apple.json        age-rating answers (advisory), App Review contact, release strategy
 *
 *   node scripts/store-config.mjs                        → store.config.json
 *   eas metadata:lint -e production                      → schema check, no network
 *   eas metadata:push -e production --non-interactive    → App Store Connect
 *
 * Auth for push/pull: EXPO_TOKEN + EXPO_APPLE_TEAM_ID=RM8U7U8M3B
 * EXPO_APPLE_TEAM_TYPE=COMPANY_OR_ORGANIZATION. The ASC API key never leaves EAS
 * ("Using App Store Connect API Key from EAS credentials service", proven 2026-10-05).
 * The submit profile must carry submit.production.ios.ascAppId (eas submit prints it).
 *
 * NOT covered by EAS Metadata, done in App Store Connect web (APPLE-DAY runbook):
 * screenshots, pricing (Free), App Privacy, content rights, build selection, Submit.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const venture = read("venture.json");
const listing = read("store/listing.json");
const studio = read("store/studio.json");
const apple = read("store/apple.json");

const cfg = readFileSync(join(root, "app.config.ts"), "utf8");
const version = cfg.match(/^\s*version:\s*"(\d+\.\d+\.\d+)"/m)?.[1];
if (!version) throw new Error("store-config: app.config.ts has no `version: \"x.y.z\"` line");

const CATEGORY = {
  "Education": "EDUCATION", "Finance": "FINANCE", "Health & Fitness": "HEALTH_AND_FITNESS",
  "Travel": "TRAVEL", "Reference": "REFERENCE", "Utilities": "UTILITIES", "Lifestyle": "LIFESTYLE",
  "Food & Drink": "FOOD_AND_DRINK", "News": "NEWS", "Productivity": "PRODUCTIVITY", "Medical": "MEDICAL",
  "Business": "BUSINESS", "Weather": "WEATHER", "Navigation": "NAVIGATION", "Sports": "SPORTS",
};
const category = CATEGORY[listing.categoryApple];
if (!category) throw new Error(`store-config: categoryApple "${listing.categoryApple}" has no App Store enum in CATEGORY`);

const limit = (field, value, max) => {
  if (typeof value === "string" && value.length > max) throw new Error(`store-config: ${field} is ${value.length} chars, Apple allows ${max}`);
  return value;
};
const keywords = String(listing.keywords ?? "").split(",").map((k) => k.trim()).filter(Boolean);
limit("keywords (joined)", keywords.join(","), 100);
if (!listing.fullDescription?.endsWith(studio.descriptionClose)) throw new Error("store-config: fullDescription does not end with the endorsement close (R5)");

const domain = venture.domain;
const info = {
  // [MR-ASC-NAME] the App Store name is unique per store: "Monitoring Room" is held by another account (ASC 10-07), so Apple may carry its own name.
  title: limit("name", listing.nameApple ?? listing.name, 30),
  subtitle: limit("subtitle", listing.subtitle, 30),
  description: limit("fullDescription", listing.fullDescription, 4000),
  keywords,
  promoText: limit("promotionalText", listing.promotionalText, 170),
  marketingUrl: `https://${domain}`,
  supportUrl: `https://${domain}/app/support`,
  privacyPolicyUrl: `https://${domain}/app/privacy`,
};
if (listing.releaseNotes) info.releaseNotes = limit("releaseNotes", listing.releaseNotes, 4000);
for (const k of Object.keys(info)) if (info[k] === undefined || info[k] === "") delete info[k];

const ADVISORY_DEFAULTS = {
  ageRatingOverride: "NONE", alcoholTobaccoOrDrugUseOrReferences: "NONE", contests: "NONE", gambling: false,
  gamblingSimulated: "NONE", horrorOrFearThemes: "NONE", kidsAgeBand: null, koreaAgeRatingOverride: "NONE",
  lootBox: false, matureOrSuggestiveThemes: "NONE", medicalOrTreatmentInformation: "NONE",
  profanityOrCrudeHumor: "NONE", sexualContentGraphicAndNudity: "NONE", sexualContentOrNudity: "NONE",
  unrestrictedWebAccess: false, violenceCartoonOrFantasy: "NONE", violenceRealistic: "NONE",
  violenceRealisticProlongedGraphicOrSadistic: "NONE", advertising: false, ageAssurance: false,
  ageRatingOverrideV2: "NONE", developerAgeRatingInfoUrl: null, gunsOrOtherWeapons: "NONE",
  healthOrWellnessTopics: false, messagingAndChat: false, parentalControls: false, userGeneratedContent: false,
};
for (const k of Object.keys(apple.advisory ?? {})) if (!(k in ADVISORY_DEFAULTS)) throw new Error(`store-config: unknown advisory key "${k}"`);

const out = {
  configVersion: 0,
  apple: {
    version,
    copyright: `© ${new Date().getUTCFullYear()} ${studio.legalEntity}`,
    categories: [category],
    info: { [apple.locale ?? "en-US"]: info },
    advisory: { ...ADVISORY_DEFAULTS, ...(apple.advisory ?? {}) },
    release: { automaticRelease: true, phasedRelease: false, ...(apple.release ?? {}) },
    review: {
      firstName: apple.review.firstName, lastName: apple.review.lastName,
      email: apple.review.email ?? studio.publicEmail, phone: apple.review.phone,
      // [MR-REVIEW-LOGIN] with a demo account (apple.review.demoUsername) the Sign-In Information is kept by hand in App Store Connect:
      // ASC rejects a demo user without its password, and the password is never stored here — so the push leaves those fields alone.
      ...(apple.review.demoUsername ? {} : { demoRequired: false }),
      notes: limit("reviewNotes", listing.reviewNotes, 4000),
    },
  },
};
writeFileSync(join(root, "store.config.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`store.config.json written: ${venture.slug} ${version} · ${category} · ${keywords.length} keywords (${keywords.join(",").length}/100) · locale ${apple.locale ?? "en-US"}`);
