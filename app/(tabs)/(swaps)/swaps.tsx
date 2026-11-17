import { router, useFocusEffect } from "expo-router";
import { openEntry } from "../../../src/lib/nav";
import { useCallback, useState } from "react";
import { Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useIndex } from "../../../src/lib/exposures";
import { latestDriver } from "../../../src/lib/history";
import { type Driver } from "../../../src/lib/quiz";
import { readDone, toggleDone } from "../../../src/lib/swaps-done";
import { DEFAULT_SETTINGS, plan, readSettings, requestPermission, saveSettings, scheduledCount, WEEKDAYS, type ReminderSettings } from "../../../src/lib/reminders";
import { hourLabel } from "../../../src/lib/locale";
import { space, type, useTheme } from "../../../src/lib/theme";
import { Body, Chip, Screen } from "../../../src/ui/primitives";
import { Thumb, Tick } from "../../../src/ui/kit";
import { rowPhoto } from "../../../src/lib/photos";
import type { BandLabel } from "../../../src/lib/exposures";

/**
 * Swaps — the weekly swap reminder (native value 2) and the swaps it will send, in order. The plan starts from the
 * room the latest Home Check points to; each row opens its entry page. Permission is asked only when the reader
 * switches the reminder on. [BC-APP-LESS-TEXT] 10-31: the switch, day, time, the rows — no explainers.
 * [DX-APP-PLAN-1106] Jukka 11-06: "I don't understand what the 'Swaps' tab is supposed to be." Reshaped, nothing removed:
 * the tab is "Plan", one line says what it gives ("One safer swap a week, your worst room first."), the swaps come
 * first and the reminder (the phone-only part) sits under them. Times follow the phone's 12/24 h clock (§ 8.6).
 * Critic 11-06 (SHIP-WITH-FIXES): each card leads with the swap itself ("<date> · SWAP", room caption, the better
 * choice in bold, "Instead of <item>" muted); truly worst-first; a Done tick per card (src/lib/swaps-done.ts) — done
 * cards sink, muted; one provenance line (Home Check · Redo, or Starter plan); the reminder is a compact row right
 * under the opener, day/time chips only while it is on.
 */
export default function SwapsScreen() {
  return (
    <Screen testID="swaps">
      <PlanSection />
    </Screen>
  );
}

/** [DX-MY-HOME] 2026-11-06: the Plan body, also drawn inside My home. [DX-ROUND-1117] in the round kit: one card of rows
 *  (photo or score tile · date · the swap · Instead of · a tick), the reminder as the card's first row. `skipFirst`: My home
 *  already shows this week's swap on its own card, so the folded list starts at next week. */
export function PlanSection({ embedded = false, skipFirst = false }: { embedded?: boolean; skipFirst?: boolean }) {
  const t = useTheme();
  const { list } = useIndex();
  const [s, setS] = useState<ReminderSettings>(DEFAULT_SETTINGS);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [held, setHeld] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        setS(await readSettings());
        setDriver(await latestDriver());
        setHeld(await scheduledCount());
        setDone(await readDone());
      })();
    }, []),
  );

  const apply = async (next: ReminderSettings) => {
    setNote(null);
    if (next.on && !s.on && Platform.OS !== "web" && !(await requestPermission())) {
      setNote("Notifications are off in the phone's Settings.");
      next = { ...next, on: false };
    }
    setS(next);
    setHeld(await saveSettings(next));
  };

  const tick = async (slug: string) => {
    setDone(await toggleDone(slug));
    if (s.on) setHeld(await saveSettings(s)); // the schedule drops (or regains) the ticked swap
  };

  const upcoming = plan(list, driver, s, new Date(), done).slice(skipFirst ? 1 : 0);
  const doneRows = list.filter((e) => done.includes(e.slug));
  const hours = [7, 8, 9, 10, 12, 17, 18, 19, 20];
  const fromCheck = driver !== null;

  return (
    <>
      {embedded ? null : <View style={{ gap: space.xs }}>
        <Body size={15}>One safer swap a week, worst first.</Body>
        <Pressable testID="plan-source" onPress={() => router.navigate("/" as never)} accessibilityRole="button" style={{ minHeight: 32, justifyContent: "center" }}>
          <Text style={type.body(13, t.link)}>{fromCheck ? "From your Home Check ›" : "Take the Home Check ›"}</Text>
        </Pressable>
      </View>}

      <View style={{ gap: space.s }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.m, minHeight: 44 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={type.strong(15, t.ink)}>Remind me weekly</Text>
            {s.on ? <Body muted size={13}>{`${WEEKDAYS[s.weekday - 1]} · ${hourLabel(s.hour)}${Platform.OS !== "web" ? ` · ${held} scheduled` : ""}`}</Body> : null}
          </View>
          <Switch testID="reminder-switch" value={s.on} onValueChange={(on) => void apply({ ...s, on })} trackColor={{ true: t.link, false: t.track }} accessibilityLabel="Weekly swap reminder" />
        </View>
        {note ? <Body size={13}>{note}</Body> : null}
        {s.on ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
              {WEEKDAYS.map((d, i) => (
                <Chip key={d} title={d.slice(0, 3)} on={s.weekday === i + 1} onPress={() => void apply({ ...s, weekday: i + 1 })} testID={`day-${i + 1}`} />
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
              {hours.map((h) => (
                <Chip key={h} title={hourLabel(h)} on={s.hour === h} onPress={() => void apply({ ...s, hour: h })} testID={`hour-${h}`} />
              ))}
            </ScrollView>
          </>
        ) : null}
      </View>

      <View style={{ gap: space.m }}>
        {upcoming.map(({ date, entry }) => (
          <SwapRow key={date.toISOString()} entry={entry} kicker={date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} done={false} onTick={() => void tick(entry.slug)} />
        ))}
        {doneRows.map((entry) => (
          <SwapRow key={`done-${entry.slug}`} entry={entry} kicker="Done" done onTick={() => void tick(entry.slug)} />
        ))}
      </View>
    </>
  );
}

type CardEntry = { slug: string; name: string; swap: string; room: string; older_home?: boolean; band: BandLabel; score: number };

function SwapRow({ entry, kicker, done, onTick }: { entry: CardEntry; kicker: string; done: boolean; onTick: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.m, opacity: done ? 0.55 : 1 }}>
      <Pressable testID={`swap-${entry.slug}`} onPress={() => openEntry(entry.slug)} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, flexDirection: "row", gap: space.m, alignItems: "center", opacity: pressed ? 0.8 : 1 })}>
        <Thumb photo={rowPhoto(entry.slug)} score={entry.score} band={entry.band} size={48} />
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={type.label(t.muted)}>{kicker}</Text>
          <Text style={[type.strong(15, t.ink), done ? { textDecorationLine: "line-through" } : null]} numberOfLines={2}>{entry.swap}</Text>
          <Text style={type.body(12, t.muted)} numberOfLines={1}>{`Instead of ${entry.name}`}</Text>
        </View>
      </Pressable>
      <Tick on={done} onPress={onTick} a11y={`Done: ${entry.swap}`} testID={`done-${entry.slug}`} />
    </View>
  );
}
