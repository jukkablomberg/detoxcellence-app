import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { INTRO_FLAG_KEY, INTRO_SEEN, shouldShowIntro, type IntroConfig } from "./intro";
import type { StudioTheme } from "./theme";

/**
 * First-use intro (PNF-8, [APP-INTRO-CARDS-TEMPLATE]): ≤ 3 cards — Next / Back / Done, Skip from card 1 —
 * shown once after install (AsyncStorage INTRO_FLAG_KEY, version-independent: never on relaunch, never after an OTA).
 * Done and Skip both write the flag and land on config.core_action_route. An overlay above the navigator, so a deep
 * link or an alert tap underneath still resolves. Copy lives in app/intro.json; images are passed in by the app
 * (Metro needs static require()), keyed by card.image. Generated copy: edit studio-kit/src/, run sync-studio-kit.py.
 *
 * [APP-DETEMPLATE 2026-10-21] Composition comes from config.layout (framed | bleed | editorial) and the buttons from
 * the app's own theme (radius, caps) — the studio's apps must not open on the same screen (design critique 2026-10-21).
 */
type Props = {
  config: IntroConfig;
  images: Record<string, ImageSourcePropType>;
  theme: StudioTheme;
  /** false while the brand moment is still up — the intro waits for it */
  ready: boolean;
  onDone?: () => void;
};

export function FirstUseIntro({ config, images, theme: t, ready, onDone }: Props) {
  const [show, setShow] = useState<boolean | null>(null);
  const [i, setI] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(INTRO_FLAG_KEY)
      .then((v) => live && setShow(shouldShowIntro(v)))
      .catch(() => live && setShow(false)); // storage unreadable → never trap the reader in the intro
    return () => { live = false; };
  }, []);

  if (!ready || !show) return null;
  const cards = config.cards.slice(0, 3);
  const card = cards[i];
  const last = i === cards.length - 1;
  const layout = config.layout ?? "framed";
  const caps = config.buttonCaps === true;
  const word = (w: string) => (caps ? w.toUpperCase() : w);

  const finish = () => {
    setShow(false);
    void AsyncStorage.setItem(INTRO_FLAG_KEY, INTRO_SEEN).catch(() => undefined);
    router.replace(config.core_action_route as never);
    onDone?.();
  };

  const btn = (label: string, onPress: () => void, primary = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={[
        s.btn,
        { borderRadius: t.radius },
        primary ? { backgroundColor: t.link } : { borderColor: t.hairline, borderWidth: StyleSheet.hairlineWidth },
        layout === "bleed" && primary ? { flex: 1 } : null,
      ]}
    >
      <Text style={{ fontFamily: t.fonts.ui, fontSize: caps ? 14 : 16, letterSpacing: caps ? 1.2 : 0, color: primary ? t.ground : t.ink }}>{label}</Text>
    </Pressable>
  );

  // Progress: a counter for "framed", segment bars for the other two.
  const progress = layout === "framed" ? (
    <Text style={{ fontFamily: t.fonts.mono, fontSize: 12, color: t.muted }}>{`${i + 1} / ${cards.length}`}</Text>
  ) : (
    <View style={s.bars} accessibilityLabel={`Card ${i + 1} of ${cards.length}`}>
      {cards.map((_, k) => (
        <View key={k} style={[s.bar, { backgroundColor: k <= i ? t.link : t.hairline }]} />
      ))}
    </View>
  );
  const skip = !last ? (
    <Pressable accessibilityRole="button" onPress={finish} hitSlop={12}>
      <Text style={{ fontFamily: t.fonts.ui, fontSize: 15, color: t.muted }}>{word("Skip")}</Text>
    </Pressable>
  ) : <View />;
  const img = images[card.image];
  const line = (align: "center" | "left", size: number) => (
    <Text accessibilityRole="header" style={{ fontFamily: t.fonts.display, fontSize: size, lineHeight: Math.round(size * 1.2), color: t.ink, textAlign: align }}>
      {card.line}
    </Text>
  );
  const nav = (
    <View style={s.nav}>
      {i > 0 ? btn(word(layout === "framed" ? "← Previous" : "Back"), () => setI(i - 1)) : layout === "bleed" ? null : <View style={s.spacer} />}
      {last ? btn(word(layout === "bleed" ? "Start" : "Done"), finish, true) : btn(word(layout === "framed" ? "Next →" : "Next"), () => setI(i + 1), true)}
    </View>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: t.ground, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={s.top}>{progress}{skip}</View>
      {layout === "bleed" ? (
        <View style={s.bleedBody}>
          {img ? <Image source={img} style={[s.bleedImg, { backgroundColor: t.panel }]} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
          <View style={s.pad}>{line("left", 30)}</View>
        </View>
      ) : layout === "editorial" ? (
        <View style={s.editBody}>
          {line("left", 34)}
          {img ? <Image source={img} style={[s.editImg, { borderRadius: t.radius, borderColor: t.hairline }]} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
        </View>
      ) : (
        <View style={s.body}>
          {img ? <Image source={img} style={[s.img, { borderRadius: t.radius, borderColor: t.hairline }]} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
          {line("center", 26)}
        </View>
      )}
      {nav}
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, minHeight: 44, gap: 16 },
  bars: { flexDirection: "row", gap: 6, flex: 1, maxWidth: 160 },
  bar: { height: 3, flex: 1 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 24 },
  img: { width: "78%", aspectRatio: 9 / 16, maxHeight: "70%", borderWidth: StyleSheet.hairlineWidth },
  bleedBody: { flex: 1, justifyContent: "flex-start", gap: 24, paddingTop: 8 },
  bleedImg: { width: "100%", flex: 1, maxHeight: "68%" },
  pad: { paddingHorizontal: 24 },
  editBody: { flex: 1, paddingHorizontal: 24, paddingTop: 24, gap: 28, alignItems: "flex-start" },
  editImg: { alignSelf: "center", width: "70%", flex: 1, maxHeight: "62%", borderWidth: StyleSheet.hairlineWidth },
  nav: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 24, gap: 12 },
  btn: { minHeight: 48, minWidth: 120, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  spacer: { minWidth: 120 },
});
