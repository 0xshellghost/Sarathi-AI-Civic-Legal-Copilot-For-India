/**
 * SARATHI - High-Level AI Reasoning Services
 * Wraps centralized AI Provider engine (Gemini + OpenRouter Fallback)
 * 
 * Features:
 * - Problem Analyzer (Stage 1)
 * - Rights Navigator & Action Planner (Stage 3)
 * - RTI Application Drafting (Section 6(1))
 * - Multimodal Legal Document & OCR Explainer
 * - Strict Gemini Native Embeddings (no third-party drop-in for embeddings)
 * - Multilingual Preservation Localizer (Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, Gujarati, etc.)
 */

import { Type, GoogleGenAI } from "@google/genai";
import { CONFIG } from "../lib/config";
import { PROMPTS } from "../lib/prompts";
import { ProblemAnalysis, RTIGeneration, ActionPlan } from "../lib/schemas";
import { generateWithAI, parseAIJson } from "./aiEngine";

export { generateWithAI } from "./aiEngine";

let embeddingClient: GoogleGenAI | null = null;
function getEmbeddingClient(): GoogleGenAI {
  if (!embeddingClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    embeddingClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { "User-Agent": "aistudio-sarathi" },
      },
    });
  }
  return embeddingClient;
}

/**
 * Stage 1: Problem Analyzer
 * Classifies the citizen's query in native script, Romanized, or code-mixed input
 * Generates targeted follow-up questions when critical jurisdiction/facts are missing
 */
export async function analyzeProblem(
  userInput: string,
  conversationContext?: string,
  simulateGeminiFailure = false,
  simulateOpenRouterFailure = false,
  forceBothFailure = false
): Promise<ProblemAnalysis> {
  const contextMessage = conversationContext
    ? `PREVIOUS CONVERSATION CONTEXT:\n${conversationContext}\n\nLATEST CITIZEN MESSAGE:\n${userInput}`
    : userInput;

  try {
    const result = await generateWithAI({
      systemInstruction: PROMPTS.PROBLEM_ANALYZER,
      prompt: contextMessage,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          languageDetected: { type: Type.STRING },
          scriptDetected: { type: Type.STRING },
          category: {
            type: Type.STRING,
            enum: [
              "rti",
              "consumer_rights",
              "tenant_rights",
              "workplace_rights",
              "welfare_schemes",
              "government_services",
              "documentation",
              "public_grievances",
              "municipal_issues",
              "education",
              "healthcare_schemes",
              "financial_social_welfare",
              "identity_documents",
              "other",
            ],
          },
          problemSummary: { type: Type.STRING },
          location: {
            type: Type.OBJECT,
            properties: {
              state: { type: Type.STRING, nullable: true },
              district: { type: Type.STRING, nullable: true },
              city: { type: Type.STRING, nullable: true },
            },
          },
          entities: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          possibleRights: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          requiredInformation: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          urgency: {
            type: Type.STRING,
            enum: ["low", "medium", "high"],
          },
          confidence: { type: Type.NUMBER },
          recommendedAction: { type: Type.STRING },
          isCivicOrLegal: { type: Type.BOOLEAN },
        },
        required: [
          "languageDetected",
          "scriptDetected",
          "category",
          "problemSummary",
          "location",
          "entities",
          "possibleRights",
          "requiredInformation",
          "urgency",
          "confidence",
          "recommendedAction",
          "isCivicOrLegal",
        ],
      },
      simulateGeminiFailure,
      simulateOpenRouterFailure,
      forceBothProvidersFailure: forceBothFailure,
    });

    const parsed = parseAIJson<ProblemAnalysis>(result.text);
    console.log(
      `[Problem Analyzer via ${result.provider} (${result.modelUsed})] Category: ${parsed.category} | State: ${parsed.location?.state || "N/A"} | IsCivic: ${parsed.isCivicOrLegal} | Follow-up Items: ${parsed.requiredInformation?.length || 0}`
    );
    return parsed;
  } catch (error: any) {
    console.error("[Problem Analyzer Error]:", error?.message || error);
    throw new Error(error?.message || "Sorry, SARATHI is temporarily unable to generate a source-grounded response. Please try again in a moment.");
  }
}

