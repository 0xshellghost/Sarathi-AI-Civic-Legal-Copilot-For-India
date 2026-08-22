/**
 * SARATHI Theme Manager
 * Persistent Light / Dark / System Theme handler
 */

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "sarathi_theme";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode;
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, mode);

  const root = document.documentElement;
  const isDark =
    mode === "dark" ||
    (mode === "system" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

export function initThemeListener(onThemeChange?: (isDark: boolean) => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const listener = () => {
    const currentMode = getStoredTheme();
    if (currentMode === "system") {
      applyTheme("system");
      if (onThemeChange) onThemeChange(mediaQuery.matches);
    }
  };

  mediaQuery.addEventListener("change", listener);
  return () => mediaQuery.removeEventListener("change", listener);
}
