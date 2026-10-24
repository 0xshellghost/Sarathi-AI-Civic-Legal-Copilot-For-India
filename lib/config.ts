/**
 * SARATHI - Global Configuration & Feature Flags
 */

export const CONFIG = {
  APP_NAME: "SARATHI",
  APP_TAGLINE: "AI Civic & Legal Copilot for Indian Citizens",
  
  // Gemini Models (Using verified active models)
  GEMINI_MODEL: "gemini-3.1-flash-lite",
  GEMINI_EMBEDDING_MODEL: "gemini-embedding-2-preview",
  
  // Standing Disclaimer
  DISCLAIMER: "This tool provides general informational guidance based on publicly available sources and is not a substitute for professional legal advice.",
  
  // Feature Flags & Speech Providers
  SARVAM_ENABLED: Boolean(process.env.SARVAM_API_KEY && process.env.SARVAM_API_KEY.trim().length > 0),
  SARVAM_TTS_MODEL: process.env.SARVAM_TTS_MODEL || "bulbul:v3",
  SARVAM_STT_MODEL: process.env.SARVAM_STT_MODEL || "saaras:v4",
  SARVAM_DEFAULT_SPEAKER: process.env.SARVAM_TTS_DEFAULT_SPEAKER || "priya",
  SARVAM_AVAILABLE_SPEAKERS: ["priya", "shubh", "ritu", "ratan", "ishita", "aditya"],

  GROQ_WHISPER_ENABLED: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0),
  GROQ_WHISPER_MODEL: "whisper-large-v3",
  STORAGE_RETENTION_HOURS: 48,
  
  // Rate Limiting (per uid in a 1-hour window)
  MAX_REQUESTS_PER_HOUR: 100,
  
  // RAG Configuration
  RAG: {
    TOP_K: 6,
    MIN_SIMILARITY_THRESHOLD: 0.42,
    KEYWORD_WEIGHT: 0.25,
    VECTOR_WEIGHT: 0.75,
    TIER_WEIGHTS: {
      1: 1.15, // Central/State portals, Acts, Gazettes
      2: 1.05, // Official department circulars, statutory rules
      3: 0.95, // Verified civic guides
      4: 0.85, // General legal reference
    } as Record<number, number>,
  },

  // Document formatting standard
  RTI_ACT_REFERENCE: "Right to Information Act, 2005 (Act No. 22 of 2005)",
  NATIONAL_CONSUMER_HELPLINE: "1915 (National Consumer Helpline)",
  CPGRAMS_URL: "https://pgportal.gov.in",
  RTI_ONLINE_URL: "https://rtionline.gov.in",
  CONSUMER_HELPLINE_URL: "https://consumerhelpline.gov.in",
  E_DAAKHIL_URL: "https://edaakhil.nic.in",
  MYSCHEME_URL: "https://www.myscheme.gov.in",
};
