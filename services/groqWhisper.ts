/**
 * SARATHI - Groq Whisper Speech-to-Text Service
 * Provides ultra-fast, source-grounded speech recognition across Indian languages
 * (Hindi, English, Hinglish, Bengali, Tamil, Telugu, Marathi, Kannada, Gujarati, Punjabi, Malayalam, Odia, etc.)
 * using Groq's official OpenAI-compatible transcription endpoint with whisper-large-v3.
 */

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  language?: string;
  duration?: number;
  provider: "groq-whisper" | "fallback";
  error?: string;
}

/**
 * Maps SARATHI application language codes and names to official ISO-639-1 language codes supported by Whisper.
 * For Hinglish, code-mixed, romanized, unknown, or auto, returns null so the language parameter is omitted
 * and Whisper auto-detects naturally.
 */
const WHISPER_LANGUAGE_MAP: Record<string, string> = {
  en: "en",
  english: "en",
  "en-in": "en",
  "en-us": "en",

  hi: "hi",
  hindi: "hi",
  "hi-in": "hi",

  bn: "bn",
  bengali: "bn",
  bangla: "bn",
  "bn-in": "bn",

  ta: "ta",
  tamil: "ta",
  "ta-in": "ta",

  te: "te",
  telugu: "te",
  "te-in": "te",

  mr: "mr",
  marathi: "mr",
  "mr-in": "mr",

  kn: "kn",
  kannada: "kn",
  "kn-in": "kn",

  gu: "gu",
  gujarati: "gu",
  "gu-in": "gu",

  pa: "pa",
  punjabi: "pa",
  "pa-in": "pa",

  ml: "ml",
  malayalam: "ml",
  "ml-in": "ml",

  or: "or",
  odia: "or",
  oriya: "or",
  "od-in": "or",
  "or-in": "or",

  ur: "ur",
  urdu: "ur",
  "ur-in": "ur",

  as: "as",
  assamese: "as",
  "as-in": "as",

  sa: "sa",
  sanskrit: "sa",
};

/**
 * Validates and normalizes SARATHI language input into an official Whisper ISO code or null.
 * Specifically rejects 'hinglish', 'code-mixed', 'romanized', 'auto', etc., returning null so
 * the language parameter is omitted from the Groq API call.
 */
export function normalizeWhisperLanguage(rawLang?: string | null): string | null {
  if (!rawLang) return null;

  const normalized = rawLang.trim().toLowerCase();

  // Explicitly check for code-mixed / Hinglish / Auto tags
  if (
    normalized === "hinglish" ||
    normalized === "code-mixed" ||
    normalized === "codemixed" ||
    normalized === "romanized" ||
    normalized === "romanized hindi" ||
    normalized === "auto" ||
    normalized === "unknown" ||
    normalized === "all"
  ) {
    return null;
  }

  // Check direct mapping
  if (WHISPER_LANGUAGE_MAP[normalized]) {
    return WHISPER_LANGUAGE_MAP[normalized];
  }

  // Check if it's already a 2-letter ISO code in our supported list
  const prefix = normalized.split("-")[0].split("_")[0];
  if (WHISPER_LANGUAGE_MAP[prefix]) {
    return WHISPER_LANGUAGE_MAP[prefix];
  }

  // Any other custom/unrecognized label should omit the language parameter
  return null;
}

export class GroqWhisperService {
  private static getApiKey(): string {
    return process.env.GROQ_API_KEY?.trim() || "";
  }

  public static isConfigured(): boolean {
    return Boolean(this.getApiKey().length > 0);
  }

  /**
   * Transcribes audio buffer using Groq's Whisper API endpoint.
   * Endpoint: POST https://api.groq.com/openai/v1/audio/transcriptions
   */
  public static async transcribeAudio(
    audioBuffer: Buffer,
    mimeType = "audio/webm",
    targetLanguage?: string,
    prompt?: string
  ): Promise<TranscriptionResult> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      console.warn("[VOICE] GROQ_API_KEY is not configured on server.");
      return {
        success: false,
        provider: "fallback",
        error: "GROQ_API_KEY is not configured on the server.",
      };
    }

    try {
      console.log(`[VOICE] Recording received (${audioBuffer.length} bytes, format: ${mimeType})`);

      // Determine appropriate filename extension for Whisper
      let ext = "webm";
      if (mimeType.includes("wav")) ext = "wav";
      else if (mimeType.includes("mp4") || mimeType.includes("m4a")) ext = "m4a";
      else if (mimeType.includes("mp3") || mimeType.includes("mpeg")) ext = "mp3";
      else if (mimeType.includes("ogg")) ext = "ogg";
      else if (mimeType.includes("flac")) ext = "flac";

      const filename = `audio_${Date.now()}.${ext}`;

      // Create native FormData and File/Blob for Groq API
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: mimeType });
      formData.append("file", blob, filename);
      formData.append("model", "whisper-large-v3");
      formData.append("response_format", "verbose_json");
      formData.append("temperature", "0");

      if (prompt) {
        formData.append("prompt", prompt.slice(0, 500));
      }

      // Safe Language Normalization
      const whisperIsoCode = normalizeWhisperLanguage(targetLanguage);

      console.log(`[VOICE] SARATHI language: ${targetLanguage || "unspecified"}`);
      if (whisperIsoCode) {
        console.log(`[VOICE] Whisper language parameter: ${whisperIsoCode}`);
        formData.append("language", whisperIsoCode);
      } else {
        console.log(`[VOICE] Whisper language parameter: omitted (auto-detection active)`);
      }

      console.log(`[VOICE] Calling Groq Whisper (model: whisper-large-v3)...`);

      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(`[VOICE] Groq Whisper API error status ${response.status}:`, errorText.slice(0, 200));

        if (response.status === 429) {
          return {
            success: false,
            provider: "fallback",
            error: "Groq transcription rate limit reached. Please try again in a moment.",
          };
        }

        return {
          success: false,
          provider: "fallback",
          error: "Unable to transcribe the audio right now. Please try again or type your message.",
        };
      }

      const data = await response.json();
      const transcribedText = (data.text || "").trim();

      console.log(`[VOICE] Transcription successful, length: ${transcribedText.length} chars, detected language: ${data.language || "auto"}`);

      return {
        success: true,
        text: transcribedText,
        language: data.language || targetLanguage,
        duration: data.duration,
        provider: "groq-whisper",
      };
    } catch (err: any) {
      console.error("[VOICE] Error executing Groq Whisper transcription:", err.message || err);
      return {
        success: false,
        provider: "fallback",
        error: "Unable to transcribe the audio right now. Please try again or type your message.",
      };
    }
  }
}
