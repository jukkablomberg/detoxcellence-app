import Constants from "expo-constants";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Linking, Image, Pressable, ScrollView, StyleSheet, Text, View, type TextStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Lockup } from "./Lockup";
import { openStudio, storeUrlFor } from "./links";
import { iconFor, useStudioApps, type StudioApp } from "./registry";
import type { StudioTheme } from "./theme";
import { buildLabel, testerOn, toggleTester, TESTER_TAPS } from "./updates";

/**
 * The About screen — design/APP-ABOUT-STANDARD.md § 2–3. Six blocks in a fixed order: (1) nav — the app's Stack
 * header; (2) the venture; (3) the record (optional); (4) help & legal; (5) More from JukkaBlomberg.com — live apps
 * on THIS store, ≤ 3 by affinity, icon + store subtitle, then all apps; (6) sign-off — the venture's © line +
 * version, the lockup, the lead line, one door. Block 2b (`details`, optional) carries the venture's explainers and
 * any required text verbatim. Blocks 2–4 are the venture's words; 5–6 are the studio's, identical
 * everywhere, tinted by the venture. Shared metrics (pt) are in § 3 and in `m` below.
 * Generated copy: edit projects/app-stores/studio-kit/src/, then run scripts/sync-studio-kit.py.
 */
export type AboutRow = { label: string; sub?: string; url: string; placement?: string };
export type StudioAboutProps = {
  theme: StudioTheme;
  /** the venture slug (venture.json) — drives APP-UTM and filters the app itself out of block 5 */
  slug: string;
  name: string;
  /** the venture's display treatment for its name (e.g. uppercase tracked) — its type, not the kit's */
  nameStyle?: TextStyle;
  /** ≤ 30 words, present tense */
  description: string;
  /** one muted line, only what the category requires — a store- or regulator-required text goes in `details` verbatim */
  category?: string;
  /** block 2b, optional: the venture's own "how it works" explainers and any store/regulator-required text, verbatim
   *  (APP-ABOUT-STANDARD.md § 2). Use <AboutSection> for each part so the heads match the studio blocks. */
  details?: ReactNode;
  /** Methodology (sub = "v<version> · …" read from the record) · Open data — max 2 */
  record?: AboutRow[];
  /** Support · Privacy · Terms (where one exists) · <domain> — this order, these words */
  help: AboutRow[];
  /** the venture's own web © line (FOOTER-LEGAL-STANDARD.md) */
  colophon: string;
  /** read jukkablomberg.com/data/apps.json at runtime — ONLY when the app's privacy page names jukkablomberg.com
   *  (APP-ABOUT-STANDARD.md § 4); otherwise the bundled snapshot, renewed with each build */
  liveRegistry?: boolean;
  /** the app's outbound opener (src/lib/outbound.ts openOutbound — APP-UTM on own domains) */
  open: (url: string, placement: string) => unknown;
};

/** [APP-DETEMPLATE 2026-10-21] Retired from the app (it told an App Store reviewer the apps are mass-produced); the
 *  studio story stays on jukkablomberg.com behind "Meet the studio". Empty = not rendered. */
export const LEAD_LINE = "";
const m = { gutter: 20, name: 30, body: 16, bodyLh: 24, cat: 13, catLh: 19, eyebrow: 12, eyeAbove: 34, eyeBelow: 10, row: 56, icon: 44, iconR: 10, sub: 13, subMono: 12 } as const;

export function StudioAbout(p: StudioAboutProps) {
  const t = p.theme;
  const insets = useSafeAreaInsets();
  const { apps, developerUrl } = useStudioApps(p.slug, p.liveRegistry ?? false);
  const version = Constants.expoConfig?.version ?? "";
  const [tester, setTester] = useState(false);
  const taps = useRef({ n: 0, at: 0 });
  useEffect(() => {
    void testerOn().then(setTester);
  }, []);
  // RELEASE-PIPELINE.md § 3 — TESTER_TAPS quick taps on the version line switch this phone to the preview channel.
  const onVersionTap = () => {
    const now = Date.now();
    taps.current = now - taps.current.at < 1500 ? { n: taps.current.n + 1, at: now } : { n: 1, at: now };
    if (taps.current.n >= TESTER_TAPS) {
      taps.current = { n: 0, at: 0 };
      void toggleTester().then((v) => v !== null && setTester(v));
    }
  };
  const label = buildLabel(version, tester);
  const s = makeStyles(t);
  const shown = apps.slice(0, 3);
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.ground }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: m.gutter, paddingTop: 8, paddingBottom: insets.bottom + 40 }}
    >
      <Text style={[s.name, p.nameStyle]} accessibilityRole="header">
        {p.name}
      </Text>
      <Text style={s.desc}>{p.description}</Text>
      {p.category ? <Text style={s.cat}>{p.category}</Text> : null}
      {p.details ?? null}

      {p.record && p.record.length > 0 ? (
        <Group title="The record" s={s}>
          {p.record.slice(0, 2).map((r, i) => (
            <Row key={r.label} first={i === 0} s={s} label={r.label} sub={r.sub} mono onPress={() => p.open(r.url, r.placement ?? `about-${r.label}`)} />
          ))}
        </Group>
      ) : null}

      <Group title="Help & legal" s={s}>
        {p.help.map((r, i) => (
          <Row key={r.label} first={i === 0} s={s} label={r.label} sub={r.sub} onPress={() => p.open(r.url, r.placement ?? `about-${r.label}`)} />
        ))}
      </Group>

      {shown.length > 0 ? (
        <Group title="More from JukkaBlomberg.com" s={s}>
          {shown.map((a, i) => (
            <AppRow key={a.slug} first={i === 0} s={s} app={a} from={p.slug} />
          ))}
          {developerUrl ? (
            <Row first={false} s={s} label="All apps by JukkaBlomberg.com" accent onPress={() => void Linking.openURL(developerUrl)} />
          ) : null}
        </Group>
      ) : null}

      <View style={s.sign}>
        <Pressable onPress={onVersionTap} accessible={false}>
          <Text style={s.colo}>{label ? `${p.colophon} · ${label}` : p.colophon}</Text>
        </Pressable>
        <View style={s.lock}>
          <Lockup color={t.muted} onPress={() => void openStudio(p.slug, "about-lockup")} />
        </View>
        {LEAD_LINE ? <Text style={s.lead}>{LEAD_LINE}</Text> : null}
        <Pressable onPress={() => void openStudio(p.slug, "about-studio")} accessibilityRole="link" hitSlop={12}>
          <Text style={s.door}>Meet the studio ↗</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

