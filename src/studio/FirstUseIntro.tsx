import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
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
 *
 * [APP-INTRO-STANDARD v1 2026-11-06] (design/APP-INTRO-STANDARD.md § 2; every addition optional, older configs draw as before):
 * - config.enabled === false → never mounts (the OTA kill switch).
 * - config.prior_use_keys → a reader who already used the app is marked seen silently (rule 11).
 * - config.imageAspect → each image drawn at exactly its own shape, fitted to the layout's space (no letterbox);
 *   in "framed" the line then keeps 24 pt clear of the buttons.
 * - Skip ≥ 44 × 44 pt; Android Back = previous card, on card 1 = Skip; the image is decorative (the line carries it).
 * - Reduce motion: the cards swap with no animation at all and nothing auto-advances — met by construction. Any
 *   transition added later must be gated on AccessibilityInfo.isReduceMotionEnabled().
 * - replayIntro() (About/Settings "See the intro again") clears the flag and shows the cards once more (rule 10).
 */
type Props = {
  config: IntroConfig;
  images: Record<string, ImageSourcePropType>;
  theme: StudioTheme;
  /** false while the brand moment is still up — the intro waits for it */
  ready: boolean;
  onDone?: () => void;
};

const replayListeners = new Set<() => void>();
/** Rule 10: clear the flag and show the intro again (the mounted component listens). Safe to call anywhere. */
export async function replayIntro(): Promise<void> {
  try { await AsyncStorage.removeItem(INTRO_FLAG_KEY); } catch { /* storage refused — still show it this session */ }
  replayListeners.forEach((l) => l());
}

/** Any app-owned key present = not a fresh install. A read error counts as "no prior use" (the flag still guards). */
async function hadPriorUse(keys: string[] | undefined): Promise<boolean> {
  if (!keys?.length) return false;
  try {
    const rows = await AsyncStorage.multiGet(keys);
    return rows.some(([, v]) => v !== null && v !== undefined && v !== "");
  } catch {
    return false;
  }
}

