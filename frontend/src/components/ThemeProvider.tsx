"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
const THEME_STORAGE_KEY = "investcool-theme-reader-v3";
const LEGACY_THEME_STORAGE_KEY = "investcool-theme";
const PREVIOUS_THEME_STORAGE_KEY = "investcool-theme-v2";
const PREVIOUS_READER_THEME_STORAGE_KEY = "investcool-theme-reader-v1";
const PREVIOUS_READER_THEME_V2_STORAGE_KEY = "investcool-theme-reader-v2";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
      localStorage.removeItem(PREVIOUS_THEME_STORAGE_KEY);
      localStorage.removeItem(PREVIOUS_READER_THEME_STORAGE_KEY);
      localStorage.removeItem(PREVIOUS_READER_THEME_V2_STORAGE_KEY);
      localStorage.setItem(THEME_STORAGE_KEY, "light");
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
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
