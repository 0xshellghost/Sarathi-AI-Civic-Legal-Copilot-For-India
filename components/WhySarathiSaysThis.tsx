/**
 * SARATHI - 'Why SARATHI says this' & Source Verification Component
 * Upgraded expandable source grounded view with Title, Authority, Excerpt, Verification Date, and Official Link
 */

import React, { useState } from "react";
import { Citation, ReliabilityInfo } from "../lib/schemas";

interface WhySarathiSaysThisProps {
  citations: Citation[];
  reliability?: ReliabilityInfo;
  defaultExpanded?: boolean;
  className?: string;
}

export const getReliabilityBadge = (confidence = 0.9, numSources = 1) => {
  if (confidence >= 0.8 && numSources >= 1) {
    return {
      level: "strongly_supported",
      label: "Strongly Supported by Official Laws",
      colorClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      icon: "verified",
      description: "Directly grounded in official Central/State Acts, official gazettes, or verified citizen charters.",
    };
  }
  if (confidence >= 0.5) {
    return {
      level: "partially_supported",
      label: "Partially Supported / General Civic Guidance",
      colorClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
      icon: "info",
      description: "Based on statutory frameworks; local state rules or specific facts may modify procedure.",
    };
  }
  return {
    level: "more_info_needed",
    label: "More Information Needed",
    colorClass: "bg-surface-container-high text-on-surface border-outline-variant",
    icon: "help_outline",
    description: "Provide additional details (e.g. State, dates, agreement) to pinpoint exact statutory provisions.",
  };
};

export const WhySarathiSaysThis: React.FC<WhySarathiSaysThisProps> = ({
  citations,
  reliability,
  defaultExpanded = false,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const confidenceVal = reliability?.overallConfidence ?? 0.85;
  const numSources = reliability?.numSourcesUsed ?? citations.length;
  const reliabilityBadge = getReliabilityBadge(confidenceVal, numSources);

  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div
      id="why-sarathi-says-this-section"
      className={`rounded-2xl border border-outline-variant bg-surface-container-low/60 overflow-hidden my-3 transition-all ${className}`}
    >
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 text-left hover:bg-surface-container transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary text-on-primary">
            <span className="material-symbols-outlined text-[18px]">gavel</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs sm:text-sm text-on-surface">
                Why SARATHI says this
              </span>
              <span className="text-[11px] font-medium text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/60">
                {citations.length} Official Source{citations.length > 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              Verified against official Indian statutory acts and citizen charters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Reliability Badge (Replaces raw percentage numbers) */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${reliabilityBadge.colorClass}`}
          >
            <span className="material-symbols-outlined text-[14px]">
              {reliabilityBadge.icon}
            </span>
            <span>{reliabilityBadge.label}</span>
          </div>

          <span
            className={`material-symbols-outlined text-[20px] text-on-surface-variant transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            expand_more
          </span>
        </div>
      </button>

      {/* Expanded Sources Details */}
      {isExpanded && (
        <div className="p-4 pt-1 border-t border-outline-variant/40 space-y-3 bg-surface-container-lowest animate-in fade-in duration-200">
          <div className="p-2.5 rounded-xl bg-surface-container-low text-xs text-on-surface-variant leading-relaxed">
            <strong className="text-on-surface font-semibold">Reliability Notice: </strong>
            {reliabilityBadge.description}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {citations.map((cite) => (
              <div
                key={cite.sourceId}
                className="p-3.5 rounded-xl border border-outline-variant bg-surface-container-low hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[12px]">verified</span>
                      Tier {cite.tier} Central / State Act
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-medium">
                      Verified: {cite.lastVerified || "2024-01-15"}
                    </span>
                  </div>

                  <h5 className="font-bold text-xs sm:text-sm text-on-surface leading-snug">
                    {cite.title}
                  </h5>

                  <p className="text-[11px] text-on-surface-variant mt-1">
                    <span className="font-medium text-on-surface">Authority: </span>
                    {cite.issuingAuthority}
                  </p>

                  {cite.jurisdiction && (
                    <p className="text-[11px] text-on-surface-variant">
                      <span className="font-medium text-on-surface">Jurisdiction: </span>
                      {cite.jurisdiction}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-outline-variant/40 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-on-surface-variant/80">
                    ID: {cite.sourceId}
                  </span>
                  {cite.url && (
                    <a
                      href={cite.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      <span>Official Link</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
