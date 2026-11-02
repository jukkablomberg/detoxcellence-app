import { useLocalSearchParams } from "expo-router";
import { openEntry } from "../../../src/lib/nav";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { burdenFirst, CATEGORIES, isOlderHome, isPFAS, ROOMS, search, useIndex, type Entry } from "../../../src/lib/exposures";
import { radius, space, type, useTheme } from "../../../src/lib/theme";
import { BandPill, Body, Chip } from "../../../src/ui/primitives";

type Sort = "burden" | "cleanest";
type Pick = { kind: "all" } | { kind: "room"; room: string } | { kind: "pfas" } | { kind: "older" } | { kind: "cat"; cat: string };

/**
 * The Exposure Index — the front page, route "/" ([DX-APP-READER] 2026-11-02) — offline, browsed the way the site browses it since [HOME-REFOCUS] 2026-10-31: by ROOM (the
 * export's `room` field), with the two doors as chips — PFAS at home (the site's /pfas-at-home rule) and Older homes
 * (/older-homes, rows flagged `older_home`). Highest burden first or cleanest first. Every row opens /exposure/<slug>.
 * `?room=` / `?older=1` arrive from the Home Check's room rows; `?cat=` from the lens aisles.
 * [BC-APP-LESS-TEXT] 10-31: the box, the chips, the rows — no count line, no disclosure, no "try a simpler word".
 */
export default function IndexScreen() {
  const t = useTheme();
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
      : list;
    const found = search(base, q);
    return [...found].sort(sort === "burden" ? burdenFirst : (a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }, [list, q, pick, sort]);

  const is = (p: Pick) => JSON.stringify(p) === JSON.stringify(pick);
  const toggle = (p: Pick) => setPick(is(p) ? { kind: "all" } : p);

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
        style={[type.body(16, t.ink), { backgroundColor: t.panel, borderRadius: radius.pill, paddingHorizontal: space.l, minHeight: 48 }]}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
        <Chip title="PFAS at home" on={is({ kind: "pfas" })} onPress={() => toggle({ kind: "pfas" })} testID="door-pfas" />
        <Chip title="Older homes" on={is({ kind: "older" })} onPress={() => toggle({ kind: "older" })} testID="door-older" />
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
        <Chip title="All rooms" on={pick.kind === "all"} onPress={() => setPick({ kind: "all" })} testID="room-all" />
        {ROOMS.map((r) => (
          <Chip key={r} title={r} on={is({ kind: "room", room: r })} onPress={() => toggle({ kind: "room", room: r })} testID={`room-${r}`} />
        ))}
        {pick.kind === "cat" ? <Chip title={pick.cat} on onPress={() => setPick({ kind: "all" })} testID={`cat-${pick.cat}`} /> : null}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: space.s, alignItems: "center" }}>
        <Chip title="Worst first" on={sort === "burden"} onPress={() => setSort("burden")} testID="sort-burden" />
        <Chip title="Cleanest" on={sort === "cleanest"} onPress={() => setSort("cleanest")} testID="sort-cleanest" />
        <Text style={[type.body(13, t.muted), { marginLeft: "auto", fontVariant: ["tabular-nums"] }]}>{rows.length}</Text>
      </View>
    </View>
  );

  return (
    <FlatList
      testID="index-list"
      style={{ flex: 1, backgroundColor: t.ground }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: space.l, paddingBottom: insets.bottom + space.xxxl, gap: space.s }}
      data={rows}
      keyExtractor={(e) => e.slug}
      ListHeaderComponent={header}
      ListEmptyComponent={<Body muted>—</Body>}
      renderItem={({ item }) => <Row e={item} />}
    />
  );
}

function Row({ e }: { e: Entry }) {
  const t = useTheme();
  return (
    <Pressable
      testID={`row-${e.slug}`}
      onPress={() => openEntry(e.slug)}
      accessibilityRole="button"
      accessibilityLabel={`${e.name}, Detox Score ${e.score}, ${e.band}`}
      style={({ pressed }) => ({ backgroundColor: t.panel, borderRadius: radius.card, padding: space.l, gap: 6, opacity: pressed ? 0.8 : 1 })}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.m, alignItems: "flex-start" }}>
        <Text style={[type.strong(16, t.ink), { flex: 1 }]}>{e.name}</Text>
        <BandPill band={e.band} score={e.score} />
      </View>
      <Body muted size={13} lines={1}>{e.room}</Body>
    </Pressable>
  );
}
