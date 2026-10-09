/**
 * The venture's skin for the studio kit — the ONLY thing a venture passes in (design/APP-STANDARD.md § 6,
 * APP-ABOUT-STANDARD.md § 3). Values come from the venture's DESIGN.md § App block via its src/lib/theme.ts.
 * Generated copy: edit projects/app-stores/studio-kit/src/, then run scripts/sync-studio-kit.py.
 */
export type StudioTheme = {
  ground: string;
  panel: string;
  ink: string;
  muted: string;
  hairline: string;
  /** the venture's accessible accent — selected tab, the door, the All-apps row, ↗ glyphs */
  link: string;
  radius: number;
  groupBorder?: string;
  fonts: { display: string; ui: string; body: string; mono: string; eyebrow: string };
};

/** "#2447F5" + 0.15 → "rgba(36,71,245,0.15)" — the Android active-indicator pill. */
export function alpha(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
