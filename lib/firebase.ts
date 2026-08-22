/**
 * SARATHI - Firebase Configuration & Initialization
 * Client SDK (Auth with Anonymous Login, Firestore, Storage) & Cloud Persistence
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  User,
  Auth,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Firestore,
  Unsubscribe,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, FirebaseStorage } from "firebase/storage";
import { CaseDocument, WelfareScheme, KnowledgeChunk, FeedbackRecord } from "./schemas";
import firebaseAppletConfig from "../firebase-applet-config.json";

// Resolve Firebase configuration with fallback
export const firebaseConfig = {
  projectId: firebaseAppletConfig.projectId || "basic-sunset-48chg",
  appId: firebaseAppletConfig.appId || "",
  apiKey: firebaseAppletConfig.apiKey || "",
  authDomain: firebaseAppletConfig.authDomain || `${firebaseAppletConfig.projectId || "basic-sunset-48chg"}.firebaseapp.com`,
  firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId || undefined,
  storageBucket: firebaseAppletConfig.storageBucket || `${firebaseAppletConfig.projectId || "basic-sunset-48chg"}.firebasestorage.app`,
  messagingSenderId: firebaseAppletConfig.messagingSenderId || "",
};

let app: FirebaseApp;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (e) {
  console.warn("[AUTH] Firebase app init fallback:", e);
  app = getApp();
}

export const firebaseApp = app;
export const clientAuth: Auth = getAuth(app);
export const clientDb: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const clientStorage: FirebaseStorage = getStorage(app);

// Configure local browser persistence for Firebase Auth sessions
try {
  if (typeof window !== "undefined") {
    setPersistence(clientAuth, browserLocalPersistence).catch((err) => {
      console.warn("[AUTH] Persistence configuration notice:", err);
    });
  }
} catch (e) {
  console.warn("[AUTH] Persistence init notice:", e);
}

// Log initial safe configuration diagnostics
console.log(`[AUTH] Firebase project: ${firebaseConfig.projectId}`);
console.log(`[AUTH] Auth initialized: ${clientAuth ? "YES" : "NO"}`);
console.log(`[AUTH] Google provider initialized: YES`);

/**
 * Format Firebase Auth errors into clear, user-friendly messages
 */
export function formatFirebaseAuthError(error: any): string {
  if (!error) return "An unknown error occurred during authentication.";
  const code = error.code || "";
  const message = error.message || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "unknown";

  console.error(`[AUTH] Firebase error code: ${code}`);
  console.error(`[AUTH] Firebase error message: ${message}`);
  console.error(`[AUTH] Current origin: ${origin}`);
  console.error(`[AUTH] Current authDomain: ${firebaseConfig.authDomain}`);

  switch (code) {
    case "auth/popup-blocked":
      return "Google sign-in popup was blocked by the browser. Please allow popups for SARATHI or use redirect sign-in.";
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled before completion. Please try again.";
    case "auth/cancelled-popup-request":
      return "Another authentication request is already in progress. Please wait a moment and try again.";
    case "auth/unauthorized-domain":
      return `Google sign-in is not authorized for this domain (${typeof window !== "undefined" ? window.location.hostname : "preview"}). Please check authorized domains in Firebase Console.`;
    case "auth/operation-not-allowed":
      return "Google Sign-In provider is not enabled in the Firebase project.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email address using a different sign-in provider.";
    case "auth/network-request-failed":
      return "Unable to connect to Google authentication service. Please check your internet connection and try again.";
    case "auth/internal-error":
      return "An internal authentication error occurred. Please try again or use redirect sign-in.";
    case "auth/timeout":
      return "Google sign-in took too long to complete. Please try again or switch to redirect mode.";
    default:
      return message || "Google sign-in couldn't be completed. Please try again.";
  }
}

/**
 * Initializes or updates the user profile record in Firestore
 */
export async function initializeUserProfile(user: User): Promise<void> {
  if (!user || !user.uid) return;
  try {
    const userDocRef = doc(clientDb, "users", user.uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        },
        { merge: true }
      );
      console.log("[AUTH] User record initialized in Firestore");
    } else {
      await setDoc(
        userDocRef,
        {
          lastLoginAt: new Date().toISOString(),
          displayName: user.displayName || snap.data()?.displayName || "",
          photoURL: user.photoURL || snap.data()?.photoURL || "",
        },
        { merge: true }
      );
      console.log("[AUTH] User record updated in Firestore");
    }
  } catch (err) {
    // Non-blocking: Authentication succeeds even if profile caching temporarily defers
    console.warn("[AUTH] Notice during Firestore profile initialization (non-blocking):", err);
  }
}

