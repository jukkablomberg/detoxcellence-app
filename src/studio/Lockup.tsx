import { Pressable, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { LOCKUP_XML } from "./lockup-xml";

/**
 * "Built by JukkaBlomberg.com" — drawn from the ONE master (projects/jukkablomberg/brand/assets/masters/
 * jukkablomberg-endorsement-lockup.svg, glyph outlines, currentColor), the same shape the 15 websites carry.
 * Native size 180 × 42, never scaled (ENDORSEMENT-SYSTEM.md § 2.2); ink = the venture's muted text colour (§ 2.3).
 * Retires the five per-app Text re-implementations (APP-ABOUT-STANDARD.md § 0).
 * Generated copy: edit projects/app-stores/studio-kit/src/, then run scripts/sync-studio-kit.py.
 */
const APP_XML = LOCKUP_XML.replace(/\sopacity="0?\.\d+"/g, "");

export const LOCKUP_SIZE = { width: 180, height: 42 } as const;

export function Lockup({ color, onPress }: { color: string; onPress?: () => void }) {
  // [KIT-LOCKUP-CONTRAST 2026-11-06] the master's "Built by" (0.5) and wordmark (0.7) opacities fall to ~2:1 on an app
  // ground once multiplied with the muted ink (critics on all six apps, 11-04 + 11-06). In apps the ink alone carries the
  // hierarchy: both lines at full opacity in the venture's muted colour (≥4.5:1 by that token's own contract).
  const art = <SvgXml xml={APP_XML} width={LOCKUP_SIZE.width} height={LOCKUP_SIZE.height} color={color} />;
  if (!onPress) {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel="Built by JukkaBlomberg.com">
        {art}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel="Built by JukkaBlomberg.com"
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 1 : 0.85 })}
    >
      {art}
    </Pressable>
  );
}
