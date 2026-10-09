import { useFocusEffect } from "expo-router";
import { openEntry } from "../../../src/lib/nav";
import { useCallback, useState } from "react";
import { Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useIndex } from "../../../src/lib/exposures";
import { latestDriver } from "../../../src/lib/history";
import { PROFILES, type Driver } from "../../../src/lib/quiz";
import { DEFAULT_SETTINGS, plan, readSettings, requestPermission, saveSettings, scheduledCount, WEEKDAYS, type ReminderSettings } from "../../../src/lib/reminders";
import { radius, space, type, useTheme } from "../../../src/lib/theme";
import { BandPill, Body, Chip, Heading, Label, Screen, Tile } from "../../../src/ui/primitives";

/**
 * Swaps — the weekly swap reminder (native value 2) and the swaps it will send, in order. The plan starts from the
 * area the latest Exposure Score points to; each row opens its entry page. Permission is asked only when the
 * reader switches the reminder on.
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
      setNote("Notifications are off for Detoxcellence. Allow them in your phone's Settings, then switch the reminder on again.");
      next = { ...next, on: false };
    }
    setS(next);
    setHeld(await saveSettings(next));
  };

  const upcoming = plan(list, driver, s);
  const hours = [7, 8, 9, 10, 12, 17, 18, 19, 20];

  return (
    <Screen testID="swaps">
      <Tile>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.m }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Heading>Weekly swap reminder</Heading>
            <Body muted size={13}>One swap from the Index, once a week.</Body>
          </View>
          <Switch testID="reminder-switch" value={s.on} onValueChange={(on) => void apply({ ...s, on })} trackColor={{ true: t.link, false: t.panel2 }} accessibilityLabel="Weekly swap reminder" />
        </View>
        {note ? <Body size={13}>{note}</Body> : null}
        <Label>Day</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
          {WEEKDAYS.map((d, i) => (
            <Chip key={d} title={d.slice(0, 3)} on={s.weekday === i + 1} onPress={() => void apply({ ...s, weekday: i + 1 })} testID={`day-${i + 1}`} />
          ))}
        </ScrollView>
        <Label>Time</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
          {hours.map((h) => (
            <Chip key={h} title={`${String(h).padStart(2, "0")}:00`} on={s.hour === h} onPress={() => void apply({ ...s, hour: h })} testID={`hour-${h}`} />
          ))}
        </ScrollView>
        <Body muted size={13} style={{ fontVariant: ["tabular-nums"] }}>
          {s.on ? `On — ${WEEKDAYS[s.weekday - 1]}s at ${String(s.hour).padStart(2, "0")}:00. ${Platform.OS === "web" ? "" : `${held} reminder${held === 1 ? "" : "s"} scheduled on this phone.`}` : "Off. Nothing is scheduled."}
        </Body>
      </Tile>

      <View style={{ gap: space.s }}>
        <Heading>Your next swaps</Heading>
        <Body muted size={13}>
          {driver ? `Starting with ${PROFILES[driver].title.replace(/^The /, "the ")} (your latest Exposure Score), highest burden first.` : "Highest burden first. Take the Exposure Score and the list starts with your own area."}
        </Body>
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
    </Screen>
  );
}
