import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { CaseMessage, Citation, ReliabilityInfo, SUPPORTED_LANGUAGES, LanguageOption } from "../lib/schemas";
import { ProblemAnalysisCard } from "./ProblemAnalysisCard";
import { ActionPlanCard } from "./ActionPlanCard";
import { SourceChip } from "./SourceChip";
import { IssueReportModal } from "./IssueReportModal";
import { voiceService } from "../lib/voiceService";

interface ChatBubbleProps {
  message: CaseMessage;
  messageIndex?: number;
  caseId?: string;
  onFeedback?: (messageId: string, rating: "helpful" | "unhelpful" | "partially_helpful", comment?: string) => void;
  onReportIssue?: (data: { issueCategory: string; comment: string; messageIndex: number }) => Promise<void>;
  onOpenDocGenerator?: () => void;
  onOpenSchemeEvaluator?: () => void;
  onSelectFollowUp?: (text: string) => void;
  allSources?: Citation[];
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  messageIndex = 0,
  caseId = "active_case",
  onFeedback,
  onReportIssue,
  onOpenDocGenerator,
  onOpenSchemeEvaluator,
  onSelectFollowUp,
  allSources = [],
}) => {
  const [feedbackGiven, setFeedbackGiven] = useState<string | null>(null);
  const [voicePlaybackState, setVoicePlaybackState] = useState<
    "idle" | "loading" | "playing" | "paused" | "finished"
  >("idle");
  const [audioSource, setAudioSource] = useState<"studio" | "browser" | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [activeSpeaker, setActiveSpeaker] = useState(voiceService.getSpeaker());
  const [voiceUnavailableWarning, setVoiceUnavailableWarning] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Per-response language state & translation cache (storing both text and structured payload)
  const initialLang = message.language || "en";
  const [currentResponseLang, setCurrentResponseLang] = useState<string>(initialLang);

  // Canonical sources (Authoritative English base or original received payload)
  const canonicalContent = message.canonicalContent || message.content;
  const canonicalPayload = message.canonicalStructuredPayload || message.structuredPayload;

  const [translationsCache, setTranslationsCache] = useState<
    Record<string, { content: string; payload?: any }>
  >({
    [initialLang]: {
      content: message.content,
      payload: message.structuredPayload,
    },
    // If canonical content exists, seed 'en' if initialLang is different
    ...(message.canonicalContent
      ? {
          en: {
            content: message.canonicalContent,
            payload: message.canonicalStructuredPayload || message.structuredPayload,
          },
        }
      : {}),
  });

  const [isTranslating, setIsTranslating] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Subscribe to voice engine playback state changes
  useEffect(() => {
    const unsubscribe = voiceService.subscribeState((state) => {
      if (state.activeMessageId === message.id) {
        setVoicePlaybackState(state.status);
        setAudioSource(state.audioSource);
        setPlaybackProgress(state.progress);
        setActiveSpeaker(state.speaker);
      } else {
        setVoicePlaybackState((prev) =>
          prev === "playing" || prev === "paused" || prev === "loading" ? "idle" : prev
        );
      }
    });
    return () => unsubscribe();
  }, [message.id]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  // Active text and structured payload (either localized from cache or original message)
  const activeCached = translationsCache[currentResponseLang];
  const displayedContent = activeCached?.content || message.content;
  const displayedPayload = activeCached?.payload !== undefined ? activeCached.payload : message.structuredPayload;

  const handleTranslateResponse = async (targetLang: LanguageOption) => {
    setIsLangDropdownOpen(false);
    const langKey = targetLang.code;
    setCurrentResponseLang(langKey);

    // Stop active audio if language changes
    if (voicePlaybackState === "playing" || voicePlaybackState === "paused") {
      voiceService.stop();
    }

    // If already in cache, fast-path return
    if (translationsCache[langKey]) {
      return;
    }

    // If English is selected and canonical English content is already present
    if (
      (langKey === "en" || targetLang.name.toLowerCase() === "english") &&
      message.canonicalContent
    ) {
      setTranslationsCache((prev) => ({
        ...prev,
        [langKey]: {
          content: message.canonicalContent!,
          payload: message.canonicalStructuredPayload || message.structuredPayload,
        },
      }));
      return;
    }

    setIsTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: canonicalContent,
          structuredPayload: canonicalPayload,
          targetLanguage: targetLang.name,
        }),
      });

      if (!res.ok && !res.headers.get("content-type")?.includes("application/json")) {
        throw new Error(`Server returned an error (${res.status} ${res.statusText})`);
      }
      
      const data = await res.json();
      if (data.translatedText) {
        setTranslationsCache((prev) => ({
          ...prev,
          [langKey]: {
            content: data.translatedText,
            payload: data.translatedPayload || canonicalPayload,
          },
        }));
      }
    } catch (err) {
      console.warn("[Per-Response Translation Failed]:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSpeak = () => {
    setVoiceUnavailableWarning(null);

    if (voicePlaybackState === "playing") {
      voiceService.pause();
      return;
    }

    if (voicePlaybackState === "paused") {
      voiceService.resume();
      return;
    }

    if (!voiceService.getState().isAvailable) {
      setVoiceUnavailableWarning("Voice playback isn't available in this browser.");
      setTimeout(() => setVoiceUnavailableWarning(null), 4000);
      return;
    }

    voiceService.speak(displayedContent, {
      targetLangCode: currentResponseLang,
      messageId: message.id,
      onError: (err) => {
        console.warn("[VOICE] Speech playback error:", err);
        setVoiceUnavailableWarning("Voice playback isn't available in this browser.");
        setTimeout(() => setVoiceUnavailableWarning(null), 4000);
      },
    });
  };

  const handleStopVoice = () => {
    voiceService.stop();
  };

  const handleVote = (rating: "helpful" | "unhelpful") => {
    setFeedbackGiven(rating);
    if (onFeedback) {
      onFeedback(message.id, rating);
    }
  };

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentResponseLang) ||
    SUPPORTED_LANGUAGES.find((l) => l.name.toLowerCase() === currentResponseLang.toLowerCase()) ||
    SUPPORTED_LANGUAGES[0];

  const missingQuestions =
    displayedPayload?.missingQuestions || displayedPayload?.problemAnalysis?.requiredInformation || [];

  if (isSystem) {
    return (
      <div className="my-3 p-3.5 rounded-xl bg-surface-container-low border border-outline-variant text-center max-w-2xl mx-auto">
        <p className="font-caption text-xs text-on-surface-variant leading-relaxed">
          <span className="material-symbols-outlined text-[14px] inline-block align-text-bottom mr-1 text-secondary">
            shield
          </span>
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col my-4 max-w-4xl w-full ${
        isUser ? "ml-auto items-end" : "mr-auto items-start"
      }`}
    >
      {/* Sender Header */}
      <div className="flex items-center justify-between gap-2 mb-1.5 px-1 w-full max-w-4xl">
        <div className="flex items-center gap-2">
          <span className="font-label-caps text-[11px] text-on-surface-variant font-bold">
            {isUser ? "You (Citizen)" : "SARATHI Civic & Legal Copilot"}
          </span>
          <span className="text-[10px] text-on-surface-variant/70">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Per-Response Language Dropdown (Requirement 2 & 4) */}
        {!isUser && (
          <div className="relative inline-block text-left" ref={langDropdownRef}>
            <button
              type="button"
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-outline-variant/70 bg-surface-container-low hover:bg-surface-container text-[11px] font-medium text-on-surface transition-all shadow-2xs"
              title="Translate this individual response into another language"
              aria-label="Translate this response"
            >
              <span className="material-symbols-outlined text-[14px] text-primary">translate</span>
              <span className="font-semibold text-primary">{currentLangObj.nativeName}</span>
              <span className="text-on-surface-variant text-[10px]">({currentLangObj.name})</span>
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
                {isLangDropdownOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {isLangDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 rounded-xl shadow-lg bg-surface-container-lowest border border-outline-variant z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 border-b border-outline-variant/40">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Translate This Answer:
                  </p>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = lang.code === currentLangObj.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleTranslateResponse(lang)}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-surface-container font-semibold text-primary"
                            : "text-on-surface hover:bg-surface-container-low"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{lang.nativeName}</span>
                          <span className="text-[10px] text-on-surface-variant">{lang.name}</span>
                        </div>
                        {isSelected && (
                          <span className="material-symbols-outlined text-[15px] text-primary">check</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Bubble Content */}
      <div
        className={`p-4 sm:p-5 rounded-2xl transition-all ${
          isUser
            ? "bg-primary text-on-primary rounded-tr-xs shadow-xs max-w-2xl"
            : "bg-surface-container-lowest text-on-surface border border-outline-variant rounded-tl-xs shadow-xs w-full"
        }`}
      >
        {isUser ? (
          <div className="text-body text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <div>
            {/* Subtle translation in-progress banner */}
            {isTranslating && (
              <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-primary-fixed text-on-primary-fixed text-xs font-medium animate-pulse border border-primary-fixed-dim">
                <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Translating response into <strong>{currentLangObj.name}</strong>...</span>
              </div>
            )}

            <div className="markdown-body text-body text-sm sm:text-base leading-relaxed space-y-3 prose prose-slate max-w-none text-on-surface">
              <ReactMarkdown
                components={{
                  h3: ({ node, ...props }) => (
                    <h3 className="font-heading text-base font-bold text-primary mt-4 mb-2 border-b border-outline-variant/30 pb-1" {...props} />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4 className="font-heading text-sm font-bold text-secondary mt-3 mb-1" {...props} />
                  ),
                  p: ({ node, ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2 space-y-1.5" {...props} />,
                  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-semibold text-on-surface font-sans" {...props} />,
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-primary/40 pl-3 italic my-2 text-on-surface-variant bg-surface-container-low/50 py-1 rounded-r-md" {...props} />
                  ),
                  code: ({ node, ...props }) => (
                    <code className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-xs text-primary" {...props} />
                  ),
                }}
              >
                {displayedContent}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Targeted Follow-Up Questions Prompt */}
        {!isUser && missingQuestions.length > 0 && (
          <div className="mt-4 p-3.5 rounded-xl bg-surface-container-low border border-outline-variant">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[18px] text-on-surface">
                help_outline
              </span>
              <h5 className="font-bold text-xs sm:text-sm text-on-surface">
                Targeted Follow-Up Questions (To Pinpoint Local Jurisdiction & Procedure):
              </h5>
            </div>
            <p className="text-xs text-on-surface-variant mb-2.5">
              Providing these specific details allows SARATHI to tailor the exact statutory sections and local authorities:
            </p>
            <div className="flex flex-wrap gap-2">
              {missingQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectFollowUp && onSelectFollowUp(`Regarding: ${q}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant hover:border-primary text-xs font-medium text-on-surface text-left transition-all group"
                >
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                    chat_bubble
                  </span>
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Structured Embedded Payload (For Assistant Messages) */}
        {displayedPayload && (
          <div className="mt-5 space-y-4 pt-4 border-t border-surface-container">
            {/* 1. Problem Analysis Card */}
            {displayedPayload.problemAnalysis && (
              <ProblemAnalysisCard
                analysis={displayedPayload.problemAnalysis}
                onActionClick={(act) => {
                  if (act === "draft_rti" && onOpenDocGenerator) onOpenDocGenerator();
                  if (act === "check_scheme" && onOpenSchemeEvaluator) onOpenSchemeEvaluator();
                }}
              />
            )}

            {/* 2. Action Plan Card */}
            {displayedPayload.actionPlan && (
              <ActionPlanCard
                actionPlan={displayedPayload.actionPlan}
                citations={displayedPayload.citations || allSources}
                reliability={displayedPayload.reliability}
                onGenerateDocument={onOpenDocGenerator}
              />
            )}

            {/* 3. Citations Footer List */}
            {displayedPayload.citations && displayedPayload.citations.length > 0 && (
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <span className="font-label-caps text-[10px] text-secondary font-bold block mb-2">
                  Official Statutory Sources Used for This Answer:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {displayedPayload.citations.map((c) => (
                    <SourceChip key={c.sourceId} citation={c} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Assistant Actions Bar: Speech, Thumbs, and Report an Issue */}
        {!isUser && (
          <div className="mt-4 pt-3 border-t border-surface-container flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSpeak}
                disabled={voicePlaybackState === "loading"}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  voicePlaybackState === "playing"
                    ? "bg-primary text-on-primary shadow-xs ring-2 ring-primary/30"
                    : voicePlaybackState === "paused"
                    ? "bg-secondary-container text-on-secondary-container"
                    : voicePlaybackState === "loading"
                    ? "bg-surface-container-high text-on-surface opacity-80 cursor-wait"
                    : "bg-surface-container text-on-surface hover:bg-surface-container-high hover:text-primary"
                }`}
                title={
                  voicePlaybackState === "playing"
                    ? "Pause speech playback"
                    : voicePlaybackState === "paused"
                    ? "Resume speech playback"
                    : voicePlaybackState === "finished"
                    ? "Listen to response again"
                    : "Listen aloud in crystal-clear studio voice"
                }
                aria-label={
                  voicePlaybackState === "playing"
                    ? "Pause SARATHI response"
                    : voicePlaybackState === "paused"
                    ? "Resume SARATHI response"
                    : voicePlaybackState === "finished"
                    ? "Listen to SARATHI response again"
                    : "Listen to SARATHI response"
                }
              >
                {voicePlaybackState === "loading" ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Preparing audio...</span>
                  </>
                ) : voicePlaybackState === "playing" ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-pulse">pause</span>
                    <span>Pause</span>
                  </>
                ) : voicePlaybackState === "paused" ? (
                  <>
                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                    <span>Resume</span>
                  </>
                ) : voicePlaybackState === "finished" ? (
                  <>
                    <span className="material-symbols-outlined text-[16px]">replay</span>
                    <span>Listen again</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">volume_up</span>
                    <span>Listen ({activeSpeaker === "shubh" ? "Shubh" : "Priya"})</span>
                  </>
                )}
              </button>

              {/* Stop button when actively playing or paused */}
              {(voicePlaybackState === "playing" || voicePlaybackState === "paused") && (
                <button
                  type="button"
                  onClick={handleStopVoice}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-error transition-all cursor-pointer"
                  title="Stop playback"
                  aria-label="Stop SARATHI response"
                >
                  <span className="material-symbols-outlined text-[14px]">stop</span>
                </button>
              )}

              {/* Speaker Persona Toggle (Priya / Shubh) */}
              <button
                type="button"
                onClick={() => {
                  const nextSpeaker = activeSpeaker === "priya" ? "shubh" : "priya";
                  setActiveSpeaker(nextSpeaker);
                  voiceService.setSpeaker(nextSpeaker);
                  if (voicePlaybackState === "playing" || voicePlaybackState === "paused") {
                    voiceService.stop();
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-outline-variant/60 bg-surface-container-low hover:bg-surface-container text-[11px] font-medium text-on-surface transition-all cursor-pointer"
                title={`Click to switch voice persona (Current: ${activeSpeaker === "shubh" ? "Shubh - Male" : "Priya - Female"})`}
              >
                <span className="material-symbols-outlined text-[13px] text-primary">record_voice_over</span>
                <span>Voice: <strong>{activeSpeaker === "shubh" ? "Shubh" : "Priya"}</strong></span>
              </button>

              {/* Audio Source Badge (Studio vs Browser) */}
              {audioSource === "studio" && (voicePlaybackState === "playing" || voicePlaybackState === "paused") && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 animate-fadeIn">
                  <span className="material-symbols-outlined text-[12px] animate-pulse">graphic_eq</span>
                  <span>Sarvam Studio Voice</span>
                </span>
              )}

              {/* Playback Progress Indicator */}
              {(voicePlaybackState === "playing" || voicePlaybackState === "paused") && playbackProgress > 0 && (
                <div className="w-16 sm:w-24 h-1.5 bg-surface-container-high rounded-full overflow-hidden self-center">
                  <div
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${Math.min(100, Math.max(0, playbackProgress))}%` }}
                  />
                </div>
              )}

              {/* Voice unavailable fallback message */}
              {voiceUnavailableWarning && (
                <span className="text-[11px] text-error bg-error/10 px-2 py-0.5 rounded-md font-medium animate-fadeIn">
                  {voiceUnavailableWarning}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="text-[11px] hidden sm:inline-block">Was this helpful?</span>
              <button
                type="button"
                onClick={() => handleVote("helpful")}
                className={`p-1.5 rounded-lg hover:bg-surface-container transition-all ${
                  feedbackGiven === "helpful" ? "text-tertiary-container font-bold bg-tertiary-fixed/40" : ""
                }`}
                title="Helpful guidance"
              >
                <span className="material-symbols-outlined text-[18px]">thumb_up</span>
              </button>
              <button
                type="button"
                onClick={() => handleVote("unhelpful")}
                className={`p-1.5 rounded-lg hover:bg-surface-container transition-all ${
                  feedbackGiven === "unhelpful" ? "text-error font-bold bg-error-container/40" : ""
                }`}
                title="Needs correction"
              >
                <span className="material-symbols-outlined text-[18px]">thumb_down</span>
              </button>

              {/* Report an Issue Button */}
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-error hover:bg-error-container/20 transition-all border border-error/20"
                title="Report outdated statute or incorrect authority"
              >
                <span className="material-symbols-outlined text-[16px]">flag</span>
                <span>Report an issue</span>
              </button>

              {feedbackGiven && (
                <span className="text-[10px] text-tertiary-container ml-1 font-semibold">
                  Thank you!
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Report Issue Modal */}
      <IssueReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        caseId={caseId}
        messageIndex={messageIndex}
        onSubmit={async (data) => {
          if (onReportIssue) {
            await onReportIssue({
              ...data,
              messageIndex,
            });
          }
        }}
      />
    </div>
  );
};
