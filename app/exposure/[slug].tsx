import { Stack, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { bySlug, entryUrl, EVIDENCE, hasSwap, INPUTS, studyUrl, useIndex, type Entry } from "../../src/lib/exposures";
import { openOutbound } from "../../src/lib/outbound";
import { space, type, useTheme } from "../../src/lib/theme";
import { BandPill, Body, Display, Heading, Label, Screen, Tile } from "../../src/ui/primitives";

/**
 * One entry page per Index row (docs/scan-flow.md rule 3 — reached the same way from everywhere: the Index, the
 * Score's next step, a reminder, and from C2 a scan). Pushed on the root stack with the platform back.
 * Everything here is the site's own entry page in app form: score, band and verb, the score arithmetic, the swap,
 * the note, the studies behind each input (or "unsourced input" — never silence), sources, evidence strength.
 */
export default function ExposureScreen() {
  useIndex();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const e = slug ? bySlug(slug) : undefined;
  if (!e) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Not found" }} />
        <Body>This entry is not in the Exposure Index on this phone.</Body>
      </Screen>
    );
  }
  return <EntryPage e={e} />;
}

function EntryPage({ e }: { e: Entry }) {
  const t = useTheme();
  const raw = 100 - e.hazard * 4.6 - e.exposure * 3.4 - e.persistence * 2.6;
  return (
    <Screen testID={`entry-${e.slug}`}>
      <Stack.Screen options={{ title: e.category }} />
      <View style={{ gap: space.s }}>
        <Label>{e.category}</Label>
        <Heading size={26}>{e.name}</Heading>
        <Body muted>{e.context}</Body>
      </View>

      <Tile testID="entry-score">
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space.m }}>
          <Display size={64} color={t.band[e.band]}>{e.score}</Display>
          <View style={{ paddingBottom: 10, gap: 4 }}>
            <Label>Detox Score</Label>
            <BandPill band={e.band} />
          </View>
        </View>
        <Body>{e.name} {e.verb}.</Body>
        <Body muted size={13}>Higher means lower avoidable burden. Evidence strength: {EVIDENCE[e.evidence]}.</Body>
      </Tile>

      {hasSwap(e) ? (
        <Tile testID="entry-swap" style={{ backgroundColor: t.link }}>
          <Text style={type.label(t.onLink)}>Cleaner swap</Text>
          <Text style={type.strong(17, t.onLink)}>{e.swap}</Text>
        </Tile>
      ) : null}

      <Body>{e.note}</Body>

      <View style={{ gap: space.s }}>
        <Heading>How the score is built</Heading>
        <Tile>
          <Line left="Start" right="100" />
          {INPUTS.map(([k, label, w]) => (
            <Line key={k} left={`${label} ${e[k]} × ${w}`} right={`−${fmt1(e[k] * w)}`} />
          ))}
          <Line left={raw < 1 || raw > 100 ? "Detox Score (kept within 1–100)" : "Detox Score, rounded"} right={String(e.score)} strong />
        </Tile>
        <Body muted size={13}>The three ratings (0–10) are editorial; the studies below are what each one rests on.</Body>
      </View>

      <View style={{ gap: space.s }}>
        <Heading>Evidence behind each rating</Heading>
        {INPUTS.map(([k, label]) => {
          const studies = (e.studies ?? []).filter((s) => s.input === k);
          return (
            <Tile key={k}>
              <Label>{label} · {e[k]}/10</Label>
              {studies.length ? (
                studies.map((s, i) => {
                  const url = studyUrl(s);
                  return (
                    <Pressable key={i} disabled={!url} onPress={() => url && openOutbound(url, "entry-study")} accessibilityRole="link">
                      <Body size={14}>{s.claim}</Body>
                      <Text style={type.body(12, t.link)}>{s.doi ? `doi:${s.doi}` : `PMID ${s.pmid}`} · {s.locator} · read {s.accessed}</Text>
                    </Pressable>
                  );
                })
              ) : (
                <Body muted size={14}>Unsourced input — no study is cited for this rating yet.</Body>
              )}
            </Tile>
          );
        })}
      </View>

      {e.sources?.length ? (
        <View style={{ gap: space.s }}>
          <Heading>Sources</Heading>
          {e.sources.map((s, i) => (
            <Pressable key={i} onPress={() => openOutbound(s.url, "entry-source")} accessibilityRole="link">
              <Text style={type.body(14, t.link)}>{s.name}</Text>
              <Body muted size={12}>opened {s.retrieved}</Body>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable onPress={() => openOutbound(entryUrl(e.slug), "entry-site")} accessibilityRole="link" style={{ minHeight: 44, justifyContent: "center" }}>
        <Text style={type.strong(15, t.link)}>This entry on detoxcellence.com ↗</Text>
      </Pressable>
      <Body muted size={12}>Information, not medical advice. Detoxcellence Exposure Index, CC BY 4.0.</Body>
    </Screen>
  );
}

const fmt1 = (n: number) => (Math.round(n * 10) / 10).toString();

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
