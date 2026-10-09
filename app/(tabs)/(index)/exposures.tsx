import { useLocalSearchParams } from "expo-router";
import { openEntry } from "../../../src/lib/nav";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { burdenFirst, CATEGORIES, search, useIndex, type Entry } from "../../../src/lib/exposures";
import { radius, space, type, useTheme } from "../../../src/lib/theme";
import { BandPill, Body, Chip, Disclosure, Label } from "../../../src/ui/primitives";

type Sort = "burden" | "cleanest";

/**
 * The Exposure Index, offline: search, one category at a time, highest burden first (the site's sort=burden) or
 * cleanest first. Every row opens the one entry page (/exposure/<slug>), the same page from every surface.
 * `?cat=` arrives from Scan's aisles and the Score tab's next step ("See the highest-burden water entries").
 */
export default function IndexScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { list, doc, from } = useIndex();
  const params = useLocalSearchParams<{ cat?: string; t?: string }>();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("burden");

  // An aisle from Scan or the Score's next step (src/lib/nav.ts openAisle): that category, highest burden first,
  // any old search cleared. `t` makes every arrival a new event.
  useEffect(() => {
    if (params.cat === undefined) return;
    setCat(params.cat && (CATEGORIES as readonly string[]).includes(params.cat) ? params.cat : null);
    setSort("burden");
    setQ("");
  }, [params.cat, params.t]);

  const rows = useMemo(() => {
    const base = cat ? list.filter((e) => e.category === cat) : list;
    const found = search(base, q);
    return [...found].sort(sort === "burden" ? burdenFirst : (a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }, [list, q, cat, sort]);

  const header = (
    <View style={{ gap: space.m, paddingBottom: space.m }}>
      <TextInput
        testID="index-search"
        value={q}
        onChangeText={setQ}
        placeholder={`Search ${list.length} entries — a pan, a candle, tap water…`}
        placeholderTextColor={t.muted}
        accessibilityLabel="Search the Exposure Index"
        clearButtonMode="while-editing"
        autoCorrect={false}
        style={[type.body(16, t.ink), { backgroundColor: t.panel, borderRadius: radius.pill, paddingHorizontal: space.l, minHeight: 48 }]}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
        <Chip title="All" on={!cat} onPress={() => setCat(null)} testID="cat-all" />
        {CATEGORIES.map((c) => (
          <Chip key={c} title={c} on={cat === c} onPress={() => setCat(cat === c ? null : c)} testID={`cat-${c}`} />
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: space.s, alignItems: "center" }}>
        <Label>Order</Label>
        <Chip title="Highest burden" on={sort === "burden"} onPress={() => setSort("burden")} testID="sort-burden" />
        <Chip title="Cleanest" on={sort === "cleanest"} onPress={() => setSort("cleanest")} testID="sort-cleanest" />
      </View>
      <Body muted size={13} style={{ fontVariant: ["tabular-nums"] }}>
        {rows.length} of {list.length} · Exposure Index {doc.version} ({from === "live" ? "updated from detoxcellence.com" : from === "cached" ? "last update saved on this phone" : "bundled with the app"})
      </Body>
      <Disclosure />
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
      ListEmptyComponent={<Body muted>No entry matches “{q}”. Try a simpler word — “pan”, “water”, “plastic”.</Body>}
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
      <Body muted size={13} lines={1}>{e.category} · {e.context}</Body>
    </Pressable>
  );
}
