import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  try {
    // If FIREBASE_SERVICE_ACCOUNT is provided, use it (production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("[ADMIN] Firebase Admin initialized with service account.");
    } else {
      // Fallback for development/testing, or if deployed in a GCP environment
      // that provides Application Default Credentials implicitly.
      initializeApp();
      console.log("[ADMIN] Firebase Admin initialized with default credentials.");
    }
  } catch (error) {
    console.error("[ADMIN] Firebase Admin initialization failed:", error);
  }
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();
