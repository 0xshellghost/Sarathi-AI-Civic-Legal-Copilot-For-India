/**
 * SARATHI - Structured Schemas for Civic & Legal AI Copilot
 */

export type ProblemCategory =
  | "rti"
  | "consumer_rights"
  | "tenant_rights"
  | "workplace_rights"
  | "welfare_schemes"
  | "government_services"
  | "documentation"
  | "public_grievances"
  | "municipal_issues"
  | "education"
  | "healthcare_schemes"
  | "financial_social_welfare"
  | "identity_documents"
  | "other";

export type UrgencyLevel = "low" | "medium" | "high";

export type ProblemAnalysis = {
  languageDetected: string;
  scriptDetected: string;
  category: ProblemCategory;
  problemSummary: string;
  location: {
    state: string | null;
    district: string | null;
    city: string | null;
  };
  entities: string[];
  possibleRights: string[];
  requiredInformation: string[];
  urgency: UrgencyLevel;
  confidence: number;
  recommendedAction: string;
  isCivicOrLegal: boolean; // For filtering out completely unrelated queries gracefully
};

export type EligibilityResultVerdict = "likely_eligible" | "likely_not_eligible" | "insufficient_information";

export type EligibilityAnalysis = {
  schemeId: string;
  schemeName?: string;
  collectedFields: Record<string, string | number | boolean>;
  missingFields: string[];
  eligibilityResult: EligibilityResultVerdict;
  matchedCriteria: string[];
  unmatchedOrUnknownCriteria: string[];
  confidence: number;
  disclaimer: string;
  sources: string[];
  requiredDocuments: string[];
  applicationProcess?: string;
  officialPortalUrl?: string;
};

export type ActionPlan = {
  situation: string;
  rightsOrOptions: {
    title: string;
    explanation: string;
    sourceId: string;
  }[];
  steps: {
    order: number;
    action: string;
    isOfficial?: boolean;
  }[];
  documentsNeeded: string[];
  authority: {
    name: string;
    jurisdiction: string;
    sourceId: string;
    address?: string;
    portalUrl?: string;
  };
  escalationIfNoResponse: string;
  confidence: number;
};

export type RTIGeneration = {
  publicAuthority: {
    name: string;
    confidence: "confirmed_by_user" | "assumed";
    address?: string;
  };
  subject: string;
  informationSought: string[];
  applicantDetails: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
  };
  factsFromSource: {
    fact: string;
    sourceId: string;
  }[];
  aiDraftedWording: boolean;
  assumptions: string[];
  documentUrl?: string;
  fullApplicationText?: string;
};

export type Citation = {
  sourceId: string;
  title: string;
  issuingAuthority: string;
  url: string;
  tier: number; // 1 = highest trust (central/state govt portals, legislation, gazettes) down to 4 = general web content
  publishedDate: string;
  lastVerified: string;
  jurisdiction?: string;
  docType?: string;
};

export type ReliabilityInfo = {
  overallConfidence: number;
  grounded: boolean;
  numSourcesUsed: number;
  conflictingSources: boolean;
  uncertaintyNote: string | null;
};

export type KnowledgeChunk = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  issuingAuthority: string;
  url: string;
  tier: number;
  jurisdiction: string;
  publishedDate: string;
  content: string;
  embedding?: number[];
  chunkIndex: number;
  metadata?: Record<string, any>;
};

export type WelfareScheme = {
  schemeId: string;
  name: string;
  authority: string;
  jurisdiction: string;
  category: string;
  description: string;
  eligibilityRules: {
    age?: { min?: number; max?: number };
    familyIncome?: { max?: number };
    gender?: string[];
    casteOrCategory?: string[];
    residenceState?: string[];
    isStudent?: boolean;
    landholdingHectares?: { max?: number };
    occupation?: string[];
    disabilityPercentage?: { min?: number };
    customRules?: { field: string; label: string; type: "string" | "number" | "boolean" | "select"; options?: string[]; required?: boolean }[];
  };
  requiredDocuments: string[];
  applicationProcess: string;
  officialUrl: string;
  sourceId: string;
};

export interface CaseMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  language: string;
  canonicalContent?: string;
  canonicalStructuredPayload?: {
    problemAnalysis?: ProblemAnalysis;
    actionPlan?: ActionPlan;
    eligibilityAnalysis?: EligibilityAnalysis;
    rtiGeneration?: RTIGeneration;
    citations?: Citation[];
    reliability?: ReliabilityInfo;
    missingQuestions?: string[];
    untrustedContextWarning?: string;
    redirectMessage?: string;
  };
  structuredPayload?: {
    problemAnalysis?: ProblemAnalysis;
    actionPlan?: ActionPlan;
    eligibilityAnalysis?: EligibilityAnalysis;
    rtiGeneration?: RTIGeneration;
    citations?: Citation[];
    reliability?: ReliabilityInfo;
    missingQuestions?: string[];
    untrustedContextWarning?: string;
    redirectMessage?: string;
  };
  createdAt: string;
}

export type CaseDocument = {
  caseId: string;
  userId: string;
  title: string;
  category: ProblemCategory;
  status: "open" | "action_plan_ready" | "in_progress" | "resolved";
  location: {
    state: string | null;
    district: string | null;
    city: string | null;
  };
  problemAnalysis: ProblemAnalysis | null;
  actionPlan: ActionPlan | null;
  formState: {
    activeFormType?: "rti" | "scheme_eligibility" | "consumer_complaint" | null;
    schemeId?: string | null;
    slots?: Record<string, any>;
    step?: number;
  } | null;
  generatedDocuments: {
    docId: string;
    type: "rti" | "grievance_draft" | "action_plan_summary";
    content: string;
    filePath?: string;
    factsUsed?: string[];
    aiWording?: boolean;
    assumptions?: string[];
    createdAt: string;
    downloadUrlDocx?: string;
    downloadUrlPdf?: string;
  }[];
  messages: CaseMessage[];
  createdAt: string;
  updatedAt: string;
};

export type FeedbackRecord = {
  feedbackId: string;
  caseId: string;
  messageIndex: number;
  rating: "helpful" | "unhelpful" | "partially_helpful";
  comment?: string;
  createdAt: string;
};

export type LanguageCode =
  | "en"
  | "hi"
  | "bn"
  | "ta"
  | "te"
  | "mr"
  | "kn"
  | "gu"
  | "pa"
  | "ml"
  | "or"
  | "hinglish";

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  bcp47?: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", bcp47: "en-IN" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", bcp47: "hi-IN" },
  { code: "hinglish", name: "Hinglish", nativeName: "Hinglish", bcp47: "hi-IN" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", bcp47: "bn-IN" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", bcp47: "ta-IN" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", bcp47: "te-IN" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", bcp47: "mr-IN" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", bcp47: "kn-IN" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", bcp47: "gu-IN" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", bcp47: "pa-IN" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", bcp47: "ml-IN" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ", bcp47: "or-IN" },
];
