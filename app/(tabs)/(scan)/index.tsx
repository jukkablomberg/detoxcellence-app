import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { available, classify, discard, labelPhoto, prepare } from "../../../modules/health-camera";
import type { Scored } from "../../../modules/health-camera/core";
import { bySlug, CATEGORIES, search, useIndex, type Entry } from "../../../src/lib/exposures";
import { LENS, offer, roomCheck, type Candidate } from "../../../src/lib/lens";
import { openAisle, openEntry } from "../../../src/lib/nav";
import { readScans, recordScan, type ScanRecord } from "../../../src/lib/scan";
import { DEMO_PHOTO, DEMO_RESULT } from "../../../src/lib/scan-demo";
import { radius, space, type, useTheme } from "../../../src/lib/theme";
import { BandPill, Body, Button, Display, Heading, Label, Screen, Tile } from "../../../src/ui/primitives";

/**
 * SCAN — the front page (docs/scan-flow.md, copied from FatTonic with the engine). Point the phone at a pan, a food
 * container, a candle, a shampoo → the engine (modules/health-camera, FatTonic's, byte-identical) ranks its labels on
 * the phone → this app's lens offers up to three "Is it…" chips → a tap opens that Exposure Index entry
 * (/exposure/<slug>). Where the row depends on it (coating, use, contents, organic or conventional) one follow-up tap.
 * ROOM CHECK: one photo of a room or a shelf → what the camera may have seen, as Index rows ordered by Detox Score →
 * the top swap. No room score. The photo is classified on the phone and deleted at once — nothing stored or sent.
 * Web export: no camera model — the target shows one real result (a CC0 photo classified by the same engine).
 */
type Purpose = "item" | "room";
type Mode =
  | { k: "home" }
  | { k: "camera"; purpose: Purpose }
  | { k: "working" }
  | { k: "pick"; offTopic: Candidate | null; picks: Candidate[] }
  | { k: "ask"; c: Candidate }
  | { k: "room"; seen: { label: string; name: string; entry: Entry }[]; top: { label: string; name: string; entry: Entry } | null };