/**
 * Stage 3: Rights Navigator & Action Planner
 */
export async function reasonActionPlan(
  problem: ProblemAnalysis,
  retrievedContextText: string,
  userLanguage = "English",
  untrustedUserContent?: string,
  conversationContext?: string,
  simulateGeminiFailure = false,
  responseMode: "basic" | "advanced" = "advanced",
  simulateOpenRouterFailure = false,
  forceBothFailure = false
): Promise<{
  actionPlan: ActionPlan;
  naturalExplanation: string;
  providerUsed?: string;
  modelUsed?: string;
  openRouterModel?: string;
}> {
  const modeInstruction = responseMode === "basic"
    ? "\n\nRESPONSE MODE: BASIC. Keep the naturalExplanation concise, plain, simple, and bulleted without heavy legal jargon."
    : "\n\nRESPONSE MODE: ADVANCED. Provide comprehensive legal grounding, statutory section references, and procedural depths.";

  const prompt = `CITIZEN PROBLEM SUMMARY:
${problem.problemSummary}

DETECTED PROBLEM DETAILS:
- Category: ${problem.category}
- Jurisdiction / Location: ${JSON.stringify(problem.location)}
- Entities: ${problem.entities.join(", ") || "None mentioned"}
- Possible Statutory Rights: ${problem.possibleRights.join("; ")}
- Missing / Follow-up Information needed: ${problem.requiredInformation.join("; ") || "None"}
- Target Response Language: ${userLanguage}
${modeInstruction}
${conversationContext ? `\nPREVIOUS CONVERSATION HISTORY:\n${conversationContext}` : ""}

Please construct the structured ActionPlan JSON and naturalExplanation strictly according to the Official Reference Chunks provided in the system instruction.`;

  const systemInstruction = PROMPTS.RIGHTS_NAVIGATOR(
    retrievedContextText,
    userLanguage,
    untrustedUserContent,
    responseMode
  );

  try {
    const result = await generateWithAI({
      systemInstruction,
      prompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          actionPlan: {
            type: Type.OBJECT,
            properties: {
              situation: { type: Type.STRING },
              rightsOrOptions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    sourceId: { type: Type.STRING },
                  },
                  required: ["title", "explanation", "sourceId"],
                },
              },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    order: { type: Type.INTEGER },
                    action: { type: Type.STRING },
                    isOfficial: { type: Type.BOOLEAN },
                  },
                  required: ["order", "action"],
                },
              },
              documentsNeeded: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              authority: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  jurisdiction: { type: Type.STRING },
                  sourceId: { type: Type.STRING },
                  address: { type: Type.STRING },
                  portalUrl: { type: Type.STRING },
                },
                required: ["name", "jurisdiction", "sourceId"],
              },
              escalationIfNoResponse: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
            },
            required: [
              "situation",
              "rightsOrOptions",
              "steps",
              "documentsNeeded",
              "authority",
              "escalationIfNoResponse",
              "confidence",
            ],
          },
          naturalExplanation: { type: Type.STRING },
        },
        required: ["actionPlan", "naturalExplanation"],
      },
      simulateGeminiFailure,
      simulateOpenRouterFailure,
      forceBothProvidersFailure: forceBothFailure,
    });

    const rawParsed = parseAIJson<any>(result.text);
    
    let actionPlan: ActionPlan;
    let naturalExplanation: string = rawParsed?.naturalExplanation || rawParsed?.explanation || "";

    if (rawParsed?.actionPlan && typeof rawParsed.actionPlan === "object") {
      actionPlan = {
        situation: rawParsed.actionPlan.situation || problem.problemSummary || "Civic matter",
        rightsOrOptions: Array.isArray(rawParsed.actionPlan.rightsOrOptions) ? rawParsed.actionPlan.rightsOrOptions : [],
        steps: Array.isArray(rawParsed.actionPlan.steps) ? rawParsed.actionPlan.steps : [],
        documentsNeeded: Array.isArray(rawParsed.actionPlan.documentsNeeded) ? rawParsed.actionPlan.documentsNeeded : [],
        authority: rawParsed.actionPlan.authority || { name: "Concerned Competent Authority", jurisdiction: "State / Central", sourceId: "official_guideline" },
        escalationIfNoResponse: rawParsed.actionPlan.escalationIfNoResponse || "File first appeal if no response within the statutory timeframe.",
        confidence: typeof rawParsed.actionPlan.confidence === "number" ? rawParsed.actionPlan.confidence : 0.9,
      };
    } else {
      actionPlan = {
        situation: rawParsed?.situation || problem.problemSummary || "Civic matter",
        rightsOrOptions: Array.isArray(rawParsed?.rightsOrOptions) ? rawParsed.rightsOrOptions : Array.isArray(rawParsed?.rights) ? rawParsed.rights : [],
        steps: Array.isArray(rawParsed?.steps) ? rawParsed.steps : [],
        documentsNeeded: Array.isArray(rawParsed?.documentsNeeded) ? rawParsed.documentsNeeded : [],
        authority: rawParsed?.authority || { name: "Concerned Competent Authority", jurisdiction: "State / Central", sourceId: "official_guideline" },
        escalationIfNoResponse: rawParsed?.escalationIfNoResponse || "File first appeal if no response within the statutory timeframe.",
        confidence: typeof rawParsed?.confidence === "number" ? rawParsed.confidence : 0.9,
      };
    }

    if (!naturalExplanation) {
      naturalExplanation = `Here is your source-grounded civic action plan regarding: ${actionPlan.situation}.`;
    }

    console.log(
      `[Rights Navigator via ${result.provider} (${result.modelUsed})] Generated action plan (${actionPlan.rightsOrOptions.length} rights, ${actionPlan.steps.length} steps).`
    );
    return {
      actionPlan,
      naturalExplanation,
      providerUsed: result.provider,
      modelUsed: result.modelUsed,
      openRouterModel: result.provider === "openrouter" ? result.modelUsed : undefined,
    };
  } catch (error: any) {
    console.error("[Rights Navigator Error]:", error?.message || error);
    throw new Error(error?.message || "Sorry, SARATHI is temporarily unable to generate a source-grounded response. Please try again in a moment.");
  }
}

