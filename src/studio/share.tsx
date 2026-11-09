import { SymbolView } from "expo-symbols";
import { Platform, Pressable, Share } from "react-native";
import { symbolName } from "./icons";
import type { StudioTheme } from "./theme";

/**
 * [KIT-SHARE-RECORD 2026-11-06] The one share helper — design/APP-SHARING-PLAN.md § 2 (rules 1, 2, 5–8) and § 4 wave 0.
 * What travels is the record's PUBLIC page (the site serves its dated og:image, so chats unfurl a card and the
 * recipient needs no app) plus one plain line: figure · date · venture. Never the reader's own data (watchlist,
 * holdings, health or home answers) — the caller passes only public record fields. RN `Share` only (text + URL):
 * no native module, so it ships as a $0 OTA. `?s=app` lets the site count landings from app shares (rule 7).
 * Header placement: the record screen's headerRight, the platform share glyph (APP-STANDARD § 3 `share`).
 * Generated copy: edit projects/app-stores/studio-kit/src/, then run scripts/sync-studio-kit.py.
 */
export type ShareRecord = { url: string; text: string; title?: string };
export type ShareOutcome = "shared" | "dismissed" | "failed";

/** Adds `s=app` to the query (before any #fragment), once. */
export function withAppSource(url: string): string {
  const [base, hash] = url.split("#");
  if (/[?&]s=app(&|$)/.test(base)) return url;
  return `${base}${base.includes("?") ? "&" : "?"}s=app${hash !== undefined ? `#${hash}` : ""}`;
}

/** Opens the OS share sheet. iOS takes the URL as its own item; Android only reads `message`, so the URL goes inside it. */
export async function shareRecord(r: ShareRecord, onResult?: (o: ShareOutcome) => void): Promise<ShareOutcome> {
  const url = withAppSource(r.url);
  let outcome: ShareOutcome;
  try {
    const res = await Share.share(
      Platform.OS === "ios" ? { message: r.text, url, title: r.title } : { message: `${r.text}\n${url}`, title: r.title },
      { dialogTitle: r.title, subject: r.title },
    );
    outcome = res.action === Share.dismissedAction ? "dismissed" : "shared";
  } catch {
    outcome = "failed";
  }
  onResult?.(outcome);
  return outcome;
}

/** The header share button: 44 pt (iOS) / 48 dp (Android) target, tinted like the info button. */
export function ShareButton({ theme, label, record, onResult }: { theme: StudioTheme; label: string; record: ShareRecord; onResult?: (o: ShareOutcome) => void }) {
  const size = Platform.OS === "android" ? 48 : 44;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={() => void shareRecord(record, onResult)}
      style={({ pressed }) => ({ width: size, height: size, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}
    >
      <SymbolView name={symbolName("share")} size={22} tintColor={Platform.OS === "ios" ? theme.link : theme.muted} />
    </Pressable>
  );
}
