import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const STORAGE_KEY_PREFIX = "erp_theme_preference";

function buildStorageKey(userEmail?: string) {
  return `${STORAGE_KEY_PREFIX}_${userEmail ?? "guest"}`;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const storageKey = buildStorageKey(user?.email);
    const stored = localStorage.getItem(storageKey) ?? localStorage.getItem(buildStorageKey());

    if (stored === "light" || stored === "dark") {
      setThemeState(stored);
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setThemeState(prefersDark ? "dark" : "light");
  }, [user?.email]);

  useEffect(() => {
    const storageKey = buildStorageKey(user?.email);
    localStorage.setItem(storageKey, theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
  }, [theme, user?.email]);

  const setTheme = (nextTheme: ThemeMode) => setThemeState(nextTheme);
  const toggleTheme = () => setThemeState((current) => (current === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe usarse dentro de ThemeProvider");
  }
  return context;
}
