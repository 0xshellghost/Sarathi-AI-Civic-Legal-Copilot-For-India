/**
 * SARATHI - Deterministic Welfare Scheme Eligibility Engine
 * Pure TypeScript rule evaluator - No LLM decision-making.
 * Follows strict non-negotiable reliability rules and hedged verdicts.
 */

import { WelfareScheme, EligibilityAnalysis, EligibilityResultVerdict } from "../lib/schemas";

export function evaluateSchemeEligibility(
  scheme: WelfareScheme,
  userFields: Record<string, any>
): EligibilityAnalysis {
  const matchedCriteria: string[] = [];
  const unmatchedOrUnknownCriteria: string[] = [];
  const missingFields: string[] = [];

  const rules = scheme.eligibilityRules || {};

  // 1. Age Rule
  if (rules.age) {
    if (userFields.age === undefined || userFields.age === null || userFields.age === "") {
      missingFields.push("age");
      unmatchedOrUnknownCriteria.push(`Age requirement (${rules.age.min ? `Min: ${rules.age.min} yrs` : ""} ${rules.age.max ? `Max: ${rules.age.max} yrs` : ""}) - Status: Unknown`);
    } else {
      const ageNum = Number(userFields.age);
      const minOk = rules.age.min === undefined || ageNum >= rules.age.min;
      const maxOk = rules.age.max === undefined || ageNum <= rules.age.max;
      if (minOk && maxOk) {
        matchedCriteria.push(`Age requirement met (Age: ${ageNum} years).`);
      } else {
        unmatchedOrUnknownCriteria.push(`Age criterion not met (Your age: ${ageNum}, required: ${rules.age.min || 0} to ${rules.age.max || "unlimited"}).`);
      }
    }
  }

  // 2. Family Income Rule
  if (rules.familyIncome) {
    if (userFields.familyIncome === undefined || userFields.familyIncome === null || userFields.familyIncome === "") {
      missingFields.push("familyIncome");
      unmatchedOrUnknownCriteria.push(`Annual Family Income cap (Max: ₹${rules.familyIncome.max?.toLocaleString("en-IN")}) - Status: Unknown`);
    } else {
      const incomeNum = Number(userFields.familyIncome);
      if (rules.familyIncome.max !== undefined && incomeNum <= rules.familyIncome.max) {
        matchedCriteria.push(`Annual Family Income is within threshold (₹${incomeNum.toLocaleString("en-IN")} <= ₹${rules.familyIncome.max.toLocaleString("en-IN")}).`);
      } else {
        unmatchedOrUnknownCriteria.push(`Family Income exceeds threshold (Your reported income: ₹${incomeNum.toLocaleString("en-IN")}, Maximum limit: ₹${rules.familyIncome.max?.toLocaleString("en-IN")}).`);
      }
    }
  }

  // 3. Gender Rule
  if (rules.gender && rules.gender.length > 0) {
    if (!userFields.gender) {
      missingFields.push("gender");
      unmatchedOrUnknownCriteria.push(`Gender requirement (${rules.gender.join(", ")}) - Status: Unknown`);
    } else {
      const genderLower = String(userFields.gender).toLowerCase();
      const match = rules.gender.some((g) => g.toLowerCase() === genderLower);
      if (match) {
        matchedCriteria.push(`Gender requirement met (${userFields.gender}).`);
      } else {
        unmatchedOrUnknownCriteria.push(`Gender criterion not met (Applicable for: ${rules.gender.join(", ")}).`);
      }
    }
  }

  // 4. Social Category / Caste Rule
  if (rules.casteOrCategory && rules.casteOrCategory.length > 0) {
    if (!userFields.category && !userFields.casteOrCategory) {
      missingFields.push("casteOrCategory");
      unmatchedOrUnknownCriteria.push(`Beneficiary Social Category (${rules.casteOrCategory.join(", ")}) - Status: Unknown`);
    } else {
      const userCat = String(userFields.category || userFields.casteOrCategory).toUpperCase();
      const match = rules.casteOrCategory.some((c) => c.toUpperCase() === userCat);
      if (match) {
        matchedCriteria.push(`Category requirement met (${userCat}).`);
      } else {
        unmatchedOrUnknownCriteria.push(`Category criterion not met (Eligible categories: ${rules.casteOrCategory.join(", ")}).`);
      }
    }
  }

  // 5. Student Status
  if (rules.isStudent !== undefined) {
    if (userFields.isStudent === undefined || userFields.isStudent === null) {
      missingFields.push("isStudent");
      unmatchedOrUnknownCriteria.push(`Enrolled Student Status - Status: Unknown`);
    } else if (Boolean(userFields.isStudent) === rules.isStudent) {
      matchedCriteria.push(`Enrolled regular student criterion met.`);
    } else {
      unmatchedOrUnknownCriteria.push(`Must be currently enrolled in an eligible academic program.`);
    }
  }

  // 6. Custom Rules evaluation
  if (rules.customRules && rules.customRules.length > 0) {
    for (const cr of rules.customRules) {
      const val = userFields[cr.field];
      if (val === undefined || val === null || val === "") {
        if (cr.required) {
          missingFields.push(cr.field);
        }
        unmatchedOrUnknownCriteria.push(`${cr.label} - Status: Information Needed`);
      } else {
        // Evaluate typical disqualifiers vs qualifiers
        if (typeof val === "boolean") {
          // Specific rule checks
          if (cr.field.startsWith("isIncomeTax") || cr.field.startsWith("isGovtEmployee") || cr.field.startsWith("isRegisteredProfessional") || cr.field.startsWith("hasExistingPuccaHouse") || cr.field.startsWith("ownsMotorizedVehicle")) {
            if (val === true) {
              unmatchedOrUnknownCriteria.push(`Exclusion criterion triggered: ${cr.label} (Yes).`);
            } else {
              matchedCriteria.push(`Non-exclusion confirmed: ${cr.label} (No).`);
            }
          } else {
            if (val === true) {
              matchedCriteria.push(`Requirement satisfied: ${cr.label} (Yes).`);
            } else {
              unmatchedOrUnknownCriteria.push(`Requirement not satisfied: ${cr.label} (No).`);
            }
          }
        } else {
          matchedCriteria.push(`${cr.label}: ${val}`);
        }
      }
    }
  }

  // Determine Verdict
  let verdict: EligibilityResultVerdict = "insufficient_information";
  let confidence = 0.5;

  const hasExclusionOrFailure = unmatchedOrUnknownCriteria.some(
    (c) => c.includes("exceeds threshold") || c.includes("criterion not met") || c.includes("Exclusion criterion triggered") || c.includes("not satisfied")
  );

  if (hasExclusionOrFailure) {
    verdict = "likely_not_eligible";
    confidence = 0.88;
  } else if (missingFields.length > 0) {
    verdict = "insufficient_information";
    confidence = 0.6;
  } else {
    verdict = "likely_eligible";
    confidence = 0.92;
  }

  const disclaimer =
    "Based on the information provided, you appear to meet the listed eligibility criteria. Final eligibility and benefit disbursement are determined by " +
    scheme.authority +
    " upon physical/portal verification of original supporting documents.";

  return {
    schemeId: scheme.schemeId,
    schemeName: scheme.name,
    collectedFields: userFields,
    missingFields,
    eligibilityResult: verdict,
    matchedCriteria,
    unmatchedOrUnknownCriteria,
    confidence,
    disclaimer,
    sources: [scheme.sourceId],
    requiredDocuments: scheme.requiredDocuments,
    applicationProcess: scheme.applicationProcess,
    officialPortalUrl: scheme.officialUrl,
  };
}
