import { useLocalSearchParams } from "expo-router";
import { openEntry, openVermiculite, openWaterFilter } from "../../../src/lib/nav";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { burdenFirst, CATEGORIES, isOlderHome, isPFAS, ROOMS, search, useIndex, type Entry } from "../../../src/lib/exposures";
import { Platform } from "react-native";
import { radius, space, type, useTheme } from "../../../src/lib/theme";
import { Body, Chip } from "../../../src/ui/primitives";
import { DOOR_PHOTO, indexRoomPhoto, rowPhoto } from "../../../src/lib/photos";
import { Grid2, PhotoTile, SectionTitle, Thumb, VerdictPill, useSurface } from "../../../src/ui/kit";

type Sort = "burden" | "cleanest";
type Pick = { kind: "all" } | { kind: "room"; room: string } | { kind: "pfas" } | { kind: "older" } | { kind: "cat"; cat: string };

/**
 * [DX-MY-HOME] 2026-11-06: no longer the landing route — "/the-index"; Food & drink rows are quiet in the default view
 * (all rooms, no search): reachable from search and the Food & drink room chip, one line points to FatTonic.
 * The Exposure Index — was the front page, route "/" ([DX-APP-READER] 2026-11-02) — offline, browsed the way the site browses it since [HOME-REFOCUS] 2026-10-31: by ROOM (the
 * export's `room` field), with the two doors as chips — PFAS at home (the site's /pfas-at-home rule) and Older homes
 * (/older-homes, rows flagged `older_home`). Highest burden first or cleanest first. Every row opens /exposure/<slug>.
 * `?room=` / `?older=1` arrive from the Home Check's room rows; `?cat=` from the lens aisles.
 * [BC-APP-LESS-TEXT] 10-31: the box, the chips, the rows — no count line, no disclosure, no "try a simpler word".
 * [DX-ROUND-1117] the round look: the two doors and the eight rooms as PHOTO tiles (Yuka/Detox Me browse by picture; ours
 * by room, the way a household thinks — Detox Me teardown), a picked room gets its photo banner, every row leads with its
 * photo or its score tile and ends with the verdict pill. Same filters, same order, same data.
 */
