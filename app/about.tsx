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
  const credits = labelPhotoCredits.filter((c) => LENS[c.id]);
  const p = { fontFamily: theme.fonts.body, fontSize: 15, lineHeight: 22, color: theme.ink } as const;
  const small = { fontFamily: theme.fonts.body, fontSize: 11, lineHeight: 16, color: theme.muted } as const;
  return (
    <StudioAbout
      theme={theme}
      details={
        <AboutSection theme={theme} title="How Scan works">
          <Text style={p}>
            Scan uses an image model on your phone (Google SigLIP 2, Apache-2.0) to name the three things a photo looks most like;
            you choose the right one, and it opens that Exposure Index entry. The room check lists what one photo may show,
            highest burden first. The photo is deleted as soon as it is read: nothing is stored or sent. It is a recogniser,
            not a judge — when it is unsure, search the Index.
          </Text>
          <Text style={p}>
            The picture on each "Is it…" choice is an open-licence photo of that thing (public domain or CC0, unless credited
            here): it shows what the camera means, it is not your photo.
          </Text>
          {credits.map((c) => (
            <Text key={c.id} style={small}>{`${c.id.split(":")[1].replace(/-/g, " ")}: photo ${c.author}, ${c.licence}, ${c.url}`}</Text>
          ))}
        </AboutSection>
      }
      slug={venture.slug}
      name="Detoxcellence"
      description="Point the camera at a pan, a container, a candle or a bottle and see its Exposure Index entry — its Detox Score, the studies behind it and a cleaner swap. Plus the Exposure Score, on your phone."
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