/**
 * RTI Application Drafting
 */
export async function draftRTIApplication(
  topicSummary: string,
  publicAuthority: string,
  specificPoints: string[],
  simulateGeminiFailure = false
): Promise<RTIGeneration> {
  const prompt = `Draft RTI request under Section 6(1) for topic: "${topicSummary}". Public Authority: "${publicAuthority}". Points: ${JSON.stringify(
    specificPoints
  )}`;
  const systemInstruction = PROMPTS.RTI_WORDING_GENERATOR(
    topicSummary,
    publicAuthority,
    specificPoints
  );

  try {
    const result = await generateWithAI({
      systemInstruction,
      prompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          informationSought: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          factsFromSource: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                fact: { type: Type.STRING },
                sourceId: { type: Type.STRING },
              },
              required: ["fact", "sourceId"],
            },
          },
          assumptions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          aiDraftedWording: { type: Type.BOOLEAN },
        },
        required: [
          "subject",
          "informationSought",
          "factsFromSource",
          "assumptions",
          "aiDraftedWording",
        ],
      },
      simulateGeminiFailure,
    });

    const parsed = parseAIJson<any>(result.text);
    return {
      publicAuthority: {
        name: publicAuthority || "Central Public Information Officer (CPIO)",
        confidence: publicAuthority ? "confirmed_by_user" : "assumed",
      },
      subject: parsed.subject,
      informationSought: parsed.informationSought,
      applicantDetails: {
        name: "[Applicant Name]",
        address: "[Applicant Postal Address, PIN, Phone]",
      },
      factsFromSource: parsed.factsFromSource || [
        {
          fact: "Statutory rights under Section 6(1) of RTI Act 2005",
          sourceId: "rti_act_2005",
        },
      ],
      aiDraftedWording: true,
      assumptions: parsed.assumptions || [
        "Citizen is an Indian citizen eligible under Section 3 of RTI Act 2005.",
      ],
    };
  } catch (error: any) {
    console.error("[RTI Drafting Error]:", error?.message || error);
    throw new Error(error?.message || "Sorry, SARATHI is temporarily unable to generate a source-grounded response. Please try again in a moment.");
  }
}