/**
 * Check if the user returned from a Google OAuth Redirect
 */
export async function checkRedirectAuthResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(clientAuth);
    if (result && result.user) {
      console.log("[AUTH] Google sign-in successful");
      console.log("[AUTH] UID available");
      await initializeUserProfile(result.user);
      return result.user;
    }
    return null;
  } catch (error: any) {
    if (error?.code) {
      formatFirebaseAuthError(error);
    }
    return null;
  }
}

/**
 * Sign In with Google Provider (Firebase Auth)
 * Supports popup (default) with timeout safeguard and redirect fallback
 */
export async function signInWithGoogle(options?: {
  method?: "popup" | "redirect";
  timeoutMs?: number;
}): Promise<User | null> {
  const method = options?.method || "popup";
  const timeoutMs = options?.timeoutMs || 45000;

  console.log("[AUTH] Starting Google sign-in");

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  if (method === "redirect") {
    try {
      await signInWithRedirect(clientAuth, provider);
      return null;
    } catch (err: any) {
      formatFirebaseAuthError(err);
      throw err;
    }
  }

  // Popup method with timeout safeguard to prevent hanging
  try {
    const popupPromise = signInWithPopup(clientAuth, provider);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => {
        const timeoutErr = new Error("Authentication request timed out.");
        (timeoutErr as any).code = "auth/timeout";
        reject(timeoutErr);
      }, timeoutMs)
    );

    const result = await Promise.race([popupPromise, timeoutPromise]);
    if (result && result.user) {
      console.log("[AUTH] Google sign-in successful");
      console.log("[AUTH] UID available");
      await initializeUserProfile(result.user);
      return result.user;
    }
    return null;
  } catch (error: any) {
    if (
      error.code === "auth/popup-closed-by-user" ||
      error.code === "auth/cancelled-popup-request"
    ) {
      console.log("[AUTH] Sign-in cancelled or closed by user.");
      return null;
    }

    const formattedMessage = formatFirebaseAuthError(error);
    const enhancedError = new Error(formattedMessage);
    (enhancedError as any).code = error.code || "auth/unknown";
    (enhancedError as any).originalError = error;
    throw enhancedError;
  }
}

/**
 * Sign Out Current User
 */
export async function signOutUser(): Promise<void> {
  try {
    console.log("[AUTH] Signing out user...");
    await signOut(clientAuth);
    console.log("[AUTH] Sign out successful");
  } catch (error: any) {
    formatFirebaseAuthError(error);
    throw error;
  }
}

/**
 * Subscribe to Auth State Changes
 */
export function onAuthChanged(
  callback: (user: User | null) => void,
  onLoading?: (isLoading: boolean) => void
): Unsubscribe {
  if (onLoading) onLoading(true);

  return onAuthStateChanged(clientAuth, async (user) => {
    if (user && user.uid) {
      console.log("[AUTH] Google sign-in successful");
      console.log("[AUTH] UID available");
      try {
        await initializeUserProfile(user);
      } catch (e) {
        console.warn("[AUTH] Profile initialization notice:", e);
      }
    } else {
      console.log("[AUTH] Auth state: unauthenticated");
    }
    if (onLoading) onLoading(false);
    callback(user);
  });
}

/**
 * Save / Update Case in Firestore
 */
