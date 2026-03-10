"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { normalizeTheme, type AppTheme } from "@/lib/theme";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (nextTheme: AppTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  initialTheme,
  children
}: {
  initialTheme: AppTheme;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<AppTheme>(initialTheme);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
      html.style.colorScheme = "dark";
    } else {
      html.classList.remove("dark");
      html.style.colorScheme = "light";
    }
    document.cookie = `sysnova_theme=${theme}; path=/; max-age=31536000; samesite=lax`;
    localStorage.setItem("sysnova_theme", theme);
  }, [theme]);

  useEffect(() => {
    const fromStorage = normalizeTheme(localStorage.getItem("sysnova_theme"));
    if (fromStorage !== theme) {
      setThemeState(fromStorage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: (nextTheme) => setThemeState(nextTheme),
      toggleTheme: () =>
        setThemeState((prev) => (prev === "dark" ? "light" : "dark"))
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
