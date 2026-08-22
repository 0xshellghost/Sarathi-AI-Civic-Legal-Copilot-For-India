/**
 * SARATHI - Problem Analysis Card Component
 * Visual breakdown of problem classification, detected rights, and confidence
 */

import React from "react";
import { ProblemAnalysis } from "../lib/schemas";
import { SourceChip } from "./SourceChip";

interface ProblemAnalysisCardProps {
  analysis: ProblemAnalysis;
  onActionClick?: (action: string) => void;
  className?: string;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  rti: { label: "RTI Application (Right to Information)", icon: "article" },
  consumer_rights: { label: "Consumer Rights & Grievance", icon: "shopping_bag" },
  tenant_rights: { label: "Tenant & Housing Rights", icon: "home" },
  workplace_rights: { label: "Workplace & Labour Rights", icon: "work" },
  welfare_schemes: { label: "Government Welfare Scheme", icon: "account_balance" },
  government_services: { label: "Government Public Services", icon: "assured_workload" },
  documentation: { label: "Certificates & Identity Docs", icon: "badge" },
  public_grievances: { label: "Public Grievance (CPGRAMS)", icon: "report_problem" },
  municipal_issues: { label: "Municipal & Civic Utilities", icon: "location_city" },
  education: { label: "Education & Scholarships", icon: "school" },
  healthcare_schemes: { label: "Healthcare & Insurance", icon: "health_and_safety" },
  financial_social_welfare: { label: "Financial & Social Support", icon: "payments" },
  identity_documents: { label: "Aadhaar / Identity Documents", icon: "fingerprint" },
  other: { label: "Civic & Administrative Inquiries", icon: "info" },
};

export const ProblemAnalysisCard: React.FC<ProblemAnalysisCardProps> = ({
  analysis,
  onActionClick,
  className = "",
}) => {
  const catInfo = CATEGORY_LABELS[analysis.category] || {
    label: analysis.category.replace(/_/g, " ").toUpperCase(),
    icon: "gavel",
  };

  const confidencePct = Math.round((analysis.confidence || 0.85) * 100);

  const urgencyColors = {
    high: "bg-error-container text-on-error-container border-error/20",
    medium: "bg-secondary-fixed text-on-secondary-fixed border-outline-variant",
    low: "bg-surface-container text-on-surface-variant border-outline-variant",
  };

  return (
    <div
      id="problem-analysis-card"
      className={`rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-xs transition-all hover:shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-surface-container">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-surface-container text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">{catInfo.icon}</span>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-on-surface-variant text-[11px] text-secondary">
                Classification
              </span>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                  urgencyColors[analysis.urgency || "medium"]
                }`}
              >
                {analysis.urgency || "medium"} Urgency
              </span>
            </div>
            <h4 className="font-semibold text-on-surface text-base sm:text-lg leading-tight mt-0.5">
              {catInfo.label}
            </h4>
          </div>
        </div>

        {/* Confidence & Language Badges */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-label-caps text-on-surface-variant">Confidence</span>
              <span className="text-xs font-bold text-on-tertiary-fixed-variant bg-tertiary-fixed px-2 py-0.5 rounded-full">
                {confidencePct}%
              </span>
            </div>
            <span className="text-[10px] text-on-surface-variant mt-0.5">
              Detected: {analysis.languageDetected} ({analysis.scriptDetected})
            </span>
          </div>
        </div>
      </div>

      {/* Problem Summary */}
      <div className="mt-4">
        <p className="text-body text-on-surface-variant text-sm sm:text-base leading-relaxed">
          {analysis.problemSummary}
        </p>
      </div>

      {/* Jurisdiction / Location */}
      {(analysis.location?.state || analysis.location?.city) && (
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container text-xs font-medium text-on-surface">
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">location_on</span>
          <span>
            Jurisdiction: {[analysis.location.city, analysis.location.district, analysis.location.state].filter(Boolean).join(", ")}
          </span>
        </div>
      )}

      {/* Possible Rights */}
      {analysis.possibleRights && analysis.possibleRights.length > 0 && (
        <div className="mt-4">
          <p className="font-label-caps text-on-surface-variant text-[11px] mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-primary">balance</span>
            Applicable Rights & Legal Remedies (Hedged)
          </p>
          <div className="space-y-1.5">
            {analysis.possibleRights.map((right, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs sm:text-sm text-on-surface p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40"
              >
                <span className="material-symbols-outlined text-[16px] text-tertiary-container mt-0.5">
                  check_circle
                </span>
                <span className="font-medium leading-snug">{right}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Information / Targeted Follow-ups */}
      {analysis.requiredInformation && analysis.requiredInformation.length > 0 && (
        <div className="mt-4 pt-3 border-t border-surface-container">
          <p className="font-label-caps text-on-surface-variant text-[11px] mb-1.5 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-secondary">help_outline</span>
            Missing Key Details to Complete Action Plan
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-on-surface-variant">
            {analysis.requiredInformation.map((q, idx) => (
              <li key={idx} className="leading-normal">{q}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Action Button */}
      {onActionClick && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {analysis.category === "rti" && (
            <button
              id="action-draft-rti-btn"
              type="button"
              onClick={() => onActionClick("draft_rti")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary font-button hover:opacity-90 active:scale-95 transition-all text-xs font-semibold shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">draw</span>
              Generate RTI Application Draft (.docx / .pdf)
            </button>
          )}
          {(analysis.category === "welfare_schemes" || analysis.category === "healthcare_schemes" || analysis.category === "financial_social_welfare") && (
            <button
              id="action-check-scheme-btn"
              type="button"
              onClick={() => onActionClick("check_scheme")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary font-button hover:opacity-90 active:scale-95 transition-all text-xs font-semibold shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">fact_check</span>
              Check Scheme Eligibility Criteria
            </button>
          )}
        </div>
      )}
    </div>
  );
};
