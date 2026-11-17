import { CameraView, useCameraPermissions } from "expo-camera";
import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { discard } from "../../../modules/health-camera";
import data from "../../../src/data/older-homes.json";
import { bySlug, useIndex } from "../../../src/lib/exposures";
import { openEntry } from "../../../src/lib/nav";
import { space, type, FIXED } from "../../../src/lib/theme";
import { Body, Button, Screen } from "../../../src/ui/primitives";
import { Card, VerdictPill, useSurface } from "../../../src/ui/kit";

/**
 * IS THIS VERMICULITE? — [DX-ROUND2-1117] reader 2's job on the phone (READERS.md: "is this asbestos, how dangerous,
 * what do I do"), CB benchmark fix 1. The site's page (/older-homes/is-this-vermiculite/) in the app: EPA's five
 * photographs (public domain), the page's "how to tell" lines, its verdict, the Index row and its steps — plus the one
 * thing only the phone can do: hold a photo of YOUR attic next to EPA's. The photo stays in memory on this screen and
 * is deleted when you take another or leave; nothing is classified, stored or sent. A shared route under every tab group.
 */
const PHOTOS: Record<string, number> = {
  "epa-vermiculite1.jpg": require("../../../assets/vermiculite/epa-vermiculite1.jpg"),
  "epa-vermiculite2.jpg": require("../../../assets/vermiculite/epa-vermiculite2.jpg"),
  "epa-vermiculite3.jpg": require("../../../assets/vermiculite/epa-vermiculite3.jpg"),
  "epa-vermiculite4.jpg": require("../../../assets/vermiculite/epa-vermiculite4.jpg"),
  "epa-vermiculite5.jpg": require("../../../assets/vermiculite/epa-vermiculite5.jpg"),
};

export default function VermiculiteScreen() {
  useIndex();
  const s = useSurface();
  const insets = useSafeAreaInsets();
  const [perm, requestPerm] = useCameraPermissions();
  const [camera, setCamera] = useState(false);
  const [ready, setReady] = useState(false);
  const [mine, setMine] = useState<string | null>(null);
  const [pick, setPick] = useState(1);
  const [note, setNote] = useState<string | null>(null);
  const cam = useRef<CameraView>(null);
  const row = bySlug(data.row);
  const canCamera = Platform.OS !== "web";

  // Leaving the screen deletes the reader's photo.
  useFocusEffect(useCallback(() => () => setMine((u) => { discard(u); return null; }), []));

  const open = async () => {
    setNote(null);
    const p = perm?.granted ? perm : await requestPerm();
    if (!p.granted) return setNote("Camera is off in the phone's Settings.");
    setReady(false);
    setCamera(true);
  };
  const shoot = async () => {
    if (!cam.current) return;
    const pic = await cam.current.takePictureAsync({ quality: 0.7, shutterSound: false });
    setMine((u) => { discard(u); return pic?.uri ?? null; });
    setCamera(false);
  };

  if (camera) {
    return (
      <View style={{ flex: 1, backgroundColor: FIXED.camera }}>
        <Stack.Screen options={{ title: "Your attic" }} />
        <CameraView ref={cam} style={{ flex: 1 }} facing="back" onCameraReady={() => setReady(true)} />
        <View style={[styles.bar, { paddingBottom: insets.bottom + 20 + (Platform.OS === "ios" ? 60 : 0) }]}>
          <View style={{ flexDirection: "row", gap: space.m }}>
            <View style={{ flex: 1 }}><Button title="Cancel" kind="secondary" onPress={() => setCamera(false)} /></View>
            <View style={{ flex: 2 }}><Button title={ready ? "Take photo" : "Starting camera…"} disabled={!ready} onPress={() => void shoot()} testID="vermiculite-shoot" /></View>
          </View>
        </View>
      </View>
    );
  }

  const epa = data.photos[pick];
  return (
    <Screen testID="vermiculite">
      <Stack.Screen options={{ title: "Is this vermiculite?" }} />

      {mine ? (
        <Card pad={space.m} testID="vermiculite-compare">
          <View style={{ flexDirection: "row", gap: space.s }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Image source={{ uri: mine }} style={styles.half} resizeMode="cover" accessibilityLabel="Your attic photo" />
              <Text style={type.label(s.t.muted)}>Your attic</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Image source={PHOTOS[epa.file]} style={styles.half} resizeMode="cover" accessibilityLabel={epa.caption} />
              <Text style={type.label(s.t.muted)}>US EPA</Text>
            </View>
          </View>
        </Card>
      ) : (
        <Image source={PHOTOS[epa.file]} style={{ width: "100%", height: 210, borderRadius: 20 }} resizeMode="cover" accessibilityLabel={epa.caption} testID="vermiculite-hero" />
      )}
      <Text style={type.body(13, s.t.muted)}>{`${epa.caption} · US EPA`}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
        {data.photos.map((ph, i) => (
          <Pressable key={i} onPress={() => setPick(i)} accessibilityRole="button" accessibilityLabel={ph.caption} accessibilityState={{ selected: i === pick }}>
            <Image source={PHOTOS[ph.file]} style={[styles.thumb, { borderColor: i === pick ? s.t.link : "transparent" }]} />
          </Pressable>
        ))}
      </ScrollView>

      {canCamera ? <Button title={mine ? "Take another photo" : "Compare with your attic"} onPress={() => void open()} testID="vermiculite-camera" /> : null}
      {note ? <Body size={13}>{note}</Body> : null}

      <Card>
        <Text style={type.strong(16, s.t.ink)}>{data.lead}</Text>
        {data.how.map((line, i) => (
          <View key={i} style={{ flexDirection: "row", gap: space.s }}>
            <Text style={[type.strong(14, s.t.link), { width: 18 }]}>{i + 1}</Text>
            <Body size={14} style={{ flex: 1 }}>{line}</Body>
          </View>
        ))}
      </Card>

      {row ? (
        <Card onPress={() => openEntry(row.slug)} testID="vermiculite-row" label={row.name}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.m }}>
            <Text style={[type.strong(16, s.t.ink), { flex: 1 }]}>{row.name}</Text>
            <VerdictPill band={row.band} score={row.score} small />
          </View>
          <Body size={14}>{data.verdict}</Body>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: "rgba(0,0,0,0.55)" },
  half: { width: "100%", aspectRatio: 1, borderRadius: 14 },
  thumb: { width: 76, height: 56, borderRadius: 10, borderWidth: 3 },
});
