import { Stack } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import data from "../../../src/data/pfas-filter.json";
import { bySlug, useIndex } from "../../../src/lib/exposures";
import { openEntry } from "../../../src/lib/nav";
import { indexRoomPhoto } from "../../../src/lib/photos";
import { space, type } from "../../../src/lib/theme";
import { Body, Screen } from "../../../src/ui/primitives";
import { Card, ScoreFigure, VerdictPill, useSurface } from "../../../src/ui/kit";
import { Image } from "react-native";

/**
 * IS MY FILTER CERTIFIED FOR PFAS? — [DX-ROUND2-1117] reader 1's first job (READERS.md: PFAS at home, water first), CB
 * benchmark fix 2. The site's guide (/guides/check-water-filter-certified-pfas.html, EPA + NSF + Herkert 2020) as a
 * three-tap check: what you drink → its Exposure Index row (verdict first) and the standard to look for → the three
 * checks. Every sentence is the guide's (src/data/pfas-filter.json); the app adds none. A shared route under every tab.
 */
type FilterType = (typeof data.types)[number];

export default function WaterFilterScreen() {
  useIndex();
  const s = useSurface();
  const [pick, setPick] = useState<FilterType | null>(null);
  return (
    <Screen testID="water-filter">
      <Stack.Screen options={{ title: "PFAS in water" }} />
      <Image source={indexRoomPhoto("Water")} style={{ width: "100%", height: 130, borderRadius: 20 }} resizeMode="cover" accessibilityIgnoresInvertColors />
      <Text accessibilityRole="header" style={type.heading(24, s.t.ink)}>Is my filter certified for PFAS?</Text>
      <View style={{ gap: space.s }}>
        {data.types.map((ft) => {
          const on = pick?.id === ft.id;
          return (
            <Pressable key={ft.id} testID={`filter-${ft.id}`} onPress={() => setPick(ft)} accessibilityRole="button" accessibilityState={{ selected: on }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: on ? s.t.link : pressed ? s.sunk : s.card, borderRadius: 20, padding: 16, minHeight: 56 })}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? s.t.onLink : s.t.border, backgroundColor: on ? s.t.onLink : "transparent" }} />
              <Text style={[type.strong(16, on ? s.t.onLink : s.t.ink), { flex: 1 }]}>{ft.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {pick ? <Answer ft={pick} /> : null}
    </Screen>
  );
}

function Answer({ ft }: { ft: FilterType }) {
  const s = useSurface();
  const row = ft.row ? bySlug(ft.row) : undefined;
  return (
    <>
      {row ? (
        <Card onPress={() => openEntry(row.slug)} testID="filter-row" label={row.name}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.m }}>
            <View style={{ flex: 1, gap: space.s }}>
              <Text style={type.strong(16, s.t.ink)}>{row.name}</Text>
              <VerdictPill band={row.band} />
            </View>
            <ScoreFigure score={row.score} band={row.band} />
          </View>
        </Card>
      ) : null}
      <Card testID="filter-answer">
        {ft.standard ? (
          <>
            <Text style={type.label(s.t.muted)}>Look for</Text>
            <Text style={type.heading(26, s.t.ink)}>{ft.standard}</Text>
          </>
        ) : null}
        <Body size={14}>{ft.study}</Body>
      </Card>
      {ft.standard ? (
        <Card>
          {data.steps.map((st, i) => (
            <View key={i} style={{ flexDirection: "row", gap: space.s }}>
              <Text style={[type.strong(14, s.t.link), { width: 18 }]}>{i + 1}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.strong(15, s.t.ink)}>{st.title}</Text>
                <Body size={14}>{st.text}</Body>
              </View>
            </View>
          ))}
        </Card>
      ) : null}
      <Text style={type.body(12, s.t.muted)}>{data.where}</Text>
    </>
  );
}
