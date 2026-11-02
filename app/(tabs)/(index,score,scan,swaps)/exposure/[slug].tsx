import { Stack, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { bySlug, entryUrl, EVIDENCE, hasSwap, INPUTS, studyUrl, useIndex, type Entry } from "../../../../src/lib/exposures";
import { openOutbound } from "../../../../src/lib/outbound";
import { sisterLine } from "../../../../modules/health-camera/sister-lines";
import { space, type, useTheme } from "../../../../src/lib/theme";
import { scanHome } from "../../../../src/lib/nav";
import { BandPill, Body, Button, Display, Heading, Label, Screen, Tile } from "../../../../src/ui/primitives";

/**
 * One entry page per Index row (docs/scan-flow.md rule 3 — reached the same way from everywhere: the Index, the
 * Home Check's rooms, a reminder, a scan or the room check). [BC-APP-NAV-EVERYWHERE] 2026-10-31: a SHARED route under
 * every tab group (app/(tabs)/(scan,index,score,swaps)/exposure/[slug].tsx), so it opens inside the current tab's
 * stack and the tab bar stays; it ends with Scan another (rule 4).
 * [BC-APP-LESS-TEXT] 10-31: score, band, swap, the guidance steps when the record has them, the note, the studies
 * (one line each) and the sources — no arithmetic table, no "how the score is built" prose, no disclaimer line.
 */
export default function ExposureScreen() {
  useIndex();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const e = slug ? bySlug(slug) : undefined;
  if (!e) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Not found" }} />
        <Body muted>—</Body>
      </Screen>
    );
  }
  return <EntryPage e={e} />;
}

function EntryPage({ e }: { e: Entry }) {
  const t = useTheme();
  const sister = sisterLine("detoxcellence", e.slug); // [HT-SISTER-LINES] the one sister app that reads the same thing
  return (
    <Screen testID={`entry-${e.slug}`}>
      <Stack.Screen options={{ title: e.category }} />
      <View style={{ gap: space.s }}>
        <Label>{e.room}</Label>
        <Heading size={26}>{e.name}</Heading>
      </View>

      <Tile testID="entry-score">
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space.m }}>
          <Display size={64} color={t.band[e.band]}>{e.score}</Display>
          <View style={{ paddingBottom: 10, gap: 4 }}>
            <Label>Detox Score</Label>
            <BandPill band={e.band} />
          </View>
        </View>
        <Body muted size={13}>Evidence {EVIDENCE[e.evidence]}</Body>
      </Tile>

      {sister ? (
        <Pressable testID="sister-line" onPress={() => openOutbound(sister.url, "entry-sister")} accessibilityRole="link" style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={type.body(15, t.link)}>{sister.text} ↗</Text>
        </Pressable>
      ) : null}

      {hasSwap(e) ? (
        <Tile testID="entry-swap" style={{ backgroundColor: t.link }}>
          <Text style={type.label(t.onLink)}>Swap</Text>
          <Text style={type.strong(17, t.onLink)}>{e.swap}</Text>
        </Tile>
      ) : null}

      {e.guidance?.steps?.length ? (
        <Tile testID="entry-guidance">
          <Label>{e.guidance.title}</Label>
          {e.guidance.steps.map((st, i) => (
            <View key={i} style={{ flexDirection: "row", gap: space.s }}>
              <Text style={[type.strong(14, t.muted), { width: 18 }]}>{i + 1}</Text>
              <Body size={14} style={{ flex: 1 }}>{st}</Body>
            </View>
          ))}
        </Tile>
      ) : null}

      <Body>{e.note}</Body>

      <Tile>
        {INPUTS.map(([k, label]) => (
          <Line key={k} left={label} right={`${e[k]}/10`} />
        ))}
      </Tile>

      {(e.studies ?? []).length ? (
        <View style={{ gap: space.s }}>
          <Heading>Studies</Heading>
          {(e.studies ?? []).map((s, i) => {
            const url = studyUrl(s);
            return (
              <Pressable key={i} disabled={!url} onPress={() => url && openOutbound(url, "entry-study")} accessibilityRole="link">
                <Body size={14}>{s.claim}</Body>
                <Text style={type.body(12, t.link)}>{s.doi ? `doi:${s.doi}` : `PMID ${s.pmid}`} ↗</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {e.sources?.length ? (
        <View style={{ gap: space.s }}>
          <Heading>Sources</Heading>
          {e.sources.map((s, i) => (
            <Pressable key={i} onPress={() => openOutbound(s.url, "entry-source")} accessibilityRole="link">
              <Text style={type.body(14, t.link)}>{s.name} ↗</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable onPress={() => openOutbound(entryUrl(e.slug), "entry-site")} accessibilityRole="link" style={{ minHeight: 44, justifyContent: "center" }}>
        <Text style={type.strong(15, t.link)}>detoxcellence.com ↗</Text>
      </Pressable>
      <Button title="Scan another" onPress={() => scanHome(true)} testID="scan-another" />
    </Screen>
  );
}

function Line({ left, right, strong }: { left: string; right: string; strong?: boolean }) {
  const t = useTheme();
  const st = strong ? type.strong(15, t.ink) : type.body(15, t.ink);
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.m }}>
      <Text style={[st, { flex: 1 }]}>{left}</Text>
      <Text style={[st, { fontVariant: ["tabular-nums"] }]}>{right}</Text>
    </View>
  );
}