type S = ReturnType<typeof makeStyles>;

/** A venture section inside block 2b — the studio eyebrow over the venture's own content (APP-ABOUT-STANDARD.md § 2). */
export function AboutSection({ theme, title, children }: { theme: StudioTheme; title: string; children: ReactNode }) {
  const s = makeStyles(theme);
  return (
    <View>
      <Text style={s.eyebrow} accessibilityRole="header">
        {title}
      </Text>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

function Group({ title, s, children }: { title: string; s: S; children: ReactNode }) {
  return (
    <View>
      <Text style={s.eyebrow} accessibilityRole="header">
        {title}
      </Text>
      <View style={s.group}>{children}</View>
    </View>
  );
}

function Row(r: { s: S; first: boolean; label: string; sub?: string; mono?: boolean; accent?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={r.onPress} accessibilityRole="link" style={({ pressed }) => [r.s.row, pressed && r.s.pressed]}>
      {!r.first ? <View style={r.s.sep} /> : null}
      <View style={r.s.txt}>
        <Text style={[r.s.lab, r.accent && r.s.acc]}>{r.label}</Text>
        {r.sub ? <Text style={r.mono ? r.s.subMono : r.s.sub}>{r.sub}</Text> : null}
      </View>
      <Text style={r.s.go}>↗</Text>
    </Pressable>
  );
}

function AppRow({ s, first, app, from }: { s: S; first: boolean; app: StudioApp; from: string }) {
  const url = storeUrlFor(app, from);
  const icon = iconFor(app);
  if (!url) return null;
  return (
    <Pressable
      onPress={() => void Linking.openURL(url)}
      accessibilityRole="link"
      accessibilityLabel={`${app.venture}${app.promo ? `, ${app.promo}` : ""}, opens the store`}
      style={({ pressed }) => [s.row, pressed && s.pressed]}
    >
      {!first ? <View style={s.sep} /> : null}
      {icon ? <Image source={icon} style={s.icon} /> : <View style={s.icon} />}
      <View style={s.txt}>
        <Text style={s.lab}>{app.venture}</Text>
        {app.promo ? <Text style={s.sub}>{app.promo}</Text> : null}
      </View>
      <Text style={s.go}>↗</Text>
    </Pressable>
  );
}

function makeStyles(t: StudioTheme) {
  return StyleSheet.create({
    name: { fontFamily: t.fonts.display, fontSize: m.name, lineHeight: Math.round(m.name * 1.15), color: t.ink, marginTop: 14 },
    desc: { fontFamily: t.fonts.body, fontSize: m.body, lineHeight: m.bodyLh, color: t.ink, marginTop: 12 },
    cat: { fontFamily: t.fonts.body, fontSize: m.cat, lineHeight: m.catLh, color: t.muted, marginTop: 12 },
    eyebrow: { fontFamily: t.fonts.eyebrow, fontSize: m.eyebrow, letterSpacing: m.eyebrow * 0.14, textTransform: "uppercase", color: t.muted, marginTop: m.eyeAbove, marginBottom: m.eyeBelow, marginLeft: 4 },
    group: { backgroundColor: t.panel, borderRadius: t.radius, overflow: "hidden", ...(t.groupBorder ? { borderWidth: 1, borderColor: t.groupBorder } : null) },
    row: { minHeight: m.row, flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16 },
    pressed: { opacity: 0.6 },
    sep: { position: "absolute", top: 0, left: 16, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: t.hairline },
    icon: { width: m.icon, height: m.icon, borderRadius: m.iconR, marginRight: 12, backgroundColor: t.hairline },
    txt: { flex: 1, minWidth: 0 },
    lab: { fontFamily: t.fonts.ui, fontSize: 16, lineHeight: 21, color: t.ink },
    acc: { color: t.link },
    sub: { fontFamily: t.fonts.body, fontSize: m.sub, lineHeight: 18, color: t.muted, marginTop: 2 },
    subMono: { fontFamily: t.fonts.mono, fontSize: m.subMono, lineHeight: 17, color: t.muted, marginTop: 2 },
    go: { color: t.link, fontSize: 15, marginLeft: 10 },
    sign: { alignItems: "center", paddingTop: 44 },
    colo: { fontFamily: t.fonts.mono, fontSize: 12, color: t.muted, textAlign: "center" },
    lock: { marginTop: 40 },
    lead: { fontFamily: t.fonts.body, fontSize: 13, color: t.muted, marginTop: 14, textAlign: "center" },
    door: { fontFamily: t.fonts.ui, fontSize: 15, color: t.link, marginTop: 10 },
  });
}
