import { Image, Pressable, Text, View } from "react-native";
import { HOME_PHOTO, checkRoomPhoto } from "../lib/photos";
import { QUESTIONS, ROOMS } from "../lib/quiz";
import { fonts, space, type } from "../lib/theme";
import { Button, Screen } from "./primitives";
import { GhostPill, useAutoAdvance, useSurface } from "./kit";

/**
 * [DX-ROUND-1117] The two full-screen states of My home that are screens of their own: the welcome before the first
 * check, and one Home Check question (FatTonic's test look: room photo, "Why we ask", answer cards that move on by
 * themselves, Back, segmented progress). word-budget: welcome 16 · question 7 app-voice words.
 */
/** Before the first check: one photo, one question, one button. */
export function Welcome({ onStart }: { onStart: () => void }) {
  const s = useSurface();
  return (
    <Screen testID="score-welcome">
      <View style={{ backgroundColor: s.card, borderRadius: 24, overflow: "hidden" }}>
        <Image source={HOME_PHOTO} style={{ width: "100%", height: 220 }} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View style={{ padding: space.l, gap: space.m }}>
          <Text style={[type.display(40, s.t.ink), { textTransform: "uppercase" }]}>What in your home is worth worrying about?</Text>
          <Button testID="start-quiz" title="Check your home · 3 min" onPress={onStart} />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: space.m }}>
        {["Check", "Swap", "Re-check"].map((w, i) => (
          <View key={w} style={{ flex: 1, backgroundColor: s.card, borderRadius: 20, padding: space.m, gap: 2 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 30, lineHeight: 32, color: s.t.link }}>{i + 1}</Text>
            <Text style={type.strong(15, s.t.ink)}>{w}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}


/** One Home Check question: room photo, the question, "Why we ask", answer cards that move on by themselves. */
export function Question({ i, onAnswer, onBack, onCancel }: { i: number; onAnswer: (ai: number) => void; onBack: () => void; onCancel: () => void }) {
  const s = useSurface();
  const q = QUESTIONS[i];
  const { picked, pick } = useAutoAdvance(i, onAnswer);
  // The site's sub-line can carry a link (<a>…</a>) to its own page; the app shows the sentence, not the link (§ 8.7).
  const why = q.sub.replace(/<a [^>]*>.*?<\/a>/g, "").replace(/<[^>]+>/g, "").trim();
  return (
    <Screen testID="quiz">
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 44 }}>
        {i > 0 ? <GhostPill title="‹ Back" onPress={onBack} testID="quiz-back" /> : <View />}
        <GhostPill title="Not now" onPress={onCancel} testID="quiz-close" />
      </View>
      <View style={{ flexDirection: "row", gap: 4 }} accessibilityLabel={`Question ${i + 1} of ${QUESTIONS.length}`}>
        {QUESTIONS.map((_, k) => <View key={k} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: k <= i ? s.t.link : s.sunk }} />)}
      </View>
      <Image source={checkRoomPhoto(q.dom)} style={{ width: "100%", height: 150, borderRadius: 20 }} resizeMode="cover" accessibilityIgnoresInvertColors />
      <Text style={type.label(s.t.muted)}>{`${i + 1} of ${QUESTIONS.length} · ${ROOMS[q.dom].label}`}</Text>
      <Text accessibilityRole="header" style={type.heading(24, s.t.ink)}>{q.q}</Text>
      {why ? (
        <View style={{ backgroundColor: s.sunk, borderRadius: 14, padding: space.m }}>
          <Text style={type.body(14, s.t.ink2)}><Text style={{ fontFamily: fonts.heading }}>Why we ask · </Text>{why}</Text>
        </View>
      ) : null}
      <View style={{ gap: space.s }}>
        {q.answers.map((a, ai) => {
          const on = picked === ai;
          return (
            <Pressable
              key={ai}
              testID={`answer-${ai}`}
              onPress={() => pick(ai)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: on ? s.t.link : pressed ? s.sunk : s.card, borderRadius: 20, paddingVertical: 16, paddingHorizontal: 16, minHeight: 60 })}
            >
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? s.t.onLink : s.t.border, backgroundColor: on ? s.t.onLink : "transparent", alignItems: "center", justifyContent: "center" }}>
                {on ? <Text style={type.strong(13, s.t.link)}>✓</Text> : null}
              </View>
              <Text style={[type.strong(16, on ? s.t.onLink : s.t.ink), { flex: 1 }]}>{a.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
