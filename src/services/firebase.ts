import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  getFirestore,
  Firestore,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App instance
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with custom database ID if specified in config
export const db: Firestore = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

/**
 * Returns a stable local guest identifier for offline persistence
 */
export function getLocalGuestId(): string {
  try {
    let guestId = localStorage.getItem("reflect_guest_session_id");
    if (!guestId) {
      guestId = "guest_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("reflect_guest_session_id", guestId);
    }
    return guestId;
  } catch {
    return "guest_default";
  }
}

/**
 * Safely checks and ensures authentication state without throwing
 * on admin-restricted-operation.
 */
export async function tryEnsureAuthenticatedUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        try {
          const userCredential = await signInAnonymously(auth);
          unsubscribe();
          resolve(userCredential.user);
        } catch (err: any) {
          // Anonymous authentication is restricted or not enabled on this Firebase project.
          // Gracefully fallback to guest mode with local persistence.
          unsubscribe();
          resolve(null);
        }
      }
    });
  });
}

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign out current user
 */
export async function logOut(): Promise<void> {
  await signOut(auth);
}
