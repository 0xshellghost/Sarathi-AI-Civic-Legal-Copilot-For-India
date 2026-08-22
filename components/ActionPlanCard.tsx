/**
 * SARATHI - Action Plan Card Component
 * Core structured deliverable for civic grievances and legal action plans
 */

import React, { useState } from "react";
import { ActionPlan, Citation, ReliabilityInfo } from "../lib/schemas";
import { SourceChip } from "./SourceChip";
import { WhySarathiSaysThis, getReliabilityBadge } from "./WhySarathiSaysThis";

interface ActionPlanCardProps {
  actionPlan: ActionPlan;
  citations?: Citation[];
  reliability?: ReliabilityInfo;
  onGenerateDocument?: () => void;
  className?: string;
}

export const ActionPlanCard: React.FC<ActionPlanCardProps> = ({
  actionPlan,
  citations = [],
  reliability,
  onGenerateDocument,
  className = "",
}) => {
  const [checkedDocs, setCheckedDocs] = useState<Record<number, boolean>>({});

  const toggleDoc = (index: number) => {
    setCheckedDocs((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const getCitationForSource = (sourceId: string): Citation | undefined => {
    return citations.find((c) => c.sourceId === sourceId);
  };

  const reliabilityBadge = getReliabilityBadge(
    reliability?.overallConfidence ?? actionPlan.confidence ?? 0.85,
    reliability?.numSourcesUsed ?? citations.length
  );

  return (
    <div
      id="action-plan-card"
      className={`rounded-2xl border-2 border-primary/20 bg-surface-container-lowest p-5 sm:p-6 shadow-sm overflow-hidden transition-all ${className}`}
    >
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-surface-container">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary text-on-primary">
            <span className="material-symbols-outlined text-[24px]">assignment_turned_in</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-primary text-[11px] font-bold">
                SARATHI CITIZEN ACTION PLAN
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-tertiary-container bg-tertiary-fixed px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[12px]">verified</span>
                Citation Verified
              </span>
            </div>
            <h3 className="text-h3 font-serif font-bold text-on-surface text-lg sm:text-xl">
              Step-by-Step Resolution Roadmap
            </h3>
          </div>
        </div>

        {/* Understandable Reliability Indicator */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${reliabilityBadge.colorClass}`}
          title={reliabilityBadge.description}
        >
          <span className="material-symbols-outlined text-[16px]">
            {reliabilityBadge.icon}
          </span>
          <div className="flex flex-col text-left">
            <span className="font-bold">{reliabilityBadge.label}</span>
            <span className="text-[10px] opacity-80">
              {citations.length} Official Statute{citations.length > 1 ? "s" : ""} Grounded
            </span>
          </div>
        </div>
      </div>

      {/* Situation Summary */}
      <div className="mt-4 p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
        <strong className="text-on-surface font-semibold">Matter: </strong>
        {actionPlan.situation}
      </div>

      {/* Expandable 'Why SARATHI says this' Section */}
      {citations.length > 0 && (
        <WhySarathiSaysThis
          citations={citations}
          reliability={reliability}
          defaultExpanded={false}
          className="mt-4"
        />
      )}

      {/* Section 1: Recognized Rights & Official Basis */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm sm:text-base text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">gavel</span>
            Statutory Rights & Legal Remedies
          </h4>
          <span className="text-[11px] font-label-caps text-on-surface-variant">
            Official Information
          </span>
        </div>

        <div className="space-y-3">
          {actionPlan.rightsOrOptions.map((item, idx) => {
            const cite = getCitationForSource(item.sourceId);
            const isAIGuidance = item.sourceId === "ai_guidance_unverified";

            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition-all ${
                  isAIGuidance
                    ? "bg-surface-container/50 border-outline-variant/40"
                    : "bg-surface-container-lowest border-outline-variant hover:border-primary/40 shadow-xs"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <h5 className="font-semibold text-sm text-on-surface">{item.title}</h5>
                  {isAIGuidance ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant">
                      <span className="material-symbols-outlined text-[12px]">smart_toy</span>
                      AI Guidance
                    </span>
                  ) : (
                    cite && <SourceChip citation={cite} />
                  )}
                </div>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  {item.explanation}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Sequential Step-by-Step Action Checklist */}
      <div className="mt-6">
        <h4 className="font-semibold text-sm sm:text-base text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">format_list_numbered</span>
          Prescribed Steps to Take
        </h4>

        <div className="space-y-2.5">
          {actionPlan.steps.map((step) => (
            <div
              key={step.order}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-on-primary font-bold text-xs flex items-center justify-center mt-0.5">
                {step.order}
              </div>
              <div className="flex-1 text-xs sm:text-sm text-on-surface leading-relaxed font-medium">
                {step.action}
                {step.isOfficial && (
                  <span className="ml-2 inline-flex items-center text-[10px] font-bold text-tertiary-container bg-tertiary-fixed px-1.5 py-0.2 rounded">
                    Official Procedure
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Documents Required Checklist */}
      {actionPlan.documentsNeeded && actionPlan.documentsNeeded.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold text-sm sm:text-base text-on-surface mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary">inventory_2</span>
            Required Supporting Documents Checklist
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {actionPlan.documentsNeeded.map((doc, idx) => {
              const isChecked = checkedDocs[idx] || false;
              return (
                <label
                  key={idx}
                  onClick={() => toggleDoc(idx)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                    isChecked
                      ? "bg-tertiary-fixed/30 border-tertiary-fixed-dim text-on-surface"
                      : "bg-surface-container-lowest border-outline-variant hover:bg-surface-container-low text-on-surface-variant"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                  />
                  <span className={`text-xs font-medium ${isChecked ? "line-through opacity-80" : ""}`}>
                    {doc}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 4: Public Authority Contact & Escalation */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Authority Card */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant flex flex-col justify-between">
          <div>
            <span className="font-label-caps text-[10px] text-on-surface-variant text-secondary">
              Competent Public Authority
            </span>
            <h5 className="font-bold text-sm text-on-surface mt-1">{actionPlan.authority.name}</h5>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Jurisdiction: {actionPlan.authority.jurisdiction}
            </p>
            {actionPlan.authority.address && (
              <p className="text-[11px] text-on-surface-variant/80 mt-1">{actionPlan.authority.address}</p>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-outline-variant/40 flex items-center justify-between">
            {actionPlan.authority.portalUrl ? (
              <a
                href={actionPlan.authority.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <span>Open Official Portal</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            ) : (
              <span className="text-[11px] text-on-surface-variant">Central / District Office</span>
            )}
            <SourceChip citation={{ sourceId: actionPlan.authority.sourceId }} />
          </div>
        </div>

        {/* Escalation Path Card */}
        <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-error">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span className="font-label-caps text-[10px] font-bold">
                Escalation if Unanswered
              </span>
            </div>
            <h5 className="font-semibold text-xs text-on-surface mt-1.5 leading-snug">
              Statutory Timeframe & Next Appeal Level
            </h5>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              {actionPlan.escalationIfNoResponse}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-outline-variant/40 flex items-center justify-between text-[11px] text-on-surface-variant">
            <span>RTI: 30 Days | CPGRAMS: 30 Days</span>
            <span className="text-primary font-semibold">Statutory Right</span>
          </div>
        </div>
      </div>

      {/* Action Footer Button (Direct Document Generator Launch) */}
      {onGenerateDocument && (
        <div className="mt-6 pt-4 border-t border-surface-container flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-on-surface-variant">
            SARATHI can generate a formal statutory application or legal notice directly from these collected facts.
          </p>
          <button
            id="plan-generate-doc-btn"
            type="button"
            onClick={onGenerateDocument}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary font-button hover:opacity-90 active:scale-95 transition-all text-xs sm:text-sm font-semibold shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
            Generate Formal Application (.docx & .pdf)
          </button>
        </div>
      )}
    </div>
  );
};
