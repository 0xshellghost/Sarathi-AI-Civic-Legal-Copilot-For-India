/**
 * SARATHI - Advanced Voice & Text-to-Speech Engine
 * 
 * Dual-Engine Hybrid Architecture:
 * 1. STUDIO INDIC VOICE (Primary):
 *    - Powered by Sarvam AI Bulbul v3 via backend /api/voice/tts
 *    - Real human-grade, expressive Indian voices in 11 Indian languages (Hindi, Bengali,
 *      Tamil, Telugu, Marathi, Kannada, Malayalam, Gujarati, Punjabi, Odia, Indian English)
 *    - Personas: Priya (warm female), Shubh (clear male), Ritu, Ratan, Ishita, Aditya
 *    - In-memory audio caching with instant zero-latency replays
 *    - Audio progress tracking & controls (Play, Pause, Resume, Stop, Replay)
 * 
 * 2. CLIENT-SIDE WEB SPEECH API (Automatic Offline Fallback):
 *    - Zero-dependency client-side SpeechSynthesis fallback
 *    - Activates transparently if offline, rate-limited, or unconfigured
 */

export type VoicePlaybackStatus = "idle" | "loading" | "playing" | "paused" | "finished";
export type AudioSourceType = "studio" | "browser" | null;

export interface VoiceServiceState {
  status: VoicePlaybackStatus;
  activeMessageId: string | null;
  language: string;
  voiceName: string | null;
  audioSource: AudioSourceType;
  speaker: string;
  progress: number;
  duration: number;
  isAvailable: boolean;
}

export class VoiceService {
  private status: VoicePlaybackStatus = "idle";
  private activeMessageId: string | null = null;
  private activeLanguage = "en-IN";
  private activeVoiceName: string | null = null;
  private audioSource: AudioSourceType = null;
  private currentSpeaker = "priya";
  private voiceMode: "studio" | "browser" = "studio";
  private isAvailable = true;

  // HTML5 Audio Element for Sarvam Studio Voice
  private audioElement: HTMLAudioElement | null = null;
  private audioCache = new Map<string, string>(); // key -> base64
  private currentProgress = 0;
  private currentDuration = 0;

  // Browser SpeechSynthesis state (fallback)
  private availableVoices: SpeechSynthesisVoice[] = [];
  private textChunks: string[] = [];
  private currentChunkIndex = 0;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  // Listeners & callbacks
  private stateListeners: Set<(state: VoiceServiceState) => void> = new Set();
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((err: any) => void) | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      // Initialize speaker from localStorage
      try {
        const savedSpeaker = localStorage.getItem("sarathi_voice_speaker");
        if (savedSpeaker) this.currentSpeaker = savedSpeaker;
        const savedMode = localStorage.getItem("sarathi_voice_mode");
        if (savedMode === "studio" || savedMode === "browser") this.voiceMode = savedMode;
      } catch (e) {
        // Ignore storage access errors
      }

      // Initialize HTML5 audio element
      this.initAudioElement();

