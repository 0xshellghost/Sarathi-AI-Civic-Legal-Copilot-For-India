/**
 * SARATHI - Processing Pipeline Indicator Component
 * Visual step-by-step progress indicator while AI reasoning and RAG grounding run
 */

import React from "react";

export type PipelineStage =
  | "understanding"
  | "jurisdiction"
  | "searching"
  | "verifying"
  | "preparing";

interface ProcessingPipelineProps {
  currentStage?: PipelineStage | string;
}

const STAGES: { id: PipelineStage; label: string; icon: string; detail: string }[] = [
  {
    id: "understanding",
    label: "Understanding Problem",
    icon: "psychology",
    detail: "Analyzing citizen facts & context",
  },
  {
    id: "jurisdiction",
    label: "Checking Jurisdiction",
    icon: "account_balance",
    detail: "Mapping state & competent authority",
  },
  {
    id: "searching",
    label: "Searching Official Laws",
    icon: "menu_book",
    detail: "Retrieving official gazettes & statutes",
  },
  {
    id: "verifying",
    label: "Verifying Provisions",
    icon: "verified_user",
    detail: "Checking timeframes & citation rules",
  },
  {
    id: "preparing",
    label: "Preparing Action Plan",
    icon: "task_alt",
    detail: "Structuring citizen roadmap & remedies",
  },
];

export const ProcessingPipeline: React.FC<ProcessingPipelineProps> = ({
  currentStage = "understanding",
}) => {
  const getStageIndex = (stageId: string) => {
    switch (stageId) {
      case "jurisdiction":
        return 1;
      case "searching":
        return 2;
      case "verifying":
        return 3;
      case "preparing":
        return 4;
      default:
        return 0;
    }
  };

  const activeIndex = getStageIndex(currentStage);

  return (
    <div
      id="processing-pipeline-indicator"
      className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/60 shadow-xs my-3 animate-in fade-in duration-300"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
          <span className="font-label-caps text-xs font-bold text-primary tracking-wide">
            SARATHI CIVIC REASONING PIPELINE
          </span>
        </div>
        <span className="text-[11px] text-on-surface-variant font-medium">
          Step {Math.min(activeIndex + 1, STAGES.length)} of {STAGES.length}
        </span>
      </div>

      {/* Steps visualization */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {STAGES.map((stage, idx) => {
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isPending = idx > activeIndex;

          return (
            <div
              key={stage.id}
              className={`p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between ${
                isCurrent
                  ? "bg-primary text-on-primary border-primary shadow-xs ring-2 ring-primary/20 scale-[1.02]"
                  : isDone
                  ? "bg-surface-container-high/60 border-outline-variant text-on-surface"
                  : "bg-surface-container-low/40 border-outline-variant/40 text-on-surface-variant opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`material-symbols-outlined text-[18px] ${
                    isCurrent
                      ? "text-on-primary animate-pulse"
                      : isDone
                      ? "text-primary"
                      : "text-on-surface-variant"
                  }`}
                >
                  {isDone ? "check_circle" : stage.icon}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isCurrent
                      ? "bg-on-primary/20 text-on-primary"
                      : isDone
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant"
                  }`}
                >
                  {idx + 1}
                </span>
              </div>
              <div>
                <p
                  className={`text-xs font-semibold leading-tight ${
                    isCurrent ? "text-on-primary" : "text-on-surface"
                  }`}
                >
                  {stage.label}
                </p>
                <p
                  className={`text-[10px] mt-0.5 leading-snug ${
                    isCurrent ? "text-on-primary/80" : "text-on-surface-variant"
                  }`}
                >
                  {stage.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
