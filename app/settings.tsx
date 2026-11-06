import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { hourLabel } from "../src/lib/locale";
import { usePrefs } from "../src/lib/prefs";
import { DEFAULT_SETTINGS, readSettings, WEEKDAYS, type ReminderSettings } from "../src/lib/reminders";
import { space, type, useTheme, type SchemePref } from "../src/lib/theme";
import { Chip, Label, Screen, Tile } from "../src/ui/primitives";

const SCHEMES: { id: SchemePref; label: string }[] = [
  { id: "system", label: "System" },
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
];

/**
 * [DX-APP-SETTINGS-1104] APP-STANDARD § 8.5 (Jukka 11-04: the same About and Settings in every app, Detoxcellence
 * included). A pushed screen from About, never a modal. Scheme: System (default) · Dark · Light — repaints at once.
 * The weekly swap reminder stays where it is (it IS the Swaps tab); this row shows its state and opens it.
 */
export default function Settings() {
  const t = useTheme();
  const { prefs, setScheme } = usePrefs();
  const [r, setR] = useState<ReminderSettings>(DEFAULT_SETTINGS);
  useFocusEffect(useCallback(() => { void readSettings().then(setR); }, []));
  const when = `${WEEKDAYS[r.weekday - 1] ?? ""} · ${hourLabel(r.hour)}`; // critic 11-06: day + time when on
  return (
    <Screen testID="settings">
      <Label>Scheme</Label>
      <Tile>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s }} accessibilityRole="radiogroup" accessibilityLabel="Scheme">
          {SCHEMES.map((s) => (
            <Chip key={s.id} title={s.label} on={prefs.scheme === s.id} onPress={() => { if (prefs.scheme !== s.id) setScheme(s.id); }} testID={`scheme-${s.id}`} />
          ))}
        </View>
      </Tile>
      <Label style={{ marginTop: space.s }}>Reminder</Label>
      <Tile onPress={() => router.navigate("/swaps" as never)} label="Weekly swap reminder" testID="settings-reminder">
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.m }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={type.strong(16, t.ink)}>Weekly swap reminder</Text>
            <Text style={type.body(13, t.muted)}>{r.on ? `On · ${when}` : "Off"}</Text>
          </View>
          <Text style={type.strong(18, t.muted)} accessibilityElementsHidden>›</Text>
        </View>
      </Tile>
      {/* [DX-APP-CREDITS-1106] § 8.7: the record and the photo credits live one screen down, the last row here. */}
      <Tile onPress={() => router.push("/credits" as never)} label="Credits and data" testID="settings-credits" style={{ marginTop: space.s }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.m }}>
          <Text style={type.strong(16, t.ink)}>Credits & data</Text>
          <Text style={type.strong(18, t.muted)} accessibilityElementsHidden>›</Text>
        </View>
      </Tile>
    </Screen>
  );
}
