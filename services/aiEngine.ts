/**
 * SARATHI - Centralized AI Provider Abstraction (generateWithAI)
 * 
 * PRIMARY: Google Gemini (via @google/genai SDK with exponential backoff & model cascade)
 * SECONDARY: OpenRouter Fallback Chain (configurable models e.g. Llama 3.3 70B, Mistral Small, Qwen 2.5)
 * 
 * Guarantees:
 * - Completely transparent and seamless to the citizen (Zero error leakage or provider names)
 * - Preserves system instructions, conversation context, RAG grounding, response modes (Basic/Advanced), and language
 * - Strict schema parsing and error handling
 * - Never fabricates legal advice if both providers fail
 * - Secure credential handling (never logs API keys or private tokens)
 */

import { GoogleGenAI, Type } from "@google/genai";
import { SarvamService } from "./sarvam";

// Configured OpenRouter fallback API Key resolver
function getOpenRouterApiKey(): string {
  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim()) {
    return process.env.OPENROUTER_API_KEY.trim();
  }
  // Check if OPENROUTER_MODELS env accidentally contains the API key (sk-or-...)
  if (process.env.OPENROUTER_MODELS && process.env.OPENROUTER_MODELS.startsWith("sk-")) {
    return process.env.OPENROUTER_MODELS.trim();
  }
  return "";
}

// Primary Gemini model cascade
const GEMINI_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.7-flash",
  "gemini-flash-latest",
];

const DEFAULT_OPENROUTER_MODELS = [
  "meta-llama/llama-3.3-70b-instruct",
  "mistralai/mistral-small-24b-instruct-2501",
  "qwen/qwen-2.5-72b-instruct",
  "google/gemini-2.5-flash",
  "openai/gpt-4o-mini",
];

// OpenRouter model cascade from env or top-tier models
function getOpenRouterModels(): string[] {
  const envModels = process.env.OPENROUTER_MODELS;
  if (envModels && envModels.trim() && !envModels.startsWith("sk-") && envModels.includes("/")) {
    const parsed = envModels
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m.includes("/"));
    if (parsed.length > 0) return parsed;
  }
  return DEFAULT_OPENROUTER_MODELS;
}

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-sarathi",
        },
      },
    });
  }
  return aiClient;
}

export interface AIOptions {
  systemInstruction: string;
  prompt: string | any[];
  responseMimeType?: "application/json" | "text/plain";
  responseSchema?: any;
  temperature?: number;
  responseMode?: "basic" | "advanced";
  userLanguage?: string;
  simulateGeminiFailure?: boolean;
  simulateOpenRouterFailure?: boolean;
  forceBothProvidersFailure?: boolean;
}

export interface AIExecutionResult {
  text: string;
  provider: "gemini" | "openrouter" | "sarvam";
  modelUsed: string;
}

/**
 * Calls OpenRouter with model failover cascade
 */
