/**
 * SARATHI - Report an Issue Modal Component
 * Allows citizens to submit feedback about outdated statutes, incorrect authorities, language issues, etc.
 */

import React, { useState } from "react";

interface IssueReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  messageIndex: number;
  onSubmit: (data: { issueCategory: string; comment: string }) => Promise<void>;
}

const ISSUE_CATEGORIES = [
  { id: "outdated_statute", label: "Outdated statute / rule referenced" },
  { id: "incorrect_authority", label: "Incorrect authority / jurisdiction mentioned" },
  { id: "language_issue", label: "Translation or phrasing error in regional language" },
  { id: "missing_local_rule", label: "Missing state-specific municipal or rent rule" },
  { id: "factual_misunderstanding", label: "Misunderstood the facts of my case" },
  { id: "other", label: "Other feedback" },
];

export const IssueReportModal: React.FC<IssueReportModalProps> = ({
  isOpen,
  onClose,
  caseId,
  messageIndex,
  onSubmit,
}) => {
  const [selectedCategory, setSelectedCategory] = useState(ISSUE_CATEGORIES[0].id);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        issueCategory: selectedCategory,
        comment,
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Failed to submit issue report:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="report-issue-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="report-issue-modal-dialog"
        className="w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant p-6 shadow-xl animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-error">flag</span>
            <h3 className="font-bold text-base text-on-surface">Report an Issue</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <span className="material-symbols-outlined text-[48px] text-emerald-600">
              check_circle
            </span>
            <h4 className="font-bold text-base text-on-surface">Thank You</h4>
            <p className="text-xs text-on-surface-variant">
              Your feedback has been logged to improve SARATHI's civic accuracy.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-2">
                What is the issue with this response?
              </label>
              <div className="space-y-2">
                {ISSUE_CATEGORIES.map((cat) => (
                  <label
                    key={cat.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedCategory === cat.id
                        ? "bg-primary/10 border-primary font-semibold text-primary"
                        : "bg-surface-container-low border-outline-variant/60 text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    <input
                      type="radio"
                      name="issueCategory"
                      value={cat.id}
                      checked={selectedCategory === cat.id}
                      onChange={() => setSelectedCategory(cat.id)}
                      className="accent-primary"
                    />
                    <span>{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Explain what should be corrected..."
                rows={3}
                className="w-full p-2.5 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface text-xs focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
