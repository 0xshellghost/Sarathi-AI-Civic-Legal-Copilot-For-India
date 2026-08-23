/**
 * SARATHI - Eligibility Flow Component
 * Step-by-step welfare scheme assessment with real-time deterministic verdict & document requirements
 */

import React, { useState, useEffect } from "react";
import { WelfareScheme, EligibilityAnalysis, EligibilityResultVerdict } from "../lib/schemas";
import { evaluateSchemeEligibility } from "../services/eligibilityEngine";
import { SourceChip } from "./SourceChip";

interface EligibilityFlowProps {
  schemes: WelfareScheme[];
  selectedSchemeId?: string;
  onComplete?: (result: EligibilityAnalysis) => void;
  className?: string;
}

export const EligibilityFlow: React.FC<EligibilityFlowProps> = ({
  schemes,
  selectedSchemeId,
  onComplete,
  className = "",
}) => {
  const [activeSchemeId, setActiveSchemeId] = useState<string>(
    selectedSchemeId || (schemes[0]?.schemeId ?? "pm_kisan")
  );
  const [formData, setFormData] = useState<Record<string, any>>({
    age: "",
    familyIncome: "",
    gender: "",
    category: "",
  });

  const [analysis, setAnalysis] = useState<EligibilityAnalysis | null>(null);

  const currentScheme = schemes.find((s) => s.schemeId === activeSchemeId) || schemes[0];

  useEffect(() => {
    if (currentScheme) {
      const res = evaluateSchemeEligibility(currentScheme, formData);
      setAnalysis(res);
      if (onComplete) onComplete(res);
    }
  }, [activeSchemeId, formData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getVerdictBadge = (verdict: EligibilityResultVerdict) => {
    switch (verdict) {
      case "likely_eligible":
        return {
          label: "Likely Eligible",
          bgColor: "bg-tertiary-fixed text-on-tertiary-fixed border-tertiary-fixed-dim",
          icon: "check_circle",
        };
      case "likely_not_eligible":
        return {
          label: "Likely Ineligible (Disqualification Triggered)",
          bgColor: "bg-error-container text-on-error-container border-error/30",
          icon: "cancel",
        };
      case "insufficient_information":
      default:
        return {
          label: "More Information Needed",
          bgColor: "bg-secondary-fixed text-on-secondary-fixed border-outline-variant",
          icon: "help",
        };
    }
  };

  const verdictBadge = analysis ? getVerdictBadge(analysis.eligibilityResult) : null;

  return (
    <div
      id="eligibility-flow-container"
      className={`rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-surface-container">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-secondary text-on-secondary">
            <span className="material-symbols-outlined text-[24px]">fact_check</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-secondary text-[11px] font-bold">
                DETERMINISTIC CRITERIA ENGINE
              </span>
              <span className="text-[10px] font-bold text-on-secondary-fixed-variant bg-secondary-fixed px-2 py-0.5 rounded-full">
                Zero Hallucination
              </span>
            </div>
            <h3 className="font-serif font-bold text-on-surface text-lg sm:text-xl">
              Government Welfare Scheme Eligibility Evaluator
            </h3>
          </div>
        </div>

        {/* Scheme Selector Tabs / Dropdown */}
        <select
          id="scheme-select-dropdown"
          value={activeSchemeId}
          onChange={(e) => setActiveSchemeId(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-outline-variant bg-surface-container text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {schemes.map((s) => (
            <option key={s.schemeId} value={s.schemeId}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Scheme Description Banner */}
      {currentScheme && (
        <div className="mt-4 p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/40 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex-1 min-w-60">
            <span className="font-semibold text-on-surface">{currentScheme.name}</span>
            <p className="text-on-surface-variant mt-0.5">{currentScheme.description}</p>
          </div>
          <SourceChip citation={{ sourceId: currentScheme.sourceId, issuingAuthority: currentScheme.authority }} />
        </div>
      )}

      {/* Assessment Question Grid */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: General Demographics */}
        <div className="space-y-3.5 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant">
          <h4 className="font-semibold text-xs text-secondary uppercase tracking-wider">
            1. Applicant Demographics & Household
          </h4>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Age (in completed years)
            </label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => handleInputChange("age", e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-primary"
              placeholder="e.g. 35"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Annual Family Income (in INR)
            </label>
            <input
              type="number"
              value={formData.familyIncome}
              onChange={(e) => handleInputChange("familyIncome", e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-primary"
              placeholder="e.g. 150000"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => handleInputChange("gender", e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-lowest"
              >
                <option value="">Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="transgender">Transgender</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container-lowest"
              >
                <option value="">Select</option>
                <option value="General">General / EWS</option>
                <option value="OBC">OBC</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Scheme-Specific Questions */}
        <div className="space-y-3 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant">
          <h4 className="font-semibold text-xs text-secondary uppercase tracking-wider">
            2. Scheme Specific Conditions & Exclusions
          </h4>

          {currentScheme?.eligibilityRules?.customRules?.map((rule) => (
            <div key={rule.field} className="flex items-center justify-between gap-3 text-xs pt-1.5">
              <span className="text-on-surface-variant font-medium leading-snug flex-1">
                {rule.label}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleInputChange(rule.field, true)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    formData[rule.field] === true
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange(rule.field, false)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    formData[rule.field] === false
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-Time Deterministic Verdict Display */}
      {analysis && (
        <div className="mt-6 p-5 rounded-2xl border bg-surface-container-low space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-on-surface-variant text-xs font-bold">
                EVALUATION RESULT
              </span>
            </div>
            {verdictBadge && (
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${verdictBadge.bgColor}`}
              >
                <span className="material-symbols-outlined text-[16px]">{verdictBadge.icon}</span>
                <span>{verdictBadge.label}</span>
              </div>
            )}
          </div>

          {/* Hedged Disclaimer */}
          <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs text-on-surface-variant leading-relaxed">
            <strong className="text-on-surface font-semibold">Official Notice: </strong>
            {analysis.disclaimer}
          </div>

          {/* Criteria Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Matched Criteria */}
            <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-tertiary-fixed-dim/40 space-y-2">
              <span className="font-bold text-tertiary-container flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Matched Criteria ({analysis.matchedCriteria.length})
              </span>
              <ul className="space-y-1 text-on-surface">
                {analysis.matchedCriteria.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-tertiary-container mt-0.5">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Unmatched / Unknown Criteria */}
            <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-2">
              <span className="font-bold text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">info</span>
                Pending or Exclusion Check ({analysis.unmatchedOrUnknownCriteria.length})
              </span>
              <ul className="space-y-1 text-on-surface-variant">
                {analysis.unmatchedOrUnknownCriteria.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-secondary mt-0.5">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Documents Required & Official Portal */}
          {currentScheme?.requiredDocuments && (
            <div className="pt-2 border-t border-surface-container flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex-1">
                <span className="font-semibold text-on-surface block mb-1">
                  Required Documents Checklist:
                </span>
                <span className="text-on-surface-variant">
                  {currentScheme.requiredDocuments.join(" • ")}
                </span>
              </div>

              {currentScheme.officialUrl && (
                <a
                  href={currentScheme.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary font-button hover:opacity-90 text-xs font-semibold shadow-xs"
                >
                  <span>Apply on Official Portal</span>
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
