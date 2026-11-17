import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { bySlug, EVIDENCE, hasSwap, INPUTS, isPFAS, useIndex, type Entry } from "../../../../src/lib/exposures";
import { sisterLine } from "../../../../modules/health-camera/sister-lines";
import { space, type, useTheme } from "../../../../src/lib/theme";
import { openVermiculite, openWaterFilter, scanHome } from "../../../../src/lib/nav";
import { Body, Button, Screen } from "../../../../src/ui/primitives";
import { Card, Expander, ScoreFigure, StatTiles, VerdictPill, ZoneBar } from "../../../../src/ui/kit";
import { rowPhoto } from "../../../../src/lib/photos";
import { readDone, toggleDone } from "../../../../src/lib/swaps-done";

/**
 * One entry page per Index row (docs/scan-flow.md rule 3 — reached the same way from everywhere: the Index, the
 * Home Check's rooms, a reminder, a scan or the room check). [BC-APP-NAV-EVERYWHERE] 2026-10-31: a SHARED route under
 * every tab group (app/(tabs)/(scan,index,score,swaps)/exposure/[slug].tsx), so it opens inside the current tab's
 * stack and the tab bar stays; it ends with Scan another (rule 4).
 * [BC-APP-LESS-TEXT] 10-31: score, band, swap, the guidance steps when the record has them, the note, the studies
 * (one line each) and the sources — no arithmetic table, no "how the score is built" prose, no disclaimer line.
 * [DX-APP-INAPP-1106] § 8.7 (Jukka 11-06: "we don't want the user to go to external website"): studies, sources and
 * the sister line print as plain text (DOI/PMID selectable); the detoxcellence.com ↗ line left — the site is in
 * Settings › Credits & data.
 * [DX-ROUND-1117] verdict first (FatTonic's food page): the row's photo, its name, the band pill and the Detox Score; the
 * zone bar 0–100 in the site's five bands; the three inputs as tiles; the evidence grade + study count (EWG teardown EH-1:
 * exposure, not just hazard); the swap with a Done tick (Detox Me DM-1); the note, studies and sources folded under
 * "Why this score" (closed by default).
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
  const photo = rowPhoto(e.slug);
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => void readDone().then(setDone), []);
  const isDone = done.includes(e.slug);
  const n = (e.studies ?? []).length;
  return (
    <Screen testID={`entry-${e.slug}`}>
      <Stack.Screen options={{ title: e.room }} />
      {photo != null ? <Image source={photo} style={{ width: "100%", height: 190, borderRadius: 20 }} resizeMode="cover" accessibilityIgnoresInvertColors testID="entry-photo" /> : null}

      <Card testID="entry-score" style={{ gap: space.m }}>
        <View style={{ flexDirection: "row", gap: space.m, alignItems: "flex-start" }}>
          <View style={{ flex: 1, gap: space.s }}>
            <Text accessibilityRole="header" style={type.heading(22, t.ink)}>{e.name}</Text>
            <VerdictPill band={e.band} />
          </View>
          <ScoreFigure score={e.score} band={e.band} />
        </View>
        <ZoneBar score={e.score} band={e.band} />
        <StatTiles items={INPUTS.map(([k, label]) => ({ label: { hazard: "Hazard", exposure: "Exposure", persistence: "Persistence" }[k], value: `${e[k]}/10` }))} />
        <Text style={type.body(13, t.muted)}>{`${EVIDENCE[e.evidence][0].toUpperCase()}${EVIDENCE[e.evidence].slice(1)} evidence${n ? ` · ${n} ${n === 1 ? "study" : "studies"}` : ""}`}</Text>
      </Card>

      {hasSwap(e) ? (
        <Card testID="entry-swap" style={{ backgroundColor: t.link }}>
          <Text style={type.label(t.onLink)}>Swap to</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.m }}>
            <Text style={[type.strong(17, t.onLink), { flex: 1 }]}>{e.swap}</Text>
            <Pressable testID={`done-${e.slug}`} onPress={async () => setDone(await toggleDone(e.slug))} accessibilityRole="checkbox" accessibilityState={{ checked: isDone }} accessibilityLabel={`Done: ${e.swap}`} hitSlop={10} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: t.onLink, backgroundColor: isDone ? t.onLink : "transparent", alignItems: "center", justifyContent: "center" }}>
              {isDone ? <Text style={type.strong(15, t.link)}>✓</Text> : null}
            </Pressable>
          </View>
        </Card>
      ) : null}

      {e.guidance?.steps?.length ? (
        <Card testID="entry-guidance">
          <Text style={type.label(t.muted)}>{e.guidance.title}</Text>
          {e.guidance.steps.map((st, i) => (
            <View key={i} style={{ flexDirection: "row", gap: space.s }}>
              <Text style={[type.strong(14, t.link), { width: 18 }]}>{i + 1}</Text>
              <Body size={14} style={{ flex: 1 }}>{st}</Body>
            </View>
          ))}
        </Card>
      ) : null}

      {e.slug === "vermiculite-attic-insulation-asbestos" ? (
        <Button title="Compare with EPA's photos" onPress={openVermiculite} testID="entry-vermiculite" />
      ) : e.room === "Water" && isPFAS(e) ? (
        <Button title="Is my filter certified?" onPress={openWaterFilter} testID="entry-filter" />
      ) : null}

      {sister ? (
        <View testID="sister-line"><Body muted size={14}>{sister.text}</Body></View>
      ) : null}

      <Expander title="Why this score" testID="entry-why">
        <Body size={14}>{e.note}</Body>
        {(e.studies ?? []).map((st, i) => (
          <View key={i} style={{ gap: 2 }}>
            <Body size={14}>{st.claim}</Body>
            <Text style={type.body(12, t.muted)} selectable>{st.doi ? `doi:${st.doi}` : `PMID ${st.pmid}`}</Text>
          </View>
        ))}
        {(e.sources ?? []).map((so, i) => (
          <Text key={`s${i}`} style={type.body(13, t.muted)}>{so.name}</Text>
        ))}
      </Expander>

      <Button title="Scan another" kind="secondary" onPress={() => scanHome(true)} testID="scan-another" />
    </Screen>
  );
}
