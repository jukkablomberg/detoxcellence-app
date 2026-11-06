import { useFocusEffect } from "expo-router";
import { openEntry } from "../../../src/lib/nav";
import { useCallback, useState } from "react";
import { Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useIndex } from "../../../src/lib/exposures";
import { latestDriver } from "../../../src/lib/history";
import { ROOMS, type Driver } from "../../../src/lib/quiz";
import { DEFAULT_SETTINGS, plan, readSettings, requestPermission, saveSettings, scheduledCount, WEEKDAYS, type ReminderSettings } from "../../../src/lib/reminders";
import { hourLabel } from "../../../src/lib/locale";
import { radius, space, type, useTheme } from "../../../src/lib/theme";
import { BandPill, Body, Chip, Heading, Label, Screen, Tile } from "../../../src/ui/primitives";

/**
 * Swaps — the weekly swap reminder (native value 2) and the swaps it will send, in order. The plan starts from the
 * room the latest Home Check points to; each row opens its entry page. Permission is asked only when the reader
 * switches the reminder on. [BC-APP-LESS-TEXT] 10-31: the switch, day, time, the rows — no explainers.
 * [DX-APP-PLAN-1106] Jukka 11-06: "I don't understand what the 'Swaps' tab is supposed to be." Reshaped, nothing removed:
 * the tab is "Plan", one line says what it gives ("One safer swap a week, your worst room first."), the swaps come
 * first and the reminder (the phone-only part) sits under them. Times follow the phone's 12/24 h clock (§ 8.6).
 */
export default function SwapsScreen() {
  const t = useTheme();
  const { list } = useIndex();
  const [s, setS] = useState<ReminderSettings>(DEFAULT_SETTINGS);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [held, setHeld] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        setS(await readSettings());
        setDriver(await latestDriver());
        setHeld(await scheduledCount());
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

  const upcoming = plan(list, driver, s);
  const hours = [7, 8, 9, 10, 12, 17, 18, 19, 20];
  // [APP-DETEMPLATE 2026-10-21] the chip rows scroll edge to edge of the tile, so a chip is never cut by the tile's
  // inner padding ("12:0C" in the design critique) — the row reads as scrollable, not broken.

  return (
    <Screen testID="swaps">
      <View style={{ gap: space.s }}>
        <Body size={15}>One safer swap a week, your worst room first.</Body>
        {driver && driver !== "balanced" ? <Body muted size={13}>{ROOMS[driver].label} first</Body> : null}
        {upcoming.map(({ date, entry }) => (
          <Pressable
            key={date.toISOString()}
            testID={`swap-${entry.slug}`}
            onPress={() => openEntry(entry.slug)}
            accessibilityRole="button"
            style={({ pressed }) => ({ backgroundColor: t.panel, borderRadius: radius.card, padding: space.l, gap: 6, opacity: pressed ? 0.8 : 1 })}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.m }}>
              <Label>{date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</Label>
              <BandPill band={entry.band} score={entry.score} />
            </View>
            <Text style={type.strong(16, t.ink)}>{entry.name}</Text>
            <Body size={14}>{entry.swap}</Body>
          </Pressable>
        ))}
      </View>

      <Tile>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.m }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Heading>Remind me weekly</Heading>
          </View>
          <Switch testID="reminder-switch" value={s.on} onValueChange={(on) => void apply({ ...s, on })} trackColor={{ true: t.link, false: t.track }} accessibilityLabel="Weekly swap reminder" />
        </View>
        {note ? <Body size={13}>{note}</Body> : null}
        <Label>Day</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.l }} contentContainerStyle={{ gap: space.s, paddingHorizontal: space.l }}>
          {WEEKDAYS.map((d, i) => (
            <Chip key={d} title={d.slice(0, 3)} on={s.weekday === i + 1} onPress={() => void apply({ ...s, weekday: i + 1 })} testID={`day-${i + 1}`} />
          ))}
        </ScrollView>
        <Label>Time</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.l }} contentContainerStyle={{ gap: space.s, paddingHorizontal: space.l }}>
          {hours.map((h) => (
            <Chip key={h} title={hourLabel(h)} on={s.hour === h} onPress={() => void apply({ ...s, hour: h })} testID={`hour-${h}`} />
          ))}
        </ScrollView>
        {s.on && Platform.OS !== "web" ? <Body muted size={13} style={{ fontVariant: ["tabular-nums"] }}>{held} scheduled</Body> : null}
      </Tile>
    </Screen>
  );
}
