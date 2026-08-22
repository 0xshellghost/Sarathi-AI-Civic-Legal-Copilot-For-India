import React from "react";

export type ResponseMode = "basic" | "advanced";

interface ResponseModeToggleProps {
  mode: ResponseMode;
  onChange: (newMode: ResponseMode) => void;
  isRegenerating?: boolean;
  disabled?: boolean;
  className?: string;
}

export const ResponseModeToggle: React.FC<ResponseModeToggleProps> = ({
  mode,
  onChange,
  isRegenerating = false,
  disabled = false,
  className = "",
}) => {
  return (
    <div
      id="response-mode-toggle-container"
      className={`inline-flex items-center gap-1.5 p-1 rounded-xl bg-surface-container border border-outline-variant text-xs shadow-2xs ${className}`}
      role="group"
      aria-label="Response detail mode selection"
    >
      <span className="text-[11px] font-semibold text-on-surface-variant px-1.5 hidden sm:inline select-none">
        Mode:
      </span>

      {/* Basic Mode Button */}
      <button
        id="mode-toggle-basic"
        type="button"
        role="button"
        aria-pressed={mode === "basic"}
        disabled={disabled || isRegenerating}
        onClick={() => {
          if (mode !== "basic") onChange("basic");
        }}
        title="Basic Mode: Quick and concise guidance (120–220 words)"
        className={`relative inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          mode === "basic"
            ? "bg-primary text-on-primary shadow-xs font-semibold"
            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
        }`}
      >
        <span className="material-symbols-outlined text-[15px]">bolt</span>
        <span>BASIC</span>
      </button>

      {/* Advanced Mode Button */}
      <button
        id="mode-toggle-advanced"
        type="button"
        role="button"
        aria-pressed={mode === "advanced"}
        disabled={disabled || isRegenerating}
        onClick={() => {
          if (mode !== "advanced") onChange("advanced");
        }}
        title="Advanced Mode: Detailed explanation, statutory citations and comprehensive action plan"
        className={`relative inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          mode === "advanced"
            ? "bg-primary text-on-primary shadow-xs font-semibold"
            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
        }`}
      >
        <span className="material-symbols-outlined text-[15px]">menu_book</span>
        <span>ADVANCED</span>
      </button>

      {/* Subtle Regeneration Spinner */}
      {isRegenerating && (
        <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium pl-1 pr-1.5 animate-in fade-in">
          <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="hidden md:inline">Regenerating in {mode === "basic" ? "Basic" : "Advanced"}...</span>
        </span>
      )}
    </div>
  );
};
