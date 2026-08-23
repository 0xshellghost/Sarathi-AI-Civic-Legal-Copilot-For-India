/**
 * SARATHI - AI Civic & Legal Copilot for Indian Citizens
 * Main Application Component with Firebase Cloud Firestore, Anonymous Auth & Storage,
 * Multi-Provider AI Resilience, Live Pipeline Indicator, Case Timeline, and Theme Persistence
 */

import React, { useState, useEffect, useRef } from "react";
import { User } from "firebase/auth";
import {
  CaseDocument,
  CaseMessage,
  Citation,
  LanguageOption,
  SUPPORTED_LANGUAGES,
  WelfareScheme,
  ActionPlan,
  ProblemAnalysis,
  RTIGeneration,
} from "../lib/schemas";
import { CONFIG } from "../lib/config";
import {
  signInWithGoogle,
  signOutUser,
  onAuthChanged,
  checkRedirectAuthResult,
  saveCaseToFirestore,
  subscribeToUserCases,
  uploadDocumentToStorage,
  saveFeedbackToFirestore,
  fetchUserCasesFromFirestore,
} from "../lib/firebase";
import { LanguageSelector } from "../components/LanguageSelector";
import { ThemeToggle } from "../components/ThemeToggle";
import { ChatBubble } from "../components/ChatBubble";
import { DocumentGenerator } from "../components/DocumentGenerator";
import { EligibilityFlow } from "../components/EligibilityFlow";
import { SourceChip } from "../components/SourceChip";
import { ProcessingPipeline, PipelineStage } from "../components/ProcessingPipeline";
import { UserAccountMenu } from "../components/UserAccountMenu";
import { AuthModal } from "../components/AuthModal";
import { useVoiceRecorder } from "../lib/useVoiceRecorder";
import { ResponseModeToggle, ResponseMode } from "../components/ResponseModeToggle";
import { HeroQuoteRotator } from "../components/HeroQuoteRotator";
import { getSuggestionsForLanguage } from "../lib/suggestions";

