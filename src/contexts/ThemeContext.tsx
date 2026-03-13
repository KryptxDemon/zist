import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("zist-theme") as Theme;
      if (stored === "light" || stored === "dark") {
        return stored;
      }
      // Check system preference
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove both classes first
    root.classList.remove("light", "dark");

    // Add the current theme class
    root.classList.add(theme);

    // Save to localStorage
    localStorage.setItem("zist-theme", theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem("zist-theme");
      // Only auto-switch if user hasn't manually set a preference
      if (!stored) {
        setThemeState(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
