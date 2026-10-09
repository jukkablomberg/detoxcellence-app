import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Image, Linking, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Lockup } from "./Lockup";

/**
 * The launch — design/APP-STANDARD.md § 1. The native splash (mark only, 160 pt, the app ground) is HELD until the
 * app can draw; the brand moment's first frame is the same picture (same ground, same mark file, same 160 pt, same
 * centre), so the eye sees one image settle, not two screens. Then the lockup fades in at the bottom (200 ms, no
 * movement). It ends when the first screen is ready — never before 600 ms, never after 1,000 ms — with a 200 ms
 * cross-fade. Cold start only (this component mounts once per process); skipped on a deep link or an app-specific
 * skip (a notification open). Reduce Motion: cuts, no fades. Replaces the fixed 700 ms wait (census § 0).
 * Generated copy: edit projects/app-stores/studio-kit/src/, then run scripts/sync-studio-kit.py.
 */
export const LAUNCH = { markPt: 160, minMs: 600, maxMs: 1000, lockupFadeMs: 200, exitMs: 200, lockupBottom: 32 } as const;

let held = false;
/** Call once at module scope in app/_layout.tsx. */
export function holdNativeSplash(): void {
  if (held) return;
  held = true;
  void SplashScreen.preventAutoHideAsync().catch(() => undefined);
}

/** A launch URL that points INTO the app (not just its root) — the reader asked for a place, not a moment. */
export function isDeepLink(url: string | null): boolean {
  if (!url) return false;
  const rest = url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, "").split(/[?#]/)[0];
  return rest.replace(/^\/+/, "").replace(/^--\/?/, "").length > 0;
}

type Props = {
  venture: string;
  ground: string;
  /** the SAME file the native splash shows (assets/splash-mark.png) — one asset, no second mark */
  mark: ImageSourcePropType;
  /** the venture's muted text colour (ENDORSEMENT-SYSTEM.md § 2.3) */
  lockupColor: string;
  /** the first screen can be drawn (fonts in + whatever cached data the app waits for) */
  ready: boolean;
  /** an app-specific reason to go straight to the content (e.g. opened from a notification) */
  skip?: () => Promise<boolean>;
  onDone: () => void;
};

export function BrandMoment({ venture, ground, mark, lockupColor, ready, skip, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"deciding" | "show" | "done">("deciding");
  const shownAt = useRef(0);
  const reduce = useRef(false);
  const exiting = useRef(false);
  const lockup = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  const finish = () => {
    setMode("done");
    onDone();
  };
  const exit = () => {
    if (exiting.current) return;
    exiting.current = true;
    Animated.timing(fade, { toValue: 0, duration: reduce.current ? 0 : LAUNCH.exitMs, useNativeDriver: true }).start(finish);
  };

  useEffect(() => {
    let alive = true;
    Promise.all([
      Linking.getInitialURL().catch(() => null),
      skip ? skip().catch(() => false) : Promise.resolve(false),
      AccessibilityInfo.isReduceMotionEnabled().catch(() => false),
    ]).then(([url, extra, rm]) => {
      if (!alive) return;
      reduce.current = !!rm;
      if (isDeepLink(url) || extra) {
        void SplashScreen.hideAsync().catch(() => undefined);
        finish();
      } else setMode("show");
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (mode !== "show") return;
    const raf = requestAnimationFrame(() => {
      shownAt.current = Date.now();
      void SplashScreen.hideAsync().catch(() => undefined);
      Animated.timing(lockup, { toValue: 1, duration: reduce.current ? 0 : LAUNCH.lockupFadeMs, useNativeDriver: true }).start();
    });
    const max = setTimeout(exit, LAUNCH.maxMs);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(max);
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "show" || !ready) return;
    const since = shownAt.current ? Date.now() - shownAt.current : 0;
    const t = setTimeout(exit, Math.max(0, LAUNCH.minMs - since));
    return () => clearTimeout(t);
  }, [mode, ready]);

  if (mode === "done") return null;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: ground, opacity: fade }]}
      accessible
      accessibilityLabel={`${venture}, built by JukkaBlomberg.com`}
    >
      <View style={styles.centre}>
        <Image source={mark} style={styles.mark} resizeMode="contain" />
      </View>
      <Animated.View style={[styles.lockup, { bottom: insets.bottom + LAUNCH.lockupBottom, opacity: lockup }]}>
        <Lockup color={lockupColor} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: "center", justifyContent: "center" },
  mark: { width: LAUNCH.markPt, height: LAUNCH.markPt },
  lockup: { position: "absolute", left: 0, right: 0, alignItems: "center" },
});
