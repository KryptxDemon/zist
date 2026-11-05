import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";

import { localStorage } from "@/lib/webStorage";
import {
  darkColors,
  gradients,
  hsl,
  lightColors,
  palette,
  radius,
  shadow,
  spacing,
  fontFamily,
  fontSize,
  type ThemeColors,
  type ThemeMode,
} from "./tokens";

const THEME_KEY = "zist-theme";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  colors: ThemeColors;
  /** Shadow preset bound to the active mode. */
  shadow: (level: "sm" | "md" | "lg" | "primary" | "glow") => object;
  /** Gradient stops bound to the active mode. */
  gradient: (typeof gradients)["light"];
  /** HSL helper re-exported for ad-hoc colour mixing in screens. */
  hsl: typeof hsl;
  radius: typeof radius;
  spacing: typeof spacing;
  fontFamily: typeof fontFamily;
  fontSize: typeof fontSize;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  lockedTheme,
}: {
  children: React.ReactNode;
  /**
   * Pin the palette and make `setTheme` / `toggleTheme` no-ops.
   *
   * The web's auth pages (`Login.css` / `Signup.css`) hard-code a dark canvas
   * in their own `:root` block and never follow the app theme, so the auth
   * subtree mounts a locked provider to reproduce that.
   */
  lockedTheme?: ThemeMode;
}) {
  const systemScheme = useColorScheme();

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (lockedTheme) return lockedTheme;
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return systemScheme === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    // A locked subtree must not overwrite the user's saved preference.
    if (lockedTheme) return;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, lockedTheme]);

  // Follow the OS only while the user hasn't picked a theme explicitly.
  useEffect(() => {
    if (lockedTheme) return;
    const stored = localStorage.getItem(THEME_KEY);
    if (!stored && (systemScheme === "dark" || systemScheme === "light")) {
      setThemeState(systemScheme);
    }
  }, [systemScheme, lockedTheme]);

  const setTheme = useCallback(
    (next: ThemeMode) => {
      if (lockedTheme) return;
      setThemeState(next);
    },
    [lockedTheme],
  );
  const toggleTheme = useCallback(() => {
    if (lockedTheme) return;
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, [lockedTheme]);

  const value = useMemo<ThemeContextValue>(() => {
    const colors = theme === "dark" ? darkColors : lightColors;
    return {
      theme,
      setTheme,
      toggleTheme,
      colors,
      shadow: (level) => shadow(level, theme),
      gradient: gradients[theme],
      hsl,
      radius,
      spacing,
      fontFamily,
      fontSize,
    };
  }, [theme, setTheme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

/** Convenience: just the colour table for the active theme. */
export function useColors(): ThemeColors {
  return useTheme().colors;
}

export { palette };
export type { ThemeColors, ThemeMode };
