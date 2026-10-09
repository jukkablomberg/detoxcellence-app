import venture from "../venture.json";
import { useStudioTheme } from "../src/lib/chrome";
import { getIndex } from "../src/lib/exposures";
import { openOutbound } from "../src/lib/outbound";
import { StudioAbout } from "../src/studio/StudioAbout";

const web = (path: string) => `https://${venture.domain}${path}`;

/**
 * About — design/APP-ABOUT-STANDARD.md: the venture's blocks (2–4) in its words; the studio's blocks (5–6) from the
 * kit, identical in every app. Reached from the header "i" on every tab root.
 */
export default function About() {
  const v = getIndex().doc.version;
  return (
    <StudioAbout
      theme={useStudioTheme()}
      slug={venture.slug}
      name="Detoxcellence"
      description="The Exposure Index of everyday products and habits — each with its Detox Score, the studies behind it and a cleaner swap — and the Exposure Score, on your phone."
      category="Information, not medical advice. Ratings are editorial; every source is shown."
      record={[
        { label: "Methodology", sub: `v${v} · how the Detox Score is built`, url: web("/methodology.html"), placement: "about-methodology" },
        { label: "Open data", sub: "CC BY 4.0 · JSON + CSV", url: web("/data/export/exposures.json"), placement: "about-data" },
      ]}
      help={[
        { label: "Support", url: web("/app/support"), placement: "about-support" },
        { label: "Privacy", url: web("/app/privacy"), placement: "about-privacy" },
        { label: venture.domain, url: web("/"), placement: "about-site" },
      ]}
      colophon="© 2026 Detoxcellence"
      open={openOutbound}
    />
  );
}
