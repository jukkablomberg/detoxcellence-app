import { SymbolView } from "expo-symbols";
import { Link } from "expo-router";
import { Platform, Pressable } from "react-native";
import { symbolName } from "./icons";
import type { StudioTheme } from "./theme";

/**
 * The About entry — design/APP-STANDARD.md § 2: the platform's info icon (SF `info.circle` / Material `info`),
 * top right of every tab root, 44 pt (iOS) / 48 dp (Android) target, read as "About <Venture>". Never the word
 * "About", never a typed "i" in a drawn circle. Extends Jukka's 2026-10-01 UsePhysics decision (option a).
 * Generated copy: edit projects/app-stores/studio-kit/src/, then run scripts/sync-studio-kit.py.
 */
export function InfoButton({ theme, venture }: { theme: StudioTheme; venture: string }) {
  const size = Platform.OS === "android" ? 48 : 44;
  return (
    <Link href="/about" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`About ${venture}`}
        hitSlop={4}
        style={({ pressed }) => ({ width: size, height: size, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}
      >
        <SymbolView name={symbolName("info")} size={24} tintColor={Platform.OS === "ios" ? theme.link : theme.muted} />
      </Pressable>
    </Link>
  );
}
