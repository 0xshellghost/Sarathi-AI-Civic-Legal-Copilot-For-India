/**
 * SARATHI - Source Chip Component
 * Displays authoritative citation badges with trust tiers and verification dates
 */

import React, { useState } from "react";
import { Citation } from "../lib/schemas";

interface SourceChipProps {
  citation: Citation | { sourceId: string; title?: string; issuingAuthority?: string; url?: string; tier?: number };
  className?: string;
  onClick?: () => void;
}

export const SourceChip: React.FC<SourceChipProps> = ({ citation, className = "", onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const tier = citation.tier || 1;
  const tierColor =
    tier === 1
      ? "bg-tertiary-fixed text-on-tertiary-fixed border-tertiary-fixed-dim"
      : tier === 2
      ? "bg-secondary-fixed text-on-secondary-fixed border-outline-variant"
      : "bg-surface-container text-on-surface-variant border-outline-variant";

  const tierLabel =
    tier === 1
      ? "Tier 1: Statutory / Gov Portal"
      : tier === 2
      ? "Tier 2: Official Guidelines"
      : "Tier 3: Verified Civic Reference";

  const title = citation.title || citation.sourceId.replace(/_/g, " ").toUpperCase();

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        id={`source-chip-${citation.sourceId}`}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all hover:scale-[1.02] active:scale-[0.98] ${tierColor}`}
      >
        <span className="material-symbols-outlined text-[14px]">verified</span>
        <span className="truncate max-w-[190px] text-[11px] font-semibold">{title}</span>
        {citation.url && (
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="hover:text-primary inline-flex items-center ml-0.5"
            title="Open official government source"
          >
            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
          </a>
        )}
      </button>

      {showTooltip && (
        <div className="absolute bottom-full mb-1.5 left-0 w-64 p-2.5 bg-inverse-surface text-inverse-on-surface rounded-xl shadow-xl z-50 text-xs animate-in fade-in zoom-in-95 pointer-events-none">
          <div className="flex items-center justify-between mb-1">
            <span className="font-label-caps text-[10px] text-tertiary-fixed-dim tracking-wider">
              {tierLabel}
            </span>
          </div>
          <p className="font-semibold text-xs leading-snug">{title}</p>
          {citation.issuingAuthority && (
            <p className="text-[11px] text-secondary-fixed mt-1">Authority: {citation.issuingAuthority}</p>
          )}
          {citation.url && (
            <p className="text-[10px] text-tertiary-fixed truncate mt-1">{citation.url}</p>
          )}
        </div>
      )}
    </div>
  );
};