export default function ScanScreen() {
  const t = useTheme();
  const { list } = useIndex();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ go?: string; t?: string; demo?: string }>();
  const [mode, setMode] = useState<Mode>({ k: "home" });
  const [perm, requestPerm] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);
  const cam = useRef<CameraView>(null);
  const busy = useRef(false);

  useFocusEffect(useCallback(() => void readScans().then(setScans), []));

  const home = useCallback(() => {
    if (busy.current) return;
    setError(null);
    setMode({ k: "home" });
  }, []);
  const away = mode.k !== "home" && mode.k !== "working";

  // Rule 4 — a way home from every state that is not home: the header back…
  useLayoutEffect(() => {
    navigation.setOptions({ headerLeft: away ? () => <BackToScan onPress={home} color={t.ink} /> : undefined });
  }, [navigation, away, home, t.ink]);

  // …the Scan tab itself (pressing it lands on the front page)…
  useEffect(() => {
    const subs: (() => void)[] = [];
    for (const nav of [navigation, navigation.getParent?.()]) {
      try {
        const n = nav as unknown as { addListener?: (type: "tabPress", cb: () => void) => () => void } | undefined;
        if (n?.addListener) subs.push(n.addListener("tabPress", home));
      } catch { /* this navigator has no tab events */ }
    }
    return () => subs.forEach((u) => u());
  }, [navigation, home]);

  // …Android's back button…
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android" || !away) return undefined;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        home();
        return true;
      });
      return () => sub.remove();
    }, [away, home]),
  );

  // …and scanHome() from anywhere (the brand in every tab header, "Scan another" on an entry page).
  useEffect(() => {
    if (!params.t) return;
    home();
    if (params.go === "camera" && available) void openCamera("item");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.t]);

  // Web export only (no camera model): ?demo=<label> shows that label as the engine's best guess, so the acceptance
  // harness can drive every lens label through the same chips → entry path. Native builds never read it.
  useEffect(() => {
    if (available || !params.demo || !LENS[params.demo]) return;
    setMode({ k: "pick", ...offer([{ label: params.demo, score: 1 }, ...DEMO_RESULT.filter((d) => d.label !== params.demo)]) });
  }, [params.demo]);

  async function openCamera(purpose: Purpose) {
    setError(null);
    const p = perm?.granted ? perm : await requestPerm();
    if (!p.granted) {
      setError("Camera access is off. You can still search the Index below, or allow the camera in Settings.");
      return;
    }
    void prepare().catch(() => undefined);
    setReady(false);
    setMode({ k: "camera", purpose });
  }

  function showResult(purpose: Purpose, ranked: Scored[]) {
    if (purpose === "room") setMode({ k: "room", ...roomCheck(ranked, bySlug) });
    else setMode({ k: "pick", ...offer(ranked) });
  }

  async function shoot(purpose: Purpose) {
    if (busy.current || !cam.current) return;
    busy.current = true;
    let uri: string | null = null;
    try {
      // Capture FIRST, while the CameraView is mounted (FatTonic 10-07: unmounting mid-capture fails on iOS).
      const pic = await cam.current.takePictureAsync({ quality: 0.8, shutterSound: false });
      uri = pic?.uri ?? null;
      setMode({ k: "working" });
      if (!uri) throw new Error("no photo");
      showResult(purpose, await classify(uri, 8));
    } catch (e) {
      setError(`Could not read that photo (${e instanceof Error ? e.message : String(e)}). Try again or search.`);
      setMode({ k: "home" });
    } finally {
      discard(uri);
      busy.current = false;
    }
  }

  async function open(c: Candidate, slug: string) {
    const e = bySlug(slug);
    setScans(await recordScan({ label: c.label, slug, name: e?.name ?? c.name, at: Date.now() }));
    openEntry(slug); // the chips stay behind the entry page: back = "not this one — let me pick another"
  }

  function choose(c: Candidate) {
    if (c.rows.length === 1) void open(c, c.rows[0]);
    else setMode({ k: "ask", c });
  }

  if (mode.k === "camera") {
    const purpose = mode.purpose;
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView ref={cam} style={{ flex: 1 }} facing="back" onCameraReady={() => setReady(true)} />
        <View style={styles.camBar}>
          <Text style={[type.body(14, "#FFFFFF"), { textAlign: "center" }]}>
            {purpose === "room" ? "The whole shelf or corner in frame · good light." : "One product · fill the frame · good light."}
          </Text>
          <View style={{ flexDirection: "row", gap: space.m, marginTop: space.m }}>
            <View style={{ flex: 1 }}><Button title="Cancel" kind="secondary" onPress={home} testID="camera-cancel" /></View>
            <View style={{ flex: 2 }}><Button title={ready ? (purpose === "room" ? "Check the room" : "Scan") : "Starting camera…"} disabled={!ready} onPress={() => void shoot(purpose)} /></View>
          </View>
        </View>
      </View>
    );
  }

  const results = query.trim() ? search(list, query).slice(0, 8) : [];

  return (
    <Screen testID={`scan-${mode.k}`}>
      {mode.k === "working" ? (
        <Tile>
          <ActivityIndicator color={t.link} />
          <Body muted>Recognising — on your phone, nothing is sent.</Body>
        </Tile>
      ) : null}

      {mode.k === "pick" ? (
        <View style={{ gap: space.s }}>
          {mode.offTopic ? <Body>This looks like {mode.offTopic.name.toLowerCase()} — not something Detoxcellence rates.</Body> : null}
          <Heading size={22}>{mode.offTopic ? "Or is it…" : "Is it…"}</Heading>
          {mode.picks.map((c) => (
            <Chip key={c.label} label={c.name} photo={labelPhoto(c.label)} note={c.rows.length > 1 ? "one question" : undefined} onPress={() => choose(c)} />
          ))}
          {mode.picks.length === 0 ? <Body muted>Nothing in the Exposure Index looks like this. Try the search.</Body> : null}
          <Body muted size={13}>None of these? Search below, or scan again closer.</Body>
          <Button title="Scan again" kind="secondary" onPress={() => (available ? void openCamera("item") : home())} testID="scan-again" />
        </View>
      ) : null}

      {mode.k === "ask" ? (
        <View style={{ gap: space.s }}>
          <Label>{mode.c.name}</Label>
          <Heading size={22}>{mode.c.ask}</Heading>
          {mode.c.rows.map((slug) => {
            const e = bySlug(slug);
            return e ? (
              <Pressable key={slug} testID={`ask-${slug}`} onPress={() => void open(mode.c, slug)} accessibilityRole="button" style={({ pressed }) => [styles.row, { backgroundColor: t.panel, opacity: pressed ? 0.8 : 1 }]}>
                <Text style={[type.strong(16, t.ink), { flex: 1 }]}>{e.name}</Text>
                <BandPill band={e.band} score={e.score} />
              </Pressable>
            ) : null;
          })}
        </View>
      ) : null}

      {mode.k === "room" ? (
        <View style={{ gap: space.s }} testID="room-result">
          <Heading size={22}>What the camera may have seen</Heading>
          <Body muted size={13}>Highest burden first, by each entry's Detox Score. Tap one to check it is right.</Body>
          {mode.top ? (
            <Tile style={{ backgroundColor: t.link }} testID="room-top-swap" onPress={() => openEntry(mode.top!.entry.slug)} label={`Top swap: ${mode.top.entry.swap}`}>
              <Text style={type.label(t.onLink)}>Your top swap here · {mode.top.entry.name}</Text>
              <Text style={type.strong(17, t.onLink)}>{mode.top.entry.swap}</Text>
            </Tile>
          ) : null}
          {mode.seen.map((x) => (
            <Pressable key={x.entry.slug} testID={`room-${x.entry.slug}`} onPress={() => openEntry(x.entry.slug)} accessibilityRole="button" style={({ pressed }) => [styles.row, { backgroundColor: t.panel, opacity: pressed ? 0.8 : 1 }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={type.strong(16, t.ink)}>{x.entry.name}</Text>
                <Body muted size={12}>seen as: {x.name.toLowerCase()}</Body>
              </View>
              <BandPill band={x.entry.band} score={x.entry.score} />
            </Pressable>
          ))}
          {mode.seen.length === 0 ? <Body muted>Nothing in the photo matched an Index entry. Try one product at a time with Scan.</Body> : null}
          <Button title="Check another room" kind="secondary" onPress={() => (available ? void openCamera("room") : home())} />
        </View>
      ) : null}

      {mode.k === "home" ? (
        <View style={{ gap: space.m }}>
          <ScanTarget demo={!available} onPress={() => (available ? void openCamera("item") : showResult("item", DEMO_RESULT))} />
          <Body muted size={14}>One product per photo, fill the frame, good light. Recognition runs on your phone; photos are not stored or sent.</Body>
          {error ? <Body>{error}</Body> : null}
          <Button title="Room check: one photo of a shelf" kind="secondary" testID="room-check" onPress={() => (available ? void openCamera("room") : showResult("room", DEMO_RESULT))} />
        </View>
      ) : null}

      {mode.k !== "working" ? (
        <View style={{ gap: space.s }}>
          <Heading>Search the Index</Heading>
          <TextInput
            testID="scan-search"
            value={query}
            onChangeText={setQuery}
            placeholder="Search a product or habit…"
            placeholderTextColor={t.muted}
            style={[type.body(16, t.ink), { backgroundColor: t.panel, borderRadius: radius.pill, paddingHorizontal: space.l, minHeight: 48 }]}
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Search the Exposure Index"
          />
          {results.map((e) => (
            <Pressable key={e.slug} onPress={() => { setQuery(""); openEntry(e.slug); }} accessibilityRole="button" style={({ pressed }) => [styles.row, { backgroundColor: t.panel, opacity: pressed ? 0.8 : 1 }]}>
              <Text style={[type.strong(15, t.ink), { flex: 1 }]}>{e.name}</Text>
              <BandPill band={e.band} score={e.score} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {mode.k === "home" && scans.length ? (
        <View style={{ gap: space.s }}>
          <Heading>Recent scans</Heading>
          {scans.slice(0, 5).map((s) => {
            const e = s.slug ? bySlug(s.slug) : undefined;
            return (
              <Pressable key={`${s.at}-${s.label}`} disabled={!e} onPress={() => e && openEntry(e.slug)} accessibilityRole="button" style={({ pressed }) => [styles.row, { backgroundColor: t.panel, opacity: pressed ? 0.8 : 1 }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={type.strong(15, t.ink)}>{s.name}</Text>
                  <Body muted size={12}>{new Date(s.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Body>
                </View>
                {e ? <BandPill band={e.band} score={e.score} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {mode.k === "home" ? (
        <View style={{ gap: space.s }}>
          <Heading>Browse the aisles</Heading>
          {CATEGORIES.map((c) => (
            <Pressable key={c} onPress={() => openAisle(c)} accessibilityRole="button" accessibilityLabel={`${c}, ${list.filter((e) => e.category === c).length} entries`} style={({ pressed }) => [styles.row, { backgroundColor: t.panel, opacity: pressed ? 0.8 : 1 }]}>
              <Text style={[type.strong(15, t.ink), { flex: 1 }]}>{c}</Text>
              <Text style={[type.body(13, t.muted), { fontVariant: ["tabular-nums"] }]}>{list.filter((e) => e.category === c).length}</Text>
              <Text style={type.strong(18, t.muted)}>›</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

/** Rule 1 — the front page's one job: a viewfinder-shaped target, the four corner marks of the camera's frame. */
function ScanTarget({ demo, onPress }: { demo: boolean; onPress: () => void }) {
  const t = useTheme();
  const ink = demo ? "#FFFFFF" : t.link;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={demo ? "See the demo scan result" : "Open the camera and scan a product"}
      testID="scan-target"
      style={({ pressed }) => [styles.target, { backgroundColor: t.panel, opacity: pressed ? 0.9 : 1 }]}
    >
      {demo ? (
        <>
          <Image source={DEMO_PHOTO} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="A plastic water bottle" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(17,21,19,0.45)" }]} />
        </>
      ) : null}
      {(["tl", "tr", "bl", "br"] as const).map((c) => <Corner key={c} at={c} color={ink} />)}
      <Display size={52} color={ink} style={{ textAlign: "center" }}>Point. Check.</Display>
      <View style={[styles.targetCta, { backgroundColor: demo ? "#FFFFFF" : t.link }]}>
        <Text style={type.strong(17, demo ? "#1C1C1C" : t.onLink)}>{demo ? "See a scan" : "Tap to scan"}</Text>
      </View>
      <Text style={[type.label(ink), { marginTop: space.s }]}>{demo ? "Demo · a CC0 photo, the same engine" : "Pans · containers · candles · bottles"}</Text>
    </Pressable>
  );
}

function Corner({ at, color }: { at: "tl" | "tr" | "bl" | "br"; color: string }) {
  const L = 34, W = 5, I = 14;
  const pos = { top: at[0] === "t" ? I : undefined, bottom: at[0] === "b" ? I : undefined, left: at[1] === "l" ? I : undefined, right: at[1] === "r" ? I : undefined };
  return (
    <View pointerEvents="none" style={[{ position: "absolute", width: L, height: L }, pos]}>
      <View style={{ position: "absolute", [at[0] === "t" ? "top" : "bottom"]: 0, left: 0, right: 0, height: W, borderRadius: 3, backgroundColor: color }} />
      <View style={{ position: "absolute", [at[1] === "l" ? "left" : "right"]: 0, top: 0, bottom: 0, width: W, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

function BackToScan({ onPress, color }: { onPress: () => void; color: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Back to Scan" hitSlop={12} testID="scan-back" style={{ paddingLeft: 8, paddingRight: 8, minHeight: 44, justifyContent: "center" }}>
      <Text style={{ fontSize: 30, lineHeight: 32, color }}>‹</Text>
    </Pressable>
  );
}

/** A9: the confirm tap is made against a picture, not a word — a reference photo of the label sits on the chip. */
function Chip({ label, note, photo, onPress }: { label: string; note?: string; photo?: number; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.chip, { backgroundColor: pressed ? t.link : t.panel }]}>
      {({ pressed }) => (
        <>
          {photo != null ? <Image source={photo} style={styles.chipImg} testID="chip-photo" accessibilityIgnoresInvertColors /> : null}
          <Text style={[type.strong(17, pressed ? t.onLink : t.ink), { flex: 1 }]}>{label}</Text>
          {note ? <Text style={type.body(12, pressed ? t.onLink : t.muted)}>{note}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  camBar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: Platform.OS === "ios" ? 32 : 20, backgroundColor: "rgba(0,0,0,0.55)" },
  chip: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: radius.card, padding: 8, paddingRight: 16, minHeight: 56 },
  chipImg: { width: 56, height: 56, borderRadius: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: space.m, borderRadius: radius.card, padding: space.l, minHeight: 52 },
  target: { aspectRatio: 1, width: "100%", maxHeight: 460, alignSelf: "center", alignItems: "center", justifyContent: "center", borderRadius: radius.card, overflow: "hidden" },
  targetCta: { borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 28, marginTop: space.m },
});
