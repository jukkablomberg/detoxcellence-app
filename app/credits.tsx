import { Pressable, Text, View } from "react-native";
import venture from "../venture.json";
import { labelPhotoCredits } from "../modules/health-camera";
import { getIndex } from "../src/lib/exposures";
import { LENS } from "../src/lib/lens";
import { openOutbound } from "../src/lib/outbound";
import { space, type, useTheme } from "../src/lib/theme";
import { Body, Label, Screen, Tile } from "../src/ui/primitives";

const web = (path: string) => `https://${venture.domain}${path}`;
const short = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "");

/**
 * Credits & data — [DX-APP-CREDITS-1106] APP-STANDARD § 8.7 (Jukka 11-06: "Why is there some photo credits and open
 * data & records in about section?"). The obligations moved off About, never deleted: the CC BY credits for the
 * "Is it…" chip photos (scripts/check-label-photos.mjs), the methodology version, the open data and the site.
 * Reached from the last row of Settings — the one screen in the app whose job is to point at the record.
 */
export default function Credits() {
  const t = useTheme();
  const v = getIndex().doc.version;
  const credits = labelPhotoCredits.filter((c) => LENS[c.id]);
  const rows = [
    { label: "Methodology", sub: `v${v}`, url: web("/methodology.html"), placement: "credits-methodology" },
    { label: "Open data", sub: "CC BY 4.0", url: web("/data/export/exposures.json"), placement: "credits-data" },
    { label: venture.domain, sub: "The full Index", url: web("/"), placement: "credits-site" },
  ];
  return (
    <Screen testID="credits">
      <Label>The record</Label>
      <Tile>
        {rows.map((r, i) => (
          <Pressable key={r.label} onPress={() => void openOutbound(r.url, r.placement)} accessibilityRole="link" testID={`credits-${i}`} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.m, paddingVertical: 6, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={type.strong(16, t.ink)}>{r.label}</Text>
              <Text style={type.body(13, t.muted)}>{r.sub}</Text>
            </View>
            <Text style={type.strong(16, t.muted)} accessibilityElementsHidden>↗</Text>
          </Pressable>
        ))}
      </Tile>
      {credits.length > 0 ? (
        <>
          <Label style={{ marginTop: space.s }}>Photo credits</Label>
          <Tile>
            {credits.map((c) => (
              <Body key={c.id} muted size={13}>{`${c.id.split(":")[1].replace(/-/g, " ")}: ${c.author}, ${c.licence}, ${short(c.url)}`}</Body>
            ))}
          </Tile>
        </>
      ) : null}
    </Screen>
  );
}
