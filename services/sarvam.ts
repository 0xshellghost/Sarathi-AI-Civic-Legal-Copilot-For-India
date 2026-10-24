/**
 * SARATHI - Sarvam AI Production Service
 * 
 * Comprehensive integration for Indian language AI capabilities:
 * 1. Bulbul TTS (bulbul:v3) - Studio-quality, natural Indian language voice synthesis
 *    across 11 Indian languages (Hindi, Bengali, Tamil, Telugu, Marathi, Kannada,
 *    Malayalam, Gujarati, Punjabi, Odia, Indian English) with persona selection (Priya, Shubh, etc.)
 * 2. Saaras STT (saaras:v4) - State-of-the-art speech recognition with native script output,
 *    code-mixing (Hinglish/Tamil-English), and automatic language identification.
 * 3. Mayura Translation (mayura:v1) - High-accuracy bidirectional translation between English
 *    and Indian languages with statutory terminology preservation.
 * 4. Sarvam Indic LLM - Fallback and Indic reasoning support via OpenAI-compatible endpoint.
 */

import { CONFIG } from "../lib/config";

export interface SarvamTTSOptions {
  text: string;
  targetLanguageCode?: string;
  speaker?: string; // "priya", "shubh", "ritu", "ratan", "ishita", "aditya"
  pace?: number; // 0.5 to 2.0 (default: 1.0)
  temperature?: number; // 0.01 to 1.0 (default: 0.6)
  speechSampleRate?: number; // 8000, 16000, 22050, 24000, 44100, 48000 (default: 24000)
}

export interface SarvamTTSResult {
  success: boolean;
  audioBase64?: string;
  mimeType?: string;
  speaker?: string;
  language?: string;
  provider: "sarvam-bulbul";
  error?: string;
}

export interface SarvamSTTOptions {
  audioBuffer: Buffer;
  mimeType?: string;
  targetLanguage?: string;
  prompt?: string;
}

export interface SarvamSTTResult {
  success: boolean;
  text?: string;
  language?: string;
  provider: "sarvam-saaras";
  error?: string;
}

export interface SarvamTranslateOptions {
  input: string;
  sourceLanguageCode?: string;
  targetLanguageCode: string;
}

export interface SarvamTranslateResult {
  success: boolean;
  translatedText?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  provider: "sarvam-translate";
  error?: string;
}

/**
 * Normalizes any SARATHI language string to an official Sarvam BCP-47 language code.
 * Supported codes: hi-IN, bn-IN, ta-IN, te-IN, kn-IN, ml-IN, mr-IN, gu-IN, pa-IN, od-IN, en-IN.
 */
export function normalizeSarvamLanguage(rawLang?: string | null): string {
  if (!rawLang) return "hi-IN";

  const lower = rawLang.trim().toLowerCase();

  // Direct matches
  if (lower === "hi" || lower === "hindi" || lower === "hi-in" || lower.includes("हिंदी")) return "hi-IN";
  if (lower === "hinglish" || lower.includes("hinglish")) return "hi-IN";
  if (lower === "bn" || lower === "bengali" || lower === "bangla" || lower === "bn-in" || lower.includes("বাংলা")) return "bn-IN";
  if (lower === "ta" || lower === "tamil" || lower === "ta-in" || lower.includes("தமிழ்")) return "ta-IN";
  if (lower === "te" || lower === "telugu" || lower === "te-in" || lower.includes("తెలుగు")) return "te-IN";
  if (lower === "mr" || lower === "marathi" || lower === "mr-in" || lower.includes("मराठी")) return "mr-IN";
  if (lower === "kn" || lower === "kannada" || lower === "kn-in" || lower.includes("ಕನ್ನಡ")) return "kn-IN";
  if (lower === "gu" || lower === "gujarati" || lower === "gu-in" || lower.includes("ગુજરાતી")) return "gu-IN";
  if (lower === "pa" || lower === "punjabi" || lower === "pa-in" || lower.includes("ਪੰਜਾਬੀ")) return "pa-IN";
  if (lower === "ml" || lower === "malayalam" || lower === "ml-in" || lower.includes("മലയാളം")) return "ml-IN";
  if (lower === "or" || lower === "od" || lower === "odia" || lower === "oriya" || lower === "od-in" || lower === "or-in" || lower.includes("ଓଡ଼ିଆ")) return "od-IN";
  if (lower === "en" || lower === "english" || lower === "en-in" || lower === "en-us" || lower === "en-gb") return "en-IN";

  // Check prefix
  const prefix = lower.split("-")[0].split("_")[0];
  if (prefix === "hi") return "hi-IN";
  if (prefix === "bn") return "bn-IN";
  if (prefix === "ta") return "ta-IN";
  if (prefix === "te") return "te-IN";
  if (prefix === "mr") return "mr-IN";
  if (prefix === "kn") return "kn-IN";
  if (prefix === "gu") return "gu-IN";
  if (prefix === "pa") return "pa-IN";
  if (prefix === "ml") return "ml-IN";
  if (prefix === "or" || prefix === "od") return "od-IN";
  if (prefix === "en") return "en-IN";

  return "hi-IN";
}

