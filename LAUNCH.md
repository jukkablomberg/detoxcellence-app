# LAUNCH — Detoxcellence (`com.detoxcellence.app`)

> Copied from `projects/app-stores/NEW-APP-CHECKLIST.md` on 2026-10-09 (HEALTH-TRIO-DAY C1). Ticks carry evidence (L3).
> Status lines below the checklist are the launch record; the checklist text itself is the studio's and is not edited here.

## Record

- 2026-10-09 C1 — repo from the template lineage (MonitoringRoom 1.0 shell = repo-template + studio kit); `apps.json` detoxcellence `status: building`;
  EAS project `@jukkablomberg/detoxcellence` `a42833cd-c1e7-4ef4-a460-3f96ade31109`; three native features built and named (venture.json R4 GREEN);
  first-screen disclosure (R13 GREEN); `/app/privacy` + `/app/support` on detoxcellence.com (site `a796d90`); icon + adaptive layers +
  feature graphic derived from the site's mark (provisional — Jukka's word). Policy edges: Apple 1.4.1 health methodology · Play Health apps
  declaration; regulated-medical-device = No (to set in ASC at C3). Not yet: Firebase (no project), Play app + ASC record (§ 4 moment 2), builds (C3).
- 2026-10-09 C2 — Detox lens: engine = byte copy of FatTonic `c5a4022` (`check:camera-sync` GREEN, its red-proof behaved); camera permission
  string "Detoxcellence uses the camera to recognise everyday products on your phone. Photos are not stored or sent."; Scan first tab + room
  check; 84 Detox eval photos through the lens: right label in the 3 chips 77/84 (91.7 %); web export 31/31 checks; `/app/privacy` camera
  section live (site `80da532`). Phone-check list: `docs/scan-flow.md`.

> Every ✅ needs capability evidence (L3): a URL that returns 200 with the expected body, a build that
> installed on a device, a review status read from the console — never "configured".
> Jukka's clicks are marked **[J]**; everything else is agent work.

## 0. Seat the item (ROI, not enthusiasm)

- [ ] Item in `opportunities/backlog.md` with the schema fields, incl. `expect:` + `by:` (L12) — e.g. *"app live on both stores by <date>; ≥ N installs/28d by <date+28>"*.
- [x] *(10-09: exposure lookup offline · swap reminders · score history — R4 GREEN)* Native-value features named (≥ 3; Apple 4.2 rule in `README.md` § 7). If you cannot name three, it is not an app yet.
- [x] *(10-09: health — apple-1.4.1-health-methodology, play-health-apps-declaration; no accounts, no IAP)* Policy edge named: health (Apple 1.4.1 / Play Health apps declaration), money (Play Financial features), gambling-adjacent (stop → legal read), accounts (5.1.1(v) deletion), IAP (3.1.1).
- [x] *(10-09: status building, com.detoxcellence.app — R3 GREEN)* Row in `apps.json` (`status: building`, ids fixed): `bundleId`/`packageName` = `com.<venture>.app` (permanent).

## 1. Build

