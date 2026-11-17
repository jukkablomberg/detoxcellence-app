import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { bySlug, useIndex } from "../../../src/lib/exposures";
import { pfasFromAnswers, waterOpen } from "../../../src/lib/pfas-home";
import { appendHistory, newestFirst, readHistory, type HistoryEntry } from "../../../src/lib/history";
import { openEntry, openRoom, openVermiculite, openWaterFilter } from "../../../src/lib/nav";
import { checkRoomPhoto, rowPhoto } from "../../../src/lib/photos";
import { indexRoomFor, QUESTIONS, ROOMS, scoreBand, scoreQuiz, type Result, type RoomKey } from "../../../src/lib/quiz";
import { DEFAULT_SETTINGS, plan, readSettings, refillReminder } from "../../../src/lib/reminders";
import { readDone, toggleDone } from "../../../src/lib/swaps-done";
import { hasSwap } from "../../../src/lib/score";
import { fonts, palettes, radius, space, type, useTheme, FIXED } from "../../../src/lib/theme";
import { Button, Screen } from "../../../src/ui/primitives";
import { Card, CardList, CardRow, Grid2, PhotoTile, ScoreDial, SectionTitle, Thumb, Tick, VerdictPill, useSurface } from "../../../src/ui/kit";
import { Question, Welcome } from "../../../src/ui/home-check";

/** [DX-MY-HOME] re-check cadence: the loop asks again four weeks after the latest check. */
const RECHECK_DAYS = 28;
const day = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" });

type Mode = { k: "home" } | { k: "quiz"; i: number; answers: number[] };

/**
 * MY HOME — [DX-ROUND-1117] the FatTonic/SnapStress round look (Jukka 11-17: "visually weak, too much text … verdict first,
 * rounded cards, real photos, clear navigation, one job per tab"). One job: your home's check and what to do next.
 * Verdict first (the house number as a dial in its band, the room to start with, change since the last check, the re-check
 * date) → this week's ONE swap (Detox Me's "I do this", DM-1: a tick) → the rooms as photo tiles with their own number and
 * swaps-done dots → the checks over time. The rest of the plan folds under "Next swaps".
 * The Home Check is the site's twelve questions scored by the site's rules (src/lib/quiz.ts, parity-tested) — unchanged;
 * the test now has a room photo per question, a "Why we ask" card, answer cards that move on by themselves, Back.
 * [DX-ROUND2-1117] My Exposure (Jukka 11-17): + "PFAS in your home" — the Index's PFAS rows the reader's own answers name
 * (src/lib/pfas-home.ts) and the filter check when they drink unfiltered/carbon/well water; Older house opens "Is this
 * vermiculite?"; the checks chart, the plan and Clear history moved to My Progress.
 */
