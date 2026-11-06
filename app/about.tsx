import { router } from "expo-router";
import listing from "../store/listing.json";
import venture from "../venture.json";
import { useStudioTheme } from "../src/lib/chrome";
import { openOutbound } from "../src/lib/outbound";
import { StudioAbout } from "../src/studio/StudioAbout";
import { usePrefs } from "../src/lib/prefs";

const web = (path: string) => `https://${venture.domain}${path}`;

/**
 * About — design/APP-ABOUT-STANDARD.md: the venture's blocks (2–4) in its words; the studio's blocks (5–6) from the
 * kit, identical in every app. Reached from the header "i" on every tab root.
 * [DX-APP-ABOUT-1104] APP-STANDARD § 8.5 (Jukka 11-04): VINCAP's About — two lines on what it is, "Built and kept by
 * Jukka Blomberg, Helsinki.", the policy line as the category line, Settings as the first help row (pushed, ›).
 * [DX-APP-ABOUT-1106] § 8.7 (Jukka 11-06: "Why is there some photo credits and open data & records in about section?"):
 * About = what it is + who keeps it + the policy line, then Settings · Privacy · Support. Photo credits, methodology,
 * open data and the site moved to Credits & data (app/credits.tsx), the last row of Settings — kept, CC BY.
 */
export default function About() {
  const theme = useStudioTheme();
  const { prefs } = usePrefs();
  const scheme = prefs.scheme === "system" ? "System" : prefs.scheme === "dark" ? "Dark" : "Light";
  return (
    <StudioAbout
      crossPromo={false}
      theme={theme}
      slug={venture.slug}
      name="Detoxcellence"
      description={"Every material, product and habit in a home scored for avoidable exposure, PFAS first, sourced row by row.\n\nBuilt and kept by Jukka Blomberg, Helsinki."}
      category={listing.firstScreenDisclosure}
      help={[
        { label: "Settings", sub: `Scheme: ${scheme}`, url: "/settings", placement: "about-settings" },
        { label: "Privacy", url: web("/app/privacy"), placement: "about-privacy" },
        { label: "Support", url: web("/app/support"), placement: "about-support" },
      ]}
      colophon="© 2026 Detoxcellence"
      open={(url, placement) => (url.startsWith("/") ? router.push(url as never) : openOutbound(url, placement))}
    />
  );
}
