import { useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { BandLabel } from "../lib/exposures";
import { fonts, palettes, radius, space, type, useScheme, useTheme, FIXED, type Palette } from "../lib/theme";

/**
 * [DX-ROUND-1117] The round kit, ported from FatTonic ([FT-ROUND-1116] src/ui/verdict.tsx + primitives Card/CardList/
 * CardRow + quiz-ui.tsx) and SnapStress (rounds 3–3e), in Detoxcellence's own skin (Integrity tokens, nothing new):
 * white rounded cards on the #F4F4F4 ground in light; panel cards on the ground in dark. The verdict's figure is this
 * venture's own number — the Detox Score and its five site bands (src/lib/score.ts band()) — never a borrowed scale.
 */

/** The two surfaces: the screen's ground and a card on it. */
export function useSurface(): { bg: string; card: string; sunk: string; t: Palette; dark: boolean } {
  const t = useTheme();
  const dark = useScheme() === "dark";
  return dark ? { bg: t.ground, card: t.panel, sunk: t.panel2, t, dark } : { bg: t.panel, card: t.ground, sunk: t.panel2, t, dark };
}

/** The band colour that holds white text, in both schemes (the site's [DC-INTEGRITY] badge rule). */
export const bandFill = (b: BandLabel) => palettes.light.band[b];

/** A rounded card. */
export function Card({ children, style, pad = space.l, onPress, testID, label }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; pad?: number; onPress?: () => void; testID?: string; label?: string }>) {
  const s = useSurface();
  const base: ViewStyle = { backgroundColor: s.card, borderRadius: 20, padding: pad, gap: space.s };
  if (!onPress) return <View testID={testID} style={[base, style]}>{children}</View>;
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [base, style, pressed ? { opacity: 0.85 } : null]}>
      {children}
    </Pressable>
  );
}

/** A card of rows, hairlines between them (iOS inset-grouped list). */
export function CardList({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const s = useSurface();
  const items = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean) as ReactNode[];
  if (!items.length) return null;
  return (
    <View style={[{ backgroundColor: s.card, borderRadius: 20, overflow: "hidden" }, style]}>
      {items.map((c, i) => (
        <View key={i}>
          {c}
          {i < items.length - 1 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: s.t.border, marginLeft: 76 }} /> : null}
        </View>
      ))}
    </View>
  );
}

/** A row inside a CardList. */
export function CardRow({ children, onPress, testID, label }: PropsWithChildren<{ onPress?: () => void; testID?: string; label?: string }>) {
  const s = useSurface();
  const inner = <View style={styles.row}>{children}</View>;
  if (!onPress) return inner;
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => (pressed ? { backgroundColor: s.sunk } : null)}>
      {inner}
    </Pressable>
  );
}

/** A section title above cards. */
export function SectionTitle({ children, right }: PropsWithChildren<{ right?: ReactNode }>) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: space.s }}>
      <Text accessibilityRole="header" style={type.heading(20, t.ink)}>{children}</Text>
      {right}
    </View>
  );
}


/** The verdict pill: the band's fill, a glyph, the site's band word; `score` adds the Detox Score in front. */
export function VerdictPill({ band, score, small = false }: { band: BandLabel; score?: number; small?: boolean }) {
  return (
    <View style={[styles.pill, { backgroundColor: bandFill(band) }, small ? styles.pillSmall : null]} accessibilityLabel={score != null ? `Detox Score ${score}, ${band}` : band}>
      <Text style={[styles.pillText, small ? { fontSize: 12, lineHeight: 15 } : null]}>
        {score != null ? `${score}  ` : ""}{band}
      </Text>
    </View>
  );
}

/** The score as FatTonic draws it: a small caption over a big figure, right-aligned. */
export function ScoreFigure({ score, band, caption = "Detox Score" }: { score: number; band: BandLabel; caption?: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: "flex-end" }}>
      <Text style={type.body(12, t.muted)}>{caption}</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 52, lineHeight: 54, color: bandFill(band), includeFontPadding: false }}>{score}</Text>
    </View>
  );
}

