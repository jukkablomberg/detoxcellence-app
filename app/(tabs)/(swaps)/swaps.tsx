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
import { radius, space, type, useTheme } from "../../../src/lib/theme";
import { BandPill, Body, Chip, Label, Screen, Tile } from "../../../src/ui/primitives";

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

  const upcoming = plan(list, driver, s, new Date(), done);
  const doneRows = list.filter((e) => done.includes(e.slug));
  const hours = [7, 8, 9, 10, 12, 17, 18, 19, 20];
  const fromCheck = driver !== null;

  return (
    <Screen testID="swaps">
      <View style={{ gap: space.xs }}>
        <Body size={15}>Your highest-exposure items — one safer swap a week. Do it by Sunday, then tick it off.</Body>
        <Pressable testID="plan-source" onPress={() => router.navigate("/score" as never)} accessibilityRole="button" style={{ minHeight: 32, justifyContent: "center" }}>
          <Text style={type.body(13, t.link)}>{fromCheck ? "Built from your Home Check · Redo ›" : "Starter plan — take the Home Check to put your worst rooms first ›"}</Text>
        </Pressable>
      </View>

      <Tile>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.m }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={type.strong(16, t.ink)}>Remind me weekly</Text>
            {s.on ? <Body muted size={13}>{`${WEEKDAYS[s.weekday - 1]} · ${hourLabel(s.hour)}`}</Body> : null}
          </View>
          <Switch testID="reminder-switch" value={s.on} onValueChange={(on) => void apply({ ...s, on })} trackColor={{ true: t.link, false: t.track }} accessibilityLabel="Weekly swap reminder" />
        </View>
        {note ? <Body size={13}>{note}</Body> : null}
        {s.on ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.l }} contentContainerStyle={{ gap: space.s, paddingHorizontal: space.l }}>
              {WEEKDAYS.map((d, i) => (
                <Chip key={d} title={d.slice(0, 3)} on={s.weekday === i + 1} onPress={() => void apply({ ...s, weekday: i + 1 })} testID={`day-${i + 1}`} />
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.l }} contentContainerStyle={{ gap: space.s, paddingHorizontal: space.l }}>
              {hours.map((h) => (
                <Chip key={h} title={hourLabel(h)} on={s.hour === h} onPress={() => void apply({ ...s, hour: h })} testID={`hour-${h}`} />
              ))}
            </ScrollView>
            {Platform.OS !== "web" ? <Body muted size={13} style={{ fontVariant: ["tabular-nums"] }}>{held} scheduled</Body> : null}
          </>
        ) : null}
      </Tile>

      <View style={{ gap: space.s }}>
        {upcoming.map(({ date, entry }) => (
          <SwapCard key={date.toISOString()} entry={entry} kicker={`${date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · Swap`} done={false} onTick={() => void tick(entry.slug)} />
        ))}
        {doneRows.map((entry) => (
          <SwapCard key={`done-${entry.slug}`} entry={entry} kicker="Done · Swap" done onTick={() => void tick(entry.slug)} />
        ))}
      </View>
    </Screen>
  );
}

type CardEntry = { slug: string; name: string; swap: string; room: string; older_home?: boolean; band: Parameters<typeof BandPill>[0]["band"]; score: number };

function SwapCard({ entry, kicker, done, onTick }: { entry: CardEntry; kicker: string; done: boolean; onTick: () => void }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.panel, borderRadius: radius.card, padding: space.l, gap: 6, opacity: done ? 0.55 : 1, flexDirection: "row", alignItems: "flex-start" }}>
      <Pressable testID={`swap-${entry.slug}`} onPress={() => openEntry(entry.slug)} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, gap: 4, opacity: pressed ? 0.8 : 1 })}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.m }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Label>{kicker}</Label>
            <Text style={type.body(12, t.muted)}>{entry.older_home ? `${entry.room} · Older homes` : entry.room}</Text>
          </View>
          <BandPill band={entry.band} score={entry.score} />
        </View>
        <Text style={[type.strong(16, t.ink), done ? { textDecorationLine: "line-through" } : null]}>{entry.swap}</Text>
        <Body muted size={13}>{`Instead of ${entry.name}`}</Body>
      </Pressable>
      <Pressable testID={`done-${entry.slug}`} onPress={onTick} accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={`Done: ${entry.swap}`} hitSlop={8} style={{ marginLeft: space.m, marginTop: 2, width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: done ? t.link : t.muted, backgroundColor: done ? t.link : "transparent", alignItems: "center", justifyContent: "center" }}>
        {done ? <Text style={type.strong(15, t.onLink)}>✓</Text> : null}
      </Pressable>
    </View>
  );
}
