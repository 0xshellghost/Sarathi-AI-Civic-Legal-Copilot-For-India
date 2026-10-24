/**
 * SARATHI - Persistent Language Selector Component
 */

import React, { useState, useRef, useEffect } from "react";
import { SUPPORTED_LANGUAGES, LanguageOption, LanguageCode } from "../lib/schemas";

interface LanguageSelectorProps {
  currentLanguage: string;
  onLanguageChange: (lang: LanguageOption) => void;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onLanguageChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected =
    SUPPORTED_LANGUAGES.find(
      (l) => l.name.toLowerCase() === currentLanguage.toLowerCase() || l.code === currentLanguage.toLowerCase()
    ) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        id="language-selector-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container transition-all text-button font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-primary"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">translate</span>
        <span className="font-semibold text-xs tracking-wide">{selected.nativeName}</span>
        <span className="text-on-surface-variant text-[11px]">({selected.name})</span>
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>

      {isOpen && (
        <div
          id="language-dropdown-menu"
          className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-24px)] rounded-xl shadow-lg bg-surface-container-lowest border border-outline-variant ring-1 ring-black/5 z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-1.5 border-b border-outline-variant/50">
            <p className="font-label-caps text-on-surface-variant text-[10px] text-secondary">
              Select Output Language
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isCurrent = lang.code === selected.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    onLanguageChange(lang);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-sm flex items-center justify-between transition-colors ${
                    isCurrent
                      ? "bg-surface-container font-semibold text-primary"
                      : "text-on-surface hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{lang.nativeName}</span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-tertiary-fixed/60 text-on-tertiary-fixed">
                        <span className="material-symbols-outlined text-[10px]">graphic_eq</span>
                        <span>Studio Voice</span>
                      </span>
                    </div>
                    <span className="text-xs text-on-surface-variant">{lang.name}</span>
                  </div>
                  {isCurrent && (
                    <span className="material-symbols-outlined text-[18px] text-primary">check</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