export function App() {
  const [activeTab, setActiveTab] = useState<
    "chat" | "rti_draft" | "schemes" | "sources" | "cases"
  >("chat");
  const [language, setLanguage] = useState<LanguageOption>(SUPPORTED_LANGUAGES[0]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalConfig, setAuthModalConfig] = useState<{
    title?: string;
    description?: string;
  }>({});

  // Basic / Advanced Response Mode with persistence
  const [responseMode, setResponseMode] = useState<ResponseMode>(() => {
    const saved = localStorage.getItem("sarathi_response_mode");
    return saved === "basic" || saved === "advanced" ? saved : "advanced";
  });
  const [isRegeneratingMode, setIsRegeneratingMode] = useState(false);

  const [messages, setMessages] = useState<CaseMessage[]>([
    {
      id: "msg_welcome",
      role: "assistant",
      content: `Namaste! I am SARATHI (सारथी), your AI Civic & Legal Copilot. 

I help Indian citizens navigate civic rights, draft statutory RTI requests, resolve tenant/consumer/labour disputes, and evaluate government welfare schemes. Every recommendation is grounded in official government laws and portals.

How can I assist you today? Feel free to write in your own language (Hindi, English, Hinglish, Bengali, Tamil, Telugu, Marathi, etc.) or upload a document/notice.`,
      language: "en",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>("understanding");
  const [activeCaseId, setActiveCaseId] = useState<string>("case_" + Date.now());
  const [currentProblemAnalysis, setCurrentProblemAnalysis] = useState<ProblemAnalysis | null>(null);
  const [currentActionPlan, setCurrentActionPlan] = useState<ActionPlan | null>(null);
  const [currentCitations, setCurrentCitations] = useState<Citation[]>([]);
  const [customDraftRTI, setCustomDraftRTI] = useState<RTIGeneration | null>(null);
  const [sources, setSources] = useState<Citation[]>([]);
  const [schemes, setSchemes] = useState<WelfareScheme[]>([]);
  const [userCases, setUserCases] = useState<CaseDocument[]>([]);
  const [isUploadingToStorage, setIsUploadingToStorage] = useState(false);
  const [attachedDoc, setAttachedDoc] = useState<{
    fileName: string;
    base64Data: string;
    mimeType: string;
    storageUrl?: string;
  } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const isNearBottomRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Track chat scroll position to prevent forced jumps when user reads earlier messages
  const handleChatScroll = () => {
    if (!chatScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceToBottom < 120;
    isNearBottomRef.current = nearBottom;
    setShowScrollToBottom(!nearBottom);
  };

  const scrollToBottom = (smooth = true) => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
      setShowScrollToBottom(false);
      isNearBottomRef.current = true;
    }
  };

  // Groq Whisper Voice / Speech-to-Text Recorder Hook
  const {
    voiceState,
    errorMessage: voiceErrorMessage,
    recordingSeconds,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError: clearVoiceError,
  } = useVoiceRecorder({
    targetLanguageCode: language.code,
    onTranscriptionSuccess: (transcribedText) => {
      setInputQuery((prev) => {
        const clean = transcribedText.trim();
        if (!prev.trim()) return clean;
        return `${prev} ${clean}`;
      });
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    },
  });

  // Auto scroll to bottom only when user is already near bottom or on new turns
  useEffect(() => {
    if (isNearBottomRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isProcessing, pipelineStage]);

  // Handle Firebase Auth State Observer, Redirect Resolution, and Real-Time Case Sync
  useEffect(() => {
    let unsubscribeCases: (() => void) | undefined;

    // Check if returning from a Google redirect authentication flow
    checkRedirectAuthResult()
      .then((user) => {
        if (user) {
          setCurrentUser(user);
          setIsAuthLoading(false);
        }
      })
      .catch((e) => console.warn("[AUTH] Redirect check notice:", e));

    const unsubscribeAuth = onAuthChanged(
      (user) => {
        setCurrentUser(user);
        setIsAuthLoading(false);
        if (user && user.uid) {
          if (unsubscribeCases) unsubscribeCases();
          unsubscribeCases = subscribeToUserCases(
            user.uid,
            (cases) => {
              if (cases) {
                setUserCases(cases);
              }
            },
            (err) => {
              console.warn("Real-time sync notice:", err);
            }
          );
        } else {
          if (unsubscribeCases) unsubscribeCases();
          setUserCases([]);
        }
      },
      (loading) => {
        setIsAuthLoading(loading);
      }
    );

    fetchSources();
    fetchSchemes();

    return () => {
      unsubscribeAuth();
      if (unsubscribeCases) unsubscribeCases();
    };
  }, []);

  const fetchSources = async () => {
    try {
      const res = await fetch("/api/sources");
      if (!res.ok && !res.headers.get("content-type")?.includes("application/json")) {
        throw new Error(`Server returned an error (${res.status})`);
      }
      const data = await res.json();
      if (data.sources) setSources(data.sources);
    } catch (e) {
      console.warn("Could not fetch sources:", e);
    }
  };

  const fetchSchemes = async () => {
    try {
      const defaultSchemes: WelfareScheme[] = [
        {
          schemeId: "pm_kisan",
          name: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
          authority: "Ministry of Agriculture & Farmers Welfare",
          jurisdiction: "Central / All India",
          category: "financial_social_welfare",
          description: "Direct income support of ₹6,000 per year in 3 equal installments of ₹2,000 for landholding farmer families.",
          eligibilityRules: {
            customRules: [
              { field: "isLandholdingFarmer", label: "Do you or your family own cultivable land registered in your name?", type: "boolean", required: true },
              { field: "isIncomeTaxPayee", label: "Did any family member pay Income Tax in the last assessment year?", type: "boolean", required: true },
              { field: "isGovtEmployeeOrPensionerAbove10k", label: "Is any member a serving/retired government official or receiving pension ≥ ₹10,000/month?", type: "boolean", required: true },
              { field: "isRegisteredProfessional", label: "Is any member a practicing Doctor, Lawyer, Engineer, or Chartered Accountant?", type: "boolean", required: true },
            ],
          },
          requiredDocuments: [
            "Aadhaar Card (Mandatory with e-KYC)",
            "Land Ownership Records (RoR / Khata / Khasra in farmer's name)",
            "Active Bank Account Linked with Aadhaar (DBT-enabled)",
            "Citizenship & Identity Proof",
          ],
          applicationProcess: "Apply online at pmkisan.gov.in -> 'Farmer Corner' -> 'New Farmer Registration' or visit Common Service Centre (CSC).",
          officialUrl: "https://pmkisan.gov.in",
          sourceId: "pm_kisan_guidelines",
        },
        {
          schemeId: "ayushman_bharat",
          name: "Ayushman Bharat PM-JAY (National Health Protection Scheme)",
          authority: "National Health Authority (NHA)",
          jurisdiction: "Central / All India",
          category: "healthcare_schemes",
          description: "Cashless secondary and tertiary healthcare coverage up to ₹5,00,000 per family per year across empaneled hospitals.",
          eligibilityRules: {
            customRules: [
              { field: "isSECCListedOrDeprived", label: "Is your family listed in SECC 2011 database or eligible state NFSA ration category?", type: "boolean", required: true },
              { field: "hasExistingGovtHealthCover", label: "Do you already hold comprehensive Central/State Govt medical insurance (CGHS/ECHS/ESIC)?", type: "boolean", required: false },
              { field: "isSeniorCitizenAbove70", label: "Is any member aged 70 years or above (Eligible for expanded ₹5 Lakh top-up)?", type: "boolean", required: false },
            ],
          },
          requiredDocuments: [
            "Aadhaar Card of each family member",
            "Ration Card or State Verified Family ID",
            "PM-JAY Letter / Beneficiary Identification Card",
          ],
          applicationProcess: "Check eligibility on beneficiary.nha.gov.in using Aadhaar/Ration Card, or visit nearest Ayushman Mitra at empaneled public/private hospital.",
          officialUrl: "https://nha.gov.in",
          sourceId: "ayushman_bharat_nha",
        },
        {
          schemeId: "pmay_gramin",
          name: "Pradhan Mantri Awas Yojana - Gramin (PMAY-G)",
          authority: "Ministry of Rural Development",
          jurisdiction: "Central / State Rural",
          category: "welfare_schemes",
          description: "Financial grant of ₹1,20,000 (plains) to ₹1,30,000 (hilly/difficult areas) for pucca house construction with toilet assistance.",
          eligibilityRules: {
            customRules: [
              { field: "isHouselessOrKutchaRoom", label: "Do you live in a zero/one/two-room kutcha house with kutcha roof and walls?", type: "boolean", required: true },
              { field: "ownsPuccaHouse", label: "Does any member of your family own a pucca house anywhere in India?", type: "boolean", required: true },
              { field: "ownsMotorizedVehicleOrKisanCardAbove50k", label: "Does the family own a motorized vehicle/tractor or Kisan Credit Card limit ≥ ₹50,000?", type: "boolean", required: false },
            ],
          },
          requiredDocuments: [
            "Aadhaar Card of Applicant & Spouse",
            "Bank Account Passbook (Aadhaar linked)",
            "MGNREGA Job Card Number",
            "Swachh Bharat Mission (SBM) Registration ID for toilet incentive",
          ],
          applicationProcess: "Selection occurs through Gram Sabha verification based on SECC 2011 / Awaas+ list. Contact Gram Panchayat or Block Development Officer (BDO).",
          officialUrl: "https://pmayg.nic.in",
          sourceId: "pmay_gramin_guidelines",
        },
        {
          schemeId: "post_matric_scholarship",
          name: "Post Matric Scholarship Scheme for SC/ST/OBC Students",
          authority: "Ministry of Social Justice and Empowerment",
          jurisdiction: "Central / State Shared",
          category: "education",
          description: "Full tuition fee reimbursement and monthly maintenance allowance for post-matriculation studies.",
          eligibilityRules: {
            customRules: [
              { field: "isEligibleCategory", label: "Do you belong to recognized SC, ST, or OBC / EBC category?", type: "boolean", required: true },
              { field: "familyIncomeBelow2Point5Lakh", label: "Is your total annual family income from all sources ≤ ₹2,50,000?", type: "boolean", required: true },
              { field: "passedClass10", label: "Have you passed Class 10 (Matriculation) or higher qualification?", type: "boolean", required: true },
              { field: "enrolledInRecognizedCourse", label: "Are you enrolled in a recognized college, polytechnic, or university?", type: "boolean", required: true },
            ],
          },
          requiredDocuments: [
            "Student Aadhaar Card (DBT linked)",
            "Caste Certificate issued by SDM / Tehsildar",
            "Current Year Family Income Certificate (< ₹2.5 Lakh)",
            "Class 10 / Previous Exam Marksheet",
            "College Admission & Fee Receipt",
            "Student Bank Passbook",
          ],
          applicationProcess: "Apply exclusively online on the National Scholarship Portal (scholarships.gov.in) with college verification.",
          officialUrl: "https://scholarships.gov.in",
          sourceId: "post_matric_scholarship",
        },
      ];
      setSchemes(defaultSchemes);
    } catch (e) {
      console.warn("Could not fetch schemes:", e);
    }
  };

  const fetchUserCases = async (uidOverride?: string) => {
    try {
      const uid = uidOverride || currentUser?.uid;
      if (uid) {
        const firestoreCases = await fetchUserCasesFromFirestore(uid);
        if (firestoreCases && firestoreCases.length > 0) {
          setUserCases(firestoreCases);
          return;
        }
      }
      if (uid) {
        const token = await currentUser?.getIdToken() || "";
        const res = await fetch("/api/cases", {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (!res.ok && !res.headers.get("content-type")?.includes("application/json")) {
          throw new Error(`Server returned an error (${res.status})`);
        }
        const data = await res.json();
        if (data.cases) setUserCases(data.cases);
      }
    } catch (e) {
      console.warn("Could not fetch cases:", e);
    }
  };

  const handleGoogleSignIn = async (method: "popup" | "redirect" = "popup") => {
    try {
      const user = await signInWithGoogle({ method });
      if (user) {
        setCurrentUser(user);
        setAuthModalOpen(false);
      }
    } catch (error) {
      console.error("[AUTH] Google sign-in error in App:", error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setCurrentUser(null);
      setUserCases([]);
      handleStartNewCase();
    } catch (error) {
      console.error("Sign out error in App:", error);
    }
  };

  const triggerAuthGate = (title?: string, description?: string) => {
    setAuthModalConfig({
      title: title || "Sign in to save your case",
      description:
        description ||
        "Connect with your Google account to save your case roadmap, download drafted statutory RTI applications, and sync your legal records across devices.",
    });
    setAuthModalOpen(true);
  };

  const handleStartNewCase = () => {
    const newCaseId = "case_" + Date.now();
    setActiveCaseId(newCaseId);
    setCurrentProblemAnalysis(null);
    setCurrentActionPlan(null);
    setCurrentCitations([]);
    setCustomDraftRTI(null);
    setMessages([
      {
        id: "msg_new_" + Date.now(),
        role: "assistant",
        content: `Started a fresh case file (${newCaseId.slice(0, 12)}). What civic, administrative, or legal matter can I assist you with today?`,
        language: language.code,
        createdAt: new Date().toISOString(),
      },
    ]);
    setActiveTab("chat");
  };

  /**
   * Switches Basic vs. Advanced response mode and seamlessly regenerates the latest response
   * without losing case context or creating duplicate records.
   */
  const handleModeChange = async (newMode: ResponseMode) => {
    if (newMode === responseMode) return;
    setResponseMode(newMode);
    localStorage.setItem("sarathi_response_mode", newMode);

    // If an active user query exists in the current session, re-generate the latest answer in the new mode
    const userMessages = messages.filter((m) => m.role === "user");
    const lastUserMsg = userMessages[userMessages.length - 1];

    if (lastUserMsg && messages.length > 1 && !isProcessing && !isRegeneratingMode) {
      setIsRegeneratingMode(true);
      try {
        const uid = currentUser?.uid || "anon_citizen_" + Date.now();
        const token = currentUser ? await currentUser.getIdToken() : "anon";
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: lastUserMsg.content,
            caseId: activeCaseId,
            targetLanguage: language.name,
            responseMode: newMode,
          }),
        });

        if (!res.ok && !res.headers.get("content-type")?.includes("application/json")) {
          throw new Error(`Server returned an error (${res.status} ${res.statusText})`);
        }
        
        const data = await res.json();
        if (!data.error && data.reply) {
          if (data.problemAnalysis) setCurrentProblemAnalysis(data.problemAnalysis);
          if (data.actionPlan) setCurrentActionPlan(data.actionPlan);
          if (data.citations) setCurrentCitations(data.citations);

          setMessages((prev) => {
            const lastAssistantIdx = prev.map((m) => m.role).lastIndexOf("assistant");
            if (lastAssistantIdx !== -1) {
              const updated = [...prev];
              updated[lastAssistantIdx] = {
                ...updated[lastAssistantIdx],
                content: data.reply,
                structuredPayload: {
                  problemAnalysis: data.problemAnalysis,
                  actionPlan: data.actionPlan,
                  eligibilityAnalysis: data.eligibilityAnalysis,
                  citations: data.citations,
                  reliability: data.reliability,
                  missingQuestions: data.missingQuestions,
                },
              };
              return updated;
            }
            return prev;
          });
        }
      } catch (e) {
        console.warn("Mode regeneration error:", e);
      } finally {
        setIsRegeneratingMode(false);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim() && !attachedDoc) return;

    const userMsg: CaseMessage = {
      id: "msg_usr_" + Date.now(),
      role: "user",
      content: query || `Uploaded document for legal review: ${attachedDoc?.fileName}`,
      language: language.code,
      createdAt: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputQuery("");
    setIsProcessing(true);
    setPipelineStage("understanding");
    setTimeout(() => scrollToBottom(true), 50);

    // Progression of pipeline indicator
    const timer1 = setTimeout(() => setPipelineStage("jurisdiction"), 600);
    const timer2 = setTimeout(() => setPipelineStage("searching"), 1200);
    const timer3 = setTimeout(() => setPipelineStage("verifying"), 1800);
    const timer4 = setTimeout(() => setPipelineStage("preparing"), 2400);

    try {
      const uid = currentUser?.uid || "anon_citizen_" + Date.now();
      const token = currentUser ? await currentUser.getIdToken() : "anon";

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: query,
          caseId: activeCaseId,
          targetLanguage: language.name,
          attachedDocument: attachedDoc,
          responseMode: responseMode,
        }),
      });

      if (!res.ok && !res.headers.get("content-type")?.includes("application/json")) {
        throw new Error(`Server returned an error (${res.status} ${res.statusText})`);
      }
      
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: "msg_err_" + Date.now(),
            role: "assistant",
            content: `Error: ${data.error}`,
            language: "en",
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        if (data.problemAnalysis) setCurrentProblemAnalysis(data.problemAnalysis);
        if (data.actionPlan) setCurrentActionPlan(data.actionPlan);
        if (data.citations) setCurrentCitations(data.citations);

        const assistantMsg: CaseMessage = {
          id: "msg_ast_" + Date.now(),
          role: "assistant",
          content: data.reply,
          language: language.code,
          canonicalContent: data.canonicalContent,
          canonicalStructuredPayload: data.canonicalStructuredPayload,
          structuredPayload: {
            problemAnalysis: data.problemAnalysis,
            actionPlan: data.actionPlan,
            eligibilityAnalysis: data.eligibilityAnalysis,
            citations: data.citations,
            reliability: data.reliability,
            missingQuestions: data.missingQuestions,
          },
          createdAt: new Date().toISOString(),
        };

        const updatedMessages = [...newMessages, assistantMsg];
        setMessages(updatedMessages);
        setAttachedDoc(null);

        // Pre-fill Document Generator template if action plan created
        if (data.actionPlan) {
          const questionsList = (data.actionPlan.steps || []).map(
            (s: any, idx: number) =>
              `${idx + 1}. Certified copies of official records, orders, and action taken regarding: ${s.action}`
          );
          setCustomDraftRTI({
            publicAuthority: {
              name: data.actionPlan.authority?.name || "Central Public Information Officer",
              confidence: "confirmed_by_user",
            },
            subject: `Statutory RTI Application regarding: ${data.problemAnalysis?.problemSummary || data.actionPlan.situation}`,
            informationSought:
              questionsList.length > 0
                ? questionsList
                : [
                    "1. Certified copies of all file notings, inspection reports, and orders concerning my application.",
                    "2. Daily progress report and names/designations of officials with whom the matter remained pending.",
                    "3. Certified copy of the citizen charter timeline and reasons recorded for delay.",
                  ],
            applicantDetails: {
              name: "[Applicant Name]",
              address: "[Applicant Postal Address, District, PIN]",
            },
            factsFromSource: (data.citations || []).map((c: Citation) => ({
              fact: c.title,
              sourceId: c.sourceId,
            })),
            aiDraftedWording: true,
            assumptions: ["Citizen is an Indian citizen eligible under Section 3 of RTI Act 2005."],
          });
        }

        // Synchronize Case Document to Cloud Firestore
        const caseDocToSave: CaseDocument = {
          caseId: activeCaseId,
          userId: uid,
          title: data.problemAnalysis?.problemSummary?.slice(0, 80) || "Civic Grievance",
          category: data.problemAnalysis?.category || "general_grievance",
          status: "action_plan_ready",
          location: data.problemAnalysis?.location || { state: "All India", jurisdiction: "Central / All India" },
          problemAnalysis: data.problemAnalysis,
          actionPlan: data.actionPlan,
          formState: null,
          generatedDocuments: [],
          messages: updatedMessages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await saveCaseToFirestore(caseDocToSave, uid);
        fetchUserCases();
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: "msg_err_" + Date.now(),
          role: "assistant",
          content: `Unable to process request: ${e.message}. Please check your connection.`,
          language: "en",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      setIsProcessing(false);
    }
  };

  const handleVoiceToggle = () => {
    if (voiceState === "recording") {
      stopRecording();
    } else if (voiceState === "transcribing") {
      return;
    } else {
      startRecording();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingToStorage(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(",")[1];
      const mimeType = file.type || "application/octet-stream";

      let cloudStorageUrl: string | undefined = undefined;

      // Upload file directly to Firebase Storage if authenticated
      if (currentUser) {
        try {
          const uploadRes = await uploadDocumentToStorage(
            currentUser.uid,
            activeCaseId,
            file,
            file.name
          );
          if (uploadRes?.downloadUrl) {
            cloudStorageUrl = uploadRes.downloadUrl;
          }
        } catch (storageErr) {
          console.warn("Storage upload warning, fallback to base64:", storageErr);
        }
      }

      setAttachedDoc({
        fileName: file.name,
        base64Data,
        mimeType,
        storageUrl: cloudStorageUrl,
      });

      setIsUploadingToStorage(false);
    };

    reader.readAsDataURL(file);
  };

  const handleGenerateRTIDocs = async (rtiPayload: any) => {
    const res = await fetch("/api/rti/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rtiPayload),
    });
    if (!res.ok && !res.headers.get("content-type")?.includes("application/json")) {
      throw new Error(`Server returned an error (${res.status})`);
    }
    return await res.json();
  };

  const handleFeedback = async (
    messageId: string,
    rating: "helpful" | "unhelpful" | "partially_helpful",
    comment?: string,
    issueCategory?: string
  ) => {
    const uid = currentUser?.uid || "anon_citizen";
    const feedbackPayload = {
      feedbackId: "fb_" + Date.now(),
      caseId: activeCaseId,
      messageIndex: 0,
      rating,
      comment: issueCategory ? `[${issueCategory}] ${comment || ""}` : comment,
      createdAt: new Date().toISOString(),
    };

    if (currentUser) {
      await saveFeedbackToFirestore(feedbackPayload);
    }

    try {
      const token = currentUser ? await currentUser.getIdToken() : "anon";
      await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ ...feedbackPayload, messageId, issueCategory }),
      });
    } catch (e) {
      console.warn("Feedback recording failed:", e);
    }
  };

  const handleSelectFollowUpQuery = (text: string) => {
    setInputQuery(text);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursorPosition = text.length;
        try {
          textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
        } catch {
          // ignore if unsupported
        }
        textareaRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 10);
  };

  const handleSelectSuggestion = (promptText: string) => {
    // 1. Take suggestion text and prefill composer without submitting or calling AI
    setInputQuery(promptText);

    // 2. Focus the composer, position cursor at the end for immediate user editing, and scroll into view
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursorPosition = promptText.length;
        try {
          textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
        } catch {
          // ignore if unsupported
        }
        textareaRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 10);
  };

  const compactSuggestions = getSuggestionsForLanguage(language.code);

  return (
    <div className="h-screen h-[100dvh] bg-surface flex flex-col font-sans text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed overflow-hidden">
      {/* Top Navigation Header */}
      <header className="shrink-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant px-3 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-primary text-on-primary flex items-center justify-center font-bold text-lg sm:text-xl shadow-xs shrink-0">
            <span className="material-symbols-outlined text-[20px] sm:text-[24px]">gavel</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-serif font-bold text-base sm:text-xl tracking-tight text-on-surface truncate">
                SARATHI <span className="text-primary font-normal text-sm sm:text-lg">सारथी</span>
              </h1>
              <span className="hidden sm:inline-flex items-center text-[10px] font-bold text-on-tertiary-fixed-variant bg-tertiary-fixed px-2 py-0.5 rounded-full border border-tertiary-fixed-dim shrink-0">
                Civic & Legal Copilot
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant hidden md:block truncate">
              Citation-Backed Action Plans, Statutory RTI & Welfare Verification for Indian Citizens
            </p>
          </div>
        </div>

        {/* Header Controls (Theme Toggle, Language, Google Account Menu, New Case) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* User Account / Google Sign-In Menu */}
          <UserAccountMenu
            user={currentUser}
            isLoading={isAuthLoading}
            onSignIn={() => {
              setAuthModalConfig({
                title: "Sign in with Google",
                description:
                  "Sign in to synchronize your legal roadmaps, download official statutory RTI forms, and safely access your case files from any device.",
              });
              setAuthModalOpen(true);
            }}
            onSignOut={handleSignOut}
            onOpenMyCases={() => setActiveTab("cases")}
          />

          {/* Theme Toggle (Light / Dark / System) */}
          <ThemeToggle />

          {/* Language Selector */}
          <LanguageSelector
            currentLanguage={language.name}
            onLanguageChange={(lang) => setLanguage(lang)}
          />

          {/* Prominent '+ New Case' Button */}
          <button
            id="new-case-btn"
            type="button"
            onClick={handleStartNewCase}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-primary text-on-primary hover:opacity-90 active:scale-95 text-xs font-semibold shadow-xs transition-all"
            title="Start fresh civic case"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span className="hidden sm:inline">+ New Case</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </header>

      {/* Navigation Sub-Header Tabs */}
      <nav className="shrink-0 bg-surface-container-low border-b border-outline-variant px-4 sm:px-8 py-2 overflow-x-auto flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 ${
            activeTab === "chat"
              ? "bg-primary text-on-primary shadow-xs"
              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">chat</span>
          <span>Civic Chat & Resolution Roadmap</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rti_draft")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 ${
            activeTab === "rti_draft"
              ? "bg-primary text-on-primary shadow-xs"
              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">draw</span>
          <span>RTI Application Draftsman</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("schemes")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 ${
            activeTab === "schemes"
              ? "bg-primary text-on-primary shadow-xs"
              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">fact_check</span>
          <span>Welfare Scheme Eligibility Evaluator</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sources")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 ${
            activeTab === "sources"
              ? "bg-primary text-on-primary shadow-xs"
              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">verified</span>
          <span>Authoritative Statutory Library ({sources.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cases")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 ${
            activeTab === "cases"
              ? "bg-primary text-on-primary shadow-xs"
              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">folder</span>
          <span>My Cloud Case Files ({userCases.length})</span>
        </button>
      </nav>

      {/* Main Content Body */}
      <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden relative">
        {/* VIEW 1: Chat & Resolution Copilot */}
        {activeTab === "chat" && (
          <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden relative">
            {/* Dedicated Chat Scroll Container */}
            <div
              ref={chatScrollContainerRef}
              onScroll={handleChatScroll}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-6 py-4"
            >
              <div className="max-w-4xl mx-auto w-full space-y-4 pb-8 flex flex-col">
                {/* Rotating Hero Quote Banner when starting a session */}
                {messages.length === 1 && (
                  <div className="mb-2 animate-in fade-in duration-300">
                    <HeroQuoteRotator />
                  </div>
                )}

                {/* Messages Stream */}
                <div className="space-y-3">
                  {messages.map((msg, idx) => (
                    <ChatBubble
                      key={msg.id}
                      message={msg}
                      messageIndex={idx}
                      caseId={activeCaseId}
                      allSources={sources}
                      onFeedback={(msgId, rating) => handleFeedback(msgId, rating)}
                      onReportIssue={async (data) =>
                        handleFeedback(msg.id, "unhelpful", data.comment, data.issueCategory)
                      }
                      onOpenDocGenerator={() => setActiveTab("rti_draft")}
                      onOpenSchemeEvaluator={() => setActiveTab("schemes")}
                      onSelectFollowUp={handleSelectFollowUpQuery}
                    />
                  ))}

                  {/* Processing Pipeline Indicator (Live visual stages) */}
                  {isProcessing && (
                    <ProcessingPipeline currentStage={pipelineStage} />
                  )}
                </div>

                {/* Natural Document-Flow Composer & Controls (Scrolls away with conversation) */}
                <div className="pt-3 flex flex-col gap-2">
                  {/* Compact Suggestion Pills & Mode Selection Bar directly above Input */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* Horizontal Compact Suggestion Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap flex-1" role="group" aria-label="Suggested starting prompts">
                      {compactSuggestions.map((item) => (
                        <button
                          key={item.id}
                          id={`suggestion-btn-${item.id}`}
                          type="button"
                          onClick={() => handleSelectSuggestion(item.prompt)}
                          aria-label={`Use this as a starting prompt: ${item.label}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/70 text-[11px] font-medium text-on-surface hover:text-primary transition-all duration-150 shadow-2xs hover:border-primary/50 active:scale-95 cursor-pointer shrink-0"
                          title={`Use this as a starting prompt: ${item.label}`}
                        >
                          <span className="material-symbols-outlined text-[13px] text-primary">
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Basic / Advanced Mode Toggle */}
                    <div className="shrink-0 self-end sm:self-center">
                      <ResponseModeToggle
                        mode={responseMode}
                        onChange={handleModeChange}
                        isRegenerating={isRegeneratingMode}
                        disabled={isProcessing}
                      />
                    </div>
                  </div>

                  {/* Attached Document Preview Badge */}
                  {attachedDoc && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed text-xs font-semibold shadow-xs animate-in fade-in self-start">
                      <span className="material-symbols-outlined text-[16px]">
                        {attachedDoc.storageUrl ? "cloud_done" : "attachment"}
                      </span>
                      <span className="truncate max-w-[260px]">
                        {attachedDoc.fileName} {attachedDoc.storageUrl ? "(Stored in Cloud)" : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachedDoc(null)}
                        className="hover:text-error ml-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  )}

                  {/* Voice Recording / Transcribing / Error Banner */}
                  {voiceState === "recording" && (
                    <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-error-container text-on-error-container text-xs font-medium border border-error/20 shadow-xs animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-error animate-ping" />
                        <span>
                          Listening in <strong className="font-bold">{language.name}</strong> ({Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, "0")})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelRecording}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-error/10 text-on-error-container transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="px-3 py-1 rounded-lg bg-error text-on-error text-xs font-bold hover:opacity-90 transition-all shadow-2xs"
                        >
                          Done & Transcribe
                        </button>
                      </div>
                    </div>
                  )}

                  {voiceState === "transcribing" && (
                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary-fixed text-on-primary-fixed text-xs font-medium border border-primary-fixed-dim shadow-xs animate-in fade-in">
                      <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Transcribing with <strong>Groq Whisper (whisper-large-v3)</strong>...</span>
                    </div>
                  )}

                  {voiceErrorMessage && (
                    <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-medium border border-amber-300 dark:border-amber-800 shadow-xs animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-amber-600">info</span>
                        <span>{voiceErrorMessage}</span>
                      </div>
                      <button
                        type="button"
                        onClick={clearVoiceError}
                        className="hover:opacity-75 p-0.5"
                        title="Dismiss"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  )}

                  {/* Input Box Card */}
                  <div className="p-2 rounded-2xl bg-surface-container-lowest border-2 border-outline-variant shadow-sm flex flex-col gap-2 focus-within:border-primary transition-all">
                    <textarea
                      id="chat-query-input"
                      ref={textareaRef}
                      value={inputQuery}
                      onChange={(e) => setInputQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={2}
                      placeholder={`Describe your civic grievance, RTI query, or tenant/consumer dispute in ${language.name} or Hinglish...`}
                      className="w-full bg-transparent border-none text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none resize-none px-3 pt-1"
                    />

                    <div className="flex items-center justify-between px-2 pt-1 border-t border-surface-container">
                      <div className="flex items-center gap-1.5">
                        {/* Attachment Upload Button */}
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="image/*,.pdf,.txt,.docx"
                          className="hidden"
                        />
                        <button
                          id="upload-doc-btn"
                          type="button"
                          disabled={isUploadingToStorage}
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all"
                          title="Upload legal notice, rejection letter, or bill to Firebase Storage for OCR review"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {isUploadingToStorage ? "cloud_upload" : "attach_file"}
                          </span>
                        </button>

                        {/* Speech to Text Microphone Button (Groq Whisper) */}
                        <button
                          id="voice-mic-btn"
                          type="button"
                          onClick={handleVoiceToggle}
                          className={`p-2 rounded-xl transition-all ${
                            voiceState === "recording"
                              ? "bg-error text-on-error animate-pulse shadow-xs"
                              : voiceState === "transcribing"
                              ? "bg-primary-fixed text-on-primary-fixed cursor-wait"
                              : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
                          }`}
                          title={
                            voiceState === "recording"
                              ? "Click to stop recording and transcribe with Groq Whisper"
                              : voiceState === "transcribing"
                              ? "Transcribing with Groq Whisper..."
                              : "Voice input in your native Indian language (Groq Whisper)"
                          }
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {voiceState === "recording"
                              ? "stop_circle"
                              : voiceState === "transcribing"
                              ? "hourglass_top"
                              : "mic"}
                          </span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          id="send-message-btn"
                          type="button"
                          disabled={isProcessing || (!inputQuery.trim() && !attachedDoc)}
                          onClick={() => handleSendMessage()}
                          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-on-primary font-button hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all text-xs font-semibold shadow-xs cursor-pointer"
                        >
                          <span>Send</span>
                          <span className="material-symbols-outlined text-[16px]">send</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Statutory Micro-Disclaimer beneath input */}
                  <div className="flex items-center justify-between text-[10px] text-on-surface-variant/70 px-1">
                    <span className="truncate">
                      AI Civic & Legal Copilot • Grounded in Indian Public Statutes
                    </span>
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <a href={CONFIG.RTI_ONLINE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary underline">RTI Online</a>
                      <span>•</span>
                      <a href={CONFIG.CPGRAMS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary underline">CPGRAMS</a>
                      <span>•</span>
                      <a href={CONFIG.CONSUMER_HELPLINE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary underline">NCH 1915</a>
                    </div>
                  </div>
                </div>

                <div ref={chatEndRef} className="h-2" />
              </div>
            </div>

            {/* Floating 'Latest message' Button when user has scrolled up */}
            {showScrollToBottom && (
              <div className="absolute right-4 sm:right-8 bottom-6 z-30 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => scrollToBottom(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container-highest border border-outline-variant shadow-lg text-xs font-semibold text-primary hover:bg-surface-container hover:shadow-xl transition-all active:scale-95 cursor-pointer animate-in fade-in slide-in-from-bottom-2"
                  title="Scroll to latest message"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                  <span>Latest message</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Non-Chat Tab Views (Scrollable with full statutory footer at the bottom) */}
        {activeTab !== "chat" && (
          <div className="flex-1 min-h-0 w-full overflow-y-auto flex flex-col justify-between">
            <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 flex-1">
              {/* VIEW 2: RTI Draftsman Suite */}
              {activeTab === "rti_draft" && (
                <div className="max-w-4xl mx-auto w-full animate-in fade-in duration-200">
                  <DocumentGenerator
                    initialRTI={customDraftRTI || undefined}
                    onGenerateDoc={handleGenerateRTIDocs}
                  />
                </div>
              )}

              {/* VIEW 4: Welfare Scheme Eligibility Engine */}
              {activeTab === "schemes" && (
                <div className="max-w-4xl mx-auto w-full animate-in fade-in duration-200">
                  <EligibilityFlow schemes={schemes} />
                </div>
              )}

              {/* VIEW 5: Verified Statutory Library & Sources */}
              {activeTab === "sources" && (
                <div className="max-w-5xl mx-auto w-full animate-in fade-in duration-200 space-y-4">
                  <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-serif font-bold text-lg text-on-surface">
                        Authoritative Civic & Statutory Knowledge Base
                      </h3>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Pre-indexed Indian Acts, Gazette rules, and grievance portals used by SARATHI.
                      </p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed">
                      100% Grounded
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sources.map((s) => (
                      <div
                        key={s.sourceId}
                        className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant hover:border-primary/50 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <SourceChip citation={s} />
                            <span className="text-[10px] text-on-surface-variant font-mono">
                              {s.jurisdiction}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-on-surface leading-snug">{s.title}</h4>
                          <p className="text-xs text-on-surface-variant mt-1">
                            Authority: {s.issuingAuthority}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between text-xs">
                          <span className="text-[10px] text-on-surface-variant">
                            Verified: {s.lastVerified || "2024"}
                          </span>
                          {s.url && (
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-primary hover:underline text-xs"
                            >
                              <span>Official Portal</span>
                              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW 6: My Cloud Case Files */}
              {activeTab === "cases" && (
                <div className="max-w-4xl mx-auto w-full animate-in fade-in duration-200 space-y-4">
                  {!currentUser ? (
                    <div className="p-8 text-center rounded-2xl bg-surface-container-lowest border border-outline-variant space-y-4">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[32px]">cloud_sync</span>
                      </div>
                      <div className="max-w-md mx-auto space-y-1.5">
                        <h3 className="font-serif font-bold text-lg text-on-surface">
                          Sign in to Access Your Case Files
                        </h3>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          Connect your Google account to automatically store and sync your civic grievance roadmaps, RTI drafts, and document records securely in Firebase Cloud.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalConfig({
                            title: "Sign in with Google",
                            description: "Connect your Google account to view and synchronize all your saved civic roadmaps.",
                          });
                          setAuthModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-xs"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-serif font-bold text-lg text-on-surface">
                            My Cloud Case Files & Action Plans
                          </h3>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            Account: <span className="font-semibold text-on-surface">{currentUser.email || "Google Account"}</span> • Scoped to UID:{" "}
                            <code className="font-mono text-primary font-bold">
                              {currentUser.uid.slice(0, 10)}...
                            </code>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-surface-container text-on-surface-variant">
                            {userCases.length} Cases Saved
                          </span>
                          <button
                            type="button"
                            onClick={handleStartNewCase}
                            className="px-3 py-1.5 rounded-full bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-all"
                          >
                            + New Case
                          </button>
                        </div>
                      </div>

                      {userCases.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl bg-surface-container-low border border-outline-variant">
                          <span className="material-symbols-outlined text-[36px] text-on-surface-variant mb-2">
                            folder_open
                          </span>
                          <p className="text-xs font-semibold text-on-surface">No saved cases yet in Firestore</p>
                          <p className="text-[11px] text-on-surface-variant mt-1">
                            When you submit a civic grievance or RTI query, your case roadmap will sync to Firestore automatically.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {userCases.map((c) => (
                            <div
                              key={c.caseId}
                              className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant flex flex-wrap items-center justify-between gap-3 hover:shadow-xs transition-all"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase text-primary font-label-caps">
                                    {c.category.replace(/_/g, " ")}
                                  </span>
                                  <span className="text-[10px] text-on-surface-variant">
                                    • {new Date(c.updatedAt).toLocaleDateString("en-IN")}
                                  </span>
                                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                                    Cloud Synced
                                  </span>
                                </div>
                                <h4 className="font-semibold text-sm text-on-surface mt-1">{c.title}</h4>
                                {c.actionPlan && (
                                  <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-1">
                                    Authority: {c.actionPlan.authority.name}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveCaseId(c.caseId);
                                    setMessages(c.messages);
                                    if (c.problemAnalysis) setCurrentProblemAnalysis(c.problemAnalysis);
                                    if (c.actionPlan) setCurrentActionPlan(c.actionPlan);
                                    setActiveTab("chat");
                                  }}
                                  className="px-3.5 py-1.5 rounded-full bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
                                >
                                  Resume Case
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Statutory Footer for Document/Catalog Views */}
            <footer className="bg-surface-container-low border-t border-outline-variant py-4 px-4 sm:px-8 text-center text-xs text-on-surface-variant shrink-0 mt-6">
              <div className="max-w-5xl mx-auto space-y-1.5">
                <p className="leading-relaxed text-[11px]">
                  <strong className="text-on-surface">Statutory Notice: </strong>
                  {CONFIG.DISCLAIMER}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-on-surface-variant/80 pt-1">
                  <a
                    href={CONFIG.RTI_ONLINE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary underline"
                  >
                    RTI Online (rtionline.gov.in)
                  </a>
                  <span>•</span>
                  <a
                    href={CONFIG.CPGRAMS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary underline"
                  >
                    CPGRAMS (pgportal.gov.in)
                  </a>
                  <span>•</span>
                  <a
                    href={CONFIG.CONSUMER_HELPLINE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary underline"
                  >
                    National Consumer Helpline (1915)
                  </a>
                  <span>•</span>
                  <span>SARATHI v1.0.0 (Connected to Firebase Cloud)</span>
                </div>
              </div>
            </footer>
          </div>
        )}
      </main>

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSignIn={handleGoogleSignIn}
        title={authModalConfig.title}
        description={authModalConfig.description}
      />
    </div>
  );
}

export default App;
