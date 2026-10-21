import { useFocusEffect } from "expo-router";
import { openAisle } from "../../../src/lib/nav";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { appendHistory, clearHistory, newestFirst, readHistory, type HistoryEntry } from "../../../src/lib/history";
import { categoriesFor, NEXT, PROFILES, QUESTIONS, scoreBand, scoreQuiz, type Result } from "../../../src/lib/quiz";
import { refillReminder } from "../../../src/lib/reminders";
import { palettes, radius, space, type, useTheme, FIXED } from "../../../src/lib/theme";
import { Body, Button, Display, Heading, Label, Screen, Tile } from "../../../src/ui/primitives";

type Mode = { k: "home" } | { k: "quiz"; i: number; answers: number[] } | { k: "result"; r: Result };

/**
 * The Exposure Score — the site's questionnaire (src/data/quiz.json, generated from detoxcellence.com's quiz.js)
 * scored by the site's rules (src/lib/quiz.ts, parity-tested). Each result goes to the score history on this phone
 * (native value 3). The result's next step opens the Index on that profile's area, highest burden first.
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
        <Label>Question {mode.i + 1} of {QUESTIONS.length}</Label>
        <Heading size={22}>{item.q}</Heading>
        <Body muted>{item.sub}</Body>
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
                void refillReminder(); // the weekly swap now starts from this profile
              }}
              style={({ pressed }) => ({ backgroundColor: t.panel, borderRadius: radius.card, padding: space.l, minHeight: 52, justifyContent: "center", opacity: pressed ? 0.75 : 1 })}
            >
              <Text style={type.strong(15, t.ink)}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => setMode(mode.i === 0 ? { k: "home" } : { k: "quiz", i: mode.i - 1, answers: mode.answers.slice(0, -1) })} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={type.strong(15, t.link)}>{mode.i === 0 ? "Cancel" : "← Previous question"}</Text>
        </Pressable>
      </Screen>
    );
  }

  const latest = mode.k === "result" ? mode.r : history[0] ? { pct: history[0].pct, driver: history[0].driver, profile: PROFILES[history[0].driver] } : null;
  return (
    <Screen testID="score-home">
      {latest ? (
        <ResultCard r={latest} fresh={mode.k === "result"} />
      ) : (
        <Tile>
          <Heading size={22}>Your Exposure Score</Heading>
          <Body>{QUESTIONS.length} quick questions about water, air, cooking, personal care, cleaning and food. You get a score out of 100 — higher means lower avoidable exposure — and the one change that cuts yours most.</Body>
          <Body muted size={13}>Educational rating, not a clinical measurement. Your answers stay on this phone.</Body>
        </Tile>
      )}
      <Button testID="start-quiz" title={latest ? "Retake the Exposure Score" : "Start the Exposure Score"} onPress={() => setMode({ k: "quiz", i: 0, answers: [] })} kind={latest ? "secondary" : "primary"} />

      {history.length ? (
        <View style={{ gap: space.s }} testID="score-history">
          <Heading>Your history</Heading>
          {history.map((h, i) => {
            const prev = history[i + 1];
            const delta = prev ? h.pct - prev.pct : null;
            return (
              <View key={h.at} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: t.panel, borderRadius: radius.card, padding: space.m }}>
                <View style={{ gap: 2, flex: 1 }}>
                  <Text style={type.strong(15, t.ink)}>{PROFILES[h.driver]?.title ?? h.driver}</Text>
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

function ResultCard({ r, fresh }: { r: Result; fresh: boolean }) {
  const t = useTheme();
  const band = scoreBand(r.pct);
  const next = NEXT[r.driver];
  const cats = categoriesFor(r.driver);
  return (
    <Tile testID="result">
      <Label>{fresh ? "Your Exposure Score" : "Your latest Exposure Score"}</Label>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.l }}>
        <View style={{ backgroundColor: palettes.light.band[band], borderRadius: radius.card, paddingHorizontal: space.l, paddingTop: 6 }}>
          <Display size={64} color={FIXED.onDark}>{r.pct}</Display>
        </View>
        <Body muted size={13} style={{ flex: 1 }}>Out of 100. Lower avoidable exposure = higher.</Body>
      </View>
      <Heading size={20}>{r.profile.title}</Heading>
      <Body>{r.profile.blurb}</Body>
      <View style={{ backgroundColor: t.ground, borderRadius: radius.card, padding: space.m, gap: 4 }}>
        <Text style={type.strong(15, t.ink)}>Your #1 lever right now</Text>
        <Body>{r.profile.fix}</Body>
      </View>
      <Button testID="result-next" title={`${next.label} →`} onPress={() => openAisle(cats[0] ?? null)} />
    </Tile>
  );
}
