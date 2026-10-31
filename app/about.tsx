import { Text } from "react-native";
import venture from "../venture.json";
import { labelPhotoCredits } from "../modules/health-camera";
import { LENS } from "../src/lib/lens";
import { useStudioTheme } from "../src/lib/chrome";
import { getIndex } from "../src/lib/exposures";
import { openOutbound } from "../src/lib/outbound";
import { AboutSection, StudioAbout } from "../src/studio/StudioAbout";

const web = (path: string) => `https://${venture.domain}${path}`;

/**
 * About — design/APP-ABOUT-STANDARD.md: the venture's blocks (2–4) in its words; the studio's blocks (5–6) from the
 * kit, identical in every app. Reached from the header "i" on every tab root.
 */
export default function About() {
  const v = getIndex().doc.version;
  const theme = useStudioTheme();
  // The CC BY photos on the "Is it…" chips must be credited (scripts/check-label-photos.mjs) — one line each, nothing more.
  const credits = labelPhotoCredits.filter((c) => LENS[c.id]);
  const small = { fontFamily: theme.fonts.body, fontSize: 11, lineHeight: 16, color: theme.muted } as const;
  return (
    <StudioAbout
      theme={theme}
      details={
        <AboutSection theme={theme} title="Photo credits">
          {credits.map((c) => (
            <Text key={c.id} style={small}>{`${c.id.split(":")[1].replace(/-/g, " ")}: ${c.author}, ${c.licence}, ${c.url}`}</Text>
          ))}
        </AboutSection>
      }
      slug={venture.slug}
      name="Detoxcellence"
      description="The home exposure record — every material, product and habit in a house scored for avoidable exposure, PFAS first, sourced row by row — with the Home Check and the camera, on your phone."
      category="Information, not medical advice."
      record={[
        { label: "Methodology", sub: `v${v}`, url: web("/methodology.html"), placement: "about-methodology" },
        { label: "Open data", sub: "CC BY 4.0", url: web("/data/export/exposures.json"), placement: "about-data" },
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