/**
 * Multimodal Document Analysis & OCR
 */
export async function analyzeUploadedDocument(
  base64Data: string,
  mimeType: string,
  targetLanguage = "English",
  simulateGeminiFailure = false
): Promise<{
  docType: string;
  sender: string;
  keyDates: string[];
  amounts: string[];
  summary: string;
  actionRequired: string[];
  rightsAvailable: string[];
  rawExtractedText: string;
}> {
  const contents = [
    {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    },
    {
      text: `Please analyze this document. Extract its type, sender, dates/deadlines, monetary amounts, plain language summary in ${targetLanguage}, immediate action required, and citizen rights/remedies. Also provide full extracted text.`,
    },
  ];
  const systemInstruction = PROMPTS.DOCUMENT_EXPLAINER(targetLanguage);

  try {
    const result = await generateWithAI({
      systemInstruction,
      prompt: contents,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          docType: { type: Type.STRING },
          sender: { type: Type.STRING },
          keyDates: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          amounts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          summary: { type: Type.STRING },
          actionRequired: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          rightsAvailable: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          rawExtractedText: { type: Type.STRING },
        },
        required: [
          "docType",
          "sender",
          "keyDates",
          "amounts",
          "summary",
          "actionRequired",
          "rightsAvailable",
          "rawExtractedText",
        ],
      },
      simulateGeminiFailure,
    });

    return parseAIJson(result.text);
  } catch (error: any) {
    console.error("[Document Analysis Error]:", error?.message || error);
    throw new Error(error?.message || "Sorry, SARATHI is temporarily unable to generate a source-grounded response. Please try again in a moment.");
  }
}

/**
 * Text Embedding Generation with Retry
 * Strictly restricted to Gemini embeddings. If unavailable, throws error so caller gracefully falls back to keyword retrieval.
 */
export async function embedText(text: string): Promise<number[]> {
  const ai = getEmbeddingClient();
  const safeText = text.slice(0, 2048);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.embedContent({
        model: CONFIG.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2-preview",
        contents: safeText,
      });

      const rawResp = response as any;
      const embedding = rawResp.embedding?.values || rawResp.embeddings?.[0]?.values;
      if (embedding && Array.isArray(embedding) && embedding.length > 0) {
        return embedding;
      }
    } catch (error: any) {
      console.warn(`[Gemini Embedding Attempt ${attempt + 1}/3] failed:`, error?.message || error);
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }

  throw new Error("Failed to generate embedding from Gemini Embedding API.");
}

/**
 * Native Text Localizer
 * Translates narrative text (markdown, explanations) into targetLanguage (including English).
 */
export async function localizeText(
  sourceText: string,
  targetLanguage: string,
  simulateGeminiFailure = false,
  simulateOpenRouterFailure = false,
  forceBothFailure = false
): Promise<string> {
  if (!sourceText || !sourceText.trim()) return "";
  if (!targetLanguage) return sourceText;

  const prompt = `Translate and adapt the following text into ${targetLanguage} while strictly respecting all preservation rules:\n\n${sourceText}`;
  const systemInstruction = PROMPTS.LOCALIZER(targetLanguage);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await generateWithAI({
        systemInstruction,
        prompt: attempt === 0 ? prompt : `${prompt}\n\nIMPORTANT: You must output the entire response in ${targetLanguage}. Do not return empty text.`,
        responseMimeType: "text/plain",
        simulateGeminiFailure,
        simulateOpenRouterFailure,
        forceBothProvidersFailure: forceBothFailure,
      });

      const translated = result.text.trim();
      if (translated && translated.length > 5) {
        return translated;
      }
    } catch (error: any) {
      console.warn(`[Localization Attempt ${attempt + 1}] warning:`, error?.message || error);
    }
  }

  return sourceText;
}

/**
 * Full Response Localizer
 * Translates BOTH narrative text and structured payload (ActionPlan, ProblemAnalysis, missingQuestions)
 * into targetLanguage while keeping statutory citations, URLs, authority IDs, and schema intact.
 */
