/**
 * One meaning, one glyph, in every studio app — design/APP-STANDARD.md § 3. SF Symbols on iOS
 * (default → selected), Material Symbols on Android. Every name validated 2026-10-07 against the installed
 * sf-symbols-typescript + expo-symbols symbols.json; none needs more than SF Symbols 4 (iOS 16).
 * A new meaning is added to § 3 AND here first — never a one-off glyph in one app.
 * Generated copy: edit projects/app-stores/studio-kit/src/, then run scripts/sync-studio-kit.py.
 */
export const ICONS = {
  home: { sf: { default: "house", selected: "house.fill" }, md: "home" },
  index: { sf: "chart.xyaxis.line", md: "show_chart" },
  companies: { sf: { default: "building.2", selected: "building.2.fill" }, md: "domain" },
  calendar: { sf: "calendar", md: "calendar_month" },
  issues: { sf: { default: "newspaper", selected: "newspaper.fill" }, md: "newspaper" },
  alerts: { sf: { default: "bell", selected: "bell.fill" }, md: "notifications" },
  forecasts: { sf: "chart.line.uptrend.xyaxis", md: "trending_up" },
  leaders: { sf: { default: "trophy", selected: "trophy.fill" }, md: "trophy" },
  me: { sf: { default: "person.crop.circle", selected: "person.crop.circle.fill" }, md: "account_circle" },
  atlas: { sf: { default: "map", selected: "map.fill" }, md: "map" },
  nearby: { sf: { default: "location", selected: "location.fill" }, md: "near_me" },
  scan: { sf: "camera.viewfinder", md: "photo_camera" },
  foods: { sf: "fork.knife", md: "restaurant" },
  score: { sf: "gauge.medium", md: "speed" },
  history: { sf: "clock.arrow.circlepath", md: "history" },
  tips: { sf: { default: "lightbulb", selected: "lightbulb.fill" }, md: "lightbulb" },
  info: { sf: "info.circle", md: "info" },
  search: { sf: "magnifyingglass", md: "search" },
  share: { sf: "square.and.arrow.up", md: "share" },
  save: { sf: { default: "star", selected: "star.fill" }, md: "star" },
  filter: { sf: "line.3.horizontal.decrease", md: "filter_list" },
  add: { sf: "plus", md: "add" },
  close: { sf: "xmark", md: "close" },
} as const;

export type IconMeaning = keyof typeof ICONS;

/** The plain-string pair for a SymbolView: { ios, android, web }. */
export function symbolName(meaning: IconMeaning) {
  const i = ICONS[meaning];
  const ios = typeof i.sf === "string" ? i.sf : i.sf.default;
  return { ios, android: i.md, web: i.md } as const;
}