export default function IndexScreen() {
  const t = useTheme();
  const surf = useSurface();
  const insets = useSafeAreaInsets();
  const { list } = useIndex();
  const params = useLocalSearchParams<{ cat?: string; room?: string; older?: string; t?: string }>();
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<Pick>({ kind: "all" });
  const [sort, setSort] = useState<Sort>("burden");

  useEffect(() => {
    if (params.t === undefined) return;
    if (params.older === "1") setPick({ kind: "older" });
    else if (params.room && (ROOMS as readonly string[]).includes(params.room)) setPick({ kind: "room", room: params.room });
    else if (params.cat && (CATEGORIES as readonly string[]).includes(params.cat)) setPick({ kind: "cat", cat: params.cat });
    else setPick({ kind: "all" });
    setSort("burden");
    setQ("");
  }, [params.cat, params.room, params.older, params.t]);

  const rows = useMemo(() => {
    const base =
      pick.kind === "room" ? list.filter((e) => e.room === pick.room)
      : pick.kind === "pfas" ? list.filter(isPFAS)
      : pick.kind === "older" ? list.filter(isOlderHome)
      : pick.kind === "cat" ? list.filter((e) => e.category === pick.cat)
      : list.filter((e) => e.category !== "Food" || q.trim() !== "");
    const found = search(base, q);
    return [...found].sort(sort === "burden" ? burdenFirst : (a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }, [list, q, pick, sort]);

  const is = (p: Pick) => JSON.stringify(p) === JSON.stringify(pick);
  const toggle = (p: Pick) => setPick(is(p) ? { kind: "all" } : p);

  const browsing = pick.kind === "all" && !q.trim();
  const count = (f: (e: Entry) => boolean) => list.filter(f).length;
  const header = (
    <View style={{ gap: space.m, paddingBottom: space.m }}>
      <TextInput
        testID="index-search"
        value={q}
        onChangeText={setQ}
        placeholder="Search — a pan, tap water, a candle…"
        placeholderTextColor={t.muted}
        accessibilityLabel="Search the Exposure Index"
        clearButtonMode="while-editing"
        autoCorrect={false}
        style={[type.body(16, t.ink), { backgroundColor: surf.card, borderRadius: radius.pill, paddingHorizontal: space.l, minHeight: 48 }]}
      />
      {browsing ? (
        <>
          <Grid2>
            {[
              <PhotoTile key="pfas" testID="door-pfas" photo={DOOR_PHOTO.pfas} title="PFAS at home" figure={String(count(isPFAS))} onPress={() => toggle({ kind: "pfas" })} height={84} />,
              <PhotoTile key="older" testID="door-older" photo={DOOR_PHOTO.older} title="Older homes" figure={String(count(isOlderHome))} onPress={() => toggle({ kind: "older" })} height={84} />,
            ]}
          </Grid2>
          <SectionTitle>Rooms</SectionTitle>
          <Grid2>
            {ROOMS.filter((r) => r !== "Food & drink").map((r) => (
              <PhotoTile key={r} testID={`room-${r}`} photo={indexRoomPhoto(r)} title={r} figure={String(count((e) => e.room === r))} onPress={() => toggle({ kind: "room", room: r })} height={84} />
            ))}
          </Grid2>
          <SectionTitle>Worst first</SectionTitle>
        </>
      ) : (
        <>
          {pick.kind !== "all" ? <PickBanner pick={pick} n={rows.length} onClear={() => setPick({ kind: "all" })} /> : null}
          <View style={{ flexDirection: "row", gap: space.s, alignItems: "center" }}>
            <Chip title="Worst first" on={sort === "burden"} onPress={() => setSort("burden")} testID="sort-burden" />
            <Chip title="Cleanest" on={sort === "cleanest"} onPress={() => setSort("cleanest")} testID="sort-cleanest" />
            {pick.kind === "all" ? <Text style={[type.body(13, t.muted), { marginLeft: "auto", fontVariant: ["tabular-nums"] }]}>{rows.length}</Text> : null}
          </View>
        </>
      )}
    </View>
  );

  return (
    <FlatList
      testID="index-list"
      style={{ flex: 1, backgroundColor: surf.bg }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: space.l, paddingBottom: insets.bottom + space.xxxl + (Platform.OS === "ios" ? 60 : 0), gap: space.s }}
      data={rows}
      keyExtractor={(e) => e.slug}
      ListHeaderComponent={header}
      ListEmptyComponent={<Body muted>—</Body>}
      ListFooterComponent={browsing ? <Pressable onPress={() => toggle({ kind: "room", room: "Food & drink" })} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center", marginTop: space.s }} testID="room-Food & drink"><Text style={type.body(13, t.muted)}>Food & drink ›</Text></Pressable> : null}
      renderItem={({ item }) => <Row e={item} />}
    />
  );
}

function Row({ e }: { e: Entry }) {
  const t = useTheme();
  const surf = useSurface();
  const photo = rowPhoto(e.slug);
  return (
    <Pressable
      testID={`row-${e.slug}`}
      onPress={() => openEntry(e.slug)}
      accessibilityRole="button"
      accessibilityLabel={`${e.name}, Detox Score ${e.score}, ${e.band}`}
      style={({ pressed }) => ({ backgroundColor: surf.card, borderRadius: 20, padding: space.m, flexDirection: "row", alignItems: "center", gap: space.m, opacity: pressed ? 0.8 : 1 })}
    >
      <Thumb photo={photo} score={e.score} band={e.band} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={type.strong(15, t.ink)} numberOfLines={2}>{e.name}</Text>
        {photo != null ? <VerdictPill band={e.band} score={e.score} small /> : <VerdictPill band={e.band} small />}
      </View>
    </Pressable>
  );
}

/** The picked door or room: its photo, its name and row count, a way back to all rooms. */
function PickBanner({ pick, n, onClear }: { pick: Pick; n: number; onClear: () => void }) {
  const surf = useSurface();
  const title = pick.kind === "room" ? pick.room : pick.kind === "pfas" ? "PFAS at home" : pick.kind === "older" ? "Older homes" : pick.kind === "cat" ? pick.cat : "";
  // [DX-ROUND2-1117] each door opens its reader's tool: Older homes → "Is this vermiculite?", PFAS / Water → the filter check.
  const tool = pick.kind === "older" ? { title: "Is this vermiculite?", go: openVermiculite } : pick.kind === "pfas" || (pick.kind === "room" && pick.room === "Water") ? { title: "Is my filter certified?", go: openWaterFilter } : null;
  const photo = pick.kind === "room" ? indexRoomPhoto(pick.room) : pick.kind === "pfas" ? DOOR_PHOTO.pfas : pick.kind === "older" ? DOOR_PHOTO.older : undefined;
  return (
    <View style={{ backgroundColor: surf.card, borderRadius: 20, overflow: "hidden" }} testID="pick-banner">
      {photo != null ? <Image source={photo} style={{ width: "100%", height: 120 }} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
      <View style={{ flexDirection: "row", alignItems: "center", padding: space.m, gap: space.m }}>
        <Text style={[type.heading(20, surf.t.ink), { flex: 1 }]}>{title}</Text>
        <Text style={[type.body(13, surf.t.muted), { fontVariant: ["tabular-nums"] }]}>{n}</Text>
        <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel="All rooms" hitSlop={10} testID="room-all" style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: surf.sunk, alignItems: "center", justifyContent: "center" }}>
          <Text style={type.strong(15, surf.t.ink)}>✕</Text>
        </Pressable>
      </View>
      {tool ? (
        <Pressable onPress={tool.go} accessibilityRole="button" testID="banner-tool" style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.s, marginHorizontal: space.m, marginBottom: space.m, backgroundColor: surf.t.link, borderRadius: 999, paddingHorizontal: space.l, minHeight: 44, opacity: pressed ? 0.85 : 1 })}>
          <Text style={[type.strong(15, surf.t.onLink), { flex: 1 }]}>{tool.title}</Text>
          <Text style={type.strong(17, surf.t.onLink)}>›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
