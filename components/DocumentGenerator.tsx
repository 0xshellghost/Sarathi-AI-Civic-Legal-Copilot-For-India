/**
 * SARATHI - Document Generator & Editor Component
 * Generates statutory RTI & representation documents with live editing & multi-format export
 */

import React, { useState } from "react";
import { RTIGeneration } from "../lib/schemas";
import { SourceChip } from "./SourceChip";

interface DocumentGeneratorProps {
  initialRTI?: RTIGeneration;
  onGenerateDoc?: (data: any) => Promise<{ docxDownloadUrl?: string; pdfDownloadUrl?: string }>;
  className?: string;
}

export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({
  initialRTI,
  onGenerateDoc,
  className = "",
}) => {
  const [authority, setAuthority] = useState(
    initialRTI?.publicAuthority.name || "Central Public Information Officer (CPIO)"
  );
  const [subject, setSubject] = useState(
    initialRTI?.subject ||
      "Application under Section 6(1) of the Right to Information Act, 2005 seeking certified information"
  );
  const [applicantName, setApplicantName] = useState(initialRTI?.applicantDetails.name || "");
  const [applicantAddress, setApplicantAddress] = useState(initialRTI?.applicantDetails.address || "");
  const [questions, setQuestions] = useState<string[]>(
    initialRTI?.informationSought || [
      "1. Certified copies of all file notings, inspection reports, and orders concerning my application.",
      "2. Daily progress report and names/designations of officials with whom the matter remained pending.",
      "3. Certified copy of the citizen charter timeline and reasons recorded for delay.",
    ]
  );

  React.useEffect(() => {
    if (initialRTI) {
      if (initialRTI.publicAuthority?.name) setAuthority(initialRTI.publicAuthority.name);
      if (initialRTI.subject) setSubject(initialRTI.subject);
      if (initialRTI.applicantDetails?.name) setApplicantName(initialRTI.applicantDetails.name);
      if (initialRTI.applicantDetails?.address) setApplicantAddress(initialRTI.applicantDetails.address);
      if (initialRTI.informationSought && initialRTI.informationSought.length > 0) {
        setQuestions(initialRTI.informationSought);
      }
    }
  }, [initialRTI]);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [docxUrl, setDocxUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const triggerDownload = (url: string, filename: string, mimeType: string) => {
    try {
      if (url.startsWith("data:")) {
        const parts = url.split(",");
        const byteCharacters = atob(parts[1]);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          byteArrays.push(new Uint8Array(byteNumbers));
        }
        const blob = new Blob(byteArrays, { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        return;
      }
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download failed, opening window:", err);
      window.open(url, "_blank");
    }
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, `${questions.length + 1}. `]);
  };

  const handleUpdateQuestion = (idx: number, val: string) => {
    const next = [...questions];
    next[idx] = val;
    setQuestions(next);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const fullLetterText = `APPLICATION UNDER SECTION 6(1) OF THE RIGHT TO INFORMATION ACT, 2005

To,
The Public Information Officer (CPIO / SPIO),
${authority}
Office of the Competent Public Authority, Government of India / State Government

1. Full Name of Applicant: ${applicantName || "[Citizen Name]"}
2. Address for Communication: ${applicantAddress || "[Postal Address, District, State, PIN]"}
3. Citizenship: Citizen of India (Eligible under Section 3 of RTI Act, 2005)
4. Subject Matter of Information: ${subject}

5. Specific Particulars of Information Sought (under Section 2(f) and Section 6(1)):
${questions.map((q, idx) => `   (${String.fromCharCode(97 + idx)}) ${q.replace(/^\d+\.\s*/, "")}`).join("\n")}

6. Application Fee Details: Enclosed fee of Rs. 10/- (Exempt under Section 7(5) if BPL card holder).
7. Delivery Mode: Certified copies by Speed Post or electronically as per Section 7(6).

Declaration:
I hereby state that the information sought above pertains to public authority records and falls squarely within the provisions of the RTI Act, 2005.

Place: ____________________
Date: ${new Date().toLocaleDateString("en-IN")}

Signature of Applicant: ____________________`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullLetterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      if (onGenerateDoc) {
        const result = await onGenerateDoc({
          topicSummary: subject,
          publicAuthority: authority,
          specificQuestions: questions,
          applicantName,
          applicantAddress,
        });
        if (result?.docxDownloadUrl) setDocxUrl(result.docxDownloadUrl);
        if (result?.pdfDownloadUrl) setPdfUrl(result.pdfDownloadUrl);
        if (!result?.docxDownloadUrl && !result?.pdfDownloadUrl) {
          setGenerationError("Could not compile document files. Please check network connection and try again.");
        }
      }
    } catch (e: any) {
      console.error("Document generation failed:", e);
      setGenerationError(e?.message || "Failed to generate download files. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      id="document-generator-container"
      className={`rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6 shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-surface-container">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed">
            <span className="material-symbols-outlined text-[24px]">description</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-caps text-secondary text-[11px] font-bold">
                STATUTORY DRAFTING SUITE
              </span>
              <span className="text-[10px] font-bold text-on-tertiary-fixed-variant bg-tertiary-fixed px-2 py-0.5 rounded-full">
                Section 6(1) Compliant
              </span>
            </div>
            <h3 className="font-serif font-bold text-on-surface text-lg sm:text-xl">
              RTI & Civic Application Draftsman
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="copy-text-btn"
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant bg-surface-container text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? "check" : "content_copy"}
            </span>
            <span>{copied ? "Copied!" : "Copy Text"}</span>
          </button>
        </div>
      </div>

      {/* Facts & Assumptions Badges */}
      <div className="mt-4 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-on-surface flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px] text-tertiary-container">verified</span>
          Verified Legal Grounds:
        </span>
        <SourceChip citation={{ sourceId: "rti_act_2005", title: "RTI Act 2005 (Sec 6(1))", tier: 1 }} />
        <span className="text-on-surface-variant text-[11px]">| Fee: ₹10 standard</span>
        <span className="text-on-surface-variant text-[11px]">| Statutory Window: 30 days</span>
      </div>

      {/* Interactive Form Fields */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1">
            Concerned Public Authority (CPIO / SPIO)
          </label>
          <input
            id="input-public-authority"
            type="text"
            value={authority}
            onChange={(e) => setAuthority(e.target.value)}
            className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="e.g. Municipal Corporation, PWD, Food & Civil Supplies"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1">
            Subject Matter
          </label>
          <input
            id="input-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="Brief summary of information sought"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1">
            Applicant Full Name
          </label>
          <input
            id="input-applicant-name"
            type="text"
            value={applicantName}
            onChange={(e) => setApplicantName(e.target.value)}
            className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="Enter your name"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface mb-1">
            Applicant Postal Address & PIN
          </label>
          <input
            id="input-applicant-address"
            type="text"
            value={applicantAddress}
            onChange={(e) => setApplicantAddress(e.target.value)}
            className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="Address for receiving certified documents"
          />
        </div>
      </div>

      {/* Information Points Editor */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-on-surface">
            Specific Information Points Requested (Section 6(1))
          </label>
          <button
            type="button"
            onClick={handleAddQuestion}
            className="text-xs font-bold text-primary inline-flex items-center gap-1 hover:underline"
          >
            <span className="material-symbols-outlined text-[14px]">add_circle</span>
            Add Question
          </button>
        </div>

        <div className="space-y-2">
          {questions.map((q, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-5 text-xs font-bold text-on-surface-variant text-right">
                {idx + 1}.
              </span>
              <input
                type="text"
                value={q.replace(/^\d+\.\s*/, "")}
                onChange={(e) => handleUpdateQuestion(idx, e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-1 focus:ring-primary focus:outline-none"
              />
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(idx)}
                  className="p-1 text-on-surface-variant hover:text-error transition-colors"
                  title="Remove point"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Live Preview Paper Display */}
      <div className="mt-5">
        <label className="block text-xs font-semibold text-on-surface mb-1.5 flex items-center justify-between">
          <span>Statutory Letter Preview</span>
          <span className="text-[10px] text-on-surface-variant">Live formatted format</span>
        </label>
        <div className="p-4 sm:p-5 rounded-xl bg-surface-container border border-outline-variant font-mono text-xs text-on-surface whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed shadow-inner">
          {fullLetterText}
        </div>
      </div>

      {/* Error Notice */}
      {generationError && (
        <div className="mt-4 p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{generationError}</span>
        </div>
      )}

      {/* Generation & Download Actions */}
      <div className="mt-6 pt-4 border-t border-surface-container flex flex-wrap items-center justify-between gap-3">
        <button
          id="render-doc-files-btn"
          type="button"
          disabled={isGenerating}
          onClick={handleGenerate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary font-button hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all text-xs sm:text-sm font-semibold shadow-xs cursor-pointer"
        >
          <span className={`material-symbols-outlined text-[18px] ${isGenerating ? "animate-spin" : ""}`}>
            {isGenerating ? "sync" : "refresh"}
          </span>
          <span>{isGenerating ? "Compiling Files..." : "Generate Downloadable Files"}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {docxUrl && (
            <button
              id="download-docx-link"
              type="button"
              onClick={() =>
                triggerDownload(
                  docxUrl,
                  `RTI_Application_${Date.now()}.docx`,
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold hover:bg-secondary hover:text-on-secondary transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">description</span>
              Download Word (.docx)
            </button>
          )}

          {pdfUrl && (
            <button
              id="download-pdf-link"
              type="button"
              onClick={() =>
                triggerDownload(
                  pdfUrl,
                  `RTI_Application_${Date.now()}.pdf`,
                  "application/pdf"
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-error-container text-on-error-container text-xs font-bold hover:bg-error hover:text-on-error transition-all shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              Download PDF (.pdf)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
