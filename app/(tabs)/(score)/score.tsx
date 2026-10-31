import { useFocusEffect } from "expo-router";
import { openRoom } from "../../../src/lib/nav";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { appendHistory, clearHistory, newestFirst, readHistory, type HistoryEntry } from "../../../src/lib/history";
import { indexRoomFor, QUESTIONS, ROOMS, scoreBand, scoreQuiz, type Result, type RoomReport } from "../../../src/lib/quiz";
import { refillReminder } from "../../../src/lib/reminders";
import { palettes, radius, space, type, useTheme, FIXED } from "../../../src/lib/theme";
import { Body, Button, Display, Heading, Label, Screen, Tile } from "../../../src/ui/primitives";

type Mode = { k: "home" } | { k: "quiz"; i: number; answers: number[] } | { k: "result"; r: Result };

/**
 * The Home Check — the site's twelve house questions (src/data/quiz.json, generated from detoxcellence.com's quiz.js)
 * scored by the site's rules (src/lib/quiz.ts, parity-tested): one number for the house and a room-by-room report —
 * fine · worth a look · worry — each room opening its Index rows, worst first. Every result goes to the history on
 * this phone (native value 3). [HOME-REFOCUS] 2026-10-31 replaced the lifestyle Exposure Score.
 * [BC-APP-LESS-TEXT]: the question, its one-line sub, the answers; the result = number, title, "do this first", rooms.
 */
export default function ScoreScreen() {
  const t = useTheme();
  const [mode, setMode] = useState<Mode>({ k: "home" });
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      void readHistory().then((h) => setHistory(newestFirst(h)));
    }, []),
  );

  if (mode.k === "quiz") {
    const item = QUESTIONS[mode.i];
    return (
      <Screen testID="quiz">
        <View style={{ height: 6, backgroundColor: t.panel, borderRadius: radius.pill, overflow: "hidden" }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: QUESTIONS.length, now: mode.i }}>
          <View style={{ width: `${(mode.i / QUESTIONS.length) * 100}%`, height: 6, backgroundColor: t.link }} />
        </View>
        <Label>{mode.i + 1} / {QUESTIONS.length} · {ROOMS[item.dom].label}</Label>
        <Heading size={22}>{item.q}</Heading>
        <Body muted size={13}>{item.sub}</Body>
        <View style={{ gap: space.s }}>
          {item.answers.map((a, ai) => (
            <Pressable
              key={ai}
              testID={`answer-${ai}`}
              accessibilityRole="button"
              onPress={async () => {
                const answers = [...mode.answers, ai];
                if (answers.length < QUESTIONS.length) return setMode({ k: "quiz", i: mode.i + 1, answers });
                const r = scoreQuiz(answers);
                const list = await appendHistory({ at: Date.now(), pct: r.pct, driver: r.driver, answers });
                setHistory(newestFirst(list));
                setMode({ k: "result", r });
                void refillReminder(); // the weekly swap now starts from this home's worst room
              }}
              style={({ pressed }) => ({ backgroundColor: t.panel, borderRadius: radius.card, padding: space.l, minHeight: 52, justifyContent: "center", opacity: pressed ? 0.75 : 1 })}
            >
              <Text style={type.strong(15, t.ink)}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => setMode(mode.i === 0 ? { k: "home" } : { k: "quiz", i: mode.i - 1, answers: mode.answers.slice(0, -1) })} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={type.strong(15, t.link)}>{mode.i === 0 ? "Cancel" : "← Back"}</Text>
        </Pressable>
      </Screen>
    );
  }

  // The latest result: a fresh one, or the newest history entry re-scored from its answers (the report is derived, not stored).
  const latest: Result | null =
    mode.k === "result" ? mode.r : history[0] && history[0].answers?.length === QUESTIONS.length ? scoreQuiz(history[0].answers) : null;
  return (
    <Screen testID="score-home">
      {latest ? (
        <ResultCard r={latest} />
      ) : (
        <Tile>
          <Heading size={22}>Home Check</Heading>
          <Body muted size={13}>{QUESTIONS.length} questions about the house. Stays on this phone.</Body>
        </Tile>
      )}
      <Button testID="start-quiz" title={latest ? "Check again" : "Start"} onPress={() => setMode({ k: "quiz", i: 0, answers: [] })} kind={latest ? "secondary" : "primary"} />

      {history.length > 1 ? (
        <View style={{ gap: space.s }} testID="score-history">
          <Heading>History</Heading>
          {history.map((h, i) => {
            const prev = history[i + 1];
            const delta = prev ? h.pct - prev.pct : null;
            return (
              <View key={h.at} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: t.panel, borderRadius: radius.card, padding: space.m }}>
                <View style={{ gap: 2, flex: 1 }}>
                  <Text style={type.strong(15, t.ink)}>{h.driver === "balanced" ? "Nothing first" : ROOMS[h.driver as keyof typeof ROOMS]?.label ?? h.driver}</Text>
                  <Body muted size={13}>{new Date(h.at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}{delta !== null && delta !== 0 ? ` · ${delta > 0 ? "+" : ""}${delta}` : ""}</Body>
                </View>
                <Display size={32} color={palettes.light.band[scoreBand(h.pct)]}>{h.pct}</Display>
              </View>
            );
          })}
          <Pressable onPress={async () => { await clearHistory(); setHistory([]); setMode({ k: "home" }); }} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }} testID="clear-history">
            <Text style={type.strong(15, t.link)}>Clear history</Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

function ResultCard({ r }: { r: Result }) {
  const t = useTheme();
  const band = scoreBand(r.pct);
  return (
    <Tile testID="result">
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.l }}>
        <View style={{ backgroundColor: palettes.light.band[band], borderRadius: radius.card, paddingHorizontal: space.l, paddingTop: 6 }}>
          <Display size={64} color={FIXED.onDark}>{r.pct}</Display>
        </View>
        <Heading size={20} style={{ flex: 1 }}>{r.title}</Heading>
      </View>
      <View style={{ backgroundColor: t.ground, borderRadius: radius.card, padding: space.m, gap: 4 }}>
        <Text style={type.strong(15, t.ink)}>Do this first</Text>
        <Body>{r.first}</Body>
      </View>
      <View style={{ gap: space.s }} testID="room-report">
        {r.report.map((row) => <RoomRow key={row.k} row={row} />)}
      </View>
    </Tile>
  );
}

/** One room of the report: its number, its band, its name; a tap opens that room in the Index, worst first. */
function RoomRow({ row }: { row: RoomReport }) {
  const t = useTheme();
  const room = ROOMS[row.k];
  const where = indexRoomFor(row.k);
  const color = palettes.light.band[scoreBand(row.pct)];
  return (
    <Pressable
      testID={`room-${row.k}`}
      onPress={() => openRoom(where.room, where.olderHome)}
      accessibilityRole="button"
      accessibilityLabel={`${room.label} ${row.pct}, ${row.bandLabel}`}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.m, backgroundColor: t.ground, borderRadius: radius.card, padding: space.m, minHeight: 52, opacity: pressed ? 0.8 : 1 })}
    >
      <Text style={[type.strong(18, color), { width: 36, fontVariant: ["tabular-nums"] }]}>{row.pct}</Text>
      <Text style={[type.strong(15, t.ink), { flex: 1 }]}>{room.label}</Text>
      <Text style={type.body(13, row.band === "fine" ? t.muted : color)}>{row.bandLabel}</Text>
    </Pressable>
  );
}
