import { Text, View } from "react-native";
import type { HistoryEntry } from "../lib/history";
import { QUESTIONS, scoreBand, scoreQuiz } from "../lib/quiz";
import { palettes, space, type } from "../lib/theme";
import { Card, SectionTitle, useSurface } from "./kit";

/** [DX-ROUND2-1117] My Progress parts (moved from My home, round 1). */
const day = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** The checks over time: one bar per check, newest on the right. */
export function Checks({ history }: { history: HistoryEntry[] }) {
  const s = useSurface();
  const last = [...history].slice(0, 6).reverse();
  return (
    <>
      <SectionTitle>Your checks</SectionTitle>
      <Card testID="score-history">
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space.m, height: 132 }}>
          {last.map((h) => {
            // the number the check gave, re-scored from its answers (the report is derived, never stored)
            const pct = h.answers?.length === QUESTIONS.length ? scoreQuiz(h.answers).pct : h.pct;
            return (
            <View key={h.at} style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <Text style={[type.strong(13, s.t.ink), { fontVariant: ["tabular-nums"] }]}>{pct}</Text>
              <View style={{ width: "70%", height: Math.max(6, pct), backgroundColor: palettes.light.band[scoreBand(pct)], borderRadius: 6 }} />
              <Text style={type.body(11, s.t.muted)}>{day(h.at)}</Text>
            </View>
            );
          })}
        </View>
      </Card>
    </>
  );
}