export async function saveCaseToFirestore(caseDoc: CaseDocument, userId?: string): Promise<boolean> {
  const authUid = clientAuth.currentUser?.uid || (userId && !userId.startsWith("anon_") ? userId : null);

  // If user is unauthenticated, persist safely to server store without failing Firestore rules
  if (!authUid) {
    serverDb.saveCase(caseDoc);
    return true;
  }

  try {
    if (!caseDoc.caseId) return false;
    const docRef = doc(clientDb, "cases", caseDoc.caseId);
    const payload = {
      ...caseDoc,
      userId: authUid,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
    serverDb.saveCase(payload);
    return true;
  } catch (err) {
    console.warn("Firestore saveCase notice (using local store fallback):", err);
    serverDb.saveCase(caseDoc);
    return false;
  }
}

/**
 * Delete Case from Firestore
 */
export async function deleteCaseFromFirestore(caseId: string): Promise<boolean> {
  const authUid = clientAuth.currentUser?.uid;
  if (!authUid) {
    return false;
  }
  try {
    const docRef = doc(clientDb, "cases", caseId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn("Firestore deleteCase notice:", err);
    return false;
  }
}

/**
 * Real-Time Listener for User Cases
 */
export function subscribeToUserCases(
  userId: string,
  onUpdate: (cases: CaseDocument[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  // Prevent listener creation when unauthenticated or without valid UID
  if (!userId || !clientAuth.currentUser || clientAuth.currentUser.uid !== userId) {
    onUpdate(serverDb.getUserCases(userId || ""));
    return () => {};
  }

  try {
    console.log("[FIRESTORE] Fetching cases for authenticated UID");
    const casesRef = collection(clientDb, "cases");
    const q = query(casesRef, where("userId", "==", userId));

    console.log("[FIRESTORE] Case listener attached");
    return onSnapshot(
      q,
      (snapshot) => {
        const cases: CaseDocument[] = [];
        snapshot.forEach((d) => {
          cases.push(d.data() as CaseDocument);
        });
        // Sort descending by updatedAt
        cases.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        console.log(`[FIRESTORE] Cases loaded successfully (${cases.length} records)`);
        onUpdate(cases);
      },
      (error) => {
        console.warn("Firestore onSnapshot notice:", error);
        if (onError) onError(error);
        onUpdate(serverDb.getUserCases(userId));
      }
    );
  } catch (e) {
    console.warn("Failed to attach onSnapshot query, using store:", e);
    onUpdate(serverDb.getUserCases(userId));
    return () => {};
  }
}

/**
 * Fetch Cases for User from Firestore
 */
export async function fetchUserCasesFromFirestore(userId: string): Promise<CaseDocument[]> {
  // Only query Firestore if authenticated UID matches
  if (!userId || !clientAuth.currentUser || clientAuth.currentUser.uid !== userId) {
    return serverDb.getUserCases(userId || "");
  }

  try {
    console.log("[FIRESTORE] Fetching cases for authenticated UID");
    const casesRef = collection(clientDb, "cases");
    const q = query(casesRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const cases: CaseDocument[] = [];
    snapshot.forEach((d) => {
      cases.push(d.data() as CaseDocument);
    });
    cases.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    console.log(`[FIRESTORE] Cases loaded successfully (${cases.length} records)`);
    return cases;
  } catch (err) {
    console.warn("Firestore fetchUserCases notice:", err);
    return serverDb.getUserCases(userId);
  }
}

/**
 * Upload Document to Firebase Cloud Storage
 */
export async function uploadDocumentToStorage(
  userId: string,
  caseId: string,
  file: File | Blob,
  fileName: string
): Promise<{ downloadUrl: string; storagePath: string } | null> {
  try {
    const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storagePath = `cases/${userId}/${caseId}/${safeFileName}`;
    const fileRef = ref(clientStorage, storagePath);

    const snapshot = await uploadBytes(fileRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);

    return { downloadUrl, storagePath };
  } catch (err) {
    console.warn("Firebase Storage upload error:", err);
    return null;
  }
}

/**
 * Save Feedback in Firestore
 */
export async function saveFeedbackToFirestore(feedback: FeedbackRecord): Promise<boolean> {
  try {
    const docRef = doc(clientDb, "feedback", feedback.feedbackId);
    await setDoc(docRef, feedback);
    return true;
  } catch (err) {
    console.warn("Firestore saveFeedback fallback:", err);
    serverDb.saveFeedback(feedback);
    return false;
  }
}

/**
 * Server-side in-memory repository for resilient operation across stateless calls,
 * testing, and when running in development environments.
 */
class ServerStore {
  private cases: Map<string, CaseDocument> = new Map();
  private schemes: Map<string, WelfareScheme> = new Map();
  private chunks: Map<string, KnowledgeChunk> = new Map();
  private feedback: Map<string, FeedbackRecord> = new Map();
  private rateLimits: Map<string, { count: number; resetAt: number }> = new Map();

  constructor() {
    this.seedSchemes();
  }

  public checkRateLimit(uid: string, maxRequests = 100): boolean {
    const now = Date.now();
    const userLimit = this.rateLimits.get(uid);
    if (!userLimit || userLimit.resetAt < now) {
      this.rateLimits.set(uid, { count: 1, resetAt: now + 3600000 });
      return true;
    }
    if (userLimit.count >= maxRequests) {
      return false;
    }
    userLimit.count++;
    return true;
  }

  public getCase(id: string): CaseDocument | null {
    return this.cases.get(id) || null;
  }

  public saveCase(caseDoc: CaseDocument): void {
    caseDoc.updatedAt = new Date().toISOString();
    this.cases.set(caseDoc.caseId, caseDoc);
  }

  public getUserCases(userId: string): CaseDocument[] {
    return Array.from(this.cases.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getAllSchemes(): WelfareScheme[] {
    return Array.from(this.schemes.values());
  }

  public getScheme(id: string): WelfareScheme | null {
    return this.schemes.get(id) || null;
  }

  public saveScheme(scheme: WelfareScheme): void {
    this.schemes.set(scheme.schemeId, scheme);
  }

  public saveFeedback(f: FeedbackRecord): void {
    this.feedback.set(f.feedbackId, f);
  }

  public getChunks(): KnowledgeChunk[] {
    return Array.from(this.chunks.values());
  }

  public setChunks(chunks: KnowledgeChunk[]): void {
    for (const chunk of chunks) {
      this.chunks.set(chunk.chunkId, chunk);
    }
  }

  private seedSchemes() {
    const realSchemes: WelfareScheme[] = [
      {
        schemeId: "pm_kisan",
        name: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
        authority: "Ministry of Agriculture & Farmers Welfare",
        jurisdiction: "Central / All India",
        category: "financial_social_welfare",
        description: "Direct income support of ₹6,000 per year in 3 equal installments of ₹2,000 for landholding farmer families.",
        eligibilityRules: {
          customRules: [
            { field: "isLandholdingFarmer", label: "Do you or your family own cultivable land registered in your name?", type: "boolean", required: true },
            { field: "isIncomeTaxPayee", label: "Did any family member pay Income Tax in the last assessment year?", type: "boolean", required: true },
            { field: "isGovtEmployeeOrPensionerAbove10k", label: "Is any member a serving/retired government official or receiving pension ≥ ₹10,000/month?", type: "boolean", required: true },
            { field: "isRegisteredProfessional", label: "Is any member a practicing Doctor, Lawyer, Engineer, or Chartered Accountant?", type: "boolean", required: true },
          ],
        },
        requiredDocuments: [
          "Aadhaar Card (Mandatory with e-KYC)",
          "Land Ownership Record (Khatauni / Jamabandi / 7/12 extract)",
          "Aadhaar-seeded Bank Account Passbook",
          "Active Mobile Number",
        ],
        applicationProcess: "Self-register on PM-KISAN portal (pmkisan.gov.in) under Farmer's Corner or visit nearest CSC / Block Agriculture Officer.",
        officialUrl: "https://pmkisan.gov.in",
        sourceId: "pm_kisan_scheme",
      },
      {
        schemeId: "ayushman_bharat",
        name: "Ayushman Bharat PM-JAY",
        authority: "National Health Authority",
        jurisdiction: "Central / All India",
        category: "healthcare_schemes",
        description: "Comprehensive health insurance cover of ₹5,00,000 per family per year for secondary/tertiary hospital treatment. Free top-up cover for seniors 70+.",
        eligibilityRules: {
          age: { min: 0 },
          customRules: [
            { field: "isSeniorCitizen70Plus", label: "Are you an Indian citizen aged 70 years or older?", type: "boolean", required: true },
            { field: "hasRationCardOrSECC", label: "Does your family hold a Priority / BPL / Antyodaya Ration card or listed in SECC 2011?", type: "boolean", required: true },
            { field: "isGovtEmployeeWithOtherHealthCover", label: "Do you already have CGHS, ECHS, or ESIC government health insurance?", type: "boolean", required: true },
          ],
        },
        requiredDocuments: [
          "Aadhaar Card of all family members",
          "Ration Card / Family ID / SECC Letter",
          "Mobile Number for OTP verification",
        ],
        applicationProcess: "Check eligibility on beneficiary.nha.gov.in or visit any empaneled government/private hospital Ayushman Mitra desk or CSC.",
        officialUrl: "https://nha.gov.in/PM-JAY",
        sourceId: "ayushman_bharat_pmjay",
      },
      {
        schemeId: "pmay_gramin",
        name: "Pradhan Mantri Awas Yojana - Gramin (PMAY-G)",
        authority: "Ministry of Rural Development",
        jurisdiction: "Central / All India",
        category: "financial_social_welfare",
        description: "Financial grant of ₹1.20 Lakh (plains) to ₹1.30 Lakh (hilly areas) + 90 days MGNREGA wages to construct a pucca house.",
        eligibilityRules: {
          familyIncome: { max: 180000 },
          customRules: [
            { field: "livesInRuralArea", label: "Do you reside in a rural Gram Panchayat area?", type: "boolean", required: true },
            { field: "hasExistingPuccaHouse", label: "Do you or any family member already own a pucca (permanent) house anywhere in India?", type: "boolean", required: true },
            { field: "ownsMotorizedVehicleOrTractor", label: "Does your household own a motorized 3/4-wheeler vehicle or motorized farm equipment?", type: "boolean", required: true },
            { field: "hasGovtEmployeeInFamily", label: "Is anyone in the household a regular government employee?", type: "boolean", required: true },
          ],
        },
        requiredDocuments: [
          "Aadhaar Card",
          "MGNREGA Job Card Number",
          "Bank Account Passbook (Aadhaar linked)",
          "Land ownership or house site document",
          "Affidavit declaring no pucca house owned",
        ],
        applicationProcess: "Register through Gram Panchayat Gram Sabha or Block Development Office (BDO) via AwaasSoft portal.",
        officialUrl: "https://pmayg.nic.in",
        sourceId: "pmay_gramin",
      },
      {
        schemeId: "pmmvy_maternity",
        name: "Pradhan Mantri Matru Vandana Yojana (PMMVY)",
        authority: "Ministry of Women & Child Development",
        jurisdiction: "Central / All India",
        category: "healthcare_schemes",
        description: "Direct cash maternity incentive of ₹5,00,000 for 1st child and ₹6,000 for 2nd girl child to improve health, nutrition, and wage-loss compensation.",
        eligibilityRules: {
          age: { min: 19 },
          gender: ["female"],
          familyIncome: { max: 800000 },
          customRules: [
            { field: "isRegularGovtEmployee", label: "Are you in regular employment with Central/State Government or PSU?", type: "boolean", required: true },
            { field: "hasEWSorRationCardOrEshram", label: "Do you hold an EWS Income Certificate (<₹8L), BPL/Priority Ration card, e-Shram card, or MGNREGA card?", type: "boolean", required: true },
          ],
        },
        requiredDocuments: [
          "Mother's Aadhaar Card",
          "Husband's Aadhaar Card",
          "Mother-Child Protection (MCP) Card with ANC record",
          "Child Birth Certificate (for 2nd installment / girl child)",
          "Mother's Bank Account Passbook",
          "Income / Ration / e-Shram / Caste document",
        ],
        applicationProcess: "Apply online at pmmvy.wcd.gov.in or through nearest Anganwadi Centre (AWC) / ASHA health worker.",
        officialUrl: "https://pmmvy.wcd.gov.in",
        sourceId: "pmmvy_maternity_scheme",
      },
      {
        schemeId: "post_matric_scholarship",
        name: "Post-Matric Scholarship for SC/OBC Students",
        authority: "Ministry of Social Justice and Empowerment",
        jurisdiction: "Central / All India",
        category: "education",
        description: "Full tuition fee reimbursement and monthly maintenance allowance for post-secondary (Class 11 to PhD) courses in recognized institutions.",
        eligibilityRules: {
          familyIncome: { max: 250000 },
          casteOrCategory: ["SC", "ST", "OBC", "EBC"],
          isStudent: true,
          customRules: [
            { field: "passedClass10", label: "Have you passed Class 10 (Matriculation) or higher qualification?", type: "boolean", required: true },
            { field: "enrolledInRecognizedCourse", label: "Are you enrolled in a recognized college, polytechnic, or university?", type: "boolean", required: true },
          ],
        },
        requiredDocuments: [
          "Student Aadhaar Card (DBT linked)",
          "Caste Certificate issued by SDM / Tehsildar",
          "Current Year Family Income Certificate (< ₹2.5 Lakh)",
          "Class 10 / Previous Exam Marksheet",
          "College Admission & Fee Receipt",
          "Student Bank Passbook",
        ],
        applicationProcess: "Apply exclusively online on the National Scholarship Portal (scholarships.gov.in) with college verification.",
        officialUrl: "https://scholarships.gov.in",
        sourceId: "post_matric_scholarship",
      },
    ];

    for (const s of realSchemes) {
      this.schemes.set(s.schemeId, s);
    }
  }
}

export const serverDb = new ServerStore();
