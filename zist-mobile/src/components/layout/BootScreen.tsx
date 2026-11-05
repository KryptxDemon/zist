import React from "react";
import { ActivityIndicator, StyleSheet, View, useColorScheme } from "react-native";

import { hsl, palette } from "@/theme/tokens";

/**
 * The very first thing the app draws: shown by the root layout while fonts and
 * the synchronous storage mirror are still loading.
 *
 * `ThemeProvider` deliberately mounts *after* `hydrateStorage()` resolves (so it
 * can read the persisted theme preference), which means this component renders
 * outside the theme context and **must not call `useTheme()`**. Colours come
 * straight from the raw design tokens plus the OS colour scheme — the same
 * fallback `ThemeProvider` itself uses before storage is hydrated.
 *
 * The backgrounds match the `expo-splash-screen` configuration in `app.json` so
 * the splash → boot → app hand-off is seamless.
 */
export function BootScreen() {
  const isDark = useColorScheme() === "dark";

  return (
    <View style={[styles.root, { backgroundColor: isDark ? "#050b0d" : "#f1f7f9" }]}>
      <ActivityIndicator color={hsl(palette.light.primary)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