export default function ScoreScreen() {
  const [mode, setMode] = useState<Mode>({ k: "home" });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const { list } = useIndex();
  const t = useTheme();
  const params = useLocalSearchParams<{ check?: string; t?: string }>();
  useEffect(() => { if (params.check === "1" && params.t) setMode({ k: "quiz", i: 0, answers: [] }); }, [params.check, params.t]);

  useFocusEffect(
    useCallback(() => {
      void readHistory().then((h) => setHistory(newestFirst(h)));
      void readDone().then(setDone);
      void readSettings().then(setSettings);
    }, []),
  );

  if (mode.k === "quiz") {
    return (
      <Question
        i={mode.i}
        onBack={() => setMode(mode.i === 0 ? { k: "home" } : { k: "quiz", i: mode.i - 1, answers: mode.answers.slice(0, -1) })}
        onCancel={() => setMode({ k: "home" })}
        onAnswer={async (ai) => {
          const answers = [...mode.answers, ai];
          if (answers.length < QUESTIONS.length) return setMode({ k: "quiz", i: mode.i + 1, answers });
          const r = scoreQuiz(answers);
          const next = await appendHistory({ at: Date.now(), pct: r.pct, driver: r.driver, answers });
          setHistory(newestFirst(next));
          setMode({ k: "home" });
          void refillReminder(); // the weekly swap now starts from this home's worst room
        }}
      />
    );
  }

  const start = () => setMode({ k: "quiz", i: 0, answers: [] });
  const latest: Result | null = history[0]?.answers?.length === QUESTIONS.length ? scoreQuiz(history[0].answers) : null;
  if (!latest) return <Welcome onStart={start} />;

  const prev = history[1]?.answers?.length === QUESTIONS.length ? scoreQuiz(history[1].answers) : null;
  const week = plan(list, latest.driver, settings, new Date(), done)[0]?.entry;
  const pfas = pfasFromAnswers(history[0].answers, bySlug);
  const water = waterOpen(history[0].answers);
  const tick = async (slug: string) => setDone(await toggleDone(slug));

  return (
    <Screen testID="score-home">
      <Verdict r={latest} at={history[0].at} delta={prev ? latest.pct - prev.pct : null} />

      {pfas.length ? (
        <>
          <SectionTitle right={<Text style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 30, color: t.ink }}>{pfas.length}</Text>}>PFAS in your home</SectionTitle>
          <CardList>
            {pfas.map((e) => (
              <CardRow key={e.slug} onPress={() => openEntry(e.slug)} testID={`pfas-${e.slug}`} label={`${e.name}, Detox Score ${e.score}`}>
                <Thumb photo={rowPhoto(e.slug)} score={e.score} band={e.band} size={48} />
                <Text style={[type.strong(15, t.ink), { flex: 1 }]} numberOfLines={2}>{e.name}</Text>
                <VerdictPill band={e.band} small />
              </CardRow>
            ))}
            {water ? (
              <CardRow onPress={openWaterFilter} testID="pfas-filter-check">
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: t.link, alignItems: "center", justifyContent: "center" }}>
                  <Text style={type.strong(20, t.onLink)}>?</Text>
                </View>
                <Text style={[type.strong(15, t.link), { flex: 1 }]}>Is my filter certified?</Text>
                <Text style={type.heading(18, t.muted)}>›</Text>
              </CardRow>
            ) : null}
          </CardList>
        </>
      ) : null}

      {week ? (
        <>
          <SectionTitle>This week</SectionTitle>
          <Card pad={space.m} testID="week-swap">
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.m }}>
              <Pressable onPress={() => openEntry(week.slug)} accessibilityRole="button" style={{ flex: 1, flexDirection: "row", gap: space.m, alignItems: "center" }} testID={`swap-${week.slug}`}>
                <Thumb photo={rowPhoto(week.slug)} score={week.score} band={week.band} size={64} />
                <SwapText swap={week.swap} name={week.name} done={done.includes(week.slug)} />
              </Pressable>
              <Tick on={done.includes(week.slug)} onPress={() => void tick(week.slug)} a11y={`Done: ${week.swap}`} testID={`done-${week.slug}`} />
            </View>
          </Card>
        </>
      ) : null}

      <SectionTitle>Your rooms</SectionTitle>
      <Grid2>
        {latest.report.map((row) => {
          const where = indexRoomFor(row.k);
          const rows = list.filter(hasSwap).filter((e) => (where.olderHome ? e.older_home === true : e.room === where.room));
          const of = Math.min(3, rows.length);
          return (
            <PhotoTile
              key={row.k}
              testID={`room-${row.k}`}
              photo={checkRoomPhoto(row.k)}
              title={ROOMS[row.k].label}
              figure={String(row.pct)}
              figureColor={palettes.light.band[scoreBand(row.pct)]}
              sub={row.bandLabel.split(" — ")[0]}
              dots={{ done: Math.min(of, rows.filter((e) => done.includes(e.slug)).length), of }}
              onPress={() => (row.k === "older" && row.band !== "fine" ? openVermiculite() : openRoom(where.room, where.olderHome))}
            />
          );
        })}
      </Grid2>

      <Button testID="start-quiz" title="Check again" kind="secondary" onPress={start} />
    </Screen>
  );
}

/** The verdict card: dial in the band colour, the room to start with, change since last time, the re-check date. */
function Verdict({ r, at, delta }: { r: Result; at: number; delta: number | null }) {
  const s = useSurface();
  const color = palettes.light.band[scoreBand(r.pct)];
  const head = r.driver === "balanced" ? "Nothing to worry about first" : `Start with the ${ROOMS[r.driver as RoomKey].label.toLowerCase()}`;
  return (
    <Card testID="result" style={{ gap: space.m }}>
      <Text style={type.label(s.t.muted)}>{`Your home · ${day(at)}`}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.l }}>
        <ScoreDial pct={r.pct} color={color} />
        <View style={{ flex: 1, gap: space.s }}>
          <Text style={type.heading(22, s.t.ink)}>{head}</Text>
          {delta != null ? (
            <View style={{ alignSelf: "flex-start", backgroundColor: delta >= 0 ? palettes.light.band.Minimal : palettes.light.band.High, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={type.strong(12, FIXED.onDark)}>{delta === 0 ? "Same as last time" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} since last check`}</Text>
            </View>
          ) : null}
          <Text style={type.body(13, s.t.muted)}>{`Re-check ${day(at + RECHECK_DAYS * 864e5)}`}</Text>
        </View>
      </View>
      {r.driver !== "balanced" ? (
        <View style={{ backgroundColor: s.sunk, borderRadius: 14, padding: space.m }}>
          <Text style={type.body(14, s.t.ink)}>{r.first}</Text>
        </View>
      ) : null}
    </Card>
  );
}

function SwapText({ swap, name, done }: { swap: string; name: string; done: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={[type.strong(16, t.ink), done ? { textDecorationLine: "line-through", color: t.muted } : null]} numberOfLines={3}>{swap}</Text>
      <Text style={type.body(13, t.muted)} numberOfLines={1}>{`Instead of ${name}`}</Text>
    </View>
  );
}