- [x] *(10-09: from the MR 1.0 instance of the template + studio kit; no RevenueCat/Firebase — none exist for this venture yet)* Repo `projects/<venture>/repo-app/` from `repo-template/` (Expo + EAS + RevenueCat + Firebase Analytics stream → the venture's GA4 property; `.gitignore` includes `_meta/project-template/repo.gitignore`).
- [ ] App identity: name ≤ 30, `com.<venture>.app`, semver `1.0.0`, EAS `autoIncrement` on.
- [ ] Icon: 1024×1024 master (no alpha) in `projects/<venture>/brand/assets/masters/`, exports per the 08-19 convention; Android adaptive layers (foreground / background / monochrome).
- [x] *(10-09: index 1.3.1 bundled, local weekly reminder, native tabs — app-render 14/14 with the site blocked)* Offline data set bundled; push registration with a real cadence; widget or native navigation — the three named features exist and are demonstrable.
- [x] *(10-09: Index tab + About + listing — R13 GREEN)* First-screen disclosure where relevant: "information, not medical/financial advice".
- [ ] Endorsement system (`projects/jukkablomberg/brand/ENDORSEMENT-SYSTEM.md`): static launch image = venture logo/background only (Apple HIG); ≤ 1 s in-app brand moment with the "Built by JukkaBlomberg.com" lockup bottom-centre, tinted in the venture's colour; Shell per **`design/APP-STANDARD.md`** (native tabs with an icon + label on every tab, the header "i", the no-jump brand moment) and the venture `DESIGN.md` § App; About screen per **`design/APP-ABOUT-STANDARD.md`** — built on the studio kit (`projects/app-stores/studio-kit/`, once `[BR-APP-ABOUT-KIT]` ships), `about-standard-check.mjs` GREEN before submission.
- [ ] Analytics: app stream created in the venture's GA4 property (Firebase project linked) — event names mirror the site's (`quiz_start`, `score_view`…) so BIE reads them unchanged.
- [ ] `eas build --profile production` for both platforms succeeds; `eas submit` lands the iOS build in TestFlight and the Android build in Play **internal testing** (Play: org account → no 12-tester rule).
- [ ] Installed and used on a real iPhone + Android device (screenshots of the three features saved to the launch record).

## 2. Site pages (Rule 12 — visible copy is budgeted)

- [ ] Store badges on the venture site (hero or footer) + iOS Smart App Banner meta tag (`apple-itunes-app`, add once the App Store id exists). **No `/app` landing page** (README § 6b).
- [ ] `https://<venture>.com/app/privacy` — app privacy policy: publisher line names **the venture, not the Oy** ("Published by <Venture> (<venture>.com), Helsinki, Finland" — Jukka 2026-10-01, the [BC-NO-NORTHPOINT] pattern made portfolio rule; the Oy stays in `store/studio.json` for the consoles only), data collected (device identifiers, push token, analytics events, purchase receipts via RevenueCat), purposes, retention, third parties (Apple/Google, RevenueCat, Firebase), rights + contact (hello@jukkablomberg.com), how to delete data (uninstall / in-app reset), date.
- [ ] `https://<venture>.com/app/support` — intro block from `STORE-PROFILE.md` § 2, FAQ (install, notifications, purchases/restore, data deletion), contact.
- [ ] **[J]** exact copy + `content-budget.json` raise for the two pages approved (needs-jukka row; the DE will not publish a breach).
- [ ] Both URLs return 200 (curl, not a diff — L3), and the privacy URL is the one entered in both consoles. **Order matters:** the page must be live BEFORE the URL is saved in Play Console — the publishing quick check fetches it at save time and caches a "page not found" verdict that then blocks "Submit for review" until a re-save (SaunaHash 2026-10-01: URL saved 17:1x, page deployed ~18:xx, check stale at 19:2x). If it happens anyway: re-saving the URL does not clear it — Publishing overview → View issues → View details → tick "I have fixed issues with my privacy policy page" → Mark as fixed, after a curl 200 with a Googlebot UA.

## 3. Google Play listing (Play Console → app → Grow → Store presence / Publish → App content)

- [ ] Create app **[J or agent with go-ahead]**: name, default language, app/game, free/paid, declarations (Developer Program Policies, US export laws).
- [ ] Main store listing: name ≤ 30 · short description ≤ 80 · full description ≤ 4,000 (ends with the endorsement close) · icon 512×512 · feature graphic 1024×500 · phone screenshots 2–8 · 7-inch + 10-inch tablet screenshots if tablets are targeted · category + tags · contact email hello@jukkablomberg.com · website (venture domain) · privacy policy URL.
- [ ] App content: privacy policy URL · Ads (none) · App access (all features available / test instructions) · Content rating (IARC questionnaire) **[J]** · Target audience & content · News app (no) · COVID (no) · Data safety (from the SDK list above) · Government (no) · **Financial features** (declare; "none" for information-only) · **Health apps** (declare for FatTonic/SnapStress/Detoxcellence class). · **Advertising ID** (`/app-content/ad-id-declaration`; "No" for every studio app — not on the dashboard task list, but blocks every production rollout targeting Android 13+; found 2026-10-01 on UsePhysics).
- [ ] Android developer verification: package name shows as registered on the Play Console home page (banner clear).
- [ ] Countries: all, or EU + the venture's markets; pricing (free / IAP products created in Monetize → Products, mirrored in RevenueCat).
- [ ] Internal testing → **Promote to production** **[J]** (first time; automation is a later written decision): Create release → Next → **Start rollout** → Publishing overview → **Send for review** — three clicks, and "saved" is not "sent". `apps.json` `status: review` is written ONLY after the agent reads the Publishing overview / Home list showing **In review** (Rule 9; 10-01 BoomCellar + FatTonic were recorded `review` on chat say-so and were a Draft and a nothing). → review → **LIVE**: store URL returns the listing; `apps.json` `status: live`, `android` link filled.

## 4. Apple listing (App Store Connect → Apps → +)

- [ ] New app record: platform iOS, name, primary language, bundle ID (registered in Certificates, Identifiers & Profiles — EAS does this), SKU = package name.
- [ ] App information: name · subtitle ≤ 30 · category (+ secondary) · privacy policy URL · **content rights** · age rating questionnaire **[J]**.
- [ ] App information → **Regulated Medical Device declaration** (NEW 2026-10-06, Apple: required for EU/EEA, UK, US distribution; surfaced on FatTonic as "Unable to Add for Review" — a Health & Fitness app, probably any health/medical category). Studio apps: *No*. Not covered by EAS Metadata; set it in the ASC web UI before Add for Review.
- [ ] Pricing & availability: free / tier; all territories or the venture's markets; **EU DSA trader flag on the app** (account-level declaration done in README § 5 Sitting 3).
- [ ] App Privacy: data types, linked-to-user / used-for-tracking answers (Firebase Analytics + RevenueCat + push token → typical: Identifiers, Usage data, Purchases; no tracking) — same truth as the privacy page.
- [ ] Version page: 6.9-inch iPhone screenshots (+ 13-inch iPad if supported) · promotional text ≤ 170 · description ≤ 4,000 (ends with the endorsement close) · keywords ≤ 100 · support URL · marketing URL · copyright · version · build (select the TestFlight build) · **review notes** (boilerplate in `STORE-PROFILE.md` § 2 + the three native features named + contact) · export compliance (standard encryption → usually "no" special) · IAP products attached (created in Features → In-App Purchases, mirrored in RevenueCat).
- [ ] TestFlight internal group tested on device.
- [ ] **Submit for review** **[J]** → Waiting for review → In review → **Ready for Sale**: App Store URL returns the listing; `apps.json` `status: live`, `ios` link filled.

## 5. After live (day 0–7)

- [ ] `apps.json` updated → `ventures.json` entry gains `apps.{ios,android}` → JB site rebuild → the venture card on `/ventures` shows both badges (`/apps` alias → `/ventures`); venture site shows both badges + the Smart App Banner.
- [ ] BIE: app stream visible in the venture's GA4 property; store metrics pulled (App Store Connect API / Play Developer Reporting API) as an additive `metrics-collector.py` key — file the `[BB-xx]` if not already seated.
- [ ] `opportunities/shipped.md` line + `_meta/predictions.md` row graded on its date.
- [ ] Rejection handling: fix → same-day resubmit with review notes that name the change; log the reason in the launch record (the second app's checklist inherits it).

## 6. Red-proof (L16) — `listing-readiness` script (build it with app #1, reuse forever)

Fails RED when: `/app/privacy` or `/app/support` is not 200 · icon has alpha or wrong size · feature graphic missing · a screenshot set is empty · `apps.json` ids differ from the build config · description lacks the endorsement close ("Built by JukkaBlomberg.com…") · a declaration in the checklist is unticked. Plant one breach and watch it go red before trusting it.

## After the store page is live (added 2026-10-07)
- [ ] **Site store flag flipped in the same session** as `apps.json` → `live` (README § 6c; steps in `aso/SITE-TO-STORE-2026-10-07.md`): badge + install-referrer on the venture site's home and item template, live re-fetch shows `data-store-badges`.


## Store surfaces (added 2026-10-08)
- [ ] Icon: square master for the app (rounded-square hosts) — no studio mark inside it (ENDORSEMENT § 2.3); adaptive foreground inside Android's 66/108 safe zone (`design/README.md` § 1.18)
- [ ] Screenshots as a SYSTEM under `design/STORE-SURFACES-STANDARD.md` § 2.3 (one frame, captions inside the image, first two frames sell); feature graphic re-cut from the og master
- [ ] Add the app to `design/store-surfaces.json` when its Play page is live, so `store_surfaces_check.py` watches it

## First run, paywall and ratings (added 2026-10-08 — Next Vision / Glority teardown, `projects/fattonic/research/NEXT-VISION-TEARDOWN-2026-10-08.md`)
- [ ] **First run = the venture's own quiz or test** when the site has one (FatTonic Metabolic Score · SnapStress Snap Stress Test · Detoxcellence Exposure Score): scoring byte-identical with the site, ≤ 10 questions, skippable → a personal result → the app's core action. Never a "personalising…" loader with nothing behind it; never invented proof numbers.
- [ ] **Scope guide before the first camera use** (camera apps): ✓ / ✗ example photos of what the lens reads and what it does not — the answer to "it gave a different answer from another angle" before it happens.
- [ ] **Store review prompt** (StoreKit / Play In-App Review) only after the first successful core action (a resolved scan, a finished test) — never during onboarding, never behind a custom pre-filter survey.
- [ ] **Paywall (only apps with a paid tier, behind the Paid Apps Agreement + Play payments profile):** a visible "Not now" at the same weight as the price · trial reminder on by default · annual price also shown per month · each option says what it renews into · never re-shown at launch (re-offer = a dismissible banner) · the venture's open record stays free; premium = AI calls and personal plans. Prices and product creation = Jukka's click.
- [ ] **Store listing order:** the first two screenshots say the question the user has in hand and the verdict the app gives (e.g. "Point at any food" → "Is it good for you?"), then one feature per frame; the proof line is ours and true ("Every number sourced · No ads · Photos stay on your phone"), never a user count we cannot show.
- [ ] **Shareable result card** where the app has a result: the verdict, the source line, the venture URL; rendered on the phone, shared through the OS sheet.
- [ ] **Push permission** asked in context after the first core action (a follow, a call, a saved place), never at launch; per-type toggles in Settings (e.g. MR: moved ≥10 pts · resolved · new question · level change) with push / email / in-app per type (Kalshi pattern, prediction-markets teardown 2026-10-08, `projects/monitoringroom/research/PREDICTION-MARKETS-TEARDOWN-2026-10-08.md` PMT-7). No reward for opting in.