      // Initialize browser SpeechSynthesis voices
      if ("speechSynthesis" in window) {
        this.initVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = () => this.initVoices();
        }
      }
    }
  }

  private initAudioElement() {
    if (typeof window === "undefined") return;
    this.audioElement = new Audio();

    this.audioElement.addEventListener("play", () => {
      this.setStatus("playing");
    });

    this.audioElement.addEventListener("pause", () => {
      if (this.status === "playing") {
        this.setStatus("paused");
      }
    });

    this.audioElement.addEventListener("timeupdate", () => {
      if (!this.audioElement) return;
      const duration = this.audioElement.duration || 0;
      const current = this.audioElement.currentTime || 0;
      this.currentDuration = duration;
      this.currentProgress = duration > 0 ? (current / duration) * 100 : 0;
      this.notifyState();
    });

    this.audioElement.addEventListener("ended", () => {
      this.currentProgress = 100;
      this.setStatus("finished");
      this.onEndCallback?.();
    });

    this.audioElement.addEventListener("error", (e) => {
      console.warn("[VOICE] Audio element playback error:", e);
      // If studio audio fails to play, attempt browser fallback
      if (this.audioSource === "studio") {
        console.log("[VOICE] Studio audio failed to play, switching to browser fallback...");
        this.fallbackToBrowserSpeech();
      } else {
        this.setStatus("idle");
        this.onErrorCallback?.(e);
      }
    });
  }

  private initVoices() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      this.availableVoices = voices;
    }
  }

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
      audioSource: this.audioSource,
      speaker: this.currentSpeaker,
      progress: this.currentProgress,
      duration: this.currentDuration,
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

  public getSpeaker(): string {
    return this.currentSpeaker;
  }

  public setSpeaker(speaker: string) {
    this.currentSpeaker = speaker.toLowerCase();
    try {
      localStorage.setItem("sarathi_voice_speaker", this.currentSpeaker);
    } catch {}
    this.notifyState();
  }

  public getVoiceMode(): "studio" | "browser" {
    return this.voiceMode;
  }

  public setVoiceMode(mode: "studio" | "browser") {
    this.voiceMode = mode;
    try {
      localStorage.setItem("sarathi_voice_mode", mode);
    } catch {}
    this.notifyState();
  }

  /**
   * Maps user-selected response language name or code to standardized BCP-47 locale
   */
  public mapLanguageToBCP47(rawLang: string = "English", sampleText: string = ""): {
    primaryLocale: string;
    baseLang: string;
  } {
    const l = rawLang.toLowerCase().trim();

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

  public selectBestVoice(primaryLocale: string, baseLang: string): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    const femaleKeywords = [
      "female", "natural", "premium", "neural", "google", "microsoft",
      "aditi", "rishi", "heera", "samantha", "priya", "veena", "zira",
      "swara", "jenny", "karen", "serena", "sangeeta", "lekha", "kalpana", "pooja"
    ];

    const isFemale = (voice: SpeechSynthesisVoice): boolean => {
      const name = voice.name.toLowerCase();
      return femaleKeywords.some((kw) => name.includes(kw));
    };

    const normalizeLang = (l: string) => l.toLowerCase().replace(/_/g, "-");
    const targetNorm = normalizeLang(primaryLocale);
    const baseNorm = normalizeLang(baseLang);

    const exactFemale = voices.find(
      (v) => normalizeLang(v.lang) === targetNorm && isFemale(v)
    );
    if (exactFemale) return exactFemale;

    const exactAny = voices.find((v) => normalizeLang(v.lang) === targetNorm);
    if (exactAny) return exactAny;

    const indianFemale = voices.find(
      (v) => normalizeLang(v.lang).includes("-in") && normalizeLang(v.lang).startsWith(baseNorm) && isFemale(v)
    );
    if (indianFemale) return indianFemale;

    const baseFemale = voices.find(
      (v) => normalizeLang(v.lang).startsWith(baseNorm) && isFemale(v)
    );
    if (baseFemale) return baseFemale;

    const baseAny = voices.find((v) => normalizeLang(v.lang).startsWith(baseNorm));
    if (baseAny) return baseAny;

    const defaultVoice = voices.find((v) => v.default);
    return defaultVoice || voices[0] || null;
  }

  public cleanTextForSpeech(rawText: string): string {
    if (!rawText) return "";

    let text = rawText;
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    text = text.replace(/https?:\/\/[^\s)]+/g, "");
    text = text.replace(/^#{1,6}\s+/gm, "");
    text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
    text = text.replace(/\*([^*]+)\*/g, "$1");
    text = text.replace(/__([^_]+)__/g, "$1");
    text = text.replace(/_([^_]+)_/g, "$1");
    text = text.replace(/~~([^~]+)~~/g, "$1");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/`([^`]+)`/g, "$1");
    text = text.replace(/^\s*[-*+]\s+/gm, "");
    text = text.replace(/^\s*(\d+)\.\s+/gm, "Step $1. ");
    text = text.replace(/\|/g, ", ");
    text = text.replace(/[-]{3,}/g, "");
    text = text.replace(/\[(?:Source|Citation|Ref|Section|cit_[a-z0-9_]+)[^\]]*\]/gi, "");
    text = text.replace(/₹\s*(\d+(?:,\d+)*(?:\.\d+)?)/g, "Rupees $1");
    text = text.replace(/Rs\.?\s*(\d+(?:,\d+)*(?:\.\d+)?)/gi, "Rupees $1");
    text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
    text = text.replace(/\n{2,}/g, ". ");
    text = text.replace(/\n/g, ", ");
    text = text.replace(/\s+/g, " ");
    text = text.replace(/\.\s*\./g, ".");
    text = text.replace(/,\s*,/g, ",");
    return text.trim();
  }

  public chunkText(text: string, maxChunkLength = 220): string[] {
    if (text.length <= maxChunkLength) return [text];
    const rawSentences = text.match(/[^.!?।\n]+[.!?।\n]+/g) || [text];
    const chunks: string[] = [];
    let current = "";

    for (const sentence of rawSentences) {
      if ((current + sentence).length > maxChunkLength) {
        if (current.trim()) chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }

    if (current.trim()) chunks.push(current.trim());
    return chunks.length > 0 ? chunks : [text.slice(0, maxChunkLength)];
  }

  private pendingText = "";
  private pendingLang = "English";

  /**
   * Main Speak Method
   * Requests Sarvam Bulbul Studio Voice first; falls back smoothly to Web Speech API.
   */
  public async speak(
    rawText: string,
    options?: {
      targetLangCode?: string;
      messageId?: string;
      speaker?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ) {
    const msgId = options?.messageId || "msg_" + Date.now();
    const rawLang = options?.targetLangCode || "English";
    const speakerToUse = (options?.speaker || this.currentSpeaker || "priya").toLowerCase();

    // 1. If currently paused on the same message -> Resume
    if (this.status === "paused" && this.activeMessageId === msgId) {
      this.resume();
      return;
    }

    // 2. Stop any existing playback
    this.stop();

    const cleanText = this.cleanTextForSpeech(rawText);
    if (!cleanText) {
      this.setStatus("idle");
      options?.onEnd?.();
      return;
    }

    this.pendingText = cleanText;
    this.pendingLang = rawLang;
    this.activeMessageId = msgId;
    this.onEndCallback = options?.onEnd || null;
    this.onErrorCallback = options?.onError || null;

    // 3. Try Studio Voice (Sarvam Bulbul) first unless explicitly forced to browser mode
    if (this.voiceMode !== "browser") {
      this.setStatus("loading");
      options?.onStart?.();

      const cacheKey = `${cleanText.slice(0, 100)}_${rawLang}_${speakerToUse}`;
      const cachedAudio = this.audioCache.get(cacheKey);

      if (cachedAudio) {
        console.log("[VOICE] Replaying cached Sarvam Studio Voice audio");
        this.playStudioAudio(cachedAudio, rawLang, speakerToUse);
        return;
      }

      try {
        const response = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: cleanText,
            targetLanguage: rawLang,
            speaker: speakerToUse,
            pace: 1.0,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.audioBase64) {
            this.audioCache.set(cacheKey, data.audioBase64);
            this.playStudioAudio(data.audioBase64, rawLang, data.speaker || speakerToUse);
            return;
          }
        }
        console.warn("[VOICE] Sarvam TTS endpoint did not return audio, falling back to browser SpeechSynthesis...");
      } catch (err) {
        console.warn("[VOICE] Sarvam TTS request failed, falling back to browser SpeechSynthesis:", err);
      }
    }

    // 4. Fallback to Browser Native SpeechSynthesis
    this.fallbackToBrowserSpeech();
  }

  private playStudioAudio(base64Audio: string, lang: string, speaker: string) {
    if (!this.audioElement) {
      this.fallbackToBrowserSpeech();
      return;
    }

    try {
      this.audioSource = "studio";
      this.activeVoiceName = `Sarvam Bulbul (${speaker})`;
      this.activeLanguage = lang;
      this.currentProgress = 0;

      const audioSrc = `data:audio/wav;base64,${base64Audio}`;
      this.audioElement.src = audioSrc;
      this.audioElement.play().catch((err) => {
        console.warn("[VOICE] Audio play failed:", err);
        this.fallbackToBrowserSpeech();
      });
    } catch (e) {
      console.warn("[VOICE] Exception setting audio source:", e);
      this.fallbackToBrowserSpeech();
    }
  }

  private fallbackToBrowserSpeech() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      this.setStatus("idle");
      this.onErrorCallback?.(new Error("Voice playback isn't available in this browser."));
      return;
    }

    const { primaryLocale, baseLang } = this.mapLanguageToBCP47(this.pendingLang, this.pendingText);
    const selectedVoice = this.selectBestVoice(primaryLocale, baseLang);

    console.log(`[VOICE] Fallback voice: ${selectedVoice ? selectedVoice.name : "Browser Default"} (${primaryLocale})`);

    this.audioSource = "browser";
    this.activeLanguage = primaryLocale;
    this.activeVoiceName = selectedVoice ? selectedVoice.name : "Browser Voice";
    this.currentProgress = 0;

    this.textChunks = this.chunkText(this.pendingText);
    this.currentChunkIndex = 0;

    this.playNextChunk(primaryLocale, selectedVoice);
  }

  private playNextChunk(locale: string, voice: SpeechSynthesisVoice | null) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (this.currentChunkIndex >= this.textChunks.length) {
      this.currentUtterance = null;
      this.currentProgress = 100;
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
      this.currentProgress = ((this.currentChunkIndex + 0.1) / this.textChunks.length) * 100;
      if (this.status !== "playing") {
        this.setStatus("playing");
      }
    };

    utterance.onend = () => {
      this.currentChunkIndex++;
      this.currentProgress = (this.currentChunkIndex / this.textChunks.length) * 100;
      if (this.currentChunkIndex < this.textChunks.length) {
        this.playNextChunk(locale, voice);
      } else {
        this.currentUtterance = null;
        this.currentProgress = 100;
        this.setStatus("finished");
        this.onEndCallback?.();
      }
    };

    utterance.onerror = (e) => {
      if (e.error === "interrupted" || e.error === "canceled") return;
      console.warn("[VOICE] SpeechSynthesis error:", e);
      this.currentUtterance = null;
      this.setStatus("idle");
      this.onErrorCallback?.(e);
    };

    this.currentUtterance = utterance;
    this.setStatus("playing");
    window.speechSynthesis.speak(utterance);
  }

  public pause() {
    if (this.audioSource === "studio" && this.audioElement) {
      this.audioElement.pause();
      this.setStatus("paused");
      return;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        this.setStatus("paused");
      }
    }
  }

  public resume() {
    if (this.audioSource === "studio" && this.audioElement) {
      this.audioElement.play().then(() => this.setStatus("playing")).catch(() => {});
      return;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        this.setStatus("playing");
      }
    }
  }

  public stop() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.textChunks = [];
    this.currentChunkIndex = 0;
    this.currentUtterance = null;
    this.audioSource = null;
    this.currentProgress = 0;
    this.setStatus("idle");
  }
}

export const voiceService = new VoiceService();