/**
 * Prepares raw assistant markdown/content for studio text-to-speech.
 * Strips markdown markup, turns links into spoken labels, preserves Acts and Sections.
 */
export function cleanTextForTTS(rawText: string): string {
  if (!rawText) return "";

  let cleaned = rawText
    // Remove markdown links but keep text: [Central Information Commission](https://...) -> Central Information Commission
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove inline URLs
    .replace(/https?:\/\/\S+/gi, "")
    // Remove headers markup (### Header -> Header)
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Remove blockquote marks
    .replace(/^\s*>\s*/gm, "")
    // Remove inline code ticks
    .replace(/`([^`]+)`/g, "$1")
    // Remove citation footnotes like [1], [2], [DOC-01]
    .replace(/\[\d+\]/g, "")
    .replace(/\[[A-Za-z0-9_-]+\]/g, "")
    // Turn bullet markers into clean pauses
    .replace(/^[-*•]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    // Collapse multiple blank lines or multiple spaces
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return cleaned;
}

/**
 * Splits long text into chunks that fit within Sarvam Bulbul's 2,500-character single-request ceiling.
 */
function splitTextForTTS(text: string, maxChunkLength = 1800): string[] {
  if (text.length <= maxChunkLength) return [text];

  const chunks: string[] = [];
  const paragraphs = text.split("\n").filter((p) => p.trim().length > 0);
  let currentChunk = "";

  for (const para of paragraphs) {
    if ((currentChunk + " " + para).length <= maxChunkLength) {
      currentChunk = currentChunk ? `${currentChunk}\n${para}` : para;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = "";
      }

      // If single paragraph exceeds max, split by sentences
      if (para.length > maxChunkLength) {
        const sentences = para.split(/(?<=[।?!.\n])\s+/);
        for (const sentence of sentences) {
          if ((currentChunk + " " + sentence).length <= maxChunkLength) {
            currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = sentence;
          }
        }
      } else {
        currentChunk = para;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.length > 0 ? chunks : [text.slice(0, maxChunkLength)];
}

export class SarvamService {
  private static getApiKey(): string {
    return (process.env.SARVAM_API_KEY || "").trim();
  }

  public static isConfigured(): boolean {
    return this.getApiKey().length > 0;
  }

  /**
   * Text-to-Speech using Sarvam Bulbul v3.
   * Generates ultra-natural Indian voice output in 11 languages with persona control.
   */
  public static async textToSpeech(options: SarvamTTSOptions): Promise<SarvamTTSResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        provider: "sarvam-bulbul",
        error: "SARVAM_API_KEY is not configured.",
      };
    }

    try {
      const cleaned = cleanTextForTTS(options.text);
      if (!cleaned || cleaned.trim().length === 0) {
        return {
          success: false,
          provider: "sarvam-bulbul",
          error: "Text for speech synthesis is empty.",
        };
      }

      const targetLang = normalizeSarvamLanguage(options.targetLanguageCode);
      const speaker = (options.speaker || process.env.SARVAM_TTS_DEFAULT_SPEAKER || "priya").toLowerCase();
      const model = process.env.SARVAM_TTS_MODEL || "bulbul:v3";
      const pace = options.pace ?? 1.0;
      const temperature = options.temperature ?? 0.6;
      const sampleRate = options.speechSampleRate ?? 24000;

      // Handle long responses by taking the most relevant core or splitting
      const chunks = splitTextForTTS(cleaned, 1800);
      const primaryChunk = chunks[0];

      console.log(
        `[SARVAM TTS] Synthesizing speech (${primaryChunk.length} chars, lang: ${targetLang}, speaker: ${speaker}, model: ${model})`
      );

      const payload = {
        text: primaryChunk,
        target_language_code: targetLang,
        model,
        speaker,
        pace,
        temperature,
        speech_sample_rate: sampleRate,
        output_audio_codec: "wav",
      };

      const response = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "api-subscription-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(`[SARVAM TTS] API error (HTTP ${response.status}):`, errorText.slice(0, 250));
        return {
          success: false,
          provider: "sarvam-bulbul",
          error: `Sarvam TTS service error (${response.status}): ${errorText.slice(0, 100)}`,
        };
      }

      const data = await response.json();
      const audioBase64 = data.audios?.[0] || data.audio;

      if (!audioBase64) {
        return {
          success: false,
          provider: "sarvam-bulbul",
          error: "No audio data received from Sarvam TTS.",
        };
      }

      console.log(`[SARVAM TTS] Synthesis successful (${Math.round(audioBase64.length * 0.75)} bytes audio)`);

      return {
        success: true,
        audioBase64,
        mimeType: "audio/wav",
        speaker,
        language: targetLang,
        provider: "sarvam-bulbul",
      };
    } catch (err: any) {
      console.error("[SARVAM TTS] Exception during speech synthesis:", err?.message || err);
      return {
        success: false,
        provider: "sarvam-bulbul",
        error: err?.message || "Failed to generate speech with Sarvam AI.",
      };
    }
  }

  /**
   * Speech-to-Text using Sarvam Saaras v4.
   * High-accuracy Indic speech transcription with code-mixing & native script output.
   */
  public static async transcribeAudio(options: SarvamSTTOptions): Promise<SarvamSTTResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        provider: "sarvam-saaras",
        error: "SARVAM_API_KEY is not configured.",
      };
    }

    try {
      const { audioBuffer, mimeType = "audio/webm", targetLanguage } = options;

      let ext = "webm";
      if (mimeType.includes("wav")) ext = "wav";
      else if (mimeType.includes("mp4") || mimeType.includes("m4a")) ext = "m4a";
      else if (mimeType.includes("mp3") || mimeType.includes("mpeg")) ext = "mp3";
      else if (mimeType.includes("ogg")) ext = "ogg";
      else if (mimeType.includes("flac")) ext = "flac";

      const filename = `audio_${Date.now()}.${ext}`;
      const model = process.env.SARVAM_STT_MODEL || "saaras:v4";
      const sarvamLang = targetLanguage ? normalizeSarvamLanguage(targetLanguage) : "unknown";

      console.log(
        `[SARVAM STT] Transcribing audio (${audioBuffer.length} bytes, lang: ${sarvamLang}, model: ${model})`
      );

      const formData = new FormData();
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
      formData.append("file", blob, filename);
      formData.append("model", model);
      formData.append("mode", "transcribe");
      formData.append("language_code", sarvamLang);

      if (options.prompt) {
        formData.append("prompt", options.prompt.slice(0, 500));
      }

      const response = await fetch("https://api.sarvam.ai/speech-to-text", {
        method: "POST",
        headers: {
          "api-subscription-key": apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(`[SARVAM STT] API error (HTTP ${response.status}):`, errorText.slice(0, 250));
        return {
          success: false,
          provider: "sarvam-saaras",
          error: `Sarvam STT error (${response.status}): ${errorText.slice(0, 100)}`,
        };
      }

      const data = await response.json();
      const transcript = (data.transcript || "").trim();

      if (!transcript) {
        return {
          success: false,
          provider: "sarvam-saaras",
          error: "No speech recognized in audio.",
        };
      }

      console.log(`[SARVAM STT] Transcription successful (${transcript.length} chars): ${transcript.slice(0, 50)}...`);

      return {
        success: true,
        text: transcript,
        language: data.language_code || sarvamLang,
        provider: "sarvam-saaras",
      };
    } catch (err: any) {
      console.error("[SARVAM STT] Exception during transcription:", err?.message || err);
      return {
        success: false,
        provider: "sarvam-saaras",
        error: err?.message || "Failed to transcribe audio with Sarvam AI.",
      };
    }
  }

  /**
   * Text Translation using Sarvam Mayura.
   * Specializes in English <-> Indic languages with high accuracy.
   */
  public static async translateText(options: SarvamTranslateOptions): Promise<SarvamTranslateResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        provider: "sarvam-translate",
        error: "SARVAM_API_KEY is not configured.",
      };
    }

    try {
      const sourceLang = options.sourceLanguageCode
        ? normalizeSarvamLanguage(options.sourceLanguageCode)
        : "auto";
      const targetLang = normalizeSarvamLanguage(options.targetLanguageCode);

      if (sourceLang === targetLang) {
        return {
          success: true,
          translatedText: options.input,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
          provider: "sarvam-translate",
        };
      }

      console.log(`[SARVAM TRANSLATE] Translating text (${options.input.length} chars, from: ${sourceLang} to: ${targetLang})`);

      const payload = {
        input: options.input.slice(0, 2000),
        source_language_code: sourceLang,
        target_language_code: targetLang,
        model: "mayura:v1",
      };

      const response = await fetch("https://api.sarvam.ai/translate", {
        method: "POST",
        headers: {
          "api-subscription-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.warn(`[SARVAM TRANSLATE] API error (HTTP ${response.status}):`, errorText.slice(0, 200));
        return {
          success: false,
          provider: "sarvam-translate",
          error: `Sarvam translation error (${response.status}): ${errorText.slice(0, 100)}`,
        };
      }

      const data = await response.json();
      const translated = data.translated_text || data.translation || "";

      return {
        success: true,
        translatedText: translated,
        sourceLanguage: data.source_language_code || sourceLang,
        targetLanguage: targetLang,
        provider: "sarvam-translate",
      };
    } catch (err: any) {
      console.warn("[SARVAM TRANSLATE] Exception during translation:", err?.message || err);
      return {
        success: false,
        provider: "sarvam-translate",
        error: err?.message || "Failed to translate with Sarvam AI.",
      };
    }
  }

  /**
   * Sarvam Chat / Completions fallback endpoint (OpenAI compatible)
   */
  public static async chatCompletion(
    messages: { role: string; content: string }[],
    temperature = 0.2
  ): Promise<{ text: string; model: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("SARVAM_API_KEY is not configured.");
    }

    const model = "sarvam-105b";
    const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Sarvam LLM failed (${response.status}): ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Sarvam LLM.");
    }

    return { text: content.trim(), model };
  }
}
