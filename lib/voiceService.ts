/**
 * SARATHI - Browser-Native Text-to-Speech (TTS) Engine
 * 
 * 100% Client-Side Native Web Speech API Implementation:
 * - Uses window.speechSynthesis and SpeechSynthesisUtterance
 * - Zero API keys, zero backend dependencies, zero network latency
 * - Intelligent voice selection prioritizing soft, natural Indian female voices
 * - Clean text preprocessing (strips markdown, URLs, citation codes, preserves Acts/Schemes)
 * - Automatic sequential sentence chunking for long/advanced responses
 * - Full playback controls: Listen, Pause, Resume, Listen Again, and Stop
 */

export type VoicePlaybackStatus = "idle" | "playing" | "paused" | "finished";

export interface VoiceServiceState {
  status: VoicePlaybackStatus;
  activeMessageId: string | null;
  language: string;
  voiceName: string | null;
  isAvailable: boolean;
}

export class VoiceService {
  private status: VoicePlaybackStatus = "idle";
  private activeMessageId: string | null = null;
  private activeLanguage = "en-IN";
  private activeVoiceName: string | null = null;
  private isAvailable = false;

  private availableVoices: SpeechSynthesisVoice[] = [];
  private textChunks: string[] = [];
  private currentChunkIndex = 0;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  private stateListeners: Set<(state: VoiceServiceState) => void> = new Set();
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((err: any) => void) | null = null;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.isAvailable = true;
      this.initVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.initVoices();
      }
    } else {
      this.isAvailable = false;
    }
  }

  /**
   * Initializes and caches the device's available SpeechSynthesis voices
   */
  private initVoices() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      this.availableVoices = voices;
      console.log(`[VOICE] Available voices: ${voices.length}`);
    }
  }

  /**
   * Refreshes the voices cache if empty
   */
  public getVoices(): SpeechSynthesisVoice[] {
    if (this.availableVoices.length === 0 && typeof window !== "undefined" && "speechSynthesis" in window) {
      this.availableVoices = window.speechSynthesis.getVoices();
    }
    return this.availableVoices;
  }

  public subscribeState(cb: (state: VoiceServiceState) => void): () => void {
    this.stateListeners.add(cb);
    cb(this.getState());
    return () => this.stateListeners.delete(cb);
  }

  public getState(): VoiceServiceState {
    return {
      status: this.status,
      activeMessageId: this.activeMessageId,
      language: this.activeLanguage,
      voiceName: this.activeVoiceName,
      isAvailable: this.isAvailable,
    };
  }

  private setStatus(status: VoicePlaybackStatus) {
    this.status = status;
    this.notifyState();
  }

  private notifyState() {
    const state = this.getState();
    this.stateListeners.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error("[VOICE] State listener exception:", err);
      }
    });
  }

  /**
   * Maps user-selected response language name or code to standardized BCP-47 locale
   */
  public mapLanguageToBCP47(rawLang: string = "English", sampleText: string = ""): {
    primaryLocale: string;
    baseLang: string;
  } {
    const l = rawLang.toLowerCase().trim();

    // Hinglish check: If text contains Devanagari characters, prefer hi-IN, else en-IN
    if (l === "hinglish" || l.includes("hinglish")) {
      const hasDevanagari = /[\u0900-\u097F]/.test(sampleText);
      return hasDevanagari
        ? { primaryLocale: "hi-IN", baseLang: "hi" }
        : { primaryLocale: "en-IN", baseLang: "en" };
    }

    if (l === "hi" || l === "hindi" || l.includes("hindi") || l.includes("हिंदी")) {
      return { primaryLocale: "hi-IN", baseLang: "hi" };
    }
    if (l === "ta" || l === "tamil" || l.includes("tamil") || l.includes("தமிழ்")) {
      return { primaryLocale: "ta-IN", baseLang: "ta" };
    }
    if (l === "te" || l === "telugu" || l.includes("telugu") || l.includes("తెలుగు")) {
      return { primaryLocale: "te-IN", baseLang: "te" };
    }
    if (l === "bn" || l === "bengali" || l.includes("bengali") || l.includes("বাংলা")) {
      return { primaryLocale: "bn-IN", baseLang: "bn" };
    }
    if (l === "mr" || l === "marathi" || l.includes("marathi") || l.includes("मराठी")) {
      return { primaryLocale: "mr-IN", baseLang: "mr" };
    }
    if (l === "gu" || l === "gujarati" || l.includes("gujarati") || l.includes("ગુજરાતી")) {
      return { primaryLocale: "gu-IN", baseLang: "gu" };
    }
    if (l === "kn" || l === "kannada" || l.includes("kannada") || l.includes("ಕನ್ನಡ")) {
      return { primaryLocale: "kn-IN", baseLang: "kn" };
    }
    if (l === "ml" || l === "malayalam" || l.includes("malayalam") || l.includes("മലയാളം")) {
      return { primaryLocale: "ml-IN", baseLang: "ml" };
    }
    if (l === "pa" || l === "punjabi" || l.includes("punjabi") || l.includes("ਪੰਜਾਬੀ")) {
      return { primaryLocale: "pa-IN", baseLang: "pa" };
    }
    if (l === "od" || l === "or" || l === "odia" || l === "oriya" || l.includes("odia") || l.includes("ଓଡ଼ିଆ")) {
      return { primaryLocale: "or-IN", baseLang: "or" };
    }

    return { primaryLocale: "en-IN", baseLang: "en" };
  }

  /**
   * Selects the best available female/natural voice for the target language.
   * Priority hierarchy:
   * 1. Female voice whose language exactly matches the primary locale (e.g. hi-IN).
   * 2. Female Indian voice for the response language.
   * 3. Female voice for the language family (e.g. hi, ta).
   * 4. Any natural language-matched voice.
   * 5. Browser default voice.
   */
  public selectBestVoice(primaryLocale: string, baseLang: string): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    const femaleKeywords = [
      "female",
      "natural",
      "premium",
      "neural",
      "google",
      "microsoft",
      "aditi",
      "rishi",
      "heera",
      "samantha",
      "priya",
      "veena",
      "zira",
      "swara",
      "jenny",
      "karen",
      "serena",
      "sangeeta",
      "lekha",
      "kalpana",
      "pooja",
    ];

    const isFemale = (voice: SpeechSynthesisVoice): boolean => {
      const name = voice.name.toLowerCase();
      return femaleKeywords.some((kw) => name.includes(kw));
    };

    const normalizeLang = (l: string) => l.toLowerCase().replace(/_/g, "-");
    const targetNorm = normalizeLang(primaryLocale);
    const baseNorm = normalizeLang(baseLang);

    // 1. Exact match locale + female
    const exactFemale = voices.find(
      (v) => normalizeLang(v.lang) === targetNorm && isFemale(v)
    );
    if (exactFemale) return exactFemale;

    // 2. Exact match locale (any gender)
    const exactAny = voices.find((v) => normalizeLang(v.lang) === targetNorm);
    if (exactAny) return exactAny;

    // 3. Indian locale variant + female (e.g., en-IN or hi-IN if looking for Indian accent)
    const indianFemale = voices.find(
      (v) => normalizeLang(v.lang).includes("-in") && normalizeLang(v.lang).startsWith(baseNorm) && isFemale(v)
    );
    if (indianFemale) return indianFemale;

    // 4. Base language prefix match + female (e.g., 'hi', 'ta', 'bn')
    const baseFemale = voices.find(
      (v) => normalizeLang(v.lang).startsWith(baseNorm) && isFemale(v)
    );
    if (baseFemale) return baseFemale;

    // 5. Base language prefix match (any gender)
    const baseAny = voices.find((v) => normalizeLang(v.lang).startsWith(baseNorm));
    if (baseAny) return baseAny;

    // 6. If Odia (or-IN / od-IN) alias check
    if (baseNorm === "or" || baseNorm === "od") {
      const odiaMatch = voices.find(
        (v) => normalizeLang(v.lang).startsWith("or") || normalizeLang(v.lang).startsWith("od")
      );
      if (odiaMatch) return odiaMatch;
    }

    // 7. General Indian English / Hindi fallback with female preference
    const enInFemale = voices.find(
      (v) => normalizeLang(v.lang) === "en-in" && isFemale(v)
    );
    if (enInFemale) return enInFemale;

    // 8. General female voice on device
    const generalFemale = voices.find((v) => isFemale(v));
    if (generalFemale) return generalFemale;

    // 9. Device default voice
    const defaultVoice = voices.find((v) => v.default);
    return defaultVoice || voices[0] || null;
  }

  /**
   * Preprocesses response text for spoken audio:
   * - Strips Markdown formatting, code blocks, raw URLs, bracketed citations, and emojis
   * - Preserves official statutory Act titles, Scheme names, helpline numbers, and legal terms
   */
  public cleanTextForSpeech(rawText: string): string {
    if (!rawText) return "";

    let text = rawText;

    // 1. Remove Markdown links [Text](url) -> Text
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    // 2. Remove raw web URLs
    text = text.replace(/https?:\/\/[^\s)]+/g, "");

    // 3. Remove Markdown headings (### Heading -> Heading)
    text = text.replace(/^#{1,6}\s+/gm, "");

    // 4. Remove bold, italic, strikethrough markers
    text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
    text = text.replace(/\*([^*]+)\*/g, "$1");
    text = text.replace(/__([^_]+)__/g, "$1");
    text = text.replace(/_([^_]+)_/g, "$1");
    text = text.replace(/~~([^~]+)~~/g, "$1");

    // 5. Remove code blocks and inline code
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/`([^`]+)`/g, "$1");

    // 6. Convert bullet lists and numbered steps into natural spoken sentences
    text = text.replace(/^\s*[-*+]\s+/gm, "");
    text = text.replace(/^\s*(\d+)\.\s+/gm, "Step $1. ");

    // 7. Remove tables and horizontal dividers
    text = text.replace(/\|/g, ", ");
    text = text.replace(/[-]{3,}/g, "");

    // 8. Remove bracketed citations and technical IDs e.g. [Source: RTI Act 2005] or [cit_123]
    text = text.replace(/\[(?:Source|Citation|Ref|Section|cit_[a-z0-9_]+)[^\]]*\]/gi, "");

    // 9. Normalize currency symbols for clear speech
    text = text.replace(/₹\s*(\d+(?:,\d+)*(?:\.\d+)?)/g, "Rupees $1");
    text = text.replace(/Rs\.?\s*(\d+(?:,\d+)*(?:\.\d+)?)/gi, "Rupees $1");

    // 10. Remove emojis and decorative symbols
    text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");

    // 11. Normalize newlines into sentence pauses
    text = text.replace(/\n{2,}/g, ". ");
    text = text.replace(/\n/g, ", ");

    // 12. Normalize consecutive punctuation and whitespace
    text = text.replace(/\s+/g, " ");
    text = text.replace(/\.\s*\./g, ".");
    text = text.replace(/,\s*,/g, ",");
    text = text.trim();

    return text;
  }

  /**
   * Splits long text into smaller sentence/paragraph chunks for smooth continuous playback
   * without running into browser utterance length timeouts.
   */
  public chunkText(text: string, maxChunkLength = 220): string[] {
    if (text.length <= maxChunkLength) return [text];

    // Match sentences ending in punctuation or newlines
    const rawSentences = text.match(/[^.!?।\n]+[.!?।\n]+/g) || [text];
    const chunks: string[] = [];
    let current = "";

    for (const sentence of rawSentences) {
      if ((current + sentence).length > maxChunkLength) {
        if (current.trim()) {
          chunks.push(current.trim());
        }
        current = sentence;
      } else {
        current += sentence;
      }
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }

    return chunks.length > 0 ? chunks : [text.slice(0, maxChunkLength)];
  }

  /**
   * Main Speak Method
   * Begins or restarts speech for a specific message response
   */
  public speak(
    rawText: string,
    options?: {
      targetLangCode?: string;
      messageId?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      const err = new Error("Voice playback isn't available in this browser.");
      options?.onError?.(err);
      return;
    }

    const msgId = options?.messageId || "active_msg";
    const rawLang = options?.targetLangCode || "English";

    // 1. If currently paused on the same message -> Resume
    if (this.status === "paused" && this.activeMessageId === msgId) {
      this.resume();
      return;
    }

    // 2. Stop any existing playback on this or another message
    this.stop();

    const cleanText = this.cleanTextForSpeech(rawText);
    if (!cleanText) {
      this.setStatus("idle");
      options?.onEnd?.();
      return;
    }

    const { primaryLocale, baseLang } = this.mapLanguageToBCP47(rawLang, cleanText);
    const selectedVoice = this.selectBestVoice(primaryLocale, baseLang);

    // Development diagnostic logs
    console.log(`[VOICE] Available voices: ${this.availableVoices.length}`);
    console.log(`[VOICE] Selected voice: ${selectedVoice ? selectedVoice.name : "Browser Default"}`);
    console.log(`[VOICE] Selected language: ${primaryLocale}`);

    this.activeMessageId = msgId;
    this.activeLanguage = primaryLocale;
    this.activeVoiceName = selectedVoice ? selectedVoice.name : null;
    this.onEndCallback = options?.onEnd || null;
    this.onErrorCallback = options?.onError || null;

    // Split into comfortable chunks for long responses
    this.textChunks = this.chunkText(cleanText);
    this.currentChunkIndex = 0;

    options?.onStart?.();
    this.playNextChunk(primaryLocale, selectedVoice);
  }

  /**
   * Plays chunks sequentially
   */
  private playNextChunk(locale: string, voice: SpeechSynthesisVoice | null) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (this.currentChunkIndex >= this.textChunks.length) {
      this.currentUtterance = null;
      this.setStatus("finished");
      this.onEndCallback?.();
      return;
    }

    const chunk = this.textChunks[this.currentChunkIndex];
    if (!chunk || !chunk.trim()) {
      this.currentChunkIndex++;
      this.playNextChunk(locale, voice);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunk);
    
    // Soft, comfortable, professional female parameters
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = locale;
    }

    utterance.onstart = () => {
      if (this.status !== "playing") {
        this.setStatus("playing");
      }
    };

    utterance.onend = () => {
      this.currentChunkIndex++;
      if (this.currentChunkIndex < this.textChunks.length) {
        this.playNextChunk(locale, voice);
      } else {
        this.currentUtterance = null;
        this.setStatus("finished");
        this.onEndCallback?.();
      }
    };

    utterance.onerror = (e) => {
      // Ignore 'interrupted' or 'canceled' events caused by user clicking stop/pause/new message
      if (e.error === "interrupted" || e.error === "canceled") {
        return;
      }
      console.warn("[VOICE] SpeechSynthesis error:", e);
      this.currentUtterance = null;
      this.setStatus("idle");
      this.onErrorCallback?.(e);
    };

    this.currentUtterance = utterance;
    this.setStatus("playing");
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Pauses active speech playback
   */
  public pause() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        this.setStatus("paused");
      }
    }
  }

  /**
   * Resumes paused speech playback
   */
  public resume() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        this.setStatus("playing");
      }
    }
  }

  /**
   * Stops all active speech synthesis, cancels utterance queue, and resets to idle
   */
  public stop() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.textChunks = [];
    this.currentChunkIndex = 0;
    this.currentUtterance = null;
    this.setStatus("idle");
  }
}

export const voiceService = new VoiceService();