/** The zone bar: 0 → 100 in the five site bands (Severe < 20 · High < 40 · Moderate < 60 · Low < 80 · Minimal), a marker at the score. */
export function ZoneBar({ score, band }: { score: number; band: BandLabel }) {
  const s = useSurface();
  const at = Math.max(0, Math.min(1, score / 100));
  const zones: BandLabel[] = ["Severe", "High", "Moderate", "Low", "Minimal"];
  return (
    <View accessibilityLabel={`Detox Score ${score} of 100: ${band}`}>
      <View style={styles.track}>
        {zones.map((z, i) => (
          <View key={z} style={{ flex: 1, height: 14, backgroundColor: `${bandFill(z)}${s.dark ? "66" : "40"}`, borderTopLeftRadius: i === 0 ? 7 : 0, borderBottomLeftRadius: i === 0 ? 7 : 0, borderTopRightRadius: i === 4 ? 7 : 0, borderBottomRightRadius: i === 4 ? 7 : 0 }} />
        ))}
        <View style={[styles.marker, { left: `${at * 100}%`, borderColor: bandFill(band), backgroundColor: s.card }]} />
      </View>
      <View style={{ flexDirection: "row", marginTop: 6 }}>
        <Text style={type.body(11, s.t.muted)}>0</Text>
        <View style={{ flex: 1 }} />
        <Text style={type.body(11, s.t.muted)}>100</Text>
      </View>
    </View>
  );
}

/** Small stat tiles: label above, figure below. */
export function StatTiles({ items }: { items: { label: string; value: string }[] }) {
  const s = useSurface();
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flex: 1, backgroundColor: s.sunk, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 10 }}>
          <Text style={type.body(12, s.t.muted)} numberOfLines={1}>{it.label}</Text>
          <Text style={[type.heading(19, s.t.ink), { fontVariant: ["tabular-nums"] }]} numberOfLines={1}>{it.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** A row's picture: its photo, or (the camera does not know it) its score tile in the band colour. */
export function Thumb({ photo, score, band, size = 52 }: { photo?: number; score: number; band: BandLabel; size?: number }) {
  const s = useSurface();
  const r = Math.round(size * 0.28);
  if (photo != null) return <Image source={photo} style={{ width: size, height: size, borderRadius: r, backgroundColor: s.sunk }} accessibilityIgnoresInvertColors />;
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bandFill(band), alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: fonts.display, fontSize: Math.round(size * 0.5), lineHeight: Math.round(size * 0.56), color: FIXED.onDark, includeFontPadding: false }}>{score}</Text>
    </View>
  );
}

/** The dial: a ring in a band colour, the figure in the middle. */
export function ScoreDial({ pct, color, size = 132, caption = "of 100" }: { pct: number; color: string; size?: number; caption?: string }) {
  const s = useSurface();
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }} accessibilityLabel={`${pct} of 100`}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={s.sunk} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${(c * pct) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.4, lineHeight: size * 0.44, color: s.t.ink, includeFontPadding: false }}>{pct}</Text>
      <Text style={type.body(11, s.t.muted)}>{caption}</Text>
    </View>
  );
}