export async function localizeFullResponse(params: {
  text?: string;
  structuredPayload?: any;
  targetLanguage: string;
  simulateGeminiFailure?: boolean;
  simulateOpenRouterFailure?: boolean;
  forceBothFailure?: boolean;
}): Promise<{
  translatedText: string;
  translatedPayload?: any;
}> {
  const {
    text = "",
    structuredPayload,
    targetLanguage,
    simulateGeminiFailure,
    simulateOpenRouterFailure,
    forceBothFailure,
  } = params;

  if (!targetLanguage) {
    return { translatedText: text, translatedPayload: structuredPayload };
  }

  const isTargetEnglish =
    targetLanguage.toLowerCase() === "english" || targetLanguage.toLowerCase() === "en";

  // 1. Localize narrative explanation text
  let translatedText = text;
  if (text.trim()) {
    translatedText = await localizeText(
      text,
      targetLanguage,
      simulateGeminiFailure,
      simulateOpenRouterFailure,
      forceBothFailure
    );
  }

  // 2. Localize structured payload if present
  let translatedPayload = structuredPayload;
  if (structuredPayload && (structuredPayload.actionPlan || structuredPayload.problemAnalysis || structuredPayload.missingQuestions)) {
    // If target is English and canonical was already English, payload may already be in English.
    // Otherwise, translate natural language fields in the structured payload
    try {
      const systemInstruction = PROMPTS.STRUCTURED_LOCALIZER(targetLanguage);
      const prompt = `Translate the natural language fields of this JSON object into ${targetLanguage}:\n\n${JSON.stringify(
        structuredPayload,
        null,
        2
      )}`;

      const result = await generateWithAI({
        systemInstruction,
        prompt,
        responseMimeType: "application/json",
        simulateGeminiFailure,
        simulateOpenRouterFailure,
        forceBothProvidersFailure: forceBothFailure,
      });

      const parsed = parseAIJson<any>(result.text);
      if (parsed && typeof parsed === "object") {
        // Merge back to ensure protected non-translatable fields remain intact
        translatedPayload = {
          ...structuredPayload,
          ...parsed,
          citations: structuredPayload.citations || parsed.citations,
          reliability: structuredPayload.reliability || parsed.reliability,
        };

        // Ensure actionPlan protected fields remain preserved
        if (structuredPayload.actionPlan && translatedPayload.actionPlan) {
          translatedPayload.actionPlan = {
            ...structuredPayload.actionPlan,
            ...translatedPayload.actionPlan,
            confidence: structuredPayload.actionPlan.confidence,
            authority: {
              ...structuredPayload.actionPlan.authority,
              ...translatedPayload.actionPlan.authority,
              sourceId: structuredPayload.actionPlan.authority.sourceId,
              portalUrl: structuredPayload.actionPlan.authority.portalUrl,
            },
            rightsOrOptions: (translatedPayload.actionPlan.rightsOrOptions || structuredPayload.actionPlan.rightsOrOptions).map(
              (item: any, idx: number) => ({
                ...item,
                sourceId: structuredPayload.actionPlan.rightsOrOptions[idx]?.sourceId || item.sourceId,
              })
            ),
            steps: (translatedPayload.actionPlan.steps || structuredPayload.actionPlan.steps).map(
              (item: any, idx: number) => ({
                ...item,
                order: structuredPayload.actionPlan.steps[idx]?.order ?? item.order,
                isOfficial: structuredPayload.actionPlan.steps[idx]?.isOfficial ?? item.isOfficial,
              })
            ),
          };
        }

        // Ensure problemAnalysis protected fields remain preserved
        if (structuredPayload.problemAnalysis && translatedPayload.problemAnalysis) {
          translatedPayload.problemAnalysis = {
            ...structuredPayload.problemAnalysis,
            ...translatedPayload.problemAnalysis,
            category: structuredPayload.problemAnalysis.category,
            confidence: structuredPayload.problemAnalysis.confidence,
            urgency: structuredPayload.problemAnalysis.urgency,
            location: structuredPayload.problemAnalysis.location,
            entities: structuredPayload.problemAnalysis.entities,
          };
        }
      }
    } catch (payloadErr) {
      console.warn("[Structured Localization Warning] using original payload:", payloadErr);
      translatedPayload = structuredPayload;
    }
  }

  return {
    translatedText: translatedText || text,
    translatedPayload,
  };
}