export function FirstUseIntro({ config, images, theme: t, ready, onDone }: Props) {
  const [show, setShow] = useState<boolean | null>(null);
  const [i, setI] = useState(0);
  const insets = useSafeAreaInsets();
  const enabled = config.enabled !== false;

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    Promise.all([AsyncStorage.getItem(INTRO_FLAG_KEY), hadPriorUse(config.prior_use_keys)])
      .then(([v, prior]) => {
        if (!live) return;
        // Rule 11: an existing reader (prior use, flag never written) is marked seen silently — never shown.
        if (shouldShowIntro(v) && prior) void AsyncStorage.setItem(INTRO_FLAG_KEY, INTRO_SEEN).catch(() => undefined);
        setShow(shouldShowIntro(v, prior));
      })
      .catch(() => live && setShow(false)); // storage unreadable → never trap the reader in the intro
    const replay = () => { if (live) { setI(0); setShow(true); } };
    replayListeners.add(replay);
    return () => { live = false; replayListeners.delete(replay); };
  }, [enabled]);

  const visible = enabled && ready && !!show;
  const finish = () => {
    setShow(false);
    void AsyncStorage.setItem(INTRO_FLAG_KEY, INTRO_SEEN).catch(() => undefined);
    router.replace(config.core_action_route as never);
    onDone?.();
  };

  // Android Back: previous card; on card 1 it is Skip. Always consumed while the intro is up.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (i > 0) setI(i - 1);
      else finish();
      return true;
    });
    return () => sub.remove();
  }, [visible, i]);

  if (!visible) return null;
  const cards = config.cards.slice(0, 3);
  const card = cards[Math.min(i, cards.length - 1)];
  const last = i >= cards.length - 1;
  const layout = config.layout ?? "framed";
  const caps = config.buttonCaps === true;
  const word = (w: string) => (caps ? w.toUpperCase() : w);
  const aspect = config.imageAspect;

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
    <Pressable accessibilityRole="button" accessibilityLabel="Skip" onPress={finish} hitSlop={8} style={s.skip}>
      <Text style={{ fontFamily: t.fonts.ui, fontSize: 15, color: t.muted }}>{word("Skip")}</Text>
    </Pressable>
  ) : <View style={s.skip} />;
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

  // imageAspect set: the image keeps its own shape inside the space the layout gives it.
  const fitted = (frame: IntroConfig["layout"]) =>
    img ? (
      <FitImage
        source={img}
        aspect={aspect!}
        widthShare={frame === "bleed" ? 1 : 0.84}
        style={frame === "bleed" ? { backgroundColor: t.panel } : { borderRadius: t.radius, borderColor: t.hairline, borderWidth: StyleSheet.hairlineWidth }}
      />
    ) : <View style={{ flex: 1 }} />;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: t.ground, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={s.top}>{progress}{skip}</View>
      {layout === "bleed" ? (
        <View style={s.bleedBody}>
          {aspect ? fitted("bleed") : img ? <Image source={img} style={[s.bleedImg, { backgroundColor: t.panel }]} resizeMode="cover" accessible={false} accessibilityIgnoresInvertColors /> : null}
          <View style={[s.pad, aspect ? s.fitGap : null]}>{line("left", 30)}</View>
        </View>
      ) : layout === "editorial" ? (
        <View style={s.editBody}>
          {line("left", 34)}
          {aspect ? <View style={[s.fitGap, { flex: 1, alignSelf: "stretch" }]}>{fitted("editorial")}</View> : img ? <Image source={img} style={[s.editImg, { borderRadius: t.radius, borderColor: t.hairline }]} resizeMode="contain" accessible={false} accessibilityIgnoresInvertColors /> : null}
        </View>
      ) : (
        <View style={[s.body, aspect ? s.framedGap : null]}>
          {aspect ? fitted("framed") : img ? <Image source={img} style={[s.img, { borderRadius: t.radius, borderColor: t.hairline }]} resizeMode="contain" accessible={false} accessibilityIgnoresInvertColors /> : null}
          {line("center", 26)}
        </View>
      )}
      {nav}
    </View>
  );
}

/** The image at exactly `aspect` (w/h), as large as fits in widthShare × the box's width and the box's height. */
function FitImage({ source, aspect, widthShare, style }: { source: ImageSourcePropType; aspect: number; widthShare: number; style: object }) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  let w = 0;
  let h = 0;
  if (box) {
    w = box.w * widthShare;
    h = w / aspect;
    if (h > box.h) { h = box.h; w = h * aspect; }
  }
  return (
    <View style={s.fitBox} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {box ? <Image source={source} style={[{ width: Math.floor(w), height: Math.floor(h), overflow: "hidden" }, style]} resizeMode="cover" accessible={false} accessibilityIgnoresInvertColors /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, minHeight: 44, gap: 16 },
  bars: { flexDirection: "row", gap: 6, flex: 1, maxWidth: 160 },
  bar: { height: 3, flex: 1 },
  skip: { minHeight: 44, minWidth: 44, alignItems: "flex-end", justifyContent: "center" },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 24 },
  img: { width: "78%", aspectRatio: 9 / 16, maxHeight: "70%", borderWidth: StyleSheet.hairlineWidth },
  bleedBody: { flex: 1, justifyContent: "flex-start", gap: 24, paddingTop: 8 },
  bleedImg: { width: "100%", flex: 1, maxHeight: "68%" },
  pad: { paddingHorizontal: 24 },
  fitGap: { paddingBottom: 16 },
  framedGap: { paddingBottom: 24 }, // framed + imageAspect: the line sits 24 pt above the buttons (critic 11-06)
  fitBox: { flex: 1, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  editBody: { flex: 1, paddingHorizontal: 24, paddingTop: 24, gap: 28, alignItems: "flex-start" },
  editImg: { alignSelf: "center", width: "70%", flex: 1, maxHeight: "62%", borderWidth: StyleSheet.hairlineWidth },
  nav: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 24, gap: 12 },
  btn: { minHeight: 48, minWidth: 120, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  spacer: { minWidth: 120 },
});