/** A photo tile (rooms, doors): the picture on top, a name, an optional figure and a line under it. */
export function PhotoTile({ photo, title, figure, figureColor, sub, dots, onPress, testID, height = 92 }: { photo?: number; title: string; figure?: string; figureColor?: string; sub?: string; dots?: { done: number; of: number }; onPress: () => void; testID?: string; height?: number }) {
  const s = useSurface();
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={[title, figure, sub].filter(Boolean).join(", ")} style={({ pressed }) => [{ flex: 1, backgroundColor: s.card, borderRadius: 20, overflow: "hidden" }, pressed ? { opacity: 0.85 } : null]}>
      {photo != null ? <Image source={photo} style={{ width: "100%", height, backgroundColor: s.sunk }} resizeMode="cover" accessibilityIgnoresInvertColors /> : <View style={{ height, backgroundColor: s.sunk }} />}
      <View style={{ padding: space.m, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: space.s }}>
          <Text style={[type.strong(15, s.t.ink), { flex: 1 }]} numberOfLines={2}>{title}</Text>
          {figure ? <Text style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 30, color: figureColor ?? s.t.ink, includeFontPadding: false }}>{figure}</Text> : null}
        </View>
        {sub ? <Text style={type.body(12, s.t.muted)} numberOfLines={1}>{sub}</Text> : null}
        {dots && dots.of > 0 ? (
          <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }} accessibilityLabel={`${dots.done} of ${dots.of} swaps done`}>
            {Array.from({ length: dots.of }, (_, i) => <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < dots.done ? s.t.link : s.sunk }} />)}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Two tiles per row. */
export function Grid2({ children }: { children: ReactNode[] }) {
  const rows: ReactNode[][] = [];
  children.forEach((c, i) => (i % 2 ? rows[rows.length - 1].push(c) : rows.push([c])));
  return (
    <View style={{ gap: space.m }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: "row", gap: space.m }}>
          {r}
          {r.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

/** A round tick (done / not done). */
export function Tick({ on, onPress, a11y, testID }: { on: boolean; onPress: () => void; a11y: string; testID?: string }) {
  const t = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={a11y} hitSlop={10} style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: on ? t.link : t.muted, backgroundColor: on ? t.link : "transparent", alignItems: "center", justifyContent: "center" }}>
      {on ? <Text style={type.strong(15, t.onLink)}>✓</Text> : null}
    </Pressable>
  );
}

/** A ghost pill (Back, Cancel, a quiet action). */
export function GhostPill({ title, onPress, testID }: { title: string; onPress: () => void; testID?: string }) {
  const s = useSurface();
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" hitSlop={10} style={({ pressed }) => ({ backgroundColor: s.card, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9, opacity: pressed ? 0.8 : 1 })}>
      <Text style={type.strong(14, s.t.ink)}>{title}</Text>
    </Pressable>
  );
}

/** A collapsed section: one row with a +, the detail only on tap. */
export function Expander({ title, children, testID }: PropsWithChildren<{ title: string; testID?: string }>) {
  const s = useSurface();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ backgroundColor: s.card, borderRadius: 20, overflow: "hidden" }}>
      <Pressable testID={testID} onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={({ pressed }) => [styles.row, pressed ? { backgroundColor: s.sunk } : null]}>
        <Text style={[type.strong(16, s.t.ink), { flex: 1 }]}>{title}</Text>
        <Text style={type.heading(20, s.t.muted)}>{open ? "−" : "+"}</Text>
      </Pressable>
      {open ? <View style={{ paddingHorizontal: space.l, paddingBottom: space.l, gap: space.m }}>{children}</View> : null}
    </View>
  );
}

/** One answer card that lights up, then moves on by itself (FatTonic's test, auto-advance after 260 ms). */
export function useAutoAdvance(index: number, onAnswer: (i: number) => void) {
  const [picked, setPicked] = useState<number | null>(null);
  const tm = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setPicked(null); return () => { if (tm.current) clearTimeout(tm.current); }; }, [index]);
  const pick = (i: number) => {
    if (picked != null) return;
    setPicked(i);
    tm.current = setTimeout(() => onAnswer(i), 260);
  };
  return { picked, pick };
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.m, paddingHorizontal: space.l, paddingVertical: space.m, minHeight: 56 },
  pill: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  pillSmall: { paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 19, color: FIXED.onDark, fontVariant: ["tabular-nums"] },
  track: { height: 14, flexDirection: "row", marginTop: 8 },
  marker: { position: "absolute", top: -6, width: 26, height: 26, marginLeft: -13, borderRadius: 13, borderWidth: 5 },
});
