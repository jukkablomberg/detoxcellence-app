import type { ReactElement } from "react";
import { Platform } from "react-native";
import { InfoButton } from "./InfoButton";
import type { StudioTheme } from "./theme";

/**
 * Native-stack options for a tab root (design/APP-STANDARD.md § 2): the platform header, the venture's display
 * face for the title (content identity — `renderTitle` when the venture's title treatment needs more than a font,
 * e.g. uppercase tracked, or its wordmark), the "i" top right, platform back. Spread into a tab group's
 * <Stack screenOptions>. Generated copy: edit projects/app-stores/studio-kit/src/, then run scripts/sync-studio-kit.py.
 */
export function tabRootOptions(
  theme: StudioTheme,
  venture: string,
  opts: { titleSize?: number; renderTitle?: (title: string) => ReactElement } = {},
) {
  const { titleSize = 20, renderTitle } = opts;
  return {
    headerStyle: { backgroundColor: theme.ground },
    headerTintColor: theme.ink,
    headerShadowVisible: false,
    headerTitleAlign: "left" as const,
    headerTitleStyle: { fontFamily: theme.fonts.display, fontSize: Platform.OS === "ios" ? 17 : titleSize, color: theme.ink },
    ...(renderTitle ? { headerTitle: ({ children }: { children: string }) => renderTitle(children) } : null),
    headerBackButtonDisplayMode: "minimal" as const,
    headerRight: () => <InfoButton theme={theme} venture={venture} />,
    contentStyle: { backgroundColor: theme.ground },
  };
}