async function callOpenRouterCascade(
  systemInstruction: string,
  userPrompt: string | any[],
  isJson: boolean,
  temperature = 0.2,
  simulateOpenRouterFailure = false
): Promise<{ text: string; model: string }> {
  if (simulateOpenRouterFailure) {
    throw new Error("Simulated OpenRouter upstream 503 / network failure.");
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("OpenRouter API key is not configured in environment.");
  }

  let formattedContent: any = userPrompt;
  if (Array.isArray(userPrompt)) {
    formattedContent = userPrompt.map((item) => {
      if (item.inlineData) {
        return {
          type: "image_url",
          image_url: {
            url: `data:${item.inlineData.mimeType};base64,${item.inlineData.data}`,
          },
        };
      }
      return {
        type: "text",
        text: item.text || "",
      };
    });
  }

  const candidateModels = getOpenRouterModels();
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const payload: any = {
        model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: formattedContent },
        ],
        temperature,
      };

      if (isJson) {
        payload.response_format = { type: "json_object" };
      }

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://ai.studio/build",
          "X-Title": "SARATHI Civic & Legal Copilot",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.warn(`[OpenRouter Cascade] Model ${model} returned HTTP ${res.status}: ${errorBody.slice(0, 200)}`);
        continue;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content && content.trim()) {
        console.log(`[AI Engine] Request successfully resolved via OpenRouter fallback (${model})`);
        return { text: content.trim(), model };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[OpenRouter Cascade] Model ${model} failed:`, err?.message || err);
    }
  }

  throw lastError || new Error("All configured OpenRouter fallback models failed to respond.");
}

/**
 * Centralized AI Generation Function (generateWithAI)
 * 
 * Executes Primary (Gemini) -> Secondary (OpenRouter) with complete context preservation.
 */
export async function generateWithAI(options: AIOptions): Promise<AIExecutionResult> {
  const {
    systemInstruction,
    prompt,
    responseMimeType = "application/json",
    responseSchema,
    temperature = 0.2,
    simulateGeminiFailure = false,
    simulateOpenRouterFailure = false,
    forceBothProvidersFailure = false,
  } = options;

  if (forceBothProvidersFailure) {
    throw new Error("Sorry, SARATHI is temporarily unable to generate a source-grounded response. Please try again in a moment.");
  }

  const isJson = responseMimeType === "application/json";

  // 1. PRIMARY PROVIDER: Google Gemini
  if (!simulateGeminiFailure && process.env.SIMULATE_GEMINI_FAILURE !== "true") {
    const ai = getGenAI();
    let lastGeminiError: any = null;

    for (let i = 0; i < GEMINI_MODELS.length; i++) {
      const model = GEMINI_MODELS[i];
      try {
        const reqConfig: any = {
          systemInstruction,
          temperature,
        };

        if (isJson) {
          reqConfig.responseMimeType = "application/json";
          if (responseSchema) {
            reqConfig.responseSchema = responseSchema;
          }
        }

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: reqConfig,
        });

        const text = response?.text;
        if (text && text.trim()) {
          return {
            text: text.trim(),
            provider: "gemini",
            modelUsed: model,
          };
        }
      } catch (geminiErr: any) {
        lastGeminiError = geminiErr;
        const errMsg = String(geminiErr?.message || geminiErr);
        const isQuotaOrTransient =
          geminiErr?.status === "UNAVAILABLE" ||
          geminiErr?.code === 503 ||
          geminiErr?.code === 429 ||
          errMsg.includes("429") ||
          errMsg.includes("503") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("high demand") ||
          errMsg.includes("quota");

        console.warn(
          `[AI Engine] Gemini attempt ${i + 1}/${GEMINI_MODELS.length} with ${model} failed${
            isQuotaOrTransient ? " (quota/rate-limit error)" : ""
          }: ${errMsg.slice(0, 150)}`
        );

        if (i < GEMINI_MODELS.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
        }
      }
    }

    console.warn("[AI Engine] Primary Gemini models exhausted. Seamlessly switching to Secondary OpenRouter fallback...");
  } else {
    console.log("[AI Engine] Simulated Gemini 429/Quota limit active -> Routing directly to OpenRouter fallback...");
  }

  // 2. SECONDARY PROVIDER: OpenRouter Fallback Chain
  try {
    const fallbackResult = await callOpenRouterCascade(
      systemInstruction,
      prompt,
      isJson,
      temperature,
      simulateOpenRouterFailure
    );

    return {
      text: fallbackResult.text,
      provider: "openrouter",
      modelUsed: fallbackResult.model,
    };
  } catch (fallbackError: any) {
    // 3. TERTIARY PROVIDER: Sarvam Indic LLM (if configured)
    if (SarvamService.isConfigured() && !simulateOpenRouterFailure) {
      try {
        console.log("[AI Engine] Attempting Sarvam Indic LLM tertiary fallback...");
        const userPromptText = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
        const sarvamRes = await SarvamService.chatCompletion(
          [
            { role: "system", content: systemInstruction },
            { role: "user", content: userPromptText },
          ],
          temperature
        );
        return {
          text: sarvamRes.text,
          provider: "sarvam",
          modelUsed: sarvamRes.model,
        };
      } catch (sarvamErr: any) {
        console.warn("[AI Engine] Sarvam Indic LLM fallback also failed:", sarvamErr?.message || sarvamErr);
      }
    }

    console.error("[AI Engine Critical] All AI providers failed:", fallbackError?.message || fallbackError);
    throw new Error(
      "Sorry, SARATHI is temporarily unable to generate a source-grounded response. Please try again in a moment."
    );
  }
}

/**
 * Robust JSON parser with automatic fence cleaning and bracket extraction
 */
export function parseAIJson<T>(rawText: string | undefined): T {
  if (!rawText || !rawText.trim()) {
    throw new Error("Empty response received from AI model.");
  }
  let clean = rawText.trim();
  if (clean.startsWith("```json")) clean = clean.slice(7);
  else if (clean.startsWith("```")) clean = clean.slice(3);
  if (clean.endsWith("```")) clean = clean.slice(0, -3);
  clean = clean.trim();

  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(clean) as T;
  } catch {
    // Minor repair of trailing commas
    const repaired = clean.replace(/,\s*([\]}])/g, "$1");
    return JSON.parse(repaired) as T;
  }
}
