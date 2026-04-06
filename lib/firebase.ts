"use client";

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  Auth,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { setLogLevel } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// Only initialize if we have valid config (not during build)
function getFirebaseApp(): FirebaseApp | null {
  if (getApps().length > 0) {
    return getApp();
  }
  // Skip initialization if no API key (during build)
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "") {
    return null;
  }
  return initializeApp(firebaseConfig);
}

const app = getFirebaseApp();

// Export auth and db with type assertions
export const auth: Auth = app ? getAuth(app) : (null as unknown as Auth);
export const db: Firestore = app
  ? getFirestore(app)
  : (null as unknown as Firestore);

// Enable offline persistence and suppress console errors
if (app && db) {
  // Reduce Firestore logging noise
  setLogLevel("silent");

  // Set auth persistence to local
  if (auth) {
    setPersistence(auth, browserLocalPersistence).catch(() => {
      // Silent fail - auth will still work
    });
  }
}

// Helper to check if Firebase is initialized
export const isFirebaseReady = () => app !== null;

// Sign into Firebase Auth SDK using email/password
// This is critical: the REST API login stores tokens in localStorage,
// but the Firebase client SDK needs to be signed in separately for
// auth.currentUser and onAuthStateChanged to work, which Firestore
// security rules depend on.
export async function signInFirebaseSDK(
  email: string,
  password: string
): Promise<User | null> {
  if (!auth || !isFirebaseReady()) return null;
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (e) {
    console.warn("Firebase SDK sign-in failed (non-critical):", e);
    return null;
  }
}

// Re-authenticate Firebase SDK from stored credentials
// Called on app load to restore Firebase auth state
export async function restoreFirebaseAuth(): Promise<User | null> {
  if (!auth || !isFirebaseReady()) return null;

  // Check if already signed in
  if (auth.currentUser) return auth.currentUser;

  // Wait for auth state to settle
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
    // Timeout after 3 seconds
    setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, 3000);
  });
}
