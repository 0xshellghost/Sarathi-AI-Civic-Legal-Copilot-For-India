/**
 * SARATHI - Theme Toggle Component
 * Supports Light, Dark, and System modes with persistent storage
 */

import React, { useState, useEffect, useRef } from "react";
import { getStoredTheme, applyTheme, initThemeListener, ThemeMode } from "../src/lib/theme";

export const ThemeToggle: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>("system");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = getStoredTheme();
    setCurrentTheme(saved);
    applyTheme(saved);

    const cleanup = initThemeListener(() => {
      // Force re-render if system preference changes
      setCurrentTheme(getStoredTheme());
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      cleanup();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectTheme = (mode: ThemeMode) => {
    setCurrentTheme(mode);
    applyTheme(mode);
    setIsOpen(false);
  };

  const getThemeIcon = () => {
    switch (currentTheme) {
      case "light":
        return "light_mode";
      case "dark":
        return "dark_mode";
      default:
        return "desktop_windows";
    }
  };

  const getThemeLabel = () => {
    switch (currentTheme) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      default:
        return "System";
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        id="theme-toggle-button"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select color theme"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest hover:bg-surface-container text-on-surface transition-all text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <span className="material-symbols-outlined text-[18px]">
          {getThemeIcon()}
        </span>
        <span className="hidden sm:inline-block">{getThemeLabel()}</span>
        <span className="material-symbols-outlined text-[14px] opacity-70">
          arrow_drop_down
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-36 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <button
            type="button"
            onClick={() => handleSelectTheme("light")}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
              currentTheme === "light"
                ? "bg-primary/10 text-primary font-semibold"
                : "text-on-surface hover:bg-surface-container"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">light_mode</span>
            <span>Light</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTheme("dark")}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
              currentTheme === "dark"
                ? "bg-primary/10 text-primary font-semibold"
                : "text-on-surface hover:bg-surface-container"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">dark_mode</span>
            <span>Dark</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTheme("system")}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
              currentTheme === "system"
                ? "bg-primary/10 text-primary font-semibold"
                : "text-on-surface hover:bg-surface-container"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">desktop_windows</span>
            <span>System</span>
          </button>
        </div>
      )}
    </div>
  );
};
