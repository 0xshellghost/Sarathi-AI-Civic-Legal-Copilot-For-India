/**
 * SARATHI - Deterministic Citation Verifier
 * Validates that every citation made by the AI corresponds strictly to an actually-retrieved knowledge chunk.
 */

import { ActionPlan, KnowledgeChunk, Citation } from "../lib/schemas";

export interface VerificationResult {
  verifiedActionPlan: ActionPlan;
  validCitations: Citation[];
  uncitedClaimsFound: boolean;
  citationConfidence: number;
}

export function verifyCitations(
  actionPlan: ActionPlan,
  retrievedChunks: KnowledgeChunk[],
  knownCitations: Citation[]
): VerificationResult {
  const validSourceIds = new Set(retrievedChunks.map((c) => c.sourceId));
  let uncitedClaimsFound = false;

  // Verify rights or options
  const verifiedRights = actionPlan.rightsOrOptions.map((r) => {
    if (!validSourceIds.has(r.sourceId)) {
      uncitedClaimsFound = true;
      return {
        ...r,
        sourceId: "ai_guidance_unverified",
        explanation: `${r.explanation} (Note: General AI guidance; specific statutory source section was not found in retrieved records).`,
      };
    }
    return r;
  });

  // Verify authority sourceId
  let verifiedAuthority = { ...actionPlan.authority };
  if (!validSourceIds.has(verifiedAuthority.sourceId)) {
    uncitedClaimsFound = true;
    verifiedAuthority.sourceId = "general_administrative_convention";
  }

  // Filter only citations that were actually confirmed
  const validCitations = knownCitations.filter((c) => validSourceIds.has(c.sourceId));

  const totalPoints = verifiedRights.length + 1;
  const verifiedPoints =
    verifiedRights.filter((r) => r.sourceId !== "ai_guidance_unverified").length +
    (verifiedAuthority.sourceId !== "general_administrative_convention" ? 1 : 0);

  const citationConfidence = totalPoints > 0 ? Number((verifiedPoints / totalPoints).toFixed(2)) : 0.5;

  return {
    verifiedActionPlan: {
      ...actionPlan,
      rightsOrOptions: verifiedRights,
      authority: verifiedAuthority,
      confidence: Math.min(actionPlan.confidence || 0.85, Math.max(0.4, citationConfidence)),
    },
    validCitations,
    uncitedClaimsFound,
    citationConfidence,
  };
}
