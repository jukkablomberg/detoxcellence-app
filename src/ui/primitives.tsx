import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, ScrollView, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BandLabel } from "../lib/exposures";
import { palettes, radius, space, type, useTheme } from "../lib/theme";

/** A screen: white ground, safe-area bottom. */
export function Screen({ children, testID }: PropsWithChildren<{ testID?: string }>) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      testID={testID}
      style={{ flex: 1, backgroundColor: t.ground }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: space.l, paddingBottom: insets.bottom + space.xxxl, gap: space.m }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

/** Integrity tile: #F4F4F4 on white, rounded, no border, no shadow (DESIGN.md § Components). */
export function Tile({ children, onPress, style, testID, label }: PropsWithChildren<{ onPress?: () => void; style?: StyleProp<ViewStyle>; testID?: string; label?: string }>) {
  const t = useTheme();
  const base: ViewStyle = { backgroundColor: t.panel, borderRadius: radius.card, padding: space.l, gap: space.s };
  if (!onPress) return <View testID={testID} style={[base, style]}>{children}</View>;
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [base, style, { opacity: pressed ? 0.8 : 1 }]}>
      {children}
    </Pressable>
  );
}

export function Display({ children, size = 34, color, style }: PropsWithChildren<{ size?: number; color?: string; style?: StyleProp<TextStyle> }>) {
  const t = useTheme();
  return <Text style={[type.display(size, color ?? t.sage), style]}>{children}</Text>;
}

export function Heading({ children, size = 18, style }: PropsWithChildren<{ size?: number; style?: StyleProp<TextStyle> }>) {
  const t = useTheme();
  return <Text accessibilityRole="header" style={[type.heading(size, t.ink), style]}>{children}</Text>;
}

export function Body({ children, muted = false, size = 15, style, lines }: PropsWithChildren<{ muted?: boolean; size?: number; style?: StyleProp<TextStyle>; lines?: number }>) {
  const t = useTheme();
  return <Text numberOfLines={lines} style={[type.body(size, muted ? t.muted : t.ink), style]}>{children}</Text>;
}

export function Label({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  const t = useTheme();
  return <Text style={[type.label(t.muted), style]}>{children}</Text>;
}

/** Content button: a pill (the venture's shape), ≥ 48 high, pressed + disabled states, a verb for a label. */
export function Button({ title, onPress, kind = "primary", disabled, testID, icon }: { title: string; onPress: () => void; kind?: "primary" | "secondary"; disabled?: boolean; testID?: string; icon?: ReactNode }) {
  const t = useTheme();
  const primary = kind === "primary";
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        minHeight: 48,
        borderRadius: radius.pill,
        paddingHorizontal: space.xl,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: space.s,
        backgroundColor: primary ? t.link : t.panel,
        opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
      })}
    >
      {icon}
      <Text style={type.strong(15, primary ? t.onLink : t.ink)}>{title}</Text>
    </Pressable>
  );
}

/** A filter chip (pill). */
export function Chip({ title, on, onPress, testID }: { title: string; on: boolean; onPress: () => void; testID?: string }) {
  const t = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({
        minHeight: 36,
        paddingHorizontal: space.m,
        borderRadius: radius.pill,
        justifyContent: "center",
        backgroundColor: on ? t.link : t.panel,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={type.strong(13, on ? t.onLink : t.ink)}>{title}</Text>
    </Pressable>
  );
}

/** The band pill: white text on the LIGHT-scheme band ink in both schemes — the inks that hold white text
 *  (the site's [DC-INTEGRITY 2026-09-30] rule for its result badge); the dark-scheme inks are for text on dark. */
export function BandPill({ band, score }: { band: BandLabel; score?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: palettes.light.band[band], borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
      {score !== undefined ? <Text style={[type.strong(13, "#FFFFFF"), { fontVariant: ["tabular-nums"] }]}>{score}</Text> : null}
      <Text style={type.strong(12, "#FFFFFF")}>{band}</Text>
    </View>
  );
}

/** One line of the disclosure every health surface carries (HEALTH-TRIO-DAY § 1 firewall). */
export function Disclosure() {
  return <Body muted size={13}>Information, not medical advice. Ratings are editorial and every source is shown.</Body>;
}
